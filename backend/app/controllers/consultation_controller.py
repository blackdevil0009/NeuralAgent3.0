"""
app/controllers/consultation_controller.py — Security Access Logic
"""

import logging
import json
import uuid
from datetime import datetime, timezone
from flask import request
from app.extensions import db
from app.models.appointment import Appointment
from app.models.medical_report import Consultation, ConsultationNote
from app.models.user import User
from app.middleware import get_jwt_user_id
from app.utils import success_response, error_response, forbidden_response, not_found_response

logger = logging.getLogger(__name__)

def check_consultation_access():
    """GET /api/consultation/access-check"""
    user_id = get_jwt_user_id()
    user = User.query.get(int(user_id))

    if not user:
        return not_found_response("User not found.")

    if not user.two_fa_enabled:
        logger.warning(f"Access blocked for user {user_id} - 2FA not enabled.")
        return forbidden_response("Security not enabled. Please enable 2FA first.")

    return success_response(message="Security Enabled")


def start_consultation_session():
    """POST /api/consultation/session/start"""
    user_id = int(get_jwt_user_id())
    body = request.get_json(silent=True) or {}
    appointment_id = body.get('appointment_id') or body.get('appointmentId')
    if not appointment_id:
        return error_response("appointment_id is required.", 400)

    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return not_found_response("Appointment not found.")
    if user_id not in (appointment.user_id, appointment.doctor_id):
        return forbidden_response("You do not have access to this consultation.")

    existing = Consultation.query.filter_by(appointment_id=appointment.id).first()
    if existing:
        if existing.status == 'scheduled':
            existing.status = 'active'
            existing.started_at = existing.started_at or datetime.now(timezone.utc)
            db.session.commit()
        return success_response(data={'consultation': _consultation_payload(existing)})

    consultation = Consultation(
        appointment_id=appointment.id,
        patient_id=appointment.user_id,
        doctor_id=appointment.doctor_id,
        room_id=f"vmx-{appointment.id}-{uuid.uuid4().hex[:10]}",
        provider=body.get('provider', 'webrtc'),
        status='active',
        started_at=datetime.now(timezone.utc),
    )
    db.session.add(consultation)
    db.session.commit()
    return success_response(data={'consultation': _consultation_payload(consultation)})


def create_ai_consultation_notes():
    """POST /api/consultation/<id>/ai-notes"""
    user_id = int(get_jwt_user_id())
    consultation_id = request.view_args.get('consultation_id')
    consultation = Consultation.query.get(consultation_id)
    if not consultation:
        return not_found_response("Consultation not found.")
    if user_id not in (consultation.patient_id, consultation.doctor_id):
        return forbidden_response("You do not have access to this consultation.")

    body = request.get_json(silent=True) or {}
    transcript = (body.get('transcript') or body.get('conversation') or '').strip()
    if not transcript:
        return error_response("transcript is required.", 400)

    summary = _summarize_consultation(transcript)
    note = ConsultationNote(
        consultation_id=consultation.id,
        author_user_id=user_id,
        note_type='ai',
        transcript=transcript[:20000],
        symptoms_json=json.dumps(summary.get('symptoms', [])),
        summary=summary.get('visit_summary', ''),
        follow_up_questions=json.dumps(summary.get('follow_up_questions', [])),
    )
    db.session.add(note)
    db.session.commit()
    return success_response(data={'note': {
        'id': note.id,
        'summary': note.summary,
        'symptoms': summary.get('symptoms', []),
        'followUpQuestions': summary.get('follow_up_questions', []),
        'recommendation': 'Consult a licensed doctor for professional diagnosis.',
    }})


def _consultation_payload(consultation: Consultation):
    return {
        'id': consultation.id,
        'appointmentId': consultation.appointment_id,
        'roomId': consultation.room_id,
        'provider': consultation.provider,
        'status': consultation.status,
        'patientId': consultation.patient_id,
        'doctorId': consultation.doctor_id,
        'startedAt': consultation.started_at.isoformat() if consultation.started_at else None,
    }


def _summarize_consultation(transcript: str):
    try:
        from app.services.report_analysis_service import get_report_analysis_service, parse_json_response

        service = get_report_analysis_service()
        if service._client and service._types:
            prompt = f"""
Return ONLY JSON for AI-assisted consultation notes.
Do not diagnose. Do not prescribe. Extract symptoms, follow-up questions, and a short visit summary.
JSON shape:
{{"visit_summary":"short","symptoms":[{{"name":"symptom","duration":"if stated","severity":"if stated"}}],"follow_up_questions":["question"]}}

Transcript:
{transcript[:12000]}
"""
            response = service._client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=service._types.GenerateContentConfig(
                    temperature=0.15,
                    max_output_tokens=700,
                    response_mime_type='application/json',
                ),
            )
            parsed = parse_json_response(getattr(response, 'text', '') if response else '')
            if parsed:
                return parsed
    except Exception as exc:
        logger.warning("AI consultation note generation failed: %s", exc)

    return {
        'visit_summary': transcript[:800],
        'symptoms': [],
        'follow_up_questions': [
            'When did the symptoms start?',
            'Are symptoms improving, worsening, or unchanged?',
            'Are you currently taking any medicines?',
        ],
    }
