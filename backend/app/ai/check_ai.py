import logging
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AI-Diagnostic")


def check_env():
    logger.info("Python Version: %s", sys.version)
    components = {
        "google.genai": "Gemini API",
        "redis": "Redis cache client",
    }

    for lib, desc in components.items():
        try:
            __import__(lib)
            logger.info("%s (%s) is installed", lib, desc)
        except ImportError:
            logger.error("%s (%s) is missing", lib, desc)

    if os.getenv("GEMINI_API_KEY"):
        logger.info("GEMINI_API_KEY is configured server-side")
    else:
        logger.warning("GEMINI_API_KEY is not configured")

    logger.info("GEMINI_MODEL=%s", os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))
    logger.info("GEMINI_FALLBACK_MODELS=%s", os.getenv(
        "GEMINI_FALLBACK_MODELS",
        "gemini-2.5-flash,gemini-2.0-flash,gemini-2.5-flash-lite",
    ))
    logger.info("REDIS_URL configured=%s", bool(os.getenv("REDIS_URL")))


if __name__ == "__main__":
    print("\n--- VaidyaMedX AI Diagnostic Tool ---")
    check_env()
    print("------------------------------------")
