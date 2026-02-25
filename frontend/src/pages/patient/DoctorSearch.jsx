import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DOCTORS = [
    { id: 1, name: 'Dr. Arjun Menon', spec: 'Ayurveda & General Medicine', exp: '14 yrs', rating: 4.9, reviews: 312, fee: '₹500', lang: 'English, Malayalam', avail: 'Today', badge: '🌿', type: 'Ayurveda' },
    { id: 2, name: 'Dr. Priya Nair', spec: 'Nutrition & Dietetics', exp: '9 yrs', rating: 4.8, reviews: 185, fee: '₹400', lang: 'English, Tamil', avail: 'Tomorrow', badge: '🥗', type: 'Nutrition' },
    { id: 3, name: 'Dr. Ramesh Sharma', spec: 'Cardiology', exp: '22 yrs', rating: 4.7, reviews: 523, fee: '₹900', lang: 'Hindi, English', avail: '3 Mar', badge: '❤️', type: 'Cardio' },
    { id: 4, name: 'Dr. Kavya Reddy', spec: 'Dermatology & Skin', exp: '11 yrs', rating: 4.8, reviews: 290, fee: '₹600', lang: 'Telugu, English', avail: 'Today', badge: '✨', type: 'Derm' },
    { id: 5, name: 'Vaidya R. Tripathi', spec: 'Classical Ayurveda & Panchakarma', exp: '18 yrs', rating: 4.9, reviews: 407, fee: '₹700', lang: 'Hindi, Sanskrit', avail: 'Today', badge: '🪴', type: 'Ayurveda' },
    { id: 6, name: 'Dr. Siddharth Iyer', spec: 'Orthopedics & Sports Medicine', exp: '16 yrs', rating: 4.6, reviews: 214, fee: '₹750', lang: 'English,Kannada', avail: '4 Mar', badge: '🦴', type: 'Ortho' },
];

const SPECIALIZATIONS = ['All', 'Ayurveda', 'Nutrition', 'Cardio', 'Derm', 'Ortho'];

export default function DoctorSearch() {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [bookingDoc, setBookingDoc] = useState(null);
    const [booked, setBooked] = useState(false);

    const filtered = DOCTORS.filter(d => {
        const matchQ = !query || d.name.toLowerCase().includes(query.toLowerCase()) || d.spec.toLowerCase().includes(query.toLowerCase());
        const matchF = activeFilter === 'All' || d.type === activeFilter;
        return matchQ && matchF;
    });

    const handleBook = async (doc) => {
        setBookingDoc(doc); setBooked(false);
        await new Promise(r => setTimeout(r, 1400));
        setBooked(true);
    };

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🔍 Find Doctors</h1>
                    <p>Search from 200+ verified doctors — Ayurvedic, Allopathic & Specialist</p>
                </div>
                <span className="pd-pill pd-pill-green">200+ Doctors Available</span>
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
            {filtered.length === 0 ? (
                <div className="pd-empty">
                    <div className="pd-empty-icon">👨‍⚕️</div>
                    <h3>No doctors found</h3>
                    <p>Try a different name or specialization.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filtered.map(d => (
                        <div key={d.id} className="pd-doctor-card">
                            <div className="pd-doctor-avatar">{d.badge}</div>
                            <div style={{ flex: 1 }}>
                                <div className="pd-doctor-name">{d.name}</div>
                                <div className="pd-doctor-spec">{d.spec}</div>
                                <div className="pd-doctor-meta">
                                    <span>⭐ {d.rating} ({d.reviews} reviews)</span>
                                    <span>🕐 {d.exp} experience</span>
                                    <span>🗣️ {d.lang}</span>
                                    <span>💰 {d.fee}/consult</span>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                    <span className="pd-pill pd-pill-green" style={{ marginRight: 6 }}>Available: {d.avail}</span>
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
                                    <button className="pd-btn pd-btn-outline pd-btn-sm"
                                        onClick={() => navigate('/patient/appointments')}>
                                        👁️ View Profile
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
                                    You'll receive a confirmation on your registered email & phone.
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
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>{bookingDoc.badge}</div>
                                    <div>
                                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>{bookingDoc.name}</div>
                                        <div style={{ fontSize: '0.80rem', color: '#6b8f71' }}>{bookingDoc.spec}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="pd-form-group">
                                        <label>Consultation Type</label>
                                        <select className="pd-select">
                                            <option>Video Call</option>
                                            <option>Chat Consultation</option>
                                            <option>In-Person Visit</option>
                                        </select>
                                    </div>
                                    <div className="pd-form-group">
                                        <label>Preferred Date</label>
                                        <input type="date" className="pd-input" min={new Date().toISOString().split('T')[0]} />
                                    </div>
                                    <div className="pd-form-group">
                                        <label>Preferred Time</label>
                                        <select className="pd-select">
                                            <option>09:00 AM</option><option>10:00 AM</option>
                                            <option>11:00 AM</option><option>02:00 PM</option>
                                            <option>03:00 PM</option><option>04:30 PM</option>
                                        </select>
                                    </div>
                                    <div className="pd-form-group">
                                        <label>Reason for visit</label>
                                        <textarea className="pd-textarea" placeholder="Briefly describe your symptoms or reason…" rows={3} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                    <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => handleBook(bookingDoc)}>
                                        ✅ Confirm Booking ({bookingDoc.fee})
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
