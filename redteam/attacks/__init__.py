"""
Attack payload generators for adversarial red-team evaluation.

Each module implements an ``AttackStrategy`` interface that yields batches
of synthetic InterceptRequest payloads designed to evade naive rule-based
fraud detection while still being caught by Interloc's multi-signal fusion.
"""

from redteam.attacks.structuring import StructuringAttack
from redteam.attacks.false_baseline import FalseBaselineAttack
from redteam.attacks.delayed_trigger import DelayedTriggerAttack
from redteam.attacks.hop_camouflage import HopCamouflageAttack
from redteam.attacks.generator import build_intercept_payload

__all__ = [
    "StructuringAttack",
    "FalseBaselineAttack",
    "DelayedTriggerAttack",
    "HopCamouflageAttack",
    "build_intercept_payload",
]
