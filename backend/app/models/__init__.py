"""
app/models/__init__.py
Expose db (SQLAlchemy instance) and all model classes.
"""

from app.extensions import db                    # shared SQLAlchemy instance
from .user          import User
from .otp           import Otp
from .password_reset import PasswordReset
from .appointment import Appointment
from .message     import Message
from .emergency   import Emergency
from .medical_report import MedicalReport
from .payment_transaction import PaymentTransaction
from .hospital_invitation import HospitalInvitation
from .subscription import NewsletterSubscription
from .patient_subscription import PatientSubscription
from .gamification import PopCoinTransaction, UserStreak

# Partitioned Profiles
from .patient_profile import PatientProfile
from .doctor_profile import DoctorProfile
from .organization_profile import OrganizationProfile

# AI Self-Learning
from .ai_self_learning import AISelfLearningLog
