import React, { useState } from 'react';
import ChangePassword from './ChangePassword';
import UpdateMobile from './UpdateMobile';
import TwoFactorAuth from './TwoFactorAuth';
import './patient_dashboard.css';

export default function SecuritySettings() {
    const [activeTab, setActiveTab] = useState('password');

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🛡️ Security Settings</h1>
                    <p>Manage your password, mobile number, and 2FA in one place</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                <button 
                    className={`pd-btn ${activeTab === 'password' ? 'pd-btn-primary' : 'pd-btn-outline'}`}
                    onClick={() => setActiveTab('password')}
                >
                    🔑 Password
                </button>
                <button 
                    className={`pd-btn ${activeTab === 'mobile' ? 'pd-btn-primary' : 'pd-btn-outline'}`}
                    onClick={() => setActiveTab('mobile')}
                >
                    📱 Mobile OTP
                </button>
                <button 
                    className={`pd-btn ${activeTab === '2fa' ? 'pd-btn-primary' : 'pd-btn-outline'}`}
                    onClick={() => setActiveTab('2fa')}
                >
                    🔓 2-Factor Auth
                </button>
            </div>

            <div className="security-tab-content" style={{ marginTop: '-40px' }}>
                {activeTab === 'password' && <div className="hide-nested-headers"><ChangePassword /></div>}
                {activeTab === 'mobile' && <div className="hide-nested-headers"><UpdateMobile /></div>}
                {activeTab === '2fa' && <div className="hide-nested-headers"><TwoFactorAuth /></div>}
            </div>
            
            <style>{`
                .hide-nested-headers .pd-page-header {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
