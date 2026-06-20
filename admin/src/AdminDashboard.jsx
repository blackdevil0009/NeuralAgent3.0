import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const STAT_CONFIG = [
    { key: 'total_patients',       label: 'Total Patients',       icon: '🧑‍🤝‍🧑', color: '#2d6a4f' },
    { key: 'total_doctors',        label: 'Total Doctors',        icon: '👨‍⚕️', color: '#1a6b9a' },
    { key: 'total_appointments',   label: 'Appointments',         icon: '📅', color: '#7b2d8b' },
    { key: 'active_subscriptions', label: 'Active Subscriptions', icon: '⭐', color: '#b85c00' },
    { key: 'verified_doctors',     label: 'Verified Doctors',     icon: '✅', color: '#2d6a4f' },
    { key: 'pending_doctors',      label: 'Pending Approval',     icon: '⏳', color: '#8a6400' },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('adm_token');

    useEffect(() => {
        fetch(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(j => { if (j.data) setStats(j.data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return <div className="adm-loading">Loading dashboard…</div>;

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', color: '#1b4332', marginBottom: 4 }}>Platform Overview</h2>
                <p style={{ color: '#6b8f71', fontSize: '0.87rem' }}>Live statistics across the VaidyaMed-X healthcare platform</p>
            </div>

            <div className="adm-stat-grid">
                {STAT_CONFIG.map(s => (
                    <div key={s.key} className="adm-stat-card">
                        <div className="adm-stat-icon">{s.icon}</div>
                        <div className="adm-stat-value" style={{ color: s.color }}>{stats?.[s.key] ?? '—'}</div>
                        <div className="adm-stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="adm-card">
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1b4332', marginBottom: 16 }}>🚀 Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button className="adm-btn adm-btn-primary" onClick={() => navigate('/doctors')} style={{ justifyContent: 'flex-start' }}>
                            👨‍⚕️ Manage Doctors
                        </button>
                        <button className="adm-btn adm-btn-ghost" onClick={() => navigate('/patients')} style={{ justifyContent: 'flex-start' }}>
                            🧑‍🤝‍🧑 Manage Patients
                        </button>
                        <button className="adm-btn adm-btn-ghost" style={{ justifyContent: 'flex-start', color: '#8a6400' }}>
                            ⏳ Pending Verifications ({stats?.pending_doctors || 0})
                        </button>
                    </div>
                </div>

                <div className="adm-card">
                    <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1rem', color: '#1b4332', marginBottom: 16 }}>🆕 Recently Joined</h3>
                    {!stats?.recent_users?.length ? (
                        <div className="adm-empty" style={{ padding: '10px 0' }}>No recent users.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {stats.recent_users.map(u => (
                                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: u.role === 'doctor' ? 'rgba(26,107,154,0.12)' : 'rgba(45,106,79,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                                            {u.role === 'doctor' ? '👨‍⚕️' : '👤'}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a2e1a' }}>{u.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#999' }}>{u.email}</div>
                                        </div>
                                    </div>
                                    <span className={`adm-badge ${u.role === 'doctor' ? 'adm-badge-blue' : 'adm-badge-green'}`}>{u.role}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
