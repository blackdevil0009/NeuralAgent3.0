import React, { useEffect, useState, useMemo } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError } from '../../utils/error_handlers';

const STATUS_STYLES = {
    confirmed:  { background: '#dcfce7', color: '#15803d' },
    completed:  { background: '#dbeafe', color: '#1d4ed8' },
    pending:    { background: '#fef9c3', color: '#92400e' },
    cancelled:  { background: '#fee2e2', color: '#991b1b' },
};

function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
    if (!iso) return '—';
    // iso can be "HH:MM:SS"
    const parts = iso.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function StatusBadge({ status }) {
    const s = STATUS_STYLES[status?.toLowerCase()] || { background: '#f1f5f9', color: '#64748b' };
    return (
        <span style={{
            ...s,
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 700,
            textTransform: 'capitalize',
            display: 'inline-block',
        }}>
            {status || 'Unknown'}
        </span>
    );
}

function AppointmentDetailModal({ appt, onClose }) {
    if (!appt) return null;
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
        }} onClick={onClose}>
            <div style={{
                background: '#fff', borderRadius: '20px', padding: '32px',
                maxWidth: '520px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem', color: '#0f172a' }}>
                        Appointment #{appt.id}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gap: '14px' }}>
                    {[
                        ['Patient', appt.patientName || '—'],
                        ['Doctor', appt.doctorName || '—'],
                        ['Specialization', appt.spec || '—'],
                        ['Date', formatDate(appt.appointmentDate)],
                        ['Time', formatTime(appt.appointmentTime)],
                        ['Type', appt.appointmentType || '—'],
                        ['Status', <StatusBadge key="s" status={appt.status} />],
                        ['Payment', appt.paymentStatus === 'paid' ? '✅ Paid' : appt.paymentStatus],
                        ['Amount', appt.amountPaid ? `₹${appt.amountPaid}` : '—'],
                        ['Purpose', appt.purpose || '—'],
                        ['Notes', appt.notes || '—'],
                    ].map(([label, val]) => (
                        <div key={label} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                            <span style={{ fontSize: '0.83rem', color: '#64748b', minWidth: '110px', flexShrink: 0 }}>{label}</span>
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{val}</span>
                        </div>
                    ))}
                </div>

                <button onClick={onClose} style={{
                    marginTop: '24px', width: '100%', padding: '12px',
                    background: '#1b4332', color: '#fff', border: 'none', borderRadius: '12px',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                }}>Close</button>
            </div>
        </div>
    );
}

export default function HospitalAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) { setLoading(false); return; }

        const fetchAppointments = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.data?.message || 'Failed to load appointments.');
                setAppointments(json.data?.appointments || []);
            } catch (err) {
                handleError(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, []);

    const filtered = useMemo(() => {
        let list = appointments;

        if (statusFilter !== 'all') {
            list = list.filter(a => (a.status || '').toLowerCase() === statusFilter);
        }

        if (dateFilter) {
            list = list.filter(a => a.appointmentDate === dateFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(a =>
                (a.patientName || '').toLowerCase().includes(q) ||
                (a.doctorName  || '').toLowerCase().includes(q) ||
                String(a.id).includes(q)
            );
        }

        return list;
    }, [appointments, statusFilter, dateFilter, search]);

    const todayCount = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return appointments.filter(a => a.appointmentDate === today).length;
    }, [appointments]);

    return (
        <div className="h-appointments-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontWeight: 800 }}>Facility Appointments</h1>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        All confirmed appointments across hospital doctors
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', background: '#f0faf4', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '14px 20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1b4332' }}>{appointments.length}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</div>
                    </div>
                    <div style={{ width: '1px', background: '#d1fae5' }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2d6a4f' }}>{todayCount}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Today</div>
                    </div>
                </div>
            </div>

            <div className="h-card-base">
                {/* Filter bar */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Search patient, doctor, ID..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem', minWidth: '220px', flex: 1 }}
                    />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}
                    />
                    {(search || statusFilter !== 'all' || dateFilter) && (
                        <button
                            onClick={() => { setSearch(''); setStatusFilter('all'); setDateFilter(''); }}
                            style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Clear ✕
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                        Loading appointments...
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
                        {error}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📅</div>
                        <div style={{ fontWeight: 700, marginBottom: '6px' }}>No appointments found</div>
                        <div style={{ fontSize: '0.88rem' }}>
                            {appointments.length === 0
                                ? 'No paid appointments have been made through hospital doctors yet.'
                                : 'No results match your current filters.'}
                        </div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="h-table">
                            <thead>
                                <tr>
                                    <th>#ID</th>
                                    <th>Patient</th>
                                    <th>Doctor</th>
                                    <th>Date &amp; Time</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(appt => (
                                    <tr key={appt.id}>
                                        <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                                            APT{String(appt.id).padStart(4, '0')}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{appt.patientName || '—'}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{appt.doctorName || '—'}</div>
                                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{appt.spec || ''}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{formatDate(appt.appointmentDate)}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatTime(appt.appointmentTime)}</div>
                                        </td>
                                        <td style={{ fontSize: '0.85rem' }}>{appt.appointmentType || '—'}</td>
                                        <td style={{ fontWeight: 600, color: '#1b4332' }}>
                                            {appt.amountPaid ? `₹${appt.amountPaid}` : '—'}
                                        </td>
                                        <td><StatusBadge status={appt.status} /></td>
                                        <td>
                                            <button
                                                onClick={() => setSelected(appt)}
                                                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#1b4332' }}
                                            >
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer count */}
                {!loading && !error && filtered.length > 0 && (
                    <div style={{ marginTop: '14px', fontSize: '0.83rem', color: '#94a3b8', textAlign: 'right' }}>
                        Showing {filtered.length} of {appointments.length} appointments
                    </div>
                )}
            </div>

            {selected && <AppointmentDetailModal appt={selected} onClose={() => setSelected(null)} />}
        </div>
    );
}
