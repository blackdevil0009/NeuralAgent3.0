import os
import logging
from flask import request, jsonify, current_app
from werkzeug.utils import secure_filename
from app.services.rag_service import RagService
from app.services.gemini_service import GeminiService
from app.services.biogpt_service import BioGptService
from app.utils import success_response, error_response, created_response

logger = logging.getLogger(__name__)

# Lazy initialization of services
_rag_service = None
_gemini_service = None
_biogpt_service = None

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

def get_biogpt_service():
    global _biogpt_service
    if _biogpt_service is None:
        _biogpt_service = BioGptService()
    return _biogpt_service

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
    body = request.get_json() or {}
    query = body.get('message')
    
    if not query:
        return error_response("Query message is required.", 400)

    try:
        # 1. Retrieve Context
        context_chunks = get_rag_service().query(query, top_k=5)
        
        # 2. Generate Response via Gemini
        gemini_answer = get_gemini_service().generate_response(query, context_chunks)
        
        # 3. Optional BioGPT Verification
        # We only run BioGPT if the question is clinical/biomedical
        clinical_verification = None
        if any(keyword in query.lower() for keyword in ['symptom', 'disease', 'medicine', 'treatment', 'infection']):
            clinical_verification = get_biogpt_service().analyze_clinical_text(query)

        # 4. Construct Final Response
        response_data = {
            "response": gemini_answer,
            "sources": [c['metadata'].get('source', 'System Knowledge') for c in context_chunks],
            "bio_insight": clinical_verification,
            "confidence": 0.95 if context_chunks else 0.70
        }

        return success_response(data=response_data)
    except Exception as e:
        logger.error(f"AI Query controller error: {e}")
        return error_response("An error occurred while processing your query.")

def reset_ai_knowledge():
    """DELETE /api/v2/ai/reset"""
    if get_rag_service().reset_db():
        return success_response(message="AI Knowledge base has been reset.")
    return error_response("Failed to reset knowledge base.")
