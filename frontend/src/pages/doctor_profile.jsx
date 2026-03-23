import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/config';
import { handleSuccess, handleError } from '../utils/error_handlers';

export default function DoctorProfile() {
    const [profile, setProfile] = useState(null);
    const [form, setForm] = useState({ consultantFee: '', workingHours: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => {
                const p = data.data || data;
                setProfile(p);
                setForm({
                    consultantFee: p.consultantFee ?? 500,
                    workingHours: p.workingHours ?? 'Mon-Fri, 10AM-6PM',
                });
            })
            .catch(err => handleError(err))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profile.name,
                    mobile: profile.mobile,
                    dob: profile.dob,
                    gender: profile.gender,
                    address: profile.address,
                    city: profile.city,
                    state: profile.state,
                    pin: profile.pin,
                    consultantFee: Number(form.consultantFee),
                    workingHours: form.workingHours,
                }),
            });
            if (!res.ok) throw new Error('Save failed');
            handleSuccess('Professional profile updated successfully!');
        } catch (err) {
            handleError(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--doc-text-mute)' }}>⏳ Loading profile…</div>;
    }

    if (!profile) {
        return <div style={{ textAlign: 'center', padding: '60px', color: '#e74c3c' }}>❌ Failed to load profile.</div>;
    }

    const InfoRow = ({ label, value, muted }) => (
        <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--doc-text-mute)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '0.95rem', color: muted ? 'var(--doc-text-mute)' : 'var(--doc-text)', fontWeight: 500 }}>{value || <span style={{ color: '#aaa', fontStyle: 'italic' }}>Not set</span>}</div>
        </div>
    );

    const statusColor = { pending: '#e67e22', verified: '#27ae60', rejected: '#e74c3c' };
    const statusIcon = { pending: '⏳', verified: '✅', rejected: '❌' };
    const vs = profile.verificationStatus || 'pending';

    return (
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
            {/* Header */}
            <div className="dd-header" style={{ marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0 }}>🩺 Professional Profile</h1>
                    <p style={{ color: 'var(--doc-text-mute)', margin: '4px 0 0' }}>
                        Your credentials and public-facing information
                    </p>
                </div>
                <button className="dd-btn dd-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 140 }}>
                    {saving ? '⏳ Saving…' : '💾 Save Profile'}
                </button>
            </div>

            {/* Verification Status Banner */}
            <div style={{
                background: statusColor[vs] + '18',
                border: `1px solid ${statusColor[vs]}`,
                borderRadius: 10, padding: '12px 20px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 12
            }}>
                <span style={{ fontSize: '1.4rem' }}>{statusIcon[vs]}</span>
                <div>
                    <strong style={{ color: statusColor[vs] }}>Credential Status: {vs.toUpperCase()}</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--doc-text-mute)', marginTop: 2 }}>
                        {vs === 'pending' && 'Your credentials are under review. You will be notified once verified.'}
                        {vs === 'verified' && 'Your credentials are verified. Your profile is visible to patients.'}
                        {vs === 'rejected' && 'Your credentials were rejected. Please contact support to re-submit valid documents.'}
                    </div>
                </div>
            </div>

            <div className="dd-grid">
                {/* Left Column: Personal & Professional info (read-only) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="dd-card">
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>👤 Personal Information</h3>
                        <InfoRow label="Full Name" value={profile.name ? `Dr. ${profile.name}` : null} />
                        <InfoRow label="Email" value={profile.email} />
                        <InfoRow label="Mobile" value={profile.mobile} />
                        <InfoRow label="Address" value={[profile.address, profile.city, profile.state, profile.pin].filter(Boolean).join(', ')} />
                    </div>

                    <div className="dd-card">
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>🎓 Credentials</h3>
                        <InfoRow label="Degree" value={profile.degree} />
                        <InfoRow label="Position" value={profile.position} />
                        <InfoRow label="Specialization" value={profile.specialization} />
                        <InfoRow label="Experience" value={profile.experience ? `${profile.experience} years` : null} />
                        <InfoRow label="Medical Reg. Number" value={profile.regNumber} />
                    </div>

                    <div className="dd-card">
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>🏥 Practice Location</h3>
                        <InfoRow label="Hospital / Clinic" value={profile.hospital} />
                        <InfoRow label="Clinic Location" value={profile.clinicLocation} />
                    </div>
                </div>

                {/* Right Column: Editable fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="dd-card">
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>💰 Availability & Fees</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--doc-text-mute)' }}>
                                    Consultation Fee (₹)
                                </label>
                                <input
                                    type="number" min="0" step="50"
                                    value={form.consultantFee}
                                    onChange={e => setForm(prev => ({ ...prev, consultantFee: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--doc-border)', fontSize: '1rem', fontWeight: 600, background: 'var(--doc-surface)' }}
                                    placeholder="e.g. 500"
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>
                                    This fee will be shown to patients when booking appointments.
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--doc-text-mute)' }}>
                                    Working Hours
                                </label>
                                <input
                                    type="text"
                                    value={form.workingHours}
                                    onChange={e => setForm(prev => ({ ...prev, workingHours: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--doc-border)', fontSize: '0.95rem', background: 'var(--doc-surface)' }}
                                    placeholder="e.g. Mon-Fri, 10AM-6PM"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appointment types supported */}
                    <div className="dd-card">
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>📅 Consultation Types</h3>
                        {[
                            { icon: '💬', label: 'Chat Consultation', desc: 'Real-time secure messaging with patients' },
                            { icon: '🎥', label: 'Video Call', desc: 'Live video consultation via VaidyaMed-X' },
                            { icon: '🏥', label: 'Offline / In-Clinic', desc: 'In-person consultation at your clinic' },
                        ].map(({ icon, label, desc }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--doc-border)' }}>
                                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{label}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--doc-text-mute)' }}>{desc}</div>
                                </div>
                                <div style={{ marginLeft: 'auto', background: '#e8f8ee', color: '#27ae60', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Active</div>
                            </div>
                        ))}
                    </div>

                    <div className="dd-card" style={{ background: 'var(--doc-green-deep)', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.8rem' }}>⭐</span>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Credentials Under Review</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Verification makes your profile visible to patients</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.82rem', opacity: 0.8, lineHeight: 1.6, margin: 0 }}>
                            Once verified, patients can search for you by specialization and see your consultation fee and working hours before booking.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
