from datetime import date, datetime
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

RETURN_WINDOW_DAYS = 30
ESCALATION_THRESHOLD = 500


def load_policy() -> str:
    file_path = os.path.join(BASE_DIR, "data", "refund_policy.txt")
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def _parse_date(value: str):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def evaluate_order(order: dict, item_condition: str = "new", today: date | None = None) -> dict:
    today = today or date.today()
    checks = []

    def add(rule, passed, detail):
        checks.append({"rule": rule, "passed": passed, "detail": detail})

    final_sale = bool(order.get("final_sale", False))
    condition = (item_condition or "new").lower()
    already_refunded = bool(order.get("already_refunded", False))
    status = (order.get("status") or "delivered").lower()
    price = order.get("price", 0) or 0
    delivered = _parse_date(order.get("delivered_date"))
    days_since_delivery = (today - delivered).days if delivered else None

    delivered_ok = status == "delivered"
    add("RULE_6_DELIVERED", delivered_ok, f"status={status}")
    if not delivered_ok:
        return _verdict("DENY", "RULE_6_NOT_DELIVERED",
                        f"Order is not yet delivered (status: {status}); it cannot be refunded.",
                        checks)

    add("RULE_1_FINAL_SALE", not final_sale, f"final_sale={final_sale}")
    if final_sale:
        return _verdict("DENY", "RULE_1_FINAL_SALE",
                        "Item is marked final sale and can never be refunded.",
                        checks)

    condition_ok = condition not in ("used", "damaged")
    add("RULE_4_CONDITION", condition_ok, f"condition={condition}")
    if not condition_ok:
        return _verdict("DENY", "RULE_4_CONDITION",
                        f"Item condition is '{condition}'; used or damaged items are not refundable.",
                        checks)

    add("RULE_5_ONE_REFUND", not already_refunded, f"already_refunded={already_refunded}")
    if already_refunded:
        return _verdict("DENY", "RULE_5_ALREADY_REFUNDED",
                        "This order has already been refunded; only one refund per order is allowed.",
                        checks)

    window_ok = days_since_delivery is not None and days_since_delivery <= RETURN_WINDOW_DAYS
    add("RULE_2_WINDOW", window_ok,
        f"days_since_delivery={days_since_delivery}, limit={RETURN_WINDOW_DAYS}")
    if not window_ok:
        return _verdict("DENY", "RULE_2_WINDOW",
                        f"Refund requested {days_since_delivery} days after delivery, "
                        f"outside the {RETURN_WINDOW_DAYS}-day window.",
                        checks)

    needs_escalation = price > ESCALATION_THRESHOLD
    add("RULE_3_HIGH_VALUE", not needs_escalation, f"price={price}, threshold={ESCALATION_THRESHOLD}")
    if needs_escalation:
        return _verdict("ESCALATE", "RULE_3_HIGH_VALUE",
                        f"Order value ${price} exceeds ${ESCALATION_THRESHOLD}; "
                        f"requires human approval.",
                        checks)

    return _verdict("APPROVE", "ALL_RULES_PASSED",
                    f"Order is within the {RETURN_WINDOW_DAYS}-day window, in new condition, "
                    f"not final sale, and under ${ESCALATION_THRESHOLD}. Refund approved.",
                    checks)


def _verdict(decision, rule, reason, checks):
    return {"decision": decision, "rule": rule, "reason": reason, "checks": checks}
