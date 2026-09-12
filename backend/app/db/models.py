from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    Boolean,
    DateTime,
    Index,
)
from backend.app.db.session import Base


class AuditBlockModel(Base):
    """
    Immutable Cryptographic SHA-256 Hash-Chained Audit Ledger Block.
    Complies with DPDP Act 2023 Section 8(5) and Section 91 CrPC evidence standards.
    """
    __tablename__ = "audit_blocks"

    block_index = Column(Integer, primary_key=True, index=True, autoincrement=False)
    timestamp = Column(String(64), nullable=False)
    transaction_id = Column(String(128), nullable=False, index=True)
    decision = Column(String(32), nullable=False)
    fraud_probability = Column(Float, nullable=False)
    amount_inr = Column(Float, nullable=False)
    shap_json = Column(Text, nullable=False, default="{}")
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_audit_prev_curr", "previous_hash", "current_hash"),
    )


class GraphEdgeModel(Base):
    """
    Historical payment transaction edge for rehydrating the dynamic multigraph across reboots.
    Stores only salted SHA-256 hashes of identifiers to guarantee zero PII persistence.
    """
    __tablename__ = "graph_edges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(128), nullable=False, index=True)
    payer_hash = Column(String(64), nullable=False, index=True)
    payee_hash = Column(String(64), nullable=False, index=True)
    amount_inr = Column(Float, nullable=False)
    timestamp_unix = Column(Float, nullable=False, index=True)

    __table_args__ = (
        Index("idx_payee_time", "payee_hash", "timestamp_unix"),
    )


class LockedAccountModel(Base):
    """
    Accounts frozen by the Automated Multi-Node Kill-Switch Cascade.
    """
    __tablename__ = "locked_accounts"

    account_hash = Column(String(64), primary_key=True)
    locked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason = Column(String(255), nullable=False)
    triggering_transaction_id = Column(String(128), nullable=False)
    cascade_hop = Column(Integer, default=1)


class CoolingHoldModel(Base):
    """
    15-Minute Cognitive Cooling Hold Registry.
    Tracks active hold lifecycles, expiration timestamps, and step-up re-authentication verdicts.
    """
    __tablename__ = "cooling_holds"

    transaction_id = Column(String(128), primary_key=True)
    status = Column(String(32), default="ACTIVE_HOLD", index=True)  # ACTIVE_HOLD, SETTLED, CANCELLED
    created_at = Column(String(64), nullable=False)
    expires_at = Column(String(64), nullable=False)
    payer_hash = Column(String(64), nullable=False)
    payee_hash = Column(String(64), nullable=False)
    amount_inr = Column(Float, nullable=False)
    reauth_at = Column(String(64), nullable=True)
    reauth_passed = Column(Boolean, nullable=True)
    resolution_note = Column(String(255), nullable=True)
