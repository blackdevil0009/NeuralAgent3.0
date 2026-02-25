import React, { useState } from 'react';

const MOCK_NOTIFS = [
    { id: 1, title: 'Report Analysis Complete', desc: 'AI has finished analyzing Rohit Sharma\'s CBC reports.', time: '10m ago', unread: true },
    { id: 2, title: 'New Message', desc: 'Anjali Gupta sent a follow-up about her prescription.', time: '45m ago', unread: true },
    { id: 3, title: 'Appointment Rescheduled', desc: 'Suresh Iyer moved his 3:00 PM slot to tomorrow.', time: '2h ago', unread: false },
];

export default function DoctorNotifications() {
    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="dd-header">
                <div>
                    <h1>🔔 Clinical Alerts</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Stay updated with patient activities and system health</p>
                </div>
                <button className="dd-btn dd-btn-outline">Mark All Read</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {MOCK_NOTIFS.map(n => (
                    <div key={n.id} className="dd-card" style={{
                        opacity: n.unread ? 1 : 0.7,
                        borderLeft: n.unread ? '4px solid var(--doc-accent)' : '1px solid var(--doc-border)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--doc-green-deep)' }}>{n.title}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--doc-text-dark)', marginTop: 4 }}>{n.desc}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)', marginTop: 8 }}>⏱ {n.time}</div>
                            </div>
                            <button style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }}>✕</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dd-card" style={{ marginTop: 30 }}>
                <h3>Alert Preferences</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 15 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>Emergency SMS Alerts</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)' }}>Get notified on your mobile for critical patient updates.</div>
                        </div>
                        <input type="checkbox" defaultChecked />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600 }}>Daily Schedule Email</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)' }}>Receive your consultation list every morning at 8:00 AM.</div>
                        </div>
                        <input type="checkbox" defaultChecked />
                    </div>
                </div>
            </div>
        </div>
    );
}
