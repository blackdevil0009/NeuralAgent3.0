import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

export default function HospitalDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [inviting, setInviting] = useState(false);

    const token = localStorage.getItem('token');

    const fetchDoctors = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v2/hospital/doctors`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Failed to fetch doctors.');
            setDoctors(json.data?.doctors || []);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredDoctors = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return doctors;
        return doctors.filter((d) =>
            (d.name || '').toLowerCase().includes(q) ||
            (d.specialization || d.spec || '').toLowerCase().includes(q) ||
            (d.email || '').toLowerCase().includes(q)
        );
    }, [doctors, searchTerm]);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) {
            handleError('Doctor email is required.');
            return;
        }

        setInviting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v2/hospital/doctor/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: inviteEmail.trim().toLowerCase(),
                    name: inviteName.trim(),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Failed to send invitation.');
            handleSuccess(json.data?.message || 'Doctor invitation sent.');
            setInviteEmail('');
            setInviteName('');
        } catch (err) {
            handleError(err);
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (email) => {
        if (!email) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v2/hospital/doctor/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ email }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Failed to remove doctor.');
            handleSuccess(json.data?.message || 'Doctor removed.');
            setDoctors((prev) => prev.filter((d) => d.email !== email));
        } catch (err) {
            handleError(err);
        }
    };

    return (
        <div className="h-doctors-page">
            <h1 style={{ marginBottom: '30px', fontWeight: 800 }}>Medical Staff Management</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
                <div className="h-card-base">
                    <div className="h-section-title">
                        <span>Affiliated Doctors</span>
                        <input
                            type="text"
                            placeholder="Search by name, specialty or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', width: '250px' }}
                        />
                    </div>

                    {loading ? (
                        <p style={{ color: '#64748b' }}>Loading doctors...</p>
                    ) : (
                        <table className="h-table">
                            <thead>
                                <tr>
                                    <th>Doctor</th>
                                    <th>Specialty</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDoctors.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>
                                            No doctors linked yet.
                                        </td>
                                    </tr>
                                ) : filteredDoctors.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{doc.name || 'Doctor'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{doc.email}</div>
                                        </td>
                                        <td>{doc.specialization || doc.spec || 'General'}</td>
                                        <td>
                                            <span className={`h-tag ${doc.is_email_verified ? 'h-tag-success' : 'h-tag-warning'}`}>
                                                {doc.is_email_verified ? 'Active' : 'Pending Verification'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                title="Remove Doctor"
                                                onClick={() => handleRemove(doc.email)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="h-card-base" style={{ height: 'fit-content' }}>
                    <div className="h-section-title">
                        <span>Invite Doctor</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                        Send an invitation link. Existing doctors can accept directly. New doctors can register and auto-link after verification.
                    </p>
                    <form onSubmit={handleInvite}>
                        <div className="form-group" style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Doctor Name (optional)</label>
                            <input
                                type="text"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                placeholder="Dr. Name"
                                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Doctor Email</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="doctor@example.com"
                                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                            />
                        </div>
                        <button
                            className="h-nav-item active"
                            style={{ width: '100%', border: 'none', padding: '12px', cursor: 'pointer', fontWeight: 600 }}
                            disabled={inviting}
                        >
                            {inviting ? 'Sending...' : 'Send Invitation Link'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
