"""
app/models/doctor_profile.py — Doctor Profile Model
"""

from app.extensions import db

class DoctorProfile(db.Model):
    __tablename__ = 'doctor_profiles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    degree = db.Column(db.String(50), nullable=True)
    position = db.Column(db.String(100), nullable=True)
    specialization = db.Column(db.String(100), nullable=True)
    experience = db.Column(db.String(10), nullable=True)
    hospital = db.Column(db.String(200), nullable=True)
    clinic_location = db.Column(db.String(300), nullable=True)
    reg_number = db.Column(db.String(50), nullable=True)
    document_path = db.Column(db.String(300), nullable=True)
    
    consultant_fee = db.Column(db.Integer, nullable=True, default=0)
    working_hours = db.Column(db.String(100), nullable=True, default='Mon-Fri, 10AM-6PM')
    
    upi_id = db.Column(db.String(100), nullable=True, default='')
    bank_account_name = db.Column(db.String(150), nullable=True, default='')
    bank_account_number = db.Column(db.String(30), nullable=True, default='')
    bank_ifsc = db.Column(db.String(15), nullable=True, default='')
    payout_verified = db.Column(db.Boolean, nullable=False, default=False)
    upi_verify_requested = db.Column(db.Boolean, nullable=False, default=False)
    
    verification_status = db.Column(
        db.Enum('pending', 'verified', 'rejected', name='doctor_verify_status_enum'),
        nullable=True, default='pending'
    )
    
    hospital_id = db.Column(db.Integer, nullable=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)

    def __repr__(self):
        return f'<DoctorProfile user_id={self.user_id}>'
