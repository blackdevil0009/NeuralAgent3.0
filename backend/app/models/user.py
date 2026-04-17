"""
app/models/user.py — SQLAlchemy User Model

Single 'users' table covers both patients and doctors.
Doctor-specific columns are NULLable for patients.

Indexes:
  - ix_users_email    (unique)
  - ix_users_role
  - ix_users_active
"""

from datetime import datetime, timezone
from app.extensions import db


class User(db.Model):
    __tablename__ = 'users'

    # ── Primary Key ────────────────────────────────────────────
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # ── Core identity ──────────────────────────────────────────
    email         = db.Column(db.String(255), nullable=False, unique=True,
                              index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(
        db.Enum('patient', 'doctor', 'admin', 'organization', name='user_role'),
        nullable=False, default='patient', index=True
    )

    # ── Personal info ──────────────────────────────────────────
    name          = db.Column(db.String(150), nullable=False, default='')
    mobile        = db.Column(db.String(15),  nullable=True)
    dob           = db.Column(db.Date,        nullable=True)   # patients
    gender        = db.Column(
        db.Enum('male', 'female', 'other', 'prefer_not', name='user_gender'),
        nullable=True
    )
    profile_image = db.Column(db.String(255), nullable=True, default='')
    admin_name    = db.Column(db.String(150), nullable=True, default='')

    # ── Ayurvedic/Patient health info ──────────────────────────
    blood_group = db.Column(db.String(10),  nullable=True, default='Unknown')
    dosha       = db.Column(db.String(50),  nullable=True, default='Not assessed')
    allergies   = db.Column(db.String(500), nullable=True, default='')
    conditions  = db.Column(db.String(500), nullable=True, default='')
    medications = db.Column(db.String(500), nullable=True, default='')

    # ── Address ────────────────────────────────────────────────
    address  = db.Column(db.String(300), nullable=True, default='')
    city     = db.Column(db.String(100), nullable=True, default='')
    state    = db.Column(db.String(100), nullable=True, default='')
    pincode  = db.Column(db.String(10),  nullable=True, default='')

    # ── Doctor: professional credentials ───────────────────────
    degree          = db.Column(db.String(50),  nullable=True)
    position        = db.Column(db.String(100), nullable=True)
    specialization  = db.Column(db.String(100), nullable=True)
    experience      = db.Column(db.String(10),  nullable=True)
    hospital        = db.Column(db.String(200), nullable=True)
    clinic_location = db.Column(db.String(300), nullable=True)
    reg_number      = db.Column(db.String(50),  nullable=True)
    document_path   = db.Column(db.String(300), nullable=True)

    # ── Doctor: practice details ────────────────────────────────
    consultant_fee  = db.Column(db.Integer,     nullable=True, default=500)
    working_hours   = db.Column(db.String(100), nullable=True,
                                default='Mon-Fri, 10AM-6PM')

    # ── Doctor: payout / banking ────────────────────────────────
    upi_id               = db.Column(db.String(100), nullable=True, default='')
    bank_account_name    = db.Column(db.String(150), nullable=True, default='')
    bank_account_number  = db.Column(db.String(30),  nullable=True, default='')
    bank_ifsc            = db.Column(db.String(15),  nullable=True, default='')
    payout_verified      = db.Column(db.Boolean,     nullable=False, default=False)
    upi_verify_requested = db.Column(db.Boolean,     nullable=False, default=False)

    # ── Doctor: verification status ─────────────────────────────
    verification_status = db.Column(
        db.Enum('pending', 'verified', 'rejected', name='verify_status'),
        nullable=True, default='pending'
    )

    # ── Hospital-Doctor Management ──────────────────────────────
    hospital_id       = db.Column(db.Integer,     nullable=True)
    hospital_type     = db.Column(
        db.Enum('private', 'govt', 'clinic', 'ayurvedic', name='hospital_type_enum'),
        nullable=True, default=None
    )
    is_verified       = db.Column(db.Boolean,     nullable=False, default=False)
    verification_code = db.Column(db.String(10),  nullable=True)

    # ── Account state ──────────────────────────────────────────
    is_active         = db.Column(db.Boolean, nullable=False, default=True,
                                  index=True)
    is_email_verified = db.Column(db.Boolean, nullable=False, default=False)
    terms_agreed      = db.Column(db.Boolean, nullable=False, default=False)

    # ── 2FA ────────────────────────────────────────────────────
    two_fa_enabled = db.Column(db.Boolean, nullable=False, default=False)
    two_fa_secret  = db.Column(db.String(64),  nullable=True, default='')

    # ── Timestamps ─────────────────────────────────────────────
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))
    last_login = db.Column(db.DateTime(timezone=True), nullable=True)

    # ── Repr ───────────────────────────────────────────────────
    def __repr__(self):
        return f'<User {self.id} {self.email} [{self.role}]>'

    # ── Serialiser ─────────────────────────────────────────────
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """
        Convert the model to a JSON-safe dict.
        Sensitive fields (password_hash, two_fa_secret) are excluded by default.
        """
        data = {
            'id':                   self.id,
            'email':                self.email,
            'role':                 self.role,
            'name':                 self.name or '',
            'mobile':               self.mobile or '' if include_sensitive else '+91-XXXXX-XXXXX',
            'dob':                  self.dob.isoformat() if self.dob else None,
            'gender':               self.gender,
            'profile_image':        self.profile_image or '',
            'address':              self.address or '',
            'city':                 self.city or '',
            'state':                self.state or '',
            'pincode':              self.pincode or '',
            'pin':                  self.pincode or '',  # alias for frontend
            'bloodGroup':           self.blood_group or 'Unknown',
            'dosha':                self.dosha or 'Not assessed',
            'allergies':            self.allergies or '',
            'conditions':           self.conditions or '',
            'medications':          self.medications or '',
            'is_active':            self.is_active,
            'is_email_verified':    self.is_email_verified,
            'two_fa_enabled':       self.two_fa_enabled,
            'created_at':           self.created_at.isoformat() if self.created_at else None,
            'updated_at':           self.updated_at.isoformat() if self.updated_at else None,
            'last_login':           self.last_login.isoformat() if self.last_login else None,
        }

        # Doctor-specific fields
        if self.role == 'doctor':
            data.update({
                'degree':               self.degree or '',
                'position':             self.position or '',
                'specialization':       self.specialization or '',
                'spec':                 self.specialization or '',  # alias for frontend
                'experience':           self.experience or '',
                'hospital':             self.hospital or '',
                'clinicLocation':       self.clinic_location or '' if include_sensitive else 'Book to View Address',
                'regNumber':            self.reg_number or '',
                'consultantFee':        self.consultant_fee or 500,
                'fee':                  self.consultant_fee if self.consultant_fee is not None else 500,  # alias for frontend
                'workingHours':         self.working_hours or 'Mon-Fri, 10AM-6PM',
                'upiId':                self.upi_id or '',
                'bankAccountName':      self.bank_account_name or '',
                'bankAccountNumber':    self.bank_account_number or '',
                'bankIfsc':             self.bank_ifsc or '',
                'payoutVerified':       self.payout_verified,
                'verificationStatus':   self.verification_status or 'pending',
                'hospitalId':           self.hospital_id,
                'isVerified':           self.is_verified,
            })

        # Organization/Hospital-specific fields
        if self.role == 'organization':
            data.update({
                'adminName':            self.admin_name or '',
                'hospitalName':         self.hospital or self.name or '',
                'hospitalType':         self.hospital_type or '',
                'regNumber':            self.reg_number or '',
                'documentPath':         self.document_path or '' if include_sensitive else 'Document on file',
                'hospitalId':           self.hospital_id,
                'isVerified':           self.is_verified,
                'verificationStatus':   self.verification_status or 'pending',
            })

        if include_sensitive:
            data['password_hash'] = self.password_hash
            data['two_fa_secret'] = self.two_fa_secret

        return data
