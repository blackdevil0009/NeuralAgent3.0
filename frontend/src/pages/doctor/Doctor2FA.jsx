import React, { useState } from 'react';

export default function Doctor2FA() {
    const [enabled, setEnabled] = useState(false);
    const [step, setStep] = useState('idle'); // idle, setup, done

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div className="dd-header">
                <div>
                    <h1>🔐 Two-Factor Authentication</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Add an extra layer of clinical data protection</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: enabled ? '#0f5132' : '#667c6b' }}>
                        {enabled ? '● Active' : '○ Inactive'}
                    </span>
                    <button className={`dd-btn ${enabled ? 'dd-btn-outline' : 'dd-btn-primary'}`}
                        onClick={() => enabled ? setEnabled(false) : setStep('setup')}>
                        {enabled ? 'Disable 2FA' : 'Enable Setup'}
                    </button>
                </div>
            </div>

            {step === 'idle' && !enabled && (
                <div className="dd-card">
                    <p style={{ lineHeight: 1.6 }}>Two-factor authentication adds an extra layer of security to your clinical portal by requiring a code from your mobile device whenever you log in.</p>
                    <div className="dd-grid" style={{ marginTop: 20 }}>
                        <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12, border: '1px solid var(--doc-border)' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>📱</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Authenticator App</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>Use Google Authenticator or Microsoft Authenticator to generate secure TOTP codes.</p>
                        </div>
                        <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12, border: '1px solid var(--doc-border)' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 10 }}>📄</div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Backup Codes</div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>Access your workspace even if you lose your mobile device with one-time recovery codes.</p>
                        </div>
                    </div>
                </div>
            )}

            {step === 'setup' && (
                <div className="dd-card" style={{ textAlign: 'center' }}>
                    <h3>Scan QR Code</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--doc-text-mute)', marginBottom: 20 }}>Open your authenticator app and scan the code below.</p>
                    <div style={{ width: 200, height: 200, background: '#eee', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ccc', borderRadius: 12 }}>
                        {/* Mock QR */}
                        <svg width="150" height="150" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="white" />
                            <path d="M10 10h30v30h-30z m5 5h20v20h-20z" fill="black" />
                            <path d="M60 10h30v30h-30z m5 5h20v20h-20z" fill="black" />
                            <path d="M10 60h30v30h-30z m5 5h20v20h-20z" fill="black" />
                            <path d="M50 50h10v10h10v10h10v10h10v10" fill="black" stroke="black" strokeWidth="2" />
                            <rect x="70" y="70" width="10" height="10" fill="black" />
                        </svg>
                    </div>
                    <div style={{ marginTop: 24, maxWidth: 400, margin: '24px auto' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Enter 6-digit App Code</label>
                        <input type="text" maxLength="6" placeholder="000 000" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)', textAlign: 'center', letterSpacing: 4, fontWeight: 700 }} />
                        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                            <button className="dd-btn dd-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('idle')}>Cancel</button>
                            <button className="dd-btn dd-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setEnabled(true); setStep('idle'); }}>Finish Setup</button>
                        </div>
                    </div>
                </div>
            )}

            {enabled && step === 'idle' && (
                <div style={{ background: '#f0f7f2', border: '1px solid var(--doc-green-light)', padding: 24, borderRadius: 16, marginTop: 20 }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ fontSize: '2rem' }}>🛡️</div>
                        <div>
                            <h3 style={{ margin: 0, color: 'var(--doc-green-deep)' }}>Your session is protected</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--doc-text-dark)', marginTop: 8 }}>Two-factor authentication is active. Last verified on 22 Feb 2026.</p>
                            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                                <button className="dd-btn dd-btn-primary" style={{ padding: '8px 16px' }}>View Backup Codes</button>
                                <button className="dd-btn dd-btn-outline" style={{ padding: '8px 16px' }} onClick={() => setEnabled(false)}>Disable</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
