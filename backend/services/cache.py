"""
cache.py - Simple in-memory cache with TTL
"""
import time
from typing import Any, Optional

_store: dict = {}

def get(key: str) -> Optional[Any]:
    item = _store.get(key)
    if not item:
        return None
    if item["expires"] < time.time():
        del _store[key]
        return None
    return item["value"]

def set(key: str, value: Any, ttl_seconds: int = 900):
    _store[key] = {
        "value": value,
        "expires": time.time() + ttl_seconds,
    }

def invalidate(key: str):
    _store.pop(key, None)

def invalidate_all():
    _store.clear()
