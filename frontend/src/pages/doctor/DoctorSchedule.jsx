import React, { useState } from 'react';

const TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

const MOCK_APPOINTMENTS = [
    { id: 1, time: '10:00 AM', duration: '45m', patient: 'Rohit Sharma', type: 'Video Consult', status: 'Upcoming', color: '#eef2ff', textColor: '#4338ca', date: '25 Feb 2026' },
    { id: 2, time: '11:15 AM', duration: '30m', patient: 'Anjali Gupta', type: 'Follow-up', status: 'Waiting', color: '#fffbeb', textColor: '#92400e', date: '25 Feb 2026' },
    { id: 3, time: '02:00 PM', duration: '60m', patient: 'Suresh Iyer', type: 'Initial Assessment', status: 'Scheduled', color: '#f0fdf4', textColor: '#15803d', date: '25 Feb 2026' },
    { id: 4, time: '04:30 PM', duration: '30m', patient: 'Meera Das', type: 'Report Review', status: 'Scheduled', color: '#fdf2f8', textColor: '#be185d', date: '25 Feb 2026' },
];

export default function DoctorSchedule() {
    const [selectedDate, setSelectedDate] = useState('25 Feb 2026');
    const [viewMode, setViewMode] = useState('today'); // today, week, month
    const [activeIntervention, setActiveIntervention] = useState(null); // { type: 'video' | 'file', patient: string }

    const renderToday = () => (
        <div style={{ position: 'relative', marginLeft: 100 }}>
            {TIME_SLOTS.map(t => (
                <div key={t} style={{ height: 100, borderTop: '1px solid #f0f0f0', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: -85, top: -10, fontSize: '0.75rem', color: 'var(--doc-text-mute)', fontWeight: 600 }}>{t}</span>
                </div>
            ))}
            <div style={{ position: 'absolute', top: 150, left: -100, right: 0, borderTop: '2px dashed #f6e05e', zIndex: 5 }}>
                <span style={{ background: '#f6e05e', color: '#856404', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, position: 'absolute', left: 10, top: -11 }}>LIVE</span>
            </div>
            {MOCK_APPOINTMENTS.map(appt => {
                const hour = parseInt(appt.time.split(':')[0]);
                const top = (hour === 9 ? 0 : (hour - 9) * 100) + (appt.time.includes('15') ? 25 : appt.time.includes('30') ? 50 : 0);
                const height = parseInt(appt.duration) * 1.6;
                return (
                    <div key={appt.id} style={{
                        position: 'absolute', top, left: 10, right: 30, height,
                        background: appt.color, borderLeft: `5px solid ${appt.textColor}`,
                        borderRadius: 8, padding: '12px 20px', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)', zIndex: 10, transition: 'transform 0.2s', cursor: 'pointer'
                    }} className="appt-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 700, color: appt.textColor, fontSize: '0.95rem' }}>{appt.patient}</div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{appt.type} • {appt.duration}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: appt.textColor }}>{appt.time}</div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: appt.textColor, opacity: 0.8 }}>{appt.status}</span>
                            </div>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
                            <button onClick={() => setActiveIntervention({ type: 'video', patient: appt.patient })} style={{ background: 'none', border: 'none', color: appt.textColor, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Join Call</button>
                            <button onClick={() => setActiveIntervention({ type: 'file', patient: appt.patient })} style={{ background: 'none', border: 'none', color: appt.textColor, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Patient File</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderWeek = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', height: '100%' }}>
            <div style={{ borderRight: '1px solid var(--doc-border)' }}>
                {TIME_SLOTS.map(t => <div key={t} style={{ height: 60, padding: 10, fontSize: '0.7rem', color: 'var(--doc-text-mute)', borderBottom: '1px solid #f9f9f9' }}>{t}</div>)}
            </div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                    <div style={{ padding: 10, fontWeight: 700, borderBottom: '1px solid var(--doc-border)', background: day === 'Wed' ? 'var(--doc-bg-ivory)' : 'transparent' }}>{day}</div>
                    {TIME_SLOTS.map(t => (
                        <div key={t} style={{ height: 60, borderBottom: '1px solid #f9f9f9', position: 'relative' }}>
                            {day === 'Wed' && t === '10:00 AM' && (
                                <div style={{ position: 'absolute', inset: 4, background: '#eef2ff', borderLeft: '3px solid #4338ca', borderRadius: 4, fontSize: '0.65rem', padding: 4, textAlign: 'left', overflow: 'hidden' }}>
                                    <b>Rohit S.</b><br />Video
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

    const renderMonth = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: '100%', gridTemplateRows: '40px repeat(5, 1fr)' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ fontWeight: 700, textAlign: 'center', padding: 10, borderBottom: '1px solid var(--doc-border)' }}>{d}</div>)}
            {[...Array(31)].map((_, i) => (
                <div key={i} style={{ borderRight: '1px solid #eee', borderBottom: '1px solid #eee', padding: 8, background: (i + 1) === 25 ? 'var(--doc-bg-ivory)' : 'white' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: (i + 1) === 25 ? 700 : 400 }}>{i + 1}</span>
                    {(i + 1) % 7 === 0 && <div style={{ fontSize: '0.65rem', background: 'var(--doc-green-light)', color: '#fff', padding: '2px 4px', borderRadius: 2, marginTop: 4 }}>4 Apps</div>}
                </div>
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 130px)', position: 'relative' }}>
            {/* ── Left Sidebar ── */}
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="dd-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <h4 style={{ margin: 0 }}>February 2026</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: '0.75rem' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} style={{ fontWeight: 700, color: 'var(--doc-text-mute)', paddingBottom: 8 }}>{d}</div>)}
                        {[...Array(28)].map((_, i) => (
                            <div key={i} onClick={() => setSelectedDate(`${i + 1} Feb 2026`)} style={{ padding: '6px 0', borderRadius: 6, cursor: 'pointer', background: (i + 1) === 25 ? 'var(--doc-accent)' : 'transparent', fontWeight: (i + 1) === 25 ? 700 : 400, color: (i + 1) === 25 ? 'var(--doc-green-deep)' : 'inherit' }}>{i + 1}</div>
                        ))}
                    </div>
                </div>
                <div className="dd-card" style={{ padding: 20, background: 'var(--doc-green-deep)', color: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{viewMode === 'month' ? 'Monthly Load' : 'Daily Load'}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0' }}>{viewMode === 'month' ? '65%' : '85%'} Full</div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: viewMode === 'month' ? '65%' : '85%', height: '100%', background: 'var(--doc-accent)' }}></div>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="dd-card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--doc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>{viewMode === 'today' ? selectedDate : viewMode === 'week' ? 'Week 4 - February 2026' : 'February 2026'}</h2>
                        <span style={{ fontSize: '0.85rem', color: 'var(--doc-text-mute)' }}>Clinical Schedule</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className={`dd-btn ${viewMode === 'month' ? 'dd-btn-primary' : 'dd-btn-outline'}`} onClick={() => setViewMode('month')}>Month</button>
                        <button className={`dd-btn ${viewMode === 'week' ? 'dd-btn-primary' : 'dd-btn-outline'}`} onClick={() => setViewMode('week')}>Week</button>
                        <button className={`dd-btn ${viewMode === 'today' ? 'dd-btn-primary' : 'dd-btn-outline'}`} onClick={() => setViewMode('today')}>Today</button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'today' ? '24px 0' : 0 }}>
                    {viewMode === 'today' && renderToday()}
                    {viewMode === 'week' && renderWeek()}
                    {viewMode === 'month' && renderMonth()}
                </div>
            </div>

            {/* ── Interventions ── */}
            {activeIntervention && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, padding: 30, textAlign: 'center' }}>
                        {activeIntervention.type === 'video' ? (
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: 20 }}>📡</div>
                                <h2>Clinical Video Session</h2>
                                <p style={{ color: '#666' }}>Initializing secure peer-to-peer link for <b>{activeIntervention.patient}</b>...</p>
                                <div style={{ height: 200, background: '#1a1a1a', borderRadius: 12, margin: '25px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#fff' }}>Connecting...</span>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button className="dd-btn dd-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setActiveIntervention(null)}>Terminate</button>
                                    <button className="dd-btn dd-btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--doc-green-light)' }}>Grant Permission</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h2 style={{ margin: 0 }}>📄 Patient File: {activeIntervention.patient}</h2>
                                    <button onClick={() => setActiveIntervention(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                                </div>
                                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <div style={{ background: '#f8f9f8', padding: 15, borderRadius: 10 }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Primary Dosha</div>
                                        <div style={{ fontWeight: 700 }}>Vata-Pitta (62% dominance)</div>
                                    </div>
                                    <div style={{ background: '#f8f9f8', padding: 15, borderRadius: 10 }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Active Treatment</div>
                                        <div style={{ fontWeight: 600 }}>Panchakarma Detox - Phase 2</div>
                                    </div>
                                    <div style={{ background: '#fff5f5', padding: 15, borderRadius: 10, border: '1px solid #feb2b2' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#c53030', textTransform: 'uppercase' }}>Recent Alert</div>
                                        <div style={{ color: '#c53030', fontWeight: 600 }}>Reported elevated pulse at 11:30 AM today.</div>
                                    </div>
                                </div>
                                <button className="dd-btn dd-btn-primary" style={{ width: '100%', marginTop: 25, justifyContent: 'center' }} onClick={() => setActiveIntervention(null)}>Close Record</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

