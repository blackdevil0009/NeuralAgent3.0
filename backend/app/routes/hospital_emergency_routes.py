"""
app/routes/hospital_emergency_routes.py — Hospital Emergency Management Routes
"""

from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.controllers.hospital_emergency_controller import (
    get_all_emergencies,
    get_emergency_by_id,
    assign_doctor_to_emergency,
    resolve_emergency,
    get_hospital_doctors
)

hospital_emergency_bp = Blueprint('hospital_emergency', __name__, url_prefix='/api/hospital')


@hospital_emergency_bp.route('/emergencies', methods=['GET'])
@jwt_required()
def list_emergencies():
    """GET /api/hospital/emergencies"""
    return get_all_emergencies()


@hospital_emergency_bp.route('/emergencies/<int:emergency_id>', methods=['GET'])
@jwt_required()
def detail_emergency(emergency_id):
    """GET /api/hospital/emergencies/<id>"""
    return get_emergency_by_id(emergency_id)


@hospital_emergency_bp.route('/emergencies/<int:emergency_id>/assign', methods=['POST'])
@jwt_required()
def assign_emergency(emergency_id):
    """POST /api/hospital/emergencies/<id>/assign"""
    return assign_doctor_to_emergency(emergency_id)


@hospital_emergency_bp.route('/emergencies/<int:emergency_id>/resolve', methods=['PUT'])
@jwt_required()
def resolve_emergency_route(emergency_id):
    """PUT /api/hospital/emergencies/<id>/resolve"""
    return resolve_emergency(emergency_id)


@hospital_emergency_bp.route('/doctors', methods=['GET'])
@jwt_required()
def list_doctors():
    """GET /api/hospital/doctors"""
    return get_hospital_doctors()
