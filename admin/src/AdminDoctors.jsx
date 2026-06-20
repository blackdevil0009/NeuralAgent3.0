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

function EditModal({ doctor, token, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: doctor.name || '',
        email: doctor.email || '',
        specialization: doctor.specialization || '',
        hospital: doctor.hospital || '',
        consultant_fee: doctor.consultant_fee || 0,
        experience: doctor.experience || '',
        verification_status: doctor.verification_status || 'pending',
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/admin/users/${doctor.id}`, {
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
                <h3 className="adm-modal-title">✏️ Edit Doctor Profile</h3>
                <div className="adm-form-row">
                    <div className="adm-form-group"><label className="adm-form-label">Full Name</label><input className="adm-form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div className="adm-form-group"><label className="adm-form-label">Email</label><input className="adm-form-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div className="adm-form-row">
                    <div className="adm-form-group"><label className="adm-form-label">Specialization</label><input className="adm-form-input" value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} /></div>
                    <div className="adm-form-group"><label className="adm-form-label">Hospital</label><input className="adm-form-input" value={form.hospital} onChange={e => setForm(p => ({ ...p, hospital: e.target.value }))} /></div>
                </div>
                <div className="adm-form-row">
                    <div className="adm-form-group"><label className="adm-form-label">Fee (₹)</label><input className="adm-form-input" type="number" value={form.consultant_fee} onChange={e => setForm(p => ({ ...p, consultant_fee: Number(e.target.value) }))} /></div>
                    <div className="adm-form-group"><label className="adm-form-label">Experience (yrs)</label><input className="adm-form-input" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} /></div>
                </div>
                <div className="adm-form-group">
                    <label className="adm-form-label">Verification Status</label>
                    <select className="adm-form-select" value={form.verification_status} onChange={e => setForm(p => ({ ...p, verification_status: e.target.value }))}>
                        <option value="pending">Pending</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
                <div className="adm-modal-actions">
                    <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancel</button>
                    <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '💾 Save Changes'}</button>
                </div>
            </div>
        </div>
    );
}

export default function AdminDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [editDoc, setEditDoc] = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const token = localStorage.getItem('adm_token');

    const fetchDoctors = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ role: 'doctor', search, page, per_page: 15 });
            const res = await fetch(`${API}/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (json.data) { setDoctors(json.data.users || []); setTotalPages(json.data.pages || 1); }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, page, token]);

    useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

    const handleToggle = async (doc) => {
        const res = await fetch(`${API}/api/admin/users/${doc.id}/toggle-active`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: !d.is_active } : d));
    };

    const handleVerify = async (doc) => {
        const res = await fetch(`${API}/api/admin/users/${doc.id}/verify`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, verification_status: 'verified', is_verified: true } : d));
    };

    const handleDelete = async () => {
        const res = await fetch(`${API}/api/admin/users/${confirmDel.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDoctors(prev => prev.filter(d => d.id !== confirmDel.id));
        setConfirmDel(null);
    };

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.4rem', color: '#1b4332' }}>Doctors Management</h2>
                <p style={{ color: '#6b8f71', fontSize: '0.83rem', marginTop: 3 }}>Verify, edit, activate/deactivate and remove registered doctors</p>
            </div>

            <div className="adm-card">
                <div className="adm-controls">
                    <div className="adm-search-wrap">
                        <span className="adm-search-icon">🔍</span>
                        <input type="text" className="adm-search" placeholder="Search name, email, mobile…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: '#999' }}>{doctors.length} results</span>
                </div>

                {loading ? <div className="adm-loading">Loading doctors…</div> : doctors.length === 0 ? <div className="adm-empty">No doctors found.</div> : (
                    <div className="adm-table-wrap">
                        <table className="adm-table">
                            <thead>
                                <tr>
                                    <th>Doctor</th><th>Specialization</th><th>Hospital</th><th>Fee</th><th>Status</th><th>Active</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {doctors.map(doc => (
                                    <tr key={doc.id}>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#1a2e1a', fontSize: '0.88rem' }}>{doc.name}</div>
                                            <div style={{ fontSize: '0.73rem', color: '#999' }}>{doc.email}</div>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: '#555' }}>{doc.specialization || '—'}</td>
                                        <td style={{ fontSize: '0.82rem', color: '#777', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.hospital || '—'}</td>
                                        <td style={{ fontWeight: 700, color: '#2d6a4f', fontSize: '0.85rem' }}>{doc.consultant_fee ? `₹${doc.consultant_fee}` : '—'}</td>
                                        <td>
                                            <span className={`adm-badge ${doc.verification_status === 'verified' ? 'adm-badge-green' : doc.verification_status === 'rejected' ? 'adm-badge-red' : 'adm-badge-gold'}`}>
                                                {doc.verification_status === 'verified' ? '✅ Verified' : doc.verification_status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <label className="adm-toggle">
                                                <input type="checkbox" checked={doc.is_active} onChange={() => handleToggle(doc)} />
                                                <span className="adm-toggle-slider" />
                                            </label>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setEditDoc(doc)}>✏️ Edit</button>
                                                {doc.verification_status !== 'verified' && (
                                                    <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ color: '#2d6a4f' }} onClick={() => handleVerify(doc)}>✅ Verify</button>
                                                )}
                                                <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => setConfirmDel(doc)}>🗑️</button>
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

            {editDoc    && <EditModal doctor={editDoc} token={token} onClose={() => setEditDoc(null)} onSaved={u => setDoctors(prev => prev.map(d => d.id === u.id ? { ...d, ...u } : d))} />}
            {confirmDel && <ConfirmDialog message={`Permanently delete Dr. ${confirmDel.name}? This cannot be undone.`} onConfirm={handleDelete} onCancel={() => setConfirmDel(null)} />}
        </div>
    );
}
