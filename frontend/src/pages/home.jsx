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

            {/* ──────── FLOATING WHATSAPP ──────── */}
            <div className="wa-floating-container">
                <a href="https://wa.me/918604611867" target="_blank" rel="noreferrer" className="wa-floating-btn" aria-label="Chat on WhatsApp 1">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                </a>
                <a href="https://wa.me/917052608972" target="_blank" rel="noreferrer" className="wa-floating-btn" aria-label="Chat on WhatsApp 2">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                </a>
            </div>

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
                    <span className="na-badge">Why Choose VaidyaMed-X</span>
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
