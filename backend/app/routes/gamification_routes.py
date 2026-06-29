"""
app/routes/gamification_routes.py
"""

from flask import Blueprint
from app.controllers import gamification_controller
from app.middleware import jwt_required_custom

gamification_bp = Blueprint('gamification_bp', __name__, url_prefix='/api/gamification')

@gamification_bp.route('/dashboard', methods=['GET'])
@jwt_required_custom
def get_dashboard():
    return gamification_controller.get_dashboard_data()

@gamification_bp.route('/quiz/submit', methods=['POST'])
@jwt_required_custom
def submit_quiz():
    return gamification_controller.submit_daily_quiz()

@gamification_bp.route('/daily-login', methods=['POST'])
@jwt_required_custom
def claim_login():
    return gamification_controller.claim_daily_login()

@gamification_bp.route('/knowledge-upload', methods=['POST'])
@jwt_required_custom
def upload_knowledge():
    return gamification_controller.upload_knowledge_dataset()

@gamification_bp.route('/quiz/generate', methods=['GET'])
@jwt_required_custom
def generate_quiz():
    return gamification_controller.generate_ai_quiz()
