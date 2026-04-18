import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';
import { getStoredAuthSession, persistAuthSession } from '../../utils/authStorage';

/* ─── Styles ─────────────────────────────────────────────────────── */
const cardStyle = {
    background: '#fff',
    borderRadius: '18px',
    border: '1px solid #e7edf4',
    padding: '28px',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.04)',
};

const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    border: '1.5px solid #d1d9e6',
    borderRadius: '10px',
    fontSize: '0.93rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
};

const viewValueStyle = {
    padding: '11px 14px',
    background: '#f8fafc',
    borderRadius: '10px',
    color: '#0f172a',
    fontSize: '0.93rem',
    minHeight: '42px',
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid transparent',
};

/* ─── Field definitions ───────────────────────────────────────────── */
const FIELD_GROUPS = [
    {
        title: '🏥 Facility Information',
        fields: [
            { key: 'hospitalName', label: 'Hospital Name',       type: 'text'   },
            { key: 'adminName',    label: 'Admin Name',          type: 'text'   },
            { key: 'regNumber',    label: 'Registration Number', type: 'text',  readOnly: true },
            {
                key: 'hospitalType', label: 'Facility Type', type: 'select',
                options: ['private', 'govt', 'clinic', 'ayurvedic'],
                labels:  ['Private', 'Government', 'Clinic', 'Ayurvedic'],
            },
        ],
    },
    {
        title: '📞 Contact Details',
        fields: [
            { key: 'email',  label: 'Official Email', type: 'email', readOnly: true },
            { key: 'mobile', label: 'Mobile Number',  type: 'tel'  },
        ],
    },
    {
        title: '📍 Address',
        fields: [
            { key: 'address', label: 'Street Address', type: 'text' },
            { key: 'city',    label: 'City',           type: 'text' },
            { key: 'state',   label: 'State',          type: 'text' },
            { key: 'pincode', label: 'PIN Code',       type: 'text' },
        ],
    },
];

const EMPTY_FORM = {
    hospitalName: '', adminName: '', email: '', mobile: '',
    address: '', city: '', state: '', pincode: '',
    regNumber: '', hospitalType: 'private',
};

