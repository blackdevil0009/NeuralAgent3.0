import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DoctorChangePassword() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleUpdate = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
        }, 1500);
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="dd-header">
                <div>
                    <h1>🔐 Access & Security</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Secure your clinical account with a robust password</p>
                </div>
            </div>

            {success && (
                <div style={{ background: '#d1e7dd', color: '#0f5132', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                    ✅ Password updated successfully. For security, we recommend 2-Factor Authentication.
                </div>
            )}

            <div className="dd-card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Current Clinical Password</label>
                        <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>New Password</label>
                        <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Confirm New Password</label>
                        <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)' }} />
                    </div>
                    <button className="dd-btn dd-btn-primary" onClick={handleUpdate} disabled={loading} style={{ justifyContent: 'center' }}>
                        {loading ? '⏳ Updating...' : 'Update Password'}
                    </button>
                </div>
            </div>

            <div className="dd-card" style={{ marginTop: 20, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#856404' }}>Security Tip</div>
                <p style={{ fontSize: '0.8rem', color: '#664d03', marginTop: 4 }}>As a medical professional, ensure your password contains symbols and numbers to protect patient HIPAA-compliance data.</p>
            </div>
        </div>
    );
}
