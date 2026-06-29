"""
app/controllers/report_controller.py — Medical Report Upload, Analysis & Download

Endpoints:
  GET    /api/reports              — list all reports for authenticated patient
  POST   /api/reports              — upload a new report (multipart/form-data)
  GET    /api/reports/<id>/file    — download original file
  POST   /api/reports/<id>/analyze — run AI analysis on a report
  DELETE /api/reports/<id>         — delete a report
"""

import os
import json
import logging
import hashlib
import uuid
from datetime import datetime, timezone

from flask import request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.medical_report import (
    MedicalReport, ReportAnalysis, AIInsight, Prescription, FileStorageLog
)
from app.middleware import get_jwt_user_id
from app.utils import success_response, error_response, created_response
from app.services.report_analysis_service import get_report_analysis_service

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}
ALLOWED_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
}
MAX_FILE_MB = 20


def _allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _human_size(num_bytes):
    for unit in ['B', 'KB', 'MB']:
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} GB"


def _upload_dir():
    """Return absolute path to uploads folder, create if missing."""
    path = os.path.join(current_app.root_path, '..', 'uploads', 'reports')
    os.makedirs(path, exist_ok=True)
    return os.path.abspath(path)


def _fernet():
    key = os.getenv('FILE_ENCRYPTION_KEY', '').strip()
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(key.encode('utf-8'))
    except Exception as exc:
        logger.warning("FILE_ENCRYPTION_KEY is invalid, storing reports unencrypted: %s", exc)
        return None


def _store_file(file_bytes: bytes, stored_name: str) -> tuple[str, bool]:
    fernet = _fernet()
    encrypted = fernet is not None
    data = fernet.encrypt(file_bytes) if encrypted else file_bytes
    final_name = f"{stored_name}.enc" if encrypted else stored_name
    save_path = os.path.join(_upload_dir(), final_name)
    with open(save_path, 'wb') as fh:
        fh.write(data)
    return final_name, encrypted


def _read_report_bytes(report: MedicalReport) -> bytes:
    file_path = os.path.join(_upload_dir(), report.filename)
    with open(file_path, 'rb') as fh:
        data = fh.read()
    if report.is_encrypted:
        fernet = _fernet()
        if not fernet:
            raise RuntimeError("Report is encrypted but FILE_ENCRYPTION_KEY is not configured.")
        return fernet.decrypt(data)
    return data


def _log_storage(user_id, report_id, action, filename, mime_type, file_size, sha256_hash, encrypted, status='success'):
    db.session.add(FileStorageLog(
        user_id=user_id,
        report_id=report_id,
        action=action,
        filename=filename,
        mime_type=mime_type,
        file_size_bytes=file_size,
        sha256_hash=sha256_hash,
        encrypted=encrypted,
        status=status,
    ))


def _report_kind(filename: str, mime_type: str) -> str:
    name = filename.lower()
    if 'prescription' in name or 'rx' in name:
        return 'prescription'
    if 'scan' in name or 'xray' in name or 'x-ray' in name or 'mri' in name or 'ct' in name:
        return 'scan'
    if mime_type.startswith('image/'):
        return 'lab_image'
    return 'medical_report'


# ── GET /api/reports ──────────────────────────────────────────────────────────
def list_reports():
    user_id = get_jwt_user_id()
    reports = (MedicalReport.query
               .filter_by(user_id=user_id)
               .order_by(MedicalReport.created_at.desc())
               .all())
    return success_response(data={'reports': [r.to_dict() for r in reports]})


