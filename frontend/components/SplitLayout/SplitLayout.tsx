"use client";

import React, { useState, useEffect } from "react";
import styles from "./SplitLayout.module.css";
import { MobileSimulator } from "@/components/MobileSimulator/MobileSimulator";
import { RightWorkspace } from "@/components/RightWorkspace/RightWorkspace";
import {
  Shield,
  Radio,
  Smartphone,
  LayoutDashboard,
  Zap,
  CheckCircle2,
  X,
  Sliders,
  Play,
  Pause,
  Square,
  Layers,
  Sparkles,
  Gauge,
  Activity,
  AlertTriangle,
  Code2,
} from "lucide-react";

interface DevNotification {
  id: string;
  type: "on" | "off" | "alert";
  title: string;
  message: string;
  subText?: string;
}

export const SplitLayout: React.FC = () => {
  const [mobileView, setMobileView] = useState<"simulator" | "workspace">("simulator");
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [messagesPerSec, setMessagesPerSec] = useState<number>(3);
  const [riskRatio, setRiskRatio] = useState<number>(18);
  const [notification, setNotification] = useState<DevNotification | null>(null);

  // Toggle button clicked in the extreme top-right
  const handleToggleClick = () => {
    if (!isDevMode) {
      // Opening Developer Mode opens the centered settings configuration modal
      setIsSettingsOpen(true);
    } else {
      // If already streaming, toggle directly OFF and refresh chart & list to baseline
      handleStopDevMode();
    }
  };

  // User stops streaming and refreshes chart & list back to initial baseline
  const handleStopDevMode = () => {
    setIsDevMode(false);
    setIsSettingsOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("eclipse:reset-stream"));
    }
    setNotification({
      id: `notif-${Date.now()}`,
      type: "off",
      title: "Developer Mode Disabled",
      message: "Continuous transaction stream stopped. Refreshed charts and transfers to baseline.",
    });
  };

  // User confirms & applies settings from the centered modal card
  const handleApplySettingsAndLaunch = () => {
    setIsDevMode(true);
    setIsSettingsOpen(false);
    setNotification({
      id: `notif-${Date.now()}`,
      type: "on",
      title: "Developer Mode Active",
      message: `Streaming in batches of ${messagesPerSec} transactions/sec (~${messagesPerSec * 60} tx/min, max 6/patch).`,
      subText: "Volume Treemap and Recent Transfers updating in atomic batches without individual render locks.",
    });
  };

  // Auto-dismiss notification toast after 4.5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  return (
    <div className={styles.layoutContainer}>
      {/* Top Application Header */}
      <header className={styles.topNavbar}>
        <div className={styles.brandGroup}>
          <div className={styles.logoIcon}>
            <Shield size={16} strokeWidth={2.5} />
          </div>
          <div className={styles.brandTitle}>
            <span>ECLIPSE</span>
            <span className={styles.brandBadge}>FRAUD INTERCEPTOR</span>
          </div>
        </div>

        {/* Mobile View Switcher (Visible only on mobile/narrow screens) */}
        <div className={styles.mobileViewSwitcher}>
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${mobileView === "simulator" ? styles.viewToggleActive : ""}`}
            onClick={() => setMobileView("simulator")}
            title="Switch to Mobile App Simulator"
          >
            <Smartphone size={13} strokeWidth={2.5} />
            <span>Simulator</span>
          </button>
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${mobileView === "workspace" ? styles.viewToggleActive : ""}`}
            onClick={() => setMobileView("workspace")}
            title="Switch to Interceptor Canvas"
          >
            <LayoutDashboard size={13} strokeWidth={2.5} />
            <span>Workspace</span>
          </button>
        </div>

        {/* Extreme Top-Right Section: Telemetry Stats & </> Developer Mode Button */}
        <div className={styles.navRightGroup}>
          <div className={styles.navStats}>
            <div className={styles.statItem}>
              <span className={styles.statusDot} />
              <span>ENGINE: LIVE</span>
            </div>
            <div className={styles.statItem}>
              <Radio size={14} style={{ color: "#0284c7" }} />
              <span>PAYMENT SIM: ACTIVE</span>
            </div>
          </div>

          {/* Extreme Top-Right: Developer Mode Button with </> sign in front */}
          <div className={styles.devBtnContainer}>
            {isDevMode && (
              <button
                type="button"
                className={styles.devGearBtn}
                onClick={() => setIsSettingsOpen(true)}
                title="Configure Messages Per Second"
              >
                <Sliders size={12} strokeWidth={2.2} />
                <span>{messagesPerSec}/s</span>
              </button>
            )}

            <button
              type="button"
              className={`${styles.devBtn} ${isDevMode ? styles.devBtnActive : ""}`}
              onClick={handleToggleClick}
              title={
                isDevMode
                  ? "Developer Mode Active (Click to Stop & Reset)"
                  : "Open Developer Mode Settings"
              }
            >
              <span className={styles.devCodeBadge}>&lt;/&gt;</span>
              <span className={styles.devBtnText}>Developer Mode</span>
              {isDevMode && <span className={styles.devActiveDot} />}
            </button>
          </div>
        </div>
      </header>

      {/* Centered Modal Card with Blurred Background for Developer Mode Settings */}
      {isSettingsOpen && (
        <div className={styles.modalBackdropOverlay} onClick={() => setIsSettingsOpen(false)}>
          <div
            className={styles.settingsCard}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-settings-title"
          >
            {/* Modal Card Header */}
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <div className={styles.cardIconBox}>
                  <Gauge size={18} strokeWidth={2.4} color="#c6f10e" />
                </div>
                <div>
                  <h2 id="dev-settings-title" className={styles.cardTitle}>
                    Developer Mode Settings
                  </h2>
                  <p className={styles.cardSubTitle}>
                    Configure continuous transaction velocity & throughput
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.cardCloseBtn}
                onClick={() => setIsSettingsOpen(false)}
                title="Close Settings"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Card Body: Settings Options */}
            <div className={styles.cardBody}>
              {/* Option 1: Batch Size & Velocity Slider */}
              <div className={styles.settingGroup}>
                <div className={styles.settingLabelRow}>
                  <div className={styles.settingLabelInfo}>
                    <span className={styles.settingLabelTitle}>BATCH SIZE & VELOCITY PER SECOND</span>
                    <span className={styles.settingLabelDesc}>
                      Release incoming transactions in batches of 3 or 5 per second (Max: 6 per patch)
                    </span>
                  </div>
                  <div className={styles.activeRateBadge}>
                    <Zap size={13} color="#0f172a" fill="#0f172a" />
                    <span>{messagesPerSec} msg / sec (Batch of {messagesPerSec})</span>
                  </div>
                </div>

                {/* Range Slider */}
                <div className={styles.sliderContainer}>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={messagesPerSec}
                    onChange={(e) => setMessagesPerSec(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                  <div className={styles.sliderTicks}>
                    <span>1/s (Single)</span>
                    <span>3/s (Batch of 3)</span>
                    <span>5/s (Batch of 5)</span>
                    <span>6/s (Max Patch)</span>
                  </div>
                </div>

                {/* Quick Presets Pills */}
                <div className={styles.presetPillsRow}>
                  {[
                    { rate: 3, label: "3 msg/s (Batch of 3)" },
                    { rate: 5, label: "5 msg/s (Batch of 5)" },
                    { rate: 6, label: "6 msg/s (Max 6 / Patch)" },
                    { rate: 1, label: "1 msg/s (Single)" },
                  ].map((preset) => (
                    <button
                      key={preset.rate}
                      type="button"
                      className={`${styles.presetBtn} ${messagesPerSec === preset.rate ? styles.presetBtnActive : ""}`}
                      onClick={() => setMessagesPerSec(preset.rate)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2: Anomaly & Risk Injection Ratio */}
              <div className={styles.settingGroup}>
                <div className={styles.settingLabelRow}>
                  <div className={styles.settingLabelInfo}>
                    <span className={styles.settingLabelTitle}>FLAGGED ANOMALY PROBABILITY</span>
                    <span className={styles.settingLabelDesc}>
                      Percentage of transactions flagged for bank quarantine intercept
                    </span>
                  </div>
                  <span className={styles.riskPercentBadge}>{riskRatio}% Risk</span>
                </div>

                <div className={styles.presetPillsRow}>
                  {[
                    { label: "0% Clean Only", val: 0 },
                    { label: "15% Standard Anomaly", val: 15 },
                    { label: "30% High-Risk Wave", val: 30 },
                    { label: "50% Stress Quarantine", val: 50 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      className={`${styles.presetBtn} ${riskRatio === preset.val ? styles.presetBtnActive : ""}`}
                      onClick={() => setRiskRatio(preset.val)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Summary Box */}
              <div className={styles.previewBox}>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Estimated Stream Velocity:</span>
                  <span className={styles.previewValue}>~{messagesPerSec * 60} transactions / minute</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Batch Ingestion Engine:</span>
                  <span className={styles.previewValue}>Atomic {messagesPerSec}-item batch release (Max 6 per patch)</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Sub-Second Grouping:</span>
                  <span className={styles.previewValue}>Buffers arrivals within 1s &amp; flushes in 3–5 batch updates</span>
                </div>
                <div className={styles.previewRow}>
                  <span className={styles.previewLabel}>Buffer Lifespan:</span>
                  <span className={styles.previewValue}>15-Minute auto-eviction rolling window</span>
                </div>
              </div>
            </div>

            {/* Modal Card Footer Actions */}
            <div className={styles.cardFooter}>
              {isDevMode && (
                <button
                  type="button"
                  className={styles.stopStreamBtn}
                  onClick={handleStopDevMode}
                  title="Disable Developer Mode and refresh charts/transfers to baseline"
                >
                  <Square size={12} fill="#ef4444" color="#ef4444" />
                  <span>Stop Streaming & Refresh</span>
                </button>
              )}
              <div className={styles.cardFooterRight}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.applyLaunchBtn}
                  onClick={handleApplySettingsAndLaunch}
                >
                  <Play size={14} fill="#0f172a" color="#0f172a" />
                  <span>{isDevMode ? "Update Stream Rate" : "Start Streaming"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Developer Mode Notification Toast */}
      {notification && (
        <div
          className={`${styles.notificationToast} ${
            notification.type === "on"
              ? styles.toastDevOn
              : notification.type === "alert"
              ? styles.toastAlert
              : styles.toastDevOff
          }`}
        >
          <div className={styles.toastIconBox}>
            {notification.type === "on" ? (
              <Zap size={16} strokeWidth={2.5} color="#c6f10e" />
            ) : notification.type === "alert" ? (
              <AlertTriangle size={16} strokeWidth={2.5} color="#fb7185" />
            ) : (
              <CheckCircle2 size={16} strokeWidth={2.5} color="#94a3b8" />
            )}
          </div>
          <div className={styles.toastBody}>
            <div className={styles.toastTitleRow}>
              <span className={styles.toastTitle}>{notification.title}</span>
              <span className={styles.toastBadge}>
                {notification.type === "on" ? `${messagesPerSec} MSG/S` : "STANDBY"}
              </span>
            </div>
            <p className={styles.toastMessage}>{notification.message}</p>
            {notification.subText && (
              <p className={styles.toastSubText}>{notification.subText}</p>
            )}
          </div>
          <button
            type="button"
            className={styles.toastCloseBtn}
            onClick={() => setNotification(null)}
            title="Dismiss Notification"
          >
            <X size={14} />
          </button>
          <div className={styles.toastProgressBar} />
        </div>
      )}

      {/* Main Split Layout: Left Simulator + Right Workspace */}
      <main className={styles.splitContent}>
        {/* Left Section: Mobile Simulator */}
        <section
          className={`${styles.leftSection} ${mobileView === "simulator" ? styles.sectionVisible : styles.sectionHiddenMobile}`}
          aria-label="Mobile Simulation Panel"
        >
          <MobileSimulator />
        </section>

        {/* Right Section: Workspace */}
        <section
          className={`${styles.rightSection} ${mobileView === "workspace" ? styles.sectionVisible : styles.sectionHiddenMobile}`}
          aria-label="Workspace Canvas Panel"
        >
          <RightWorkspace
            isDevMode={isDevMode}
            messagesPerSec={messagesPerSec}
            riskRatio={riskRatio}
          />
        </section>
      </main>
    </div>
  );
};



