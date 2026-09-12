"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./RecentReplacements.module.css";
import { ExternalLink, ShieldAlert, CheckCircle2, Loader2, Filter } from "lucide-react";
import { fetchAuditRecords } from "@/lib/config";

export type TransferMode = "UPI" | "IMPS" | "RTGS" | "NEFT";
export type TransferFilter = "ALL" | "HEALTHY" | "FRAUD";

export interface CashTransferItem {
  id: string;
  txid: string;
  mode: TransferMode;
  modeChannel: string;
  sourceBank: string;
  destBank: string;
  networkSwitch: string;
  health: "PENDING..." | "HEALTHY" | "FRAUD DETECTED";
  subStatus: string;
  isNew?: boolean;
  timestamp: number;
  recipient: string;
  amount: number;
  refId: string;
  riskReason?: string;
}

// Generate realistic fresh transactions initialized with current timestamps
export const getFreshInitialDemoTransfers = (): CashTransferItem[] => {
  const now = Date.now();
  return [
    {
      id: "tx-demo-1",
      txid: "5e31...534a",
      mode: "UPI",
      modeChannel: "Instant P2P",
      sourceBank: "HDFC",
      destBank: "ICICI",
      networkSwitch: "FastSwitch",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 30 * 1000,
      recipient: "Aarav Sharma",
      amount: 500,
      refId: "ECL-9182-UPI",
      riskReason: "Trusted Frequent Contact",
    },
    {
      id: "tx-demo-2",
      txid: "2eec...acbf",
      mode: "UPI",
      modeChannel: "QR Pay",
      sourceBank: "SBI",
      destBank: "Yes Bank",
      networkSwitch: "Interbank",
      health: "FRAUD DETECTED",
      subStatus: "Bank Intercept",
      timestamp: now - 85 * 1000,
      recipient: "Flagged Account #92",
      amount: 49500,
      refId: "ECL-4412-FLAG",
      riskReason: "High-Velocity Bank Anomaly",
    },
    {
      id: "tx-demo-3",
      txid: "b304...7fc0",
      mode: "IMPS",
      modeChannel: "24x7 Direct",
      sourceBank: "Axis",
      destBank: "Kotak",
      networkSwitch: "Clearing Hub",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 140 * 1000,
      recipient: "Priya Patel",
      amount: 12400,
      refId: "ECL-3321-IMPS",
      riskReason: "Verified Trust Contact",
    },
    {
      id: "tx-demo-4",
      txid: "ff2c...b8c0",
      mode: "IMPS",
      modeChannel: "High Velocity",
      sourceBank: "ICICI",
      destBank: "Canara",
      networkSwitch: "IMPS Switch",
      health: "FRAUD DETECTED",
      subStatus: "Bank Intercept",
      timestamp: now - 210 * 1000,
      recipient: "Quarantine Intercept Node",
      amount: 145000,
      refId: "ECL-8871-HOLD",
      riskReason: "Rapid Multi-Bank Hop Anomaly",
    },
    {
      id: "tx-demo-5",
      txid: "91d1...25ec",
      mode: "UPI",
      modeChannel: "Utility BBPS",
      sourceBank: "HDFC",
      destBank: "SBI",
      networkSwitch: "BBPS Switch",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 280 * 1000,
      recipient: "Bescom Power Utility",
      amount: 2840,
      refId: "ECL-7734-BILL",
      riskReason: "Whitelisted Utility Provider",
    },
    {
      id: "tx-demo-6",
      txid: "0636...0e1b",
      mode: "RTGS",
      modeChannel: "Gross Settlement",
      sourceBank: "SBI",
      destBank: "HDFC",
      networkSwitch: "Core Bank",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 360 * 1000,
      recipient: "Ananya Iyer",
      amount: 280000,
      refId: "ECL-1049-RTGS",
      riskReason: "Institutional RTGS Clearing",
    },
    {
      id: "tx-demo-7",
      txid: "a3f9...c12d",
      mode: "NEFT",
      modeChannel: "Batch Settlement",
      sourceBank: "Kotak",
      destBank: "Axis",
      networkSwitch: "NEFT Grid",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 450 * 1000,
      recipient: "Rohan Mehta",
      amount: 75000,
      refId: "ECL-5511-NEFT",
      riskReason: "Verified Payroll Transfer",
    },
    {
      id: "tx-demo-8",
      txid: "d72b...88fe",
      mode: "UPI",
      modeChannel: "P2M Payment",
      sourceBank: "ICICI",
      destBank: "Paytm",
      networkSwitch: "UPI Switch",
      health: "FRAUD DETECTED",
      subStatus: "Cooling Hold",
      timestamp: now - 540 * 1000,
      recipient: "Flagged Account #17",
      amount: 9800,
      refId: "ECL-2209-HOLD",
      riskReason: "Behavioural Spike – 3 New Devices",
    },
    {
      id: "tx-demo-9",
      txid: "7c4e...33ba",
      mode: "IMPS",
      modeChannel: "Round-the-Clock",
      sourceBank: "Yes Bank",
      destBank: "HDFC",
      networkSwitch: "Clearing Hub",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 620 * 1000,
      recipient: "Sneha Roy",
      amount: 18500,
      refId: "ECL-6612-IMPS",
      riskReason: "Recurring Trusted Transfer",
    },
    {
      id: "tx-demo-10",
      txid: "1b9f...4401",
      mode: "RTGS",
      modeChannel: "Gross Settlement",
      sourceBank: "HDFC",
      destBank: "SBI",
      networkSwitch: "RBI Core",
      health: "FRAUD DETECTED",
      subStatus: "Bank Intercept",
      timestamp: now - 720 * 1000,
      recipient: "Quarantine Intercept Node",
      amount: 499000,
      refId: "ECL-9901-RTGS",
      riskReason: "Structuring Pattern – Mule Layer 1",
    },
    {
      id: "tx-demo-11",
      txid: "e551...f909",
      mode: "UPI",
      modeChannel: "Instant P2P",
      sourceBank: "Canara",
      destBank: "Union Bank",
      networkSwitch: "FastSwitch",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 820 * 1000,
      recipient: "Vikram Nair",
      amount: 3200,
      refId: "ECL-4490-UPI",
      riskReason: "Low-Risk Retail Transfer",
    },
    {
      id: "tx-demo-12",
      txid: "6c88...a5b1",
      mode: "NEFT",
      modeChannel: "Batch Settlement",
      sourceBank: "Axis",
      destBank: "ICICI",
      networkSwitch: "NEFT Grid",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 930 * 1000,
      recipient: "Apollo Health Services",
      amount: 58000,
      refId: "ECL-8821-NEFT",
      riskReason: "Whitelisted Healthcare Provider",
    },
    {
      id: "tx-demo-13",
      txid: "3da4...c770",
      mode: "UPI",
      modeChannel: "QR Pay",
      sourceBank: "Kotak",
      destBank: "SBI",
      networkSwitch: "UPI Switch",
      health: "FRAUD DETECTED",
      subStatus: "Bank Intercept",
      timestamp: now - 1050 * 1000,
      recipient: "Flagged Account #44",
      amount: 22000,
      refId: "ECL-3312-FLAG",
      riskReason: "New Beneficiary + Night-Hour Spike",
    },
    {
      id: "tx-demo-14",
      txid: "99ab...d2e3",
      mode: "IMPS",
      modeChannel: "24x7 Direct",
      sourceBank: "SBI",
      destBank: "Kotak",
      networkSwitch: "IMPS Switch",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 1180 * 1000,
      recipient: "Zomato Merchant Payout",
      amount: 6750,
      refId: "ECL-7722-IMPS",
      riskReason: "Whitelisted Merchant",
    },
    {
      id: "tx-demo-15",
      txid: "f1cc...b39d",
      mode: "RTGS",
      modeChannel: "Gross Settlement",
      sourceBank: "ICICI",
      destBank: "HDFC",
      networkSwitch: "Core Bank",
      health: "HEALTHY",
      subStatus: "Clean Verified",
      timestamp: now - 1320 * 1000,
      recipient: "HDFC Corporate Treasury",
      amount: 1200000,
      refId: "ECL-4419-RTGS",
      riskReason: "Institutional Treasury Settlement",
    },
  ];
};

