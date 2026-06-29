"""
app/models/wellness.py — Wellness AI System Models

Tables:
    ai_conversations    — Chat history between users and the AI
    ai_feedback         — Post-response feedback (rating, helpfulness, improvement)
    wellness_logs       — Daily wellness tracking (sleep, water, diet, exercise)
    wellness_scores     — Computed daily wellness score per user
    reminders           — Smart reminders (medicine, water, diet, sleep, exercise)
    organizations       — Multi-tenant organization / clinic / college / company
    tenant_subscriptions — SaaS subscription plan per organization
    ai_analytics        — Aggregated AI usage tracking per tenant
"""

from datetime import date, datetime, timezone
from app.extensions import db


PLAN_LIMITS = {
    "free": {"daily": 50, "monthly": 1500, "price_paise": 0},
    "pro": {"daily": 100, "monthly": 3000, "price_paise": 9900},
    "premium": {"daily": 300, "monthly": 9000, "price_paise": 49900},
    "enterprise": {"daily": 2000, "monthly": 60000, "price_paise": 0},
}


class Subscription(db.Model):
    __tablename__ = "subscriptions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"),
                       nullable=True, index=True)
    plan = db.Column(db.Enum("free", "pro", "premium", "enterprise",
                             name="user_subscription_plan"),
                     nullable=False, default="free", index=True)
    status = db.Column(db.Enum("active", "trial", "past_due", "cancelled", "expired",
                               name="user_subscription_status"),
                       nullable=False, default="active", index=True)
    amount_paise = db.Column(db.Integer, nullable=False, default=0)
    provider = db.Column(db.String(50), nullable=True, default="razorpay")
    provider_subscription_id = db.Column(db.String(120), nullable=True)
    started_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    renews_at = db.Column(db.DateTime(timezone=True), nullable=True)
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        limits = PLAN_LIMITS.get(self.plan, PLAN_LIMITS["free"])
        return {
            "id": self.id,
            "user_id": self.user_id,
            "org_id": self.org_id,
            "plan": self.plan,
            "status": self.status,
            "daily_ai_limit": limits["daily"],
            "monthly_ai_limit": limits["monthly"],
            "amount_paise": self.amount_paise,
            "renews_at": self.renews_at.isoformat() if self.renews_at else None,
        }


class UserAILimit(db.Model):
    __tablename__ = "user_ai_limits"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"),
                       nullable=True, index=True)
    usage_date = db.Column(db.Date, nullable=False, default=date.today, index=True)
    month_key = db.Column(db.String(7), nullable=False, index=True)
    plan = db.Column(db.String(30), nullable=False, default="free")
    daily_limit = db.Column(db.Integer, nullable=False, default=50)
    monthly_limit = db.Column(db.Integer, nullable=False, default=1500)
    daily_used = db.Column(db.Integer, nullable=False, default=0)
    monthly_used = db.Column(db.Integer, nullable=False, default=0)
    estimated_cost_usd = db.Column(db.Numeric(10, 6), nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("user_id", "usage_date", "month_key",
                            name="uq_user_ai_limit_day_month"),
    )


class AIUsageLog(db.Model):
    __tablename__ = "ai_usage_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
                        nullable=True, index=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"),
                       nullable=True, index=True)
    subscription_plan = db.Column(db.String(30), nullable=False, default="free", index=True)
    session_id = db.Column(db.String(64), nullable=True, index=True)
    request_hash = db.Column(db.String(64), nullable=False, index=True)
    route = db.Column(db.Enum("cache", "rule", "gemini", "blocked",
                              name="ai_route_enum"),
                      nullable=False, default="gemini", index=True)
    model_used = db.Column(db.String(80), nullable=True)
    prompt_chars = db.Column(db.Integer, nullable=False, default=0)
    response_chars = db.Column(db.Integer, nullable=False, default=0)
    latency_ms = db.Column(db.Integer, nullable=False, default=0)
    estimated_cost_usd = db.Column(db.Numeric(10, 6), nullable=False, default=0)
    status = db.Column(db.String(30), nullable=False, default="success")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)


class TokenTracking(db.Model):
    __tablename__ = "token_tracking"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    usage_log_id = db.Column(db.Integer, db.ForeignKey("ai_usage_logs.id", ondelete="CASCADE"),
                             nullable=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
                        nullable=True, index=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"),
                       nullable=True, index=True)
    model_used = db.Column(db.String(80), nullable=False, default="none", index=True)
    prompt_tokens = db.Column(db.Integer, nullable=False, default=0)
    output_tokens = db.Column(db.Integer, nullable=False, default=0)
    total_tokens = db.Column(db.Integer, nullable=False, default=0)
    estimated_cost_usd = db.Column(db.Numeric(10, 6), nullable=False, default=0)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)


