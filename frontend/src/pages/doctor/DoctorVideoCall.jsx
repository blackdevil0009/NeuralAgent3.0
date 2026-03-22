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

function useTimer(active) {
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => setSecs(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [active]);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    return `${mm}:${ss}`;
}

export default function DoctorVideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');
    const patientName = searchParams.get('name') || 'Patient';

    const [phase, setPhase] = useState('connecting'); // connecting | live | ended
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMsgs, setChatMsgs] = useState([]);
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [patient, setPatient] = useState({ name: patientName, badge: '🧘' });

    const timer = useTimer(phase === 'live');

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

    /* Auto-connect after 3s */
    useEffect(() => {
        const t = setTimeout(() => setPhase('live'), 3000);
        return () => clearTimeout(t);
    }, []);

    const endCall = () => setPhase('ended');

    const sendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msg = { from: 'me', text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setChatMsgs(prev => [...prev, msg]);
        setChatInput('');
        setTimeout(() => {
            setChatMsgs(prev => [...prev, {
                from: 'them', text: 'Thank you, Doctor. I understand.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 1000);
    };

    /* ─── CONNECTING SCREEN ─── */
    if (phase === 'connecting') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">{patient.badge}</div>
                <h2 className="vcall-conn-name">{patient.name}</h2>
                <p className="vcall-conn-spec">Patient Consultation</p>
                <div className="vcall-pulse-ring">
                    <div className="vcall-pulse-dot" />
                </div>
                <p className="vcall-conn-status">Connecting to your patient…</p>
                <div className="vcall-tip">💡 {tip}</div>
                <button className="pd-btn pd-btn-danger" style={{ marginTop: 20 }} onClick={() => navigate(-1)}>
                    ✕ Cancel
                </button>
            </div>
        </div>
    );

    /* ─── CALL ENDED SCREEN ─── */
    if (phase === 'ended') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                <h2 className="vcall-conn-name">Call Ended</h2>
                <p className="vcall-conn-spec">Duration: {timer}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7 }}>
                    Consultation with {patient.name} has ended. Notes will be saved in the clinical record.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/doctor/inbox')}>
                        💬 Open Inbox
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/doctor/schedule')}>
                        📅 Back to Schedule
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/doctor/dashboard')}>
                        🏥 Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );

    /* ─── LIVE CALL SCREEN ─── */
    return (
        <div className="vcall-shell">
            {/* Remote video panel */}
            <div className="vcall-remote">
                <div className="vcall-remote-avatar">{patient.badge}</div>
                <div className="vcall-remote-label">{patient.name}</div>
                <div className="vcall-remote-pulse" />
            </div>

            {/* Local self-view */}
            <div className="vcall-self">
                {camOn
                    ? <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a3a28,#0d2410)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>👨‍⚕️</div>
                    : <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.80rem' }}>Camera off</div>
                }
                <div className="vcall-self-label">You</div>
            </div>

            {/* Top info bar */}
            <div className="vcall-topbar">
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>{patient.name}</span>
                    <span className="vcall-spec">Patient Consultation</span>
                </div>
                <div className="vcall-timer">{timer}</div>
            </div>

            {/* Controls */}
            <div className="vcall-controls">
                <button className={`vcall-ctrl ${micOn ? '' : 'off'}`} onClick={() => setMicOn(p => !p)} title={micOn ? 'Mute' : 'Unmute'}>
                    {micOn ? '🎤' : '🔇'}
                    <span>{micOn ? 'Mute' : 'Unmute'}</span>
                </button>
                <button className={`vcall-ctrl ${camOn ? '' : 'off'}`} onClick={() => setCamOn(p => !p)} title={camOn ? 'Stop Cam' : 'Start Cam'}>
                    {camOn ? '📹' : '🚫'}
                    <span>{camOn ? 'Stop Cam' : 'Start Cam'}</span>
                </button>
                <button className="vcall-ctrl" onClick={() => navigate('/doctor/dashboard')} title="Patient File">
                    📄 <span>Patient File</span>
                </button>
                <button className="vcall-ctrl" onClick={() => setChatOpen(p => !p)} title="Chat">
                    💬 <span>Chat</span>
                    {chatMsgs.length > 0 && <span className="vcall-ctrl-badge">{chatMsgs.filter(m => m.from === 'them').length}</span>}
                </button>
                <button className="vcall-ctrl end" onClick={endCall} title="End Call">
                    📵 <span>End</span>
                </button>
            </div>

            {/* Side chat panel */}
            {chatOpen && (
                <div className="vcall-chat-panel">
                    <div className="vcall-chat-head">
                        <span>In-call Chat</span>
                        <button onClick={() => setChatOpen(false)}>✕</button>
                    </div>
                    <div className="vcall-chat-msgs">
                        {chatMsgs.length === 0
                            ? <p style={{ textAlign: 'center', color: '#aaa', fontSize: '0.80rem', marginTop: 20 }}>No messages yet.</p>
                            : chatMsgs.map((m, i) => (
                                <div key={i} className={`vcall-chat-bubble ${m.from}`}>
                                    <div>{m.text}</div>
                                    <div className="vcall-chat-time">{m.time}</div>
                                </div>
                            ))
                        }
                    </div>
                    <form className="vcall-chat-input-row" onSubmit={sendChat}>
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type here…" />
                        <button type="submit">➤</button>
                    </form>
                </div>
            )}
        </div>
    );
}
