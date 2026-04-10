"""
app/config/settings.py — Centralised Configuration (MySQL Edition)
All settings are sourced from environment variables via .env
"""

import os
from datetime import timedelta
from dotenv import load_dotenv
import urllib.parse

# Load .env from the project backend root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'), override=True)


class BaseConfig:
    # ── Flask Core ─────────────────────────────────────────────
    SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-secret-key')
    DEBUG      = False
    TESTING    = False

    # ── MySQL / SQLAlchemy ──────────────────────────────────────
    _db_host   = os.getenv('DB_HOST',     'localhost')
    _db_port   = os.getenv('DB_PORT',     '3306')
    _db_name   = os.getenv('DB_NAME',     'vaidyamed_x')
    _db_user   = os.getenv('DB_USER',     'root')
    _db_pass   = os.getenv('DB_PASSWORD', '')

    _encoded_user = urllib.parse.quote_plus(_db_user)
    _encoded_pass = urllib.parse.quote_plus(_db_pass)

    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{_encoded_user}:{_encoded_pass}"
        f"@{_db_host}:{_db_port}/{_db_name}"
        f"?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping':    True,    # detect stale connections
        'pool_recycle':     300,     # recycle every 5 min
        'pool_size':        10,
        'max_overflow':     20,
        'connect_args': {
            'connect_timeout': 10,
        },
    }

    # ── JWT ────────────────────────────────────────────────────
    JWT_SECRET_KEY           = os.getenv('JWT_SECRET_KEY', 'fallback-jwt-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_MINUTES', 60))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 30))
    )
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME    = 'Authorization'
    JWT_HEADER_TYPE    = 'Bearer'

    # ── Flask-Mail ─────────────────────────────────────────────
    MAIL_SERVER         = os.getenv('MAIL_SERVER',  'smtp.gmail.com')
    MAIL_PORT           = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS        = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL        = False
    MAIL_USERNAME       = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD       = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv(
        'MAIL_DEFAULT_SENDER', 'VaidyaMed-X <noreply@vaidyamed.com>'
    )

    # ── File Uploads ───────────────────────────────────────────
    UPLOAD_FOLDER      = os.path.join(
        os.path.dirname(__file__), '..', '..',
        os.getenv('UPLOAD_FOLDER', 'uploads')
    )
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH_MB', 5)) * 1024 * 1024
    ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}

    # ── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

    # ── App-Level ──────────────────────────────────────────────
    FRONTEND_URL        = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    OTP_EXPIRY_MINUTES  = int(os.getenv('OTP_EXPIRY_MINUTES', 10))
    OTP_RESEND_COOLDOWN = int(os.getenv('OTP_RESEND_COOLDOWN_SECONDS', 60))
    BCRYPT_LOG_ROUNDS   = int(os.getenv('BCRYPT_LOG_ROUNDS', 12))


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    _db_name_test = os.getenv('DB_NAME', 'vaidyamed_x') + '_test'
    _test_encoded_user = urllib.parse.quote_plus(os.getenv('DB_USER','root'))
    _test_encoded_pass = urllib.parse.quote_plus(os.getenv('DB_PASSWORD',''))
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://"
        f"{_test_encoded_user}:{_test_encoded_pass}"
        f"@{os.getenv('DB_HOST','localhost')}:{os.getenv('DB_PORT','3306')}"
        f"/{_db_name_test}?charset=utf8mb4"
    )


_config_map = {
    'development': DevelopmentConfig,
    'production':  ProductionConfig,
    'testing':     TestingConfig,
}


def get_config():
    env = os.getenv('FLASK_ENV', 'development')
    return _config_map.get(env, DevelopmentConfig)
# trigger reload
