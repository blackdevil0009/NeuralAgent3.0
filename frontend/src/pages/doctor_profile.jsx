import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';
import { handleSuccess, handleError } from '../utils/error_handlers';

const VALID_DEGREES = [
    'MBBS','MD','MS','BDS','MDS','BAMS','BHMS','BUMS','BPT','MPT',
    'BNYS','DNB','DM','MCh','PhD','MSc','BSc Nursing','GNM','ANM',
    'D.Pharm','B.Pharm','M.Pharm','Pharm.D','DMRT','DMRD',
    'DA','DCH','DGO','DLO','DTCD','DDVL','DEM','DFM','DPM',
    'DO','DOMS','FRCS','MRCP','FRCP','FRCOG','FACS','FIACS',
];
const VALID_POSITIONS = [
    'Consultant','Senior Consultant','Resident Doctor','Junior Resident',
    'Senior Resident','Professor','Associate Professor','Assistant Professor',
    'HOD','Chief of Medicine','Vaidya','Chief Vaidya','Medical Officer',
    'General Practitioner','Specialist','Surgeon','Physician',
    'Intern','Fellow','Super Specialist','Director','CMO',
];
const VALID_SPECIALIZATIONS = [
    'Ayurveda','Allopathy','Homeopathy','Unani','Naturopathy','Yoga & Naturopathy',
    'General Medicine','General Surgery','Cardiology','Dermatology','Neurology',
    'Orthopedics','Pediatrics','Gynecology','Psychiatry','Ophthalmology',
    'ENT','Radiology','Anesthesiology','Pathology','Oncology','Nephrology',
    'Urology','Endocrinology','Gastroenterology','Pulmonology','Rheumatology',
    'Hematology','Infectious Disease','Emergency Medicine','Family Medicine',
    'Community Medicine','Geriatrics','Sports Medicine','Palliative Care',
    'Physical Medicine','Dentistry','Oral Surgery','Physiotherapy',
    'Pharmacy','Nursing','Medical Genetics','Biomedicine','Nutrition & Dietetics',
    'Neonatology','Hepatology','Interventional Cardiology','Plastic Surgery',
    'Neurosurgery','Vascular Surgery','Thoracic Surgery','Transplant Medicine',
];
const INDIAN_STATES = [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
    'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
    'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
    'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
    'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
    'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const EMPTY = {
    name:'', mobile:'', address:'', city:'', state:'', pin:'',
    degree:'', position:'', specialization:'', experience:'',
    hospital:'', clinicLocation:'', regNumber:'',
    consultantFee:'', workingHours:'',
    upiId: '', bankAccountDetails: '',
    bankAccountName: '', bankAccountNumber: '', bankIfsc: '',
};