/* ─── Helpers ─────────────────────────────────────────────────────── */
function Field({ label, children }) {
    return (
        <div>
            <label style={{ display: 'block', marginBottom: '7px', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div style={{ background: `${color}12`, border: `1px solid ${color}22`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color }}>{value}</div>
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────────────── */
export default function HospitalProfile() {
    const [form, setForm]               = useState(EMPTY_FORM);
    const [original, setOriginal]       = useState(EMPTY_FORM);
    const [isEditing, setIsEditing]     = useState(false);
    const [summary, setSummary]         = useState({});
    const [recentCases, setRecentCases] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [saving, setSaving]           = useState(false);

    // 2FA
    const [twoFaEnabled,    setTwoFaEnabled]    = useState(false);
    const [showTwoFaModal,  setShowTwoFaModal]  = useState(false);
    const [twoFaPassword,   setTwoFaPassword]   = useState('');
    const [twoFaSaving,     setTwoFaSaving]     = useState(false);
    const [twoFaErr,        setTwoFaErr]        = useState('');

    /* ── Fetch ──────────────────────────────────────────────────── */
    useEffect(() => {
        const { token, userData } = getStoredAuthSession();
        if (!token) return;

        if (userData?.two_fa_enabled !== undefined) {
            setTwoFaEnabled(Boolean(userData.two_fa_enabled));
        }

        (async () => {
            try {
                const res  = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.data?.message || 'Failed to load profile.');

                const d = json?.data || {};
                const mapped = {
                    hospitalName: d.hospitalName || d.name    || '',
                    adminName:    d.adminName                 || '',
                    email:        d.email                     || '',
                    mobile:       d.mobile                    || '',
                    address:      d.address                   || '',
                    city:         d.city                      || '',
                    state:        d.state                     || '',
                    pincode:      d.pincode || d.pin          || '',
                    regNumber:    d.regNumber                 || '',
                    hospitalType: d.hospitalType              || 'private',
                };
                setForm(mapped);
                setOriginal(mapped);
                setSummary(d.emergencySummary          || {});
                setRecentCases(d.recentEmergencyCases  || []);
                setTwoFaEnabled(Boolean(d.two_fa_enabled));
            } catch (err) {
                handleError(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /* ── Cancel ─────────────────────────────────────────────────── */
    const handleCancel = () => {
        setForm({ ...original });
        setIsEditing(false);
    };

    /* ── Save ────────────────────────────────────────────────────── */
    const handleSave = async (e) => {
        e.preventDefault();
        const { token } = getStoredAuthSession();
        setSaving(true);
        try {
            const res  = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.data?.message || 'Failed to save.');

            const d = json?.data || {};
            const mapped = {
                hospitalName: d.hospitalName || d.name || form.hospitalName,
                adminName:    d.adminName    || form.adminName,
                email:        d.email        || form.email,
                mobile:       d.mobile       || form.mobile,
                address:      d.address      || form.address,
                city:         d.city         || form.city,
                state:        d.state        || form.state,
                pincode:      d.pincode || d.pin || form.pincode,
                regNumber:    d.regNumber    || form.regNumber,
                hospitalType: d.hospitalType || form.hospitalType,
            };
            setForm(mapped);
            setOriginal(mapped);
            localStorage.setItem('user', JSON.stringify(d));
            setIsEditing(false);
            handleSuccess('Facility profile updated successfully.');
        } catch (err) {
            handleError(err);
        } finally {
            setSaving(false);
        }
    };

    /* ── 2FA Toggle ──────────────────────────────────────────────── */
    const handleToggle2FA = async (e) => {
        e.preventDefault();
        if (!twoFaPassword.trim()) { setTwoFaErr('Please enter your current password.'); return; }
        const { token, storage, userData } = getStoredAuthSession();
        setTwoFaSaving(true);
        setTwoFaErr('');
        try {
            const res  = await fetch(`${API_BASE_URL}/api/auth/2fa/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ password: twoFaPassword }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.data?.message || json?.error || 'Failed to toggle 2FA.');

            const newState = json?.data?.two_fa_enabled;
            setTwoFaEnabled(Boolean(newState));
            if (userData && storage) {
                persistAuthSession({
                    storage, token,
                    role: storage.getItem('role'),
                    user: { ...userData, two_fa_enabled: newState },
                });
            }
            handleSuccess(`Two-Factor Authentication ${newState ? 'enabled' : 'disabled'} successfully.`);
            setShowTwoFaModal(false);
            setTwoFaPassword('');
        } catch (err) {
            handleError(err);
            setTwoFaErr(err.message);
        } finally {
            setTwoFaSaving(false);
        }
    };

    /* ── Render ──────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                Loading facility profile...
            </div>
        );
    }

    return (
        <div className="h-profile-page">
            <div style={{ display: 'grid', gap: '24px' }}>

                {/* ── Banner card ─────────────────────────────────── */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '18px',
                                background: 'linear-gradient(135deg, #1b4332, #2d6a4f)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2rem', flexShrink: 0,
                            }}>🏥</div>
                            <div>
                                <h1 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#0f172a' }}>
                                    {form.hospitalName || 'Hospital Name'}
                                </h1>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    {form.email} {form.city ? `· ${form.city}` : ''}
                                </p>
                            </div>
                        </div>

                        {/* Edit / Save / Cancel buttons */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    style={{
                                        padding: '10px 24px', borderRadius: '10px',
                                        border: '1.5px solid #1b4332', background: '#fff',
                                        color: '#1b4332', fontWeight: 700, cursor: 'pointer',
                                        fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px',
                                    }}
                                >
                                    ✏️ Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleCancel}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px',
                                            border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                            color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                        }}
                                    >
                                        ✖ Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        style={{
                                            padding: '10px 24px', borderRadius: '10px',
                                            border: 'none', background: '#1b4332',
                                            color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                                        }}
                                    >
                                        {saving ? '⏳ Saving...' : '💾 Save Changes'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Summary stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '24px' }}>
                        <SummaryCard label="Total Cases"      value={summary.totalCases        || 0} color="#1d4ed8" />
                        <SummaryCard label="Pending"          value={summary.pendingCases      || 0} color="#d97706" />
                        <SummaryCard label="Registered Doctors" value={summary.registeredDoctors || 0} color="#15803d" />
                    </div>
                </div>

                {/* ── Field groups ─────────────────────────────────── */}
                {FIELD_GROUPS.map(group => (
                    <div key={group.title} style={cardStyle}>
                        <div className="h-section-title" style={{ marginBottom: '20px' }}>
                            <span>{group.title}</span>
                            {isEditing && (
                                <span style={{ fontSize: '0.78rem', color: '#2d6a4f', fontWeight: 600, background: '#ecfdf5', padding: '3px 10px', borderRadius: '20px' }}>
                                    Editing
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                            {group.fields.map(f => {
                                const val = form[f.key] || '';
                                const displayVal = f.type === 'select'
                                    ? (f.labels?.[f.options?.indexOf(val)] || val || '—')
                                    : (val || '—');

                                return (
                                    <Field key={f.key} label={f.label}>
                                        {!isEditing ? (
                                            <div style={{ ...viewValueStyle, color: val ? '#0f172a' : '#94a3b8' }}>
                                                {displayVal}
                                            </div>
                                        ) : f.type === 'select' ? (
                                            <select
                                                value={val}
                                                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                disabled={f.readOnly}
                                                style={{ ...inputStyle, background: f.readOnly ? '#f8fafc' : '#fff', cursor: f.readOnly ? 'not-allowed' : 'pointer' }}
                                            >
                                                {f.options.map((o, i) => (
                                                    <option key={o} value={o}>{f.labels?.[i] || o}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={f.type}
                                                value={val}
                                                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                                readOnly={f.readOnly}
                                                disabled={f.readOnly}
                                                placeholder={`Enter ${f.label.toLowerCase()}`}
                                                style={{
                                                    ...inputStyle,
                                                    background: f.readOnly ? '#f8fafc' : '#fff',
                                                    cursor: f.readOnly ? 'not-allowed' : 'text',
                                                    opacity: f.readOnly ? 0.7 : 1,
                                                }}
                                            />
                                        )}
                                    </Field>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* ── Bottom save button (edit mode only) ──────────── */}
                {isEditing && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleCancel}
                            style={{ padding: '12px 28px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
                        >
                            ✖ Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#1b4332', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}
                        >
                            {saving ? '⏳ Saving...' : '💾 Save All Changes'}
                        </button>
                    </div>
                )}

                {/* ── 2FA Security Card ────────────────────────────── */}
                <div style={cardStyle}>
                    <div className="h-section-title" style={{ marginBottom: '18px' }}>
                        <span>🔐 Two-Factor Authentication</span>
                        <span style={{
                            padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                            background: twoFaEnabled ? '#dcfce7' : '#f1f5f9',
                            color:      twoFaEnabled ? '#15803d' : '#64748b',
                        }}>
                            {twoFaEnabled ? '✅ Enabled' : '⭕ Disabled'}
                        </span>
                    </div>
                    <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7 }}>
                        {twoFaEnabled
                            ? 'Your hospital account is secured with 2FA. A one-time code is emailed to you on every login.'
                            : 'Enable 2FA to add an extra security layer. A 6-digit OTP will be required on each login.'}
                    </p>
                    <button
                        onClick={() => { setShowTwoFaModal(true); setTwoFaErr(''); setTwoFaPassword(''); }}
                        style={{
                            padding: '11px 28px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.92rem',
                            background: twoFaEnabled ? '#fee2e2' : '#1b4332',
                            color:      twoFaEnabled ? '#dc2626' : '#fff',
                        }}
                    >
                        {twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                    </button>
                </div>

                {/* ── Emergency Cases ──────────────────────────────── */}
                <div style={cardStyle}>
                    <div className="h-section-title" style={{ marginBottom: '18px' }}>
                        <span>🚨 Recent Emergency Cases</span>
                    </div>
                    {recentCases.length === 0 ? (
                        <p style={{ color: '#64748b', margin: 0 }}>No emergency cases logged yet.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {recentCases.map((item) => (
                                <div key={item.id} style={{ border: '1px solid #e6edf5', borderRadius: '14px', padding: '16px', background: '#fbfdff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.patientName || 'Patient'}</div>
                                            <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
                                                {item.caseType || 'urgent'} • {item.providerName || form.hospitalName || 'Hospital Emergency Desk'}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                                            {item.status || 'pending'}
                                            {item.assignedDoctorName ? ` • Dr. ${item.assignedDoctorName}` : ''}
                                        </div>
                                    </div>
                                    <p style={{ margin: '10px 0 0', color: '#334155', lineHeight: 1.6 }}>
                                        {item.explanation || item.desc || 'No summary shared.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── 2FA Modal ──────────────────────────────────────────── */}
            {showTwoFaModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
                }} onClick={() => setShowTwoFaModal(false)}>
                    <div style={{
                        background: '#fff', borderRadius: '20px', padding: '36px',
                        maxWidth: '420px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>
                            {twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                        </h2>
                        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            Confirm your current password to {twoFaEnabled ? 'disable' : 'enable'} Two-Factor Authentication.
                        </p>
                        <form onSubmit={handleToggle2FA}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={twoFaPassword}
                                onChange={e => { setTwoFaPassword(e.target.value); setTwoFaErr(''); }}
                                placeholder="Enter your password"
                                autoFocus
                                style={{ ...inputStyle, marginBottom: '8px' }}
                            />
                            {twoFaErr && (
                                <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '12px' }}>{twoFaErr}</div>
                            )}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowTwoFaModal(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={twoFaSaving}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
                                        background: twoFaEnabled ? '#dc2626' : '#1b4332',
                                        color: '#fff', cursor: 'pointer', fontWeight: 700,
                                    }}
                                >
                                    {twoFaSaving ? 'Saving...' : twoFaEnabled ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
