"""
app/__init__.py — Flask Application Factory (MySQL / SQLAlchemy Edition)
"""

import os
import logging
import logging.handlers

from flask      import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import inspect, text

from app.config     import get_config
from app.extensions import db, migrate, jwt, mail, socketio


def create_app(config_class=None) -> Flask:
    """Create and fully configure the Flask application."""
    app = Flask(__name__, instance_relative_config=False)

    # ── Load configuration ────────────────────────────────────────
    cfg = config_class or get_config()
    app.config.from_object(cfg)

    # ── Logging ───────────────────────────────────────────────────
    _configure_logging(app)

    # ── Initialise extensions (order matters) ─────────────────────
    db.init_app(app)
    migrate.init_app(app, db)   # flask db init / migrate / upgrade
    jwt.init_app(app)
    mail.init_app(app)
    socketio.init_app(app, cors_allowed_origins=app.config.get('CORS_ORIGINS', '*'))

    # ── CORS ──────────────────────────────────────────────────────
    CORS(
        app,
        resources={r'/api/*': {'origins': app.config.get('CORS_ORIGINS', '*')}},
        supports_credentials=True,
    )

    # ── Register Blueprints ───────────────────────────────────────
    from app.routes import (auth_bp, user_bp, doctor_bp, utils_bp, appointment_bp, 
                            consultation_bp, chat_bp, v2_bp, messages_bp, reports_bp, 
                            payment_bp, ai_v2_bp, hospital_bp, hospital_emergency_bp)
    from app.routes.wellness_routes import wellness_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(doctor_bp)
    app.register_blueprint(utils_bp)
    app.register_blueprint(appointment_bp)
    app.register_blueprint(consultation_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(v2_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(payment_bp)
    app.register_blueprint(ai_v2_bp)
    app.register_blueprint(hospital_bp)
    app.register_blueprint(hospital_emergency_bp)
    app.register_blueprint(wellness_bp)

    # ── JWT error callbacks ───────────────────────────────────────
    _register_jwt_callbacks(jwt)

    # ── Global HTTP error handlers ────────────────────────────────
    _register_error_handlers(app)

    # ── Ensure upload directory exists ────────────────────────────
    base_upload = app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(base_upload, exist_ok=True)
    os.makedirs(os.path.join(base_upload, 'messages'), exist_ok=True)

    # ── Create DB tables (if they don't exist) ────────────────────
    with app.app_context():
        _init_db(app)

    # ── Socket.IO Handlers ────────────────────────────────────────
    from app.sockets import handlers # noqa: F401

    @app.after_request
    def deduplicate_cors(response):
        """Fix for 'multiple values' CORS error if proxy also sets headers."""
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Credentials',
            'Access-Control-Allow-Headers',
            'Access-Control-Allow-Methods',
            'Access-Control-Expose-Headers'
        ]
        for header in cors_headers:
            if header in response.headers:
                values = response.headers.getlist(header)
                # Check if we have multiple header entries or a single entry with commas
                combined = []
                for v in values:
                    combined.extend([s.strip() for s in v.split(',') if s.strip()])
                
                if combined:
                    # Deduplicate while preserving order
                    unique = list(dict.fromkeys(combined))
                    
                    # For Origin and Credentials, we MUST only have one value
                    if header in ('Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'):
                        response.headers[header] = unique[0]
                    else:
                        # For others, we can join them back
                        response.headers[header] = ', '.join(unique)
        return response

    app.logger.info("🌿 VaidyaMed-X app created. DB: MySQL.")
    return app


# ═════════════════════════════════════════════════════════════════
#  Private helpers
# ═════════════════════════════════════════════════════════════════

def _init_db(app: Flask):
    """Create all tables if they don't exist. Safe to run multiple times."""
    try:
        # Import models so SQLAlchemy knows about them
        from app.models.user              import User              # noqa: F401
        from app.models.otp              import Otp               # noqa: F401
        from app.models.password_reset   import PasswordReset     # noqa: F401
        from app.models.appointment      import Appointment       # noqa: F401
        from app.models.message          import Message           # noqa: F401
        from app.models.emergency        import Emergency         # noqa: F401
        from app.models.medical_report   import (                  # noqa: F401
            MedicalReport, ReportAnalysis, AIInsight, Prescription,
            FileStorageLog, Consultation, ConsultationNote
        )
        from app.models.payment_transaction import PaymentTransaction  # noqa: F401
        from app.models.hospital_invitation import HospitalInvitation  # noqa: F401
        # Wellness AI system models
        from app.models.wellness import (                          # noqa: F401
            AIConversation, AIFeedback, WellnessLog,
            WellnessScore, Reminder, Organization,
            TenantSubscription, AIAnalytics, Subscription,
            UserAILimit, AIUsageLog, TokenTracking,
            CachedResponse, EnterpriseClient, Invoice
        )

        db.create_all()
        _ensure_users_table_columns(app)
        _ensure_emergencies_table_columns(app)
        _ensure_medical_reports_table_columns(app)
        app.logger.info("✅ MySQL tables verified / created.")
    except Exception as exc:
        app.logger.error(f"❌ DB init failed: {exc}")


def _ensure_users_table_columns(app: Flask):
    """Ensure the users table contains columns required by the current model."""
    try:
        inspector = inspect(db.engine)
        if 'users' not in inspector.get_table_names():
            return

        existing_cols = {column['name'] for column in inspector.get_columns('users')}
        required_cols = {
            'admin_name':        'VARCHAR(150) NULL',
            'hospital_id':       'INT NULL',
            'hospital_type':     "ENUM('private','govt','clinic','ayurvedic') NULL",
            'is_verified':       'BOOLEAN NOT NULL DEFAULT FALSE',
            'verification_code': 'VARCHAR(10) NULL',
            'two_fa_enabled':    'BOOLEAN NOT NULL DEFAULT FALSE',
            'two_fa_secret':     "VARCHAR(64) NULL DEFAULT ''",
            'verification_status': "ENUM('pending','verified','rejected') NULL",
            'payout_verified':   'BOOLEAN NOT NULL DEFAULT FALSE',
            'upi_verify_requested': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'document_path':     'VARCHAR(300) NULL',
        }

        missing = [name for name in required_cols if name not in existing_cols]
        if missing:
            with db.engine.begin() as conn:
                for column_name in missing:
                    ddl_type = required_cols[column_name]
                    conn.execute(text(
                        f"ALTER TABLE users ADD COLUMN {column_name} {ddl_type}"
                    ))
            app.logger.info(
                f"✅ Added missing users table column(s): {', '.join(missing)}"
            )

        _sync_role_enum(app)
    except Exception as exc:
        app.logger.error(f"❌ Failed to sync users table schema: {exc}")


def _sync_role_enum(app: Flask):
    """Ensure the users.role enum includes organization."""
    try:
        with db.engine.begin() as conn:
            result = conn.execute(text(
                "SHOW COLUMNS FROM users WHERE Field='role'"
            ))
            row = result.first()
            if not row:
                return

            column_type = row[1] if len(row) > 1 else ''
            if 'organization' not in str(column_type):
                conn.execute(text(
                    "ALTER TABLE users MODIFY COLUMN role "
                    "ENUM('patient','doctor','admin','organization') "
                    "NOT NULL DEFAULT 'patient'"
                ))
                app.logger.info("✅ Updated users.role ENUM to include organization.")
    except Exception as exc:
        app.logger.error(f"❌ Failed to sync users.role enum: {exc}")


def _ensure_emergencies_table_columns(app: Flask):
    """Ensure the emergencies table contains columns required by the current model."""
    try:
        inspector = inspect(db.engine)
        if 'emergencies' not in inspector.get_table_names():
            return

        existing_cols = {column['name'] for column in inspector.get_columns('emergencies')}
        required_cols = {
            'patient_name': 'VARCHAR(150) NULL',
            'contact_name': 'VARCHAR(150) NULL',
            'location': 'VARCHAR(300) NULL',
            'provider_type': "VARCHAR(20) NULL DEFAULT 'hospital'",
            'provider_name': 'VARCHAR(200) NULL',
            'hospital_id': 'INT NULL',
            'assigned_at': 'DATETIME NULL',
            'resolved_at': 'DATETIME NULL',
        }

        missing = [name for name in required_cols if name not in existing_cols]
        if missing:
            with db.engine.begin() as conn:
                for column_name in missing:
                    ddl_type = required_cols[column_name]
                    conn.execute(text(
                        f"ALTER TABLE emergencies ADD COLUMN {column_name} {ddl_type}"
                    ))
            app.logger.info(
                f"✅ Added missing emergencies table column(s): {', '.join(missing)}"
            )
    except Exception as exc:
        app.logger.error(f"❌ Failed to sync emergencies table schema: {exc}")


def _ensure_medical_reports_table_columns(app: Flask):
    """Ensure existing report tables support the AI medical analysis module."""
    try:
        inspector = inspect(db.engine)
        if 'medical_reports' not in inspector.get_table_names():
            return

        existing_cols = {column['name'] for column in inspector.get_columns('medical_reports')}
        required_cols = {
            'report_type': "VARCHAR(50) NULL DEFAULT 'medical_report'",
            'storage_status': "VARCHAR(30) NOT NULL DEFAULT 'stored'",
            'is_encrypted': 'BOOLEAN NOT NULL DEFAULT FALSE',
            'storage_path': 'VARCHAR(500) NULL',
            'sha256_hash': 'VARCHAR(64) NULL',
            'extracted_text': 'LONGTEXT NULL',
            'abnormal_json': 'LONGTEXT NULL',
            'insights_json': 'LONGTEXT NULL',
            'risk_level': "VARCHAR(30) NULL DEFAULT 'unknown'",
        }

        missing = [name for name in required_cols if name not in existing_cols]
        if missing:
            with db.engine.begin() as conn:
                for column_name in missing:
                    conn.execute(text(
                        f"ALTER TABLE medical_reports ADD COLUMN {column_name} {required_cols[column_name]}"
                    ))
            app.logger.info(
                f"✅ Added missing medical_reports column(s): {', '.join(missing)}"
            )
    except Exception as exc:
        app.logger.error(f"❌ Failed to sync medical_reports schema: {exc}")


def _configure_logging(app: Flask):
    log_dir    = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    level      = logging.DEBUG if app.config.get('DEBUG') else logging.INFO
    fmt        = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    date_fmt   = '%Y-%m-%d %H:%M:%S'

    logging.basicConfig(level=level, format=fmt, datefmt=date_fmt)
    for noisy_logger in (
        'engineio',
        'engineio.server',
        'socketio',
        'geventwebsocket',
        'geventwebsocket.handler',
        'httpcore',
        'httpx',
        'google_genai',
    ):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)

    file_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'vaidyamed.log'),
        maxBytes=5 * 1024 * 1024, backupCount=5, encoding='utf-8',
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(logging.Formatter(fmt, date_fmt))
    logging.getLogger().addHandler(file_handler)
    app.logger.setLevel(level)


