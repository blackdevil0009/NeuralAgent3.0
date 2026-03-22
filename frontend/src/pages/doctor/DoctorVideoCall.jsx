import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/config';

const TIPS = [
    'Ensure good lighting before joining a video call.',
    'Review the patient\'s file before the session starts.',
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

export default function DoctorVideoCall() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patient');
    const patientName = searchParams.get('name') || 'Patient';
    const apptId = searchParams.get('appt');

    const [phase, setPhase] = useState('permission'); // permission | live | ended
    const [tip] = useState(TIPS[Math.floor(Math.random() * TIPS.length)]);
    const [permError, setPermError] = useState('');
    const [patient, setPatient] = useState({ name: patientName, badge: '🧘' });
    const [loading, setLoading] = useState(false);

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
                    const match = (json.data?.appointments || []).find(a => String(a.patientId) === String(patientId));
                    if (match) setPatient(p => ({ ...p, name: match.patientName }));
                }
            } catch { }
        };
        fetchPatient();
    }, [patientId]);

    /* Request Camera on mount */
    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            } catch (err) {
                setPermError("Camera/Mic access required for native WebRTC. Please allow it in the browser.");
            }
        };
        initCamera();

        return () => {
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

    /* Setup Signaling and Connection */
    const startSession = async () => {
        if (!apptId || !streamRef.current) {
            setPermError("Missing appointment ID or Camera Access.");
            return;
        }

        setLoading(true);
        setPermError('');

        try {
            // Update backend status so Patient enters Live
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/appointments/${apptId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: 'Live' })
            });

            // Initialize Signaling
            const socket = io(API_BASE_URL, { transports: ['websocket'] });
            socketRef.current = socket;

            // Initialize WebRTC Peer
            const pc = new RTCPeerConnection(iceServers);
            pcRef.current = pc;

            // Add local tracks
            streamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, streamRef.current);
            });

            // Handle incoming remote track
            pc.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // Send ICE candidates to patient
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('new_ice_candidate', { room: apptId, candidate: event.candidate });
                }
            };

            // Join WebSocket Room
            socket.emit('join_video_room', { room: apptId });

            // On Patient joining, Doctor (initiator) creates offer
            socket.on('peer_joined', async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('video_offer', { room: apptId, offer });
                } catch (e) {
                    console.error("Offer creation failed", e);
                }
            });

            // Doctor receives Answer from Patient
            socket.on('video_answer', async (answer) => {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (e) {
                    console.error("Failed to set remote answer", e);
                }
            });

            // Handle Incoming ICE Candidate
            socket.on('new_ice_candidate', async (candidate) => {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Failed handling ice", e);
                }
            });

            socket.on('peer_left', () => {
                endSession(); 
            });

            setPhase('live');
        } catch (err) {
            setPermError("Network error setting up native session.");
        } finally {
            setLoading(false);
        }
    };

    /* Toggle Medias */
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
            streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
        }
    }, [camOn, micOn]);

    const endSession = async () => {
        if (pcRef.current) pcRef.current.close();
        if (socketRef.current) socketRef.current.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

        if (apptId) {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                await fetch(`${API_BASE_URL}/api/appointments/${apptId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ status: 'Completed' })
                });
            } catch (err) {}
        }
        setPhase('ended');
    };

    /* ─── PERMISSION SCREEN ─── */
    if (phase === 'permission') return (
        <div className="vcall-shell vcall-centered">
            {/* hidden video to keep camera warm */}
            <video ref={localVideoRef} autoPlay muted style={{ display: 'none' }} />
            
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>📹</div>
                <h2 className="vcall-conn-name">Native Video Session</h2>
                <p className="vcall-conn-spec">with {patient.name}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7, textAlign: 'center' }}>
                    This native WebRTC session connects directly to the patient securely.
                    Click below to start signaling configuration.
                </p>
                {permError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px 16px', borderRadius: 12, fontSize: '0.82rem', marginTop: 12 }}>
                        ⚠️ {permError}
                    </div>
                )}
                <div className="vcall-tip" style={{ marginTop: 16 }}>💡 {tip}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22, width: '100%' }}>
                    <button className="pd-btn pd-btn-primary" style={{ justifyContent: 'center' }} onClick={startSession} disabled={loading}>
                        {loading ? '⏳ Initiating...' : '✅ Admit Patient & Connect P2P'}
                    </button>
                    <button className="pd-btn pd-btn-outline" style={{ justifyContent: 'center' }} onClick={() => navigate(-1)}>✕ Cancel</button>
                </div>
            </div>
        </div>
    );

    if (phase === 'ended') return (
        <div className="vcall-shell vcall-centered">
            <div className="vcall-connecting-card">
                <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                <h2 className="vcall-conn-name">Call Ended</h2>
                <p className="vcall-conn-spec">Duration: {timer}</p>
                <p style={{ color: '#6b8f71', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.7 }}>
                    Session with {patient.name} ended securely.
                </p>
                <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 20, justifyContent: 'center' }} onClick={() => navigate('/doctor/schedule')}>
                    Back to Schedule
                </button>
            </div>
        </div>
    );

    /* ─── NATIVE LIVE SCREEN ─── */
    return (
        <div className="vcall-shell">
            {/* Remote video panel */}
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
                    <span>{patient.name}</span>
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
                <button className="vcall-ctrl end" onClick={endSession}>
                    📵 <span>End Call</span>
                </button>
            </div>
        </div>
    );
}
