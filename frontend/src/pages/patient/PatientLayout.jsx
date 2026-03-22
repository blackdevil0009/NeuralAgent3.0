import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import './patient_dashboard.css';
import { handleError } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

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
];

const SETTINGS_NAV = [
    { id: 'security', label: 'Security Settings', icon: '🛡️', path: '/patient/settings/security' },
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
    'security': 'Security Settings',
};

export default function PatientLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState({ name: 'Patient', avatar: '🧘' });
    const [counts, setCounts] = useState({ messages: 0 });

    const fetchCounts = useCallback(async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                const notifs = json.notifications || [];
                const unreadMsgs = notifs.filter(n => !n.read && n.sourceType === 'Message').length;
                setCounts({ messages: unreadMsgs });
            }
        } catch (err) {
            handleError(err, 'Failed to fetch notification counts');
        }
    }, []);

    useEffect(() => {
        try {
            const stored = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            if (stored.name) setUser({ name: stored.name, avatar: '🧘' });
        } catch { }

        fetchCounts();
        const interval = setInterval(fetchCounts, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [fetchCounts]);

    const currentPath = location.pathname;
    const allNav = [...NAV, ...SETTINGS_NAV];
    const activeId = allNav.find(n => currentPath === n.path || currentPath.startsWith(n.path + '/'))?.id || 'health';

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        localStorage.removeItem('role');
        sessionStorage.removeItem('role');
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
                <Link to="/patient/health" className="pd-sidebar-logo" onClick={() => setSidebarOpen(false)}>
                    <span className="pd-logo-icon">🌿</span>
                    <span className="pd-logo-text">VaidyaMed-X</span>
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
                            {n.id === 'inbox' && counts.messages > 0 && <span className="pd-nav-badge">{counts.messages}</span>}
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

                    <div className="pd-sidebar-footer" style={{ borderTop: 'none', padding: '20px 20px 0' }}>
                        <button className="pd-logout-btn" onClick={handleLogout}>
                            🚪 Logout
                        </button>
                    </div>
                </nav>
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
                        <button className="pd-icon-btn" title="Messages" onClick={() => navigate('/patient/inbox')}>
                            💬
                            {counts.messages > 0 && <span className="pd-badge">{counts.messages}</span>}
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
