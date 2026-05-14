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
    report_type      = db.Column(db.String(50), nullable=True, default='medical_report')
    storage_status   = db.Column(db.String(30), nullable=False, default='stored')
    is_encrypted     = db.Column(db.Boolean, nullable=False, default=False)
    storage_path     = db.Column(db.String(500), nullable=True)
    sha256_hash      = db.Column(db.String(64), nullable=True, index=True)
    extracted_text   = db.Column(db.Text, nullable=True)
    abnormal_json    = db.Column(db.Text, nullable=True)
    insights_json    = db.Column(db.Text, nullable=True)
    risk_level       = db.Column(db.String(30), nullable=True, default='unknown')
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
            'reportType':   self.report_type or 'medical_report',
            'storageStatus': self.storage_status,
            'isEncrypted':  bool(self.is_encrypted),
            'riskLevel':    self.risk_level or 'unknown',
            'summary':      self.summary or '',
            'ayurvedic':    self.ayurvedic or '',
            'extractedText': self.extracted_text or '',
            'abnormalValues': self.abnormal_json or '[]',
            'insights':     self.insights_json or '{}',
            'symptoms':     self.symptoms_json or '[]',
            'vitals':       self.vitals_json or '[]',
            'analysedAt':   self.analysed_at.isoformat() if self.analysed_at else None,
            'createdAt':    self.created_at.isoformat() if self.created_at else None,
        }


class ReportAnalysis(db.Model):
    __tablename__ = 'report_analysis'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_id = db.Column(db.Integer, db.ForeignKey('medical_reports.id', ondelete='CASCADE'),
                          nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                        nullable=False, index=True)
    model_used = db.Column(db.String(80), nullable=True)
    ocr_engine = db.Column(db.String(80), nullable=True)
    extracted_text = db.Column(db.Text, nullable=True)
    structured_json = db.Column(db.Text, nullable=True)
    abnormal_json = db.Column(db.Text, nullable=True)
    risk_level = db.Column(db.String(30), nullable=True, default='unknown')
    processing_ms = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default='completed')
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)

    report = db.relationship('MedicalReport', backref=db.backref('analysis_runs', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'reportId': self.report_id,
            'modelUsed': self.model_used,
            'ocrEngine': self.ocr_engine,
            'riskLevel': self.risk_level,
            'status': self.status,
            'processingMs': self.processing_ms,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }


class AIInsight(db.Model):
    __tablename__ = 'ai_insights'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                        nullable=False, index=True)
    report_id = db.Column(db.Integer, db.ForeignKey('medical_reports.id', ondelete='CASCADE'),
                          nullable=True, index=True)
    insight_type = db.Column(db.String(50), nullable=False, default='report')
    title = db.Column(db.String(200), nullable=False, default='')
    summary = db.Column(db.Text, nullable=True)
    recommendations_json = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(30), nullable=True, default='info')
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)


class Prescription(db.Model):
    __tablename__ = 'prescriptions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                        nullable=False, index=True)
    report_id = db.Column(db.Integer, db.ForeignKey('medical_reports.id', ondelete='SET NULL'),
                          nullable=True, index=True)
    doctor_name = db.Column(db.String(150), nullable=True)
    extracted_text = db.Column(db.Text, nullable=True)
    medicines_json = db.Column(db.Text, nullable=True)
    instructions = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)


class FileStorageLog(db.Model):
    __tablename__ = 'file_storage_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'),
                        nullable=True, index=True)
    report_id = db.Column(db.Integer, db.ForeignKey('medical_reports.id', ondelete='CASCADE'),
                          nullable=True, index=True)
    action = db.Column(db.String(50), nullable=False, default='upload')
    filename = db.Column(db.String(255), nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size_bytes = db.Column(db.Integer, nullable=True)
    sha256_hash = db.Column(db.String(64), nullable=True)
    encrypted = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(30), nullable=False, default='success')
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)


class Consultation(db.Model):
    __tablename__ = 'consultations'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id', ondelete='SET NULL'),
                               nullable=True, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                           nullable=False, index=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                          nullable=False, index=True)
    room_id = db.Column(db.String(100), nullable=False, unique=True, index=True)
    provider = db.Column(db.String(30), nullable=False, default='webrtc')
    status = db.Column(db.String(30), nullable=False, default='scheduled')
    started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    ended_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)


class ConsultationNote(db.Model):
    __tablename__ = 'consultation_notes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    consultation_id = db.Column(db.Integer, db.ForeignKey('consultations.id', ondelete='CASCADE'),
                                nullable=False, index=True)
    author_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'),
                               nullable=True, index=True)
    note_type = db.Column(db.String(40), nullable=False, default='doctor')
    transcript = db.Column(db.Text, nullable=True)
    symptoms_json = db.Column(db.Text, nullable=True)
    summary = db.Column(db.Text, nullable=True)
    follow_up_questions = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)
