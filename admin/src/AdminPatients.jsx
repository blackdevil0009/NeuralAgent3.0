import React, { useState, useEffect, useCallback } from 'react';
import './admin.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002';

function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="adm-confirm">
                <div className="adm-confirm-icon">🗑️</div>
                <div className="adm-confirm-title">Confirm Delete</div>
                <div className="adm-confirm-desc">{message}</div>
                <div className="adm-confirm-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
                    <button className="adm-btn adm-btn-danger" onClick={onConfirm}>Delete</button>
                </div>
            </div>
        </div>
    );
}

function DetailModal({ patient, token, onClose }) {
    const [detail, setDetail] = useState(null);
    useEffect(() => {
        fetch(`${API}/api/admin/users/${patient.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(j => setDetail(j.data));
    }, [patient.id, token]);

    const d = detail || patient;
    const fields = [
        { label: 'Name', value: d.name }, { label: 'Email', value: d.email },
        { label: 'Mobile', value: d.mobile }, { label: 'Blood Group', value: d.bloodGroup },
        { label: 'Dosha', value: d.dosha }, { label: 'City', value: d.city },
        { label: 'State', value: d.state }, { label: 'Allergies', value: d.allergies },
        { label: 'Conditions', value: d.conditions }, { label: 'Pop Coins', value: `🪙 ${d.pop_coin_balance || 0}` },
        { label: 'Level', value: d.achievement_level }, { label: 'Referral Code', value: d.referral_code },
        { label: 'Referrals Done', value: d.referrals_count }, { label: 'Joined', value: d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : '—' },
    ];

    return (
        <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="adm-modal">
                <h3 className="adm-modal-title">👤 Patient Details — {d.name}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                    {fields.map(f => (
                        <div key={f.label} style={{ padding: '8px 0', borderBottom: '1px solid rgba(45,106,79,0.07)' }}>
                            <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{f.label}</div>
                            <div style={{ fontSize: '0.87rem', fontWeight: 600, color: '#1a2e1a' }}>{f.value || '—'}</div>
                        </div>
                    ))}
                </div>
                <div className="adm-modal-actions" style={{ marginTop: 16 }}>
                    <button className="adm-btn adm-btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

function EditModal({ patient, token, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: patient.name || '', email: patient.email || '', mobile: patient.mobile || '',
        blood_group: patient.bloodGroup || '', city: patient.city || '', state: patient.state || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/users/${patient.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form)
            });
            const json = await res.json();
            if (res.ok) { onSaved(json.data); onClose(); }
            else alert(json.data?.message || 'Update failed.');
        } catch (e) { alert('Connection error.'); }
        finally { setSaving(false); }
    };

    return (
        <div className="adm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="adm-modal">
                <h3 className="adm-modal-title">✏️ Edit Patient</h3>
                <div className="adm-form-row">
                    <div className="adm-form-group"><label className="adm-form-label">Full Name</label><input className="adm-form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div className="adm-form-group"><label className="adm-form-label">Email</label><input className="adm-form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="adm-form-row">
                    <div className="adm-form-group"><label className="adm-form-label">Mobile</label><input className="adm-form-input" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /></div>
                    <div className="adm-form-group">
                        <label className="adm-form-label">Blood Group</label>
                        <select className="adm-form-select" value={form.blood_group} onChange={e => setForm(p => ({ ...p, blood_group: e.target.value }))}>
                            <option value="">Unknown</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                </div>
                <div className="adm-form-row">
                    <div className="adm-form-group"><label className="adm-form-label">City</label><input className="adm-form-input" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                    <div className="adm-form-group"><label className="adm-form-label">State</label><input className="adm-form-input" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
                </div>
                <div className="adm-modal-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '💾 Save Changes'}</button>
                </div>
            </div>
        </div>
    );
}

export default function AdminPatients() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [viewPt, setViewPt]   = useState(null);
    const [editPt, setEditPt]   = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const token = localStorage.getItem('adm_token');

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ role: 'patient', search, page, per_page: 15 });
            const res = await fetch(`${API}/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (json.data) { setPatients(json.data.users || []); setTotalPages(json.data.pages || 1); }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, page, token]);

    useEffect(() => { fetchPatients(); }, [fetchPatients]);

    const handleToggle = async (pt) => {
        const res = await fetch(`${API}/api/admin/users/${pt.id}/toggle-active`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setPatients(prev => prev.map(p => p.id === pt.id ? { ...p, is_active: !p.is_active } : p));
    };

    const handleDelete = async () => {
        const res = await fetch(`${API}/api/admin/users/${confirmDel.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setPatients(prev => prev.filter(p => p.id !== confirmDel.id));
        setConfirmDel(null);
    };

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: '#1b4332' }}>Patients Management</h2>
                <p style={{ color: '#6b8f71', fontSize: '0.83rem', marginTop: 3 }}>View, edit, activate/deactivate and remove patients</p>
            </div>

            <div className="adm-card">
                <div className="adm-controls">
                    <div className="adm-search-wrap">
                        <span className="adm-search-icon">🔍</span>
                        <input type="text" className="adm-search" placeholder="Search name, email, mobile…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#999' }}>{patients.length} results</span>
                </div>

                {loading ? <div className="adm-loading">Loading patients…</div> : patients.length === 0 ? <div className="adm-empty">No patients found.</div> : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Patient</th><th>Mobile</th><th>City</th><th>Pop Coins</th><th>Level</th><th>Verified</th><th>Active</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map(pt => (
                                    <tr key={pt.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#1a2e1a', fontSize: '0.88rem' }}>{pt.name}</div>
                                            <div style={{ fontSize: '0.73rem', color: '#999' }}>{pt.email}</div>
                                        </td>
                                        <td style={{ fontSize: '0.84rem', color: '#555' }}>{pt.mobile || '—'}</td>
                                        <td style={{ fontSize: '0.84rem', color: '#777' }}>{pt.city || '—'}</td>
                                        <td><span style={{ fontWeight: 700, color: '#b85c00', fontSize: '0.85rem' }}>🪙 {pt.pop_coin_balance || 0}</span></td>
                                        <td><span className="adm-badge adm-badge-green" style={{ fontSize: '0.7rem' }}>{pt.achievement_level || 'Beginner'}</span></td>
                                        <td><span className={`adm-badge ${pt.is_email_verified ? 'adm-badge-green' : 'adm-badge-muted'}`}>{pt.is_email_verified ? '✅ Yes' : '❌ No'}</span></td>
                                        <td>
                                            <label className="adm-toggle">
                                                <input type="checkbox" checked={pt.is_active} onChange={() => handleToggle(pt)} />
                                                <span className="adm-toggle-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setViewPt(pt)}>👁️</button>
                                                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditPt(pt)}>✏️</button>
                                                <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDel(pt)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="adm-pagination">
                        <button className="adm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button key={p} className={`adm-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                        ))}
                        <button className="adm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                    </div>
                )}
            </div>

            {viewPt     && <DetailModal patient={viewPt}  token={token} onClose={() => setViewPt(null)} />}
            {editPt     && <EditModal   patient={editPt}  token={token} onClose={() => setEditPt(null)} onSaved={u => setPatients(prev => prev.map(p => p.id === u.id ? { ...p, ...u } : p))} />}
            {confirmDel && <ConfirmDialog message={`Permanently delete ${confirmDel.name}? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />}
        </div>
    );
}
