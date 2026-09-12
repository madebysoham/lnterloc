"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import styles from "./TransactionFlowChart.module.css";
import { CashTransferItem } from "@/components/RecentReplacements/RecentReplacements";
import { verifyAuditLedger } from "@/lib/config";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  GitBranch,
  Minimize2,
  ShieldAlert,
  AlertTriangle,
  Target,
  Copy,
  Check,
  Lock,
  Unlock,
  Ban,
  RefreshCw,
  X,
  ChevronRight,
  Flame,
  ShieldCheck,
} from "lucide-react";

export interface NodeInflow {
  id: string;
  sourceName: string;
  amount: number;
  mode: string;
  bank: string;
  timestampStr: string;
  timeframeWindow?: TimeframeOption;
  color?: string;
  stepRequired?: number;
}

export interface TreeNode {
  id: string;
  name: string;
  account: string;
  bank: string;
  amount: number;
  percent: number;
  color: string;
  tier: number; // 1 (Direct Outflow), 2 (Sub-Tx 1), 3 (Sub-Tx 2), 4 (Sub-Tx 3 - Final Demo Level)
  stepRequired: number;
  timestampStr: string;
  timeframeWindow?: TimeframeOption;
  status: string;
  isRisk?: boolean;
  isTerminalMule?: boolean; // True for the final account that received the last money in the fraudulent pipeline
  riskReason?: string;
  parentId?: string;
  priorInflows?: NodeInflow[]; // Previous incoming transactions on the left of this dot
  children?: TreeNode[];
}

interface PipeInflow {
  id: string;
  sourceName: string;
  sourceAcc: string;
  mode: string;
  amount: number;
  color: string;
  isPrimary?: boolean;
  time: string;
  timestampStr: string;
  timeframeWindow?: TimeframeOption;
  stepRequired: number;
  txid: string;
  bank: string;
}

interface TimelineMilestone {
  step: number;
  timeLabel: string;
  relLabel: string;
  phaseTitle: string;
}

interface TransactionFlowChartProps {
  transaction: CashTransferItem;
  onBack: () => void;
}

// 10 Distinct Ribbon Pipeline Colors
export const INFLOW_PALETTE = [
  "#c026d3", // 1. Vibrant Magenta / Fuchsia
  "#64748b", // 2. Slate Grey
  "#84cc16", // 3. Olive Lime
  "#06b6d4", // 4. Electric Cyan
  "#854d0e", // 5. Sienna Brown
  "#db2777", // 6. Coral Pink
  "#475569", // 7. Dark Slate
  "#ca8a04", // 8. Golden Yellow
  "#0284c7", // 9. Sky Blue
  "#78716c", // 10. Warm Stone Brown
];

// Outflow Ribbon Colors
export const OUTFLOW_PALETTE = [
  "#78350f", // 1. Thick Brown
  "#c026d3", // 2. Magenta / Fuchsia
  "#94a3b8", // 3. Slate Grey
  "#84cc16", // 4. Olive Lime
  "#06b6d4", // 5. Cyan
  "#e11d48", // 6. Zero Address (Sink / Quarantine Node)
];

export type TimeframeOption = "12h" | "24h" | "48h";

// 10 Step Sequential Milestones across dynamic Timeframe Windows (12h, 24h, 48h)
export const TIMEFRAME_MILESTONES: Record<TimeframeOption, TimelineMilestone[]> = {
  "12h": [
    { step: 1, timeLabel: "02:20:00", relLabel: "12h ago", phaseTitle: "Escrow Initialization" },
    { step: 2, timeLabel: "03:40:00", relLabel: "10.6h ago", phaseTitle: "Health Services Inflow" },
    { step: 3, timeLabel: "05:00:00", relLabel: "9.3h ago", phaseTitle: "Utility Clearing Inbound" },
    { step: 4, timeLabel: "06:20:00", relLabel: "8h ago", phaseTitle: "Institutional Escrow & Micro Hop" },
    { step: 5, timeLabel: "07:40:00", relLabel: "6.6h ago", phaseTitle: "Broadband Credit & BBPS Payout" },
    { step: 6, timeLabel: "09:00:00", relLabel: "5.3h ago", phaseTitle: "SBI Bulk Inflow & Interbank Hop" },
    { step: 7, timeLabel: "10:20:00", relLabel: "4h ago", phaseTitle: "Merchant Payout Clearing" },
    { step: 8, timeLabel: "11:40:00", relLabel: "2.6h ago", phaseTitle: "UI Retainer & Treasury Routing" },
    { step: 9, timeLabel: "13:00:00", relLabel: "1.3h ago", phaseTitle: "Corporate RTGS & Core Settlement" },
    { step: 10, timeLabel: "14:20:00", relLabel: "Just now", phaseTitle: "Focal Transaction & Zero Sink Complete" },
  ],
  "24h": [
    { step: 1, timeLabel: "Yesterday 14:20", relLabel: "24h ago", phaseTitle: "T-24h Escrow Initialization" },
    { step: 2, timeLabel: "Yesterday 17:00", relLabel: "21.3h ago", phaseTitle: "Evening Inflow Aggregation" },
    { step: 3, timeLabel: "Yesterday 19:40", relLabel: "18.6h ago", phaseTitle: "Utility Clearing Inbound" },
    { step: 4, timeLabel: "Yesterday 22:20", relLabel: "16h ago", phaseTitle: "Overnight Buffer Escrow" },
    { step: 5, timeLabel: "01:00:00", relLabel: "13.3h ago", phaseTitle: "Off-Peak Liquidity Rebalance" },
    { step: 6, timeLabel: "03:40:00", relLabel: "10.6h ago", phaseTitle: "Automated Swift Clearing" },
    { step: 7, timeLabel: "06:20:00", relLabel: "8h ago", phaseTitle: "Morning Interbank Settlement" },
    { step: 8, timeLabel: "09:00:00", relLabel: "5.3h ago", phaseTitle: "Market Opening Volume Peak" },
    { step: 9, timeLabel: "11:40:00", relLabel: "2.6h ago", phaseTitle: "Corporate RTGS & Core Settlement" },
    { step: 10, timeLabel: "14:20:00", relLabel: "Just now", phaseTitle: "Focal Transaction & Zero Sink Complete" },
  ],
  "48h": [
    { step: 1, timeLabel: "2d ago 14:20", relLabel: "48h ago", phaseTitle: "T-48h Audit Trail Inception" },
    { step: 2, timeLabel: "2d ago 19:40", relLabel: "42.6h ago", phaseTitle: "Multi-Day Batch Aggregation" },
    { step: 3, timeLabel: "Yesterday 01:00", relLabel: "37.3h ago", phaseTitle: "Pre-Cycle Utility Clearing" },
    { step: 4, timeLabel: "Yesterday 06:20", relLabel: "32h ago", phaseTitle: "Day 1 Morning Settlement" },
    { step: 5, timeLabel: "Yesterday 11:40", relLabel: "26.6h ago", phaseTitle: "Mid-Cycle Treasury Hop" },
    { step: 6, timeLabel: "Yesterday 17:00", relLabel: "21.3h ago", phaseTitle: "Day 1 Evening Swift Flush" },
    { step: 7, timeLabel: "Yesterday 22:20", relLabel: "16h ago", phaseTitle: "Overnight Interbank Rebalance" },
    { step: 8, timeLabel: "03:40:00", relLabel: "10.6h ago", phaseTitle: "Day 2 Early Liquidity Wave" },
    { step: 9, timeLabel: "09:00:00", relLabel: "5.3h ago", phaseTitle: "Market Opening Core Flow" },
    { step: 10, timeLabel: "14:20:00", relLabel: "Just now", phaseTitle: "Focal Transaction & Sinks Complete" },
  ],
};

export const TIMELINE_MILESTONES = TIMEFRAME_MILESTONES["24h"];

// Helper to filter items based on their event occurrence within the selected timeframe horizon.
// timeframeWindow on each item says "when did this event occur":
//   "12h"  => occurred within the last 12h  → visible in 12h, 24h, 48h views
//   "24h"  => occurred 12h–24h ago           → visible in 24h and 48h views only
//   "48h"  => occurred 24h–48h ago           → visible in 48h view only
export const isItemInTimeframe = (
  timeframeWindow: TimeframeOption | undefined,
  currentTf: TimeframeOption
): boolean => {
  if (!timeframeWindow || timeframeWindow === "12h") return currentTf === "12h" || currentTf === "24h" || currentTf === "48h";
  if (timeframeWindow === "24h") return currentTf === "24h" || currentTf === "48h";
  if (timeframeWindow === "48h") return currentTf === "48h";
  return true;
};

export const filterTreeByTimeframe = (
  nodes: TreeNode[],
  tf: TimeframeOption
): TreeNode[] => {
  return nodes
    .filter((node) => isItemInTimeframe(node.timeframeWindow, tf))
    .map((node) => {
      const filteredPriorInflows = node.priorInflows?.filter((inf) =>
        isItemInTimeframe(inf.timeframeWindow, tf)
      );
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          priorInflows: filteredPriorInflows,
          children: filterTreeByTimeframe(node.children, tf),
        };
      }
      return {
        ...node,
        priorInflows: filteredPriorInflows,
      };
    });
};

