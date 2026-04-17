"""
app/routes/hospital_routes.py - Hospital management blueprint
"""

from flask import Blueprint

from app.controllers.hospital_mgmt_controller import (
    add_doctor,
    remove_doctor,
    list_hospital_doctors,
    verify_doctor_flow,
    get_invite_status,
    accept_invitation,
    reject_invitation,
)
from app.middleware import jwt_required_custom

hospital_bp = Blueprint("hospital_mgmt", __name__, url_prefix="/api/v2")

# Public invitation endpoints
hospital_bp.add_url_rule("/doctor/verify", view_func=verify_doctor_flow, methods=["POST"])
hospital_bp.add_url_rule("/doctor/invite/status", view_func=get_invite_status, methods=["GET"])
hospital_bp.add_url_rule("/doctor/invite/accept", view_func=accept_invitation, methods=["POST"])
hospital_bp.add_url_rule("/doctor/invite/reject", view_func=reject_invitation, methods=["POST"])


@hospital_bp.route("/hospital/doctor/add", methods=["POST"])
@jwt_required_custom
def route_add_doctor():
    return add_doctor()


@hospital_bp.route("/hospital/doctor/remove", methods=["DELETE"])
@jwt_required_custom
def route_remove_doctor():
    return remove_doctor()


@hospital_bp.route("/hospital/doctors", methods=["GET"])
@jwt_required_custom
def route_list_doctors():
    return list_hospital_doctors()
