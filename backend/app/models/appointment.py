"""
app/models/appointment.py — SQLAlchemy Appointment Model (v2 — Payment-Gated)

Changes from v1:
  - Added payment_status: pending | paid | failed | refunded
  - Added purpose (reason for visit)
  - Added transaction_id (Razorpay payment ID shorthand)
  - Added doctor_share / platform_share (paise) for 95/5 split
  - to_dict() returns clinic_location & mobile ONLY when payment_status == 'paid'
"""

from datetime import datetime, timezone
from app.extensions import db


class Appointment(db.Model):
    __tablename__ = 'appointments'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # ── Relationships ───────────────────────────────────────────
    user_id   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # ── Appointment Data ────────────────────────────────────────
    appointment_date = db.Column(db.Date,        nullable=False)
    appointment_time = db.Column(db.Time,        nullable=False)
    appointment_type = db.Column(db.String(50),  nullable=True, default='Video Call')
    purpose          = db.Column(db.String(300), nullable=True, default='')   # reason for visit
    notes            = db.Column(db.Text,        nullable=True)
    amount_paid      = db.Column(db.Integer,     nullable=True, default=0)    # INR

    # ── Razorpay Data ───────────────────────────────────────────
    razorpay_payment_id = db.Column(db.String(100), nullable=True, index=True)
    razorpay_order_id   = db.Column(db.String(100), nullable=True, index=True)
    razorpay_signature  = db.Column(db.String(256), nullable=True)

    # ── Payment Status ──────────────────────────────────────────
    payment_status = db.Column(
        db.Enum('pending', 'paid', 'failed', 'refunded', name='payment_status_enum'),
        nullable=False, default='pending', index=True
    )
    transaction_id = db.Column(db.String(100), nullable=True)   # = razorpay_payment_id alias

    # ── Revenue Split (stored in paise: 1 INR = 100 paise) ────
    doctor_share   = db.Column(db.Integer, nullable=True, default=0)   # 95%
    platform_share = db.Column(db.Integer, nullable=True, default=0)   # 5%

    # ── Booking Status ──────────────────────────────────────────
    status = db.Column(
        db.Enum('pending', 'booked', 'confirmed', 'completed', 'cancelled',
                name='appointment_status'),
        nullable=False, default='pending', index=True
    )

    # ── Timestamps ─────────────────────────────────────────────
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # ── Eager Relationships ─────────────────────────────────────
    patient = db.relationship('User', foreign_keys=[user_id])
    doctor  = db.relationship('User', foreign_keys=[doctor_id])

    def to_dict(self, include_sensitive: bool = False) -> dict:
        """
        Serialise appointment.
        Sensitive doctor details (clinic_location, mobile) only returned
        when payment_status == 'paid' OR include_sensitive=True.
        All new payment fields use getattr with defaults for backward compat.
        """
        # Use getattr with defaults for new columns — safe if migration hasn't run
        payment_status = getattr(self, 'payment_status', 'pending') or 'pending'
        paid = payment_status == 'paid'

        doctor_share   = getattr(self, 'doctor_share',   0) or 0
        platform_share = getattr(self, 'platform_share', 0) or 0
        amount_paid    = getattr(self, 'amount_paid',    0) or 0
        purpose        = getattr(self, 'purpose',        '') or ''
        razorpay_pid   = getattr(self, 'razorpay_payment_id', '') or ''
        razorpay_oid   = getattr(self, 'razorpay_order_id',   '') or ''
        razorpay_sig   = getattr(self, 'razorpay_signature',  '') or ''
        transaction_id = getattr(self, 'transaction_id', '') or razorpay_pid

        # Safe doctor/patient accessors
        doctor  = self.doctor  if self.doctor  else None
        patient = self.patient if self.patient else None

        data = {
            'id':               self.id,
            'userId':           self.user_id,
            'doctorId':         self.doctor_id,
            'appointmentDate':  self.appointment_date.isoformat() if self.appointment_date else None,
            'appointmentTime':  self.appointment_time.isoformat() if self.appointment_time else None,
            'appointmentType':  self.appointment_type or 'Video Call',
            'type':             self.appointment_type or 'Video Call',
            'purpose':          purpose,
            'notes':            self.notes or '',
            'amountPaid':       amount_paid,

            # Razorpay
            'razorpayPaymentId': razorpay_pid,
            'razorpayOrderId':   razorpay_oid,
            'transactionId':     transaction_id,

            # Payment
            'paymentStatus':    payment_status,
            'doctorShare':      doctor_share,
            'platformShare':    platform_share,
            'doctorShareINR':   round(doctor_share   / 100, 2),
            'platformShareINR': round(platform_share / 100, 2),

            # Booking
            'status':     self.status or 'pending',
            'createdAt':  self.created_at.isoformat() if self.created_at else None,
            'updatedAt':  self.updated_at.isoformat() if self.updated_at else None,

            # Doctor info (always public)
            'patientName':  patient.name if patient else '',
            'doctorName':   doctor.name  if doctor  else '',
            'spec':         (getattr(doctor, 'specialization', '') or '') if doctor else '',
            'doctorDegree': (getattr(doctor, 'degree',         '') or '') if doctor else '',
            'hospital':     (getattr(doctor, 'hospital',       '') or '') if doctor else '',

            # ── GATED: sensitive details only after payment ──────
            'clinicLocation': (getattr(doctor, 'clinic_location', '') or '') if (doctor and (paid or include_sensitive)) else None,
            'doctorMobile':   (getattr(doctor, 'mobile',          '') or '') if (doctor and (paid or include_sensitive)) else None,
            'doctorUpiId':    (getattr(doctor, 'upi_id',          '') or '') if (doctor and (paid or include_sensitive)) else None,
            'doctor_upi_id':  (getattr(doctor, 'upi_id',          '') or '') if (doctor and (paid or include_sensitive)) else None,
        }
        return data

