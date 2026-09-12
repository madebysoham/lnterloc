"use client";

import React, { useState } from "react";
import styles from "./MobileSimulator.module.css";
import {
  ArrowLeft,
  HelpCircle,
  Delete,
  Check,
  Send,
  Download,
  History,
  Home,
  QrCode,
  Copy,
  Share2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  AlertOctagon,
  Search,
  ShieldAlert,
  Loader2,
  ChevronDown,
  PhoneCall,
  Monitor,
  RotateCcw,
  Activity,
  Zap,
  Sliders,
} from "lucide-react";
import { sendInterceptionRequest, BackendInterceptPayload } from "@/lib/config";

interface Recipient {
  id: string;
  name: string;
  account: string;
  avatarColor: string;
  badge: string;
  category: string;
  riskNote?: string;
}

interface PaymentSource {
  id: string;
  name: string;
  balanceNumber: number;
  brand: string;
}

interface TransactionItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  amount: number;
  type: "sent" | "received" | "intercepted";
  category: string;
  refId: string;
}

const INITIAL_RECIPIENTS: Recipient[] = [
  {
    id: "r1",
    name: "Aarav Sharma",
    account: "9821362190",
    avatarColor: "#0284c7",
    badge: "🇮🇳",
    category: "Friend",
  },
  {
    id: "r2",
    name: "Priya Patel",
    account: "9874019283",
    avatarColor: "#8b5cf6",
    badge: "🇮🇳",
    category: "Colleague",
  },
  {
    id: "r3",
    name: "Rajesh Kumar (Flagged Acc)",
    account: "9832104519",
    avatarColor: "#e11d48",
    badge: "⚠️",
    category: "High Risk Beneficiary",
    riskNote: "Flagged High Risk Node",
  },
  {
    id: "r4",
    name: "Bescom Bengaluru",
    account: "9910482012",
    avatarColor: "#10b981",
    badge: "⚡",
    category: "Utility",
  },
  {
    id: "r5",
    name: "Ananya Iyer",
    account: "9811029384",
    avatarColor: "#f59e0b",
    badge: "🇮🇳",
    category: "Roommate",
  },
];

const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: "tx-1",
    title: "Freelance UI Payout",
    subtitle: "Received via UPI",
    date: "Today, 14:20",
    amount: 14500.0,
    type: "received",
    category: "Income",
    refId: "ECL-9482-TX",
  },
  {
    id: "tx-2",
    title: "Aarav Sharma",
    subtitle: "Dinner Split & Project Share",
    date: "Yesterday, 19:40",
    amount: -500.0,
    type: "sent",
    category: "Transfer",
    refId: "ECL-3912-TX",
  },
  {
    id: "tx-3",
    title: "JioFiber / Cloud Sub",
    subtitle: "Monthly Auto-Debit",
    date: "Sep 09, 10:15",
    amount: -299.0,
    type: "sent",
    category: "Subscription",
    refId: "ECL-7731-TX",
  },
  {
    id: "tx-4",
    title: "Yes Bank Flagged Acc #92",
    subtitle: "Soft-Held by Bank Interceptor",
    date: "Sep 08, 22:30",
    amount: -49500.0,
    type: "intercepted",
    category: "Flagged",
    refId: "ECL-0021-HOLD",
  },
];

