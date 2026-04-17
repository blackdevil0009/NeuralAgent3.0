import React, { useState } from 'react';

export default function HospitalAppointments() {
    const [appointments, setAppointments] = useState([
        { id: 'APP1001', patient: 'Rohan Sharma', doctor: 'Dr. Aarav', date: '2026-04-15', time: '10:30 AM', status: 'Confirmed' },
        { id: 'APP1002', patient: 'Sunita Devi', doctor: 'Dr. Ishani', date: '2026-04-15', time: '11:15 AM', status: 'Pending' },
        { id: 'APP1003', patient: 'Amit Verma', doctor: 'Dr. Kabir', date: '2026-04-16', time: '09:00 AM', status: 'Confirmed' },
        { id: 'APP1004', patient: 'Priya Raj', doctor: 'Dr. Aarav', date: '2026-04-16', time: '02:00 PM', status: 'Cancelled' },
    ]);

    return (
        <div className="h-appointments-page">
            <h1 style={{ marginBottom: '30px', fontWeight: 800 }}>Facility Appointments</h1>
            
            <div className="h-card-base">
                <div className="h-section-title">
                    <span>📅 Central Schedule</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="date" 
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }} 
                        />
                        <button className="h-nav-item active" style={{ padding: '8px 16px', fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}>Filter View</button>
                    </div>
                </div>

                <table className="h-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Date & Time</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.map(app => (
                            <tr key={app.id}>
                                <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{app.id}</td>
                                <td style={{ fontWeight: 600 }}>{app.patient}</td>
                                <td>{app.doctor}</td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{app.date}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{app.time}</div>
                                </td>
                                <td>
                                    <span className={`h-tag ${
                                        app.status === 'Confirmed' ? 'h-tag-success' : 
                                        app.status === 'Pending' ? 'h-tag-warning' : ''
                                    }`} style={{ background: app.status === 'Cancelled' ? '#fee2e2' : '', color: app.status === 'Cancelled' ? '#991b1b' : '' }}>
                                        {app.status}
                                    </span>
                                </td>
                                <td>
                                    <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>View Details</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
