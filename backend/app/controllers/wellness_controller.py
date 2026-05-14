"""
app/controllers/wellness_controller.py — Wellness System Controllers

Endpoints:
    POST   /api/wellness/chat              — AI chat
    GET    /api/wellness/chat/sessions     — List user's chat sessions
    GET    /api/wellness/chat/history      — Session chat history
    POST   /api/wellness/feedback          — Submit response feedback
    GET    /api/wellness/feedback/<id>     — Get feedback for conversation

    POST   /api/wellness/log              — Log daily wellness data
    GET    /api/wellness/log/today        — Get today's log
    GET    /api/wellness/log/history      — Log history (last N days)
    GET    /api/wellness/score            — Compute/get wellness score
    GET    /api/wellness/score/history    — Score history

    POST   /api/wellness/reminders        — Create reminder
    GET    /api/wellness/reminders        — List reminders
    PUT    /api/wellness/reminders/<id>   — Update reminder
    DELETE /api/wellness/reminders/<id>  — Delete reminder

    (Admin / Org)
    GET    /api/wellness/admin/analytics  — Org AI analytics dashboard
    GET    /api/wellness/admin/users      — Org user list with scores
    GET    /api/wellness/admin/feedback   — All feedback for org

    (Super Admin)
    GET    /api/wellness/orgs             — List organizations
    POST   /api/wellness/orgs             — Create organization
    GET    /api/wellness/orgs/<id>        — Get organization detail
    PUT    /api/wellness/orgs/<id>        — Update organization
"""

import json
import logging
from datetime import date, datetime, timedelta, timezone

from flask           import request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions  import db
from app.models.wellness import (
    AIConversation, AIFeedback, WellnessLog, WellnessScore,
    Reminder, Organization, TenantSubscription, AIAnalytics,
    Subscription, UserAILimit, AIUsageLog, TokenTracking,
    EnterpriseClient, Invoice, PLAN_LIMITS
)
from app.models.user import User
from app.services.ai_billing_service import get_or_create_limit
from app.services.cache_service import cache_stats
from app.services.wellness_ai_service import get_wellness_service

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
#  Helper
# ─────────────────────────────────────────────────────────────────

def _ok(data=None, message='Success', code=200):
    return jsonify({'success': True, 'data': data or {}, 'message': message}), code


def _err(message='Error', code=400, details=None):
    payload = {'success': False, 'message': message}
    if details:
        payload['details'] = details
    return jsonify(payload), code


def _current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid)) if uid else None


# ═════════════════════════════════════════════════════════════════
#  AI CHAT
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def wellness_chat():
    """POST /api/wellness/chat"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    body       = request.get_json(silent=True) or {}
    message    = (body.get('message') or '').strip()
    session_id = body.get('session_id')

    if not message:
        return _err('message is required')

    if len(message) > 2000:
        return _err('Message too long (max 2000 characters)')

    # Check tenant AI quota
    org_id = body.get('org_id')
    if org_id:
        ok, reason = _check_ai_quota(org_id)
        if not ok:
            return _err(reason, 429)

    try:
        svc    = get_wellness_service()
        result = svc.chat(
            user_id    = user.id,
            message    = message,
            session_id = session_id,
            org_id     = org_id,
        )
        # Increment tenant quota
        if org_id:
            _increment_ai_quota(org_id)

        return _ok(result)
    except Exception as exc:
        logger.error(f'wellness_chat error: {exc}', exc_info=True)
        return _err('AI service error. Please try again.', 500)


@jwt_required()
def wellness_chat_stream():
    """POST /api/wellness/chat/stream"""
    from flask import Response, stream_with_context
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    body       = request.get_json(silent=True) or {}
    message    = (body.get('message') or '').strip()
    session_id = body.get('session_id')

    if not message:
        return _err('message is required')

    org_id = body.get('org_id')
    if org_id:
        ok, reason = _check_ai_quota(org_id)
        if not ok:
            return _err(reason, 429)
            
    svc = get_wellness_service()
    
    # Increment tenant quota
    if org_id:
        _increment_ai_quota(org_id)

    return Response(
        stream_with_context(svc.chat_stream(user.id, message, session_id, org_id)),
        mimetype='text/event-stream'
    )


@jwt_required()
def wellness_chat_sessions():
    """GET /api/wellness/chat/sessions"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    svc      = get_wellness_service()
    sessions = svc.get_sessions(user.id)
    return _ok({'sessions': sessions, 'total': len(sessions)})


