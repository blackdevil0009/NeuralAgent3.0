"""
app/services/document_verification_service.py — AI OCR Document Verification
Uses Gemini 1.5 Flash to verify doctor credentials and detect fraud.
"""

import json
import logging
import os
from typing import Dict, Any
from flask import current_app

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

class DocumentVerificationService:
    def __init__(self):
        self._client = None
        self._types = None
        self._init_gemini()

    def _init_gemini(self):
        try:
            from google import genai
            from google.genai import types

            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not set. Document Verification disabled.")
                return
            self._client = genai.Client(api_key=api_key)
            self._types = types
            logger.info("Gemini configured for Document Verification.")
        except ImportError:
            logger.error("google-genai is not installed.")

    def verify_document(
        self,
        image_bytes: bytes,
        mime_type: str,
        expected_name: str,
        expected_degree: str,
        expected_reg_number: str,
        expected_dob: str = ''
    ) -> Dict[str, Any]:
        """
        Runs the document through Gemini to verify authenticity and extract fields.
        Now also extracts and cross-checks Date of Birth from the document.
        """
        if not self._client or not self._types:
            return {
                "is_valid": False,
                "reason": "Verification service is currently unavailable. Please contact support.",
                "extracted": {}
            }

        try:
            dob_instruction = (
                f"4. Extract the Date of Birth (DOB) of the candidate. "
                f"Compare it to the Expected DOB: {expected_dob}. "
                f"If the expected DOB is provided and there is a clear mismatch, mark the document as invalid.\n"
                if expected_dob
                else "4. Extract the Date of Birth (DOB) if it is present on the document (can be null if not found).\n"
            )

            prompt = (
                "You are an expert fraud detection AI and document verifier for a medical platform. "
                "Analyze the provided image of a medical document (Degree, Marksheet, or License). "
                "Strictly check the following:\n"
                "1. Is the image blurry, illegible, or significantly tampered with?\n"
                "2. Is the image completely unrelated to medical credentials (e.g. a car, a landscape)?\n"
                "3. Extract the full name of the doctor/candidate, the degree/course name, and the medical registration number/roll number.\n"
                + dob_instruction
                + f"Compare the extracted data to the following expected values:\n"
                f"- Expected Name: {expected_name}\n"
                f"- Expected Degree: {expected_degree}\n"
                f"- Expected Reg. Number: {expected_reg_number}\n\n"
                "Return ONLY a strict JSON object with this exact schema (no markdown, no backticks, no extra text):\n"
                "{\n"
                '  "is_valid": true or false,\n'
                '  "reason": "If invalid, explain why (e.g. Blurry, Name mismatch, Unrelated image, Fake document). If valid, leave empty.",\n'
                '  "extracted": {\n'
                '     "name": "extracted name or null",\n'
                '     "degree": "extracted degree or null",\n'
                '     "regNumber": "extracted reg number or null",\n'
                '     "dob": "extracted date of birth in YYYY-MM-DD format, or null if not found"\n'
                "  }\n"
                "}"
            )

            response = self._client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    self._types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ],
                config=self._types.GenerateContentConfig(
                    temperature=0.0,
                    response_mime_type="application/json"
                )
            )

            text = getattr(response, "text", "") if response else ""
            if not text:
                return {"is_valid": False, "reason": "Failed to analyze document.", "extracted": {}}
            
            # Clean text in case Gemini returns markdown blocks despite the strict prompt
            cleaned_text = text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]

            result = json.loads(cleaned_text.strip())
            
            # Additional rigid fallback checks
            if not isinstance(result.get("is_valid"), bool):
                result["is_valid"] = False
                result["reason"] = "Invalid AI response structure."

            return result

        except Exception as exc:
            logger.error("Document verification failed: %s", exc, exc_info=True)
            return {
                "is_valid": False,
                "reason": "An error occurred during AI analysis. Please try a clearer image.",
                "extracted": {}
            }

_service_instance: DocumentVerificationService | None = None

def get_verification_service() -> DocumentVerificationService:
    global _service_instance
    if _service_instance is None:
        _service_instance = DocumentVerificationService()
    return _service_instance
