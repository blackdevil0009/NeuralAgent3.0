"""
scripts/migrate_profiles.py — Migrate data from users table to partitioned profile tables
"""

import sys
import os

# Add the backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import User, PatientProfile, DoctorProfile, OrganizationProfile

def migrate_data():
    app = create_app()
    with app.app_context():
        # Important: this will create the new tables if they don't exist yet
        db.create_all()
        
        users = User.query.all()
        created_count = 0
        
        for user in users:
            # Check for patient profile
            if user.role == 'patient':
                profile = PatientProfile.query.filter_by(user_id=user.id).first()
                if not profile:
                    profile = PatientProfile(
                        user_id=user.id,
                        dob=user.dob,
                        gender=user.gender,
                        blood_group=user.blood_group,
                        dosha=user.dosha,
                        allergies=user.allergies,
                        conditions=user.conditions,
                        medications=user.medications
                    )
                    db.session.add(profile)
                    created_count += 1
            
            # Check for doctor profile
            elif user.role == 'doctor':
                profile = DoctorProfile.query.filter_by(user_id=user.id).first()
                if not profile:
                    profile = DoctorProfile(
                        user_id=user.id,
                        degree=user.degree,
                        position=user.position,
                        specialization=user.specialization,
                        experience=user.experience,
                        hospital=user.hospital,
                        clinic_location=user.clinic_location,
                        reg_number=user.reg_number,
                        document_path=user.document_path,
                        consultant_fee=user.consultant_fee,
                        working_hours=user.working_hours,
                        upi_id=user.upi_id,
                        bank_account_name=user.bank_account_name,
                        bank_account_number=user.bank_account_number,
                        bank_ifsc=user.bank_ifsc,
                        payout_verified=user.payout_verified,
                        upi_verify_requested=user.upi_verify_requested,
                        verification_status=user.verification_status,
                        hospital_id=user.hospital_id,
                        is_verified=user.is_verified
                    )
                    db.session.add(profile)
                    created_count += 1
                    
            # Check for organization profile
            elif user.role == 'organization':
                profile = OrganizationProfile.query.filter_by(user_id=user.id).first()
                if not profile:
                    profile = OrganizationProfile(
                        user_id=user.id,
                        admin_name=user.admin_name,
                        hospital_type=user.hospital_type,
                        reg_number=user.reg_number,
                        document_path=user.document_path,
                        verification_code=user.verification_code,
                        is_verified=user.is_verified,
                        verification_status=user.verification_status
                    )
                    db.session.add(profile)
                    created_count += 1
                    
        db.session.commit()
        print(f"Migration completed successfully. Created {created_count} new profile entries.")

if __name__ == '__main__':
    migrate_data()
