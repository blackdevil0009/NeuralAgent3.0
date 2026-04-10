"""
app/models/medical_report.py — Medical Report Model

Stores uploaded medical reports and AI analysis results per patient.
"""

from datetime import datetime, timezone
from app.extensions import db


class MedicalReport(db.Model):
    __tablename__ = 'medical_reports'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # File metadata
    display_name  = db.Column(db.String(255), nullable=False, default='')
    filename      = db.Column(db.String(255), nullable=False)   # stored filename on disk
    file_size     = db.Column(db.String(30),  nullable=True)    # human-readable, e.g. "1.2 MB"
    file_type     = db.Column(db.String(50),  nullable=True)    # MIME type

    # AI analysis results (stored as JSON strings)
    status           = db.Column(db.String(30), nullable=False, default='Pending')  # Pending | Analysed
    summary          = db.Column(db.Text, nullable=True)
    ayurvedic        = db.Column(db.Text, nullable=True)
    symptoms_json    = db.Column(db.Text, nullable=True)  # JSON array of {symptom, severity}
    vitals_json      = db.Column(db.Text, nullable=True)  # JSON array of vitals

    created_at    = db.Column(db.DateTime(timezone=True), nullable=False,
                              default=lambda: datetime.now(timezone.utc))
    analysed_at   = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationship
    user = db.relationship('User', backref=db.backref('medical_reports', lazy='dynamic'))

    def __repr__(self):
        return f'<MedicalReport {self.id} user={self.user_id} name={self.display_name}>'

    def to_dict(self):
        return {
            'id':           self.id,
            'name':         self.display_name,
            'filename':     self.filename,
            'date':         self.created_at.strftime('%d %b %Y') if self.created_at else '',
            'size':         self.file_size or '---',
            'status':       self.status,
            'summary':      self.summary or '',
            'ayurvedic':    self.ayurvedic or '',
            'symptoms':     self.symptoms_json or '[]',
            'vitals':       self.vitals_json or '[]',
            'analysedAt':   self.analysed_at.isoformat() if self.analysed_at else None,
            'createdAt':    self.created_at.isoformat() if self.created_at else None,
        }
