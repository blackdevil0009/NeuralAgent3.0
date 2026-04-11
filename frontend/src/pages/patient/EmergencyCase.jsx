import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../../utils/config';

const CASE_TYPES = [
    { id: 'critical', label: '🔴 Critical (Life Threatening)', color: '#c0392b' },
    { id: 'urgent', label: '🟠 Urgent (Requires Immediate Attention)', color: '#d35400' },
    { id: 'non-urgent', label: '🟡 Non-Urgent (Seeking Quick Advice)', color: '#f1c40f' },
];

export default function EmergencyCase() {
    const navigate = useNavigate();
    const [explanation, setExplanation] = useState('');
    const [caseType, setCaseType] = useState('');
    const [contact, setContact] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [refId, setRefId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/emergencies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ explanation, caseType, contact })
            });
            const result = await response.json();
            if (response.ok) {
                const em = result?.data?.emergency || result?.emergency || {};
                setRefId(em.id || 'EM-' + Date.now());
                setSubmitted(true);
            } else {
                const errMsg = result?.data?.error || result?.error || 'Failed to report emergency';
                alert(errMsg);
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
                    Please stay calm. A doctor will contact you via secure chat or mobile call within minutes.
                </p>
                <div style={{ margin: '30px 0', padding: 20, background: '#f9f9f9', borderRadius: 12, borderLeft: '4px solid #c0392b' }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>Reference ID: {refId}</p>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: 5 }}>Estimated Response Time: &lt; 5 minutes</p>
                </div>
                <button
                    onClick={() => { setSubmitted(false); setExplanation(''); setCaseType(''); setContact(''); navigate('/patient/profile'); }}
                    style={{ padding: '12px 30px', borderRadius: 50, background: '#c0392b', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', marginRight: 10 }}
                >
                    View Status in Profile
                </button>
                <button
                    onClick={() => { setSubmitted(false); setExplanation(''); setCaseType(''); setContact(''); }}
                    style={{ padding: '12px 30px', borderRadius: 50, background: '#f5f5f5', color: '#c0392b', border: '1px solid #c0392b', fontWeight: 600, cursor: 'pointer' }}
                >
                    Report Another
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
            <div style={{ marginBottom: 30 }}>
                <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#c0392b', display: 'flex', alignItems: 'center', gap: 15 }}>
                    <span>🚨</span> Emergency Case Report
                </h1>
                <p style={{ color: '#666' }}>Fill this form only if you require immediate medical attention. High priority alerts will be sent to all doctors.</p>
            </div>

            <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
                                        padding: '12px 15px', borderRadius: 12, border: '2px solid',
                                        borderColor: caseType === type.id ? type.color : '#eee',
                                        background: caseType === type.id ? `${type.color}08` : '#fff',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                                        transition: 'all 0.2s', fontSize: '0.9rem'
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="caseType"
                                        value={type.id}
                                        required
                                        style={{ width: 18, height: 18, accentColor: type.color }}
                                        checked={caseType === type.id}
                                        onChange={() => setCaseType(type.id)}
                                    />
                                    <span style={{ fontWeight: 600, color: type.color }}>{type.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: 25 }}>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Contact Number</label>
                        <input
                            type="tel"
                            required
                            placeholder="+91 9876543210"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }}
                        />
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
                </form>
            </div>
        </div>
    );
}
