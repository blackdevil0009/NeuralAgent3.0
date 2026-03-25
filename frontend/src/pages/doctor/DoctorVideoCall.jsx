import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/config';

// ── ICE Configuration with STUN + public TURN fallbacks ──────────────────────
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
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

export default function DoctorVideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId   = searchParams.get('patient') || searchParams.get('patientId');
    const patientName = searchParams.get('name') || 'Patient';
    const apptId      = searchParams.get('appt');
    const roomParam   = searchParams.get('room');
    const roomId      = apptId ? `appt_${apptId}` : roomParam;

    const [phase, setPhase]           = useState('init'); // init | setup | live | ended | error
    const [patient, setPatient]       = useState({ name: patientName, badge: '🧘' });
    const [permError, setPermError]   = useState('');
    const [loading, setLoading]       = useState(false);
    const [connState, setConnState]   = useState('');
    const [camOn, setCamOn]           = useState(true);
    const [micOn, setMicOn]           = useState(true);
    const [chatOpen, setChatOpen]     = useState(false);
    const [aiOpen, setAiOpen]         = useState(false);
    const [messages, setMessages]     = useState([]);
    const [chatInput, setChatInput]   = useState('');
    const [aiQuery, setAiQuery]       = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [aiLoading, setAiLoading]   = useState(false);
    const [prescription, setPrescription] = useState('');
    const [rxSaved, setRxSaved]       = useState(false);
    const [activeOverlay, setActiveOverlay] = useState(null);
    const [medicalData, setMedicalData]   = useState(null);
    const [patientContact, setPatientContact] = useState('');

    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);
    const streamRef      = useRef(null);
    const pcRef          = useRef(null);
    const socketRef      = useRef(null);
    const chatEndRef     = useRef(null);
    const fileInputRef   = useRef(null);
    const pendingCandidates = useRef([]);

    const timer = useTimer(phase === 'live');

    useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

    // ── Add ICE candidate safely ─────────────────────────────────────────────
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

    // ── Fetch patient medical data ───────────────────────────────────────────
    useEffect(() => {
        if (!patientId) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/patients/${patientId}/medical`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setPatient(p => ({ ...p, name: data.fullName || p.name }));
                    setMedicalData(data);
                    setPatientContact(data.mobile || '');
                }
            }).catch(() => {});
    }, [patientId]);

    // ── Step 1: Get camera/mic immediately on mount ──────────────────────────
    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                setPhase('setup');
            } catch (err) {
                if (!mounted) return;
                setPermError('Camera & Microphone access required. Please allow it in your browser and reload.');
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

    // ── Step 2: Doctor clicks "Admit & Start" ───────────────────────────────
    const startSession = async () => {
        if (!roomId) { setPermError('Could not determine room ID.'); return; }
        if (!streamRef.current) { setPermError('Camera access required. Please refresh.'); return; }
        setLoading(true);

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            // Update appointment status to Live (triggers patient ringing)
            if (apptId) {
                await fetch(`${API_BASE_URL}/api/appointments/${apptId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ status: 'Live' })
                });
            }

            // Connect with WebSocket transport for speed
            const socket = io(API_BASE_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000
            });
            socketRef.current = socket;

            // Create RTCPeerConnection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;
            pendingCandidates.current = [];

            // Add local media
            streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current));

            // Show remote stream immediately when it arrives
            pc.ontrack = (event) => {
                if (remoteVideoRef.current && event.streams[0]) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
                setPhase('live');
            };

            // Send ICE as gathered
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
                if (pc.iceConnectionState === 'failed') {
                    pc.restartIce?.();
                }
            };

            socket.on('connect', () => {
                // Join room and immediately announce doctor is ready
                socket.emit('join_video_room', { room: roomId, role: 'doctor' });
                // Announce readiness immediately after joining
                setTimeout(() => {
                    socket.emit('doctor_ready', { room: roomId });
                }, 200);
            });

            // Handle Offer from Patient
            socket.on('video_offer', async (data) => {
                const sdp = data.sdp || data;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    await flushPendingCandidates();
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('video_answer', { room: roomId, sdp: answer });
                } catch (e) { console.error('Answer error:', e); }
            });

            // Handle ICE candidates from patient (both new and legacy)
            socket.on('ice_candidate', async (candidate) => { await addCandidate(candidate); });
            socket.on('new_ice_candidate', async (candidate) => { await addCandidate(candidate); });

            socket.on('peer_left', () => { if (phase !== 'ended') endSession(); });
            socket.on('call_chat_msg', (msg) => setMessages(p => [...p, msg]));

            setPhase('live');
        } catch (err) {
            setPermError('Failed to start session. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Toggle camera/mic ───────────────────────────────────────────────────
    useEffect(() => {
        if (!streamRef.current) return;
        streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
        streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
    }, [camOn, micOn]);

    // ── Update local video on phase change ──────────────────────────────────
    useEffect(() => {
        if (localVideoRef.current && streamRef.current) {
            localVideoRef.current.srcObject = streamRef.current;
        }
    }, [phase]);

    const cleanup = () => {
        if (pcRef.current)    { pcRef.current.close();       pcRef.current = null; }
        if (socketRef.current){ socketRef.current.disconnect(); socketRef.current = null; }
        if (streamRef.current){ streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    const endSession = async () => {
        if (socketRef.current) socketRef.current.emit?.('leave_video_room', { room: roomId });
        cleanup();

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (apptId) {
            try {
                await fetch(`${API_BASE_URL}/api/appointments/${apptId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ status: 'Completed' })
                });
            } catch { }
        }
        if (roomParam?.startsWith('emergency_')) {
            const emId = roomParam.replace('emergency_', '');
            try {
                await fetch(`${API_BASE_URL}/api/emergencies/${emId}/handle`, {
                    method: 'PUT', headers: { Authorization: `Bearer ${token}` }
                });
            } catch { }
        }
        setPhase('ended');
    };

    const sendMessage = () => {
        if (!chatInput.trim() || !socketRef.current) return;
        const msg = { text: chatInput, sender: 'Doctor', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(p => [...p, { ...msg, self: true }]);
        socketRef.current.emit('call_chat_msg', { room: roomId, message: { ...msg, self: false } });
        setChatInput('');
    };

    const getAiSuggestion = async () => {
        if (!aiQuery.trim()) return;
        setAiLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: 'As a medical AI for doctors, concisely analyze: ' + aiQuery })
            });
            const data = await res.json();
            setAiResponse(data.data?.response || data.response || 'No response.');
        } catch { } finally { setAiLoading(false); }
    };

    const savePrescription = () => { setRxSaved(true); setTimeout(() => setRxSaved(false), 3000); };
    const dialFamily = () => {
        if (!patientContact) { alert('No contact on file.'); return; }
        window.location.href = `tel:${patientContact.replace(/[\s\-()]/g, '')}`;
    };

    // ─── LOADING ─────────────────────────────────────────────────────────────
    if (phase === 'init') return (
        <div className="vcall-shell vcall-centered">
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3rem', marginBottom: 12, animation: 'pulse 1.5s infinite' }}>📷</div>
                <h2 className="vcall-conn-name">Starting Camera…</h2>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem' }}>Allow camera and microphone access</p>
            </div>
        </div>
    );

    // ─── ERROR ───────────────────────────────────────────────────────────────
    if (phase === 'error') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                <h2 className="vcall-conn-name">Permission Required</h2>
                <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.85rem', marginTop: 12 }}>{permError}</div>
                <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }} onClick={() => window.location.reload()}>🔄 Retry</button>
            </div>
        </div>
    );

    // ─── SETUP/PERMISSION SCREEN ─────────────────────────────────────────────
    if (phase === 'setup') return (
        <div className="vcall-shell vcall-centered">
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Ready to Connect</h2>
                <p className="vcall-conn-spec">with {patient.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    Clicking "Admit" will start the secure P2P session and notify the patient instantly.
                </p>
                {permError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.82rem', marginTop: 12 }}>
                        ⚠️ {permError}
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center' }} onClick={startSession} disabled={loading}>
                        {loading ? '⏳ Connecting…' : '✅ Admit Patient & Start Call'}
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }} onClick={() => navigate(-1)}>✕ Cancel</button>
                </div>
            </div>
        </div>
    );

    // ─── ENDED SCREEN ────────────────────────────────────────────────────────
    if (phase === 'ended') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card" style={{ maxWidth: 500, padding: 30 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📝</div>
                <h2 className="vcall-conn-name">Post-Consultation</h2>
                <p className="vcall-conn-spec">Patient: {patient.name} | Duration: {timer}</p>
                <div style={{ textAlign: 'left', marginTop: 20 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#444' }}>Prescription / Notes:</label>
                    <textarea
                        value={prescription} onChange={e => setPrescription(e.target.value)}
                        placeholder="Type diagnosis, medicines, advice…"
                        style={{ width: '100%', height: 120, marginTop: 8, padding: 12, borderRadius: 8, border: '1px solid #ccc', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                </div>
                {rxSaved && <div style={{ color: 'var(--doc-primary)', fontSize: '0.85rem', marginTop: 10, fontWeight: 600 }}>✅ Prescription saved to patient record.</div>}
                <div style={{ display: 'flex', gap: 10, marginTop: 20, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={savePrescription}>Save Prescription</button>
                    <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate('/doctor/schedule')}>Exit to Schedule</button>
                </div>
            </div>
        </div>
    );

    // ─── LIVE SCREEN ─────────────────────────────────────────────────────────
    return (
        <div className="vcall-shell">
            <div className={`vcall-remote ${(chatOpen || aiOpen) ? 'chat-active' : ''}`} style={{ transition: 'all 0.3s', background: '#0a1a0a' }}>
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onLoadedMetadata={e => e.target.play().catch(() => {})} />
            </div>
            <div className={`vcall-self ${(chatOpen || aiOpen) ? 'chat-active' : ''}`} style={{ transition: 'all 0.3s' }}>
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                <div className="vcall-self-label">You</div>
            </div>

            <div className="vcall-topbar">
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>{patient.name}</span>
                    <span className="vcall-spec">Live WebRTC</span>
                    {connState && <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: 8 }}>{connState}</span>}
                </div>
                <div className="vcall-timer">{timer}</div>
            </div>

            <div className="vcall-controls">
                <button className={`vcall-ctrl ${micOn ? '' : 'off'}`} onClick={() => setMicOn(p => !p)}>
                    {micOn ? '🎤' : '🔇'} <span>{micOn ? 'Mute' : 'Unmute'}</span>
                </button>
                <button className={`vcall-ctrl ${camOn ? '' : 'off'}`} onClick={() => setCamOn(p => !p)}>
                    {camOn ? '📹' : '🚫'} <span>Cam</span>
                </button>
                <button className={`vcall-ctrl ${chatOpen ? 'active' : ''}`} onClick={() => { setChatOpen(p => !p); setAiOpen(false); }}>
                    💬 <span>Chat</span>
                </button>
                <button className={`vcall-ctrl ${aiOpen ? 'active' : ''}`} onClick={() => { setAiOpen(p => !p); setChatOpen(false); }} style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    🤖 <span>AI</span>
                </button>
                <button className="vcall-ctrl" onClick={() => setActiveOverlay('medical')}>📋 <span>History</span></button>
                <button className="vcall-ctrl" onClick={dialFamily}>📞 <span>Family</span></button>
                <button className="vcall-ctrl end" onClick={endSession}>📵 <span>End Call</span></button>
            </div>

            {/* MEDICAL HISTORY OVERLAY */}
            {activeOverlay === 'medical' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto', position: 'relative', color: '#333' }}>
                        <button onClick={() => setActiveOverlay(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.1)', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                        <div style={{ padding: 36 }}>
                            <h2 style={{ color: 'var(--doc-green-deep)', marginBottom: 20 }}>📋 Medical History: {patient.name}</h2>
                            {!medicalData ? (<p style={{ color: '#888' }}>No medical history on file.</p>) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[['Conditions', medicalData.conditions, '🏥', '#f8f9f8', '#333'],
                                      ['Medications', medicalData.medications, '💊', '#f8f9f8', '#333'],
                                      ['Allergies', medicalData.allergies, '⚠️', '#fff5f5', '#c53030']].map(([label, val, icon, bg, color]) => (
                                        <div key={label} style={{ background: bg, padding: 15, borderRadius: 10 }}>
                                            <h4 style={{ margin: '0 0 5px', color }}>{icon} {label}</h4>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color }}>{val || 'None reported'}</p>
                                        </div>
                                    ))}
                                    {medicalData.dosha && (
                                        <div style={{ background: '#f0fff4', padding: 15, borderRadius: 10 }}>
                                            <h4 style={{ margin: '0 0 5px', color: '#22543d' }}>🌿 Dosha</h4>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{medicalData.dosha}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} onClick={() => setActiveOverlay(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI ASSISTANT PANEL */}
            {aiOpen && (
                <div className="vcall-chat-panel" style={{ position: 'absolute', right: 20, bottom: 90, width: 370, height: 480, background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', background: '#0369a1', color: '#fff', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>🤖 AI Medical Assistant</span>
                        <button onClick={() => setAiOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f0f9ff', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: '#fff', padding: 12, borderRadius: 8, fontSize: '0.82rem', color: '#333', border: '1px solid #bae6fd' }}>
                            <strong>Private Diagnostic Assistant</strong> — invisible to patient.
                        </div>
                        {aiResponse && (
                            <div style={{ background: '#e0f2fe', padding: 12, borderRadius: 8, fontSize: '0.88rem', color: '#0369a1', border: '1px solid #bae6fd', whiteSpace: 'pre-wrap' }}>
                                <strong>AI Suggestion:</strong><br /><br />{aiResponse}
                            </div>
                        )}
                    </div>
                    <div style={{ padding: 10, borderTop: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
                        <textarea value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                            placeholder="Symptoms, e.g. persistent headache + nausea for 3 days…"
                            style={{ width: '100%', height: 58, padding: 10, borderRadius: 8, border: '1px solid #ddd', fontSize: '0.88rem', resize: 'none' }} />
                        <button className="pd-btn pd-btn-primary" style={{ background: '#0369a1', borderColor: '#0369a1', justifyContent: 'center' }} onClick={getAiSuggestion} disabled={aiLoading}>
                            {aiLoading ? '⏳ Analyzing…' : '🔍 Analyze Symptoms'}
                        </button>
                    </div>
                </div>
            )}

            {/* CHAT PANEL */}
            {chatOpen && (
                <div className="vcall-chat-panel" style={{ position: 'absolute', right: 20, bottom: 90, width: 340, height: 440, background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', background: 'var(--doc-primary)', color: '#fff', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>💬 Secure Chat</span>
                        <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 14, background: '#f8faf9', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {messages.length === 0 && <div style={{ textAlign: 'center', color: '#aaa', fontSize: '0.8rem', marginTop: 20 }}>Chat started securely.</div>}
                        {messages.map((m, i) => (
                            <div key={i} style={{ alignSelf: m.self ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 2, textAlign: m.self ? 'right' : 'left' }}>{m.sender} · {m.time}</div>
                                <div style={{ padding: '9px 13px', borderRadius: 12, background: m.self ? 'var(--doc-primary)' : '#e2e8f0', color: m.self ? '#fff' : '#333', fontSize: '0.88rem', wordBreak: 'break-word' }}>{m.text}</div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ padding: 10, borderTop: '1px solid #eee', display: 'flex', gap: 8, background: '#fff' }}>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
                        <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Type message…"
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #ddd', fontSize: '0.88rem' }} />
                        <button className="pd-btn pd-btn-primary" style={{ padding: '8px 14px', borderRadius: 20, height: 40 }} onClick={sendMessage}>➤</button>
                    </div>
                </div>
            )}
        </div>
    );
}
