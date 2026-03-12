import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './login_style.css';
import { handleSuccess, handleError } from '../utils/error_handlers';
import { API_BASE_URL } from '../utils/config';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!token) {
            setErrorMsg('Invalid or missing reset token.');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.data?.message || json.error || 'Failed to reset password.');
            }

            handleSuccess('Password Reset successfully! You can now log in.');
            navigate('/login');
        } catch (err) {
            handleError(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                    <p className="login-tagline">Set New Password</p>
                    <span className="login-lotus">🪷</span>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="login-form-body">
                        <h2 className="login-welcome">Reset Password</h2>
                        <p className="login-sub">Enter your new secure password below.</p>

                        {errorMsg && (
                            <div className="login-error-banner">⚠️ {errorMsg}</div>
                        )}

                        {!token && (
                            <div className="login-error-banner">⚠️ Warning: No reset token detected in URL.</div>
                        )}

                        <div className="form-group">
                            <label htmlFor="new-password">New Password</label>
                            <input
                                id="new-password"
                                type="password"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm-password">Confirm Password</label>
                            <input
                                id="confirm-password"
                                type="password"
                                placeholder="Retype password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="login-footer">
                        <button type="submit" className="btn-login" disabled={loading || !token}>
                            {loading && <span className="spinner" />}
                            {loading ? 'Reseting…' : 'Reset Password'}
                        </button>
                    </div>
                </form>

                <div className="shloka-banner">
                    <p className="shloka-text">
                        "स्वस्थस्य स्वास्थ्य रक्षणं, आतुरस्य विकार प्रशमनम्" <br />
                        <span style={{ fontSize: '0.72rem', opacity: 0.70 }}>
                            — Preserve the health of the healthy; relieve the suffering of the sick.
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
