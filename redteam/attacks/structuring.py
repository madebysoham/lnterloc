"""
Attack Strategy 1: Threshold Structuring (Smurfing) Evasion.

Fraudsters fragment a high-value fraud into multiple sequential transfers
structured *just below* the standard ₹10,000 velocity threshold to bypass
naive per-transaction rules.

**Example**: ₹40,000 fraud → four ₹9,850 transfers spaced ~3 minutes apart.

Standard systems let all 4 pass because each < ₹10,000.
Interloc catches it on TXN #2 when rolling cumulative volume crosses ~₹19,700.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from redteam.attacks.generator import build_intercept_payload


@dataclass
class StructuringBatch:
    """A single structuring attack burst — a sequence of sub-threshold TXNs."""

    target_amount: float
    shard_amount: float
    shard_count: int
    payloads: list[dict] = field(default_factory=list)
    tx_window_seconds: int = 360
    expected_intercept_at: int = 2  # TXN number where Interloc should catch it


class StructuringAttack:
    """
    Generator for threshold-structuring (smurfing) attack batches.

    Each batch creates ``n`` sequential transactions whose individual amounts
    sit just below the configurable ``threshold_inr`` (default ₹10,000) but
    whose cumulative volume quickly exceeds it.
    """

    def __init__(
        self,
        threshold_inr: float = 10_000.0,
        shard_margin: float = 200.0,
        interval_seconds: int = 180,
    ) -> None:
        self.threshold_inr = threshold_inr
        self.shard_margin = shard_margin
        self.interval_seconds = interval_seconds

    # ------------------------------------------------------------------
    def generate_batch(
        self,
        target_amount: float = 40_000.0,
        batch_id: str | None = None,
    ) -> StructuringBatch:
        """Generate one structuring attack burst."""
        shard_amount = self.threshold_inr - self.shard_margin
        shard_count = max(2, int(target_amount / shard_amount) + 1)

        # Slight randomness per shard to avoid uniform patterns
        amounts = []
        remaining = target_amount
        for i in range(shard_count):
            if i == shard_count - 1:
                amt = remaining
            else:
                amt = shard_amount + (hash(f"{batch_id}-{i}") % 200) - 100
                amt = max(500, min(amt, self.threshold_inr - 50))
            amounts.append(round(amt, 2))
            remaining -= amounts[-1]

        # Determine which TXN triggers the intercept (cumulative > threshold)
        cumulative = 0.0
        expected_intercept = shard_count  # default: none caught
        for idx, amt in enumerate(amounts):
            cumulative += amt
            if cumulative > self.threshold_inr * 1.5:
                expected_intercept = idx + 1
                break

        common_id = batch_id or uuid.uuid4().hex[:10]
        payloads = []
        for i, amt in enumerate(amounts):
            payload = build_intercept_payload(
                amount_inr=amt,
                is_new_payee=True,
                transactions_in_last_10m=i + 1,
                active_call=False,
                typing_speed_wpm=75.0 + (i * 5),  # slight escalation
                typing_jitter_ms=90.0 + (i * 10),
            )
            payloads.append(payload)

        return StructuringBatch(
            target_amount=target_amount,
            shard_amount=shard_amount,
            shard_count=shard_count,
            payloads=payloads,
            tx_window_seconds=self.interval_seconds * (shard_count - 1),
            expected_intercept_at=expected_intercept,
        )

    def generate_n(self, n: int = 100) -> list[StructuringBatch]:
        """Generate *n* independent structuring batches."""
        batches = []
        for i in range(n):
            target = 25_000 + (hash(f"struct-{i}") % 50_000)
            batches.append(self.generate_batch(target_amount=float(target), batch_id=f"STR_{i:04d}"))
        return batches
