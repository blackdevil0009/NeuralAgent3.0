import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import './doctor_dashboard.css';
import { clearStoredAuth, getStoredAuthSession } from '../../utils/authStorage';

const NAV = [
    { id: 'dashboard', label: 'Patient Management', icon: '📋', path: '/doctor/dashboard' },
    { id: 'schedule', label: 'My Schedule', icon: '📅', path: '/doctor/schedule' },
    { id: 'inbox', label: 'Message Center', icon: '💬', path: '/doctor/inbox', badge: 2 },
    { id: 'profile', label: 'Professional Profile', icon: '👨‍⚕️', path: '/doctor/profile' },
    { id: 'emergency', label: 'Emergency Cases', icon: '🚨', path: '/doctor/emergency', badge: '!' },
];

const SETTINGS_NAV = [
    { id: 'security', label: 'Security Settings', icon: '🛡️', path: '/doctor/settings/security' },
];

const PAGE_TITLES = {
    dashboard: 'Patient Management Dashboard',
    schedule: 'Daily Consultation Schedule',
    inbox: 'Clinical Message Center',
    profile: 'Medical Professional Profile',
    emergency: 'Emergency Response Center',
    security: 'Security Settings',
};

export default function DoctorLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState({ name: 'Dr. Arjun Menon', avatar: '👨‍⚕️', role: 'Senior Consultant' });
    const [globalAlert, setGlobalAlert] = useState(null); // { id, patient, type }
    const { socket } = useSocket();
    const currentDoctorId = String(getStoredAuthSession().userData?.id || '');

    useEffect(() => {
        const { token, role, userData } = getStoredAuthSession();
        
        if (!token || token === 'undefined' || role !== 'doctor') {
            navigate('/login', { replace: true });
            return;
        }

        try {
            if (userData?.name) setUser(prev => ({ ...prev, name: 'Dr. ' + (userData.name.split(' ')[0]) }));
        } catch { }

        if (!socket) return;

        socket.on('new_emergency', (data) => {
            if (String(data?.doctorId || '') !== currentDoctorId) return;
            console.log("CRITICAL EMERGENCY DETECTED:", data);
            setGlobalAlert({
                id: data.id,
                patient: data.patientName || data.patient || 'Unknown Patient',
                type: data.caseType || data.type || 'Immediate Attention Required'
            });
            
            // Auto-clear alert if needed or keep until handled
        });

        return () => {
            socket.off('new_emergency');
        };
    }, [navigate, socket, currentDoctorId]);

    const currentPath = location.pathname;
    const allNav = [...NAV, ...SETTINGS_NAV];
    const activeNav = allNav.find(n => currentPath === n.path || currentPath.startsWith(n.path + '/')) || NAV[0];

    const handleLogout = () => {
        clearStoredAuth();
        navigate('/login', { replace: true });
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

                        <button className="dd-nav-item" onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10, color: '#ff4d4d' }}>
                            <span className="dd-nav-icon">🚪</span>
                            <span>Clinical Logout</span>
                        </button>
                    </div>
                </nav>
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

                {globalAlert && (
                    <div style={{
                        background: '#c0392b', color: '#fff', padding: '12px 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        animation: 'pulse-bg 2s infinite', zIndex: 100
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                            <span style={{ fontSize: '1.4rem' }}>🚨</span>
                            <div>
                                <strong style={{ textTransform: 'uppercase' }}>CRITICAL ALERT: {globalAlert.type}</strong>
                                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Patient {globalAlert.patient} requires immediate medical intervention.</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => { setGlobalAlert(null); navigate('/doctor/emergency'); }}
                                style={{ background: '#fff', color: '#c0392b', border: 'none', padding: '6px 16px', borderRadius: 4, fontWeight: 700, cursor: 'pointer' }}
                            >
                                VIEW & ATTEMPT CASE
                            </button>
                            <button
                                onClick={() => setGlobalAlert(null)}
                                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}
                            >
                                IGNORE
                            </button>
                        </div>
                    </div>
                )}

                <main className="dd-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
