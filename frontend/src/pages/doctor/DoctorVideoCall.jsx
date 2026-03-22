import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';

const TIPS = [
    'Ensure good lighting before joining a video call.',
    'Review the patient\'s file before the session starts.',
    'Have prescriptions ready to share with the patient.',
    'Use a stable internet connection for best experience.',
    'Be in a quiet, private room for your consultation.',
];

export default function DoctorVideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');
    const patientName = searchParams.get('name') || 'Patient';
    const apptId = searchParams.get('appt');

    const [phase, setPhase] = useState('permission'); // permission | live
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [permError, setPermError] = useState('');
    const [patient, setPatient] = useState({ name: patientName, badge: '🧘' });
    const [loading, setLoading] = useState(false);

    /* Fetch patient name if we have an ID */
    useEffect(() => {
        if (!patientId) return;
        const fetchPatient = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const appts = json.data?.appointments || [];
                    const match = appts.find(a => String(a.patientId) === String(patientId));
                    if (match) setPatient(p => ({ ...p, name: match.patientName }));
                }
            } catch { }
        };
        fetchPatient();
    }, [patientId]);

    /* Admit Patient => Set Status to Live => Join Room */
    const startSession = async () => {
        if (!apptId) {
            setPhase('live'); // Fallback if no appt ID
            return;
        }
        
        setLoading(true);
        setPermError('');
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments/${apptId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Live' })
            });
            const json = await res.json();
            
            if (res.ok) {
                setPhase('live');
            } else {
                setPermError(json.error || 'Failed to start session. Please try again.');
            }
        } catch (err) {
            setPermError('Network error. Could not start session.');
        } finally {
            setLoading(false);
        }
    };

    const endSession = async () => {
        if (apptId) {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                await fetch(`${API_BASE_URL}/api/appointments/${apptId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'Completed' })
                });
            } catch (err) {}
        }
        navigate('/doctor/schedule');
    };

    /* ─── PERMISSION SCREEN ─── */
    if (phase === 'permission') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Clinical Video Session</h2>
                <p className="vcall-conn-spec">with {patient.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    The patient is waiting in the secure network. 
                    Click the button below to grant access and begin the real-time video consultation.
                </p>
                {permError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.82rem', marginTop: 12, lineHeight: 1.6 }}>
                        ⚠️ {permError}
                    </div>
                )}
                <div className="vcall-tip" style={{ marginTop: 16 }}>💡 {tip}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center', fontSize: '0.95rem' }}
                        onClick={startSession} disabled={loading}>
                        {loading ? '⏳ Starting...' : '✅ Admit Patient & Start Session'}
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate(-1)}>
                        ✕ Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    /* ─── LIVE JITSI CALL SCREEN ─── */
    const roomName = `VaidyaMedX_Call_${apptId || Math.random().toString(36).substring(7)}`;

    return (
        <div className="vcall-shell" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="vcall-topbar" style={{ position: 'absolute', top: 0, width: '100%', zIndex: 10, background: 'rgba(10, 30, 15, 0.8)', padding: '10px 20px' }}>
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>Live Consultation with {patient.name}</span>
                </div>
                <button onClick={endSession} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                    End Consultation
                </button>
            </div>
            
            {/* Jitsi Meet Iframe Container */}
            <iframe 
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                src={`https://meet.jit.si/${roomName}#userInfo.displayName="Doctor"`}
                style={{ height: '100%', width: '100%', border: 0 }}
                title="VaidyaMedX Secure Video Call"
            />
        </div>
    );
}
