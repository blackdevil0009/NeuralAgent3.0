import React, { useState } from 'react';

const MOCK_CONVOS = [
    { id: 1, name: 'Rohit Sharma', avatar: '👨', lastMsg: 'Does the herbal tea help with acidity?', time: '10:15 AM', unread: true },
    { id: 2, name: 'Anjali Gupta', avatar: '👩', lastMsg: 'Uploaded my CBC reports for review.', time: 'Yesterday', unread: false },
    { id: 3, name: 'Suresh Iyer', avatar: '👴', lastMsg: 'BP is stable after the new routine.', time: '2 days ago', unread: false },
];

const MOCK_REPORTS = [
    { id: 'R1', title: 'Blood Work - Feb 2026', type: 'PDF', date: '22 Feb 2026', status: 'Pending Review' },
    { id: 'R2', title: 'Digestive Scans', type: 'IMG', date: '20 Feb 2026', status: 'Analyzed' },
];

const INITIAL_MESSAGES = {
    1: [
        { sender: 'patient', text: "Hello Doctor, I've been feeing more lethargic in the mornings lately. Also my digestion feels slow.", time: '10:05 AM' },
        { sender: 'doctor', text: "I see. Based on your previous history, your Vata-Pitta balance might be shifting. Have you been following the warm-water routine?", time: '10:10 AM' },
        { sender: 'patient', text: "Yes, mostly. I've uploaded my latest blood reports here for you to see.", time: '10:15 AM' }
    ],
    2: [
        { sender: 'patient', text: "Hi, I've uploaded the reports from yesterday's scan.", time: 'Yesterday' }
    ],
    3: [
        { sender: 'patient', text: "BP is stable after the new routine.", time: '2 days ago' }
    ]
};

export default function DoctorInbox() {
    const [selectedConvo, setSelectedConvo] = useState(MOCK_CONVOS[0]);
    const [showReports, setShowReports] = useState(false);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [activeReportOverlay, setActiveReportOverlay] = useState(null); // { type: 'summary' | 'preview', report: object }

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        const newMessage = {
            sender: 'doctor',
            text: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages({
            ...messages,
            [selectedConvo.id]: [...messages[selectedConvo.id], newMessage]
        });
        setInputText('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

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
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {MOCK_CONVOS.map(c => (
                        <div
                            key={c.id}
                            onClick={() => setSelectedConvo(c)}
                            style={{
                                padding: '16px 20px', borderBottom: '1px solid var(--doc-border)',
                                cursor: 'pointer', background: selectedConvo.id === c.id ? '#f0f7f2' : 'transparent',
                                borderLeft: selectedConvo.id === c.id ? '4px solid var(--doc-green-light)' : 'none'
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
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e3e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{selectedConvo.avatar}</div>
                        <div>
                            <div style={{ fontWeight: 600 }}>{selectedConvo.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#2d6a4f' }}>● Active Now</div>
                        </div>
                    </div>
                    <button className="dd-btn dd-btn-outline" onClick={() => setShowReports(!showReports)}>
                        {showReports ? '💬 Full Chat' : '📄 Patient Reports'}
                    </button>
                </div>

                <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: '#fcfcfc' }}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)', background: '#eee', padding: '2px 10px', borderRadius: 10 }}>Session Started (22 Feb)</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {(messages[selectedConvo.id] || []).map((msg, i) => (
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
                                {msg.text}
                                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: 4, textAlign: msg.sender === 'doctor' ? 'right' : 'left' }}>{msg.time}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ padding: '20px 24px', borderTop: '1px solid var(--doc-border)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>📎</button>
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
            </div>

            {/* ── Right: Patient Context (Conditional) ── */}
            {
                showReports && (
                    <div className="dd-card" style={{ width: 350, display: 'flex', flexDirection: 'column' }}>
                        <h3>Patient Records</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--doc-text-mute)' }}>Quick access to {selectedConvo.name}'s medical files.</p>

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
                                            <b>Patient:</b> {selectedConvo.name}<br />
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

