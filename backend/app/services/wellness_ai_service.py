"""
app/services/wellness_ai_service.py - cost-optimized Gemini wellness AI.

Request flow:
cache/rules -> quota guard -> compact Gemini prompt -> response cache -> MySQL usage logs.
"""

import json
import logging
import os
import time
import uuid
import hashlib
from datetime import date, datetime, timezone
from threading import Thread

from flask import current_app

from app.extensions import db
from app.services.ai_billing_service import check_quota, estimate_tokens, log_ai_usage
from app.services.cache_service import detect_intent_and_cache, set_cache

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_FALLBACK_MODELS = [
    model.strip()
    for model in os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash,gemini-2.0-flash,gemini-2.5-flash-lite",
    ).split(",")
    if model.strip()
]
MAX_OUTPUT_TOKENS = int(os.getenv("GEMINI_MAX_OUTPUT_TOKENS", "420"))
TEMPERATURE = float(os.getenv("GEMINI_TEMPERATURE", "0.25"))
GEMINI_TRUST_ENV_PROXY = os.getenv("GEMINI_TRUST_ENV_PROXY", "False").lower() == "true"

_SCORE_WEIGHTS = {
    "sleep": 25,
    "water": 20,
    "exercise": 20,
    "diet": 20,
    "stress": 15,
}


