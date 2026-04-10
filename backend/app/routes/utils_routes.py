"""
app/routes/utils_routes.py — Utility / Helper Endpoints

Endpoints:
  GET  /api/utils/ifsc/<code>   — IFSC bank code lookup
  GET  /api/utils/health        — health-check
  POST /api/forgot-password     — password reset request (mounted at root /api)
  POST /api/reset-password      — password reset confirm
"""

from datetime import datetime
from flask import Blueprint, jsonify
from app.controllers import (forgot_password, reset_password, get_ifsc_info,
                             report_emergency, get_my_emergencies,
                             get_emergencies_list, resolve_emergency)
from app.middleware  import jwt_required_custom

utils_bp = Blueprint('utils', __name__)

# ── Health check ──────────────────────────────────────────────────
@utils_bp.route('/api/utils/health', methods=['GET'])
def health():
    return jsonify({'success': True, 'data': {'status': 'ok', 'service': 'VaidyaMed-X API'}}), 200

# ── IFSC lookup (JWT optional — allow unauthenticated usage) ─────
@utils_bp.route('/api/utils/ifsc/<string:code>', methods=['GET'])
def ifsc_lookup(code):
    return get_ifsc_info(code)

# ── Password reset (mounted at /api level, not /api/auth) ─────────
@utils_bp.route('/api/forgot-password', methods=['POST'])
def forgot_pw():
    return forgot_password()

@utils_bp.route('/api/reset-password', methods=['POST'])
def reset_pw():
    return reset_password()

@utils_bp.route('/api/notifications', methods=['GET'])
@jwt_required_custom
def notifications():
    return jsonify({'success': True, 'data': [], 'message': 'No new notifications.'}), 200

@utils_bp.route('/api/emergencies/my', methods=['GET'])
@jwt_required_custom
def emergencies_my_route():
    return get_my_emergencies()

@utils_bp.route('/api/patient/dashboard-data', methods=['GET'])
@jwt_required_custom
def dashboard_data():
    from app.middleware import get_jwt_user_id
    from app.models.medical_report import MedicalReport
    import json

    user_id = get_jwt_user_id()
    # Get the most recently analysed report for this patient
    latest = (MedicalReport.query
              .filter_by(user_id=user_id, status='Analysed')
              .order_by(MedicalReport.analysed_at.desc())
              .first())

    vitals   = []
    symptoms = []
    activity = []

    if latest:
        try:
            vitals   = json.loads(latest.vitals_json   or '[]')
            symptoms = json.loads(latest.symptoms_json or '[]')
            activity = [
                {'title': f"Report '{latest.display_name}' analysed", 'time': latest.analysed_at.strftime('%d %b %Y'), 'dot': '#2d6a4f'},
            ]
        except Exception:
            pass

    return jsonify({
        'success': True,
        'data': {
            'vitals':   vitals,
            'symptoms': symptoms,
            'activity': activity,
        },
        'message': 'Dashboard data synchronized.'
    }), 200

@utils_bp.route('/api/emergencies', methods=['GET'])
@jwt_required_custom
def emergencies_list_route():
    return get_emergencies_list()

@utils_bp.route('/api/emergencies', methods=['POST'])
@jwt_required_custom
def report_emergency_route():
    return report_emergency()

@utils_bp.route('/api/emergencies/<int:id>/handle', methods=['PUT'])
@jwt_required_custom
def handle_emergency_route(id):
    return resolve_emergency(id)

@utils_bp.route('/api/emergencies/<int:id>/notify_patient', methods=['POST'])
@jwt_required_custom
def notify_patient_emergency(id):
    return jsonify({'success': True, 'message': 'Patient notified.'}), 200

@utils_bp.route('/api/patients/<int:id>/medical', methods=['GET'])
@jwt_required_custom
def get_patient_medical(id):
    return jsonify({
        'success': True,
        'data': {
            'conditions': 'Hypertension, Mild Asthma',
            'medications': 'Amlodipine 5mg, Albuterol (as needed)',
            'allergies': 'Penicillin, Dust Mites',
            'dosha': 'Pitta-Kapha'
        }
    }), 200

@utils_bp.route('/api/messages', methods=['GET'])
@jwt_required_custom
def get_legacy_messages():
    return jsonify({
        'success': True,
        'data': [] # No legacy messages for now
    }), 200

@utils_bp.route('/api/messages/upload', methods=['POST'])
@jwt_required_custom
def upload_message_file():
    # Mock file upload - use a more reliable medical report icon instead of via.placeholder
    return jsonify({
        'success': True,
        'url': 'https://img.icons8.com/color/144/medical-report.png', 
        'message': 'File uploaded.'
    }), 200
