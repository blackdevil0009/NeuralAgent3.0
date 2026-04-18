"""
app/models/emergency.py — SQLAlchemy Emergency Case Model
"""

from datetime import datetime, timezone
from app.extensions import db

class Emergency(db.Model):
    __tablename__ = 'emergencies'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Relationships
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    
    # Emergency Data
    explanation = db.Column(db.Text, nullable=False)
    case_type = db.Column(db.String(50), nullable=False) # 'critical', 'urgent', 'non-urgent'
    contact = db.Column(db.String(20), nullable=False)
    patient_name = db.Column(db.String(150), nullable=True, default='')
    contact_name = db.Column(db.String(150), nullable=True, default='')
    location = db.Column(db.String(300), nullable=True, default='')
    provider_type = db.Column(db.String(20), nullable=True, default='hospital')
    provider_name = db.Column(db.String(200), nullable=True, default='')
    hospital_id = db.Column(db.Integer, nullable=True, index=True)
    assigned_at = db.Column(db.DateTime(timezone=True), nullable=True)
    resolved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    status = db.Column(
        db.Enum('pending', 'claimed', 'resolved', name='emergency_status'),
        nullable=False, default='pending', index=True
    )
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    # Relationships mapping
    patient = db.relationship('User', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])
    hospital = db.relationship(
        'User',
        foreign_keys=[hospital_id],
        primaryjoin='Emergency.hospital_id == User.id',
    )

    def to_dict(self):
        ts = self.created_at.isoformat() if self.created_at else None
        if ts and not ts.endswith('Z') and '+00:00' not in ts:
            ts += 'Z'

        assigned_ts = self.assigned_at.isoformat() if self.assigned_at else None
        resolved_ts = self.resolved_at.isoformat() if self.resolved_at else None
        hospital_name = self.hospital.hospital if self.hospital and self.hospital.hospital else (
            self.hospital.name if self.hospital else ''
        )

        return {
            'id': self.id,
            'patientId': self.patient_id,
            'doctorId': self.doctor_id,
            'hospitalId': self.hospital_id,
            'hospitalName': hospital_name,
            'hospitalAddress': self.hospital.address if self.hospital else '',
            'hospitalCity': self.hospital.city if self.hospital else '',
            'hospitalState': self.hospital.state if self.hospital else '',
            'hospitalPin': self.hospital.pincode if self.hospital else '',
            'patientName': self.patient_name or (self.patient.name if self.patient else 'Patient'),
            'patient': self.patient_name or (self.patient.name if self.patient else 'Patient'), # alias for dashboard
            'explanation': self.explanation,
            'desc': self.explanation, # alias for frontend compatibility
            'caseType': self.case_type,
            'type': self.case_type, # alias for frontend compatibility
            'contact': self.contact,
            'contactName': self.contact_name or '',
            'location': self.location or '',
            'providerType': self.provider_type or 'hospital',
            'providerName': self.provider_name or '',
            'assignedDoctorName': self.doctor.name if self.doctor else '',
            'status': self.status,
            'time': ts,
            'createdAt': ts,
            'assignedAt': assigned_ts,
            'resolvedAt': resolved_ts
        }
