import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';
import { generateReceiptPDF } from '../../components/AppointmentReceipt';

const STATUS_PILL = {
    confirmed:  'pd-pill-green',
    completed:  'pd-pill-green',
    booked:     'pd-pill-blue',
    pending:    'pd-pill-yellow',
    cancelled:  'pd-pill-red',
    'No-Show':  'pd-pill-red',
    // Legacy casing
    Confirmed:  'pd-pill-green',
    Completed:  'pd-pill-green',
    Scheduled:  'pd-pill-blue',
    Upcoming:   'pd-pill-blue',
    Cancelled:  'pd-pill-red',
};

const PAY_PILL = {
    paid:    { cls: 'pd-pill-green',  label: '💳 Paid' },
    pending: { cls: 'pd-pill-yellow', label: '⏳ Payment Pending' },
    failed:  { cls: 'pd-pill-red',    label: '❌ Payment Failed' },
    refunded:{ cls: 'pd-pill-yellow', label: '↩️ Refunded' },
};

const STAR_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

const SPEC_COLORS = {
    ayurveda: { bg: '#e8f5e9', color: '#2d6a4f', icon: '🌿' },
    nutrition: { bg: '#fff3e0', color: '#e65100', icon: '🥗' },
    cardio: { bg: '#fce4ec', color: '#c62828', icon: '❤️' },
    derm: { bg: '#f3e5f5', color: '#6a1b9a', icon: '🧴' },
    ortho: { bg: '#e3f2fd', color: '#1565c0', icon: '🦴' },
    default: { bg: '#f1f8e9', color: '#33691e', icon: '🩺' },
};

function getSpecStyle(spec) {
    if (!spec) return SPEC_COLORS.default;
    const key = spec.toLowerCase();
    for (const [k, v] of Object.entries(SPEC_COLORS)) {
        if (key.includes(k)) return v;
    }
    return SPEC_COLORS.default;
}

