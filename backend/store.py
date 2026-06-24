import json
import os
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORE_PATH = os.environ.get(
    "REFUND_STORE_PATH", os.path.join(BASE_DIR, "data", "runtime_store.json")
)

_lock = threading.Lock()


def _empty() -> dict:
    return {"logs": [], "traces": {}, "attack_logs": [], "counter": 0,
            "admin_auth": None}


def load_store() -> dict:
    if not os.path.exists(STORE_PATH):
        return _empty()
    try:
        with open(STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError, ValueError):
        return _empty()
    base = _empty()
    if isinstance(data, dict):
        base.update({k: data[k] for k in base if k in data})
    return base


def save_store(state: dict) -> None:
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
    tmp_path = f"{STORE_PATH}.tmp"
    with _lock:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, STORE_PATH)
