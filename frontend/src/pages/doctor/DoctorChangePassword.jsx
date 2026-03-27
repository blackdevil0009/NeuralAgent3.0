import React, { useState, useCallback } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

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

export default function DoctorChangePassword() {
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
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword: form.old, newPassword: form.newPw })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || json.error || json.message || 'Failed to update password.');
            handleSuccess('Password updated successfully!');
            setSuccess(true);
            setForm({ old: '', newPw: '', confirm: '' });
        } catch (err) {
            handleError(err);
            setErrors({ old: err.message });
        } finally {
            setLoading(false);
        }
    }, [form]);

    const inputStyle = { width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)', boxSizing: 'border-box' };
    const wrapStyle = { position: 'relative' };
    const eyeStyle = { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="dd-header">
                <div>
                    <h1>🔐 Access &amp; Security</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Secure your clinical account with a robust password</p>
                </div>
            </div>

            {success && (
                <div style={{ background: '#d1e7dd', color: '#0f5132', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                    ✅ Password updated successfully. For security, we recommend enabling 2-Factor Authentication.
                </div>
            )}

            <div className="dd-card">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>
                    {/* Current Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Current Clinical Password</label>
                        <div style={wrapStyle}>
                            <input
                                type={show.old ? 'text' : 'password'}
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={form.old}
                                onChange={e => { setForm(p => ({ ...p, old: e.target.value })); if (errors.old) setErrors(p => ({ ...p, old: '' })); }}
                                style={{ ...inputStyle, borderColor: errors.old ? '#e74c3c' : undefined, paddingRight: 44 }}
                            />
                            <button type="button" style={eyeStyle} onClick={() => toggle('old')}>{show.old ? '🙈' : '👁️'}</button>
                        </div>
                        {errors.old && <span style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.old}</span>}
                    </div>

                    {/* New Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>New Password</label>
                        <div style={wrapStyle}>
                            <input
                                type={show.newPw ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Min. 8 chars, include a number & symbol"
                                value={form.newPw}
                                onChange={e => { setForm(p => ({ ...p, newPw: e.target.value })); if (errors.newPw) setErrors(p => ({ ...p, newPw: '' })); }}
                                style={{ ...inputStyle, borderColor: errors.newPw ? '#e74c3c' : undefined, paddingRight: 44 }}
                            />
                            <button type="button" style={eyeStyle} onClick={() => toggle('newPw')}>{show.newPw ? '🙈' : '👁️'}</button>
                        </div>
                        {/* Strength bar */}
                        {form.newPw && (
                            <div style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                    {[1,2,3,4,5].map(i => (
                                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= strength ? STRENGTH_COLORS[strength] : '#e0e0e0', transition: 'background 0.3s' }} />
                                    ))}
                                </div>
                                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: STRENGTH_COLORS[strength] }}>{STRENGTH_LABELS[strength]}</span>
                            </div>
                        )}
                        {errors.newPw && <span style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.newPw}</span>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Confirm New Password</label>
                        <div style={wrapStyle}>
                            <input
                                type={show.confirm ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Re-enter new password"
                                value={form.confirm}
                                onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); if (errors.confirm) setErrors(p => ({ ...p, confirm: '' })); }}
                                style={{ ...inputStyle, borderColor: errors.confirm ? '#e74c3c' : undefined, paddingRight: 44 }}
                            />
                            <button type="button" style={eyeStyle} onClick={() => toggle('confirm')}>{show.confirm ? '🙈' : '👁️'}</button>
                        </div>
                        {form.confirm && form.newPw === form.confirm && (
                            <span style={{ fontSize: '0.74rem', color: '#27ae60', marginTop: 4, display: 'block' }}>✓ Passwords match</span>
                        )}
                        {errors.confirm && <span style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.confirm}</span>}
                    </div>

                    <button className="dd-btn dd-btn-primary" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
                        {loading ? '⏳ Updating...' : '✅ Update Password'}
                    </button>
                </form>
            </div>

            <div className="dd-card" style={{ marginTop: 20, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#856404' }}>Security Tip</div>
                <p style={{ fontSize: '0.8rem', color: '#664d03', marginTop: 4 }}>As a medical professional, ensure your password contains symbols and numbers to protect patient HIPAA-compliance data.</p>
            </div>
        </div>
    );
}
