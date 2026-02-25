import React, { useState } from 'react';

const MOCK_EMERGENCIES = [
    { id: 'EM-99283', patient: 'Rohit Sharma', age: 34, type: 'critical', desc: 'Severe chest pain, difficulty breathing. Started 10 mins ago.', time: '2m ago', location: 'Mumbai, MH', contact: '+91 98765-43210', emergency_contact: 'Sita Sharma (Wife) - +91 98765-43211' },
    { id: 'EM-99284', patient: 'Anjali Gupta', age: 28, type: 'urgent', desc: 'High fever (103°F) with rash. Not responding to paracetamol.', time: '8m ago', location: 'Delhi, NCR', contact: '+91 91234-56789', emergency_contact: 'Vikram Gupta (Father) - +91 91234-56780' },
];

export default function EmergencyDashboard() {
    const [emergencies, setEmergencies] = useState(MOCK_EMERGENCIES);
    const [activeOverlay, setActiveOverlay] = useState(null); // 'video', 'history', 'family'
    const [activeEmergency, setActiveEmergency] = useState(null);

    const handleResolve = (id) => {
        setEmergencies(emergencies.filter(e => e.id !== id));
        setActiveOverlay(null);
    };

    const openOverlay = (type, emergency) => {
        setActiveEmergency(emergency);
        setActiveOverlay(type);
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
            <div className="dd-header">
                <div>
                    <h1 style={{ color: '#c0392b' }}>🚨 Emergency Command Center</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Active critical cases requiring immediate medical intervention</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div className="dd-status-pill status-active" style={{ padding: '8px 16px' }}>Status: Ready for Response</div>
                </div>
            </div>

            {emergencies.length === 0 ? (
                <div className="dd-card" style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 20 }}>✅</div>
                    <h3>No Active Emergencies</h3>
                    <p style={{ color: 'var(--doc-text-mute)' }}>System is monitoring for new alerts. All clear.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {emergencies.map(e => (
                        <div key={e.id} className="dd-card" style={{
                            borderLeft: `8px solid ${e.type === 'critical' ? '#c0392b' : '#d35400'}`,
                            padding: 0, overflow: 'hidden'
                        }}>
                            <div style={{ background: e.type === 'critical' ? '#fff5f5' : '#fff9f5', padding: '20px 30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px',
                                                borderRadius: 20, background: e.type === 'critical' ? '#c0392b' : '#d35400',
                                                color: '#fff', textTransform: 'uppercase'
                                            }}>{e.type}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#666' }}>ID: {e.id} • {e.time}</span>
                                        </div>
                                        <h2 style={{ margin: '15px 0 5px', color: 'var(--doc-green-deep)' }}>{e.patient} ({e.age}y)</h2>
                                        <div style={{ fontSize: '0.9rem', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            📍 Reported Location: <strong>{e.location}</strong>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <button
                                            className="dd-btn dd-btn-primary"
                                            style={{ background: '#c0392b', color: '#fff', padding: '12px 24px', fontSize: '1rem' }}
                                            onClick={() => openOverlay('video', e)}
                                        >
                                            📞 Initiate Emergency Video Call
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '20px 30px', borderTop: '1px solid var(--doc-border)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', marginBottom: 10 }}>Case Brief</div>
                                <p style={{ fontSize: '1rem', lineHeight: 1.6, margin: 0, color: '#333' }}>
                                    {e.desc}
                                </p>
                            </div>

                            <div style={{ padding: '15px 30px', background: '#fcfcfc', borderTop: '1px solid var(--doc-border)', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 15 }}>
                                    <button className="dd-btn dd-btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => openOverlay('history', e)}>View Medical History</button>
                                    <button className="dd-btn dd-btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => openOverlay('family', e)}>Contact Family</button>
                                </div>
                                <button
                                    className="dd-btn dd-btn-outline"
                                    style={{ color: 'var(--doc-green-light)', borderColor: 'var(--doc-green-light)', fontSize: '0.8rem' }}
                                    onClick={() => handleResolve(e.id)}
                                >
                                    Mark as Handled
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Emergency Overlays ── */}
            {activeOverlay && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 600, maxHieght: '90vh', overflow: 'hidden', position: 'relative' }}>
                        <button onClick={() => setActiveOverlay(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.1)', border: 'none', width: 40, height: 40, borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>×</button>

                        {activeOverlay === 'video' && (
                            <div style={{ textAlign: 'center', background: '#1a1a1a', color: '#fff', padding: 40 }}>
                                <div style={{ fontSize: '4rem', marginBottom: 20 }}>📡</div>
                                <h2>Establishing Secure Connection</h2>
                                <p style={{ color: '#aaa', marginBottom: 30 }}>Connecting to {activeEmergency.patient}...</p>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }}></div>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite 0.3s' }}></div>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite 0.6s' }}></div>
                                </div>
                                <button className="dd-btn dd-btn-primary" style={{ background: '#c0392b', border: 'none', margin: '40px auto 0', padding: '15px 40px' }} onClick={() => setActiveOverlay(null)}>Cancel Call</button>
                            </div>
                        )}

                        {activeOverlay === 'history' && (
                            <div style={{ padding: 40 }}>
                                <h2 style={{ color: 'var(--doc-green-deep)', marginBottom: 20 }}>📋 Medical History: {activeEmergency.patient}</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12 }}>
                                        <h4 style={{ margin: '0 0 10px' }}>Known Conditions</h4>
                                        <p style={{ margin: 0, fontSize: '0.95rem' }}>Hypertension (diagnosed 2021), Seasonal Allergies (Pollen).</p>
                                    </div>
                                    <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12 }}>
                                        <h4 style={{ margin: '0 0 10px' }}>Current Medications</h4>
                                        <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.95rem' }}>
                                            <li>Amlodipine 5mg (Daily)</li>
                                            <li>Ayurvedic Triphala Churna (Nightly)</li>
                                        </ul>
                                    </div>
                                    <div style={{ background: '#fff5f5', padding: 20, borderRadius: 12, border: '1px solid #feb2b2' }}>
                                        <h4 style={{ margin: '0 0 10px', color: '#c53030' }}>Allergies & Contraindications</h4>
                                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#9b2c2c', fontWeight: 600 }}>Sulfa drugs, Penicillin.</p>
                                    </div>
                                </div>
                                <button className="dd-btn dd-btn-primary" style={{ width: '100%', marginTop: 30, justifyContent: 'center' }} onClick={() => setActiveOverlay(null)}>Close History</button>
                            </div>
                        )}

                        {activeOverlay === 'family' && (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', marginBottom: 20 }}>👨‍👩‍👧‍👦</div>
                                <h2 style={{ marginBottom: 10 }}>Emergency Contacts</h2>
                                <p style={{ color: 'var(--doc-text-mute)', marginBottom: 30 }}>Primary contacts for {activeEmergency.patient}</p>

                                <div style={{ background: '#f8f9f8', padding: 25, borderRadius: 16, textAlign: 'left', marginBottom: 20 }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', marginBottom: 5 }}>Primary Contact</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10 }}>{activeEmergency.emergency_contact}</div>
                                    <button className="dd-btn dd-btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#2d3748' }}>📞 Dial Now</button>
                                </div>

                                <div style={{ background: '#f8f9f8', padding: 25, borderRadius: 16, textAlign: 'left' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', marginBottom: 5 }}>Secondary Contact</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 10 }}>Rahul Sharma (Brother)</div>
                                    <div style={{ fontSize: '1rem', color: '#666' }}>+91 91234-99887</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="dd-card" style={{ marginTop: 30, background: '#1a1a1a', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 10px #00ff00' }}></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Emergency Telemetry: Active</div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>Last sync: 1s ago</div>
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

