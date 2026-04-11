import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';
import { generateReceiptPDF } from '../../components/AppointmentReceipt';

const SPECIALIZATIONS = ['All', 'Ayurveda', 'Allopathy', 'Homeopathy', 'Cardiology',
    'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'General Medicine'];

const SPEC_COLORS = {
    ayurveda:    { bg: '#e8f5e9', color: '#2d6a4f', icon: '🌿' },
    homeopathy:  { bg: '#f3e5f5', color: '#6a1b9a', icon: '💊' },
    cardiology:  { bg: '#fce4ec', color: '#c62828', icon: '❤️' },
    dermatology: { bg: '#fff8e1', color: '#e65100', icon: '🧴' },
    neurology:   { bg: '#e3f2fd', color: '#1565c0', icon: '🧠' },
    orthopedics: { bg: '#e8eaf6', color: '#283593', icon: '🦴' },
    pediatrics:  { bg: '#e0f7fa', color: '#00695c', icon: '👶' },
    default:     { bg: '#f1f8e9', color: '#33691e', icon: '🩺' },
};

function getSpecStyle(spec) {
    if (!spec) return SPEC_COLORS.default;
    const key = spec.toLowerCase();
    for (const [k, v] of Object.entries(SPEC_COLORS)) {
        if (key.includes(k)) return v;
    }
    return SPEC_COLORS.default;
}

// ── Step constants ────────────────────────────────────────────
const STEP = { FORM: 'form', PROCESSING: 'processing', SUCCESS: 'success' };

export default function DoctorSearch() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [query, setQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [bookingDoc, setBookingDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [appointmentMap, setAppointmentMap] = useState({});

    // Booking form state
    const [aptDate, setAptDate] = useState('');
    const [aptTime, setAptTime] = useState('10:00');
    const [aptType, setAptType] = useState('Chat Consultation');
    const [aptNotes, setAptNotes] = useState('');
    const [purpose, setPurpose] = useState('');
    const [step, setStep] = useState(STEP.FORM);
    const [submitting, setSubmitting] = useState(false);

    // Post-booking data (for success screen)
    const [confirmedAppointment, setConfirmedAppointment] = useState(null);
    const [patientInfo, setPatientInfo] = useState(null);

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    // Helper to lazy-load Razorpay script only when needed
    const ensureRazorpayLoaded = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // Load patient info (for receipt)
    useEffect(() => {
        const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (stored) {
            try { setPatientInfo(JSON.parse(stored)); } catch (_) {}
        }
    }, []);

    // Load doctors + existing appointments in parallel
    useEffect(() => {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const cityParam = locationQuery ? `&city=${encodeURIComponent(locationQuery)}` : '';

        const fetchDoctors = fetch(`${API_BASE_URL}/api/doctors?${cityParam}`, { headers })
            .then(async r => {
                const j = await r.json();
                if (r.status === 401) { navigate('/login'); return []; }
                return j.data?.doctors || [];
            }).catch(() => []);

        const fetchAppointments = fetch(`${API_BASE_URL}/api/appointments`, { headers })
            .then(async r => {
                const j = await r.json();
                if (r.status === 401) { navigate('/login'); return []; }
                return j.data?.appointments || [];
            }).catch(() => []);

        Promise.all([fetchDoctors, fetchAppointments])
            .then(([docs, appts]) => {
                setDoctors(docs);
                const map = {};
                appts
                    .filter(a => a.paymentStatus === 'paid' || a.status === 'confirmed' || a.status === 'completed')
                    .forEach(a => {
                        const key = String(a.doctorId);
                        if (!map[key]) map[key] = a;
                    });
                setAppointmentMap(map);
            })
            .finally(() => setLoading(false));
    }, [locationQuery]);

    const resetModal = () => {
        setBookingDoc(null);
        setStep(STEP.FORM);
        setAptDate(''); setAptTime('10:00'); setAptType('Chat Consultation');
        setAptNotes(''); setPurpose('');
        setConfirmedAppointment(null);
        setSubmitting(false);
    };

    const filtered = doctors.filter(d => {
        const q     = query.toLowerCase();
        const spec  = (d.spec || '').toLowerCase();
        const name  = (d.name || '').toLowerCase();
        const filt  = activeFilter.toLowerCase();
        return (!query || name.includes(q) || spec.includes(q)) &&
               (activeFilter === 'All' || spec.includes(filt));
    });

    // ── STEP 1: Create Razorpay Order ─────────────────────────
    const handleBookSubmit = async () => {
        if (!aptDate || !aptTime) { handleError('Please select date and time'); return; }
        if (!purpose.trim())      { handleError('Please describe the purpose of your visit'); return; }

        // Convert 24h → 12h for backend
        const [h, m] = aptTime.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        const formattedTime = `${String(formattedHour).padStart(2, '0')}:${m} ${ampm}`;

        setSubmitting(true);
        setStep(STEP.PROCESSING);

        // Ensure script is loaded before continuing
        const loaded = await ensureRazorpayLoaded();
        if (!loaded) {
            handleError('Failed to load payment gateway. Please check your connection.');
            setSubmitting(false);
            setStep(STEP.FORM);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    doctorId: bookingDoc.id,
                    date:     aptDate,
                    time:     formattedTime,
                    type:     aptType,
                    purpose:  purpose,
                    notes:    aptNotes,
                }),
            });

            const json = await res.json();

            if (res.status === 401) {
                handleError('Session expired. Please log in again.');
                navigate('/login');
                return;
            }
            if (!res.ok) {
                handleError(json.data?.message || json.error || 'Failed to create payment order');
                setStep(STEP.FORM);
                return;
            }

            const { orderId, amount, currency, appointmentId, keyId, allowSimulation } = json.data;

            // ── STEP 2: Open Razorpay Checkout ─────────────────
            openRazorpayCheckout({
                orderId,
                amount,
                currency,
                appointmentId,
                keyId,
                doctorName: bookingDoc.name,
                allowSimulation,
            });

        } catch (err) {
            handleError(`Connection error: ${err.message}`);
            setStep(STEP.FORM);
        } finally {
            setSubmitting(false);
        }
    };

    // ── STEP 2: Razorpay Checkout Popup ───────────────────────
    const openRazorpayCheckout = ({ orderId, amount, currency, appointmentId, keyId, doctorName, allowSimulation }) => {
        const isSimOrder = orderId.startsWith('order_SIM_');

        if (!window.Razorpay) {
            if (isSimOrder && allowSimulation) {
                // Simulation mode allowed by backend
                handleSimulatedPayment(orderId, appointmentId);
                return;
            }
            // Real order or simulation not allowed
            handleError('Payment gateway (Razorpay) failed to load. Please disable ad-blockers, ensure you are online, and try again.');
            setStep(STEP.FORM);
            return;
        }

        if (isSimOrder) {
            if (allowSimulation) {
                handleSimulatedPayment(orderId, appointmentId);
            } else {
                handleError('Unauthorized simulator attempt. Real payment is required.');
                setStep(STEP.FORM);
            }
            return;
        }

        const options = {
            key:         keyId,
            amount:      amount,
            currency:    currency || 'INR',
            name:        'VaidyaMed-X',
            description: `Consultation with Dr. ${doctorName}`,
            image:       'https://cdn-icons-png.flaticon.com/512/2859/2859706.png',
            order_id:    orderId,
            prefill: {
                name:  patientInfo?.name  || '',
                email: patientInfo?.email || '',
                contact: patientInfo?.mobile || '',
            },
            theme:  { color: '#2d6a4f' },
            modal:  { ondismiss: () => handlePaymentDismissed() },
            handler: (response) => {
                // ── STEP 3: Verify payment ──────────────────────
                handlePaymentSuccess(response, appointmentId);
            },
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                handlePaymentFailed(response, appointmentId);
            });
            rzp.open();
        } catch (err) {
            handleError('Failed to open payment gateway. Please try again.');
            setStep(STEP.FORM);
        }
    };

    // ── STEP 3: Verify & Confirm ──────────────────────────────
    const handlePaymentSuccess = async (razorpayResponse, appointmentId) => {
        setStep(STEP.PROCESSING);
        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    appointmentId,
                    razorpayOrderId:   razorpayResponse.razorpay_order_id,
                    razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                    razorpaySignature: razorpayResponse.razorpay_signature,
                }),
            });

            const json = await res.json();

            if (res.ok) {
                // The backend now returns the full appointment with revealed data
                const confirmed = json.data?.appointment || json.data;
                setConfirmedAppointment(confirmed);
                setStep(STEP.SUCCESS);
                
                // Update local map to show "Booked" status in the list
                setAppointmentMap(prev => ({
                    ...prev,
                    [String(bookingDoc.id)]: confirmed,
                }));
                handleSuccess(`✅ Appointment confirmed with Dr. ${bookingDoc.name}!`);
            } else {
                handleError(json.data?.message || json.error || 'Payment verification failed');
                setStep(STEP.FORM);
            }
        } catch (err) {
            handleError('Verification connection error. Contact support if amount was deducted.');
            setStep(STEP.FORM);
        }
    };

    const handleSimulatedPayment = async (orderId, appointmentId) => {
        setStep(STEP.PROCESSING);
        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments/verify-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`,
                },
                body: JSON.stringify({
                    appointmentId,
                    razorpayOrderId:   orderId,
                    razorpayPaymentId: `pay_SIM_${Date.now()}`,
                    razorpaySignature: 'SIM_SIGNATURE',
                }),
            });
            const json = await res.json();
            if (res.ok) {
                setConfirmedAppointment(json.data?.appointment || json.data);
                setStep(STEP.SUCCESS);
                setAppointmentMap(prev => ({
                    ...prev,
                    [String(bookingDoc.id)]: json.data?.appointment,
                }));
                handleSuccess(`✅ Appointment confirmed with Dr. ${bookingDoc.name}! (Simulation)`);
            } else {
                handleError(json.data?.message || 'Verification failed');
                setStep(STEP.FORM);
            }
        } catch (err) {
            handleError('Verification error: ' + err.message);
            setStep(STEP.FORM);
        }
    };

    const handlePaymentDismissed = () => {
        handleError('Payment cancelled. Your slot has not been booked.');
        setStep(STEP.FORM);
    };

    const handlePaymentFailed = (response, appointmentId) => {
        const msg = response?.error?.description || 'Payment failed.';
        handleError(`❌ Payment failed: ${msg}`);
        setStep(STEP.FORM);
    };

    const handleDownloadReceipt = () => {
        if (!confirmedAppointment) return;
        generateReceiptPDF(confirmedAppointment, patientInfo || {}, bookingDoc || {});
    };

    // ─────────────────────────────────────────────────────────
    //  RENDER
    // ─────────────────────────────────────────────────────────
    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🔍 Find Doctors</h1>
                    <p>Search and book from our network of verified clinical experts</p>
                </div>
                <span className="pd-pill pd-pill-green">{doctors.length} Doctors Available</span>
            </div>

            {/* Search Row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input type="text" id="doctor-query" className="pd-input"
                    placeholder="🔍  Search by name, specialization, symptom…"
                    value={query} onChange={e => setQuery(e.target.value)}
                    style={{ borderRadius: 50, padding: '12px 20px', flex: 2 }}
                />
                <input type="text" id="location-query" className="pd-input"
                    placeholder="📍  City or area (e.g. Lucknow)"
                    value={locationQuery} onChange={e => setLocationQuery(e.target.value)}
                    style={{ borderRadius: 50, padding: '12px 20px', flex: 1 }}
                />
            </div>

            {/* Filters */}
            <div className="pd-search-filters" style={{ flexWrap: 'wrap' }}>
                {SPECIALIZATIONS.map(s => (
                    <button key={s} className={`pd-filter-chip ${activeFilter === s ? 'active' : ''}`}
                        onClick={() => setActiveFilter(s)}>{s}</button>
                ))}
            </div>

            {/* Info banner */}
            <div style={{ background: '#e8f4fd', border: '1px solid #90caf9', borderRadius: 10, padding: '10px 16px', marginBottom: 18, fontSize: '0.82rem', color: '#1565c0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>🔒</span>
                <span>Consultation fee is charged <strong>before</strong> confirming your booking. Chat &amp; contact details unlock after payment.</span>
            </div>

            {/* Results */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b8f71' }}>⏳ Loading verified doctors…</div>
            ) : filtered.length === 0 ? (
                <div className="pd-empty">
                    <div className="pd-empty-icon">👨‍⚕️</div>
                    <h3>No doctors found</h3>
                    <p>Try a different name or specialization.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filtered.map(d => {
                        const specStyle = getSpecStyle(d.spec);
                        const appt = appointmentMap[String(d.id)];
                        const hasAppt = !!appt;

                        return (
                            <div key={d.id} className="pd-doctor-card">
                                <div className="pd-doctor-avatar" style={{ background: `linear-gradient(135deg, ${specStyle.color}, #0d2410)` }}>
                                    {specStyle.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        <div className="pd-doctor-name">Dr. {d.name}</div>
                                        {hasAppt && (
                                            <span style={{ background: '#e8f8ee', color: '#27ae60', fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                                                ✅ Booked &amp; Paid
                                            </span>
                                        )}
                                    </div>
                                    <div className="pd-doctor-spec">{d.spec}</div>
                                    <div className="pd-doctor-meta">
                                        <span>⭐ {d.rating || 4.8}</span>
                                        <span>🕐 {d.experience || '—'} yrs exp</span>
                                        <span>🏥 {d.hospital || '—'}</span>
                                        <span>💰 ₹{d.fee || d.consultantFee || 500}/consult</span>
                                        {d.workingHours && <span>🕑 {d.workingHours}</span>}
                                    </div>

                                    {/* Gated doctor details — only if paid appointment exists */}
                                    {hasAppt && appt.clinicLocation && (
                                        <div style={{ fontSize: '0.78rem', color: '#2d6a4f', marginTop: 4, background: '#f0faf4', borderRadius: 8, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <span>📍 {appt.clinicLocation}</span>
                                            {appt.doctorMobile && <span>📞 {appt.doctorMobile}</span>}
                                        </div>
                                    )}
                                    {!hasAppt && (d.clinicLocation || d.city) && (
                                        <div style={{ fontSize: '0.78rem', color: '#6b8f71', marginTop: 2 }}>
                                            📍 {d.city}{d.state ? `, ${d.state}` : ''}
                                        </div>
                                    )}

                                    <div className="pd-doctor-actions" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                                        <button className="pd-btn pd-btn-primary pd-btn-sm"
                                            onClick={() => {
                                                setBookingDoc(d);
                                                setStep(STEP.FORM);
                                                setAptDate(''); setAptNotes(''); setAptType('Chat Consultation'); setPurpose('');
                                                setConfirmedAppointment(null);
                                            }}>
                                            {hasAppt ? '📅 Book Again' : '📅 Book & Pay'}
                                        </button>

                                        {hasAppt ? (
                                            <button className="pd-btn pd-btn-outline pd-btn-sm"
                                                onClick={() => navigate(`/patient/inbox?doctor=${d.id}`)}>
                                                💬 Message
                                            </button>
                                        ) : (
                                            <button className="pd-btn pd-btn-outline pd-btn-sm" disabled
                                                title="Book & pay first to unlock chat"
                                                style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                                                💬 Message 🔒
                                            </button>
                                        )}
                                    </div>

                                    {hasAppt && (
                                        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#2d6a4f', background: '#f0faf4', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', gap: 14 }}>
                                            <span>📅 {appt.appointmentDate}</span>
                                            <span>⏰ {String(appt.appointmentTime || '').substring(0, 5)}</span>
                                            <span>{appt.appointmentType || appt.type}</span>
                                            <span style={{ color: '#27ae60', fontWeight: 600 }}>💳 Paid</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════ Booking Modal ══════════ */}
            {bookingDoc && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.65)',
                    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: 20
                }} onClick={() => { if (step === STEP.FORM) resetModal(); }}>
                    <div style={{
                        background: '#fff', borderRadius: 22, padding: 36,
                        maxWidth: 520, width: '100%', overflowY: 'auto', maxHeight: '90vh',
                        boxShadow: '0 24px 64px rgba(10,40,20,0.35)'
                    }} onClick={e => e.stopPropagation()}>

                        {/* ── Processing state ── */}
                        {step === STEP.PROCESSING && (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 16 }}>⏳</div>
                                <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#2d6a4f', marginBottom: 8 }}>
                                    Processing Payment…
                                </h3>
                                <p style={{ color: '#6b8f71', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                    Please do not close this window.<br />
                                    Verifying your payment with Razorpay...
                                </p>
                            </div>
                        )}

                        {/* ── Success state ── */}
                        {step === STEP.SUCCESS && confirmedAppointment && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🎉</div>
                                <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#2d6a4f', marginBottom: 6 }}>
                                    Appointment Confirmed!
                                </h2>
                                <p style={{ color: '#6b8f71', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 16 }}>
                                    Your appointment with <strong>Dr. {bookingDoc.name}</strong> is confirmed &amp; paid.<br />
                                    Txn ID: <code style={{ background: '#f0faf4', padding: '1px 6px', borderRadius: 4, fontSize: '0.78rem' }}>{confirmedAppointment.transactionId}</code>
                                </p>

                                {/* Post-payment doctor details */}
                                {(confirmedAppointment.clinicLocation || confirmedAppointment.doctorMobile) && (
                                    <div style={{ background: '#f0faf4', border: '1px solid #c8e6c9', borderRadius: 12, padding: '12px 16px', textAlign: 'left', marginBottom: 16 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#2d6a4f', marginBottom: 8 }}>
                                            🔓 Doctor Contact Details (Unlocked)
                                        </div>
                                        {confirmedAppointment.clinicLocation && (
                                            <div style={{ fontSize: '0.82rem', color: '#1a2e1a', marginBottom: 5 }}>
                                                📍 <strong>Clinic:</strong> {confirmedAppointment.clinicLocation}
                                            </div>
                                        )}
                                        {confirmedAppointment.doctorMobile && (
                                            <div style={{ fontSize: '0.82rem', color: '#1a2e1a' }}>
                                                📞 <strong>Phone:</strong> {confirmedAppointment.doctorMobile}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Payment summary */}
                                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 12, padding: '10px 14px', textAlign: 'left', marginBottom: 16, fontSize: '0.80rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span>💰 Consultation Fee</span>
                                        <strong>₹{confirmedAppointment.amountPaid || 0}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b8f71', marginBottom: 4 }}>
                                        <span>👨‍⚕️ To Doctor (95%)</span>
                                        <span>₹{confirmedAppointment.doctorShareINR || Math.round((confirmedAppointment.amountPaid || 0) * 0.95 * 100) / 100}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b8f71' }}>
                                        <span>🏥 Platform Fee (5%)</span>
                                        <span>₹{confirmedAppointment.platformShareINR || Math.round((confirmedAppointment.amountPaid || 0) * 0.05 * 100) / 100}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center' }}
                                        onClick={handleDownloadReceipt}>
                                        📄 Download PDF Receipt
                                    </button>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => { resetModal(); navigate('/patient/appointments'); }}>
                                            📅 My Appointments
                                        </button>
                                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => { resetModal(); navigate(`/patient/inbox?doctor=${bookingDoc.id}`); }}>
                                            💬 Open Chat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Booking Form ── */}
                        {step === STEP.FORM && (
                            <>
                                {/* Doctor info header */}
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%', fontSize: '1.6rem',
                                        background: 'linear-gradient(135deg,#2d6a4f,#0d2410)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                                        flexShrink: 0
                                    }}>🩺</div>
                                    <div>
                                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', color: '#1a2e1a' }}>Dr. {bookingDoc.name}</div>
                                        <div style={{ fontSize: '0.80rem', color: '#6b8f71' }}>{bookingDoc.spec}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#2d6a4f', fontWeight: 600, marginTop: 2 }}>
                                            💰 ₹{bookingDoc.fee || bookingDoc.consultantFee || 500} consultation fee
                                        </div>
                                    </div>
                                </div>

                                {/* Payment notice */}
                                <div style={{ background: '#e8f4fd', border: '1px solid #90caf9', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.80rem', color: '#1565c0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    🔒 <span><strong>Secure Payment</strong> — You will be redirected to Razorpay to pay ₹{bookingDoc.fee || 500} before your appointment is confirmed.</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Consultation Type */}
                                    <div className="pd-form-group">
                                        <label htmlFor="apt-type">Consultation Type</label>
                                        <select id="apt-type" className="pd-select" value={aptType} onChange={e => setAptType(e.target.value)}>
                                            <option value="Chat Consultation">💬 Chat Consultation</option>
                                            <option value="Offline / In-Clinic">🏥 Offline / In-Clinic</option>
                                        </select>
                                    </div>

                                    {/* Date */}
                                    <div className="pd-form-group">
                                        <label htmlFor="apt-date">Preferred Date *</label>
                                        <input type="date" id="apt-date" className="pd-input"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={aptDate} onChange={e => setAptDate(e.target.value)} />
                                    </div>

                                    {/* Time */}
                                    <div className="pd-form-group">
                                        <label htmlFor="apt-time">Preferred Time *</label>
                                        <input type="time" id="apt-time" className="pd-input"
                                            value={aptTime} onChange={e => setAptTime(e.target.value)} />
                                        {bookingDoc.workingHours && (
                                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 3 }}>
                                                🕑 Doctor's hours: {bookingDoc.workingHours}
                                            </div>
                                        )}
                                    </div>

                                    {/* Purpose */}
                                    <div className="pd-form-group">
                                        <label htmlFor="apt-purpose">Purpose of Visit *</label>
                                        <input type="text" id="apt-purpose" className="pd-input"
                                            placeholder="e.g. Fever & cold, skin rash, routine checkup…"
                                            value={purpose} onChange={e => setPurpose(e.target.value)} />
                                    </div>

                                    {/* Notes */}
                                    <div className="pd-form-group">
                                        <label htmlFor="apt-notes">Additional Notes (optional)</label>
                                        <textarea id="apt-notes" className="pd-textarea"
                                            placeholder="Any other relevant information for the doctor…"
                                            rows={2} value={aptNotes} onChange={e => setAptNotes(e.target.value)} />
                                    </div>
                                </div>

                                {/* Fee summary */}
                                <div style={{ background: '#f0faf4', borderRadius: 10, padding: '12px 16px', margin: '14px 0', fontSize: '0.82rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#2d6a4f', marginBottom: 4 }}>
                                        <span>Consultation Fee</span>
                                        <span>₹{bookingDoc.fee || bookingDoc.consultantFee || 500}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b8f71', fontSize: '0.76rem' }}>
                                        <span>Secure payment via Razorpay</span>
                                        <span>🔒 256-bit SSL</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={handleBookSubmit} disabled={submitting}>
                                        {submitting ? '⏳ Creating Order…' : `💳 Pay & Book — ₹${bookingDoc.fee || bookingDoc.consultantFee || 500}`}
                                    </button>
                                    <button className="pd-btn pd-btn-outline" onClick={resetModal}>Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