export const MobileSimulator: React.FC = () => {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<"home" | "send" | "receive" | "history">("home");
  
  // Wallet / Balance State
  const [balance, setBalance] = useState<number>(521098.31);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);
  
  // Send Money State (default to 0)
  const [amount, setAmount] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<"UPI" | "IMPS" | "RTGS" | "NEFT">("UPI");
  const [recipient, setRecipient] = useState<Recipient>(INITIAL_RECIPIENTS[0]);
  const [selectedCard, setSelectedCard] = useState<PaymentSource>({
    id: "c1",
    name: "•••• 4092",
    balanceNumber: balance,
    brand: "VISA",
  });
  
  // Success Animation State
  const [isSuccessAnim, setIsSuccessAnim] = useState<boolean>(false);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [scenarios, setScenarios] = useState<{
    urgentCall: boolean;
    screenShare: boolean;
    typingJitter: boolean;
    muleNode: boolean;
    burstVelocity: boolean;
  }>({
    urgentCall: false,
    screenShare: false,
    typingJitter: false,
    muleNode: false,
    burstVelocity: false,
  });

  const [isScenarioDropdownOpen, setIsScenarioDropdownOpen] = useState<boolean>(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const activeFlagCount = Object.values(scenarios).filter(Boolean).length;
  const simulateCoercion = scenarios.urgentCall;

  const toggleScenario = (key: keyof typeof scenarios) => {
    setScenarios((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setPreset = (preset: "clean" | "call" | "screen" | "mule" | "burst" | "all") => {
    switch (preset) {
      case "clean":
        setScenarios({ urgentCall: false, screenShare: false, typingJitter: false, muleNode: false, burstVelocity: false });
        break;
      case "call":
        setScenarios({ urgentCall: true, screenShare: false, typingJitter: true, muleNode: false, burstVelocity: false });
        break;
      case "screen":
        setScenarios({ urgentCall: false, screenShare: true, typingJitter: false, muleNode: false, burstVelocity: false });
        break;
      case "mule":
        setScenarios({ urgentCall: false, screenShare: false, typingJitter: false, muleNode: true, burstVelocity: false });
        break;
      case "burst":
        setScenarios({ urgentCall: false, screenShare: false, typingJitter: false, muleNode: false, burstVelocity: true });
        break;
      case "all":
        setScenarios({ urgentCall: true, screenShare: true, typingJitter: true, muleNode: true, burstVelocity: true });
        break;
    }
  };

  const getSimulatedVerdict = () => {
    if (scenarios.urgentCall || scenarios.screenShare || scenarios.muleNode) {
      return { label: "BLOCK (<15ms SLA)", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" };
    }
    if (scenarios.typingJitter || scenarios.burstVelocity) {
      return { label: "SOFT_HOLD (15m Cooling)", color: "#d97706", bg: "rgba(217, 119, 6, 0.1)" };
    }
    return { label: "APPROVE (Normal SLA)", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" };
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsScenarioDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsScenarioDropdownOpen(false);
      }
    };
    if (isScenarioDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isScenarioDropdownOpen]);

  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false);
  const [customAddAmount, setCustomAddAmount] = useState<string>("");
  const [addFundsToast, setAddFundsToast] = useState<string | null>(null);
  const [lastSentDetail, setLastSentDetail] = useState<{
    amount: number;
    recipientName: string;
    refId: string;
    date: string;
    mode: "UPI" | "IMPS" | "RTGS" | "NEFT";
    decision?: "APPROVE" | "SOFT_HOLD" | "BLOCK";
    latency_ms?: number;
    fraud_prob?: number;
  } | null>(null);

  // History Filter
  const [historyFilter, setHistoryFilter] = useState<"all" | "sent" | "received" | "intercepted">("all");
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);

  // Format currency helpers (INR / Rupees)
  const formatCur = (num: number) => {
    return (
      "₹" +
      Math.abs(num).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // Dynamic font sizing based on length to prevent text wrapping or vertical clipping
  const getHeroBalanceFontSize = (val: number) => {
    const str = formatCur(val);
    if (str.length >= 17) return "1.18rem";
    if (str.length >= 15) return "1.32rem";
    if (str.length >= 13) return "1.48rem";
    if (str.length >= 11) return "1.68rem";
    return "2.05rem";
  };

  const getSendAmountStyle = (amtStr: string) => {
    const len = amtStr.length;
    if (len >= 8) return { fontSize: "1.75rem", cursorH: "1.55rem" };
    if (len >= 6) return { fontSize: "2.15rem", cursorH: "1.95rem" };
    if (len >= 5) return { fontSize: "2.45rem", cursorH: "2.25rem" };
    return { fontSize: "2.85rem", cursorH: "2.6rem" };
  };

  // Add custom or preset funds to account balance
  const handleAddFunds = (addAmt: number) => {
    if (addAmt <= 0) return;
    setBalance((prev) => prev + addAmt);
    const newTx: TransactionItem = {
      id: `tx-dep-${Date.now()}`,
      title: "Bank Account Deposit",
      subtitle: "Funds Credited via IMPS/UPI",
      date: "Just now",
      amount: addAmt,
      type: "received",
      category: "Income",
      refId: `ECL-${Math.floor(1000 + Math.random() * 9000)}-DEP`,
    };
    setTransactions((prev) => [newTx, ...prev]);
    setAddFundsToast(`Added ₹${addAmt.toLocaleString("en-IN")} to account balance.`);
    setTimeout(() => setAddFundsToast(null), 3500);
  };

  // Numpad key press handler
  const handleKeyPress = (val: string) => {
    if (val === "backspace") {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
    } else if (val === "000") {
      if (amount !== "0" && amount.length < 7) {
        setAmount((prev) => prev + "000");
      }
    } else {
      if (amount === "0") {
        setAmount(val);
      } else if (amount.length < 8) {
        setAmount((prev) => prev + val);
      }
    }
  };

  // Trigger Send Money & In-Flight Interception
  const handleSendMoney = async () => {
    const numAmt = parseFloat(amount) || 0;
    if (numAmt <= 0 || isEvaluating) return;

    // Balance Guard: strictly prevent transfer exceeding account balance
    if (numAmt > balance) {
      return;
    }

    setIsEvaluating(true);

    const isThreatScenario =
      scenarios.urgentCall ||
      scenarios.screenShare ||
      scenarios.typingJitter ||
      scenarios.muleNode ||
      scenarios.burstVelocity ||
      !!recipient.riskNote ||
      recipient.name.includes("Flagged");

    const effectivePayeeAccount = scenarios.muleNode ? "9832104519" : recipient.account;
    const effectivePayeeName = scenarios.muleNode ? "Rajesh Kumar (Flagged Acc)" : recipient.name;
    const txnId = `TXN_ECL_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const interceptPayload: BackendInterceptPayload = {
      transaction_id: txnId,
      timestamp: new Date().toISOString(),
      payer: {
        account_id: "ACC_HDFC_9182310293",
        vpa: "nihal@fintech",
        phone: "+919876543210",
        device_id: "DEV_IPHONE_16PRO_ECL",
      },
      payee: {
        account_id: `ACC_${effectivePayeeAccount}`,
        vpa: `${effectivePayeeName.toLowerCase().replace(/[^a-z0-9]/g, "") || "beneficiary"}@okaxis`,
        ifsc: "HDFC0001928",
      },
      amount_inr: numAmt,
      currency: "INR",
      telemetry: {
        active_call: scenarios.urgentCall,
        call_duration_seconds: scenarios.urgentCall ? 1420 : 0,
        call_ended_seconds_ago: null,
        screen_share_active: scenarios.screenShare,
        accessibility_service_enabled: scenarios.screenShare,
        typing_speed_wpm: scenarios.typingJitter ? 84.0 : 45.0,
        typing_jitter_ms: scenarios.typingJitter ? 156.0 : 18.0,
        is_new_payee_for_payer: scenarios.muleNode || scenarios.urgentCall,
        transactions_in_last_10m: scenarios.burstVelocity ? 4 : 1,
      },
    };

    const interceptResult = await sendInterceptionRequest(interceptPayload);
    setIsEvaluating(false);

    const defaultDecision =
      (scenarios.urgentCall || scenarios.screenShare || scenarios.muleNode)
        ? "BLOCK"
        : (scenarios.typingJitter || scenarios.burstVelocity)
        ? "SOFT_HOLD"
        : "APPROVE";

    const decision = interceptResult ? interceptResult.decision : defaultDecision;
    const latency = interceptResult ? interceptResult.latency_ms : 18.2;
    const refId = interceptResult ? interceptResult.transaction_id : txnId;
    const fraudProb = interceptResult?.risk_assessment?.fraud_probability ?? (isThreatScenario ? 0.94 : 0.02);

    if (decision === "APPROVE") {
      const updatedBalance = Math.max(0, balance - numAmt);
      setBalance(updatedBalance);
    }

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      title: recipient.name,
      subtitle:
        decision === "BLOCK"
          ? "Autonomous Block: Coercion Flag"
          : decision === "SOFT_HOLD"
          ? "Cooling Hold Applied (24h)"
          : `Instant ${paymentMode} Payment`,
      date: "Just now",
      amount: decision === "BLOCK" ? 0 : -numAmt,
      type: decision !== "APPROVE" ? "intercepted" : "sent",
      category: "Transfer",
      refId: refId,
    };

    setTransactions((prev) => [newTx, ...prev]);

    setLastSentDetail({
      amount: numAmt,
      recipientName: recipient.name,
      refId: refId,
      date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode: paymentMode,
      decision: decision,
      latency_ms: latency,
      fraud_prob: fraudProb,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("eclipse:new-transaction", {
          detail: {
            amount: numAmt,
            recipientName: recipient.name,
            isRisk: decision !== "APPROVE",
            refId: refId,
            mode: paymentMode,
            decision: decision,
            latency_ms: latency,
            fraud_probability: fraudProb,
          },
        })
      );
    }

    setIsSuccessAnim(true);
  };

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);

  React.useEffect(() => {
    if (!containerRef.current) return;

    const computeScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      // Native iPhone frame dimensions (360px + side buttons padding + 40px external control bar)
      const frameW = 380;
      const frameH = 815;
      const margin = 16;
      
      const availW = Math.max(80, clientWidth - margin);
      const availH = Math.max(80, clientHeight - margin);
      
      const scaleX = availW / frameW;
      const scaleY = availH / frameH;
      const nextScale = Math.min(1, Math.min(scaleX, scaleY));
      
      setScale(Math.max(0.35, nextScale));
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    observer.observe(containerRef.current);
    window.addEventListener("resize", computeScale);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", computeScale);
    };
  }, []);

  const handleCopyVpa = () => {
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (historyFilter === "all") return true;
    return t.type === historyFilter;
  });

  return (
    <div className={styles.simulatorContainer} ref={containerRef}>
      {/* Auto-scaling Wrapper: keeps phone size constant and scales down to fit viewport */}
      <div
        className={styles.scaleWrapper}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexDirection: "column",
        }}
      >
        {/* External Scenario Injector Dropdown Toolbar */}
        <div className={styles.simControlBarWrapper} ref={dropdownRef}>
          <div className={styles.simControlBar}>
            <div className={styles.simControlLabel}>
              <ShieldAlert size={14} color={activeFlagCount > 0 ? "#ef4444" : "#64748b"} />
              <span>SCENARIO INJECTOR:</span>
            </div>

            <button
              type="button"
              className={activeFlagCount > 0 ? styles.simDropdownTriggerBtnActive : styles.simDropdownTriggerBtn}
              onClick={(e) => {
                e.stopPropagation();
                setIsScenarioDropdownOpen((prev) => !prev);
              }}
            >
              {activeFlagCount > 0 && <span className={styles.simActiveThreatDot} />}
              <span>{activeFlagCount === 0 ? "Clean Baseline" : `${activeFlagCount} Active Threat${activeFlagCount > 1 ? "s" : ""}`}</span>
              <ChevronDown
                size={13}
                style={{
                  transform: isScenarioDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.18s ease",
                }}
              />
            </button>
          </div>

          {/* Floating Dropdown Panel with Scenario Toggles */}
          {isScenarioDropdownOpen && (
            <>
              <div
                className={styles.simDropdownBackdrop}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsScenarioDropdownOpen(false);
                }}
              />
              <div
                className={styles.simDropdownPanel}
                onClick={(e) => e.stopPropagation()}
              >
              <div className={styles.simDropdownHeader}>
                <span className={styles.simDropdownHeaderTitle}>
                  <Sliders size={13} />
                  <span>Attack Vector Toggles</span>
                </span>
                <button
                  type="button"
                  className={styles.simResetBtn}
                  onClick={() => setPreset("clean")}
                >
                  <RotateCcw size={11} />
                  <span>Clear All</span>
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div className={styles.simPresetsRow}>
                {[
                  { id: "clean", label: "Clean" },
                  { id: "call", label: "Voice Coercion" },
                  { id: "screen", label: "Screen Share" },
                  { id: "mule", label: "Mule Hop" },
                  { id: "burst", label: "Smurfing" },
                  { id: "all", label: "All Flags" },
                ].map((p) => {
                  const isActive =
                    p.id === "clean"
                      ? activeFlagCount === 0
                      : p.id === "call"
                      ? scenarios.urgentCall && !scenarios.screenShare
                      : p.id === "screen"
                      ? scenarios.screenShare
                      : p.id === "mule"
                      ? scenarios.muleNode
                      : p.id === "burst"
                      ? scenarios.burstVelocity
                      : activeFlagCount === 5;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`${styles.simPresetChip} ${isActive ? styles.simPresetChipActive : ""}`}
                      onClick={() => setPreset(p.id as any)}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Individual Attack Vector Toggles */}
              <div className={styles.simTogglesList}>
                {/* 1. Urgent Voice Call */}
                <div
                  className={`${styles.simToggleRow} ${scenarios.urgentCall ? styles.simToggleRowActive : ""}`}
                  onClick={() => toggleScenario("urgentCall")}
                >
                  <div className={styles.simToggleLeft}>
                    <div className={`${styles.simToggleIconBox} ${scenarios.urgentCall ? styles.simToggleIconBoxActive : ""}`}>
                      <PhoneCall size={14} />
                    </div>
                    <div className={styles.simToggleTexts}>
                      <span className={styles.simToggleTitle}>Urgent Voice Call Coercion</span>
                      <span className={styles.simToggleDesc}>Active 23m VoIP call during checkout</span>
                    </div>
                  </div>
                  <div className={`${styles.simSwitchTrack} ${scenarios.urgentCall ? styles.simSwitchTrackActive : ""}`}>
                    <div className={`${styles.simSwitchThumb} ${scenarios.urgentCall ? styles.simSwitchThumbActive : ""}`} />
                  </div>
                </div>

                {/* 2. Screen Sharing Remote Access */}
                <div
                  className={`${styles.simToggleRow} ${scenarios.screenShare ? styles.simToggleRowActive : ""}`}
                  onClick={() => toggleScenario("screenShare")}
                >
                  <div className={styles.simToggleLeft}>
                    <div className={`${styles.simToggleIconBox} ${scenarios.screenShare ? styles.simToggleIconBoxActive : ""}`}>
                      <Monitor size={14} />
                    </div>
                    <div className={styles.simToggleTexts}>
                      <span className={styles.simToggleTitle}>Screen-Sharing Remote Access</span>
                      <span className={styles.simToggleDesc}>Remote projection & accessibility hooks</span>
                    </div>
                  </div>
                  <div className={`${styles.simSwitchTrack} ${scenarios.screenShare ? styles.simSwitchTrackActive : ""}`}>
                    <div className={`${styles.simSwitchThumb} ${scenarios.screenShare ? styles.simSwitchThumbActive : ""}`} />
                  </div>
                </div>

                {/* 3. Typing Hesitation & Jitter */}
                <div
                  className={`${styles.simToggleRow} ${scenarios.typingJitter ? styles.simToggleRowActive : ""}`}
                  onClick={() => toggleScenario("typingJitter")}
                >
                  <div className={styles.simToggleLeft}>
                    <div className={`${styles.simToggleIconBox} ${scenarios.typingJitter ? styles.simToggleIconBoxActive : ""}`}>
                      <Activity size={14} />
                    </div>
                    <div className={styles.simToggleTexts}>
                      <span className={styles.simToggleTitle}>Hesitation Jitter & Variance</span>
                      <span className={styles.simToggleDesc}>156ms keystroke interval variance</span>
                    </div>
                  </div>
                  <div className={`${styles.simSwitchTrack} ${scenarios.typingJitter ? styles.simSwitchTrackActive : ""}`}>
                    <div className={`${styles.simSwitchThumb} ${scenarios.typingJitter ? styles.simSwitchThumbActive : ""}`} />
                  </div>
                </div>

                {/* 4. Flagged Mule Destination Node */}
                <div
                  className={`${styles.simToggleRow} ${scenarios.muleNode ? styles.simToggleRowActive : ""}`}
                  onClick={() => toggleScenario("muleNode")}
                >
                  <div className={styles.simToggleLeft}>
                    <div className={`${styles.simToggleIconBox} ${scenarios.muleNode ? styles.simToggleIconBoxActive : ""}`}>
                      <ShieldAlert size={14} />
                    </div>
                    <div className={styles.simToggleTexts}>
                      <span className={styles.simToggleTitle}>High-Risk Mule Recipient</span>
                      <span className={styles.simToggleDesc}>Routes transfer to flagged mule node #9832</span>
                    </div>
                  </div>
                  <div className={`${styles.simSwitchTrack} ${scenarios.muleNode ? styles.simSwitchTrackActive : ""}`}>
                    <div className={`${styles.simSwitchThumb} ${scenarios.muleNode ? styles.simSwitchThumbActive : ""}`} />
                  </div>
                </div>

                {/* 5. Threshold Structuring / Velocity Burst */}
                <div
                  className={`${styles.simToggleRow} ${scenarios.burstVelocity ? styles.simToggleRowActive : ""}`}
                  onClick={() => toggleScenario("burstVelocity")}
                >
                  <div className={styles.simToggleLeft}>
                    <div className={`${styles.simToggleIconBox} ${scenarios.burstVelocity ? styles.simToggleIconBoxActive : ""}`}>
                      <Zap size={14} />
                    </div>
                    <div className={styles.simToggleTexts}>
                      <span className={styles.simToggleTitle}>Threshold Structuring / Smurfing</span>
                      <span className={styles.simToggleDesc}>Velocity burst (4 payments in 10 minutes)</span>
                    </div>
                  </div>
                  <div className={`${styles.simSwitchTrack} ${scenarios.burstVelocity ? styles.simSwitchTrackActive : ""}`}>
                    <div className={`${styles.simSwitchThumb} ${scenarios.burstVelocity ? styles.simSwitchThumbActive : ""}`} />
                  </div>
                </div>
              </div>

              {/* Bottom Prediction Footer */}
              <div className={styles.simDropdownFooter}>
                <span className={styles.simFooterVerdictLabel}>Predicted Verdict:</span>
                <span
                  className={styles.simFooterVerdictBadge}
                  style={{
                    color: getSimulatedVerdict().color,
                    background: getSimulatedVerdict().bg,
                  }}
                >
                  {getSimulatedVerdict().label}
                </span>
              </div>
            </div>
          </>
        )}
        </div>

        {/* iPhone Pro Chassis */}
        <div className={styles.deviceFrame}>
        {/* Hardware Buttons */}
        <div className={styles.actionButton} />
        <div className={styles.volumeUpButton} />
        <div className={styles.volumeDownButton} />
        <div className={styles.powerButton} />
        <div className={styles.speakerEarpiece} />

        {/* Screen Body */}
        <div className={styles.screenBody}>
          {/* iOS Top Status Bar with Dynamic Island */}
          <div className={styles.statusBar}>
            <div className={styles.statusTime}>9:41</div>

            {/* Apple Dynamic Island - with Active Call simulation if coercion active */}
            {simulateCoercion ? (
              <div
                className={styles.dynamicIslandCoercion}
                title="Active Voice Coercion Call Telemetry Active (Click to toggle)"
                onClick={() => toggleScenario("urgentCall")}
              >
                <div className={styles.callIndicatorGroup}>
                  <span className={styles.callDot} />
                  <span className={styles.callTime}>23:14</span>
                </div>
                <div className={styles.sensorDot} />
              </div>
            ) : (
              <div
                className={styles.dynamicIsland}
                title="Dynamic Island"
                onClick={() => toggleScenario("urgentCall")}
              >
                <div className={styles.cameraLens} />
                <div className={styles.sensorDot} />
              </div>
            )}

            <div className={styles.statusIcons}>
              {/* Signal Bars */}
              <svg className={styles.signalIcon} viewBox="0 0 17 11" width="16" height="10" fill="currentColor">
                <rect x="0" y="7.5" width="2.8" height="3.5" rx="0.6" />
                <rect x="4.2" y="5" width="2.8" height="6" rx="0.6" />
                <rect x="8.4" y="2.5" width="2.8" height="8.5" rx="0.6" />
                <rect x="12.6" y="0" width="2.8" height="11" rx="0.6" />
              </svg>
              {/* Wi-Fi Icon */}
              <svg className={styles.wifiIcon} viewBox="0 0 16 12" width="14" height="10" fill="currentColor">
                <path d="M8 2.5C10.5 2.5 12.8 3.5 14.5 5.2L16 3.7C13.9 1.6 11.1 0.5 8 0.5C4.9 0.5 2.1 1.6 0 3.7L1.5 5.2C3.2 3.5 5.5 2.5 8 2.5Z" />
                <path d="M8 6C9.6 6 11.1 6.7 12.2 7.8L13.7 6.3C12.2 4.8 10.2 4 8 4C5.8 4 3.8 4.8 2.3 6.3L3.8 7.8C4.9 6.7 6.4 6 8 6Z" />
                <circle cx="8" cy="10.5" r="1.5" />
              </svg>
              {/* iOS Battery Capsule */}
              <div className={styles.batteryPill}>
                <div className={styles.batteryLevel} />
                <div className={styles.batteryNub} />
              </div>
            </div>
          </div>

          {/* Scrollable Screen Content */}
          <div className={styles.screenScrollArea}>

            {/* ======================= TAB: HOME ======================= */}
            {currentTab === "home" && (
              <>
                {/* Header */}
                <div className={styles.homeHeader}>
                  <div className={styles.homeUserProfile}>
                    <div className={styles.homeAvatar}>N</div>
                    <div className={styles.homeGreeting}>
                      <span className={styles.greetingSub}>Welcome back,</span>
                      <span className={styles.greetingName}>Nihal</span>
                    </div>
                  </div>
                  <button
                    className={styles.circleNavBtn}
                    onClick={() => setCurrentTab("history")}
                    title="Notifications"
                  >
                    <Sparkles size={16} strokeWidth={2.2} style={{ color: "#111827" }} />
                  </button>
                </div>

                {/* Hero Balance Card */}
                <div className={styles.heroBalanceCard}>
                  <div className={styles.heroCardHeader}>
                    <span className={styles.heroCardLabel}>Total Net Balance</span>
                    <span className={styles.cardChipPill}>ACTIVE VISA</span>
                  </div>
                  <div
                    className={styles.heroBalanceAmount}
                    style={{ fontSize: getHeroBalanceFontSize(balance) }}
                  >
                    {formatCur(balance)}
                  </div>
                  <div className={styles.cardFooterMeta}>
                    <div className={styles.cardNumberWrap}>
                      <span className={styles.dotGroup}>
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                      </span>
                      <span className={styles.dotGroup}>
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                      </span>
                      <span className={styles.dotGroup}>
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                        <span className={styles.dot} />
                      </span>
                      <span className={styles.cardLastFour}>4092</span>
                    </div>
                    <div className={styles.cardExpiryWrap}>
                      <span className={styles.cardExpiryLabel}>EXP</span>
                      <span className={styles.cardExpiry}>08/28</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Grid (Send & Receive) */}
                <div className={styles.actionButtonGrid}>
                  <div
                    className={styles.actionBigBtn}
                    onClick={() => setCurrentTab("send")}
                  >
                    <div className={styles.actionIconBoxDark}>
                      <ArrowUpRight size={18} strokeWidth={2.5} />
                    </div>
                    <div className={styles.actionBtnText}>
                      <span className={styles.actionBtnTitle}>Send</span>
                      <span className={styles.actionBtnSubtitle}>Instant pay</span>
                    </div>
                  </div>

                  <div
                    className={styles.actionBigBtn}
                    onClick={() => setCurrentTab("receive")}
                  >
                    <div className={styles.actionIconBoxLime}>
                      <ArrowDownLeft size={18} strokeWidth={2.5} />
                    </div>
                    <div className={styles.actionBtnText}>
                      <span className={styles.actionBtnTitle}>Receive</span>
                      <span className={styles.actionBtnSubtitle}>QR & UPI</span>
                    </div>
                  </div>
                </div>

                {/* Quick Send Contacts */}
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionBlockHeader}>
                    <span className={styles.sectionBlockTitle}>Quick Transfer</span>
                    <span
                      className={styles.seeAllLink}
                      onClick={() => setCurrentTab("send")}
                    >
                      New payee
                    </span>
                  </div>

                  <div className={styles.quickContactsRow}>
                    {INITIAL_RECIPIENTS.map((rec) => (
                      <div
                        key={rec.id}
                        className={styles.quickContactItem}
                        onClick={() => {
                          setRecipient(rec);
                          setCurrentTab("send");
                        }}
                      >
                        <div
                          className={styles.quickContactAvatar}
                          style={{ background: rec.avatarColor }}
                        >
                          {rec.name.split(" ")[0][0]}
                          {rec.name.split(" ")[1] ? rec.name.split(" ")[1][0] : ""}
                        </div>
                        <span className={styles.quickContactName}>{rec.name.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity List */}
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionBlockHeader}>
                    <span className={styles.sectionBlockTitle}>Recent Activity</span>
                    <span
                      className={styles.seeAllLink}
                      onClick={() => setCurrentTab("history")}
                    >
                      View all
                    </span>
                  </div>

                  <div className={styles.recentActivityCard}>
                    {transactions.slice(0, 3).map((tx) => (
                      <div
                        key={tx.id}
                        className={styles.txItemRow}
                        onClick={() => setCurrentTab("history")}
                      >
                        <div className={styles.txLeftGroup}>
                          <div
                            className={styles.txIconPill}
                            style={{
                              background:
                                tx.type === "received"
                                  ? "rgba(16, 185, 129, 0.12)"
                                  : tx.type === "intercepted"
                                  ? "rgba(244, 63, 94, 0.12)"
                                  : "#f1f3f7",
                              color:
                                tx.type === "received"
                                  ? "#10b981"
                                  : tx.type === "intercepted"
                                  ? "#f43f5e"
                                  : "#111827",
                            }}
                          >
                            {tx.type === "received" ? (
                              <ArrowDownLeft size={16} strokeWidth={2.5} />
                            ) : tx.type === "intercepted" ? (
                              <AlertOctagon size={16} strokeWidth={2.5} />
                            ) : (
                              <ArrowUpRight size={16} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className={styles.txMeta}>
                            <span className={styles.txTitle}>{tx.title}</span>
                            <span className={styles.txSubtitle}>{tx.subtitle} • {tx.date}</span>
                          </div>
                        </div>

                        <div className={styles.txRightGroup}>
                          <span
                            className={
                              tx.amount > 0 ? styles.txAmountPos : styles.txAmountNeg
                            }
                          >
                            {tx.amount > 0 ? `+${formatCur(tx.amount)}` : `-${formatCur(Math.abs(tx.amount))}`}
                          </span>
                          <span className={styles.txStatusPill}>
                            {tx.type === "intercepted" ? "Held" : "Success"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ======================= TAB: SEND MONEY (EXACT MATCH) ======================= */}
            {currentTab === "send" && (
              <div className={styles.sendScreenWrapper}>
                <div className={styles.sendTopSection}>
                  {/* Top App Header */}
                  <div className={styles.topAppBar}>
                    <button
                      className={styles.circleNavBtn}
                      onClick={() => setCurrentTab("home")}
                      title="Back to Home"
                    >
                      <ArrowLeft size={17} strokeWidth={2.2} />
                    </button>
                    <h1 className={styles.appTitle}>Send money</h1>
                    <button
                      className={styles.circleNavBtn}
                      onClick={() => setIsScenarioDropdownOpen((prev) => !prev)}
                      title={activeFlagCount > 0 ? `${activeFlagCount} Active Threats (Click to configure)` : "Open Threat & Scenario Injector"}
                      style={{
                        background: activeFlagCount > 0 ? "rgba(239, 68, 68, 0.12)" : undefined,
                        color: activeFlagCount > 0 ? "#ef4444" : undefined,
                        position: "relative",
                      }}
                    >
                      <ShieldAlert size={17} strokeWidth={2.2} />
                      {activeFlagCount > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: "3px",
                            right: "3px",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#ef4444",
                          }}
                        />
                      )}
                    </button>
                  </div>

                  {/* "Send to" Card */}
                  <div className={styles.sendToCard}>
                    <div className={styles.sendToHeader}>
                      <span className={styles.sendToLabel}>Send to</span>
                      <div className={styles.sendToDivider} />
                    </div>

                    <div className={styles.profileRow}>
                      <div className={styles.profileInfoGroup}>
                        <div className={styles.avatarWrapper}>
                          <div
                            className={styles.avatarImg}
                            style={{ background: recipient.avatarColor }}
                          >
                            <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
                              <circle cx="18" cy="12" r="7" fill="#fde047" />
                              <path
                                d="M18 5C14.134 5 11 8.13401 11 12C11 13.0645 11.2374 14.0734 11.6644 14.9748C12.3503 12.6738 14.8967 11 18 11C21.1033 11 23.6497 12.6738 24.3356 14.9748C24.7626 14.0734 25 13.0645 25 12C25 8.13401 21.866 5 18 5Z"
                                fill="#1e293b"
                              />
                              <ellipse cx="18" cy="28" rx="12" ry="7" fill="#1e293b" />
                            </svg>
                          </div>
                          <div className={styles.badgeIcon}>
                            <span style={{ fontSize: "10px" }}>{recipient.badge}</span>
                          </div>
                        </div>

                        <div className={styles.recipientDetails}>
                          <span className={styles.recipientName}>{recipient.name}</span>
                          <span className={styles.recipientNumber}>{recipient.account}</span>
                        </div>
                      </div>

                      <button
                        className={styles.changePillBtn}
                        onClick={() => {
                          const nextIdx = (INITIAL_RECIPIENTS.findIndex((r) => r.id === recipient.id) + 1) % INITIAL_RECIPIENTS.length;
                          setRecipient(INITIAL_RECIPIENTS[nextIdx]);
                        }}
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Amount Display with Signature Electric Lime Cursor */}
                  <div className={styles.amountContainer}>
                    <div
                      className={styles.amountDisplay}
                      style={{ fontSize: getSendAmountStyle(amount).fontSize }}
                    >
                      <span
                        className={styles.currencySign}
                        style={{ fontSize: getSendAmountStyle(amount).fontSize }}
                      >
                        ₹
                      </span>
                      <span
                        className={styles.amountText}
                        style={{ fontSize: getSendAmountStyle(amount).fontSize }}
                      >
                        {amount}
                      </span>
                      <div
                        className={styles.limeCursor}
                        style={{ height: getSendAmountStyle(amount).cursorH }}
                      />
                    </div>
                  </div>

                  {/* Quick Amount Suggestion Pills */}
                  <div className={styles.quickAmountRow}>
                    {["100", "500", "2500", "25000", "100000"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`${styles.quickAmountPill} ${
                          amount === val ? styles.quickAmountPillActive : ""
                        }`}
                        onClick={() => setAmount(val)}
                      >
                        ₹{Number(val).toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.sendBottomSection}>
                  {/* Payment Mode Selector (UPI, IMPS, RTGS, NEFT) */}
                  <div className={styles.modeSelectorRow}>
                    {(["UPI", "IMPS", "RTGS", "NEFT"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`${styles.modeOptionBtn} ${
                          paymentMode === mode ? styles.modeOptionBtnActive : ""
                        }`}
                        onClick={() => setPaymentMode(mode)}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  {/* Payment Source Card (Slid down with keypad) */}
                  <div className={styles.cardSourceCard}>
                    <div className={styles.cardSourceLeft}>
                      <div className={styles.miniCardGraphic}>
                        <div className={styles.cardChip} />
                        <div className={styles.cardBrandLogo}>{selectedCard.brand}</div>
                      </div>

                      <div className={styles.cardDetails}>
                        <span className={styles.cardName}>{selectedCard.name}</span>
                        <span className={styles.cardBalance}>
                          Balance <strong>{formatCur(balance)}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      className={styles.changePillBtn}
                      onClick={() => {
                        setBalance((prev) => prev + 500);
                      }}
                      title="Top Up"
                    >
                      Change
                    </button>
                  </div>

                  {/* Custom Keypad */}
                  <div className={styles.keypadCard}>
                    <div className={styles.keypadGrid}>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "backspace"].map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={styles.keyButton}
                          onClick={() => handleKeyPress(k)}
                        >
                          {k === "backspace" ? (
                            <span className={styles.backspaceIcon}>
                              <Delete size={17} strokeWidth={2.2} />
                            </span>
                          ) : (
                            k
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Send Money Action Button */}
                  <button
                    type="button"
                    className={styles.sendMoneyBtn}
                    onClick={() => {
                      const numAmt = parseFloat(amount) || 0;
                      if (numAmt > balance) {
                        setShowInsufficientModal(true);
                        return;
                      }
                      handleSendMoney();
                    }}
                    disabled={isEvaluating || parseFloat(amount) <= 0}
                    style={{
                      opacity: isEvaluating || parseFloat(amount) <= 0 ? 0.6 : 1,
                      cursor: isEvaluating ? "wait" : "pointer",
                    }}
                  >
                    {isEvaluating ? "Evaluating in-flight... (<45ms)" : "Send money"}
                  </button>
                </div>
              </div>
            )}

            {/* ======================= TAB: RECEIVE MONEY ======================= */}
            {currentTab === "receive" && (
              <>
                <div className={styles.topAppBar}>
                  <button
                    className={styles.circleNavBtn}
                    onClick={() => setCurrentTab("home")}
                    title="Back"
                  >
                    <ArrowLeft size={17} strokeWidth={2.2} />
                  </button>
                  <h1 className={styles.appTitle}>Receive money</h1>
                  <button
                    className={styles.circleNavBtn}
                    onClick={handleCopyVpa}
                    title="Share"
                  >
                    <Share2 size={17} strokeWidth={2.2} />
                  </button>
                </div>

                <div className={styles.receiveCard}>
                  <div className={styles.qrContainer}>
                    <div className={styles.qrImageMock}>
                      {/* SVG Stylized QR Code */}
                      <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                        <rect width="130" height="130" fill="#ffffff" />
                        {/* QR Corners */}
                        <rect x="10" y="10" width="34" height="34" rx="6" fill="#111827" />
                        <rect x="16" y="16" width="22" height="22" rx="3" fill="#ffffff" />
                        <rect x="21" y="21" width="12" height="12" rx="2" fill="#c6f10e" />

                        <rect x="86" y="10" width="34" height="34" rx="6" fill="#111827" />
                        <rect x="92" y="16" width="22" height="22" rx="3" fill="#ffffff" />
                        <rect x="97" y="21" width="12" height="12" rx="2" fill="#c6f10e" />

                        <rect x="10" y="86" width="34" height="34" rx="6" fill="#111827" />
                        <rect x="16" y="92" width="22" height="22" rx="3" fill="#ffffff" />
                        <rect x="21" y="97" width="12" height="12" rx="2" fill="#c6f10e" />

                        {/* Data Pixels */}
                        <rect x="52" y="14" width="8" height="8" rx="2" fill="#111827" />
                        <rect x="68" y="14" width="8" height="8" rx="2" fill="#111827" />
                        <rect x="52" y="30" width="12" height="8" rx="2" fill="#111827" />
                        <rect x="70" y="30" width="8" height="16" rx="2" fill="#111827" />
                        <rect x="50" y="50" width="30" height="30" rx="8" fill="#111827" />
                        <rect x="58" y="58" width="14" height="14" rx="4" fill="#c6f10e" />
                        <rect x="14" y="52" width="10" height="10" rx="2" fill="#111827" />
                        <rect x="30" y="66" width="12" height="8" rx="2" fill="#111827" />
                        <rect x="88" y="54" width="28" height="10" rx="2" fill="#111827" />
                        <rect x="88" y="70" width="12" height="14" rx="2" fill="#111827" />
                        <rect x="104" y="70" width="12" height="14" rx="2" fill="#111827" />
                        <rect x="52" y="90" width="24" height="8" rx="2" fill="#111827" />
                        <rect x="84" y="96" width="32" height="8" rx="2" fill="#111827" />
                      </svg>
                    </div>
                  </div>

                  <div className={styles.receiveAccountInfo}>
                    <span className={styles.receiveAccountName}>Nihal</span>
                    <button className={styles.receiveVpaPill} onClick={handleCopyVpa}>
                      <span>nihal@fintech</span>
                      <Copy size={12} />
                    </button>
                    {copiedVpa && (
                      <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>
                        ✓ Payment ID copied!
                      </span>
                    )}
                  </div>

                  <div className={styles.receiveActionsRow}>
                    <button className={`${styles.receiveActionBtn} ${styles.btnDark}`} onClick={handleCopyVpa}>
                      <Copy size={13} strokeWidth={2.2} />
                      <span>{copiedVpa ? "Copied!" : "Copy VPA"}</span>
                    </button>
                    <button
                      className={`${styles.receiveActionBtn} ${styles.btnOutline}`}
                      onClick={() => {
                        const inputEl = document.getElementById("custom-funds-input");
                        if (inputEl) inputEl.focus();
                      }}
                    >
                      <Download size={13} strokeWidth={2.2} />
                      <span>Save QR</span>
                    </button>
                  </div>

                  {/* Clean Add Funds to Balance Card with Custom Amount Input */}
                  <div className={styles.addFundsCard}>
                    <div className={styles.addFundsTitleRow}>
                      <span className={styles.addFundsTitle}>Deposit Funds</span>
                      <span className={styles.addFundsBalanceBadge}>Bal: {formatCur(balance)}</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className={styles.fundsPresetsRow}>
                      {[1000, 5000, 25000, 100000].map((presetAmt) => (
                        <button
                          key={presetAmt}
                          type="button"
                          className={styles.fundsPresetBtn}
                          onClick={() => handleAddFunds(presetAmt)}
                        >
                          +₹{presetAmt.toLocaleString("en-IN")}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount Input Row */}
                    <div className={styles.fundsInputRow}>
                      <div className={styles.fundsInputGroup}>
                        <span className={styles.fundsInputPrefix}>₹</span>
                        <input
                          id="custom-funds-input"
                          type="number"
                          placeholder="Enter custom amount"
                          value={customAddAmount}
                          onChange={(e) => setCustomAddAmount(e.target.value)}
                          className={styles.fundsInputField}
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.fundsAddSubmitBtn}
                        onClick={() => {
                          const val = parseFloat(customAddAmount);
                          if (val > 0) {
                            handleAddFunds(val);
                            setCustomAddAmount("");
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>

                    {addFundsToast && (
                      <div className={styles.fundsToast}>
                        {addFundsToast}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ======================= TAB: HISTORY ======================= */}
            {currentTab === "history" && (
              <>
                <div className={styles.topAppBar}>
                  <button
                    className={styles.circleNavBtn}
                    onClick={() => setCurrentTab("home")}
                    title="Back"
                  >
                    <ArrowLeft size={17} strokeWidth={2.2} />
                  </button>
                  <h1 className={styles.appTitle}>Activity History</h1>
                  <button className={styles.circleNavBtn} title="Filter">
                    <Search size={17} strokeWidth={2.2} />
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className={styles.historyFilterTabs}>
                  {(["all", "sent", "received", "intercepted"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`${styles.filterTabBtn} ${
                        historyFilter === mode ? styles.filterTabBtnActive : ""
                      }`}
                      onClick={() => setHistoryFilter(mode)}
                    >
                      {mode === "all" ? "All Activity" : mode === "sent" ? "Sent" : mode === "received" ? "Received" : "Flagged/Held"}
                    </button>
                  ))}
                </div>

                {/* History List */}
                <div className={styles.historyListCard}>
                  {filteredTransactions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.82rem" }}>
                      No transactions in this filter.
                    </div>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <div key={tx.id} className={styles.txItemRow}>
                        <div className={styles.txLeftGroup}>
                          <div
                            className={styles.txIconPill}
                            style={{
                              background:
                                tx.type === "received"
                                  ? "rgba(16, 185, 129, 0.12)"
                                  : tx.type === "intercepted"
                                  ? "rgba(244, 63, 94, 0.12)"
                                  : "#f1f3f7",
                              color:
                                tx.type === "received"
                                  ? "#10b981"
                                  : tx.type === "intercepted"
                                  ? "#f43f5e"
                                  : "#111827",
                            }}
                          >
                            {tx.type === "received" ? (
                              <ArrowDownLeft size={16} strokeWidth={2.5} />
                            ) : tx.type === "intercepted" ? (
                              <AlertOctagon size={16} strokeWidth={2.5} />
                            ) : (
                              <ArrowUpRight size={16} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className={styles.txMeta}>
                            <span className={styles.txTitle}>{tx.title}</span>
                            <span className={styles.txSubtitle}>{tx.subtitle} • {tx.date}</span>
                          </div>
                        </div>

                        <div className={styles.txRightGroup}>
                          <span
                            className={
                              tx.amount > 0 ? styles.txAmountPos : styles.txAmountNeg
                            }
                          >
                            {tx.amount > 0 ? `+${formatCur(tx.amount)}` : `-${formatCur(Math.abs(tx.amount))}`}
                          </span>
                          <span
                            className={styles.txStatusPill}
                            style={{
                              background:
                                tx.type === "intercepted"
                                  ? "rgba(244, 63, 94, 0.1)"
                                  : tx.type === "received"
                                  ? "rgba(16, 185, 129, 0.1)"
                                  : "#f1f5f9",
                              color:
                                tx.type === "intercepted"
                                  ? "#f43f5e"
                                  : tx.type === "received"
                                  ? "#10b981"
                                  : "#64748b",
                            }}
                          >
                            {tx.type === "intercepted" ? "Held" : "Settled"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

          </div>

          {/* ======================= ANIMATED SUCCESS / INTERCEPT MODAL ======================= */}
          {isSuccessAnim && lastSentDetail && (
            <div className={styles.successOverlay}>
              <div className={styles.successGraphicWrapper}>
                <div
                  className={styles.successCircle}
                  style={{
                    background:
                      lastSentDetail.decision === "BLOCK"
                        ? "rgba(239, 68, 68, 0.16)"
                        : lastSentDetail.decision === "SOFT_HOLD"
                        ? "rgba(245, 158, 11, 0.16)"
                        : "#c6f10e",
                  }}
                >
                  <div className={styles.successRipple} />
                  {lastSentDetail.decision === "BLOCK" ? (
                    <ShieldAlert size={42} strokeWidth={2.5} color="#ef4444" />
                  ) : lastSentDetail.decision === "SOFT_HOLD" ? (
                    <AlertOctagon size={42} strokeWidth={2.5} color="#d97706" />
                  ) : (
                    <Check size={44} strokeWidth={3.5} color="#111827" />
                  )}
                </div>

                <div className={styles.successHeading}>
                  {lastSentDetail.decision === "BLOCK"
                    ? "Payment Intercepted"
                    : lastSentDetail.decision === "SOFT_HOLD"
                    ? "Cooling Hold Active"
                    : "Transfer Successful!"}
                </div>
                <div className={styles.successAmount}>
                  {formatCur(lastSentDetail.amount)}
                </div>
              </div>

              {/* Receipt Summary Card */}
              <div className={styles.successDetailCard}>
                <div className={styles.successDetailRow}>
                  <span className={styles.successDetailLabel}>Recipient</span>
                  <span className={styles.successDetailValue}>{lastSentDetail.recipientName}</span>
                </div>
                <div className={styles.successDetailRow}>
                  <span className={styles.successDetailLabel}>Switch Verdict</span>
                  <span
                    className={styles.successDetailValue}
                    style={{
                      color:
                        lastSentDetail.decision === "BLOCK"
                          ? "#ef4444"
                          : lastSentDetail.decision === "SOFT_HOLD"
                          ? "#d97706"
                          : "#10b981",
                      fontWeight: 800,
                    }}
                  >
                    {lastSentDetail.decision || "APPROVE"}
                    {lastSentDetail.latency_ms ? ` (${lastSentDetail.latency_ms}ms)` : ""}
                  </span>
                </div>
                {lastSentDetail.decision === "BLOCK" && (
                  <div className={styles.successDetailRow}>
                    <span className={styles.successDetailLabel}>Security Reason</span>
                    <span className={styles.successDetailValue} style={{ color: "#ef4444", fontSize: "0.72rem" }}>
                      Autonomous Coercion Guard
                    </span>
                  </div>
                )}
                {lastSentDetail.decision === "SOFT_HOLD" && (
                  <div className={styles.successDetailRow}>
                    <span className={styles.successDetailLabel}>Hold Protocol</span>
                    <span className={styles.successDetailValue} style={{ color: "#d97706", fontSize: "0.72rem" }}>
                      15m RBI Jan 2027 Cooling
                    </span>
                  </div>
                )}
                <div className={styles.successDetailRow}>
                  <span className={styles.successDetailLabel}>Payment Mode</span>
                  <span className={styles.successDetailValue} style={{ fontWeight: 800 }}>
                    {lastSentDetail.mode}
                  </span>
                </div>
                <div className={styles.successDetailRow}>
                  <span className={styles.successDetailLabel}>Reference ID</span>
                  <span className={styles.successDetailValue} style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                    {lastSentDetail.refId}
                  </span>
                </div>
                <div className={styles.successDetailRow}>
                  <span className={styles.successDetailLabel}>Remaining Balance</span>
                  <span className={styles.successDetailValue}>{formatCur(balance)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className={styles.successActions}>
                <button
                  className={styles.sendMoneyBtn}
                  onClick={() => {
                    setIsSuccessAnim(false);
                    setAmount("0");
                    setCurrentTab("home");
                  }}
                >
                  Back to Home
                </button>
                <button
                  className={styles.changePillBtn}
                  style={{ width: "100%", padding: "12px", textAlign: "center" }}
                  onClick={() => {
                    setIsSuccessAnim(false);
                    setAmount("0");
                    setCurrentTab("history");
                  }}
                >
                  View in Activity History
                </button>
              </div>
            </div>
          )}

          {/* ======================= BOTTOM TAB BAR ======================= */}
          <nav className={styles.bottomTabBar}>
            <div
              className={`${styles.tabItem} ${currentTab === "home" ? styles.tabItemActive : ""}`}
              onClick={() => setCurrentTab("home")}
            >
              <div className={styles.tabIconBox}>
                <Home size={19} strokeWidth={currentTab === "home" ? 2.5 : 2} />
              </div>
              <span>Home</span>
            </div>

            <div
              className={`${styles.tabItem} ${currentTab === "send" ? styles.tabItemActive : ""}`}
              onClick={() => setCurrentTab("send")}
            >
              <div className={styles.tabIconBox}>
                <Send size={19} strokeWidth={currentTab === "send" ? 2.5 : 2} />
              </div>
              <span>Send</span>
            </div>

            <div
              className={`${styles.tabItem} ${currentTab === "receive" ? styles.tabItemActive : ""}`}
              onClick={() => setCurrentTab("receive")}
            >
              <div className={styles.tabIconBox}>
                <QrCode size={19} strokeWidth={currentTab === "receive" ? 2.5 : 2} />
              </div>
              <span>Receive</span>
            </div>

            <div
              className={`${styles.tabItem} ${currentTab === "history" ? styles.tabItemActive : ""}`}
              onClick={() => setCurrentTab("history")}
            >
              <div className={styles.tabIconBox}>
                <History size={19} strokeWidth={currentTab === "history" ? 2.5 : 2} />
              </div>
              <span>History</span>
            </div>
          </nav>

          {/* Insufficient Balance Bottom Sheet Popup */}
          {showInsufficientModal && (
            <div
              className={styles.insufficientModalOverlay}
              onClick={() => setShowInsufficientModal(false)}
            >
              <div
                className={styles.insufficientModalCard}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.insufficientHandle} />
                <div className={styles.insufficientIconBadge}>
                  <AlertOctagon size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className={styles.insufficientTitle}>Insufficient Balance</h3>
                  <p className={styles.insufficientDesc}>
                    Transfer of <strong>₹{parseFloat(amount).toLocaleString("en-IN")}</strong> exceeds your available account balance of <strong>{formatCur(balance)}</strong>.
                  </p>
                </div>
                <div className={styles.insufficientShortfallCard}>
                  <span className={styles.insufficientShortfallLabel}>Shortfall Required</span>
                  <span className={styles.insufficientShortfallValue}>
                    ₹{(parseFloat(amount) - balance).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={styles.insufficientBtnGroup}>
                  <button
                    type="button"
                    className={styles.insufficientTopUpBtn}
                    onClick={() => {
                      setShowInsufficientModal(false);
                      setCurrentTab("receive");
                    }}
                  >
                    <ArrowDownLeft size={15} strokeWidth={2.4} />
                    <span>Top Up Balance</span>
                  </button>
                  <button
                    type="button"
                    className={styles.insufficientDismissBtn}
                    onClick={() => setShowInsufficientModal(false)}
                  >
                    Adjust Amount
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* iOS Bottom Home Indicator Bar */}
          <div className={styles.homeIndicator} />
        </div>
      </div>
    </div>
  </div>
  );
};
