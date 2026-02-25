import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
        { label: 'Help Center', href: '#' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Use', href: '#' },
        { label: 'Contact Us', href: '#contact' },
    ],
};

const SOCIALS = [
    { label: 'Twitter', icon: '🐦', href: 'https://twitter.com' },
    { label: 'LinkedIn', icon: '💼', href: 'https://linkedin.com' },
    { label: 'Instagram', icon: '📷', href: 'https://instagram.com' },
    { label: 'YouTube', icon: '▶️', href: 'https://youtube.com' },
];

export default function Footer() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const scrollTo = (id) => {
        const el = document.querySelector(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setSubscribed(true);
            setEmail('');
        }
    };

    return (
        <footer className="na-footer" id="contact">
            <div className="na-footer-inner">

                {/* Brand column */}
                <div className="na-footer-brand">
                    <div className="na-footer-logo">🌿 NeuralAgent</div>
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
                                value={email} onChange={e => setEmail(e.target.value)}
                                className="na-newsletter-input"
                            />
                            <button type="submit" className="na-newsletter-btn">Subscribe</button>
                        </form>
                    )}
                </div>
            </div>

            {/* Bottom bar */}
            <div className="na-footer-bottom">
                <span>© {new Date().getFullYear()} NeuralAgent. All rights reserved.</span>
                <span>Made with 🌿 &amp; ❤️ in India</span>
            </div>
        </footer>
    );
}
