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
    
    status = db.Column(
        db.Enum('pending', 'claimed', 'resolved', name='emergency_status'),
        nullable=False, default='pending', index=True
    )
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    # Relationships mapping
    patient = db.relationship('User', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])

    def to_dict(self):
        ts = self.created_at.isoformat() if self.created_at else None
        if ts and not ts.endswith('Z') and '+00:00' not in ts:
            ts += 'Z'
            
        return {
            'id': self.id,
            'patientId': self.patient_id,
            'doctorId': self.doctor_id,
            'patientName': self.patient.name if self.patient else 'Patient',
            'patient': self.patient.name if self.patient else 'Patient', # alias for dashboard
            'explanation': self.explanation,
            'desc': self.explanation, # alias for frontend compatibility
            'caseType': self.case_type,
            'type': self.case_type, # alias for frontend compatibility
            'contact': self.contact,
            'status': self.status,
            'time': ts,
            'createdAt': ts
        }
