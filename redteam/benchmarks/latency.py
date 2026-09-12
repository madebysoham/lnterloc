"""
Latency SLA Test Harness.

Measures end-to-end decision latency of the interceptor against a battery
of diverse transaction payloads and reports compliance with the <45ms SLA.

Output includes P50 / P95 / P99 / max latency and SLA pass rate.
"""

from __future__ import annotations

import statistics
import time
from dataclasses import dataclass, field
from typing import Any

from redteam.attacks.generator import build_intercept_payload


@dataclass
class LatencyResult:
    """Aggregated latency statistics for a single harness run."""

    total_requests: int
    sla_max_ms: float
    compliant_count: int
    compliant_rate_percent: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    max_ms: float
    min_ms: float
    mean_ms: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "sla_max_ms": self.sla_max_ms,
            "compliant_count": self.compliant_count,
            "compliant_rate_percent": round(self.compliant_rate_percent, 1),
            "p50_ms": round(self.p50_ms, 1),
            "p95_ms": round(self.p95_ms, 1),
            "p99_ms": round(self.p99_ms, 1),
            "max_ms": round(self.max_ms, 1),
            "min_ms": round(self.min_ms, 1),
            "mean_ms": round(self.mean_ms, 1),
        }


class LatencyHarness:
    """
    Benchmarks interceptor decision latency under varied payload profiles.

    Generates a mix of low-risk (should APPROVE) and high-risk (should HOLD/BLOCK)
    payloads and measures raw request timing.
    """

    PROFILES: list[dict[str, Any]] = [
        # Low risk — routine payments
        {"amount_inr": 500, "is_new_payee": False, "active_call": False},
        {"amount_inr": 2_000, "is_new_payee": False, "active_call": False},
        {"amount_inr": 8_000, "is_new_payee": False, "active_call": False},
        # Medium risk — moderate signals
        {"amount_inr": 15_000, "is_new_payee": True, "active_call": False},
        {"amount_inr": 25_000, "is_new_payee": True, "active_call": True, "call_duration_seconds": 600},
        # High risk — strong fraud signals
        {"amount_inr": 45_000, "is_new_payee": True, "active_call": True, "call_duration_seconds": 1800, "screen_share_active": True},
        {"amount_inr": 50_000, "is_new_payee": True, "active_call": True, "screen_share_active": True, "accessibility_service_enabled": True},
    ]

    def __init__(self, client: Any, sla_max_ms: float = 45.0) -> None:
        self.client = client
        self.sla_max_ms = sla_max_ms

    def run(self, iterations_per_profile: int = 200) -> LatencyResult:
        """Execute the latency harness and return statistics."""
        all_latencies: list[float] = []
        compliant = 0

        for profile in self.PROFILES:
            for _ in range(iterations_per_profile):
                payload = build_intercept_payload(**profile)
                t0 = time.perf_counter()
                try:
                    self.client.intercept(payload)
                except Exception:
                    pass
                elapsed = (time.perf_counter() - t0) * 1000
                all_latencies.append(elapsed)
                if elapsed <= self.sla_max_ms:
                    compliant += 1

        all_latencies.sort()
        total = len(all_latencies)

        return LatencyResult(
            total_requests=total,
            sla_max_ms=self.sla_max_ms,
            compliant_count=compliant,
            compliant_rate_percent=(compliant / total * 100) if total else 0,
            p50_ms=statistics.median(all_latencies) if all_latencies else 0,
            p95_ms=all_latencies[int(total * 0.95)] if total else 0,
            p99_ms=all_latencies[int(total * 0.99)] if total else 0,
            max_ms=max(all_latencies) if all_latencies else 0,
            min_ms=min(all_latencies) if all_latencies else 0,
            mean_ms=statistics.mean(all_latencies) if all_latencies else 0,
        )