export const TransactionFlowChart: React.FC<TransactionFlowChartProps> = ({
  transaction,
  onBack,
}) => {
  const [hoveredPipe, setHoveredPipe] = useState<string | null>(null);
  const [hoveredTributary, setHoveredTributary] = useState<{
    inflow: NodeInflow;
    screenX: number;
    screenY: number;
  } | null>(null);

  // --------------------------------------------------------------------------
  // 1. Fraud & Network Interdiction State (Freeze, Ban, Sync)
  // --------------------------------------------------------------------------
  const isRiskTx = transaction.health === "FRAUD DETECTED";
  const [isFraudTraceActive, setIsFraudTraceActive] = useState<boolean>(isRiskTx);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Set of Frozen Node IDs — always starts empty (unfrozen by default)
  const [frozenNodeIds, setFrozenNodeIds] = useState<Set<string>>(new Set());

  // Set of Banned Node IDs in the network (default: all fraud nodes banned when fraud detected)
  const [bannedNodeIds, setBannedNodeIds] = useState<Set<string>>(
    new Set(isRiskTx ? ["out-1", "sub1-1", "sub2-1", "sub3-1"] : [])
  );

  // Manual Sync State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("14:20:00");

  // Manual Ban / Unban Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState<boolean>(false);

  const FRAUD_NETWORK_NODE_IDS = useMemo(
    () => ["out-1", "sub1-1", "sub2-1", "sub3-1", "out-zero"],
    []
  );

  const isAllFraudFrozen = useMemo(() => {
    return FRAUD_NETWORK_NODE_IDS.every((id) => frozenNodeIds.has(id));
  }, [frozenNodeIds, FRAUD_NETWORK_NODE_IDS]);

  // When ALL fraud nodes are frozen → the entire network renders in gray
  const isNetworkFrozen = isAllFraudFrozen;

  // Frozen gray color — pill-like muted slate
  const FROZEN_COLOR = "#94a3b8";

  // Resolve any color: returns gray when the network is frozen, original otherwise
  const resolveColor = (original: string) => (isNetworkFrozen ? FROZEN_COLOR : original);

  const isAllFraudBanned = useMemo(() => {
    return ["out-1", "sub1-1", "sub2-1", "sub3-1"].every((id) => bannedNodeIds.has(id));
  }, [bannedNodeIds]);

  const handleToggleFreezeAllFraud = () => {
    if (isAllFraudFrozen) {
      setFrozenNodeIds((prev) => {
        const next = new Set(prev);
        FRAUD_NETWORK_NODE_IDS.forEach((id) => next.delete(id));
        return next;
      });
      setCopyToast("🔓 Fraud Network Unfrozen. Interbank clearing resumed.");
    } else {
      setFrozenNodeIds((prev) => {
        const next = new Set(prev);
        FRAUD_NETWORK_NODE_IDS.forEach((id) => next.add(id));
        return next;
      });
      setCopyToast("🔒 Emergency Freeze Dispatched: All 5 Fraud Network nodes frozen.");
    }
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleToggleBanAllFraud = () => {
    if (isAllFraudBanned) {
      setBannedNodeIds((prev) => {
        const next = new Set(prev);
        ["out-1", "sub1-1", "sub2-1", "sub3-1"].forEach((id) => next.delete(id));
        return next;
      });
      setCopyToast("✅ All Fraud Network accounts unbanned across NPCI switch.");
    } else {
      setBannedNodeIds((prev) => {
        const next = new Set(prev);
        ["out-1", "sub1-1", "sub2-1", "sub3-1"].forEach((id) => next.add(id));
        return next;
      });
      setCopyToast("⛔ NPCI Blacklist Broadcast: All Fraud Network accounts banned.");
    }
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleToggleNodeBan = (nodeId: string, nodeName: string) => {
    setBannedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        setCopyToast(`✅ Account "${nodeName}" unbanned.`);
      } else {
        next.add(nodeId);
        setCopyToast(`⛔ Account "${nodeName}" banned & blacklisted.`);
      }
      return next;
    });
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleToggleNodeFreeze = (nodeId: string, nodeName: string) => {
    setFrozenNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        setCopyToast(`🔓 Account "${nodeName}" unfrozen.`);
      } else {
        next.add(nodeId);
        setCopyToast(`🔒 Account "${nodeName}" frozen.`);
      }
      return next;
    });
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const auditStatus = await verifyAuditLedger();
    setIsSyncing(false);
    setLastSyncedTime(timeStr);

    if (auditStatus && auditStatus.is_valid) {
      setCopyToast(`Verified: ${auditStatus.total_blocks_verified} cryptographic ledger blocks with RBI Switch.`);
    } else {
      setCopyToast("Manual Sync Complete. Real-time ledger updated with RBI Switch.");
    }
    setTimeout(() => setCopyToast(null), 3500);
  };

  // Helper getters for dynamic node styling
  const isNodeFrozen = (id: string) => frozenNodeIds.has(id);
  const isNodeBanned = (id: string) => bannedNodeIds.has(id);

  const getNodeStatus = (id: string, defaultStatus: string, isRisk: boolean) => {
    const frozen = isNodeFrozen(id);
    const banned = isNodeBanned(id);
    if (frozen && banned) return "🔒⛔ FROZEN & BANNED";
    if (frozen) return "🔒 FROZEN / ASSETS SECURED";
    if (banned) return "⛔ BANNED / BLACKLISTED";
    if (isRisk) return "🚨 Intercepted Mule Hop";
    return defaultStatus;
  };

  const getNodeDisplayName = (id: string, baseName: string) => {
    if (bannedNodeIds.has(id)) {
      return `⛔ ${baseName}`;
    }
    return baseName;
  };

  // --------------------------------------------------------------------------
  // 2. Multi-Tier Branching Tree State
  // --------------------------------------------------------------------------
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(isRiskTx ? ["out-1", "sub1-1", "sub2-1"] : [])
  );

  // Auto-expand and pan to terminal recipient if transaction is flagged fraud
  useEffect(() => {
    if (isRiskTx) {
      setExpandedNodeIds(new Set(["out-1", "sub1-1", "sub2-1"]));
      setPan({ x: -360, y: 0 });
      setZoom(0.85);
      setIsFraudTraceActive(true);
    }
  }, [isRiskTx]);

  const toggleExpand = (nodeId: string, tier: number) => {
    if (tier >= 4) return; // Max 3 sub-transaction levels
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // Smoothly pan & adjust camera so the new branch and its children are in full view
        if (tier === 1) {
          setPan((p) => ({ x: Math.min(p.x, -140), y: p.y }));
          setZoom((z) => Math.min(z, 0.95));
        } else if (tier === 2) {
          setPan((p) => ({ x: Math.min(p.x, -280), y: p.y }));
          setZoom((z) => Math.min(z, 0.90));
        } else if (tier === 3) {
          setPan((p) => ({ x: Math.min(p.x, -440), y: p.y }));
          setZoom((z) => Math.min(z, 0.85));
        }
      }
      return next;
    });
  };

  const handleExpandDemoChain = () => {
    setExpandedNodeIds(new Set(["out-1", "sub1-1", "sub2-1"]));
    setPan({ x: -320, y: 0 });
    setZoom(0.85);
  };

  const handleCollapseAll = () => {
    setExpandedNodeIds(new Set());
    setPan({ x: 0, y: 0 });
    setZoom(1.0);
    if (!isRiskTx) {
      setIsFraudTraceActive(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. Roamable Canvas State (Pan & Zoom)
  // --------------------------------------------------------------------------
  const [pan, setPan] = useState<{ x: number; y: number }>({
    x: isRiskTx ? -360 : 0,
    y: 0,
  });
  const [zoom, setZoom] = useState<number>(isRiskTx ? 0.85 : 1.0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => Math.min(2.5, Math.max(0.4, Number((prev + zoomDelta).toFixed(2)))));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Number((z + 0.12).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Number((z - 0.12).toFixed(2))));
  const handleResetView = () => {
    setPan({ x: isRiskTx ? -360 : 0, y: 0 });
    setZoom(isRiskTx ? 0.85 : 1.0);
  };

  // --------------------------------------------------------------------------
  // 4. Timestamp Scrubber & Playback Engine
  // --------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1200 / playSpeed);
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev >= 10 ? 1 : prev + 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playSpeed]);

  const handleCycleSpeed = () => {
    setPlaySpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  };

  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>("24h");
  const currentMilestones = TIMEFRAME_MILESTONES[selectedTimeframe];

  const currentMilestone = useMemo(
    () => currentMilestones.find((m) => m.step === currentStep) || currentMilestones[9],
    [currentMilestones, currentStep]
  );

  // Helper to retrieve dynamic milestone timestamp string for any sequence step
  const getTimeForStep = useCallback(
    (step: number) => {
      const clamped = Math.max(1, Math.min(10, step));
      return currentMilestones[clamped - 1]?.timeLabel || "14:20:00";
    },
    [currentMilestones]
  );

  const getRelForStep = useCallback(
    (step: number) => {
      const clamped = Math.max(1, Math.min(10, step));
      return currentMilestones[clamped - 1]?.relLabel || "Just now";
    },
    [currentMilestones]
  );

  // --------------------------------------------------------------------------
  // 5. Inflows into Central Focal Node (Filtered by Timeframe Snapshot)
  // --------------------------------------------------------------------------
  const baseAmt = transaction.amount;
  const allInflows: PipeInflow[] = useMemo(() => {
    // Dynamic volume multiplier across time horizons (12h, 24h, 48h)
    const tfMultiplier = selectedTimeframe === "12h" ? 0.8 : selectedTimeframe === "48h" ? 1.45 : 1.0;
    const scaledBase = Math.round(baseAmt * tfMultiplier);

    const fullInflowsList: PipeInflow[] = [
      {
        id: "in-10",
        sourceName: "Ananya Iyer Direct Escrow",
        sourceAcc: "Acc #9820-5519",
        mode: "UPI",
        amount: Math.round(scaledBase * 0.7 + 6500),
        color: INFLOW_PALETTE[9],
        time: getRelForStep(1),
        timestampStr: getTimeForStep(1),
        timeframeWindow: "48h", // Occurred 48h ago (Day 1)
        stepRequired: 1,
        txid: "cc11...99aa",
        bank: "HDFC Bank",
      },
      {
        id: "in-9",
        sourceName: "Apollo Health Services",
        sourceAcc: "Acc #9821-4402",
        mode: "IMPS",
        amount: Math.round(scaledBase * 0.55 + 1890),
        color: INFLOW_PALETTE[8],
        time: getRelForStep(2),
        timestampStr: getTimeForStep(2),
        timeframeWindow: "48h", // Occurred 42.6h ago
        stepRequired: 2,
        txid: "88bb...6633",
        bank: "ICICI Bank",
      },
      {
        id: "in-8",
        sourceName: "Bescom BBPS Utility Clearing",
        sourceAcc: "Acc #9820-7734",
        mode: "UPI",
        amount: Math.round(scaledBase * 0.45 + 2840),
        color: INFLOW_PALETTE[7],
        time: getRelForStep(3),
        timestampStr: getTimeForStep(3),
        timeframeWindow: "24h", // Occurred 21.3h ago
        stepRequired: 3,
        txid: "33dd...2201",
        bank: "Canara Bank",
      },
      {
        id: "in-7",
        sourceName: "Kotak Institutional Escrow",
        sourceAcc: "Acc #9820-9941",
        mode: "NEFT",
        amount: Math.round(scaledBase * 0.9 + 5400),
        color: INFLOW_PALETTE[6],
        time: getRelForStep(4),
        timestampStr: getTimeForStep(4),
        timeframeWindow: "24h", // Occurred 18.6h ago
        stepRequired: 4,
        txid: "55ee...1199",
        bank: "Kotak Bank",
      },
      {
        id: "in-6",
        sourceName: "Airtel Broadband Payment BBPS",
        sourceAcc: "Acc #9821-2209",
        mode: "UPI",
        amount: Math.round(scaledBase * 0.35 + 1200),
        color: INFLOW_PALETTE[5],
        time: getRelForStep(5),
        timestampStr: getTimeForStep(5),
        timeframeWindow: "24h", // Occurred 16h ago
        stepRequired: 5,
        txid: "44ff...8822",
        bank: "Axis Bank",
      },
      {
        id: "in-5",
        sourceName: "SBI Bulk Inflow Facility",
        sourceAcc: "Acc #9820-1120",
        mode: "RTGS",
        amount: Math.round(scaledBase * 1.4 + 8900),
        color: INFLOW_PALETTE[4],
        time: getRelForStep(6),
        timestampStr: getTimeForStep(6),
        timeframeWindow: "12h", // Occurred 5.3h ago
        stepRequired: 6,
        txid: "77aa...09bb",
        bank: "SBI",
      },
      {
        id: "in-4",
        sourceName: "Zomato Merchant Payout",
        sourceAcc: "Acc #9820-8812",
        mode: "IMPS",
        amount: Math.round(scaledBase * 0.85 + 3200),
        color: INFLOW_PALETTE[3],
        time: getRelForStep(7),
        timestampStr: getTimeForStep(7),
        timeframeWindow: "12h", // Occurred 4h ago
        stepRequired: 7,
        txid: "1f88...339b",
        bank: "ICICI Bank",
      },
      {
        id: "in-3",
        sourceName: "Priya Patel (UI Retainer)",
        sourceAcc: "Acc #9821-3092",
        mode: "UPI",
        amount: Math.round(scaledBase * 0.6 + 4500),
        color: INFLOW_PALETTE[2],
        time: getRelForStep(8),
        timestampStr: getTimeForStep(8),
        timeframeWindow: "12h", // Occurred 2.6h ago
        stepRequired: 8,
        txid: "4b21...fa90",
        bank: "Axis Bank",
      },
      {
        id: "in-2",
        sourceName: "HDFC Corporate Treasury",
        sourceAcc: "Acc #9820-4419",
        mode: "RTGS",
        amount: Math.round(scaledBase * 1.8 + 12000),
        color: INFLOW_PALETTE[1],
        time: getRelForStep(9),
        timestampStr: getTimeForStep(9),
        timeframeWindow: "12h", // Occurred 1.3h ago
        stepRequired: 9,
        txid: "9c4a...e12d",
        bank: "HDFC",
      },
      {
        id: "in-primary",
        sourceName: `${transaction.sourceBank} Direct (${transaction.mode})`,
        sourceAcc: `Acc #9820-1082`,
        mode: transaction.mode,
        amount: scaledBase,
        color: INFLOW_PALETTE[0],
        isPrimary: true,
        time: getRelForStep(10),
        timestampStr: getTimeForStep(10),
        timeframeWindow: "12h", // Occurred Just now
        stepRequired: 10,
        txid: transaction.txid,
        bank: transaction.sourceBank,
      },
    ];

    // Filter to display only items that fall within the active timeframe window
    return fullInflowsList.filter((inf) => isItemInTimeframe(inf.timeframeWindow, selectedTimeframe));
  }, [baseAmt, transaction, selectedTimeframe, getTimeForStep, getRelForStep]);

  // --------------------------------------------------------------------------
  // 6. Multi-Tier Hierarchical Outflow Tree (Filtered by Timeframe Snapshot)
  // --------------------------------------------------------------------------
  const isRiskPath = isRiskTx || isFraudTraceActive;

  const rawTreeRoots: TreeNode[] = useMemo(() => {
    const total = allInflows.reduce((sum, it) => sum + it.amount, 0);
    const tfMultiplier = selectedTimeframe === "12h" ? 0.8 : selectedTimeframe === "48h" ? 1.45 : 1.0;

    return [
      {
        id: "out-1",
        name: isRiskPath
          ? getNodeDisplayName("out-1", "Mule Layer-1 (Rahul Verma)")
          : "ICICI Primary Savings (Rahul Verma)",
        account: "Acc #9820-7712",
        bank: "ICICI Bank",
        amount: Math.round(total * 0.46),
        percent: 46,
        color: isRiskPath ? "#e11d48" : OUTFLOW_PALETTE[0],
        tier: 1,
        stepRequired: 9,
        timestampStr: getTimeForStep(9),
        timeframeWindow: "12h", // Main user -> Second user hop (within 12h)
        status: isRiskPath
          ? getNodeStatus("out-1", "🚨 Intercepted Mule Hop", true)
          : "Settled 100%",
        isRisk: isRiskPath,
        riskReason: "Layer 1 Mule Conduit Hop",
        priorInflows: [
          {
            id: "in-rv-1",
            sourceName: "Salary Credit (TCS Payroll)",
            amount: Math.round(48500 * tfMultiplier),
            mode: "NEFT",
            bank: "HDFC Bank",
            timestampStr: getTimeForStep(8),
            timeframeWindow: "12h",
            color: "#64748b",
          },
          {
            id: "in-rv-2",
            sourceName: "UPI P2P (Swiggy Refund)",
            amount: Math.round(1420 * tfMultiplier),
            mode: "UPI",
            bank: "ICICI Bank",
            timestampStr: getTimeForStep(7),
            timeframeWindow: "12h",
            color: "#06b6d4",
          },
        ],
        children: [
          {
            id: "sub1-1",
            name: isRiskPath
              ? getNodeDisplayName("sub1-1", "Layer-2 Shell Relay (Apex Cloud)")
              : "Apex Cloud Global Escrow",
            account: "Acc #9821-4490",
            bank: "Axis Bank",
            amount: Math.round(total * 0.46 * 0.5),
            percent: 50,
            color: isRiskPath ? "#e11d48" : OUTFLOW_PALETTE[1],
            tier: 2,
            stepRequired: 9,
            timestampStr: getTimeForStep(9),
            timeframeWindow: "12h", // Occurred 4h ago (within 12h)
            status: isRiskPath
              ? getNodeStatus("sub1-1", "🚨 Synthetic Escrow Relay", true)
              : "Cross-Border Escrow",
            isRisk: isRiskPath,
            riskReason: "Layer 2 Escrow Masking Relay",
            parentId: "out-1",
            priorInflows: [
              {
                id: "in-ac-1",
                sourceName: "Global Escrow Top-Up",
                amount: Math.round(35000 * tfMultiplier),
                mode: "IMPS",
                bank: "Citi",
                timestampStr: getTimeForStep(8),
                timeframeWindow: "12h",
                color: "#84cc16",
              },
              {
                id: "in-ac-2",
                sourceName: "FX Treasury Clearing",
                amount: Math.round(18200 * tfMultiplier),
                mode: "RTGS",
                bank: "HSBC",
                timestampStr: getTimeForStep(6),
                timeframeWindow: "12h",
                color: "#ca8a04",
              },
            ],
            children: [
              {
                id: "sub2-1",
                name: isRiskPath
                  ? getNodeDisplayName("sub2-1", "Layer-3 Smurf Hub (Vikram Singhania)")
                  : "Vikram Singhania (Terminal Node)",
                account: "Acc #9820-1190",
                bank: "SBI",
                amount: Math.round(total * 0.46 * 0.5 * 0.52),
                percent: 52,
                color: isRiskPath ? "#e11d48" : OUTFLOW_PALETTE[0],
                tier: 3,
                stepRequired: 9,
                timestampStr: getTimeForStep(9),
                timeframeWindow: "12h", // Occurred 5.3h ago (within 12h)
                status: isRiskPath
                  ? getNodeStatus("sub2-1", "🚨 Smurf Hub Identified", true)
                  : "Final Clearing",
                isRisk: isRiskPath,
                riskReason: "Layer 3 Smurfing Aggregator",
                parentId: "sub1-1",
                priorInflows: [
                  {
                    id: "in-vs-1",
                    sourceName: "P2P Crypto Inbound",
                    amount: Math.round(22400 * tfMultiplier),
                    mode: "IMPS",
                    bank: "Canara Bank",
                    timestampStr: getTimeForStep(8),
                    timeframeWindow: "12h",
                    color: "#e11d48",
                  },
                  {
                    id: "in-vs-2",
                    sourceName: "Inter-Mule Relay #19",
                    amount: Math.round(16800 * tfMultiplier),
                    mode: "UPI",
                    bank: "Axis Bank",
                    timestampStr: getTimeForStep(7),
                    timeframeWindow: "12h",
                    color: "#78350f",
                  },
                ],
                children: [
                  {
                    id: "sub3-1",
                    name: isRiskPath
                      ? getNodeDisplayName("sub3-1", "State Bank Final Deposit (Terminal Mule Cash-Out)")
                      : "State Bank Final Deposit (Settled)",
                    account: "Acc #9820-9901",
                    bank: "State Bank of India (SBI)",
                    amount: Math.round(total * 0.46 * 0.5 * 0.52 * 0.55),
                    percent: 55,
                    color: isRiskPath ? "#e11d48" : OUTFLOW_PALETTE[3],
                    tier: 4,
                    stepRequired: 8,
                    timestampStr: getTimeForStep(8),
                    timeframeWindow: "12h", // Final terminal mule received last money (within 12h)
                    status: isRiskPath
                      ? getNodeStatus("sub3-1", "🚨 TERMINAL MULE (LAST RECEIVED)", true)
                      : "Settled 100%",
                    isRisk: isRiskPath,
                    isTerminalMule: true, // 🎯 TARGET ACCOUNT: Received the last money
                    riskReason: "FINAL RECIPIENT: Account that received the last money through fraudulent pipeline",
                    parentId: "sub2-1",
                    priorInflows: [
                      {
                        id: "in-sb-1",
                        sourceName: "Prior Smurfing Batch #4",
                        amount: Math.round(14500 * tfMultiplier),
                        mode: "UPI",
                        bank: "SBI",
                        timestampStr: getTimeForStep(7),
                        timeframeWindow: "12h",
                        color: "#e11d48",
                      },
                      {
                        id: "in-sb-2",
                        sourceName: "Cash Mule ATM Injection",
                        amount: Math.round(8900 * tfMultiplier),
                        mode: "CDM",
                        bank: "SBI",
                        timestampStr: getTimeForStep(5),
                        timeframeWindow: "12h",
                        color: "#be123c",
                      },
                    ],
                  },
                  {
                    id: "sub3-2",
                    name: "Personal Vault Liquidity (Settled)",
                    account: "Acc #9821-1200",
                    bank: "HDFC Bank",
                    amount: Math.round(total * 0.46 * 0.5 * 0.52 * 0.35),
                    percent: 35,
                    color: OUTFLOW_PALETTE[0],
                    tier: 4,
                    stepRequired: 9,
                    timestampStr: getTimeForStep(9),
                    timeframeWindow: "12h",
                    status: "Final Vault Reached",
                    parentId: "sub2-1",
                    priorInflows: [
                      {
                        id: "in-pv-1",
                        sourceName: "Private Vault Rebalance",
                        amount: Math.round(9400 * tfMultiplier),
                        mode: "Book",
                        bank: "HDFC Bank",
                        timestampStr: getTimeForStep(6),
                        timeframeWindow: "12h",
                        color: "#78350f",
                      },
                    ],
                  },
                  {
                    id: "sub3-3",
                    name: "RBI Compliance Zero Sink (Settled)",
                    account: "0x0000...0000",
                    bank: "Central Node",
                    amount: Math.round(total * 0.46 * 0.5 * 0.52 * 0.10),
                    percent: 10,
                    color: OUTFLOW_PALETTE[5],
                    tier: 4,
                    stepRequired: 10,
                    timestampStr: getTimeForStep(10),
                    timeframeWindow: "12h",
                    status: "Fee Burnt",
                    parentId: "sub2-1",
                    priorInflows: [
                      {
                        id: "in-rbi-1",
                        sourceName: "Quarantine Fee Surcharge",
                        amount: Math.round(1200 * tfMultiplier),
                        mode: "Audit",
                        bank: "RBI Switch",
                        timestampStr: getTimeForStep(8),
                        timeframeWindow: "12h",
                        color: "#e11d48",
                      },
                    ],
                  },
                ],
              },
              {
                id: "sub2-2",
                name: "DevOps Infrastructure Vault",
                account: "Acc #9821-8840",
                bank: "Kotak Bank",
                amount: Math.round(total * 0.46 * 0.5 * 0.26),
                percent: 26,
                color: OUTFLOW_PALETTE[2],
                tier: 3,
                stepRequired: 7,
                timestampStr: getTimeForStep(7),
                timeframeWindow: "12h",
                status: "Infra Payout",
                parentId: "sub1-1",
                priorInflows: [
                  {
                    id: "in-dev-1",
                    sourceName: "Cloud DevOps Reserve",
                    amount: Math.round(9200 * tfMultiplier),
                    mode: "IMPS",
                    bank: "Kotak Bank",
                    timestampStr: getTimeForStep(6),
                    timeframeWindow: "12h",
                    color: "#475569",
                  },
                  {
                    id: "in-dev-2",
                    sourceName: "Kubernetes Host Credit",
                    amount: Math.round(4600 * tfMultiplier),
                    mode: "UPI",
                    bank: "Kotak Bank",
                    timestampStr: getTimeForStep(4),
                    timeframeWindow: "12h",
                    color: "#84cc16",
                  },
                ],
              },
              {
                id: "sub2-3",
                name: "Tax Escrow Clearing Buffer",
                account: "Acc #9820-3320",
                bank: "Axis Bank",
                amount: Math.round(total * 0.46 * 0.5 * 0.14),
                percent: 14,
                color: OUTFLOW_PALETTE[3],
                tier: 3,
                stepRequired: 5,
                timestampStr: getTimeForStep(5),
                timeframeWindow: "24h", // Occurred 16h ago
                status: "Tax Lock",
                parentId: "sub1-1",
                priorInflows: [
                  {
                    id: "in-tax-1",
                    sourceName: "GST TDS Withholding",
                    amount: Math.round(6400 * tfMultiplier),
                    mode: "RTGS",
                    bank: "SBI",
                    timestampStr: getTimeForStep(4),
                    timeframeWindow: "24h",
                    color: "#ca8a04",
                  },
                  {
                    id: "in-tax-2",
                    sourceName: "Direct Tax Advance",
                    amount: Math.round(3200 * tfMultiplier),
                    mode: "UPI",
                    bank: "Axis Bank",
                    timestampStr: getTimeForStep(3),
                    timeframeWindow: "24h",
                    color: "#06b6d4",
                  },
                ],
              },
              {
                id: "sub2-4",
                name: "Zero Address / Gas Reserve",
                account: "0x0000...0000",
                bank: "Exit Pool",
                amount: Math.round(total * 0.46 * 0.5 * 0.08),
                percent: 8,
                color: OUTFLOW_PALETTE[5],
                tier: 3,
                stepRequired: 10,
                timestampStr: getTimeForStep(10),
                timeframeWindow: "12h",
                status: "Fee Burnt",
                parentId: "sub1-1",
                priorInflows: [
                  {
                    id: "in-zero-1",
                    sourceName: "Network Gas Burn Fee",
                    amount: Math.round(2100 * tfMultiplier),
                    mode: "Switch",
                    bank: "Central Node",
                    timestampStr: getTimeForStep(7),
                    timeframeWindow: "12h",
                    color: "#e11d48",
                  },
                ],
              },
            ],
          },
          {
            id: "sub1-2",
            name: "Sneha Roy Personal Savings",
            account: "Acc #9820-2211",
            bank: "Axis Bank",
            amount: Math.round(total * 0.46 * 0.25),
            percent: 25,
            color: OUTFLOW_PALETTE[2],
            tier: 2,
            stepRequired: 8,
            timestampStr: getTimeForStep(8),
            timeframeWindow: "12h",
            status: "P2P Credited",
            parentId: "out-1",
            priorInflows: [
              {
                id: "in-sr-1",
                sourceName: "Freelance UI Retainer",
                amount: Math.round(8400 * tfMultiplier),
                mode: "UPI",
                bank: "Axis Bank",
                timestampStr: getTimeForStep(6),
                timeframeWindow: "12h",
                color: "#c026d3",
              },
              {
                id: "in-sr-2",
                sourceName: "Family P2P Remittance",
                amount: Math.round(5000 * tfMultiplier),
                mode: "UPI",
                bank: "SBI",
                timestampStr: getTimeForStep(4),
                timeframeWindow: "12h",
                color: "#0284c7",
              },
            ],
            children: [
              {
                id: "sub2-b1",
                name: "HDFC Fixed Deposit Trust",
                account: "Acc #9820-4491",
                bank: "HDFC Bank",
                amount: Math.round(total * 0.46 * 0.25 * 0.62),
                percent: 62,
                color: OUTFLOW_PALETTE[1],
                tier: 3,
                stepRequired: 8,
                timestampStr: getTimeForStep(8),
                timeframeWindow: "12h",
                status: "Deposit Locked",
                parentId: "sub1-2",
                priorInflows: [
                  {
                    id: "in-fd-1",
                    sourceName: "Monthly Auto-Deposit",
                    amount: Math.round(10000 * tfMultiplier),
                    mode: "SI",
                    bank: "HDFC Bank",
                    timestampStr: getTimeForStep(5),
                    timeframeWindow: "12h",
                    color: "#c026d3",
                  },
                  {
                    id: "in-fd-2",
                    sourceName: "Interest Capitalization",
                    amount: Math.round(1850 * tfMultiplier),
                    mode: "Book",
                    bank: "HDFC Bank",
                    timestampStr: getTimeForStep(3),
                    timeframeWindow: "12h",
                    color: "#0284c7",
                  },
                ],
              },
              {
                id: "sub2-b2",
                name: "Axis Liquid Mutual Fund",
                account: "Acc #9821-3310",
                bank: "Axis Bank",
                amount: Math.round(total * 0.46 * 0.25 * 0.38),
                percent: 38,
                color: OUTFLOW_PALETTE[3],
                tier: 3,
                stepRequired: 9,
                timestampStr: getTimeForStep(9),
                timeframeWindow: "12h",
                status: "Mutual Fund Credited",
                parentId: "sub1-2",
                priorInflows: [
                  {
                    id: "in-mf-1",
                    sourceName: "Mutual Fund Dividend",
                    amount: Math.round(12600 * tfMultiplier),
                    mode: "NEFT",
                    bank: "ICICI Bank",
                    timestampStr: getTimeForStep(6),
                    timeframeWindow: "12h",
                    color: "#84cc16",
                  },
                ],
              },
            ],
          },
          {
            id: "sub1-3",
            name: "ICICI Wealth Liquidity Pool",
            account: "Acc #9820-8802",
            bank: "ICICI Bank",
            amount: Math.round(total * 0.46 * 0.16),
            percent: 16,
            color: OUTFLOW_PALETTE[3],
            tier: 2,
            stepRequired: 6,
            timestampStr: getTimeForStep(6),
            timeframeWindow: "24h", // Occurred 18.6h ago
            status: "Wealth Pool",
            parentId: "out-1",
            priorInflows: [
              {
                id: "in-wp-1",
                sourceName: "Bond Coupon Payout",
                amount: Math.round(6800 * tfMultiplier),
                mode: "RTGS",
                bank: "ICICI Bank",
                timestampStr: getTimeForStep(4),
                timeframeWindow: "24h",
                color: "#06b6d4",
              },
            ],
          },
          {
            id: "sub1-4",
            name: "Merchant AWS Gateway",
            account: "Acc #9821-9904",
            bank: "HDFC Bank",
            amount: Math.round(total * 0.46 * 0.09),
            percent: 9,
            color: OUTFLOW_PALETTE[4],
            tier: 2,
            stepRequired: 4,
            timestampStr: getTimeForStep(4),
            timeframeWindow: "24h", // Occurred 21.3h ago
            status: "Cloud Billed",
            parentId: "out-1",
            priorInflows: [
              {
                id: "in-aws-1",
                sourceName: "AWS Subscription Inflow",
                amount: Math.round(4500 * tfMultiplier),
                mode: "UPI",
                bank: "HDFC Bank",
                timestampStr: getTimeForStep(3),
                timeframeWindow: "24h",
                color: "#ca8a04",
              },
              {
                id: "in-aws-2",
                sourceName: "API Gateway Settlement",
                amount: Math.round(2310 * tfMultiplier),
                mode: "UPI",
                bank: "HDFC Bank",
                timestampStr: getTimeForStep(2),
                timeframeWindow: "24h",
                color: "#ca8a04",
              },
            ],
          },
        ],
      },
      {
        id: "out-2",
        name: "HDFC Treasury Liquidity Pool",
        account: "Acc #9820-4491",
        bank: "HDFC Bank",
        amount: Math.round(total * 0.26),
        percent: 26,
        color: OUTFLOW_PALETTE[1],
        tier: 1,
        stepRequired: 8,
        timestampStr: getTimeForStep(8),
        timeframeWindow: "48h", // Occurred 48h ago (Day 1 cycle)
        status: "Cleared",
        priorInflows: [
          {
            id: "in-ht-1",
            sourceName: "Interbank Treasury Repo",
            amount: Math.round(72000 * tfMultiplier),
            mode: "RTGS",
            bank: "RBI",
            timestampStr: getTimeForStep(6),
            timeframeWindow: "48h",
            color: "#0284c7",
          },
          {
            id: "in-ht-2",
            sourceName: "Corporate Commercial Paper",
            amount: Math.round(38000 * tfMultiplier),
            mode: "NEFT",
            bank: "HDFC Bank",
            timestampStr: getTimeForStep(4),
            timeframeWindow: "48h",
            color: "#64748b",
          },
        ],
        children: [
          {
            id: "sub1-h1",
            name: "Treasury Reserve Vault #4",
            account: "Acc #9820-9912",
            bank: "HDFC Bank",
            amount: Math.round(total * 0.26 * 0.5),
            percent: 50,
            color: OUTFLOW_PALETTE[0],
            tier: 2,
            stepRequired: 7,
            timestampStr: getTimeForStep(7),
            timeframeWindow: "48h",
            status: "Vaulted",
            parentId: "out-2",
            priorInflows: [
              {
                id: "in-tr-1",
                sourceName: "Sovereign Vault Inflow",
                amount: Math.round(24000 * tfMultiplier),
                mode: "RTGS",
                bank: "HDFC Bank",
                timestampStr: getTimeForStep(5),
                timeframeWindow: "48h",
                color: "#ca8a04",
              },
            ],
          },
          {
            id: "sub1-h2",
            name: "Foreign Exchange Liquidity Desk",
            account: "Acc #9821-5501",
            bank: "Standard Chartered",
            amount: Math.round(total * 0.26 * 0.29),
            percent: 29,
            color: OUTFLOW_PALETTE[3],
            tier: 2,
            stepRequired: 6,
            timestampStr: getTimeForStep(6),
            timeframeWindow: "48h",
            status: "FX Swapped",
            parentId: "out-2",
            priorInflows: [
              {
                id: "in-fx-1",
                sourceName: "USD/INR Clearing Swap",
                amount: Math.round(19500 * tfMultiplier),
                mode: "SWIFT",
                bank: "Standard Chartered",
                timestampStr: getTimeForStep(4),
                timeframeWindow: "48h",
                color: "#84cc16",
              },
            ],
          },
          {
            id: "sub1-h3",
            name: "Interbank Clearing Settlement",
            account: "Acc #9820-1049",
            bank: "SBI",
            amount: Math.round(total * 0.26 * 0.21),
            percent: 21,
            color: OUTFLOW_PALETTE[4],
            tier: 2,
            stepRequired: 5,
            timestampStr: getTimeForStep(5),
            timeframeWindow: "48h",
            status: "Gross Settled",
            parentId: "out-2",
            priorInflows: [
              {
                id: "in-ic-1",
                sourceName: "NPCI Clearing Batch #9",
                amount: Math.round(15400 * tfMultiplier),
                mode: "IMPS",
                bank: "SBI",
                timestampStr: getTimeForStep(3),
                timeframeWindow: "48h",
                color: "#06b6d4",
              },
            ],
          },
        ],
      },
      {
        id: "out-3",
        name: "Axis Investment Escrow",
        account: "Acc #9821-8830",
        bank: "Axis Bank",
        amount: Math.round(total * 0.15),
        percent: 15,
        color: OUTFLOW_PALETTE[2],
        tier: 1,
        stepRequired: 6,
        timestampStr: getTimeForStep(6),
        timeframeWindow: "48h", // Occurred 42.6h ago (Day 1 cycle)
        status: "Verified Trust",
        priorInflows: [
          {
            id: "in-ax-1",
            sourceName: "Angel Investor Escrow",
            amount: Math.round(28000 * tfMultiplier),
            mode: "RTGS",
            bank: "Axis Bank",
            timestampStr: getTimeForStep(5),
            timeframeWindow: "48h",
            color: "#c026d3",
          },
          {
            id: "in-ax-2",
            sourceName: "Venture Debt Capital",
            amount: Math.round(14000 * tfMultiplier),
            mode: "NEFT",
            bank: "Kotak Bank",
            timestampStr: getTimeForStep(3),
            timeframeWindow: "48h",
            color: "#64748b",
          },
        ],
        children: [
          {
            id: "sub1-a1",
            name: "Mutual Fund Trust Pool",
            account: "Acc #9820-7711",
            bank: "Axis Bank",
            amount: Math.round(total * 0.15 * 0.55),
            percent: 55,
            color: OUTFLOW_PALETTE[3],
            tier: 2,
            stepRequired: 7,
            timestampStr: getTimeForStep(7),
            timeframeWindow: "48h",
            status: "Allocated",
            parentId: "out-3",
            priorInflows: [
              {
                id: "in-mf-t1",
                sourceName: "Systematic Transfer Plan",
                amount: Math.round(9800 * tfMultiplier),
                mode: "STP",
                bank: "Axis Bank",
                timestampStr: getTimeForStep(4),
                timeframeWindow: "48h",
                color: "#84cc16",
              },
            ],
          },
          {
            id: "sub1-a2",
            name: "Direct Equity Buffer",
            account: "Acc #9821-6602",
            bank: "ICICI Bank",
            amount: Math.round(total * 0.15 * 0.45),
            percent: 45,
            color: OUTFLOW_PALETTE[4],
            tier: 2,
            stepRequired: 8,
            timestampStr: getTimeForStep(8),
            timeframeWindow: "48h",
            status: "Equity Escrow",
            parentId: "out-3",
            priorInflows: [
              {
                id: "in-eq-1",
                sourceName: "Secondary Market Block",
                amount: Math.round(8200 * tfMultiplier),
                mode: "IMPS",
                bank: "ICICI Bank",
                timestampStr: getTimeForStep(5),
                timeframeWindow: "48h",
                color: "#06b6d4",
              },
            ],
          },
        ],
      },
      {
        id: "out-4",
        name: "Kotak BBPS Utility Payout",
        account: "Acc #9820-1199",
        bank: "Kotak Bank",
        amount: Math.round(total * 0.08),
        percent: 8,
        color: OUTFLOW_PALETTE[3],
        tier: 1,
        stepRequired: 5,
        timestampStr: getTimeForStep(5),
        timeframeWindow: "24h", // Occurred 16h ago (overnight cycle)
        status: "Executed",
        priorInflows: [
          {
            id: "in-kb-1",
            sourceName: "Gas Utility BBPS Inflow",
            amount: Math.round(5400 * tfMultiplier),
            mode: "UPI",
            bank: "Kotak Bank",
            timestampStr: getTimeForStep(4),
            timeframeWindow: "24h",
            color: "#84cc16",
          },
          {
            id: "in-kb-2",
            sourceName: "Water Board Direct Debit",
            amount: Math.round(2200 * tfMultiplier),
            mode: "BBPS",
            bank: "Canara Bank",
            timestampStr: getTimeForStep(2),
            timeframeWindow: "24h",
            color: "#64748b",
          },
        ],
      },
      {
        id: "out-5",
        name: "Instant Merchant Settlement",
        account: "Acc #9821-5502",
        bank: "ICICI Bank",
        amount: Math.round(total * 0.04),
        percent: 4,
        color: OUTFLOW_PALETTE[4],
        tier: 1,
        stepRequired: 4,
        timestampStr: getTimeForStep(4),
        timeframeWindow: "12h", // Occurred 4h ago (within 12h)
        status: "Completed",
        priorInflows: [
          {
            id: "in-im-1",
            sourceName: "POS Terminal QR Inbound",
            amount: Math.round(3100 * tfMultiplier),
            mode: "UPI",
            bank: "ICICI Bank",
            timestampStr: getTimeForStep(3),
            timeframeWindow: "12h",
            color: "#ca8a04",
          },
        ],
      },
      {
        id: "out-zero",
        name: getNodeDisplayName("out-zero", "Zero Address"),
        account: "0x0000...0000",
        bank: "Central Switch",
        amount: Math.round(total * 0.01),
        percent: 1,
        color: OUTFLOW_PALETTE[5],
        tier: 1,
        stepRequired: 10,
        timestampStr: getTimeForStep(10),
        timeframeWindow: "12h", // Occurred 1.3h ago / Just now (within 12h)
        status: getNodeStatus("out-zero", "Fee Burnt", isRiskPath),
        isRisk: isRiskPath,
        priorInflows: [
          {
            id: "in-z0-1",
            sourceName: "Switch Protocol Gas",
            amount: Math.round(800 * tfMultiplier),
            mode: "Burn",
            bank: "Core Switch",
            timestampStr: getTimeForStep(7),
            timeframeWindow: "12h",
            color: "#e11d48",
          },
        ],
      },
    ];
  }, [allInflows, isRiskPath, frozenNodeIds, bannedNodeIds, getTimeForStep, selectedTimeframe]);

  // Dynamically filter tree roots and their branches to only include items that occurred within the selected timeframe
  const treeRoots: TreeNode[] = useMemo(() => {
    return filterTreeByTimeframe(rawTreeRoots, selectedTimeframe);
  }, [rawTreeRoots, selectedTimeframe]);

  // Helper to retrieve prior inflows for any node
  const getNodePriorInflows = (node: TreeNode): NodeInflow[] => {
    if (node.priorInflows && node.priorInflows.length > 0) {
      return node.priorInflows;
    }
    const baseVal = Math.max(1200, Math.round(node.amount * 0.18));
    return [
      {
        id: `trib-${node.id}-1`,
        sourceName: `Prior Inflow (${node.bank})`,
        amount: baseVal,
        mode: "UPI",
        bank: node.bank,
        timestampStr: getTimeForStep(Math.max(1, node.stepRequired - 1)),
        color: "#64748b",
      },
      {
        id: `trib-${node.id}-2`,
        sourceName: `Direct Credit`,
        amount: Math.round(baseVal * 0.6),
        mode: "IMPS",
        bank: "HDFC Bank",
        timestampStr: getTimeForStep(Math.max(1, node.stepRequired - 2)),
        color: "#06b6d4",
      },
    ];
  };

  // --------------------------------------------------------------------------
  // 7. Fraud Pipeline Trail Discovery & Terminal Account Extraction
  // --------------------------------------------------------------------------
  const fraudPipelinePath = useMemo(() => {
    const path: TreeNode[] = [];
    const traverse = (nodes: TreeNode[]): boolean => {
      for (const n of nodes) {
        if (n.isTerminalMule) {
          path.push(n);
          return true;
        }
        if (n.children && n.children.length > 0) {
          if (traverse(n.children)) {
            path.unshift(n);
            return true;
          }
        }
      }
      return false;
    };
    traverse(treeRoots);
    return path;
  }, [treeRoots]);

  const terminalMuleNode = useMemo(() => {
    return fraudPipelinePath.length > 0 ? fraudPipelinePath[fraudPipelinePath.length - 1] : null;
  }, [fraudPipelinePath]);

  const fraudNodeIdSet = useMemo(() => {
    return new Set(fraudPipelinePath.map((n) => n.id));
  }, [fraudPipelinePath]);

  const handleTraceFraudPipeline = () => {
    if (isFraudTraceActive && !isRiskTx) {
      setIsFraudTraceActive(false);
      return;
    }
    const nodeIdsToExpand = new Set<string>(["out-1", "sub1-1", "sub2-1"]);
    setExpandedNodeIds((prev) => new Set([...prev, ...nodeIdsToExpand]));
    setIsFraudTraceActive(true);
    setPan({ x: -360, y: 0 });
    setZoom(0.85);
  };

  const handleFocusTerminalAccount = () => {
    // Expand path if not expanded
    setExpandedNodeIds((prev) => new Set([...prev, "out-1", "sub1-1", "sub2-1"]));
    setIsFraudTraceActive(true);
    setPan({ x: -500, y: 0 });
    setZoom(1.0);
  };

  const handleEnforceFreeze = () => {
    if (terminalMuleNode) {
      handleToggleNodeFreeze(terminalMuleNode.id, terminalMuleNode.name);
    }
  };

  const handleCopyTerminalAccount = () => {
    if (!terminalMuleNode) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(
        `TERMINAL MULE AUDIT REPORT:\nAccount: ${terminalMuleNode.account}\nBeneficiary: ${terminalMuleNode.name}\nBank: ${terminalMuleNode.bank}\nLast Amount Received: ₹${terminalMuleNode.amount.toLocaleString("en-IN")}\nTimestamp: ${terminalMuleNode.timestampStr}\nStatus: ${terminalMuleNode.status}\nInterception Order: ECL-MULE-FREEZE-2026`
      );
    }
    setCopyToast("📋 Copied Terminal Recipient Account details to clipboard!");
    setTimeout(() => setCopyToast(null), 3000);
  };

  // Determine active depth
  const activeTreeDepth = useMemo(() => {
    let maxTier = 0;
    expandedNodeIds.forEach((id) => {
      if (id.startsWith("sub2")) maxTier = Math.max(maxTier, 3);
      else if (id.startsWith("sub1")) maxTier = Math.max(maxTier, 2);
      else if (id.startsWith("out")) maxTier = Math.max(maxTier, 1);
    });
    return maxTier;
  }, [expandedNodeIds]);

  const visibleInflows = useMemo(
    () => allInflows.filter((inf) => inf.stepRequired <= currentStep),
    [allInflows, currentStep]
  );

  const activeInflowSum = useMemo(
    () => visibleInflows.reduce((acc, it) => acc + it.amount, 0),
    [visibleInflows]
  );

  const formatRupee = (num: number) => "₹" + num.toLocaleString("en-IN");

  // Standard Canvas Dimensions matching natural viewBox with generous horizontal margins
  const svgWidth = 1440;
  const svgHeight = 600;
  const centerX = 460;
  const centerY = 300;

  // Inflows Y layout
  const inflowYs = useMemo(() => {
    const topMargin = 40;
    const bottomMargin = 550;
    const step = (bottomMargin - topMargin) / (allInflows.length - 1);
    return allInflows.map((_, i) => bottomMargin - i * step);
  }, [allInflows.length]);

  // Compute all visible branches and nodes using Non-Colliding Tidy Tree Algorithm
  interface PositionedNode {
    node: TreeNode;
    x: number;
    y: number;
    parentX: number;
    parentY: number;
  }

  // Calculate the vertical slot weight (leaves count) for any subtree
  const getNodeSlotWeight = (node: TreeNode, expandedSet: Set<string>): number => {
    if (!expandedSet.has(node.id) || !node.children || node.children.length === 0) {
      return 1;
    }
    let weight = 0;
    for (const child of node.children) {
      weight += getNodeSlotWeight(child, expandedSet);
    }
    return Math.max(1, weight);
  };

  const TIER_X = [centerX, 760, 1040, 1320, 1600];

  const { positionedBranches, totalNodeCount } = useMemo(() => {
    const branches: PositionedNode[] = [];
    let count = allInflows.length;

    // Total slot weight across all Tier 1 roots
    const totalSlots = treeRoots.reduce(
      (acc, root) => acc + getNodeSlotWeight(root, expandedNodeIds),
      0
    );

    // Dynamic slot height: gives generous padding when few branches, comfortable spacing when many
    const minTreeHeight = 440;
    const slotHeight = Math.max(46, Math.min(76, minTreeHeight / Math.max(1, totalSlots)));
    const totalTreeHeight = totalSlots * slotHeight;
    const treeStartY = centerY - totalTreeHeight / 2 + slotHeight / 2;

    // Recursive subtree placer that guarantees 100% distinct, non-overlapping Y channels
    const layoutNode = (
      node: TreeNode,
      slotOffset: number,
      tier: number,
      parentX: number,
      parentY: number
    ): number => {
      count++;
      const weight = getNodeSlotWeight(node, expandedNodeIds);

      // Node is centered on its dedicated vertical slot band
      const nodeY = treeStartY + (slotOffset + (weight - 1) / 2) * slotHeight;
      const nodeX = TIER_X[tier] || (760 + (tier - 1) * 280);

      branches.push({
        node,
        x: nodeX,
        y: nodeY,
        parentX,
        parentY,
      });

      // If expanded, allocate non-overlapping slot slices for each child
      if (expandedNodeIds.has(node.id) && node.children && node.children.length > 0) {
        let childSlotOffset = slotOffset;
        for (const child of node.children) {
          const childWeight = getNodeSlotWeight(child, expandedNodeIds);
          layoutNode(child, childSlotOffset, tier + 1, nodeX, nodeY);
          childSlotOffset += childWeight;
        }
      }

      return weight;
    };

    let currentRootSlot = 0;
    for (const rootNode of treeRoots) {
      const rootWeight = layoutNode(rootNode, currentRootSlot, 1, centerX, centerY);
      currentRootSlot += rootWeight;
    }

    return { positionedBranches: branches, totalNodeCount: count };
  }, [treeRoots, expandedNodeIds, allInflows.length, centerX, centerY]);

  const totalExecutedCount = useMemo(() => {
    return (
      visibleInflows.length +
      positionedBranches.filter((b) => b.node.stepRequired <= currentStep).length
    );
  }, [visibleInflows, positionedBranches, currentStep]);

  return (
    <div className={styles.flowChartContainer}>
      {/* Header Bar: Minimalist Back button with Manual Sync, Freeze/Unfreeze, and Ban/Unban section */}
      <div className={styles.flowHeader}>
        <div className={styles.headerLeftGroup}>
          {/* 1. Only Back to Dashboard option */}
          <button
            type="button"
            className={styles.backButton}
            onClick={onBack}
            title="Return to Dashboard"
          >
            <ArrowLeft size={15} strokeWidth={2.5} />
            <span>Back to Dashboard</span>
          </button>

          <div className={styles.headerDivider} />

          {/* 2. Manual Sync Option */}
          <button
            type="button"
            className={`${styles.headerActionBtn} ${isSyncing ? styles.headerActionBtnSyncing : ""}`}
            onClick={handleManualSync}
            title="Manually synchronize network state, clearing ledger, and RBI rails"
          >
            <RotateCcw size={13} strokeWidth={2.4} className={isSyncing ? styles.spinIcon : ""} />
            <span>{isSyncing ? "Syncing..." : "Manual Sync"}</span>
            <span className={styles.headerActionBadge}>{lastSyncedTime}</span>
          </button>

          {/* 3. Manual Freeze and Unfreeze for all Fraud Network */}
          <button
            type="button"
            className={`${styles.headerActionBtn} ${
              isAllFraudFrozen ? styles.headerActionBtnFrozen : styles.headerActionBtnFreeze
            }`}
            onClick={handleToggleFreezeAllFraud}
            title={
              isAllFraudFrozen
                ? "Click to manually unfreeze all fraud network accounts"
                : "Click to manually freeze all fraud network accounts"
            }
          >
            {isAllFraudFrozen ? (
              <Unlock size={13} strokeWidth={2.4} />
            ) : (
              <Lock size={13} strokeWidth={2.4} />
            )}
            <span>{isAllFraudFrozen ? "Unfreeze Fraud Network" : "Manual Freeze All Fraud Network"}</span>
            <span
              className={`${styles.headerActionStatusPill} ${
                isAllFraudFrozen ? styles.statusPillFrozen : styles.statusPillActive
              }`}
            >
              {isAllFraudFrozen ? "5 FROZEN" : "UNFROZEN"}
            </span>
          </button>

          {/* 4. Manual Ban or Unban Section */}
          <button
            type="button"
            className={`${styles.headerActionBtn} ${
              bannedNodeIds.size > 0 ? styles.headerActionBtnBanned : styles.headerActionBtnNeutral
            }`}
            onClick={() => setIsBanModalOpen(true)}
            title="Open manual ban or unban control panel for fraud network accounts"
          >
            <Ban size={13} strokeWidth={2.4} />
            <span>Manual Ban / Unban Section</span>
            <span
              className={`${styles.headerActionStatusPill} ${
                bannedNodeIds.size > 0 ? styles.statusPillBanned : styles.statusPillNeutral
              }`}
            >
              {bannedNodeIds.size > 0 ? `${bannedNodeIds.size} BANNED` : "0 BANNED"}
            </span>
          </button>
        </div>


      </div>

      {/* Main Roamable SVG Canvas Space */}
      <div
        className={`${styles.svgCanvasWrapper} ${isDragging ? styles.isDraggingCursor : styles.grabCursor}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Floating Pan & Zoom Camera Controls Overlay (Top Right) */}
        <div className={styles.canvasControlOverlay}>
          <div className={styles.navButtonGroup}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className={styles.zoomPercentText}>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <div className={styles.navDivider} />
            <button
              type="button"
              className={styles.navBtn}
              onClick={handleResetView}
              title="Reset View"
            >
              <RotateCcw size={12} />
              <span className={styles.resetLabel}>Reset</span>
            </button>
          </div>
        </div>



        {/* Manual Ban / Unban Management Modal */}
        {isBanModalOpen && (
          <div
            className={styles.banModalOverlay}
            onClick={() => setIsBanModalOpen(false)}
          >
            <div
              className={styles.banModalContainer}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={styles.banModalHeader}>
                <div className={styles.banModalTitleGroup}>
                  <div className={styles.banModalIconBox}>
                    <ShieldAlert size={18} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h3 className={styles.banModalHeading}>
                      Manual Ban / Unban &amp; Fraud Network Control
                    </h3>
                    <p className={styles.banModalSubheading}>
                      Enforce interbank account blacklists, manual bans, and asset freezes across the detected fraud pipeline.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.banModalCloseBtn}
                  onClick={() => setIsBanModalOpen(false)}
                  title="Close Modal"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Master Global Actions Bar */}
              <div className={styles.banMasterActionsBar}>
                <div className={styles.banMasterLeft}>
                  <span className={styles.banMasterLabel}>Master Network Actions:</span>
                </div>
                <div className={styles.banMasterRight}>
                  <button
                    type="button"
                    className={`${styles.banMasterBtn} ${
                      isAllFraudBanned ? styles.banMasterBtnActive : ""
                    }`}
                    onClick={handleToggleBanAllFraud}
                  >
                    <Ban size={13} />
                    <span>{isAllFraudBanned ? "Unban All Fraud Accounts" : "Ban All Fraud Accounts"}</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.banMasterBtn} ${
                      isAllFraudFrozen ? styles.freezeMasterBtnActive : ""
                    }`}
                    onClick={handleToggleFreezeAllFraud}
                  >
                    {isAllFraudFrozen ? <Unlock size={13} /> : <Lock size={13} />}
                    <span>{isAllFraudFrozen ? "Unfreeze Network" : "Freeze All Network"}</span>
                  </button>
                  <button
                    type="button"
                    className={styles.syncMasterBtn}
                    onClick={handleManualSync}
                  >
                    <RotateCcw size={12} className={isSyncing ? styles.spinIcon : ""} />
                    <span>Manual Sync</span>
                  </button>
                </div>
              </div>

              {/* Account Management List */}
              <div className={styles.banAccountList}>
                {(() => {
                  const total = allInflows.reduce((sum, it) => sum + it.amount, 0);
                  return [
                    {
                      id: "out-1",
                      role: "Layer-1 Mule Conduit",
                      name: "Rahul Verma (ICICI Primary Savings)",
                      account: "Acc #9820-7712",
                      bank: "ICICI Bank",
                      amount: Math.round(total * 0.46),
                      isTarget: false,
                      reason: "Direct recipient from focal account, rapid funneling relay",
                    },
                    {
                      id: "sub1-1",
                      role: "Layer-2 Shell Relay",
                      name: "Apex Cloud Global Escrow",
                      account: "Acc #9821-4490",
                      bank: "Axis Bank",
                      amount: Math.round(total * 0.46 * 0.5),
                      isTarget: false,
                      reason: "Synthetic commercial escrow disguise relay",
                    },
                    {
                      id: "sub2-1",
                      role: "Layer-3 Smurf Hub",
                      name: "Vikram Singhania",
                      account: "Acc #9820-1190",
                      bank: "State Bank of India (SBI)",
                      amount: Math.round(total * 0.46 * 0.5 * 0.52),
                      isTarget: false,
                      reason: "Smurfing hub aggregator distributing to cash-out mules",
                    },
                    {
                      id: "sub3-1",
                      role: "Layer-4 Terminal Mule (Last Received)",
                      name: "State Bank Final Deposit",
                      account: "Acc #9820-9901",
                      bank: "State Bank of India (SBI)",
                      amount: Math.round(total * 0.46 * 0.5 * 0.52 * 0.55),
                      isTarget: true,
                      reason: "🎯 Final terminal recipient account that received the last money",
                    },
                    {
                      id: "out-zero",
                      role: "Exit Quarantine Sink",
                      name: "RBI Compliance Zero Sink",
                      account: "0x0000...0000",
                      bank: "Central Switch",
                      amount: Math.round(total * 0.46 * 0.5 * 0.52 * 0.10),
                      isTarget: false,
                      reason: "Switch protocol fee & quarantine burn sink",
                    },
                  ];
                })().map((acc) => {
                  const isBanned = bannedNodeIds.has(acc.id);
                  const isFrozen = frozenNodeIds.has(acc.id);

                  return (
                    <div
                      key={acc.id}
                      className={`${styles.banAccountItem} ${
                        acc.isTarget ? styles.banAccountTarget : ""
                      } ${isBanned ? styles.banAccountIsBanned : ""}`}
                    >
                      <div className={styles.banAccountMeta}>
                        <div className={styles.banAccountHeaderRow}>
                          <span className={styles.banAccountRole}>{acc.role}</span>
                          {acc.isTarget && (
                            <span className={styles.banTargetBadge}>🎯 TARGET MULE</span>
                          )}
                          {isBanned && <span className={styles.banBannedBadge}>⛔ BANNED</span>}
                          {isFrozen && <span className={styles.banFrozenBadge}>🔒 FROZEN</span>}
                        </div>
                        <div className={styles.banAccountName}>{acc.name}</div>
                        <div className={styles.banAccountDetails}>
                          <span>{acc.account}</span>
                          <span>•</span>
                          <span>{acc.bank}</span>
                          <span>•</span>
                          <span className={styles.banAccountAmount}>
                            ₹{acc.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className={styles.banAccountReason}>{acc.reason}</div>
                      </div>

                      <div className={styles.banAccountActions}>
                        <button
                          type="button"
                          className={`${styles.nodeBanToggleBtn} ${
                            isBanned ? styles.nodeBanActive : styles.nodeBanInactive
                          }`}
                          onClick={() => handleToggleNodeBan(acc.id, acc.name)}
                        >
                          <Ban size={12} />
                          <span>{isBanned ? "Unban Account" : "Ban Account"}</span>
                        </button>

                        <button
                          type="button"
                          className={`${styles.nodeFreezeToggleBtn} ${
                            isFrozen ? styles.nodeFreezeActive : styles.nodeFreezeInactive
                          }`}
                          onClick={() => handleToggleNodeFreeze(acc.id, acc.name)}
                        >
                          {isFrozen ? <Unlock size={12} /> : <Lock size={12} />}
                          <span>{isFrozen ? "Unfreeze" : "Freeze"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className={styles.banModalFooter}>
                <div className={styles.banModalSummary}>
                  <span>Order Reference: <strong>ECL-INTERDICT-2026-RBI</strong></span>
                  <span>•</span>
                  <span>Last Synced: <strong>{lastSyncedTime}</strong></span>
                </div>
                <button
                  type="button"
                  className={styles.banModalDoneBtn}
                  onClick={() => setIsBanModalOpen(false)}
                >
                  Done / Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tributary Inflow Hover Tooltip */}
        {hoveredTributary && (
          <div
            className={styles.tributaryTooltipBox}
            style={{
              left: `${hoveredTributary.screenX}px`,
              top: `${hoveredTributary.screenY - 50}px`,
            }}
          >
            <div className={styles.tributaryTooltipHeader}>
              <span>⬇ Prior Inbound:</span>
              <span>{hoveredTributary.inflow.sourceName}</span>
            </div>
            <div className={styles.tributaryTooltipMeta}>
              +{formatRupee(hoveredTributary.inflow.amount)} • [{hoveredTributary.inflow.timestampStr}] via{" "}
              {hoveredTributary.inflow.bank} ({hoveredTributary.inflow.mode})
            </div>
          </div>
        )}

        {/* Copy Toast Feedback */}
        {copyToast && (
          <div className={styles.toastCopyNotification}>
            <Check size={14} color="#10b981" />
            <span>{copyToast}</span>
          </div>
        )}

        {/* The SVG Canvas itself */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className={styles.flowSvgCanvas}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Inflow Gradients */}
            {allInflows.map((inf) => (
              <linearGradient
                key={`grad-in-${inf.id}`}
                id={`grad-in-${inf.id}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor={inf.color} stopOpacity="0.9" />
                <stop offset="65%" stopColor={inf.color} stopOpacity="1" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="1" />
              </linearGradient>
            ))}

            {/* Central Mixing Circle Gradients */}
            <radialGradient id="centralCircleGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="70%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </radialGradient>
            <radialGradient id="centralCircleRiskGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="70%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#be123c" />
            </radialGradient>

            {/* Glowing Filter for Hovered Route */}
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Laser Glow Filter for Fraudulent Pipeline */}
            <filter id="fraudGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ==========================================================================
              STATIONARY STRUCTURE GROUP (Free roam around this coordinate space)
              ========================================================================== */}
          <g
            transform={`translate(${svgWidth / 2 + pan.x}, ${
              svgHeight / 2 + pan.y
            }) scale(${zoom}) translate(${-svgWidth / 2}, ${-svgHeight / 2})`}
            style={{
              transformOrigin: `${centerX}px ${centerY}px`,
              transition: isDragging ? "none" : "transform 0.08s ease-out",
            }}
          >
            {/* Central Vertical Alignment Guide Line / Pillar */}
            <rect
              x={centerX - 7}
              y="0"
              width="14"
              height={svgHeight}
              fill="rgba(2, 132, 199, 0.03)"
            />
            <line
              x1={centerX}
              y1="0"
              x2={centerX}
              y2={svgHeight}
              stroke="rgba(2, 132, 199, 0.25)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Tier Guide Column Headers */}
            <text x="760" y="24" textAnchor="middle" className={styles.tierGuideTitle}>
              Tier 1: Direct Outflows
            </text>
            {expandedNodeIds.size > 0 && (
              <text x="1040" y="24" textAnchor="middle" className={styles.tierGuideTitle}>
                Tier 2: Sub-Transfers (1/3)
              </text>
            )}
            {activeTreeDepth >= 2 && (
              <text x="1320" y="24" textAnchor="middle" className={styles.tierGuideTitle}>
                Tier 3: Sub-Transfers (2/3)
              </text>
            )}
            {activeTreeDepth >= 3 && (
              <text x="1600" y="24" textAnchor="middle" className={styles.tierGuideTitle}>
                Tier 4: Settled Sinks (3/3)
              </text>
            )}

            {/* ==========================================================================
                1. LEFT INFLOW PIPES (Central Node Inflows): Rendered dynamically
                ========================================================================== */}
            {allInflows.map((inf, idx) => {
              const isExecuted = inf.stepRequired <= currentStep;
              const startX = 220;
              const startY = inflowYs[idx];
              const endX = centerX;
              const endY = centerY;

              const dx = (endX - startX) * 0.55;
              const pathD = `M ${startX} ${startY} C ${
                startX + dx
              } ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

              const strokeWidth = Math.max(2, Math.min(3.8, (inf.amount / 100000) * 8));
              const isHovered = hoveredPipe === inf.id;

              return (
                <g
                  key={inf.id}
                  className={`${styles.pipeGroup} ${isExecuted ? styles.pipeVisible : styles.pipeHidden}`}
                  onMouseEnter={() => setHoveredPipe(inf.id)}
                  onMouseLeave={() => setHoveredPipe(null)}
                >
                  {/* Outer Glow on hover */}
                  {isHovered && isExecuted && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={resolveColor(inf.color)}
                      strokeWidth={strokeWidth + 5}
                      strokeOpacity="0.45"
                      filter="url(#glowEffect)"
                    />
                  )}

                  {/* Main Flow Ribbon Pipe */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={`url(#grad-in-${inf.id})`}
                    strokeWidth={isHovered ? strokeWidth + 1.5 : strokeWidth}
                    strokeLinecap="round"
                    className={isExecuted ? styles.animatedStreamPath : ""}
                    style={{
                      transition: "stroke-width 0.2s ease, opacity 0.3s ease",
                    }}
                  />

                  {/* Left Source Small Circular Endpoint Terminal */}
                  <circle
                    cx={startX}
                    cy={startY}
                    r={isHovered ? 5.5 : 4}
                    fill={resolveColor(inf.color)}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className={styles.endpointCircle}
                  />

                  {/* Left Source Text Label Card */}
                  <g
                    transform={`translate(${startX - 12}, ${startY})`}
                    className={styles.svgNodeLabelLeft}
                  >
                    <text
                      x="0"
                      y="-4"
                      textAnchor="end"
                      className={`${styles.svgLabelTitle} ${styles.labelTitleLight} ${
                        inf.isPrimary ? styles.labelPrimary : ""
                      }`}
                    >
                      {inf.sourceName}
                    </text>
                    <text x="0" y="9" textAnchor="end" className={styles.svgLabelMeta}>
                      <tspan fill={inf.color} fontWeight="700">
                        {formatRupee(inf.amount)}
                      </tspan>
                      <tspan fill="#64748b"> ({inf.bank}) • </tspan>
                      <tspan fill="#0284c7" fontWeight="600">
                        [{inf.timestampStr}]
                      </tspan>
                    </text>
                  </g>
                </g>
              );
            })}

            {/* ==========================================================================
                2. RIGHT OUTFLOW & MULTI-TIER TREE PIPES (Non-Colliding Recursive Layout)
                ========================================================================== */}
            {positionedBranches.map(({ node, x, y, parentX, parentY }) => {
              const isExecuted = node.stepRequired <= currentStep;
              const hasChildren = Boolean(node.children && node.children.length > 0);
              const isExpanded = expandedNodeIds.has(node.id);
              const isHovered = hoveredPipe === node.id;
              
              // Only the pipeline from the main user to the first next user (Tier 1) is bold
              const isFirstMainHop = isRiskPath && node.tier === 1 && (node.id === "out-1" || fraudNodeIdSet.has(node.id));
              // Every subsequent dot and its outgoing transfers (Tier >= 2) are red but not as bold
              const isSubsequentFraudBranch = isRiskPath && node.tier >= 2;
              const isAnyFraudBranch = isFirstMainHop || isSubsequentFraudBranch;
              
              const isTerminalAccount = isRiskPath && Boolean(node.isTerminalMule);
              const priorInflows = getNodePriorInflows(node);

              const dx = (x - parentX) * 0.55;
              const pathD = `M ${parentX} ${parentY} C ${parentX + dx} ${parentY}, ${
                x - dx
              } ${y}, ${x} ${y}`;

              const baseStrokeWidth = Math.max(2, Math.min(3.8, (node.amount / 100000) * 8));

              // Pipe stroke styling: Only first hop is bold & glowing, subsequent branches are red & sleek (not bold)
              const pipeStroke = resolveColor(
                isFirstMainHop
                  ? "#e11d48"
                  : isSubsequentFraudBranch
                  ? "#f43f5e"
                  : node.color
              );

              const pipeStrokeWidth = isFirstMainHop
                ? (isHovered ? baseStrokeWidth + 2.0 : baseStrokeWidth + 0.6)
                : isSubsequentFraudBranch
                ? (isHovered ? 2.4 : 1.8)
                : (isHovered ? baseStrokeWidth + 1.5 : baseStrokeWidth);

              const pipeOpacity = isFirstMainHop
                ? 1.0
                : isSubsequentFraudBranch
                ? (isHovered ? 0.95 : 0.82)
                : 1.0;

              const bubbleFill = resolveColor(
                isTerminalAccount || isFirstMainHop
                  ? "#e11d48"
                  : isSubsequentFraudBranch
                  ? "#f43f5e"
                  : node.color
              );

              return (
                <g
                  key={node.id}
                  id={`branch-group-${node.id}`}
                  data-node-id={node.id}
                  className={`${styles.pipeGroup} ${isExecuted ? styles.pipeVisible : styles.pipeHidden}`}
                  onMouseEnter={() => setHoveredPipe(node.id)}
                  onMouseLeave={() => setHoveredPipe(null)}
                >
                  {/* ==================================================================
                      A. PROMINENT LARGE INCOMING PIPELINES (PRIOR INFLOWS) FOR THIS HOP
                      ================================================================== */}
                  {priorInflows.map((trib, tIdx) => {
                    // Calculate sweeping upstream entry positions that never clash with parent pipe
                    const isParentBelow = parentY > y + 5;
                    const isParentAbove = parentY < y - 5;

                    // Dedicated vertical trajectory: sweeps from the open quadrant opposite the parent pipe
                    let tDy = 0;
                    if (isParentBelow) {
                      // Parent pipe curves in from bottom-left -> extra incoming pipes sweep in cleanly from top-left
                      tDy = tIdx === 0 ? -34 : tIdx === 1 ? -64 : -90;
                    } else if (isParentAbove) {
                      // Parent pipe curves in from top-left -> extra incoming pipes sweep in cleanly from bottom-left
                      tDy = tIdx === 0 ? 34 : tIdx === 1 ? 64 : 90;
                    } else {
                      // Parent is horizontal -> fan above and below
                      tDy = tIdx === 0 ? -34 : tIdx === 1 ? 34 : -64;
                    }

                    // Large, prominent horizontal span (160px - 180px)
                    const tStartX = x - (tIdx === 0 ? 175 : 155);
                    const tStartY = y + tDy;
                    const tDx = (x - tStartX) * 0.52;
                    const tPathD = `M ${tStartX} ${tStartY} C ${tStartX + tDx} ${tStartY}, ${
                      x - tDx * 0.75
                    } ${y}, ${x} ${y}`;
                    const isTribHovered = hoveredPipe === trib.id;
                    const tribStrokeWidth = Math.max(2.4, Math.min(3.6, (trib.amount / 50000) * 3.8));

                    return (
                      <g
                        key={trib.id}
                        id={`hop-inflow-${trib.id}`}
                        className={`${styles.tributaryGroup} ${isExecuted ? styles.pipeVisible : styles.pipeHidden}`}
                        onMouseEnter={(e) => {
                          setHoveredPipe(trib.id);
                          setHoveredTributary({
                            inflow: trib,
                            screenX: e.clientX,
                            screenY: e.clientY,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredPipe(null);
                          setHoveredTributary(null);
                        }}
                      >
                        {/* Outer Glow on hover */}
                        {isTribHovered && isExecuted && (
                          <path
                            d={tPathD}
                            fill="none"
                            stroke={resolveColor(trib.color || "#0284c7")}
                            strokeWidth={tribStrokeWidth + 4.5}
                            strokeOpacity="0.45"
                            filter="url(#glowEffect)"
                          />
                        )}

                        {/* Invisible wider hover hit target */}
                        <path
                          d={tPathD}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="16"
                          style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        />

                        {/* Substantial, Large Incoming Ribbon Pipeline */}
                        <path
                          d={tPathD}
                          fill="none"
                          stroke={resolveColor(trib.color || "#0284c7")}
                          strokeWidth={isTribHovered ? tribStrokeWidth + 1.2 : tribStrokeWidth}
                          strokeLinecap="round"
                          strokeOpacity={isTribHovered ? 0.95 : 0.82}
                          className={`${styles.tributaryPath} ${styles.animatedTributaryPath}`}
                          style={{
                            transition: "stroke-width 0.2s ease, stroke-opacity 0.2s ease",
                          }}
                        />

                        {/* Upstream Start Terminal Circle */}
                        <circle
                          cx={tStartX}
                          cy={tStartY}
                          r={isTribHovered ? 5 : 3.8}
                          fill={resolveColor(trib.color || "#0284c7")}
                          stroke="#ffffff"
                          strokeWidth="1.8"
                          className={styles.tributaryInletCircle}
                        />
                      </g>
                    );
                  })}

                  {/* ==================================================================
                      B. MAIN PARENT CONNECTING RIBBON PIPE
                      ================================================================== */}
                  {/* Outer Glow on hover */}
                  {isHovered && isExecuted && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={pipeStroke}
                      strokeWidth={pipeStrokeWidth + 3}
                      strokeOpacity="0.35"
                      filter="url(#glowEffect)"
                    />
                  )}

                  {/* Main Flow Ribbon Pipe */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={pipeStroke}
                    strokeWidth={pipeStrokeWidth}
                    strokeLinecap="round"
                    strokeOpacity={pipeOpacity}
                    className={`${isExecuted ? styles.animatedStreamPath : ""} ${
                      isFirstMainHop
                        ? styles.animatedFraudLaserPath
                        : isSubsequentFraudBranch
                        ? styles.animatedSubFraudPath
                        : ""
                    }`}
                    style={{
                      transition: "stroke-width 0.2s ease, opacity 0.3s ease",
                    }}
                  />

                  {/* Terminal Mule Radar Pulse Rings */}
                  {isTerminalAccount && isExecuted && (
                    <g>
                      <circle
                        cx={x}
                        cy={y}
                        r={12}
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth="1.5"
                        className={styles.terminalRadarRing1}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={18}
                        fill="none"
                        stroke="#fb7185"
                        strokeWidth="1.2"
                        className={styles.terminalRadarRing2}
                      />
                    </g>
                  )}

                  {/* ==================================================================
                      C. INTERACTIVE ENDPOINT BUBBLE / DOT
                      ================================================================== */}
                  <g
                    id={`endpoint-${node.id}`}
                    data-endpoint-btn={node.id}
                    className={styles.endpointTargetGroup}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isTerminalAccount) {
                        handleFocusTerminalAccount();
                      } else {
                        toggleExpand(node.id, node.tier);
                      }
                    }}
                    style={{ cursor: node.tier < 4 && hasChildren ? "pointer" : isTerminalAccount ? "pointer" : "default" }}
                  >
                    {/* Pulsing indicator ring when not expanded and can be expanded */}
                    {!isExpanded && node.tier < 4 && hasChildren && isExecuted && !isTerminalAccount && (
                      <circle
                        cx={x}
                        cy={y}
                        r={8}
                        fill="none"
                        stroke={resolveColor(isAnyFraudBranch ? "#f43f5e" : node.color)}
                        strokeWidth="1.2"
                        className={styles.endpointPulseRing}
                      />
                    )}

                    {/* Main circular bubble */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 7.5 : isExpanded ? 6.5 : isTerminalAccount ? 8 : (isSubsequentFraudBranch ? 4.8 : 5)}
                      fill={bubbleFill}
                      stroke="#ffffff"
                      strokeWidth={isExpanded || isTerminalAccount || isFirstMainHop ? "2.5" : "1.8"}
                      className={`${styles.endpointCircle} ${
                        isExpanded ? styles.endpointCircleExpanded : ""
                      }`}
                    />

                    {/* Expansion +/- symbol on bubble */}
                    {node.tier < 4 && hasChildren && (
                      <text
                        x={x}
                        y={y + 3.2}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="900"
                        pointerEvents="none"
                        style={{ userSelect: "none" }}
                      >
                        {isExpanded ? "−" : "+"}
                      </text>
                    )}

                    {/* Target crosshair symbol on terminal account */}
                    {isTerminalAccount && (
                      <text
                        x={x}
                        y={y + 3.5}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="900"
                        pointerEvents="none"
                        style={{ userSelect: "none" }}
                      >
                        🎯
                      </text>
                    )}
                  </g>

                  {/* ==================================================================
                      D. TEXT LABEL CARD (FLOATING OR TO THE RIGHT)
                      ================================================================== */}
                  {isExpanded ? (
                    <g
                      data-endpoint-btn={node.id}
                      transform={`translate(${x}, ${y <= 65 ? y + 26 : y - 28})`}
                      className={styles.svgNodeLabelExpanded}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.id, node.tier);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <rect
                        x="-100"
                        y="-19"
                        width="200"
                        height="26"
                        rx="6"
                        fill="rgba(255, 255, 255, 0.94)"
                        stroke={resolveColor(isFirstMainHop ? "#e11d48" : isSubsequentFraudBranch ? "#f43f5e" : node.color)}
                        strokeWidth={isFirstMainHop ? "1.4" : "1.1"}
                        className={styles.expandedLabelRect}
                      />
                      <text
                        x="0"
                        y="-6"
                        textAnchor="middle"
                        className={`${styles.svgLabelTitle} ${styles.labelTitleLight} ${
                          isAnyFraudBranch ? styles.labelRisk : ""
                        }`}
                      >
                        {node.name}
                      </text>
                      <text x="0" y="5" textAnchor="middle" className={styles.svgLabelMeta}>
                        <tspan fill={resolveColor(isAnyFraudBranch ? "#e11d48" : node.color)} fontWeight="700">
                          {formatRupee(node.amount)}
                        </tspan>
                        <tspan fill="#64748b"> ({node.percent}%) • </tspan>
                        <tspan fill="#0284c7" fontWeight="600">
                          [{getTimeForStep(node.stepRequired)}]
                        </tspan>
                      </text>
                    </g>
                  ) : (
                    <g
                      data-endpoint-btn={node.id}
                      transform={`translate(${x + 14}, ${y})`}
                      className={styles.svgNodeLabelRight}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.id, node.tier);
                      }}
                      style={{ cursor: node.tier < 4 && hasChildren ? "pointer" : "default" }}
                    >
                      <text
                        x="0"
                        y="-4"
                        textAnchor="start"
                        className={`${styles.svgLabelTitle} ${styles.labelTitleLight} ${
                          isAnyFraudBranch || node.isRisk ? styles.labelRisk : ""
                        }`}
                      >
                        {node.name}
                      </text>
                      <text x="0" y="9" textAnchor="start" className={styles.svgLabelMeta}>
                        <tspan fill={resolveColor(isAnyFraudBranch ? "#e11d48" : node.color)} fontWeight="700">
                          {formatRupee(node.amount)}
                        </tspan>
                        <tspan fill="#64748b"> ({node.percent}%) • </tspan>
                        <tspan fill="#0284c7" fontWeight="600">
                          [{getTimeForStep(node.stepRequired)}]
                        </tspan>
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ==========================================================================
                3. CENTRAL FOCAL NODE: Small mixing circle where each point is mixed
                ========================================================================== */}
            <g
              className={styles.centralEntityGroup}
              onMouseEnter={() => setHoveredPipe("central-node")}
              onMouseLeave={() => setHoveredPipe(null)}
            >
              {/* Outer Subtle Pulse / Halo */}
              <circle
                cx={centerX}
                cy={centerY}
                r={20}
                fill={isRiskPath ? "rgba(225, 29, 72, 0.15)" : "rgba(2, 132, 199, 0.12)"}
                stroke={isRiskPath ? "rgba(225, 29, 72, 0.4)" : "rgba(2, 132, 199, 0.35)"}
                strokeWidth="1.5"
                className={styles.centralHaloCircle}
              />

              {/* Core Small Circle Mixing Hub */}
              <circle
                cx={centerX}
                cy={centerY}
                r={12}
                fill={isRiskPath ? "url(#centralCircleRiskGrad)" : "url(#centralCircleGrad)"}
                stroke="#ffffff"
                strokeWidth="2.5"
                className={styles.centralCoreCircle}
                filter={hoveredPipe === "central-node" ? "url(#glowEffect)" : undefined}
              />

              {/* Inner Center Dot */}
              <circle
                cx={centerX}
                cy={centerY}
                r={3.5}
                fill="#ffffff"
                className={styles.centralInnerDot}
              />

              {/* Central Node Floating Info Badge */}
              <g transform={`translate(${centerX}, ${centerY - 26})`}>
                <rect
                  x="-120"
                  y="-40"
                  width="240"
                  height="46"
                  rx="10"
                  fill="#ffffff"
                  stroke={isRiskPath ? "#e11d48" : "#0284c7"}
                  strokeWidth="1.5"
                  filter="url(#glowEffect)"
                />
                <text
                  x="0"
                  y="-21"
                  textAnchor="middle"
                  className={`${styles.centralBadgeUser} ${styles.badgeUserLight}`}
                >
                  👤 {transaction.recipient}
                </text>
                <text
                  x="0"
                  y="-6"
                  textAnchor="middle"
                  className={`${styles.centralBadgeSub} ${styles.badgeSubLight}`}
                >
                  Active Inflow: {formatRupee(activeInflowSum)} • {visibleInflows.length} Sources
                </text>
              </g>
            </g>
          </g>
        </svg>

        {/* ==========================================================================
            4. SLEEK FLOATING TIMELINE DOCK (12h / 24h / 48h Timeframes, Scrubber & Controls)
            ========================================================================== */}
        <div className={styles.timelineDockContainer}>
          <div className={styles.timelineDock}>
            {/* Circular Play / Pause Toggle Button */}
            <button
              type="button"
              className={`${styles.dockPlayBtn} ${isPlaying ? styles.dockPlayBtnActive : ""}`}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause Timeline" : "Play Timeline Evolution"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
            </button>

            {/* Timeframe Scope Selector: 12 Hours, 24 Hours, 48 Hours */}
            <div className={styles.timeframeSegmentedWrap}>
              {(
                [
                  { key: "12h", label: "12 Hours", shortLabel: "12h" },
                  { key: "24h", label: "24 Hours", shortLabel: "24h" },
                  { key: "48h", label: "48 Hours", shortLabel: "48h" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`${styles.timeframeOptionBtn} ${
                    selectedTimeframe === opt.key ? styles.timeframeOptionActive : ""
                  }`}
                  onClick={() => setSelectedTimeframe(opt.key)}
                  title={`Set audit timeframe window to ${opt.label}`}
                >
                  <span className={styles.timeframeFullLabel}>{opt.label}</span>
                  <span className={styles.timeframeShortLabel}>{opt.shortLabel}</span>
                </button>
              ))}
            </div>

            <div className={styles.dockDivider} />

            {/* Time Display */}
            <div className={styles.dockTimeGroup}>
              <span className={styles.dockTimeValue}>{currentMilestone.timeLabel}</span>
              <span className={styles.dockTimeSub}>{currentMilestone.relLabel}</span>
            </div>

            <div className={styles.dockDivider} />

            {/* Clean Timeline Slider with Dynamic Progress Fill */}
            <div className={styles.dockSliderWrap}>
              <span className={styles.sliderBoundLabel}>{currentMilestones[0].relLabel}</span>
              <div className={styles.sliderTrackWrapper}>
                <div
                  className={styles.sliderProgressFill}
                  style={{ width: `${((currentStep - 1) / 9) * 100}%` }}
                />
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={currentStep}
                  onChange={(e) => {
                    setCurrentStep(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className={styles.dockRangeInput}
                  aria-label="Timeline scrubber"
                />
              </div>
              <span className={styles.sliderBoundLabel}>Now</span>
            </div>

            <div className={styles.dockDivider} />

            {/* Transaction Count Badge with Realtime Volume */}
            <div className={styles.dockCountBadge}>
              <span className={styles.countDot} />
              <span className={styles.countText}>
                <strong>{totalExecutedCount}</strong> / {totalNodeCount} Active
                <span className={styles.dockVolSeparator}>•</span>
                <strong>{formatRupee(activeInflowSum)}</strong>
              </span>
            </div>

            {/* Single Speed Cycle Button */}
            <button
              type="button"
              className={styles.dockSpeedBtn}
              onClick={handleCycleSpeed}
              title="Click to change playback speed"
            >
              {playSpeed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
