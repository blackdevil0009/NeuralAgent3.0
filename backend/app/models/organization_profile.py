"""
app/models/organization_profile.py — Organization Profile Model
"""

from app.extensions import db

class OrganizationProfile(db.Model):
    __tablename__ = 'organization_profiles'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    admin_name = db.Column(db.String(150), nullable=True, default='')
    hospital_type = db.Column(
        db.Enum('private', 'govt', 'clinic', 'ayurvedic', name='org_hospital_type_enum'),
        nullable=True, default=None
    )
    reg_number = db.Column(db.String(50), nullable=True)
    document_path = db.Column(db.String(300), nullable=True)
    
    verification_code = db.Column(db.String(10), nullable=True)
    is_verified = db.Column(db.Boolean, nullable=False, default=False)
    verification_status = db.Column(
        db.Enum('pending', 'verified', 'rejected', name='org_verify_status_enum'),
        nullable=True, default='pending'
    )

    def __repr__(self):
        return f'<OrganizationProfile user_id={self.user_id}>'
