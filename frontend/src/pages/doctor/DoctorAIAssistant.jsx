import React, { useState, useEffect } from 'react';

const ANALYSIS_EXAMPLES = [
    {
        id: 1, patient: 'Rohit Sharma', date: '25 Feb 2026', type: 'CBC + Liver Profile',
        result: 'Elevated Liver Enzymes (ALT/AST)', dosha: 'Pitta Imbalance',
        advice: 'Reduce spicy foods, introduce Ghee-based preparations, Shatavari supplements recommended.'
    }
];

const MOCK_IOT = [
    { id: 1, label: 'ICU Ventilator-04', status: 'Stable', metric: '65% O2', trend: 'steady' },
    { id: 2, label: 'Cardiac Monitor-01', status: 'Active', metric: '72 BPM', trend: 'steady' },
    { id: 3, label: 'Smart Dialysis-A2', status: 'Operational', metric: 'BFR: 300', trend: 'up' },
];

export default function DoctorAIAssistant() {
    const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'iot', 'team'
    const [selectedPatient, setSelectedPatient] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);

    const runAnalysis = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
            setAnalysisResult(ANALYSIS_EXAMPLES[0]);
        }, 1800);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
            <div className="dd-header" style={{ marginBottom: 30 }}>
                <div>
                    <h1>🤖 NeuralAgent Clinical Assistant</h1>
                    <p style={{ color: 'var(--doc-text-mute)' }}>Hospital-wide AI ecosystem: Report Analysis, IoT Control, and Multi-Voice Collaboration</p>
                </div>
            </div>

            {/* Feature Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
                <button
                    className={`dd-btn ${activeTab === 'analysis' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('analysis')}
                >📊 Clinical Analysis</button>
                <button
                    className={`dd-btn ${activeTab === 'iot' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('iot')}
                >🔌 Hospital IoT Monitor</button>
                <button
                    className={`dd-btn ${activeTab === 'team' ? 'dd-btn-primary' : 'dd-btn-outline'}`}
                    onClick={() => setActiveTab('team')}
                >📹 Team Live Command</button>
            </div>

            {activeTab === 'analysis' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="dd-card" style={{ marginBottom: 30, background: 'linear-gradient(to right, #ffffff, #f9fdfa)' }}>
                        <h3>AI Report Interpreter</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--doc-text-mute)' }}>Scan patient reports for hidden clinical correlations and Ayurvedic Dosha trends.</p>

                        <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Select Patient</label>
                                <select className="dd-btn dd-btn-outline" style={{ width: '100%', padding: '10px' }} value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}>
                                    <option value="">Choose Patient...</option>
                                    <option value="Rohit Sharma">Rohit Sharma</option>
                                    <option value="Anjali Gupta">Anjali Gupta</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>Select Medical Record</label>
                                <select className="dd-btn dd-btn-outline" style={{ width: '100%', padding: '10px' }}>
                                    <option>Blood Work - Feb 2026</option>
                                    <option>Health Assessment Dec 2025</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="dd-btn dd-btn-primary" style={{ height: 42, minWidth: 150, justifyContent: 'center' }} disabled={!selectedPatient || isAnalyzing} onClick={runAnalysis}>
                                    {isAnalyzing ? '🧬 Analyzing...' : '✨ Run AI Insights'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {analysisResult && (
                        <div className="dd-card" style={{ borderLeft: '5px solid var(--doc-accent)', animation: 'slideUp 0.4s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0 }}>Clinical AI Summary: {analysisResult.patient}</h3>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div style={{ background: '#f8f9f8', padding: 20, borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--doc-text-mute)', marginBottom: 8, fontWeight: 700 }}>Modern Med Findings</div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#c0392b' }}>{analysisResult.result}</div>
                                </div>
                                <div style={{ background: '#f0f7f2', padding: 20, borderRadius: 12 }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--doc-text-mute)', marginBottom: 8, fontWeight: 700 }}>Ayurvedic Status</div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--doc-green-light)' }}>{analysisResult.dosha}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'iot' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div className="dd-grid">
                        {MOCK_IOT.map(m => (
                            <div key={m.id} className="dd-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--doc-text-mute)', textTransform: 'uppercase' }}>{m.label}</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: 4 }}>{m.metric}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--doc-green-light)', marginTop: 4 }}>● {m.status}</div>
                                </div>
                                <div style={{ width: 60, height: 40, background: '#eee', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    📈
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="dd-card" style={{ marginTop: 20, background: '#1a1a1a', color: '#00ff00', fontFamily: 'monospace', padding: 20 }}>
                        <div>[SYSTEM] HOSPITAL NETWORK AT 98% EFFICIENCY</div>
                        <div>[IOT] VENTILATOR-04 UPDATED TO FIRMWARE V2.4</div>
                        <div>[AI] PREDICTIVE ALERT: ICU-ROOM-2 TEMP FLUCTUATION DETECTED</div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, animation: 'fadeIn 0.3s ease' }}>
                    <div className="dd-card" style={{ padding: 0, background: '#222', height: 500, overflow: 'hidden', position: 'relative' }}>
                        {cameraActive ? (
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #2d6a4f, #1b4332)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#fff' }}>
                                <div style={{ fontSize: '5rem' }}>📷</div>
                                <h3>Live Video Feed Active</h3>
                                <p style={{ opacity: 0.7 }}>Broadcasting to Ward-B Team</p>
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: 15 }}>🎥</div>
                                    <button className="dd-btn dd-btn-primary" onClick={() => setCameraActive(true)}>Activate Camera</button>
                                </div>
                            </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 10 }}>
                            <div style={{ padding: '4px 12px', background: 'red', color: '#fff', borderRadius: 20, fontSize: '0.7rem' }}>LIVE 00:23:12</div>
                            <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, fontSize: '0.7rem' }}>CAM-FRONT-HD</div>
                        </div>
                    </div>

                    <div className="dd-card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: '0 0 15px' }}>Team Presence</h4>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {['Dr. Sameer (Admin)', 'Nurse Maria', 'Tech Support #2'].map(person => (
                                <div key={person} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff00' }}></div>
                                    <span style={{ fontSize: '0.85rem' }}>{person}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                            <input type="text" placeholder="Quick team message..." style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd', fontSize: '0.8rem' }} />
                            <button className="dd-btn dd-btn-primary" style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}>Send Broadcast</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