class CachedResponse(db.Model):
    __tablename__ = "cached_responses"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    query_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    normalized_query = db.Column(db.String(500), nullable=False)
    response = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=True, index=True)
    source = db.Column(db.Enum("rule", "gemini", "admin", name="cached_response_source"),
                       nullable=False, default="gemini")
    hit_count = db.Column(db.Integer, nullable=False, default=0)
    estimated_savings_usd = db.Column(db.Numeric(10, 6), nullable=False, default=0)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))


# ─────────────────────────────────────────────────────────────────
#  AI CONVERSATION
# ─────────────────────────────────────────────────────────────────

class AIConversation(db.Model):
    __tablename__ = 'ai_conversations'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                              nullable=False, index=True)
    session_id    = db.Column(db.String(64), nullable=False, index=True)   # group messages into one chat session
    org_id        = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='SET NULL'),
                              nullable=True, index=True)                    # multi-tenant

    # Message content
    role          = db.Column(db.Enum('user', 'assistant', name='conv_role'),
                              nullable=False, default='user')
    message       = db.Column(db.Text, nullable=False)

    # RAG metadata
    rag_context   = db.Column(db.Text, nullable=True)                      # retrieved chunks
    matched_condition = db.Column(db.String(200), nullable=True)
    confidence    = db.Column(db.Float, nullable=True)

    # Tokens / cost tracking
    prompt_tokens = db.Column(db.Integer, nullable=True, default=0)
    output_tokens = db.Column(db.Integer, nullable=True, default=0)
    model_used    = db.Column(db.String(50), nullable=True, default='gemini-1.5-flash')

    created_at    = db.Column(db.DateTime(timezone=True), nullable=False,
                              default=lambda: datetime.now(timezone.utc))

    # Relationships
    feedback      = db.relationship('AIFeedback', backref='conversation',
                                    cascade='all, delete-orphan', uselist=False)

    def to_dict(self):
        return {
            'id':                self.id,
            'session_id':        self.session_id,
            'role':              self.role,
            'message':           self.message,
            'matched_condition': self.matched_condition,
            'confidence':        self.confidence,
            'model_used':        self.model_used,
            'created_at':        self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────────
#  AI FEEDBACK & RATINGS
# ─────────────────────────────────────────────────────────────────

class AIFeedback(db.Model):
    __tablename__ = 'ai_feedback'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    conversation_id = db.Column(db.Integer,
                                db.ForeignKey('ai_conversations.id', ondelete='CASCADE'),
                                nullable=False, index=True, unique=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)

    # Core feedback dimensions
    rating          = db.Column(db.Integer, nullable=True)              # 1–5 stars
    was_helpful     = db.Column(db.Boolean, nullable=True)              # thumbs up/down
    noticed_improvement = db.Column(db.Boolean, nullable=True)         # improvement checkbox
    comment         = db.Column(db.String(500), nullable=True)         # optional free-text

    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':                   self.id,
            'conversation_id':      self.conversation_id,
            'rating':               self.rating,
            'was_helpful':          self.was_helpful,
            'noticed_improvement':  self.noticed_improvement,
            'comment':              self.comment,
            'created_at':           self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────────
#  WELLNESS DAILY LOG
# ─────────────────────────────────────────────────────────────────

class WellnessLog(db.Model):
    __tablename__ = 'wellness_logs'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)
    log_date        = db.Column(db.Date, nullable=False, index=True)

    # Quantitative metrics
    sleep_hours     = db.Column(db.Float, nullable=True)                # hours slept
    water_ml        = db.Column(db.Integer, nullable=True, default=0)  # total ml consumed
    steps           = db.Column(db.Integer, nullable=True, default=0)  # step count
    exercise_min    = db.Column(db.Integer, nullable=True, default=0)  # minutes of exercise
    stress_level    = db.Column(db.Integer, nullable=True)             # 1–10 scale
    mood            = db.Column(db.Enum('excellent', 'good', 'neutral', 'poor', 'bad',
                                        name='mood_enum'), nullable=True)

    # Dietary
    meals_logged    = db.Column(db.Integer, nullable=True, default=0)
    diet_quality    = db.Column(db.Enum('excellent', 'good', 'fair', 'poor',
                                        name='diet_quality_enum'), nullable=True)
    diet_notes      = db.Column(db.String(500), nullable=True)

    # Medicine adherence
    medicines_taken = db.Column(db.Boolean, nullable=True, default=False)

    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc))
    updated_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc),
                                onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':             self.id,
            'log_date':       self.log_date.isoformat() if self.log_date else None,
            'sleep_hours':    self.sleep_hours,
            'water_ml':       self.water_ml,
            'steps':          self.steps,
            'exercise_min':   self.exercise_min,
            'stress_level':   self.stress_level,
            'mood':           self.mood,
            'meals_logged':   self.meals_logged,
            'diet_quality':   self.diet_quality,
            'diet_notes':     self.diet_notes,
            'medicines_taken': self.medicines_taken,
        }


