import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import About from '../components/about';
import Dashboard from '../components/dashboard';
import Footer from '../components/footer';
import './home.css';

export default function Home() {
    const navigate = useNavigate();

    const scrollTo = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="home-page">
            <Header />

            {/* ──────── HERO ──────── */}
            <section className="hero" id="hero">
                <div className="hero-inner">

                    {/* Left: copy */}
                    <div className="hero-content">
                        <div className="hero-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Powered by Ayurvedic AI</span>
                        </div>

                        <h1 className="hero-title">
                            Your Personal
                            <span className="gradient-text">AI Health Companion</span>
                        </h1>

                        <p className="hero-description">
                            Experience holistic healthcare that blends the timeless wisdom of Ayurveda
                            with cutting-edge AI. Get personalised remedies, AI consultations, and
                            report analysis — available 24/7.
                        </p>

                        <div className="hero-actions">
                            <button className="btn-hero-primary" onClick={() => navigate('/register')}>
                                Get Started Free
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                            <button className="btn-hero-secondary" onClick={() => scrollTo('how-it-works')}>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                How It Works
                            </button>
                        </div>

                        <div className="hero-stats">
                            <div className="hero-stat">
                                <div className="hero-stat-number">50K+</div>
                                <div className="hero-stat-label">Active Users</div>
                            </div>
                            <div className="hero-stat">
                                <div className="hero-stat-number">99.2%</div>
                                <div className="hero-stat-label">Accuracy</div>
                            </div>
                            <div className="hero-stat">
                                <div className="hero-stat-number">24/7</div>
                                <div className="hero-stat-label">Available</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: floating cards */}
                    <div className="hero-visual">
                        <div className="hero-card hero-card-1">
                            <div className="card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="card-content">
                                <div className="card-title">Diagnosis Ready</div>
                                <div className="card-subtitle">95% Match Found</div>
                            </div>
                        </div>

                        <div className="hero-card hero-card-2">
                            <div className="card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div className="card-content">
                                <div className="card-title">Health Score</div>
                                <div className="card-subtitle">Excellent 🌿</div>
                            </div>
                        </div>

                        <div className="hero-card hero-card-3">
                            <div className="card-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="card-content">
                                <div className="card-title">Response Time</div>
                                <div className="card-subtitle">&lt; 2 seconds</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────── FEATURES HIGHLIGHT ──────── */}
            <section className="features-highlight" id="features">
                <div className="features-container">
                    <span className="na-badge">Why Choose NeuralAgent</span>
                    <h2 className="na-section-title">
                        Cutting-Edge <span className="na-gradient-text">Holistic Medicine</span>
                    </h2>

                    <div className="features-showcase">
                        <div className="showcase-item">
                            <div className="showcase-number">01</div>
                            <h3>🤖 AI-Powered Analysis</h3>
                            <p>Advanced machine learning trained on millions of cases, enhanced with Ayurvedic knowledge bases.</p>
                        </div>
                        <div className="showcase-item">
                            <div className="showcase-number">02</div>
                            <h3>⚡ Instant Results</h3>
                            <p>Get comprehensive health insights — from dosha analysis to lab report interpretation — in seconds.</p>
                        </div>
                        <div className="showcase-item">
                            <div className="showcase-number">03</div>
                            <h3>🔒 Privacy First</h3>
                            <p>Bank-level encryption protects your sensitive health data every step of the way.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────── ABOUT, HOW-IT-WORKS, FEATURES, FOOTER ──────── */}
            <About />
            <Dashboard />
            <Footer />
        </div>
    );
}
