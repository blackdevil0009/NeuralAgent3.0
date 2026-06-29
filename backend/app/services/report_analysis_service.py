"""
Medical report extraction and Gemini analysis engine.

This service is intentionally dependency-tolerant: PDF parsing, OCR, and image
preprocessing run when their packages/binaries are installed, while Gemini can
still analyze supported files directly as a fallback.
"""

import json
import logging
import mimetypes
import os
import re
import time
from dataclasses import dataclass
from typing import Any
import joblib
from app.services.ml_training_service import ml_service

logger = logging.getLogger(__name__)

LOCAL_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'ai', 'models', 'report_analysis_model.pkl')

REPORT_GEMINI_MODEL = os.getenv("REPORT_GEMINI_MODEL", os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
REPORT_FALLBACK_MODELS = [
    item.strip()
    for item in os.getenv(
        "REPORT_GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash,gemini-2.0-flash,gemini-2.5-flash-lite",
    ).split(",")
    if item.strip()
]
REPORT_MAX_OUTPUT_TOKENS = int(os.getenv("REPORT_GEMINI_MAX_OUTPUT_TOKENS", "1400"))
REPORT_INLINE_MAX_MB = int(os.getenv("AI_REPORT_INLINE_MAX_MB", "12"))
GEMINI_TRUST_ENV_PROXY = os.getenv("GEMINI_TRUST_ENV_PROXY", "False").lower() == "true"

NORMAL_RANGES = {
    "hemoglobin": {"low": 12.0, "high": 17.5, "unit": "g/dL"},
    "hb": {"low": 12.0, "high": 17.5, "unit": "g/dL"},
    "vitamin d": {"low": 30.0, "high": 100.0, "unit": "ng/mL"},
    "fasting glucose": {"low": 70.0, "high": 100.0, "unit": "mg/dL"},
    "glucose": {"low": 70.0, "high": 140.0, "unit": "mg/dL"},
    "hba1c": {"low": 4.0, "high": 5.7, "unit": "%"},
    "tsh": {"low": 0.4, "high": 4.0, "unit": "mIU/L"},
    "total cholesterol": {"low": 0.0, "high": 200.0, "unit": "mg/dL"},
    "ldl": {"low": 0.0, "high": 100.0, "unit": "mg/dL"},
    "triglycerides": {"low": 0.0, "high": 150.0, "unit": "mg/dL"},
}


@dataclass
class ExtractionResult:
    text: str
    engine: str


class MedicalReportAnalysisService:
    def __init__(self):
        self._client = None
        self._types = None
        self._local_model = None
        self._init_gemini()
        self._init_local_model()

    def _init_local_model(self):
        if os.path.exists(LOCAL_MODEL_PATH):
            try:
                self._local_model = joblib.load(LOCAL_MODEL_PATH)
                logger.info("Local report analysis model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load local report analysis model: {e}")

    def _init_gemini(self):
        try:
            from google import genai
            from google.genai import types

            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not set. Report AI analysis will use fallback summaries.")
                return
            self._client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    client_args={"trust_env": GEMINI_TRUST_ENV_PROXY},
                    async_client_args={"trust_env": GEMINI_TRUST_ENV_PROXY},
                ),
            )
            self._types = types
        except ImportError:
            logger.error("google-genai is not installed.")

    def analyze(self, *, file_bytes: bytes, filename: str, mime_type: str | None) -> dict[str, Any]:
        started = time.perf_counter()
        mime_type = mime_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        extraction = self.extract_text(file_bytes=file_bytes, filename=filename, mime_type=mime_type)
        abnormal_values = detect_abnormal_values(extraction.text)

        # --- Extreme Level ML Prediction (Custom Trained Model) ---
        actual_problem = "Unknown / Needs Doctor Review"
        detailed_analysis = "No definitive problem detected by local AI."
        
        # 1. Fallback to basic local model if no custom model exists
        if self._local_model and extraction.text.strip():
            try:
                abnormal_context = " ".join([f"{item['status']} {item['name']}" for item in abnormal_values])
                combined_text = f"{abnormal_context} {extraction.text}"
                actual_problem = self._local_model.predict([combined_text])[0]
                detailed_analysis = f"Based on the report findings, the local AI flags a high probability of: {actual_problem}."
            except Exception as e:
                logger.error(f"Local model prediction failed: {e}")

        # 2. Use the Custom Trained ML Model (Extreme Level Accuracy)
        latest_model_id = ml_service.get_latest_model_id()
        if latest_model_id and abnormal_values:
            feature_dict = {item['name']: item['value'] for item in abnormal_values}
            try:
                ml_result = ml_service.predict(latest_model_id, feature_dict)
                if ml_result.get("success") and ml_result.get("predictions"):
                    actual_problem = str(ml_result["predictions"][0])
                    detailed_analysis = f"The custom ML model analyzed your vitals and accurately predicts: {actual_problem}."
            except Exception as e:
                logger.error(f"Custom ML model prediction failed: {e}")

        ai_result, model_used = self._generate_ai_analysis(
            extracted_text=extraction.text,
            file_bytes=file_bytes,
            filename=filename,
            mime_type=mime_type,
            abnormal_values=abnormal_values,
            ml_prediction=actual_problem,
            ml_analysis=detailed_analysis,
        )

        if not ai_result:
            ai_result = fallback_analysis(extraction.text, abnormal_values)
            model_used = "rules-fallback"

        # Inject Local AI findings into final result
        ai_result["actual_problem"] = actual_problem
        ai_result["detailed_analysis"] = detailed_analysis

        ai_result.setdefault("abnormal_values", abnormal_values)
        ai_result.setdefault("risk_level", risk_from_abnormal_values(abnormal_values))
        ai_result.setdefault(
            "recommendation",
            "Please consult a licensed healthcare professional for medical diagnosis.",
        )
        ai_result["disclaimer"] = "Consult a licensed doctor for professional diagnosis."
        ai_result["model_used"] = model_used
        ai_result["ocr_engine"] = extraction.engine
        ai_result["extracted_text"] = extraction.text[:20000]
        ai_result["processing_ms"] = int((time.perf_counter() - started) * 1000)
        return ai_result

    def extract_text(self, *, file_bytes: bytes, filename: str, mime_type: str) -> ExtractionResult:
        if mime_type == "application/pdf" or filename.lower().endswith(".pdf"):
            pdf_text = self._extract_pdf_text(file_bytes)
            if pdf_text.strip():
                return ExtractionResult(pdf_text, "pypdf")
            return ExtractionResult("", "pdf-empty")

        if mime_type.startswith("image/"):
            image_text = self._extract_image_text(file_bytes)
            return ExtractionResult(image_text, "tesseract" if image_text else "image-ocr-unavailable")

        return ExtractionResult("", "unsupported")

    def _extract_pdf_text(self, file_bytes: bytes) -> str:
        try:
            from pypdf import PdfReader
            import io

            reader = PdfReader(io.BytesIO(file_bytes))
            pages = [(page.extract_text() or "") for page in reader.pages[:12]]
            return "\n\n".join(page.strip() for page in pages if page.strip())
        except Exception as exc:
            logger.warning("PDF text extraction failed: %s", exc)
            return ""

    def _extract_image_text(self, file_bytes: bytes) -> str:
        try:
            import io
            from PIL import Image, ImageFilter, ImageOps
            import pytesseract

            image = Image.open(io.BytesIO(file_bytes)).convert("L")
            image = ImageOps.autocontrast(image)
            image = image.filter(ImageFilter.SHARPEN)
            return (pytesseract.image_to_string(image, config="--psm 6") or "").strip()
        except Exception as exc:
            logger.info("Image OCR unavailable or failed: %s", exc)
            return ""

    def _generate_ai_analysis(
        self,
        *,
        extracted_text: str,
        file_bytes: bytes,
        filename: str,
        mime_type: str,
        abnormal_values: list[dict],
        ml_prediction: str = None,
        ml_analysis: str = None,
    ) -> tuple[dict[str, Any] | None, str]:
        if not self._client or not self._types:
            return None, "none"

        prompt = build_report_prompt(extracted_text, abnormal_values, ml_prediction, ml_analysis)
        contents: list[Any] = [prompt]
        if len(file_bytes) <= REPORT_INLINE_MAX_MB * 1024 * 1024 and mime_type in {
            "application/pdf", "image/jpeg", "image/jpg", "image/png"
        }:
            try:
                contents.append(self._types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
            except Exception as exc:
                logger.info("Could not attach report bytes to Gemini request: %s", exc)

        config = self._types.GenerateContentConfig(
            temperature=0.15,
            max_output_tokens=REPORT_MAX_OUTPUT_TOKENS,
            response_mime_type="application/json",
        )
        models = list(dict.fromkeys([REPORT_GEMINI_MODEL, *REPORT_FALLBACK_MODELS]))
        last_error = None

        for model_name in models:
            try:
                response = self._client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                text = getattr(response, "text", "") if response else ""
                parsed = parse_json_response(text)
                if parsed:
                    return parsed, model_name
            except Exception as exc:
                last_error = exc
                err = str(exc)
                if any(code in err for code in ("404", "NOT_FOUND", "not found", "not supported")):
                    logger.warning("Report Gemini model unavailable (%s), trying fallback.", model_name)
                    continue
                logger.error("Report Gemini analysis failed with %s: %s", model_name, exc)
                break

        if last_error:
            logger.error("Report Gemini analysis failed after fallbacks: %s", last_error)
        return None, "none"


def build_report_prompt(extracted_text: str, abnormal_values: list[dict], ml_prediction: str = None, ml_analysis: str = None) -> str:
    trimmed = (extracted_text or "")[:12000]
    
    ml_context = ""
    if ml_prediction and ml_prediction != "Unknown / Needs Doctor Review":
        ml_context = f"""
Extreme Level ML Prediction:
Our custom machine learning model has analyzed the patient's tabular data and predicts the condition is: {ml_prediction}.
({ml_analysis})
CRITICAL INSTRUCTION: You MUST formulate your remedies, suggestions, and lifestyle guidance based on the fact that the patient likely has {ml_prediction}. Do NOT guess, use the ML prediction!
"""

    return f"""
You are VaidyaMedX Medical Report Analysis AI.

Task:
- Extract readable medical findings from the attached report or text.
- Identify key health values and abnormal values when clearly present.
{ml_context}
- Explain in simple patient-friendly language.
- Do not diagnose disease (mention the ML prediction as a strong possibility, but advise consultation).
- Do not prescribe medicines or dosages.
- Always advise licensed doctor consultation.

Return ONLY valid JSON with this shape:
{{
  "actual_problem": "string (optional field, populated by our local AI)",
  "detailed_analysis": "string (optional field)",
  "report_summary": ["short bullet"],
  "key_values": [{{"name": "Hemoglobin", "value": "11.2", "unit": "g/dL", "status": "low|normal|high|unknown", "note": "short"}}],
  "abnormal_values": [{{"name": "Vitamin D", "value": "18", "unit": "ng/mL", "status": "low", "concern": "short"}}],
  "possible_concerns": ["short bullet"],
  "suggestions": ["short bullet"],
  "diet_recommendations": ["short bullet"],
  "hydration_advice": "short text",
  "lifestyle_guidance": ["short bullet"],
  "risk_level": "low|moderate|high|unknown",
  "recommendation": "Please consult a licensed healthcare professional for medical diagnosis."
}}

Rule-detected abnormal values:
{json.dumps(abnormal_values, ensure_ascii=False)}

Extracted text:
{trimmed}
"""


def parse_json_response(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return None
    return None


def detect_abnormal_values(text: str) -> list[dict]:
    findings = []
    normalized = (text or "").lower()
    for label, ranges in NORMAL_RANGES.items():
        pattern = rf"{re.escape(label)}[^0-9]{{0,25}}(\d+(?:\.\d+)?)"
        match = re.search(pattern, normalized)
        if not match:
            continue
        value = float(match.group(1))
        status = "normal"
        if value < ranges["low"]:
            status = "low"
        elif value > ranges["high"]:
            status = "high"
        if status != "normal":
            findings.append({
                "name": label.title(),
                "value": value,
                "unit": ranges["unit"],
                "status": status,
                "reference": f"{ranges['low']}-{ranges['high']} {ranges['unit']}",
            })
    return findings


def risk_from_abnormal_values(values: list[dict]) -> str:
    if not values:
        return "low"
    if len(values) >= 3:
        return "moderate"
    return "moderate" if any(item.get("status") in ("high", "low") for item in values) else "low"


def fallback_analysis(extracted_text: str, abnormal_values: list[dict]) -> dict[str, Any]:
    if abnormal_values:
        summary = [
            f"{item['name']} appears {item['status']} at {item['value']} {item['unit']}."
            for item in abnormal_values[:5]
        ]
    elif extracted_text:
        summary = ["Report text was extracted successfully. No common abnormal values were detected by rule checks."]
    else:
        summary = ["The file was uploaded, but readable text could not be extracted automatically."]

    return {
        "report_summary": summary,
        "key_values": abnormal_values,
        "abnormal_values": abnormal_values,
        "possible_concerns": ["Review the findings with a clinician, especially if symptoms are present."],
        "suggestions": ["Keep the original report available for your doctor.", "Track related symptoms and medications."],
        "diet_recommendations": ["Maintain balanced meals unless your doctor has advised a specific diet."],
        "hydration_advice": "Maintain regular hydration unless restricted by a clinician.",
        "lifestyle_guidance": ["Sleep consistently.", "Stay physically active within your comfort and doctor advice."],
        "risk_level": risk_from_abnormal_values(abnormal_values),
        "recommendation": "Please consult a licensed healthcare professional for medical diagnosis.",
    }


_service_instance: MedicalReportAnalysisService | None = None


def get_report_analysis_service() -> MedicalReportAnalysisService:
    global _service_instance
    if _service_instance is None:
        _service_instance = MedicalReportAnalysisService()
    return _service_instance
