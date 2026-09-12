"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import styles from "./VolumeTreemap.module.css";
import { Layers, ShieldAlert } from "lucide-react";

export interface RawTransactionItem {
  id: string;
  name: string;
  amount: number;
  type: "high-value" | "commercial" | "retail" | "flagged" | "warning";
  category: string;
  account: string;
  riskScore: number;
  time: string;
  timestamp: number;
  isNew?: boolean;
}

export interface ComputedTreemapNode extends RawTransactionItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Generate staggered initial bank transactions populated within a rolling 15-minute window (0 - 14 mins ago)
export function getFreshInitialTransactions(): RawTransactionItem[] {
  const now = Date.now();
  return [
    {
      id: "tx-1",
      name: "HDFC Treasury Settlement",
      amount: 485000,
      type: "high-value",
      category: "Interbank Settlement",
      account: "9820491024",
      riskScore: 8,
      time: "2m ago",
      timestamp: now - 2 * 60 * 1000,
    },
    {
      id: "tx-2",
      name: "Axis Corporate Clearing",
      amount: 360000,
      type: "high-value",
      category: "Corporate Payroll",
      account: "9820882190",
      riskScore: 5,
      time: "3m ago",
      timestamp: now - 3 * 60 * 1000 - 20000,
    },
    {
      id: "tx-3",
      name: "Kotak Institutional Clearing",
      amount: 290000,
      type: "high-value",
      category: "Commercial Clearing",
      account: "9820176421",
      riskScore: 12,
      time: "4m ago",
      timestamp: now - 4 * 60 * 1000 - 15000,
    },
  {
    id: "tx-4",
    name: "Razorpay NPCI Gateway",
    amount: 240000,
    type: "high-value",
    category: "Aggregator Batch",
    account: "9820339182",
    riskScore: 9,
    time: "5m ago",
    timestamp: now - 5 * 60 * 1000,
  },
  {
    id: "tx-5",
    name: "Yes Bank Intercept #92",
    amount: 210000,
    type: "flagged",
    category: "High-Velocity Bank Anomaly",
    account: "9820993012",
    riskScore: 94,
    time: "6m ago",
    timestamp: now - 6 * 60 * 1000 - 30000,
  },
  {
    id: "tx-6",
    name: "IndusInd Direct Clearing",
    amount: 185000,
    type: "high-value",
    category: "Personal Wealth Routing",
    account: "9820541129",
    riskScore: 4,
    time: "7m ago",
    timestamp: now - 7 * 60 * 1000,
  },
  {
    id: "tx-7",
    name: "SBI Corporate Settlement",
    amount: 165000,
    type: "high-value",
    category: "Utility Infrastructure",
    account: "9820612093",
    riskScore: 3,
    time: "7m ago",
    timestamp: now - 7 * 60 * 1000 - 45000,
  },
  {
    id: "tx-8",
    name: "Suspicious Multi-Bank Fanout",
    amount: 145000,
    type: "flagged",
    category: "Rapid Multi-Bank Hop",
    account: "9820771940",
    riskScore: 92,
    time: "8m ago",
    timestamp: now - 8 * 60 * 1000,
  },
  {
    id: "tx-9",
    name: "Ananya Iyer (ICICI Escrow)",
    amount: 69887,
    type: "commercial",
    category: "Direct P2P Escrow",
    account: "9820128491",
    riskScore: 6,
    time: "9m ago",
    timestamp: now - 9 * 60 * 1000,
  },
  {
    id: "tx-10",
    name: "HDFC Securities Clearing",
    amount: 62192,
    type: "commercial",
    category: "Equity Depository",
    account: "9820491822",
    riskScore: 2,
    time: "9m ago",
    timestamp: now - 9 * 60 * 1000 - 30000,
  },
  {
    id: "tx-11",
    name: "Zomato Partner Payout",
    amount: 61805,
    type: "commercial",
    category: "Gig Economy Settlement",
    account: "9820339180",
    riskScore: 4,
    time: "10m ago",
    timestamp: now - 10 * 60 * 1000,
  },
  {
    id: "tx-12",
    name: "Aarav Sharma (SBI Direct)",
    amount: 54081,
    type: "commercial",
    category: "Verified Trust Contact",
    account: "9821362190",
    riskScore: 3,
    time: "11m ago",
    timestamp: now - 11 * 60 * 1000,
  },
  {
    id: "tx-13",
    name: "Flipkart Logistics (Kotak)",
    amount: 51490,
    type: "commercial",
    category: "Merchant Settlement",
    account: "9820551029",
    riskScore: 5,
    time: "11m ago",
    timestamp: now - 11 * 60 * 1000 - 45000,
  },
  {
    id: "tx-14",
    name: "Reliance Retail (ICICI)",
    amount: 49831,
    type: "commercial",
    category: "Commercial POS",
    account: "9820664910",
    riskScore: 4,
    time: "12m ago",
    timestamp: now - 12 * 60 * 1000,
  },
  {
    id: "tx-15",
    name: "PhonePe NPCI FastSwitch",
    amount: 47964,
    type: "warning",
    category: "High-Frequency Velocity",
    account: "9820773011",
    riskScore: 78,
    time: "12m ago",
    timestamp: now - 12 * 60 * 1000 - 30000,
  },
  {
    id: "tx-16",
    name: "Canara Bank Vendor Clearing",
    amount: 38157,
    type: "commercial",
    category: "Vendor Clearing",
    account: "9820884912",
    riskScore: 3,
    time: "13m ago",
    timestamp: now - 13 * 60 * 1000,
  },
  {
    id: "tx-17",
    name: "Punjab National Bank Hub",
    amount: 36648,
    type: "commercial",
    category: "Courier Settlement",
    account: "9820991823",
    riskScore: 4,
    time: "13m ago",
    timestamp: now - 13 * 60 * 1000 - 20000,
  },
  {
    id: "tx-18",
    name: "Unauthorized Cross-Bank Burst",
    amount: 34500,
    type: "warning",
    category: "Rapid Multi-Branch Velocity",
    account: "9820114920",
    riskScore: 82,
    time: "13m ago",
    timestamp: now - 13 * 60 * 1000 - 40000,
  },
  {
    id: "tx-19",
    name: "Union Bank Merchant Clearing",
    amount: 28400,
    type: "commercial",
    category: "E-Commerce Clearing",
    account: "9820223910",
    riskScore: 3,
    time: "14m ago",
    timestamp: now - 14 * 60 * 1000,
  },
  {
    id: "tx-20",
    name: "IDFC First Partner Clearing",
    amount: 24500,
    type: "commercial",
    category: "Service Partner Clearing",
    account: "9820334810",
    riskScore: 2,
    time: "14m ago",
    timestamp: now - 14 * 60 * 1000 - 15000,
  },
  {
    id: "tx-21",
    name: "Federal Bank Commerce Hub",
    amount: 20891,
    type: "commercial",
    category: "Fast Commerce Hub",
    account: "9820445912",
    riskScore: 4,
    time: "14m ago",
    timestamp: now - 14 * 60 * 1000 - 30000,
  },
  {
    id: "tx-22",
    name: "Bank of India Mobility Switch",
    amount: 20157,
    type: "commercial",
    category: "Mobility Payout",
    account: "9820556923",
    riskScore: 5,
    time: "14m ago",
    timestamp: now - 14 * 60 * 1000 - 40000,
  },
  {
    id: "tx-23",
    name: "High-Risk Account Anomaly #401",
    amount: 19800,
    type: "flagged",
    category: "Suspicious Interbank Fanout",
    account: "9820667934",
    riskScore: 91,
    time: "14m ago",
    timestamp: now - 14 * 60 * 1000 - 45000,
  },
  {
    id: "tx-24",
    name: "High-Risk Account Anomaly #402",
    amount: 18500,
    type: "flagged",
    category: "Suspicious Interbank Fanout",
    account: "9820778945",
    riskScore: 88,
    time: "14m ago",
    timestamp: now - 14 * 60 * 1000 - 50000,
  },
  // Retail Interbank transfers distributed within 1-14 minutes
  ...Array.from({ length: 16 }).map((_, i) => ({
    id: `retail-${i + 1}`,
    name: `Bank Transfer Node #${100 + i}`,
    amount: Math.floor(1200 + Math.sin(i * 1.5) * 800 + (i % 5) * 350),
    type: (i === 4 || i === 11 ? "flagged" : i === 2 ? "warning" : "retail") as
      | "flagged"
      | "warning"
      | "retail",
    category: i === 4 || i === 11 ? "High-Velocity Probe" : "UPI Interbank Transfer",
    account: `9820${Math.floor(100000 + i * 891)}`,
    riskScore: i === 4 || i === 11 ? 95 : 3,
    time: `${Math.floor(1 + i * 0.8)}m ago`,
    timestamp: now - Math.floor((1 + i * 0.8) * 60 * 1000),
  })),
];
}

