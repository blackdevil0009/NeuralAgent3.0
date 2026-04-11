"""
app/routes/doctor_routes.py — Doctor-Specific Blueprint

Endpoints:
  POST /api/doctor/verify-upi   — initiate UPI verification (doctor only)
"""

from flask import Blueprint
from app.controllers import verify_upi, get_doctors, get_doctor_profile
from app.middleware  import jwt_required_custom, roles_required

# Note we'll change the prefix to just /api to allow /api/doctors and /api/doctor/verify-upi
doctor_bp = Blueprint('doctor', __name__, url_prefix='/api')

@doctor_bp.route('/doctors', methods=['GET'])
def list_doctors():
    return get_doctors()

@doctor_bp.route('/doctors/<int:doctor_id>', methods=['GET'])
@jwt_required_custom
def get_profile(doctor_id):
    return get_doctor_profile(doctor_id)

@doctor_bp.route('/doctor/verify-upi', methods=['POST'])
@jwt_required_custom
@roles_required('doctor')
def upi_verify():
    return verify_upi()
