import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/config';

const QUICK_PROMPTS = [
    '🤒 I have common cold symptoms',
    '🦴 Ayurvedic remedies for joint pain',
    '🍬 How to manage diabetes in Ayurveda?',
    '🧘 I feel anxious and stressed',
    '🍵 Benefits of Ginger tea',
];

const INITIAL_MESSAGES = [
    {
        id: 1, from: 'ai',
        text: `Hello! 👋 I'm your local **Ayurveda AI Assistant**. I can provide informational guidance based on traditional Ayurvedic wisdom. Tell me your symptoms or query!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
];

function formatText(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^- (.*?):/gm, '<br/><strong>- $1:</strong>')
        .replace(/\n/g, '<br/>');
}

export default function AIAssistant() {
    const [activeView, setActiveView] = useState('chat'); // 'chat'
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [brainModel, setBrainModel] = useState('VaidyaMed-X Hybrid AI (Gemini + RAG)');
    const [interimTranscript, setInterimTranscript] = useState('');

    // Refs
    const recognition = useRef(null);
    const endRef = useRef(null);

    // Initialize Web Speech API
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = false;
            recognition.current.interimResults = true;
            recognition.current.lang = 'en-IN';

            recognition.current.onstart = () => setIsRecording(true);
            recognition.current.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const transcript = event.results[i][0].transcript;
                        setInterimTranscript('');
                        sendMessage(transcript);
                        setIsRecording(false);
                        recognition.current.stop();
                    } else {
                        interim += event.results[i][0].transcript;
                        setInterimTranscript(interim);
                    }
                }
            };
            recognition.current.onend = () => setIsRecording(false);
            recognition.current.onerror = () => setIsRecording(false);
        }
    }, []);

    useEffect(() => {
        if (activeView === 'chat') endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, activeView, interimTranscript]);

    const sendMessage = async (text) => {
        const msg = (text || input || interimTranscript).trim();
        if (!msg) return;

        setInput('');
        const userMsg = {
            id: Date.now(),
            from: 'user',
            text: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        try {
            const response = await fetch(`${API_BASE_URL}/api/v2/ai/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: msg })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Server Error Response:", errorText);
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error("Non-JSON Response:", text);
                throw new Error("Invalid response (expected JSON, got HTML). Check if Backend API is running at the correct URL.");
            }

            const resData = await response.json();
            
            if (response.status === 401) {
                alert("Session expired. Please log in again.");
                window.location.href = '/login';
                return;
            }

            const aiResponseText = resData.data?.response || resData.error || "I'm having trouble connecting to my local knowledge base. Please ensure Ollama is running.";
            
            const aiMsg = {
                id: Date.now() + 1, from: 'ai',
                text: aiResponseText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, aiMsg]);
            playLocalTTS(aiResponseText);

        } catch (err) {
            console.error("AI Error:", err);
            const errorMsg = {
                id: Date.now() + 1, from: 'ai',
                text: "Local AI system is offline. Please check your connection to the server. 🏥",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setTyping(false);
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
                    <div style={{ width: 45, height: 45, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', position: 'relative', border: '1px solid #dcfce7' }}>
                        🌿
                        {isSpeaking && <div className="speaking-ring"></div>}
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', color: '#166534' }}>Ayurveda AI Assistant</h1>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>Engine: <strong>{brainModel}</strong> | Status: <span style={{ color: '#22c55e' }}>● Active</span></p>
                    </div>
                </div>
            </div>

            <div className="pd-chat-messages" style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#fdfdfb' }}>
                {messages.map(m => (
                    <div key={m.id} className={`pd-bubble-wrap ${m.from}`}>
                        <div className={`pd-bubble ${m.from}`} style={{ 
                            background: m.from === 'ai' ? '#fff' : '#166534',
                            color: m.from === 'ai' ? '#333' : '#fff',
                            border: m.from === 'ai' ? '1px solid #e2e8f0' : 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            maxWidth: '85%'
                        }} dangerouslySetInnerHTML={{ __html: formatText(m.text) }} />
                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 4, textAlign: m.from === 'user' ? 'right' : 'left' }}>{m.time}</div>
                    </div>
                ))}
                {typing && <div className="pd-bubble ai pd-typing" style={{ background: '#fff', border: '1px solid #e2e8f0' }}><span></span><span></span><span></span></div>}
                <div ref={endRef} />
            </div>

            <div className="pd-quick-prompts" style={{ padding: '10px 20px', display: 'flex', gap: 8, overflowX: 'auto', background: '#fff' }}>
                {QUICK_PROMPTS.map(p => <button key={p} className="pd-quick-chip" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', whiteSpace: 'nowrap' }} onClick={() => sendMessage(p)}>{p}</button>)}
            </div>

            <div className="pd-chat-input-row" style={{ padding: '15px 20px 20px', gap: 10, position: 'relative', background: '#fff', borderTop: '1px solid #eee' }}>
                {interimTranscript && (
                    <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', background: '#166534', color: '#fff', padding: '8px 20px', borderRadius: 20, fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 10 }}>
                        🎤 {interimTranscript}...
                    </div>
                )}
                
                <textarea id="ai-chat-input" name="ai-chat-input" className="pd-chat-input" 
                    placeholder="Ask about symptoms (e.g., 'Remedies for dry cough')..." 
                    style={{ borderRadius: 15, border: '1px solid #e2e8f0', padding: '12px 15px' }}
                    value={input} onChange={e => setInput(e.target.value)} rows={1} 
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())} />

                <button className={`pd-chat-send ${isRecording ? 'recording-active' : ''}`} onClick={handleVoiceToggle} 
                    style={{ background: isRecording ? '#ef4444' : '#f0fdf4', color: isRecording ? '#fff' : '#166534', border: '1px solid #dcfce7', borderRadius: '50%', width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isRecording ? '🛑' : '🎤'}
                </button>
                <button className="pd-chat-send" onClick={() => sendMessage()} disabled={!input.trim()} 
                    style={{ background: '#166534', border: 'none', borderRadius: '50%', width: 45, height: 45, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    ➤
                </button>
            </div>

            <style>{`
                @keyframes pulse-brain {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 0.4; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                .speaking-ring {
                    position: absolute;
                    inset: -5px;
                    border: 2px solid #22c55e;
                    border-radius: 50%;
                    animation: pulse-brain 1s infinite;
                }
                .recording-active {
                    animation: blink 1s infinite;
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .pd-bubble.user { align-self: flex-end; }
                .pd-bubble.ai { align-self: flex-start; }
            `}</style>
        </div>
    );
}

