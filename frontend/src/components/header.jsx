import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else if (location.pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [location]);

    const scrollTo = (id) => {
        setMenuOpen(false);
        if (location.pathname !== '/') {
            navigate(`/#${id}`);
        } else {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className={`na-header ${scrolled ? 'scrolled' : ''}`}>
            <div className="na-header-inner">
                {/* Logo */}
                <Link to="/" className="na-logo">
                    <span className="na-logo-icon">🌿</span>
                    <span className="na-logo-text">VaidyaMed-X</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="na-nav">
                    <button className="na-nav-link" onClick={() => scrollTo('hero')}>Home</button>
                    <button className="na-nav-link" onClick={() => scrollTo('features')}>Features</button>
                    <button className="na-nav-link" onClick={() => scrollTo('about')}>About</button>
                    <button className="na-nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
                    <button className="na-nav-link" onClick={() => scrollTo('contact')}>Contact</button>
                    <button className="na-nav-link" onClick={() => navigate('/blog')}>Blog</button>
                    <button className="na-nav-link" onClick={() => navigate('/pricing')}>Pricing</button>
                </nav>

                {/* CTA Buttons */}
                <div className="na-header-actions">
                    <Link to="/login" className="na-btn-outline">Login</Link>
                    <Link to="/register" className="na-btn-solid">Get Started</Link>
                </div>

                {/* Hamburger */}
                <button
                    className={`na-hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen(p => !p)}
                    aria-label="Toggle menu"
                >
                    <span /><span /><span />
                </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
                <div className="na-mobile-menu">
                    <button className="na-nav-link" onClick={() => scrollTo('hero')}>Home</button>
                    <button className="na-nav-link" onClick={() => scrollTo('features')}>Features</button>
                    <button className="na-nav-link" onClick={() => scrollTo('about')}>About</button>
                    <button className="na-nav-link" onClick={() => scrollTo('how-it-works')}>How It Works</button>
                    <button className="na-nav-link" onClick={() => scrollTo('contact')}>Contact</button>
                    <button className="na-nav-link" onClick={() => navigate('/blog')}>Blog</button>
                    <button className="na-nav-link" onClick={() => navigate('/pricing')}>Pricing</button>
                    <div className="na-mobile-actions">
                        <Link to="/login" className="na-btn-outline" onClick={() => setMenuOpen(false)}>Login</Link>
                        <Link to="/register" className="na-btn-solid" onClick={() => setMenuOpen(false)}>Get Started</Link>
                    </div>
                </div>
            )}
        </header>
    );
}
