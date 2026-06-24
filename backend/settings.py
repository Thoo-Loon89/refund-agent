"""Runtime-tunable settings shared between the API layer and the agent.

Kept in its own module so both ``backend.main`` and ``backend.agent`` can read
it without a circular import (``main`` imports ``agent``, not the reverse). The
values are persisted through ``backend.store`` so a toggle survives a restart.
"""

_DEFAULTS = {"retries_enabled": True}
_settings = dict(_DEFAULTS)


def init(values: dict | None) -> None:
    """Load persisted settings on startup, keeping only known keys."""
    if values:
        _settings.update({k: values[k] for k in _DEFAULTS if k in values})


def get(key, default=None):
    return _settings.get(key, default)


def set(key, value) -> None:
    _settings[key] = value


def snapshot() -> dict:
    return dict(_settings)
