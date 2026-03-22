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
    const doctorId = searchParams.get('doctor');

    const [phase, setPhase] = useState('permission'); // permission | connecting | live | ended
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMsgs, setChatMsgs] = useState([]);
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [permError, setPermError] = useState('');
    const [doctor, setDoctor] = useState({ name: 'Doctor', badge: '👨‍⚕️', spec: 'Consultation' });

    const localVideoRef = useRef(null);
    const streamRef = useRef(null);
    const timer = useTimer(phase === 'live');

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

    /* Request camera/mic permissions */
    const requestPermissions = useCallback(async () => {
        try {
            setPermError('');
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            setPhase('connecting');
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                setPermError('Camera & microphone access was denied. Please allow permissions in your browser settings and try again.');
            } else if (err.name === 'NotFoundError') {
                setPermError('No camera or microphone found. Please connect a webcam and try again.');
            } else {
                setPermError(`Could not access camera/mic: ${err.message}`);
            }
        }
    }, []);

    /* Wait for doctor to join */
    useEffect(() => {
        if (phase === 'connecting') {
            // Simulated delay for doctor to grant permission
            const t = setTimeout(() => {
                // In a real app this would be driven by WebSocket events 
                // from the signaling server when the doctor accepts.
                setPhase('live');
            }, 8000); // Increased wait time to simulate doctor granting permission
            return () => clearTimeout(t);
        }
    }, [phase]);

    /* Attach stream to video element when live */
    useEffect(() => {
        if (phase === 'live' && localVideoRef.current && streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    /* Toggle cam on/off */
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(t => { t.enabled = camOn; });
        }
    }, [camOn]);

    /* Toggle mic on/off */
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getAudioTracks().forEach(t => { t.enabled = micOn; });
        }
    }, [micOn]);

    /* Cleanup stream on unmount */
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const endCall = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setPhase('ended');
    };

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
        }, 1200);
    };

    /* ─── PERMISSION SCREEN ─── */
    if (phase === 'permission') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Video Consultation</h2>
                <p className="vcall-conn-spec">with {doctor.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    To start the video call, we need access to your <strong>camera</strong> and <strong>microphone</strong>.
                    Please click the button below and allow permissions when prompted.
                </p>
                {permError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.82rem', marginTop: 12, lineHeight: 1.6 }}>
                        ⚠️ {permError}
                    </div>
                )}
                <div className="vcall-tip" style={{ marginTop: 16 }}>💡 {tip}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center', fontSize: '0.95rem' }}
                        onClick={requestPermissions}>
                        📹 Allow Camera & Mic — Join Call
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }}
                        onClick={() => navigate(-1)}>
                        ✕ Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    /* ─── CONNECTING SCREEN (waiting for doctor) ─── */
    if (phase === 'connecting') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">{doctor.badge}</div>
                <h2 className="vcall-conn-name">{doctor.name}</h2>
                <p className="vcall-conn-spec">{doctor.spec}</p>
                <div className="vcall-pulse-ring">
                    <div className="vcall-pulse-dot" />
                </div>
                <p className="vcall-conn-status">Waiting for doctor to accept the call…</p>
                <p style={{ color: '#6b8f71', fontSize: '0.78rem', marginBottom: 6 }}>✅ Camera & microphone ready</p>
                <p style={{ color: '#4CAF50', fontSize: '0.85rem', fontWeight: 'bold' }}>The session will begin once the doctor grants access.</p>
                <div className="vcall-tip" style={{ marginTop: 15 }}>💡 {tip}</div>
                <button className="pd-btn pd-btn-danger" style={{ marginTop: 20 }} onClick={() => { endCall(); navigate(-1); }}>
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
            {/* Remote video panel (doctor side — simulated) */}
            <div className="vcall-remote">
                <div className="vcall-remote-avatar">{doctor.badge}</div>
                <div className="vcall-remote-label">{doctor.name}</div>
                <div className="vcall-remote-pulse" />
            </div>

            {/* Local self-view (real webcam) */}
            <div className="vcall-self">
                {camOn
                    ? <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', transform: 'scaleX(-1)' }} />
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
