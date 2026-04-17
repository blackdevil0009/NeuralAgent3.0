import React, { useState, useEffect } from 'react';

export default function Reminder() {
    const [reminders, setReminders] = useState([]);
    const [newReminder, setNewReminder] = useState({ time: '', item: '', type: 'Medicine' });

    useEffect(() => {
        const saved = localStorage.getItem('wellnessReminders');
        if (saved) setReminders(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('wellnessReminders', JSON.stringify(reminders));
    }, [reminders]);

    const addReminder = (e) => {
        e.preventDefault();
        setReminders([...reminders, { ...newReminder, id: Date.now() }]);
        setNewReminder({ time: '', item: '', type: 'Medicine' });
    };

    const deleteReminder = (id) => {
        setReminders(reminders.filter(r => r.id !== id));
    };

    return (
        <div>
            <div className="pd-grid-2">
                <div className="pd-card">
                    <h3 className="pd-section-title">➕ Add Reminder</h3>
                    <form onSubmit={addReminder} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <select
                            value={newReminder.type}
                            onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                            className="pd-select"
                            style={{ fontSize: '0.88rem' }}
                        >
                            <option>Medicine</option>
                            <option>Diet</option>
                            <option>Exercise</option>
                            <option>Water</option>
                        </select>
                        <input
                            type="time"
                            value={newReminder.time}
                            onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                            className="pd-input"
                            placeholder="Time"
                            required
                        />
                        <input
                            type="text"
                            value={newReminder.item}
                            onChange={(e) => setNewReminder({ ...newReminder, item: e.target.value })}
                            className="pd-input"
                            placeholder="e.g. Ashwagandha 1tsp, or Lunch: Khichdi"
                            required
                        />
                        <button type="submit" className="pd-btn pd-btn-primary">Add Reminder</button>
                    </form>
                </div>

                <div className="pd-card">
                    <h3 className="pd-section-title">
                        📋 Daily Schedule ({reminders.length})
                    </h3>
                    {reminders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏰</div>
                            No reminders yet
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {reminders.map(r => (
                                <li key={r.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 0', borderBottom: '1px solid rgba(45,106,79,0.12)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.item}</div>
                                        <span style={{ fontSize: '0.85rem', color: '#6b8f71' }}>
                                            {r.time} • {r.type}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => deleteReminder(r.id)}
                                        style={{
                                            background: 'rgba(231,76,60,0.1)', color: '#e74c3c', border: 'none',
                                            borderRadius: 20, padding: '6px 12px', cursor: 'pointer', fontSize: '0.8rem'
                                        }}
                                    >
                                        Delete
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div style={{ marginTop: 24, padding: 18, background: 'rgba(45,106,79,0.05)', borderRadius: 16, textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b8f71' }}>
                    💡 Enable browser notifications for real alerts
                </span>
            </div>
        </div>
    );
}

