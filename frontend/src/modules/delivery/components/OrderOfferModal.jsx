import React, { useState, useEffect, useRef } from "react";

/**
 * OrderOfferModal — full-screen overlay shown when a queue-based order is offered to the rider.
 * Shows a 20-second countdown ring and Accept / Reject buttons.
 */
const OrderOfferModal = ({ offer, onAccept, onReject }) => {
  const [timeLeft, setTimeLeft] = useState(offer?.countdown || 20);
  const [accepting, setAccepting] = useState(false);
  const intervalRef = useRef(null);
  const TOTAL = offer?.countdown || 20;

  useEffect(() => {
    setTimeLeft(TOTAL);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          onReject?.("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [offer?.orderId]);

  const handleAccept = async () => {
    clearInterval(intervalRef.current);
    setAccepting(true);
    try {
      await onAccept?.(offer?.orderId);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = () => {
    clearInterval(intervalRef.current);
    onReject?.("manual");
  };

  if (!offer) return null;

  const pct = (timeLeft / TOTAL) * 100;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const timerColor = timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#f59e0b" : "#ef4444";

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerBadge}>🛒 New Order</div>
          <p style={styles.headerSub}>Queue Assignment — You're Next!</p>
        </div>

        {/* Countdown Ring */}
        <div style={styles.timerWrap}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            {/* Background circle */}
            <circle cx="65" cy="65" r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
            {/* Progress circle */}
            <circle
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke={timerColor}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <div style={styles.timerText}>
            <span style={{ ...styles.timerNum, color: timerColor }}>{timeLeft}</span>
            <span style={styles.timerSec}>sec</span>
          </div>
        </div>

        {/* Order Details */}
        <div style={styles.orderCard}>
          <div style={styles.orderRow}>
            <div style={styles.orderLabel}>📦 Pickup</div>
            <div style={styles.orderVal}>{offer.preview?.pickup || "Warehouse"}</div>
          </div>
          <div style={styles.divider} />
          <div style={styles.orderRow}>
            <div style={styles.orderLabel}>📍 Drop</div>
            <div style={styles.orderVal}>{offer.preview?.drop || "Customer"}</div>
          </div>
          <div style={styles.divider} />
          <div style={styles.orderRow}>
            <div style={styles.orderLabel}>💰 Value</div>
            <div style={{ ...styles.orderVal, color: "#22c55e", fontWeight: 700 }}>
              ₹{(offer.preview?.total || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button
            style={{ ...styles.btn, ...styles.btnReject }}
            onClick={handleReject}
            disabled={accepting}
          >
            ✗ Reject
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnAccept, opacity: accepting ? 0.7 : 1 }}
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? "Accepting..." : "✓ Accept"}
          </button>
        </div>

        <p style={styles.hint}>Order ID: {offer.orderId}</p>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  },
  card: {
    background: "linear-gradient(145deg,#0f172a,#1e293b)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "24px",
    padding: "28px 24px",
    maxWidth: "360px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
  },
  header: { marginBottom: "12px" },
  headerBadge: {
    display: "inline-block",
    background: "rgba(34,197,94,0.15)",
    color: "#22c55e",
    border: "1px solid rgba(34,197,94,0.3)",
    borderRadius: "99px",
    padding: "4px 14px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  headerSub: { color: "#94a3b8", fontSize: "13px", margin: 0 },
  timerWrap: {
    position: "relative",
    width: "130px",
    height: "130px",
    margin: "0 auto 20px",
  },
  timerText: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  timerNum: { fontSize: "36px", fontWeight: 800, lineHeight: 1 },
  timerSec: { fontSize: "12px", color: "#64748b", marginTop: "2px" },
  orderCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    padding: "14px 16px",
    marginBottom: "20px",
    textAlign: "left",
  },
  orderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" },
  orderLabel: { color: "#64748b", fontSize: "12px", fontWeight: 500 },
  orderVal: { color: "#f1f5f9", fontSize: "13px", fontWeight: 600, textAlign: "right", maxWidth: "60%" },
  divider: { height: "1px", background: "rgba(255,255,255,0.06)", margin: "8px 0" },
  btnRow: { display: "flex", gap: "12px" },
  btn: {
    flex: 1,
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.15s, opacity 0.15s",
  },
  btnAccept: {
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    color: "#fff",
    boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
  },
  btnReject: {
    background: "rgba(239,68,68,0.12)",
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.25)",
  },
  hint: { color: "#475569", fontSize: "11px", marginTop: "12px", marginBottom: 0 },
};

export default OrderOfferModal;