class WellnessAIService:
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
                logger.warning("GEMINI_API_KEY not set. Gemini calls disabled.")
                return
            self._client = genai.Client(
                api_key=api_key,
                http_options=types.HttpOptions(
                    client_args={"trust_env": GEMINI_TRUST_ENV_PROXY},
                    async_client_args={"trust_env": GEMINI_TRUST_ENV_PROXY},
                ),
            )
            self._types = types
            logger.info("Gemini configured for VaidyaMedX AI.")
        except ImportError:
            logger.error("google-genai is not installed.")

    def chat(self, user_id: int, message: str, session_id: str | None = None,
             org_id: int | None = None, image_b64: str | None = None) -> dict:
        session_id = session_id or str(uuid.uuid4())
        started_at = time.perf_counter()

        cached_response, fast_path, route = detect_intent_and_cache(message)
        allowed, quota_reason, quota = check_quota(user_id, org_id)
        plan = quota.get("plan", "free")

        if fast_path and cached_response:
            db.session.commit()
            self._persist_async(
                user_id=user_id,
                org_id=org_id,
                session_id=session_id,
                message=message,
                ai_text=cached_response,
                route=route,
                model_used="cache/rule",
                prompt_text=message,
                started_at=started_at,
                plan=plan,
            )
            return self._response(session_id, cached_response, route, "cache/rule", quota)

        if not allowed:
            self._persist_usage_only(
                user_id=user_id,
                org_id=org_id,
                session_id=session_id,
                message=message,
                route="blocked",
                model_used="quota",
                prompt_text=message,
                response_text=quota_reason,
                started_at=started_at,
                plan=plan,
                status="quota_exceeded",
            )
            return {
                "session_id": session_id,
                "conversation_id": None,
                "response": quota_reason,
                "matched_condition": None,
                "confidence": None,
                "rag_sources": [],
                "model_used": "quota",
                "route": "blocked",
                "quota": quota,
                "requires_feedback": False,
            }

        prompt = self._build_compact_prompt(message)
        
        contents = [prompt]
        if image_b64:
            import base64
            # handle 'data:image/jpeg;base64,...' format
            b64_str = image_b64.split(",")[-1] if "," in image_b64 else image_b64
            img_bytes = base64.b64decode(b64_str)
            contents.append(
                self._types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
            )
            
        ai_text, model_used = self._generate(contents)

        if self._is_cacheable(ai_text) and not image_b64:
            set_cache(message, ai_text)

        usage_id = self._persist_sync(
            user_id=user_id,
            org_id=org_id,
            session_id=session_id,
            message=message,
            ai_text=ai_text,
            route="gemini",
            model_used=model_used,
            prompt_text=prompt,
            started_at=started_at,
            plan=plan,
            status="success" if model_used != "none" else "service_unavailable",
        )
        if model_used != "none":
            quota["daily_used"] = quota.get("daily_used", 0) + 1
            quota["monthly_used"] = quota.get("monthly_used", 0) + 1
        result = self._response(session_id, ai_text, "gemini", model_used, quota)
        result["conversation_id"] = usage_id
        return result

    def chat_stream(self, user_id: int, message: str, session_id: str | None = None,
                    org_id: int | None = None):
        result = self.chat(user_id, message, session_id, org_id)
        yield f"data: {json.dumps({'chunk': result['response']})}\n\n"
        yield f"data: {json.dumps({'done': True, 'session_id': result['session_id'], 'route': result['route']})}\n\n"

    def _generate(self, contents: list | str) -> tuple[str, str]:
        if not self._client or not self._types:
            return ("AI service is temporarily unavailable. Please try again later.", "none")

        models_to_try = list(dict.fromkeys([GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]))
        config = self._types.GenerateContentConfig(
            max_output_tokens=MAX_OUTPUT_TOKENS,
            temperature=TEMPERATURE,
        )
        last_error = None

        for model_name in models_to_try:
            try:
                response = self._client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                text = getattr(response, "text", "") if response else ""
                if text:
                    return text.strip(), model_name
            except Exception as exc:
                last_error = exc
                err = str(exc)
                if any(code in err for code in ("404", "NOT_FOUND", "not found", "not supported")):
                    logger.warning("Gemini model unavailable (%s), trying fallback.", model_name)
                    continue
                logger.error("Gemini generation failed with %s: %s", model_name, exc)
                break

        if last_error:
            logger.error("Gemini generation failed after fallbacks: %s", last_error)

        return ("VaidyaMedX AI is busy right now. Please try again shortly.", "none")

    def _build_compact_prompt(self, message: str) -> str:
        cleaned = " ".join(message.strip().split())[:1200]
        return (
            "You are Vaidya, the highly intelligent and empathetic clinical AI assistant for VaidyaMed-X. "
            "You converse naturally like a knowledgeable, warm, and friendly human doctor. "
            "If the user is asking about wellness, give practical advice in a conversational tone. "
            "If the user provides an image or medical report, analyze it carefully and explain it simply. "
            "Always be concise enough for a chat interface, but retain a supportive and extremely human-like bedside manner. "
            "Do not use stiff robotic formatting like '1. 2. 3. 4.' unless specifically asked for a list. "
            "End with a polite, caring sign-off, but no generic legal disclaimers unless explicitly discussing life-threatening danger.\n\n"
            f"User: {cleaned}\nVaidya:"
        )

    def _is_cacheable(self, response: str) -> bool:
        if not response:
            return False
        blocked = ("temporarily unavailable", "busy right now", "error")
        return not any(term in response.lower() for term in blocked)

    def _response(self, session_id: str, text: str, route: str, model_used: str, quota: dict) -> dict:
        return {
            "session_id": session_id,
            "conversation_id": None,
            "response": text,
            "matched_condition": None,
            "confidence": 1.0 if route in ("cache", "rule") else None,
            "rag_sources": [],
            "model_used": model_used,
            "route": route,
            "quota": quota,
            "requires_feedback": route == "gemini",
        }

    def _persist_sync(self, **kwargs) -> int | None:
        try:
            from app.extensions import db
            from app.models.wellness import AIAnalytics, AIConversation

            user_msg = AIConversation(
                user_id=kwargs["user_id"],
                session_id=kwargs["session_id"],
                org_id=kwargs["org_id"],
                role="user",
                message=kwargs["message"],
                model_used=kwargs["model_used"],
            )
            db.session.add(user_msg)
            db.session.flush()

            ai_msg = AIConversation(
                user_id=kwargs["user_id"],
                session_id=kwargs["session_id"],
                org_id=kwargs["org_id"],
                role="assistant",
                message=kwargs["ai_text"],
                model_used=kwargs["model_used"],
            )
            db.session.add(ai_msg)
            db.session.flush()

            usage = log_ai_usage(
                user_id=kwargs["user_id"],
                org_id=kwargs["org_id"],
                plan=kwargs["plan"],
                session_id=kwargs["session_id"],
                message=kwargs["message"],
                route=kwargs["route"],
                model_used=kwargs["model_used"],
                prompt_text=kwargs["prompt_text"],
                response_text=kwargs["ai_text"],
                latency_started_at=kwargs["started_at"],
                status=kwargs.get("status", "success"),
            )
            ai_msg.prompt_tokens = estimate_tokens(kwargs["prompt_text"])
            ai_msg.output_tokens = estimate_tokens(kwargs["ai_text"])

            db.session.add(AIAnalytics(
                org_id=kwargs["org_id"],
                user_id=kwargs["user_id"],
                event_type="ai_query",
                session_id=kwargs["session_id"],
                event_data=json.dumps({
                    "route": kwargs["route"],
                    "model": kwargs["model_used"],
                    "estimated_cost_usd": str(usage.estimated_cost_usd),
                }),
            ))
            if kwargs["route"] in ("cache", "rule", "gemini") and self._is_cacheable(kwargs["ai_text"]):
                self._upsert_cached_response(kwargs["message"], kwargs["ai_text"], kwargs["route"])
            db.session.commit()
            return ai_msg.id
        except Exception as exc:
            logger.error("AI persistence failed: %s", exc, exc_info=True)
            db.session.rollback()
            return None

    def _upsert_cached_response(self, message: str, response: str, route: str):
        from app.models.wellness import CachedResponse

        normalized = " ".join((message or "").lower().strip().split())[:500]
        query_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        row = CachedResponse.query.filter_by(query_hash=query_hash).first()
        if row:
            row.response = response
            row.hit_count += 1 if route in ("cache", "rule") else 0
            row.source = "rule" if route == "rule" else row.source
        else:
            row = CachedResponse(
                query_hash=query_hash,
                normalized_query=normalized,
                response=response,
                category="wellness",
                source="rule" if route == "rule" else "gemini",
                hit_count=1 if route in ("cache", "rule") else 0,
            )
            db.session.add(row)

    def _persist_usage_only(self, **kwargs):
        try:
            log_ai_usage(
                user_id=kwargs["user_id"],
                org_id=kwargs["org_id"],
                plan=kwargs["plan"],
                session_id=kwargs["session_id"],
                message=kwargs["message"],
                route=kwargs["route"],
                model_used=kwargs["model_used"],
                prompt_text=kwargs["prompt_text"],
                response_text=kwargs["response_text"],
                latency_started_at=kwargs["started_at"],
                status=kwargs["status"],
            )
            from app.extensions import db
            db.session.commit()
        except Exception as exc:
            logger.error("AI usage logging failed: %s", exc)
            db.session.rollback()

    def _persist_async(self, **kwargs):
        app = current_app._get_current_object()

        def background_task():
            with app.app_context():
                self._persist_sync(**kwargs)

        Thread(target=background_task, daemon=True).start()

    def get_history(self, user_id: int, session_id: str | None = None,
                    limit: int = 50) -> list[dict]:
        from app.models.wellness import AIConversation

        q = AIConversation.query.filter_by(user_id=user_id)
        if session_id:
            q = q.filter_by(session_id=session_id)
        msgs = q.order_by(AIConversation.created_at.asc()).limit(limit).all()
        return [m.to_dict() for m in msgs]

    def get_sessions(self, user_id: int) -> list[dict]:
        from sqlalchemy import func
        from app.models.wellness import AIConversation

        rows = (
            AIConversation.query
            .with_entities(
                AIConversation.session_id,
                func.min(AIConversation.created_at).label("started_at"),
                func.count(AIConversation.id).label("message_count"),
            )
            .filter_by(user_id=user_id)
            .group_by(AIConversation.session_id)
            .order_by(func.min(AIConversation.created_at).desc())
            .limit(20)
            .all()
        )
        return [
            {
                "session_id": r.session_id,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "message_count": r.message_count,
            }
            for r in rows
        ]

    def compute_wellness_score(self, user_id: int, log_date: date | None = None) -> dict:
        from app.extensions import db
        from app.models.wellness import WellnessLog, WellnessScore

        log_date = log_date or date.today()
        log = WellnessLog.query.filter_by(user_id=user_id, log_date=log_date).first()
        breakdown = {}
        total = 0.0

        if log:
            if log.sleep_hours is not None:
                score = _score_sleep(min(log.sleep_hours, 12)) * _SCORE_WEIGHTS["sleep"] / 100
                breakdown["sleep"] = round(score, 1)
                total += score
            if log.water_ml is not None:
                score = min(log.water_ml / 2000, 1.0) * _SCORE_WEIGHTS["water"]
                breakdown["water"] = round(score, 1)
                total += score
            if log.exercise_min is not None:
                score = min(log.exercise_min / 30, 1.0) * _SCORE_WEIGHTS["exercise"]
                breakdown["exercise"] = round(score, 1)
                total += score
            if log.diet_quality:
                score = {"excellent": 1.0, "good": 0.75, "fair": 0.5, "poor": 0.25}.get(log.diet_quality, 0)
                score *= _SCORE_WEIGHTS["diet"]
                breakdown["diet"] = round(score, 1)
                total += score
            if log.stress_level is not None:
                score = max(0, (10 - log.stress_level) / 9) * _SCORE_WEIGHTS["stress"]
                breakdown["stress"] = round(score, 1)
                total += score
        else:
            breakdown = {k: 0 for k in _SCORE_WEIGHTS}

        score = round(min(total, 100), 1)
        recommendations = self._generate_wellness_tips(score, breakdown, log)

        existing = WellnessScore.query.filter_by(user_id=user_id, score_date=log_date).first()
        if existing:
            existing.score = score
            existing.breakdown = json.dumps(breakdown)
            existing.ai_recommendations = recommendations
        else:
            db.session.add(WellnessScore(
                user_id=user_id,
                score_date=log_date,
                score=score,
                breakdown=json.dumps(breakdown),
                ai_recommendations=recommendations,
            ))
        db.session.commit()

        return {
            "score": score,
            "breakdown": breakdown,
            "max_possible": 100,
            "date": log_date.isoformat(),
            "recommendations": recommendations,
            "log_exists": log is not None,
        }

    def _generate_wellness_tips(self, score: float, breakdown: dict, log) -> str:
        low_areas = [k for k, v in breakdown.items() if v < (_SCORE_WEIGHTS.get(k, 20) * 0.5)]
        if not low_areas:
            return "1. Keep your current routine steady today.\n2. Maintain hydration, balanced meals, and a consistent sleep window."
        tips = {
            "sleep": "Keep a consistent bedtime and reduce screens 45 minutes before sleep.",
            "water": "Sip water regularly through the day instead of waiting for thirst.",
            "exercise": "Add a 10-15 minute walk or gentle mobility session today.",
            "diet": "Choose warm, balanced meals with vegetables, protein, and fewer fried foods.",
            "stress": "Try 5 minutes of slow breathing and take one short screen-free break.",
        }
        return "\n".join(f"{idx}. {tips[item]}" for idx, item in enumerate(low_areas[:5], start=1))


def _score_sleep(hours: float) -> float:
    if 7 <= hours <= 9:
        return 100
    if 6 <= hours < 7 or 9 < hours <= 10:
        return 75
    if 5 <= hours < 6 or 10 < hours <= 11:
        return 50
    if hours < 5:
        return max(0, hours / 5 * 30)
    return 25


_service_instance: WellnessAIService | None = None


def get_wellness_service() -> WellnessAIService:
    global _service_instance
    if _service_instance is None:
        _service_instance = WellnessAIService()
    return _service_instance
