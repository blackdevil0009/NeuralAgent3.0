import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';

export default function EmergencyDashboard() {
    const navigate = useNavigate();
    const [emergencies, setEmergencies] = useState([]);
    const [activeOverlay, setActiveOverlay] = useState(null);
    const [activeEmergency, setActiveEmergency] = useState(null);
    const [medicalData, setMedicalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const formatEmergency = (e) => ({
        id: e.id || `EM-${e.dbId}`,
        dbId: e.dbId || e.id?.replace('EM-', ''),
        patient: e.patient,
        patientId: e.patientId,
        contact: e.contact || 'Not on file',
        type: e.type,
        desc: e.desc,
        time: e.time,
    });

    useEffect(() => {
        // Fetch active emergencies
        const fetchEmergencies = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/emergencies`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const data = json.data?.emergencies || json.emergencies || [];
                    setEmergencies(data.map(formatEmergency));
                }
            } catch (err) {
                console.error("Failed to fetch emergencies", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmergencies();

        // Real-time socket
        const socket = io(API_BASE_URL, { transports: ['polling'], upgrade: false });
        socketRef.current = socket;
        socket.on('new_emergency', (newEm) => setEmergencies(prev => [formatEmergency(newEm), ...prev]));
        socket.on('emergency_handled', (data) => setEmergencies(prev => prev.filter(e => e.id !== data.id)));
        return () => socket.disconnect();
    }, []);

    const handleResolve = async (id, dbId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/emergencies/${dbId}/handle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setEmergencies(prev => prev.filter(e => e.id !== id));
                setActiveOverlay(null);
            } else {
                alert("Already handled or an error occurred.");
            }
        } catch { alert("Network error."); }
    };

    const initiateEmergencyCall = async (e) => {
        try {
            // Notify the patient via socket
            await fetch(`${API_BASE_URL}/api/emergencies/${e.dbId}/notify_patient`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch { /* best effort */ }
        // Navigate doctor to video call room
        navigate(`/doctor/vcall?room=emergency_${e.dbId}&patientId=${e.patientId}`);
    };

    const openHistory = async (e) => {
        setActiveEmergency(e);
        setMedicalData(null);
        setActiveOverlay('history');
        // Try to fetch patient's actual medical data
        try {
            const res = await fetch(`${API_BASE_URL}/api/patients/${e.patientId}/medical`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setMedicalData(json.data || json);
            }
        } catch { /* show blank if fails */ }
    };

    const dialFamily = (contact) => {
        const cleaned = contact.replace(/[\s\-()]/g, '');
        window.location.href = `tel:${cleaned}`;
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>
            <div className="dd-header">
                <div>
                    <h1 style={{ color: '#c0392b' }}>🚨 Emergency Command Center</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Active critical cases requiring immediate medical intervention</p>
                </div>
                <div className="dd-status-pill status-active" style={{ padding: '8px 16px' }}>Status: Ready for Response</div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>⏳ Loading active telemetries...</div>
            ) : emergencies.length === 0 ? (
                <div className="dd-card" style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 20 }}>✅</div>
                    <h3>No Active Emergencies</h3>
                    <p style={{ color: 'var(--doc-text-mute)' }}>System is monitoring for new alerts. All clear.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {emergencies.map(e => (
                        <div key={e.id} className="dd-card" style={{
                            borderLeft: `8px solid ${e.type === 'critical' ? '#c0392b' : e.type === 'urgent' ? '#d35400' : '#f1c40f'}`,
                            padding: 0, overflow: 'hidden'
                        }}>
                            <div style={{ background: e.type === 'critical' ? '#fff5f5' : '#fff9f5', padding: '20px 30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20,
                                                background: e.type === 'critical' ? '#c0392b' : e.type === 'urgent' ? '#d35400' : '#d4ac0d',
                                                color: '#fff', textTransform: 'uppercase'
                                            }}>{e.type}</span>
                                            <span style={{ fontSize: '0.85rem', color: '#666' }}>ID: {e.id} • {e.time}</span>
                                        </div>
                                        <h2 style={{ margin: '15px 0 5px', color: 'var(--doc-green-deep)' }}>{e.patient}</h2>
                                        <div style={{ fontSize: '0.9rem', color: '#555' }}>📞 Contact: <strong>{e.contact}</strong></div>
                                    </div>
                                    <button
                                        className="dd-btn dd-btn-primary"
                                        style={{ background: '#c0392b', color: '#fff', padding: '12px 24px', fontSize: '1rem' }}
                                        onClick={() => initiateEmergencyCall(e)}
                                    >
                                        📞 Initiate Emergency Video Call
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '20px 30px', borderTop: '1px solid var(--doc-border)' }}>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', marginBottom: 10 }}>Case Brief</div>
                                <p style={{ fontSize: '1rem', lineHeight: 1.6, margin: 0, color: '#333' }}>{e.desc}</p>
                            </div>

                            <div style={{ padding: '15px 30px', background: '#fcfcfc', borderTop: '1px solid var(--doc-border)', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 15 }}>
                                    <button className="dd-btn dd-btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => openHistory(e)}>📋 Medical History</button>
                                    <button className="dd-btn dd-btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => dialFamily(e.contact)}>📞 Contact Patient</button>
                                </div>
                                <button
                                    className="dd-btn dd-btn-outline"
                                    style={{ color: 'var(--doc-green-light)', borderColor: 'var(--doc-green-light)', fontSize: '0.8rem' }}
                                    onClick={() => handleResolve(e.id, e.dbId)}
                                >
                                    ✅ Mark as Handled
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Overlays ── */}
            {activeOverlay && activeEmergency && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
                        <button onClick={() => setActiveOverlay(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.1)', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>×</button>

                        {activeOverlay === 'history' && (
                            <div style={{ padding: 36 }}>
                                <h2 style={{ color: 'var(--doc-green-deep)', marginBottom: 20 }}>📋 Medical History: {activeEmergency.patient}</h2>
                                {!medicalData ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: 10 }}>⏳</div>
                                        <p>Loading medical data...</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {medicalData.conditions && (
                                            <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12 }}>
                                                <h4 style={{ margin: '0 0 8px' }}>🏥 Known Conditions</h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem' }}>{medicalData.conditions || '—'}</p>
                                            </div>
                                        )}
                                        {medicalData.medications && (
                                            <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12 }}>
                                                <h4 style={{ margin: '0 0 8px' }}>💊 Current Medications</h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem' }}>{medicalData.medications || '—'}</p>
                                            </div>
                                        )}
                                        {medicalData.allergies && (
                                            <div style={{ background: '#fff5f5', padding: 20, borderRadius: 12, border: '1px solid #feb2b2' }}>
                                                <h4 style={{ margin: '0 0 8px', color: '#c53030' }}>⚠️ Allergies</h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#9b2c2c' }}>{medicalData.allergies || '—'}</p>
                                            </div>
                                        )}
                                        {medicalData.dosha && (
                                            <div style={{ background: '#f0fff4', padding: 20, borderRadius: 12 }}>
                                                <h4 style={{ margin: '0 0 8px', color: '#22543d' }}>🌿 Ayurvedic Dosha</h4>
                                                <p style={{ margin: 0, fontSize: '0.95rem' }}>{medicalData.dosha}</p>
                                            </div>
                                        )}
                                        {!medicalData.conditions && !medicalData.medications && !medicalData.allergies && (
                                            <div style={{ textAlign: 'center', padding: '30px 0', color: '#aaa' }}>
                                                <p>No medical history on file for this patient.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button className="dd-btn dd-btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} onClick={() => setActiveOverlay(null)}>Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="dd-card" style={{ marginTop: 30, background: '#1a1a1a', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 10px #00ff00' }}></div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Emergency Telemetry: Active</div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>Tracking live via WebSocket</div>
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
