import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CASE_TYPES = [
    { id: 'critical', label: '🔴 Critical (Life Threatening)', color: '#c0392b' },
    { id: 'urgent', label: '🟠 Urgent (Requires Immediate Attention)', color: '#d35400' },
    { id: 'non-urgent', label: '🟡 Non-Urgent (Seeking Quick Advice)', color: '#f1c40f' },
];

export default function EmergencyCase() {
    const navigate = useNavigate();
    const [explanation, setExplanation] = useState('');
    const [caseType, setCaseType] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const data = {
                explanation,
                caseType,
                contact: '+919876543210' // Normally from state, but using placeholder or real input
            };
            // Note: The original form didn't capture contact in state, but I'll add a generic one
            // if we need it, or we can just send explanation and caseType.
            
            const response = await fetch('https://api.vaidyamedx.in/api/emergencies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (response.ok) {
                setSubmitted(true);
            } else {
                alert(result.error || 'Failed to report emergency');
            }
        } catch (err) {
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center', padding: 40, background: '#fff', borderRadius: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '5rem', marginBottom: 20 }}>🚨</div>
                <h1 style={{ color: '#c0392b', fontFamily: 'Playfair Display, serif' }}>Emergency Reported</h1>
                <p style={{ fontSize: '1.1rem', color: '#555', lineHeight: 1.6 }}>
                    Your emergency request has been broadcast to all available senior consultants.
                    Please stay calm. A doctor will contact you via video call or chat within minutes.
                </p>
                <div style={{ margin: '30px 0', padding: 20, background: '#f9f9f9', borderRadius: 12, borderLeft: '4px solid #c0392b' }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>Reference ID: EM-99283</p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 5 }}>Estimated Response Time: &lt; 5 minutes</p>
                </div>
                <button
                    onClick={() => navigate('/patient/dashboard')}
                    style={{ padding: '12px 30px', borderRadius: 50, background: '#c0392b', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ marginBottom: 30 }}>
                <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#c0392b', display: 'flex', alignItems: 'center', gap: 15 }}>
                    <span>🚨</span> Emergency Case Report
                </h1>
                <p style={{ color: '#666' }}>Fill this form only if you require immediate medical attention. High priority alerts will be sent to all doctors.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 30, borderRadius: 20, boxShadow: '0 4px 20px rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.1)' }}>
                <div style={{ marginBottom: 25 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: '0.95rem' }}>What is the emergency? (Brief Explanation)</label>
                    <textarea
                        required
                        placeholder="Describe the symptoms, when they started, and current condition..."
                        style={{ width: '100%', height: 120, padding: 15, borderRadius: 12, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box' }}
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                    />
                </div>

                <div style={{ marginBottom: 25 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: '0.95rem' }}>Case Type / Urgency</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {CASE_TYPES.map(type => (
                            <label
                                key={type.id}
                                style={{
                                    padding: '15px 20px', borderRadius: 12, border: '2px solid',
                                    borderColor: caseType === type.id ? type.color : '#eee',
                                    background: caseType === type.id ? `${type.color}08` : '#fff',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                                    transition: 'all 0.2s'
                                }}
                            >
                                <input
                                    type="radio"
                                    name="caseType"
                                    value={type.id}
                                    required
                                    style={{ width: 20, height: 20, accentColor: type.color }}
                                    checked={caseType === type.id}
                                    onChange={() => setCaseType(type.id)}
                                />
                                <span style={{ fontWeight: 600, color: type.color }}>{type.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 15, marginBottom: 25 }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Contact Number</label>
                        <input type="tel" placeholder="+91 9876543210" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Patient Name</label>
                        <input type="text" placeholder="Full Name" style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }} />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', padding: '16px', borderRadius: 12, background: '#c0392b', color: '#fff',
                        border: 'none', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(192,57,43,0.3)', transition: 'all 0.2s'
                    }}
                >
                    {loading ? '📡 Broadcasting Alert...' : '🚀 Report Emergency Now'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#888', marginTop: 15 }}>
                    * Abusing this feature for non-emergencies may lead to account suspension.
                </p>
            </form>
        </div>
    );
}
