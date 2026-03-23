import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../utils/config';
import { handleSuccess, handleError } from '../utils/error_handlers';

const VALID_DEGREES = [
    'MBBS','MD','MS','BDS','MDS','BAMS','BHMS','BUMS','BPT','MPT',
    'BNYS','DNB','DM','MCh','PhD','MSc','BSc Nursing','GNM','ANM',
    'D.Pharm','B.Pharm','M.Pharm','Pharm.D','DMRT','DMRD',
    'DA','DCH','DGO','DLO','DTCD','DDVL','DEM','DFM','DPM',
    'DO','DOMS','FRCS','MRCP','FRCP','FRCOG','FACS','FIACS'
];
const VALID_POSITIONS = [
    'Consultant','Senior Consultant','Resident Doctor','Junior Resident',
    'Senior Resident','Professor','Associate Professor','Assistant Professor',
    'HOD','Chief of Medicine','Vaidya','Chief Vaidya','Medical Officer',
    'General Practitioner','Specialist','Surgeon','Physician',
    'Intern','Fellow','Super Specialist','Director','CMO'
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
    'Neurosurgery','Vascular Surgery','Thoracic Surgery','Transplant Medicine'
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

const EMPTY_FORM = {
    name:'', mobile:'', address:'', city:'', state:'', pin:'',
    degree:'', position:'', specialization:'', experience:'',
    hospital:'', clinicLocation:'', regNumber:'',
    consultantFee:'', workingHours:'',
};

export default function DoctorProfile() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [email, setEmail] = useState('');
    const [verificationStatus, setVerificationStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(resp => {
                const p = resp.data || resp;
                setEmail(p.email || '');
                setVerificationStatus(p.verificationStatus || 'pending');
                setForm({
                    name: p.name || '',
                    mobile: p.mobile || '',
                    address: p.address || '',
                    city: p.city || '',
                    state: p.state || '',
                    pin: p.pin || '',
                    degree: p.degree || '',
                    position: p.position || '',
                    specialization: p.specialization || '',
                    experience: p.experience || '',
                    hospital: p.hospital || '',
                    clinicLocation: p.clinicLocation || '',
                    regNumber: p.regNumber || '',
                    consultantFee: p.consultantFee ?? 500,
                    workingHours: p.workingHours || 'Mon-Fri, 10AM-6PM',
                });
            })
            .catch(handleError)
            .finally(() => setLoading(false));
    }, []);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    }, [errors]);

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Full name is required.';
        if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile required.';
        if (!form.address.trim() || form.address.trim().length < 10) errs.address = 'Address must be at least 10 characters.';
        if (!form.city.trim()) errs.city = 'City is required.';
        if (!form.state) errs.state = 'State is required.';
        if (!form.pin || !/^\d{6}$/.test(form.pin)) errs.pin = 'Valid 6-digit PIN required.';
        if (!form.degree) errs.degree = 'Please select your degree.';
        if (!form.position) errs.position = 'Please select your position.';
        if (!form.specialization) errs.specialization = 'Please select your specialization.';
        if (!form.experience || isNaN(form.experience) || +form.experience < 0) errs.experience = 'Enter valid years of experience.';
        if (!form.hospital.trim() || form.hospital.trim().length < 3) errs.hospital = 'Hospital / Clinic name is required.';
        if (!form.clinicLocation.trim() || form.clinicLocation.trim().length < 5) errs.clinicLocation = 'Clinic location is required.';
        if (!form.regNumber.trim()) errs.regNumber = 'Medical Reg. Number is required.';
        else if (!/^[A-Z]{1,3}-?\d{5,10}$/i.test(form.regNumber.trim())) errs.regNumber = 'Format: STATE-XXXXXX (e.g. MH-123456).';
        if (!form.consultantFee || isNaN(form.consultantFee) || +form.consultantFee < 0) errs.consultantFee = 'Enter a valid consultation fee.';
        if (!form.workingHours.trim()) errs.workingHours = 'Working hours are required.';
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, consultantFee: Number(form.consultantFee), experience: String(form.experience) }),
            });
            if (!res.ok) { const j = await res.json(); throw new Error(j.data?.message || j.message || 'Save failed'); }
            handleSuccess('Profile saved successfully!');
        } catch (err) {
            handleError(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--doc-text-mute)' }}>⏳ Loading profile…</div>;

    const Field = ({ label, name, type = 'text', placeholder, children, required }) => (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--doc-text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
            </label>
            {children || (
                <input
                    type={type} name={name} value={form[name]} onChange={handleChange}
                    placeholder={placeholder}
                    aria-invalid={!!errors[name]}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: '0.92rem', background: 'var(--doc-surface)', border: `1.5px solid ${errors[name] ? '#e74c3c' : 'var(--doc-border)'}`, boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }}
                />
            )}
            {errors[name] && <div style={{ color: '#e74c3c', fontSize: '0.78rem', marginTop: 4 }}>⚠ {errors[name]}</div>}
        </div>
    );

    const selectStyle = (name) => ({
        width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: '0.92rem',
        background: 'var(--doc-surface)', border: `1.5px solid ${errors[name] ? '#e74c3c' : 'var(--doc-border)'}`,
        outline: 'none', cursor: 'pointer'
    });

    const statusColor = { pending: '#e67e22', verified: '#27ae60', rejected: '#e74c3c' };
    const statusIcon = { pending: '⏳', verified: '✅', rejected: '❌' };
    const vs = verificationStatus;

    return (
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
            {/* Header */}
            <div className="dd-header" style={{ marginBottom: 20 }}>
                <div>
                    <h1 style={{ margin: 0 }}>🩺 Edit Professional Profile</h1>
                    <p style={{ color: 'var(--doc-text-mute)', margin: '4px 0 0' }}>Update all your credentials, contact info, and practice details</p>
                </div>
                <button className="dd-btn dd-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 150, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {saving ? <><span className="spinner" />Saving…</> : '💾 Save All Changes'}
                </button>
            </div>

            {/* Verification Banner */}
            <div style={{ background: statusColor[vs] + '18', border: `1px solid ${statusColor[vs]}`, borderRadius: 10, padding: '12px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.4rem' }}>{statusIcon[vs]}</span>
                <div>
                    <strong style={{ color: statusColor[vs] }}>Credential Status: {vs.toUpperCase()}</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--doc-text-mute)', marginTop: 2 }}>
                        {vs === 'pending' && 'Your credentials are under review. You will be notified once verified.'}
                        {vs === 'verified' && 'Your credentials are verified. Your profile is live and visible to patients.'}
                        {vs === 'rejected' && 'Your credentials were rejected. Update details and contact support to re-submit.'}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* ── Personal Information ── */}
                <div className="dd-card">
                    <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>👤 Personal Information</h3>
                    <Field label="Full Name" name="name" placeholder="Dr. Full Name" required />
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--doc-text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email <span style={{ fontSize: '0.7rem', color: '#aaa' }}>(read-only)</span></label>
                        <input value={email} readOnly style={{ width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: '0.92rem', background: '#f5f5f5', border: '1.5px solid var(--doc-border)', color: '#888', boxSizing: 'border-box' }} />
                    </div>
                    <Field label="Mobile Number" name="mobile" type="tel" placeholder="10-digit mobile" required />
                </div>

                {/* ── Address ── */}
                <div className="dd-card">
                    <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🏡 Address</h3>
                    <Field label="Street Address" name="address" placeholder="House No, Street, Locality (min. 10 chars)" required />
                    <Field label="City" name="city" placeholder="Your city" required />
                    <Field label="State" name="state" required>
                        <select name="state" value={form.state} onChange={handleChange} style={selectStyle('state')}>
                            <option value="">-- Select State --</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="PIN Code" name="pin" placeholder="6-digit PIN" required />
                </div>

                {/* ── Professional Credentials ── */}
                <div className="dd-card">
                    <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🎓 Professional Credentials</h3>
                    <Field label="Degree" name="degree" required>
                        <select name="degree" value={form.degree} onChange={handleChange} style={selectStyle('degree')}>
                            <option value="">-- Select Degree --</option>
                            {VALID_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </Field>
                    <Field label="Position / Designation" name="position" required>
                        <select name="position" value={form.position} onChange={handleChange} style={selectStyle('position')}>
                            <option value="">-- Select Position --</option>
                            {VALID_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </Field>
                    <Field label="Specialization" name="specialization" required>
                        <select name="specialization" value={form.specialization} onChange={handleChange} style={selectStyle('specialization')}>
                            <option value="">-- Select Specialization --</option>
                            {VALID_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Years of Experience" name="experience" type="number" placeholder="e.g. 5" required />
                    <Field label="Medical Reg. Number" name="regNumber" placeholder="e.g. MH-123456" required />
                </div>

                {/* ── Practice Details ── */}
                <div className="dd-card">
                    <h3 style={{ marginTop: 0, marginBottom: 16, borderBottom: '1px solid var(--doc-border)', paddingBottom: 10 }}>🏥 Practice Details</h3>
                    <Field label="Hospital / Clinic Name" name="hospital" placeholder="Official name of your hospital or clinic" required />
                    <Field label="Clinic / Hospital Location" name="clinicLocation" placeholder="Area, street or locality of your clinic" required />
                    <Field label="Working Hours" name="workingHours" placeholder="e.g. Mon-Fri, 10AM-6PM" required />
                    <Field label="Consultation Fee (₹)" name="consultantFee" type="number" placeholder="e.g. 500" required />
                    <div style={{ background: 'var(--doc-surface)', border: '1px solid var(--doc-border)', borderRadius: 8, padding: 12, marginTop: 8 }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--doc-text-mute)', fontWeight: 600, marginBottom: 8 }}>CONSULTATION TYPES (all enabled)</div>
                        {['💬 Chat', '🎥 Video Call', '🏥 Offline / In-Clinic'].map(t => (
                            <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--doc-border)', fontSize: '0.87rem' }}>
                                <span>{t}</span>
                                <span style={{ background: '#e8f8ee', color: '#27ae60', fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>Active</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Save button bottom */}
            <div style={{ textAlign: 'right', marginTop: 24 }}>
                <button className="dd-btn dd-btn-primary" onClick={handleSave} disabled={saving} style={{ minWidth: 180 }}>
                    {saving ? '⏳ Saving…' : '💾 Save All Changes'}
                </button>
            </div>
        </div>
    );
}
