import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import './patient_dashboard.css';

const NAV = [
    { id: 'health', label: 'Health Dashboard', icon: '🏥', path: '/patient/health' },
    { id: 'ai', label: 'AI Assistant', icon: '🤖', path: '/patient/ai' },
    { id: 'inbox', label: 'Inbox', icon: '💬', path: '/patient/inbox', badge: true },
    { id: 'reports', label: 'Reports', icon: '📄', path: '/patient/reports' },
    { id: 'consultant', label: 'Medical Consultant', icon: '👨‍⚕️', path: '/patient/consultant' },
    { id: 'appointments', label: 'Appointments', icon: '📅', path: '/patient/appointments' },
    { id: 'emergency', label: 'Report Emergency', icon: '🚨', path: '/patient/emergency' },
    { id: 'doctors', label: 'Find Doctors', icon: '🔍', path: '/patient/doctors' },
    { id: 'profile', label: 'My Profile', icon: '👤', path: '/patient/profile' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', path: '/patient/notifications' },
];

const SETTINGS_NAV = [
    { id: 'password', label: 'Change Password', icon: '🔑', path: '/patient/settings/password' },
    { id: 'mobile', label: 'Update Mobile', icon: '📱', path: '/patient/settings/mobile' },
    { id: '2fa', label: 'Two-Factor Auth', icon: '🔐', path: '/patient/settings/2fa' },
    { id: 'notif-settings', label: 'Notification Settings', icon: '⚙️', path: '/patient/settings/notifications' },
];

const PAGE_TITLES = {
    health: 'Health Dashboard',
    ai: 'AI Health Assistant',
    inbox: '💬 Inbox',
    reports: 'Medical Reports',
    consultant: 'Medical Consultant',
    appointments: 'Appointments',
    emergency: '🚨 Emergency Case Report',
    doctors: 'Find Doctors',
    profile: 'My Profile',
    notifications: 'Notifications',
    password: 'Change Password',
    mobile: 'Update Mobile',
    '2fa': 'Two-Factor Authentication',
    'notif-settings': 'Notification Settings',
};

export default function PatientLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState({ name: 'Patient', avatar: '🧘' });

    useEffect(() => {
        try {
            const stored = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            if (stored.name) setUser({ name: stored.name, avatar: '🧘' });
        } catch { }
    }, []);

    const currentPath = location.pathname;
    const allNav = [...NAV, ...SETTINGS_NAV];
    const activeId = allNav.find(n => currentPath === n.path || currentPath.startsWith(n.path + '/'))?.id || 'health';

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <div className="pd-shell">
            {/* Sidebar overlay on mobile */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside className={`pd-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <Link to="/" className="pd-sidebar-logo" onClick={() => setSidebarOpen(false)}>
                    <span className="pd-logo-icon">🌿</span>
                    <span className="pd-logo-text">NeuralAgent</span>
                </Link>

                <div className="pd-sidebar-user">
                    <div className="pd-user-avatar">{user.avatar}</div>
                    <div>
                        <div className="pd-user-name">{user.name}</div>
                        <div className="pd-user-role">Patient Account</div>
                    </div>
                </div>

                <nav className="pd-nav">
                    <div className="pd-nav-group-label">Navigation</div>
                    {NAV.map(n => (
                        <Link
                            key={n.id}
                            to={n.path}
                            className={`pd-nav-item ${activeId === n.id ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="pd-nav-icon">{n.icon}</span>
                            {n.label}
                            {n.id === 'inbox' && <span className="pd-nav-badge">2</span>}
                            {n.id === 'notifications' && <span className="pd-nav-badge">3</span>}
                        </Link>
                    ))}

                    <div className="pd-nav-group-label" style={{ marginTop: 20 }}>Account Settings</div>
                    {SETTINGS_NAV.map(n => (
                        <Link
                            key={n.id}
                            to={n.path}
                            className={`pd-nav-item ${activeId === n.id ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="pd-nav-icon">{n.icon}</span>
                            {n.label}
                        </Link>
                    ))}
                </nav>

                <div className="pd-sidebar-footer">
                    <button className="pd-logout-btn" onClick={handleLogout}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <div className="pd-main">
                {/* Topbar */}
                <header className="pd-topbar">
                    <div className="pd-topbar-left">
                        <button className="pd-hamburger" onClick={() => setSidebarOpen(p => !p)}>☰</button>
                        <span className="pd-page-title">{PAGE_TITLES[activeId]}</span>
                    </div>

                    <div className="pd-search-wrap">
                        <input
                            type="text"
                            className="pd-search"
                            placeholder="Search doctors, reports, medicines…"
                        />
                    </div>

                    <div className="pd-topbar-right">
                        <button className="pd-icon-btn" title="Notifications" onClick={() => navigate('/patient/notifications')}>
                            🔔
                            <span className="pd-badge">3</span>
                        </button>
                        <button className="pd-icon-btn" title="Messages" onClick={() => navigate('/patient/inbox')}>
                            💬
                            <span className="pd-badge">2</span>
                        </button>
                        <div className="pd-topbar-avatar" onClick={() => navigate('/patient/profile')}>👤</div>
                    </div>
                </header>

                {/* Page content */}
                <main className="pd-content">
                    <Outlet />
                </main>
            </div>
        </div >
    );
}
