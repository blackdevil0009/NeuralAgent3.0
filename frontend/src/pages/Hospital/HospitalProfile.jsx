import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d8e0ea',
    borderRadius: '10px',
    boxSizing: 'border-box',
};

const cardStyle = {
    background: '#fff',
    borderRadius: '18px',
    border: '1px solid #e7edf4',
    padding: '22px',
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.04)',
};

export default function HospitalProfile() {
    const [hospital, setHospital] = useState({
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
    });
    const [summary, setSummary] = useState({});
    const [recentCases, setRecentCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.data?.message || 'Failed to load hospital profile.');

                const data = json?.data || {};
                setHospital({
                    hospitalName: data.hospitalName || data.name || '',
                    adminName: data.adminName || '',
                    email: data.email || '',
                    mobile: data.mobile || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    pincode: data.pincode || data.pin || '',
                    regNumber: data.regNumber || '',
                    hospitalType: data.hospitalType || '',
                });
                setSummary(data.emergencySummary || {});
                setRecentCases(data.recentEmergencyCases || []);
            } catch (err) {
                handleError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(hospital),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.data?.message || 'Failed to update facility profile.');

            const data = json?.data || {};
            setHospital({
                hospitalName: data.hospitalName || data.name || '',
                adminName: data.adminName || '',
                email: data.email || '',
                mobile: data.mobile || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                pincode: data.pincode || data.pin || '',
                regNumber: data.regNumber || '',
                hospitalType: data.hospitalType || '',
            });
            setSummary(data.emergencySummary || {});
            setRecentCases(data.recentEmergencyCases || []);
            localStorage.setItem('user', JSON.stringify(data));
            handleSuccess('Facility profile updated successfully.');
        } catch (err) {
            handleError(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Loading facility profile...</div>;
    }

    return (
        <div className="h-profile-page">
            <div style={{ display: 'grid', gap: '24px' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{ margin: 0, fontWeight: 800 }}>Facility Profile</h1>
                            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
                                Registered hospital data, emergency capacity, and primary admin contact.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: '12px', flex: 1, minWidth: '320px' }}>
                            <SummaryCard label="Total Cases" value={summary.totalCases || 0} color="#1d4ed8" />
                            <SummaryCard label="Pending" value={summary.pendingCases || 0} color="#d97706" />
                            <SummaryCard label="Doctors" value={summary.registeredDoctors || 0} color="#15803d" />
                        </div>
                    </div>
                </div>

                <div style={cardStyle}>
                    <div className="h-section-title" style={{ marginBottom: '18px' }}>
                        <span>Facility Details</span>
                    </div>

                    <form onSubmit={handleUpdate}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                            <Field label="Hospital Name">
                                <input
                                    type="text"
                                    value={hospital.hospitalName}
                                    onChange={(e) => setHospital({ ...hospital, hospitalName: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Admin Name">
                                <input
                                    type="text"
                                    value={hospital.adminName}
                                    onChange={(e) => setHospital({ ...hospital, adminName: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Registration Number">
                                <input type="text" value={hospital.regNumber} disabled style={{ ...inputStyle, background: '#f8fafc' }} />
                            </Field>
                            <Field label="Facility Type">
                                <select
                                    value={hospital.hospitalType}
                                    onChange={(e) => setHospital({ ...hospital, hospitalType: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="private">Private</option>
                                    <option value="govt">Government</option>
                                    <option value="clinic">Clinic</option>
                                    <option value="ayurvedic">Ayurvedic</option>
                                </select>
                            </Field>
                            <Field label="Email">
                                <input type="email" value={hospital.email} disabled style={{ ...inputStyle, background: '#f8fafc' }} />
                            </Field>
                            <Field label="Mobile">
                                <input
                                    type="tel"
                                    value={hospital.mobile}
                                    onChange={(e) => setHospital({ ...hospital, mobile: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="Address">
                                <input
                                    type="text"
                                    value={hospital.address}
                                    onChange={(e) => setHospital({ ...hospital, address: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="City">
                                <input
                                    type="text"
                                    value={hospital.city}
                                    onChange={(e) => setHospital({ ...hospital, city: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="State">
                                <input
                                    type="text"
                                    value={hospital.state}
                                    onChange={(e) => setHospital({ ...hospital, state: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                            <Field label="PIN Code">
                                <input
                                    type="text"
                                    value={hospital.pincode}
                                    onChange={(e) => setHospital({ ...hospital, pincode: e.target.value })}
                                    style={inputStyle}
                                />
                            </Field>
                        </div>

                        <button
                            className="h-nav-item active"
                            style={{ border: 'none', cursor: 'pointer', marginTop: '24px', padding: '14px 40px', fontSize: '1rem' }}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                <div style={cardStyle}>
                    <div className="h-section-title" style={{ marginBottom: '18px' }}>
                        <span>Recent Emergency Cases</span>
                    </div>
                    {recentCases.length === 0 ? (
                        <p style={{ color: '#64748b', margin: 0 }}>No hospital emergency cases have been logged yet.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {recentCases.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        border: '1px solid #e6edf5',
                                        borderRadius: '14px',
                                        padding: '16px',
                                        background: '#fbfdff',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.patientName || 'Patient'}</div>
                                            <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
                                                {item.caseType || 'urgent'} • {item.providerName || hospital.hospitalName || 'Hospital Emergency Desk'}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                                            {item.status || 'pending'}
                                            {item.assignedDoctorName ? ` • Dr. ${item.assignedDoctorName}` : ''}
                                        </div>
                                    </div>
                                    <p style={{ margin: '10px 0 0', color: '#334155', lineHeight: 1.6 }}>
                                        {item.explanation || item.desc || 'No summary shared.'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#0f172a' }}>{label}</label>
            {children}
        </div>
    );
}

function SummaryCard({ label, value, color }) {
    return (
        <div style={{ background: `${color}12`, border: `1px solid ${color}22`, borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '1.7rem', fontWeight: 800, color }}>{value}</div>
        </div>
    );
}
