import json
import os

from backend.policy import evaluate_order, load_policy

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_customers():
    file_path = os.path.join(BASE_DIR, "data", "customers.json")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_customer(customer_id: str):
    """Return a customer profile with a compact order list (no full detail)."""
    for c in _load_customers():
        if c["customer_id"] == customer_id:
            return {
                "customer_id": c["customer_id"],
                "name": c["name"],
                "email": c["email"],
                "tier": c["tier"],
                "orders": [
                    {"order_id": o["order_id"], "item": o["item"], "price": o["price"]}
                    for o in c["orders"]
                ],
            }
    return {"error": f"No customer found with id {customer_id}"}


def get_order(customer_id: str, order_id: str):
    """Return the full detail of a single order for a customer."""
    for c in _load_customers():
        if c["customer_id"] == customer_id:
            for o in c["orders"]:
                if o["order_id"] == order_id:
                    return o
            return {"error": f"Customer {customer_id} has no order {order_id}"}
    return {"error": f"No customer found with id {customer_id}"}


def get_refund_policy():
    """Return the full corporate refund policy text."""
    return {"policy": load_policy()}


def check_refund_eligibility(customer_id: str, order_id: str, item_condition: str = "new"):
    order = get_order(customer_id, order_id)
    if "error" in order:
        return order
    condition = (item_condition or "new").lower()
    if condition not in ("new", "used", "damaged"):
        condition = "new"
    verdict = evaluate_order(order, item_condition=condition)
    return {
        "order_id": order_id,
        "decision": verdict["decision"],
        "rule": verdict["rule"],
        "reason": verdict["reason"],
        "checks": verdict["checks"],
        "claimed_condition": condition,
        "condition_self_reported": True,
    }



TOOL_FUNCTIONS = {
    "get_customer": get_customer,
    "get_order": get_order,
    "get_refund_policy": get_refund_policy,
    "check_refund_eligibility": check_refund_eligibility,
}


def dispatch_tool(name: str, arguments: dict):
    """Execute a tool by name with the given arguments dict."""
    fn = TOOL_FUNCTIONS.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(**arguments)
    except TypeError as e:
        return {"error": f"Bad arguments for {name}: {e}"}


TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_customer",
            "description": "Look up a customer profile and the list of their orders (id, item, price). Use this first to find which order the customer is talking about.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "Customer id, e.g. C001"}
                },
                "required": ["customer_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order",
            "description": "Get full detail for one order (price, delivered_date, condition, final_sale, already_refunded, status).",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "order_id": {"type": "string", "description": "Order id, e.g. O1001"},
                },
                "required": ["customer_id", "order_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_refund_policy",
            "description": "Return the full corporate refund policy text (the rules you must enforce).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_refund_eligibility",
            "description": "Run the deterministic policy engine on a specific order. Returns the AUTHORITATIVE decision (APPROVE/DENY/ESCALATE) with the rule that fired. You MUST base your final answer on this and never contradict it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string"},
                    "order_id": {"type": "string"},
                    "item_condition": {
                        "type": "string",
                        "enum": ["new", "used", "damaged"],
                        "description": "The physical condition of the item as reported by the customer in this conversation. This is NOT in the database — you must learn it from the customer. If the customer has not stated it yet, ask them first; do not assume.",
                    },
                },
                "required": ["customer_id", "order_id", "item_condition"],
            },
        },
    },
]
