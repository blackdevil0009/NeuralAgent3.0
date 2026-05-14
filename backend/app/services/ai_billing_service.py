"""
Quota, token, and estimated cost controls for VaidyaMedX AI.
"""

import hashlib
import math
import time
from datetime import date, datetime, timezone
from decimal import Decimal

from app.extensions import db
from app.models.wellness import (
    AIUsageLog,
    PLAN_LIMITS,
    Subscription,
    TokenTracking,
    UserAILimit,
)

GEMINI_FLASH_INPUT_PER_1M = Decimal("0.10")
GEMINI_FLASH_OUTPUT_PER_1M = Decimal("0.40")


def normalize_text(value: str) -> str:
    return " ".join((value or "").lower().strip().split())


def request_hash(message: str) -> str:
    return hashlib.sha256(normalize_text(message).encode("utf-8")).hexdigest()


def estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, math.ceil(len(text) / 4))


def estimate_cost_usd(prompt_tokens: int, output_tokens: int) -> Decimal:
    input_cost = (Decimal(prompt_tokens) / Decimal(1_000_000)) * GEMINI_FLASH_INPUT_PER_1M
    output_cost = (Decimal(output_tokens) / Decimal(1_000_000)) * GEMINI_FLASH_OUTPUT_PER_1M
    return (input_cost + output_cost).quantize(Decimal("0.000001"))


def get_user_subscription(user_id: int, org_id: int | None = None) -> Subscription:
    query = Subscription.query.filter_by(user_id=user_id).filter(
        Subscription.status.in_(("active", "trial"))
    )
    if org_id:
        query = query.filter_by(org_id=org_id)
    sub = query.order_by(Subscription.created_at.desc()).first()
    if sub:
        return sub

    sub = Subscription(
        user_id=user_id,
        org_id=org_id,
        plan="free",
        status="active",
        amount_paise=0,
    )
    db.session.add(sub)
    db.session.flush()
    return sub


def get_or_create_limit(user_id: int, org_id: int | None = None) -> tuple[UserAILimit, Subscription]:
    today = date.today()
    month_key = today.strftime("%Y-%m")
    sub = get_user_subscription(user_id, org_id)
    limits = PLAN_LIMITS.get(sub.plan, PLAN_LIMITS["free"])

    row = UserAILimit.query.filter_by(
        user_id=user_id,
        usage_date=today,
        month_key=month_key,
    ).first()
    if not row:
        month_used = (
            db.session.query(db.func.coalesce(db.func.sum(UserAILimit.daily_used), 0))
            .filter(UserAILimit.user_id == user_id, UserAILimit.month_key == month_key)
            .scalar()
            or 0
        )
        row = UserAILimit(
            user_id=user_id,
            org_id=org_id,
            usage_date=today,
            month_key=month_key,
            plan=sub.plan,
            daily_limit=limits["daily"],
            monthly_limit=limits["monthly"],
            monthly_used=int(month_used),
        )
        db.session.add(row)
        db.session.flush()
    else:
        row.plan = sub.plan
        row.daily_limit = limits["daily"]
        row.monthly_limit = limits["monthly"]
        if org_id and not row.org_id:
            row.org_id = org_id

    return row, sub


def check_quota(user_id: int, org_id: int | None = None) -> tuple[bool, str, dict]:
    limit, sub = get_or_create_limit(user_id, org_id)
    if limit.daily_used >= limit.daily_limit:
        return False, "Daily AI quota exceeded. Upgrade your plan or try again tomorrow.", {
            "plan": sub.plan,
            "daily_used": limit.daily_used,
            "daily_limit": limit.daily_limit,
            "monthly_used": limit.monthly_used,
            "monthly_limit": limit.monthly_limit,
        }
    if limit.monthly_used >= limit.monthly_limit:
        return False, "Monthly AI quota exceeded. Upgrade your plan to continue.", {
            "plan": sub.plan,
            "daily_used": limit.daily_used,
            "daily_limit": limit.daily_limit,
            "monthly_used": limit.monthly_used,
            "monthly_limit": limit.monthly_limit,
        }
    return True, "", {
        "plan": sub.plan,
        "daily_used": limit.daily_used,
        "daily_limit": limit.daily_limit,
        "monthly_used": limit.monthly_used,
        "monthly_limit": limit.monthly_limit,
    }


def increment_quota(user_id: int, org_id: int | None, estimated_cost: Decimal):
    limit, _ = get_or_create_limit(user_id, org_id)
    limit.daily_used += 1
    limit.monthly_used += 1
    limit.estimated_cost_usd = Decimal(limit.estimated_cost_usd or 0) + estimated_cost


def log_ai_usage(
    *,
    user_id: int | None,
    org_id: int | None,
    plan: str,
    session_id: str | None,
    message: str,
    route: str,
    model_used: str | None,
    prompt_text: str,
    response_text: str,
    latency_started_at: float,
    status: str = "success",
) -> AIUsageLog:
    prompt_tokens = estimate_tokens(prompt_text)
    output_tokens = estimate_tokens(response_text)
    cost = estimate_cost_usd(prompt_tokens, output_tokens) if route == "gemini" else Decimal("0.000000")
    latency_ms = int((time.perf_counter() - latency_started_at) * 1000)

    usage = AIUsageLog(
        user_id=user_id,
        org_id=org_id,
        subscription_plan=plan or "free",
        session_id=session_id,
        request_hash=request_hash(message),
        route=route,
        model_used=model_used,
        prompt_chars=len(prompt_text or ""),
        response_chars=len(response_text or ""),
        latency_ms=latency_ms,
        estimated_cost_usd=cost,
        status=status,
    )
    db.session.add(usage)
    db.session.flush()

    db.session.add(TokenTracking(
        usage_log_id=usage.id,
        user_id=user_id,
        org_id=org_id,
        model_used=model_used or "none",
        prompt_tokens=prompt_tokens,
        output_tokens=output_tokens,
        total_tokens=prompt_tokens + output_tokens,
        estimated_cost_usd=cost,
    ))

    if user_id and route == "gemini" and status == "success":
        increment_quota(user_id, org_id, cost)

    return usage
