"""
app/controllers/emergency_controller.py — Logic for handling emergency cases
"""

from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from datetime import datetime, timezone
from app.extensions import db, socketio
from app.models.emergency import Emergency
from app.models.user import User

def report_emergency():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    explanation = data.get('explanation')
    case_type = data.get('caseType') or data.get('type')
    contact = data.get('contact')
    
    if not all([explanation, case_type, contact]):
        return jsonify({'success': False, 'error': 'Missing required fields.'}), 422
        
    try:
        emergency = Emergency(
            patient_id=user_id,
            explanation=explanation,
            case_type=case_type,
            contact=contact,
            status='pending'
        )
        db.session.add(emergency)
        db.session.commit()
        
        # Broadcast to doctors via socket
        socketio.emit('new_emergency', emergency.to_dict())
        
        return jsonify({
            'success': True,
            'data': {'emergency': emergency.to_dict()},
            'message': 'Emergency broadcast sent successfully.'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

def get_my_emergencies():
    user_id = get_jwt_identity()
    try:
        emergencies = Emergency.query.filter_by(patient_id=user_id).order_by(Emergency.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': {'emergencies': [e.to_dict() for e in emergencies]}
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def get_emergencies_list():
    try:
        # For doctors, show all pending or claimed emergencies
        emergencies = Emergency.query.filter(Emergency.status != 'resolved').order_by(Emergency.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': {'emergencies': [e.to_dict() for e in emergencies]}
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def resolve_emergency(id):
    try:
        emergency = Emergency.query.get(id)
        if not emergency:
            return jsonify({'success': False, 'error': 'Emergency not found.'}), 404
            
        emergency.status = 'resolved'
        db.session.commit()
        
        # Notify all doctors that it's handled
        socketio.emit('emergency_handled', {'id': emergency.id})
        
        return jsonify({'success': True, 'message': 'Emergency resolved.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
