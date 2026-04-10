"""
app/models/otp.py — OTP Table

Stores temporary verification / 2FA codes.
Expired rows are cleaned up by the scheduler or can be
pruned with a periodic DELETE WHERE expires_at < NOW().

purpose values:
  'registration'  — new user email verification
  '2fa'           — two-factor login
"""

from datetime import datetime, timezone
from app.extensions import db


class Otp(db.Model):
    __tablename__ = 'otps'

    id         = db.Column(db.Integer,     primary_key=True, autoincrement=True)
    email      = db.Column(db.String(255), nullable=False, index=True)
    otp        = db.Column(db.String(10),  nullable=False)
    purpose    = db.Column(
        db.Enum('registration', '2fa', 'resend', name='otp_purpose'),
        nullable=False, default='registration'
    )
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

    __table_args__ = (
        db.Index('ix_otps_email_purpose', 'email', 'purpose'),
    )

    def __repr__(self):
        return f'<Otp {self.email} [{self.purpose}]>'

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at.replace(
            tzinfo=timezone.utc if self.expires_at.tzinfo is None else None
        ) if self.expires_at.tzinfo is None else datetime.now(timezone.utc) > self.expires_at
