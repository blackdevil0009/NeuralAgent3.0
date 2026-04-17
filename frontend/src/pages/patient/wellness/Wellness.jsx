import React from 'react';
import { Link } from 'react-router-dom';

export default function Wellness() {
    return (
        <div>
            <div className="pd-health-hero" style={{ background: 'linear-gradient(135deg, #2d6a4f, #1a4228)', marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.55rem', marginBottom: 6, color: '#c9a84c' }}>
                        🌿 Health Wellness Hub
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.9)' }}>
                        Personalized Ayurvedic wellness tools to balance your doshas and maintain harmony.
                    </p>
                    <div style={{ marginTop: 16, opacity: 0.9 }}>
                        <span style={{ fontSize: '0.78rem' }}>⚠️ For guidance only. Consult your physician.</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.8rem', color: '#c9a84c' }}>89</div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>Wellness Score</div>
                </div>
            </div>

            <div className="pd-grid-3" style={{ marginBottom: 24 }}>
                <Link to="quiz" className="pd-card pd-stat-card" style={{ textDecoration: 'none', height: 140, padding: 24 }}>
                    <div className="pd-stat-icon green" style={{ fontSize: '2rem' }}>❓</div>
                    <div>
                        <div className="pd-stat-value" style={{ fontSize: '1.2rem' }}>Dosha Quiz</div>
                        <div className="pd-stat-label">Take 2-min quiz for personalized insights</div>
                    </div>
                </Link>

                <Link to="diet-plan" className="pd-card pd-stat-card" style={{ textDecoration: 'none', height: 140, padding: 24 }}>
                    <div className="pd-stat-icon gold" style={{ fontSize: '2rem' }}>🍲</div>
                    <div>
                        <div className="pd-stat-value" style={{ fontSize: '1.2rem' }}>Diet Plan</div>
                        <div className="pd-stat-label">Weekly Ayurvedic meals for your dosha</div>
                    </div>
                </Link>

                <Link to="reminder" className="pd-card pd-stat-card" style={{ textDecoration: 'none', height: 140, padding: 24 }}>
                    <div className="pd-stat-icon blue" style={{ fontSize: '2rem' }}>⏰</div>
                    <div>
                        <div className="pd-stat-value" style={{ fontSize: '1.2rem' }}>Reminders</div>
                        <div className="pd-stat-label">Medicine & diet schedule</div>
                    </div>
                </Link>
            </div>

            <div className="pd-grid-2">
                <div className="pd-card">
                    <h3 className="pd-section-title">💡 Quick Wellness Tips</h3>
                    <ul style={{ paddingLeft: 20, fontSize: '0.88rem', lineHeight: 1.7 }}>
                        <li>Wake before sunrise for balanced Vata</li>
                        <li>Hydrate with warm water + lemon</li>
                        <li>Practice 10min pranayama daily</li>
                        <li>Avoid cold drinks if Pitta dominant</li>
                    </ul>
                </div>
                <div className="pd-card">
                    <h3 className="pd-section-title">📊 Dosha Balance</h3>
                    <div className="pd-dosha-bars" style={{ marginTop: 0 }}>
                        <div className="pd-dosha-row">
                            <span>Vata</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-vata" style={{ width: '42%' }} /></div>
                            <span>42%</span>
                        </div>
                        <div className="pd-dosha-row">
                            <span>Pitta</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-pitta" style={{ width: '33%' }} /></div>
                            <span>33%</span>
                        </div>
                        <div className="pd-dosha-row">
                            <span>Kapha</span>
                            <div className="pd-dosha-bar-track"><div className="pd-dosha-bar-fill pd-dosha-bar-kapha" style={{ width: '25%' }} /></div>
                            <span>25%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

