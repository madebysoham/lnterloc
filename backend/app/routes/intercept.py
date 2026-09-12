import time
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from sse_starlette.sse import EventSourceResponse

from backend.app.schemas.telemetry import InterceptRequest
from backend.app.schemas.decision import (
    InterceptResponse,
    ParetoUpdateRequest,
    ParetoUpdateResponse,
)
from backend.app.services.sanitizer import sanitizer
from backend.app.engines.coercion import coercion_engine
from backend.app.engines.graph import graph_engine
from backend.app.engines.ml_adapter import ml_adapter
from backend.app.engines.decision import decision_engine
from backend.app.engines.audit import audit_ledger
from backend.app.services.stream import decision_stream
from backend.app.services.external_mocks import external_gateway


router = APIRouter(prefix="/api/v1", tags=["Interception & Decision"])


@router.post("/intercept", response_model=InterceptResponse)
async def intercept_transaction(
    payload: InterceptRequest,
    background_tasks: BackgroundTasks,
) -> InterceptResponse:
    """
    Sub-45ms In-Flight Interception Gateway.
    Evaluates in-flight payment intent against coercion telemetry, payee mule graph,
    and RBI Jan 2027 expected financial cost matrix.
    """
    start_ns = time.perf_counter_ns()

    # 1. Telemetry Ingestion & DPDP Act 2023 Masking (< 3ms)
    sanitized = sanitizer.sanitize_request(payload)
    payer_hash = sanitized["payer"]["vpa_hash"]
    payee_hash = sanitized["payee"]["vpa_hash"]

    # 2. Parallel Signal Extraction (< 15ms)
    # Stream A: Sender Behavioral Coercion Evaluation
    coercion_score, coercion_signals = coercion_engine.evaluate(
        sanitized["telemetry"],
        payload.amount_inr,
    )

    # Stream B: Graph Update & Payee Mule Network Evaluation
    graph_engine.record_transaction(
        payer_hash=payer_hash,
        payee_hash=payee_hash,
        amount_inr=payload.amount_inr,
        transaction_id=payload.transaction_id,
    )
    mule_score, hop_depth = graph_engine.evaluate_payee(
        payee_hash=payee_hash,
        amount_inr=payload.amount_inr,
    )

    # 3. Model Inference & SHAP Attribution Fusion (< 10ms)
    fraud_prob, shap_attributions = ml_adapter.predict(
        amount_inr=payload.amount_inr,
        telemetry=sanitized["telemetry"],
        mule_score=mule_score,
        coercion_score=coercion_score,
    )

    # Merge Coercion signals into SHAP vector if not already present
    for k, v in coercion_signals.items():
        if k not in shap_attributions:
            shap_attributions[k] = v

    # 4. RBI Expected Financial Cost Optimization (< 5ms)
    decision, cost_matrix, mule_projection, friction_protocol = decision_engine.optimize_decision(
        amount_inr=payload.amount_inr,
        fraud_probability=fraud_prob,
        hop_depth=hop_depth,
        elapsed_seconds=0.0,
    )

    # 5. Autonomous Action Execution & Persistence (< 5ms)
    # If Critical Threat (BLOCK): execute Kill-Switch cascade and dispatch I4C lien beacon
    if decision == "BLOCK":
        cascade_result = graph_engine.trigger_kill_switch_cascade(
            primary_payee_hash=payee_hash,
            transaction_amount_inr=payload.amount_inr,
            transaction_id=payload.transaction_id,
            max_hops=2,
        )
        background_tasks.add_task(
            external_gateway.dispatch_i4c_lien,
            transaction_id=payload.transaction_id,
            amount_inr=payload.amount_inr,
            beneficiary_vpa_hash=payee_hash,
            ifsc=payload.payee.ifsc,
        )
    elif decision == "SOFT_HOLD":
        from backend.app.db.session import SessionLocal
        from backend.app.db.models import CoolingHoldModel
        db = SessionLocal()
        try:
            db.merge(
                CoolingHoldModel(
                    transaction_id=payload.transaction_id,
                    status="ACTIVE_HOLD",
                    created_at=payload.timestamp,
                    expires_at=friction_protocol.cooling_expiry or "",
                    payer_hash=payer_hash,
                    payee_hash=payee_hash,
                    amount_inr=payload.amount_inr,
                )
            )
            db.commit()
        finally:
            db.close()

    # 6. Cryptographic Hash Chaining (< 3ms)
    audit_trail_record = audit_ledger.append_record(
        transaction_id=payload.transaction_id,
        timestamp=payload.timestamp,
        decision=decision,
        fraud_probability=fraud_prob,
        amount_inr=payload.amount_inr,
        shap_summary=shap_attributions,
    )

    elapsed_ms = (time.perf_counter_ns() - start_ns) / 1_000_000.0

    response_payload = InterceptResponse(
        transaction_id=payload.transaction_id,
        latency_ms=round(elapsed_ms, 2),
        decision=decision,
        risk_assessment={
            "fraud_probability": fraud_prob,
            "coercion_index": coercion_score,
            "mule_network_index": mule_score,
            "shap_attributions": shap_attributions,
        },
        mule_chain_projection=mule_projection,
        expected_cost_matrix=cost_matrix,
        friction_protocol=friction_protocol,
        audit_trail=audit_trail_record,
    )

    # Dispatch non-blocking event to connected frontend war-room clients via SSE
    background_tasks.add_task(decision_stream.broadcast, response_payload.model_dump())

    return response_payload


@router.post("/pareto/update", response_model=ParetoUpdateResponse)
async def update_pareto_slider(payload: ParetoUpdateRequest) -> ParetoUpdateResponse:
    """Dynamically updates the live bank friction vs liability Pareto balance parameter."""
    old_alpha = decision_engine.alpha
    new_alpha = decision_engine.set_pareto_alpha(payload.alpha)
    return ParetoUpdateResponse(
        status="SUCCESS",
        previous_alpha=round(old_alpha, 3),
        current_alpha=round(new_alpha, 3),
    )


@router.get("/stream/decisions")
async def stream_decisions(request: Request):
    """
    Server-Sent Events (SSE) feed. Pushes real-time transaction intercept verdicts
    to Mintu's Next.js split-screen simulator and bank ops dashboard.
    """
    queue = await decision_stream.subscribe()

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                data = await queue.get()
                yield {"data": data}
        except asyncio.CancelledError:
            pass
        finally:
            decision_stream.unsubscribe(queue)

    return EventSourceResponse(event_generator())
