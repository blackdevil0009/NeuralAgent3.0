import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function VaidyaMedDashboard() {
    const navigate = useNavigate();
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg,#0d2410,#1a4228)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 20, color: '#fff', fontFamily: 'Poppins,sans-serif'
        }}>
            <div style={{ fontSize: '4rem' }}>🧠</div>
            <h1 style={{ fontFamily: 'Playfair Display,serif', color: '#c9a84c', fontSize: '2rem' }}>
                VaidyaMed-X Admin
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.92rem' }}>
                Admin dashboard coming soon.
            </p>
            <button
                onClick={() => navigate('/')}
                style={{
                    marginTop: 10, padding: '12px 28px', borderRadius: 50,
                    background: 'linear-gradient(135deg,#52b788,#2d6a4f)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontFamily: 'Poppins,sans-serif', fontWeight: 600, fontSize: '0.90rem'
                }}
            >
                🌿 Back to Home
            </button>
        </div>
    );
}
