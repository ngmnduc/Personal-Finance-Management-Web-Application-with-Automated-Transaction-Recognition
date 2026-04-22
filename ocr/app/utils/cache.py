"""
In-memory MD5 cache for OCR results.
Prevents redundant LLM calls when the same file bytes are submitted more than once.
"""

import hashlib

# Module-level store: md5_hex -> extracted result dict
_cache: dict[str, dict] = {}


def _md5(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()


def get_cached(file_bytes: bytes) -> dict | None:
    """Return cached result for these bytes, or None if not cached."""
    return _cache.get(_md5(file_bytes))


def set_cache(file_bytes: bytes, result: dict) -> None:
    """Store result keyed by MD5 of the file bytes."""
    _cache[_md5(file_bytes)] = result


def cache_size() -> int:
    """Return the number of entries currently in the cache."""
    return len(_cache)
