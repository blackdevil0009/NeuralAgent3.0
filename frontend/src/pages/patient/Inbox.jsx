import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/* ─── Mock conversation data ─── */
const INITIAL_CONVERSATIONS = [
    {
        id: 1,
        name: 'Dr. Arjun Menon',
        badge: '🌿',
        spec: 'Ayurveda & General Medicine',
        online: true,
        lastMsg: 'Please share your blood report when ready.',
        lastTime: '10:42 AM',
        unread: 2,
        messages: [
            { id: 1, from: 'them', text: 'Namaste! How are you feeling today?', time: '10:35 AM', type: 'text' },
            { id: 2, from: 'me', text: 'Hello Doctor, I have been feeling tired and having mild headaches.', time: '10:38 AM', type: 'text' },
            { id: 3, from: 'them', text: 'I see. This can be Vata imbalance. Can you describe the timing?', time: '10:40 AM', type: 'text' },
            { id: 4, from: 'me', text: 'Mostly in the evenings after work.', time: '10:41 AM', type: 'text' },
            { id: 5, from: 'them', text: 'Please share your blood report when ready.', time: '10:42 AM', type: 'text' },
        ],
    },
    {
        id: 2,
        name: 'Dr. Priya Nair',
        badge: '🥗',
        spec: 'Nutrition & Dietetics',
        online: true,
        lastMsg: 'Your diet plan is ready. Check the attachment.',
        lastTime: 'Yesterday',
        unread: 1,
        messages: [
            { id: 1, from: 'them', text: 'Good morning! I have reviewed your health profile.', time: 'Yesterday 9:15 AM', type: 'text' },
            { id: 2, from: 'me', text: 'Thank you Doctor! What changes do you suggest?', time: 'Yesterday 9:30 AM', type: 'text' },
            { id: 3, from: 'them', text: 'Your diet plan is ready. Check the attachment.', time: 'Yesterday 9:45 AM', type: 'text', attachment: { name: 'Diet_Plan_Feb.pdf', size: '245 KB', icon: '📄' } },
        ],
    },
    {
        id: 3,
        name: 'Vaidya R. Tripathi',
        badge: '🪴',
        spec: 'Classical Ayurveda',
        online: false,
        lastMsg: 'Take Ashwagandha 500mg with warm milk at night.',
        lastTime: '2 days ago',
        unread: 0,
        messages: [
            { id: 1, from: 'me', text: 'Pranaam Vaidyaji, I have been following the Panchakarma regimen.', time: '2 days ago', type: 'text' },
            { id: 2, from: 'them', text: 'Very good. How is your energy level now?', time: '2 days ago', type: 'text' },
            { id: 3, from: 'me', text: 'Much better! The oil massage really helped.', time: '2 days ago', type: 'text' },
            { id: 4, from: 'them', text: 'Take Ashwagandha 500mg with warm milk at night.', time: '2 days ago', type: 'text' },
        ],
    },
    {
        id: 4,
        name: 'Dr. Kavya Reddy',
        badge: '✨',
        spec: 'Dermatology & Skin',
        online: false,
        lastMsg: 'Apply neem + turmeric paste twice daily.',
        lastTime: '5 days ago',
        unread: 0,
        messages: [
            { id: 1, from: 'them', text: 'Your skin analysis report is reviewed. The rash appears to be contact dermatitis.', time: '5 days ago', type: 'text' },
            { id: 2, from: 'them', text: 'Apply neem + turmeric paste twice daily.', time: '5 days ago', type: 'text' },
        ],
    },
];

const AUTO_REPLIES = [
    "I understand. Let me review your details more carefully. 🌿",
    "Thank you for sharing this. This is very helpful for your diagnosis.",
    "Based on Ayurvedic principles, this could be related to Vata imbalance. Let's discuss further.",
    "I'll prepare a personalised recommendation for you shortly.",
    "Please also include any recent lab reports if you have them. It will help me assess better.",
    "That's a good observation. For now, try warm water with ginger first thing in the morning.",
    "I've noted this. We can discuss it in detail during our next video consultation.",
];

function getAutoReply() {
    return AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
}

