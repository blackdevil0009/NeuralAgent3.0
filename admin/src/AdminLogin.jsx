import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email, password: form.password })
            });
            const json = await res.json();
            const token = json.data?.access_token || json.data?.token;
            if (!res.ok || !token) {
                setError(json.data?.message || json.error || 'Login failed.');
                return;
            }
            const role = json.data?.user?.role;
            if (role !== 'admin') {
                setError('Access denied. This portal is for administrators only.');
                return;
            }
            localStorage.setItem('adm_token', token);
            localStorage.setItem('adm_user', JSON.stringify(json.data.user));
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError('Connection error. Please check your network.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="adm-login-wrap">
            <div className="adm-login-card">
                <div className="adm-login-logo">
                    <span className="adm-login-logo-icon">🌿</span>
                    <div className="adm-login-logo-text">VaidyaMed-X</div>
                    <div className="adm-login-subtitle">Admin Control Panel</div>
                </div>

                {error && <div className="adm-login-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="adm-form-group">
                        <label className="adm-form-label">Admin Email</label>
                        <input
                            id="admin-email"
                            type="email"
                            className="adm-form-input"
                            placeholder="admin@vaidyamedx.in"
                            value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="adm-form-group">
                        <label className="adm-form-label">Password</label>
                        <input
                            id="admin-password"
                            type="password"
                            className="adm-form-input"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button type="submit" className="adm-login-btn" disabled={loading}>
                        {loading ? 'Signing in…' : '🔐 Sign In to Admin Panel'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#aaa', marginTop: 20 }}>
                    Restricted access — authorised personnel only
                </p>
            </div>
        </div>
    );
}
