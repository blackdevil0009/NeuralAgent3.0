import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';

const SPECIALIZATIONS = ['All', 'Ayurveda', 'Nutrition', 'Cardio', 'Derm', 'Ortho'];

export default function DoctorSearch() {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [bookingDoc, setBookingDoc] = useState(null);
    const [booked, setBooked] = useState(false);
    const [loading, setLoading] = useState(true);

    // Booking form state
    const [aptDate, setAptDate] = useState('');
    const [aptTime, setAptTime] = useState('09:00 AM');
    const [aptType, setAptType] = useState('Video Call');
    const [aptNotes, setAptNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    React.useEffect(() => {
        const fetchDocs = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/doctors`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    setDoctors(json.data?.doctors || []);
                }
            } catch (err) {
                console.error('Failed to fetch doctors:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, []);

    const filtered = doctors.filter(d => {
        const queryLower = query.toLowerCase();
        const specLower = (d.spec || '').toLowerCase();
        const nameLower = (d.name || '').toLowerCase();
        const filterLower = activeFilter.toLowerCase();

        const matchQ = !query || nameLower.includes(queryLower) || specLower.includes(queryLower);
        const matchF = activeFilter === 'All' || specLower.includes(filterLower);
        return matchQ && matchF;
    });

    const handleBookSubmit = async () => {
        if (!aptDate || !aptTime) return alert('Please select date and time');
        setSubmitting(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctorId: bookingDoc.id,
                    date: aptDate,
                    time: aptTime,
                    type: aptType,
                    notes: aptNotes
                })
            });
            if (res.ok) {
                setBooked(true);
            } else {
                const json = await res.json();
                alert(json.data?.error || 'Booking failed');
            }
        } catch (err) {
            alert('Connection error. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🔍 Find Doctors</h1>
                    <p>Search from our network of verified clinical experts</p>
                </div>
                <span className="pd-pill pd-pill-green">{doctors.length} Doctors Online</span>
            </div>

            {/* Search bar */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    className="pd-input"
                    placeholder="🔍  Search by name, specialization, symptom…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    style={{ borderRadius: 50, padding: '12px 20px' }}
                />
            </div>

            {/* Filters */}
            <div className="pd-search-filters">
                {SPECIALIZATIONS.map(s => (
                    <button key={s} className={`pd-filter-chip ${activeFilter === s ? 'active' : ''}`}
                        onClick={() => setActiveFilter(s)}>{s}</button>
                ))}
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
                    {filtered.map(d => (
                        <div key={d.id} className="pd-doctor-card">
                            <div className="pd-doctor-avatar">{d.badge || '🩺'}</div>
                            <div style={{ flex: 1 }}>
                                <div className="pd-doctor-name">{d.name}</div>
                                <div className="pd-doctor-spec">{d.spec}</div>
                                <div className="pd-doctor-meta">
                                    <span>⭐ {d.rating || 4.8}</span>
                                    <span>🕐 {d.experience || '10+ yrs'} exp</span>
                                    <span>🏥 {d.hospital || 'VaidyaMed-X Clinic'}</span>
                                    <span>💰 ₹{d.fee || 800}/consult</span>
                                </div>
                                <div className="pd-doctor-actions">
                                    <button className="pd-btn pd-btn-primary pd-btn-sm"
                                        onClick={() => { setBookingDoc(d); setBooked(false); }}>
                                        📅 Book Appointment
                                    </button>
                                    <button className="pd-btn pd-btn-outline pd-btn-sm"
                                        onClick={() => navigate(`/patient/inbox?doctor=${d.id}`)}>
                                        💬 Send Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {bookingDoc && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.60)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: 20
                }} onClick={() => setBookingDoc(null)}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: 36,
                        maxWidth: 480, width: '100%',
                        boxShadow: '0 24px 64px rgba(10,40,20,0.35)'
                    }} onClick={e => e.stopPropagation()}>
                        {booked ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🎉</div>
                                <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#2d6a4f', marginBottom: 6 }}>Appointment Booked!</h2>
                                <p style={{ color: '#6b8f71', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                    Your appointment with <strong>{bookingDoc.name}</strong> has been confirmed.<br />
                                    You can view the details in your dashboard.
                                </p>
                                <button className="pd-btn pd-btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
                                    onClick={() => { setBookingDoc(null); navigate('/patient/appointments'); }}>
                                    View My Appointments
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%', fontSize: '1.6rem',
                                        background: 'linear-gradient(135deg,#2d6a4f,#0d2410)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                                    }}>{bookingDoc.badge || '🩺'}</div>
                                    <div>
                                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>{bookingDoc.name}</div>
                                        <div style={{ fontSize: '0.80rem', color: '#6b8f71' }}>{bookingDoc.spec}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="pd-form-group">
                                        <label>Consultation Type</label>
                                        <select className="pd-select" value={aptType} onChange={e => setAptType(e.target.value)}>
                                            <option>Video Call</option>
                                            <option>Chat Consultation</option>
                                        </select>
                                    </div>
                                    <div className="pd-form-group">
                                        <label>Preferred Date</label>
                                        <input type="date" className="pd-input"
                                            min={new Date().toISOString().split('T')[0]}
                                            value={aptDate} onChange={e => setAptDate(e.target.value)} />
                                    </div>
                                    <div className="pd-form-group">
                                        <label>Preferred Time</label>
                                        <select className="pd-select" value={aptTime} onChange={e => setAptTime(e.target.value)}>
                                            <option>09:00 AM</option><option>10:00 AM</option>
                                            <option>11:00 AM</option><option>02:00 PM</option>
                                            <option>03:00 PM</option><option>04:30 PM</option>
                                        </select>
                                    </div>
                                    <div className="pd-form-group">
                                        <label>Reason for visit</label>
                                        <textarea className="pd-textarea"
                                            placeholder="Briefly describe your symptoms or reason…"
                                            rows={3} value={aptNotes} onChange={e => setAptNotes(e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                    <button className="pd-btn pd-btn-primary"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={handleBookSubmit} disabled={submitting}>
                                        {submitting ? '⏳ Booking…' : `✅ Confirm Booking (₹${bookingDoc.fee || 800})`}
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
