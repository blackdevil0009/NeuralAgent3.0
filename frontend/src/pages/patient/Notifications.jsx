import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../utils/config';

const INITIAL_NOTIFS = [
    {
        id: 1, type: 'appt', icon: '📅', read: false,
        title: 'Appointment Confirmed',
        body: 'Your video call with Dr. Arjun Menon on 28 Feb at 10:00 AM is confirmed.',
        time: '10 min ago', action: { label: 'View', path: '/patient/appointments' },
    },
    {
        id: 2, type: 'msg', icon: '💬', read: false,
        title: 'New Message from Dr. Priya Nair',
        body: 'Your personalised diet plan is ready. Please check the attachment.',
        time: '42 min ago', action: { label: 'Open Chat', path: '/patient/inbox' },
    },
    {
        id: 3, type: 'report', icon: '🔬', read: false,
        title: 'Report Analysis Complete',
        body: 'AI analysis of your CBC Blood Test is ready. Review Ayurvedic insights.',
        time: '2 hrs ago', action: { label: 'View Report', path: '/patient/reports' },
    },
    {
        id: 4, type: 'health', icon: '🌿', read: true,
        title: 'Daily Ayurvedic Tip',
        body: 'Start your morning with warm water + half a lemon to kindle Agni (digestive fire).',
        time: 'Yesterday',
    },
    {
        id: 5, type: 'appt', icon: '⏰', read: true,
        title: 'Appointment Reminder',
        body: 'You have an appointment with Dr. Priya Nair tomorrow at 04:30 PM.',
        time: 'Yesterday', action: { label: 'View', path: '/patient/appointments' },
    },
    {
        id: 6, type: 'system', icon: '🔐', read: true,
        title: 'New Login Detected',
        body: 'A new login was detected from Chrome on Windows. If this was you, no action needed.',
        time: '2 days ago', action: { label: 'Review', path: '/patient/settings/2fa' },
    },
    {
        id: 7, type: 'health', icon: '💊', read: true,
        title: 'Medication Reminder',
        body: 'Time to take your Ashwagandha supplement (500mg). Take with warm milk.',
        time: '3 days ago',
    },
];

const TYPE_COLORS = {
    appt: { bg: 'rgba(41,128,185,0.12)', color: '#2980b9' },
    msg: { bg: 'rgba(45,106,79,0.12)', color: '#2d6a4f' },
    report: { bg: 'rgba(142,68,173,0.12)', color: '#8e44ad' },
    health: { bg: 'rgba(201,168,76,0.14)', color: '#996b10' },
    system: { bg: 'rgba(231,76,60,0.10)', color: '#c0392b' },
};

