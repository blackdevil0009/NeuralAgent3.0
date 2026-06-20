import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AdminLogin     from './AdminLogin';
import AdminLayout    from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminDoctors   from './AdminDoctors';
import AdminPatients  from './AdminPatients';

function PrivateRoute({ children }) {
    const token = localStorage.getItem('adm_token');
    return token ? children : <Navigate to="/login" replace />;
}

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<AdminLogin />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <AdminLayout />
                        </PrivateRoute>
                    }
                >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="doctors"   element={<AdminDoctors />} />
                    <Route path="patients"  element={<AdminPatients />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
