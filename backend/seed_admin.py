import os
import sys
import bcrypt

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app()

def _hash_password(plain: str) -> str:
    rounds = app.config.get('BCRYPT_LOG_ROUNDS', 12)
    return bcrypt.hashpw(
        plain.encode('utf-8'),
        bcrypt.gensalt(rounds)
    ).decode('utf-8')

with app.app_context():
    admin_email = "admin@vaidyamedx.in"
    admin_pass = "MIRA@2006"
    
    user = User.query.filter_by(email=admin_email).first()
    
    if not user:
        print(f"Creating new admin user: {admin_email}")
        user = User(
            email=admin_email,
            password_hash=_hash_password(admin_pass),
            role='admin',
            name='System Administrator',
            is_active=True,
            is_email_verified=True
        )
        db.session.add(user)
    else:
        print(f"Updating existing admin user: {admin_email}")
        user.password_hash = _hash_password(admin_pass)
        user.role = 'admin'
        user.is_active = True
        
    try:
        db.session.commit()
        print("Admin user seeded successfully!")
        print(f"Login: {admin_email}")
        print(f"Pass : {admin_pass}")
    except Exception as e:
        db.session.rollback()
        print(f"Error seeding admin: {e}")
