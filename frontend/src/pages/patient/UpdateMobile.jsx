import React, { useState } from 'react';

const MOCK_CURRENT = '+91 98765 43210';

export default function UpdateMobile() {
    const [phase, setPhase] = useState('form'); // form | otp | success
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    /* Validate 10-digit Indian mobile */
    const validate = () => {
        const digits = mobile.replace(/\D/g, '');
        if (!digits) return 'Please enter a mobile number.';
        if (!/^[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit Indian mobile number (starts with 6–9).';
        return '';
    };

    const requestOtp = async () => {
        const err = validate();
        if (err) { setError(err); return; }
        setError('');
        setLoading(true);
        await new Promise(r => setTimeout(r, 1200));
        setLoading(false);
        setPhase('otp');
        startResendTimer();
    };

    const startResendTimer = () => {
        setResendTimer(30);
        const tick = setInterval(() => {
            setResendTimer(p => { if (p <= 1) { clearInterval(tick); return 0; } return p - 1; });
        }, 1000);
    };

    const handleOtpChange = (idx, val) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...otp];
        next[idx] = val;
        setOtp(next);
        if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    };

    const handleOtpKey = (idx, e) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
            document.getElementById(`otp-${idx - 1}`)?.focus();
        }
    };

    const verifyOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) { setError('Enter all 6 digits.'); return; }
        // Demo: any 6 digits accepted
        setError('');
        setLoading(true);
        await new Promise(r => setTimeout(r, 1400));
        setLoading(false);
        setPhase('success');
    };

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>📱 Update Mobile Number</h1>
                    <p>Change the mobile number linked to your account</p>
                </div>
            </div>

            <div className="pd-grid-2" style={{ gap: 24 }}>
                <div className="pd-card">

                    {/* SUCCESS */}
                    {phase === 'success' && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>✅</div>
                            <h3 style={{ fontFamily: 'Playfair Display,serif', color: '#2d6a4f', marginBottom: 8 }}>
                                Mobile Number Updated!
                            </h3>
                            <p style={{ color: '#6b8f71', fontSize: '0.86rem', lineHeight: 1.7 }}>
                                Your new number <strong>+91 {mobile}</strong> has been saved successfully.
                            </p>
                            <button className="pd-btn pd-btn-primary"
                                style={{ marginTop: 22, justifyContent: 'center', width: '100%' }}
                                onClick={() => { setPhase('form'); setMobile(''); setOtp(['', '', '', '', '', '']); }}>
                                Update Another Number
                            </button>
                        </div>
                    )}

                    {/* FORM */}
                    {phase === 'form' && (
                        <>
                            <div className="pd-form-group">
                                <label>Current Number</label>
                                <input className="pd-input" value={MOCK_CURRENT} disabled
                                    style={{ background: '#f4f6f4', color: 'var(--text-mute)' }} />
                            </div>
                            <div className="pd-form-group">
                                <label>New Mobile Number</label>
                                <div className="settings-mobile-wrap">
                                    <span className="settings-mobile-code">🇮🇳 +91</span>
                                    <input
                                        type="tel"
                                        className={`pd-input ${error ? 'input-error' : ''}`}
                                        placeholder="Enter 10-digit mobile number"
                                        value={mobile}
                                        maxLength={10}
                                        onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        style={{ borderLeft: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                    />
                                </div>
                                {error && <span className="settings-error">{error}</span>}
                            </div>
                            <button className="pd-btn pd-btn-primary"
                                onClick={requestOtp} disabled={loading}
                                style={{ justifyContent: 'center', width: '100%' }}>
                                {loading ? '⏳ Sending OTP…' : '📤 Send OTP'}
                            </button>
                        </>
                    )}

                    {/* OTP */}
                    {phase === 'otp' && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 22 }}>
                                <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>💬</div>
                                <h3 style={{ fontFamily: 'Playfair Display,serif', marginBottom: 6 }}>Verify OTP</h3>
                                <p style={{ fontSize: '0.84rem', color: 'var(--text-mute)', lineHeight: 1.65 }}>
                                    A 6-digit code was sent to <strong>+91 {mobile}</strong>
                                </p>
                            </div>

                            {/* OTP boxes */}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKey(i, e)}
                                        style={{
                                            width: 48, height: 54, textAlign: 'center', fontSize: '1.4rem',
                                            fontWeight: 700, border: '2px solid var(--border-light)',
                                            borderRadius: 12, outline: 'none', fontFamily: 'Poppins,sans-serif',
                                            transition: 'border-color 0.2s',
                                            borderColor: digit ? 'var(--green-mid)' : 'var(--border-light)',
                                        }}
                                    />
                                ))}
                            </div>

                            {error && <p className="settings-error" style={{ textAlign: 'center', marginBottom: 10 }}>{error}</p>}

                            <button className="pd-btn pd-btn-primary"
                                onClick={verifyOtp} disabled={loading}
                                style={{ justifyContent: 'center', width: '100%', marginBottom: 14 }}>
                                {loading ? '⏳ Verifying…' : '✅ Verify & Update'}
                            </button>

                            <div style={{ textAlign: 'center', fontSize: '0.80rem', color: 'var(--text-mute)' }}>
                                {resendTimer > 0
                                    ? `Resend OTP in ${resendTimer}s`
                                    : (
                                        <button style={{ background: 'none', border: 'none', color: 'var(--green-mid)', cursor: 'pointer', fontWeight: 600 }}
                                            onClick={() => { requestOtp(); }}>
                                            Resend OTP
                                        </button>
                                    )
                                }
                            </div>

                            <button className="pd-btn pd-btn-outline"
                                style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                                onClick={() => { setPhase('form'); setOtp(['', '', '', '', '', '']); setError(''); }}>
                                ← Change Number
                            </button>
                        </>
                    )}
                </div>

                {/* Info panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="pd-card">
                        <h3 className="pd-section-title">ℹ️ Why Update?</h3>
                        <ul style={{ padding: '0 0 0 18px', margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                'Receive appointment reminders via SMS.',
                                'OTP-based login uses your registered mobile.',
                                'Doctors can contact you on urgent matters.',
                                'Your number is never shared with third parties.',
                            ].map((t, i) => (
                                <li key={i} style={{ fontSize: '0.83rem', color: 'var(--text-mute)', lineHeight: 1.65 }}>{t}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="pd-card" style={{ background: '#fff8e7', border: '1px solid rgba(201,168,76,0.25)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1.8rem' }}>⚠️</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 4 }}>Demo Mode</div>
                                <div style={{ fontSize: '0.80rem', color: 'var(--text-mute)', lineHeight: 1.7 }}>
                                    Any 6-digit OTP will be accepted in demo mode. In production, a real SMS will be sent.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