# ── POST /api/reports ─────────────────────────────────────────────────────────
def upload_report():
    user_id = get_jwt_user_id()

    incoming_files = request.files.getlist('files') or request.files.getlist('file')
    if not incoming_files:
        return error_response("No file part in request.", 400)

    created_reports = []
    for file in incoming_files:
        if file.filename == '':
            continue

        if not _allowed(file.filename):
            return error_response("Only PDF, JPG, PNG files are allowed.", 400)

        file_bytes = file.read()
        if len(file_bytes) > MAX_FILE_MB * 1024 * 1024:
            return error_response(f"Each file must be under {MAX_FILE_MB} MB.", 400)
        if file.mimetype and file.mimetype not in ALLOWED_MIME_TYPES:
            return error_response("Invalid file type. Upload PDF, JPG, JPEG, or PNG.", 400)

        safe_name = secure_filename(file.filename)
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        stored_base = f"{user_id}_{timestamp}_{uuid.uuid4().hex[:8]}_{safe_name}"
        sha256_hash = hashlib.sha256(file_bytes).hexdigest()
        stored_name, encrypted = _store_file(file_bytes, stored_base)

        display_name = request.form.get('displayName') or safe_name.rsplit('.', 1)[0]

        report = MedicalReport(
            user_id=user_id,
            display_name=display_name,
            filename=stored_name,
            file_size=_human_size(len(file_bytes)),
            file_type=file.mimetype,
            status='Pending',
            report_type=_report_kind(safe_name, file.mimetype or ''),
            storage_status='stored',
            is_encrypted=encrypted,
            storage_path=os.path.join('uploads', 'reports', stored_name),
            sha256_hash=sha256_hash,
        )
        db.session.add(report)
        db.session.flush()
        _log_storage(user_id, report.id, 'upload', stored_name, file.mimetype, len(file_bytes), sha256_hash, encrypted)
        created_reports.append(report)

    db.session.commit()

    if not created_reports:
        return error_response("No valid files selected.", 400)

    logger.info(f"Report upload complete: user={user_id}, count={len(created_reports)}")
    return created_response(
        data={
            'report': created_reports[0].to_dict(),
            'reports': [report.to_dict() for report in created_reports],
        },
        message="Report uploaded successfully."
    )


# ── GET /api/reports/<id>/file ────────────────────────────────────────────────
def download_report(report_id):
    user_id = get_jwt_user_id()
    report = MedicalReport.query.filter_by(id=report_id, user_id=user_id).first()
    if not report:
        return error_response("Report not found.", 404)

    upload_dir = _upload_dir()
    file_path = os.path.join(upload_dir, report.filename)
    if not os.path.exists(file_path):
        return error_response("File not found on server.", 404)

    if report.is_encrypted:
        from flask import send_file
        import io
        original_bytes = _read_report_bytes(report)
        download_ext = os.path.splitext(report.filename.replace('.enc', ''))[1]
        return send_file(
            io.BytesIO(original_bytes),
            mimetype=report.file_type or 'application/octet-stream',
            as_attachment=True,
            download_name=report.display_name + download_ext,
        )

    return send_from_directory(
        upload_dir,
        report.filename,
        as_attachment=True,
        download_name=report.display_name + os.path.splitext(report.filename.replace('.enc', ''))[1],
    )


