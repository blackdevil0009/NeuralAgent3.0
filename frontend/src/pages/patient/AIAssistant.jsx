import React, { useState, useRef, useEffect } from 'react';

const QUICK_PROMPTS = [
    '🌿 What is my Dosha type?',
    '💊 Ayurvedic remedies for headache',
    '🍃 Diet plan for Pitta dosha',
    '🩺 Explain my blood report',
    '📹 Live AI Consultation',
];

const INITIAL_MESSAGES = [
    {
        id: 1, from: 'ai',
        text: `🌿 Namaste! I'm **NeuralAgent**, your Ayurvedic AI companion.\n\nI can help you analyze medical reports, monitor your smart health devices, and even connect you to a live consultant.\n\nHow can I help you today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
];

function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
}

const AI_RESPONSES = {
    'dosha': "Determining your dosha type involves physical and mental assessment. Vata (Air), Pitta (Fire), and Kapha (Earth).\n\nWould you like me to start the assessment?",
    'default': "I'm processing your health query using Ayurvedic intelligence. Let me know if you'd like to analyze a specific report or check your vitals monitor. 🌿",
};

export default function AIAssistant() {
    const [activeView, setActiveView] = useState('chat'); // 'chat', 'monitor', 'live'
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
        if (activeView === 'chat') endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, activeView]);

    const sendMessage = async (text) => {
        const msg = (text || input).trim();
        if (!msg) return;

        if (msg.includes('Live Call')) {
            setActiveView('live');
            return;
        }

        setInput('');
        const userMsg = { id: Date.now(), from: 'user', text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        await new Promise(r => setTimeout(r, 1200));

        const aiMsg = {
            id: Date.now() + 1, from: 'ai',
            text: msg.toLowerCase().includes('dosha') ? AI_RESPONSES.dosha : AI_RESPONSES.default,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setTyping(false);
        setMessages(prev => [...prev, aiMsg]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div className="pd-page-header" style={{ borderBottom: '1px solid #eee', paddingBottom: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 45, height: 45, borderRadius: '50%', background: 'var(--doc-bg-ivory)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🌿</div>
                    <div>
                        <h1 style={{ fontSize: '1.4rem' }}>NeuralAgent AI</h1>
                        <p style={{ fontSize: '0.85rem' }}>Your clinical companion for reports & vitals</p>
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
                    <div className="pd-chat-input-row" style={{ padding: '0 20px 20px' }}>
                        <textarea className="pd-chat-input" placeholder="Ask anything..." value={input} onChange={e => setInput(e.target.value)} rows={1} />
                        <button className="pd-chat-send" onClick={() => sendMessage()} disabled={!input.trim()}>➤</button>
                    </div>
                </>
            )}

            {activeView === 'monitor' && (
                <div style={{ padding: 20, animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
                        <div className="pd-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>HEART RATE</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>72 BPM</div>
                        </div>
                        <div className="pd-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>SPO2</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>98%</div>
                        </div>
                        <div className="pd-card" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>DEVICE STATUS</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'green', marginTop: 10 }}>● Connected</div>
                        </div>
                    </div>
                    <div className="pd-card" style={{ marginTop: 20, background: '#f9f9f9', border: '1px dashed #ccc' }}>
                        <h4 style={{ margin: 0 }}>Smart Analysis</h4>
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: 10 }}>Your vitals are within normal range for your Pitta-Vata constitution. Maintain your morning meditation routine for optimal heart rate variability.</p>
                    </div>
                </div>
            )}

            {activeView === 'live' && (
                <div style={{ flex: 1, padding: 20, animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column' }}>
                    <div className="pd-card" style={{ flex: 1, background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', borderRadius: 20, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'inset 0 0 100px rgba(0,255,150,0.1)' }}>
                        {cameraActive ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                                    border: '2px solid var(--doc-green-light)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', margin: '0 auto 20px', position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute', inset: -10, borderRadius: '50%', border: '1px solid var(--doc-green-light)',
                                        opacity: 0.3, animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                                    }}></div>
                                    <span style={{ fontSize: '4rem' }}>🧠</span>
                                </div>
                                <h3 style={{ fontFamily: 'Playfair Display, serif', letterSpacing: 1 }}>NeuralAgent Live AI</h3>
                                <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>"Namaste! I am analyzing your vitals in real-time. How do you feel today?"</p>
                                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 15 }}>
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} style={{ width: 4, height: 15 + Math.random() * 20, background: 'var(--doc-green-light)', borderRadius: 2, animation: `vibrate ${0.5 + Math.random()}s infinite alternate` }}></div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '4rem', marginBottom: 20 }}>🤖</div>
                                <h2 style={{ marginBottom: 10 }}>AI Live Consultation</h2>
                                <p style={{ opacity: 0.6, maxWidth: 300, margin: '0 auto 25px', fontSize: '0.85rem' }}>
                                    Experience instant clinical advice with our advanced 3D AI Avatar.
                                </p>
                                <button className="pd-btn pd-btn-primary" onClick={() => setCameraActive(true)}>💡 Initialize AI Brain</button>
                            </div>
                        )}
                        <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(0,0,0,0.4)', borderRadius: 20, fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff00', boxShadow: '0 0 5px #0ff00' }}></span>
                            AI ENGINE ONLINE v4.2
                        </div>
                    </div>
                    <div style={{ height: 80, display: 'flex', gap: 10, marginTop: 15 }}>
                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCameraActive(false)}>� End Session</button>
                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>🎤 Mute Mic</button>
                        <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>� Screen Share</button>
                    </div>
                </div>
            )}

        </div>
    );
}