/**
 * Steven's Power Law Perceptual Mathematical Scaling:
 * Maps monetary amount (INR) to proportional visual weight:
 * w(A) = A^0.64 + 10.
 * This guarantees:
 * 1. Strict mathematical monotonicity (larger transfers are always larger boxes).
 * 2. Small amounts (₹50, ₹100, ₹500, ₹1,200) generate distinct, clear, interactive, and reactive tiles.
 * 3. Mega whale transfers (₹2L - ₹5L) remain massive anchoring blocks.
 */
function getPerceptualWeight(amount: number): number {
  const clamped = Math.max(1, amount);
  return Math.pow(clamped, 0.64) + 10;
}

/**
 * Mathematical Squarified Treemap Layout (Bruls-Huizing-van Wijk algorithm)
 * Computes exact proportional area based on dynamic perceptual volume weighting
 */
function computeSquarifiedTreemap(
  items: RawTransactionItem[],
  width: number,
  height: number
): ComputedTreemapNode[] {
  if (items.length === 0) return [];

  const totalWeightedValue = items.reduce((sum, item) => sum + getPerceptualWeight(item.amount), 0);
  const totalArea = width * height;

  interface SizedItem {
    item: RawTransactionItem;
    area: number;
  }

  // Sort descending by amount so high volume items anchor first
  const sorted: SizedItem[] = [...items]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      item,
      area: (getPerceptualWeight(item.amount) / totalWeightedValue) * totalArea,
    }));

  const results: ComputedTreemapNode[] = [];

  function worstAspectRatio(row: number[], sideLength: number): number {
    if (row.length === 0 || sideLength === 0) return Infinity;
    const sum = row.reduce((a, b) => a + b, 0);
    if (sum === 0) return Infinity;
    const max = Math.max(...row);
    const min = Math.min(...row);
    const s2 = sum * sum;
    const l2 = sideLength * sideLength;
    return Math.max((l2 * max) / s2, s2 / (l2 * min));
  }

  function layoutRow(
    row: SizedItem[],
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): { nextRx: number; nextRy: number; nextRw: number; nextRh: number } {
    const rowArea = row.reduce((sum, el) => sum + el.area, 0);
    const isHorizontal = rw < rh;
    const side = isHorizontal ? rw : rh;
    const rowWidth = Math.max(0.01, rowArea / side);

    let currentPos = 0;
    for (const el of row) {
      const itemLen = el.area / rowWidth;
      if (isHorizontal) {
        results.push({
          ...el.item,
          x: rx + currentPos,
          y: ry,
          w: itemLen,
          h: rowWidth,
        });
      } else {
        results.push({
          ...el.item,
          x: rx,
          y: ry + currentPos,
          w: rowWidth,
          h: itemLen,
        });
      }
      currentPos += itemLen;
    }

    if (isHorizontal) {
      return {
        nextRx: rx,
        nextRy: ry + rowWidth,
        nextRw: rw,
        nextRh: Math.max(0, rh - rowWidth),
      };
    } else {
      return {
        nextRx: rx + rowWidth,
        nextRy: ry,
        nextRw: Math.max(0, rw - rowWidth),
        nextRh: rh,
      };
    }
  }

  let remaining = [...sorted];
  let curRx = 0;
  let curRy = 0;
  let curRw = width;
  let curRh = height;

  while (remaining.length > 0) {
    const side = Math.min(curRw, curRh);
    if (side <= 0.001) {
      for (const el of remaining) {
        results.push({
          ...el.item,
          x: curRx,
          y: curRy,
          w: 0,
          h: 0,
        });
      }
      break;
    }

    let currentRow: SizedItem[] = [remaining[0]];
    let currentRowAreas: number[] = [remaining[0].area];
    let remainingIdx = 1;

    while (remainingIdx < remaining.length) {
      const candidate = remaining[remainingIdx];
      const nextAreas = [...currentRowAreas, candidate.area];
      if (worstAspectRatio(nextAreas, side) <= worstAspectRatio(currentRowAreas, side)) {
        currentRow.push(candidate);
        currentRowAreas = nextAreas;
        remainingIdx++;
      } else {
        break;
      }
    }

    const { nextRx, nextRy, nextRw, nextRh } = layoutRow(currentRow, curRx, curRy, curRw, curRh);
    curRx = nextRx;
    curRy = nextRy;
    curRw = nextRw;
    curRh = nextRh;
    remaining = remaining.slice(currentRow.length);
  }

  return results;
}