# ── POST /api/reports/<id>/analyze ───────────────────────────────────────────
def analyze_report(report_id):
    """
    AI analysis of the report. Uses rule-based extraction since no paid
    AI API key is available. Returns structured medical summary, Ayurvedic
    insights, and derived vitals that get shown on the health dashboard.
    """
    user_id = get_jwt_user_id()
    report = MedicalReport.query.filter_by(id=report_id, user_id=user_id).first()
    if not report:
        return error_response("Report not found.", 404)

    try:
        file_bytes = _read_report_bytes(report)
        service = get_report_analysis_service()
        result = service.analyze(
            file_bytes=file_bytes,
            filename=report.filename.replace('.enc', ''),
            mime_type=report.file_type,
        )
    except Exception as e:
        logger.error(f"Report Analysis error: {e}", exc_info=True)
        return error_response("AI analysis failed. Please try again.", 500)

    summary = _format_analysis_section(result)
    ayurvedic = _format_wellness_section(result)
    abnormal = result.get('abnormal_values') or []
    insights = {
        'reportSummary': result.get('report_summary', []),
        'keyValues': result.get('key_values', []),
        'possibleConcerns': result.get('possible_concerns', []),
        'suggestions': result.get('suggestions', []),
        'dietRecommendations': result.get('diet_recommendations', []),
        'hydrationAdvice': result.get('hydration_advice', ''),
        'lifestyleGuidance': result.get('lifestyle_guidance', []),
        'recommendation': result.get('recommendation', ''),
        'disclaimer': result.get('disclaimer', ''),
        'actualProblem': result.get('actual_problem', 'Unknown'),
        'detailedAnalysis': result.get('detailed_analysis', ''),
    }

    symptoms = json.dumps([
        {"symptom": item.get("name", "Report finding"), "severity": item.get("status", "review")}
        for item in abnormal[:6]
    ])
    vitals = json.dumps(result.get('key_values') or [])

    report.status       = 'Analysed'
    report.extracted_text = result.get('extracted_text', '')
    report.abnormal_json = json.dumps(abnormal)
    report.insights_json = json.dumps(insights)
    report.risk_level = result.get('risk_level', 'unknown')
    report.summary      = summary
    report.ayurvedic    = ayurvedic
    report.symptoms_json = symptoms
    report.vitals_json  = vitals
    report.analysed_at  = datetime.now(timezone.utc)

    db.session.add(ReportAnalysis(
        report_id=report.id,
        user_id=user_id,
        model_used=result.get('model_used'),
        ocr_engine=result.get('ocr_engine'),
        extracted_text=result.get('extracted_text'),
        structured_json=json.dumps(insights),
        abnormal_json=json.dumps(abnormal),
        risk_level=result.get('risk_level', 'unknown'),
        processing_ms=result.get('processing_ms', 0),
        status='completed',
    ))
    db.session.add(AIInsight(
        user_id=user_id,
        report_id=report.id,
        insight_type='report_analysis',
        title=f"AI analysis for {report.display_name}",
        summary=summary[:2000],
        recommendations_json=json.dumps(insights.get('suggestions') or []),
        severity=result.get('risk_level', 'unknown'),
    ))
    if report.report_type == 'prescription':
        db.session.add(Prescription(
            user_id=user_id,
            report_id=report.id,
            extracted_text=result.get('extracted_text'),
            medicines_json=json.dumps(result.get('key_values') or []),
            instructions=summary,
        ))
    db.session.commit()

    return success_response(
        data={
            'report':   report.to_dict(),
            'summary':  summary,
            'ayurvedic': ayurvedic,
            'analysis': insights,
            'abnormalValues': abnormal,
            'actualProblem': result.get('actual_problem', 'Unknown'),
            'detailedAnalysis': result.get('detailed_analysis', ''),
        },
        message="AI analysis complete."
    )


def _format_bullets(title, values):
    if not values:
        return f"{title}:\n- Not clearly available in the uploaded file."
    return f"{title}:\n" + "\n".join(f"- {item}" if isinstance(item, str) else f"- {item}" for item in values)


def _format_analysis_section(result):
    parts = [
        _format_bullets("Report Summary", result.get('report_summary') or []),
        _format_bullets("Possible Concerns", result.get('possible_concerns') or []),
        _format_bullets("Suggestions", result.get('suggestions') or []),
        "Recommendation:\n- Please consult a licensed healthcare professional for medical diagnosis.",
    ]
    return "\n\n".join(parts)


def _format_wellness_section(result):
    parts = [
        _format_bullets("Diet Recommendations", result.get('diet_recommendations') or []),
        f"Hydration Advice:\n- {result.get('hydration_advice') or 'Maintain regular hydration unless restricted by your doctor.'}",
        _format_bullets("Lifestyle Guidance", result.get('lifestyle_guidance') or []),
        "Safety Note:\n- Consult a licensed doctor for professional diagnosis.",
    ]
    return "\n\n".join(parts)


# ── DELETE /api/reports/<id> ──────────────────────────────────────────────────
def delete_report(report_id):
    user_id = get_jwt_user_id()
    report = MedicalReport.query.filter_by(id=report_id, user_id=user_id).first()
    if not report:
        return error_response("Report not found.", 404)

    # Try to remove file from disk
    try:
        file_path = os.path.join(_upload_dir(), report.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Could not delete file {report.filename}: {e}")

    db.session.delete(report)
    db.session.commit()
    return success_response(message="Report deleted.")
