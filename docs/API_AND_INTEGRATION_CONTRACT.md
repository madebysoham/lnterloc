# Interloc API & Team Integration Contract

## 1. Overview & Purpose

This document defines the strict **API and Data Contract** across all four modular domains of the Interloc project. By locking these schemas and routes in documentation before implementation:
* **Frontend (Mintu)** knows the exact JSON schemas and TypeScript interfaces to build UI components without waiting for the live backend.
* **ML (Avrajyoti)** knows the exact 7-feature input tensor and output SHAP attribution dictionary required by the switch.
* **Red-Team (Animesh)** knows the exact API payloads and structuring attack sequences to benchmark catch-rate improvements.
* **Backend (Soham)** has the canonical schema specification to implement in FastAPI.

---

## 2. API Routes Specification

All endpoints run on the core interceptor service (`PORT=8000` by default):

| HTTP Method | Route | Purpose | Latency Target | Consumer |
|---|---|---|---|---|
| `GET` | `/healthz` | Switch liveness and SLA status check | < 2ms | Switch / Health Monitors |
| `GET` | `/metrics` | Prometheus-compatible telemetry metrics | < 5ms | DevOps / Grafana |
| `POST` | `/api/v1/intercept` | Core in-flight transaction evaluation | < 45ms | Switch Hook / Frontend Phone Simulator |
| `GET` | `/api/v1/audit/verify-chain` | Cryptographic SHA-256 hash chain verification | < 15ms | Compliance / Audit Console |
| `POST` | `/api/v1/mock/i4c/lien-dispatch` | Simulated national cybercrime portal webhook | < 10ms | Internal Interceptor / Red-Team |

---

## 3. Core Endpoint: `POST /api/v1/intercept`

### 3.1. Inbound Request Schema (JSON)

This payload is emitted by the UPI Switch hook or the Split-Screen Phone Simulator:

```json
{
  "transaction_id": "TXN_UPI_20260911_8941203",
  "timestamp": "2026-09-11T13:45:12.104Z",
  "payer": {
    "account_id": "ACC_HDFC_9182310293",
    "vpa": "user.sharma@okhdfcbank",
    "phone": "+919876543210",
    "device_id": "DEV_SAMSUNG_S24_F1920A"
  },
  "payee": {
    "account_id": "ACC_CANARA_0921829102",
    "vpa": "fast.verify.services@okaxis",
    "ifsc": "CNRB0001928"
  },
  "amount_inr": 42500.00,
  "currency": "INR",
  "telemetry": {
    "active_call": true,
    "call_duration_seconds": 1840,
    "call_ended_seconds_ago": null,
    "screen_share_active": false,
    "accessibility_service_enabled": false,
    "typing_speed_wpm": 84.0,
    "typing_jitter_ms": 142.0,
    "is_new_payee_for_payer": true,
    "transactions_in_last_10m": 1
  }
}
```

#### Field Definitions:
* `transaction_id` (string): Unique identifier for the payment attempt.
* `payer.vpa` & `payer.phone` (string): Raw identifiers, hashed via salted SHA-256 before logging.
* `amount_inr` (float): Transfer amount in Indian Rupees.
* `telemetry.active_call` (bool): True if mobile telephony or VoIP call is active during PIN entry.
* `telemetry.call_duration_seconds` (int): Duration of call preceding payment intent.
* `telemetry.call_ended_seconds_ago` (int, optional): If call ended right before checkout, seconds since disconnect.
* `telemetry.screen_share_active` (bool): True if remote desktop or screen mirroring utility is active.
* `telemetry.typing_jitter_ms` (float): Millisecond variance between keystrokes on PIN entry pad.
* `telemetry.is_new_payee_for_payer` (bool): True if payee VPA is not in payer's multi-month transaction history.

---

### 3.2. Outbound Interception Response Schema (JSON)

Returned in `<45ms` to dictate whether the payment clears, enters cooling hold, or blocks:

