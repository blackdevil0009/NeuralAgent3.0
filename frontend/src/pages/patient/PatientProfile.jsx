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
    const [form, setForm] = useState({
        name: '', email: '', mobile: '', dob: '', gender: 'Prefer not to say',
        bloodGroup: 'Unknown', address: '', city: '', state: '', pin: '',
        dosha: 'Not assessed', allergies: '', conditions: '', medications: '',
    });
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${API_BASE_URL}/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.data) {
                        setForm(prev => ({
                            ...prev,
                            ...json.data,
                            dosha: json.data.dosha || 'Not assessed',
                            gender: json.data.gender || 'Prefer not to say',
                            bloodGroup: json.data.bloodGroup || 'Unknown'
                        }));
                    }
                }
            } catch (err) {}
        };
        fetchProfile();
    }, []);

    const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const json = await res.json();
                localStorage.setItem('user', JSON.stringify(json.data || {}));
                handleSuccess('Profile updated successfully!');
                setIsEditMode(false);
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

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>👤 My Profile</h1>
                    <p>Manage your personal and health information</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {!isEditMode ? (
                        <button className="pd-btn pd-btn-outline" onClick={() => setIsEditMode(true)}>
                            ✏️ Edit Profile
                        </button>
                    ) : (
                        <button className="pd-btn pd-btn-primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? '⏳ Saving…' : '💾 Save Changes'}
                        </button>
                    )}
                </div>
            </div>


            {/* Banner */}
            <div className="pd-profile-banner" style={{ marginBottom: 24 }}>
                <div className="pd-profile-pic">🧘</div>
                <div>
                    <div className="pd-profile-name">{form.name || 'Your Name'}</div>
                    <div className="pd-profile-sub">{form.email || 'your@email.com'}</div>
                    <div className="pd-profile-pills">
                        <span className="pd-profile-pill">{form.dosha}</span>
                        <span className="pd-profile-pill">Blood: {form.bloodGroup}</span>
                        {form.city && <span className="pd-profile-pill">📍 {form.city}</span>}
                    </div>
                </div>
            </div>

            {/* Form sections */}
            {FIELD_GROUPS.map(group => (
                <div key={group.title} className="pd-card" style={{ marginBottom: 18 }}>
                    <h3 className="pd-section-title">{group.title}</h3>
                    <div className="pd-grid-2">
                        {group.fields.map(f => (
                            <div className="pd-form-group" key={f.key}>
                                <label>{f.label}</label>
                                {f.type === 'select' ? (
                                    <select className="pd-select" value={form[f.key] || ''} onChange={e => handleChange(f.key, e.target.value)} disabled={!isEditMode}>
                                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type={f.type}
                                        className="pd-input"
                                        value={form[f.key] || ''}
                                        onChange={e => handleChange(f.key, e.target.value)}
                                        placeholder={f.placeholder}
                                        readOnly={f.readOnly || !isEditMode}
                                        style={(f.readOnly || !isEditMode) ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                                    />
                                )}
                            </div>
                        ))}
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
                    <button className="pd-btn pd-btn-outline" onClick={() => navigate('/patient/settings/notifications')}>🔔 Manage Notifications</button>
                </div>
            </div>

            {isEditMode && (
                <div style={{ textAlign: 'right' }}>
                    <button className="pd-btn pd-btn-primary" onClick={handleSubmit} disabled={loading} style={{ minWidth: 180, justifyContent: 'center' }}>
                        {loading ? '⏳ Saving…' : '💾 Save All Changes'}
                    </button>
                </div>
            )}
        </div>
    );
}
