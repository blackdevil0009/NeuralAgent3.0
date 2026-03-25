import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

const SPECIALIZATIONS = ['All', 'Ayurveda', 'Allopathy', 'Homeopathy', 'Cardiology',
    'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Gynecology', 'General Medicine'];

const SPEC_COLORS = {
    ayurveda: { bg: '#e8f5e9', color: '#2d6a4f', icon: '🌿' },
    homeopathy: { bg: '#f3e5f5', color: '#6a1b9a', icon: '💊' },
    cardiology: { bg: '#fce4ec', color: '#c62828', icon: '❤️' },
    dermatology: { bg: '#fff8e1', color: '#e65100', icon: '🧴' },
    neurology: { bg: '#e3f2fd', color: '#1565c0', icon: '🧠' },
    orthopedics: { bg: '#e8eaf6', color: '#283593', icon: '🦴' },
    pediatrics: { bg: '#e0f7fa', color: '#00695c', icon: '👶' },
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

export default function DoctorSearch() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [query, setQuery] = useState('');
    const [locationQuery, setLocationQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [bookingDoc, setBookingDoc] = useState(null);
    const [booked, setBooked] = useState(false);
    const [loading, setLoading] = useState(true);
    // Map of doctorId → appointment object (if exists)
    const [appointmentMap, setAppointmentMap] = useState({});

    // Booking form state
    const [aptDate, setAptDate] = useState('');
    const [aptTime, setAptTime] = useState('10:00');
    const [aptType, setAptType] = useState('Video Call');
    const [aptNotes, setAptNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    // Load doctors + existing appointments in parallel
    useEffect(() => {
        const token = getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const cityParam = locationQuery ? `&city=${encodeURIComponent(locationQuery)}` : '';
        const fetchDoctors = fetch(`${API_BASE_URL}/api/doctors?${cityParam}`, { headers })
            .then(r => r.json()).then(j => j.data?.doctors || []).catch(() => []);

        const fetchAppointments = fetch(`${API_BASE_URL}/api/appointments`, { headers })
            .then(r => r.json()).then(j => j.data?.appointments || []).catch(() => []);

        Promise.all([fetchDoctors, fetchAppointments])
            .then(([docs, appts]) => {
                setDoctors(docs);
                // Build map: doctorId → latest active appointment
                const map = {};
                appts
                    .filter(a => a.status === 'Scheduled' || a.status === 'Completed')
                    .forEach(a => {
                        const key = String(a.doctorId);
                        if (!map[key]) map[key] = a; // keep first (most recent)
                    });
                setAppointmentMap(map);
            })
            .finally(() => setLoading(false));
    }, [locationQuery]);

    const filtered = doctors.filter(d => {
        const q = query.toLowerCase();
        const spec = (d.spec || '').toLowerCase();
        const name = (d.name || '').toLowerCase();
        const city = (d.city || '').toLowerCase();
        const state = (d.state || '').toLowerCase();
        const clinic = (d.clinicLocation || '').toLowerCase();
        const filt = activeFilter.toLowerCase();
        return (!query || name.includes(q) || spec.includes(q) || city.includes(q) || clinic.includes(q)) &&
               (activeFilter === 'All' || spec.includes(filt));
    });

    const handleBookSubmit = async () => {
        if (!aptDate || !aptTime) { handleError('Please select date and time'); return; }
        
        // Convert 24h to 12h format
        const [h, m] = aptTime.split(':');
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        const formattedTime = `${String(formattedHour).padStart(2, '0')}:${m} ${ampm}`;

        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({
                    doctorId: bookingDoc.id,
                    date: aptDate,
                    time: formattedTime,
                    type: aptType,
                    notes: aptNotes,
                }),
            });
            const json = await res.json();
            if (res.ok) {
                setBooked(true);
                // Update local appointment map so buttons unlock immediately
                const newAppt = { doctorId: bookingDoc.id, status: 'Scheduled', type: aptType, appointmentDate: aptDate, appointmentTime: formattedTime };
                setAppointmentMap(prev => ({ ...prev, [String(bookingDoc.id)]: newAppt }));
                handleSuccess(`Appointment booked! Dr. ${bookingDoc.name} has been notified.`);
            } else {
                handleError(json.data?.error || json.message || 'Booking failed');
            }
        } catch (err) {
            handleError('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

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
                <input type="text" className="pd-input"
                    placeholder="🔍  Search by name, specialization, symptom…"
                    value={query} onChange={e => setQuery(e.target.value)}
                    style={{ borderRadius: 50, padding: '12px 20px', flex: 2 }}
                />
                <input type="text" className="pd-input"
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
            <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '10px 16px', marginBottom: 18, fontSize: '0.82rem', color: '#795548', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                <span>To <strong>message or video call</strong> a doctor, you must first book an appointment. Consultations open at your scheduled time.</span>
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
                        const isToday = appt && appt.appointmentDate === new Date().toISOString().split('T')[0];

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
                                                ✅ Appointment Booked
                                            </span>
                                        )}
                                    </div>
                                    <div className="pd-doctor-spec">{d.spec}</div>
                                    <div className="pd-doctor-meta">
                                        <span>⭐ {d.rating || 4.8}</span>
                                        <span>🕐 {d.experience || '—'} yrs exp</span>
                                        <span>🏥 {d.hospital || '—'}</span>
                                        <span>💰 ₹{d.fee || 500}/consult</span>
                                        {d.workingHours && <span>🕑 {d.workingHours}</span>}
                                    </div>
                                    {(d.clinicLocation || d.city) && (
                                        <div style={{ fontSize: '0.78rem', color: '#6b8f71', marginTop: 2 }}>
                                            📍 {d.clinicLocation && `${d.clinicLocation}`}{d.city && ` — ${d.city}${d.state ? ', ' + d.state : ''}`}
                                        </div>
                                    )}

                                    <div className="pd-doctor-actions" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                                        {/* Book button — always shown unless already booked today */}
                                        <button className="pd-btn pd-btn-primary pd-btn-sm"
                                            onClick={() => { setBookingDoc(d); setBooked(false); setAptDate(''); setAptNotes(''); setAptType('Video Call'); }}>
                                            📅 {hasAppt ? 'Rebook' : 'Book Appointment'}
                                        </button>

                                        {/* Video Call — only if appointment exists */}
                                        {hasAppt ? (
                                            <button className="pd-btn pd-btn-outline pd-btn-sm"
                                                title={isToday ? '' : `Scheduled for ${appt.appointmentDate}`}
                                                onClick={() => navigate(`/patient/vcall?doctor=${d.id}`)}>
                                                📹 Video Call {isToday ? '🟢' : ''}
                                            </button>
                                        ) : (
                                            <button className="pd-btn pd-btn-outline pd-btn-sm" disabled
                                                title="Book an appointment first"
                                                style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                                                📹 Video Call 🔒
                                            </button>
                                        )}

                                        {/* Message — only if appointment exists */}
                                        {hasAppt ? (
                                            <button className="pd-btn pd-btn-outline pd-btn-sm"
                                                onClick={() => navigate(`/patient/inbox?doctor=${d.id}`)}>
                                                💬 Message
                                            </button>
                                        ) : (
                                            <button className="pd-btn pd-btn-outline pd-btn-sm" disabled
                                                title="Book an appointment first"
                                                style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                                                💬 Message 🔒
                                            </button>
                                        )}
                                    </div>

                                    {/* Appointment details if booked */}
                                    {hasAppt && (
                                        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#2d6a4f', background: '#f0faf4', borderRadius: 8, padding: '6px 12px', display: 'inline-flex', gap: 12 }}>
                                            <span>📅 {appt.appointmentDate}</span>
                                            <span>⏰ {String(appt.appointmentTime || '').substring(0, 5)}</span>
                                            <span>{appt.type === 'Video Call' ? '🎥' : appt.type === 'Offline' ? '🏥' : '💬'} {appt.type}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Booking Modal ── */}
            {bookingDoc && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.65)',
                    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: 20
                }} onClick={() => setBookingDoc(null)}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: 36,
                        maxWidth: 500, width: '100%',
                        boxShadow: '0 24px 64px rgba(10,40,20,0.35)'
                    }} onClick={e => e.stopPropagation()}>

                        {booked ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>🎉</div>
                                <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#2d6a4f', marginBottom: 6 }}>
                                    Appointment Booked!
                                </h2>
                                <p style={{ color: '#6b8f71', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                    Your appointment with <strong>Dr. {bookingDoc.name}</strong> has been confirmed.<br />
                                    {aptType === 'Offline / In-Clinic'
                                        ? `📍 Visit: ${bookingDoc.clinicLocation || bookingDoc.hospital || 'the clinic'} on ${aptDate} at ${aptTime}.`
                                        : `The doctor has been notified and ${aptType === 'Video Call' ? 'a video call link will be available' : 'chat will be unlocked'} at your scheduled time.`}
                                </p>
                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button className="pd-btn pd-btn-primary"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => { setBookingDoc(null); navigate('/patient/appointments'); }}>
                                        📅 View Appointments
                                    </button>
                                    {aptType !== 'Offline / In-Clinic' && (
                                        <button className="pd-btn pd-btn-outline"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => { setBookingDoc(null); navigate(aptType === 'Video Call' ? `/patient/vcall?doctor=${bookingDoc.id}` : `/patient/inbox?doctor=${bookingDoc.id}`); }}>
                                            {aptType === 'Video Call' ? '📹 Go to Video Call' : '💬 Open Chat'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Doctor info */}
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%', fontSize: '1.6rem',
                                        background: 'linear-gradient(135deg,#2d6a4f,#0d2410)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                                    }}>🩺</div>
                                    <div>
                                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>Dr. {bookingDoc.name}</div>
                                        <div style={{ fontSize: '0.80rem', color: '#6b8f71' }}>{bookingDoc.spec}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#2d6a4f', fontWeight: 600 }}>₹{bookingDoc.fee || 500} consultation fee</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Consultation Type */}
                                    <div className="pd-form-group">
                                        <label>Consultation Type</label>
                                        <select className="pd-select" value={aptType} onChange={e => setAptType(e.target.value)}>
                                            <option value="Video Call">🎥 Video Call</option>
                                            <option value="Chat Consultation">💬 Chat Consultation</option>
                                            <option value="Offline / In-Clinic">🏥 Offline / In-Clinic</option>
                                        </select>
                                        {aptType === 'Offline / In-Clinic' && bookingDoc.clinicLocation && (
                                            <div style={{ fontSize: '0.78rem', color: '#27ae60', marginTop: 4 }}>
                                                📍 Clinic: {bookingDoc.clinicLocation}
                                                {bookingDoc.hospital ? ` — ${bookingDoc.hospital}` : ''}
                                            </div>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <div className="pd-form-group">
                                        <label>Preferred Date</label>
                                        <input type="date" className="pd-input"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={aptDate} onChange={e => setAptDate(e.target.value)} />
                                    </div>

                                    {/* Time */}
                                    <div className="pd-form-group">
                                        <label>Preferred Time</label>
                                        <input type="time" className="pd-input"
                                            value={aptTime} onChange={e => setAptTime(e.target.value)} />
                                        {bookingDoc.workingHours && (
                                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 3 }}>
                                                🕑 Doctor's hours: {bookingDoc.workingHours}
                                            </div>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    <div className="pd-form-group">
                                        <label>Reason for visit / Symptoms</label>
                                        <textarea className="pd-textarea"
                                            placeholder="Briefly describe your symptoms or reason for consultation…"
                                            rows={3} value={aptNotes} onChange={e => setAptNotes(e.target.value)} />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                    <button className="pd-btn pd-btn-primary"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={handleBookSubmit} disabled={submitting}>
                                        {submitting ? '⏳ Booking…' : `✅ Confirm — ₹${bookingDoc.fee || 500}`}
                                    </button>
                                    <button className="pd-btn pd-btn-outline" onClick={() => setBookingDoc(null)}>Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
