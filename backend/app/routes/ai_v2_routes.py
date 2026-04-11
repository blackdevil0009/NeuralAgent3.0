from flask import Blueprint
from app.middleware import jwt_required_custom
from app.controllers.ai_v2_controller import ingest_ai_data, query_ai_assistant, reset_ai_knowledge

ai_v2_bp = Blueprint('ai_v2', __name__, url_prefix='/api/v2/ai')

@ai_v2_bp.route('/ingest', methods=['POST'])
@jwt_required_custom
def ai_ingest():
    return ingest_ai_data()

@ai_v2_bp.route('/query', methods=['POST'])
@jwt_required_custom
def ai_query():
    return query_ai_assistant()

@ai_v2_bp.route('/reset', methods=['DELETE'])
@jwt_required_custom
def ai_reset():
    return reset_ai_knowledge()
