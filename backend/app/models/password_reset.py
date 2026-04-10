"""
app/models/password_reset.py — Password Reset Token Table

Stores single-use tokens sent via email for password reset.
"""

from datetime import datetime, timezone
from app.extensions import db


class PasswordReset(db.Model):
    __tablename__ = 'password_resets'

    id         = db.Column(db.Integer,     primary_key=True, autoincrement=True)
    email      = db.Column(db.String(255), nullable=False, index=True)
    token      = db.Column(db.String(128), nullable=False, unique=True, index=True)
    purpose    = db.Column(db.String(30),  nullable=False, default='reset')
    used       = db.Column(db.Boolean,     nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

    def __repr__(self):
        return f'<PasswordReset {self.email} used={self.used}>'

    @property
    def is_valid(self) -> bool:
        """Return True if token is not used and not expired."""
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return not self.used and now < exp
