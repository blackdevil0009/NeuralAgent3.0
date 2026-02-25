import React, { useState, useCallback } from 'react';

/* Password strength scorer */
function scorePassword(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s; // 0-5
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#1a8a4a'];

export default function ChangePassword() {
    const [form, setForm] = useState({ old: '', newPw: '', confirm: '' });
    const [show, setShow] = useState({ old: false, newPw: false, confirm: false });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const strength = scorePassword(form.newPw);

    const toggle = (field) => setShow(p => ({ ...p, [field]: !p[field] }));

    const validate = () => {
        const e = {};
        if (!form.old) e.old = 'Current password is required.';
        if (!form.newPw || form.newPw.length < 8) e.newPw = 'New password must be at least 8 characters.';
        if (form.newPw === form.old && form.old) e.newPw = 'New password must differ from current password.';
        if (form.newPw !== form.confirm) e.confirm = 'Passwords do not match.';
        return e;
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setErrors({});
        setLoading(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1600));
        setLoading(false);
        setSuccess(true);
        setForm({ old: '', newPw: '', confirm: '' });
    }, [form]);

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🔑 Change Password</h1>
                    <p>Update your account password to keep it secure</p>
                </div>
            </div>

            <div className="pd-grid-2" style={{ gap: 24 }}>
                {/* Form card */}
                <div className="pd-card">
                    {success && (
                        <div className="settings-success-banner">
                            ✅ Password changed successfully! Please use your new password on next login.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {/* Current password */}
                        <div className="pd-form-group">
                            <label>Current Password</label>
                            <div className="settings-pw-wrap">
                                <input
                                    type={show.old ? 'text' : 'password'}
                                    className={`pd-input ${errors.old ? 'input-error' : ''}`}
                                    placeholder="Enter current password"
                                    value={form.old}
                                    onChange={e => setForm(p => ({ ...p, old: e.target.value }))}
                                />
                                <button type="button" className="settings-pw-toggle" onClick={() => toggle('old')}>
                                    {show.old ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.old && <span className="settings-error">{errors.old}</span>}
                        </div>

                        {/* New password */}
                        <div className="pd-form-group">
                            <label>New Password</label>
                            <div className="settings-pw-wrap">
                                <input
                                    type={show.newPw ? 'text' : 'password'}
                                    className={`pd-input ${errors.newPw ? 'input-error' : ''}`}
                                    placeholder="Min. 8 chars, include a number & symbol"
                                    value={form.newPw}
                                    onChange={e => setForm(p => ({ ...p, newPw: e.target.value }))}
                                />
                                <button type="button" className="settings-pw-toggle" onClick={() => toggle('newPw')}>
                                    {show.newPw ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {/* Strength bar */}
                            {form.newPw && (
                                <div style={{ marginTop: 6 }}>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} style={{
                                                flex: 1, height: 4, borderRadius: 4,
                                                background: i <= strength ? STRENGTH_COLORS[strength] : 'var(--border-light)',
                                                transition: 'background 0.3s',
                                            }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: STRENGTH_COLORS[strength] }}>
                                        {STRENGTH_LABELS[strength]}
                                    </span>
                                </div>
                            )}
                            {errors.newPw && <span className="settings-error">{errors.newPw}</span>}
                        </div>

                        {/* Confirm password */}
                        <div className="pd-form-group">
                            <label>Confirm New Password</label>
                            <div className="settings-pw-wrap">
                                <input
                                    type={show.confirm ? 'text' : 'password'}
                                    className={`pd-input ${errors.confirm ? 'input-error' : ''}`}
                                    placeholder="Re-enter new password"
                                    value={form.confirm}
                                    onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                                />
                                <button type="button" className="settings-pw-toggle" onClick={() => toggle('confirm')}>
                                    {show.confirm ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {form.confirm && form.newPw === form.confirm && (
                                <span style={{ fontSize: '0.74rem', color: '#27ae60', marginTop: 4 }}>✓ Passwords match</span>
                            )}
                            {errors.confirm && <span className="settings-error">{errors.confirm}</span>}
                        </div>

                        <button className="pd-btn pd-btn-primary" type="submit"
                            disabled={loading}
                            style={{ justifyContent: 'center', marginTop: 8 }}>
                            {loading ? '⏳ Updating…' : '✅ Update Password'}
                        </button>
                    </form>
                </div>

                {/* Security tips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="pd-card">
                        <h3 className="pd-section-title">🛡️ Password Tips</h3>
                        <ul style={{ padding: '0 0 0 18px', margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                'Use at least 12 characters for maximum security.',
                                'Mix UPPERCASE, lowercase, numbers and symbols.',
                                'Avoid using your name, birthdate or common words.',
                                'Never reuse a password from another account.',
                                'Consider using a password manager.',
                            ].map((t, i) => (
                                <li key={i} style={{ fontSize: '0.83rem', color: 'var(--text-mute)', lineHeight: 1.65 }}>{t}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="pd-card" style={{ background: 'rgba(45,106,79,0.05)', border: '1px solid rgba(45,106,79,0.15)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1.8rem' }}>🔐</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>Enable Two-Factor Auth</div>
                                <div style={{ fontSize: '0.80rem', color: 'var(--text-mute)', lineHeight: 1.65 }}>
                                    Adding 2FA provides an extra layer of protection even if someone knows your password.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
