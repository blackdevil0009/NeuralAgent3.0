import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // 'verifying' | 'success' | 'already' | 'error' | 'invalid'
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(5);

    /* ── Call backend to verify the token ── */
    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('invalid');
            setMessage('No verification token was found in this link.');
            return;
        }

        const doVerify = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`
                );
                const json = await res.json();
                const payload = json.data || json;

                if (res.ok) {
                    const msg = payload.message || '';
                    if (msg.toLowerCase().includes('already')) {
                        setStatus('already');
                        setMessage('Your email is already verified. Please log in.');
                    } else {
                        setStatus('success');
                        setMessage(msg || 'Email verified successfully! You can now log in.');
                    }
                } else {
                    setStatus('error');
                    setMessage(payload.error || 'This verification link is invalid or has expired.');
                }
            } catch (_) {
                setStatus('error');
                setMessage('Network error. Please check your connection and try again.');
            }
        };

        doVerify();
    }, [searchParams]);

    /* ── Countdown then redirect to /login on success / already-verified ── */
    useEffect(() => {
        if (status !== 'success' && status !== 'already') return;
        if (countdown === 0) {
            navigate('/login', {
                state: {
                    verified: true,
                    message: '✅ Email verified! You can now log in.',
                },
                replace: true,
            });
            return;
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [status, countdown, navigate]);

    /* ── Helpers ── */
    const icon   = { verifying: '⏳', success: '✅', already: '✅', error: '❌', invalid: '🔗' };
    const colour = { verifying: '#52b788', success: '#52b788', already: '#40916c', error: '#e63946', invalid: '#e9c46a' };

    return (
        <div style={styles.page}>
            {/* Animated background blobs */}
            <div style={{ ...styles.blob, top: '-100px', left: '-80px', background: 'rgba(82,183,136,0.18)' }} />
            <div style={{ ...styles.blob, bottom: '-80px', right: '-60px', background: 'rgba(64,145,108,0.15)', width: 420, height: 420 }} />

            <div style={styles.card}>
                {/* Logo */}
                <div style={styles.logo}>🌿 VaidyaMed-X</div>

                {/* Status Icon */}
                <div style={{ ...styles.iconCircle, borderColor: colour[status] }}>
                    <span style={{ fontSize: '2.4rem' }}>{icon[status]}</span>
                </div>

                {/* Title */}
                <h1 style={styles.title}>
                    {status === 'verifying' && 'Verifying Your Email…'}
                    {status === 'success'   && 'Email Verified!'}
                    {status === 'already'   && 'Already Verified!'}
                    {status === 'error'     && 'Verification Failed'}
                    {status === 'invalid'   && 'Invalid Link'}
                </h1>

                {/* Description */}
                {status === 'verifying' ? (
                    <div style={styles.spinnerWrap}>
                        <div style={styles.spinner} />
                        <p style={styles.sub}>Please wait while we confirm your email address…</p>
                    </div>
                ) : (
                    <p style={{ ...styles.sub, color: colour[status] === '#e63946' ? '#e63946' : '#444' }}>
                        {message}
                    </p>
                )}

                {/* Countdown redirect info */}
                {(status === 'success' || status === 'already') && (
                    <div style={styles.redirectBanner}>
                        <span>Redirecting to Login in </span>
                        <strong style={{ color: '#52b788' }}>{countdown}s</strong>…
                    </div>
                )}

                {/* Action buttons */}
                <div style={styles.btnGroup}>
                    {(status === 'success' || status === 'already') && (
                        <Link to="/login" style={styles.btnPrimary}>
                            Login Now →
                        </Link>
                    )}
                    {(status === 'error' || status === 'invalid') && (
                        <>
                            <Link to="/login" style={styles.btnPrimary}>
                                Go to Login
                            </Link>
                            <Link to="/register" style={styles.btnSecondary}>
                                Register Again
                            </Link>
                        </>
                    )}
                </div>

                {/* Shloka footer */}
                <div style={styles.shloka}>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>
                        "स्वस्थस्य स्वास्थ्य रक्षणं, आतुरस्य विकार प्रशमनम्"
                    </p>
                    <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.65, marginTop: 4 }}>
                        — Preserve health; relieve suffering
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ── Inline styles (no extra CSS file needed) ── */
const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #d8f3dc 0%, #b7e4c7 40%, #74c69d 100%)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        padding: '20px',
    },
    blob: {
        position: 'absolute',
        width: 380,
        height: 380,
        borderRadius: '50%',
        filter: 'blur(60px)',
        pointerEvents: 'none',
    },
    card: {
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
    },
    logo: {
        fontSize: '1.3rem',
        fontWeight: 700,
        color: '#1b4332',
        marginBottom: '28px',
        letterSpacing: '-0.5px',
    },
    iconCircle: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        border: '3px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        background: 'rgba(52,168,83,0.07)',
    },
    title: {
        fontSize: '1.55rem',
        fontWeight: 700,
        color: '#1b4332',
        margin: '0 0 12px',
    },
    sub: {
        fontSize: '0.95rem',
        color: '#555',
        margin: '0 0 20px',
        lineHeight: 1.6,
    },
    spinnerWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
    },
    spinner: {
        width: 36,
        height: 36,
        border: '4px solid #d8f3dc',
        borderTop: '4px solid #52b788',
        borderRadius: '50%',
        animation: 'spin 0.9s linear infinite',
    },
    redirectBanner: {
        background: '#d8f3dc',
        border: '1px solid #b7e4c7',
        borderRadius: '10px',
        padding: '10px 18px',
        fontSize: '0.9rem',
        color: '#1b4332',
        marginBottom: '22px',
    },
    btnGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '28px',
    },
    btnPrimary: {
        display: 'block',
        background: 'linear-gradient(135deg, #52b788, #40916c)',
        color: '#fff',
        textDecoration: 'none',
        borderRadius: '12px',
        padding: '13px 20px',
        fontWeight: 600,
        fontSize: '0.95rem',
        transition: 'opacity 0.2s',
    },
    btnSecondary: {
        display: 'block',
        background: 'transparent',
        border: '2px solid #52b788',
        color: '#2d6a4f',
        textDecoration: 'none',
        borderRadius: '12px',
        padding: '11px 20px',
        fontWeight: 500,
        fontSize: '0.95rem',
    },
    shloka: {
        borderTop: '1px solid #e8f5e9',
        paddingTop: '16px',
        fontSize: '0.78rem',
        color: '#52b788',
        fontStyle: 'italic',
    },
};

/* Inject spinner keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('ve-spin')) {
    const s = document.createElement('style');
    s.id = 've-spin';
    s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
}
