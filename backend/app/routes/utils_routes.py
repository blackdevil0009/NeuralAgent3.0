"""
app/routes/utils_routes.py — Utility / Helper Endpoints

Endpoints:
  GET  /api/utils/ifsc/<code>   — IFSC bank code lookup
  GET  /api/utils/health        — health-check
  POST /api/forgot-password     — password reset request (mounted at root /api)
  POST /api/reset-password      — password reset confirm
"""

import os
import uuid
from datetime import datetime
from flask import Blueprint, jsonify, request, send_from_directory, current_app
from werkzeug.utils import secure_filename

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
    """Handle actual file uploads for chat attachments."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    # Ensure uploads/messages exists
    upload_base = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    msg_folder = os.path.join(upload_base, 'messages')
    os.makedirs(msg_folder, exist_ok=True)

    # Secure filename with UUID to avoid collisions
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'dat'
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    
    save_path = os.path.join(msg_folder, unique_name)
    file.save(save_path)

    # Return the URL. The frontend will use this to render the image/doc.
    # We serve this via the /api/utils/uploads/<path> route defined below.
    return jsonify({
        'success': True,
        'url': f"/api/utils/uploads/messages/{unique_name}",
        'filename': original_name,
        'message': 'File uploaded successfully.'
    }), 200

@utils_bp.route('/api/utils/uploads/<path:filename>', methods=['GET'])
def serve_uploads(filename):
    """Serve uploaded files from the UPLOAD_FOLDER."""
    upload_base = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    return send_from_directory(upload_base, filename)