def _register_jwt_callbacks(jwt_manager):
    """Return clean JSON errors instead of Flask-JWT's default responses."""

    @jwt_manager.expired_token_loader
    def expired(_h, _p):
        return jsonify({'success': False,
                        'data':    {'message': 'Session expired. Please log in again.'},
                        'error':   'token_expired'}), 401

    @jwt_manager.invalid_token_loader
    def invalid(err):
        return jsonify({'success': False,
                        'data':    {'message': 'Invalid auth token.'},
                        'error':   'invalid_token'}), 401

    @jwt_manager.unauthorized_loader
    def missing(err):
        return jsonify({'success': False,
                        'data':    {'message': 'Authentication required.'},
                        'error':   'missing_token'}), 401

    @jwt_manager.revoked_token_loader
    def revoked(_h, _p):
        return jsonify({'success': False,
                        'data':    {'message': 'Token has been revoked. Log in again.'},
                        'error':   'token_revoked'}), 401


def _register_error_handlers(app: Flask):
    """Global error handlers that always return JSON."""

    def _json(code, msg):
        return jsonify({'success': False,
                        'data':    {'message': msg},
                        'error':   msg}), code

    @app.errorhandler(400)
    def bad_request(e):        return _json(400, 'Bad request.')

    @app.errorhandler(401)
    def unauthorized(e):       return _json(401, 'Unauthorized.')

    @app.errorhandler(403)
    def forbidden(e):          return _json(403, 'Forbidden.')

    @app.errorhandler(404)
    def not_found(e):          return _json(404, 'Resource not found.')

    @app.errorhandler(405)
    def method_not_allowed(e): return _json(405, 'Method not allowed.')

    @app.errorhandler(413)
    def too_large(e):
        return _json(413, 'File too large. Maximum size is 5 MB.')

    @app.errorhandler(422)
    def unprocessable(e):      return _json(422, 'Validation error.')

    @app.errorhandler(429)
    def rate_limited(e):       return _json(429, 'Too many requests.')

    @app.errorhandler(500)
    def server_error(e):
        app.logger.error(f'500: {e}', exc_info=True)
        return _json(500, 'Internal server error.')

    @app.errorhandler(Exception)
    def unhandled(e):
        app.logger.error(f'Unhandled: {e}', exc_info=True)
        return _json(500, 'An unexpected error occurred.')
