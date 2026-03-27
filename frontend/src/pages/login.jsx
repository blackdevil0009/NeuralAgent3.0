import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './login_style.css';
import { handleSuccess, handleError } from '../utils/error_handlers';
import { API_BASE_URL } from '../utils/config';

/* ─────────────────────────────────────────────
   Forgot Password Modal
───────────────────────────────────────────── */
function ForgotPasswordModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    const handleSend = async (e) => {
        e.preventDefault();
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(email)) { setErr('Please enter a valid email address.'); return; }
        setErr('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.data?.message || 'Could not send reset email.');
            }
            setSent(true);
        } catch (e) {
            handleError(e);
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                <div className="modal-icon">🔑</div>
                <h2 className="modal-title">Reset Password</h2>

                {sent ? (
                    <div className="modal-sent">
                        <div className="modal-sent-icon">📧</div>
                        <p>Reset link sent!<br />
                            Please check your inbox at <strong>{email}</strong> and follow the instructions.</p>
                        <button className="btn-login" style={{ marginTop: 18 }} onClick={onClose}>
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} noValidate>
                        <p className="modal-desc">
                            Enter your registered email address and we'll send you a link to reset your password.
                        </p>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label htmlFor="reset-email">Email Address</label>
                            <input
                                id="reset-email" type="email" placeholder="your@email.com"
                                value={email} onChange={e => { setEmail(e.target.value); setErr(''); }}
                                autoFocus
                            />
                            {err && <span className="field-error">{err}</span>}
                        </div>
                        <button type="submit" className="btn-login" disabled={loading}
                            style={{ marginTop: 12 }}>
                            {loading && <span className="spinner" />}
                            {loading ? 'Sending…' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Resend Verification Modal
───────────────────────────────────────────── */
function ResendVerificationModal({ onClose, email: initialEmail }) {
    const [email, setEmail] = useState(initialEmail || '');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [timer, setTimer] = useState(0);

    React.useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleResend = async (e) => {
        e.preventDefault();
        if (timer > 0) return;
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(email)) { setErr('Please enter a valid email address.'); return; }
        setErr('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.data?.message || j.error || 'Could not resend verification email.');
            setSent(true);
            setTimer(60); // Start 1-minute cooldown
        } catch (e) {
            handleError(e);
            setErr(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
                <div className="modal-icon">📧</div>
                <h2 className="modal-title">Resend Verification</h2>

                {sent ? (
                    <div className="modal-sent">
                        <div className="modal-sent-icon">✅</div>
                        <p>A new verification link has been sent to <strong>{email}</strong>.<br />
                            Please check your inbox and spam folder.</p>
                        <button className="btn-login" style={{ marginTop: 18 }} onClick={onClose}>
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleResend} noValidate>
                        <p className="modal-desc">
                            Didn't receive the verification email? Enter your email address below and we'll send you a new link.
                        </p>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label htmlFor="resend-email">Email Address</label>
                            <input
                                id="resend-email" type="email" placeholder="your@email.com"
                                value={email} onChange={e => { setEmail(e.target.value); setErr(''); }}
                                autoFocus
                            />
                            {err && <span className="field-error">{err}</span>}
                        </div>
                        <button type="submit" className="btn-login" disabled={loading || timer > 0}
                            style={{ marginTop: 12 }}>
                            {loading && <span className="spinner" />}
                            {timer > 0 ? `Wait ${timer}s` : (loading ? 'Sending…' : 'Resend Verification Link')}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   Main Login Page
───────────────────────────────────────────── */
export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    /* role tab */
    const [role, setRole] = useState('patient'); // 'patient' | 'doctor'

    /* form fields */
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPass, setShowPass] = useState(false);

    /* ui state */
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const [showResend, setShowResend] = useState(false);
    const [isUnverified, setIsUnverified] = useState(false);
    const [verificationMode, setVerificationMode] = useState('none'); // 'none' | '2fa' | 'registry'
    const [otp, setOtp] = useState('');

    /* field-level errors */
    const [errors, setErrors] = useState({});

    /* UI success message passed from registration */
    const regSuccess = location.state?.registered
        ? location.state?.message || '🎉 Registration successful!'
        : '';

    // If registered from registration.jsx, we might want to show OTP screen immediately
    React.useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
            if (location.state?.showVerify) {
                setVerificationMode('registry');
            }
        }
    }, [location.state]);

    /* ── Validation ── */
    const validate = () => {
        const errs = {};
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(email)) errs.email = 'Enter a valid email address.';
        if (!password) errs.password = 'Password is required.';
        else if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
        return errs;
    };

    /* ── Submit Login ── */
    const handleSubmit = useCallback(async (e) => {
        if (e) e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        setErrorMsg('');
        setIsUnverified(false);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, rememberMe }),
            });

            const json = await res.json();
            if (!res.ok) {
                if (res.status === 403) {
                    setIsUnverified(true);
                    setVerificationMode('registry');
                    throw new Error('Please verify your account. We sent a code to your email.');
                }
                throw new Error(json.data?.message || json.message || 'Login failed. Please check your credentials.');
            }

            const responseData = json.data || {};
            if (responseData.status === '2fa_required') {
                setVerificationMode('2fa');
                setErrorMsg('');
                return;
            }

            /* Persist token */
            const store = rememberMe ? localStorage : sessionStorage;
            store.setItem('token', responseData.token);
            store.setItem('role', responseData.role || role);
            if (responseData.user) store.setItem('user', JSON.stringify(responseData.user));

            /* Route based on role */
            if (responseData.role === 'doctor' || role === 'doctor') {
                navigate('/doctor');
            } else {
                navigate('/patient');
            }
        } catch (err) {
            handleError(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    }, [email, password, role, rememberMe, navigate]);

    /* ── OTP Submit ── */
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setErrorMsg('Enter the 6-digit code sent to your email.'); return; }
        
        setLoading(true);
        setErrorMsg('');
        try {
            const endpoint = verificationMode === '2fa' 
                ? '/api/auth/verify-2fa-otp' 
                : '/api/auth/verify-registration-otp';

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp, role }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.error || json.message || 'Invalid verification code.');

            const responseData = json.data || {};
            if (verificationMode === 'registry') {
                handleSuccess('Email verified! You can now log in.');
                setVerificationMode('none');
                setOtp('');
                return;
            }

            /* 2FA Success - Persist token */
            const store = rememberMe ? localStorage : sessionStorage;
            store.setItem('token', responseData.token);
            store.setItem('role', role);
            if (responseData.user) store.setItem('user', JSON.stringify(responseData.user));

            if (role === 'doctor') navigate('/doctor');
            else navigate('/patient');

        } catch (err) {
            handleError(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ── Field change helpers ── */
    const handleEmailChange = (e) => {
        setEmail(e.target.value);
        if (errors.email) setErrors(p => ({ ...p, email: '' }));
    };

    const handlePassChange = (e) => {
        setPassword(e.target.value);
        if (errors.password) setErrors(p => ({ ...p, password: '' }));
    };

    const switchRole = (r) => {
        setRole(r);
        setErrorMsg('');
        setErrors({});
    };

    /* ───────────────────────── RENDER ───────────────────────── */
    return (
        <div className="login-page">
            <div className="leaf leaf-1" />
            <div className="leaf leaf-2" />
            <div className="leaf leaf-3" />
            <div className="leaf leaf-4" />
            <div className="leaf leaf-5" />

            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">🌿 VaidyaMed-X</div>
                    <p className="login-tagline">Ayurvedic AI Health Companion</p>
                    <span className="login-lotus">🪷</span>
                </div>

                {verificationMode === 'none' && (
                    <div className="login-tabs">
                        <button type="button" className={`login-tab-btn ${role === 'patient' ? 'active' : ''}`} onClick={() => switchRole('patient')}>🌿 Patient</button>
                        <button type="button" className={`login-tab-btn ${role === 'doctor' ? 'active' : ''}`} onClick={() => switchRole('doctor')}>👨‍⚕️ Doctor</button>
                    </div>
                )}

                {verificationMode === 'none' ? (
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="login-form-body">
                            <h2 className="login-welcome">{role === 'patient' ? 'Welcome back 🌿' : 'Doctor Login 👨‍⚕️'}</h2>
                            <p className="login-sub">{role === 'patient' ? 'Sign in to access your health dashboard.' : 'Sign in to access your clinical dashboard.'}</p>

                            {regSuccess && <div className="login-success-banner">✅ {regSuccess}</div>}
                            {errorMsg && (
                                <div className="login-error-banner" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>⚠️</span>
                                        <span>{errorMsg}</span>
                                    </div>
                                    {isUnverified && (
                                        <button type="button" onClick={() => setShowResend(true)} className="banner-action-btn" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>
                                            📩 Resend Verification Link
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={email} onChange={handleEmailChange} placeholder="email@example.com" />
                                {errors.email && <span className="field-error">{errors.email}</span>}
                            </div>

                            <div className="form-group">
                                <label>Password</label>
                                <div className="pw-wrapper">
                                    <input type={showPass ? 'text' : 'password'} value={password} onChange={handlePassChange} placeholder="••••••••" />
                                    <button type="button" className="pw-eye-btn" onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button>
                                </div>
                                {errors.password && <span className="field-error">{errors.password}</span>}
                            </div>

                            <div className="login-row">
                                <label className="remember-check"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> Remember me</label>
                                <button type="button" className="forgot-btn" onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: '#2d6a4f', cursor: 'pointer' }}>Forgot Password?</button>
                            </div>

                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? 'Checking...' : role === 'patient' ? 'Login as Patient 🌿' : 'Login as Doctor 👨‍⚕️'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleOtpSubmit} noValidate>
                        <div className="login-form-body">
                            <h2 className="login-welcome">
                                {verificationMode === '2fa' ? 'Security Check 🛡️' : 'Verify Account 📧'}
                            </h2>
                            <p className="login-sub">
                                Enter the 6-digit code sent to <strong>{email}</strong>
                            </p>

                            {errorMsg && <div className="login-error-banner">⚠️ {errorMsg}</div>}

                            <div className="form-group">
                                <label>Verification Code</label>
                                <input
                                    type="password" maxLength="6" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                    style={{ fontSize: '1.8rem', textAlign: 'center', letterSpacing: '8px', fontWeight: 'bold' }}
                                    autoFocus
                                />
                            </div>

                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? 'Verifying...' : (verificationMode === '2fa' ? 'Verify & Continue' : 'Verify & Activate')}
                            </button>

                            <button type="button" className="back-btn" onClick={() => { setVerificationMode('none'); setErrorMsg(''); setIsUnverified(false); }} 
                                style={{ background: 'none', border: 'none', color: '#666', marginTop: 15, cursor: 'pointer', textDecoration: 'underline' }}>
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                )}

                <div className="login-footer">
                    <p className="login-register-cta">
                        New to VaidyaMed-X? <Link to="/register">Create an account</Link>
                    </p>
                </div>

                <div className="shloka-banner">
                    <p className="shloka-text">
                        "स्वस्थस्य स्वास्थ्य रक्षणं, आतुरस्य विकार प्रशमनम्" <br />
                        <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                            — Preserve the health of the healthy; relieve the suffering of the sick.
                        </span>
                    </p>
                </div>
            </div>

            {/* ── Modal Overlay Components ── */}
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
            {showResend && <ResendVerificationModal onClose={() => setShowResend(false)} email={email} />}
        </div>
    );
}
