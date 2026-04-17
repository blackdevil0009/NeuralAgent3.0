import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleError } from '../../utils/error_handlers';

export default function HospitalDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        const fetchDoctors = async () => {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) {
                navigate('/hospital/login');
                setLoading(false);
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/v2/hospital/doctors`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (res.status === 401 || res.status === 403) {
                    navigate('/hospital/login');
                    return;
                }
                if (!res.ok) throw new Error(json.data?.message || 'Failed to load dashboard data.');
                setDoctors(json.data?.doctors || []);
            } catch (err) {
                handleError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, [navigate]);

    const activeDoctors = doctors.filter((d) => d.is_email_verified);
    const pendingDoctors = doctors.filter((d) => !d.is_email_verified);
    const recentDoctors = [...doctors].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 6);

    const stats = [
        { label: 'Total Doctors', val: String(doctors.length), trend: `${activeDoctors.length} active` },
        { label: 'Pending Invites', val: String(pendingDoctors.length), trend: 'Awaiting doctor action' },
        { label: 'Today Appointments', val: '-', trend: 'Connect appointments API next' },
        { label: 'Facility Rating', val: '4.8', trend: 'Stable performance' },
    ];

    return (
        <div className="h-dashboard-page">
            <h1 style={{ marginBottom: '30px', fontWeight: 800 }}>Overview Dashboard</h1>

            <div className="h-stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className="h-stat-card">
                        <div>
                            <div className="h-stat-val">{s.val}</div>
                            <div className="h-stat-label">{s.label}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>{s.trend}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
                <div className="h-card-base">
                    <div className="h-section-title">
                        <span>Recent Medical Staff</span>
                        <button onClick={() => navigate('/hospital/doctors')} style={{ color: '#2d6a4f', fontSize: '0.9rem', border: 'none', background: 'none', cursor: 'pointer' }}>
                            View All
                        </button>
                    </div>
                    {loading ? (
                        <p style={{ color: '#64748b' }}>Loading doctors...</p>
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
                                        <td>{doc.specialization || doc.spec || 'General'}</td>
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

                <div className="h-card-base">
                    <div className="h-section-title">
                        <span>Quick Notes</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                            <div style={{ fontWeight: 700, color: '#065f46', fontSize: '0.95rem' }}>Invitation Flow Live</div>
                            <p style={{ fontSize: '0.85rem', color: '#065f46', opacity: 0.8 }}>
                                Existing doctors can accept invite directly. New doctors auto-link after verification.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