@jwt_required()
def wellness_chat_history():
    """GET /api/wellness/chat/history?session_id=xxx&limit=50"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    session_id = request.args.get('session_id')
    limit      = min(int(request.args.get('limit', 50)), 200)
    svc        = get_wellness_service()
    history    = svc.get_history(user.id, session_id=session_id, limit=limit)
    return _ok({'history': history, 'total': len(history)})


# ═════════════════════════════════════════════════════════════════
#  FEEDBACK & RATINGS
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def submit_feedback():
    """POST /api/wellness/feedback"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    body = request.get_json(silent=True) or {}
    conv_id = body.get('conversation_id')
    if not conv_id:
        return _err('conversation_id is required')

    # Verify the conversation belongs to this user
    conv = AIConversation.query.filter_by(id=conv_id, user_id=user.id,
                                          role='assistant').first()
    if not conv:
        return _err('Conversation not found', 404)

    rating = body.get('rating')
    if rating is not None and not (1 <= int(rating) <= 5):
        return _err('rating must be between 1 and 5')

    # Upsert feedback
    fb = AIFeedback.query.filter_by(conversation_id=conv_id).first()
    if fb:
        fb.rating               = rating
        fb.was_helpful          = body.get('was_helpful')
        fb.noticed_improvement  = body.get('noticed_improvement')
        fb.comment              = body.get('comment', '')[:500]
    else:
        fb = AIFeedback(
            conversation_id     = conv_id,
            user_id             = user.id,
            rating              = rating,
            was_helpful         = body.get('was_helpful'),
            noticed_improvement = body.get('noticed_improvement'),
            comment             = (body.get('comment') or '')[:500],
        )
        db.session.add(fb)

    # Log analytics event
    db.session.add(AIAnalytics(
        user_id    = user.id,
        org_id     = conv.org_id,
        event_type = 'feedback_submitted',
        session_id = conv.session_id,
        event_data = json.dumps({'rating': rating, 'was_helpful': body.get('was_helpful')}),
    ))
    db.session.commit()
    return _ok(fb.to_dict(), 'Feedback submitted. Thank you!')


@jwt_required()
def get_feedback(conversation_id: int):
    """GET /api/wellness/feedback/<conversation_id>"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    fb = AIFeedback.query.filter_by(
        conversation_id=conversation_id, user_id=user.id
    ).first()
    if not fb:
        return _err('Feedback not found', 404)
    return _ok(fb.to_dict())


# ═════════════════════════════════════════════════════════════════
#  WELLNESS DAILY LOG
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def log_wellness():
    """POST /api/wellness/log"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    body     = request.get_json(silent=True) or {}
    log_date = date.today()
    if body.get('log_date'):
        try:
            log_date = date.fromisoformat(body['log_date'])
        except ValueError:
            return _err('Invalid log_date format. Use YYYY-MM-DD')

    # Upsert today's log
    log = WellnessLog.query.filter_by(user_id=user.id, log_date=log_date).first()
    if not log:
        log = WellnessLog(user_id=user.id, log_date=log_date)
        db.session.add(log)

    # Map fields
    field_map = {
        'sleep_hours':    float,
        'water_ml':       int,
        'steps':          int,
        'exercise_min':   int,
        'stress_level':   int,
        'mood':           str,
        'meals_logged':   int,
        'diet_quality':   str,
        'diet_notes':     str,
        'medicines_taken': bool,
    }
    for field, cast in field_map.items():
        if field in body and body[field] is not None:
            try:
                val = cast(body[field])
                # Validate stress_level range
                if field == 'stress_level' and not (1 <= val <= 10):
                    return _err('stress_level must be between 1 and 10')
                setattr(log, field, val)
            except (ValueError, TypeError):
                return _err(f'Invalid value for {field}')

    db.session.commit()

    # Auto-compute wellness score
    svc   = get_wellness_service()
    score = svc.compute_wellness_score(user.id, log_date)

    return _ok({'log': log.to_dict(), 'wellness_score': score}, 'Wellness log saved!')


