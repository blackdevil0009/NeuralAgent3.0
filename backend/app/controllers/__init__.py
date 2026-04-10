from .auth_controller   import (register, login, verify_registration_otp,
                                 verify_2fa_otp, resend_verification,
                                 resend_2fa_otp, verify_email_token,
                                 forgot_password, reset_password, toggle_2fa)
from .user_controller   import get_profile, update_profile
from .doctor_controller import verify_upi, get_ifsc_info, get_doctors
from .appointment_controller import book_appointment, get_patient_appointments, get_doctor_appointments
from .consultation_controller import check_consultation_access
from .emergency_controller import (report_emergency, get_my_emergencies, 
                                   get_emergencies_list, resolve_emergency)
