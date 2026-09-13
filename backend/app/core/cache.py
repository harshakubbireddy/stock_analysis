"""Persistent SQLite-backed response cache.

Replaces the in-memory dict caches that were lost on every restart.
All services share this single SQLite database file (default: backend/data/app.db).

Usage in a service::

    from app.core.cache import cached_model

    def get_market_overview() -> MarketOverviewResponse:
        key = "market:overview"
        hit = cached_model(key, MarketOverviewResponse, ttl=300)
        if hit is not None:
            return hit
        result = _expensive_fetch()
        store_model(key, result)
        return result

For non-Pydantic data (raw dicts/lists) use ``get_raw`` / ``set_raw``.
"""

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Type, TypeVar

from pydantic import BaseModel

from app.core.config import settings

T = TypeVar("T", bound=BaseModel)

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def _get_conn() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        Path(settings.CACHE_DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(settings.CACHE_DB_PATH, check_same_thread=False)
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS response_cache (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                created_at REAL NOT NULL
            )
            """
        )
        _conn.commit()
    return _conn


def _is_fresh(created_at: float, ttl: int | None) -> bool:
    if ttl is None:
        return True
    return (time.time() - created_at) < ttl


def get_raw(key: str, ttl: int | None = None) -> Any | None:
    """Return the deserialised JSON value for *key*, or ``None`` if missing/stale."""
    with _lock:
        row = _get_conn().execute(
            "SELECT value, created_at FROM response_cache WHERE key = ?", (key,)
        ).fetchone()
    if row is None:
        return None
    value, created_at = row
    if not _is_fresh(created_at, ttl):
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return None


def set_raw(key: str, value: Any) -> None:
    """Serialise *value* as JSON and persist it under *key*."""
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO response_cache (key, value, created_at) "
            "VALUES (?, ?, ?)",
            (key, json.dumps(value, default=str), time.time()),
        )
        conn.commit()


def get_cached(key: str, ttl: int | None = None) -> str | None:
    """Return the raw JSON string for *key*, or ``None`` if missing/stale."""
    with _lock:
        row = _get_conn().execute(
            "SELECT value, created_at FROM response_cache WHERE key = ?", (key,)
        ).fetchone()
    if row is None:
        return None
    value, created_at = row
    if not _is_fresh(created_at, ttl):
        return None
    return value


def set_cached(key: str, value: str) -> None:
    """Persist a raw JSON string under *key*."""
    with _lock:
        conn = _get_conn()
        conn.execute(
            "INSERT OR REPLACE INTO response_cache (key, value, created_at) "
            "VALUES (?, ?, ?)",
            (key, value, time.time()),
        )
        conn.commit()


def cached_model(key: str, model: Type[T], ttl: int | None = None) -> T | None:
    """Return a deserialised Pydantic model for *key*, or ``None`` if missing/stale."""
    raw = get_cached(key, ttl)
    if raw is None:
        return None
    try:
        return model.model_validate_json(raw)
    except Exception:
        return None


def store_model(key: str, model: BaseModel) -> None:
    """Serialise a Pydantic model and persist it under *key*."""
    set_cached(key, model.model_dump_json())


def clear_all() -> int:
    """Delete every cached row. Returns the number of rows removed."""
    with _lock:
        cur = _get_conn().execute("DELETE FROM response_cache")
        _get_conn().commit()
        return cur.rowcount
