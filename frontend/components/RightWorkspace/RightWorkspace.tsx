"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./RightWorkspace.module.css";
import { VolumeTreemap } from "@/components/VolumeTreemap/VolumeTreemap";
import { RecentReplacements, TransferMode, CashTransferItem } from "@/components/RecentReplacements/RecentReplacements";
import { TransactionFlowChart } from "@/components/TransactionFlowChart/TransactionFlowChart";
import {
  Activity,
  Cpu,
  ShieldAlert,
  Zap,
  TrendingUp,
  Play,
  Pause,
  Sliders,
  Sparkles,
} from "lucide-react";
import { ENDPOINTS } from "@/lib/config";

interface DevSimItem {
  name: string;
  baseAmount: number;
  mode: TransferMode;
  isRisk: boolean;
  channel: string;
  sourceBank: string;
  destBank: string;
  riskReason?: string;
}

const DEV_SIMULATION_POOL: DevSimItem[] = [
  // Retail Instant UPI (₹180 - ₹4,800)
  {
    name: "Aarav Sharma (SBI Direct)",
    baseAmount: 450,
    mode: "UPI",
    isRisk: false,
    channel: "Instant P2P",
    sourceBank: "SBI",
    destBank: "ICICI Bank",
  },
  {
    name: "Priya Patel (Freelance UI)",
    baseAmount: 2400,
    mode: "UPI",
    isRisk: false,
    channel: "Instant P2P",
    sourceBank: "HDFC Bank",
    destBank: "Axis Bank",
  },
  {
    name: "Bescom Bengaluru Power",
    baseAmount: 1820,
    mode: "UPI",
    isRisk: false,
    channel: "Utility BBPS",
    sourceBank: "Kotak Bank",
    destBank: "Canara Bank",
  },
  {
    name: "Apollo Pharmacy BBPS",
    baseAmount: 890,
    mode: "UPI",
    isRisk: false,
    channel: "Healthcare BBPS",
    sourceBank: "ICICI Bank",
    destBank: "HDFC Bank",
  },
  {
    name: "Zomato Partner Payout",
    baseAmount: 3650,
    mode: "UPI",
    isRisk: false,
    channel: "Gig Economy Settlement",
    sourceBank: "HDFC Bank",
    destBank: "SBI",
  },
  {
    name: "JioFiber Auto-Debit",
    baseAmount: 1199,
    mode: "UPI",
    isRisk: false,
    channel: "Subscription Mandate",
    sourceBank: "Axis Bank",
    destBank: "ICICI Bank",
  },
  {
    name: "Ananya Iyer (Escrow Share)",
    baseAmount: 4500,
    mode: "UPI",
    isRisk: false,
    channel: "Direct Escrow",
    sourceBank: "SBI",
    destBank: "HDFC Bank",
  },
  {
    name: "Chai Point Quick Pay",
    baseAmount: 180,
    mode: "UPI",
    isRisk: false,
    channel: "QR Merchant Pay",
    sourceBank: "Kotak Bank",
    destBank: "Axis Bank",
  },
  {
    name: "Amazon India Retails",
    baseAmount: 3240,
    mode: "UPI",
    isRisk: false,
    channel: "E-Commerce Gateway",
    sourceBank: "HDFC Bank",
    destBank: "ICICI Bank",
  },

  // Commercial / Payroll / Merchant IMPS & NEFT (₹18,000 - ₹95,000)
  {
    name: "Swiggy Merchant Settlement",
    baseAmount: 64800,
    mode: "IMPS",
    isRisk: false,
    channel: "Immediate 24x7",
    sourceBank: "HDFC Bank",
    destBank: "Kotak Bank",
  },
  {
    name: "Tata Power Commercial Clearing",
    baseAmount: 78500,
    mode: "NEFT",
    isRisk: false,
    channel: "Batch Clearing",
    sourceBank: "SBI",
    destBank: "Axis Bank",
  },
  {
    name: "Infosys Tech Services Batch",
    baseAmount: 89200,
    mode: "IMPS",
    isRisk: false,
    channel: "Corporate Payroll",
    sourceBank: "ICICI Bank",
    destBank: "HDFC Bank",
  },
  {
    name: "Flipkart Logistics Hub",
    baseAmount: 52400,
    mode: "IMPS",
    isRisk: false,
    channel: "Merchant Settlement",
    sourceBank: "Kotak Bank",
    destBank: "Canara Bank",
  },
  {
    name: "Reliance Retail POS Gateway",
    baseAmount: 48900,
    mode: "NEFT",
    isRisk: false,
    channel: "Commercial POS",
    sourceBank: "ICICI Bank",
    destBank: "SBI",
  },
  {
    name: "Canara Bank Vendor Clearing",
    baseAmount: 38150,
    mode: "IMPS",
    isRisk: false,
    channel: "Vendor Clearing",
    sourceBank: "Canara Bank",
    destBank: "Axis Bank",
  },
  {
    name: "IDFC First Partner Clearing",
    baseAmount: 24500,
    mode: "IMPS",
    isRisk: false,
    channel: "Service Partner Clearing",
    sourceBank: "IDFC First Bank",
    destBank: "Kotak Bank",
  },

  // High-Value Interbank RTGS (₹1,50,000 - ₹6,50,000)
  {
    name: "HDFC Corporate Treasury Clearing",
    baseAmount: 485000,
    mode: "RTGS",
    isRisk: false,
    channel: "Gross Settlement",
    sourceBank: "HDFC Bank",
    destBank: "Reserve Bank Switch",
  },
  {
    name: "SBI Bulk Clearing Hub",
    baseAmount: 360000,
    mode: "RTGS",
    isRisk: false,
    channel: "Interbank Gross Settlement",
    sourceBank: "SBI",
    destBank: "Axis Bank",
  },
  {
    name: "Kotak Institutional Escrow",
    baseAmount: 290000,
    mode: "RTGS",
    isRisk: false,
    channel: "Institutional Escrow",
    sourceBank: "Kotak Bank",
    destBank: "ICICI Bank",
  },
  {
    name: "Razorpay NPCI Wholesale Batch",
    baseAmount: 240000,
    mode: "RTGS",
    isRisk: false,
    channel: "Wholesale Gateway",
    sourceBank: "HDFC Bank",
    destBank: "SBI",
  },
  {
    name: "Axis Liquidity Pool Settlement",
    baseAmount: 520000,
    mode: "RTGS",
    isRisk: false,
    channel: "Gross Settlement",
    sourceBank: "Axis Bank",
    destBank: "HDFC Bank",
  },

  // Flagged Suspicious Banking Intercepts (~18% of stream)
  {
    name: "Yes Bank Flagged Acc #92",
    baseAmount: 49500,
    mode: "IMPS",
    isRisk: true,
    channel: "High Velocity Anomaly",
    sourceBank: "SBI",
    destBank: "Yes Bank",
    riskReason: "High-Velocity Multi-Bank Anomaly",
  },
  {
    name: "Rapid Multi-Bank Velocity Spike",
    baseAmount: 145000,
    mode: "RTGS",
    isRisk: true,
    channel: "Rapid Branch Hop",
    sourceBank: "ICICI Bank",
    destBank: "Canara Bank",
    riskReason: "Rapid Interbank Velocity Spike",
  },
  {
    name: "Unauthorized Branch Burst",
    baseAmount: 34500,
    mode: "IMPS",
    isRisk: true,
    channel: "Burst Velocity",
    sourceBank: "Kotak Bank",
    destBank: "Yes Bank",
    riskReason: "Rapid Multi-Branch Velocity",
  },
  {
    name: "High-Risk Account Anomaly #401",
    baseAmount: 19800,
    mode: "IMPS",
    isRisk: true,
    channel: "Interbank Fanout",
    sourceBank: "HDFC Bank",
    destBank: "IndusInd Bank",
    riskReason: "Suspicious Interbank Fanout",
  },
  {
    name: "High-Velocity Bank Anomaly #88",
    baseAmount: 210000,
    mode: "RTGS",
    isRisk: true,
    channel: "Quarantine Route",
    sourceBank: "Axis Bank",
    destBank: "Yes Bank",
    riskReason: "High-Velocity Bank Anomaly",
  },
];

