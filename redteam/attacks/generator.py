"""
Synthetic UPI transaction payload generator.

Builds realistic InterceptRequest payloads conforming to the
``POST /api/v1/intercept`` contract defined in docs/API_AND_INTEGRATION_CONTRACT.md.
All identifiers are synthetic and no real PII is used.
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone
from typing import Any


# ---------------------------------------------------------------------------
# Banks & IFSC prefixes for realistic synthetic data
# ---------------------------------------------------------------------------
_BANKS: list[tuple[str, str]] = [
    ("HDFC", "HDFC0"),
    ("ICICI", "ICIC0"),
    ("SBI", "SBIN0"),
    ("AXIS", "UTIB0"),
    ("KOTAK", "KKBK0"),
    ("CANARA", "CNRB0"),
    ("PUNB", "PUNB0"),
    ("BOB", "BARB0"),
]

_DEVICES = [
    "DEV_SAMSUNG_S24",
    "DEV_ONEPLUS_12",
    "DEV_IPHONE_15",
    "DEV_PIXEL_8",
    "DEV_REDMI_NOTE_13",
    "DEV_REALME_12",
]


def _random_vpa(bank_code: str, is_new: bool = False) -> str:
    """Generate a synthetic VPA. New payees use random names."""
    if is_new:
        names = [
            "fast.verify", "quick.pay", "loan.approval", " refund.support",
            "kyc.update", "tax.refund", "prize.claim", "urgent.pay",
        ]
        prefix = random.choice(names)
    else:
        names = [
            "rajesh.kumar", "priya.singh", "amit.verma", "sneha.gupta",
            "rahul.patel", "deepa.nair", "vikram.reddy", "anjali.das",
        ]
        prefix = random.choice(names)
    domain = random.choice(["okhdfcbank", "okicicibank", "oksbi", "okaxis", "okkotak"])
    return f"{prefix}@{domain}"


def _random_account_id(bank_code: str) -> str:
    return f"ACC_{bank_code}_{random.randint(100000000, 999999999)}"


def _random_phone() -> str:
    return f"+91{random.randint(6000000000, 9999999999)}"


def _random_device() -> str:
    return f"{random.choice(_DEVICES)}_{uuid.uuid4().hex[:6].upper()}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_intercept_payload(
    *,
    amount_inr: float,
    is_new_payee: bool = True,
    active_call: bool = False,
    call_duration_seconds: int = 0,
    screen_share_active: bool = False,
    accessibility_service_enabled: bool = False,
    typing_speed_wpm: float = 60.0,
    typing_jitter_ms: float = 50.0,
    transactions_in_last_10m: int = 1,
    payer_bank: str | None = None,
    payee_bank: str | None = None,
    transaction_id: str | None = None,
    timestamp: str | None = None,
) -> dict[str, Any]:
    """Build a single ``/api/v1/intercept`` request payload."""
    p_bank = payer_bank or random.choice(_BANKS)
    y_bank = payee_bank or random.choice(_BANKS)
    if isinstance(p_bank, str):
        p_bank = (p_bank, p_bank[:4].upper() + "0")
    if isinstance(y_bank, str):
        y_bank = (y_bank, y_bank[:4].upper() + "0")

    return {
        "transaction_id": transaction_id or f"TXN_UPI_{uuid.uuid4().hex[:12].upper()}",
        "timestamp": timestamp or _now_iso(),
        "payer": {
            "account_id": _random_account_id(p_bank[0]),
            "vpa": _random_vpa(p_bank[0], is_new=False),
            "phone": _random_phone(),
            "device_id": _random_device(),
        },
        "payee": {
            "account_id": _random_account_id(y_bank[0]),
            "vpa": _random_vpa(y_bank[0], is_new=is_new_payee),
            "ifsc": f"{y_bank[1]}{random.randint(1000, 9999)}",
        },
        "amount_inr": round(amount_inr, 2),
        "currency": "INR",
        "telemetry": {
            "active_call": active_call,
            "call_duration_seconds": call_duration_seconds,
            "call_ended_seconds_ago": None if active_call else random.randint(0, 300),
            "screen_share_active": screen_share_active,
            "accessibility_service_enabled": accessibility_service_enabled,
            "typing_speed_wpm": round(typing_speed_wpm, 1),
            "typing_jitter_ms": round(typing_jitter_ms, 1),
            "is_new_payee_for_payer": is_new_payee,
            "transactions_in_last_10m": transactions_in_last_10m,
        },
    }