```json
{
  "transaction_id": "TXN_UPI_20260911_8941203",
  "latency_ms": 34.2,
  "decision": "SOFT_HOLD",
  "risk_assessment": {
    "fraud_probability": 0.8650,
    "coercion_index": 0.8900,
    "mule_network_index": 0.7400,
    "shap_attributions": {
      "prolonged_active_voice_call": 0.3800,
      "new_beneficiary_high_amount": 0.2450,
      "payee_in_degree_velocity_burst": 0.1800,
      "typing_hesitation_jitter": 0.0600
    }
  },
  "mule_chain_projection": {
    "predicted_hop_depth": 3,
    "recoverability_at_t0": 0.8865,
    "estimated_recoverability_now": 0.6420,
    "liquidity_at_risk_inr": 42500.00,
    "estimated_irrecoverable_inr": 15215.00
  },
  "expected_cost_matrix": {
    "cost_approve_inr": 3154.20,
    "cost_hold_inr": 185.00,
    "cost_block_inr": 450.00,
    "optimal_action": "SOFT_HOLD",
    "rbi_compensation_covered": true,
    "bank_direct_liability_inr": 5325.25
  },
  "friction_protocol": {
    "action": "15_MIN_COOLING_HOLD",
    "cooling_expiry": "2026-09-11T14:00:12.104Z",
    "required_reauth": "OUT_OF_BAND_BIOMETRIC_OR_TRUSTED_CONTACT",
    "concurrent_attempt_rule": "ATOMIC_QUEUE_LOCK"
  },
  "audit_trail": {
    "record_index": 10482,
    "previous_hash": "c592b2d4918e97a296068e59fa264e1c210d7eb276632fa55490a02ef89196b6",
    "current_hash": "7d9b4b0805a5e3f32c3f15c7e11244e8bb48291f0927eb7b686d06e2fa672153"
  }
}
```

---

## 4. Frontend Developer Contract (For Mintu)

### 4.1. TypeScript Interface Definitions

Mintu can paste these directly into `frontend/types/api.ts`:

```typescript
export interface PayerInfo {
  account_id: string;
  vpa: string;
  phone: string;
  device_id: string;
}

export interface PayeeInfo {
  account_id: string;
  vpa: string;
  ifsc: string;
}

export interface TelemetryData {
  active_call: boolean;
  call_duration_seconds: number;
  call_ended_seconds_ago?: number | null;
  screen_share_active: boolean;
  accessibility_service_enabled: boolean;
  typing_speed_wpm: number;
  typing_jitter_ms: number;
  is_new_payee_for_payer: boolean;
  transactions_in_last_10m: number;
}

export interface InterceptRequest {
  transaction_id: string;
  timestamp: string;
  payer: PayerInfo;
  payee: PayeeInfo;
  amount_inr: number;
  currency: string;
  telemetry: TelemetryData;
}

export interface RiskAssessment {
  fraud_probability: number;
  coercion_index: number;
  mule_network_index: number;
  shap_attributions: Record<string, number>;
}

export interface MuleChainProjection {
  predicted_hop_depth: number;
  recoverability_at_t0: number;
  estimated_recoverability_now: number;
  liquidity_at_risk_inr: number;
  estimated_irrecoverable_inr: number;
}

export interface ExpectedCostMatrix {
  cost_approve_inr: number;
  cost_hold_inr: number;
  cost_block_inr: number;
  optimal_action: "APPROVE" | "SOFT_HOLD" | "BLOCK";
  rbi_compensation_covered: boolean;
  bank_direct_liability_inr: number;
}

export interface FrictionProtocol {
  action: "SETTLE_IMMEDIATELY" | "15_MIN_COOLING_HOLD" | "IMMEDIATE_DEBIT_BLOCK";
  cooling_expiry?: string | null;
  required_reauth: string;
  concurrent_attempt_rule: string;
}

export interface AuditTrailRecord {
  record_index: number;
  previous_hash: string;
  current_hash: string;
}

export interface InterceptResponse {
  transaction_id: string;
  latency_ms: number;
  decision: "APPROVE" | "SOFT_HOLD" | "BLOCK";
  risk_assessment: RiskAssessment;
  mule_chain_projection: MuleChainProjection;
  expected_cost_matrix: ExpectedCostMatrix;
  friction_protocol: FrictionProtocol;
  audit_trail: AuditTrailRecord;
}
```

