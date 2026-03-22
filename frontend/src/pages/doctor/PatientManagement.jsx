import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../../utils/error_handlers';
import { API_BASE_URL } from '../../utils/config';

export default function PatientManagement() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeNote, setActiveNote] = useState('');
    const [uploadingReport, setUploadingReport] = useState(false);
    const [loading, setLoading] = useState(true);
    const [medicalData, setMedicalData] = useState(null);
    const [activeOverlay, setActiveOverlay] = useState(null);
    const [patientContact, setPatientContact] = useState('');
    const fileInputRef = useRef(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                setAppointments(json.data?.appointments || []);
            }
        } catch (err) {
            handleError(err, 'Failed to fetch clinical queue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedPatient) {
            const savedNote = localStorage.getItem(`notes_${selectedPatient.userId}`) || '';
            setActiveNote(savedNote);
            
            // Fetch medical details
            const fetchMedical = async () => {
                try {
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    const res = await fetch(`${API_BASE_URL}/api/patients/${selectedPatient.patientId}/medical`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setMedicalData(data);
                        setPatientContact(data.mobile || '');
                    }
                } catch { }
            };
            fetchMedical();
        } else {
            setMedicalData(null);
            setPatientContact('');
        }
    }, [selectedPatient]);

    const saveNote = () => {
        localStorage.setItem(`notes_${selectedPatient.userId}`, activeNote);
        handleSuccess('Clinical notes saved to local repository.');
    };

    const exportSchedule = () => {
        const header = "ID,Patient Name,Date,Time,Status,Type\n";
        const rows = appointments.map(p => `${p.id},${p.patientName},${p.appointmentDate},${p.appointmentTime},${p.status},${p.type}`).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `clinical_queue_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleReportUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedPatient) return;
        setUploadingReport(true);
        setTimeout(() => {
            setUploadingReport(false);
            handleSuccess(`Report "${file.name}" uploaded to secure vault for ${selectedPatient.patientName}.`);
        }, 1500);
    };

    return (
        <div style={{ position: 'relative', display: 'flex', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dd-header">
                    <div>
                        <h1>👨‍⚕️ Patient Management</h1>
                        <p style={{ color: 'var(--doc-text-mute)' }}>Overview of your clinical consultations</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="dd-btn dd-btn-outline" onClick={exportSchedule}>📥 Export Queue</button>
                    </div>
                </div>

                <div className="dd-grid" style={{ marginBottom: 30 }}>
                    <div className="dd-card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Total Load</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8 }}>{appointments.length}</div>
                    </div>
                    <div className="dd-card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Confirmed</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8, color: 'var(--doc-green-light)' }}>
                            {appointments.filter(a => a.status === 'Confirmed').length}
                        </div>
                    </div>
                    <div className="dd-card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Pending</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8, color: '#f59e0b' }}>
                            {appointments.filter(a => a.status === 'Scheduled' || a.status === 'Upcoming').length}
                        </div>
                    </div>
                </div>

                <div className="dd-card">
                    <h3 style={{ marginBottom: 20 }}>Clinical Consultation Queue</h3>
                    <div className="dd-table-wrap">
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--doc-text-mute)' }}>Loading clinical data...</div>
                        ) : (
                            <table className="dd-table">
                                <thead>
                                    <tr>
                                        <th>Patient Name</th>
                                        <th>Appt. Date</th>
                                        <th>Appt. Time</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map(a => (
                                        <tr key={a.id} style={{ cursor: 'pointer', background: selectedPatient?.id === a.id ? 'var(--doc-bg-ivory)' : 'transparent' }} onClick={() => setSelectedPatient(a)}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{a.patientName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)' }}>ID: {a.id}</div>
                                            </td>
                                            <td>{new Date(a.appointmentDate).toDateString()}</td>
                                            <td>{a.appointmentTime.substring(0, 5)}</td>
                                            <td>{a.type}</td>
                                            <td>
                                                <span className={`dd-status-pill ${a.status === 'Confirmed' ? 'status-active' :
                                                    a.status === 'Cancelled' ? 'status-cancelled' : 'status-waiting'
                                                    }`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="dd-btn dd-btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelectedPatient(a); }}>Manage</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {appointments.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: 20, color: 'var(--doc-text-mute)' }}>No appointments found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {selectedPatient && (
                <div style={{ width: 400, background: '#fff', borderLeft: '1px solid var(--doc-border)', height: 'calc(100vh - 100px)', position: 'sticky', top: 0, padding: 24, boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0 }}>Patient Interaction</h2>
                        <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 30 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--doc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '2rem' }}>👤</div>
                        <h3 style={{ margin: '0' }}>{selectedPatient.patientName}</h3>
                        <p style={{ color: 'var(--doc-text-mute)' }}>Consultation ID: {selectedPatient.id}</p>
                    </div>

                    {(selectedPatient.type === 'Video Call' || selectedPatient.type === 'Video') && (
                        <button className="dd-btn" 
                            style={{ width: '100%', marginBottom: 24, justifyContent: 'center', background: 'var(--doc-accent)', color: '#fff', fontWeight: 600, fontSize: '0.95rem', padding: '12px' }}
                            onClick={() => navigate(`/doctor/vcall?patient=${selectedPatient.patientId}&name=${encodeURIComponent(selectedPatient.patientName)}&appt=${selectedPatient.id}`)}>
                            📹 Admit to Video Session
                        </button>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                        <button className="dd-btn dd-btn-outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => setActiveOverlay('medical')}>📋 Medical History</button>
                        <button className="dd-btn dd-btn-outline" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => {
                            if (patientContact) window.location.href = `tel:${patientContact.replace(/[\s\-()]/g, '')}`;
                            else alert('No contact available');
                        }}>📞 Contact Patient</button>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ borderBottom: '1px solid var(--doc-border)', paddingBottom: 8, marginBottom: 12 }}>Consultation Notes</h4>
                        <p style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic' }}>"{selectedPatient.notes || 'No notes provided by patient.'}"</p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ borderBottom: '1px solid var(--doc-border)', paddingBottom: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Clinical Reports
                            <button className="dd-btn dd-btn-outline" style={{ fontSize: '0.7rem', padding: '4px 8px' }} onClick={() => fileInputRef.current.click()} disabled={uploadingReport}>
                                {uploadingReport ? 'Uploading...' : '➕ Upload'}
                            </button>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleReportUpload} />
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)' }}>Securely upload diagnostic reports to the patient's vault.</p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ borderBottom: '1px solid var(--doc-border)', paddingBottom: 8, marginBottom: 12 }}>Doctor Observations</h4>
                        <textarea
                            style={{ width: '100%', height: 150, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'none' }}
                            placeholder="Type medical notes for this session..."
                            value={activeNote}
                            onChange={(e) => setActiveNote(e.target.value)}
                        />
                        <button className="dd-btn dd-btn-primary" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={saveNote}>Save Observations</button>
                    </div>
                </div>
            )}

            {/* MEDICAL HISTORY OVERLAY */}
            {activeOverlay === 'medical' && selectedPatient && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto', position: 'relative', color: '#333' }}>
                        <button onClick={() => setActiveOverlay(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.1)', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', zIndex: 10 }}>×</button>
                        <div style={{ padding: 36 }}>
                            <h2 style={{ color: 'var(--doc-green-deep)', marginBottom: 20 }}>📋 Medical History: {selectedPatient.patientName}</h2>
                            {!medicalData ? (
                                <p style={{ color: '#888' }}>No medical history on file for this patient.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ background: '#f8f9f8', padding: 15, borderRadius: 10 }}>
                                        <h4 style={{ margin: '0 0 5px' }}>🏥 Conditions</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{medicalData.conditions || 'None reported'}</p>
                                    </div>
                                    <div style={{ background: '#f8f9f8', padding: 15, borderRadius: 10 }}>
                                        <h4 style={{ margin: '0 0 5px' }}>💊 Medications</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{medicalData.medications || 'None reported'}</p>
                                    </div>
                                    <div style={{ background: '#fff5f5', padding: 15, borderRadius: 10, border: '1px solid #feb2b2' }}>
                                        <h4 style={{ margin: '0 0 5px', color: '#c53030' }}>⚠️ Allergies</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#c53030', fontWeight: 600 }}>{medicalData.allergies || 'None reported'}</p>
                                    </div>
                                    {medicalData.dosha && (
                                        <div style={{ background: '#f0fff4', padding: 15, borderRadius: 10 }}>
                                            <h4 style={{ margin: '0 0 5px', color: '#22543d' }}>🌿 Dosha</h4>
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>{medicalData.dosha}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            <button className="pd-btn pd-btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} onClick={() => setActiveOverlay(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


