from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AuditRecord(BaseModel):
    index: int = Field(..., description="Ledger block sequence number")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    transaction_id: str = Field(..., description="Transaction identifier")
    decision: str = Field(..., description="APPROVE, SOFT_HOLD, or BLOCK")
    fraud_probability: float = Field(..., description="Fraud probability score")
    amount_inr: float = Field(..., description="Transaction amount")
    shap_summary: Dict[str, float] = Field(default_factory=dict, description="Top SHAP features")
    previous_hash: str = Field(..., description="SHA-256 hash of previous block")
    current_hash: str = Field(..., description="SHA-256 hash of this block")


class AuditChainVerificationResponse(BaseModel):
    is_valid: bool = Field(..., description="True if all cryptographic SHA-256 hashes match sequentially")
    chain_length: int = Field(..., description="Total verified blocks in ledger")
    genesis_hash: str = Field(..., description="Root hash of block 0")
    latest_hash: str = Field(..., description="Hash of the most recent block")
    tampered_index: Optional[int] = Field(None, description="Index of first detected tampering if invalid")
    verification_duration_ms: float = Field(..., description="Latency of verification in milliseconds")
