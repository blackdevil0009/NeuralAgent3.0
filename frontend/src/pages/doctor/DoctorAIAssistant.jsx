import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../utils/config';

const MOCK_IOT = [
    { id: 1, label: 'ICU Ventilator-04', status: 'Stable', metric: '65% O2', trend: 'steady' },
    { id: 2, label: 'Cardiac Monitor-01', status: 'Active', metric: '72 BPM', trend: 'steady' },
    { id: 3, label: 'Smart Dialysis-A2', status: 'Operational', metric: 'BFR: 300', trend: 'up' },
];

export default function DoctorAIAssistant() {
    const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'iot', 'team'
    const [selectedPatient, setSelectedPatient] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    // Vaidya Voice AI States
    const [callActive, setCallActive] = useState(false);
    const [callStatus, setCallStatus] = useState('Ready for AI Consult');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');

    const recognition = useRef(null);
    const endRef = useRef(null);
    const localVideoRef = useRef(null);
    const streamRef = useRef(null);
    const socketRef = useRef(null);
    const frameIntervalRef = useRef(null);

    const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const addMessage = (from, text) => {
        const msg = {
            id: Date.now() + Math.random(),
            from,
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLiveVoice: false
        };
        setMessages(prev => [...prev, msg]);
        return msg;
    };

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.interimResults = true;
        recognition.current.lang = 'en-IN';

        recognition.current.onstart = () => setIsRecording(true);
        recognition.current.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    setInterimTranscript('');
                    sendMessage(transcript);
                    recognition.current.stop();
                } else {
                    interim += transcript;
                    setInterimTranscript(interim);
                }
            }
        };
        recognition.current.onend = () => setIsRecording(false);
        recognition.current.onerror = () => setIsRecording(false);
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, interimTranscript, callActive]);

    useEffect(() => () => {
        stopVideoConsult();
    }, []);

    const playLocalTTS = (text) => {
        if (!window.speechSynthesis || !text) return;
        const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*`_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-IN';
        utterance.rate = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.includes('IN') && /Google|Premium/i.test(v.name)) || voices.find(v => v.lang.includes('IN'));
        if (preferred) utterance.voice = preferred;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    const sendMessage = async (text) => {
        const msg = (text || input || interimTranscript).trim();
        if (!msg) return;

        setInput('');

        if (callActive && socketRef.current) {
            addMessage('user', msg);
            socketRef.current.emit("chat_message", msg);
            setTyping(true);
            return;
        }

        addMessage('user', msg);
        setTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/wellness/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({ message: msg }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: aiMsgId, from: 'ai', text: '', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                let shouldUpdateMessage = false;
                let shouldSpeak = false;
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.chunk) {
                            fullText += data.chunk;
                            shouldUpdateMessage = true;
                        }
                        if (data.done && fullText) shouldSpeak = true;
                    } catch (err) { }
                }
                if (shouldUpdateMessage) {
                    setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m));
                }
                if (shouldSpeak) playLocalTTS(fullText);
            }
        } catch (err) {
            console.error('AI Error:', err);
            addMessage('ai', 'The secure AI service is busy right now. Please try again shortly.');
        } finally {
            setTyping(false);
            setInterimTranscript('');
        }
    };

    const handleVoiceToggle = () => {
        if (!recognition.current) return alert('Speech recognition is not supported in this browser.');
        if (isRecording) {
            recognition.current.stop();
            setIsRecording(false);
        } else {
            try { recognition.current.start(); } catch (err) { }
        }
    };

    const startVideoConsult = async () => {
        if (callActive) return;
        setCallActive(true);
        setCallStatus('Connecting to Vaidya Voice AI...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setCallStatus('Vaidya Voice AI Online');

            if (!socketRef.current) {
                const s = io(API_BASE_URL, { auth: { token: token() } });
                socketRef.current = s;

                s.on("connect", () => {
                    setCallStatus('Vaidya Voice AI Connected');
                    s.emit("Vaidya_Connected", { token: token(), patientData: { status: "Active Clinical Command", source: "VaidyaMed-X Doctor Dashboard" } });

                    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
                    frameIntervalRef.current = setInterval(() => {
                        if (localVideoRef.current && socketRef.current) {
                            const canvas = document.createElement("canvas");
                            canvas.width = 640;
                            canvas.height = 480;
                            const ctx = canvas.getContext("2d");
                            ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);
                            const base64Frame = canvas.toDataURL("image/jpeg", 0.5);
                            socketRef.current.emit("camera_frame", base64Frame);
                        }
                    }, 2000);
                });

                s.on("system_status", (msg) => {
                    if (msg.includes("Connected")) setCallStatus('Vaidya Voice AI Connected');
                    else if (msg.includes("Disconnected")) setCallStatus('Voice AI Offline');
                    else setCallStatus(msg);
                });

                s.on("transcript_chunk", (msg) => {
                    if (msg.role === 'AGENT') {
                        setIsSpeaking(true);
                        setTyping(false);
                    }
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.isLiveVoice && lastMsg.from === (msg.role === 'USER' ? 'user' : 'ai') && !lastMsg.finalized) {
                            return prev.map((m, i) => i === prev.length - 1 ? { ...m, text: m.text + msg.text } : m);
                        } else {
                            return [...prev, { id: Date.now() + Math.random(), from: msg.role === 'USER' ? 'user' : 'ai', text: msg.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isLiveVoice: true, finalized: false }];
                        }
                    });
                });

                s.on("ai_thinking", () => { setIsSpeaking(false); setTyping(true); });

                s.on("turn_complete", () => {
                    setIsSpeaking(false);
                    setTyping(false);
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.isLiveVoice) {
                            return prev.map((m, i) => i === prev.length - 1 ? { ...m, finalized: true } : m);
                        }
                        return prev;
                    });
                });

                s.on("disconnect", () => {
                    setCallStatus('Voice AI Disconnected');
                    setIsSpeaking(false);
                    setTyping(false);
                });
            } else {
                socketRef.current.connect();
                socketRef.current.emit("Vaidya_Connected", { token: token() });
            }
        } catch (err) {
            console.error('Camera error:', err);
            setCallStatus('Camera unavailable. Chat consult is still active.');
        }
    };

    const stopVideoConsult = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setCallActive(false);
        setCallStatus('Ready for AI Consult');
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
        setTyping(false);
        if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
        if (socketRef.current) {
            socketRef.current.emit("Vaidya_Disconnected", "Disconnected");
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    };

    const runAnalysis = async () => {
        if (!selectedPatient) return;
        setIsAnalyzing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ patientName: selectedPatient, reportType: 'General Clinical Report' })
            });
            const json = await res.json();
            if (json.data) setAnalysisResult(json.data);
        } catch (err) {
            console.error('AI Analysis Error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
            <div className="dd-header" style={{ marginBottom: 30 }}>
                <div>
                    <h1>🤖 VaidyaMed-X Clinical Assistant</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Hospital-wide AI ecosystem: Report Analysis, IoT Control, and Multi-Voice Collaboration</p>
                </div>
            </div>

            {/* Feature Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
                <button
                    className={`dd-btn ${activeTab === 'analysis' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('analysis')}
                >📊 Clinical Analysis</button>
                <button
                    className={`dd-btn ${activeTab === 'iot' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('iot')}
                >🔌 Hospital IoT Monitor</button>
                <button
                    className={`dd-btn ${activeTab === 'team' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('team')}
                >📹 Vaidya Live Consult</button>
            </div>

            {activeTab === 'analysis' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="dd-card" style={{ marginBottom: 30, background: 'linear-gradient(to right, #ffffff, #f9fdfa)' }}>
                        <h3>AI Report Interpreter</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--doc-text-mute)' }}>Scan patient reports for hidden clinical correlations and Ayurvedic Dosha trends.</p>

                        <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Select Patient</label>
                                <select className="dd-btn dd-btn-outline" style={{ width: '100%', padding: '10px' }} value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                                    <option value="">Choose Patient...</option>
                                    <option value="Rohit Sharma">Rohit Sharma</option>
                                    <option value="Anjali Gupta">Anjali Gupta</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Select Medical Record</label>
                                <select className="dd-btn dd-btn-outline" style={{ width: '100%', padding: '10px' }}>
                                    <option>Blood Work - Feb 2026</option>
                                    <option>Health Assessment Dec 2025</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="dd-btn dd-btn-primary" style={{ height: 42, minWidth: 150, justifyContent: 'center' }} disabled={!selectedPatient || isAnalyzing} onClick={runAnalysis}>
                                    {isAnalyzing ? '🧬 Analyzing...' : '✨ Run AI Insights'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {analysisResult && (
                        <div className="dd-card" style={{ borderLeft: '5px solid var(--doc-accent)', animation: 'slideUp 0.4s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0 }}>Clinical AI Summary: {analysisResult.patient}</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--doc-text-mute)', marginBottom: 8, fontWeight: 700 }}>Modern Med Findings</div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#c0392b' }}>{analysisResult.result}</div>
                                </div>
                                <div style={{ background: '#f0f7f2', padding: 20, borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--doc-text-mute)', marginBottom: 8, fontWeight: 700 }}>Ayurvedic Status</div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--doc-green-light)' }}>{analysisResult.dosha}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'iot' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="dd-grid">
                        {MOCK_IOT.map(m => (
                            <div key={m.id} className="dd-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>{m.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>{m.metric}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--doc-green-light)', marginTop: 4 }}>● {m.status}</div>
                                </div>
                                <div style={{ width: 60, height: 40, background: '#eee', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    📈
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="dd-card" style={{ marginTop: 20, background: '#1a1a1a', color: '#00ff00', fontFamily: 'monospace', padding: 20 }}>
                        <div>[SYSTEM] HOSPITAL NETWORK AT 98% EFFICIENCY</div>
                        <div>[IOT] VENTILATOR-04 UPDATED TO FIRMWARE V2.4</div>
                        <div>[AI] PREDICTIVE ALERT: ICU-ROOM-2 TEMP FLUCTUATION DETECTED</div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, animation: 'fadeIn 0.3s ease' }}>
                    <div className="dd-card" style={{ padding: 0, background: '#222', height: 500, overflow: 'hidden', position: 'relative' }}>
                        <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: callActive ? 1 : 0 }} />

                        {!callActive && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: 15 }}>🎥</div>
                                    <button className="dd-btn dd-btn-primary" onClick={startVideoConsult}>Activate Vaidya Vision</button>
                                </div>
                            </div>
                        )}

                        <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 10 }}>
                            {callActive && (
                                <button className="dd-btn" style={{ background: 'red', color: '#fff', border: 'none', padding: '5px 15px' }} onClick={stopVideoConsult}>
                                    End Vaidya Call
                                </button>
                            )}
                            <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, fontSize: '0.7rem' }}>{callStatus}</div>
                        </div>
                        {isSpeaking && (
                            <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0, 255, 0, 0.3)', color: '#0f0', padding: '5px 10px', borderRadius: '5px', fontSize: '0.8rem' }}>
                                🔊 Vaidya is speaking...
                            </div>
                        )}
                    </div>

                    <div className="dd-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 15px' }}>Vaidya Live Chat</h4>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', marginBottom: 10 }}>
                            {messages.map(m => (
                                <div key={m.id} style={{ alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start', background: m.from === 'user' ? '#e6f4ea' : '#f1f3f4', padding: '10px 14px', borderRadius: '12px', maxWidth: '90%', fontSize: '0.85rem' }}>
                                    <strong style={{ display: 'block', fontSize: '0.7rem', color: '#666', marginBottom: 4 }}>{m.from === 'user' ? 'You' : 'Vaidya AI'}</strong>
                                    {m.text}
                                </div>
                            ))}
                            {typing && (
                                <div style={{ alignSelf: 'flex-start', background: '#f1f3f4', padding: '10px 14px', borderRadius: '12px', fontSize: '0.85rem', color: '#888' }}>
                                    <em>Vaidya is thinking...</em>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {interimTranscript && <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 5 }}>Listening: {interimTranscript}...</div>}

                        <div style={{ display: 'flex', gap: 5 }}>
                            <input
                                type="text"
                                placeholder="Chat with Vaidya..."
                                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.8rem' }}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                            />
                            <button
                                className="dd-btn"
                                style={{ background: isRecording ? '#dc3545' : '#e0e0e0', color: isRecording ? '#fff' : '#333', padding: '0 15px' }}
                                onClick={handleVoiceToggle}
                            >
                                🎤
                            </button>
                            <button className="dd-btn dd-btn-primary" style={{ padding: '0 15px' }} onClick={() => sendMessage()}>
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