# ─────────────────────────────────────────────────────────────────
#  WELLNESS SCORE (computed daily)
# ─────────────────────────────────────────────────────────────────

class WellnessScore(db.Model):
    __tablename__ = 'wellness_scores'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)
    score_date      = db.Column(db.Date, nullable=False, index=True)
    score           = db.Column(db.Float, nullable=False, default=0.0)  # 0–100
    breakdown       = db.Column(db.Text, nullable=True)                 # JSON breakdown
    ai_recommendations = db.Column(db.Text, nullable=True)             # AI-generated tips
    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'score_date', name='uq_user_score_date'),
    )

    def to_dict(self):
        import json
        return {
            'id':                  self.id,
            'score_date':          self.score_date.isoformat() if self.score_date else None,
            'score':               self.score,
            'breakdown':           json.loads(self.breakdown) if self.breakdown else {},
            'ai_recommendations':  self.ai_recommendations,
        }


# ─────────────────────────────────────────────────────────────────
#  REMINDERS
# ─────────────────────────────────────────────────────────────────

class Reminder(db.Model):
    __tablename__ = 'reminders'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'),
                                nullable=False, index=True)

    title           = db.Column(db.String(200), nullable=False)
    description     = db.Column(db.String(500), nullable=True)
    reminder_type   = db.Column(
        db.Enum('medicine', 'water', 'diet', 'sleep', 'exercise', 'custom',
                name='reminder_type_enum'),
        nullable=False, default='custom'
    )

    # Scheduling
    remind_at       = db.Column(db.Time, nullable=False)               # daily trigger time
    start_date      = db.Column(db.Date, nullable=True)
    end_date        = db.Column(db.Date, nullable=True)
    repeat          = db.Column(
        db.Enum('once', 'daily', 'weekly', 'monthly', name='repeat_enum'),
        nullable=False, default='daily'
    )
    days_of_week    = db.Column(db.String(20), nullable=True)          # e.g. "Mon,Wed,Fri"

    is_active       = db.Column(db.Boolean, nullable=False, default=True)
    last_triggered  = db.Column(db.DateTime(timezone=True), nullable=True)

    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':            self.id,
            'title':         self.title,
            'description':   self.description,
            'type':          self.reminder_type,
            'remind_at':     self.remind_at.strftime('%H:%M') if self.remind_at else None,
            'start_date':    self.start_date.isoformat() if self.start_date else None,
            'end_date':      self.end_date.isoformat() if self.end_date else None,
            'repeat':        self.repeat,
            'days_of_week':  self.days_of_week,
            'is_active':     self.is_active,
            'last_triggered': self.last_triggered.isoformat() if self.last_triggered else None,
        }


# ─────────────────────────────────────────────────────────────────
#  ORGANIZATIONS (Multi-Tenant)
# ─────────────────────────────────────────────────────────────────

class Organization(db.Model):
    __tablename__ = 'organizations'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name            = db.Column(db.String(200), nullable=False)
    slug            = db.Column(db.String(100), nullable=False, unique=True, index=True)
    org_type        = db.Column(
        db.Enum('clinic', 'wellness_center', 'college', 'company', 'hospital', 'other',
                name='org_type_enum'),
        nullable=False, default='clinic'
    )
    owner_user_id   = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'),
                                nullable=True)

    # Contact
    email           = db.Column(db.String(255), nullable=True)
    phone           = db.Column(db.String(20), nullable=True)
    address         = db.Column(db.String(300), nullable=True)
    city            = db.Column(db.String(100), nullable=True)
    state           = db.Column(db.String(100), nullable=True)

    # Branding
    logo_url        = db.Column(db.String(300), nullable=True)
    primary_color   = db.Column(db.String(10), nullable=True, default='#1A6B4A')

    # Settings
    is_active       = db.Column(db.Boolean, nullable=False, default=True)
    ai_enabled      = db.Column(db.Boolean, nullable=False, default=True)
    max_users       = db.Column(db.Integer, nullable=False, default=50)

    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc))

    # Relationships
    subscription    = db.relationship('TenantSubscription', backref='organization',
                                      cascade='all, delete-orphan', uselist=False)
    analytics       = db.relationship('AIAnalytics', backref='organization',
                                      cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':           self.id,
            'name':         self.name,
            'slug':         self.slug,
            'type':         self.org_type,
            'email':        self.email,
            'phone':        self.phone,
            'address':      self.address,
            'city':         self.city,
            'state':        self.state,
            'logo_url':     self.logo_url,
            'is_active':    self.is_active,
            'ai_enabled':   self.ai_enabled,
            'max_users':    self.max_users,
            'created_at':   self.created_at.isoformat() if self.created_at else None,
        }


