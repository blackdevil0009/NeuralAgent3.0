from cachetools import TTLCache, LRUCache
from .logger import logger

class AICache:
    def __init__(self, maxsize=100, ttl=3600):
        # Time-to-live cache for identical queries
        self.cache = TTLCache(maxsize=maxsize, ttl=ttl)

    def get(self, key):
        if key in self.cache:
            logger.info(f"Cache hit for query: {key[:50]}...")
            return self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = value

ai_cache = AICache()
