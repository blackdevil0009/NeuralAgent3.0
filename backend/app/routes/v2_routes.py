from flask import Blueprint
from app.middleware import jwt_required_custom
from app.controllers.v2_controller import upload_key, get_v2_history, send_v2_message

v2_bp = Blueprint('v2', __name__, url_prefix='/api/v2')

@v2_bp.route('/keys/upload', methods=['POST'])
@jwt_required_custom
def v2_upload_key():
    return upload_key()

@v2_bp.route('/messages/history/<int:id>', methods=['GET'])
@jwt_required_custom
def v2_get_history(id):
    return get_v2_history(id)

@v2_bp.route('/messages/send', methods=['POST'])
@jwt_required_custom
def v2_send_msg():
    return send_v2_message()
