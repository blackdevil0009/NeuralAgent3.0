import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSuccess, handleError } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

const TIME_SLOTS = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

const STATUS_COLORS = {
    'Scheduled': { bg: '#eef2ff', text: '#4338ca' },
    'Confirmed': { bg: '#f0fdf4', text: '#15803d' },
    'Cancelled': { bg: '#fef2f2', text: '#991b1b' },
    'Completed': { bg: '#f8f9fa', text: '#4b5563' }
};

export default function DoctorSchedule() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
    const [viewMode, setViewMode] = useState('today'); // today, week, month
    const [activeIntervention, setActiveIntervention] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                setAppointments(json.data?.appointments || []);
            }
        } catch (err) {
            handleError(err, 'Failed to sync schedule');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, []);

    const handleConfirm = async (id) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Confirmed' })
            });
            if (res.ok) {
                handleSuccess('Appointment confirmed.');
                fetchAppointments(); // Refresh list
            } else {
                const json = await res.json();
                handleError(json.data?.error || 'Failed to update status');
            }
        } catch (err) {
            handleError(err, 'System error updating appointment');
        }
    };

    const renderToday = () => {
        // Filter appointments for the selected date
        // Format of selectedDate: "28 Feb 2026"
        // Format of appt.appointmentDate: "2026-02-28"
        const dailyApps = appointments.filter(a => {
            const d = new Date(a.appointmentDate);
            const formatted = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            return formatted === selectedDate;
        });

        return (
            <div style={{ position: 'relative', marginLeft: 100 }}>
                {TIME_SLOTS.map(t => (
                    <div key={t} style={{ height: 100, borderTop: '1px solid #f0f0f0', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: -85, top: -10, fontSize: '0.75rem', color: 'var(--doc-text-mute)', fontWeight: 600 }}>{t}</span>
                    </div>
                ))}

                {loading ? (
                    <div style={{ position: 'absolute', top: 50, left: 0, right: 0, textAlign: 'center', color: 'var(--doc-text-mute)' }}>
                        Synchronizing clinical calendar...
                    </div>
                ) : dailyApps.map(appt => {
                    const timePart = appt.appointmentTime.split(':');
                    const hour = parseInt(timePart[0]);
                    const mins = parseInt(timePart[1]);

                    const top = (hour === 9 ? 0 : (hour - 9) * 100) + (mins / 60 * 100);
                    const height = 80; // Default height for 45-60m
                    const colors = STATUS_COLORS[appt.status] || STATUS_COLORS['Scheduled'];

                    return (
                        <div key={appt.id} style={{
                            position: 'absolute', top, left: 10, right: 30, height,
                            background: colors.bg, borderLeft: `5px solid ${colors.text}`,
                            borderRadius: 8, padding: '12px 20px', display: 'flex', flexDirection: 'column',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)', zIndex: 10, transition: 'transform 0.2s', cursor: 'pointer'
                        }} className="appt-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: colors.text, fontSize: '0.95rem' }}>{appt.patientName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.5)', marginTop: 2 }}>{appt.type} • ID: {appt.id}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.text }}>{appt.appointmentTime.substring(0, 5)}</div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: colors.text, opacity: 0.8 }}>{appt.status}</span>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
                                {appt.status === 'Scheduled' && (
                                    <button onClick={() => handleConfirm(appt.id)} style={{ background: colors.text, border: 'none', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: '4px 10px', borderRadius: 4 }}>Confirm</button>
                                )}
                                <button onClick={() => navigate(`/doctor/vcall?patient=${appt.patientId}&name=${encodeURIComponent(appt.patientName)}&appt=${appt.id}`)} style={{ background: 'none', border: 'none', color: colors.text, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>📹 Join Call</button>
                                <button onClick={() => setActiveIntervention({ type: 'file', patient: appt.patientName })} style={{ background: 'none', border: 'none', color: colors.text, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Patient File</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderWeek = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', height: '100%', textAlign: 'center', padding: 20, color: 'var(--doc-text-mute)' }}>
            Weekly view sync pending backend extension. Using Today view for active management.
        </div>
    );

    const renderMonth = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: '100%', textAlign: 'center', padding: 20, color: 'var(--doc-text-mute)' }}>
            Monthly view sync pending backend extension.
        </div>
    );

    return (
        <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 130px)', position: 'relative' }}>
            {/* ── Left Sidebar ── */}
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="dd-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <h4 style={{ margin: 0 }}>Clinical Calendar</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontSize: '0.75rem' }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} style={{ fontWeight: 700, color: 'var(--doc-text-mute)', paddingBottom: 8 }}>{d}</div>)}
                        {[...Array(28)].map((_, i) => (
                            <div key={i} onClick={() => setSelectedDate(`${(i + 1).toString().padStart(2, '0')} Feb 2026`)} style={{ padding: '6px 0', borderRadius: 6, cursor: 'pointer', background: selectedDate.includes((i + 1).toString().padStart(2, '0')) ? 'var(--doc-accent)' : 'transparent', fontWeight: selectedDate.includes((i + 1).toString().padStart(2, '0')) ? 700 : 400 }}>{i + 1}</div>
                        ))}
                    </div>
                </div>
                <div className="dd-card" style={{ padding: 20, background: 'var(--doc-green-deep)', color: '#fff' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>Daily Load</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0' }}>{appointments.filter(a => a.status === 'Confirmed').length * 20}%</div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${appointments.filter(a => a.status === 'Confirmed').length * 20}%`, height: '100%', background: 'var(--doc-accent)' }}></div>
                    </div>
                </div>
            </div>

            {/* ── Main Content ── */}
            <div className="dd-card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--doc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>{selectedDate}</h2>
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
                                    <button className="pd-btn pd-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleSuccess('Connection granted.')}>Grant Access</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h2 style={{ margin: 0 }}>📄 Patient File: {activeIntervention.patient}</h2>
                                    <button onClick={() => setActiveIntervention(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                                </div>
                                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <div style={{ background: '#f8f9f8', padding: 15, borderRadius: 10 }}>Clinical history sync pending v2.1</div>
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

