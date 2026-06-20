"""
app/routes/admin_routes.py — Admin Panel Routes
All routes require: JWT + role='admin'
"""

from flask import Blueprint
from app.middleware import jwt_required_custom, roles_required
from app.controllers.admin_controller import (
    get_stats, list_users, get_user_detail,
    update_user, toggle_user_active, delete_user, verify_doctor
)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/stats', methods=['GET'])
@jwt_required_custom
@roles_required('admin')
def stats():
    return get_stats()


@admin_bp.route('/users', methods=['GET'])
@jwt_required_custom
@roles_required('admin')
def users_list():
    return list_users()


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required_custom
@roles_required('admin')
def user_detail(user_id):
    return get_user_detail(user_id)


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required_custom
@roles_required('admin')
def user_update(user_id):
    return update_user(user_id)


@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PATCH'])
@jwt_required_custom
@roles_required('admin')
def user_toggle(user_id):
    return toggle_user_active(user_id)


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required_custom
@roles_required('admin')
def user_delete(user_id):
    return delete_user(user_id)


@admin_bp.route('/users/<int:user_id>/verify', methods=['PATCH'])
@jwt_required_custom
@roles_required('admin')
def doctor_verify(user_id):
    return verify_doctor(user_id)
