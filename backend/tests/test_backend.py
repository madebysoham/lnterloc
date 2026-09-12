import time
import sys
from pathlib import Path

# Add Eclipse root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.engines.decision import decision_engine
from backend.app.engines.audit import audit_ledger


client = TestClient(app)


def test_health_probe():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["sla_target_ms"] == 45.0
    print("PASS: test_health_probe")


def test_rbi_jan_2027_liability_calculation():
    # Test case 1: Loss <= 50,000 (e.g. 40,000)
    # GrossComp = min(0.85 * 40000, 25000) = min(34000, 25000) = 25000
    # Bank Liability = 0.35 * 25000 = 8750
    gross, bank_share, covered = decision_engine.compute_rbi_compensation(40000.0)
    assert covered is True
    assert gross == 25000.0
    assert bank_share == 8750.0

    # Test case 2: Loss of 10,000
    # GrossComp = min(0.85 * 10000, 25000) = 8500
    # Bank Liability = 0.35 * 8500 = 2975
    gross, bank_share, covered = decision_engine.compute_rbi_compensation(10000.0)
    assert covered is True
    assert gross == 8500.0
    assert bank_share == 2975.0

    # Test case 3: Loss > 50,000 (e.g. 75,000) -> formal dispute
    gross, bank_share, covered = decision_engine.compute_rbi_compensation(75000.0)
    assert covered is False
    assert gross == 0.0
    assert bank_share == 0.0
    print("PASS: test_rbi_jan_2027_liability_calculation")


def test_intercept_scenario_call_coercion():
    # Scenario 1: Urgent Call Coercion
    payload = {
        "transaction_id": "TXN_TEST_COERCION_001",
        "timestamp": "2026-09-11T13:45:12.104Z",
        "payer": {
            "account_id": "ACC_HDFC_9182310293",
            "vpa": "victim.user@okhdfcbank",
            "phone": "+919876543210",
            "device_id": "DEV_TEST_01"
        },
        "payee": {
            "account_id": "ACC_CANARA_0921829102",
            "vpa": "fast.verify.services@okaxis",
            "ifsc": "CNRB0001928"
        },
        "amount_inr": 42500.00,
        "currency": "INR",
        "telemetry": {
            "active_call": True,
            "call_duration_seconds": 1840,
            "call_ended_seconds_ago": None,
            "screen_share_active": False,
            "accessibility_service_enabled": False,
            "typing_speed_wpm": 84.0,
            "typing_jitter_ms": 142.0,
            "is_new_payee_for_payer": True,
            "transactions_in_last_10m": 1
        }
    }

    start = time.perf_counter()
    response = client.post("/api/v1/intercept", json=payload)
    duration_ms = (time.perf_counter() - start) * 1000.0

    assert response.status_code == 200
    data = response.json()
    assert data["decision"] in ["SOFT_HOLD", "BLOCK"]
    assert data["risk_assessment"]["fraud_probability"] > 0.60
    assert data["friction_protocol"]["action"] in ["15_MIN_COOLING_HOLD", "IMMEDIATE_DEBIT_BLOCK"]
    # SLA Check: must process in < 45ms
    assert data["latency_ms"] < 45.0, f"SLA exceeded: {data['latency_ms']}ms"
    print(f"PASS: test_intercept_scenario_call_coercion (Latency: {data['latency_ms']}ms, Target: <45ms)")


