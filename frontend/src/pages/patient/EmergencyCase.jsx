import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

import { API_BASE_URL } from '../../utils/config';
import { handleError, handleSuccess } from '../../utils/error_handlers';

const CASE_TYPES = [
    {
        id: 'critical',
        label: 'Critical',
        note: 'Life-threatening symptoms or immediate danger.',
        color: '#b42318',
    },
    {
        id: 'urgent',
        label: 'Urgent',
        note: 'Needs fast medical attention today.',
        color: '#c2410c',
    },
    {
        id: 'non-urgent',
        label: 'Moderate',
        note: 'Needs a quick response, but is stable right now.',
        color: '#b58105',
    },
];

const PROVIDER_TYPES = [
    {
        id: 'hospital',
        label: 'Hospital Emergency Desk',
        note: 'Best when you want a hospital team to coordinate the case.',
    },
    {
        id: 'doctor',
        label: 'Individual Doctor / Local Clinic',
        note: 'Only shows independent doctors not attached to a hospital.',
    },
];

const sectionTitleStyle = {
    display: 'block',
    fontWeight: 700,
    marginBottom: 10,
    fontSize: '0.95rem',
    color: '#1f2937',
};

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #d7dde5',
    boxSizing: 'border-box',
    fontSize: '0.95rem',
    background: '#fff',
};

const cardGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
};

