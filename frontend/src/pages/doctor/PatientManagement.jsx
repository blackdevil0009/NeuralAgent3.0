import React, { useState, useEffect, useRef } from 'react';

const MOCK_PATIENTS = [
    { id: 'P01', name: 'Rohit Sharma', age: 34, gender: 'Male', status: 'In-Waiting', time: '10:30 AM', reason: 'Chronic Back Pain', dosha: 'Vata', vitals: { bp: '120/80', pulse: 72, temp: '98.6°F' }, history: 'No major surgery. Occasional insomnia.' },
    { id: 'P02', name: 'Anjali Gupta', age: 28, gender: 'Female', status: 'Active', time: '10:45 AM', reason: 'Digestive Issues', dosha: 'Pitta', vitals: { bp: '110/70', pulse: 68, temp: '98.4°F' }, history: 'Lactose intolerant. History of acidity.' },
    { id: 'P03', name: 'Suresh Iyer', age: 52, gender: 'Male', status: 'In-Waiting', time: '11:15 AM', reason: 'Hypertension Management', dosha: 'Kapha', vitals: { bp: '145/95', pulse: 80, temp: '98.8°F' }, history: 'Diagnosed with Type 2 Diabetes in 2022.' },
    { id: 'P04', name: 'Meera Das', age: 45, gender: 'Female', status: 'Completed', time: '09:30 AM', reason: 'Post-Viral Fatigue', dosha: 'Vata-Pitta', vitals: { bp: '115/75', pulse: 70, temp: '98.5°F' }, history: 'Recent viral infection (Jan 2026).' },
];

