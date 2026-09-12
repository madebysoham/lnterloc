from typing import Dict, Any, List
from fastapi import APIRouter, Body
from backend.app.services.external_mocks import external_gateway
from backend.app.engines.graph import graph_engine


router = APIRouter(prefix="/api/v1", tags=["Mocks, Cooling & Scenarios"])


@router.post("/mock/i4c/lien-dispatch")
async def mock_i4c_lien_dispatch(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Mock adapter for I4C CFCFRMS National Portal (Form 1930 / Section 91 CrPC).
    Acknowledges automated interbank debit freeze requests in local dev environments.
    """
    return {
        "status": "ACKNOWLEDGED",
        "portal": "I4C_CFCFRMS_MOCK_ADAPTER",
        "ack_reference": f"I4C-MOCK-ACK-{payload.get('transaction_id', 'UNKNOWN')}",
        "action_taken": "OUTWARD_DEBIT_FREEZE_DISPATCHED",
        "statutory_compliance": "Section 91 CrPC",
    }


@router.post("/cooling/reauth")
async def handle_cooling_reauth(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Handles step-up re-authentication during or after the 15-minute cognitive cooling period.
    Evaluates whether the user confirms without active voice call coercion.
    """
    txn_id = payload.get("transaction_id", "")
    reauth_success = bool(payload.get("reauth_passed", False))
    active_call_now = bool(payload.get("active_call_present", False))

    from datetime import datetime, timezone
    from backend.app.db.session import SessionLocal
    from backend.app.db.models import CoolingHoldModel

    now_iso = datetime.now(timezone.utc).isoformat()
    db = SessionLocal()
    hold_record = None
    try:
        hold_record = db.query(CoolingHoldModel).filter_by(transaction_id=txn_id).first()
        if reauth_success and not active_call_now:
            if hold_record:
                hold_record.status = "SETTLED"
                hold_record.reauth_at = now_iso
                hold_record.reauth_passed = True
                hold_record.resolution_note = "Step-up re-authentication succeeded without voice coercion."
                db.commit()
            return {
                "transaction_id": txn_id,
                "status": "SETTLED",
                "message": "Step-up re-authentication succeeded without active voice coercion. Funds released.",
                "action": "RELEASE_FUNDS",
            }
        else:
            if hold_record:
                hold_record.status = "CANCELLED"
                hold_record.reauth_at = now_iso
                hold_record.reauth_passed = False
                hold_record.resolution_note = "Re-authentication failed or active coercion persists."
                db.commit()
            return {
                "transaction_id": txn_id,
                "status": "CANCELLED_AND_REFUNDED",
                "message": "Re-authentication failed or active coercion persists. Payment safely cancelled.",
                "action": "HALT_AND_RESTORE",
            }
    finally:
        db.close()