export default function Inbox() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselect = parseInt(searchParams.get('doctor')) || null;

    const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
    const [activeId, setActiveId] = useState(preselect || 1);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [searchQ, setSearchQ] = useState('');
    const [attachPreview, setAttachPreview] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [mobileShowChat, setMobileShowChat] = useState(!!preselect);

    const fileRef = useRef(null);
    const endRef = useRef(null);
    const inputRef = useRef(null);

    const active = conversations.find(c => c.id === activeId) || conversations[0];

    /* Auto-scroll to bottom when messages change */
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [active?.messages, typing]);

    /* Mark as read when switching conversation */
    useEffect(() => {
        setConversations(prev =>
            prev.map(c => c.id === activeId ? { ...c, unread: 0 } : c)
        );
        setMobileShowChat(true);
    }, [activeId]);

    const selectConv = (id) => {
        setActiveId(id);
        setInput('');
        setAttachPreview(null);
        setShowAttachMenu(false);
    };

    /* ── Send a message ── */
    const sendMessage = useCallback(async (overrideText) => {
        const text = (overrideText || input).trim();
        if (!text && !attachPreview) return;

        const newMsg = {
            id: Date.now(),
            from: 'me',
            text: text || '',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            attachment: attachPreview || null,
        };

        setConversations(prev => prev.map(c => {
            if (c.id !== activeId) return c;
            return {
                ...c,
                messages: [...c.messages, newMsg],
                lastMsg: text || `📎 ${attachPreview?.name}`,
                lastTime: 'Now',
                unread: 0,
            };
        }));
        setInput('');
        setAttachPreview(null);
        setShowAttachMenu(false);

        /* Simulate doctor typing + auto-reply */
        setTyping(true);
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 900));
        const reply = {
            id: Date.now() + 1,
            from: 'them',
            text: getAutoReply(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
        };
        setTyping(false);
        setConversations(prev => prev.map(c => {
            if (c.id !== activeId) return c;
            return { ...c, messages: [...c.messages, reply], lastMsg: reply.text, lastTime: 'Now' };
        }));
    }, [input, attachPreview, activeId]);

    /* ── Attach file ── */
    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const isImg = file.type.startsWith('image/');
        setAttachPreview({
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

    const filteredConvs = conversations.filter(c =>
        !searchQ || c.name.toLowerCase().includes(searchQ.toLowerCase()) || c.spec.toLowerCase().includes(searchQ.toLowerCase())
    );

    const totalUnread = conversations.reduce((n, c) => n + c.unread, 0);

    return (
        <div className="inbox-shell">

            {/* ══ LEFT: Conversation list ══ */}
            <aside className={`inbox-sidebar ${mobileShowChat ? 'inbox-sidebar-hidden' : ''}`}>
                <div className="inbox-sidebar-head">
                    <h2 className="inbox-title">
                        💬 Messages
                        {totalUnread > 0 && <span className="inbox-unread-total">{totalUnread}</span>}
                    </h2>
                    <button className="inbox-compose" title="New Message" onClick={() => navigate('/patient/doctors')}>✏️</button>
                </div>
                <div className="inbox-search-wrap">
                    <input
                        type="text"
                        className="inbox-search"
                        placeholder="🔍  Search conversations…"
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                    />
                </div>
                <ul className="inbox-conv-list">
                    {filteredConvs.map(c => (
                        <li
                            key={c.id}
                            className={`inbox-conv-item ${c.id === activeId ? 'active' : ''}`}
                            onClick={() => selectConv(c.id)}
                        >
                            <div className="inbox-conv-avatar">
                                {c.badge}
                                <span className={`inbox-online-dot ${c.online ? 'online' : ''}`} />
                            </div>
                            <div className="inbox-conv-info">
                                <div className="inbox-conv-top">
                                    <span className="inbox-conv-name">{c.name}</span>
                                    <span className="inbox-conv-time">{c.lastTime}</span>
                                </div>
                                <div className="inbox-conv-bottom">
                                    <span className="inbox-conv-last">{c.lastMsg}</span>
                                    {c.unread > 0 && <span className="inbox-unread-badge">{c.unread}</span>}
                                </div>
                            </div>
                        </li>
                    ))}
                    {filteredConvs.length === 0 && (
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
                    <div className="inbox-chat-avatar">{active.badge}</div>
                    <div className="inbox-chat-meta">
                        <div className="inbox-chat-name">{active.name}</div>
                        <div className="inbox-chat-spec">
                            <span className={`inbox-status-dot ${active.online ? 'online' : ''}`} />
                            {active.online ? 'Online now' : 'Offline'} · {active.spec}
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

                    {active.messages.map(m => (
                        <div key={m.id} className={`inbox-msg-wrap ${m.from === 'me' ? 'me' : 'them'}`}>
                            {m.from === 'them' && (
                                <div className="inbox-msg-avatar">{active.badge}</div>
                            )}
                            <div className="inbox-msg-col">
                                {/* Text bubble */}
                                {m.text && (
                                    <div className={`inbox-bubble ${m.from}`}>{m.text}</div>
                                )}
                                {/* Attachment bubble */}
                                {m.attachment && (
                                    <div className={`inbox-attach-bubble ${m.from}`}>
                                        {m.attachment.isImg && m.attachment.url ? (
                                            <img src={m.attachment.url} alt={m.attachment.name}
                                                style={{ maxWidth: 200, borderRadius: 10, display: 'block', marginBottom: 4 }} />
                                        ) : (
                                            <div className="inbox-attach-file">
                                                <span className="inbox-attach-icon">{m.attachment.icon}</span>
                                                <div>
                                                    <div className="inbox-attach-name">{m.attachment.name}</div>
                                                    <div className="inbox-attach-size">{m.attachment.size}</div>
                                                </div>
                                                <button className="inbox-attach-dl">⬇</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="inbox-msg-time">
                                    {m.time} {m.from === 'me' && <span className="inbox-read-tick">✓✓</span>}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {typing && (
                        <div className="inbox-msg-wrap them">
                            <div className="inbox-msg-avatar">{active.badge}</div>
                            <div className="inbox-bubble them pd-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

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

                {/* Input bar */}
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
                        placeholder={`Message ${active.name}…`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        rows={1}
                    />

                    <button
                        className="inbox-send-btn"
                        onClick={() => sendMessage()}
                        disabled={!input.trim() && !attachPreview || typing}
                        title="Send"
                    >
                        ➤
                    </button>
                </div>

                {/* Hidden file input */}
                <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
            </div>
        </div>
    );
}
