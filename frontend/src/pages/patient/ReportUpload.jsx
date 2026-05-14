import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../../utils/config';
import { handleError } from '../../utils/error_handlers';

export default function ReportUpload() {
    const [reports, setReports]         = useState([]);
    const [dragOver, setDragOver]       = useState(false);
    const [uploading, setUploading]     = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [analysing, setAnalysing]     = useState(null);  // ID of report being analysed
    const [selected, setSelected]       = useState(null);
    const [showResult, setShowResult]   = useState(false);
    const [loading, setLoading]         = useState(true);
    const fileRef = useRef(null);

    const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    // ── Fetch list ────────────────────────────────────────────────
    const fetchReports = async () => {
        try {
            const res  = await fetch(`${API_BASE_URL}/api/reports`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            const json = await res.json();
            if (res.ok) {
                setReports(json.data?.reports || json.reports || []);
            }
        } catch (err) {
            handleError(err, 'Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    // ── Upload ────────────────────────────────────────────────────
    const handleFiles = (files) => {
        const incoming = Array.from(files || []);
        if (!incoming.length) return;

        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        const valid = [];
        for (const file of incoming) {
            if (!allowed.includes(file.type)) {
                alert(`${file.name} is not supported. Only PDF, JPG, JPEG, and PNG are allowed.`);
                continue;
            }
            if (file.size > 20 * 1024 * 1024) {
                alert(`${file.name} must be under 20 MB.`);
                continue;
            }
            valid.push({
                file,
                id: `${file.name}-${file.size}-${file.lastModified}`,
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            });
        }
        setPendingFiles(prev => [...prev, ...valid]);
        if (fileRef.current) fileRef.current.value = '';
    };

    const clearPendingFile = (id) => {
        setPendingFiles(prev => {
            const target = prev.find(item => item.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter(item => item.id !== id);
        });
    };

    const uploadPendingFiles = async () => {
        if (!pendingFiles.length) return;

        setUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            pendingFiles.forEach(item => formData.append('files', item.file));
            if (pendingFiles.length === 1) {
                formData.append('displayName', pendingFiles[0].file.name.replace(/\.[^.]+$/, ''));
            }

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `${API_BASE_URL}/api/reports`);
                xhr.setRequestHeader('Authorization', `Bearer ${token()}`);
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        setUploadProgress(Math.round((event.loaded / event.total) * 100));
                    }
                };
                xhr.onload = () => {
                    try {
                        const payload = JSON.parse(xhr.responseText || '{}');
                        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
                        else reject(new Error(payload.data?.message || payload.error || 'Upload failed'));
                    } catch (err) {
                        reject(err);
                    }
                };
                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.send(formData);
            });

            pendingFiles.forEach(item => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
            setPendingFiles([]);
            await fetchReports();
        } catch (err) {
            handleError(err, 'Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

    // ── AI Analyse ────────────────────────────────────────────────
    const handleAnalyse = async (report) => {
        setAnalysing(report.id);
        setSelected(report);
        setShowResult(true);

        try {
            const res  = await fetch(`${API_BASE_URL}/api/reports/${report.id}/analyze`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            const json = await res.json();
            if (res.ok) {
                const updated = json.data?.report || {};
                setSelected(prev => ({ ...prev, ...updated, ...json.data }));
                await fetchReports();
            } else {
                alert(json.data?.error || json.error || 'Analysis failed');
                setShowResult(false);
            }
        } catch (err) {
            handleError(err, 'Analysis failed');
            setShowResult(false);
        } finally {
            setAnalysing(null);
        }
    };

    // ── Download original file ────────────────────────────────────
    const handleDownloadFile = async (report) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/${report.id}/file`, {
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (!res.ok) { alert('File not available on server.'); return; }

            const blob = await res.blob();
            const ext  = report.filename?.split('.').pop() || 'bin';
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `${report.name}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            handleError(err, 'Download failed');
        }
    };

    // ── Download AI result as TXT ─────────────────────────────────
    const handleDownloadAnalysis = (report) => {
        if (!report.summary) { alert('Run AI analysis first.'); return; }
        const lines = [
            '=================================================',
            '  VaidyaMed-X — AI Medical Analysis Report',
            '=================================================',
            `Report    : ${report.name}`,
            `Date      : ${report.date}`,
            `File Size : ${report.size}`,
            `Status    : ${report.status}`,
            '-------------------------------------------------',
            '',
            'MEDICAL SUMMARY',
            report.summary,
            '',
            'AYURVEDIC INSIGHTS',
            report.ayurvedic,
            '',
            '=================================================',
            'Generated by VaidyaMed-X Health Platform',
            `Downloaded: ${new Date().toLocaleString('en-IN')}`,
            '=================================================',
        ].join('\n');

        const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${report.name.replace(/\s+/g, '_')}_Analysis.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Delete ────────────────────────────────────────────────────
    const handleDelete = async (report) => {
        if (!window.confirm(`Delete "${report.name}"?`)) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/reports/${report.id}`, {
                method:  'DELETE',
                headers: { 'Authorization': `Bearer ${token()}` }
            });
            if (res.ok) {
                await fetchReports();
            } else {
                alert('Delete failed.');
            }
        } catch (err) {
            handleError(err, 'Delete failed');
        }
    };

    // ─────────────────────────────────────────────────────────────
    return (
        <div>
            <div className="pd-page-header">
                <div>
                    <h1>📄 Medical Reports</h1>
                    <p>Upload your lab reports for instant AI analysis with Ayurvedic insights. Results sync to your Health Dashboard.</p>
                </div>
            </div>

            {/* ── Upload Zone ── */}
            <div
                className={`pd-upload-zone ${dragOver ? 'drag-over' : ''}`}
                style={{ marginBottom: 24 }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileRef.current?.click()}
            >
                <div className="pd-upload-icon">{uploading ? '⏳' : '📤'}</div>
                <div className="pd-upload-title">
                    {uploading ? 'Uploading your report…' : 'Drag & drop your report here'}
                </div>
                <div className="pd-upload-sub">
                    {uploading
                        ? 'Your file is being securely stored on the server.'
                        : 'Supports PDF, JPG, PNG · Max 20 MB · Lab reports, prescriptions, X-rays'}
                </div>
                {!uploading && (
                    <button
                        className="pd-btn pd-btn-primary"
                        style={{ marginTop: 16 }}
                        onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                    >
                        📁 Browse Files
                    </button>
                )}
                <input
                    ref={fileRef}
                    type="file"
                    className="pd-upload-file-input"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {uploading && (
                <div className="pd-card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: '#166534', fontWeight: 600 }}>
                        <span>Secure upload in progress</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: 10, background: '#e5efe9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#166534', borderRadius: 99, transition: 'width 180ms ease' }} />
                    </div>
                </div>
            )}

            {pendingFiles.length > 0 && (
                <div className="pd-card" style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <h3 className="pd-section-title" style={{ margin: 0 }}>Ready to Upload</h3>
                            <p style={{ color: '#789', fontSize: '0.85rem', marginTop: 4 }}>
                                Preview selected reports before secure storage and AI analysis.
                            </p>
                        </div>
                        <button className="pd-btn pd-btn-primary" onClick={uploadPendingFiles} disabled={uploading}>
                            Upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}
                        </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                        {pendingFiles.map(item => (
                            <div key={item.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fbfefc' }}>
                                {item.previewUrl ? (
                                    <img src={item.previewUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
                                ) : (
                                    <div style={{ height: 120, borderRadius: 8, background: '#edf7f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: 700, marginBottom: 10 }}>
                                        PDF
                                    </div>
                                )}
                                <div style={{ fontWeight: 600, color: '#214d34', wordBreak: 'break-word' }}>{item.file.name}</div>
                                <div style={{ fontSize: '0.78rem', color: '#789', marginTop: 4 }}>{(item.file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                <button
                                    className="pd-btn pd-btn-sm"
                                    style={{ marginTop: 10, background: '#fff5f5', color: '#b42318', border: '1px solid #fecaca' }}
                                    onClick={() => clearPendingFile(item.id)}
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Reports Table ── */}
            <div className="pd-card">
                <h3 className="pd-section-title">📋 Your Reports</h3>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>⏳ Loading reports…</div>
                ) : reports.length === 0 ? (
                    <div className="pd-empty">
                        <div className="pd-empty-icon">📭</div>
                        <h3>No reports yet</h3>
                        <p>Upload your first medical report above to get started.</p>
                    </div>
                ) : (
                    <div className="pd-table-wrap">
                        <table className="pd-report-table">
                            <thead>
                                <tr>
                                    <th>Report</th>
                                    <th>Date</th>
                                    <th>Size</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: '1.4rem' }}>
                                                    {r.filename?.endsWith('.pdf') ? '📋' : '🖼️'}
                                                </span>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{r.filename}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{r.date}</td>
                                        <td>{r.size || '---'}</td>
                                        <td>
                                            <span className={`pd-pill ${r.status === 'Analysed' ? 'pd-pill-green' : 'pd-pill-gold'}`}>
                                                {r.status === 'Analysed' ? '✅ Analysed' : '🕐 Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                <button
                                                    className="pd-btn pd-btn-primary pd-btn-sm"
                                                    onClick={() => handleAnalyse(r)}
                                                    disabled={analysing === r.id}
                                                    title="Run AI analysis on this report"
                                                >
                                                    {analysing === r.id ? '⏳' : '🤖'} AI Analyse
                                                </button>
                                                <button
                                                    className="pd-btn pd-btn-outline pd-btn-sm"
                                                    onClick={() => handleDownloadFile(r)}
                                                    title="Download original uploaded file"
                                                >
                                                    📥 File
                                                </button>
                                                {r.status === 'Analysed' && (
                                                    <button
                                                        className="pd-btn pd-btn-outline pd-btn-sm"
                                                        onClick={() => handleDownloadAnalysis(r)}
                                                        title="Download AI analysis as text file"
                                                    >
                                                        📄 Analysis
                                                    </button>
                                                )}
                                                <button
                                                    className="pd-btn pd-btn-sm"
                                                    onClick={() => handleDelete(r)}
                                                    style={{ background: '#fff5f5', color: '#c0392b', border: '1px solid #feb2b2' }}
                                                    title="Delete this report"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── AI Analysis Modal ── */}
            {showResult && selected && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(10,30,15,0.60)',
                        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 1000, padding: 20
                    }}
                    onClick={() => setShowResult(false)}
                >
                    <div
                        style={{
                            background: '#fff', borderRadius: 20, padding: 36, maxWidth: 580, width: '100%',
                            boxShadow: '0 24px 64px rgba(10,40,20,0.35)', maxHeight: '90vh', overflowY: 'auto'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '2rem', marginBottom: 6 }}>🔬</div>
                        <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#2d6a4f', marginBottom: 4 }}>
                            AI Analysis: {selected.name}
                        </h2>

                        {analysing === selected.id ? (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
                                <p style={{ color: '#6b8f71', fontWeight: 500 }}>Analysing with AI…</p>
                                <p style={{ color: '#999', fontSize: '0.85rem' }}>This may take a few seconds.</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: '#f4faf6', borderRadius: 12, padding: 18, marginTop: 16 }}>
                                    <strong style={{ color: '#2d6a4f', fontSize: '0.88rem' }}>📊 Medical Summary</strong>
                                    <p style={{ fontSize: '0.88rem', color: '#3d5c3d', marginTop: 8, lineHeight: 1.8 }}>
                                        {selected.summary || 'Summary not available. Run AI analysis first.'}
                                    </p>
                                </div>
                                <div style={{ background: '#fff8e7', borderRadius: 12, padding: 18, marginTop: 12 }}>
                                    <strong style={{ color: '#996b10', fontSize: '0.88rem' }}>🌿 Ayurvedic Insights</strong>
                                    <p style={{ fontSize: '0.88rem', color: '#5c4a0a', marginTop: 8, lineHeight: 1.8 }}>
                                        {selected.ayurvedic || 'Ayurvedic insights not available.'}
                                    </p>
                                </div>
                                <div style={{ background: '#eafaf1', borderRadius: 12, padding: 18, marginTop: 12 }}>
                                    <strong style={{ color: '#1e8449', fontSize: '0.88rem' }}>✅ Follow-Up Recommendation</strong>
                                    <p style={{ fontSize: '0.88rem', color: '#1e8449', marginTop: 8 }}>
                                        Results have been synced to your Health Dashboard. Visit your dashboard to view vitals and symptom analysis. Recommended follow-up in 3–6 months.
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                    <button
                                        className="pd-btn pd-btn-outline"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => handleDownloadAnalysis(selected)}
                                    >
                                        📄 Download Analysis
                                    </button>
                                    <button
                                        className="pd-btn pd-btn-primary"
                                        style={{ flex: 1, justifyContent: 'center' }}
                                        onClick={() => setShowResult(false)}
                                    >
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
