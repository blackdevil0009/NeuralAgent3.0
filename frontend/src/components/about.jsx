import React from 'react';

const VALUES = [
    { icon: '🌿', title: 'Holistic Care', desc: 'Blending ancient Ayurvedic wisdom with modern AI for truly comprehensive health guidance.' },
    { icon: '🔬', title: 'Science-Backed', desc: 'Every recommendation is grounded in validated clinical research and Ayurvedic texts.' },
    { icon: '🔒', title: 'Privacy First', desc: 'Bank-grade encryption protects your sensitive health data at every step.' },
    { icon: '🤝', title: 'Accessible to All', desc: 'Breaking barriers to quality healthcare for patients and practitioners alike.' },
];

const TEAM = [
    { img: '/Govind Sharma.jpeg', name: 'Govind Sharma', role: 'Founder & CEO · AI & Backend Developer', bg: '#e8f5ee', avatarGrad: 'linear-gradient(135deg, #2d6a4f 0%, #52b788 100%)' },
    { img: '/MohammadAyan Husain.jpeg', name: 'Mohammad Ayan Husain', role: 'AI Research Lead', bg: '#fff8e7', avatarGrad: 'linear-gradient(135deg, #b8860b 0%, #e9c46a 100%)' },
    { img: '/Mohd Azad.jpeg', name: 'Mohd Azad', role: 'Frontend Developer', bg: '#f0eaff', avatarGrad: 'linear-gradient(135deg, #5b21b6 0%, #a78bfa 100%)' },
    { img: '/Vivek.png', name: 'Vivek Kumar Sharma', role: 'AI Research Lead', bg: '#fff8e7', avatarGrad: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)' },
    { img: '/Nandani Singh.jpeg', name: 'Nandini Singh', role: 'Product & Strategy', bg: '#fff0f5', avatarGrad: 'linear-gradient(135deg, #9d174d 0%, #f472b6 100%)' },
];

export default function About() {
    return (
        <section className="na-about" id="about">
            <div className="na-section-container">

                {/* Section header */}
                <div className="na-section-header">
                    <span className="na-badge">Our Story</span>
                    <h2 className="na-section-title">
                        Bridging <span className="na-gradient-text">Ancient Wisdom</span> &amp; Modern Medicine
                    </h2>
                    <p className="na-section-sub">
                        VaidyaMed-X was born from a belief — that everyone deserves intelligent, compassionate healthcare.
                        We combine the timeless principles of Ayurveda with cutting-edge AI to redefine what health support looks like.
                    </p>
                </div>

                {/* Values grid */}
                <div className="na-values-grid">
                    {VALUES.map(v => (
                        <div className="na-value-card" key={v.title}>
                            <div className="na-value-icon">{v.icon}</div>
                            <h3 className="na-value-title">{v.title}</h3>
                            <p className="na-value-desc">{v.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Mission strip */}
                <div className="na-mission-strip">
                    <div className="na-mission-left">
                        <h3>Our Mission</h3>
                        <p>
                            To democratize access to holistic health intelligence — serving patients with empathy
                            and empowering doctors with precision AI tools, anchored in the values of Ayurveda.
                        </p>
                    </div>
                    <div className="na-mission-stats">
                        {[['50K+', 'Consultations'], ['200+', 'Expert Doctors'], ['98%', 'Satisfaction'], ['15+', 'Specializations']].map(([n, l]) => (
                            <div className="na-mission-stat" key={l}>
                                <span className="na-mission-num">{n}</span>
                                <span className="na-mission-lbl">{l}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team */}
                <div className="na-section-header" style={{ marginTop: '60px' }}>
                    <span className="na-badge">Meet the Team</span>
                    <h2 className="na-section-title">The Minds Behind <span className="na-gradient-text">VaidyaMed-X</span></h2>
                </div>
                <div className="na-team-grid">
                    {TEAM.map(m => (
                        <div className="na-team-card" key={m.name} style={{ '--card-bg': m.bg }}>
                            <div className="na-team-avatar" style={{ background: m.avatarGrad }}>
                                <img
                                    src={m.img}
                                    alt={m.name}
                                    className="na-team-photo"
                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                />
                            </div>
                            <h4 className="na-team-name">{m.name}</h4>
                            <p className="na-team-role">{m.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