@jwt_required()
def get_wellness_log_today():
    """GET /api/wellness/log/today"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    log = WellnessLog.query.filter_by(user_id=user.id, log_date=date.today()).first()
    return _ok({'log': log.to_dict() if log else None, 'date': date.today().isoformat()})


@jwt_required()
def get_wellness_log_history():
    """GET /api/wellness/log/history?days=7"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    days  = min(int(request.args.get('days', 7)), 90)
    since = date.today() - timedelta(days=days)
    logs  = (
        WellnessLog.query
        .filter(WellnessLog.user_id == user.id, WellnessLog.log_date >= since)
        .order_by(WellnessLog.log_date.desc())
        .all()
    )
    return _ok({'logs': [l.to_dict() for l in logs], 'days': days})


# ═════════════════════════════════════════════════════════════════
#  WELLNESS SCORE
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def get_wellness_score():
    """GET /api/wellness/score?date=YYYY-MM-DD"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    score_date = date.today()
    if request.args.get('date'):
        try:
            score_date = date.fromisoformat(request.args['date'])
        except ValueError:
            return _err('Invalid date format')

    svc   = get_wellness_service()
    score = svc.compute_wellness_score(user.id, score_date)
    return _ok(score)


@jwt_required()
def get_wellness_score_history():
    """GET /api/wellness/score/history?days=30"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    days  = min(int(request.args.get('days', 30)), 365)
    since = date.today() - timedelta(days=days)
    rows  = (
        WellnessScore.query
        .filter(WellnessScore.user_id == user.id, WellnessScore.score_date >= since)
        .order_by(WellnessScore.score_date.desc())
        .all()
    )
    return _ok({
        'scores': [r.to_dict() for r in rows],
        'average': round(sum(r.score for r in rows) / len(rows), 1) if rows else 0,
        'days': days,
    })


# ═════════════════════════════════════════════════════════════════
#  REMINDERS
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def create_reminder():
    """POST /api/wellness/reminders"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)

    body = request.get_json(silent=True) or {}
    title = (body.get('title') or '').strip()
    if not title:
        return _err('title is required')

    remind_at_str = body.get('remind_at', '')
    try:
        from datetime import time
        h, m  = remind_at_str.split(':')[:2]
        remind_time = time(int(h), int(m))
    except Exception:
        return _err('remind_at must be in HH:MM format')

    reminder = Reminder(
        user_id       = user.id,
        title         = title[:200],
        description   = (body.get('description') or '')[:500],
        reminder_type = body.get('type', 'custom'),
        remind_at     = remind_time,
        repeat        = body.get('repeat', 'daily'),
        days_of_week  = body.get('days_of_week'),
        is_active     = True,
    )
    if body.get('start_date'):
        try:
            reminder.start_date = date.fromisoformat(body['start_date'])
        except ValueError:
            pass
    if body.get('end_date'):
        try:
            reminder.end_date = date.fromisoformat(body['end_date'])
        except ValueError:
            pass

    db.session.add(reminder)
    db.session.commit()
    return _ok(reminder.to_dict(), 'Reminder created!', 201)


@jwt_required()
def list_reminders():
    """GET /api/wellness/reminders?active=true"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    q = Reminder.query.filter_by(user_id=user.id)
    if request.args.get('active', '').lower() == 'true':
        q = q.filter_by(is_active=True)
    reminders = q.order_by(Reminder.remind_at.asc()).all()
    return _ok({'reminders': [r.to_dict() for r in reminders], 'total': len(reminders)})


