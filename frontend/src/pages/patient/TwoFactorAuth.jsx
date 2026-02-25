import React, { useState } from 'react';

const BACKUP_CODES = [
    'NA-4X2M-7R9P', 'NA-KQ8L-2VJT', 'NA-5B3N-9WXF',
    'NA-ZT6H-4CPD', 'NA-8Y1G-3MEK', 'NA-RJ7S-6NUB',
];

function MockQR() {
    /* A purely decorative SVG QR placeholder */
    const cells = [];
    const seed = 'NeuralAgent2FA';
    for (let r = 0; r < 21; r++) {
        for (let c = 0; c < 21; c++) {
            const on = (seed.charCodeAt((r * 21 + c) % seed.length) + r + c) % 3 !== 0;
            if (on) cells.push(<rect key={`${r}-${c}`} x={c * 8} y={r * 8} width={7} height={7} rx={1} fill="#1a2e1a" />);
        }
    }
    return (
        <svg width={168} height={168} viewBox="0 0 168 168" style={{ borderRadius: 12, background: '#fff', padding: 4 }}>
            {cells}
            {/* Finder patterns */}
            {[[0, 0], [14, 0], [0, 14]].map(([rx, ry]) => (
                <g key={`${rx}-${ry}`}>
                    <rect x={rx * 8} y={ry * 8} width={56} height={56} rx={4} fill="none" stroke="#1a2e1a" strokeWidth={6} />
                    <rect x={rx * 8 + 12} y={ry * 8 + 12} width={32} height={32} rx={2} fill="#1a2e1a" />
                </g>
            ))}
        </svg>
    );
}

