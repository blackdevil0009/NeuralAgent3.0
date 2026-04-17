import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import { handleSuccess, handleError } from '../utils/error_handlers';
import LocationPicker from '../components/LocationPicker';
import Header from '../components/header';
import Footer from '../components/footer';
import './registration_style.css'; // We'll override some styles for indigo theme

/* ─────────────────────────────────────────────
   Utility helpers
   ───────────────────────────────────────────── */
const calcPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
};

const strengthColor = ['#e0e0e0', '#e74c3c', '#e67e22', '#f1c40f', '#2d6a4f'];
const strengthWidth = ['0%', '25%', '50%', '75%', '100%'];

export default function OrganizationRegistration() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        hospitalName: '',
        adminName: '',
        email: '',
        mobile: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        regNumber: '',
        hospitalType: '',
        password: '',
        confirmPass: '',
        termsAgreed: false,
    });

    const [licenseFile, setLicenseFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [pwStrength, setPwStrength] = useState(0);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setForm(prev => ({ ...prev, [name]: val }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (name === 'password') setPwStrength(calcPasswordStrength(value));
    }, [errors]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
            if (!allowed.includes(file.type)) {
                setErrors(prev => ({ ...prev, licenseFile: 'Only PDF, JPG, or PNG allowed.' }));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, licenseFile: 'File size must be under 5 MB.' }));
                return;
            }
            setLicenseFile(file);
            setErrors(prev => ({ ...prev, licenseFile: '' }));
        }
    };

    const validate = () => {
        const errs = {};
        const phoneRe = /^[6-9]\d{9}$/;
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!form.hospitalName.trim()) errs.hospitalName = 'Hospital/Organization name is required.';
        if (!form.adminName.trim()) errs.adminName = 'Admin name is required.';
        if (!emailRe.test(form.email)) errs.email = 'Enter a valid official email.';
        if (!phoneRe.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number.';

        if (!form.address.trim() || form.address.length < 5) errs.address = 'Address must be at least 5 characters.';
        // city/state/pincode are auto-filled by LocationPicker - only validate if user skips autocomplete
        if (form.pincode && !/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.';

        if (!form.regNumber.trim()) errs.regNumber = 'Registration Number is required.';
        if (!form.hospitalType) errs.hospitalType = 'Select organization type.';
        // License file is optional - hospital can upload later

        if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
        if (form.confirmPass !== form.password) errs.confirmPass = 'Passwords do not match.';
        if (!form.termsAgreed) errs.termsAgreed = 'You must accept the terms & conditions.';

        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { 
            setErrors(errs); 
            // Better UX: scroll to first error
            const firstErr = Object.keys(errs)[0];
            const el = document.getElementsByName(firstErr)[0];
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
            return; 
        }

        setLoading(true);
        try {
            const payload = new FormData();
            Object.entries({ role: 'organization', ...form }).forEach(([k, v]) => payload.append(k, v));
            payload.append('document', licenseFile);

            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                body: payload,
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Registration failed.');

            handleSuccess('🎉 Registration successful! Please check your email for the 6-digit verification code.');
            navigate(`/hospital/verify?email=${encodeURIComponent(form.email)}`);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="registration-page organization-theme" style={{ position: 'relative', background: '#f8fafc' }}>
            {/* Minimal Auth Header */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '30px', zIndex: 10 }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <span style={{ fontSize: '1.8rem' }}>🌿</span>
                    <span style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', fontWeight: '800', color: '#1b4332' }}>VaidyaMed-X</span>
                </Link>
            </div>

            <div className="reg-page-standalone" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 80px' }}>
                <div className="reg-container standalone-card" style={{ width: '100%', maxWidth: '850px', margin: '0 auto', background: '#fff', borderRadius: '32px', boxShadow: '0 40px 100px rgba(0,0,0,0.12)', borderTop: '8px solid #2d6a4f', overflow: 'hidden', zIndex: 5 }}>
                    
                    <div className="reg-header-org" style={{ background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)', padding: '40px', textAlign: 'center', color: '#fff' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🏥</div>
                        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.2rem', marginBottom: '8px' }}>Hospital Registration</h1>
                        <p style={{ opacity: 0.9, fontSize: '1rem' }}>Join the VaidyaMed-X Digital Healthcare Network</p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate style={{ padding: '40px' }}>
                        <div className="reg-section">
                            <h3 style={{ color: '#2d6a4f', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>🏢</span> Organization Profile
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group" style={{ gridColumn: '1 / span 2' }}>
                                    <label>Hospital / Clinic Name *</label>
                                    <input type="text" name="hospitalName" value={form.hospitalName} onChange={handleChange} placeholder="Legal name as per license" style={{ borderColor: '#cbd5e1' }} />
                                    {errors.hospitalName && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.hospitalName}</span>}
                                </div>
                                <div className="form-group">
                                    <label>License / Registration Number *</label>
                                    <input type="text" name="regNumber" value={form.regNumber} onChange={handleChange} placeholder="e.g. MH/2023/123" />
                                    {errors.regNumber && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.regNumber}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Type of Facility *</label>
                                    <select name="hospitalType" value={form.hospitalType} onChange={handleChange} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                        <option value="">-- Select --</option>
                                        <option value="private">Private Multi-specialty</option>
                                        <option value="govt">Government / Public</option>
                                        <option value="clinic">specialized Clinic</option>
                                        <option value="ayurvedic">Ayurvedic Hospital</option>
                                    </select>
                                    {errors.hospitalType && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.hospitalType}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="reg-section" style={{ marginTop: '40px' }}>
                            <h3 style={{ color: '#2d6a4f', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>👤</span> Admin Contact
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Admin Full Name *</label>
                                    <input type="text" name="adminName" value={form.adminName} onChange={handleChange} placeholder="Primary point of contact" />
                                    {errors.adminName && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.adminName}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Official Email *</label>
                                    <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="admin@hospital.com" />
                                    {errors.email && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.email}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Official Mobile *</label>
                                    <input type="tel" name="mobile" value={form.mobile} onChange={handleChange} placeholder="10-digit mobile number" maxLength={10} />
                                    {errors.mobile && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.mobile}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="reg-section" style={{ marginTop: '40px' }}>
                            <h3 style={{ color: '#2d6a4f', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>📍</span> Physical Address
                            </h3>
                            <div className="form-group">
                                <label>Street Address *</label>
                                <LocationPicker 
                                    value={form.address} 
                                    onChange={val => setForm(p => ({ ...p, address: val }))}
                                    onSelect={({ city, state, pincode }) => setForm(p => ({ ...p, city, state, pincode }))}
                                />
                                {errors.address && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.address}</span>}
                            </div>
                        </div>

                        <div className="reg-section" style={{ marginTop: '40px' }}>
                            <h3 style={{ color: '#2d6a4f', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>📜</span> Documents
                            </h3>
                            <div className="form-group">
                                <label>Upload Hospital License (PDF/Image) *</label>
                                <div style={{ border: '2px dashed #2d6a4f', padding: '30px', borderRadius: '12px', textAlign: 'center', background: '#f8fafc', position: 'relative' }}>
                                    <input type="file" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                                    <div style={{ pointerEvents: 'none' }}>
                                        <span style={{ fontSize: '2rem' }}>📁</span>
                                        <p style={{ margin: '10px 0', color: '#64748b' }}>{licenseFile ? licenseFile.name : 'Click or drop file here'}</p>
                                    </div>
                                </div>
                                {errors.licenseFile && <span className="field-error" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{errors.licenseFile}</span>}
                            </div>
                        </div>

                        <div className="reg-section" style={{ marginTop: '40px' }}>
                            <h3 style={{ color: '#2d6a4f', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>🔒</span> Security
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className="form-group">
                                    <label>Admin Password *</label>
                                    <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} />
                                    <div style={{ height: '4px', background: '#e2e8f0', marginTop: '5px', borderRadius: '2px' }}>
                                        <div style={{ height: '100%', width: strengthWidth[pwStrength], background: strengthColor[pwStrength], borderRadius: '2px', transition: '0.3s' }} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Confirm Password *</label>
                                    <input type={showConfirm ? 'text' : 'password'} name="confirmPass" value={form.confirmPass} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '30px' }}>
                            <label style={{ display: 'flex', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                                <input type="checkbox" name="termsAgreed" checked={form.termsAgreed} onChange={handleChange} style={{ marginTop: '3px' }} />
                                <span>I agree to the VaidyaMed-X Organization Terms & HIPAA Privacy Standards.</span>
                            </label>
                            {errors.termsAgreed && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '5px' }}>{errors.termsAgreed}</p>}
                        </div>

                        <button 
                            type="submit"
                            className="btn-hero-primary" 
                            style={{ width: '100%', marginTop: '40px', background: '#1b4332', fontSize: '1.1rem', padding: '16px', cursor: 'pointer' }} 
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Complete Organization Registration'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <Link to="/hospital/login" style={{ color: '#2d6a4f', fontWeight: '600', textDecoration: 'none' }}>Already registered? Login here</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
