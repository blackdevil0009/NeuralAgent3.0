import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleError } from '../../utils/error_handlers';

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
    if (!iso) return '—';
    const parts = iso.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

const STATUS_STYLES = {
    confirmed:  { background: '#dcfce7', color: '#15803d' },
    completed:  { background: '#dbeafe', color: '#1d4ed8' },
    pending:    { background: '#fef9c3', color: '#92400e' },
    cancelled:  { background: '#fee2e2', color: '#991b1b' },
};

export default function HospitalDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            navigate('/hospital/login');
            setLoading(false);
            return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const fetchAll = async () => {
            try {
                const [docRes, apptRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/v2/hospital/doctors`, { headers }),
                    fetch(`${API_BASE_URL}/api/appointments`, { headers }),
                ]);

                if (docRes.status === 401 || docRes.status === 403) {
                    navigate('/hospital/login');
                    return;
                }

                const docJson  = await docRes.json();
                const apptJson = await apptRes.json();

                setDoctors(docJson.data?.doctors || []);
                setAppointments(apptJson.data?.appointments || []);
            } catch (err) {
                handleError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [navigate]);

    const today = new Date().toISOString().slice(0, 10);
    const activeDoctors  = doctors.filter((d) => d.is_email_verified);
    const pendingDoctors = doctors.filter((d) => !d.is_email_verified);
    const todayAppts     = appointments.filter((a) => a.appointmentDate === today);
    const recentAppts    = [...appointments]
        .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
        .slice(0, 5);
    const recentDoctors  = [...doctors].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6);

    const stats = [
        { label: 'Total Doctors',      val: String(doctors.length),      trend: `${activeDoctors.length} active`, icon: '👨‍⚕️' },
        { label: 'Pending Invites',    val: String(pendingDoctors.length), trend: 'Awaiting doctor action',       icon: '📩' },
        { label: 'Today Appointments', val: String(todayAppts.length),    trend: `${appointments.length} total`,  icon: '📅' },
        { label: 'Total Revenue',      val: appointments.length > 0
            ? `₹${appointments.reduce((sum, a) => sum + (a.amountPaid || 0), 0).toLocaleString('en-IN')}`
            : '₹0',
          trend: 'From confirmed bookings', icon: '💰' },
    ];

    return (
        <div className="h-dashboard-page">
            <h1 style={{ marginBottom: '30px', fontWeight: 800 }}>Overview Dashboard</h1>

            {/* Stat cards */}
            <div className="h-stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className="h-stat-card">
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{s.icon}</div>
                        <div className="h-stat-val">{s.val}</div>
                        <div className="h-stat-label">{s.label}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>{s.trend}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                {/* Recent Doctors */}
                <div className="h-card-base">
                    <div className="h-section-title">
                        <span>Recent Medical Staff</span>
                        <button onClick={() => navigate('/hospital/doctors')} style={{ color: '#2d6a4f', fontSize: '0.9rem', border: 'none', background: 'none', cursor: 'pointer' }}>
                            View All
                        </button>
                    </div>
                    {loading ? (
                        <p style={{ color: '#64748b' }}>Loading...</p>
                    ) : (
                        <table className="h-table">
                            <thead>
                                <tr>
                                    <th>Doctor Name</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDoctors.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>No doctors linked yet.</td>
                                    </tr>
                                ) : recentDoctors.map((doc) => (
                                    <tr key={doc.id}>
                                        <td style={{ fontWeight: 600 }}>{doc.name || 'Doctor'}</td>
                                        <td>{doc.specialization || 'General'}</td>
                                        <td>
                                            <span className={`h-tag ${doc.is_email_verified ? 'h-tag-success' : 'h-tag-warning'}`}>
                                                {doc.is_email_verified ? 'Active' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Recent Appointments */}
                <div className="h-card-base">
                    <div className="h-section-title">
                        <span>Recent Appointments</span>
                        <button onClick={() => navigate('/hospital/appointments')} style={{ color: '#2d6a4f', fontSize: '0.9rem', border: 'none', background: 'none', cursor: 'pointer' }}>
                            View All
                        </button>
                    </div>
                    {loading ? (
                        <p style={{ color: '#64748b' }}>Loading...</p>
                    ) : recentAppts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
                            <div style={{ fontSize: '0.88rem' }}>No appointments yet.</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {recentAppts.map((appt) => {
                                const style = STATUS_STYLES[appt.status?.toLowerCase()] || { background: '#f1f5f9', color: '#64748b' };
                                return (
                                    <div key={appt.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 14px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#fafcff',
                                        gap: '10px',
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {appt.patientName || 'Patient'}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                {appt.doctorName || '—'} · {formatDate(appt.appointmentDate)} {formatTime(appt.appointmentTime)}
                                            </div>
                                        </div>
                                        <span style={{
                                            ...style,
                                            padding: '3px 10px', borderRadius: '20px',
                                            fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {appt.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
