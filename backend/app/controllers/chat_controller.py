"""
app/controllers/chat_controller.py — Chat API Business Logic
"""

from app.services.chat_service import get_chat_history
from app.utils import success_response

def fetch_history(appointment_id):
    """GET /api/chat/history/<appointment_id>"""
    history = get_chat_history(appointment_id)
    return success_response(
        data=history,
        message='Chat history retrieved.'
    )
