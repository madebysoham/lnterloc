"""
Attack Strategy 3: Delayed Trigger Burst.

Fraudsters introduce artificial pauses (3–7 minutes) between payment
authorization steps to defeat time-window velocity rules. They also
leverage dormant accounts that suddenly activate with a burst of
inbound transfers.

Standard systems with per-minute windows miss the pattern because each
transaction appears isolated. Interloc's rolling cumulative window and
dormancy-burst anomaly detector catch it.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from redteam.attacks.generator import build_intercept_payload


@dataclass
class DelayedTriggerBatch:
    """One delayed-trigger attack burst: spaced TXNs with dormancy flags."""

    tx_count: int
    dormancy_months: int
    payloads: list[dict] = field(default_factory=list)
    interval_seconds: int = 300
    expected_intercept_at: int = -1


class DelayedTriggerAttack:
    """
    Generator for delayed-trigger burst attack batches.

    Each batch creates a sequence of transactions spaced well apart to evade
    short-window velocity rules, combined with dormancy signals on the payee.
    """

    def __init__(
        self,
        tx_count: int = 6,
        interval_seconds: int = 300,
        dormancy_months: int = 7,
        base_amount: float = 15_000.0,
    ) -> None:
        self.tx_count = tx_count
        self.interval_seconds = interval_seconds
        self.dormancy_months = dormancy_months
        self.base_amount = base_amount

    def generate_batch(self, batch_id: str | None = None) -> DelayedTriggerBatch:
        """Generate one delayed-trigger burst."""
        payloads = []
        for i in range(self.tx_count):
            amt = self.base_amount + (hash(f"{batch_id}-{i}") % 20_000) - 10_000
            amt = max(1_000, amt)

            # Build payload with dormancy / burst signals baked into telemetry.
            # We simulate the payee's dormancy by encoding it as an unusually
            # high in-degree velocity for a "new" payee.
            in_degree_burst = i + 1  # escalating incoming transfers
            payload = build_intercept_payload(
                amount_inr=round(amt, 2),
                is_new_payee=True,
                active_call=False,
                typing_speed_wpm=62.0,
                typing_jitter_ms=55.0,
                transactions_in_last_10m=max(1, in_degree_burst),
            )
            # Inject dormancy / burst metadata outside the standard schema
            # so the interceptor can optionally use it for mule-graph eval
            payload["_redteam_dormancy_months"] = self.dormancy_months
            payload["_redteam_in_degree_burst"] = in_degree_burst
            payloads.append(payload)

        # Interloc should catch it around TXN 3-4 once the burst pattern emerges
        expected_intercept = min(self.tx_count, max(3, self.tx_count // 2))

        return DelayedTriggerBatch(
            tx_count=self.tx_count,
            dormancy_months=self.dormancy_months,
            payloads=payloads,
            interval_seconds=self.interval_seconds,
            expected_intercept_at=expected_intercept,
        )

    def generate_n(self, n: int = 100) -> list[DelayedTriggerBatch]:
        """Generate *n* independent delayed-trigger batches."""
        batches = []
        for i in range(n):
            batches.append(self.generate_batch(batch_id=f"DT_{i:04d}"))
        return batches
