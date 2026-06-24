from collections import Counter
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import auth, settings
from backend.agent import refund_agent
from backend.store import load_store, save_store
from backend.tools import _load_customers

app = FastAPI(title="AI Refund Agent", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_state = load_store()
logs = _state["logs"]
traces = _state["traces"]
attack_logs = _state["attack_logs"]
_counter = {"n": _state["counter"]}

_admin = {"auth": _state.get("admin_auth") or auth.default_auth_record()}
_admin_tokens: set[str] = set()

settings.init(_state.get("settings"))


def _persist() -> None:
    """Mirror the current in-memory stores to disk."""
    save_store({
        "logs": logs,
        "traces": traces,
        "attack_logs": attack_logs,
        "counter": _counter["n"],
        "admin_auth": _admin["auth"],
        "settings": settings.snapshot(),
    })


if not _state.get("admin_auth"):
    _persist()


def require_admin(authorization: str = Header(default="")) -> str:
    """FastAPI dependency: require a valid 'Authorization: Bearer <token>' header."""
    token = ""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
    if not token or token not in _admin_tokens:
        raise HTTPException(status_code=401, detail="Admin authentication required.")
    return token


class Turn(BaseModel):
    role: str = Field(..., examples=["user"])
    content: str


class RefundRequest(BaseModel):
    customer_id: str = Field(..., examples=["C001"])
    messages: list[Turn] | None = None
    message: str | None = Field(default=None, examples=["I want to refund my Nike shoes"])
    order_id: str | None = Field(default=None, examples=["O1001"])

    def history(self) -> list[dict]:
        if self.messages:
            return [{"role": t.role, "content": t.content} for t in self.messages]
        if self.message:
            return [{"role": "user", "content": self.message}]
        return []


def _next_id() -> str:
    _counter["n"] += 1
    return f"REQ{_counter['n']:04d}"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/customers")
def customers():
    return [
        {"customer_id": c["customer_id"], "name": c["name"]}
        for c in _load_customers()
    ]


@app.get("/customers/{customer_id}/orders")
def customer_orders(customer_id: str):
    for c in _load_customers():
        if c["customer_id"] == customer_id:
            return c["orders"]
    raise HTTPException(status_code=404, detail=f"No customer {customer_id}")


@app.post("/refund")
def refund(req: RefundRequest):
    history = req.history()
    if not history:
        raise HTTPException(status_code=422, detail="Provide 'messages' or 'message'.")

    result = refund_agent(req.customer_id, history, order_id=req.order_id)

    request_id = _next_id()
    timestamp = datetime.now(timezone.utc).isoformat()
    trace = result["trace"]
    trace["request_id"] = request_id
    trace["timestamp"] = timestamp
    latest = trace.get("message", "")

    decision = result.get("decision", "NEEDS_INFO")

    log_entry = {
        "request_id": request_id,
        "timestamp": timestamp,
        "customer_id": req.customer_id,
        "message": latest,
        "decision": decision,
        "order_id": result.get("order_id"),
        "rule": result.get("rule"),
        "claimed_condition": result.get("claimed_condition"),
        "condition_flagged": trace.get("condition_flagged", False),
        "attack_detected": trace.get("attack_detected", False),
        "total_tokens": trace.get("total_tokens", 0),
        "latency_ms": trace.get("latency_ms", 0),
        "retries": trace.get("retries", 0),
    }
    logs.append(log_entry)
    traces[request_id] = trace

    if trace.get("attack_detected"):
        screen = trace.get("injection_screen", {})
        attack_logs.append({
            "request_id": request_id,
            "timestamp": timestamp,
            "customer_id": req.customer_id,
            "message": latest,
            "decision": decision,
            "category": screen.get("category"),
            "source": screen.get("source"),
            "confidence": screen.get("confidence"),
            "rationale": screen.get("rationale"),
        })

    _persist()

    response = {"request_id": request_id, "status": result["status"], "trace": trace,
                "order_id": result.get("order_id")}
    if result["status"] == "needs_info":
        response["reply"] = result["reply"]
    else:
        response.update({
            "decision": result["decision"],
            "message": result.get("message", result.get("reason", "")),
            "reason": result["reason"],
            "confidence": result["confidence"],
            "rule": result.get("rule"),
            "claimed_condition": result.get("claimed_condition"),
        })
    return response



class LoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/admin/login")
def admin_login(req: LoginRequest):
    """Exchange the admin password for a bearer token."""
    if not auth.verify_password(req.password, _admin["auth"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")
    token = auth.new_token()
    _admin_tokens.add(token)
    return {"token": token}


@app.post("/admin/logout")
def admin_logout(token: str = Depends(require_admin)):
    """Invalidate the caller's token."""
    _admin_tokens.discard(token)
    return {"status": "ok"}


@app.get("/admin/session")
def admin_session(_: str = Depends(require_admin)):
    """Cheap endpoint the UI uses to check whether a stored token is still valid."""
    return {"status": "ok"}


@app.post("/admin/change-password")
def admin_change_password(req: ChangePasswordRequest, _: str = Depends(require_admin)):
    """Change the admin password. Requires the current password; logs out other sessions."""
    if not auth.verify_password(req.current_password, _admin["auth"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    new_pw = req.new_password or ""
    if len(new_pw) < auth.MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=422,
            detail=f"New password must be at least {auth.MIN_PASSWORD_LENGTH} characters.",
        )
    if auth.verify_password(new_pw, _admin["auth"]):
        raise HTTPException(status_code=422, detail="New password must differ from the current one.")

    _admin["auth"] = auth.hash_password(new_pw)
    _persist()

    _admin_tokens.clear()
    fresh = auth.new_token()
    _admin_tokens.add(fresh)
    return {"token": fresh}


class SettingsUpdate(BaseModel):
    retries_enabled: bool


@app.get("/admin/settings")
def get_settings(_: str = Depends(require_admin)):
    return settings.snapshot()


@app.put("/admin/settings")
def update_settings(req: SettingsUpdate, _: str = Depends(require_admin)):
    settings.set("retries_enabled", req.retries_enabled)
    _persist()
    return settings.snapshot()


@app.get("/admin/logs")
def get_logs(_: str = Depends(require_admin)):
    return list(reversed(logs))


@app.get("/admin/traces")
def get_traces(_: str = Depends(require_admin)):
    return list(reversed(list(traces.values())))


@app.get("/admin/trace/{request_id}")
def get_trace(request_id: str, _: str = Depends(require_admin)):
    trace = traces.get(request_id)
    if trace is None:
        raise HTTPException(status_code=404, detail=f"No trace for {request_id}")
    return trace


@app.get("/admin/metrics")
def metrics(_: str = Depends(require_admin)):
    counts = Counter(log["decision"] for log in logs)
    requests_total = len(logs)
    resolved = counts.get("APPROVE", 0) + counts.get("DENY", 0) + counts.get("ESCALATE", 0)
    total_tokens = sum(log["total_tokens"] for log in logs)
    latencies = [log["latency_ms"] for log in logs]
    return {
        "total_requests": requests_total,
        "approve": counts.get("APPROVE", 0),
        "deny": counts.get("DENY", 0),
        "escalate": counts.get("ESCALATE", 0),
        "needs_info": counts.get("NEEDS_INFO", 0),
        "approval_rate": round(counts.get("APPROVE", 0) / resolved * 100, 1) if resolved else 0,
        "attacks_blocked": len(attack_logs),
        "condition_flags": sum(1 for log in logs if log.get("condition_flagged")),
        "total_tokens": total_tokens,
        "avg_tokens": round(total_tokens / requests_total) if requests_total else 0,
        "avg_latency_ms": round(sum(latencies) / requests_total) if requests_total else 0,
        "total_retries": sum(log["retries"] for log in logs),
    }


@app.get("/admin/attacks")
def get_attacks(_: str = Depends(require_admin)):
    return {"total_attacks": len(attack_logs), "attacks": list(reversed(attack_logs))}