export default function Notifications() {
    const navigate = useNavigate();
    const [notifs, setNotifs] = useState([]);
    const [activeFilter, setActiveFilter] = useState('All');
    const [loading, setLoading] = useState(true);

    const fetchNotifs = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                setNotifs(json.notifications || []);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifs();
    }, [fetchNotifs]);

    const unreadCount = notifs.filter(n => !n.read).length;

    const markRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
            }
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const markAllRead = async () => {
        const unread = notifs.filter(n => !n.read);
        for (const n of unread) {
            await markRead(n.id);
        }
    };

    const clearRead = () =>
        setNotifs(prev => prev.filter(n => !n.read));

    const deleteOne = (id) =>
        setNotifs(prev => prev.filter(n => n.id !== id));

    const getIcon = (type) => {
        switch (type) {
            case 'Appointment': return '📅';
            case 'Message': return '💬';
            case 'Call': return '📞';
            default: return '🔔';
        }
    };

    const getTypeKey = (type) => {
        if (type === 'Appointment') return 'appt';
        if (type === 'Message') return 'msg';
        return 'system';
    };

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - d) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return d.toLocaleDateString();
    };

    const filtered = notifs.filter(n =>
        activeFilter === 'All' ||
        (activeFilter === 'Unread' && !n.read) ||
        (activeFilter === 'Appt' && n.type === 'Appointment') ||
        (activeFilter === 'Msg' && n.type === 'Message')
    );

    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>🔔 Notifications</h1>
                    <p>
                        {unreadCount > 0
                            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                            : 'All caught up! No unread notifications.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {unreadCount > 0 && (
                        <button className="pd-btn pd-btn-outline pd-btn-sm" onClick={markAllRead}>
                            ✓ Mark all read
                        </button>
                    )}
                    <button className="pd-btn pd-btn-outline pd-btn-sm" onClick={clearRead}
                        disabled={notifs.every(n => !n.read)}>
                        🗑 Clear read
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="pd-search-filters" style={{ marginBottom: 18 }}>
                {['All', 'Unread', 'Appt', 'Msg', 'Report', 'Health', 'System'].map(f => (
                    <button key={f}
                        className={`pd-filter-chip ${activeFilter === f ? 'active' : ''}`}
                        onClick={() => setActiveFilter(f)}>
                        {f === 'Appt' ? '📅 Appts' : f === 'Msg' ? '💬 Messages' : f === 'Report' ? '🔬 Reports' : f === 'Health' ? '🌿 Health' : f === 'System' ? '⚙️ System' : f}
                    </button>
                ))}
            </div>

            {/* Notification list */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--green-mid)' }}>⏳ Loading your notifications...</div>
            ) : filtered.length === 0 ? (
                <div className="pd-empty">
                    <div className="pd-empty-icon">🔕</div>
                    <h3>No notifications here</h3>
                    <p>Check back later or change your filter.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(n => (
                        <div
                            key={n.id}
                            className="pd-card notif-card"
                            style={{
                                opacity: n.read ? 0.80 : 1,
                                cursor: 'pointer',
                                borderLeft: n.read ? '3px solid var(--border-light)' : '3px solid var(--green-mid)',
                                transition: 'all 0.20s',
                            }}
                            onClick={() => {
                                if (!n.read) markRead(n.id);
                                if (n.type === 'Message') navigate('/patient/inbox');
                                if (n.type === 'Appointment') navigate('/patient/appointments');
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                {/* Icon badge */}
                                <div style={{
                                    width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                                    background: TYPE_COLORS[getTypeKey(n.type)]?.bg || 'rgba(0,0,0,0.06)',
                                    color: TYPE_COLORS[getTypeKey(n.type)]?.color || '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.4rem',
                                }}>{getIcon(n.type)}</div>

                                {/* Text */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                                        <span style={{
                                            fontWeight: n.read ? 500 : 700,
                                            fontSize: '0.90rem',
                                            color: 'var(--text-dark)',
                                        }}>{n.type} Alert</span>
                                        {!n.read && (
                                            <span style={{
                                                width: 9, height: 9, borderRadius: '50%',
                                                background: 'var(--green-mid)', flexShrink: 0,
                                                display: 'inline-block'
                                            }} />
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-mute)', lineHeight: 1.60, margin: 0, marginBottom: 6 }}>
                                        {n.message}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: '0.70rem', color: 'var(--text-mute)' }}>⏱ {formatTime(n.timestamp)}</span>
                                        {!n.read && (
                                            <span
                                                style={{ fontSize: '0.70rem', color: 'var(--text-mute)', cursor: 'pointer' }}
                                                onClick={e => { e.stopPropagation(); markRead(n.id); }}>
                                                Mark read
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Delete */}
                                <button
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1rem', padding: '2px 4px', flexShrink: 0 }}
                                    onClick={e => { e.stopPropagation(); deleteOne(n.id); }}
                                    title="Dismiss"
                                >✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notification preferences hint */}
            <div className="pd-card" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: '2rem' }}>⚙️</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.90rem', marginBottom: 3 }}>Notification Preferences</div>
                    <div style={{ fontSize: '0.80rem', color: 'var(--text-mute)' }}>
                        Control which alerts you receive via email, SMS, or push.
                    </div>
                </div>
                <button className="pd-btn pd-btn-outline pd-btn-sm"
                    onClick={() => navigate('/patient/settings/notifications')}>Manage →</button>
            </div>
        </div>
    );
}
