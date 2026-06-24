import hashlib
import hmac
import secrets

DEFAULT_ADMIN_PASSWORD = "password123!@#"
MIN_PASSWORD_LENGTH = 8

_PBKDF2_ROUNDS = 200_000
_HASH_NAME = "sha256"


def hash_password(password: str, salt: str | None = None) -> dict:
    if salt is None:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        _HASH_NAME, password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ROUNDS
    )
    return {"hash": dk.hex(), "salt": salt}


def verify_password(password: str, record: dict | None) -> bool:
    if not record or "hash" not in record or "salt" not in record:
        return False
    candidate = hash_password(password, record["salt"])["hash"]
    return hmac.compare_digest(candidate, record["hash"])


def default_auth_record() -> dict:
    return hash_password(DEFAULT_ADMIN_PASSWORD)


def new_token() -> str:
    return secrets.token_urlsafe(32)
