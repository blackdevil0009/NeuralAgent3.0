import React, { useState } from 'react';

const INITIAL_SETTINGS = {
    emailReports: true,
    emailAppts: true,
    emailTips: false,
    smsOtp: true,
    smsAppts: true,
    pushMsgs: true,
    pushAnalysis: true,
};

export default function NotificationSettings() {
    const [settings, setSettings] = useState(INITIAL_SETTINGS);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSave = async () => {
        setLoading(true);
        await new Promise(r => setTimeout(r, 1200));
        setLoading(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const Section = ({ title, children, icon }) => (
        <div className="pd-card" style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                <h3 className="pd-section-title" style={{ margin: 0 }}>{title}</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {children}
            </div>
        </div>
    );

    const Toggle = ({ label, sub, active, onToggle }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-dark)' }}>{label}</div>
                <div style={{ fontSize: '0.80rem', color: 'var(--text-mute)', marginTop: 2 }}>{sub}</div>
            </div>
            <button
                onClick={onToggle}
                style={{
                    width: 48, height: 24, borderRadius: 20, border: 'none',
                    background: active ? 'var(--green-mid)' : '#ccc',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                }}
            >
                <div style={{
                    position: 'absolute', top: 3, left: active ? 27 : 3,
                    width: 18, height: 18, background: '#fff', borderRadius: '50%',
                    transition: 'left 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }} />
            </button>
        </div>
    );

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>⚙️ Notification Settings</h1>
                    <p>Control how and when you want to be notified</p>
                </div>
                <button className="pd-btn pd-btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? '⏳ Saving…' : '💾 Save Preferences'}
                </button>
            </div>

            {saved && (
                <div className="settings-success-banner">
                    ✅ Your notification preferences have been updated!
                </div>
            )}

            <div className="pd-grid-2" style={{ gap: 24 }}>
                <div>
                    <Section title="Email Notifications" icon="📧">
                        <Toggle
                            label="Monthly Health Reports"
                            sub="Detailed summaries of your health progress and AI analysis."
                            active={settings.emailReports}
                            onToggle={() => toggle('emailReports')}
                        />
                        <Toggle
                            label="Appointment Reminders"
                            sub="Get an email 24 hours before your scheduled consultation."
                            active={settings.emailAppts}
                            onToggle={() => toggle('emailAppts')}
                        />
                        <Toggle
                            label="Weekly Health Tips"
                            sub="Ayurvedic lifestyle and dietary tips curated for your Dosha."
                            active={settings.emailTips}
                            onToggle={() => toggle('emailTips')}
                        />
                    </Section>

                    <Section title="SMS Notifications" icon="📱">
                        <Toggle
                            label="Security & OTP"
                            sub="Essential for logins and profile updates. Cannot be disabled."
                            active={settings.smsOtp}
                            onToggle={() => { }} // Mandatory
                        />
                        <Toggle
                            label="Appointment Alerts"
                            sub="Quick SMS reminders 1 hour before your video call."
                            active={settings.smsAppts}
                            onToggle={() => toggle('smsAppts')}
                        />
                    </Section>
                </div>

                <div>
                    <Section title="Push Notifications" icon="🔔">
                        <Toggle
                            label="New Messages"
                            sub="Get notified immediately when a doctor sends you a message."
                            active={settings.pushMsgs}
                            onToggle={() => toggle('pushMsgs')}
                        />
                        <Toggle
                            label="AI Analysis Ready"
                            sub="Alert when your report analysis is complete and ready to view."
                            active={settings.pushAnalysis}
                            onToggle={() => toggle('pushAnalysis')}
                        />
                    </Section>

                    <div className="pd-card" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: '1.8rem' }}>🌿</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#856404' }}>Ayurvedic Privacy Sync</div>
                                <div style={{ fontSize: '0.80rem', color: '#856404', lineHeight: 1.6, marginTop: 4 }}>
                                    We respect your "Dina-charya" (daily routine). Notifications are silenced between 9:00 PM and 6:00 AM to ensure restful sleep.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
