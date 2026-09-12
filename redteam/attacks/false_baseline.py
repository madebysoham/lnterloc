"""
Attack Strategy 2: False Baseline Priming.

Fraudsters make several tiny legitimate-looking micro-payments (₹10–₹50) to
establish a false behavioral baseline, then launch a high-value fraud attempt
that appears consistent with the "established" pattern.

Standard systems see a "mature" payer history and reduce risk weight.
Interloc's SHAP fusion detects the artificially short baseline window and
the abrupt amplitude jump.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from redteam.attacks.generator import build_intercept_payload


@dataclass
class FalseBaselineBatch:
    """One false-baseline attack burst: priming TXNs + payload fraud TXN."""

    priming_count: int
    priming_amounts: list[float]
    fraud_amount: float
    payloads: list[dict] = field(default_factory=list)
    expected_intercept_at: int = -1  # index (0-based) of fraud TXN in payloads


class FalseBaselineAttack:
    """
    Generator for false-baseline priming attack batches.

    Each batch emits a series of micro-transactions (₹10–₹50) to "mature"
    the payer profile, followed by one large suspicious transfer.
    """

    PRIMING_MIN = 10.0
    PRIMING_MAX = 50.0

    def __init__(
        self,
        priming_count: int = 5,
        fraud_amount: float = 45_000.0,
    ) -> None:
        self.priming_count = priming_count
        self.fraud_amount = fraud_amount

    def generate_batch(self, batch_id: str | None = None) -> FalseBaselineBatch:
        """Generate one false-baseline attack burst."""
        amounts = [
            round(self.PRIMING_MIN + (hash(f"{batch_id}-p-{i}") % int(self.PRIMING_MAX - self.PRIMING_MIN)), 2)
            for i in range(self.priming_count)
        ]
        fraud_amount = self.fraud_amount + (hash(f"{batch_id}-fraud") % 5000) - 2500

        payloads = []
        # Priming TXNs — look legitimate
        for i, amt in enumerate(amounts):
            payload = build_intercept_payload(
                amount_inr=amt,
                is_new_payee=False,  # known contacts
                active_call=False,
                screen_share_active=False,
                typing_speed_wpm=55.0,
                typing_jitter_ms=35.0,
                transactions_in_last_10m=1,
            )
            payloads.append(payload)

        # Fraud TXN — big jump in amount, new payee
        fraud_payload = build_intercept_payload(
            amount_inr=max(500, fraud_amount),
            is_new_payee=True,
            active_call=True,
            call_duration_seconds=900,
            typing_speed_wpm=95.0,
            typing_jitter_ms=160.0,
            transactions_in_last_10m=self.priming_count + 1,
        )
        payloads.append(fraud_payload)

        return FalseBaselineBatch(
            priming_count=self.priming_count,
            priming_amounts=amounts,
            fraud_amount=max(500, fraud_amount),
            payloads=payloads,
            expected_intercept_at=len(payloads) - 1,  # last TXN = fraud
        )

    def generate_n(self, n: int = 100) -> list[FalseBaselineBatch]:
        """Generate *n* independent false-baseline batches."""
        batches = []
        for i in range(n):
            fraud_amt = 30_000 + (hash(f"fb-{i}") % 40_000)
            batches.append(
                self.generate_batch(batch_id=f"FB_{i:04d}")
            )
        return batches
