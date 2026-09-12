"""
Benchmark Runner — Core Spec #8 catch-rate evaluation.

Injects adversarial transaction batches into Interloc's ``POST /api/v1/intercept``
endpoint and compares catch rates against naive static-threshold baselines.

Output conforms to the benchmark schema defined in
docs/API_AND_INTEGRATION_CONTRACT.md §6.2.
"""

from __future__ import annotations

import json
import statistics
import time
from dataclasses import dataclass, field
from typing import Any, Protocol, Sequence

from redteam.attacks.structuring import StructuringAttack, StructuringBatch
from redteam.attacks.false_baseline import FalseBaselineAttack, FalseBaselineBatch
from redteam.attacks.delayed_trigger import DelayedTriggerAttack, DelayedTriggerBatch
from redteam.attacks.hop_camouflage import HopCamouflageAttack, HopCamouflageBatch


# ---------------------------------------------------------------------------
# Interceptor client protocol — can be real HTTP or a mock
# ---------------------------------------------------------------------------

class InterceptorClient(Protocol):
    """Minimal protocol for anything that can evaluate a transaction payload."""

    def intercept(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Send a payload and return the intercept response."""
        ...


# ---------------------------------------------------------------------------
# Naive baseline detector (simulates legacy static-threshold rules)
# ---------------------------------------------------------------------------

def _naive_detect(payload: dict[str, Any]) -> bool:
    """
    Simulate a **naive** static-threshold fraud detector that:
    - Flags any single transaction > ₹10,000
    - Flags transactions with active_call + screen_share
    - Does NOT aggregate rolling velocity across transactions
    """
    telemetry = payload.get("telemetry", {})
    amount = payload.get("amount_inr", 0)

    if amount > 10_000:
        return True
    if telemetry.get("active_call") and telemetry.get("screen_share_active"):
        return True
    if telemetry.get("accessibility_service_enabled"):
        return True
    return False


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------

@dataclass
class AttackResult:
    """Result of evaluating a single attack batch."""

    attack_type: str
    batch_id: str
    total_txns: int
    naive_caught: int
    interloc_caught: int
    decisions: list[str]
    latencies_ms: list[float]


@dataclass
class BenchmarkReport:
    """Aggregated Spec #8 benchmark report."""

    total_trials: int = 0
    total_txns: int = 0
    standard_rules_detected: int = 0
    interloc_detected: int = 0
    catch_rate_improvement_percent: float = 0.0
    average_switch_latency_ms: float = 0.0
    per_attack_type: dict[str, dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_trials": self.total_trials,
            "total_txns": self.total_txns,
            "standard_rules_detected": self.standard_rules_detected,
            "interloc_detected": self.interloc_detected,
            "catch_rate_improvement_percent": round(self.catch_rate_improvement_percent, 1),
            "average_switch_latency_ms": round(self.average_switch_latency_ms, 1),
            "per_attack_type": self.per_attack_type,
        }


# ---------------------------------------------------------------------------
# Benchmark Runner
# ---------------------------------------------------------------------------

class BenchmarkRunner:
    """
    Orchestrates the full Spec #8 adversarial benchmark suite.

    For each attack type, generates ``batches_per_attack`` attack batches,
    injects every transaction payload into the interceptor, and tallies
    catch rates for both the naive baseline and Interloc.
    """

    def __init__(
        self,
        client: InterceptorClient,
        batches_per_attack: int = 250,
    ) -> None:
        self.client = client
        self.batches_per_attack = batches_per_attack

        self.structuring = StructuringAttack()
        self.false_baseline = FalseBaselineAttack()
        self.delayed_trigger = DelayedTriggerAttack()
        self.hop_camouflage = HopCamouflageAttack()

    # ------------------------------------------------------------------
    def _evaluate_batch(
        self,
        batch_id: str,
        attack_type: str,
        payloads: Sequence[dict[str, Any]],
    ) -> AttackResult:
        """Evaluate a single batch through both naive and Interloc."""
        naive_caught = 0
        interloc_caught = 0
        decisions: list[str] = []
        latencies: list[float] = []

        for payload in payloads:
            # Naive check
            if _naive_detect(payload):
                naive_caught += 1

            # Interloc check
            t0 = time.perf_counter()
            try:
                response = self.client.intercept(payload)
            except Exception:
                response = {"decision": "ERROR", "latency_ms": 0.0}
            elapsed_ms = (time.perf_counter() - t0) * 1000

            decision = response.get("decision", "ERROR")
            resp_latency = response.get("latency_ms", elapsed_ms)
            decisions.append(decision)
            latencies.append(resp_latency)

            if decision in ("SOFT_HOLD", "BLOCK"):
                interloc_caught += 1

        return AttackResult(
            attack_type=attack_type,
            batch_id=batch_id,
            total_txns=len(payloads),
            naive_caught=naive_caught,
            interloc_caught=interloc_caught,
            decisions=decisions,
            latencies_ms=latencies,
        )

    # ------------------------------------------------------------------
    def run(self) -> BenchmarkReport:
        """Execute the full benchmark suite and return a compiled report."""
        attack_generators = [
            ("structuring", self.structuring),
            ("false_baseline", self.false_baseline),
            ("delayed_trigger", self.delayed_trigger),
            "hop_camouflage",  # special: variable hop count
        ]

        all_results: list[AttackResult] = []
        all_latencies: list[float] = []

        # --- Structuring ---
        struct_batches = self.structuring.generate_n(self.batches_per_attack)
        for batch in struct_batches:
            result = self._evaluate_batch(batch_id=batch.payloads[0]["transaction_id"][:16], attack_type="structuring", payloads=batch.payloads)
            all_results.append(result)
            all_latencies.extend(result.latencies_ms)

        # --- False Baseline ---
        fb_batches = self.false_baseline.generate_n(self.batches_per_attack)
        for batch in fb_batches:
            result = self._evaluate_batch(batch_id=batch.payloads[0]["transaction_id"][:16], attack_type="false_baseline", payloads=batch.payloads)
            all_results.append(result)
            all_latencies.extend(result.latencies_ms)

        # --- Delayed Trigger ---
        dt_batches = self.delayed_trigger.generate_n(self.batches_per_attack)
        for batch in dt_batches:
            result = self._evaluate_batch(batch_id=batch.payloads[0]["transaction_id"][:16], attack_type="delayed_trigger", payloads=batch.payloads)
            all_results.append(result)
            all_latencies.extend(result.latencies_ms)

        # --- Hop Camouflage ---
        hop_batches = self.hop_camouflage.generate_n(self.batches_per_attack)
        for batch in hop_batches:
            result = self._evaluate_batch(batch_id=batch.payloads[0]["transaction_id"][:16], attack_type="hop_camouflage", payloads=batch.payloads)
            all_results.append(result)
            all_latencies.extend(result.latencies_ms)

        # Aggregate
        total_txns = sum(r.total_txns for r in all_results)
        naive_total = sum(r.naive_caught for r in all_results)
        interloc_total = sum(r.interloc_caught for r in all_results)
        avg_latency = statistics.mean(all_latencies) if all_latencies else 0.0

        naive_rate = (naive_total / total_txns * 100) if total_txns else 0
        interloc_rate = (interloc_total / total_txns * 100) if total_txns else 0
        improvement = interloc_rate - naive_rate

        # Per-attack breakdown
        per_attack: dict[str, dict[str, Any]] = {}
        for attack_type in ("structuring", "false_baseline", "delayed_trigger", "hop_camouflage"):
            typed_results = [r for r in all_results if r.attack_type == attack_type]
            t_total = sum(r.total_txns for r in typed_results)
            t_naive = sum(r.naive_caught for r in typed_results)
            t_interloc = sum(r.interloc_caught for r in typed_results)
            t_latencies = [lat for r in typed_results for lat in r.latencies_ms]
            per_attack[attack_type] = {
                "total_txns": t_total,
                "naive_detected": t_naive,
                "interloc_detected": t_interloc,
                "naive_rate_percent": round((t_naive / t_total * 100) if t_total else 0, 1),
                "interloc_rate_percent": round((t_interloc / t_total * 100) if t_total else 0, 1),
                "improvement_percent": round(
                    ((t_interloc / t_total) - (t_naive / t_total)) * 100 if t_total else 0, 1
                ),
                "avg_latency_ms": round(statistics.mean(t_latencies) if t_latencies else 0, 1),
            }

        report = BenchmarkReport(
            total_trials=len(all_results),
            total_txns=total_txns,
            standard_rules_detected=naive_total,
            interloc_detected=interloc_total,
            catch_rate_improvement_percent=improvement,
            average_switch_latency_ms=avg_latency,
            per_attack_type=per_attack,
        )
        return report
