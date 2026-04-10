import React from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import './home.css';

export default function TermsCondition() {
    return (
        <div className="home-page">
            <Header />
            <div className="na-section-container" style={{ padding: '60px 28px', minHeight: '60vh' }}>
                <h1 className="na-section-title" style={{ marginBottom: 20 }}>Terms & Conditions</h1>
                <div style={{ lineHeight: 1.8, color: 'var(--text-mute)', maxWidth: 800 }}>
                    <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>
                    <br />
                    <h3>1. Acceptance of Terms</h3>
                    <p>By using VaidyaMed-X, you agree to these Terms and Conditions. Our platform provides AI-driven health insights based on Ayurvedic principles.</p>
                    <br />
                    <h3>2. Not a Replacement for Emergency Care</h3>
                    <p>VaidyaMed-X is a clinical decision support system and health companion. In case of an absolute medical emergency, please visit the nearest hospital or contact emergency services immediately.</p>
                    <br />
                    <h3>3. User Responsibilities</h3>
                    <p>You agree to provide accurate health information to ensure the AI's diagnosis is as precise as possible. We are not liable for inaccurate insights resulting from incorrect inputs.</p>
                    <br />
                    <h3>4. Modifications</h3>
                    <p>We reserve the right to update or modify these terms at any time without prior notice.</p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