export default function PatientManagement() {
    const [patients, setPatients] = useState(MOCK_PATIENTS);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [activeNote, setActiveNote] = useState('');
    const [uploadingReport, setUploadingReport] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (selectedPatient) {
            const savedNote = localStorage.getItem(`notes_${selectedPatient.id}`) || '';
            setActiveNote(savedNote);
        }
    }, [selectedPatient]);

    const saveNote = () => {
        localStorage.setItem(`notes_${selectedPatient.id}`, activeNote);
        alert('Clinical notes saved successfully!');
    };

    const exportSchedule = () => {
        const header = "ID,Name,Age,Gender,Time,Status,Reason\n";
        const rows = patients.map(p => `${p.id},${p.name},${p.age},${p.gender},${p.time},${p.status},"${p.reason}"`).join("\n");
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `schedule_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleReportUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !selectedPatient) return;

        setUploadingReport(true);

        // Simulating upload and saving to localStorage for cross-dashboard visibility
        setTimeout(() => {
            const reportsKey = `patient_reports_${selectedPatient.id}`;
            const existingReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');

            const newReport = {
                id: Date.now(),
                name: file.name,
                date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                size: (file.size / 1024).toFixed(1) + ' KB',
                status: 'Analysed',
                type: '📄',
                pill: 'pd-pill-green',
                doctorGenerated: true
            };

            localStorage.setItem(reportsKey, JSON.stringify([newReport, ...existingReports]));
            setUploadingReport(false);
            alert(`Report "${file.name}" uploaded successfully for ${selectedPatient.name}.`);
        }, 1500);
    };

    return (
        <div style={{ position: 'relative', display: 'flex', gap: 20 }}>
            {/* ── Main Dashboard ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="dd-header">
                    <div>
                        <h1>👨‍⚕️ Patient Management</h1>
                        <p style={{ color: 'var(--doc-text-mute)' }}>Overview of your patients and today's consultation flow</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="dd-btn dd-btn-outline" onClick={exportSchedule}>📥 Export Schedule</button>
                        <button className="dd-btn dd-btn-primary">➕ New Consultation</button>
                    </div>
                </div>

                <div className="dd-grid" style={{ marginBottom: 30 }}>
                    <div className="dd-card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', letterSpacing: 1 }}>Total Appointments</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8, color: 'var(--doc-green-deep)' }}>12</div>
                        <div style={{ fontSize: '0.8rem', color: '#2d6a4f', marginTop: 4 }}>📈 20% vs yesterday</div>
                    </div>
                    <div className="dd-card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', letterSpacing: 1 }}>In Waiting Room</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8, color: '#996b10' }}>4</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>Avg. wait time: 12m</div>
                    </div>
                    <div className="dd-card">
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase', letterSpacing: 1 }}>Completed Today</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: 8, color: 'var(--doc-green-light)' }}>8</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)', marginTop: 4 }}>Patient satisfaction: 4.9/5</div>
                    </div>
                </div>

                <div className="dd-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ margin: 0 }}>Consultation Queue</h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="dd-btn dd-btn-outline" style={{ padding: '6px 12px' }}>
                                <option>Today, 25 Feb</option>
                                <option>Tomorrow</option>
                            </select>
                        </div>
                    </div>

                    <div className="dd-table-wrap">
                        <table className="dd-table">
                            <thead>
                                <tr>
                                    <th>Patient Name</th>
                                    <th>Age/Gen</th>
                                    <th>Dosha</th>
                                    <th>Reason</th>
                                    <th>Appt. Time</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map(p => (
                                    <tr key={p.id} style={{ cursor: 'pointer', background: selectedPatient?.id === p.id ? 'var(--doc-bg-ivory)' : 'transparent' }} onClick={() => setSelectedPatient(p)}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--doc-text-mute)' }}>ID: {p.id}</div>
                                        </td>
                                        <td>{p.age}y / {p.gender[0]}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: 4, background: '#f0f7f2',
                                                color: 'var(--doc-green-light)', fontSize: '0.75rem', fontWeight: 600
                                            }}>{p.dosha}</span>
                                        </td>
                                        <td>{p.reason}</td>
                                        <td>{p.time}</td>
                                        <td>
                                            <span className={`dd-status-pill ${p.status === 'In-Waiting' ? 'status-waiting' :
                                                p.status === 'Active' ? 'status-active' : 'status-completed'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="dd-btn dd-btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}>View Profile</button>
                                                <button className="dd-btn dd-btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}>Notes</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Patient Side Panel ── */}
            {selectedPatient && (
                <div style={{ width: 400, background: '#fff', borderLeft: '1px solid var(--doc-border)', height: 'calc(100vh - 100px)', position: 'sticky', top: 0, padding: 24, boxShadow: '-10px 0 30px rgba(0,0,0,0.05)', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, color: 'var(--doc-green-deep)' }}>Clinical Record</h2>
                        <button onClick={() => setSelectedPatient(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 30 }}>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--doc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px', fontSize: '2rem' }}>👤</div>
                        <h3 style={{ margin: '0 0 5px' }}>{selectedPatient.name}</h3>
                        <p style={{ color: 'var(--doc-text-mute)', margin: 0 }}>{selectedPatient.age} years • {selectedPatient.gender}</p>
                    </div>

                    <div className="dd-card" style={{ padding: 15, background: '#f8f9f8', marginBottom: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>BP</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedPatient.vitals.bp}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Pulse</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedPatient.vitals.pulse} bpm</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>Temp</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedPatient.vitals.temp}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ borderBottom: '1px solid var(--doc-border)', paddingBottom: 8, marginBottom: 12 }}>Medical History</h4>
                        <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>{selectedPatient.history}</p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ borderBottom: '1px solid var(--doc-border)', paddingBottom: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Clinical Reports
                            <button
                                className="dd-btn dd-btn-outline"
                                style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                onClick={() => fileInputRef.current.click()}
                                disabled={uploadingReport}
                            >
                                {uploadingReport ? 'Uploading...' : '➕ Upload'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleReportUpload}
                            />
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--doc-text-mute)' }}>Securely upload diagnostic reports and prescriptions to the patient's vault.</p>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <h4 style={{ borderBottom: '1px solid var(--doc-border)', paddingBottom: 8, marginBottom: 12 }}>Clinical Notes</h4>
                        <textarea
                            style={{ width: '100%', height: 150, padding: 12, borderRadius: 8, border: '1px solid #ddd', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'none' }}
                            placeholder="Type medical notes, observations, or prescription guidance..."
                            value={activeNote}
                            onChange={(e) => setActiveNote(e.target.value)}
                        />
                        <button className="dd-btn dd-btn-primary" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={saveNote}>Save Notes</button>
                    </div>
                </div>
            )}
        </div>
    );
}


