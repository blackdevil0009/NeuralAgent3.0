import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleSuccess, handleError } from '../../utils/error_handlers';

export default function HospitalVerify() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const email = searchParams.get('email') || '';

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Auto-focus first input
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, []);

    const handleDigit = (index, value) => {
        if (!/^\d?$/.test(value)) return; // only digits
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        // Auto-advance to next field
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
        if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const newCode = [...code];
        pasted.split('').forEach((d, i) => { if (i < 6) newCode[i] = d; });
        setCode(newCode);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            handleError('Please enter the complete 6-digit code.');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-registration-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: fullCode, role: 'organization' }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Invalid code. Please try again.');

            handleSuccess('✅ Email verified! You can now log in.');
            navigate('/hospital/login');
        } catch (err) {
            handleError(err);
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: 'organization' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Failed to resend.');
            handleSuccess('A new verification code has been sent to your email.');
        } catch (err) {
            handleError(err);
        } finally {
            setResending(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Background blobs */}
            <div style={{ ...styles.blob, top: '-120px', left: '-100px' }} />
            <div style={{ ...styles.blob, bottom: '-100px', right: '-80px', width: 420, height: 420, background: 'rgba(45,106,79,0.12)' }} />

            <div style={styles.card}>
                {/* Logo */}
                <Link to="/" style={styles.logo}>🌿 VaidyaMed-X</Link>

                {/* Icon */}
                <div style={styles.iconCircle}>
                    <span style={{ fontSize: '2.4rem' }}>📧</span>
                </div>

                <h1 style={styles.title}>Check Your Email</h1>
                <p style={styles.sub}>
                    We sent a 6-digit verification code to:
                    <br />
                    <strong style={{ color: '#1b4332' }}>{email || 'your official email'}</strong>
                </p>

                <form onSubmit={handleSubmit}>
                    {/* 6-digit input boxes */}
                    <div style={styles.codeRow} onPaste={handlePaste}>
                        {code.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => inputRefs.current[i] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleDigit(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                style={{
                                    ...styles.codeInput,
                                    borderColor: digit ? '#2d6a4f' : '#cbd5e1',
                                    background: digit ? '#f0fdf4' : '#fff',
                                }}
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.join('').length !== 6}
                        style={{
                            ...styles.btnPrimary,
                            opacity: loading || code.join('').length !== 6 ? 0.6 : 1,
                            cursor: loading || code.join('').length !== 6 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? '⏳ Verifying...' : '✅ Verify & Continue'}
                    </button>
                </form>

                <div style={styles.resendRow}>
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Didn't receive the code? </span>
                    <button
                        onClick={handleResend}
                        disabled={resending}
                        style={styles.resendBtn}
                    >
                        {resending ? 'Sending...' : 'Resend Code'}
                    </button>
                </div>

                <Link to="/hospital/register" style={styles.backLink}>
                    ← Back to Registration
                </Link>

                {/* Shloka */}
                <div style={styles.shloka}>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>
                        "आरोग्यं परमं भाग्यं" — Health is the supreme fortune
                    </p>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #52b788 100%)',
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
        background: 'rgba(255,255,255,0.07)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
    },
    card: {
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderRadius: '28px',
        padding: '52px 44px',
        maxWidth: '460px',
        width: '100%',
        boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
    },
    logo: {
        display: 'inline-block',
        fontSize: '1.25rem',
        fontWeight: 800,
        color: '#1b4332',
        marginBottom: '28px',
        textDecoration: 'none',
        letterSpacing: '-0.3px',
    },
    iconCircle: {
        width: '88px',
        height: '88px',
        borderRadius: '50%',
        border: '3px solid #2d6a4f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        background: 'rgba(45,106,79,0.08)',
    },
    title: {
        fontSize: '1.7rem',
        fontWeight: 800,
        color: '#1b4332',
        margin: '0 0 10px',
        fontFamily: "'Playfair Display', serif",
    },
    sub: {
        fontSize: '0.95rem',
        color: '#555',
        margin: '0 0 30px',
        lineHeight: 1.7,
    },
    codeRow: {
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '28px',
    },
    codeInput: {
        width: '52px',
        height: '60px',
        borderRadius: '12px',
        border: '2px solid #cbd5e1',
        textAlign: 'center',
        fontSize: '1.6rem',
        fontWeight: 700,
        color: '#1b4332',
        outline: 'none',
        transition: 'all 0.2s',
    },
    btnPrimary: {
        width: '100%',
        padding: '15px',
        background: 'linear-gradient(135deg, #1b4332, #2d6a4f)',
        color: '#fff',
        border: 'none',
        borderRadius: '14px',
        fontSize: '1.05rem',
        fontWeight: 700,
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(27,67,50,0.3)',
        transition: 'transform 0.2s',
    },
    resendRow: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
    },
    resendBtn: {
        background: 'none',
        border: 'none',
        color: '#2d6a4f',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: 'pointer',
        padding: 0,
        textDecoration: 'underline',
    },
    backLink: {
        display: 'block',
        color: '#64748b',
        fontSize: '0.88rem',
        textDecoration: 'none',
        marginBottom: '28px',
    },
    shloka: {
        borderTop: '1px solid #e8f5e9',
        paddingTop: '16px',
        fontSize: '0.78rem',
        color: '#2d6a4f',
        fontStyle: 'italic',
        lineHeight: 1.7,
    },
};
