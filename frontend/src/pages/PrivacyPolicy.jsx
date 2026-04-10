import React from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import './home.css';

export default function PrivacyPolicy() {
    return (
        <div className="home-page">
            <Header />
            <div className="na-section-container" style={{ padding: '60px 28px', minHeight: '60vh' }}>
                <h1 className="na-section-title" style={{ marginBottom: 20 }}>Privacy Policy</h1>
                <div style={{ lineHeight: 1.8, color: 'var(--text-mute)', maxWidth: 800 }}>
                    <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>
                    <br />
                    <h3>1. Information We Collect</h3>
                    <p>We collect information that you provide directly to us, including your health data, personal details, and medical records needed for the AI consultation.</p>
                    <br />
                    <h3>2. How We Use Your Information</h3>
                    <p>Your information is securely processed to provide personalized Ayurvedic health insights and medical support via our AI system.</p>
                    <br />
                    <h3>3. Data Security</h3>
                    <p>We use end-to-end encryption to protect your medical details and ensure compliance with healthcare privacy standards.</p>
                    <br />
                    <h3>4. Contact Us</h3>
                    <p>If you have any questions about this Privacy Policy, please contact us at <strong>vaidyamedx@gmail.com</strong>.</p>
                </div>
            </div>
            <Footer />
        </div>
    );
}