@jwt_required()
def update_reminder(reminder_id: int):
    """PUT /api/wellness/reminders/<id>"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    r = Reminder.query.filter_by(id=reminder_id, user_id=user.id).first()
    if not r:
        return _err('Reminder not found', 404)

    body = request.get_json(silent=True) or {}
    if 'title' in body:
        r.title = body['title'][:200]
    if 'description' in body:
        r.description = body['description'][:500]
    if 'is_active' in body:
        r.is_active = bool(body['is_active'])
    if 'remind_at' in body:
        try:
            from datetime import time
            h, m = body['remind_at'].split(':')[:2]
            r.remind_at = time(int(h), int(m))
        except Exception:
            return _err('remind_at must be in HH:MM format')
    if 'repeat' in body:
        r.repeat = body['repeat']
    if 'days_of_week' in body:
        r.days_of_week = body['days_of_week']

    db.session.commit()
    return _ok(r.to_dict(), 'Reminder updated!')


@jwt_required()
def delete_reminder(reminder_id: int):
    """DELETE /api/wellness/reminders/<id>"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    r = Reminder.query.filter_by(id=reminder_id, user_id=user.id).first()
    if not r:
        return _err('Reminder not found', 404)
    db.session.delete(r)
    db.session.commit()
    return _ok(message='Reminder deleted.')


# ═════════════════════════════════════════════════════════════════
#  ORGANIZATIONS (Multi-Tenant)
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def create_organization():
    """POST /api/wellness/orgs  (admin only)"""
    user = _current_user()
    if not user or user.role != 'admin':
        return _err('Admin access required', 403)

    body = request.get_json(silent=True) or {}
    name = (body.get('name') or '').strip()
    if not name:
        return _err('name is required')

    slug = _make_slug(name)
    if Organization.query.filter_by(slug=slug).first():
        slug = f'{slug}-{int(datetime.now().timestamp())}'

    org = Organization(
        name          = name,
        slug          = slug,
        org_type      = body.get('type', 'clinic'),
        email         = body.get('email'),
        phone         = body.get('phone'),
        address       = body.get('address'),
        city          = body.get('city'),
        state         = body.get('state'),
        primary_color = body.get('primary_color', '#1A6B4A'),
        max_users     = int(body.get('max_users', 50)),
    )
    db.session.add(org)
    db.session.flush()

    # Create default free subscription
    import datetime as dt
    trial_end = datetime.now(timezone.utc) + timedelta(days=14)
    sub = TenantSubscription(
        org_id          = org.id,
        plan            = 'free',
        status          = 'trial',
        ai_calls_limit  = 100,
        ai_calls_used   = 0,
        trial_ends_at   = trial_end,
    )
    db.session.add(sub)
    db.session.commit()
    return _ok({**org.to_dict(), 'subscription': sub.to_dict()}, 'Organization created!', 201)


@jwt_required()
def list_organizations():
    """GET /api/wellness/orgs  (admin only)"""
    user = _current_user()
    if not user or user.role != 'admin':
        return _err('Admin access required', 403)
    orgs = Organization.query.order_by(Organization.created_at.desc()).all()
    return _ok({'organizations': [o.to_dict() for o in orgs], 'total': len(orgs)})


@jwt_required()
def get_organization(org_id: int):
    """GET /api/wellness/orgs/<id>"""
    user = _current_user()
    if not user or user.role != 'admin':
        return _err('Admin access required', 403)
    org = Organization.query.get(org_id)
    if not org:
        return _err('Organization not found', 404)
    data = org.to_dict()
    if org.subscription:
        data['subscription'] = org.subscription.to_dict()
    return _ok(data)


@jwt_required()
def update_organization(org_id: int):
    """PUT /api/wellness/orgs/<id>"""
    user = _current_user()
    if not user or user.role != 'admin':
        return _err('Admin access required', 403)
    org  = Organization.query.get(org_id)
    if not org:
        return _err('Organization not found', 404)

    body = request.get_json(silent=True) or {}
    for field in ('name', 'email', 'phone', 'address', 'city', 'state',
                  'primary_color', 'logo_url'):
        if field in body:
            setattr(org, field, body[field])
    if 'max_users' in body:
        org.max_users = int(body['max_users'])
    if 'is_active' in body:
        org.is_active = bool(body['is_active'])
    if 'ai_enabled' in body:
        org.ai_enabled = bool(body['ai_enabled'])

    db.session.commit()
    return _ok(org.to_dict(), 'Organization updated!')


# ═════════════════════════════════════════════════════════════════
#  ADMIN ANALYTICS
# ═════════════════════════════════════════════════════════════════

