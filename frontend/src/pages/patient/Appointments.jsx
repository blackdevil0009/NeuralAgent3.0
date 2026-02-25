import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const APPOINTMENTS = [
    { id: 1, doc: 'Dr. Arjun Menon', spec: 'Ayurveda & General', day: '28', month: 'Feb', time: '10:00 AM', type: 'Video Call', status: 'Upcoming', badge: '🌿', doctorId: 1 },
    { id: 2, doc: 'Dr. Priya Nair', spec: 'Nutrition & Diet', day: '05', month: 'Mar', time: '04:30 PM', type: 'Chat', status: 'Upcoming', badge: '🥗', doctorId: 2 },
    { id: 3, doc: 'Vaidya R. Tripathi', spec: 'Panchakarma', day: '12', month: 'Feb', time: '11:00 AM', type: 'In-Person', status: 'Completed', badge: '🪴', doctorId: 3 },
    { id: 4, doc: 'Dr. Kavya Reddy', spec: 'Dermatology', day: '01', month: 'Feb', time: '03:30 PM', type: 'Video Call', status: 'Completed', badge: '✨', doctorId: 4 },
    { id: 5, doc: 'Dr. Ramesh Sharma', spec: 'Cardiology', day: '19', month: 'Jan', time: '09:00 AM', type: 'In-Person', status: 'Cancelled', badge: '❤️', doctorId: 5 },
];

const STATUS_PILL = {
    Upcoming: 'pd-pill-blue',
    Completed: 'pd-pill-green',
    Cancelled: 'pd-pill-red',
};

const STAR_LABELS = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];