export default function TwoFactorAuth() {
    const [enabled, setEnabled] = useState(false);
    const [phase, setPhase] = useState('idle'); // idle | setup | verify | done | disable
    const [verifyCode, setVerifyCode] = useState('');
    const [codesVisible, setCodesVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedCodes, setCopiedCodes] = useState(false);

    const startSetup = () => { setPhase('setup'); setError(''); setVerifyCode(''); };

    const verifyAndEnable = async () => {
        if (verifyCode.length < 6) { setError('Enter the 6-digit code from your authenticator app.'); return; }
        setError('');
        setLoading(true);
        await new Promise(r => setTimeout(r, 1400));
        setLoading(false);
        setEnabled(true);
        setPhase('done');
    };

    const handleDisable = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 1000));
        setLoading(false);
        setEnabled(false);
        setPhase('idle');
        setCodesVisible(false);
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(BACKUP_CODES.join('\n'));
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2500);
    };

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🔐 Two-Factor Authentication</h1>
                    <p>Add an extra layer of security to your account</p>
                </div>
                <span className={`pd-pill ${enabled ? 'pd-pill-green' : 'pd-pill-red'}`}>
                    {enabled ? '✓ 2FA Enabled' : '✗ 2FA Disabled'}
                </span>
            </div>

            <div className="pd-grid-2" style={{ gap: 24 }}>
                {/* Left: main panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Status card */}
                    <div className="pd-card" style={{
                        background: enabled ? 'rgba(39,174,96,0.07)' : 'rgba(231,76,60,0.06)',
                        border: `1px solid ${enabled ? 'rgba(39,174,96,0.25)' : 'rgba(231,76,60,0.20)'}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ fontSize: '2.5rem' }}>{enabled ? '🛡️' : '⚠️'}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.94rem', marginBottom: 4 }}>
                                    {enabled ? 'Your account is protected' : 'Your account is not fully secured'}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-mute)', lineHeight: 1.65 }}>
                                    {enabled
                                        ? 'Two-factor authentication is active. You will need your authenticator app to log in.'
                                        : 'Enable 2FA using an authenticator app like Google Authenticator or Authy.'
                                    }
                                </div>
                            </div>
                        </div>
                        {!enabled && phase === 'idle' && (
                            <button className="pd-btn pd-btn-primary" onClick={startSetup}
                                style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}>
                                🔐 Enable Two-Factor Auth
                            </button>
                        )}
                        {enabled && phase !== 'disable' && (
                            <button className="pd-btn pd-btn-danger pd-btn-sm"
                                style={{ marginTop: 16, justifyContent: 'center' }}
                                onClick={() => setPhase('disable')} disabled={loading}>
                                Disable 2FA
                            </button>
                        )}
                    </div>

                    {/* SETUP PHASE */}
                    {phase === 'setup' && (
                        <div className="pd-card">
                            <h3 className="pd-section-title">Step 1 · Scan QR Code</h3>
                            <p style={{ fontSize: '0.84rem', color: 'var(--text-mute)', marginBottom: 16, lineHeight: 1.7 }}>
                                Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app and scan this QR code:
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                                <MockQR />
                            </div>
                            <div style={{
                                background: 'var(--surface)', borderRadius: 10, padding: '10px 14px',
                                fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-dark)',
                                textAlign: 'center', marginBottom: 18, wordBreak: 'break-all',
                                border: '1px dashed var(--border-light)',
                            }}>
                                JBSWY3DPEHPK3PXP · NeuralAgent · {new Date().toLocaleDateString('en-IN')}
                            </div>

                            <h3 className="pd-section-title">Step 2 · Enter Code</h3>
                            <div className="pd-form-group">
                                <label>6-digit code from authenticator app</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className={`pd-input ${error ? 'input-error' : ''}`}
                                    placeholder="e.g. 483 921"
                                    maxLength={6}
                                    value={verifyCode}
                                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: 6, textAlign: 'center' }}
                                />
                                {error && <span className="settings-error">{error}</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="pd-btn pd-btn-primary" onClick={verifyAndEnable}
                                    disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
                                    {loading ? '⏳ Verifying…' : '✅ Verify & Enable'}
                                </button>
                                <button className="pd-btn pd-btn-outline" onClick={() => setPhase('idle')}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* DONE PHASE */}
                    {phase === 'done' && (
                        <div className="pd-card">
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
                                <h3 style={{ fontFamily: 'Playfair Display,serif', color: '#2d6a4f', marginBottom: 6 }}>
                                    2FA Enabled Successfully!
                                </h3>
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-mute)', lineHeight: 1.7 }}>
                                    Save these backup codes in a safe place. You can use them to access your account if you lose your phone.
                                </p>
                            </div>
                            <div style={{
                                background: '#f4faf6', border: '1px dashed rgba(45,106,79,0.25)',
                                borderRadius: 12, padding: '16px 20px', marginBottom: 14,
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontFamily: 'monospace', fontSize: '0.84rem' }}>
                                    {BACKUP_CODES.map(c => (
                                        <div key={c} style={{ padding: '4px 8px', background: '#fff', borderRadius: 8, border: '1px solid var(--border-light)' }}>{c}</div>
                                    ))}
                                </div>
                            </div>
                            <button className="pd-btn pd-btn-outline" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
                                onClick={copyBackupCodes}>
                                {copiedCodes ? '✓ Copied!' : '📋 Copy Backup Codes'}
                            </button>
                            <button className="pd-btn pd-btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => setPhase('idle')}>
                                Done
                            </button>
                        </div>
                    )}

                    {/* DISABLE PHASE */}
                    {phase === 'disable' && (
                        <div className="pd-card" style={{ border: '1px solid rgba(231,76,60,0.25)', background: 'rgba(231,76,60,0.04)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>⚠️</div>
                                <h3 style={{ fontFamily: 'Playfair Display,serif', marginBottom: 8 }}>Disable 2FA?</h3>
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-mute)', lineHeight: 1.7, marginBottom: 18 }}>
                                    Your account will be less secure. You won't need an authenticator app to log in.
                                </p>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="pd-btn pd-btn-danger" style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={handleDisable} disabled={loading}>
                                        {loading ? '⏳ Disabling…' : 'Yes, Disable'}
                                    </button>
                                    <button className="pd-btn pd-btn-outline" style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => setPhase('idle')}>Keep Enabled</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Backup codes (when enabled and idle) */}
                    {enabled && phase === 'idle' && (
                        <div className="pd-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 className="pd-section-title" style={{ margin: 0 }}>🗝 Backup Codes</h3>
                                <button className="pd-btn pd-btn-outline pd-btn-sm"
                                    onClick={() => setCodesVisible(p => !p)}>
                                    {codesVisible ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            {codesVisible && (
                                <>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px',
                                        fontFamily: 'monospace', fontSize: '0.84rem', marginBottom: 12,
                                    }}>
                                        {BACKUP_CODES.map(c => (
                                            <div key={c} style={{ padding: '4px 8px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-light)' }}>{c}</div>
                                        ))}
                                    </div>
                                    <button className="pd-btn pd-btn-outline pd-btn-sm" onClick={copyBackupCodes}>
                                        {copiedCodes ? '✓ Copied!' : '📋 Copy All'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="pd-card">
                        <h3 className="pd-section-title">🔒 How 2FA Works</h3>
                        {[
                            ['1️⃣', 'You enter your email & password as usual.'],
                            ['2️⃣', 'Open your authenticator app and get a 6-digit code.'],
                            ['3️⃣', 'Enter that code to complete login.'],
                            ['⏱️', 'Codes expire every 30 seconds for maximum security.'],
                        ].map(([icon, text]) => (
                            <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
                                <p style={{ fontSize: '0.83rem', color: 'var(--text-mute)', lineHeight: 1.65, margin: 0 }}>{text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="pd-card">
                        <h3 className="pd-section-title">📱 Supported Apps</h3>
                        {['Google Authenticator', 'Microsoft Authenticator', 'Authy', '1Password', 'Bitwarden'].map(app => (
                            <div key={app} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span>📱</span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>{app}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
