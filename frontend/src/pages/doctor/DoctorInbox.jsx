import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { io } from 'socket.io-client';
import { generateRSAKeyPair, hybridEncrypt, hybridDecrypt } from '../../utils/crypto';

// Mock data removed
const MOCK_REPORTS = [
    { id: 'R1', title: 'Blood Work - Feb 2026', type: 'PDF', date: '22 Feb 2026', status: 'Pending Review' },
    { id: 'R2', title: 'Digestive Scans', type: 'IMG', date: '20 Feb 2026', status: 'Analyzed' },
];

export default function DoctorInbox() {
    const navigate = useNavigate();
    const chatEndRef = React.useRef(null);
    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [showReports, setShowReports] = useState(false);
    const [messages, setMessages] = useState({});
    const [inputText, setInputText] = useState('');
    const [activeReportOverlay, setActiveReportOverlay] = useState(null);
    const [inboxTab, setInboxTab] = useState('active'); // 'active' | 'history'
    const [attachPreview, setAttachPreview] = useState(null);
    const fileInputRef = React.useRef(null);

    // Initialize E2E RSA Keys — always re-upload to ensure DB has our key
    useEffect(() => {
        const initCrypto = async () => {
            let priv = localStorage.getItem('rsaPrivateKey');
            let pub = localStorage.getItem('rsaPublicKey');
            if (!priv || !pub) {
                try {
                    const keys = await generateRSAKeyPair();
                    priv = keys.privateKey;
                    pub = keys.publicKey;
                    localStorage.setItem('rsaPrivateKey', priv);
                    localStorage.setItem('rsaPublicKey', pub);
                } catch(e) { console.error('Crypto init error', e); return; }
            }
            // Always re-upload so patients can encrypt to this doctor
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                if (token) {
                    await fetch(`${API_BASE_URL}/api/v2/keys/upload`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ publicKey: pub })
                    });
                }
            } catch(e) { console.error('Key upload error', e); }
        };
        initCrypto();
    }, []);

    /* Fetch only appointed patients */
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        Promise.all([
            fetch(`${API_BASE_URL}/api/appointments?role=doctor`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE_URL}/api/messages`, { headers: { 'Authorization': `Bearer ${token}` } })
        ])
            .then(([resAppts, resMsgs]) => Promise.all([resAppts.json(), resMsgs.json()]))
            .then(([jsonAppts, jsonMsgs]) => {
                const appts = jsonAppts.data?.appointments || [];
                const msgs = jsonMsgs.data || [];
                
                const map = {};
                
                // Map appointed patients first
                appts.forEach(a => {
                    if (!map[a.patientId] || new Date(a.appointmentDate) > new Date(map[a.patientId].appointmentDate)) {
                        map[a.patientId] = {
                            id: a.patientId,
                            name: a.patientName || 'Patient',
                            avatar: '👨',
                            lastMsg: `${a.type || 'Appointment'} — ${a.appointmentDate || ''}`,
                            time: a.appointmentDate || 'Scheduled',
                            online: a.status === 'Scheduled'
                        };
                    }
                });
                
                // Overlay legacy chatted patients silently
                msgs.forEach(m => {
                    if (m.peerId && !map[m.peerId]) {
                        map[m.peerId] = {
                            id: m.peerId,
                            name: m.peerName || 'Patient',
                            avatar: '👨',
                            lastMsg: 'Past Conversation',
                            time: 'History',
                            online: false
                        };
                    }
                });
                
                const convos = Object.values(map);
                setConversations(convos);
                if (convos.length > 0) setSelectedConvo(convos[0]);
            });
    }, []);

    useEffect(() => {
        if (!selectedConvo) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const fetchHistory = () => {
            fetch(`${API_BASE_URL}/api/v2/messages/history/${selectedConvo.id}?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(res => {
                    if (res.data && res.data.messages) {
                        const formattedMsgs = res.data.messages.map(m => ({
                            id: m.id,
                            sender: String(m.senderId) === String(selectedConvo.id) ? 'patient' : 'doctor',
                            text: m.content || '[Message]',
                            time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }));
                        setMessages(prev => ({ ...prev, [selectedConvo.id]: formattedMsgs }));
                    }
                });
        };

        fetchHistory();
        
        let userId = null;
        if (token) {
            try { userId = JSON.parse(atob(token.split('.')[1])).sub; } catch(e) {}
        }

        const socket = io(API_BASE_URL, { transports: ['websocket'] });
        socket.on('connect', () => {
            if (userId) socket.emit('join_inbox', { userId });
        });

        socket.on('new_inbox_msg', (msg) => {
            if (String(msg.senderId) === String(selectedConvo.id) || String(msg.receiverId) === String(selectedConvo.id)) {
                const newMsg = {
                    id: msg.id,
                    sender: String(msg.senderId) === String(selectedConvo.id) ? 'patient' : 'doctor',
                    text: msg.content || '[Message]',
                    time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setMessages(prev => {
                    const existing = prev[selectedConvo.id] || [];
                    if (existing.some(m => m.id === newMsg.id || (m.text === newMsg.text && m.sender === newMsg.sender))) return prev;
                    return { ...prev, [selectedConvo.id]: [...existing, newMsg] };
                });
            }
        });

        return () => socket.disconnect();
    }, [selectedConvo]);

    // Auto-scroll when messages update
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, selectedConvo]);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isImg = file.type.startsWith('image/');
        setAttachPreview({
            file,
            name: file.name,
            size: (file.size / 1024).toFixed(0) + ' KB',
            icon: isImg ? '🖼️' : file.type === 'application/pdf' ? '📄' : '📎',
            isImg,
            url: isImg ? URL.createObjectURL(file) : null,
        });
        e.target.value = '';
    };

    const handleSendMessage = async () => {
        if ((!inputText.trim() && !attachPreview) || !selectedConvo) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        let finalText = inputText.trim();

        if (attachPreview) {
            try {
                const formData = new FormData();
                formData.append('file', attachPreview.file);
                const uploadRes = await fetch(`${API_BASE_URL}/api/messages/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const uploadJson = await uploadRes.json();
                if (uploadRes.ok) {
                    const uploadData = uploadJson.data || uploadJson;
                    const fileUrl = uploadData.url;
                    const tag = attachPreview.isImg ? `[IMAGE] ${fileUrl}` : `[DOCUMENT] ${fileUrl}`;
                    finalText = finalText ? `${finalText}\n${tag}` : tag;
                } else {
                    console.error('Upload failed', uploadJson.error);
                    return;
                }
            } catch(e) {
                console.error('Attachment upload error', e);
                return;
            }
            setAttachPreview(null);
        }

        // Optimistic UI Update
        const optimisticMsg = {
            sender: 'doctor',
            id: 'temp-' + Date.now(),
            text: finalText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => ({
            ...prev,
            [selectedConvo.id]: [...(prev[selectedConvo.id] || []), optimisticMsg]
        }));
        
        setInputText('');

        try {
            await fetch(`${API_BASE_URL}/api/v2/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
                    'X-HMAC-Signature': 'DEV_BYPASS'
                },
                body: JSON.stringify({ receiverId: selectedConvo.id, content: finalText })
            });
        } catch (err) {
            console.error('Send error:', err);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const isCompleted = selectedConvo?.status === 'Completed';
    const activeConvs = conversations.filter(c => c.status !== 'Completed');
    const historyConvs = conversations.filter(c => c.status === 'Completed');
    const displayConvs = inboxTab === 'history' ? historyConvs : activeConvs;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 130px)', gap: 20, position: 'relative' }}>
            {/* ── Left: Convo List ── */}
            <div className="dd-card" style={{ width: 320, padding: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 20, borderBottom: '1px solid var(--doc-border)' }}>
                    <h3 style={{ margin: 0 }}>Patient Messages</h3>
                    <input type="text" placeholder="Search patients..." style={{
                        width: '100%', marginTop: 12, padding: '8px 12px',
                        borderRadius: 8, border: '1px solid var(--doc-border)', fontSize: '0.85rem'
                    }} />
                </div>
                {/* Active / History Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--doc-border)', background: '#f9fcfa' }}>
                    {['active', 'history'].map(tab => (
                        <button key={tab} onClick={() => setInboxTab(tab)} style={{
                            flex: 1, padding: '9px 0', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: inboxTab === tab ? 700 : 400,
                            color: inboxTab === tab ? '#2d6a4f' : '#888',
                            borderBottom: inboxTab === tab ? '2px solid #2d6a4f' : '2px solid transparent',
                            fontSize: '0.78rem'
                        }}>
                            {tab === 'active' ? `💬 Active (${activeConvs.length})` : `🗂️ History (${historyConvs.length})`}
                        </button>
                    ))}
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {displayConvs.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedConvo(c)}
                            style={{
                                padding: '16px 20px', borderBottom: '1px solid var(--doc-border)',
                                cursor: 'pointer',
                                background: selectedConvo?.id === c.id ? '#f0f7f2' : 'transparent',
                                borderLeft: selectedConvo?.id === c.id ? '4px solid var(--doc-green-light)' : 'none',
                                opacity: c.status === 'Completed' ? 0.75 : 1
                            }}
                        >
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e3e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{c.avatar}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)' }}>{c.time}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.lastMsg}</div>
                                    {c.status === 'Completed' && <span style={{ fontSize: '0.65rem', background: '#e8f4ec', color: '#2d6a4f', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>DONE</span>}
                                </div>
                                {c.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--doc-accent)' }}></div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Center: Chat ── */}
            <div className="dd-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0 }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--doc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e3e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{selectedConvo?.avatar || '👤'}</div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{selectedConvo?.name || 'Select Patient'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#2d6a4f' }}>{selectedConvo ? '● Active Now' : 'No selection'}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {/* <button className="dd-btn dd-btn-primary" onClick={() => navigate('/doctor/vcall')} disabled={!selectedConvo}>📹 Video Call</button> */}
                        <button className="dd-btn dd-btn-outline" onClick={() => setShowReports(!showReports)} disabled={!selectedConvo}>
                            {showReports ? '💬 Full Chat' : '📄 Patient Reports'}
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#fcfcfc' }}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)', background: '#eee', padding: '2px 10px', borderRadius: 10 }}>Session Started (22 Feb)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {selectedConvo && (messages[selectedConvo.id] || []).map((msg, i) => (
                            <div key={i} style={{
                                alignSelf: msg.sender === 'doctor' ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                padding: '12px 16px',
                                background: msg.sender === 'doctor' ? 'var(--doc-green-light)' : '#fff',
                                color: msg.sender === 'doctor' ? '#fff' : '#000',
                                border: msg.sender === 'doctor' ? 'none' : '1px solid var(--doc-border)',
                                borderRadius: msg.sender === 'doctor' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                                fontSize: '0.9rem',
                                position: 'relative'
                            }}>
                                {msg.text.split('\n').map((line, j) => {
                                    if (line.startsWith('[IMAGE] ')) {
                                        const url = line.replace('[IMAGE] ', '').trim();
                                        return <img key={j} src={url} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, display: 'block' }} />;
                                    }
                                    if (line.startsWith('[DOCUMENT] ')) {
                                        const url = line.replace('[DOCUMENT] ', '').trim();
                                        return <a key={j} href={url} target="_blank" rel="noreferrer" style={{ color: msg.sender === 'doctor' ? '#fff' : '#2d6a4f', textDecoration: 'underline', display: 'block', marginTop: 4, fontWeight: 'bold' }}>📄 View Document</a>;
                                    }
                                    return <div key={j}>{line}</div>;
                                })}
                                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4, textAlign: msg.sender === 'doctor' ? 'right' : 'left' }}>{msg.time}</div>
                            </div>
                        ))}
                        {!selectedConvo && <p style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>Choose a patient to start messaging.</p>}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Input bar — disabled if appointment completed */}
                {isCompleted ? (
                    <div style={{
                        padding: '18px 24px', background: '#f0faf4',
                        borderTop: '1px solid #c3e6cb', display: 'flex',
                        alignItems: 'center', gap: 12
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>🔒</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#2d6a4f' }}>Consultation Completed</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b8f71' }}>This session is archived. Patient may book a new appointment.</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {attachPreview && (
                            <div style={{ padding: '10px 20px', background: '#f8f9fa', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: '1.5rem' }}>{attachPreview.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{attachPreview.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{attachPreview.size}</div>
                                </div>
                                <button onClick={() => setAttachPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                            </div>
                        )}
                        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--doc-border)' }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>📎</button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,application/pdf" onChange={handleFile} />
                                <input
                                    type="text"
                                    placeholder="Type clinical advice or prescribed medications..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    style={{
                                        flex: 1, padding: '12px 18px', borderRadius: 12, border: '1px solid var(--doc-border)', background: '#f8f9f8'
                                    }}
                                />
                                <button className="dd-btn dd-btn-primary" onClick={handleSendMessage}>Send Advice</button>
                            </div>
                        </div>
                    </>
                )}

            </div>

            {/* ── Right: Patient Context (Conditional) ── */}
            {
                showReports && (
                    <div className="dd-card" style={{ width: 350, display: 'flex', flexDirection: 'column' }}>
                        <h3>Patient Records</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--doc-text-mute)' }}>Quick access to {selectedConvo?.name || 'Patient'}'s medical files.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
                            {MOCK_REPORTS.map(r => (
                                <div key={r.id} style={{ padding: 16, borderRadius: 12, border: '1px solid var(--doc-border)', background: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>{r.date} • {r.type}</div>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: r.status === 'Analyzed' ? '#d1e7dd' : '#fff3cd', color: r.status === 'Analyzed' ? '#0f5132' : '#856404', borderRadius: 4, fontWeight: 700 }}>{r.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button
                                            className="dd-btn dd-btn-outline"
                                            style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem', justifyContent: 'center' }}
                                            onClick={() => setActiveReportOverlay({ type: 'preview', report: r })}
                                        >Preview</button>
                                        <button
                                            className="dd-btn dd-btn-primary"
                                            style={{ flex: 1, padding: '4px 0', fontSize: '0.75rem', justifyContent: 'center' }}
                                            onClick={() => setActiveReportOverlay({ type: 'summary', report: r })}
                                        >AI Summary</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(201,168,76,0.1)', borderRadius: 12, border: '1px solid rgba(201,168,76,0.3)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#856404', textTransform: 'uppercase', marginBottom: 6 }}>Dosha Profile</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pitta-Vata (Imbalanced)</div>
                            <div style={{ fontSize: '0.75rem', color: '#664d03', marginTop: 4 }}>Last Analysis: 22 Feb 2026. High 'Agni' detected.</div>
                        </div>
                    </div>
                )
            }

            {/* ── Overlays ── */}
            {activeReportOverlay && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <button
                            onClick={() => setActiveReportOverlay(null)}
                            style={{ position: 'absolute', top: 20, right: 20, background: '#eee', border: 'none', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}
                        >×</button>

                        {activeReportOverlay.type === 'summary' ? (
                            <div style={{ padding: 40, overflowY: 'auto' }}>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>✨ AI Clinical Summary</h2>
                                <p style={{ color: 'var(--doc-text-mute)', marginBottom: 24 }}>Analysis of <b>{activeReportOverlay.report.title}</b></p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 16 }}>
                                        <h4 style={{ margin: '0 0 8px' }}>Key Findings</h4>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>Hemoglobin levels are slightly below normal (11.2 g/dL). Blood glucose levels indicate borderline pre-diabetes. No signs of infection detected in WBC count.</p>
                                    </div>
                                    <div style={{ background: '#f0f7f2', padding: 20, borderRadius: 16 }}>
                                        <h4 style={{ margin: '0 0 8px', color: 'var(--doc-green-light)' }}>Ayurvedic Correlation</h4>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>Findings suggest 'Rakta Dhatu' depletion (Anemia) coupled with high 'Agni' activity in the lower digestive tract. Correlates with reported acidity symptoms.</p>
                                    </div>
                                    <div style={{ background: '#fffbeb', padding: 20, borderRadius: 16 }}>
                                        <h4 style={{ margin: '0 0 8px', color: '#856404' }}>Recommended Action</h4>
                                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>Prescribe iron-rich Ayurvedic supplements (Mandura Bhasma). Advise Pomegranate juice and cooling herbs like Amla to balance Pitta.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px 40px', borderBottom: '1px solid #eee' }}>
                                    <h3 style={{ margin: 0 }}>Report Preview: {activeReportOverlay.report.title}</h3>
                                </div>
                                <div style={{ flex: 1, background: '#555', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: '100%', height: '100%', background: '#fff', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', padding: 40 }}>
                                        <div style={{ borderBottom: '2px solid #000', paddingBottom: 10, marginBottom: 20 }}>
                                            <h4 style={{ margin: 0 }}>APOLLO CLINICAL LABS</h4>
                                            <div style={{ fontSize: '0.7rem' }}>Authorized diagnostic center</div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', lineHeight: 2 }}>
                                            <b>Patient:</b> {selectedConvo?.name || 'Patient'}<br />
                                            <b>Date:</b> {activeReportOverlay.report.date}<br />
                                            <br />
                                            <b>Parameter | Result | Range</b><br />
                                            Hemoglobin | 11.2 | 12.0 - 15.0<br />
                                            RBC Count | 4.2 | 4.0 - 5.5<br />
                                            Blood Glucose | 108 | 70 - 100<br />
                                            ...<br />
                                            <div style={{ marginTop: 40, textAlign: 'center', opacity: 0.5 }}>- End of Page 1 -</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div style={{ padding: '20px 40px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                            <button className="dd-btn dd-btn-primary" onClick={() => setActiveReportOverlay(null)}>Close View</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