export default function Appointments() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState('All');
    const [cancelId, setCancelId] = useState(null);
    const [reviewAppt, setReviewAppt] = useState(null);  // appt being reviewed
    const [appointments, setAppointments] = useState(APPOINTMENTS);

    /* Review form state */
    const [stars, setStars] = useState(0);
    const [hover, setHover] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [recommend, setRecommend] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    const filtered = filter === 'All' ? appointments : appointments.filter(a => a.status === filter);

    const handleCancel = (id) => {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Cancelled', badge: '❌' } : a));
        setCancelId(null);
    };

    const openReview = (appt) => {
        setReviewAppt(appt);
        setStars(0); setHover(0); setFeedback('');
        setRecommend(null); setSubmitted(false);
    };

    const submitReview = () => {
        if (!stars) return;
        setSubmitted(true);
        // In real app → POST /api/reviews
    };

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
                    { icon: '📅', label: 'Upcoming', val: appointments.filter(a => a.status === 'Upcoming').length, color: 'blue' },
                    { icon: '✅', label: 'Completed', val: appointments.filter(a => a.status === 'Completed').length, color: 'green' },
                    { icon: '❌', label: 'Cancelled', val: appointments.filter(a => a.status === 'Cancelled').length, color: 'red' },
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

            {/* Filter tabs */}
            <div className="pd-search-filters" style={{ marginBottom: 20 }}>
                {['All', 'Upcoming', 'Completed', 'Cancelled'].map(f => (
                    <button key={f} className={`pd-filter-chip ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}>{f}</button>
                ))}
            </div>

            {/* Appointment list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.length === 0 ? (
                    <div className="pd-empty">
                        <div className="pd-empty-icon">📭</div>
                        <h3>No {filter.toLowerCase()} appointments</h3>
                    </div>
                ) : filtered.map(a => (
                    <div key={a.id} className="pd-appt-card">
                        <div className="pd-appt-date-block">
                            <div className="pd-appt-day">{a.day}</div>
                            <div className="pd-appt-month">{a.month}</div>
                        </div>
                        <div className="pd-appt-info">
                            <div className="pd-appt-title">{a.badge} {a.doc}</div>
                            <div className="pd-appt-meta">{a.spec} &nbsp;·&nbsp; ⏰ {a.time} &nbsp;·&nbsp; {a.type}</div>
                        </div>
                        <div className="pd-appt-actions">
                            <span className={`pd-pill ${STATUS_PILL[a.status]}`}>{a.status}</span>
                            {a.status === 'Upcoming' && (
                                <>
                                    {a.type === 'Video Call' || a.type === 'Chat' ? (
                                        <button className="pd-btn pd-btn-primary pd-btn-sm"
                                            onClick={() => navigate(`/patient/vcall?doctor=${a.doctorId}`)}>
                                            ▶ Join
                                        </button>
                                    ) : (
                                        <button className="pd-btn pd-btn-primary pd-btn-sm">📍 Directions</button>
                                    )}
                                    <button className="pd-btn pd-btn-danger pd-btn-sm"
                                        onClick={() => setCancelId(a.id)}>✕ Cancel</button>
                                </>
                            )}
                            {a.status === 'Completed' && (
                                <>
                                    <button className="pd-btn pd-btn-outline pd-btn-sm"
                                        onClick={() => openReview(a)}>📝 Review</button>
                                    <button className="pd-btn pd-btn-outline pd-btn-sm"
                                        onClick={() => navigate(`/patient/inbox?doctor=${a.doctorId}`)}>💬 Message</button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
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
                            This action cannot be undone. The doctor will be notified.
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
                            /* ── Success state ── */
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🌿</div>
                                <h3 style={{ fontFamily: 'Playfair Display,serif', color: '#2d6a4f', marginBottom: 8 }}>
                                    Thank you for your review!
                                </h3>
                                <p style={{ color: '#6b8f71', fontSize: '0.86rem', lineHeight: 1.7 }}>
                                    Your feedback helps other patients choose the right doctor. Your review has been submitted.
                                </p>
                                <button className="pd-btn pd-btn-primary" style={{ marginTop: 22, justifyContent: 'center', width: '100%' }}
                                    onClick={() => setReviewAppt(null)}>
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                    <div style={{
                                        width: 54, height: 54, borderRadius: '50%', fontSize: '1.6rem',
                                        background: 'linear-gradient(135deg,#2d6a4f,#0d2410)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>{reviewAppt.badge}</div>
                                    <div>
                                        <div style={{ fontFamily: 'Playfair Display,serif', fontSize: '1rem' }}>{reviewAppt.doc}</div>
                                        <div style={{ fontSize: '0.80rem', color: '#2d6a4f', fontWeight: 600 }}>{reviewAppt.spec}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9aaa9a', marginTop: 2 }}>
                                            {reviewAppt.day} {reviewAppt.month} · {reviewAppt.time}
                                        </div>
                                    </div>
                                </div>

                                {/* Star rating */}
                                <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 8, color: '#1a2e1a' }}>
                                    How would you rate this consultation?
                                </p>
                                <div style={{ display: 'flex', gap: 6, marginBottom: 6, justifyContent: 'center' }}>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button key={n} style={{
                                            fontSize: '2.2rem', background: 'none', border: 'none', cursor: 'pointer',
                                            transform: (hover || stars) >= n ? 'scale(1.15)' : 'scale(1)',
                                            transition: 'transform 0.15s', filter: (hover || stars) >= n ? 'none' : 'grayscale(1)'
                                        }}
                                            onClick={() => setStars(n)}
                                            onMouseEnter={() => setHover(n)}
                                            onMouseLeave={() => setHover(0)}
                                        >⭐</button>
                                    ))}
                                </div>
                                {(hover || stars) > 0 && (
                                    <p style={{ textAlign: 'center', fontSize: '0.80rem', color: '#2d6a4f', marginBottom: 12, fontWeight: 600 }}>
                                        {STAR_LABELS[(hover || stars) - 1]}
                                    </p>
                                )}

                                {/* Feedback text */}
                                <div className="pd-form-group" style={{ marginTop: 10 }}>
                                    <label>Share your experience (optional)</label>
                                    <textarea className="pd-textarea" rows={3}
                                        placeholder="What went well? What could be improved?"
                                        value={feedback} onChange={e => setFeedback(e.target.value)}
                                    />
                                </div>

                                {/* Recommend question */}
                                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: '#1a2e1a' }}>
                                    Would you recommend {reviewAppt.doc} to others?
                                </p>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                                    {['👍 Yes', '👎 No', '🤷 Maybe'].map(opt => (
                                        <button key={opt}
                                            className={`pd-btn pd-btn-sm ${recommend === opt ? 'pd-btn-primary' : 'pd-btn-outline'}`}
                                            onClick={() => setRecommend(opt)}
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >{opt}</button>
                                    ))}
                                </div>

                                {/* Submit */}
                                {!stars && (
                                    <p style={{ fontSize: '0.74rem', color: '#e74c3c', marginBottom: 8 }}>
                                        ⚠️ Please select a star rating to continue
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={submitReview} disabled={!stars}>
                                        ✅ Submit Review
                                    </button>
                                    <button className="pd-btn pd-btn-outline"
                                        onClick={() => setReviewAppt(null)}>Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