@jwt_required()
def admin_analytics():
    """GET /api/wellness/admin/analytics?org_id=&days=30"""
    user = _current_user()
    if not user or user.role not in ('admin', 'organization'):
        return _err('Access denied', 403)

    days   = min(int(request.args.get('days', 30)), 365)
    org_id = request.args.get('org_id', type=int)
    since  = datetime.now(timezone.utc) - timedelta(days=days)

    # Total AI queries
    q = AIAnalytics.query.filter(
        AIAnalytics.event_type == 'ai_query',
        AIAnalytics.created_at >= since,
    )
    if org_id:
        q = q.filter_by(org_id=org_id)
    total_queries = q.count()

    # Feedback stats
    fq = db.session.query(
        db.func.avg(AIFeedback.rating).label('avg_rating'),
        db.func.count(AIFeedback.id).label('total_feedback'),
        db.func.sum(db.cast(AIFeedback.was_helpful, db.Integer)).label('helpful_count'),
    ).filter(AIFeedback.created_at >= since)
    fb_row = fq.first()

    # Daily query trend (last `days` days)
    from sqlalchemy import func, cast, Date
    trend_q = (
        db.session.query(
            func.date(AIAnalytics.created_at).label('day'),
            func.count(AIAnalytics.id).label('count'),
        )
        .filter(
            AIAnalytics.event_type == 'ai_query',
            AIAnalytics.created_at >= since,
        )
        .group_by('day')
        .order_by('day')
    )
    if org_id:
        trend_q = trend_q.filter(AIAnalytics.org_id == org_id)
    trend = [{'date': str(r.day), 'count': r.count} for r in trend_q.all()]

    # Avg wellness scores
    score_q = db.session.query(
        func.avg(WellnessScore.score).label('avg_score'),
        func.count(WellnessScore.id).label('total_logs'),
    ).filter(WellnessScore.score_date >= since.date())
    score_row = score_q.first()

    return _ok({
        'period_days':       days,
        'total_ai_queries':  total_queries,
        'avg_rating':        round(float(fb_row.avg_rating or 0), 2),
        'total_feedback':    fb_row.total_feedback or 0,
        'helpful_pct':       round(
            (fb_row.helpful_count or 0) / max(fb_row.total_feedback or 1, 1) * 100, 1
        ),
        'avg_wellness_score': round(float(score_row.avg_score or 0), 1),
        'total_wellness_logs': score_row.total_logs or 0,
        'daily_trend':       trend,
    })


