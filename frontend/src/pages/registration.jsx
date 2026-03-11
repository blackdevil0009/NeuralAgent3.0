import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import './registration_style.css';
import { handleSuccess, handleError } from '../utils/error_handlers';

/* ─────────────────────────────────────────────
   Utility helpers
───────────────────────────────────────────── */
const calcPasswordStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-4
};

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['#e0e0e0', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60'];
const strengthWidth = ['0%', '25%', '50%', '75%', '100%'];

/* ─────────────────────────────────────────────
   Terms & Conditions text
───────────────────────────────────────────── */
const TERMS_TEXT = `
Welcome to VaidyaMed-X – an Ayurvedic AI Health Companion. By registering, you agree to:

1. Accuracy of Information: All information provided during registration is accurate, current, and complete.

2. Medical Disclaimer: VaidyaMed-X provides Ayurvedic guidance and general health information for educational purposes only. It does NOT replace professional medical diagnosis, treatment, or advice. Always consult a qualified physician or healthcare provider for medical decisions.

3. Privacy & Data: Your personal data is collected, stored, and processed as per our Privacy Policy. We never sell your data to third parties.

4. Patient Responsibility: Patients are solely responsible for following any health recommendations. VaidyaMed-X and its affiliated practitioners bear no liability for outcomes resulting from misuse of information.

5. Doctor Verification: Doctors must upload valid credentials. Providing false credentials is grounds for immediate account termination and may result in legal action.

6. Confidentiality: All consultations, medical records, and conversations on this platform are strictly confidential per applicable data protection laws.

7. Amendments: VaidyaMed-X reserves the right to update these terms. Continued use of the platform constitutes acceptance of updated terms.

8. Governing Law: These terms are governed by the laws of India and the Information Technology Act, 2000.

By checking "I agree", you confirm you have read, understood, and accepted all of the above terms.
`.trim();

/* ─────────────────────────────────────────────
   Patient Form
───────────────────────────────────────────── */
function PatientForm({ onSubmit, loading }) {
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        mobile: '',
        dob: '',
        gender: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        password: '',
        confirmPass: '',
        termsAgreed: false,
    });

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

    const validate = () => {
        const errs = {};
        const phoneRe = /^[6-9]\d{9}$/;
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
        if (!emailRe.test(form.email)) errs.email = 'Enter a valid email address.';
        if (!phoneRe.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number.';
        if (!form.dob) errs.dob = 'Date of birth is required.';
        if (!form.gender) errs.gender = 'Please select a gender.';
        if (!form.address.trim()) errs.address = 'Address is required.';
        if (!form.city.trim()) errs.city = 'City is required.';
        if (!form.state) errs.state = 'Please select a state.';
        if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.';

        if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
        if (form.confirmPass !== form.password) errs.confirmPass = 'Passwords do not match.';
        if (!form.termsAgreed) errs.termsAgreed = 'You must accept the terms & conditions.';

        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        onSubmit({ role: 'patient', ...form });
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            <div className="reg-form-body">

                {/* ── Personal Info ── */}
                <h3 className="reg-section-title"><span>🌿</span> Personal Information</h3>
                <div className="reg-grid">
                    <div className="form-group full-col">
                        <label htmlFor="p-fullName">Full Name *</label>
                        <input
                            id="p-fullName" type="text" name="fullName"
                            placeholder="e.g. Arjun Sharma"
                            value={form.fullName} onChange={handleChange}
                            aria-invalid={!!errors.fullName}
                        />
                        {errors.fullName && <span className="field-error">{errors.fullName}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-email">Email Address *</label>
                        <input
                            id="p-email" type="email" name="email"
                            placeholder="example@email.com"
                            value={form.email} onChange={handleChange}
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-mobile">Mobile Number *</label>
                        <input
                            id="p-mobile" type="tel" name="mobile"
                            placeholder="10-digit mobile number"
                            maxLength={10}
                            value={form.mobile} onChange={handleChange}
                            aria-invalid={!!errors.mobile}
                        />
                        {errors.mobile && <span className="field-error">{errors.mobile}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-dob">Date of Birth *</label>
                        <input
                            id="p-dob" type="date" name="dob"
                            value={form.dob} onChange={handleChange}
                            aria-invalid={!!errors.dob}
                            max={new Date().toISOString().split('T')[0]}
                        />
                        {errors.dob && <span className="field-error">{errors.dob}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-gender">Gender *</label>
                        <select id="p-gender" name="gender" value={form.gender} onChange={handleChange}
                            aria-invalid={!!errors.gender}>
                            <option value="">-- Select Gender --</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                            <option value="prefer_not">Prefer not to say</option>
                        </select>
                        {errors.gender && <span className="field-error">{errors.gender}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Address ── */}
                <h3 className="reg-section-title"><span>🏡</span> Address Details</h3>
                <div className="reg-grid">
                    <div className="form-group full-col">
                        <label htmlFor="p-address">Street Address *</label>
                        <textarea
                            id="p-address" name="address"
                            placeholder="House No., Street, Locality…"
                            value={form.address} onChange={handleChange}
                            aria-invalid={!!errors.address}
                            rows={2}
                        />
                        {errors.address && <span className="field-error">{errors.address}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-city">City *</label>
                        <input
                            id="p-city" type="text" name="city"
                            placeholder="Your city"
                            value={form.city} onChange={handleChange}
                            aria-invalid={!!errors.city}
                        />
                        {errors.city && <span className="field-error">{errors.city}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-state">State *</label>
                        <select id="p-state" name="state" value={form.state} onChange={handleChange}
                            aria-invalid={!!errors.state}>
                            <option value="">-- Select State --</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.state && <span className="field-error">{errors.state}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-pincode">PIN Code *</label>
                        <input
                            id="p-pincode" type="text" name="pincode"
                            placeholder="6-digit PIN"
                            maxLength={6}
                            value={form.pincode} onChange={handleChange}
                            aria-invalid={!!errors.pincode}
                        />
                        {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Security ── */}
                <h3 className="reg-section-title"><span>🔒</span> Security</h3>
                <div className="reg-grid">
                    <div className="form-group">
                        <label htmlFor="p-password">Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="p-password" type={showPass ? 'text' : 'password'}
                                name="password" placeholder="Min. 8 characters"
                                value={form.password} onChange={handleChange}
                                aria-invalid={!!errors.password}
                                style={{ paddingRight: '42px' }}
                            />
                            <button type="button" className="pw-eye" onClick={() => setShowPass(p => !p)}
                                aria-label="Toggle password visibility"
                                style={eyeStyle}>{showPass ? '🙈' : '👁️'}</button>
                        </div>
                        <div className="pw-strength-bar">
                            <div className="pw-strength-fill" style={{
                                width: strengthWidth[pwStrength],
                                background: strengthColor[pwStrength]
                            }} />
                        </div>
                        {form.password && (
                            <span className="pw-hint">Strength: <strong>{strengthLabel[pwStrength]}</strong></span>
                        )}
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="p-confirmPass">Confirm Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="p-confirmPass" type={showConfirm ? 'text' : 'password'}
                                name="confirmPass" placeholder="Re-enter password"
                                value={form.confirmPass} onChange={handleChange}
                                aria-invalid={!!errors.confirmPass}
                                style={{ paddingRight: '42px' }}
                            />
                            <button type="button" className="pw-eye" onClick={() => setShowConfirm(p => !p)}
                                aria-label="Toggle confirm password visibility"
                                style={eyeStyle}>{showConfirm ? '🙈' : '👁️'}</button>
                        </div>
                        {errors.confirmPass && <span className="field-error">{errors.confirmPass}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Terms & Conditions ── */}
                <h3 className="reg-section-title"><span>📜</span> Terms &amp; Conditions</h3>
                <div className="terms-box">{TERMS_TEXT}</div>
                <label className="terms-check">
                    <input
                        type="checkbox" name="termsAgreed"
                        checked={form.termsAgreed} onChange={handleChange}
                    />
                    <span>I have read and agree to the <a href="#terms">Terms &amp; Conditions</a> and <a href="#privacy">Privacy Policy</a>.</span>
                </label>
                {errors.termsAgreed && <span className="field-error" style={{ display: 'block', marginTop: 4 }}>{errors.termsAgreed}</span>}
            </div>

            {/* ── Submit ── */}
            <div className="reg-footer">
                <button type="submit" className="btn-submit" disabled={loading}>
                    {loading && <span className="spinner" />}
                    {loading ? 'Registering…' : 'Register as Patient 🌿'}
                </button>
                <p className="reg-redirect">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </form>
    );
}

/* ─────────────────────────────────────────────
   Doctor Form
───────────────────────────────────────────── */
function DoctorForm({ onSubmit, loading }) {
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        mobile: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        degree: '',
        position: '',
        specialization: '',
        experience: '',
        hospital: '',
        regNumber: '',
        password: '',
        confirmPass: '',
        termsAgreed: false,
    });

    const [docFile, setDocFile] = useState(null);
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
                setErrors(prev => ({ ...prev, docFile: 'Only PDF, JPG, or PNG allowed.' }));
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setErrors(prev => ({ ...prev, docFile: 'File size must be under 5 MB.' }));
                return;
            }
            setDocFile(file);
            setErrors(prev => ({ ...prev, docFile: '' }));
        }
    };

    const validate = () => {
        const errs = {};
        const phoneRe = /^[6-9]\d{9}$/;
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!form.fullName.trim()) errs.fullName = 'Full name is required.';
        if (!emailRe.test(form.email)) errs.email = 'Enter a valid email address.';
        if (!phoneRe.test(form.mobile)) errs.mobile = 'Enter a valid 10-digit mobile number.';
        if (!form.address.trim()) errs.address = 'Address is required.';
        if (!form.city.trim()) errs.city = 'City is required.';
        if (!form.state) errs.state = 'Please select a state.';
        if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Enter a valid 6-digit PIN code.';
        if (!form.degree.trim()) errs.degree = 'Doctorate degree is required.';
        if (!form.position.trim()) errs.position = 'Position/Designation is required.';
        if (!form.specialization.trim()) errs.specialization = 'Specialization is required.';
        if (!form.experience || isNaN(form.experience) || +form.experience < 0)
            errs.experience = 'Enter valid years of experience.';
        if (!form.regNumber.trim()) errs.regNumber = 'Medical registration number is required.';
        if (!docFile) errs.docFile = 'Please upload your degree/marksheet document.';
        if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
        if (form.confirmPass !== form.password) errs.confirmPass = 'Passwords do not match.';
        if (!form.termsAgreed) errs.termsAgreed = 'You must accept the terms & conditions.';

        return errs;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        const payload = new FormData();
        Object.entries({ role: 'doctor', ...form }).forEach(([k, v]) => payload.append(k, v));
        payload.append('document', docFile);
        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
            <div className="reg-form-body">

                {/* ── Personal Info ── */}
                <h3 className="reg-section-title"><span>👨‍⚕️</span> Personal Information</h3>
                <div className="reg-grid">
                    <div className="form-group full-col">
                        <label htmlFor="d-fullName">Full Name *</label>
                        <input
                            id="d-fullName" type="text" name="fullName"
                            placeholder="Dr. Full Name"
                            value={form.fullName} onChange={handleChange}
                            aria-invalid={!!errors.fullName}
                        />
                        {errors.fullName && <span className="field-error">{errors.fullName}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-email">Email Address *</label>
                        <input
                            id="d-email" type="email" name="email"
                            placeholder="doctor@hospital.com"
                            value={form.email} onChange={handleChange}
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && <span className="field-error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-mobile">Mobile Number *</label>
                        <input
                            id="d-mobile" type="tel" name="mobile"
                            placeholder="10-digit mobile number"
                            maxLength={10}
                            value={form.mobile} onChange={handleChange}
                            aria-invalid={!!errors.mobile}
                        />
                        {errors.mobile && <span className="field-error">{errors.mobile}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Address ── */}
                <h3 className="reg-section-title"><span>🏥</span> Address Details</h3>
                <div className="reg-grid">
                    <div className="form-group full-col">
                        <label htmlFor="d-address">Clinic / Hospital Address *</label>
                        <textarea
                            id="d-address" name="address"
                            placeholder="Building, Street, Locality…"
                            value={form.address} onChange={handleChange}
                            aria-invalid={!!errors.address}
                            rows={2}
                        />
                        {errors.address && <span className="field-error">{errors.address}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-city">City *</label>
                        <input id="d-city" type="text" name="city"
                            placeholder="City" value={form.city} onChange={handleChange}
                            aria-invalid={!!errors.city}
                        />
                        {errors.city && <span className="field-error">{errors.city}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-state">State *</label>
                        <select id="d-state" name="state" value={form.state} onChange={handleChange}
                            aria-invalid={!!errors.state}>
                            <option value="">-- Select State --</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {errors.state && <span className="field-error">{errors.state}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-pincode">PIN Code *</label>
                        <input id="d-pincode" type="text" name="pincode"
                            placeholder="6-digit PIN" maxLength={6}
                            value={form.pincode} onChange={handleChange}
                            aria-invalid={!!errors.pincode}
                        />
                        {errors.pincode && <span className="field-error">{errors.pincode}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Professional Info ── */}
                <h3 className="reg-section-title"><span>🎓</span> Professional Details</h3>
                <div className="reg-grid">
                    <div className="form-group">
                        <label htmlFor="d-degree">Doctorate Degree *</label>
                        <input id="d-degree" type="text" name="degree"
                            placeholder="e.g. MBBS, MD, BAMS, BHMS"
                            value={form.degree} onChange={handleChange}
                            aria-invalid={!!errors.degree}
                        />
                        {errors.degree && <span className="field-error">{errors.degree}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-position">Position / Designation *</label>
                        <input id="d-position" type="text" name="position"
                            placeholder="e.g. Senior Consultant, Vaidya"
                            value={form.position} onChange={handleChange}
                            aria-invalid={!!errors.position}
                        />
                        {errors.position && <span className="field-error">{errors.position}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-specialization">Specialization *</label>
                        <input id="d-specialization" type="text" name="specialization"
                            placeholder="e.g. Ayurveda, Cardiology, Pediatrics"
                            value={form.specialization} onChange={handleChange}
                            aria-invalid={!!errors.specialization}
                        />
                        {errors.specialization && <span className="field-error">{errors.specialization}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-experience">Years of Experience *</label>
                        <input id="d-experience" type="number" name="experience"
                            placeholder="e.g. 5" min="0" max="60"
                            value={form.experience} onChange={handleChange}
                            aria-invalid={!!errors.experience}
                        />
                        {errors.experience && <span className="field-error">{errors.experience}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-hospital">Hospital / Clinic Name</label>
                        <input id="d-hospital" type="text" name="hospital"
                            placeholder="Where do you practice?"
                            value={form.hospital} onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-regNumber">Medical Reg. Number *</label>
                        <input id="d-regNumber" type="text" name="regNumber"
                            placeholder="e.g. MCI-XXXXXX"
                            value={form.regNumber} onChange={handleChange}
                            aria-invalid={!!errors.regNumber}
                        />
                        {errors.regNumber && <span className="field-error">{errors.regNumber}</span>}
                    </div>

                    {/* File Upload */}
                    <div className="form-group full-col">
                        <label>Upload Degree / Marksheet *</label>
                        <div className="file-upload-wrapper">
                            <label className="file-upload-label" htmlFor="d-docFile">
                                <span className="upload-icon">📄</span>
                                <span>{docFile ? 'Change Document' : 'Choose File (PDF / JPG / PNG, max 5 MB)'}</span>
                            </label>
                            <input
                                id="d-docFile" type="file" name="docFile"
                                className="file-upload-input"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                        </div>
                        {docFile && (
                            <p className="file-name-display">✅ Selected: {docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</p>
                        )}
                        {errors.docFile && <span className="field-error">{errors.docFile}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Security ── */}
                <h3 className="reg-section-title"><span>🔒</span> Security</h3>
                <div className="reg-grid">
                    <div className="form-group">
                        <label htmlFor="d-password">Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="d-password" type={showPass ? 'text' : 'password'}
                                name="password" placeholder="Min. 8 characters"
                                value={form.password} onChange={handleChange}
                                aria-invalid={!!errors.password}
                                style={{ paddingRight: '42px' }}
                            />
                            <button type="button" onClick={() => setShowPass(p => !p)}
                                aria-label="Toggle password" style={eyeStyle}>
                                {showPass ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <div className="pw-strength-bar">
                            <div className="pw-strength-fill" style={{
                                width: strengthWidth[pwStrength],
                                background: strengthColor[pwStrength]
                            }} />
                        </div>
                        {form.password && (
                            <span className="pw-hint">Strength: <strong>{strengthLabel[pwStrength]}</strong></span>
                        )}
                        {errors.password && <span className="field-error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="d-confirmPass">Confirm Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="d-confirmPass" type={showConfirm ? 'text' : 'password'}
                                name="confirmPass" placeholder="Re-enter password"
                                value={form.confirmPass} onChange={handleChange}
                                aria-invalid={!!errors.confirmPass}
                                style={{ paddingRight: '42px' }}
                            />
                            <button type="button" onClick={() => setShowConfirm(p => !p)}
                                aria-label="Toggle confirm password" style={eyeStyle}>
                                {showConfirm ? '🙈' : '👁️'}
                            </button>
                        </div>
                        {errors.confirmPass && <span className="field-error">{errors.confirmPass}</span>}
                    </div>
                </div>

                <hr className="reg-divider" />

                {/* ── Terms ── */}
                <h3 className="reg-section-title"><span>📜</span> Terms &amp; Conditions</h3>
                <div className="terms-box">{TERMS_TEXT}</div>
                <label className="terms-check">
                    <input type="checkbox" name="termsAgreed"
                        checked={form.termsAgreed} onChange={handleChange}
                    />
                    <span>
                        I have read and agree to the <a href="#terms">Terms &amp; Conditions</a> and <a href="#privacy">Privacy Policy</a>.
                        I confirm all credentials provided are genuine.
                    </span>
                </label>
                {errors.termsAgreed && <span className="field-error" style={{ display: 'block', marginTop: 4 }}>{errors.termsAgreed}</span>}
            </div>

            {/* ── Submit ── */}
            <div className="reg-footer">
                <button type="submit" className="btn-submit" disabled={loading}>
                    {loading && <span className="spinner" />}
                    {loading ? 'Registering…' : 'Register as Doctor 👨‍⚕️'}
                </button>
                <p className="reg-redirect">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
            </div>
        </form>
    );
}

/* ─────────────────────────────────────────────
   Eye-toggle button style (inline for portability)
───────────────────────────────────────────── */
const eyeStyle = {
    position: 'absolute', right: '12px', top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '1rem', lineHeight: 1, padding: 0,
};

/* ─────────────────────────────────────────────
   Indian States List
───────────────────────────────────────────── */
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* ─────────────────────────────────────────────
   Main Registration Page Component
───────────────────────────────────────────── */
export default function Registration() {
    const [activeTab, setActiveTab] = useState('patient'); // 'patient' | 'doctor'
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (data) => {
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const isFormData = data instanceof FormData;
            const res = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                body: isFormData ? data : JSON.stringify(data),
                headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.data?.message || 'Registration failed. Please try again.');

            handleSuccess('🎉 Registration successful! Redirecting to login…');
            setTimeout(() => navigate('/login'), 2200);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reg-page">
            {/* Floating leaf decorations */}
            <div className="leaf leaf-1" />
            <div className="leaf leaf-2" />
            <div className="leaf leaf-3" />
            <div className="leaf leaf-4" />
            <div className="leaf leaf-5" />

            <div className="reg-container">
                {/* ── Header ── */}
                <div className="reg-header">
                    <div className="reg-logo">🌿 VaidyaMed-X</div>
                    <p className="reg-tagline">Ayurvedic AI Health Companion — आरोग्यं परमं भाग्यम्</p>
                </div>

                {/* ── Tab Toggle ── */}
                <div className="reg-tabs">
                    <button
                        type="button"
                        className={`reg-tab-btn ${activeTab === 'patient' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('patient'); setErrorMsg(''); setSuccessMsg(''); }}
                    >
                        🌿 Patient
                    </button>
                    <button
                        type="button"
                        className={`reg-tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('doctor'); setErrorMsg(''); setSuccessMsg(''); }}
                    >
                        👨‍⚕️ Doctor
                    </button>
                </div>

                {/* ── Banner Messages ── */}
                {errorMsg && (
                    <div className="form-error-banner" style={{ margin: '16px 40px 0' }}>
                        ⚠️ {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div className="form-error-banner"
                        style={{ margin: '16px 40px 0', background: '#eafaf1', borderColor: '#a9dfbf', color: '#1e8449' }}>
                        {successMsg}
                    </div>
                )}

                {/* ── Render Active Form ── */}
                {activeTab === 'patient'
                    ? <PatientForm onSubmit={handleSubmit} loading={loading} />
                    : <DoctorForm onSubmit={handleSubmit} loading={loading} />
                }
            </div>
        </div>
    );
}
