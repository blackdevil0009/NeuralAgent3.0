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

    /* field-level errors */
    const [errors, setErrors] = useState({});

    /* success message passed from registration */
    const regSuccess = location.state?.registered
        ? '🎉 Registration successful! Please log in to continue.'
        : '';

    /* ── Validation ── */
    const validate = () => {
        const errs = {};
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(email)) errs.email = 'Enter a valid email address.';
        if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
        return errs;
    };



    /* ── Submit ── */
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role, rememberMe }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Login failed. Please check your credentials.');

            /* Persist token */
            const store = rememberMe ? localStorage : sessionStorage;
            const userData = json.data || {};
            store.setItem('token', userData.token);
            store.setItem('role', userData.role || role);
            store.setItem('user', JSON.stringify(userData.user || {}));

            /* Route based on role */
            if (userData.role === 'doctor' || role === 'doctor') {
                navigate('/doctor');
            } else {
                navigate('/patient');
            }
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    }, [email, password, role, rememberMe, navigate]);

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
            {/* Floating leaves */}
            <div className="leaf leaf-1" />
            <div className="leaf leaf-2" />
            <div className="leaf leaf-3" />
            <div className="leaf leaf-4" />
            <div className="leaf leaf-5" />

            <div className="login-container">

                {/* ── Header ── */}
                <div className="login-header">
                    <div className="login-logo">🌿 VaidyaMed-X</div>
                    <p className="login-tagline">Ayurvedic AI Health Companion</p>
                    <span className="login-lotus">🪷</span>
                </div>

                {/* ── Role Tabs ── */}
                <div className="login-tabs">
                    <button
                        type="button"
                        className={`login-tab-btn ${role === 'patient' ? 'active' : ''}`}
                        onClick={() => switchRole('patient')}
                    >
                        🌿 Patient
                    </button>
                    <button
                        type="button"
                        className={`login-tab-btn ${role === 'doctor' ? 'active' : ''}`}
                        onClick={() => switchRole('doctor')}
                    >
                        👨‍⚕️ Doctor
                    </button>
                </div>

                {/* ── Form Body ── */}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="login-form-body">

                        <h2 className="login-welcome">
                            {role === 'patient' ? 'Welcome back 🌿' : 'Doctor Login 👨‍⚕️'}
                        </h2>
                        <p className="login-sub">
                            {role === 'patient'
                                ? 'Sign in to access your health dashboard and AI companion.'
                                : 'Sign in to access your clinical dashboard and patient records.'}
                        </p>

                        {/* Registration success message */}
                        {regSuccess && (
                            <div className="login-success-banner">✅ {regSuccess}</div>
                        )}

                        {/* Error banner */}
                        {errorMsg && (
                            <div className="login-error-banner">⚠️ {errorMsg}</div>
                        )}

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="login-email">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                placeholder={role === 'patient' ? 'patient@email.com' : 'doctor@hospital.com'}
                                value={email}
                                onChange={handleEmailChange}
                                autoComplete="email"
                                aria-invalid={!!errors.email}
                            />
                            {errors.email && <span className="field-error">{errors.email}</span>}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="login-password">Password</label>
                            <div className="pw-wrapper">
                                <input
                                    id="login-password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={handlePassChange}
                                    autoComplete="current-password"
                                    aria-invalid={!!errors.password}
                                />
                                <button
                                    type="button"
                                    className="pw-eye-btn"
                                    onClick={() => setShowPass(p => !p)}
                                    aria-label={showPass ? 'Hide password' : 'Show password'}
                                >
                                    {showPass ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && <span className="field-error">{errors.password}</span>}
                        </div>

                        {/* Remember me + Forgot */}
                        <div className="login-row">
                            <label className="remember-check">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                />
                                Remember me
                            </label>
                            <button
                                type="button"
                                className="forgot-link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
                                onClick={() => setShowForgot(true)}
                            >
                                Forgot password?
                            </button>
                        </div>
                    </div>

                    {/* ── Submit ── */}
                    <div className="login-footer">
                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading && <span className="spinner" />}
                            {loading
                                ? 'Signing in…'
                                : role === 'patient' ? 'Login as Patient 🌿' : 'Login as Doctor 👨‍⚕️'}
                        </button>

                        <p className="login-register-cta">
                            New to VaidyaMed-X?&nbsp;
                            <Link to="/register">Create an account</Link>
                        </p>
                    </div>
                </form>

                {/* ── Shloka footer ── */}
                <div className="shloka-banner">
                    <p className="shloka-text">
                        "स्वस्थस्य स्वास्थ्य रक्षणं, आतुरस्य विकार प्रशमनम्" <br />
                        <span style={{ fontSize: '0.72rem', opacity: 0.70 }}>
                            — Preserve the health of the healthy; relieve the suffering of the sick.
                        </span>
                    </p>
                </div>
            </div>

            {/* ── Forgot Password Modal ── */}
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
        </div>
    );
}
