import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

export default function DoctorInvite() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';
    const mode = searchParams.get('mode') || '';
    const emailFromQuery = searchParams.get('email') || '';

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [invite, setInvite] = useState(null);
    const [otp, setOtp] = useState('');
    const [otpEmail, setOtpEmail] = useState(emailFromQuery);
    const [step, setStep] = useState(mode === 'verify' ? 'verify_registration' : 'summary');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showDecisionModal, setShowDecisionModal] = useState(false);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        const fetchStatus = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/v2/doctor/invite/status?token=${encodeURIComponent(token)}`);
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.data?.message || 'Invalid invitation.');
                }
                const data = json.data || {};
                setInvite(data);
                if (!otpEmail && data.email) {
                    setOtpEmail(data.email);
                }
            } catch (err) {
                handleError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, [token, otpEmail]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const persistDoctorSession = (responseData) => {
        localStorage.setItem('token', responseData.token);
        localStorage.setItem('refresh_token', responseData.refresh_token || '');
        localStorage.setItem('role', responseData.role || 'doctor');
        if (responseData.user) localStorage.setItem('user', JSON.stringify(responseData.user));
        handleSuccess('Invitation accepted. Welcome doctor.');
        navigate('/doctor/profile');
    };

    const acceptInvitation = async () => {
        if (!token) return;
        setAccepting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v2/doctor/invite/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.data?.message || 'Failed to accept invitation.');
            }

            const data = json.data || {};
            if (data.status === '2fa_required') {
                setStep('verify_2fa');
                setOtp('');
                setOtpEmail(data.email || invite?.email || otpEmail);
                return;
            }
            if (data.token) {
                persistDoctorSession(data);
                return;
            }
            handleSuccess(data.message || 'Invitation accepted.');
        } catch (err) {
            handleError(err);
        } finally {
            setAccepting(false);
        }
    };

    const rejectInvitation = async () => {
        if (!token) return;
        setAccepting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/v2/doctor/invite/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Failed to reject invitation.');
            handleSuccess(json.data?.message || 'Invitation rejected.');
            setShowDecisionModal(false);
            navigate('/login');
        } catch (err) {
            handleError(err);
        } finally {
            setAccepting(false);
        }
    };

    const verifyRegistrationOtp = async (e) => {
        e.preventDefault();
        if (!otpEmail || otp.length !== 6) {
            handleError('Enter your email and a valid 6-digit verification code.');
            return;
        }

        setAccepting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-registration-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail, otp, role: 'doctor' }),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.data?.message || 'Failed to verify code.');
            }
            const data = json.data || {};

            if (data.status === '2fa_required') {
                setStep('verify_2fa');
                setOtp('');
                setOtpEmail(data.email || otpEmail);
                return;
            }
            if (data.token) {
                persistDoctorSession(data);
                return;
            }
            handleSuccess('Email verified. You can now login as doctor.');
            navigate('/login', { state: { email: otpEmail } });
        } catch (err) {
            handleError(err);
        } finally {
            setAccepting(false);
        }
    };

    const verify2faOtp = async (e) => {
        e.preventDefault();
        if (!otpEmail || otp.length !== 6) {
            handleError('Enter the 6-digit 2FA code.');
            return;
        }
        setAccepting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-2fa-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail, otp, role: 'doctor' }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Invalid 2FA code.');
            const data = json.data || {};
            if (data.token) {
                persistDoctorSession(data);
            }
        } catch (err) {
            handleError(err);
        } finally {
            setAccepting(false);
        }
    };

    const resend2fa = async () => {
        if (resendCooldown > 0 || !otpEmail) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/resend-2fa-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: otpEmail }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Failed to resend code.');
            handleSuccess(json.data?.message || '2FA code sent.');
            setResendCooldown(60);
        } catch (err) {
            handleError(err);
        }
    };

    if (!token) {
        return (
            <div style={{ maxWidth: 620, margin: '80px auto', padding: 24 }}>
                <h2>Invalid invitation link</h2>
                <p>No invitation token found.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ maxWidth: 620, margin: '80px auto', padding: 24 }}>
                <h2>Validating invitation...</h2>
            </div>
        );
    }

    if (!invite) {
        return (
            <div style={{ maxWidth: 620, margin: '80px auto', padding: 24 }}>
                <h2>Invitation unavailable</h2>
                <p>This invitation is invalid or expired.</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 16px' }}>
            <div style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
                <h1 style={{ marginTop: 0, color: '#1b4332' }}>Doctor Invitation</h1>
                <p style={{ color: '#475569' }}>
                    <strong>{invite.hospitalName}</strong> invited <strong>{invite.email}</strong> to join their hospital dashboard.
                </p>

                {step === 'summary' && (
                    <>
                        {invite.isAlreadyAttached ? (
                            <div style={{ padding: 14, borderRadius: 10, background: '#ecfdf5', color: '#166534' }}>
                                This doctor is already attached to this hospital.
                            </div>
                        ) : invite.requiresRegistration ? (
                            <>
                                <div style={{ padding: 14, borderRadius: 10, background: '#fff7ed', color: '#9a3412', marginBottom: 16 }}>
                                    No doctor account found for this email. Register first, then verify to auto-attach hospital.
                                </div>
                                <Link
                                    to={`/register?tab=doctor&inviteToken=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`}
                                    style={{ display: 'inline-block', padding: '12px 18px', borderRadius: 10, background: '#1b4332', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
                                >
                                    Register Doctor Account
                                </Link>
                            </>
                        ) : !invite.isEmailVerified ? (
                            <>
                                <div style={{ padding: 14, borderRadius: 10, background: '#fef2f2', color: '#991b1b', marginBottom: 16 }}>
                                    Doctor account exists but email is not verified.
                                </div>
                                <button
                                    onClick={() => {
                                        setStep('verify_registration');
                                        setOtpEmail(invite.email);
                                    }}
                                    style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#1b4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Verify and Continue
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setShowDecisionModal(true)}
                                disabled={accepting}
                                style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#1b4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                            >
                                Review Request
                            </button>
                        )}
                    </>
                )}

                {step === 'verify_registration' && (
                    <form onSubmit={verifyRegistrationOtp} style={{ marginTop: 18 }}>
                        <h3>Email Verification</h3>
                        <p style={{ color: '#64748b' }}>Enter the 6-digit registration verification code.</p>
                        <input
                            type="email"
                            value={otpEmail}
                            onChange={(e) => setOtpEmail(e.target.value)}
                            placeholder="doctor email"
                            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}
                        />
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit code"
                            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #cbd5e1', letterSpacing: '6px', fontSize: '1.2rem', textAlign: 'center' }}
                        />
                        <button type="submit" disabled={accepting} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#1b4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                            {accepting ? 'Verifying...' : 'Verify and Complete'}
                        </button>
                    </form>
                )}

                {step === 'verify_2fa' && (
                    <form onSubmit={verify2faOtp} style={{ marginTop: 18 }}>
                        <h3>2FA Verification</h3>
                        <p style={{ color: '#64748b' }}>Enter the 6-digit 2FA code sent to {otpEmail}.</p>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit 2FA code"
                            style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #cbd5e1', letterSpacing: '6px', fontSize: '1.2rem', textAlign: 'center' }}
                        />
                        <button type="submit" disabled={accepting} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#1b4332', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                            {accepting ? 'Verifying...' : 'Verify 2FA and Login'}
                        </button>
                        <div style={{ marginTop: 12 }}>
                            <button type="button" onClick={resend2fa} disabled={resendCooldown > 0} style={{ background: 'none', border: 'none', color: '#2d6a4f', textDecoration: 'underline', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer' }}>
                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend 2FA Code'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {showDecisionModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15,23,42,0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 16,
                }}>
                    <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 14, padding: 22, boxShadow: '0 20px 60px rgba(15,23,42,0.25)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 8, color: '#1b4332' }}>Hospital Request</h3>
                        <p style={{ marginTop: 0, color: '#475569', lineHeight: 1.5 }}>
                            <strong>{invite.hospitalName}</strong> requested to attach your doctor account.
                            Please choose accept or reject.
                        </p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                            <button
                                type="button"
                                onClick={() => setShowDecisionModal(false)}
                                style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={rejectInvitation}
                                disabled={accepting}
                                style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#b91c1c', color: '#fff', cursor: 'pointer' }}
                            >
                                {accepting ? 'Please wait...' : 'Reject'}
                            </button>
                            <button
                                type="button"
                                onClick={acceptInvitation}
                                disabled={accepting}
                                style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#1b4332', color: '#fff', cursor: 'pointer' }}
                            >
                                {accepting ? 'Accepting...' : 'Accept'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
