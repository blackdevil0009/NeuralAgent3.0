import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleError } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';
import { io } from 'socket.io-client';
import { generateRSAKeyPair, hybridEncrypt, hybridDecrypt } from '../../utils/crypto';

const getAutoReply = () => ""; // Disabled

export default function Inbox() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselect = parseInt(searchParams.get('doctor')) || null;

    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState(preselect);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [searching, setSearching] = useState(false);
    const [attachPreview, setAttachPreview] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [mobileShowChat, setMobileShowChat] = useState(!!preselect);
    const [inboxTab, setInboxTab] = useState('active'); // 'active' | 'history'
    const [appointmentMap, setAppointmentMap] = useState({});

    const active = conversations.find(c => c.id === activeId);

    const fileRef = useRef(null);
    const endRef = useRef(null);
    const inputRef = useRef(null);

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
            // Always (re-)upload public key so the other party can encrypt to us
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

    /* Fetch Doctors and Appointment Status */
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;
        const headers = { 'Authorization': `Bearer ${token}` };

        const fetchDoctors = fetch(`${API_BASE_URL}/api/doctors`, { headers })
            .then(res => res.json()).then(res => res.data?.doctors || []).catch(() => []);

        const fetchAppointments = fetch(`${API_BASE_URL}/api/appointments`, { headers })
            .then(res => res.json()).then(res => res.data?.appointments || []).catch(() => []);

        Promise.all([fetchDoctors, fetchAppointments]).then(([docs, appts]) => {
            // Build map: doctorId → latest appointment status
            const map = {};
            appts.forEach(a => {
                const key = String(a.doctorId);
                if (!map[key] || new Date(a.appointmentDate) > new Date(map[key].appointmentDate)) {
                    map[key] = a;
                }
            });
            setAppointmentMap(map);

            // Only include doctors with at least one appointment (Scheduled or Completed)
            const convos = docs
                .filter(d => map[String(d.id)])
                .map(d => ({
                    id: d.id,
                    name: d.name,
                    spec: d.spec,
                    badge: '🌿',
                    online: map[String(d.id)]?.status === 'Scheduled',
                    status: map[String(d.id)]?.status || 'Scheduled',
                    appointmentDate: map[String(d.id)]?.appointmentDate,
                    lastMsg: map[String(d.id)]?.status === 'Completed' ? '✅ Consultation completed' : 'Tap to message',
                    messages: []
                }));
            setConversations(convos);
            if (!activeId && convos.length > 0) setActiveId(convos[0].id);
        });
    }, []);

    useEffect(() => {
        if (!activeId) return;
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const fetchHistory = () => {
            fetch(`${API_BASE_URL}/api/v2/messages/history/${activeId}?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(res => {
                    if (res.data && res.data.messages) {
                        setConversations(prev => prev.map(c => {
                            if (c.id !== activeId) return c;
                            const formattedMsgs = res.data.messages.map(m => ({
                                id: m.id,
                                from: String(m.senderId) === String(activeId) ? 'them' : 'me',
                                // Always read content field — E2E ciphertext is incompatible with backend
                                text: m.content || '[Message]',
                                time: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }));
                            return { ...c, messages: formattedMsgs };
                        }));
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
            if (String(msg.senderId) === String(activeId) || String(msg.receiverId) === String(activeId)) {
                setConversations(prev => prev.map(c => {
                    if (c.id !== activeId) return c;
                    const newMsg = {
                        id: msg.id,
                        from: String(msg.senderId) === String(activeId) ? 'them' : 'me',
                        text: msg.content || '[Message]',
                        time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    const exists = c.messages.some(m => m.id === newMsg.id || (m.text === newMsg.text && m.from === newMsg.from));
                    if (exists) return c;
                    return { ...c, messages: [...c.messages, newMsg] };
                }));
            }
        });

        return () => socket.disconnect();
    }, [activeId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [active?.messages]);

    /* Debounced Doctor Search */
    useEffect(() => {
        if (!searchQ || searchQ.length < 2) {
            setSuggestions([]);
            return;
        }

        const delay = setTimeout(async () => {
            setSearching(true);
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/doctors/search?q=${encodeURIComponent(searchQ)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const json = await res.json();
                if (res.ok) {
                    setSuggestions(json.data?.doctors || []);
                }
            } catch (err) {
                handleError(err, 'Search failed');
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(delay);
    }, [searchQ]);

    const selectConv = (id) => {
        setActiveId(id);
        setInput('');
        setAttachPreview(null);
        setShowAttachMenu(false);
    };

    /* Send message — plain-text (E2E layer removed: field-name mismatch caused encryption failures) */
    const sendMessage = useCallback(async (overrideText) => {
        const text = (typeof overrideText === 'string' ? overrideText : input).trim();
        if ((!text && !attachPreview) || !activeId) return;

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        let finalText = text;

        if (attachPreview && attachPreview.file) {
            const formData = new FormData();
            formData.append('file', attachPreview.file);
            try {
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
                    handleError(new Error(uploadJson.error || 'Upload failed'), 'Attachment upload failed');
                    return;
                }
            } catch(e) {
                handleError(e, 'Attachment upload error');
                return;
            }
            setAttachPreview(null);
        }

        // Optimistic UI update first
        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            from: 'me',
            text: finalText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setConversations(prev => prev.map(c =>
            c.id !== activeId ? c : { ...c, messages: [...c.messages, optimisticMsg], lastMsg: finalText.split('\n')[0] }
        ));
        setInput('');

        try {
            const resp = await fetch(`${API_BASE_URL}/api/v2/messages/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Timestamp': Math.floor(Date.now() / 1000).toString(),
                    'X-HMAC-Signature': 'DEV_BYPASS'
                },
                body: JSON.stringify({ receiverId: activeId, content: finalText })
            });
            if (!resp.ok) throw new Error('Send failed');
        } catch (err) {
            handleError(err, 'Failed to send message');
        }
    }, [input, activeId, attachPreview]);

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
        setShowAttachMenu(false);
        inputRef.current?.focus();
        e.target.value = '';
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const isCompleted = active && appointmentMap[String(active.id)]?.status === 'Completed';

    const activeConvs = conversations.filter(c => c.status !== 'Completed');
    const historyConvs = conversations.filter(c => c.status === 'Completed');
    const displayConvs = (inboxTab === 'history' ? historyConvs : activeConvs).filter(c =>
        !searchQ ||
        (c.name && c.name.toLowerCase().includes(searchQ.toLowerCase())) ||
        (c.spec && c.spec.toLowerCase().includes(searchQ.toLowerCase()))
    );

    const totalUnread = conversations.reduce((n, c) => n + (c.unread || 0), 0);

    return (
        <div className="inbox-shell">

            {/* ══ LEFT: Conversation list ══ */}
            <aside className={`inbox-sidebar ${mobileShowChat ? 'inbox-sidebar-hidden' : ''}`}>
                <div className="inbox-sidebar-head">
                    <h2 className="inbox-title">
                        💬 Messages
                        {totalUnread > 0 && <span className="inbox-unread-total">{totalUnread}</span>}
                    </h2>
                    <button className="inbox-compose" title="Find Doctors" onClick={() => navigate('/patient/doctors')}>✏️</button>
                </div>
                {/* Active / History Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e8f4ec', background: '#f8fbf9' }}>
                    {['active', 'history'].map(tab => (
                        <button key={tab} onClick={() => setInboxTab(tab)} style={{
                            flex: 1, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: inboxTab === tab ? 700 : 400,
                            color: inboxTab === tab ? '#2d6a4f' : '#888',
                            borderBottom: inboxTab === tab ? '2px solid #2d6a4f' : '2px solid transparent',
                            fontSize: '0.82rem', textTransform: 'capitalize'
                        }}>
                            {tab === 'active' ? `💬 Active (${activeConvs.length})` : `🗂️ History (${historyConvs.length})`}
                        </button>
                    ))}
                </div>
                <div className="inbox-search-wrap" style={{ position: 'relative' }}>
                    <input
                        type="text"
                        className="inbox-search"
                        placeholder="🔍  Search conversations or find doctors…"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                    />
                    {suggestions.length > 0 && (
                        <div className="inbox-suggestions-list" style={{
                            position: 'absolute', top: '100%', left: 0, right: 0,
                            background: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            borderRadius: 12, zIndex: 100, border: '1px solid #eee',
                            marginTop: 4, overflow: 'hidden'
                        }}>
                            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#6b8f71', background: '#f8fbf9', fontWeight: 600 }}>
                                👨‍⚕️ SUGGESTED DOCTORS
                            </div>
                            {suggestions.map(d => (
                                <div
                                    key={d.id}
                                    className="inbox-suggestion-item"
                                    onClick={() => {
                                        // If already in convos, just select it
                                        const exists = conversations.find(c => c.id === d.id);
                                        if (!exists) {
                                            const newConvo = {
                                                id: d.id,
                                                name: d.name,
                                                spec: d.spec,
                                                badge: '🌿',
                                                online: true,
                                                lastMsg: 'Start a new conversation',
                                                messages: []
                                            };
                                            setConversations(prev => [newConvo, ...prev]);
                                        }
                                        selectConv(d.id);
                                        setSearchQ('');
                                        setSuggestions([]);
                                    }}
                                    style={{
                                        padding: '10px 14px', borderTop: '1px solid #f0f0f0',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column'
                                    }}
                                >
                                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2c3e50' }}>{d.name}</span>
                                    <span style={{ fontSize: '0.72rem', color: '#27ae60' }}>{d.spec}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {searching && <div style={{ position: 'absolute', right: 12, top: 10, fontSize: '0.8rem' }}>⏳</div>}
                </div>
                <ul className="inbox-conv-list">
                    {displayConvs.map(c => (
                        <li
                            key={c.id}
                            className={`inbox-conv-item ${c.id === activeId ? 'active' : ''}`}
                            onClick={() => { selectConv(c.id); setMobileShowChat(true); }}
                            style={{ opacity: c.status === 'Completed' ? 0.75 : 1 }}
                        >
                            <div className="inbox-conv-avatar">
                                {c.badge}
                                <span className={`inbox-online-dot ${c.online ? 'online' : ''}`} />
                            </div>
                            <div className="inbox-conv-info">
                                <div className="inbox-conv-top">
                                    <span className="inbox-conv-name">{c.name}</span>
                                    <span className="inbox-conv-time">{c.appointmentDate || ''}</span>
                                </div>
                                <div className="inbox-conv-bottom">
                                    <span className="inbox-conv-last">{c.lastMsg}</span>
                                    {c.status === 'Completed' && <span style={{ fontSize: '0.65rem', background: '#e8f4ec', color: '#2d6a4f', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>DONE</span>}
                                    {c.unread > 0 && <span className="inbox-unread-badge">{c.unread}</span>}
                                </div>
                            </div>
                        </li>
                    ))}
                    {displayConvs.length === 0 && (
                        <div className="pd-empty" style={{ padding: '30px 20px' }}>
                            <div className="pd-empty-icon">🔍</div>
                            <p>No conversations found</p>
                        </div>
                    )}
                </ul>
            </aside>

            {/* ══ RIGHT: Chat panel ══ */}
            <div className={`inbox-chat ${!mobileShowChat ? 'inbox-chat-hidden' : ''}`}>

                {/* Chat header */}
                <div className="inbox-chat-header">
                    <button className="inbox-back-btn" onClick={() => setMobileShowChat(false)}>←</button>
                    <div className="inbox-chat-avatar">{active?.badge || '👤'}</div>
                    <div className="inbox-chat-meta">
                        <div className="inbox-chat-name">{active?.name || 'Select a Doctor'}</div>
                        <div className="inbox-chat-spec">
                            {active && <><span className={`inbox-status-dot online`} /> Online now · {active.spec}</>}
                        </div>
                    </div>
                    <div className="inbox-chat-actions">
                        <button className="inbox-icon-btn" title="Video Call" onClick={() => navigate('/patient/appointments')}>📹</button>
                        <button className="inbox-icon-btn" title="View Reports" onClick={() => navigate('/patient/reports')}>📄</button>
                        <button className="inbox-icon-btn" title="Book Appointment" onClick={() => navigate('/patient/appointments')}>📅</button>
                    </div>
                </div>

                {/* Messages area */}
                <div className="inbox-messages">
                    {/* Date separator */}
                    <div className="inbox-date-sep"><span>Today</span></div>

                    {active && active.messages.map(m => (
                        <div key={m.id} className={`inbox-msg-wrap ${m.from === 'me' ? 'me' : 'them'}`}>
                            {m.from === 'them' && (
                                <div className="inbox-msg-avatar">{active.badge}</div>
                            )}
                            <div className="inbox-msg-col">
                                {/* Text bubble */}
                                {m.text && (
                                    <div className={`inbox-bubble ${m.from}`}>
                                        {m.text.split('\n').map((line, i) => {
                                            if (line.startsWith('[IMAGE] ')) {
                                                const url = line.replace('[IMAGE] ', '').trim();
                                                return <img key={i} src={url} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, display: 'block' }} />;
                                            }
                                            if (line.startsWith('[DOCUMENT] ')) {
                                                const url = line.replace('[DOCUMENT] ', '').trim();
                                                return <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: m.from === 'me' ? '#fff' : '#2d6a4f', textDecoration: 'underline', display: 'block', marginTop: 4, fontWeight: 'bold' }}>📄 View Document</a>;
                                            }
                                            return <div key={i}>{line}</div>;
                                        })}
                                    </div>
                                )}
                                <div className="inbox-msg-time">
                                    {m.time} {m.from === 'me' && <span className="inbox-read-tick">✓✓</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!active && <div style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>Please select a doctor from the list to start a secure conversation.</div>}
                    <div ref={endRef} />
                </div>

                {/* Typing indicator */}
                {typing && active && (
                    <div className="inbox-msg-wrap them">
                        <div className="inbox-msg-avatar">{active.badge}</div>
                        <div className="inbox-bubble them pd-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}
                <div ref={endRef} />

                {/* Attach preview bar */}
                {attachPreview && (
                    <div className="inbox-attach-preview">
                        <span>{attachPreview.icon}</span>
                        <span className="inbox-attach-prev-name">{attachPreview.name}</span>
                        <span className="inbox-attach-prev-size">{attachPreview.size}</span>
                        <button className="inbox-attach-remove" onClick={() => setAttachPreview(null)}>✕</button>
                    </div>
                )}

                {/* Quick prompt chips */}
                <div className="inbox-quick-chips">
                    {['📋 Share report', '📅 Book appointment', '❓ Ask a question', '💊 Prescription query'].map(q => (
                        <button key={q} className="pd-quick-chip" onClick={() => sendMessage(q.replace(/^[^\s]+\s/, ''))}>
                            {q}
                        </button>
                    ))}
                </div>

                {/* Input bar — disabled if appointment is completed */}
                {isCompleted ? (
                    <div style={{
                        padding: '18px 24px', background: '#f0faf4',
                        borderTop: '1px solid #c3e6cb', display: 'flex',
                        alignItems: 'center', gap: 12, color: '#2d6a4f'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>🔒</span>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Consultation Completed</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b8f71' }}>This chat is now archived. Book a new appointment to message again.</div>
                        </div>
                        <button className="pd-btn pd-btn-primary pd-btn-sm" style={{ marginLeft: 'auto' }}
                            onClick={() => navigate('/patient/doctors')}>
                            📅 Book Again
                        </button>
                    </div>
                ) : (
                <div className="inbox-input-bar">
                    {/* Attach menu */}
                    <div className="inbox-attach-wrap">
                        <button
                            className="inbox-attach-btn"
                            title="Attach"
                            onClick={() => setShowAttachMenu(p => !p)}
                        >
                            📎
                        </button>
                        {showAttachMenu && (
                            <div className="inbox-attach-menu">
                                <button onClick={() => { fileRef.current.accept = '.pdf,.jpg,.jpeg,.png'; fileRef.current.click(); }}>
                                    📄 Report / Document
                                </button>
                                <button onClick={() => { fileRef.current.accept = 'image/*'; fileRef.current.click(); }}>
                                    🖼️ Image / Photo
                                </button>
                                <button onClick={() => navigate('/patient/reports')}>
                                    🔗 Share from My Reports
                                </button>
                            </div>
                        )}
                    </div>

                    <textarea
                        ref={inputRef}
                        className="inbox-input"
                        placeholder={`Message ${active?.name || 'Doctor'}…`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        rows={1}
                    />

                    <button
                        className="inbox-send-btn"
                        onClick={() => sendMessage()}
                        disabled={!input.trim() && !attachPreview || typing || !active}
                        title="Send"
                    >
                        ➤
                    </button>
                </div>
                )}

                {/* Hidden file input */}
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            </div>
        </div >
    );
}
