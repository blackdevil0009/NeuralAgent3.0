import React, { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import './admin.css';

const NAV = [
    { id: 'dashboard', label: 'Dashboard',         icon: '📊', path: '/dashboard' },
    { id: 'doctors',   label: 'Doctors',            icon: '👨‍⚕️', path: '/doctors' },
    { id: 'patients',  label: 'Patients',           icon: '🧑‍🤝‍🧑', path: '/patients' },
];

const PAGE_TITLES = {
    dashboard: 'Overview Dashboard',
    doctors:   'Doctors Management',
    patients:  'Patients Management',
};

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [adminName, setAdminName] = useState('Admin');

    useEffect(() => {
        const token = localStorage.getItem('adm_token');
        if (!token) { navigate('/login', { replace: true }); return; }
        try {
            const ud = JSON.parse(localStorage.getItem('adm_user') || '{}');
            if (ud.name) setAdminName(ud.name);
        } catch (_) {}
    }, [navigate]);

    const activeId = NAV.find(n => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.id || 'dashboard';

    const handleLogout = () => {
        localStorage.removeItem('adm_token');
        localStorage.removeItem('adm_user');
        navigate('/login', { replace: true });
    };

    return (
        <div className="adm-shell">
            <aside className="adm-sidebar">
                <Link to="/dashboard" className="adm-logo">
                    <span className="adm-logo-icon">🌿</span>
                    <span className="adm-logo-text">VaidyaMed-X</span>
                    <span className="adm-logo-badge">ADMIN</span>
                </Link>

                <nav className="adm-nav">
                    <div className="adm-nav-label">Navigation</div>
                    {NAV.map(n => (
                        <Link key={n.id} to={n.path} className={`adm-nav-item ${activeId === n.id ? 'active' : ''}`}>
                            <span className="adm-nav-icon">{n.icon}</span>
                            {n.label}
                        </Link>
                    ))}
                </nav>

                <div className="adm-sidebar-footer">
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                        Signed in as <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{adminName}</strong>
                    </div>
                    <button className="adm-logout" onClick={handleLogout}>🚪 Logout</button>
                </div>
            </aside>

            <div className="adm-main">
                <header className="adm-topbar">
                    <span className="adm-page-title">{PAGE_TITLES[activeId]}</span>
                    <div className="adm-topbar-right">
                        <div className="adm-admin-chip">🛡️ Administrator</div>
                    </div>
                </header>
                <main className="adm-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
