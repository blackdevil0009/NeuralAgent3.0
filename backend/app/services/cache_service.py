"""
app/services/cache_service.py - Hybrid AI response cache.

Redis is used when REDIS_URL is configured. The in-memory fallback keeps local
development fast and avoids exposing any AI keys or cache details to clients.
"""

import hashlib
import json
import logging
import os
import time
from collections import OrderedDict
from typing import Optional

logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = int(os.getenv("AI_CACHE_TTL_SECONDS", "86400"))
MAX_MEMORY_ITEMS = int(os.getenv("AI_CACHE_MAX_ITEMS", "2000"))

_memory_cache: OrderedDict[str, tuple[float, str]] = OrderedDict()
_redis_client = None


COMMON_QUERIES = {
    "cold": "For a common cold, drink warm fluids, try steam inhalation, rest well, and consider ginger or tulsi tea. Seek medical help if fever is high, breathing is difficult, or symptoms last more than 3 days.",
    "cough": "For a mild cough, warm water, honey with ginger, and avoiding cold drinks may help. See a clinician if you have breathing trouble, chest pain, blood in sputum, or symptoms that worsen.",
    "fever": "For mild fever, rest, hydrate, and monitor temperature. Seek urgent medical care for high fever, confusion, severe weakness, dehydration, or fever lasting more than 48 hours.",
    "headache": "For a mild headache, hydrate, rest in a quiet room, reduce screen strain, and try gentle temple massage. Seek care urgently if it is sudden, severe, follows injury, or comes with weakness or vision changes.",
    "hydration": "Aim for steady water intake through the day, more during heat or exercise. Pale-yellow urine is a practical hydration sign for many people.",
    "sleep": "Keep a consistent sleep schedule, reduce late caffeine, dim screens before bed, and make the room cool and quiet. Persistent insomnia deserves a clinician's review.",
    "stress": "Try slow breathing, a short walk, journaling, and a consistent sleep routine. If stress feels unmanageable or affects daily life, please speak with a mental health professional.",
    "joint pain": "For mild joint pain, rest, gentle movement, warm compresses, and anti-inflammatory foods may help. See a doctor for swelling, fever, injury, or severe pain.",
}


def _normalize(query: str) -> str:
    return " ".join((query or "").lower().strip().split())


def _cache_key(query: str) -> str:
    digest = hashlib.sha256(_normalize(query).encode("utf-8")).hexdigest()
    return f"ai:response:{digest}"


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        return None

    try:
        import redis

        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
        )
        _redis_client.ping()
        logger.info("AI cache connected to Redis.")
    except Exception as exc:
        logger.warning("Redis unavailable for AI cache, using memory fallback: %s", exc)
        _redis_client = None
    return _redis_client


def get_cached_response(query: str) -> Optional[str]:
    key = _cache_key(query)
    redis_client = _get_redis()
    if redis_client:
        try:
            value = redis_client.get(key)
            if value:
                return value
        except Exception as exc:
            logger.warning("Redis AI cache read failed: %s", exc)

    entry = _memory_cache.get(key)
    if not entry:
        return None

    expires_at, value = entry
    if expires_at < time.time():
        _memory_cache.pop(key, None)
        return None

    _memory_cache.move_to_end(key)
    return value


def set_cache(query: str, response: str, ttl_seconds: int = DEFAULT_TTL_SECONDS):
    if not query or not response:
        return

    key = _cache_key(query)
    redis_client = _get_redis()
    if redis_client:
        try:
            redis_client.setex(key, ttl_seconds, response)
            return
        except Exception as exc:
            logger.warning("Redis AI cache write failed: %s", exc)

    _memory_cache[key] = (time.time() + ttl_seconds, response)
    _memory_cache.move_to_end(key)
    while len(_memory_cache) > MAX_MEMORY_ITEMS:
        _memory_cache.popitem(last=False)


def detect_rule_response(query: str) -> Optional[str]:
    query_lower = _normalize(query)
    for keyword, response in COMMON_QUERIES.items():
        if keyword in query_lower:
            return response
    return None


def detect_intent_and_cache(query: str):
    cached = get_cached_response(query)
    if cached:
        return cached, True, "cache"

    rule_response = detect_rule_response(query)
    if rule_response:
        set_cache(query, rule_response)
        return rule_response, True, "rule"

    return None, False, "gemini_required"


def cache_stats() -> dict:
    return {
        "backend": "redis" if _get_redis() else "memory",
        "memory_items": len(_memory_cache),
        "ttl_seconds": DEFAULT_TTL_SECONDS,
        "common_rules": len(COMMON_QUERIES),
    }


def serialize_cache_payload(response: str, metadata: dict | None = None) -> str:
    return json.dumps({"response": response, "metadata": metadata or {}})
