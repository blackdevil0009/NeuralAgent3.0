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
    status = db.Column(
        db.Enum('pending', 'confirmed', 'completed', 'cancelled', name='appointment_status'),
        nullable=False, default='pending', index=True
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
            'user_id': self.user_id,
            'doctor_id': self.doctor_id,
            'appointment_date': self.appointment_date.isoformat() if self.appointment_date else None,
            'appointment_time': self.appointment_time.isoformat() if self.appointment_time else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # include simple nested representations if they exist
            'patient_name': self.patient.name if self.patient else '',
            'doctor_name': self.doctor.name if self.doctor else ''
        }
