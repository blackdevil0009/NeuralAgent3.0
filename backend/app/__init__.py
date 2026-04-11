"""
app/__init__.py — Flask Application Factory (MySQL / SQLAlchemy Edition)
"""

import os
import logging
import logging.handlers

from flask      import Flask, jsonify
from flask_cors import CORS

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
    socketio.init_app(app, cors_allowed_origins='*')

    # ── CORS ──────────────────────────────────────────────────────
    CORS(
        app,
        resources={r'/api/*': {'origins': '*'}},
        supports_credentials=True,
        allow_headers=[
            'Content-Type', 'Authorization',
            'X-HMAC-Signature', 'X-Timestamp',
        ],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    )

    # ── Register Blueprints ───────────────────────────────────────
    from app.routes import auth_bp, user_bp, doctor_bp, utils_bp, appointment_bp, consultation_bp, chat_bp, v2_bp, messages_bp, reports_bp, payment_bp, ai_v2_bp
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
        from app.models.medical_report   import MedicalReport     # noqa: F401
        from app.models.payment_transaction import PaymentTransaction  # noqa: F401

        db.create_all()
        app.logger.info("✅ MySQL tables verified / created.")
    except Exception as exc:
        app.logger.error(f"❌ DB init failed: {exc}")


def _configure_logging(app: Flask):
    log_dir    = os.path.join(os.path.dirname(__file__), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    level      = logging.DEBUG if app.config.get('DEBUG') else logging.INFO
    fmt        = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    date_fmt   = '%Y-%m-%d %H:%M:%S'

    logging.basicConfig(level=level, format=fmt, datefmt=date_fmt)

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
