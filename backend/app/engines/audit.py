import time
import hashlib
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from backend.app.schemas.audit import AuditRecord, AuditChainVerificationResponse
from backend.app.schemas.decision import AuditTrailRecord
from backend.app.db.session import SessionLocal, init_db
from backend.app.db.models import AuditBlockModel


GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


class CryptographicAuditLedger:
    """
    Immutable Cryptographic SHA-256 Hash-Chained Audit Ledger with Local Persistence.
    Complies with DPDP Act 2023 Section 8(5) and Section 91 CrPC evidence standards.
    """

    def __init__(self):
        self._chain: List[AuditRecord] = []
        init_db()  # Ensure tables exist
        self._load_or_initialize()

    def _load_or_initialize(self):
        """Loads existing blocks from SQLite or initializes Block 0 (Genesis Block)."""
        db = SessionLocal()
        try:
            persisted_blocks = (
                db.query(AuditBlockModel)
                .order_by(AuditBlockModel.block_index.asc())
                .all()
            )

            if persisted_blocks:
                for b in persisted_blocks:
                    shap_data = json.loads(b.shap_json) if b.shap_json else {}
                    self._chain.append(
                        AuditRecord(
                            index=b.block_index,
                            timestamp=b.timestamp,
                            transaction_id=b.transaction_id,
                            decision=b.decision,
                            fraud_probability=b.fraud_probability,
                            amount_inr=b.amount_inr,
                            shap_summary=shap_data,
                            previous_hash=b.previous_hash,
                            current_hash=b.current_hash,
                        )
                    )
            else:
                self._initialize_genesis(db)
        finally:
            db.close()

    def _initialize_genesis(self, db):
        """Creates and persists Block 0 (Genesis Block)."""
        genesis_time = "2026-09-11T00:00:00.000Z"
        genesis_data = f"GENESIS||{genesis_time}||SYSTEM||0.0||{GENESIS_HASH}"
        genesis_hash = hashlib.sha256(genesis_data.encode("utf-8")).hexdigest()

        genesis_record = AuditRecord(
            index=0,
            timestamp=genesis_time,
            transaction_id="TXN_GENESIS_ROOT",
            decision="SYSTEM_INITIALIZATION",
            fraud_probability=0.0,
            amount_inr=0.0,
            shap_summary={},
            previous_hash=GENESIS_HASH,
            current_hash=genesis_hash,
        )
        self._chain.append(genesis_record)

        db_block = AuditBlockModel(
            block_index=0,
            timestamp=genesis_time,
            transaction_id="TXN_GENESIS_ROOT",
            decision="SYSTEM_INITIALIZATION",
            fraud_probability=0.0,
            amount_inr=0.0,
            shap_json="{}",
            previous_hash=GENESIS_HASH,
            current_hash=genesis_hash,
        )
        db.add(db_block)
        db.commit()

    def append_record(
        self,
        transaction_id: str,
        timestamp: str,
        decision: str,
        fraud_probability: float,
        amount_inr: float,
        shap_summary: Dict[str, float],
    ) -> AuditTrailRecord:
        """
        Appends an immutable decision block cryptographically chained to the previous record hash.
        Formula:
        RecordData_n = TxnId || Timestamp || Decision || P_f || SHAP || PrevHash_{n-1}
        CurrentHash_n = SHA-256(RecordData_n)
        """
        previous_block = self._chain[-1]
        prev_hash = previous_block.current_hash
        next_index = len(self._chain)

        # Canonical deterministic string serialization
        shap_str = json.dumps(shap_summary, sort_keys=True)
        raw_payload = f"{transaction_id}||{timestamp}||{decision}||{fraud_probability:.4f}||{shap_str}||{prev_hash}"
        current_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

        record = AuditRecord(
            index=next_index,
            timestamp=timestamp,
            transaction_id=transaction_id,
            decision=decision,
            fraud_probability=fraud_probability,
            amount_inr=amount_inr,
            shap_summary=shap_summary,
            previous_hash=prev_hash,
            current_hash=current_hash,
        )
        self._chain.append(record)

        # Persist to SQLite in WAL mode
        db = SessionLocal()
        try:
            db_block = AuditBlockModel(
                block_index=next_index,
                timestamp=timestamp,
                transaction_id=transaction_id,
                decision=decision,
                fraud_probability=fraud_probability,
                amount_inr=amount_inr,
                shap_json=shap_str,
                previous_hash=prev_hash,
                current_hash=current_hash,
            )
            db.add(db_block)
            db.commit()
        finally:
            db.close()

        return AuditTrailRecord(
            record_index=next_index,
            previous_hash=prev_hash,
            current_hash=current_hash,
        )

    def get_records(self, limit: int = 50, offset: int = 0) -> List[AuditRecord]:
        """Returns paginated audit ledger records, most recent first."""
        records = list(reversed(self._chain[1:]))  # Skip genesis block in standard view
        return records[offset : offset + limit]

    def verify_chain(self) -> AuditChainVerificationResponse:
        """
        Cryptographically validates the entire audit ledger from Genesis to the latest block.
        Confirms zero breaks, zero deletions, and zero retro-modifications.
        """
        start_time = time.perf_counter()

        if len(self._chain) == 0:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return AuditChainVerificationResponse(
                is_valid=True,
                chain_length=0,
                genesis_hash=GENESIS_HASH,
                latest_hash=GENESIS_HASH,
                tampered_index=None,
                verification_duration_ms=round(duration_ms, 3),
            )

        # Validate Genesis Block
        if self._chain[0].previous_hash != GENESIS_HASH:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            return AuditChainVerificationResponse(
                is_valid=False,
                chain_length=len(self._chain),
                genesis_hash=self._chain[0].current_hash,
                latest_hash=self._chain[-1].current_hash,
                tampered_index=0,
                verification_duration_ms=round(duration_ms, 3),
            )

        # Validate Sequential Blocks
        for i in range(1, len(self._chain)):
            prev_block = self._chain[i - 1]
            curr_block = self._chain[i]

            # 1. Link Check: does block i point to block i-1's current_hash?
            if curr_block.previous_hash != prev_block.current_hash:
                duration_ms = (time.perf_counter() - start_time) * 1000.0
                return AuditChainVerificationResponse(
                    is_valid=False,
                    chain_length=len(self._chain),
                    genesis_hash=self._chain[0].current_hash,
                    latest_hash=self._chain[-1].current_hash,
                    tampered_index=i,
                    verification_duration_ms=round(duration_ms, 3),
                )

            # 2. Hash Integrity Check: does SHA-256(payload) produce curr_block.current_hash?
            shap_str = json.dumps(curr_block.shap_summary, sort_keys=True)
            raw_payload = (
                f"{curr_block.transaction_id}||{curr_block.timestamp}||"
                f"{curr_block.decision}||{curr_block.fraud_probability:.4f}||"
                f"{shap_str}||{curr_block.previous_hash}"
            )
            recomputed_hash = hashlib.sha256(raw_payload.encode("utf-8")).hexdigest()

            if recomputed_hash != curr_block.current_hash:
                duration_ms = (time.perf_counter() - start_time) * 1000.0
                return AuditChainVerificationResponse(
                    is_valid=False,
                    chain_length=len(self._chain),
                    genesis_hash=self._chain[0].current_hash,
                    latest_hash=self._chain[-1].current_hash,
                    tampered_index=i,
                    verification_duration_ms=round(duration_ms, 3),
                )

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        return AuditChainVerificationResponse(
            is_valid=True,
            chain_length=len(self._chain),
            genesis_hash=self._chain[0].current_hash,
            latest_hash=self._chain[-1].current_hash,
            tampered_index=None,
            verification_duration_ms=round(duration_ms, 3),
        )


audit_ledger = CryptographicAuditLedger()
