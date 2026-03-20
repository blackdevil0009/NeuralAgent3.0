import React, { useState } from 'react';
import DoctorChangePassword from './DoctorChangePassword';
import DoctorUpdateMobile from './DoctorUpdateMobile';
import Doctor2FA from './Doctor2FA';
import './doctor_dashboard.css';

export default function DoctorSecuritySettings() {
    const [activeTab, setActiveTab] = useState('password');

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' }}>
                <button 
                    className={`dd-btn ${activeTab === 'password' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('password')}
                >
                    🔑 Password
                </button>
                <button 
                    className={`dd-btn ${activeTab === 'mobile' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('mobile')}
                >
                    📱 Mobile OTP
                </button>
                <button 
                    className={`dd-btn ${activeTab === '2fa' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('2fa')}
                >
                    🔓 2-Factor Auth
                </button>
            </div>

            <div className="security-tab-content" style={{ marginTop: '-20px' }}>
                {activeTab === 'password' && <div className="hide-nested-headers"><DoctorChangePassword /></div>}
                {activeTab === 'mobile' && <div className="hide-nested-headers"><DoctorUpdateMobile /></div>}
                {activeTab === '2fa' && <div className="hide-nested-headers"><Doctor2FA /></div>}
            </div>
            
            <style>{`
                .hide-nested-headers .dd-page-header {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
