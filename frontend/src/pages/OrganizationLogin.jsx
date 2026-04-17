import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import { handleSuccess, handleError } from '../utils/error_handlers';
import { getRouteForRole, getStoredAuthSession, persistAuthSession } from '../utils/authStorage';
import './login_style.css';

function ForgotPasswordModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(email)) {
            setErr('Please enter a valid email address.');
            return;
        }

        setErr('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.data?.message || 'Could not send reset email.');
            }
            setSent(true);
        } catch (error) {
            handleError(error);
            setErr(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">X</button>
                <div className="modal-icon">Reset</div>
                <h2 className="modal-title">Hospital Password Reset</h2>

                {sent ? (
                    <div className="modal-sent">
                        <div className="modal-sent-icon">Done</div>
                        <p>
                            If this hospital account exists, reset instructions were sent to
                            <strong> {email}</strong>.
                        </p>
                        <button className="btn-login" style={{ marginTop: 18 }} onClick={onClose}>
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} noValidate>
                        <p className="modal-desc">
                            Enter your official hospital email and we will send a secure reset link.
                        </p>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label htmlFor="org-reset-email">Official Email Address</label>
                            <input
                                id="org-reset-email"
                                type="email"
                                placeholder="admin@hospital.com"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setErr('');
                                }}
                                autoFocus
                            />
                            {err && <span className="field-error">{err}</span>}
                        </div>
                        <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: 12 }}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function OrganizationLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [verificationMode, setVerificationMode] = useState('none'); // none | registration | 2fa
    const [errorMsg, setErrorMsg] = useState('');
    const [resendMsg, setResendMsg] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        const { token, role } = getStoredAuthSession();
        const targetRoute = getRouteForRole(role);

        if (token && targetRoute) {
            navigate(targetRoute, { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (resendCooldown <= 0) {
            return undefined;
        }
        const timer = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const persistAuthAndRoute = (responseData) => {
        persistAuthSession({
            storage: localStorage,
            token: responseData.token,
            refreshToken: responseData.refresh_token,
            role: responseData.role || 'organization',
            user: responseData.user,
        });
        handleSuccess('Welcome to the Hospital Dashboard.');
        navigate('/hospital/dashboard', { replace: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setErrorMsg('Please enter both email and password.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        setResendMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: 'organization' }),
            });

            const json = await res.json();
            const data = json.data || {};

            if (!res.ok) {
                const msg = data.message || json.message || 'Login failed.';
                if (res.status === 403 && msg.toLowerCase().includes('not verified')) {
                    setVerificationMode('registration');
                    setOtp('');
                    throw new Error('Please verify your email using the 6-digit code sent to your inbox.');
                }
                throw new Error(msg);
            }

            if (data.status === '2fa_required') {
                setVerificationMode('2fa');
                setOtp('');
                setResendCooldown(60);
                setResendMsg('2FA code sent to your official email.');
                return;
            }

            persistAuthAndRoute(data);
        } catch (err) {
            handleError(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setErrorMsg('Enter the 6-digit code sent to your email.');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            const endpoint =
                verificationMode === '2fa'
                    ? '/api/auth/verify-2fa-otp'
                    : '/api/auth/verify-registration-otp';

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, role: 'organization' }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.data?.message || json.message || 'Invalid code. Please try again.');
            }

            const data = json.data || {};
            if (verificationMode === 'registration') {
                handleSuccess('Email verified successfully. Please log in.');
                setVerificationMode('none');
                setOtp('');
                return;
            }

            persistAuthAndRoute(data);
        } catch (err) {
            handleError(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCooldown > 0 || !email) {
            return;
        }

        setResendMsg('');
        try {
            const endpoint =
                verificationMode === '2fa'
                    ? '/api/auth/resend-2fa-otp'
                    : '/api/auth/resend-verification';

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.data?.message || json.message || 'Failed to resend code.');
            }
            setResendMsg(json.data?.message || json.message || 'Code sent.');
            setResendCooldown(60);
        } catch (err) {
            handleError(err);
            setErrorMsg(err.message);
        }
    };

    return (
        <div className="login-page organization-theme" style={{ position: 'relative', overflow: 'auto' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '30px', zIndex: 10 }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: '800', color: '#fff' }}>VaidyaMed-X</span>
                </Link>
            </div>

            <div className="login-standalone-wrapper" style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 20px' }}>
                <div className="login-card-org" style={{ width: '100%', maxWidth: '460px', background: '#fff', borderRadius: '28px', boxShadow: '0 40px 80px rgba(0,0,0,0.25)', borderTop: '8px solid #1b4332', overflow: 'hidden', zIndex: 5 }}>
                    <div className="login-header-org" style={{ background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)', padding: '50px 40px', textAlign: 'center', color: '#fff' }}>
                        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2rem', marginBottom: '8px', fontWeight: '800', letterSpacing: '0.5px' }}>
                            Hospital Login
                        </h2>
                        <p style={{ opacity: 0.9, fontSize: '1rem', fontWeight: '500' }}>
                            {verificationMode === 'none' ? 'Organization Control Panel' : 'Security Verification'}
                        </p>
                    </div>

                    {verificationMode === 'none' ? (
                        <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
                            {errorMsg && <div className="login-error-banner" style={{ marginBottom: '16px' }}>{errorMsg}</div>}

                            <div className="form-group" style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>Official Email Address</label>
                                <input
                                    type="email"
                                    placeholder="admin@hospital.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setErrorMsg('');
                                    }}
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>Secure Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="........"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setErrorMsg('');
                                        }}
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        {showPass ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right', marginBottom: '25px' }}>
                                <button type="button" onClick={() => setShowForgot(true)} style={{ fontSize: '0.85rem', color: '#2d6a4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    Forgot Password?
                                </button>
                            </div>

                            <button
                                className="btn-hero-primary"
                                style={{ width: '100%', background: '#1b4332', padding: '16px', borderRadius: '14px', fontSize: '1.1rem', fontWeight: '700' }}
                                disabled={loading}
                            >
                                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.9rem', color: '#64748b' }}>
                                Don't have an organization account? <br />
                                <Link to="/hospital/register" style={{ color: '#2d6a4f', fontWeight: '600', textDecoration: 'none' }}>Register your Hospital</Link>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Link to="/login" style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>Switch to Patient/Doctor Login</Link>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleOtpSubmit} style={{ padding: '40px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: 10, color: '#1b4332' }}>
                                {verificationMode === '2fa' ? 'Enter 2FA Code' : 'Verify Your Email'}
                            </h3>
                            <p style={{ marginTop: 0, marginBottom: 20, color: '#555' }}>
                                Enter the 6-digit code sent to <strong>{email}</strong>.
                            </p>

                            {errorMsg && <div className="login-error-banner" style={{ marginBottom: '16px' }}>{errorMsg}</div>}
                            {resendMsg && <div className="login-success-banner" style={{ marginBottom: '16px' }}>{resendMsg}</div>}

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>Verification Code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="6"
                                    value={otp}
                                    onChange={(e) => {
                                        setOtp(e.target.value.replace(/\D/g, ''));
                                        setErrorMsg('');
                                    }}
                                    autoFocus
                                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px solid #cbd5e1', fontSize: '1.6rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 700, outline: 'none' }}
                                />
                            </div>

                            <button className="btn-hero-primary" style={{ width: '100%', background: '#1b4332', padding: '16px', borderRadius: '14px', fontSize: '1rem', fontWeight: '700' }} disabled={loading}>
                                {loading ? 'Verifying...' : 'Verify and Continue'}
                            </button>

                            <div style={{ textAlign: 'center', marginTop: 14 }}>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={resendCooldown > 0}
                                    style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? '#94a3b8' : '#2d6a4f', textDecoration: 'underline', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer' }}
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                                </button>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: 14 }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setVerificationMode('none');
                                        setOtp('');
                                        setErrorMsg('');
                                        setResendMsg('');
                                        setResendCooldown(0);
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#64748b', textDecoration: 'underline', cursor: 'pointer' }}
                                >
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
        </div>
    );
}
