import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@core/api/axios";
import { getOrderSocket } from "@core/services/orderSocket";
import { createSocketTokenReader } from "@core/utils/authStorage";
import { STORAGE_KEYS } from "@core/utils/storageKeys";
import { toast } from "sonner";
import { useAuth } from "@core/context/AuthContext";

/* ── API ──────────────────────────────────────────────────────────────────── */
const api = {
  getQueue: (warehouseId) => axiosInstance.get(`/warehouse/${warehouseId}/queue/snapshot`),
};

/* ── Status badge colors ──────────────────────────────────────────────────── */
const STATUS_COLORS = {
  waiting: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", label: "Waiting" },
  order_offered: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", label: "Offer Sent" },
  order_assigned: { bg: "rgba(168,85,247,0.12)", text: "#c084fc", label: "Assigned" },
  delivering: { bg: "rgba(34,197,94,0.12)", text: "#22c55e", label: "Delivering" },
  offline: { bg: "rgba(100,116,139,0.12)", text: "#94a3b8", label: "Offline" },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      {c.label}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   QueueMonitor — Warehouse panel page
   ════════════════════════════════════════════════════════════════════════════ */
const QueueMonitor = ({ warehouseId: propId }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const { user } = useAuth();

  // Derive warehouseId from prop or auth user
  const warehouseId = propId || user?.id || user?._id || null;

  const fetchQueue = useCallback(async () => {
    if (!warehouseId) return;
    try {
      const res = await api.getQueue(warehouseId);
      setSnapshot(res.data?.result || res.data?.data);
      setLastRefresh(new Date());
    } catch (err) {
      if (err?.response?.status !== 403) toast.error("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Real-time updates via socket
  useEffect(() => {
    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_WAREHOUSE);
    const socket = getOrderSocket(getToken);
    if (!socket || !warehouseId) return;
    const handleUpdate = (data) => {
      if (String(data?.warehouseId) === String(warehouseId)) {
        fetchQueue();
      }
    };
    socket.on("queue:updated", handleUpdate);
    socket.on("queue:rider_joined", handleUpdate);
    socket.on("queue:rider_left", handleUpdate);
    return () => {
      socket.off("queue:updated", handleUpdate);
      socket.off("queue:rider_joined", handleUpdate);
      socket.off("queue:rider_left", handleUpdate);
    };
  }, [warehouseId, fetchQueue]);

  if (!warehouseId) return (
    <div style={S.page}>
      <div style={S.empty}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: "#64748b" }}>Warehouse ID not available. Please log in again.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={S.page}>
      <div style={S.empty}>
        <div style={S.spinner} />
        <p style={{ color: "#64748b", marginTop: 12 }}>Loading queue…</p>
      </div>
    </div>
  );

  const { queue = [], stats = {}, warehouseName } = snapshot || {};

  return (
    <div style={S.page}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h1 style={S.title}>Queue Monitor</h1>
          <p style={S.sub}>{warehouseName} · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : ""}</p>
        </div>
        <button style={S.refreshBtn} onClick={fetchQueue}>↻ Refresh</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon="👥" label="Total in Queue" value={stats.total ?? 0} color="#60a5fa" />
        <StatCard icon="⏳" label="Waiting" value={stats.waiting ?? 0} color="#94a3b8" />
        <StatCard icon="📬" label="Offer Sent" value={stats.offered ?? 0} color="#f59e0b" />
        <StatCard icon="🚀" label="Delivering" value={stats.delivering ?? 0} color="#22c55e" />
      </div>

      {/* Queue list */}
      {queue.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏁</div>
          <p style={{ color: "#64748b" }}>No riders in queue right now</p>
        </div>
      ) : (
        <div style={S.queueList}>
          {queue.map((entry, idx) => (
            <RiderRow key={entry.checkinId} entry={entry} pos={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const StatCard = ({ icon, label, value, color }) => (
  <div style={S.statCard}>
    <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>{label}</div>
  </div>
);

const RiderRow = ({ entry, pos }) => {
  const r = entry.rider || {};
  const sinceCheckin = entry.checkinTime ? Math.round((Date.now() - new Date(entry.checkinTime).getTime()) / 60000) : null;

  return (
    <div style={S.riderRow}>
      <div style={S.posNum}>#{pos}</div>
      <div style={S.riderInfo}>
        <div style={S.riderName}>{r.name || "Unknown Rider"}</div>
        <div style={S.riderMeta}>
          {r.vehicleType && <span>{r.vehicleType}</span>}
          {sinceCheckin !== null && <span>· {sinceCheckin}m in queue</span>}
          {r.phone && <span>· {r.phone}</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <StatusBadge status={r.queueStatus || "waiting"} />
        {entry.currentOrder && (
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>📦 {entry.currentOrder.orderId}</div>
        )}
      </div>
    </div>
  );
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
/** @type {Record<string, import('react').CSSProperties>} */
const S = {
  page: { padding: "24px", fontFamily: "system-ui,sans-serif", color: "#f1f5f9", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: "#f1f5f9" },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0 0" },
  refreshBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 },
  statCard: { background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px", textAlign: "center" },
  queueList: { display: "flex", flexDirection: "column", gap: 10 },
  riderRow: { background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 },
  posNum: { fontSize: 20, fontWeight: 800, color: "#475569", minWidth: 36 },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 },
  riderMeta: { fontSize: 12, color: "#64748b", display: "flex", gap: 6, flexWrap: "wrap" },
  empty: { textAlign: "center", padding: "60px 0" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
};

export default QueueMonitor;
