import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { ToastProvider, useToast } from './context/ToastContext';
import { initErrorHandler } from './utils/error_handlers';

import Home from './pages/home';
import Login from './pages/login';
import Registration from './pages/registration';
import ResetPassword from './pages/ResetPassword';
import DoctorProfile from './pages/doctor_profile';
import VaidyaMedDashboard from './pages/vaidyamed_dashboard';

// Patient Dashboard
import PatientLayout from './pages/patient/PatientLayout';
import HealthDashboard from './pages/patient/HealthDashboard';
import AIAssistant from './pages/patient/AIAssistant';
import ReportUpload from './pages/patient/ReportUpload';
import MedicalConsultant from './pages/patient/MedicalConsultant';
import Appointments from './pages/patient/Appointments';
import DoctorSearch from './pages/patient/DoctorSearch';
import PatientProfile from './pages/patient/PatientProfile';
import Inbox from './pages/patient/Inbox';
import VideoCall from './pages/patient/VideoCall';
import SecuritySettings from './pages/patient/SecuritySettings';

// Doctor Dashboard
import DoctorLayout from './pages/doctor/DoctorLayout';
import PatientManagement from './pages/doctor/PatientManagement';
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import DoctorInbox from './pages/doctor/DoctorInbox';
import DoctorAIAssistant from './pages/doctor/DoctorAIAssistant';
import DoctorSecuritySettings from './pages/doctor/DoctorSecuritySettings';
import EmergencyDashboard from './pages/doctor/EmergencyDashboard';

// Emergency (Patient)
import EmergencyCase from './pages/patient/EmergencyCase';

// Helper to initialize error handler with toast function
const AppInitializer = () => {
  const { showToast } = useToast();
  useEffect(() => {
    initErrorHandler(showToast);
  }, [showToast]);
  return null;
};

function App() {
  return (
    <ToastProvider>
      <AppInitializer />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Patient Dashboard (nested) */}
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<Navigate to="health" replace />} />
            <Route path="health" element={<HealthDashboard />} />
            <Route path="ai" element={<AIAssistant />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="vcall" element={<VideoCall />} />
            <Route path="reports" element={<ReportUpload />} />
            <Route path="consultant" element={<MedicalConsultant />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="doctors" element={<DoctorSearch />} />
            <Route path="profile" element={<PatientProfile />} />
            <Route path="settings/security" element={<SecuritySettings />} />
            <Route path="emergency" element={<EmergencyCase />} />
          </Route>

          {/* Doctor Portal (nested) */}
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PatientManagement />} />
            <Route path="schedule" element={<DoctorSchedule />} />
            <Route path="inbox" element={<DoctorInbox />} />
            <Route path="ai" element={<DoctorAIAssistant />} />
            <Route path="profile" element={<DoctorProfile />} />
            <Route path="settings/security" element={<DoctorSecuritySettings />} />
            <Route path="emergency" element={<EmergencyDashboard />} />
          </Route>
          <Route path="/dashboard" element={<VaidyaMedDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;

