import React, { useState, useRef, useEffect } from 'react';

const QUICK_PROMPTS = [
    '🤒 I have headache and fever for 2 days',
    '💊 Ayurvedic remedies for joint pain',
    '🩺 Symptoms of diabetes',
    '😰 I feel anxious and stressed',
    '📹 Live AI Consultation',
];

const INITIAL_MESSAGES = [
    {
        id: 1, from: 'ai',
        text: `🏥 Namaste! I'm **VaidyaMed-X**, your evidence-based clinical assistant.\n\n• 🩺 Describe symptoms for structured analysis\n• 💊 Get Allopathic + Ayurvedic management options\n• ⚠️ Identify red flags and emergency warnings\n• 🔬 Know what investigations may be needed\n\nHow can I help you today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
];

function formatText(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
}

export default function AIAssistant() {
    const [activeView, setActiveView] = useState('chat'); // 'chat', 'monitor', 'live'
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [showWebcam, setShowWebcam] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [brainModel, setBrainModel] = useState('VaidyaMed-X Clinical Engine');
    const [interimTranscript, setInterimTranscript] = useState('');

    // Refs
    const recognition = useRef(null);
    const audioPlayer = useRef(new Audio());
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const endRef = useRef(null);

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = false;
            recognition.current.interimResults = true;
            recognition.current.lang = 'en-IN'; // Optimized for the user's region

            recognition.current.onstart = () => {
                console.log("Speech recognition started");
                setIsRecording(true);
            };

            recognition.current.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const transcript = event.results[i][0].transcript;
                        setInterimTranscript('');
                        sendMessage(transcript, true); // Mark as voice source
                        setIsRecording(false);
                        recognition.current.stop();
                    } else {
                        interim += event.results[i][0].transcript;
                        setInterimTranscript(interim);
                    }
                }
            };

            recognition.current.onend = () => {
                setIsRecording(false);
                setInterimTranscript('');
            };

            recognition.current.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                setIsRecording(false);
                if (event.error === 'not-allowed') {
                    alert("Microphone access denied. Please enable it in browser settings.");
                } else if (event.error === 'no-speech') {
                    setInterimTranscript("No speech detected...");
                    setTimeout(() => setInterimTranscript(''), 2000);
                }
            };
        } else {
            console.error("Speech recognition not supported");
        }

        return () => {
            if (recognition.current) recognition.current.stop();
        };
    }, []);

    useEffect(() => {
        if (activeView === 'chat') endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, activeView, interimTranscript]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            sendMessage(`[File Attached: ${file.name}]`, false, file);
        }
        setShowWebcam(false);
    };

    const startCamera = async () => {
        setShowWebcam(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            alert("Please enable camera access.");
            setShowWebcam(false);
        }
    };

    const captureSnapshot = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (canvas && video) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            canvas.toBlob((blob) => {
                sendMessage("[Image Captured from Camera]", false, blob);
                stopCamera();
            }, 'image/jpeg');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setShowWebcam(false);
    };

    const sendMessage = async (text, isVoice = false, fileData = null) => {
        const msg = (text || input || interimTranscript).trim();
        if (!msg && !fileData) return;

        if (msg.includes('Live AI Consultation')) {
            setActiveView('live');
            return;
        }

        if (!fileData) setInput('');

        const userMsg = {
            id: Date.now(),
            from: 'user',
            text: msg || "[Attached Content]",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        const rawToken = localStorage.getItem('token');
        const token = rawToken ? rawToken.replace(/^"|"$/g, '') : '';
        const timestamp = Math.floor(Date.now() / 1000).toString();

        try {
            let response;
            if (fileData) {
                const formData = new FormData();
                formData.append('file', fileData);
                formData.append('message', msg || "Analyze this content.");

                response = await fetch('http://localhost:5000/api/ai/chat', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Timestamp': timestamp,
                        'X-HMAC-Signature': 'DEV_BYPASS'
                    },
                    body: formData
                });
            } else {
                response = await fetch('http://localhost:5000/api/ai/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-Timestamp': timestamp,
                        'X-HMAC-Signature': 'DEV_BYPASS'
                    },
                    body: JSON.stringify({ message: msg })
                });
            }

            const resData = await response.json();
            const aiResponseText = resData.data?.response || "I am connected but need a moment to process. 🌿";

            const aiMsg = {
                id: Date.now() + 1, from: 'ai',
                text: aiResponseText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, aiMsg]);

            if (resData.data?.audio_url) {
                const audioUrl = `http://localhost:5000${resData.data.audio_url}?t=${Date.now()}`;
                playAIVoice(audioUrl, aiResponseText);
            } else {
                playAIVoice(null, aiResponseText);
            }

        } catch (err) {
            console.error("AI Error:", err);
            const errorMsg = {
                id: Date.now() + 1, from: 'ai',
                text: "VaidyaMed-X is temporarily unable to process your query. Please try again in a moment. 🏥",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setTyping(false);
            setSelectedFile(null);
            setInterimTranscript('');
        }
    };

    const playAIVoice = (url, text) => {
        setIsSpeaking(true);

        // 1. Try playing server-side audio first
        if (url) {
            const audio = new Audio(url);
            audio.play()
                .then(() => {
                    console.log("AI Server-side Voice playing...");
                    setIsSpeaking(true);
                })
                .catch(err => {
                    console.warn("Server audio playback failed, falling back to local TTS:", err);
                    playLocalTTS(text);
                });
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => {
                console.warn("Audio source error, trying local TTS...");
                playLocalTTS(text);
            };
        } else {
            playLocalTTS(text);
        }
    };

    const playLocalTTS = (text) => {
        if (!window.speechSynthesis) {
            console.error("Local TTS not supported");
            setIsSpeaking(false);
            return;
        }

        // Clean text of markdown
        const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*`_]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-IN';
        utterance.rate = 0.95; // Slightly slower for clinical clarity

        // Try to find a premium/natural voice
        const voices = window.speechSynthesis.getVoices();
        let preferredVoice = voices.find(v => v.lang.includes('IN') && (v.name.includes('Google') || v.name.includes('Premium')));
        if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('IN'));
        if (!preferredVoice) preferredVoice = voices.find(v => v.lang.includes('US') || v.name.includes('Google'));

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.cancel(); // Stop any current speech
        window.speechSynthesis.speak(utterance);
    };

    const handleVoiceToggle = () => {
        if (!recognition.current) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (!isRecording) {
            try {
                recognition.current.start();
            } catch (err) {
                console.error("Speech Recognition Start Error:", err);
                // Already started or busy
            }
        } else {
            recognition.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div className="pd-page-header" style={{ borderBottom: '1px solid #eee', paddingBottom: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'var(--doc-bg-ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', position: 'relative' }}>
                        🌿
                        {isSpeaking && <div className="speaking-ring"></div>}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.4rem' }}>VaidyaMed-X</h1>
                        <p style={{ fontSize: '0.85rem' }}>Engine: <strong>{brainModel}</strong> | Status: Online</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`pd-btn pd-btn-sm ${activeView === 'chat' ? 'pd-btn-primary' : 'pd-btn-outline'}`} onClick={() => setActiveView('chat')}>💬 Chat</button>
                    <button className={`pd-btn pd-btn-sm ${activeView === 'monitor' ? 'pd-btn-primary' : 'pd-btn-outline'}`} onClick={() => setActiveView('monitor')}>🔌 Vitals</button>
                    <button className={`pd-btn pd-btn-sm ${activeView === 'live' ? 'pd-btn-primary' : 'pd-btn-outline'}`} onClick={() => setActiveView('live')}>🧠 AI Live</button>
                </div>
            </div>

            {activeView === 'chat' && (
                <>
                    <div className="pd-chat-messages" style={{ flex: 1, padding: '20px' }}>
                        {messages.map(m => (
                            <div key={m.id} className={`pd-bubble-wrap ${m.from}`}>
                                <div className={`pd-bubble ${m.from}`} dangerouslySetInnerHTML={{ __html: formatText(m.text) }} />
                            </div>
                        ))}
                        {typing && <div className="pd-bubble ai pd-typing"><span></span><span></span><span></span></div>}
                        <div ref={endRef} />
                    </div>
                    <div className="pd-quick-prompts" style={{ padding: '0 20px 10px' }}>
                        {QUICK_PROMPTS.map(p => <button key={p} className="pd-quick-chip" onClick={() => sendMessage(p)}>{p}</button>)}
                    </div>
                    <div className="pd-chat-input-row" style={{ padding: '0 20px 20px', gap: 10, position: 'relative' }}>
                        {interimTranscript && (
                            <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', background: 'var(--green-pale)', color: 'var(--green-mid)', padding: '8px 20px', borderRadius: 20, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 10 }}>
                                🎤 {interimTranscript}...
                            </div>
                        )}
                        {selectedFile && (
                            <div style={{ position: 'absolute', top: -40, left: 20, background: 'var(--green-pale)', padding: '4px 12px', borderRadius: 10, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                📄 {selectedFile.name}
                                <button onClick={() => setSelectedFile(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
                        <button className="pd-chat-send" onClick={() => fileInputRef.current.click()} style={{ background: '#f1f1f1', color: '#666', borderRadius: '50%', width: 45, height: 45 }}>📎</button>
                        <button className="pd-chat-send" onClick={startCamera} style={{ background: '#f1f1f1', color: '#666', borderRadius: '50%', width: 45, height: 45 }}>📷</button>

                        <textarea className="pd-chat-input" placeholder="Describe your symptoms to VaidyaMed-X..." value={input} onChange={e => setInput(e.target.value)} rows={1} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} />

                        <button className={`pd-chat-send ${isRecording ? 'recording-active' : ''}`} onClick={handleVoiceToggle} style={{ background: isRecording ? '#ff4757' : 'var(--green-mid)', border: 'none', borderRadius: '50%', width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            {isRecording ? '🛑' : '🎤'}
                        </button>
                        <button className="pd-chat-send" onClick={() => sendMessage()} disabled={!input.trim() && !selectedFile} style={{ background: 'var(--green-mid)', border: 'none', borderRadius: '50%', width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>➤</button>
                    </div>

                    {showWebcam && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                            <video ref={videoRef} autoPlay playsInline style={{ maxWidth: '90%', maxHeight: '70%', borderRadius: 20, border: '4px solid #fff' }} />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <div style={{ display: 'flex', gap: 15 }}>
                                <button className="pd-btn pd-btn-primary" onClick={captureSnapshot} style={{ padding: '15px 40px' }}>📸 Take Snapshot</button>
                                <button className="pd-btn pd-btn-outline" onClick={stopCamera} style={{ background: '#fff' }}>Cancel</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeView === 'monitor' && (
                <div style={{ padding: 20, animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
                        <div className="pd-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>HEART RATE (REAL-TIME)</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>72 BPM</div>
                        </div>
                        <div className="pd-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>SPO2</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>98%</div>
                        </div>
                        <div className="pd-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>MEDASSIST STATUS</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'blue', marginTop: 10 }}>● Clinical Engine Active</div>
                        </div>
                    </div>
                    <div className="pd-card" style={{ marginTop: 20, background: '#f9f9f9', border: '1px dashed #ccc' }}>
                        <h4 style={{ margin: 0 }}>VaidyaMed-X Clinical Notes</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 10 }}>VaidyaMed-X supports 10+ clinical conditions with structured assessments. Describe your symptoms for evidence-based differential diagnosis and management options.</p>
                    </div>
                </div>
            )}

            {activeView === 'live' && (
                <div style={{ flex: 1, padding: 20, animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column' }}>
                    <div className="pd-card" style={{ flex: 1, background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', borderRadius: 20, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'inset 0 0 100px rgba(0,255,150,0.1)' }}>
                        {cameraActive ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid var(--doc-green-light)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', margin: '0 auto 20px', position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute', inset: -15, borderRadius: '50%', border: '2px solid var(--doc-green-light)',
                                        opacity: isSpeaking ? 0.8 : 0.3, animation: isSpeaking ? 'pulse-brain 1s infinite' : 'ping 3s infinite'
                                    }}></div>
                                    <span style={{ fontSize: '5rem', filter: isSpeaking ? 'drop-shadow(0 0 10px #52b788)' : 'none' }}>🧠</span>
                                </div>
                                <h3 style={{ fontFamily: 'Playfair Display, serif', letterSpacing: 1, color: isSpeaking ? 'var(--doc-green-light)' : '#fff' }}>VaidyaMed-X Live</h3>
                                <p style={{ opacity: 0.8, fontSize: '0.95rem', maxWidth: 400, margin: '0 auto' }}>
                                    {isSpeaking ? "VaidyaMed-X is responding..." : "Clinical engine active. Ready for symptom input."}
                                </p>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 25, height: 40, alignItems: 'center' }}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} style={{
                                            width: 5,
                                            height: isSpeaking ? 15 + Math.random() * 40 : 10,
                                            background: 'var(--doc-green-light)',
                                            borderRadius: 3,
                                            transition: 'height 0.1s ease',
                                            animation: isSpeaking ? `vibrate ${0.3 + Math.random() * 0.2}s infinite alternate` : 'none'
                                        }}></div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4.5rem', marginBottom: 20 }}>🤖</div>
                                <h2 style={{ marginBottom: 12, fontFamily: 'Playfair Display, serif' }}>VaidyaMed-X Live Consultation</h2>
                                <p style={{ opacity: 0.6, maxWidth: 350, margin: '0 auto 30px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                    Engage in real-time voice consultation with VaidyaMed-X. Evidence-based clinical analysis active.
                                </p>
                                <button className="pd-btn pd-btn-primary" style={{ padding: '14px 30px', fontSize: '1rem' }} onClick={() => setCameraActive(true)}>🏥 Connect to VaidyaMed-X</button>
                            </div>
                        )}
                        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(0,0,0,0.5)', borderRadius: 20, fontSize: '0.75rem', border: '1px solid rgba(255,255,255,0.15)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 8px #00ff00', animation: 'blink 1.5s infinite' }}></span>
                            MEDASSIST-X v1.0 ACTIVE
                        </div>
                    </div>
                    <div style={{ height: 90, display: 'flex', gap: 12, marginTop: 20 }}>
                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCameraActive(false)}>🛑 Exit Live Mode</button>
                        <button className={`pd-btn ${isRecording ? 'pd-btn-danger recording-active' : 'pd-btn-outline'}`} style={{ flex: 1, justifyContent: 'center' }} onClick={handleVoiceToggle}>
                            {isRecording ? "🛑 Listening..." : "🎤 Push to Talk"}
                        </button>
                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>🔍 RL Metrics</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse-brain {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                @keyframes vibrate {
                    from { height: 10px; }
                    to { height: 40px; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .speaking-ring {
                    position: absolute;
                    inset: -5px;
                    border: 2px solid var(--doc-green-light);
                    border-radius: 50%;
                    animation: pulse-brain 1s infinite;
                }
                .recording-active {
                    animation: blink 1s infinite;
                    box-shadow: 0 0 15px rgba(255, 71, 87, 0.5);
                }
            `}</style>
        </div>
    );
}

