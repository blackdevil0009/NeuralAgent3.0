"""
app/models/patient_profile.py — Patient Profile Model
"""

from app.extensions import db

class PatientProfile(db.Model):
    __tablename__ = 'patient_profiles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    dob = db.Column(db.Date, nullable=True)
    gender = db.Column(
        db.Enum('male', 'female', 'other', 'prefer_not', name='patient_gender_enum'),
        nullable=True
    )
    
    blood_group = db.Column(db.String(10), nullable=True, default='Unknown')
    dosha = db.Column(db.String(50), nullable=True, default='Not assessed')
    allergies = db.Column(db.String(500), nullable=True, default='')
    conditions = db.Column(db.String(500), nullable=True, default='')
    medications = db.Column(db.String(500), nullable=True, default='')

    def __repr__(self):
        return f'<PatientProfile user_id={self.user_id}>'
