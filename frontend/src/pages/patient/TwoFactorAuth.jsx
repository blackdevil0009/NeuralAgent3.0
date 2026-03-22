import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

export default function TwoFactorAuth() {
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
            <div className="pd-page-header" style={{ marginBottom: 20 }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>📧 Email Two-Factor Authentication</h2>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>Secure your account by requiring an OTP sent to your email during login.</p>
                </div>
                <div className={`pd-pill ${enabled ? 'pd-pill-green' : 'pd-pill-red'}`} style={{ fontWeight: 'bold' }}>
                    {enabled ? '🛡️ 2FA Active' : '🔓 2FA Disabled'}
                </div>
            </div>

            <div className="pd-card" style={{ background: enabled ? '#f0fff4' : '#fff5f5', border: `1px solid ${enabled ? '#c6f6d5' : '#fed7d7'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ fontSize: '2.5rem' }}>{enabled ? '🛡️' : '⚠️'}</div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 5px 0' }}>{enabled ? 'Account Protected' : 'Account Less Secure'}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#555', lineHeight: 1.5 }}>
                            {enabled 
                                ? 'We will send a 6-digit code to your registered email every time you log in.' 
                                : 'Enable 2FA to prevent unauthorized access even if someone knows your password.'}
                        </p>
                    </div>
                </div>

                {!showConfirm ? (
                    <button 
                        className={`pd-btn ${enabled ? 'pd-btn-danger' : 'pd-btn-primary'}`}
                        style={{ marginTop: 20, width: '100%', justifyContent: 'center' }}
                        onClick={() => setShowConfirm(true)}
                    >
                        {enabled ? 'Disable 2FA' : 'Enable 2FA via Email'}
                    </button>
                ) : (
                    <form onSubmit={handleToggle} style={{ marginTop: 20, padding: 15, background: '#fff', borderRadius: 8, border: '1px solid #ddd' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: 8 }}>
                            Confirm password to {enabled ? 'disable' : 'enable'} 2FA
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input 
                                type="password" 
                                className="pd-input" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                placeholder="Enter your password"
                                required
                                autoFocus
                            />
                            <button type="submit" className="pd-btn pd-btn-primary" disabled={loading}>
                                {loading ? 'Wait...' : 'Confirm'}
                            </button>
                            <button type="button" className="pd-btn pd-btn-outline" onClick={() => { setShowConfirm(false); setPassword(''); }}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="pd-card" style={{ marginTop: 20 }}>
                <h4 style={{ margin: '0 0 12px 0' }}>🛡️ How it works</h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#666', lineHeight: 1.8 }}>
                    <li>Enter your email and password as usual.</li>
                    <li>If 2FA is active, we'll send a 6-digit code to your inbox.</li>
                    <li>Enter the code to complete your login.</li>
                    <li>The code is valid for 5 minutes.</li>
                </ul>
            </div>
        </div>
    );
}
