import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

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
    
    // We maintain a copy of the original profile to revert changes on "Cancel"
    const [originalProfile, setOriginalProfile] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }
                
                // Fetch user data automatically
                const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const json = await res.json();
                    if (json.data) {
                        const data = {
                            ...json.data,
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
        fetchProfile();
    }, [navigate]);

    const handleChange = (k, v) => setProfile(prev => ({ ...prev, [k]: v }));

    const handleCancel = () => {
        // Revert any unsaved changes
        setProfile(prev => ({ ...prev, ...originalProfile }));
        setIsEditing(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profile),
            });
            if (res.ok) {
                const json = await res.json();
                localStorage.setItem('user', JSON.stringify(json.data || {}));
                
                // Update original profile & return to view mode
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
                        <button className="pd-btn pd-btn-outline" onClick={() => setIsEditing(true)}>
                            ✏️ Edit Profile
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="pd-btn pd-btn-outline" onClick={handleCancel}>
                                ✖ Cancel
                            </button>
                            <button className="pd-btn pd-btn-primary" onClick={handleSubmit} disabled={loading}>
                                {loading ? '⏳ Saving…' : '💾 Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Banner */}
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

            {/* Form sections */}
            {FIELD_GROUPS.map(group => (
                <div key={group.title} className="pd-card" style={{ marginBottom: 18 }}>
                    <h3 className="pd-section-title">{group.title}</h3>
                    <div className="pd-grid-2">
                        {group.fields.map(f => {
                            const val = profile[f.key];
                            const displayVal = val ? val : 'Not Added Yet';
                            return (
                                <div className="pd-form-group" key={f.key}>
                                    <label>{f.label}</label>
                                    
                                    {/* Default Mode (View Mode) -> render as static text block */}
                                    {!isEditing ? (
                                        <div style={{
                                            padding: '10px 15px', 
                                            background: '#f9f9f9', 
                                            borderRadius: '8px', 
                                            color: val ? '#333' : '#aaa',
                                            minHeight: '42px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            fontSize: '0.95rem'
                                        }}>
                                            {displayVal}
                                        </div>
                                    ) : (
                                        /* Edit Mode -> render as input fields */
                                        f.type === 'select' ? (
                                            <select 
                                                className="pd-select" 
                                                value={val || ''} 
                                                onChange={e => handleChange(f.key, e.target.value)}
                                                disabled={f.readOnly}
                                            >
                                                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input
                                                type={f.type}
                                                className="pd-input"
                                                value={val || ''}
                                                onChange={e => handleChange(f.key, e.target.value)}
                                                placeholder={f.placeholder}
                                                readOnly={f.readOnly}
                                                disabled={f.readOnly}
                                                style={f.readOnly ? { opacity: 0.65, cursor: 'not-allowed', background: '#f0f0f0' } : {}}
                                            />
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Security card */}
            <div className="pd-card" style={{ marginBottom: 18 }}>
                <h3 className="pd-section-title">🔒 Account Security</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="pd-btn pd-btn-outline" onClick={() => navigate('/patient/settings/password')}>🔑 Change Password</button>
                    <button className="pd-btn pd-btn-outline" onClick={() => navigate('/patient/settings/mobile')}>📱 Update Mobile OTP</button>
                    <button className="pd-btn pd-btn-outline" onClick={() => navigate('/patient/settings/2fa')}>🔓 2-Factor Authentication</button>
                </div>
            </div>

            {/* Bottom action row when editing */}
            {isEditing && (
                <div style={{ textAlign: 'right' }}>
                    <button className="pd-btn pd-btn-primary" onClick={handleSubmit} disabled={loading} style={{ minWidth: 180, justifyContent: 'center' }}>
                        {loading ? '⏳ Saving…' : '💾 Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
}