// Generates an authentic, truncated 64-bit Hex transaction identifier
function generateHexTxid(seed?: string): string {
  const hex = "0123456789abcdef";
  let hash = "";
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      hash += hex[(seed.charCodeAt(i) * 7) % hex.length];
    }
  }
  while (hash.length < 10) {
    hash += hex[Math.floor(Math.random() * hex.length)];
  }
  return `${hash.slice(0, 4)}...${hash.slice(hash.length - 4)}`;
}

// Maps cryptographic SQLite audit ledger records to UI CashTransferItem model
function convertAuditRecordToTransferItem(record: {
  index: number;
  timestamp: string;
  transaction_id: string;
  decision: string;
  fraud_probability: number;
  amount_inr: number;
  shap_summary?: Record<string, number>;
  previous_hash: string;
  current_hash: string;
}): CashTransferItem {
  const isRisk = record.decision !== "APPROVE";
  const mode: TransferMode =
    record.amount_inr >= 200000 ? "RTGS" : record.amount_inr >= 50000 ? "IMPS" : "UPI";
  const channel =
    mode === "RTGS" ? "Gross Settlement" : mode === "IMPS" ? "24x7 Direct" : "Instant P2P";
  const hash = record.current_hash || "";
  const txid =
    hash.length >= 8
      ? `${hash.slice(0, 4)}...${hash.slice(-4)}`
      : record.transaction_id.slice(0, 10);

  let recipient = "Aarav Sharma";
  if (record.decision === "BLOCK") {
    recipient = "Flagged Account #92";
  } else if (record.decision === "SOFT_HOLD") {
    recipient = "Quarantine Intercept Node";
  } else if (record.amount_inr > 150000) {
    recipient = "Ananya Iyer";
  } else if (record.amount_inr > 10000) {
    recipient = "Priya Patel";
  }

  let subStatus = "Clean Verified";
  if (record.decision === "BLOCK") {
    subStatus = "Bank Intercept";
  } else if (record.decision === "SOFT_HOLD") {
    subStatus = "Cooling Hold";
  }

  let riskReason = "Verified Clean Transfer";
  if (record.decision === "BLOCK") {
    riskReason = `Autonomous Coercion Guard (p=${record.fraud_probability.toFixed(2)})`;
  } else if (record.decision === "SOFT_HOLD") {
    riskReason = "RBI Jan 2027 15-Minute Cooling Hold";
  }

  return {
    id: `audit-${record.index}-${record.transaction_id}`,
    txid: txid,
    mode: mode,
    modeChannel: channel,
    sourceBank: "HDFC",
    destBank: isRisk ? "Yes Bank" : "ICICI",
    networkSwitch: "FastSwitch",
    health: isRisk ? "FRAUD DETECTED" : "HEALTHY",
    subStatus: subStatus,
    timestamp: new Date(record.timestamp).getTime() || Date.now(),
    recipient: recipient,
    amount: record.amount_inr,
    refId: record.transaction_id,
    riskReason: riskReason,
  };
}

