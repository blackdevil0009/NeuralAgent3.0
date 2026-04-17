import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleError } from '../../utils/error_handlers';
import './hospital_emergencies.css';

export default function HospitalEmergencies() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    const [emergencies, setEmergencies] = useState([]);
    const [liveTimes, setLiveTimes] = useState({});
    const { socket } = useSocket();
    const timeTickRef = useRef(0);
    const pollRef = useRef(null);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, claimed, resolved
    const [stats, setStats] = useState({
        total: 0,
        critical: 0,
        urgent: 0,
        nonUrgent: 0,
        pending: 0,
        claimed: 0,
        resolved: 0
    });
    
    const [activeModal, setActiveModal] = useState(null);
    const [selectedEmergency, setSelectedEmergency] = useState(null);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [assignmentLoading, setAssignmentLoading] = useState(false);

    const extractList = (json, key) => {
        if (Array.isArray(json?.data?.[key])) return json.data[key];
        if (Array.isArray(json?.data?.result)) return json.data.result;
        if (Array.isArray(json?.data)) return json.data;
        if (Array.isArray(json?.[key])) return json[key];
        return [];
    };

    const fetchEmergencies = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/hospital/emergencies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                const data = extractList(json, 'emergencies');
                setEmergencies(data);
            } else if (res.status === 401) {
                navigate('/hospital/login');
            } else {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.data?.message || 'Failed to fetch emergencies');
            }
        } catch (err) {
            handleError(err);
            setEmergencies([]);
        } finally {
            setLoading(false);
        }
    }, [token, navigate]);

    const fetchDoctors = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/hospital/doctors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                const data = extractList(json, 'doctors');
                setDoctors(data);
            } else {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.data?.message || 'Failed to fetch doctors');
            }
        } catch (err) {
            handleError(err);
            setDoctors([]);
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            navigate('/hospital/login');
            return;
        }
        fetchEmergencies();
        fetchDoctors();
    }, [token, fetchEmergencies, fetchDoctors]);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleNewEmergency = () => {
            console.log('🔴 New emergency received via socket');
            fetchEmergencies();
        };

        const handleEmergencyHandled = (data) => {
            console.log('✅ Emergency handled via socket:', data.id);
            fetchEmergencies();
        };

        socket.on('new_emergency', handleNewEmergency);
        socket.on('emergency_handled', handleEmergencyHandled);

        return () => {
            socket.off('new_emergency', handleNewEmergency);
            socket.off('emergency_handled', handleEmergencyHandled);
        };
    }, [socket, fetchEmergencies]);

    // Live time updates (every 30s)
    useEffect(() => {
        const tick = () => {
            timeTickRef.current += 1;
            const now = Date.now();
            const newLiveTimes = {};
            emergencies.forEach((em) => {
                if (em.createdAt) {
                    const created = new Date(em.createdAt).getTime();
                    const minsAgo = Math.floor((now - created) / 60000);
                    newLiveTimes[em.id] = minsAgo <= 1 ? 'Just now' : `${minsAgo} min ago`;
                }
            });
            setLiveTimes(newLiveTimes);
        };

        tick(); // Initial
        const interval = setInterval(tick, 30000);
        return () => clearInterval(interval);
    }, [emergencies]);

    // Auto-poll fallback
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchEmergencies, 10000); // 10s
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchEmergencies]);

    const getFilteredEmergencies = () => {
        if (filter === 'all') return emergencies;
        return emergencies.filter(e => e.status === filter);
    };

    const getTypeColor = (type) => {
        if (type === 'critical') return '#c0392b';
        if (type === 'urgent') return '#d35400';
        return '#f1c40f';
    };

    const getStatusColor = (status) => {
        if (status === 'pending') return '#e67e22';
        if (status === 'claimed') return '#3498db';
        return '#27ae60';
    };

    const handleAssignDoctor = async () => {
        if (!selectedEmergency || !selectedDoctor) {
            alert('Please select both emergency and doctor');
            return;
        }

        setAssignmentLoading(true);
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/hospital/emergencies/${selectedEmergency.id}/assign`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ doctorId: selectedDoctor })
                }
            );

            if (res.ok) {
                setActiveModal(null);
                setSelectedEmergency(null);
                setSelectedDoctor(null);
                fetchEmergencies();
            } else {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.data?.message || 'Failed to assign doctor');
            }
        } catch (err) {
            handleError(err);
        } finally {
            setAssignmentLoading(false);
        }
    };

    const handleResolveEmergency = async (emergencyId) => {
        if (!window.confirm('Mark this emergency as resolved?')) return;

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/hospital/emergencies/${emergencyId}/resolve`,
                {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (res.ok) {
                fetchEmergencies();
            } else {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.data?.message || 'Failed to resolve emergency');
            }
        } catch (err) {
            handleError(err);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        const minsAgo = liveTimes[`em-${dateStr}`] || Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000) <= 1 ? 'Just now' : `${Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)} min ago`;
        return `${minsAgo} (${date.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`
    };

    const filtered = getFilteredEmergencies();

    return (
        <div className="h-emergencies-page">
            <div className="h-emergencies-header">
                <div>
                    <h1 style={{ marginBottom: '10px' }}>🚨 Emergency Management Center</h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Monitor and manage all critical cases across your facility</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <span className="h-emg-status-badge active">Status: Active Monitoring</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="h-emg-stats-grid">
                <div className="h-emg-stat-card">
                    <div className="h-emg-stat-icon" style={{ color: '#2d6a4f' }}>🚨</div>
                    <div>
                        <div className="h-emg-stat-value">{stats.total}</div>
                        <div className="h-emg-stat-label">Total Cases</div>
                    </div>
                </div>

                <div className="h-emg-stat-card">
                    <div className="h-emg-stat-icon" style={{ color: '#c0392b' }}>⚠️</div>
                    <div>
                        <div className="h-emg-stat-value">{stats.critical}</div>
                        <div className="h-emg-stat-label">Critical</div>
                    </div>
                </div>

                <div className="h-emg-stat-card">
                    <div className="h-emg-stat-icon" style={{ color: '#d35400' }}>⚡</div>
                    <div>
                        <div className="h-emg-stat-value">{stats.urgent}</div>
                        <div className="h-emg-stat-label">Urgent</div>
                    </div>
                </div>

                <div className="h-emg-stat-card">
                    <div className="h-emg-stat-icon" style={{ color: '#f1c40f' }}>⏳</div>
                    <div>
                        <div className="h-emg-stat-value">{stats.pending}</div>
                        <div className="h-emg-stat-label">Pending Assignment</div>
                    </div>
                </div>

                <div className="h-emg-stat-card">
                    <div className="h-emg-stat-icon" style={{ color: '#3498db' }}>👨‍⚕️</div>
                    <div>
                        <div className="h-emg-stat-value">{stats.claimed}</div>
                        <div className="h-emg-stat-label">Under Care</div>
                    </div>
                </div>

                <div className="h-emg-stat-card">
                    <div className="h-emg-stat-icon" style={{ color: '#27ae60' }}>✅</div>
                    <div>
                        <div className="h-emg-stat-value">{stats.resolved}</div>
                        <div className="h-emg-stat-label">Resolved</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="h-emg-filters">
                <button
                    className={`h-emg-filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    All Cases
                </button>
                <button
                    className={`h-emg-filter-btn ${filter === 'pending' ? 'active' : ''}`}
                    onClick={() => setFilter('pending')}
                >
                    Pending
                </button>
                <button
                    className={`h-emg-filter-btn ${filter === 'claimed' ? 'active' : ''}`}
                    onClick={() => setFilter('claimed')}
                >
                    Under Care
                </button>
                <button
                    className={`h-emg-filter-btn ${filter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setFilter('resolved')}
                >
                    Resolved
                </button>
            </div>

            {/* Cases List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                    <p style={{ color: '#64748b' }}>Loading emergency cases...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="h-emg-empty-state">
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
                    <h3>No {filter !== 'all' ? filter : ''} Cases</h3>
                    <p style={{ color: '#64748b' }}>Your facility is running smoothly with no active emergencies.</p>
                </div>
            ) : (
                <div className="h-emg-cases-container">
                    {filtered.map(emergency => (
                        <div
                            key={emergency.id}
                            className="h-emg-case-card"
                            style={{
                                borderLeftColor: getTypeColor(emergency.caseType)
                            }}
                        >
                            <div className="h-emg-case-header">
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <span
                                            className="h-emg-type-badge"
                                            style={{ backgroundColor: getTypeColor(emergency.caseType) }}
                                        >
                                            {emergency.caseType?.toUpperCase() || 'URGENT'}
                                        </span>
                                        <span
                                            className="h-emg-status-badge"
                                            style={{ backgroundColor: getStatusColor(emergency.status) }}
                                        >
                                            {emergency.status?.charAt(0).toUpperCase() + emergency.status?.slice(1) || 'PENDING'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            ID: {emergency.id}
                                        </span>
                                    </div>
                                    <h3 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>
                                        {emergency.patientName || 'Unknown Patient'}
                                    </h3>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#475569' }}>
                                        📞 Contact: <strong>{emergency.contact}</strong>
                                    </p>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#64748b' }}>
                                        Contact Person: <strong>{emergency.contactName || 'Not shared'}</strong>
                                    </p>
                                    <p style={{ margin: '0', fontSize: '0.85rem', color: '#64748b' }}>
                                        📍 Location: <strong>{emergency.location || 'Not shared'}</strong>
                                    </p>
                                    <p style={{ margin: '0', fontSize: '0.85rem', color: '#64748b' }}>
                                        📅 Reported: <strong>{formatTime(emergency.createdAt)}</strong>

                                    </p>
                                </div>

                                {emergency.status === 'pending' && (
                                    <button
                                        className="h-emg-assign-btn"
                                        onClick={() => {
                                            setSelectedEmergency(emergency);
                                            setActiveModal('assign');
                                        }}
                                    >
                                        Assign Doctor →
                                    </button>
                                )}
                            </div>

                            <div className="h-emg-case-description">
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1d4ed8', padding: '4px 8px', borderRadius: 999 }}>
                                        {emergency.providerType === 'doctor' ? 'Direct Doctor Booking' : 'Hospital Booking'}
                                    </span>
                                    {emergency.providerName && (
                                        <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: 999 }}>
                                            {emergency.providerName}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    Case Description
                                </div>
                                <p style={{ margin: '0', fontSize: '0.95rem', lineHeight: '1.5', color: '#1e293b' }}>
                                    {emergency.explanation || 'No description provided'}
                                </p>
                            </div>

                            {emergency.doctorId && (
                                <div className="h-emg-case-doctor">
                                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#475569', marginBottom: '6px' }}>
                                        Assigned Doctor
                                    </div>
                                    <p style={{ margin: '0', fontSize: '0.9rem', color: '#2d6a4f' }}>
                                        👨‍⚕️ {emergency.assignedDoctorName || 'Dr. On Duty'}
                                    </p>
                                </div>
                            )}

                            <div className="h-emg-case-actions">
                                {emergency.status === 'pending' && (
                                    <button
                                        className="h-emg-action-btn h-emg-action-view"
                                        onClick={() => {
                                            setSelectedEmergency(emergency);
                                            setActiveModal('details');
                                        }}
                                    >
                                        📋 View Details
                                    </button>
                                )}
                                {emergency.status === 'claimed' && (
                                    <>
                                        <button
                                            className="h-emg-action-btn h-emg-action-view"
                                            onClick={() => {
                                                setSelectedEmergency(emergency);
                                                setActiveModal('details');
                                            }}
                                        >
                                            📋 View Details
                                        </button>
                                        <button
                                            className="h-emg-action-btn h-emg-action-resolve"
                                            onClick={() => handleResolveEmergency(emergency.id)}
                                        >
                                            ✅ Mark Resolved
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Assign Doctor Modal */}
            {activeModal === 'assign' && selectedEmergency && (
                <div className="h-emg-modal-overlay" onClick={() => setActiveModal(null)}>
                    <div className="h-emg-modal" onClick={e => e.stopPropagation()}>
                        <div className="h-emg-modal-header">
                            <h2>Assign Doctor to Emergency</h2>
                            <button
                                className="h-emg-modal-close"
                                onClick={() => setActiveModal(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="h-emg-modal-body">
                            <div className="h-emg-modal-section">
                                <label style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                    Emergency Case
                                </label>
                                <div style={{
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    borderRadius: '8px',
                                    color: '#1e293b'
                                }}>
                                    <strong>{selectedEmergency.patientName}</strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#475569' }}>
                                        {selectedEmergency.explanation?.substring(0, 100)}...
                                    </p>
                                </div>
                            </div>

                            <div className="h-emg-modal-section">
                                <label style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                    Select a Doctor
                                </label>
                                <select
                                    className="h-emg-select"
                                    value={selectedDoctor || ''}
                                    onChange={(e) => setSelectedDoctor(e.target.value || null)}
                                >
                                    <option value="">Choose a doctor...</option>
                                    {doctors.map(doc => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name} • {doc.specialization}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="h-emg-modal-footer">
                            <button
                                className="h-emg-btn-secondary"
                                onClick={() => setActiveModal(null)}
                                disabled={assignmentLoading}
                            >
                                Cancel
                            </button>
                            <button
                                className="h-emg-btn-primary"
                                onClick={handleAssignDoctor}
                                disabled={!selectedDoctor || assignmentLoading}
                            >
                                {assignmentLoading ? 'Assigning...' : 'Assign Doctor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {activeModal === 'details' && selectedEmergency && (
                <div className="h-emg-modal-overlay" onClick={() => setActiveModal(null)}>
                    <div className="h-emg-modal h-emg-modal-large" onClick={e => e.stopPropagation()}>
                        <div className="h-emg-modal-header">
                            <h2>Emergency Case Details</h2>
                            <button
                                className="h-emg-modal-close"
                                onClick={() => setActiveModal(null)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="h-emg-modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Patient Information
                                    </h4>
                                    <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '16px' }}>
                                        <strong>{selectedEmergency.patientName}</strong>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Contact Person
                                    </h4>
                                    <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '16px' }}>
                                        <strong>{selectedEmergency.contactName || 'Not shared'}</strong>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Contact Number
                                    </h4>
                                    <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '16px' }}>
                                        <strong>{selectedEmergency.contact}</strong>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Location
                                    </h4>
                                    <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '16px' }}>
                                        <strong>{selectedEmergency.location || 'Not shared'}</strong>
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Case Type
                                    </h4>
                                    <span
                                        className="h-emg-type-badge"
                                        style={{ backgroundColor: getTypeColor(selectedEmergency.caseType) }}
                                    >
                                        {selectedEmergency.caseType?.toUpperCase()}
                                    </span>
                                </div>

                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Booking Route
                                    </h4>
                                    <div style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '16px' }}>
                                        <strong>
                                            {selectedEmergency.providerType === 'doctor' ? 'Direct Doctor / Clinic' : 'Hospital Emergency Desk'}
                                        </strong>
                                        {selectedEmergency.providerName && (
                                            <div style={{ marginTop: 6, color: '#64748b', fontSize: '0.9rem' }}>
                                                {selectedEmergency.providerName}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Status
                                    </h4>
                                    <span
                                        className="h-emg-status-badge"
                                        style={{ backgroundColor: getStatusColor(selectedEmergency.status) }}
                                    >
                                        {selectedEmergency.status?.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Case Description
                                </h4>
                                <p style={{
                                    padding: '16px',
                                    background: '#f1f5f9',
                                    borderRadius: '8px',
                                    color: '#1e293b',
                                    lineHeight: '1.6',
                                    margin: '0'
                                }}>
                                    {selectedEmergency.explanation}
                                </p>
                            </div>

                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Reported At
                                </h4>
                                <p style={{ margin: '0', color: '#1e293b' }}>
                                    {formatTime(selectedEmergency.createdAt)}
                                </p>
                            </div>
                        </div>

                        <div className="h-emg-modal-footer">
                            <button
                                className="h-emg-btn-secondary"
                                onClick={() => setActiveModal(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