### 4.2. UI State Transition Logic
* **If `decision === "APPROVE"`**:
  - Phone Screen: Green success checkmark ("Payment Sent").
  - War-Room Console: Transaction row flashes green badge.
* **If `decision === "SOFT_HOLD"`**:
  - Phone Screen: Amber banner with 15-minute countdown modal:
    *"Notice: Active call detected with an unverified party. Payment placed on cooling hold under RBI guidelines."*
  - War-Room Console: Transaction row flashes amber badge, renders 3-hop mule path and SHAP breakdown card.
* **If `decision === "BLOCK"`**:
  - Phone Screen: Red error screen ("Payment Halted for Account Security").
  - War-Room Console: Red alert badge, triggers Kill-Switch cascade animation, and displays dispatched I4C lien beacon.

### 4.3. Environment & Deployment Target
* **Public Domain**: `https://interloc.eclipseindia.xyz` (Vercel)
* **Backend Switch Endpoint**: `NEXT_PUBLIC_API_URL`
  - Local Dev: `http://localhost:8000`
  - Production / Cloud: In-flight decision engine switch service URL

---

## 5. Machine Learning Contract (For Avrajyoti)

### 5.1. Input Feature Vector
The model training script in `ml/training/` must train against these exact 7 features:

| Feature Name | Type | Range / Description | Missing Default |
|---|---|---|---|
| `amount_inr` | float | 10.0 to 100,000.0 | 0.0 |
| `active_call` | int | 0 (No) or 1 (Yes) | 0 |
| `call_duration_seconds` | int | 0 to 7200 seconds | 0 |
| `screen_share_active` | int | 0 (No) or 1 (Yes) | 0 |
| `typing_jitter_ms` | float | 10.0 to 500.0 ms | 60.0 |
| `is_new_payee` | int | 0 (Known contact) or 1 (New) | 0 |
| `velocity_10m` | int | 1 to 20 transactions in last 10m | 1 |

### 5.2. Model Output & Export
* **Output 1**: `fraud_probability` (float between `0.0` and `1.0`).
* **Output 2**: `shap_attributions` (dict mapping feature names to numerical contribution weights).
* **Export Target**: Must save to `ml/saved_models/fraud_model.joblib`.

---

## 6. Adversarial Red-Team Contract (For Animesh)

### 6.1. Attack Payloads to Inject
Animesh's test runner in `redteam/attacks/` tests three attack vectors:

1. **Structuring Evasion (Smurfing)**:
   - Injects sequential transactions structured below 10,000 INR:
     `[TXN_1: 9900 INR, TXN_2: 9850 INR, TXN_3: 9920 INR, TXN_4: 9800 INR]` sent within a 6-minute window.
   - **Expected Result**: Intercepts on Transaction #2 when rolling cumulative volume crosses 19,700 INR.
2. **False Baseline Priming**:
   - Injects three legitimate-looking 10 INR transfers before launching a 45,000 INR fraud attempt.
3. **Delayed Trigger Burst**:
   - Injects rapid dormancy-to-burst transfers on newly opened accounts.

### 6.2. Benchmark Output Schema
Animesh's scripts in `redteam/benchmarks/` compile the Spec #8 catch-rate uplift table:

```json
{
  "total_trials": 1000,
  "standard_rules_detected": 284,
  "interloc_detected": 936,
  "catch_rate_improvement_percent": 65.2,
  "average_switch_latency_ms": 31.8
}
```
