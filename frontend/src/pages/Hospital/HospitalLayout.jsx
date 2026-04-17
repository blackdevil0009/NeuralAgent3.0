import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import './hospital_dashboard.css';
import { clearStoredAuth, getRouteForRole, getStoredAuthSession } from '../../utils/authStorage';

const NAV = [
    { id: 'overview', label: 'Dashboard', icon: '📊', path: '/hospital/dashboard' },
    { id: 'profile', label: 'Facility Profile', icon: '🏦', path: '/hospital/profile' },
    { id: 'doctors', label: 'Manage Doctors', icon: '👨‍⚕️', path: '/hospital/doctors' },
    { id: 'appointments', label: 'Appointments', icon: '📅', path: '/hospital/appointments' },
    { id: 'emergencies', label: 'Emergency Cases', icon: '🚨', path: '/hospital/emergencies' },
];

export default function HospitalLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [hospital, setHospital] = useState({ name: 'VaidyaMed Facility', admin: 'Admin' });

    useEffect(() => {
        const { token, role, userData } = getStoredAuthSession();
        
        // Basic role protection
        if (!token || role !== 'organization') {
            navigate(getRouteForRole(role) || '/hospital/login', { replace: true });
            return;
        }

        try {
            setHospital({
                name: userData?.hospitalName || 'VaidyaMed Facility',
                admin: userData?.adminName || userData?.name || 'Admin'
            });
        } catch (e) {
            console.error('Error parsing user data', e);
        }
    }, [navigate]);

    const handleLogout = () => {
        clearStoredAuth();
        navigate('/hospital/login', { replace: true });
    };

    const currentPath = location.pathname;
    const activeId = NAV.find(n => currentPath.startsWith(n.path))?.id || 'overview';

    return (
        <div className="h-shell">
            {/* Sidebar Overlay */}
            {!sidebarOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 900 }} onClick={() => setSidebarOpen(true)} />
            )}

            <aside className={`h-sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <Link to="/hospital/dashboard" className="h-sidebar-logo">
                    <span style={{ filter: 'brightness(0) invert(1)' }}>🌿</span>
                    <span>VaidyaMed-X</span>
                </Link>

                <nav className="h-nav">
                    {NAV.map(item => (
                        <Link
                            key={item.id}
                            to={item.path}
                            className={`h-nav-item ${activeId === item.id ? 'active' : ''}`}
                        >
                            <span className="h-nav-icon">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="h-sidebar-footer">
                    <button className="h-logout-btn" onClick={handleLogout}>
                        🚪 Logout Portal
                    </button>
                </div>
            </aside>

            <main className="h-main">
                <header className="h-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button className="h-notif-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
                        <input type="text" className="h-search" placeholder="Search staff, patients, records..." />
                    </div>

                    <div className="h-topbar-right">
                        <button className="h-notif-btn" title="Alerts">🔔</button>
                        <div className="h-admin-profile" onClick={() => navigate('/hospital/profile')}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{hospital.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{hospital.admin}</div>
                            </div>
                            <div className="h-avatar">H</div>
                        </div>
                    </div>
                </header>

                <section className="h-content">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}
