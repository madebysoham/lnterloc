/**
 * Central API & Environment Configuration for Interloc Frontend.
 *
 * Automatically falls back to local development switch on port 8000
 * if NEXT_PUBLIC_API_URL is not defined in the environment.
 */

export const API_BASE_URL: string =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

// Standard Switch Endpoints matching docs/API_AND_INTEGRATION_CONTRACT.md
export const ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  METRICS: `${API_BASE_URL}/metrics`,
  INTERCEPT: `${API_BASE_URL}/api/v1/intercept`,
  STREAM_DECISIONS: `${API_BASE_URL}/api/v1/stream/decisions`,
  MULE_CLUSTER: `${API_BASE_URL}/api/v1/graph/mule-cluster`,
  LOCKED_NODES: `${API_BASE_URL}/api/v1/graph/locked-nodes`,
  COOLING_REAUTH: `${API_BASE_URL}/api/v1/cooling/reauth`,
  PARETO_UPDATE: `${API_BASE_URL}/api/v1/pareto/update`,
  SCENARIOS: `${API_BASE_URL}/api/v1/scenarios`,
  AUDIT_RECORDS: `${API_BASE_URL}/api/v1/audit/records`,
  AUDIT_VERIFY: `${API_BASE_URL}/api/v1/audit/verify-chain`,
  MOCK_LIEN: `${API_BASE_URL}/api/v1/mock/i4c/lien-dispatch`,
} as const;

export interface BackendInterceptPayload {
  transaction_id: string;
  timestamp: string;
  payer: {
    account_id: string;
    vpa: string;
    phone: string;
    device_id: string;
  };
  payee: {
    account_id: string;
    vpa: string;
    ifsc: string;
  };
  amount_inr: number;
  currency: string;
  telemetry: {
    active_call: boolean;
    call_duration_seconds: number;
    call_ended_seconds_ago: number | null;
    screen_share_active: boolean;
    accessibility_service_enabled: boolean;
    typing_speed_wpm: number;
    typing_jitter_ms: number;
    is_new_payee_for_payer: boolean;
    transactions_in_last_10m: number;
  };
}

export interface BackendInterceptResult {
  transaction_id: string;
  latency_ms: number;
  decision: "APPROVE" | "SOFT_HOLD" | "BLOCK";
  risk_assessment: {
    fraud_probability: number;
    coercion_index: number;
    mule_network_index: number;
    shap_attributions: Record<string, number>;
  };
  mule_chain_projection?: {
    predicted_hop_depth: number;
    recoverability_at_t0: number;
    estimated_recoverability_now: number;
  };
  friction_protocol?: {
    recommended_action: string;
    cooling_period_minutes: number;
    warning_message: string;
  };
  audit_trail?: {
    record_index: number;
    block_hash: string;
    previous_hash: string;
  };
}

/**
 * Executes sub-45ms in-flight transaction evaluation against the Interloc Switch.
 * Automatically falls back to null if switch is unreachable.
 */
export async function sendInterceptionRequest(
  payload: BackendInterceptPayload,
  timeoutMs: number = 2500
): Promise<BackendInterceptResult | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(ENDPOINTS.INTERCEPT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      return null;
    }

    const data: BackendInterceptResult = await res.json();
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Verifies the integrity of the cryptographic SHA-256 decision ledger.
 */
export async function verifyAuditLedger(): Promise<{
  is_valid: boolean;
  total_blocks_verified: number;
  root_genesis_hash?: string;
  latest_block_hash?: string;
} | null> {
  try {
    const res = await fetch(ENDPOINTS.AUDIT_VERIFY, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches cryptographic audit records from the backend SQLite database.
 */
export async function fetchAuditRecords(limit: number = 30): Promise<Array<{
  index: number;
  timestamp: string;
  transaction_id: string;
  decision: string;
  fraud_probability: number;
  amount_inr: number;
  shap_summary: Record<string, number>;
  previous_hash: string;
  current_hash: string;
}> | null> {
  try {
    const res = await fetch(`${ENDPOINTS.AUDIT_RECORDS}?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}


