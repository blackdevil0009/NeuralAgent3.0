import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const TIPS = [
    'Ensure good lighting before joining a video call.',
    'Test your microphone and camera before the session starts.',
    'Have your reports ready to share with the doctor.',
    'Use a stable internet connection for best experience.',
    'Be in a quiet, private room for your consultation.',
];

const DOCTORS = {
    1: { name: 'Dr. Arjun Menon', badge: '🌿', spec: 'Ayurveda & Holistic Health' },
    2: { name: 'Dr. Priya Nair', badge: '🥗', spec: 'Nutrition & Dietetics' },
    3: { name: 'Dr. Meena Krishnan', badge: '🧘', spec: 'Mind-Body Medicine' },
};

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

export default function VideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const doctorId = parseInt(searchParams.get('doctor')) || 1;
    const doctor = DOCTORS[doctorId] || DOCTORS[1];

    const [phase, setPhase] = useState('connecting'); // connecting | live | ended
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMsgs, setChatMsgs] = useState([]);
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);

    const timer = useTimer(phase === 'live');

    /* Auto-connect after 3s */
    useEffect(() => {
        const t = setTimeout(() => setPhase('live'), 3000);
        return () => clearTimeout(t);
    }, []);

    /* Simulated remote video with CSS animation */
    const endCall = () => setPhase('ended');

    const sendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        const msg = { from: 'me', text: chatInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setChatMsgs(prev => [...prev, msg]);
        setChatInput('');
        setTimeout(() => {
            setChatMsgs(prev => [...prev, {
                from: 'them', text: 'Thank you for sharing. I have noted that.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        }, 1000);
    };

    /* ─── CONNECTING SCREEN ─── */
    if (phase === 'connecting') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">{doctor.badge}</div>
                <h2 className="vcall-conn-name">{doctor.name}</h2>
                <p className="vcall-conn-spec">{doctor.spec}</p>
                <div className="vcall-pulse-ring">
                    <div className="vcall-pulse-dot" />
                </div>
                <p className="vcall-conn-status">Connecting to your doctor…</p>
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
                    Thank you for your consultation with {doctor.name}. A summary will be sent to your inbox.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/patient/inbox')}>
                        💬 Open Inbox
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/patient/appointments')}>
                        📅 Back to Appointments
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate('/patient/health')}>
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
                <div className="vcall-remote-avatar">{doctor.badge}</div>
                <div className="vcall-remote-label">{doctor.name}</div>
                <div className="vcall-remote-pulse" />
            </div>

            {/* Local self-view */}
            <div className="vcall-self">
                {camOn
                    ? <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a3a28,#0d2410)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🧘</div>
                    : <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '0.80rem' }}>Camera off</div>
                }
                <div className="vcall-self-label">You</div>
            </div>

            {/* Top info bar */}
            <div className="vcall-topbar">
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>{doctor.name}</span>
                    <span className="vcall-spec">{doctor.spec}</span>
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
                <button className="vcall-ctrl" onClick={() => navigate('/patient/reports')} title="Share Report">
                    📄 <span>Reports</span>
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
