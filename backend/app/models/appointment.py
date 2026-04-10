"""
app/models/appointment.py — SQLAlchemy Appointment Model
"""

from datetime import datetime, timezone
from app.extensions import db

class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Relationships
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Appointment Data
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    appointment_type = db.Column(db.String(50), nullable=True, default='Video Call') # 'Video Call', 'Chat', 'Offline'
    notes            = db.Column(db.Text, nullable=True)
    amount_paid      = db.Column(db.Integer, nullable=True, default=0)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    razorpay_order_id   = db.Column(db.String(100), nullable=True)

    status = db.Column(
        db.Enum('booked', 'pending', 'confirmed', 'completed', 'cancelled', name='appointment_status'),
        nullable=False, default='booked', index=True
    )
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Optional: explicitly map relationships if backrefs are needed, 
    # but since both map to 'users', SQLAlchemy needs explicit foregin_keys configuration.
    patient = db.relationship('User', foreign_keys=[user_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'doctorId': self.doctor_id,
            'appointmentDate': self.appointment_date.isoformat() if self.appointment_date else None,
            'appointmentTime': self.appointment_time.isoformat() if self.appointment_time else None,
            'appointmentType': self.appointment_type,
            'notes': self.notes,
            'amountPaid': self.amount_paid,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'patientName': self.patient.name if self.patient else '',
            'doctorName': self.doctor.name if self.doctor else '',
            'spec': self.doctor.specialization if (self.doctor and hasattr(self.doctor, 'specialization')) else ''
        }
