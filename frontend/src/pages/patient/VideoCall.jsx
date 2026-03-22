import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/config';

const TIPS = [
    'Ensure good lighting before joining a video call.',
    'Test your microphone and camera before the session starts.',
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
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [permError, setPermError] = useState('');
    const [doctor, setDoctor] = useState({ name: 'Doctor', badge: '👨‍⚕️', spec: 'Consultation' });

    // Controls
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);

    // WebRTC Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const streamRef = useRef(null);
    const pcRef = useRef(null);
    const socketRef = useRef(null);
    const pollInterval = useRef(null);
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
                    const match = (json.data?.doctors || []).find(d => String(d.id) === String(doctorId));
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
                setPermError("Camera/Mic access required for native WebRTC. Please allow them in your browser.");
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

    /* Initialize Signaling and WebRTC (Triggered when Live) */
    const connectWebRTC = () => {
        setPhase('live');

        try {
            // 1. Initialize Socket
            const socket = io(API_BASE_URL, { transports: ['websocket'] });
            socketRef.current = socket;

            // 2. Initialize Peer Connection
            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;

            // 3. Add local tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    pc.addTrack(track, streamRef.current);
                });
            }

            // 4. Handle remote tracks
            pc.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // 5. Exchange ICE Candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('new_ice_candidate', { room: apptId, candidate: event.candidate });
                }
            };

            // 6. Handle Incoming Offer from Doctor
            socket.on('video_offer', async (offer) => {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('video_answer', { room: apptId, answer });
                } catch (e) {
                    console.error("Failed to handle offer", e);
                }
            });

            // 7. Handle Incoming ICE from Doctor
            socket.on('new_ice_candidate', async (candidate) => {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) { }
            });

            socket.on('peer_left', () => {
                endCall();
            });

            // 8. Announce presence to trigger Doctor's offer
            socket.emit('join_video_room', { room: apptId });

        } catch (err) {
            console.error("WebRTC Setup Error:", err);
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

    /* ─── PERMISSION SCREEN ─── */
    if (phase === 'permission') return (
        <div className="vcall-shell vcall-centered">
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Native Video Session</h2>
                <p className="vcall-conn-spec">with {doctor.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    You will enter a secure P2P waiting room. The native stream configures automatically when the doctor admits you.
                </p>
                {permError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.82rem', marginTop: 12 }}>
                        ⚠️ {permError}
                    </div>
                )}
                <div className="vcall-tip" style={{ marginTop: 16 }}>💡 {tip}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center' }} onClick={startConnecting}>
                        ✅ Enter WebRTC Waiting Room
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }} onClick={() => navigate(-1)}>✕ Cancel</button>
                </div>
            </div>
        </div>
    );

    /* ─── CONNECTING / WAITING ROOM ─── */
    if (phase === 'connecting') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div className="vcall-conn-avatar">{doctor.badge}</div>
                <h2 className="vcall-conn-name">{doctor.name}</h2>
                <div className="vcall-pulse-ring"><div className="vcall-pulse-dot" /></div>
                <p className="vcall-conn-status">Waiting for doctor to admit you…</p>
                <p style={{ color: '#4CAF50', fontSize: '0.85rem', fontWeight: 'bold' }}>P2P Handshake will begin automatically.</p>
                <button className="pd-btn pd-btn-danger" style={{ marginTop: 20 }} onClick={endCall}>✕ Leave</button>
            </div>
        </div>
    );

    /* ─── ENDED SCREEN ─── */
    if (phase === 'ended') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                <h2 className="vcall-conn-name">Call Ended</h2>
                <p className="vcall-conn-spec">Duration: {timer}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7 }}>
                    Your consultation with {doctor.name} was successfully completed over a secure P2P connection.
                </p>
                <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }} onClick={() => navigate('/patient/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    /* ─── NATIVE P2P LIVE SCREEN ─── */
    return (
        <div className="vcall-shell">
            {/* Remote video panel (Doctor feed) */}
            <div className="vcall-remote">
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div className="vcall-remote-pulse" style={{ opacity: 0.1, zIndex: -1 }} />
            </div>

            {/* Local video feed */}
            <div className="vcall-self">
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                <div className="vcall-self-label">You</div>
            </div>

            <div className="vcall-topbar">
                <div className="vcall-doctor-info">
                    <span className="vcall-live-dot" />
                    <span>{doctor.name}</span>
                    <span className="vcall-spec">Live WebRTC</span>
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
                <button className="vcall-ctrl end" onClick={endCall}>
                    📵 <span>End Call</span>
                </button>
            </div>
        </div>
    );
}
