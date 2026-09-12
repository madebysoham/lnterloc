from typing import Dict, Optional, Literal
from pydantic import BaseModel, Field


DecisionType = Literal["APPROVE", "SOFT_HOLD", "BLOCK"]
FrictionActionType = Literal["SETTLE_IMMEDIATELY", "15_MIN_COOLING_HOLD", "IMMEDIATE_DEBIT_BLOCK"]


class RiskAssessment(BaseModel):
    fraud_probability: float = Field(..., ge=0.0, le=1.0, description="Estimated fraud probability P(Fraud)")
    coercion_index: float = Field(..., ge=0.0, le=1.0, description="Estimated user coercion index")
    mule_network_index: float = Field(..., ge=0.0, le=1.0, description="Estimated payee mule network risk index")
    shap_attributions: Dict[str, float] = Field(default_factory=dict, description="SHAP feature attribution breakdown")


class MuleChainProjection(BaseModel):
    predicted_hop_depth: int = Field(1, ge=1, le=5, description="Expected downstream layering hop depth")
    recoverability_at_t0: float = Field(..., ge=0.0, le=1.0, description="Estimated recoverability R(t0, h)")
    estimated_recoverability_now: float = Field(..., ge=0.0, le=1.0, description="Real-time estimated recoverability R(t, h)")
    liquidity_at_risk_inr: float = Field(..., ge=0.0, description="Total INR exposed in transfer")
    estimated_irrecoverable_inr: float = Field(..., ge=0.0, description="Anticipated dissipated INR lost to syndicate")


class ExpectedCostMatrix(BaseModel):
    cost_approve_inr: float = Field(..., description="Expected loss of immediate approval")
    cost_hold_inr: float = Field(..., description="Expected cost of 15-minute cooling hold")
    cost_block_inr: float = Field(..., description="Expected cost of immediate block and churn")
    optimal_action: DecisionType = Field(..., description="Cost-minimizing action under Pareto slider")
    rbi_compensation_covered: bool = Field(..., description="Whether amount falls under RBI Jan 2027 compensation rules")
    bank_direct_liability_inr: float = Field(..., description="Bank 35% statutory liability share under RBI Jan 2027")


class FrictionProtocol(BaseModel):
    action: FrictionActionType = Field(..., description="Action dispatched to switch settlement engine")
    cooling_expiry: Optional[str] = Field(None, description="ISO 8601 expiry timestamp for 15-minute hold")
    required_reauth: str = Field(..., description="Step-up re-authentication requirement")
    concurrent_attempt_rule: str = Field(..., description="Handling rule for repeated checkout attempts")


class AuditTrailRecord(BaseModel):
    record_index: int = Field(..., description="Sequential ledger block index")
    previous_hash: str = Field(..., description="SHA-256 hash of previous block")
    current_hash: str = Field(..., description="SHA-256 hash of current block")


class InterceptResponse(BaseModel):
    transaction_id: str
    latency_ms: float = Field(..., description="Total processing latency in milliseconds (< 45ms target)")
    decision: DecisionType
    risk_assessment: RiskAssessment
    mule_chain_projection: MuleChainProjection
    expected_cost_matrix: ExpectedCostMatrix
    friction_protocol: FrictionProtocol
    audit_trail: AuditTrailRecord


class ParetoUpdateRequest(BaseModel):
    alpha: float = Field(..., ge=0.0, le=1.0, description="Pareto tradeoff weight: 0=pure loss min, 1=pure friction min")


class ParetoUpdateResponse(BaseModel):
    status: str
    previous_alpha: float
    current_alpha: float
