from .auth_controller   import (register, login, verify_registration_otp,
                                 verify_2fa_otp, resend_verification,
                                 resend_2fa_otp, verify_email_token,
                                 forgot_password, reset_password, toggle_2fa)
from .user_controller   import get_profile, update_profile
from .doctor_controller import verify_upi, get_ifsc_info, get_doctors, get_doctor_profile
from .appointment_controller import (
    create_payment_order,
    verify_and_confirm,
    get_patient_appointments,
    get_doctor_appointments,
    get_appointment_receipt,
    cancel_appointment,
)
from .payment_controller import get_payment_history, razorpay_webhook
from .consultation_controller import check_consultation_access
from .emergency_controller import (report_emergency, get_my_emergencies,
                                   get_emergencies_list, resolve_emergency)
