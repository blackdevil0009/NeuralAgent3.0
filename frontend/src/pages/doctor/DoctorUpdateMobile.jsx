import React, { useState } from 'react';

export default function DoctorUpdateMobile() {
    const [step, setStep] = useState('phone'); // phone, otp, success
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            if (step === 'phone') setStep('otp');
            else if (step === 'otp') setStep('success');
        }, 1200);
    };

    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div className="dd-header">
                <div>
                    <h1>📱 Clinical Communications</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Manage your registered mobile number for emergency patient alerts</p>
                </div>
            </div>

            <div className="dd-card">
                {step === 'phone' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>New Professional Mobile Number</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{ padding: '12px', border: '1px solid var(--doc-border)', borderRadius: 10, background: '#f8f9f8', color: 'var(--doc-text-mute)' }}>+91</div>
                                <input type="tel" placeholder="98765 43210" style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)' }} />
                            </div>
                        </div>
                        <button className="dd-btn dd-btn-primary" onClick={handleNext} disabled={loading} style={{ justifyContent: 'center' }}>
                            {loading ? '⏳ Sending OTP...' : 'Send Verification OTP'}
                        </button>
                    </div>
                )}

                {step === 'otp' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Verification Code</label>
                            <p style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', marginBottom: 12 }}>Enter the 6-digit code sent to your new number.</p>
                            <input type="text" maxLength="6" placeholder="0 0 0 0 0 0" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--doc-border)', textAlign: 'center', letterSpacing: 8, fontSize: '1.2rem', fontWeight: 700 }} />
                        </div>
                        <button className="dd-btn dd-btn-primary" onClick={handleNext} disabled={loading} style={{ justifyContent: 'center' }}>
                            {loading ? '⏳ Verifying...' : 'Verify & Update'}
                        </button>
                    </div>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                        <h3 style={{ color: 'var(--doc-green-deep)' }}>Verified Successfully</h3>
                        <p style={{ color: 'var(--doc-text-mute)', fontSize: '0.9rem' }}>Your clinical contact has been updated. You will now receive emergency SMS alerts on this number.</p>
                        <button className="dd-btn dd-btn-outline" style={{ margin: '20px auto 0' }} onClick={() => setStep('phone')}>Change Again</button>
                    </div>
                )}
            </div>

            <div className="dd-card" style={{ marginTop: 24, background: 'rgba(231,76,60,0.04)', border: '1px solid rgba(231,76,60,0.1)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#c0392b' }}>Important Note</div>
                        <p style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: 4 }}>This number is only used for internal clinical coordination and urgent patient alerts. It will never be shared with patients directly.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
