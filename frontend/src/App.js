import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { ToastProvider, useToast } from './context/ToastContext';
import { SocketProvider } from './context/SocketContext';
import { initErrorHandler } from './utils/error_handlers';

import Home from './pages/home';
import Login from './pages/login';
import Registration from './pages/registration';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import DoctorProfile from './pages/doctor_profile';
import VaidyaMedDashboard from './pages/vaidyamed_dashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsCondition from './pages/TermsCondition';
import OrganizationLogin from './pages/OrganizationLogin';
import OrganizationRegistration from './pages/OrganizationRegistration';
import HospitalVerify from './pages/Hospital/HospitalVerify';

// Hospital Dashboard
import HospitalLayout from './pages/Hospital/HospitalLayout';
import HospitalDashboard from './pages/Hospital/HospitalDashboard';
import HospitalProfile from './pages/Hospital/HospitalProfile';
import HospitalAppointments from './pages/Hospital/HospitalAppointments';
import HospitalDoctors from './pages/Hospital/HospitalDoctors';
import HospitalEmergencies from './pages/Hospital/HospitalEmergencies';

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
import DoctorSecuritySettings from './pages/doctor/DoctorSecuritySettings';
import EmergencyDashboard from './pages/doctor/EmergencyDashboard';
import DoctorVideoCall from './pages/doctor/DoctorVideoCall';
import DoctorInvite from './pages/doctor/DoctorInvite';

// Emergency (Patient)
import EmergencyCase from './pages/patient/EmergencyCase';
import Wellness from './pages/patient/wellness/Wellness';
import Quiz from './pages/patient/wellness/Quiz';
import DietPlan from './pages/patient/wellness/DietPlan';
import Reminder from './pages/patient/wellness/Reminder';

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
      <SocketProvider>
        <AppInitializer />
        <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/hospital/login" element={<OrganizationLogin />} />
          <Route path="/hospital/register" element={<OrganizationRegistration />} />
          <Route path="/hospital/verify" element={<HospitalVerify />} />

          {/* Hospital Management Layout */}
          <Route path="/hospital" element={<HospitalLayout />}>
              <Route path="dashboard" element={<HospitalDashboard />} />
              <Route path="profile" element={<HospitalProfile />} />
              <Route path="appointments" element={<HospitalAppointments />} />
              <Route path="doctors" element={<HospitalDoctors />} />
              <Route path="emergencies" element={<HospitalEmergencies />} />
          </Route>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsCondition />} />

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
            <Route path="wellness" element={<Wellness />} />
            <Route path="wellness/quiz" element={<Quiz />} />
            <Route path="wellness/diet-plan" element={<DietPlan />} />
            <Route path="wellness/reminder" element={<Reminder />} />
          </Route>

          {/* Doctor Portal (nested) */}
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PatientManagement />} />
            <Route path="schedule" element={<DoctorSchedule />} />
            <Route path="inbox" element={<DoctorInbox />} />
            <Route path="profile" element={<DoctorProfile />} />
            <Route path="vcall" element={<DoctorVideoCall />} />
            <Route path="settings/security" element={<DoctorSecuritySettings />} />
            <Route path="emergency" element={<EmergencyDashboard />} />
          </Route>
          <Route path="/doctor/invite" element={<DoctorInvite />} />
          <Route path="/dashboard" element={<VaidyaMedDashboard />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      </SocketProvider>
    </ToastProvider>
  );
}

export default App;