function formatBoxAmount(amt: number): string {
  if (amt >= 10000000) {
    return `₹${(amt / 10000000).toFixed(2)}Cr`;
  }
  if (amt >= 100000) {
    const val = amt / 100000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)}L`;
  }
  if (amt >= 1000) {
    const val = amt / 1000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  }
  return `₹${amt}`;
}

function getNodeFillColor(node: ComputedTreemapNode, isHovered: boolean): string {
  if (node.type === "flagged") {
    return isHovered ? "#f43f5e" : "#be123c"; // Crimson red
  }
  if (node.type === "warning") {
    return isHovered ? "#fb923c" : "#c2410c"; // Warm orange
  }
  if (node.type === "high-value") {
    return isHovered ? "#bef264" : "#4d6b1f"; // Forest green
  }
  if (node.type === "commercial") {
    if (node.amount >= 50000) return isHovered ? "#a3e635" : "#365314";
    return isHovered ? "#4ade80" : "#223e12";
  }
  // Retail transfers (< 10,000)
  if (node.amount >= 2000) return isHovered ? "#86efac" : "#1b3a1a";
  if (node.amount >= 500) return isHovered ? "#6ee7b7" : "#142d16";
  return isHovered ? "#a7f3d0" : "#0d2210";
}

export const VolumeTreemap: React.FC = () => {
  const [transactions, setTransactions] = useState<RawTransactionItem[]>(getFreshInitialTransactions());
  const [activeFilter, setActiveFilter] = useState<"all" | "high-value" | "retail" | "flagged">("all");
  const [hoveredNode, setHoveredNode] = useState<ComputedTreemapNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [lastLiveEvent, setLastLiveEvent] = useState<{
    amount: number;
    recipientName: string;
    isRisk: boolean;
    time: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 15-Minute Rolling Window: Check periodically and auto-evict any transaction older than 15 minutes (900,000 ms)
  useEffect(() => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

    const checkRollingWindowEviction = () => {
      const cutoff = Date.now() - FIFTEEN_MINUTES_MS;
      setTransactions((prev) => {
        const activeInWindow = prev.filter((t) => t.timestamp >= cutoff);
        // Only trigger state update if old items actually aged out
        if (activeInWindow.length !== prev.length) {
          return activeInWindow;
        }
        return prev;
      });
    };

    // Run eviction pass every 3 seconds to keep graph strictly within the 15-minute window
    const evictionTimer = setInterval(checkRollingWindowEviction, 3000);
    return () => clearInterval(evictionTimer);
  }, []);

  // Dynamically compute mathematical squarified treemap dimensions (600x600 viewBox)
  const computedNodes = useMemo(() => {
    return computeSquarifiedTreemap(transactions, 600, 600);
  }, [transactions]);

  const totalVolume = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const top5Dominance = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
    const top5Sum = sorted.slice(0, 5).reduce((sum, t) => sum + t.amount, 0);
    return totalVolume > 0 ? ((top5Sum / totalVolume) * 100).toFixed(1) : "0.0";
  }, [transactions, totalVolume]);

  const flaggedCount = useMemo(() => {
    return transactions.filter((t) => t.type === "flagged" || t.type === "warning").length;
  }, [transactions]);

  // Ingestion Buffer Ref for grouping transactions that arrive within 1 second
  const incomingBufferRef = useRef<
    Array<{
      amount: number;
      recipientName: string;
      isRisk: boolean;
      refId?: string;
      mode?: string;
    }>
  >([]);
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Apply a batch of transactions atomically into the treemap (Capped strictly at max 6 per patch)
  const applyTransactionBatch = useCallback(
    (
      batchItems: Array<{
        amount: number;
        recipientName: string;
        isRisk: boolean;
        refId?: string;
        mode?: string;
      }>
    ) => {
      if (!batchItems || batchItems.length === 0) return;
      const safeBatch = batchItems.slice(0, 6); // Hard limit 6 per patch
      const now = Date.now();

      const newTxList: RawTransactionItem[] = safeBatch.map((item, idx) => {
        const newTxId = `tx-live-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
        const newType: RawTransactionItem["type"] = item.isRisk
          ? "flagged"
          : item.amount >= 100000
          ? "high-value"
          : item.amount >= 10000
          ? "commercial"
          : "retail";

        return {
          id: newTxId,
          name: item.recipientName,
          amount: item.amount,
          type: newType,
          category: item.isRisk ? "Bank Intercept Flag" : `${item.mode || "UPI"} Interbank Transfer`,
          account: item.refId || `ECL-${Math.floor(1000 + Math.random() * 9000)}-TX`,
          riskScore: item.isRisk ? 96 : 4,
          time: "Just now",
          timestamp: now,
          isNew: true,
        };
      });

      // Prepend batch in a single atomic state update
      setTransactions((prev) => [...newTxList, ...prev]);

      // Add all batch IDs to active highlight set simultaneously
      const newBatchIds = newTxList.map((t) => t.id);
      setHighlightedNodeIds((prev) => {
        const next = new Set(prev);
        newBatchIds.forEach((id) => next.add(id));
        return next;
      });

      const totalBatchAmt = newTxList.reduce((acc, t) => acc + t.amount, 0);
      const hasRisk = newTxList.some((t) => t.type === "flagged");

      setLastLiveEvent({
        amount: totalBatchAmt,
        recipientName:
          newTxList.length > 1
            ? `Batch of ${newTxList.length} TXs`
            : newTxList[0].name,
        isRisk: hasRisk,
        time: now,
      });

      // Clear highlights for this batch after 2.5s
      setTimeout(() => {
        setHighlightedNodeIds((prev) => {
          const next = new Set(prev);
          newBatchIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 2500);

      setTimeout(() => {
        setLastLiveEvent((prev) => (prev && Date.now() - prev.time >= 2800 ? null : prev));
      }, 3000);
    },
    []
  );

  // Listen for batch releases, live transactions & reset-stream events
  useEffect(() => {
    // Flush buffered transactions in a single batch (3 or 5, up to 6 per patch)
    const flushBuffer = () => {
      if (incomingBufferRef.current.length === 0) return;
      const batchToProcess = incomingBufferRef.current.splice(0, 6);
      applyTransactionBatch(batchToProcess);

      // If more than 6 arrived, schedule remaining in the next frame
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
        mode?: string;
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

    // Atomic Batch Event: Apply 3, 5, or up to 6 items directly
    const handleBatchTx = (event: Event) => {
      const customEvent = event as CustomEvent<{
        items: Array<{
          amount: number;
          recipientName: string;
          isRisk: boolean;
          refId?: string;
          mode?: string;
        }>;
      }>;
      if (!customEvent.detail || !customEvent.detail.items) return;

      // Also merge any leftover single items in buffer
      const combined = [...incomingBufferRef.current, ...customEvent.detail.items];
      incomingBufferRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      applyTransactionBatch(combined.slice(0, 6));
    };

    // When Developer Mode is disabled, refresh chart back to baseline
    const handleResetStream = () => {
      incomingBufferRef.current = [];
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      setTransactions(getFreshInitialTransactions());
      setHighlightedNodeIds(new Set());
      setLastLiveEvent(null);
      setHoveredNode(null);
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
  }, [applyTransactionBatch]);

  const totalNodesCount = computedNodes.length;

  const formatRupee = (num: number) => {
    return "₹" + num.toLocaleString("en-IN");
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>, node: ComputedTreemapNode) => {
    setTooltipPos({
      x: e.clientX,
      y: e.clientY,
    });
    setHoveredNode(node);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const isNearRightEdge = typeof window !== "undefined" && tooltipPos.x + 290 > window.innerWidth;
  const isNearBottomEdge = typeof window !== "undefined" && tooltipPos.y + 190 > window.innerHeight;

  return (
    <div className={styles.treemapCardContainer} ref={containerRef}>
      {/* 1. Header Bar: Two spacious tiers to ensure zero text cutoff on all screen sizes */}
      <div className={styles.treemapHeader}>
        {/* Tier 1: Title, Window Tag & Live Badge */}
        <div className={styles.headerTopRow}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBadge}>
              <Layers size={14} strokeWidth={2.4} />
            </div>
            <div className={styles.titleRow}>
              <h3 className={styles.mainTitle}>VOLUME HEATMAP</h3>
              <span
                className={styles.windowPill}
                title="15-minute sliding window: transactions automatically age out after 15 minutes"
              >
                15M WINDOW
              </span>
            </div>
          </div>

          <div className={styles.headerRightBadge}>
            {lastLiveEvent ? (
              <span
                className={`${styles.liveStreamBadge} ${
                  lastLiveEvent.isRisk ? styles.liveBadgeRisk : styles.liveBadgeNew
                }`}
              >
                <span className={styles.liveDot} />
                +{formatBoxAmount(lastLiveEvent.amount)}
              </span>
            ) : (
              <span className={styles.liveStreamBadge}>
                <span className={styles.liveDot} />
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Tier 2: Subtitle info & Filter Pills */}
        <div className={styles.headerBottomRow}>
          <p className={styles.subTitle}>
            Proportional matrix • 15m auto-eviction
          </p>

          <div className={styles.filterPills}>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeFilter === "all" ? styles.filterActiveDark : ""}`}
              onClick={() => setActiveFilter("all")}
              title="Show all monitored transactions"
            >
              All ({totalNodesCount})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeFilter === "high-value" ? styles.filterActiveDark : ""}`}
              onClick={() => setActiveFilter("high-value")}
              title="Filter by High Value transfers (≥ ₹1 Lakh)"
            >
              High
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${activeFilter === "retail" ? styles.filterActiveDark : ""}`}
              onClick={() => setActiveFilter("retail")}
              title="Filter by Retail / UPI transfers (< ₹10,000)"
            >
              Retail
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${styles.filterFlagged} ${activeFilter === "flagged" ? styles.filterActiveRed : ""}`}
              onClick={() => setActiveFilter("flagged")}
              title="Filter by Risk Flagged transfers"
            >
              <ShieldAlert size={11} strokeWidth={2.2} />
              Risk ({flaggedCount})
            </button>
          </div>
        </div>
      </div>

      {/* 3. True Square Box Treemap Matrix Canvas (viewBox 0 0 600 600, 1:1 Aspect Ratio) */}
      <div className={styles.matrixWrapper}>
        <svg
          viewBox="0 0 600 600"
          className={styles.treemapSvg}
        >
          {/* Base background */}
          <rect width="600" height="600" fill="#06090d" />

          {computedNodes.map((node) => {
            const isHovered = hoveredNode?.id === node.id;
            const isNewlySent = highlightedNodeIds.has(node.id);
            const isFlaggedNode = node.type === "flagged" || node.type === "warning";
            const isHighValue = node.type === "high-value";
            const isRetailNode = node.type === "retail";

            // Filter opacity
            let opacity = 1;
            if (activeFilter === "high-value" && !isHighValue) opacity = 0.16;
            if (activeFilter === "retail" && !isRetailNode) opacity = 0.14;
            if (activeFilter === "flagged" && !isFlaggedNode) opacity = 0.12;

            const fillColor = getNodeFillColor(node, isHovered);

            return (
              <g
                key={node.id}
                className={styles.tileGroup}
                style={{ opacity, transition: "opacity 0.2s ease" }}
              >
                {/* Mathematically squarified box with dynamic dimensions */}
                <rect
                  x={node.x + 0.5}
                  y={node.y + 0.5}
                  width={Math.max(1, node.w - 1)}
                  height={Math.max(1, node.h - 1)}
                  rx={node.w > 30 ? 1 : 0}
                  fill={fillColor}
                  stroke={
                    isHovered
                      ? "#c6f10e"
                      : isNewlySent
                      ? node.type === "flagged"
                        ? "#f43f5e"
                        : "#c6f10e"
                      : "#06090d"
                  }
                  strokeWidth={isHovered ? 2.5 : isNewlySent ? 3 : 1}
                  className={`${styles.volumeRect} ${isNewlySent ? styles.rectFlash : ""}`}
                  onMouseMove={(e) => handleMouseMove(e, node)}
                  onMouseLeave={handleMouseLeave}
                />

                {/* Amount and Title label in bottom-left corner of each box */}
                {node.w >= 24 && node.h >= 15 && (() => {
                  const padX = node.w >= 90 ? 8 : node.w >= 45 ? 5 : 3.5;
                  const padY = node.h >= 90 ? 8 : node.h >= 45 ? 5 : 3.5;
                  const isLarge = node.w >= 90 && node.h >= 50;

                  if (isLarge) {
                    const amtFontSize = Math.min(18, Math.max(12, node.w / 9));
                    const nameFontSize = Math.min(12, Math.max(9, node.w / 14));
                    return (
                      <g pointerEvents="none" style={{ userSelect: "none" }}>
                        {/* Payee / Node Name on top line */}
                        <text
                          x={node.x + padX}
                          y={node.y + node.h - padY - amtFontSize - 3}
                          textAnchor="start"
                          dominantBaseline="auto"
                          fontSize={nameFontSize}
                          fontWeight="700"
                          fill={node.type === "flagged" ? "#fecdd3" : "rgba(226, 232, 240, 0.85)"}
                          letterSpacing="-0.01em"
                        >
                          {node.name.length > Math.floor(node.w / 7)
                            ? node.name.slice(0, Math.max(4, Math.floor(node.w / 7) - 2)) + "…"
                            : node.name}
                        </text>

                        {/* Amount on bottom line */}
                        <text
                          x={node.x + padX}
                          y={node.y + node.h - padY}
                          textAnchor="start"
                          dominantBaseline="auto"
                          fontSize={amtFontSize}
                          fontWeight="800"
                          fontFamily="var(--font-mono), monospace"
                          fill={isNewlySent ? "#c6f10e" : "#ffffff"}
                        >
                          {formatRupee(node.amount)}
                        </text>
                      </g>
                    );
                  }

                  // Medium / Small box: single bottom-left amount label
                  const fontSize =
                    node.w >= 50 && node.h >= 28
                      ? Math.min(13, Math.max(9, node.w / 6))
                      : Math.min(9.5, Math.max(7, node.h / 2.2));

                  return (
                    <g pointerEvents="none" style={{ userSelect: "none" }}>
                      <text
                        x={node.x + padX}
                        y={node.y + node.h - padY}
                        textAnchor="start"
                        dominantBaseline="auto"
                        fontSize={fontSize}
                        fontWeight="800"
                        fontFamily="var(--font-mono), monospace"
                        fill={isNewlySent ? "#c6f10e" : "#ffffff"}
                      >
                        {formatBoxAmount(node.amount)}
                      </text>
                    </g>
                  );
                })()}

                {/* Beacon highlight ring when newly sent */}
                {isNewlySent && (
                  <rect
                    x={node.x + 0.5}
                    y={node.y + 0.5}
                    width={Math.max(1, node.w - 1)}
                    height={Math.max(1, node.h - 1)}
                    fill="none"
                    stroke={node.type === "flagged" ? "#f43f5e" : "#c6f10e"}
                    strokeWidth={2}
                    className={styles.beaconRing}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 4. Perfectly Structured Floating Tooltip Attached to Cursor Outside the Box */}
      {hoveredNode && (() => {
        const ageMs = Math.max(0, Date.now() - (hoveredNode.timestamp || Date.now()));
        const ageMinutes = Math.floor(ageMs / 60000);
        const ageSeconds = Math.floor((ageMs % 60000) / 1000);
        const remainingMs = Math.max(0, 15 * 60 * 1000 - ageMs);
        const remMinutes = Math.floor(remainingMs / 60000);
        const remSeconds = Math.floor((remainingMs % 60000) / 1000);

        return (
          <div
            className={styles.treemapTooltip}
            style={{
              left: isNearRightEdge ? `${tooltipPos.x - 14}px` : `${tooltipPos.x + 14}px`,
              top: isNearBottomEdge ? `${tooltipPos.y - 12}px` : `${tooltipPos.y + 14}px`,
              transform: `${isNearRightEdge ? "translateX(-100%)" : "translateX(0)"} ${
                isNearBottomEdge ? "translateY(-100%)" : "translateY(0)"
              }`,
            }}
          >
            <div className={styles.tooltipTopRow}>
              <span className={styles.tooltipName}>{hoveredNode.name}</span>
              <span
                className={`${styles.tooltipBadge} ${
                  hoveredNode.type === "flagged"
                    ? styles.badgeFlagged
                    : hoveredNode.type === "warning"
                    ? styles.badgeWarning
                    : hoveredNode.type === "high-value"
                    ? styles.badgeHighValue
                    : hoveredNode.type === "commercial"
                    ? styles.badgeCommercial
                    : styles.badgeSafe
                }`}
              >
                {hoveredNode.type === "flagged"
                  ? "FLAGGED RISK"
                  : hoveredNode.type === "warning"
                  ? "VELOCITY ALERT"
                  : hoveredNode.type === "high-value"
                  ? "HIGH-VALUE CLEARING"
                  : hoveredNode.type === "commercial"
                  ? "COMMERCIAL SETTLEMENT"
                  : "RETAIL TRANSFER"}
              </span>
            </div>

            <div className={styles.tooltipAmtRow}>
              <span className={styles.tooltipAmtVal}>{formatRupee(hoveredNode.amount)}</span>
              <span className={styles.tooltipShareVal}>
                ({((hoveredNode.amount / totalVolume) * 100).toFixed(1)}% volume share)
              </span>
            </div>

            <div className={styles.tooltipMetaGrid}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Category</span>
                <span className={styles.metaValue}>{hoveredNode.category}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Reference / AC</span>
                <span className={styles.metaCode}>{hoveredNode.account}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Window Age</span>
                <span className={styles.metaValue}>
                  {ageMinutes > 0 ? `${ageMinutes}m ${ageSeconds}s ago` : `${ageSeconds}s ago`}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Window Expiry</span>
                <span className={styles.metaExpiry}>
                  {remMinutes}m {remSeconds}s remaining
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Risk Rating</span>
                <span
                  className={
                    hoveredNode.riskScore > 50
                      ? styles.metaRiskHigh
                      : styles.metaRiskLow
                  }
                >
                  {hoveredNode.riskScore > 50
                    ? `Critical (${hoveredNode.riskScore}/100)`
                    : `Low Risk (${hoveredNode.riskScore}/100)`}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. Compact Bottom Footer */}
      <div className={styles.treemapFooter}>
        <div className={styles.footerStatsGroup}>
          <div className={styles.footerStatItem}>
            <span className={styles.statLabel}>15m Vol</span>
            <span className={styles.statValBold}>{formatRupee(totalVolume)}</span>
          </div>

          <div className={styles.footerStatItem}>
            <span className={styles.statLabel}>Top 5 Share</span>
            <span className={styles.statValBold}>{top5Dominance}% top 5</span>
          </div>
        </div>

        {/* Legend */}
        <div className={styles.footerLegendGroup}>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "#4d6b1f" }} />
            <span>High Value</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "#223e12" }} />
            <span>Commercial</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: "#be123c" }} />
            <span>Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
