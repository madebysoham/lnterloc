"""
Benchmark harnesses for measuring catch-rate uplift and latency SLA compliance.

The runner module injects adversarial transaction batches into the interceptor,
records decisions, and compiles the Spec #8 catch-rate improvement table.
"""

from redteam.benchmarks.runner import BenchmarkRunner
from redteam.benchmarks.latency import LatencyHarness

__all__ = ["BenchmarkRunner", "LatencyHarness"]
