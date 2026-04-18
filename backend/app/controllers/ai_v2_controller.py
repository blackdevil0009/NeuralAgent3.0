import os
import logging
import requests
from flask import request, jsonify, current_app, session
from werkzeug.utils import secure_filename
from app.services.rag_service import RagService
from app.services.gemini_service import GeminiService
from app.utils import success_response, error_response, created_response

logger = logging.getLogger(__name__)

from app.services.ayurveda_ai_service import AyurvedaAiService

# Lazy initialization
_ayurveda_service = None

def get_ayurveda_service():
    global _ayurveda_service
    if _ayurveda_service is None:
        _ayurveda_service = AyurvedaAiService()
    return _ayurveda_service

def ingest_ai_data():
    """POST /api/v2/ai/ingest - Placeholder for manual ingest if needed"""
    return success_response(message="Ayurveda dataset is pre-loaded.")

def query_ai_assistant():
    """POST /api/v2/ai/query"""
    # AI System is temporarily in maintenance mode
    return success_response(data={
        "response": "The Ayurveda AI Assistant is currently undergoing maintenance. Please check back later. 🌿",
        "condition": "Maintenance",
        "confidence": 1.0
    })

def reset_ai_knowledge():
    """DELETE /api/v2/ai/reset"""
    return success_response(message="Local knowledge base reset not required (static dataset used).")