@jwt_required()
def admin_feedback_list():
    """GET /api/wellness/admin/feedback?org_id=&limit=50"""
    user = _current_user()
    if not user or user.role not in ('admin', 'organization'):
        return _err('Access denied', 403)

    limit  = min(int(request.args.get('limit', 50)), 200)
    rows   = (
        db.session.query(AIFeedback, AIConversation, User)
        .join(AIConversation, AIFeedback.conversation_id == AIConversation.id)
        .join(User, AIFeedback.user_id == User.id)
        .order_by(AIFeedback.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for fb, conv, u in rows:
        d = fb.to_dict()
        d['user_name']    = u.name
        d['user_email']   = u.email
        d['ai_response']  = conv.message[:200]
        result.append(d)
    return _ok({'feedback': result, 'total': len(result)})


@jwt_required()
def get_my_subscription():
    """GET /api/wellness/subscription"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    sub = (
        Subscription.query
        .filter_by(user_id=user.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    limit, sub = get_or_create_limit(user.id)
    db.session.commit()
    return _ok({
        'subscription': sub.to_dict(),
        'quota': {
            'plan': limit.plan,
            'daily_used': limit.daily_used,
            'daily_limit': limit.daily_limit,
            'monthly_used': limit.monthly_used,
            'monthly_limit': limit.monthly_limit,
            'estimated_cost_usd': str(limit.estimated_cost_usd),
        }
    })


@jwt_required()
def update_my_subscription():
    """POST /api/wellness/subscription"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    body = request.get_json(silent=True) or {}
    plan = (body.get('plan') or 'free').lower()
    if plan not in PLAN_LIMITS:
        return _err('Invalid plan', 400, {'allowed': list(PLAN_LIMITS.keys())})

    sub = Subscription(
        user_id=user.id,
        org_id=body.get('org_id'),
        plan=plan,
        status='active',
        amount_paise=int(body.get('amount_paise', PLAN_LIMITS[plan]['price_paise'])),
        provider=body.get('provider', 'razorpay'),
        provider_subscription_id=body.get('provider_subscription_id'),
    )
    db.session.add(sub)
    db.session.commit()
    return _ok({'subscription': sub.to_dict()}, 'Subscription updated')


@jwt_required()
def get_ai_quota():
    """GET /api/wellness/ai/quota"""
    user = _current_user()
    if not user:
        return _err('User not found', 404)
    org_id = request.args.get('org_id', type=int)
    limit, sub = get_or_create_limit(user.id, org_id)
    db.session.commit()
    return _ok({
        'plan': sub.plan,
        'daily_used': limit.daily_used,
        'daily_limit': limit.daily_limit,
        'monthly_used': limit.monthly_used,
        'monthly_limit': limit.monthly_limit,
        'estimated_cost_usd': str(limit.estimated_cost_usd),
        'cache': cache_stats(),
    })


@jwt_required()
def admin_ai_usage():
    """GET /api/wellness/admin/ai-usage?days=30&org_id="""
    user = _current_user()
    if not user or user.role not in ('admin', 'organization'):
        return _err('Access denied', 403)

    days = min(int(request.args.get('days', 30)), 365)
    org_id = request.args.get('org_id', type=int)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    usage_q = AIUsageLog.query.filter(AIUsageLog.created_at >= since)
    token_q = TokenTracking.query.filter(TokenTracking.created_at >= since)
    if org_id:
        usage_q = usage_q.filter_by(org_id=org_id)
        token_q = token_q.filter_by(org_id=org_id)

    from sqlalchemy import func
    route_rows = (
        db.session.query(AIUsageLog.route, func.count(AIUsageLog.id))
        .filter(AIUsageLog.created_at >= since)
        .group_by(AIUsageLog.route)
    )
    if org_id:
        route_rows = route_rows.filter(AIUsageLog.org_id == org_id)

    token_row = (
        token_q.with_entities(
            func.coalesce(func.sum(TokenTracking.prompt_tokens), 0),
            func.coalesce(func.sum(TokenTracking.output_tokens), 0),
            func.coalesce(func.sum(TokenTracking.estimated_cost_usd), 0),
        ).first()
    )

    total_requests = usage_q.count()
    gemini_requests = usage_q.filter_by(route='gemini').count()
    cache_or_rule = usage_q.filter(AIUsageLog.route.in_(('cache', 'rule'))).count()
    avoided_pct = round(cache_or_rule / max(total_requests, 1) * 100, 1)

    return _ok({
        'period_days': days,
        'total_requests': total_requests,
        'gemini_requests': gemini_requests,
        'cache_or_rule_requests': cache_or_rule,
        'estimated_gemini_reduction_pct': avoided_pct,
        'route_breakdown': {route: count for route, count in route_rows.all()},
        'prompt_tokens': int(token_row[0] or 0),
        'output_tokens': int(token_row[1] or 0),
        'estimated_cost_usd': str(token_row[2] or 0),
        'active_users': usage_q.with_entities(AIUsageLog.user_id).distinct().count(),
        'cache': cache_stats(),
    })


# ═════════════════════════════════════════════════════════════════
#  PRIVATE HELPERS
# ═════════════════════════════════════════════════════════════════

def _make_slug(name: str) -> str:
    import re
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def _check_ai_quota(org_id: int) -> tuple[bool, str]:
    sub = TenantSubscription.query.filter_by(org_id=org_id).first()
    if not sub:
        return True, ''
    if sub.status not in ('active', 'trial'):
        return False, 'Subscription is not active. Please renew your plan.'
    if sub.ai_calls_used >= sub.ai_calls_limit:
        return False, f'Monthly AI quota ({sub.ai_calls_limit} calls) exceeded.'
    return True, ''


def _increment_ai_quota(org_id: int):
    try:
        sub = TenantSubscription.query.filter_by(org_id=org_id).first()
        if sub:
            sub.ai_calls_used += 1
            db.session.commit()
    except Exception as exc:
        logger.error(f'Failed to increment AI quota: {exc}')
