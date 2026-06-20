"""
app/controllers/admin_controller.py
Admin Dashboard Controller
"""

from flask import request
from sqlalchemy import or_, desc
from app.extensions import db
from app.models.user import User
from app.models.appointment import Appointment
from app.utils.response import success_response, error_response, not_found_response
from app.models.wellness import Subscription

def get_stats():
    """Returns overall platform statistics for the admin dashboard."""
    try:
        total_patients = User.query.filter_by(role='patient').count()
        total_doctors = User.query.filter_by(role='doctor').count()
        verified_doctors = User.query.filter_by(role='doctor', is_verified=True).count()
        pending_doctors = User.query.filter_by(role='doctor', verification_status='pending').count()
        
        total_appointments = Appointment.query.count()
        active_subscriptions = Subscription.query.filter_by(status='active').count()

        recent_users_query = User.query.order_by(desc(User.created_at)).limit(5).all()
        recent_users = [
            {
                'id': u.id,
                'name': u.name,
                'email': u.email,
                'role': u.role
            }
            for u in recent_users_query
        ]

        stats = {
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'verified_doctors': verified_doctors,
            'pending_doctors': pending_doctors,
            'total_appointments': total_appointments,
            'active_subscriptions': active_subscriptions,
            'recent_users': recent_users
        }
        return success_response(data=stats, message="Stats retrieved successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch stats: {str(e)}", 500)


def list_users():
    """Returns a paginated list of users based on role and search query."""
    try:
        role = request.args.get('role', 'patient')
        search = request.args.get('search', '').strip()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 15, type=int)

        query = User.query.filter_by(role=role)

        if search:
            query = query.filter(or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%")
            ))

        pagination = query.order_by(desc(User.created_at)).paginate(page=page, per_page=per_page, error_out=False)

        users_list = [u.to_dict() for u in pagination.items]

        data = {
            'users': users_list,
            'page': pagination.page,
            'pages': pagination.pages,
            'total': pagination.total,
            'per_page': pagination.per_page
        }
        return success_response(data=data, message="Users retrieved successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch users: {str(e)}", 500)


def get_user_detail(user_id):
    """Returns full details for a specific user."""
    try:
        user = User.query.get(user_id)
        if not user:
            return not_found_response("User not found.")
        return success_response(data=user.to_dict(), message="User retrieved successfully.")
    except Exception as e:
        return error_response(f"Failed to fetch user: {str(e)}", 500)


def update_user(user_id):
    """Updates user information."""
    try:
        user = User.query.get(user_id)
        if not user:
            return not_found_response("User not found.")
            
        data = request.get_json(force=True, silent=True) or {}
        
        # Prevent role escalation
        if 'role' in data and data['role'] == 'admin':
            return error_response("Cannot assign admin role.", 403)
            
        allowed_fields = ['name', 'email', 'mobile', 'address', 'city', 'state', 'pincode', 'is_active', 'is_verified']
        for field in allowed_fields:
            if field in data:
                setattr(user, field, data[field])

        db.session.commit()
        return success_response(data=user.to_dict(), message="User updated successfully.")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update user: {str(e)}", 500)


def toggle_user_active(user_id):
    """Toggles a user's active status."""
    try:
        user = User.query.get(user_id)
        if not user:
            return not_found_response("User not found.")
            
        user.is_active = not user.is_active
        db.session.commit()
        
        status = "activated" if user.is_active else "deactivated"
        return success_response(data={'is_active': user.is_active}, message=f"User account {status} successfully.")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to toggle user status: {str(e)}", 500)


def delete_user(user_id):
    """Deletes a user account entirely."""
    try:
        user = User.query.get(user_id)
        if not user:
            return not_found_response("User not found.")
            
        db.session.delete(user)
        db.session.commit()
        return success_response(message="User deleted successfully.")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to delete user: {str(e)}", 500)


def verify_doctor(user_id):
    """Verifies a doctor's account and credentials."""
    try:
        user = User.query.get(user_id)
        if not user or user.role != 'doctor':
            return not_found_response("Doctor not found.")
            
        user.is_verified = True
        user.verification_status = 'verified'
        db.session.commit()
        
        return success_response(data=user.to_dict(), message="Doctor verified successfully.")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to verify doctor: {str(e)}", 500)
