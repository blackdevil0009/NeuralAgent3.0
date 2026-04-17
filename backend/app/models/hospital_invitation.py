"""
app/models/hospital_invitation.py - Hospital doctor invitation tracking
"""

from datetime import datetime, timezone
from app.extensions import db


class HospitalInvitation(db.Model):
    __tablename__ = "hospital_invitations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    hospital_id = db.Column(db.Integer, nullable=False, index=True)
    doctor_email = db.Column(db.String(255), nullable=False, index=True)
    doctor_name = db.Column(db.String(150), nullable=True)
    token = db.Column(db.String(128), nullable=False, unique=True, index=True)
    status = db.Column(
        db.Enum(
            "pending",
            "registered",
            "accepted",
            "expired",
            "revoked",
            name="hospital_invite_status",
        ),
        nullable=False,
        default="pending",
        index=True,
    )
    invited_doctor_id = db.Column(db.Integer, nullable=True)
    accepted_doctor_id = db.Column(db.Integer, nullable=True)
    accepted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def is_valid(self) -> bool:
        now = datetime.now(timezone.utc)
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return self.status in ("pending", "registered") and now < exp
