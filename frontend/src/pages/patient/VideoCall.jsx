import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';

const TIPS = [
    'Ensure good lighting before joining a video call.',
    'Test your microphone and camera before the session starts.',
    'Have your reports ready to share with the doctor.',
    'Use a stable internet connection for best experience.',
    'Be in a quiet, private room for your consultation.',
];

export default function VideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const doctorId = searchParams.get('doctor');
    const apptId = searchParams.get('appt');

    const [phase, setPhase] = useState('permission'); // permission | connecting | live
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [doctor, setDoctor] = useState({ name: 'Doctor', badge: '👨‍⚕️', spec: 'Consultation' });
    const pollInterval = useRef(null);

    /* Fetch doctor info */
    useEffect(() => {
        if (!doctorId) return;
        const fetchDoc = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/doctors`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    const docs = json.data?.doctors || [];
                    const match = docs.find(d => String(d.id) === String(doctorId));
                    if (match) setDoctor({ name: match.name, badge: '👨‍⚕️', spec: match.spec || 'Consultation' });
                }
            } catch { }
        };
        fetchDoc();
    }, [doctorId]);

    /* Start Polling for Doctor Admission */
    const startConnecting = () => {
        setPhase('connecting');
    };

    /* Poll the backend to check if appointment status is 'Live' */
    useEffect(() => {
        if (phase !== 'connecting' || !apptId) return;

        const checkStatus = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok && json.data?.appointments) {
                    const myAppt = json.data.appointments.find(a => String(a.id) === String(apptId));
                    if (myAppt && (myAppt.status === 'Live' || myAppt.status === 'Completed')) {
                        clearInterval(pollInterval.current);
                        setPhase('live');
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        checkStatus(); // Initial check
        pollInterval.current = setInterval(checkStatus, 3000); // Check every 3 seconds

        return () => clearInterval(pollInterval.current);
    }, [phase, apptId]);

    const endCall = async () => {
        setPhase('permission'); // Reset
        navigate(-1);
    };

    /* ─── PERMISSION SCREEN ─── */
    if (phase === 'permission') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Video Consultation</h2>
                <p className="vcall-conn-spec">with {doctor.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    To ensure your privacy and security, you will enter a secure waiting room. 
                    The session will begin instantly once <strong>{doctor.name}</strong> admits you.
                </p>
                <div className="vcall-tip" style={{ marginTop: 16 }}>💡 {tip}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center', fontSize: '0.95rem' }}
                        onClick={startConnecting}>
                        ✅ Enter Waiting Room
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate(-1)}>
                        ✕ Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    /* ─── WAITING ROOM SCREEN ─── */
    if (phase === 'connecting') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">{doctor.badge}</div>
                <h2 className="vcall-conn-name">{doctor.name}</h2>
                <p className="vcall-conn-spec">{doctor.spec}</p>
                <div className="vcall-pulse-ring">
                    <div className="vcall-pulse-dot" />
                </div>
                <p className="vcall-conn-status">Waiting for doctor to admit you…</p>
                <p style={{ color: '#4CAF50', fontSize: '0.85rem', fontWeight: 'bold' }}>Your secure session will begin automatically.</p>
                <p style={{ color: '#6b8f71', fontSize: '0.78rem', marginTop: 6 }}>Checking status...</p>
                <div className="vcall-tip" style={{ marginTop: 15 }}>💡 {tip}</div>
                <button className="pd-btn pd-btn-danger" style={{ marginTop: 20 }} onClick={endCall}>
                    ✕ Leave Waiting Room
                </button>
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
                    <span>Live with {doctor.name}</span>
                </div>
                <button onClick={() => navigate('/patient/appointments')} style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>
                    Leave Call
                </button>
            </div>
            {/* Jitsi Meet Iframe Container */}
            <iframe 
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                src={`https://meet.jit.si/${roomName}#userInfo.displayName="Patient"`}
                style={{ height: '100%', width: '100%', border: 0 }}
                title="VaidyaMedX Secure Video Call"
            />
        </div>
    );
}
