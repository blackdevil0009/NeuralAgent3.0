import React from 'react';
import { Link } from 'react-router-dom';

const STEPS = [
    { num: '01', icon: '📋', title: 'Register & Profile', desc: 'Create your account as a patient or doctor. Fill in your health profile / credentials in minutes.' },
    { num: '02', icon: '🤖', title: 'Consult the AI', desc: 'Chat with VaidyaMed-X, upload reports, describe symptoms — get instant Ayurvedic + modern insights.' },
    { num: '03', icon: '🌿', title: 'Heal & Thrive', desc: 'Follow personalised remedies, connect with verified doctors, and track your wellness journey.' },
];

const FEATURES = [
    { icon: '🩺', title: 'Symptom Analysis', desc: 'Describe symptoms in plain language and receive a differential list with Ayurvedic correlations.' },
    { icon: '📄', title: 'Report Scanning', desc: 'Upload lab reports or prescriptions — AI extracts key values and flags anomalies instantly.' },
    { icon: '🌿', title: 'Dosha Assessment', desc: 'Discover your Vata-Pitta-Kapha constitution and receive tailored diet & lifestyle advice.' },
    { icon: '👨‍⚕️', title: 'Doctor Connect', desc: 'Get matched with verified Ayurvedic & allopathic doctors for video or chat consultations.' },
    { icon: '💊', title: 'Herb & Medicine DB', desc: 'Access 5,000+ Ayurvedic herbs, formulations, and their modern pharmacological equivalents.' },
    { icon: '📊', title: 'Health Dashboard', desc: 'Track vitals, appointments, prescriptions, and AI chat history in one unified space.' },
];

export default function Dashboard() {
    return (
        <>
            {/* How It Works */}
            <section className="na-how" id="how-it-works">
                <div className="na-section-container">
                    <div className="na-section-header">
                        <span className="na-badge">Simple Process</span>
                        <h2 className="na-section-title">
                            How <span className="na-gradient-text">VaidyaMed-X</span> Works
                        </h2>
                        <p className="na-section-sub">
                            Start your holistic health journey in three effortless steps.
                        </p>
                    </div>

                    <div className="na-steps-wrap">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <div className="na-step-card">
                                    <div className="na-step-num">{s.num}</div>
                                    <div className="na-step-icon">{s.icon}</div>
                                    <h3 className="na-step-title">{s.title}</h3>
                                    <p className="na-step-desc">{s.desc}</p>
                                </div>
                                {i < STEPS.length - 1 && <div className="na-step-arrow">→</div>}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="na-features-full" id="features-full">
                <div className="na-section-container">
                    <div className="na-section-header">
                        <span className="na-badge">Capabilities</span>
                        <h2 className="na-section-title">
                            Everything You Need for <span className="na-gradient-text">Better Health</span>
                        </h2>
                    </div>

                    <div className="na-feat-grid">
                        {FEATURES.map(f => (
                            <div className="na-feat-card" key={f.title}>
                                <div className="na-feat-icon">{f.icon}</div>
                                <h3 className="na-feat-title">{f.title}</h3>
                                <p className="na-feat-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* CTA Banner */}
                    <div className="na-cta-banner">
                        <div className="na-cta-text">
                            <h3>Ready to experience the future of healthcare?</h3>
                            <p>Join thousands of patients and doctors already using VaidyaMed-X.</p>
                        </div>
                        <div className="na-cta-actions">
                            <Link to="/register" className="na-btn-solid na-btn-lg">Start Free Today 🌿</Link>
                            <Link to="/login" className="na-btn-outline na-btn-lg na-btn-white">Doctor Login</Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
