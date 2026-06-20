import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import blogHeroImg from '../assets/blog_hero.png';
import './blog.css';

/* ── Scroll reveal hook ───────────────────────── */
function useReveal() {
    const refs = useRef([]);
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('visible');
                        observer.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        refs.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);
    return (i) => (el) => { refs.current[i] = el; };
}

/* ── Data ─────────────────────────────────────── */
const TOPICS = [
    { icon: '🤖', label: 'Healthcare Innovations' },
    { icon: '🧠', label: 'AI in Medical Technology' },
    { icon: '🥗', label: 'Smart Wellness & Diet' },
    { icon: '🚨', label: 'Emergency Healthcare Awareness' },
    { icon: '💻', label: 'Digital Health Transformation' },
    { icon: '📡', label: 'Health Monitoring Technologies' },
    { icon: '🛡️', label: 'Preventive Healthcare' },
    { icon: '🔬', label: 'Future Healthcare Research' },
];

const UNIQUE_FEATURES = [
    {
        icon: '🤖',
        title: 'AI-Powered Healthcare Assistance',
        desc: 'Cutting-edge artificial intelligence that understands symptoms, analyses reports, and provides personalised health guidance 24/7.',
    },
    {
        icon: '🔗',
        title: 'Smart Doctor–Patient Connectivity',
        desc: 'Seamless real-time communication between patients and verified healthcare professionals through secure video consultations and messaging.',
    },
    {
        icon: '📋',
        title: 'Health Report Analysis',
        desc: 'Upload lab reports and get instant AI-powered interpretation with actionable health insights and recommended next steps.',
    },
    {
        icon: '📡',
        title: 'IoT-Enabled Monitoring',
        desc: 'Connect smart health devices for continuous monitoring of vital signs and receive proactive alerts for early intervention.',
    },
    {
        icon: '🏆',
        title: 'Reward-Based Wellness Ecosystem',
        desc: 'Earn points and unlock rewards by achieving wellness milestones — making healthy habits engaging and motivating.',
    },
    {
        icon: '🚑',
        title: 'Emergency Healthcare Solutions',
        desc: 'One-tap SOS alerts, nearest hospital navigation, and real-time doctor dispatch for time-critical medical situations.',
    },
    {
        icon: '🌱',
        title: 'Personalised Healthcare Experiences',
        desc: 'Tailored Ayurvedic and modern medicine recommendations based on your unique health profile, dosha, and lifestyle.',
    },
];

