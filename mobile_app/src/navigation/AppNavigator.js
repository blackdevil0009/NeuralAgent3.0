import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

// Auth & General
import LoginScreen from '../screens/auth/LoginScreen';
import RegistrationScreen from '../screens/auth/RegistrationScreen';
import PrivacyPolicyScreen from '../screens/auth/PrivacyPolicyScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import TermsConditionScreen from '../screens/auth/TermsConditionScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';

import DoctorProfileScreen from '../screens/general/DoctorProfileScreen';
import PatientProfileScreen from '../screens/general/PatientProfileScreen';
import VaidyamedDashboardScreen from '../screens/general/VaidyamedDashboardScreen';

// Hospital
import HospitalDashboardScreen from '../screens/hospital/HospitalDashboardScreen';
import HospitalAppointmentsScreen from '../screens/hospital/HospitalAppointmentsScreen';
import HospitalDoctorsScreen from '../screens/hospital/HospitalDoctorsScreen';
import HospitalProfileScreen from '../screens/hospital/HospitalProfileScreen';
import HospitalVerifyScreen from '../screens/hospital/HospitalVerifyScreen';
import HospitalLayoutScreen from '../screens/hospital/HospitalLayoutScreen';

// Doctor
import DoctorDashboardScreen from '../screens/doctor/DoctorDashboardScreen';
import Doctor2FAScreen from '../screens/doctor/Doctor2FAScreen';
import DoctorAIAssistantScreen from '../screens/doctor/DoctorAIAssistantScreen';
import DoctorChangePasswordScreen from '../screens/doctor/DoctorChangePasswordScreen';
import DoctorInboxScreen from '../screens/doctor/DoctorInboxScreen';
import DoctorScheduleScreen from '../screens/doctor/DoctorScheduleScreen';
import DoctorSecuritySettingsScreen from '../screens/doctor/DoctorSecuritySettingsScreen';
import DoctorUpdateMobileScreen from '../screens/doctor/DoctorUpdateMobileScreen';
import DoctorVideoCallScreen from '../screens/doctor/DoctorVideoCallScreen';
import EmergencyDashboardScreen from '../screens/doctor/EmergencyDashboardScreen';
import PatientManagementScreen from '../screens/doctor/PatientManagementScreen';

// Patient
import PatientDashboardScreen from '../screens/patient/PatientDashboardScreen';
import AIAssistantScreen from '../screens/patient/AIAssistantScreen';
import AppointmentsScreen from '../screens/patient/AppointmentsScreen';
import ChangePasswordScreen from '../screens/patient/ChangePasswordScreen';
import DoctorSearchScreen from '../screens/patient/DoctorSearchScreen';
import EditProfileScreen from '../screens/patient/EditProfileScreen';
import EmergencyCaseScreen from '../screens/patient/EmergencyCaseScreen';
import HealthDashboardScreen from '../screens/patient/HealthDashboardScreen';
import InboxScreen from '../screens/patient/InboxScreen';
import MedicalConsultantScreen from '../screens/patient/MedicalConsultantScreen';
import ReportUploadScreen from '../screens/patient/ReportUploadScreen';
import SecuritySettingsScreen from '../screens/patient/SecuritySettingsScreen';
import TwoFactorAuthScreen from '../screens/patient/TwoFactorAuthScreen';
import UpdateMobileScreen from '../screens/patient/UpdateMobileScreen';
import VideoCallScreen from '../screens/patient/VideoCallScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {/* Auth & General */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Registration" component={RegistrationScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="TermsCondition" component={TermsConditionScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        
        <Stack.Screen name="DoctorProfile" component={DoctorProfileScreen} />
        <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
        <Stack.Screen name="VaidyamedDashboard" component={VaidyamedDashboardScreen} />

        {/* Hospital */}
        <Stack.Screen name="HospitalDashboard" component={HospitalDashboardScreen} />
        <Stack.Screen name="HospitalAppointments" component={HospitalAppointmentsScreen} />
        <Stack.Screen name="HospitalDoctors" component={HospitalDoctorsScreen} />
        <Stack.Screen name="HospitalProfile" component={HospitalProfileScreen} />
        <Stack.Screen name="HospitalVerify" component={HospitalVerifyScreen} />
        <Stack.Screen name="HospitalLayout" component={HospitalLayoutScreen} />

        {/* Doctor */}
        <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
        <Stack.Screen name="Doctor2FA" component={Doctor2FAScreen} />
        <Stack.Screen name="DoctorAIAssistant" component={DoctorAIAssistantScreen} />
        <Stack.Screen name="DoctorChangePassword" component={DoctorChangePasswordScreen} />
        <Stack.Screen name="DoctorInbox" component={DoctorInboxScreen} />
        <Stack.Screen name="DoctorSchedule" component={DoctorScheduleScreen} />
        <Stack.Screen name="DoctorSecuritySettings" component={DoctorSecuritySettingsScreen} />
        <Stack.Screen name="DoctorUpdateMobile" component={DoctorUpdateMobileScreen} />
        <Stack.Screen name="DoctorVideoCall" component={DoctorVideoCallScreen} />
        <Stack.Screen name="EmergencyDashboard" component={EmergencyDashboardScreen} />
        <Stack.Screen name="PatientManagement" component={PatientManagementScreen} />

        {/* Patient */}
        <Stack.Screen name="PatientDashboard" component={PatientDashboardScreen} />
        <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
        <Stack.Screen name="Appointments" component={AppointmentsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="DoctorSearch" component={DoctorSearchScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="EmergencyCase" component={EmergencyCaseScreen} />
        <Stack.Screen name="HealthDashboard" component={HealthDashboardScreen} />
        <Stack.Screen name="Inbox" component={InboxScreen} />
        <Stack.Screen name="MedicalConsultant" component={MedicalConsultantScreen} />
        <Stack.Screen name="ReportUpload" component={ReportUploadScreen} />
        <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
        <Stack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
        <Stack.Screen name="UpdateMobile" component={UpdateMobileScreen} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
