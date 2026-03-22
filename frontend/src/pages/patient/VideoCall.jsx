import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/config';

const TIPS = [
    'Test your microphone and camera before the session starts.',
    'Have your reports ready to share in the secure chat.',
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

const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export default function VideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const doctorId = searchParams.get('doctor');
    const apptId = searchParams.get('appt');

    const [phase, setPhase] = useState('permission'); // permission | connecting | live | ended
    const [tip] = useState(TIPS[0]);
    const [permError, setPermError] = useState('');
    const [doctor, setDoctor] = useState({ name: 'Doctor', badge: '👨‍⚕️', spec: 'Consultation' });

    // Controls
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    
    // Chat Controls
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    // WebRTC Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const streamRef = useRef(null);
    const pcRef = useRef(null);
    const socketRef = useRef(null);
    const pollInterval = useRef(null);
    const timer = useTimer(phase === 'live');

    useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, chatOpen]);

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

    /* Request Camera on mount */
    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            } catch (err) {
                setPermError("Camera/Mic access required for secure WebRTC. Please allow them.");
            }
        };
        initCamera();

        return () => {
            clearInterval(pollInterval.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (pcRef.current) pcRef.current.close();
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    /* Set up local streams when references update */
    useEffect(() => {
        if (localVideoRef.current && streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    /* Start Connecting Flow */
    const startConnecting = () => {
        if (!streamRef.current) {
            setPermError("Cannot start without Camera/Mic permissions.");
            return;
        }
        setPhase('connecting');
    };

    /* Poll backend for Doctor admitting the patient */
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
                    if (myAppt && (myAppt.status === 'Live')) {
                        clearInterval(pollInterval.current);
                        connectWebRTC(); // Trigger P2P join
                    }
                }
            } catch (err) {}
        };

        checkStatus();
        pollInterval.current = setInterval(checkStatus, 3000);

        return () => clearInterval(pollInterval.current);
    }, [phase, apptId]);

    /* Initialize Signaling and WebRTC */
    const connectWebRTC = () => {
        setPhase('live');
        try {
            const socket = io(API_BASE_URL);
            socketRef.current = socket;

            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
            }

            pc.ontrack = (event) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('new_ice_candidate', { room: apptId, candidate: event.candidate });
                }
            };

            // Patient creates Offer when Doctor is ready
            socket.on('doctor_ready', async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('video_offer', { room: apptId, offer });
                } catch (e) { console.error("Offer generation failed", e); }
            });

            // Handle incoming Answer
            socket.on('video_answer', async (answer) => {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) { }
            });

            socket.on('new_ice_candidate', async (candidate) => {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) { }
            });
            
            // Chat
            socket.on('call_chat_msg', (msg) => {
                setMessages(prev => [...prev, msg]);
            });

            socket.on('peer_left', () => endCall());
            socket.emit('join_video_room', { room: apptId });

        } catch (err) {
            setPermError("Failed to establish P2P connection.");
        }
    };

    /* Toggle Medias */
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
            streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
        }
    }, [camOn, micOn]);

    const endCall = () => {
        if (pcRef.current) pcRef.current.close();
        if (socketRef.current) socketRef.current.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setPhase('ended');
    };

    /* Chat & File Sharing */
    const sendMessage = () => {
        if (!chatInput.trim() || !socketRef.current) return;
        const msg = { text: chatInput, sender: 'Patient', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(p => [...p, { ...msg, self: true }]);
        socketRef.current.emit('call_chat_msg', { room: apptId, message: { ...msg, self: false } });
        setChatInput('');
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !socketRef.current) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.url) {
                const msg = { text: `Shared file:`, fileUrl: `${API_BASE_URL}${data.url}`, fileName: data.filename, sender: 'Patient', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
                setMessages(p => [...p, { ...msg, self: true }]);
                socketRef.current.emit('call_chat_msg', { room: apptId, message: { ...msg, self: false } });
            }
        } catch (err) {
            console.error("File upload failed", err);
        } finally {
            setUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /* ─── PERMISSION / WAITING / ENDED ─── */
    if (phase === 'permission') return (
        <div className="vcall-shell vcall-centered">
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Secure Telemedicine</h2>
                <p className="vcall-conn-spec">with {doctor.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    End-to-end encrypted connection. You will enter the waiting room first.
                </p>
                {permError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.82rem', marginTop: 12 }}>
                        ⚠️ {permError}
                    </div>
                )}
                <div className="vcall-tip" style={{ marginTop: 16 }}>💡 {tip}</div>
                <button className="pd-btn pd-btn-primary" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }} onClick={startConnecting}>
                    ✅ Enter Secure Waiting Room
                </button>
            </div>
        </div>
    );

    if (phase === 'connecting') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">{doctor.badge}</div>
                <h2 className="vcall-conn-name">{doctor.name}</h2>
                <div className="vcall-pulse-ring"><div className="vcall-pulse-dot" /></div>
                <p className="vcall-conn-status">Waiting for doctor to admit you…</p>
                <button className="pd-btn pd-btn-danger" style={{ marginTop: 20 }} onClick={endCall}>✕ Leave</button>
            </div>
        </div>
    );

    if (phase === 'ended') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                <h2 className="vcall-conn-name">Consultation Ended</h2>
                <p className="vcall-conn-spec">Duration: {timer}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8 }}>Your secure P2P session was completed.</p>
                <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }} onClick={() => navigate('/patient/appointments')}>
                    Return to Dashboard
                </button>
            </div>
        </div>
    );

    /* ─── LIVE P2P SCREEN + CHAT ─── */
    return (
        <div className="vcall-shell">
            <div className={`vcall-remote ${chatOpen ? 'chat-active' : ''}`} style={{ transition: 'all 0.3s' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="vcall-remote-pulse" style={{ opacity: 0.1, zIndex: -1 }} />
            </div>

            <div className={`vcall-self ${chatOpen ? 'chat-active' : ''}`} style={{ transition: 'all 0.3s' }}>
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                <div className="vcall-self-label">You</div>
            </div>

            <div className="vcall-topbar">
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>{doctor.name} - Human Session</span>
                </div>
                <div className="vcall-timer">{timer}</div>
            </div>

            <div className="vcall-controls">
                <button className={`vcall-ctrl ${micOn ? '' : 'off'}`} onClick={() => setMicOn(p => !p)}>
                    {micOn ? '🎤' : '🔇'} <span>Mute</span>
                </button>
                <button className={`vcall-ctrl ${camOn ? '' : 'off'}`} onClick={() => setCamOn(p => !p)}>
                    {camOn ? '📹' : '🚫'} <span>Stop Cam</span>
                </button>
                <button className="vcall-ctrl" onClick={() => setChatOpen(p => !p)}>
                    💬 <span>Chat</span>
                </button>
                <button className="vcall-ctrl end" onClick={endCall}>
                    📵 <span>End Call</span>
                </button>
            </div>

            {/* CHAT PANEL */}
            {chatOpen && (
                <div className="vcall-chat-panel" style={{ position: 'absolute', right: 20, bottom: 90, width: 350, height: 450, background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '15px 20px', background: 'var(--doc-primary)', color: '#fff', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Secure Messaging</span>
                        <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', padding: 15, background: '#f8faf9', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#999', fontSize: '0.8rem', marginTop: 20 }}>Encrypted Chat securely established.</div>}
                        {messages.map((m, i) => (
                            <div key={i} style={{ alignSelf: m.self ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 2, textAlign: m.self ? 'right' : 'left' }}>{m.sender} - {m.time}</div>
                                <div style={{ padding: '8px 12px', borderRadius: 12, background: m.self ? 'var(--doc-primary)' : '#e2e8f0', color: m.self ? '#fff' : '#333', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                    {m.text}
                                    {m.fileUrl && (
                                        <div style={{ marginTop: 5 }}>
                                            <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: m.self ? '#e0f2fe' : 'var(--doc-primary)', textDecoration: 'underline', fontSize: '0.85rem' }}>📄 {m.fileName}</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    <div style={{ padding: 10, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 8, background: '#fff' }}>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                        <button className="pd-btn pd-btn-outline" style={{ padding: '8px 10px', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Attach File">
                            {uploading ? '⏳' : '📎'}
                        </button>
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type message..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #ddd', fontSize: '0.9rem' }} />
                        <button className="pd-btn pd-btn-primary" style={{ padding: '8px 14px', borderRadius: 20, height: 40 }} onClick={sendMessage}>➤</button>
                    </div>
                </div>
            )}
        </div>
    );
}
