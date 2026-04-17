import os
import logging
import requests
from flask import request, jsonify, current_app, session
from werkzeug.utils import secure_filename
from app.services.rag_service import RagService
from app.services.gemini_service import GeminiService
from app.utils import success_response, error_response, created_response

logger = logging.getLogger(__name__)

# Lazy initialization of services
_rag_service = None
_gemini_service = None

def get_rag_service():
    global _rag_service
    if _rag_service is None:
        _rag_service = RagService()
    return _rag_service

def get_gemini_service():
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service


def ingest_ai_data():
    """POST /api/v2/ai/ingest"""
    if 'file' not in request.files:
        return error_response("No file provided.", 400)
    
    file = request.files['file']
    if file.filename == '':
        return error_response("No file selected.", 400)

    # Save temporary for processing
    tmp_path = os.path.join(current_app.root_path, '..', 'uploads', 'temp')
    os.makedirs(tmp_path, exist_ok=True)
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(tmp_path, filename)
    file.save(file_path)

    try:
        topic = request.form.get('topic', 'General Ayurveda')
        success, result = get_rag_service().ingest_file(file_path, metadata={"topic": topic, "source": filename})
        
        # Cleanup
        os.remove(file_path)

        if success:
            return created_response(
                data={"chunks": result},
                message=f"Knowledge base updated with {result} chunks from {filename}."
            )
        else:
            return error_response(f"Ingestion failed: {result}")
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        return error_response(str(e))

def query_ai_assistant():
    """POST /api/v2/ai/query"""
    # 1. Extract message from JSON or Form data (for file uploads)
    query = None
    if request.is_json:
        body = request.get_json(silent=True) or {}
        query = body.get('message')
    else:
        query = request.form.get('message')

    # 2. Handle file-only queries (autofill message)
    if not query and request.files.get('file'):
        query = "Please analyze the attached context/image."
    
    if not query:
        return error_response("Query message is required.", 400)

    try:
        # Forward the request to the new FastAPI-based Ayurveda AI service
        # Use 127.0.0.1 explicitly to avoid IPv6 resolution issues on Windows
        ai_service_url = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8000/ask")
        
        # We use a placeholder user_id if session is not available, or the real user ID
        user_id = session.get('user_id', 'guest_session')
        
        logger.info(f"Proxying AI query to engine: {ai_service_url}")
        
        api_payload = {
            "user_id": str(user_id),
            "message": query,
            "stream": False
        }

        response = requests.post(ai_service_url, json=api_payload, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"AI Service Error ({response.status_code}): {response.text}")
            return error_response(f"AI Engine returned error: {response.status_code}", 500)
        
        res_data = response.json()

        # 4. Construct Final Response in the format expected by the frontend
        response_data = {
            "response": res_data.get("response", "No response from AI."),
            "sources": res_data.get("sources", []),
            "bio_insight": None, # Kept for API compatibility
            "confidence": 0.95
        }

        return success_response(data=response_data)
    except Exception as e:
        logger.error(f"AI Query controller proxy error: {e}")
        return error_response(f"AI Engine link failure: {str(e)}", 500)

def reset_ai_knowledge():
    """DELETE /api/v2/ai/reset"""
    if get_rag_service().reset_db():
        return success_response(message="AI Knowledge base has been reset.")
    return error_response("Failed to reset knowledge base.")
