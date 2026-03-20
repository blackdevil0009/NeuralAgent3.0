import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import './doctor_dashboard.css';

const NAV = [
    { id: 'dashboard', label: 'Patient Management', icon: '📋', path: '/doctor/dashboard' },
    { id: 'schedule', label: 'My Schedule', icon: '📅', path: '/doctor/schedule' },
    { id: 'inbox', label: 'Message Center', icon: '💬', path: '/doctor/inbox', badge: 2 },
    { id: 'ai', label: 'AI Clinical Assistant', icon: '🤖', path: '/doctor/ai' },
    { id: 'emergency', label: 'Emergency Center', icon: '🚨', path: '/doctor/emergency', badge: 'Active' },
    { id: 'profile', label: 'Professional Profile', icon: '👨‍⚕️', path: '/doctor/profile' },
];

const SETTINGS_NAV = [
    { id: 'password', label: 'Security Settings', icon: '🔐', path: '/doctor/settings/password' },
];

const PAGE_TITLES = {
    dashboard: 'Patient Management Dashboard',
    schedule: 'Daily Consultation Schedule',
    inbox: 'Clinical Message Center',
    ai: 'AI Health Analyzer',
    profile: 'Medical Professional Profile',
    password: 'Security & Access',
};

export default function DoctorLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState({ name: 'Dr. Arjun Menon', avatar: '👨‍⚕️', role: 'Senior Consultant' });

    useEffect(() => {
        try {
            const stored = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            if (stored.name) setUser(prev => ({ ...prev, name: 'Dr. ' + (stored.name.split(' ')[0]) }));
        } catch { }
    }, []);

    const currentPath = location.pathname;
    const allNav = [...NAV, ...SETTINGS_NAV];
    const activeNav = allNav.find(n => currentPath === n.path || currentPath.startsWith(n.path + '/')) || NAV[0];

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="dd-shell">
            {/* ── Sidebar ── */}
            <aside className="dd-sidebar">
                <Link to="/doctor/dashboard" className="dd-sidebar-logo">
                    <span className="dd-logo-icon">🌿</span>
                    <span className="dd-logo-text">VaidyaMed-X</span>
                </Link>

                <div className="dd-sidebar-user">
                    <div className="dd-user-avatar">{user.avatar}</div>
                    <div>
                        <div className="dd-user-name">{user.name}</div>
                        <div className="dd-user-role">{user.role}</div>
                    </div>
                </div>

                <nav className="dd-nav">
                    <div className="dd-nav-group">
                        <div className="dd-nav-label">Clinical Workspace</div>
                        {NAV.map(n => (
                            <Link
                                key={n.id}
                                to={n.path}
                                className={`dd-nav-item ${activeNav.id === n.id ? 'active' : ''} ${n.id === 'emergency' ? 'dd-nav-emergency' : ''}`}
                            >
                                <span className="dd-nav-icon">{n.icon}</span>
                                <span>{n.label}</span>
                                {n.badge && <span className="dd-badge" style={{
                                    position: 'relative', top: 0, right: 0, marginLeft: 'auto',
                                    background: n.id === 'emergency' ? '#c0392b' : 'var(--doc-accent)',
                                    color: '#fff'
                                }}>{n.badge}</span>}
                            </Link>
                        ))}
                    </div>

                    <div className="dd-nav-group">
                        <div className="dd-nav-label">Account</div>
                        {SETTINGS_NAV.map(n => (
                            <Link
                                key={n.id}
                                to={n.path}
                                className={`dd-nav-item ${activeNav.id === n.id ? 'active' : ''}`}
                            >
                                <span className="dd-nav-icon">{n.icon}</span>
                                <span>{n.label}</span>
                            </Link>
                        ))}
                    </div>
                </nav>

                <div style={{ padding: 20 }}>
                    <button className="dd-nav-item" onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span className="dd-nav-icon">🚪</span>
                        <span>Clinical Logout</span>
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="dd-main">
                <header className="dd-topbar">
                    <div className="dd-topbar-left">
                        <span className="dd-page-title">{PAGE_TITLES[activeNav.id]}</span>
                    </div>

                    <div className="dd-topbar-right">
                        <button className="dd-icon-btn" title="Clinical Inbox" onClick={() => navigate('/doctor/inbox')}>
                            💬 <span className="dd-badge">2</span>
                        </button>
                        <div className="dd-user-avatar" style={{ width: 36, height: 36, fontSize: '1rem', cursor: 'pointer' }} onClick={() => navigate('/doctor/profile')}>
                            {user.avatar}
                        </div>
                    </div>
                </header>

                <main className="dd-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
