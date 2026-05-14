"""
Compatibility controller for /api/v2/ai.

The old Ayurveda/TinyLlama/RAG system has been removed from the request path.
These endpoints now delegate to the production Gemini hybrid router used by
/api/wellness/chat, so existing clients keep working.
"""

from flask import request
from flask_jwt_extended import get_jwt_identity

from app.services.wellness_ai_service import get_wellness_service
from app.utils import success_response, error_response


def ingest_ai_data():
    """POST /api/v2/ai/ingest"""
    return success_response(message="Static ingest is disabled. VaidyaMedX AI now uses cache/rules plus Gemini on demand.")


def query_ai_assistant():
    """POST /api/v2/ai/query"""
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or body.get("query") or "").strip()
    if not message:
        return error_response("message is required", 400)

    user_id = get_jwt_identity()
    if not user_id:
        return error_response("Authentication required", 401)

    result = get_wellness_service().chat(
        user_id=int(user_id),
        message=message,
        session_id=body.get("session_id"),
        org_id=body.get("org_id"),
    )
    return success_response(data={
        "response": result["response"],
        "condition": result.get("matched_condition"),
        "confidence": result.get("confidence"),
        "session_id": result.get("session_id"),
        "model_used": result.get("model_used"),
        "route": result.get("route"),
        "quota": result.get("quota"),
    })


def reset_ai_knowledge():
    """DELETE /api/v2/ai/reset"""
    return success_response(message="Local AI knowledge reset is no longer required.")
