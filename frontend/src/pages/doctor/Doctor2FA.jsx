import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

export default function Doctor2FA() {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [password, setPassword] = useState('');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                setEnabled(json.data?.twoFactorEnabled || false);
            }
        } catch (err) {
            console.error('Failed to fetch 2FA status');
        } finally {
            setFetching(false);
        }
    };

    const handleToggle = async (e) => {
        e.preventDefault();
        if (!password) return;

        setLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/2fa/toggle`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ enabled: !enabled, password })
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to update 2FA status');

            handleSuccess(json.message);
            setEnabled(!enabled);
            setShowConfirm(false);
            setPassword('');
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div style={{ padding: 20, textAlign: 'center' }}>Loading security settings...</div>;

    return (
        <div className="security-card">
            <div className="dd-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>📧 Email Two-Factor Authentication</h2>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>Protect patient data by requiring an OTP sent to your email during login.</p>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 20, background: enabled ? '#e6fffa' : '#fff5f5', color: enabled ? '#2c7a7b' : '#c53030', border: '1px solid currentColor', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {enabled ? '🛡️ 2FA Active' : '🔓 2FA Disabled'}
                </div>
            </div>

            <div style={{ background: enabled ? '#f0fff4' : '#fff5f5', border: `1px solid ${enabled ? '#c6f6d5' : '#fed7d7'}`, padding: 20, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ fontSize: '2.5rem' }}>{enabled ? '🛡️' : '⚠️'}</div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{enabled ? 'Portal Protected' : 'Security Check Recommended'}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: 1.5 }}>
                            {enabled 
                                ? 'A 6-digit OTP will be sent to your official email for every new login session.' 
                                : 'Enable 2FA to ensure only you can access your clinical dashboard and patient records.'}
                        </p>
                    </div>
                </div>

                {!showConfirm ? (
                    <button 
                        className={`dd-btn ${enabled ? 'dd-btn-outline' : 'dd-btn-primary'}`}
                        style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
                        onClick={() => setShowConfirm(true)}
                    >
                        {enabled ? 'Disable 2FA' : 'Enable 2FA via Email'}
                    </button>
                ) : (
                    <form onSubmit={handleToggle} style={{ marginTop: 20, padding: 15, background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: 8 }}>
                            Confirm your clinical password to {enabled ? 'disable' : 'enable'} 2FA
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input 
                                type="password" 
                                className="dd-input" 
                                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="Enter password"
                                autoComplete="current-password"
                                required
                                autoFocus
                            />
                            <button type="submit" className="dd-btn dd-btn-primary" disabled={loading}>
                                {loading ? 'Wait...' : 'Confirm'}
                            </button>
                            <button type="button" className="dd-btn dd-btn-outline" onClick={() => { setShowConfirm(false); setPassword(''); }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div style={{ marginTop: 20, background: '#f8f9fa', padding: 20, borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 12px 0' }}>📂 Security Protocol</h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#666', lineHeight: 1.8 }}>
                    <li>Authentication requires both your password and a unique email OTP.</li>
                    <li>OTP delivery is typically instantaneous via SMTP.</li>
                    <li>Ensure your registered clinic email is accessible.</li>
                    <li>Toggle this setting anytime by verifying your credentials.</li>
                </ul>
            </div>
        </div>
    );
}
