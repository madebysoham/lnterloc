import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple
from backend.app.config import settings
from backend.app.schemas.decision import (
    DecisionType,
    FrictionActionType,
    ExpectedCostMatrix,
    MuleChainProjection,
    FrictionProtocol,
)


class DecisionEngine:
    """
    Mathematical Decision Engine implementing the RBI Jan 2027 Liability Model,
    Time-Decay Recoverability Curve, and Pareto-Optimized Expected Financial Cost Matrix.
    """

    def __init__(self):
        self.alpha = settings.DEFAULT_PARETO_ALPHA

    def set_pareto_alpha(self, new_alpha: float) -> float:
        """Updates the live Pareto balancing slider alpha in [0.0, 1.0]."""
        self.alpha = max(0.0, min(1.0, float(new_alpha)))
        return self.alpha

    def compute_rbi_compensation(self, loss_inr: float) -> Tuple[float, float, bool]:
        """
        Calculates statutory compensation and bank liability share under RBI Jan 2027 draft model.
        Returns: (gross_compensation, bank_direct_liability, is_covered)
        """
        if loss_inr <= settings.COMPENSATION_LOSS_CAP_INR:
            gross_comp = min(settings.COMPENSATION_PERCENTAGE * loss_inr, settings.MAX_COMPENSATION_INR)
            bank_share = settings.BANK_LIABILITY_SHARE * gross_comp
            return round(gross_comp, 2), round(bank_share, 2), True
        else:
            # Transactions > INR 50,000 are subject to formal dispute resolution
            return 0.0, 0.0, False

    def compute_recoverability(self, t_seconds: float, hop_depth: int) -> float:
        """
        Computes the Time-Decay Recoverability Curve:
        R(t, h) = R_0 * exp(-lambda * t) * (1 - delta)^h
        """
        r0 = settings.RECOVERABILITY_R0
        lam = settings.RECOVERABILITY_LAMBDA
        delta = settings.RECOVERABILITY_DELTA_HOP

        decay = math.exp(-lam * max(0.0, t_seconds))
        hop_penalty = math.pow(1.0 - delta, max(1, hop_depth))
        recoverability = r0 * decay * hop_penalty
        return round(max(0.01, min(0.99, recoverability)), 4)

    def optimize_decision(
        self,
        amount_inr: float,
        fraud_probability: float,
        hop_depth: int,
        elapsed_seconds: float = 0.0,
    ) -> Tuple[DecisionType, ExpectedCostMatrix, MuleChainProjection, FrictionProtocol]:
        """
        Evaluates the expected financial cost matrix and determines the optimal
        loss-minimizing action under the Pareto frontier.
        """
        # 1. Recoverability Projections
        r_t0 = self.compute_recoverability(0.0, hop_depth)
        r_now = self.compute_recoverability(elapsed_seconds, hop_depth)

        liquidity_at_risk = amount_inr
        estimated_irrecoverable = round(amount_inr * (1.0 - r_now), 2)

        mule_projection = MuleChainProjection(
            predicted_hop_depth=hop_depth,
            recoverability_at_t0=r_t0,
            estimated_recoverability_now=r_now,
            liquidity_at_risk_inr=liquidity_at_risk,
            estimated_irrecoverable_inr=estimated_irrecoverable,
        )

        # 2. RBI Statutory Bank Liability
        gross_comp, bank_direct_liability, is_covered = self.compute_rbi_compensation(amount_inr)

        # If transaction > 50k, statutory formula yields 0 direct compensation, but bank
        # faces full exposure during dispute/reputation risk: calibrate baseline exposure
        effective_bank_exposure = bank_direct_liability if is_covered else (amount_inr * 0.25)

        # 3. Expected Costs
        # Cost of APPROVE: Risk of paying out liability if fraudulent and unrecovered
        cost_approve = fraud_probability * (1.0 - r_now) * effective_bank_exposure

        # Cost of HOLD: Friction cost if legitimate + leakage risk during cooling period
        c_friction = settings.FRICTION_COST_INR
        leakage = settings.HOLD_LEAKAGE_INR
        cost_hold = ((1.0 - fraud_probability) * c_friction) + (fraud_probability * leakage)

        # Cost of BLOCK: Customer churn and dispute cost if legitimate
        c_churn = settings.CHURN_COST_INR
        cost_block = (1.0 - fraud_probability) * c_churn

        # 4. Pareto Dynamic Weighting
        # alpha weights friction aversion (higher alpha -> less eager to hold/block benign transactions)
        # (1 - alpha) weights loss aversion (lower alpha -> aggressive fraud interception)
        weight_fraud = 2.0 * (1.0 - self.alpha)
        weight_friction = 2.0 * self.alpha

        weighted_approve = cost_approve * weight_fraud
        weighted_hold = cost_hold * weight_friction
        weighted_block = cost_block * weight_friction

        # Determine optimal action
        if weighted_approve <= weighted_hold and weighted_approve <= weighted_block:
            decision: DecisionType = "APPROVE"
            friction_action: FrictionActionType = "SETTLE_IMMEDIATELY"
        elif weighted_hold <= weighted_block:
            decision: DecisionType = "SOFT_HOLD"
            friction_action: FrictionActionType = "15_MIN_COOLING_HOLD"
        else:
            decision: DecisionType = "BLOCK"
            friction_action: FrictionActionType = "IMMEDIATE_DEBIT_BLOCK"

        # Safety Override: If P(Fraud) >= 0.90, never allow immediate settlement
        if fraud_probability >= 0.90 and decision == "APPROVE":
            decision = "BLOCK"
            friction_action = "IMMEDIATE_DEBIT_BLOCK"
        elif fraud_probability >= 0.65 and decision == "APPROVE":
            decision = "SOFT_HOLD"
            friction_action = "15_MIN_COOLING_HOLD"

        cost_matrix = ExpectedCostMatrix(
            cost_approve_inr=round(cost_approve, 2),
            cost_hold_inr=round(cost_hold, 2),
            cost_block_inr=round(cost_block, 2),
            optimal_action=decision,
            rbi_compensation_covered=is_covered,
            bank_direct_liability_inr=bank_direct_liability,
        )

        now_dt = datetime.now(timezone.utc)
        cooling_expiry = (now_dt + timedelta(minutes=15)).isoformat() if decision == "SOFT_HOLD" else None

        friction_protocol = FrictionProtocol(
            action=friction_action,
            cooling_expiry=cooling_expiry,
            required_reauth=(
                "OUT_OF_BAND_BIOMETRIC_OR_TRUSTED_CONTACT"
                if decision == "SOFT_HOLD"
                else "NONE" if decision == "APPROVE" else "IN_BRANCH_FORMAL_KYC"
            ),
            concurrent_attempt_rule="ATOMIC_QUEUE_LOCK",
        )

        return decision, cost_matrix, mule_projection, friction_protocol


decision_engine = DecisionEngine()
