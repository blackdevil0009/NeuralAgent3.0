import logging
import os
import google.generativeai as genai
from flask import current_app

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables.")
        
        genai.configure(api_key=api_key)

    def generate_response(self, query, context_chunks):
        """Construct prompt and generate response with multi-model fallback."""
        context_text = "\n\n".join([c['content'] for i, c in enumerate(context_chunks)])
        
        prompt = f"""
SYSTEM:
You are an expert Ayurvedic doctor at VaidyaMed-X. You are compassionate, wise, and grounded in traditional Ayurvedic wisdom (Vata, Pitta, Kapha). 

RULES:
1. ONLY answer based on the provided Ayurvedic CONTEXT below.
2. If the context does contain the answer, provide a detailed clinical response.
3. If the context does not contain the answer, say: "I apologize, but I don't have enough specific Ayurvedic data to answer that. Please consult with one of our senior specialists."
4. Do NOT hallucinate or guess.
5. Always prioritize safety. If the query suggests a critical emergency, tell the user to use the '🚨 EMERGENCY' button immediately.

CONTEXT:
{context_text}

USER QUESTION:
{query}

AYURVEDIC RESPONSE:
"""
        # List of models to try in order of availability/quota likelihood
        models_to_try = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.0-pro',
            'gemini-2.0-flash',
            'gemini-1.5-pro'
        ]

        last_error = None
        for model_name in models_to_try:
            try:
                logger.info(f"Attempting Gemini response with model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                
                if response and hasattr(response, 'text'):
                    logger.info(f"✅ Gemini Success ({model_name}). Length: {len(response.text)}")
                    return response.text
                else:
                    logger.warning(f"Empty response from {model_name}.")
                    continue
            except Exception as e:
                last_error = str(e)
                # Skip to next model if this one is rate-limited (429) OR not supported (404)
                if any(err in last_error for err in ["429", "ResourceExhausted", "404", "NotFound"]):
                    logger.warning(f"Model {model_name} unavailable or limited. Trying next fallback...")
                    continue
                else:
                    logger.error(f"Gemini error with {model_name}: {e}")
                    break

        return f"VaidyaMed-X AI is currently experiencing high demand (Rate Limit). Please wait 60 seconds and try again. [Error: {last_error}]"
