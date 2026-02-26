import React, { useState } from 'react';
import { handleSuccess } from '../utils/error_handlers';

const SPEC_OPTIONS = ['General Ayurveda', 'Panchakarma', 'Internal Medicine (Kayachikitsa)', 'Rasayana & Clinical Nutrition', 'Nadi Vigyan Specialist'];

export default function DoctorProfile() {
    const [profile, setProfile] = useState({
        name: 'Arjun Menon',
        spec: 'Panchakarma Specialist',
        bio: 'Dedicated practitioner of Vedic Medicine with over 12 years of experience in chronic pain management and detox therapies.',
        qualification: 'BAMS, MD (Ayurveda) - BHU',
        fees: '800',
        available: 'Mon - Fri, 10:00 AM - 4:00 PM'
    });
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        handleSuccess('Professional profile has been updated and synced with the patient search registry.');
    };

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="dd-header">
                <div>
                    <h1>🩺 Professional Profile</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Manage your clinical public bio, expertise, and availability</p>
                </div>
                <button className="dd-btn dd-btn-primary" onClick={handleSave}>💾 Save Profile</button>
            </div>


            <div className="dd-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="dd-card">
                        <h3 style={{ marginTop: 0 }}>Basic Credentials</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Full Professional Name</label>
                                <input type="text" value={'Dr. ' + profile.name} className="dd-btn dd-btn-outline" style={{ borderStyle: 'solid', display: 'block', width: '100%', textAlign: 'left', cursor: 'text' }} readOnly />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Specialization</label>
                                <select className="dd-btn dd-btn-outline" style={{ borderStyle: 'solid', display: 'block', width: '100%' }} value={profile.spec} onChange={e => setProfile({ ...profile, spec: e.target.value })}>
                                    {SPEC_OPTIONS.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Qualifications</label>
                                <input type="text" value={profile.qualification} className="dd-btn dd-btn-outline" style={{ borderStyle: 'solid', display: 'block', width: '100%', textAlign: 'left' }} />
                            </div>
                        </div>
                    </div>

                    <div className="dd-card">
                        <h3 style={{ marginTop: 0 }}>Clinical Bio</h3>
                        <textarea
                            value={profile.bio}
                            style={{ width: '100%', height: 120, borderRadius: 12, padding: 16, border: '1px solid var(--doc-border)', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.6 }}
                            onChange={e => setProfile({ ...profile, bio: e.target.value })}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="dd-card">
                        <h3 style={{ marginTop: 0 }}>Availability & Fees</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Consultation Fee (INR)</label>
                                <input type="number" value={profile.fees} className="dd-btn dd-btn-outline" style={{ borderStyle: 'solid', display: 'block', width: '100%', textAlign: 'left' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Working Hours</label>
                                <input type="text" value={profile.available} className="dd-btn dd-btn-outline" style={{ borderStyle: 'solid', display: 'block', width: '100%', textAlign: 'left' }} />
                            </div>
                        </div>
                    </div>

                    <div className="dd-card" style={{ background: 'var(--doc-green-deep)', color: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: '2rem' }}>⭐</span>
                            <div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>4.8 / 5.0</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Patient Feedback Score</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                            Your profile is "Highly Rated" in the Panchakarma category. Consistently fast response times have boosted your visibility.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
