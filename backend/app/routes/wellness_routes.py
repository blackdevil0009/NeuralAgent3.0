"""
app/routes/wellness_routes.py — Wellness Blueprint

All routes are prefixed with /api/wellness
"""

from flask import Blueprint
from app.controllers.wellness_controller import (
    # Chat
    wellness_chat,
    wellness_chat_stream,
    wellness_chat_sessions,
    wellness_chat_history,
    # Feedback
    submit_feedback,
    get_feedback,
    # Wellness log
    log_wellness,
    get_wellness_log_today,
    get_wellness_log_history,
    # Score
    get_wellness_score,
    get_wellness_score_history,
    # Reminders
    create_reminder,
    list_reminders,
    update_reminder,
    delete_reminder,
    # Organizations
    create_organization,
    list_organizations,
    get_organization,
    update_organization,
    # Admin
    admin_analytics,
    admin_feedback_list,
    admin_ai_usage,
    get_ai_quota,
    get_my_subscription,
    update_my_subscription,
)

wellness_bp = Blueprint('wellness', __name__, url_prefix='/api/wellness')

# ── AI Chat ───────────────────────────────────────────────────────
wellness_bp.add_url_rule('/chat',          view_func=wellness_chat,          methods=['POST'])
wellness_bp.add_url_rule('/chat/stream',   view_func=wellness_chat_stream,   methods=['POST'])
wellness_bp.add_url_rule('/chat/sessions', view_func=wellness_chat_sessions, methods=['GET'])
wellness_bp.add_url_rule('/chat/history',  view_func=wellness_chat_history,  methods=['GET'])

# ── Feedback ─────────────────────────────────────────────────────
wellness_bp.add_url_rule('/feedback',       view_func=submit_feedback, methods=['POST'])
wellness_bp.add_url_rule('/feedback/<int:conversation_id>',
                          view_func=get_feedback, methods=['GET'])

# ── Daily Wellness Log ────────────────────────────────────────────
wellness_bp.add_url_rule('/log',          view_func=log_wellness,             methods=['POST'])
wellness_bp.add_url_rule('/log/today',    view_func=get_wellness_log_today,   methods=['GET'])
wellness_bp.add_url_rule('/log/history',  view_func=get_wellness_log_history, methods=['GET'])

# ── Wellness Score ────────────────────────────────────────────────
wellness_bp.add_url_rule('/score',         view_func=get_wellness_score,         methods=['GET'])
wellness_bp.add_url_rule('/score/history', view_func=get_wellness_score_history, methods=['GET'])

# ── Reminders ────────────────────────────────────────────────────
wellness_bp.add_url_rule('/reminders',          view_func=create_reminder, methods=['POST'])
wellness_bp.add_url_rule('/reminders',          view_func=list_reminders,  methods=['GET'])
wellness_bp.add_url_rule('/reminders/<int:reminder_id>',
                          view_func=update_reminder, methods=['PUT'])
wellness_bp.add_url_rule('/reminders/<int:reminder_id>',
                          view_func=delete_reminder, methods=['DELETE'])

# ── Organizations (SaaS Multi-Tenant) ────────────────────────────
wellness_bp.add_url_rule('/orgs',          view_func=create_organization, methods=['POST'])
wellness_bp.add_url_rule('/orgs',          view_func=list_organizations,  methods=['GET'])
wellness_bp.add_url_rule('/orgs/<int:org_id>',
                          view_func=get_organization,  methods=['GET'])
wellness_bp.add_url_rule('/orgs/<int:org_id>',
                          view_func=update_organization, methods=['PUT'])

# ── Admin Analytics ───────────────────────────────────────────────
wellness_bp.add_url_rule('/admin/analytics', view_func=admin_analytics,     methods=['GET'])
wellness_bp.add_url_rule('/admin/feedback',  view_func=admin_feedback_list, methods=['GET'])
wellness_bp.add_url_rule('/admin/ai-usage',  view_func=admin_ai_usage,      methods=['GET'])

# SaaS subscription + user quota
wellness_bp.add_url_rule('/subscription', view_func=get_my_subscription,    methods=['GET'])
wellness_bp.add_url_rule('/subscription', view_func=update_my_subscription, methods=['POST'])
wellness_bp.add_url_rule('/ai/quota',     view_func=get_ai_quota,           methods=['GET'])