export default function Blog() {
    const navigate = useNavigate();
    const ref = useReveal();

    return (
        <div className="blog-page">
            <Header />

            {/* ──────────── HERO ──────────── */}
            <section className="blog-hero" id="blog-hero">
                <div className="blog-hero-inner">
                    {/* Left */}
                    <div className="blog-hero-content">
                        <div className="blog-hero-badge">
                            <span className="pulse-dot" />
                            Official Blog · Vaidyamed-X
                        </div>

                        <h1 className="blog-hero-title">
                            Insights into
                            <span className="bh-gradient">Intelligent Healthcare</span>
                        </h1>

                        <p className="blog-hero-desc">
                            Welcome to the official blog of <strong>Vaidyamed-X</strong> — an intelligent
                            healthcare ecosystem powered by AI and developed by{' '}
                            <strong>Mira Future Tech Vision Private Limited</strong>. Explore innovations,
                            research and the future of digital health.
                        </p>

                        <div className="blog-hero-meta">
                            <div className="blog-meta-chip">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                AI · IoT · Wellness
                            </div>
                            <div className="blog-meta-chip">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Patients · Doctors · Researchers
                            </div>
                            <div className="blog-meta-chip">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Updated Weekly
                            </div>
                        </div>
                    </div>

                    {/* Right — hero image */}
                    <div className="blog-hero-visual">
                        <div className="blog-hero-img-wrap">
                            <img src={blogHeroImg} alt="AI Healthcare Intelligence" />
                            <div className="blog-hero-img-overlay" />
                        </div>
                        <div className="blog-float-pill">
                            <span className="pill-icon">🌿</span>
                            <div className="pill-text">
                                <strong>AI + Ayurveda</strong>
                                <span>Future of Healthcare</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────────── INTRO + TOPICS ──────────── */}
            <section className="blog-intro-section" id="blog-intro">
                <div className="blog-intro-inner">
                    {/* Left — welcome text */}
                    <div className="blog-intro-text blog-reveal" ref={ref(0)}>
                        <span className="na-badge">About This Blog</span>
                        <h2 style={{ marginTop: '14px' }}>
                            Smarter. Faster. More{' '}
                            <span className="bi-hl">Accessible Healthcare.</span>
                        </h2>

                        <p>
                            At Vaidyamed-X, we believe healthcare should be smarter, faster, more accessible,
                            and technology-driven. Through this platform, we aim to connect patients and doctors
                            while integrating advanced technologies like Artificial Intelligence, smart health
                            monitoring, IoT healthcare devices, emergency healthcare support, and personalised
                            wellness systems.
                        </p>

                        <p>
                            Our blog is dedicated to sharing the latest breakthroughs, expert insights, and
                            real-world applications that are reshaping the future of medicine. Whether you are
                            a patient, healthcare professional, medical student, or technology enthusiast — this
                            space has been built for you.
                        </p>

                        <p>
                            Stay connected and explore how intelligent healthcare is transforming lives one
                            innovation at a time.
                        </p>
                    </div>

                    {/* Right — topics */}
                    <div className="blog-topics-col blog-reveal" ref={ref(1)}>
                        <h3>Topics We Cover</h3>
                        <div className="blog-topics-grid">
                            {TOPICS.map((t, i) => (
                                <div className="blog-topic-chip" key={i}>
                                    <span className="btc-icon">{t.icon}</span>
                                    <span className="btc-label">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────────── WHAT MAKES US UNIQUE ──────────── */}
            <section className="blog-unique-section" id="blog-unique">
                <div className="blog-unique-inner">
                    <div className="blog-unique-header blog-reveal" ref={ref(2)}>
                        <span className="na-badge">Our Edge</span>
                        <h2 style={{ marginTop: '14px' }}>
                            What Makes{' '}
                            <span className="na-gradient-text">Vaidyamed-X Unique?</span>
                        </h2>
                        <p>
                            A next-generation healthcare ecosystem that blends timeless Ayurvedic wisdom
                            with state-of-the-art artificial intelligence for truly holistic care.
                        </p>
                    </div>

                    <div className="blog-unique-grid">
                        {UNIQUE_FEATURES.map((f, i) => (
                            <div
                                className="blog-unique-card blog-reveal"
                                ref={ref(3 + i)}
                                key={i}
                                style={{ transitionDelay: `${i * 0.08}s` }}
                            >
                                <span className="buc-number">{String(i + 1).padStart(2, '0')}</span>
                                <div className="buc-icon">{f.icon}</div>
                                <div className="buc-title">{f.title}</div>
                                <div className="buc-desc">{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ──────────── MISSION STRIP ──────────── */}
            <div className="blog-mission-strip blog-reveal" ref={ref(10)}>
                <div className="bms-left">
                    <h2>Our Mission: Healthcare for Everyone</h2>
                    <p>
                        Our mission is to make healthcare more connected, efficient, and accessible for everyone
                        through innovation and intelligent technology. We envision a world where geography,
                        language, or socioeconomic status no longer determines the quality of healthcare one
                        receives. Stay connected with Vaidyamed-X and explore the future of digital healthcare.
                    </p>
                </div>
                <button className="bms-cta" onClick={() => navigate('/register')}>
                    Join Vaidyamed-X
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </button>
            </div>

            <Footer />
        </div>
    );
}
