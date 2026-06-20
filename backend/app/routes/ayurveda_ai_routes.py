"""
app/routes/ayurveda_ai_routes.py — Routes for Local Ayurvedic AI
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.ayurveda_ai_service import AyurvedaAIService
from app.models.user import User

ayurveda_ai_bp = Blueprint('ayurveda_ai', __name__)

@ayurveda_ai_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict_treatment():
    data = request.get_json()
    symptoms = data.get('symptoms', '').strip()
    
    if not symptoms:
        return jsonify({'error': 'Symptoms are required.'}), 400
        
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Optional: Restrict to doctors, but for now we let anyone try it 
    # (as per the user's plan approval without restrictions)
    
    predicted = AyurvedaAIService.predict_treatment(symptoms)
    
    return jsonify({
        'symptoms': symptoms,
        'predicted_treatment': predicted
    }), 200

@ayurveda_ai_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    data = request.get_json()
    symptoms = data.get('symptoms', '').strip()
    predicted = data.get('predicted_treatment', '').strip()
    actual = data.get('actual_treatment', '').strip()
    
    if not all([symptoms, predicted, actual]):
        return jsonify({'error': 'symptoms, predicted_treatment, and actual_treatment are required.'}), 400
        
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    # We enforce that only doctors can submit feedback that trains the model
    if user.role != 'doctor':
        return jsonify({'error': 'Only verified doctors can submit training feedback.'}), 403
        
    log_id = AyurvedaAIService.submit_feedback(user_id, symptoms, predicted, actual)
    
    return jsonify({
        'message': 'Feedback successfully submitted for AI self-learning.',
        'log_id': log_id
    }), 200