export const RecentReplacements: React.FC = () => {
  const [transfers, setTransfers] = useState<CashTransferItem[]>(getFreshInitialDemoTransfers());
  const [activeFilter, setActiveFilter] = useState<TransferFilter>("ALL");
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Load real cryptographic audit records from backend SQLite database on mount
  useEffect(() => {
    let isMounted = true;
    fetchAuditRecords(30).then((records) => {
      if (!isMounted || !records || records.length === 0) return;
      // Filter out block 0 (Genesis root block)
      const validRecords = records.filter((r) => r.index > 0 && r.amount_inr > 0);
      if (validRecords.length > 0) {
        const dbTransfers = validRecords.map(convertAuditRecordToTransferItem);
        setTransfers(dbTransfers);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Ingestion Buffer Ref for grouping transfers that arrive within 1 second
  const incomingBufferRef = useRef<
    Array<{
      amount: number;
      recipientName: string;
      isRisk: boolean;
      refId?: string;
      mode?: TransferMode;
    }>
  >([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply batch of cash transfers atomically (Max limit 6 per patch)
  const applyTransferBatch = useCallback(
    (
      batchItems: Array<{
        amount: number;
        recipientName: string;
        isRisk: boolean;
        refId?: string;
        mode?: TransferMode;
      }>
    ) => {
      if (!batchItems || batchItems.length === 0) return;
      const safeBatch = batchItems.slice(0, 6); // Hard limit 6 per patch
      const now = Date.now();

      const newPendingTransfers: CashTransferItem[] = safeBatch.map((item, idx) => {
        const detectedMode: TransferMode =
          item.mode ||
          (item.amount >= 200000 ? "RTGS" : item.amount >= 50000 ? "IMPS" : "UPI");
        const channelLabel =
          detectedMode === "RTGS"
            ? "Gross"
            : detectedMode === "NEFT"
            ? "Batch"
            : detectedMode === "IMPS"
            ? "24x7"
            : "Instant";

        const txUniqueId = `tx-send-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
        const destBankLabel = item.isRisk ? "Yes Bank" : "ICICI";
        const switchLabel = "FastSwitch";

        return {
          id: txUniqueId,
          txid: generateHexTxid(item.refId || `ECL-${item.amount}-${idx}`),
          mode: detectedMode,
          modeChannel: channelLabel,
          sourceBank: "HDFC",
          destBank: destBankLabel,
          networkSwitch: switchLabel,
          health: "PENDING...",
          subStatus: "Routing Switch...",
          isNew: true,
          timestamp: now,
          recipient: item.recipientName,
          amount: item.amount,
          refId: item.refId || `ECL-${now}-${idx}`,
          riskReason: "In-flight AI Routing Heuristics",
        };
      });

      // Prepend whole batch in a single state update (atomic render)
      setTransfers((prev) => [
        ...newPendingTransfers,
        ...prev.slice(0, Math.max(0, 48 - newPendingTransfers.length)),
      ]);

      // Asynchronously resolve all items in this batch
      const batchIdsMap = new Map(
        newPendingTransfers.map((p, i) => [p.id, safeBatch[i].isRisk])
      );
      const resolveDelay = 1100 + Math.floor(Math.random() * 400);

      setTimeout(() => {
        setTransfers((current) =>
          current.map((item) => {
            if (batchIdsMap.has(item.id)) {
              const isRisk = batchIdsMap.get(item.id);
              return {
                ...item,
                health: isRisk ? "FRAUD DETECTED" : "HEALTHY",
                destBank: isRisk ? "Yes Bank" : "ICICI",
                networkSwitch: "FastSwitch",
                subStatus: isRisk ? "Bank Intercept" : "Clean Verified",
                riskReason: isRisk
                  ? "High-Risk Beneficiary Anomaly"
                  : "Verified Historical Trust",
              };
            }
            return item;
          })
        );
      }, resolveDelay);
    },
    []
  );

  // Listen for batch releases, single transactions & reset-stream events
  useEffect(() => {
    // Flush buffered transfers in a single batch (3 or 5, up to 6 per patch)
    const flushBuffer = () => {
      if (incomingBufferRef.current.length === 0) return;
      const batchToProcess = incomingBufferRef.current.splice(0, 6);
      applyTransferBatch(batchToProcess);

      if (incomingBufferRef.current.length > 0) {
        flushTimerRef.current = setTimeout(flushBuffer, 300);
      }
    };

    // Single incoming transaction: accumulate within 1s window; if 3 arrive within 1s, flush immediately
    const handleNewTx = (event: Event) => {
      const customEvent = event as CustomEvent<{
        amount: number;
        recipientName: string;
        isRisk: boolean;
        refId?: string;
        mode?: TransferMode;
      }>;
      if (!customEvent.detail) return;

      incomingBufferRef.current.push(customEvent.detail);

      // If 3 or more arrive within 1 second, batch them together and update immediately without individual renders
      if (incomingBufferRef.current.length >= 3) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushBuffer();
      } else if (!flushTimerRef.current) {
        // Release whatever arrived at the end of the 1-second cadence
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushBuffer();
        }, 1000);
      }
    };

    // Atomic Batch Event: Apply 3, 5, or up to 6 items directly in one update
    const handleBatchTx = (event: Event) => {
      const customEvent = event as CustomEvent<{
        items: Array<{
          amount: number;
          recipientName: string;
          isRisk: boolean;
          refId?: string;
          mode?: TransferMode;
        }>;
      }>;
      if (!customEvent.detail || !customEvent.detail.items) return;

      const combined = [...incomingBufferRef.current, ...customEvent.detail.items];
      incomingBufferRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      applyTransferBatch(combined.slice(0, 6));
    };

    // When Developer Mode is disabled, refresh transfers list back to database records or baseline
    const handleResetStream = () => {
      incomingBufferRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      fetchAuditRecords(30).then((records) => {
        if (records && records.length > 0) {
          const validRecords = records.filter((r) => r.index > 0 && r.amount_inr > 0);
          if (validRecords.length > 0) {
            setTransfers(validRecords.map(convertAuditRecordToTransferItem));
            return;
          }
        }
        setTransfers(getFreshInitialDemoTransfers());
      });
    };

    if (typeof window !== "undefined") {
      window.addEventListener("eclipse:new-transaction", handleNewTx);
      window.addEventListener("eclipse:new-transaction-batch", handleBatchTx);
      window.addEventListener("eclipse:reset-stream", handleResetStream);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("eclipse:new-transaction", handleNewTx);
        window.removeEventListener("eclipse:new-transaction-batch", handleBatchTx);
        window.removeEventListener("eclipse:reset-stream", handleResetStream);
      }
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
    };
  }, [applyTransferBatch]);

  // 15-Minute Sliding Window: Auto-evict ephemeral transfers older than 15 minutes while preserving audit ledger records
  useEffect(() => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const evictionTimer = setInterval(() => {
      const cutoff = Date.now() - FIFTEEN_MINUTES_MS;
      setTransfers((prev) => {
        const active = prev.filter(
          (item) => item.timestamp >= cutoff || item.id.startsWith("audit-")
        );
        if (active.length !== prev.length) {
          return active;
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(evictionTimer);
  }, []);

  const formatRupee = (num: number) => {
    return "₹" + num.toLocaleString("en-IN");
  };

  const healthyCount = transfers.filter((t) => t.health === "HEALTHY").length;
  const fraudCount = transfers.filter((t) => t.health === "FRAUD DETECTED").length;

  const displayTransfers = transfers.filter((item) => {
    if (activeFilter === "HEALTHY") {
      return item.health === "HEALTHY";
    }
    if (activeFilter === "FRAUD") {
      return item.health === "FRAUD DETECTED";
    }
    return true;
  });

  return (
    <div className={styles.replacementCardContainer}>
      {/* Header Area with Title & Filter Controls */}
      <div className={styles.headerArea}>
        <div className={styles.headerTopRow}>
          <a
            href="#transfers"
            className={styles.titleLink}
            onClick={(e) => e.preventDefault()}
          >
            <span>Recent Cash Transfers</span>
            <ExternalLink size={14} className={styles.extIcon} />
          </a>

          {/* Transaction Filter Buttons */}
          <div className={styles.filterPills}>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeFilter === "ALL" ? styles.filterActiveAll : ""}`}
              onClick={() => setActiveFilter("ALL")}
              title="Show all transfers"
            >
              <span>All</span>
              <span className={styles.filterCountBadge}>{transfers.length}</span>
            </button>

            <button
              type="button"
              className={`${styles.filterBtn} ${styles.filterHealthy} ${activeFilter === "HEALTHY" ? styles.filterActiveHealthy : ""}`}
              onClick={() => setActiveFilter("HEALTHY")}
              title="Filter verified healthy transfers"
            >
              <CheckCircle2 size={11} strokeWidth={2.4} />
              <span>Healthy</span>
              <span className={styles.filterCountBadge}>{healthyCount}</span>
            </button>

            <button
              type="button"
              className={`${styles.filterBtn} ${styles.filterFraud} ${activeFilter === "FRAUD" ? styles.filterActiveFraud : ""}`}
              onClick={() => setActiveFilter("FRAUD")}
              title="Filter fraud detected transfers"
            >
              <ShieldAlert size={11} strokeWidth={2.4} />
              <span>Fraud</span>
              <span className={styles.filterCountBadge}>{fraudCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Table Content Container */}
      <div className={styles.tableWrapper} ref={tableWrapperRef}>
        <table className={styles.replacementsTable}>
          <thead>
            <tr>
              <th className={styles.thTxid}>TXID</th>
              <th className={styles.thMode}>Mode</th>
              <th className={styles.thRoute}>Bank Route</th>
              <th className={styles.thStatus}>Status</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {displayTransfers.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyFilteredTd}>
                  <div className={styles.emptyFilteredBox}>
                    <Filter size={18} className={styles.emptyFilterIcon} />
                    <p className={styles.emptyFilterText}>
                      No {activeFilter === "HEALTHY" ? "healthy" : "fraudulent"} transactions in the active window
                    </p>
                    <button
                      type="button"
                      className={styles.resetFilterBtn}
                      onClick={() => setActiveFilter("ALL")}
                    >
                      Show All ({transfers.length})
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              displayTransfers.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(
                        new CustomEvent("eclipse:inspect-transaction", { detail: item })
                      );
                    }
                  }}
                  title="Click to trace full transaction pipeline flow"
                  className={`${styles.tableRow} ${
                    item.health === "FRAUD DETECTED"
                      ? styles.rowFraud
                      : item.health === "PENDING..."
                      ? styles.rowPending
                      : ""
                  } ${item.isNew ? styles.rowSlideIn : ""}`}
                >
                  {/* TXID Column with Payee & Amount */}
                  <td className={styles.tdTxid}>
                    <div className={styles.txidGroup}>
                      <span
                        className={styles.txidLink}
                        title={`Ref: ${item.refId} • ${item.riskReason}`}
                      >
                        {item.txid}
                      </span>
                      <div className={styles.txidMeta}>
                        <span className={styles.txidRecipient}>{item.recipient}</span>
                        <span className={styles.txidDot}>•</span>
                        <span className={styles.txidAmount}>{formatRupee(item.amount)}</span>
                      </div>
                    </div>
                  </td>

                  {/* Transfer Mode Column (UPI, IMPS, RTGS, NEFT) */}
                  <td className={styles.tdMode}>
                    <div className={styles.modeGroup}>
                      <span className={`${styles.modeBadge} ${styles[`modeBadge_${item.mode}`]}`}>
                        {item.mode}
                      </span>
                      <span className={styles.modeChannel}>{item.modeChannel}</span>
                    </div>
                  </td>

                  {/* Bank Route Column (e.g. HDFC ➔ ICICI + Switch) */}
                  <td className={styles.tdRoute}>
                    <div className={styles.routeGroup}>
                      {item.health === "PENDING..." ? (
                        <span className={styles.routeEvaluating}>
                          <Loader2 size={11} className={styles.spinIcon} />
                          Routing Switch...
                        </span>
                      ) : (
                        <>
                          <div className={styles.routePath}>
                            <span className={styles.bankSource}>{item.sourceBank}</span>
                            <span className={styles.routeArrow}>➔</span>
                            <span className={styles.bankDest}>{item.destBank}</span>
                          </div>
                          <span className={styles.networkSwitch}>
                            {item.networkSwitch}
                          </span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Status / Health Badge */}
                  <td className={styles.tdStatus}>
                    <div className={styles.badgeContainer}>
                      {item.health === "PENDING..." ? (
                        <span className={styles.badgePending}>
                          <Loader2 size={11} className={styles.spinIcon} />
                          ROUTING
                        </span>
                      ) : item.health === "FRAUD DETECTED" ? (
                        <span className={styles.badgeFraud}>
                          <ShieldAlert size={11} strokeWidth={2.4} />
                          FRAUD HOLD
                        </span>
                      ) : (
                        <span className={styles.badgeHealthy}>
                          <CheckCircle2 size={11} strokeWidth={2.4} />
                          HEALTHY
                        </span>
                      )}
                      <span className={styles.subRbfType}>{item.subStatus}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