export default function EmergencyCase() {
    const navigate = useNavigate();

    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(null);
    const [liveStatus, setLiveStatus] = useState(null);
    const [statusPollRef, setStatusPollRef] = useState(null);
    const { socket } = useSocket();
    const [options, setOptions] = useState({ hospitals: [], independentDoctors: [] });
    const [form, setForm] = useState({
        patientName: '',
        contactName: '',
        contact: '',
        location: '',
        caseType: 'urgent',
        providerType: 'hospital',
        providerId: '',
        explanation: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchOptions = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/emergencies/options`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(json?.data?.message || json?.error || 'Failed to load emergency booking options.');
                }

                const hospitals = json?.data?.hospitals || [];
                const independentDoctors = json?.data?.independentDoctors || [];
                const profile = json?.data?.patientProfile || {};

                setOptions({ hospitals, independentDoctors });
                setForm((prev) => ({
                    ...prev,
                    patientName: profile.name || prev.patientName,
                    contact: profile.contact || prev.contact,
                    location: profile.location || prev.location,
                    providerId: hospitals[0]?.id ? String(hospitals[0].id) : '',
                }));
            } catch (err) {
                handleError(err);
            } finally {
                setLoadingOptions(false);
            }
        };

        fetchOptions();
    }, [navigate]);

    const providerList = useMemo(() => {
        if (form.providerType === 'doctor') return options.independentDoctors;
        return options.hospitals;
    }, [form.providerType, options]);

    useEffect(() => {
        if (!providerList.length) {
            setForm((prev) => ({ ...prev, providerId: '' }));
            return;
        }

        const exists = providerList.some((item) => String(item.id) === String(form.providerId));
        if (!exists) {
            setForm((prev) => ({ ...prev, providerId: String(providerList[0].id) }));
        }
    }, [providerList, form.providerId]);

    const selectedProvider = providerList.find((item) => String(item.id) === String(form.providerId));

    const updateField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.patientName.trim() || !form.contactName.trim() || !form.contact.trim() || !form.location.trim() || !form.explanation.trim() || !form.providerId) {
            handleError('Please complete all required emergency details before submitting.');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/emergencies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    patientName: form.patientName.trim(),
                    contactName: form.contactName.trim(),
                    contact: form.contact.trim(),
                    location: form.location.trim(),
                    caseType: form.caseType,
                    providerType: form.providerType,
                    providerId: form.providerId,
                    explanation: form.explanation.trim(),
                }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result?.data?.message || result?.error || 'Failed to book emergency support.');
            }

            const emergency = result?.data?.emergency;
            if (!emergency || !emergency.id) {
                throw new Error('Failed to receive emergency ID from server');
            }

            setSubmitted({
                id: String(emergency.id),
                providerName: emergency.providerName || selectedProvider?.name || selectedProvider?.clinicName || 'selected team',
                providerType: emergency.providerType || form.providerType,
                contactName: emergency.contactName || form.contactName,
                location: emergency.location || form.location,
            });
            
            // Start live status tracking
            setLiveStatus({ id: String(emergency.id), status: 'pending', lastUpdated: Date.now() });
            
            handleSuccess(result?.message || 'Emergency request submitted successfully.');
        } catch (err) {
            handleError(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Live status tracking after submit
    useEffect(() => {
        if (!submitted?.id || !liveStatus) return;

        const pollStatus = async () => {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/emergencies/my?limit=1`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    const recent = json.data?.emergencies?.[0] || json.emergencies?.[0];
                    if (recent?.id === liveStatus.id) {
                        setLiveStatus({
                            id: liveStatus.id,
                            status: recent.status || 'pending',
                            assignedDoctor: recent.assignedDoctorName,
                            lastUpdated: Date.now()
                        });
                    }
                }
            } catch (err) {
                console.warn('Status poll failed:', err);
            }
        };

        pollStatus(); // Initial
        const interval = setInterval(pollStatus, 5000); // 5s
        setStatusPollRef(interval);

        return () => clearInterval(interval);
    }, [submitted, liveStatus]);

    useEffect(() => {
        if (!socket || !liveStatus?.id) return;

        const handleUpdate = (data) => {
            if (data.id === liveStatus.id) {
                setLiveStatus(prev => ({ ...prev, status: data.status, lastUpdated: Date.now() }));
            }
        };

        socket.on('emergency_handled', handleUpdate);
        return () => socket.off('emergency_handled', handleUpdate);
    }, [socket, liveStatus]);

    if (submitted) {
        return (
            <div style={{ maxWidth: 720, margin: '24px auto', paddingBottom: 40 }}>
                <div style={{
                    background: '#fff',
                    borderRadius: 24,
                    padding: 32,
                    border: '1px solid #f0d3cf',
                    boxShadow: '0 20px 50px rgba(139, 44, 34, 0.08)',
                }}>
                    <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>🚨 Live Tracking</div>
                    <h1 style={{ margin: '0 0 10px', color: '#991b1b', fontFamily: 'Playfair Display, serif' }}>
                        Case #{submitted.id} - {liveStatus?.status?.toUpperCase() || 'PENDING'}
                    </h1>
                    <p style={{ color: '#5b6472', lineHeight: 1.7, marginBottom: 24 }}>
                        Tracking updates from <strong>{submitted.providerName}</strong>. Status: <strong>{liveStatus?.status || 'pending'}</strong>
                        {liveStatus?.assignedDoctor && (
                            <> • Assigned: <strong>{liveStatus.assignedDoctor}</strong></>
                        )}
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 14,
                        marginBottom: 24,
                    }}>
                        <InfoCard label="Case ID" value={`#${submitted.id}`} />
                        <InfoCard label="Status" value={liveStatus?.status?.toUpperCase() || 'PENDING'} />
                        <InfoCard label="Provider" value={submitted.providerType === 'doctor' ? 'Doctor/Clinic' : 'Hospital Desk'} />
                        <InfoCard label="Contact" value={submitted.contactName} />
                        <InfoCard label="Location" value={submitted.location} />
                        <InfoCard label="Last Update" value={liveStatus ? `${Math.floor((Date.now() - liveStatus.lastUpdated)/1000)}s ago` : 'Never'} />
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => navigate('/patient/profile')} style={{
                            padding: '12px 22px', borderRadius: 999, background: '#991b1b', color: '#fff',
                            border: 'none', fontWeight: 700, cursor: 'pointer'
                        }}>
                            📋 Full History
                        </button>
                        <button onClick={() => {
                            if (statusPollRef) clearInterval(statusPollRef);
                            setSubmitted(null); setLiveStatus(null); setForm(prev => ({ ...prev, contactName: '', explanation: '', caseType: 'urgent' }));
                        }} style={{
                            padding: '12px 22px', borderRadius: 999, background: '#fff', color: '#991b1b',
                            border: '1px solid #e3b9b2', fontWeight: 700, cursor: 'pointer'
                        }}>
                            New Emergency
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 56 }}>
            <div style={{ marginBottom: 26 }}>
                <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#991b1b', marginBottom: 10 }}>
                    Patient Emergency Booking
                </h1>
                <p style={{ color: '#5f6b7a', maxWidth: 760, lineHeight: 1.7 }}>
                    Choose where this case should go first, share a short medical report, and include the best contact person and address.
                    The form is kept intentionally simple so teams can respond quickly.
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{
                background: '#fff',
                padding: 28,
                borderRadius: 24,
                border: '1px solid #eadfdd',
                boxShadow: '0 14px 38px rgba(17, 24, 39, 0.05)',
            }}>
                <div style={{ marginBottom: 26 }}>
                    <label style={sectionTitleStyle}>1. Choose Emergency Destination</label>
                    <div style={cardGridStyle}>
                        {PROVIDER_TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => updateField('providerType', type.id)}
                                style={{
                                    textAlign: 'left',
                                    padding: 16,
                                    borderRadius: 16,
                                    border: `1px solid ${form.providerType === type.id ? '#c2410c' : '#e5e7eb'}`,
                                    background: form.providerType === type.id ? '#fff7ed' : '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>{type.label}</div>
                                <div style={{ fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>{type.note}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 26 }}>
                    <label style={sectionTitleStyle}>
                        2. Select {form.providerType === 'doctor' ? 'Doctor / Clinic' : 'Hospital'}
                    </label>
                    {loadingOptions ? (
                        <div style={{ ...inputStyle, color: '#6b7280', background: '#f8fafc' }}>Loading available options…</div>
                    ) : providerList.length === 0 ? (
                        <div style={{ ...inputStyle, color: '#991b1b', background: '#fef2f2' }}>
                            No {form.providerType === 'doctor' ? 'independent doctors' : 'hospitals'} are available right now.
                        </div>
                    ) : (
                        <>
                            <select
                                value={form.providerId}
                                onChange={(e) => updateField('providerId', e.target.value)}
                                style={inputStyle}
                            >
                                {providerList.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {form.providerType === 'doctor'
                                            ? `${item.name} • ${item.specialization} • ${item.clinicName || 'Local Clinic'}`
                                            : `${item.name} • ${item.type || 'general'}`}
                                    </option>
                                ))}
                            </select>

                            {selectedProvider && (
                                <div style={{
                                    marginTop: 12,
                                    padding: 16,
                                    borderRadius: 16,
                                    background: '#f8fafc',
                                    border: '1px solid #e5edf4',
                                }}>
                                    <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                                        {form.providerType === 'doctor'
                                            ? `Dr. ${selectedProvider.name}`
                                            : selectedProvider.name}
                                    </div>
                                    <div style={{ color: '#566273', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        {form.providerType === 'doctor'
                                            ? `${selectedProvider.specialization || 'General Medicine'} • ${selectedProvider.clinicName || 'Local Clinic'}`
                                            : `${selectedProvider.type || 'general'} facility`}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.88rem', marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                        <span>📍</span>
                                        <span>{selectedProvider.clinicLocation || selectedProvider.address || 'Address not shared'}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                        {form.providerType === 'doctor' ? (
                                            <>
                                                <ProviderBadge label={`${selectedProvider.experience || '0'} yrs exp`} />
                                                <ProviderBadge label={`Fee: Rs ${selectedProvider.consultantFee || 500}`} />
                                                <ProviderBadge label={`${selectedProvider.activeEmergencyCount || 0} active cases`} />
                                            </>
                                        ) : (
                                            <>
                                                <ProviderBadge label={`${selectedProvider.doctorCount || 0} registered doctors`} />
                                                <ProviderBadge label={`${selectedProvider.activeEmergencyCount || 0} active emergencies`} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ marginBottom: 26 }}>
                    <label style={sectionTitleStyle}>3. Case Priority</label>
                    <div style={cardGridStyle}>
                        {CASE_TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => updateField('caseType', type.id)}
                                style={{
                                    textAlign: 'left',
                                    padding: 16,
                                    borderRadius: 16,
                                    border: `1px solid ${form.caseType === type.id ? type.color : '#e5e7eb'}`,
                                    background: form.caseType === type.id ? `${type.color}10` : '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontWeight: 700, color: type.color, marginBottom: 6 }}>{type.label}</div>
                                <div style={{ fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>{type.note}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: 26 }}>
                    <label htmlFor="explanation" style={sectionTitleStyle}>4. Brief Problem Report</label>
                    <textarea
                        id="explanation"
                        value={form.explanation}
                        onChange={(e) => updateField('explanation', e.target.value)}
                        placeholder="Mention the symptoms, how long this has been happening, and why urgent attention is needed."
                        rows={5}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 130, lineHeight: 1.6 }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <Field
                        id="patientName"
                        label="Patient Name"
                        value={form.patientName}
                        onChange={(value) => updateField('patientName', value)}
                        placeholder="Full patient name"
                    />
                    <Field
                        id="contactName"
                        label="Contact Person Name"
                        value={form.contactName}
                        onChange={(value) => updateField('contactName', value)}
                        placeholder="Family member or nearby contact"
                    />
                    <Field
                        id="contact"
                        label="Contact Number"
                        value={form.contact}
                        onChange={(value) => updateField('contact', value)}
                        placeholder="+91 XXXXX XXXXX"
                    />
                    <Field
                        id="location"
                        label="Location / Address"
                        value={form.location}
                        onChange={(value) => updateField('location', value)}
                        placeholder="Current address or nearest landmark"
                    />
                </div>

                <div style={{
                    marginBottom: 24,
                    padding: 16,
                    borderRadius: 16,
                    background: '#fff8f6',
                    border: '1px solid #f0d3cf',
                    color: '#7a3d35',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                }}>
                    If this is a life-threatening situation, contact local emergency services immediately in addition to submitting this request.
                </div>

                <button
                    type="submit"
                    disabled={submitting || loadingOptions || !providerList.length}
                    style={{
                        width: '100%',
                        padding: '15px 18px',
                        borderRadius: 14,
                        background: '#991b1b',
                        color: '#fff',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: submitting ? 'wait' : 'pointer',
                        boxShadow: '0 10px 24px rgba(153, 27, 27, 0.22)',
                    }}
                >
                    {submitting ? 'Submitting Emergency Request…' : 'Book Emergency Support'}
                </button>
            </form>
        </div>
    );
}

function Field({ id, label, value, onChange, placeholder }) {
    return (
        <div>
            <label htmlFor={id} style={sectionTitleStyle}>{label}</label>
            <input
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
            />
        </div>
    );
}

function InfoCard({ label, value }) {
    return (
        <div style={{
            padding: 16,
            borderRadius: 16,
            background: '#f8fafc',
            border: '1px solid #e5edf4',
        }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
                {label}
            </div>
            <div style={{ fontWeight: 700, color: '#111827', lineHeight: 1.5 }}>
                {value || 'Not provided'}
            </div>
        </div>
    );
}

function ProviderBadge({ label }) {
    return (
        <span style={{
            fontSize: '0.78rem',
            padding: '5px 10px',
            borderRadius: 999,
            background: '#ffffff',
            border: '1px solid #dbe6f0',
            color: '#475569',
        }}>
            {label}
        </span>
    );
}
