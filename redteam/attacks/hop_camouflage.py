"""
Attack Strategy 4: Network Hop Camouflage.

Fraudsters bounce funds through 2-3 newly opened digital wallets or
mule accounts before the final cash-out, hoping the increased hop
distance defeats simple 1-hop risk scoring.

Standard systems see only the immediate payee (which looks clean).
Interloc's time-decayed mule chain tracer follows the multi-hop path
and flags the community cluster anomaly.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field

from redteam.attacks.generator import build_intercept_payload, _BANKS


@dataclass
class HopCamouflageBatch:
    """One hop-camouflage attack: a chain of transfers through intermediate mules."""

    hop_depth: int
    final_amount: float
    payloads: list[dict] = field(default_factory=list)
    expected_intercept_at: int = -1


class HopCamouflageAttack:
    """
    Generator for network-hop-camouflage attack batches.

    Each batch creates a chain of ``hop_depth`` transactions that simulate
    funds moving through intermediate mule wallets before reaching the
    final cash-out account.
    """

    def __init__(
        self,
        hop_depth: int = 3,
        final_amount: float = 50_000.0,
    ) -> None:
        self.hop_depth = hop_depth
        self.final_amount = final_amount

    def generate_batch(self, batch_id: str | None = None) -> HopCamouflageBatch:
        """Generate one hop-camouflage chain."""
        payloads = []
        # Simulate the chain: each hop transfers to the next mule
        amount = self.final_amount * 1.1  # slight upward drift per hop (fees)
        for i in range(self.hop_depth):
            bank = _BANKS[i % len(_BANKS)]
            is_final = i == self.hop_depth - 1
            amt = round(amount * (1 - 0.02 * i), 2)  # slight decay from fees

            payload = build_intercept_payload(
                amount_inr=max(1_000, amt),
                is_new_payee=True,  # all hops are to new accounts
                active_call=False,
                screen_share_active=False,
                typing_speed_wpm=58.0 + (i * 3),
                typing_jitter_ms=45.0,
                transactions_in_last_10m=i + 1,
                payee_bank=bank,
            )
            # Attach mule-graph metadata for the interceptor
            payload["_redteam_hop_depth"] = i + 1
            payload["_redteam_is_final_cashout"] = is_final
            payloads.append(payload)

        # Interloc should detect the community cluster by hop 2-3
        expected_intercept = min(self.hop_depth, 2)

        return HopCamouflageBatch(
            hop_depth=self.hop_depth,
            final_amount=self.final_amount,
            payloads=payloads,
            expected_intercept_at=expected_intercept,
        )

    def generate_n(self, n: int = 100) -> list[HopCamouflageBatch]:
        """Generate *n* independent hop-camouflage chains."""
        batches = []
        for i in range(n):
            depth = 2 + (i % 4)  # vary between 2-5 hops
            final_amt = 20_000 + (hash(f"hop-{i}") % 60_000)
            batches.append(
                self.generate_batch(batch_id=f"HOP_{i:04d}")
            )
        return batches
