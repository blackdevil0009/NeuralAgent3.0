import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/config';
import { generateRSAKeyPair, hybridEncrypt, hybridDecrypt } from '../../utils/crypto';

// ── ICE Configuration with STUN + public TURN fallbacks ──────────────────────
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        // Free public TURN for NAT traversal (fallback)
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

function useTimer(active) {
    const [secs, setSecs] = useState(0);
    useEffect(() => {
        if (!active) { setSecs(0); return; }
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
    const doctorId   = searchParams.get('doctor') || searchParams.get('doctorId');
    const apptId     = searchParams.get('appt');
    const roomParam  = searchParams.get('room');
    const instant    = searchParams.get('instant') === 'true';
    const roomId     = apptId ? `appt_${apptId}` : roomParam;
    const isEmergency = roomParam?.startsWith('emergency_');

    const [phase, setPhase]         = useState('init'); // init | waiting | live | ended | error
    const [statusMsg, setStatusMsg] = useState('Starting camera…');
    const [permError, setPermError] = useState('');
    const [doctor, setDoctor]       = useState({ name: 'Doctor', spec: 'Consultation' });
    const [camOn, setCamOn]         = useState(true);
    const [micOn, setMicOn]         = useState(true);
    const [chatOpen, setChatOpen]   = useState(false);
    const [messages, setMessages]   = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [connState, setConnState] = useState('');

    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerKeyRef = useRef(null);
    const privKeyRef = useRef(null);
    const pubKeyRef = useRef(null);

    // Attach stream safely when phase switches to live
    useEffect(() => {
        if (phase === 'live' && remoteVideoRef.current && remoteStreamRef.current) {
            if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
                remoteVideoRef.current.srcObject = remoteStreamRef.current;
            }
        }
    }, [phase]);
    const streamRef      = useRef(null);
    const pcRef          = useRef(null);
    const socketRef      = useRef(null);
    const chatEndRef     = useRef(null);
    const offerSentRef   = useRef(false);
    const pendingCandidates = useRef([]);

    const timer = useTimer(phase === 'live');

    useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

    // ── Add ICE candidate safely (queue if remote desc not set) ─────────────
    const addCandidate = useCallback(async (candidate) => {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
        } else {
            pendingCandidates.current.push(candidate);
        }
    }, []);

    const flushPendingCandidates = useCallback(async () => {
        const pc = pcRef.current;
        if (!pc) return;
        for (const c of pendingCandidates.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {}
        }
        pendingCandidates.current = [];
    }, []);

    // ── Fetch doctor name in background ─────────────────────────────────────
    useEffect(() => {
        if (!doctorId) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/doctors`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(j => {
                const match = (j.data?.doctors || []).find(d => String(d.id) === String(doctorId));
                if (match) setDoctor({ name: match.name, spec: match.spec || 'Consultation' });
            }).catch(() => {});
    }, [doctorId]);

    // ── Step 1: Get camera/mic immediately on mount ──────────────────────────
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                // Initialize/Fetch Keys
                let priv = localStorage.getItem('rsaPrivateKey');
                let pub = localStorage.getItem('rsaPublicKey');
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                
                if (!priv || !pub) {
                    const keys = await generateRSAKeyPair();
                    priv = keys.privateKey; pub = keys.publicKey;
                    localStorage.setItem('rsaPrivateKey', priv);
                    localStorage.setItem('rsaPublicKey', pub);
                    if (token) {
                        fetch(`${API_BASE_URL}/api/v2/keys/upload`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ publicKey: pub })
                        }).catch(e => {});
                    }
                }
                privKeyRef.current = priv;
                pubKeyRef.current = pub;

                if (doctorId && token) {
                    fetch(`${API_BASE_URL}/api/v2/keys/${doctorId}`, { headers: { 'Authorization': `Bearer ${token}` }})
                        .then(r => r.json())
                        .then(j => { if (j.publicKey) peerKeyRef.current = j.publicKey; })
                        .catch(e => {});
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;

                // If instant join (called from ringing banner), connect right away
                if (instant || isEmergency) {
                    setStatusMsg('Connecting to call…');
                    setPhase('waiting');
                    startSignaling();
                } else {
                    setPhase('waiting');
                    setStatusMsg('Waiting for doctor to start the session…');
                }
            } catch (err) {
                if (!mounted) return;
                setPermError('Camera & Microphone access required. Please allow it and reload.');
                setPhase('error');
            }
        };
        init();
        return () => {
            mounted = false;
            cleanup();
        };
    // eslint-disable-next-line
    }, []);

    // ── Setup Socket.IO and WebRTC ───────────────────────────────────────────
    const startSignaling = useCallback(() => {
        if (socketRef.current) return; // already connected

        // Use WebSocket transport (fast!) with polling fallback
        const socket = io(API_BASE_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 7,
            reconnectionDelay: 1000,
            timeout: 15000
        });
        socketRef.current = socket;

        // ── Create RTCPeerConnection ─────────────────────────────────────────
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;
        offerSentRef.current = false;

        // Add local media tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));
        }

        // Show remote stream securely, even if remoteVideoRef is not rendered yet
        pc.ontrack = (event) => {
            remoteStreamRef.current = event.streams[0];
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setPhase('live');
        };

        // Send ICE candidates as they are gathered
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', { room: roomId, candidate: event.candidate });
            }
        };

        pc.oniceconnectionstatechange = () => {
            setConnState(pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setPhase('live');
            }
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                setStatusMsg('Connection interrupted. Reconnecting…');
                setPhase('waiting');
                // Try ICE restart
                if (pcRef.current && socketRef.current) {
                    pcRef.current.restartIce?.();
                }
            }
        };

        // ── Socket event handlers ────────────────────────────────────────────

        socket.on('connect', () => {
            // Join room and explicitly announce as patient
            socket.emit('join_video_room', { room: roomId, role: 'patient' });
            // Announce patient presence so doctor knows to send doctor_ready
            setTimeout(() => {
                socket.emit('patient_joined', { room: roomId });
            }, 500); // Small delay ensures doctor has joined the room if they clicked at the same moment
        });

        // Doctor is ready → patient creates and sends offer
        socket.on('doctor_ready', async () => {
            // Only create offer if not already in middle of negotiation
            if (pc.signalingState !== 'stable') {
                console.log('[WebRTC] Got doctor_ready but signalingState is', pc.signalingState, '- skipping');
                return;
            }
            setStatusMsg('Doctor connected! Establishing secure video…');
            try {
                const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                await pc.setLocalDescription(offer);
                socket.emit('video_offer', { room: roomId, sdp: offer });
                console.log('[WebRTC] Offer sent to doctor');
            } catch (e) {
                console.error('Offer failed:', e);
                offerSentRef.current = false;
            }
        });

        // Doctor sent answer → set remote description
        socket.on('video_answer', async (data) => {
            const answerDesc = data.type ? data : (data.sdp || data.answer || data);
            try {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
                    await flushPendingCandidates();
                }
            } catch (e) { console.error('Answer error:', e); }
        });

        // Incoming ICE candidate
        socket.on('ice_candidate', async (candidate) => {
            await addCandidate(candidate);
        });

        // Legacy event names for backward compat
        socket.on('new_ice_candidate', async (candidate) => { await addCandidate(candidate); });
        socket.on('video_answer', async (data) => {
            const answerDesc = data.type ? data : (data.sdp || data.answer || data);
            try {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(answerDesc));
                    await flushPendingCandidates();
                }
            } catch (e) {}
        });

        socket.on('peer_left', () => { endCall(); });
        socket.on('call_chat_msg', (data) => {
            if (data.securePayload && privKeyRef.current) {
                const dec = hybridDecrypt(data.securePayload, privKeyRef.current);
                if (dec) setMessages(p => [...p, JSON.parse(dec)]);
            } else if (data.message) {
                setMessages(p => [...p, data.message]);
            }
        });

        // ── If emergency, patient creates offer immediately ───────────────────
        if (isEmergency) {
            (async () => {
                try {
                    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await pc.setLocalDescription(offer);
                    socket.emit('video_offer', { room: roomId, sdp: offer });
                    offerSentRef.current = true;
                } catch (e) {}
            })();
        }
    }, [roomId, isEmergency, addCandidate, flushPendingCandidates]);

    // ── For non-instant: poll via socket ────────────────────────────────────
    useEffect(() => {
        if (phase !== 'waiting' || !roomId || isEmergency) return;
        // Start signaling so socket is ready to receive 'doctor_ready'
        // The actual offer is only sent when doctor emits 'doctor_ready'
        startSignaling();
    // eslint-disable-next-line
    }, [phase]);

    // ── Toggle camera/mic ───────────────────────────────────────────────────
    useEffect(() => {
        if (!streamRef.current) return;
        streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
        streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
    }, [camOn, micOn]);

    // ── Update local video reference when phase changes ──────────────────────
    useEffect(() => {
        if (localVideoRef.current && streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    const cleanup = () => {
        if (pcRef.current)    { pcRef.current.close();      pcRef.current = null; }
        if (socketRef.current){ socketRef.current.disconnect(); socketRef.current = null; }
        if (streamRef.current){ streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    const endCall = () => {
        if (socketRef.current) {
            socketRef.current.emit('leave_video_room', { room: roomId });
        }
        cleanup();
        setPhase('ended');
    };

    const sendMessage = () => {
        if (!chatInput.trim() || !socketRef.current) return;
        const msg = { text: chatInput, sender: 'Patient', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(p => [...p, { ...msg, self: true }]);
        // Always send plain message — hybridEncrypt was broken (field name mismatch)
        socketRef.current.emit('call_chat_msg', { room: roomId, message: { ...msg, self: false } });
        setChatInput('');
    };

    // ─── LOADING/INIT ────────────────────────────────────────────────────────
    if (phase === 'init') return (
        <div className="vcall-shell vcall-centered">
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📹</div>
                <h2 className="vcall-conn-name">Starting Camera…</h2>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8 }}>
                    Please allow camera and microphone access
                </p>
            </div>
        </div>
    );

    // ─── ERROR ───────────────────────────────────────────────────────────────
    if (phase === 'error') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                <h2 className="vcall-conn-name">Permission Required</h2>
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.85rem', marginTop: 12 }}>
                    {permError}
                </div>
                <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}
                    onClick={() => window.location.reload()}>
                    🔄 Retry
                </button>
            </div>
        </div>
    );

    // ─── WAITING/CONNECTING ──────────────────────────────────────────────────
    if (phase === 'waiting') return (
        <div className="vcall-shell vcall-centered">
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">👨‍⚕️</div>
                <h2 className="vcall-conn-name">{doctor.name}</h2>
                <p style={{ color: '#6b8f71', fontSize: '0.8rem' }}>{doctor.spec}</p>
                <div className="vcall-pulse-ring" style={{ margin: '20px auto' }}>
                    <div className="vcall-pulse-dot" />
                </div>
                <p className="vcall-conn-status">{statusMsg}</p>
                {connState && (
                    <p style={{ fontSize: '0.72rem', color: '#aaa', marginTop: 4 }}>
                        Connection: {connState}
                    </p>
                )}
                <button className="pd-btn pd-btn-danger" style={{ marginTop: 20, width: '100%', justifyContent: 'center' }} onClick={endCall}>
                    ✕ Cancel
                </button>
            </div>
        </div>
    );

    // ─── ENDED ───────────────────────────────────────────────────────────────
    if (phase === 'ended') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
                <h2 className="vcall-conn-name">Consultation Ended</h2>
                <p className="vcall-conn-spec">Duration: {timer}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8 }}>Your secure session was completed successfully.</p>
                <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }} onClick={() => navigate('/patient/appointments')}>
                    Return to Dashboard
                </button>
            </div>
        </div>
    );

    // ─── LIVE P2P SCREEN ─────────────────────────────────────────────────────
    return (
        <div className="vcall-shell">
            <div className={`vcall-remote ${chatOpen ? 'chat-active' : ''}`} style={{ transition: 'all 0.3s', background: '#0a1a0a' }}>
                <video ref={remoteVideoRef} autoPlay playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onLoadedMetadata={e => e.target.play().catch(() => {})}
                />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    color: 'rgba(255,255,255,0.25)', fontSize: '0.9rem', pointerEvents: 'none' }}>
                    {/* Shown only if remote stream not active */}
                </div>
            </div>

            <div className={`vcall-self ${chatOpen ? 'chat-active' : ''}`} style={{ transition: 'all 0.3s' }}>
                <video ref={localVideoRef} autoPlay muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                <div className="vcall-self-label">You</div>
            </div>

            <div className="vcall-topbar">
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>{doctor.name}</span>
                    <span className="vcall-spec">Live</span>
                </div>
                <div className="vcall-timer">{timer}</div>
            </div>

            <div className="vcall-controls">
                <button className={`vcall-ctrl ${micOn ? '' : 'off'}`} onClick={() => setMicOn(p => !p)}>
                    {micOn ? '🎤' : '🔇'} <span>{micOn ? 'Mute' : 'Unmute'}</span>
                </button>
                <button className={`vcall-ctrl ${camOn ? '' : 'off'}`} onClick={() => setCamOn(p => !p)}>
                    {camOn ? '📹' : '🚫'} <span>{camOn ? 'Cam Off' : 'Cam On'}</span>
                </button>
                <button className="vcall-ctrl" onClick={() => setChatOpen(p => !p)}>
                    💬 <span>Chat</span>
                </button>
                <button className="vcall-ctrl end" onClick={endCall}>
                    📵 <span>End Call</span>
                </button>
            </div>

            {chatOpen && (
                <div className="vcall-chat-panel" style={{
                    position: 'absolute', right: 20, bottom: 90, width: 340, height: 440,
                    background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden'
                }}>
                    <div style={{ padding: '14px 18px', background: 'var(--doc-primary)', color: '#fff', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>💬 Secure Chat</span>
                        <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f8faf9', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.8rem', marginTop: 20 }}>Chat started securely in this session.</div>}
                        {messages.map((m, i) => (
                            <div key={i} style={{ alignSelf: m.self ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 2, textAlign: m.self ? 'right' : 'left' }}>{m.sender} · {m.time}</div>
                                <div style={{ padding: '9px 13px', borderRadius: 12, background: m.self ? 'var(--doc-primary)' : '#e2e8f0', color: m.self ? '#fff' : '#333', fontSize: '0.88rem', wordBreak: 'break-word' }}>{m.text}</div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ padding: 10, borderTop: '1px solid #eee', display: 'flex', gap: 8, background: '#fff' }}>
                        <input
                            type="text" value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Type message…"
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #ddd', fontSize: '0.88rem' }}
                        />
                        <button className="pd-btn pd-btn-primary" style={{ padding: '8px 14px', borderRadius: 20, height: 40 }} onClick={sendMessage}>➤</button>
                    </div>
                </div>
            )}
        </div>
    );
}
