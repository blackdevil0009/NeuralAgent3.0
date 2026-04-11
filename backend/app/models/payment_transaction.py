"""
app/models/payment_transaction.py — Payment Audit Log Model

Stores every payment event for full traceability:
  - Order creation
  - Payment capture / failure
  - Revenue split (95% doctor / 5% platform)
  - Webhook events
"""

from datetime import datetime, timezone
from app.extensions import db


class PaymentTransaction(db.Model):
    __tablename__ = 'payment_transactions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # ── Relationships ───────────────────────────────────────────
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'),
                               nullable=False, index=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id'),
                               nullable=False, index=True)
    doctor_id      = db.Column(db.Integer, db.ForeignKey('users.id'),
                               nullable=True, index=True)

    # ── Razorpay Identifiers ────────────────────────────────────
    razorpay_order_id   = db.Column(db.String(100), nullable=False, index=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True, index=True)
    razorpay_signature  = db.Column(db.String(256), nullable=True)

    # ── Amount (stored in paise, 1 INR = 100 paise) ────────────
    amount          = db.Column(db.Integer, nullable=False)   # total in paise
    currency        = db.Column(db.String(5), nullable=False, default='INR')
    doctor_share    = db.Column(db.Integer, nullable=True)    # 95% in paise
    platform_share  = db.Column(db.Integer, nullable=True)    # 5% in paise

    # ── Status ─────────────────────────────────────────────────
    status = db.Column(
        db.Enum('created', 'captured', 'failed', 'refunded', name='txn_status'),
        nullable=False, default='created', index=True
    )

    # ── Transfer details (Razorpay Route) ──────────────────────
    transfer_id     = db.Column(db.String(100), nullable=True)   # Route transfer ID
    transfer_status = db.Column(db.String(50),  nullable=True)   # settled / pending / failed

    # ── Extra metadata ─────────────────────────────────────────
    notes        = db.Column(db.Text, nullable=True)  # JSON string of extra info
    failure_reason = db.Column(db.String(300), nullable=True)

    # ── Timestamps ─────────────────────────────────────────────
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # ── Relationships ───────────────────────────────────────────
    appointment = db.relationship('Appointment', foreign_keys=[appointment_id])
    patient     = db.relationship('User', foreign_keys=[user_id])
    doctor      = db.relationship('User', foreign_keys=[doctor_id])

    def to_dict(self) -> dict:
        return {
            'id':                 self.id,
            'appointmentId':      self.appointment_id,
            'userId':             self.user_id,
            'doctorId':           self.doctor_id,
            'razorpayOrderId':    self.razorpay_order_id,
            'razorpayPaymentId':  self.razorpay_payment_id,
            'amount':             self.amount,
            'amountINR':          round(self.amount / 100, 2),
            'currency':           self.currency,
            'doctorShare':        self.doctor_share,
            'doctorShareINR':     round((self.doctor_share or 0) / 100, 2),
            'platformShare':      self.platform_share,
            'platformShareINR':   round((self.platform_share or 0) / 100, 2),
            'status':             self.status,
            'transferId':         self.transfer_id,
            'transferStatus':     self.transfer_status,
            'notes':              self.notes,
            'failureReason':      self.failure_reason,
            'createdAt':          self.created_at.isoformat() if self.created_at else None,
            'updatedAt':          self.updated_at.isoformat() if self.updated_at else None,
        }
