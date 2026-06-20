import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import About from '../components/about';
import Dashboard from '../components/dashboard';
import Footer from '../components/footer';
import appMockup from '../assets/app_mockup.png';
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

                        {/* Organizational CTA */}
                        <div className="hero-org-cta">
                            <button className="btn-org-register" onClick={() => navigate('/hospital/register')}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Register as an Organization
                            </button>
                            <span className="org-subtitle">For hospitals, clinics and healthcare providers</span>
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

            {/* ──────── BLOG PREVIEW ──────── */}
            <section className="home-blog-preview" id="blog">
                <div className="hbp-inner">
                    {/* Left – content */}
                    <div className="hbp-content">
                        <span className="na-badge">Official Blog</span>
                        <h2 className="hbp-title">
                            Explore the Future of
                            <span className="na-gradient-text"> Digital Healthcare</span>
                        </h2>
                        <p className="hbp-desc">
                            Welcome to the official blog of <strong>Vaidyamed-X</strong> — an intelligent
                            healthcare ecosystem powered by AI and developed by{' '}
                            <strong>Mira Future Tech Vision Private Limited</strong>. We share innovations,
                            AI insights, wellness strategies, and the latest in digital health transformation.
                        </p>

                        {/* Topic chips */}
                        <div className="hbp-topics">
                            {[
                                { icon: '🤖', label: 'AI in Healthcare' },
                                { icon: '🧠', label: 'Medical Technology' },
                                { icon: '🥗', label: 'Smart Wellness' },
                                { icon: '🚨', label: 'Emergency Care' },
                                { icon: '📡', label: 'IoT Monitoring' },
                                { icon: '🔬', label: 'Health Research' },
                            ].map((t, i) => (
                                <span className="hbp-chip" key={i}>
                                    {t.icon} {t.label}
                                </span>
                            ))}
                        </div>

                        <button
                            className="hbp-cta"
                            onClick={() => navigate('/blog')}
                        >
                            Read Our Blog
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </div>

                    {/* Right – feature cards */}
                    <div className="hbp-cards">
                        {[
                            { icon: '🤖', title: 'AI-Powered Assistance', desc: 'Smart healthcare guidance powered by cutting-edge machine learning.' },
                            { icon: '🔗', title: 'Doctor–Patient Connectivity', desc: 'Seamless, secure video consultations and real-time messaging.' },
                            { icon: '🏆', title: 'Reward-Based Wellness', desc: 'Earn rewards for healthy habits and wellness milestones.' },
                            { icon: '🚑', title: 'Emergency Solutions', desc: 'One-tap SOS with nearest hospital navigation and instant dispatch.' },
                        ].map((c, i) => (
                            <div className="hbp-card" key={i}>
                                <span className="hbp-card-icon">{c.icon}</span>
                                <div>
                                    <div className="hbp-card-title">{c.title}</div>
                                    <div className="hbp-card-desc">{c.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ──────── APP COMING SOON ──────── */}
            <section className="app-coming-soon" id="app">
                {/* Decorative orbs */}
                <div className="acs-orb acs-orb-1" />
                <div className="acs-orb acs-orb-2" />

                <div className="acs-inner">
                    {/* LEFT — content */}
                    <div className="acs-content">
                        {/* Logo mark */}
                        <div className="acs-logo-mark">
                            <span className="acs-logo-icon">🌿</span>
                            <div className="acs-logo-text">
                                <span className="acs-logo-name">VaidyaMed-X</span>
                                <span className="acs-logo-sub">Mobile Application</span>
                            </div>
                        </div>

                        <div className="acs-badge">
                            <span className="acs-badge-dot" />
                            Coming Soon
                        </div>

                        <h2 className="acs-title">
                            Healthcare in Your
                            <span className="acs-gradient"> Pocket</span>
                        </h2>

                        <p className="acs-desc">
                            The VaidyaMed-X mobile app is launching soon — bringing AI-powered
                            healthcare, instant doctor consultations, health monitoring, and
                            Ayurvedic wellness to your smartphone.
                        </p>

                        {/* Feature chips */}
                        <div className="acs-features">
                            {[
                                { icon: '🤖', label: 'AI Health Assistant' },
                                { icon: '📋', label: 'Report Scanner' },
                                { icon: '🚨', label: 'SOS Emergency' },
                                { icon: '🏆', label: 'Wellness Rewards' },
                                { icon: '📡', label: 'IoT Sync' },
                                { icon: '💬', label: 'Live Doctor Chat' },
                            ].map((f, i) => (
                                <span className="acs-chip" key={i}>
                                    {f.icon} {f.label}
                                </span>
                            ))}
                        </div>

                        {/* Store badges */}
                        <div className="acs-stores">
                            <div className="acs-store-btn">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3.18 23.76c.3.17.65.2.97.08l11.27-6.5-2.5-2.5-9.74 8.92zM.68 1.45C.26 1.88 0 2.56 0 3.46v17.08c0 .9.26 1.58.69 2.01l.11.1 9.57-9.57v-.22L.79 3.34l-.11.11zM20.38 10.2l-2.72-1.57-2.79 2.79 2.79 2.79 2.74-1.58c.78-.45.78-1.18-.02-1.43zM4.15.24L15.42 6.74l-2.5 2.5L3.18.32C3.5.2 3.85.23 4.15.4V.24z"/>
                                </svg>
                                <div>
                                    <span className="acs-store-sub">Get it on</span>
                                    <span className="acs-store-name">Google Play</span>
                                </div>
                                <span className="acs-store-tag">Soon</span>
                            </div>

                            <div className="acs-store-btn">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.18 1.27-2.16 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.78M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                </svg>
                                <div>
                                    <span className="acs-store-sub">Download on the</span>
                                    <span className="acs-store-name">App Store</span>
                                </div>
                                <span className="acs-store-tag">Soon</span>
                            </div>
                        </div>

                        {/* Notify form */}
                        <AcsNotifyForm />
                    </div>

                    {/* RIGHT — phone mockup */}
                    <div className="acs-visual">
                        <div className="acs-mockup-wrap">
                            <img src={appMockup} alt="VaidyaMed-X Mobile App Preview" className="acs-mockup-img" />
                            <div className="acs-mockup-glow" />
                        </div>

                        {/* Floating stat pills */}
                        <div className="acs-float acs-float-1">
                            <span className="acs-float-icon">⭐</span>
                            <div>
                                <div className="acs-float-val">4.9/5</div>
                                <div className="acs-float-lbl">Beta Rating</div>
                            </div>
                        </div>
                        <div className="acs-float acs-float-2">
                            <span className="acs-float-icon">📲</span>
                            <div>
                                <div className="acs-float-val">10K+</div>
                                <div className="acs-float-lbl">Pre-Registered</div>
                            </div>
                        </div>
                        <div className="acs-float acs-float-3">
                            <span className="acs-float-icon">🌿</span>
                            <div>
                                <div className="acs-float-val">AI+IoT</div>
                                <div className="acs-float-lbl">Powered</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <About />
            <Dashboard />
            <Footer />
        </div>
    );
}

/* -- Notify form sub-component ------------------------------------------- */
function AcsNotifyForm() {
    const [email, setEmail] = useState('');
    const [done, setDone] = useState(false);

    const handle = (e) => {
        e.preventDefault();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setDone(true);
        }
    };

    return (
        <div className="acs-notify">
            <p className="acs-notify-label">
                {String.fromCodePoint(0x1F514)} Be the first to know when we launch!
            </p>
            {done ? (
                <div className="acs-notify-success">
                    {String.fromCodePoint(0x2705)} You're on the list! We'll notify you at launch.
                </div>
            ) : (
                <form className="acs-notify-form" onSubmit={handle}>
                    <input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="acs-notify-input"
                    />
                    <button type="submit" className="acs-notify-btn">
                        Notify Me
                    </button>
                </form>
            )}
        </div>
    );
}