# ─────────────────────────────────────────────────────────────────
#  TENANT SUBSCRIPTION (SaaS Plans)
# ─────────────────────────────────────────────────────────────────

class TenantSubscription(db.Model):
    __tablename__ = 'tenant_subscriptions'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    org_id          = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='CASCADE'),
                                nullable=False, unique=True, index=True)

    plan            = db.Column(
        db.Enum('free', 'starter', 'professional', 'enterprise', name='plan_enum'),
        nullable=False, default='free'
    )
    status          = db.Column(
        db.Enum('active', 'trial', 'expired', 'cancelled', name='sub_status_enum'),
        nullable=False, default='trial'
    )

    # Quotas
    ai_calls_limit  = db.Column(db.Integer, nullable=False, default=100)   # per month
    ai_calls_used   = db.Column(db.Integer, nullable=False, default=0)

    # Dates
    trial_ends_at   = db.Column(db.DateTime(timezone=True), nullable=True)
    renews_at       = db.Column(db.DateTime(timezone=True), nullable=True)
    cancelled_at    = db.Column(db.DateTime(timezone=True), nullable=True)

    # Payment
    razorpay_sub_id = db.Column(db.String(100), nullable=True)
    amount_paise    = db.Column(db.Integer, nullable=True)              # in paise

    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'plan':           self.plan,
            'status':         self.status,
            'ai_calls_limit': self.ai_calls_limit,
            'ai_calls_used':  self.ai_calls_used,
            'trial_ends_at':  self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            'renews_at':      self.renews_at.isoformat() if self.renews_at else None,
        }


# ─────────────────────────────────────────────────────────────────
#  AI ANALYTICS
# ─────────────────────────────────────────────────────────────────

class AIAnalytics(db.Model):
    __tablename__ = 'ai_analytics'

    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    org_id          = db.Column(db.Integer, db.ForeignKey('organizations.id', ondelete='CASCADE'),
                                nullable=True, index=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'),
                                nullable=True, index=True)

    event_type      = db.Column(db.String(50), nullable=False, index=True)
    # e.g. 'ai_query', 'feedback_submitted', 'reminder_triggered',
    #       'wellness_score_computed', 'rag_search'

    event_data      = db.Column(db.Text, nullable=True)               # JSON payload
    session_id      = db.Column(db.String(64), nullable=True)

    created_at      = db.Column(db.DateTime(timezone=True), nullable=False,
                                default=lambda: datetime.now(timezone.utc),
                                index=True)


class EnterpriseClient(db.Model):
    __tablename__ = "enterprise_clients"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="CASCADE"),
                       nullable=False, unique=True, index=True)
    account_owner_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
                                      nullable=True)
    contract_status = db.Column(db.Enum("lead", "trial", "active", "paused", "cancelled",
                                        name="enterprise_contract_status"),
                                nullable=False, default="lead", index=True)
    seats_purchased = db.Column(db.Integer, nullable=False, default=50)
    monthly_ai_quota = db.Column(db.Integer, nullable=False, default=50000)
    contract_value_paise = db.Column(db.Integer, nullable=False, default=0)
    billing_email = db.Column(db.String(255), nullable=True)
    starts_at = db.Column(db.DateTime(timezone=True), nullable=True)
    renews_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "org_id": self.org_id,
            "contract_status": self.contract_status,
            "seats_purchased": self.seats_purchased,
            "monthly_ai_quota": self.monthly_ai_quota,
            "contract_value_paise": self.contract_value_paise,
            "billing_email": self.billing_email,
            "renews_at": self.renews_at.isoformat() if self.renews_at else None,
        }


class Invoice(db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
                        nullable=True, index=True)
    org_id = db.Column(db.Integer, db.ForeignKey("organizations.id", ondelete="SET NULL"),
                       nullable=True, index=True)
    subscription_id = db.Column(db.Integer, db.ForeignKey("subscriptions.id", ondelete="SET NULL"),
                                nullable=True, index=True)
    invoice_number = db.Column(db.String(60), nullable=False, unique=True, index=True)
    status = db.Column(db.Enum("draft", "issued", "paid", "failed", "refunded",
                               name="invoice_status"),
                       nullable=False, default="issued", index=True)
    amount_paise = db.Column(db.Integer, nullable=False, default=0)
    tax_paise = db.Column(db.Integer, nullable=False, default=0)
    total_paise = db.Column(db.Integer, nullable=False, default=0)
    currency = db.Column(db.String(10), nullable=False, default="INR")
    provider_payment_id = db.Column(db.String(120), nullable=True)
    due_at = db.Column(db.DateTime(timezone=True), nullable=True)
    paid_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False,
                           default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "status": self.status,
            "amount_paise": self.amount_paise,
            "tax_paise": self.tax_paise,
            "total_paise": self.total_paise,
            "currency": self.currency,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
