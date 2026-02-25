import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CONSULTANTS = [
    {
        id: 1, name: 'Dr. Arjun Menon', badge: '🌿', spec: 'Ayurveda & Holistic Health',
        exp: '14 yrs', rating: 4.9, fee: '₹500', avail: 'Today',
        about: 'Expert in classical Ayurveda with a focus on Panchakarma therapy, dosha management, and chronic disease reversal. Trained from Kerala Ayurveda Academy.',
        specialties: ['Dosha Assessment', 'Panchakarma', 'Stress & Anxiety', 'Chronic Conditions'],
    },
    {
        id: 2, name: 'Dr. Meena Krishnan', badge: '🧘', spec: 'Mind-Body Medicine & Yoga',
        exp: '12 yrs', rating: 4.8, fee: '₹450', avail: 'Tomorrow',
        about: 'Specialises in integrating yoga therapy, mindfulness, and Ayurvedic medicine for mental and physical wellness. MBBS + MD (Alternative Medicine).',
        specialties: ['Yoga Therapy', 'Meditation', 'Anxiety & Depression', 'Hormonal Balance'],
    },
    {
        id: 3, name: 'Dr. Priya Nair', badge: '🥗', spec: 'Nutritional & Functional Medicine',
        exp: '9 yrs', rating: 4.8, fee: '₹400', avail: 'Today',
        about: 'Combines modern nutritional science with Ayurvedic dietary principles to create personalised meal plans that heal from within.',
        specialties: ['Diet Planning', 'Weight Management', 'Gut Health', 'Diabetes Management'],
    },
];

const FAQS = [
    { q: 'How does an online consultation work?', a: 'Once booked, you will receive a link to join a secure video call at your scheduled time. You can also upload reports in advance for the doctor to review.' },
    { q: 'Are the consultants verified?', a: 'Yes. All consultants on NeuralAgent are verified with valid medical council registration numbers, degrees, and identity proof.' },
    { q: 'Can I get an Ayurvedic and allopathic opinion together?', a: 'Absolutely. You can book separate consultations or request a joint opinion. Many of our doctors offer integrated care advice.' },
    { q: 'What if I\'m not satisfied?', a: 'We offer a 100% satisfaction guarantee. If unhappy within 24 hours, you can request a free repeat consultation or a refund.' },
];

export default function MedicalConsultant() {
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState(null);
    const [selected, setSelected] = useState(null);

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>👨‍⚕️ Medical Consultants</h1>
                    <p>Connect with expert Ayurvedic and integrated medicine specialists</p>
                </div>
                <button className="pd-btn pd-btn-primary" onClick={() => navigate('/patient/doctors')}>
                    Browse All Doctors
                </button>
            </div>

            {/* Hero strip */}
            <div className="pd-consultant-hero">
                <div className="pd-consultant-icon">🏥</div>
                <div>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#2d6a4f', fontSize: '1.25rem', marginBottom: 5 }}>
                        Expert Care, Anytime
                    </h2>
                    <p style={{ fontSize: '0.86rem', color: '#5a755a', lineHeight: 1.7 }}>
                        Our panel of verified doctors blends Ayurvedic wisdom with modern medicine to provide you with personalised, evidence-backed health consultations — from the comfort of your home.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                    {[['200+', 'Doctors'], ['50K+', 'Consults'], ['4.8★', 'Rating']].map(([n, l]) => (
                        <div key={l} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.6rem', color: '#2d6a4f', lineHeight: 1 }}>{n}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b8f71', marginTop: 3 }}>{l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Featured consultants */}
            <h3 className="pd-section-title">⭐ Featured Consultants</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                {CONSULTANTS.map(c => (
                    <div key={c.id} className="pd-card" style={{ cursor: 'default' }}>
                        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%', fontSize: '1.8rem',
                                background: 'linear-gradient(135deg,#2d6a4f,#0d2410)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>{c.badge}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontFamily: 'Playfair Display,serif', fontSize: '1.05rem', marginBottom: 2 }}>{c.name}</div>
                                <div style={{ fontSize: '0.82rem', color: '#2d6a4f', fontWeight: 600, marginBottom: 6 }}>{c.spec}</div>
                                <p style={{ fontSize: '0.83rem', color: '#5a755a', lineHeight: 1.7, marginBottom: 10 }}>{c.about}</p>
                                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
                                    {c.specialties.map(s => (
                                        <span key={s} className="pd-pill pd-pill-green">{s}</span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 20, fontSize: '0.80rem', color: '#6b8f71', marginBottom: 12 }}>
                                    <span>⭐ {c.rating}</span>
                                    <span>🕐 {c.exp}</span>
                                    <span>💰 {c.fee}/session</span>
                                    <span className="pd-pill pd-pill-green">Available: {c.avail}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="pd-btn pd-btn-primary pd-btn-sm"
                                        onClick={() => setSelected(c)}>📅 Book Consultation</button>
                                    <button className="pd-btn pd-btn-outline pd-btn-sm"
                                        onClick={() => navigate(`/patient/inbox?doctor=${c.id}`)}>💬 Chat First</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* FAQ Accordion */}
            <h3 className="pd-section-title">❓ Frequently Asked Questions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FAQS.map((f, i) => (
                    <div key={i} style={{
                        background: '#fff', border: '1px solid rgba(45,106,79,0.12)',
                        borderRadius: 12, overflow: 'hidden'
                    }}>
                        <button style={{
                            width: '100%', textAlign: 'left', padding: '14px 18px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontFamily: 'Poppins,sans-serif', fontSize: '0.88rem', fontWeight: 600, color: '#1a2e1a'
                        }} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                            {f.q}
                            <span style={{ fontSize: '1.2rem', color: '#2d6a4f', flexShrink: 0 }}>
                                {openFaq === i ? '−' : '+'}
                            </span>
                        </button>
                        {openFaq === i && (
                            <div style={{ padding: '0 18px 14px', fontSize: '0.84rem', color: '#5a755a', lineHeight: 1.72 }}>
                                {f.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Booking modal */}
            {selected && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.60)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: 20
                }} onClick={() => setSelected(null)}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: 36,
                        maxWidth: 460, width: '100%', boxShadow: '0 24px 64px rgba(10,40,20,0.35)'
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontFamily: 'Playfair Display,serif', color: '#2d6a4f', marginBottom: 14 }}>
                            Book with {selected.name}
                        </h3>
                        <div className="pd-form-group">
                            <label>Type</label>
                            <select className="pd-select"><option>Video Call</option><option>Chat</option></select>
                        </div>
                        <div className="pd-form-group">
                            <label>Date</label>
                            <input type="date" className="pd-input" min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="pd-form-group">
                            <label>Time Slot</label>
                            <select className="pd-select">
                                <option>10:00 AM</option><option>11:00 AM</option>
                                <option>02:00 PM</option><option>04:00 PM</option>
                            </select>
                        </div>
                        <div className="pd-form-group">
                            <label>Chief Complaint</label>
                            <textarea className="pd-textarea" placeholder="Describe your main concern…" rows={3} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                            <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                                onClick={() => { setSelected(null); navigate('/patient/appointments'); }}>
                                ✅ Confirm ({selected.fee})
                            </button>
                            <button className="pd-btn pd-btn-outline" onClick={() => setSelected(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
