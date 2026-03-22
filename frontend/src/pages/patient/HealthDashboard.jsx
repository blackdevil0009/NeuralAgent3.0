import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { handleError } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

const VITALS = [
    { icon: '❤️', label: 'Heart Rate', value: '72', unit: 'bpm', change: '+2%', dir: 'up', color: 'red' },
    { icon: '🩸', label: 'Blood Pressure', value: '118/76', unit: 'mmHg', change: 'Normal', dir: 'up', color: 'blue' },
    { icon: '🌡️', label: 'Temperature', value: '36.6', unit: '°C', change: 'Normal', dir: 'up', color: 'gold' },
    { icon: '⚖️', label: 'BMI', value: '22.4', unit: '', change: 'Healthy', dir: 'up', color: 'green' },
    { icon: '🫁', label: 'SpO2', value: '98', unit: '%', change: 'Good', dir: 'up', color: 'purple' },
    { icon: '💤', label: 'Sleep', value: '7.2', unit: 'hrs', change: '-0.3', dir: 'down', color: 'blue' },
];

const ACTIVITY = [
    { title: 'AI Consultation completed', time: '2h ago', dot: '#52b788' },
    { title: 'Blood test report uploaded', time: '5h ago', dot: '#c9a84c' },
    { title: 'Appointment with Dr. Menon', time: 'Yesterday', dot: '#74c0fc' },
    { title: 'Dosha assessment completed', time: '2 days ago', dot: '#2d6a4f' },
    { title: 'Prescription renewed', time: '3 days ago', dot: '#e9c46a' },
];

export default function HealthDashboard() {
    const [greeting, setGreeting] = useState('');
    const [userName, setUserName] = useState('Friend');
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const h = new Date().getHours();
        setGreeting(h < 12 ? '🌅 Good Morning' : h < 17 ? '☀️ Good Afternoon' : '🌙 Good Evening');
        try {
            const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            if (u.name) setUserName(u.name.split(' ')[0]);
        } catch { }

        const fetchUpcoming = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const all = json.data?.appointments || [];
                    const filtered = all
                        .filter(a => a.status === 'Scheduled' || a.status === 'Upcoming')
                        .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
                        .slice(0, 2);
                    setUpcoming(filtered);
                }
            } catch (err) {
                handleError(err, 'Failed to fetch upcoming appointments');
            } finally {
                setLoading(false);
            }
        };
        fetchUpcoming();
    }, []);

    // Helper to format date
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return {
            day: d.getDate().toString().padStart(2, '0'),
            month: d.toLocaleString('en-IN', { month: 'short' })
        };
    };

    return (
        <div>
            {/* Hero greeting banner */}
            <div className="pd-health-hero">
                <div>
                    <h2>{greeting}, {userName}! 🌿</h2>
                    <p>Here's your health overview for today — stay balanced, stay healthy.</p>
                    <div className="pd-dosha-bars" style={{ marginTop: 14 }}>
                        <div className="pd-dosha-row">
                            <span style={{ width: 46 }}>Vata</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-vata" style={{ width: '40%' }} /></div>
                            <span>40%</span>
                        </div>
                        <div className="pd-dosha-row">
                            <span style={{ width: 46 }}>Pitta</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-pitta" style={{ width: '35%' }} /></div>
                            <span>35%</span>
                        </div>
                        <div className="pd-dosha-row">
                            <span style={{ width: 46 }}>Kapha</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-kapha" style={{ width: '25%' }} /></div>
                            <span>25%</span>
                        </div>
                    </div>
                </div>
                <div className="pd-health-hero-right">
                    <div className="pd-dosha-score">78</div>
                    <div className="pd-dosha-label">Overall Health Score</div>
                    <div style={{ marginTop: 10 }}>
                        <span className="pd-pill pd-pill-green">Vata-Pitta</span>
                    </div>
                </div>
            </div>

            {/* Vitals Grid */}
            <h3 className="pd-section-title">📊 Today's Vitals</h3>
            <div className="pd-grid-3" style={{ marginBottom: 24 }}>
                {VITALS.map(v => (
                    <div className="pd-stat-card" key={v.label}>
                        <div className={`pd-stat-icon ${v.color}`}>{v.icon}</div>
                        <div>
                            <div className="pd-stat-value">{v.value}<small style={{ fontSize: '0.70rem', fontWeight: 400, marginLeft: 3 }}>{v.unit}</small></div>
                            <div className="pd-stat-label">{v.label}</div>
                            <div className={`pd-stat-change ${v.dir}`}>{v.dir === 'up' ? '▲' : '▼'} {v.change}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lower 2 cols */}
            <div className="pd-grid-2">
                {/* Recent activity */}
                <div className="pd-card">
                    <h3 className="pd-section-title">🕐 Recent Activity</h3>
                    <ul className="pd-timeline">
                        {ACTIVITY.map((a, i) => (
                            <li key={i}>
                                <div className="pd-tl-dot" style={{ background: a.dot }} />
                                <div>
                                    <div className="pd-tl-title">{a.title}</div>
                                    <div className="pd-tl-time">{a.time}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Upcoming appointments */}
                <div className="pd-card">
                    <h3 className="pd-section-title">📅 Upcoming Appointments</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b8f71', fontSize: '0.88rem' }}>⏳ Fetching your schedule…</div>
                        ) : upcoming.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px 0', color: '#999', fontSize: '0.88rem' }}>No upcoming appointments.</div>
                        ) : upcoming.map((u, i) => {
                            const { day, month } = formatDate(u.appointmentDate);
                            return (
                                <div key={u.id} style={{
                                    display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px',
                                    background: 'rgba(45,106,79,0.05)', borderRadius: 12,
                                    border: '1px solid rgba(45,106,79,0.10)'
                                }}>
                                    <div style={{
                                        background: 'rgba(45,106,79,0.10)', borderRadius: 10,
                                        padding: '8px 10px', textAlign: 'center', flexShrink: 0
                                    }}>
                                        <div style={{ fontSize: '0.65rem', color: '#6b8f71', textTransform: 'uppercase' }}>
                                            {month}
                                        </div>
                                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.3rem', color: '#2d6a4f', lineHeight: 1 }}>
                                            {day}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{u.doctorName}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#6b8f71' }}>{u.spec}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#6b8f71', marginTop: 2 }}>⏰ {u.appointmentTime.substring(0, 5)} · {u.type}</div>
                                    </div>
                                    <span className={`pd-pill ${u.type === 'Video Call' ? 'pd-pill-blue' : 'pd-pill-green'}`}>{u.type}</span>
                                </div>
                            );
                        })}
                        <Link to="/patient/appointments" className="pd-btn pd-btn-outline" style={{ justifyContent: 'center', marginTop: 4 }}>
                            View All Appointments
                        </Link>
                    </div>
                </div>
            </div>

            {/* Ayurvedic tip */}
            <div style={{
                marginTop: 20, background: 'linear-gradient(135deg,#f4faf6,#eaf5ee)',
                border: '1px solid rgba(45,106,79,0.14)', borderRadius: 16, padding: '18px 22px',
                display: 'flex', gap: 14, alignItems: 'center'
            }}>
                <span style={{ fontSize: '2rem' }}>🌿</span>
                <div>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.95rem', color: '#2d6a4f', marginBottom: 3 }}>
                        Ayurvedic Tip of the Day
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#5a755a', lineHeight: 1.7 }}>
                        Start your morning with warm water and a teaspoon of honey mixed with fresh ginger to balance Vata and Pitta doshas.
                    </div>
                </div>
            </div>
        </div>
    );
}