/* ── Shared style helpers ── */
const cardStyle = { background: 'var(--doc-surface,#fff)', border: '1px solid var(--doc-border,#e8eaed)', borderRadius: 14, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };
const labelStyle = { fontSize: '0.72rem', fontWeight: 700, color: 'var(--doc-text-mute,#888)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, display: 'block' };
const valueStyle = { fontSize: '0.95rem', color: 'var(--doc-text,#1a1a2e)', fontWeight: 500, wordBreak: 'break-word' };
const mutedVal = { ...valueStyle, color: '#bbb', fontStyle: 'italic' };
const inputStyle = (err) => ({ width: '100%', boxSizing: 'border-box', padding: '9px 13px', borderRadius: 8, fontSize: '0.9rem', background: 'var(--doc-surface,#fff)', border: `1.5px solid ${err ? '#e74c3c' : 'var(--doc-border,#dde)'}`, outline: 'none' });
const errorStyle = { color: '#e74c3c', fontSize: '0.76rem', marginTop: 3 };

const statusMeta = {
    pending:  { color: '#e67e22', icon: '⏳', text: 'Your credentials are under review. You will be notified once verified.' },
    verified: { color: '#27ae60', icon: '✅', text: 'Your credentials are verified. Your profile is live and visible to patients.' },
    rejected: { color: '#e74c3c', icon: '❌', text: 'Your credentials were rejected. Update and contact support to re-submit.' },
};

/* ── Extracted Field Component to prevent input unmounting ── */
const Field = ({ label, name, type = 'text', placeholder, children, req, form, handleChange, errors }) => (
    <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>{label} {req && <span style={{ color: '#e74c3c' }}>*</span>}</label>
        {children || (
            <input type={type} name={name} value={form[name] || ''} onChange={handleChange}
                placeholder={placeholder} aria-invalid={!!errors[name]}
                style={inputStyle(errors[name])} />
        )}
        {errors[name] && <div style={errorStyle}>⚠ {errors[name]}</div>}
    </div>
);

export default function DoctorProfile() {
    const [profile, setProfile]   = useState(null);
    const [form, setForm]         = useState(EMPTY);
    const [email, setEmail]       = useState('');
    const [vs, setVs]             = useState('pending');
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [errors, setErrors]     = useState({});
    const [payoutVerified, setPayoutVerified] = useState(false);
    const [ifscInfo, setIfscInfo] = useState(null);
    const [ifscLoading, setIfscLoading] = useState(false);
    const [upiValid, setUpiValid] = useState(null);
    const navigate = useNavigate();

    const fetchProfile = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async r => {
                if (r.status === 401) {
                    localStorage.clear();
                    sessionStorage.clear();
                    navigate('/login');
                    throw new Error('Session expired. Please log in again.');
                }
                return r.json();
            })
            .then(resp => {
                const p = resp.data || resp;
                setProfile(p);
                setEmail(p.email || '');
                setVs(p.verificationStatus || 'pending');
                setForm({
                    name:          p.name || '',
                    mobile:        p.mobile || '',
                    address:       p.address || '',
                    city:          p.city || '',
                    state:         p.state || '',
                    pin:           p.pin || '',
                    degree:        p.degree || '',
                    position:      p.position || '',
                    specialization:p.specialization || '',
                    experience:    p.experience || '',
                    hospital:      p.hospital || '',
                    clinicLocation:p.clinicLocation || '',
                    regNumber:     p.regNumber || '',
                    consultantFee: p.consultantFee ?? 500,
                    workingHours:  p.workingHours || 'Mon-Fri, 10AM-6PM',
                    upiId:         p.upiId || '',
                    bankAccountDetails: p.bankAccountDetails || '',
                    bankAccountName: p.bankAccountName || '',
                    bankAccountNumber: p.bankAccountNumber || '',
                    bankIfsc: p.bankIfsc || '',
                });
                setPayoutVerified(!!p.payoutVerified);
            })
            .catch(handleError)
            .finally(() => setLoading(false));
    };

    useEffect(fetchProfile, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    }, [errors]);

    // IFSC lookup on blur
    const handleIfscBlur = useCallback(async (e) => {
        const code = e.target.value.trim().toUpperCase();
        if (code.length !== 11) { setIfscInfo(null); return; }
        setIfscLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/utils/ifsc/${code}`);
            const json = await res.json();
            if (res.ok) setIfscInfo(json.data || json);
            else setIfscInfo({ error: 'IFSC not found' });
        } catch { setIfscInfo({ error: 'Lookup failed' }); }
        finally { setIfscLoading(false); }
    }, []);

    // UPI format validation
    const handleUpiBlur = useCallback((e) => {
        const val = e.target.value.trim();
        setUpiValid(val ? /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/.test(val) : null);
    }, []);

    const validate = () => {
        const errs = {};
        if (!form.name.trim())                                              errs.name = 'Full name is required.';
        if (!/^[6-9]\d{9}$/.test(form.mobile))                             errs.mobile = 'Valid 10-digit mobile required.';
        if (!form.address.trim() || form.address.trim().length < 5)        errs.address = 'Address is required.';
        if (!form.city.trim())                                              errs.city = 'City is required.';
        if (!form.state)                                                    errs.state = 'State is required.';
        if (!form.pin || !/^\d{6}$/.test(form.pin))                        errs.pin = 'Valid 6-digit PIN required.';
        if (!form.degree)                                                   errs.degree = 'Degree is required.';
        if (!form.position)                                                 errs.position = 'Position is required.';
        if (!form.specialization)                                           errs.specialization = 'Specialization is required.';
        if (!form.experience || isNaN(form.experience))                     errs.experience = 'Experience is required.';
        if (!form.hospital.trim() || form.hospital.trim().length < 3)      errs.hospital = 'Hospital name is required.';
        if (!form.clinicLocation.trim() || form.clinicLocation.trim().length < 5) errs.clinicLocation = 'Clinic location is required.';
        if (!form.regNumber.trim())                                         errs.regNumber = 'Medical Reg. Number is required.';
        else if (!/^[A-Z]{1,3}-?\d{5,10}$/i.test(form.regNumber.trim()))   errs.regNumber = 'Format: STATE-XXXXXX (e.g. MH-123456).';
        if (!form.consultantFee || isNaN(form.consultantFee))               errs.consultantFee = 'Enter a valid fee.';
        if (!form.workingHours.trim())                                      errs.workingHours = 'Working hours are required.';
        if (!form.upiId.trim())                                            errs.upiId = 'UPI ID is mandatory for payouts.';
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            console.log("Saving doctor profile payload:", { ...form, consultantFee: Number(form.consultantFee), experience: String(form.experience) });
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, consultantFee: Number(form.consultantFee), experience: String(form.experience) }),
            });
            const j = await res.json();
            if (!res.ok) { 
                if (j.data?.details) {
                    console.error("Backend Validation Errors:", j.data.details);
                    setErrors(j.data.details);
                    throw new Error(j.data.message || 'Validation failed');
                }
                throw new Error(j.data?.message || j.message || 'Save failed'); 
            }
            handleSuccess('Profile saved! A UPI confirmation email has been sent if your UPI changed.');
            setProfile(f => ({ ...f, ...form }));
            setEditMode(false);
        } catch (err) {
            handleError(err);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset form to current profile values and go back to view
        if (profile) {
            setForm({
                name: profile.name || '', mobile: profile.mobile || '',
                address: profile.address || '', city: profile.city || '',
                state: profile.state || '', pin: profile.pin || '',
                degree: profile.degree || '', position: profile.position || '',
                specialization: profile.specialization || '', experience: profile.experience || '',
                hospital: profile.hospital || '', clinicLocation: profile.clinicLocation || '',
                regNumber: profile.regNumber || '', consultantFee: profile.consultantFee ?? 500,
                workingHours: profile.workingHours || 'Mon-Fri, 10AM-6PM',
            });
        }
        setErrors({});
        setEditMode(false);
    };

    const handleRequestPayoutVerification = async () => {
        if (!form.upiId) {
            handleError('Please provide and save your UPI ID before requesting verification.');
            return;
        }
        
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/doctor/verify-upi`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json',
                    'X-HMAC-Signature': 'DEV_BYPASS',
                    'X-Timestamp': Math.floor(Date.now() / 1000).toString()
                },
                body: JSON.stringify({ upiId: form.upiId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate verification.');

            handleSuccess('Verification payout initiated! Please check your UPI account for ₹1.');
            setPayoutVerified(false); 
        } catch (err) {
            handleError(err);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--doc-text-mute)' }}>⏳ Loading profile…</div>;
    if (!profile) return <div style={{ textAlign: 'center', padding: 60, color: '#e74c3c' }}>❌ Failed to load profile.</div>;

    const sm = statusMeta[vs] || statusMeta.pending;
    const fullAddr = [profile.address, profile.city, profile.state, profile.pin].filter(Boolean).join(', ');

    /* ════════════════════════════════════════════
       VIEW MODE (static, read-only)
    ════════════════════════════════════════════ */
    if (!editMode) {
        const Info = ({ label, value }) => (
            <div style={{ marginBottom: 14 }}>
                <span style={labelStyle}>{label}</span>
                <span style={value ? valueStyle : mutedVal}>{value || 'Not set'}</span>
            </div>
        );
        return (
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
                {/* Header */}
                <div className="dd-header" style={{ marginBottom: 20 }}>
                    <div>
                        <h1 style={{ margin: 0 }}>🩺 Professional Profile</h1>
                        <p style={{ color: 'var(--doc-text-mute)', margin: '4px 0 0' }}>
                            Your credentials and practice details
                        </p>
                    </div>
                    <button className="dd-btn dd-btn-primary" onClick={() => setEditMode(true)}>
                        ✏️ Edit Profile
                    </button>
                </div>

                {/* Verification banner */}
                <div style={{ background: sm.color + '18', border: `1px solid ${sm.color}`, borderRadius: 10, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.4rem' }}>{sm.icon}</span>
                    <div>
                        <strong style={{ color: sm.color }}>Credential Status: {vs.toUpperCase()}</strong>
                        <div style={{ fontSize: '0.82rem', color: 'var(--doc-text-mute)', marginTop: 2 }}>{sm.text}</div>
                    </div>
                </div>

                {/* Doctor identity card at top */}
                <div style={{ ...cardStyle, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#27ae60,#1abc9c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0 }}>
                        👨‍⚕️
                    </div>
                    <div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--doc-text)' }}>
                            {profile.name ? `Dr. ${profile.name}` : 'Your Name'}
                        </div>
                        <div style={{ color: 'var(--doc-text-mute)', fontSize: '0.9rem', marginTop: 2 }}>
                            {[profile.position, profile.specialization].filter(Boolean).join(' · ') || 'Position & Specialization'}
                        </div>
                        <div style={{ color: 'var(--doc-text-mute)', fontSize: '0.85rem', marginTop: 2 }}>
                            {profile.hospital || 'Hospital / Clinic'}
                            {profile.clinicLocation ? ` — ${profile.clinicLocation}` : ''}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#27ae60' }}>
                            ₹{profile.consultantFee ?? 500}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)' }}>Consultation Fee</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>
                            🕐 {profile.workingHours || '—'}
                        </div>
                    </div>
                </div>

                {/* Grid of info cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>👤 Personal Details</h3>
                        <Info label="Email" value={email} />
                        <Info label="Mobile" value={profile.mobile} />
                        <Info label="Address" value={fullAddr} />
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🎓 Credentials</h3>
                        <Info label="Degree" value={profile.degree} />
                        <Info label="Specialization" value={profile.specialization} />
                        <Info label="Experience" value={profile.experience ? `${profile.experience} years` : null} />
                        <Info label="Medical Reg. No." value={profile.regNumber} />
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🏥 Practice</h3>
                        <Info label="Hospital / Clinic" value={profile.hospital} />
                        <Info label="Clinic Location" value={profile.clinicLocation} />
                        <Info label="Working Hours" value={profile.workingHours} />
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>💸 Payout Details</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ ...labelStyle, marginBottom: 0 }}>Verification Status</span>
                            <span style={{ 
                                background: profile.payoutVerified ? '#e8f8ee' : '#fff4e5', 
                                color: profile.payoutVerified ? '#27ae60' : '#d35400', 
                                fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20, border: '1px solid currentColor' 
                            }}>
                                {profile.payoutVerified ? 'Verified' : 'Unverified'}
                            </span>
                        </div>
                        <Info label="UPI ID" value={profile.upiId} />
                        <Info label="Account Holder" value={profile.bankAccountName} />
                        <Info label="Account Number" value={profile.bankAccountNumber} />
                        <Info label="IFSC Code" value={profile.bankIfsc} />
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>📅 Consultation Types</h3>
                        {['💬 Chat Consultation', '🏥 Offline / In-Clinic'].map(t => (
                            <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--doc-border)', fontSize: '0.88rem' }}>
                                <span>{t}</span>
                                <span style={{ background: '#e8f8ee', color: '#27ae60', fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /* ════════════════════════════════════════════
       EDIT MODE (full editable form)
    ════════════════════════════════════════════ */
    const sel = (name) => ({ name, value: form[name], onChange: handleChange, style: inputStyle(errors[name]) });
    const fProps = { form, handleChange, errors }; // Shared props for Field

    return (
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
            {/* Header */}
            <div className="dd-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ margin: 0 }}>✏️ Edit Profile</h1>
                    <p style={{ color: 'var(--doc-text-mute)', margin: '4px 0 0' }}>Update your credentials and practice details</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="dd-btn dd-btn-outline" onClick={handleCancel} disabled={saving}>✖ Cancel</button>
                    <button className="dd-btn dd-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 140 }}>
                        {saving ? '⏳ Saving…' : '💾 Save Changes'}
                    </button>
                </div>
            </div>

            {/* Verification banner */}
            <div style={{ background: sm.color + '18', border: `1px solid ${sm.color}`, borderRadius: 10, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.4rem' }}>{sm.icon}</span>
                <div>
                    <strong style={{ color: sm.color }}>Credential Status: {vs.toUpperCase()}</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--doc-text-mute)', marginTop: 2 }}>{sm.text}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Personal */}
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>👤 Personal Information</h3>
                    <Field label="Full Name" name="name" placeholder="Dr. Full Name" req {...fProps} />
                    <div style={{ marginBottom: 16 }}>
                        <label style={labelStyle}>Email <span style={{ color: '#aaa', textTransform: 'none', fontSize: '0.7rem' }}>(read-only)</span></label>
                        <input value={email} readOnly style={{ ...inputStyle(false), background: '#f5f5f5', color: '#999' }} />
                    </div>
                    <Field label="Mobile" name="mobile" type="tel" placeholder="10-digit mobile" req {...fProps} />
                </div>

                {/* Address */}
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🏡 Address</h3>
                    <Field label="Street Address" name="address" placeholder="House, Street, Locality" req {...fProps} />
                    <Field label="City" name="city" placeholder="City" req {...fProps} />
                    <Field label="State" name="state" req {...fProps}>
                        <select {...sel('state')} style={{ ...inputStyle(errors.state), cursor: 'pointer' }}>
                            <option value="">-- Select State --</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="PIN Code" name="pin" placeholder="6-digit PIN" req {...fProps} />
                </div>

                {/* Credentials */}
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🎓 Professional Credentials</h3>
                    <Field label="Degree" name="degree" req {...fProps}>
                        <select {...sel('degree')} style={{ ...inputStyle(errors.degree), cursor: 'pointer' }}>
                            <option value="">-- Select Degree --</option>
                            {VALID_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </Field>
                    <Field label="Position / Designation" name="position" req {...fProps}>
                        <select {...sel('position')} style={{ ...inputStyle(errors.position), cursor: 'pointer' }}>
                            <option value="">-- Select Position --</option>
                            {VALID_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </Field>
                    <Field label="Specialization" name="specialization" req {...fProps}>
                        <select {...sel('specialization')} style={{ ...inputStyle(errors.specialization), cursor: 'pointer' }}>
                            <option value="">-- Select Specialization --</option>
                            {VALID_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Years of Experience" name="experience" type="number" placeholder="e.g. 5" req {...fProps} />
                    <Field label="Medical Reg. Number" name="regNumber" placeholder="e.g. MH-123456" req {...fProps} />
                </div>

                {/* Practice */}
                <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.95rem', borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🏥 Practice Details</h3>
                    <Field label="Hospital / Clinic Name" name="hospital" placeholder="Official name" req {...fProps} />
                    <Field label="Clinic / Hospital Location" name="clinicLocation" placeholder="Area, street, locality" req {...fProps} />
                    <Field label="Working Hours" name="workingHours" placeholder="e.g. Mon-Fri, 10AM-6PM" req {...fProps} />
                    <Field label="Consultation Fee (₹)" name="consultantFee" type="number" placeholder="e.g. 500" req {...fProps} />
                </div>

                {/* Payout */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>
                        <h3 style={{ margin: 0, fontSize: '0.95rem' }}>💸 Payout & Financial Details</h3>
                        {!profile.payoutVerified && (
                             <button className="dd-btn dd-btn-outline" style={{ fontSize: '0.7rem', padding: '4px 12px' }} onClick={handleRequestPayoutVerification}>
                                 Verify Credentials
                             </button>
                        )}
                    </div>
                    
                    <Field label="UPI ID" name="upiId" placeholder="e.g. yourname@ybl" req {...fProps}>
                        <input
                            type="text"
                            name="upiId"
                            value={form.upiId || ''}
                            onChange={handleChange}
                            onBlur={handleUpiBlur}
                            placeholder="e.g. yourname@ybl"
                            style={{ ...inputStyle(errors.upiId), borderColor: upiValid === false ? '#e74c3c' : upiValid === true ? '#27ae60' : undefined }}
                        />
                        {upiValid === true && <div style={{ color: '#27ae60', fontSize: '0.76rem', marginTop: 3 }}>✅ Valid UPI format</div>}
                        {upiValid === false && <div style={{ color: '#e74c3c', fontSize: '0.76rem', marginTop: 3 }}>⚠ Invalid UPI format (e.g. name@ybl)</div>}
                    </Field>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                        <Field label="Bank Account Holder Name" name="bankAccountName" placeholder="As per bank passbook" {...fProps} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <Field label="Account Number" name="bankAccountNumber" placeholder="Account Number" {...fProps} />
                            <Field label="IFSC Code" name="bankIfsc" placeholder="e.g. HDFC0001234" {...fProps}>
                                <input
                                    type="text"
                                    name="bankIfsc"
                                    value={form.bankIfsc || ''}
                                    onChange={e => { handleChange(e); setIfscInfo(null); }}
                                    onBlur={handleIfscBlur}
                                    placeholder="11-char IFSC (auto-lookup)"
                                    style={{ ...inputStyle(errors.bankIfsc), textTransform: 'uppercase' }}
                                    maxLength={11}
                                />
                                {ifscLoading && <div style={{ color: '#888', fontSize: '0.76rem', marginTop: 3 }}>🔍 Looking up...</div>}
                                {ifscInfo && !ifscInfo.error && (
                                    <div style={{ background: '#e8f8ee', border: '1px solid #27ae60', borderRadius: 6, padding: '6px 10px', marginTop: 4, fontSize: '0.78rem', color: '#1a5c2e' }}>
                                        🏦 <b>{ifscInfo.bank}</b> — {ifscInfo.branch}<br/>
                                        📍 {ifscInfo.city}, {ifscInfo.state}
                                    </div>
                                )}
                                {ifscInfo?.error && <div style={{ color: '#e74c3c', fontSize: '0.76rem', marginTop: 3 }}>⚠ {ifscInfo.error}</div>}
                            </Field>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)', marginTop: 10, padding: '10px 15px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #eee' }}>
                        💡 <strong>Note:</strong> UPI ID is mandatory. Structured bank details are highly recommended for faster settlements.
                    </div>
                </div>
            </div>

            {/* Bottom save */}
            <div style={{ textAlign: 'right', marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button className="dd-btn dd-btn-outline" onClick={handleCancel} disabled={saving}>✖ Cancel</button>
                <button className="dd-btn dd-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 160 }}>
                    {saving ? '⏳ Saving…' : '💾 Save Changes'}
                </button>
            </div>
        </div>
    );
}
