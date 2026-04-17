import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

const URGENT_COLORS = { critical: '#c0392b', urgent: '#d35400', 'non-urgent': '#f1c40f' };

const FIELD_GROUPS = [
    {
        title: '👤 Personal Information',
        fields: [
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com', readOnly: true },
            { key: 'mobile', label: 'Mobile', type: 'tel', placeholder: '+91 XXXXX XXXXX' },
            { key: 'dob', label: 'Date of Birth', type: 'date', placeholder: '' },
            { key: 'gender', label: 'Gender', type: 'select', options: ['Prefer not to say', 'Male', 'Female', 'Other'] },
            { key: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['Unknown', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
        ]
    },
    {
        title: '🏠 Address',
        fields: [
            { key: 'address', label: 'Street Address', type: 'text', placeholder: 'Your address' },
            { key: 'city', label: 'City', type: 'text', placeholder: 'City' },
            { key: 'state', label: 'State', type: 'text', placeholder: 'State' },
            { key: 'pin', label: 'PIN Code', type: 'text', placeholder: '6-digit PIN' },
        ]
    },
    {
        title: '🌿 Ayurvedic Profile',
        fields: [
            { key: 'dosha', label: 'Predominant Dosha', type: 'select', options: ['Not assessed', 'Vata', 'Pitta', 'Kapha', 'Vata-Pitta', 'Pitta-Kapha', 'Vata-Kapha', 'Tridoshic'] },
            { key: 'allergies', label: 'Allergies', type: 'text', placeholder: 'e.g. Peanuts, Penicillin' },
            { key: 'conditions', label: 'Chronic Conditions', type: 'text', placeholder: 'e.g. Diabetes, Hypertension' },
            { key: 'medications', label: 'Current Medications', type: 'text', placeholder: 'e.g. Metformin 500mg daily' },
        ]
    },
];

export default function PatientProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({
        name: '', email: '', mobile: '', dob: '', gender: 'Prefer not to say',
        bloodGroup: 'Unknown', address: '', city: '', state: '', pin: '',
        dosha: 'Not assessed', allergies: '', conditions: '', medications: '',
    });
    const [originalProfile, setOriginalProfile] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);
    const [emergencyHistory, setEmergencyHistory] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token || token === 'undefined') { navigate('/login'); return; }

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.data) {
                        const data = {
                            ...json.data,
                            pin: json.data.pin || json.data.pincode || '',
                            dosha: json.data.dosha || 'Not assessed',
                            gender: json.data.gender || 'Prefer not to say',
                            bloodGroup: json.data.bloodGroup || 'Unknown',
                        };
                        setProfile(prev => ({ ...prev, ...data }));
                        setOriginalProfile(data);
                    }
                } else {
                    handleError('Failed to load profile data.');
                }
            } catch (err) {
                handleError(err, 'Failed to fetch profile.');
            } finally {
                setFetching(false);
            }
        };

        const fetchEmergencyHistory = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/emergencies/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    setEmergencyHistory(json.data?.emergencies || json.emergencies || []);
                }
            } catch (e) { /* silently ignore */ }
        };

        fetchProfile();
        fetchEmergencyHistory();
    }, [navigate]);

    const handleChange = (k, v) => setProfile(prev => ({ ...prev, [k]: v }));

    const handleCancel = () => {
        setProfile(prev => ({ ...prev, ...originalProfile }));
        setIsEditing(false);
    };

    const handleSubmit = async () => {
        // Age Validation (Min 1 year)
        if (profile.dob) {
            const birthDate = new Date(profile.dob);
            const today = new Date();
            const minAgeDate = new Date();
            minAgeDate.setFullYear(today.getFullYear() - 1);
            if (birthDate > minAgeDate) {
                handleError('Patient must be at least 1 year old.');
                return;
            }
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(profile),
            });
            if (res.ok) {
                const json = await res.json();
                localStorage.setItem('user', JSON.stringify(json.data || {}));
                setOriginalProfile(profile);
                setIsEditing(false);
                handleSuccess('Profile updated successfully!');
            } else {
                const json = await res.json();
                handleError(json.data?.error || 'Profile update failed.');
            }
        } catch (err) {
            handleError(err, 'Failed to save profile changes.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                <p>Loading your profile...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>👤 My Profile</h1>
                    <p>Manage your personal and health information</p>
                </div>
                <div>
                    {!isEditing ? (
                        <button className="pd-btn pd-btn-outline" onClick={() => setIsEditing(true)}>✏️ Edit Profile</button>
                    ) : (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="pd-btn pd-btn-outline" onClick={handleCancel}>✖ Cancel</button>
                            <button className="pd-btn pd-btn-primary" onClick={handleSubmit} disabled={loading}>
                                {loading ? '⏳ Saving…' : '💾 Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="pd-profile-banner" style={{ marginBottom: 24 }}>
                <div className="pd-profile-pic">🧘</div>
                <div>
                    <div className="pd-profile-name">{profile.name || 'Not Added Yet'}</div>
                    <div className="pd-profile-sub">{profile.email || 'Not Added Yet'}</div>
                    <div className="pd-profile-pills">
                        <span className="pd-profile-pill">{profile.dosha}</span>
                        <span className="pd-profile-pill">Blood: {profile.bloodGroup}</span>
                        {profile.city && <span className="pd-profile-pill">📍 {profile.city}</span>}

                    </div>
                </div>
            </div>

            {FIELD_GROUPS.map(group => (
                <div key={group.title} className="pd-card" style={{ marginBottom: 18 }}>
                    <h3 className="pd-section-title">{group.title}</h3>
                    <div className="pd-grid-2">
                        {group.fields.map(f => {
                            const val = profile[f.key];
                            return (
                                <div className="pd-form-group" key={f.key}>
                                    <label htmlFor={f.key}>{f.label}</label>
                                    {!isEditing ? (
                                        <div style={{ padding: '10px 15px', background: '#f9f9f9', borderRadius: '8px', color: val ? '#333' : '#aaa', minHeight: '42px', display: 'flex', alignItems: 'center', fontSize: '0.95rem' }}>
                                            {val || 'Not Added Yet'}
                                        </div>
                                    ) : (
                                        f.type === 'select' ? (
                                            <select id={f.key} name={f.key} className="pd-select" value={val || ''} onChange={e => handleChange(f.key, e.target.value)} disabled={f.readOnly}>
                                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input type={f.type} id={f.key} name={f.key} className="pd-input" value={val || ''} onChange={e => handleChange(f.key, e.target.value)} placeholder={f.placeholder} readOnly={f.readOnly} disabled={f.readOnly} style={f.readOnly ? { opacity: 0.65, cursor: 'not-allowed', background: '#f0f0f0' } : {}} />
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="pd-card" style={{ marginBottom: 18 }}>
                <h3 className="pd-section-title">🔒 Account Security</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="pd-btn pd-btn-outline" onClick={() => navigate('/patient/settings/security')}>🛡️ Security Settings</button>
                </div>
            </div>

            {/* Emergency History */}
            <div className="pd-card" style={{ marginBottom: 18, borderLeft: '4px solid #c0392b' }}>
                <h3 className="pd-section-title">🚨 Emergency Case History</h3>
                {emergencyHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 0', color: '#aaa' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>✅</div>
                        <p>No emergency cases reported yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {emergencyHistory.map((em, i) => {
                            const isResolved = em.status === 'resolved' || em.status === 'Handled';
                            return (
                            <div key={em.id || i} style={{
                                padding: '15px 20px', borderRadius: 12,
                                background: isResolved ? '#f0fff4' : '#fff5f5',
                                border: `1px solid ${isResolved ? '#b2f5ea' : '#feb2b2'}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 20, background: URGENT_COLORS[em.type] || '#888', color: '#fff', textTransform: 'uppercase' }}>{em.type}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#666' }}>ID: {em.id}</span>
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#333', maxWidth: 480 }}>{em.desc}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 6 }}>
                                        Destination: {em.providerType === 'doctor' ? 'Direct Doctor / Clinic' : 'Hospital Desk'}
                                        {em.providerName ? ` • ${em.providerName}` : ''}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
                                        Contact: {em.contactName || 'Not shared'} • Location: {em.location || 'Not shared'}
                                    </div>
                                    {em.hospitalName || em.assignedDoctorName ? (
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>
                                            {em.hospitalName ? `Hospital: ${em.hospitalName}` : 'Hospital: Not applicable'}
                                            {em.assignedDoctorName ? ` • Assigned Doctor: Dr. ${em.assignedDoctorName}` : ''}
                                        </div>
                                    ) : null}
                                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>Reported: {em.time}</div>
                                    {em.assignedAt ? (
                                        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>Assigned: {em.assignedAt}</div>
                                    ) : null}
                                    {em.resolvedAt ? (
                                        <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>Resolved: {em.resolvedAt}</div>
                                    ) : null}
                                </div>
                                <span style={{ padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem', background: isResolved ? '#c6f6d5' : '#fed7d7', color: isResolved ? '#22543d' : '#742a2a' }}>
                                    {isResolved ? '✅ Resolved' : '🔴 Active'}
                                </span>
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {isEditing && (
                <div style={{ textAlign: 'right' }}>
                    <button className="pd-btn pd-btn-primary" onClick={handleSubmit} disabled={loading} style={{ minWidth: 180, justifyContent: 'center' }}>
                        {loading ? '⏳ Saving…' : '💾 Save Changes'}
                    </button>
                </div>
            )}

            {/* 👨‍⚕️ Registered Doctors Section */}
            {!isEditing && (
                <DoctorListSection navigate={navigate} />
            )}
        </div>
    );
}

/**
 * Component to show all registered doctors on the profile page
 */
function DoctorListSection({ navigate }) {
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const fetchDoctors = fetch(`${API_BASE_URL}/api/doctors`, { headers })
            .then(res => res.json()).then(res => res.data?.doctors || []).catch(() => []);

        const fetchAppointments = fetch(`${API_BASE_URL}/api/appointments`, { headers })
            .then(res => res.json()).then(res => res.data?.appointments || []).catch(() => []);

        Promise.all([fetchDoctors, fetchAppointments]).then(([docs, appts]) => {
            setDoctors(docs);
            setAppointments(appts);
            setLoading(false);
        });
    }, []);

    if (loading) return null;

    // Map doctorId -> has appointment
    const apptDocIds = new Set(appointments.map(a => String(a.doctorId)));

    return (
        <div className="pd-card" style={{ marginTop: 24, background: 'linear-gradient(to bottom, #ffffff, #f8fbf9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="pd-section-title" style={{ margin: 0 }}>👨‍⚕️ Our Medical Experts</h3>
                <button className="pd-btn pd-btn-outline pd-btn-sm" onClick={() => navigate('/patient/doctors')}>View All</button>
            </div>
            
            <div className="pd-grid-2" style={{ gap: 16 }}>
                {doctors.slice(0, 4).map(doc => {
                    const hasAppt = apptDocIds.has(String(doc.id));
                    return (
                        <div key={doc.id} style={{ 
                            padding: 16, borderRadius: 12, border: '1px solid #e8f4ec', 
                            background: '#fff', display: 'flex', gap: 14, alignItems: 'center',
                            transition: 'transform 0.2s', cursor: 'pointer'
                        }} onClick={() => navigate(hasAppt ? `/patient/inbox?doctor=${doc.id}` : `/patient/doctors?q=${doc.name}`)}>
                            <div style={{ 
                                width: 50, height: 50, borderRadius: '50%', 
                                background: 'linear-gradient(135deg, #2d6a4f, #1b4332)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem'
                            }}>🩺</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2d6a4f' }}>Dr. {doc.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#6b8f71' }}>{doc.spec}</div>
                                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
                                    ⭐ {doc.rating || '4.9'} · {hasAppt ? '✅ Booked' : 'Not Booked'}
                                </div>
                            </div>
                            <button className={`pd-btn pd-btn-sm ${hasAppt ? 'pd-btn-primary' : 'pd-btn-outline'}`} 
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', opacity: hasAppt ? 1 : 0.6 }}>
                                {hasAppt ? 'Message' : 'Message 🔒'}
                            </button>
                        </div>
                    );
                })}
            </div>
            {doctors.length === 0 && <p style={{ textAlign: 'center', color: '#888', padding: 20 }}>No doctors found.</p>}
        </div>
    );
}
