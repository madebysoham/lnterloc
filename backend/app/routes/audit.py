from typing import List, Optional
from fastapi import APIRouter, Query
from backend.app.schemas.audit import AuditRecord, AuditChainVerificationResponse
from backend.app.engines.audit import audit_ledger


router = APIRouter(prefix="/api/v1/audit", tags=["Audit & Cryptographic Ledger"])


@router.get("/verify-chain", response_model=AuditChainVerificationResponse)
async def verify_audit_chain() -> AuditChainVerificationResponse:
    """
    Cryptographically verifies the entire SHA-256 hash-chained decision ledger.
    Traverses blocks from Genesis to latest block, verifying hashes and block linkages.
    """
    return audit_ledger.verify_chain()


@router.get("/records", response_model=List[AuditRecord])
async def get_audit_records(
    limit: int = Query(50, ge=1, le=200, description="Max records to retrieve"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
) -> List[AuditRecord]:
    """Returns paginated cryptographic audit records, ordered newest first."""
    return audit_ledger.get_records(limit=limit, offset=offset)