export default function Appointments() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');
    const [cancelId, setCancelId] = useState(null);
    const [reviewAppt, setReviewAppt] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState([]);
    const [doctorsLoading, setDoctorsLoading] = useState(true);
    const [stars, setStars] = useState(0);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [recommend, setRecommend] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [patientInfo, setPatientInfo] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (stored) { try { setPatientInfo(JSON.parse(stored)); } catch (_) {} }
    }, []);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.status === 401) {
                const errorCode = json.errors?.code || json.error;
                if (errorCode === 'token_expired' || errorCode === 'unauthorized' || errorCode === 'missing_token') {
                    handleError('Session expired. Please log in again.');
                    sessionStorage.clear(); localStorage.clear();
                    navigate('/login'); return;
                }
            }
            if (res.ok) setAppointments(json.data?.appointments || []);
        } catch (err) {
            handleError(err, 'Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    };

    const fetchDoctors = async () => {
        setDoctorsLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/doctors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) setDoctors(json.data?.doctors || []);
        } catch (err) {
            handleError(err, 'Failed to fetch doctors');
        } finally {
            setDoctorsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        fetchDoctors();
    }, []);

    const filtered = appointments.filter(a => {
        if (filter === 'All') return true;
        if (filter === 'Upcoming') return ['confirmed', 'booked', 'Confirmed', 'Scheduled', 'Upcoming'].includes(a.status);
        if (filter === 'Paid') return a.paymentStatus === 'paid';
        if (filter === 'Pending Payment') return a.paymentStatus === 'pending';
        return a.status?.toLowerCase() === filter.toLowerCase();
    });

    const handleCancel = async (id) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments/${id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });
            if (res.ok) {
                setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
                setCancelId(null);
                handleSuccess('Appointment cancelled successfully.');
            } else {
                const json = await res.json();
                handleError(json.data?.message || json.error || 'Failed to cancel appointment.');
            }
        } catch (err) {
            handleError(err, 'Failed to cancel appointment. Please try again.');
        }
    };

    // ── Download PDF Receipt ───────────────────────────────────
    const handleDownloadReceipt = async (appt) => {
        setDownloadingId(appt.id);
        try {
            // Try backend PDF first
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments/${appt.id}/receipt`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url  = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href     = url;
                link.download = `VaidyaMedX_Receipt_APT${String(appt.id).padStart(5, '0')}.pdf`;
                link.click();
                URL.revokeObjectURL(url);
            } else {
                // Fallback: client-side jsPDF
                generateReceiptPDF(appt, patientInfo || {}, {});
            }
        } catch (err) {
            // Fallback: client-side jsPDF
            generateReceiptPDF(appt, patientInfo || {}, {});
        } finally {
            setDownloadingId(null);
        }
    };

    const openReview = (appt) => {
        setReviewAppt(appt);
        setStars(0); setHover(0); setFeedback('');
        setRecommend(null); setSubmitted(false);
    };

    const submitReview = () => { if (!stars) return; setSubmitted(true); };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return {
            day:   d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleString('en-IN', { month: 'short' })
        };
    };

    const isPaid     = (a) => a.paymentStatus === 'paid';
    const isUpcoming = (a) => ['confirmed', 'booked'].includes(a.status?.toLowerCase());

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>📅 Appointments</h1>
                    <p>Manage your upcoming and past doctor consultations</p>
                </div>
                <button className="pd-btn pd-btn-primary" onClick={() => navigate('/patient/doctors')}>
                    + Book New Appointment
                </button>
            </div>

            {/* Stats strip */}
            <div className="pd-grid-3" style={{ marginBottom: 24 }}>
                {[
                    { icon: '📅', label: 'Confirmed', val: appointments.filter(a => isUpcoming(a)).length, color: 'blue' },
                    { icon: '✅', label: 'Completed', val: appointments.filter(a => a.status?.toLowerCase() === 'completed').length, color: 'green' },
                    { icon: '💳', label: 'Paid', val: appointments.filter(a => isPaid(a)).length, color: 'green' },
                ].map(s => (
                    <div className="pd-stat-card" key={s.label}>
                        <div className={`pd-stat-icon ${s.color}`}>{s.icon}</div>
                        <div>
                            <div className="pd-stat-value">{s.val}</div>
                            <div className="pd-stat-label">{s.label} Appointments</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Registered Doctors Section */}
            <h3 className="pd-section-title" style={{ marginBottom: 14 }}>👨‍⚕️ Available Doctors ({doctors.length})</h3>
            <div style={{ marginBottom: 28 }}>
                {doctorsLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b8f71', fontSize: '0.88rem' }}>⏳ Loading doctors…</div>
                ) : doctors.length === 0 ? (
                    <div className="pd-empty" style={{ padding: '20px 0' }}>
                        <div className="pd-empty-icon">👨‍⚕️</div>
                        <h3>No registered doctors yet</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                        {doctors.map(d => {
                            const specStyle = getSpecStyle(d.spec);
                            return (
                                <div key={d.id} style={{
                                    background: '#fff', borderRadius: 16, padding: '18px 20px',
                                    border: '1px solid rgba(45,106,79,0.12)',
                                    boxShadow: '0 2px 12px rgba(10,40,20,0.06)',
                                    transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', gap: 10
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(10,40,20,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)';   e.currentTarget.style.boxShadow = '0 2px 12px rgba(10,40,20,0.06)'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: '50%', fontSize: '1.4rem',
                                            background: 'linear-gradient(135deg, #2d6a4f, #0d2410)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0
                                        }}>{specStyle.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.95rem', fontWeight: 600, color: '#1a2e1a' }}>{d.name}</div>
                                            {d.degree && <div style={{ fontSize: '0.75rem', color: '#6b8f71' }}>{d.degree}</div>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 600, background: specStyle.bg, color: specStyle.color }}>
                                            {d.spec || 'General'}
                                        </span>
                                        {d.experience && (
                                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 500, background: '#f5f5f5', color: '#555' }}>
                                                🕐 {d.experience} exp
                                            </span>
                                        )}
                                    </div>
                                    {d.hospital && <div style={{ fontSize: '0.78rem', color: '#6b8f71' }}>🏥 {d.hospital}</div>}
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                        <button className="pd-btn pd-btn-primary pd-btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => navigate('/patient/doctors')}>
                                            💳 Pay & Book
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Filter tabs */}
            <div className="pd-search-filters" style={{ marginBottom: 20 }}>
                {['All', 'Upcoming', 'Completed', 'Cancelled', 'Paid', 'Pending Payment'].map(f => (
                    <button key={f} className={`pd-filter-chip ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}>{f}</button>
                ))}
            </div>

            {/* Appointment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b8f71' }}>⏳ Loading your calendar…</div>
                ) : filtered.length === 0 ? (
                    <div className="pd-empty">
                        <div className="pd-empty-icon">📭</div>
                        <h3>No {filter.toLowerCase()} appointments</h3>
                    </div>
                ) : filtered.map(a => {
                    const { day, month } = formatDate(a.appointmentDate);
                    const paid    = isPaid(a);
                    const upcoming = isUpcoming(a);
                    const payPill  = PAY_PILL[a.paymentStatus] || PAY_PILL.pending;

                    return (
                        <div key={a.id} className="pd-appt-card">
                            <div className="pd-appt-date-block">
                                <div className="pd-appt-day">{day}</div>
                                <div className="pd-appt-month">{month}</div>
                            </div>
                            <div className="pd-appt-info" style={{ flex: 1 }}>
                                <div className="pd-appt-title">🌿 Dr. {a.doctorName}</div>
                                <div className="pd-appt-meta">
                                    {a.spec}&nbsp;·&nbsp;
                                    ⏰ {(a.appointmentTime || '').substring(0, 5)}&nbsp;·&nbsp;
                                    {a.appointmentType || a.type}
                                </div>
                                {a.purpose && (
                                    <div style={{ fontSize: '0.76rem', color: '#6b8f71', marginTop: 3 }}>
                                        📋 {a.purpose}
                                    </div>
                                )}

                                {/* ── Gated doctor details — only after payment ── */}
                                {paid && (a.clinicLocation || a.doctorMobile) && (
                                    <div style={{ marginTop: 8, background: '#f0faf4', border: '1px solid #c8e6c9', borderRadius: 8, padding: '7px 12px', fontSize: '0.78rem', color: '#2d6a4f' }}>
                                        <div style={{ fontWeight: 700, marginBottom: 3 }}>🔓 Doctor Contact (Unlocked)</div>
                                        {a.clinicLocation && (
                                            <div>📍 {a.clinicLocation}</div>
                                        )}
                                        {a.doctorMobile && (
                                            <div>📞 <a href={`tel:${a.doctorMobile}`} style={{ color: '#2d6a4f' }}>{a.doctorMobile}</a></div>
                                        )}
                                    </div>
                                )}

                                {/* Transaction ID */}
                                {paid && a.transactionId && (
                                    <div style={{ marginTop: 5, fontSize: '0.72rem', color: '#888' }}>
                                        Txn: <code style={{ background: '#f5f5f5', padding: '1px 5px', borderRadius: 4 }}>{a.transactionId}</code>
                                    </div>
                                )}
                            </div>
                            <div className="pd-appt-actions">
                                {/* Payment status badge */}
                                <span className={`pd-pill ${payPill.cls}`}>{payPill.label}</span>
                                {/* Booking status badge */}
                                <span className={`pd-pill ${STATUS_PILL[a.status] || 'pd-pill-blue'}`}>
                                    {(a.status || '').charAt(0).toUpperCase() + (a.status || '').slice(1)}
                                </span>

                                {/* Amount */}
                                {a.amountPaid > 0 && (
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2d6a4f' }}>
                                        ₹{a.amountPaid}
                                    </span>
                                )}

                                {/* Download Receipt — only for paid */}
                                {paid && (
                                    <button className="pd-btn pd-btn-outline pd-btn-sm"
                                        onClick={() => handleDownloadReceipt(a)}
                                        disabled={downloadingId === a.id}
                                        title="Download appointment receipt PDF">
                                        {downloadingId === a.id ? '⏳' : '📄'} Receipt
                                    </button>
                                )}

                                {upcoming && paid && (
                                    <>
                                        <button className="pd-btn pd-btn-primary pd-btn-sm"
                                            onClick={() => navigate(`/patient/inbox?doctor=${a.doctorId}`)}>
                                            💬 Open Chat
                                        </button>
                                        <button className="pd-btn pd-btn-danger pd-btn-sm"
                                            onClick={() => setCancelId(a.id)}>✕ Cancel</button>
                                    </>
                                )}

                                {upcoming && !paid && (
                                    <button className="pd-btn pd-btn-primary pd-btn-sm"
                                        onClick={() => navigate('/patient/doctors')}>
                                        💳 Complete Payment
                                    </button>
                                )}

                                {a.status?.toLowerCase() === 'completed' && (
                                    <>
                                        <button className="pd-btn pd-btn-outline pd-btn-sm"
                                            onClick={() => openReview(a)}>📝 Review</button>
                                        <button className="pd-btn pd-btn-outline pd-btn-sm"
                                            onClick={() => navigate(`/patient/inbox?doctor=${a.doctorId}`)}>💬 Message</button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Cancel Confirm Modal ── */}
            {cancelId && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.55)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: 20
                }} onClick={() => setCancelId(null)}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: 32, maxWidth: 380, width: '100%',
                        boxShadow: '0 24px 64px rgba(10,40,20,0.35)', textAlign: 'center'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '3rem', marginBottom: 10 }}>⚠️</div>
                        <h3 style={{ fontFamily: 'Playfair Display, serif', marginBottom: 8 }}>Cancel Appointment?</h3>
                        <p style={{ color: '#6b8f71', fontSize: '0.88rem', lineHeight: 1.65 }}>
                            This action cannot be undone. The doctor will be notified.<br />
                            <strong>Refunds are subject to cancellation policy.</strong>
                        </p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button className="pd-btn pd-btn-danger" style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => handleCancel(cancelId)}>Yes, Cancel</button>
                            <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => setCancelId(null)}>Keep It</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Review Modal ── */}
            {reviewAppt && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.60)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: 20
                }} onClick={() => setReviewAppt(null)}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: 36, maxWidth: 480, width: '100%',
                        boxShadow: '0 24px 64px rgba(10,40,20,0.35)'
                    }} onClick={e => e.stopPropagation()}>
                        {submitted ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🌿</div>
                                <h3 style={{ fontFamily: 'Playfair Display,serif', color: '#2d6a4f', marginBottom: 8 }}>Thank you for your review!</h3>
                                <p style={{ color: '#6b8f71', fontSize: '0.86rem', lineHeight: 1.7 }}>
                                    Your feedback helps other patients choose the right doctor.
                                </p>
                                <button className="pd-btn pd-btn-primary" style={{ marginTop: 22, justifyContent: 'center', width: '100%' }}
                                    onClick={() => setReviewAppt(null)}>Done</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                    <div style={{ width: 54, height: 54, borderRadius: '50%', fontSize: '1.6rem', background: 'linear-gradient(135deg,#2d6a4f,#0d2410)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>🌿</div>
                                    <div>
                                        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: '1rem' }}>Dr. {reviewAppt.doctorName}</div>
                                        <div style={{ fontSize: '0.80rem', color: '#2d6a4f', fontWeight: 600 }}>{reviewAppt.spec}</div>
                                    </div>
                                </div>
                                <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 8, color: '#1a2e1a' }}>How would you rate this consultation?</p>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 6, justifyContent: 'center' }}>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} style={{ fontSize: '2.2rem', background: 'none', border: 'none', cursor: 'pointer', transform: (hover || stars) >= n ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.15s', filter: (hover || stars) >= n ? 'none' : 'grayscale(1)' }}
                                            onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}>⭐</button>
                                    ))}
                                </div>
                                {(hover || stars) > 0 && (
                                    <p style={{ textAlign: 'center', fontSize: '0.80rem', color: '#2d6a4f', marginBottom: 12, fontWeight: 600 }}>
                                        {STAR_LABELS[(hover || stars) - 1]}
                                    </p>
                                )}
                                <div className="pd-form-group" style={{ marginTop: 10 }}>
                                    <label htmlFor="feedback">Share your experience (optional)</label>
                                    <textarea id="feedback" className="pd-textarea" rows={3}
                                        placeholder="What went well? What could be improved?"
                                        value={feedback} onChange={e => setFeedback(e.target.value)} />
                                </div>
                                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: '#1a2e1a' }}>Would you recommend this doctor?</p>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                                    {['👍 Yes', '👎 No', '🤷 Maybe'].map(opt => (
                                        <button key={opt} className={`pd-btn pd-btn-sm ${recommend === opt ? 'pd-btn-primary' : 'pd-btn-outline'}`}
                                            onClick={() => setRecommend(opt)} style={{ flex: 1, justifyContent: 'center' }}>{opt}</button>
                                    ))}
                                </div>
                                {!stars && <p style={{ fontSize: '0.74rem', color: '#e74c3c', marginBottom: 8 }}>⚠️ Please select a star rating to continue</p>}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={submitReview} disabled={!stars}>✅ Submit Review</button>
                                    <button className="pd-btn pd-btn-outline" onClick={() => setReviewAppt(null)}>Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