interface RightWorkspaceProps {
  isDevMode?: boolean;
  messagesPerSec?: number;
  riskRatio?: number;
}

export const RightWorkspace: React.FC<RightWorkspaceProps> = ({
  isDevMode = false,
  messagesPerSec = 3,
  riskRatio = 18,
}) => {
  const [txCount, setTxCount] = useState<number>(0);
  const [inspectedTransaction, setInspectedTransaction] = useState<CashTransferItem | null>(null);

  // Dynamic Telemetry Metrics synced with transactions
  const [totalMonitoredAmount, setTotalMonitoredAmount] = useState<number>(3245000);
  const [totalStreamNodes, setTotalStreamNodes] = useState<number>(134);
  const [flaggedCount, setFlaggedCount] = useState<number>(8);
  const [liveLatency, setLiveLatency] = useState<number>(14);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Separate normal vs risky templates for accurate riskRatio injection
  const normalPool = useMemo(() => DEV_SIMULATION_POOL.filter((item) => !item.isRisk), []);
  const riskPool = useMemo(() => DEV_SIMULATION_POOL.filter((item) => item.isRisk), []);

  // Generate realistic banking transaction payload
  const generateSingleTxData = useCallback(() => {
    const shouldBeRisk = Math.random() * 100 < riskRatio;
    const targetPool = shouldBeRisk && riskPool.length > 0 ? riskPool : normalPool;

    const randomIndex = Math.floor(Math.random() * targetPool.length);
    const template = targetPool[randomIndex];

    // Jitter amount by ±7% so each transaction is unique
    const jitterFactor = 0.93 + Math.random() * 0.14;
    const computedAmount = Math.round(template.baseAmount * jitterFactor);
    const refCode = `ECL-${Math.floor(1000 + Math.random() * 9000)}-${
      template.isRisk ? "HOLD" : "TX"
    }`;

    return {
      amount: computedAmount,
      recipientName: template.name,
      isRisk: template.isRisk,
      refId: refCode,
      mode: template.mode,
    };
  }, [normalPool, riskPool, riskRatio]);

  // Connect to live backend decision feed via Server-Sent Events (SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource(ENDPOINTS.STREAM_DECISIONS);
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.transaction_id) {
            const isRisk = data.decision !== "APPROVE";
            const amt = data.audit_trail?.amount_inr || 18500;
            setTotalMonitoredAmount((prev) => prev + amt);
            setTotalStreamNodes((prev) => prev + 1);
            if (isRisk) {
              setFlaggedCount((prev) => prev + 1);
            }
            if (data.latency_ms) {
              setLiveLatency(Math.round(data.latency_ms));
            }
          }
        } catch {
          // ignore keepalive parse error
        }
      };
      es.onerror = () => {
        if (es) es.close();
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  // Dispatch batch of transactions (batches of 3, 5, capped at max 6 per patch)
  const dispatchBatchTransactions = useCallback(
    (count: number) => {
      const batchSize = Math.min(Math.max(1, count), 6); // Max 6 per patch
      const batchItems = Array.from({ length: batchSize }).map(() => generateSingleTxData());

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("eclipse:new-transaction-batch", {
            detail: {
              items: batchItems,
            },
          })
        );
      }

      const totalBatchAmount = batchItems.reduce((acc, it) => acc + it.amount, 0);
      const totalBatchRisk = batchItems.filter((it) => it.isRisk).length;

      setTotalMonitoredAmount((prev) => prev + totalBatchAmount);
      setTotalStreamNodes((prev) => prev + batchItems.length);
      if (totalBatchRisk > 0) {
        setFlaggedCount((prev) => prev + totalBatchRisk);
      }
      setTxCount((prev) => prev + batchItems.length);
    },
    [generateSingleTxData]
  );

  // Listen for all new transactions, inspections & reset-stream events to keep top telemetry KPIs synced
  useEffect(() => {
    const handleTxUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        amount: number;
        recipientName: string;
        isRisk: boolean;
        latency_ms?: number;
      }>;
      if (!customEvent.detail) return;
      const { amount, isRisk, latency_ms } = customEvent.detail;

      setTotalMonitoredAmount((prev) => prev + amount);
      setTotalStreamNodes((prev) => prev + 1);
      if (isRisk) {
        setFlaggedCount((prev) => prev + 1);
      }
      if (latency_ms) {
        setLiveLatency(Math.round(latency_ms));
      }
    };

    const handleInspectTransaction = (event: Event) => {
      const customEvent = event as CustomEvent<CashTransferItem>;
      if (customEvent.detail) {
        setInspectedTransaction(customEvent.detail);
      }
    };

    const handleResetStream = () => {
      setTotalMonitoredAmount(3245000);
      setTotalStreamNodes(134);
      setFlaggedCount(8);
      setTxCount(0);
      setInspectedTransaction(null);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("eclipse:new-transaction", handleTxUpdate);
      window.addEventListener("eclipse:inspect-transaction", handleInspectTransaction);
      window.addEventListener("eclipse:reset-stream", handleResetStream);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("eclipse:new-transaction", handleTxUpdate);
        window.removeEventListener("eclipse:inspect-transaction", handleInspectTransaction);
        window.removeEventListener("eclipse:reset-stream", handleResetStream);
      }
    };
  }, []);

  // Developer Mode Configurable Batch Transaction Generator
  useEffect(() => {
    if (!isDevMode) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTotalMonitoredAmount(3245000);
      setTotalStreamNodes(134);
      setFlaggedCount(8);
      setTxCount(0);
      return;
    }

    // Determine batch size (default: 3 or 5 per second, maximum limit 6 per patch)
    const batchSize = Math.min(Math.max(1, messagesPerSec), 6);

    // Initial instant batch upon start
    dispatchBatchTransactions(batchSize);

    // Release transactions in batches every 1 second
    timerRef.current = setInterval(() => {
      dispatchBatchTransactions(batchSize);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isDevMode, messagesPerSec, dispatchBatchTransactions]);

  const formatLakh = (num: number) => {
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    const valInLakh = num / 100000;
    return `₹${valInLakh.toFixed(2)} Lakh`;
  };

  const formatRupee = (num: number) => {
    return "₹" + num.toLocaleString("en-IN");
  };

  // Full-Page Transaction Flow Chart Inspector View (Matches 2nd Reference Image)
  if (inspectedTransaction) {
    return (
      <div className={styles.workspaceContainer}>
        <TransactionFlowChart
          transaction={inspectedTransaction}
          onBack={() => setInspectedTransaction(null)}
        />
      </div>
    );
  }

  return (
    <div className={styles.workspaceContainer}>
      {/* Workspace Top Telemetry Bar */}
      <div className={styles.workspaceHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.canvasTag}>WORKSPACE CANVAS</span>
          <span className={styles.headerTitle}>Fraud Interceptor & Real-Time Flow Tracer</span>
        </div>

        <div className={styles.headerRight}>
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            PIPELINE: ACTIVE
          </span>
          <span>•</span>
          <span>LATENCY: {liveLatency}ms</span>
        </div>
      </div>

      {/* Main Workspace Scroll Area */}
      <div className={styles.workspaceScrollArea}>
        {/* Top Telemetry KPI Row */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>15-MIN MONITORED VOLUME</span>
              <div className={styles.kpiIconBox}>
                <TrendingUp size={14} color="#0284c7" />
              </div>
            </div>
            <div className={styles.kpiValue}>{formatLakh(totalMonitoredAmount)}</div>
            <div className={styles.kpiSub}>{totalStreamNodes} nodes • 15m window</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>INTERCEPTION ACCURACY</span>
              <div className={styles.kpiIconBox}>
                <Zap size={14} color="#16a34a" />
              </div>
            </div>
            <div className={styles.kpiValue}>99.6%</div>
            <div className={styles.kpiSub}>Multi-signal behavioral fusion</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>FLAGGED ANOMALIES</span>
              <div className={styles.kpiIconBox}>
                <ShieldAlert size={14} color="#e11d48" />
              </div>
            </div>
            <div className={styles.kpiValue} style={{ color: "#e11d48" }}>
              {flaggedCount} Nodes
            </div>
            <div className={styles.kpiSub}>Soft-held in bank quarantine</div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>SIMULATION STATUS</span>
              <div className={styles.kpiIconBox}>
                <Cpu
                  size={14}
                  color={!isDevMode ? "#8b5cf6" : "#16a34a"}
                />
              </div>
            </div>
            <div
              className={styles.kpiValue}
              style={{
                color: !isDevMode ? "#0f172a" : "#16a34a",
              }}
            >
              {!isDevMode ? "Standby" : "Streaming"}
            </div>
            <div className={styles.kpiSub}>
              {!isDevMode
                ? "Developer Mode ready"
                : `${txCount} generated in stream`}
            </div>
          </div>
        </div>

        {/* Dashboard Dual Grid: Compact Square Volume Treemap + Recent Replacements Live Feed */}
        <div className={styles.dashboardTwoColGrid}>
          {/* Module 1: Square Box Volume Treemap Component */}
          <div className={styles.moduleCard}>
            <VolumeTreemap />
          </div>

          {/* Module 2: Live Recent Replacements Component */}
          <div className={styles.moduleCard}>
            <RecentReplacements />
          </div>
        </div>

        {/* Bottom Quick Fusion Signals Pill Row */}
        <div className={styles.metricsPillRow}>
          <span className={styles.pillItem}>
            <Activity size={12} style={{ verticalAlign: "middle", marginRight: 5, color: "#0284c7" }} />
            Live In-Flight Interceptor
          </span>
          <span className={styles.pillItem}>
            <Cpu size={12} style={{ verticalAlign: "middle", marginRight: 5, color: "#16a34a" }} />
            Dynamic Volume Treemap Fusion
          </span>
          <span className={styles.pillItem}>
            <ShieldAlert size={12} style={{ verticalAlign: "middle", marginRight: 5, color: "#e11d48" }} />
            Live Cash Transfer Stream
          </span>
          <span className={styles.pillItem}>
            <Sliders
              size={12}
              style={{
                verticalAlign: "middle",
                marginRight: 5,
                color: !isDevMode ? "#64748b" : "#16a34a",
              }}
            />
            Dev Mode: {!isDevMode ? "Off" : "Streaming"}
          </span>
        </div>
      </div>
    </div>
  );
};