def test_intercept_scenario_legitimate_transfer():
    # Scenario 5: Legitimate Baseline Transfer
    payload = {
        "transaction_id": "TXN_TEST_BENIGN_002",
        "timestamp": "2026-09-11T13:45:12.104Z",
        "payer": {
            "account_id": "ACC_HDFC_9182310293",
            "vpa": "user.sharma@okhdfcbank",
            "phone": "+919876543210",
            "device_id": "DEV_TEST_01"
        },
        "payee": {
            "account_id": "ACC_KNOWN_MERCHANT",
            "vpa": "trusted.groceries@okicici",
            "ifsc": "ICIC0000102"
        },
        "amount_inr": 850.00,
        "currency": "INR",
        "telemetry": {
            "active_call": False,
            "call_duration_seconds": 0,
            "call_ended_seconds_ago": None,
            "screen_share_active": False,
            "accessibility_service_enabled": False,
            "typing_speed_wpm": 42.0,
            "typing_jitter_ms": 28.0,
            "is_new_payee_for_payer": False,
            "transactions_in_last_10m": 0
        }
    }

    response = client.post("/api/v1/intercept", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "APPROVE"
    assert data["risk_assessment"]["fraud_probability"] < 0.20
    assert data["friction_protocol"]["action"] == "SETTLE_IMMEDIATELY"
    assert data["latency_ms"] < 45.0
    print(f"PASS: test_intercept_scenario_legitimate_transfer (Latency: {data['latency_ms']}ms)")


def test_cryptographic_audit_ledger_integrity():
    # Verify valid chain
    response = client.get("/api/v1/audit/verify-chain")
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["chain_length"] >= 3  # Genesis + 2 test transactions
    assert data["tampered_index"] is None
    print(f"PASS: test_cryptographic_audit_ledger_integrity (Verified {data['chain_length']} blocks in {data['verification_duration_ms']}ms)")


def test_pareto_slider_update():
    response = client.post("/api/v1/pareto/update", json={"alpha": 0.85})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["current_alpha"] == 0.85
    print("PASS: test_pareto_slider_update")


def test_mule_cluster_graph():
    response = client.get("/api/v1/graph/mule-cluster")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert data["total_nodes"] > 0
    print(f"PASS: test_mule_cluster_graph ({data['total_nodes']} nodes, {data['total_edges']} edges)")


def test_database_persistence_and_rehydration():
    from backend.app.db.session import SessionLocal
    from backend.app.db.models import AuditBlockModel, GraphEdgeModel, CoolingHoldModel
    from backend.app.engines.audit import CryptographicAuditLedger
    from backend.app.engines.graph import MuleGraphEngine

    db = SessionLocal()
    try:
        # Check that blocks are written to SQLite
        persisted_blocks_count = db.query(AuditBlockModel).count()
        assert persisted_blocks_count >= 3, f"Expected >= 3 blocks in DB, found {persisted_blocks_count}"

        # Check that edges are written to SQLite
        persisted_edges_count = db.query(GraphEdgeModel).count()
        assert persisted_edges_count >= 2, f"Expected >= 2 edges in DB, found {persisted_edges_count}"

        # Simulate engine restart: instantiate fresh ledger and graph
        rebooted_ledger = CryptographicAuditLedger()
        assert len(rebooted_ledger._chain) == persisted_blocks_count
        reboot_verify = rebooted_ledger.verify_chain()
        assert reboot_verify.is_valid is True, "Rebooted audit ledger chain verification failed"

        rebooted_graph = MuleGraphEngine()
        assert rebooted_graph.graph.number_of_edges() >= persisted_edges_count

        print(f"PASS: test_database_persistence_and_rehydration ({persisted_blocks_count} blocks, {persisted_edges_count} edges verified across simulated reboot)")
    finally:
        db.close()


def test_cooling_hold_lifecycle():
    from backend.app.db.session import SessionLocal
    from backend.app.db.models import CoolingHoldModel

    txn_id = "TXN_TEST_COOLING_HOLD_001"
    # Seed an ACTIVE_HOLD record in SQLite to test the reauth settlement lifecycle
    db = SessionLocal()
    try:
        db.merge(
            CoolingHoldModel(
                transaction_id=txn_id,
                status="ACTIVE_HOLD",
                created_at="2026-09-11T12:00:00Z",
                expires_at="2026-09-11T12:15:00Z",
                payer_hash="hash_payer",
                payee_hash="hash_payee",
                amount_inr=15000.0,
            )
        )
        db.commit()
        hold = db.query(CoolingHoldModel).filter_by(transaction_id=txn_id).first()
        assert hold is not None, f"Hold record for {txn_id} not found in DB"
        assert hold.status == "ACTIVE_HOLD"
    finally:
        db.close()

    # Step-Up Reauth: User confirms without active call -> SETTLED
    reauth_payload = {
        "transaction_id": txn_id,
        "reauth_passed": True,
        "active_call_present": False,
    }
    reauth_res = client.post("/api/v1/cooling/reauth", json=reauth_payload)
    assert reauth_res.status_code == 200
    res_data = reauth_res.json()
    assert res_data["status"] == "SETTLED"
    assert res_data["action"] == "RELEASE_FUNDS"

    # Confirm DB status updated to SETTLED
    db = SessionLocal()
    try:
        hold_after = db.query(CoolingHoldModel).filter_by(transaction_id=txn_id).first()
        assert hold_after.status == "SETTLED"
        assert hold_after.reauth_passed is True
        print(f"PASS: test_cooling_hold_lifecycle ({txn_id} successfully transitioned from ACTIVE_HOLD to SETTLED)")
    finally:
        db.close()


if __name__ == "__main__":
    test_health_probe()
    test_rbi_jan_2027_liability_calculation()
    test_intercept_scenario_call_coercion()
    test_intercept_scenario_legitimate_transfer()
    test_cryptographic_audit_ledger_integrity()
    test_pareto_slider_update()
    test_mule_cluster_graph()
    test_database_persistence_and_rehydration()
    test_cooling_hold_lifecycle()
    print("\nALL BACKEND & PERSISTENCE SUITE TESTS PASSED!")

