import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/config';

const LINKS = {
    Platform: [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'For Patients', to: '/register' },
        { label: 'For Doctors', to: '/register' },
    ],
    Company: [
        { label: 'About Us', href: '#about' },
        { label: 'Our Team', href: '#about' },
        { label: 'Careers', href: '#' },
        { label: 'Blog', href: '#' },
    ],
    Support: [
        { label: 'Help Center', href: 'mailto:vaidyamedx@gmail.com' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Use', to: '/terms' },
    ],
    Contact: [
        { label: '📧 vaidyamedx@gmail.com', href: 'mailto:vaidyamedx@gmail.com' },
        { label: '💬 7052608972', href: 'https://wa.me/917052608972' },
    ]
};

const SOCIALS = [
    { label: 'Twitter', icon: '🐦', href: 'https://twitter.com' },
    { label: 'LinkedIn', icon: '💼', href: 'https://www.linkedin.com/in/govind-sharma-b95976277?utm_source=share_via&utm_content=profile&utm_medium=member_android' },
    { label: 'Instagram', icon: '📷', href: 'https://www.instagram.com/vaidyamedx?igsh=MTJoMjgydHY2emo3dA==' },
    { label: 'YouTube', icon: '▶️', href: 'https://youtube.com' },
];

export default function Footer() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const scrollTo = (id) => {
        if (id === '#') return;
        try {
            const el = document.querySelector(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.warn("Invalid selector:", id);
        }
    };

    const handleSubscribe = async (e) => {
        e.preventDefault();
        setError(null);
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();

                if (response.ok) {
                    setSubscribed(true);
                    setEmail('');
                } else {
                    setError(data.error || 'Failed to subscribe. Please try again.');
                }
            } catch (err) {
                console.error('Subscription error:', err);
                setError('Network error. Please try again later.');
            } finally {
                setLoading(false);
            }
        } else {
            setError('Please enter a valid email address.');
        }
    };

    return (
        <footer className="na-footer" id="contact">
            <div className="na-footer-inner">

                {/* Brand column */}
                <div className="na-footer-brand">
                    <div className="na-footer-logo">🌿 VaidyaMed-X</div>
                    <p className="na-footer-tagline">
                        Bridging Ayurvedic wisdom and modern AI to bring you compassionate, intelligent healthcare.
                    </p>
                    <p className="na-footer-shloka">
                        <em>"आरोग्यं परमं भाग्यम्"</em><br />
                        <small>Health is the greatest blessing.</small>
                    </p>
                    <div className="na-footer-socials">
                        {SOCIALS.map(s => (
                            <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                                className="na-social-btn" aria-label={s.label}>
                                {s.icon}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Link columns */}
                {Object.entries(LINKS).map(([col, items]) => (
                    <div className="na-footer-col" key={col}>
                        <h4 className="na-footer-col-title">{col}</h4>
                        <ul className="na-footer-links">
                            {items.map(item => (
                                <li key={item.label}>
                                    {item.to
                                        ? <Link to={item.to} className="na-footer-link">{item.label}</Link>
                                        : <a href={item.href} className="na-footer-link"
                                            onClick={e => {
                                                if (item.href.startsWith('#')) {
                                                    e.preventDefault();
                                                    scrollTo(item.href);
                                                }
                                            }}
                                        >{item.label}</a>
                                    }
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {/* Newsletter */}
                <div className="na-footer-col na-footer-newsletter">
                    <h4 className="na-footer-col-title">Stay Updated</h4>
                    <p className="na-newsletter-desc">Get Ayurvedic health tips and product updates.</p>
                    {subscribed ? (
                        <div className="na-newsletter-success">✅ Thank you for subscribing!</div>
                    ) : (
                        <form className="na-newsletter-form" onSubmit={handleSubscribe}>
                            <input
                                type="email" placeholder="your@email.com"
                                value={email} onChange={e => { setEmail(e.target.value); setError(null); }}
                                className="na-newsletter-input"
                                disabled={loading}
                            />
                            <button type="submit" className="na-newsletter-btn" disabled={loading}>
                                {loading ? 'Subscribing...' : 'Subscribe'}
                            </button>
                        </form>
                    )}
                    {error && <div className="na-newsletter-error" style={{ color: '#ff4d4d', fontSize: '0.85rem', marginTop: '8px' }}>{error}</div>}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="na-footer-bottom">
                <span>
                    © {new Date().getFullYear()} VaidyaMed-X. All rights reserved. <br />
                    <span style={{ fontSize: '0.85em', opacity: 0.8 }}>Presented by Mira Future Tech Vision Pvt Ltd</span>
                </span>
                <span>Made with 🌿 &amp; ❤️ in India</span>
            </div>
        </footer>
    );
}
