"""
app/controllers/emergency_controller.py - Logic for handling emergency cases
"""

from datetime import datetime, timezone

from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity

from app.extensions import db, socketio
from app.models.emergency import Emergency
from app.models.user import User


def get_emergency_booking_options():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None

    hospitals = (
        User.query
        .filter_by(role='organization', is_active=True, is_email_verified=True)
        .order_by(User.name.asc())
        .all()
    )
    independent_doctors = (
        User.query
        .filter_by(role='doctor', is_active=True, hospital_id=None, is_email_verified=True)
        .order_by(User.name.asc())
        .all()
    )

    hospital_payload = []
    for hospital in hospitals:
        hospital_payload.append({
            'id': hospital.id,
            'name': hospital.hospital or hospital.name or 'Hospital',
            'type': hospital.hospital_type or 'general',
            'address': ', '.join(
                part for part in [hospital.address, hospital.city, hospital.state, hospital.pincode] if part
            ),
            'contact': hospital.mobile or '',
            'doctorCount': User.query.filter_by(hospital_id=hospital.id, role='doctor').count(),
            'activeEmergencyCount': Emergency.query.filter(
                Emergency.hospital_id == hospital.id,
                Emergency.status != 'resolved',
            ).count(),
        })

    doctor_payload = []
    for doctor in independent_doctors:
        doctor_payload.append({
            'id': doctor.id,
            'name': doctor.name or 'Doctor',
            'specialization': doctor.specialization or 'General Medicine',
            'clinicName': doctor.hospital or doctor.name or 'Local Clinic',
            'clinicLocation': doctor.clinic_location or ', '.join(
                part for part in [doctor.address, doctor.city, doctor.state] if part
            ),
            'contact': doctor.mobile or '',
            'experience': doctor.experience or '',
            'consultantFee': doctor.consultant_fee if doctor.consultant_fee is not None else 0,
            'activeEmergencyCount': Emergency.query.filter(
                Emergency.doctor_id == doctor.id,
                Emergency.status != 'resolved',
            ).count(),
        })

    return jsonify({
        'success': True,
        'data': {
            'patientProfile': {
                'name': user.name if user else '',
                'contact': user.mobile if user else '',
                'location': ', '.join(
                    part for part in [
                        user.address if user else '',
                        user.city if user else '',
                        user.state if user else '',
                        user.pincode if user else '',
                    ] if part
                ),
            },
            'hospitals': hospital_payload,
            'independentDoctors': doctor_payload,
        }
    }), 200


def report_emergency():
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    explanation = (data.get('explanation') or '').strip()
    case_type = (data.get('caseType') or data.get('type') or '').strip()
    contact = (data.get('contact') or '').strip()
    patient_name = (data.get('patientName') or '').strip()
    contact_name = (data.get('contactName') or '').strip()
    location = (data.get('location') or '').strip()
    provider_type = (data.get('providerType') or 'hospital').strip().lower()
    provider_id = data.get('providerId')

    if not all([explanation, case_type, contact, contact_name, location, provider_id]):
        return jsonify({'success': False, 'error': 'Please complete all required emergency details.'}), 422

    patient = User.query.get(int(user_id)) if user_id else None
    if not patient:
        return jsonify({'success': False, 'error': 'Patient account not found.'}), 404

    doctor_id = None
    hospital_id = None
    provider_name = ''

    if provider_type == 'hospital':
        hospital = User.query.filter_by(id=provider_id, role='organization', is_active=True).first()
        if not hospital:
            return jsonify({'success': False, 'error': 'Selected hospital was not found.'}), 404
        hospital_id = hospital.id
        provider_name = hospital.hospital or hospital.name or 'Hospital'
    elif provider_type == 'doctor':
        doctor = User.query.filter_by(id=provider_id, role='doctor', is_active=True).first()
        if not doctor:
            return jsonify({'success': False, 'error': 'Selected doctor was not found.'}), 404
        if doctor.hospital_id:
            return jsonify({
                'success': False,
                'error': 'Hospital-attached doctors must be booked through their hospital emergency desk.'
            }), 422
        doctor_id = doctor.id
        provider_name = doctor.hospital or f"Dr. {doctor.name}"
    else:
        return jsonify({'success': False, 'error': 'Invalid emergency provider type.'}), 422

    try:
        emergency = Emergency(
            patient_id=user_id,
            doctor_id=doctor_id,
            explanation=explanation,
            case_type=case_type,
            contact=contact,
            patient_name=patient_name or patient.name or 'Patient',
            contact_name=contact_name,
            location=location,
            provider_type=provider_type,
            provider_name=provider_name,
            hospital_id=hospital_id,
            status='pending',
            assigned_at=datetime.now(timezone.utc) if doctor_id else None,
        )
        db.session.add(emergency)
        db.session.commit()

        socketio.emit('new_emergency', emergency.to_dict())

        provider_label = provider_name or ('hospital team' if provider_type == 'hospital' else 'selected doctor')
        return jsonify({
            'success': True,
            'data': {'emergency': emergency.to_dict()},
            'message': f'Emergency request sent successfully to {provider_label}.'
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


def get_my_emergencies():
    user_id = get_jwt_identity()
    try:
        emergencies = (
            Emergency.query
            .filter_by(patient_id=user_id)
            .order_by(Emergency.created_at.desc())
            .all()
        )
        return jsonify({
            'success': True,
            'data': {'emergencies': [emergency.to_dict() for emergency in emergencies]}
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


def get_emergencies_list():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({'success': False, 'error': 'User not found.'}), 404

        query = Emergency.query.filter(Emergency.status != 'resolved')
        if user.role == 'doctor':
            query = query.filter(Emergency.doctor_id == user.id)
        elif user.role == 'organization':
            query = query.filter(Emergency.hospital_id == user.id)
        elif user.role == 'patient':
            query = query.filter(Emergency.patient_id == user.id)

        emergencies = query.order_by(Emergency.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': {'emergencies': [emergency.to_dict() for emergency in emergencies]}
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


def resolve_emergency(id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({'success': False, 'error': 'User not found.'}), 404

        emergency = Emergency.query.get(id)
        if not emergency:
            return jsonify({'success': False, 'error': 'Emergency not found.'}), 404

        if user.role == 'doctor' and emergency.doctor_id != user.id:
            return jsonify({'success': False, 'error': 'This emergency is not assigned to you.'}), 403
        if user.role == 'organization' and emergency.hospital_id != user.id:
            return jsonify({'success': False, 'error': 'This emergency is not in your hospital queue.'}), 403
        if user.role not in ('doctor', 'organization'):
            return jsonify({'success': False, 'error': 'Only care teams can resolve emergencies.'}), 403

        emergency.status = 'resolved'
        emergency.resolved_at = datetime.now(timezone.utc)
        db.session.commit()

        socketio.emit('emergency_handled', {'id': emergency.id})
        return jsonify({'success': True, 'message': 'Emergency resolved.'}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500
