import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@core/api/axios";
import { getOrderSocket } from "@core/services/orderSocket";
import { createSocketTokenReader } from "@core/utils/authStorage";
import { STORAGE_KEYS } from "@core/utils/storageKeys";
import { toast } from "sonner";

/* ── API ──────────────────────────────────────────────────────────────────── */
const api = {
  getAllQueues: () => axiosInstance.get("/admin/warehouse-queue/all"),
  getWarehouseQueue: (wid) => axiosInstance.get(`/admin/warehouse-queue/${wid}`),
};

/* ── Status badge ──────────────────────────────────────────────────────────── */
const STATUS = {
  waiting:       { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa",  label: "Waiting" },
  order_offered: { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b",  label: "Offer Sent" },
  order_assigned:{ bg: "rgba(168,85,247,0.12)",  text: "#c084fc",  label: "Assigned" },
  delivering:    { bg: "rgba(34,197,94,0.12)",   text: "#22c55e",  label: "Delivering" },
  offline:       { bg: "rgba(100,116,139,0.12)", text: "#94a3b8",  label: "Offline" },
};

const Badge = ({ status }) => {
  const c = STATUS[status] || STATUS.waiting;
  return <span style={{ ...BS.badge, background: c.bg, color: c.text }}>{c.label}</span>;
};

/* ════════════════════════════════════════════════════════════════════════════
   WarehouseQueueDashboard — Admin panel page
   ════════════════════════════════════════════════════════════════════════════ */
const WarehouseQueueDashboard = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedWh, setSelectedWh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await api.getAllQueues();
      setSnapshots(res.data?.results || res.data?.result || res.data?.data || []);
      setLastRefresh(new Date());
    } catch {
      toast.error("Failed to load warehouse queues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Real-time updates
  useEffect(() => {
    const getToken = createSocketTokenReader(STORAGE_KEYS.AUTH_ADMIN);
    const socket = getOrderSocket(getToken);
    if (!socket) return;
    const handler = () => fetchAll();
    socket.on("queue:updated", handler);
    socket.on("queue:rider_joined", handler);
    socket.on("queue:rider_left", handler);
    return () => {
      socket.off("queue:updated", handler);
      socket.off("queue:rider_joined", handler);
      socket.off("queue:rider_left", handler);
    };
  }, [fetchAll]);

  /* ── Aggregated totals ── */
  const totals = snapshots.reduce(
    (acc, s) => ({
      riders: acc.riders + (s.stats?.total || 0),
      waiting: acc.waiting + (s.stats?.waiting || 0),
      offered: acc.offered + (s.stats?.offered || 0),
      delivering: acc.delivering + (s.stats?.delivering || 0),
    }),
    { riders: 0, waiting: 0, offered: 0, delivering: 0 },
  );

  const activeWarehouse = snapshots.find((s) => String(s.warehouseId) === String(selectedWh));

  return (
    <div style={S.page}>
      {/* Page title */}
      <div style={S.headerBar}>
        <div>
          <h1 style={S.title}>Warehouse Queue Dashboard</h1>
          <p style={S.sub}>
            {snapshots.length} warehouses · {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
          </p>
        </div>
        <button style={S.refreshBtn} onClick={fetchAll}>↻ Refresh</button>
      </div>

      {/* Global stats */}
      <div style={S.statsRow}>
        <GlobalStat icon="🏭" label="Warehouses" value={snapshots.length} color="#60a5fa" />
        <GlobalStat icon="👥" label="Total Riders" value={totals.riders} color="#a78bfa" />
        <GlobalStat icon="⏳" label="Waiting" value={totals.waiting} color="#94a3b8" />
        <GlobalStat icon="📬" label="Offers Active" value={totals.offered} color="#f59e0b" />
        <GlobalStat icon="🚀" label="Delivering" value={totals.delivering} color="#22c55e" />
      </div>

      {loading ? (
        <div style={S.loadingWrap}>
          <div style={S.spinner} />
          <p style={{ color: "#64748b", marginTop: 12 }}>Loading queues…</p>
        </div>
      ) : (
        <div style={S.mainGrid}>
          {/* Left: Warehouse list */}
          <div style={S.warehouseList}>
            <h2 style={S.sectionTitle}>Warehouses</h2>
            {snapshots.length === 0 ? (
              <p style={{ color: "#64748b", padding: 16 }}>No active warehouses</p>
            ) : (
              snapshots.map((s) => (
                <WarehouseCard
                  key={s.warehouseId}
                  snapshot={s}
                  selected={String(selectedWh) === String(s.warehouseId)}
                  onClick={() => setSelectedWh(s.warehouseId)}
                />
              ))
            )}
          </div>

          {/* Right: Selected warehouse detail */}
          <div style={S.detail}>
            {!activeWarehouse ? (
              <div style={S.selectPrompt}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
                <p style={{ color: "#64748b" }}>Select a warehouse to view its queue</p>
              </div>
            ) : (
              <WarehouseDetail snapshot={activeWarehouse} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const GlobalStat = ({ icon, label, value, color }) => (
  <div style={S.statCard}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    <div style={{ fontSize: 22, fontWeight: 800, color, margin: "4px 0 2px" }}>{value}</div>
    <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
  </div>
);

const WarehouseCard = ({ snapshot, selected, onClick }) => (
  <div
    style={{
      ...S.whCard,
      borderColor: selected ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)",
      background: selected ? "rgba(59,130,246,0.08)" : "rgba(15,23,42,0.8)",
    }}
    onClick={onClick}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={S.whName}>{snapshot.warehouseName}</p>
        <p style={S.whSub}>{snapshot.stats?.total ?? 0} rider{snapshot.stats?.total !== 1 ? "s" : ""} in queue</p>
      </div>
      <div style={{ textAlign: "right" }}>
        {snapshot.stats?.offering > 0 && <Badge status="order_offered" />}
        {snapshot.stats?.delivering > 0 && (
          <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>
            {snapshot.stats.delivering} delivering
          </div>
        )}
      </div>
    </div>
    <div style={S.whMiniBar}>
      <MiniStat label="Wait" value={snapshot.stats?.waiting ?? 0} color="#60a5fa" />
      <MiniStat label="Offer" value={snapshot.stats?.offered ?? 0} color="#f59e0b" />
      <MiniStat label="Active" value={snapshot.stats?.delivering ?? 0} color="#22c55e" />
    </div>
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 10, color: "#475569" }}>{label}</div>
  </div>
);

const WarehouseDetail = ({ snapshot }) => {
  const { queue = [], stats = {}, warehouseName } = snapshot;

  return (
    <div>
      <div style={S.detailHeader}>
        <h2 style={S.detailTitle}>{warehouseName}</h2>
        <div style={S.detailStats}>
          <span style={{ color: "#60a5fa" }}>{stats.total} Total</span>
          <span style={{ color: "#f59e0b" }}>{stats.offered} Offered</span>
          <span style={{ color: "#22c55e" }}>{stats.delivering} Delivering</span>
        </div>
      </div>

      {queue.length === 0 ? (
        <div style={S.emptyDetail}>
          <div style={{ fontSize: 36 }}>🏁</div>
          <p style={{ color: "#64748b", marginTop: 8 }}>No riders in queue</p>
        </div>
      ) : (
        <div style={S.riderList}>
          {queue.map((entry) => {
            const r = entry.rider || {};
            const since = entry.checkinTime
              ? Math.round((Date.now() - new Date(entry.checkinTime).getTime()) / 60000)
              : null;
            return (
              <div key={entry.checkinId} style={S.riderRow}>
                <div style={S.posCircle}>{entry.queuePosition}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{r.name || "—"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {r.vehicleType} · {r.phone}
                    {since !== null ? ` · ${since}m in queue` : ""}
                  </div>
                  {entry.currentOrder && (
                    <div style={{ fontSize: 11, color: "#a78bfa", marginTop: 3 }}>
                      📦 {entry.currentOrder.orderId} — {entry.currentOrder.dropAddress}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <Badge status={r.queueStatus || "waiting"} />
                  {entry.gpsStatus?.lastVerifiedAt && (
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
                      GPS {new Date(entry.gpsStatus.lastVerifiedAt).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
/** @type {Object<string, React.CSSProperties>} */
const S = {
  page: { padding: "24px", fontFamily: "system-ui,sans-serif", color: "#f1f5f9", minHeight: "100vh" },
  headerBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: "#f1f5f9" },
  sub: { color: "#64748b", fontSize: 13, marginTop: 4 },
  refreshBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 },
  statCard: { background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px", textAlign: "center" },
  mainGrid: { display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 },
  warehouseList: { display: "flex", flexDirection: "column", gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" },
  whCard: { border: "1px solid", borderRadius: 14, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s" },
  whName: { fontSize: 14, fontWeight: 700, margin: 0, color: "#f1f5f9" },
  whSub: { fontSize: 12, color: "#64748b", margin: "2px 0 10px" },
  whMiniBar: { display: "flex", gap: 20 },
  detail: { background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "20px", minHeight: 400 },
  selectPrompt: { textAlign: "center", padding: "80px 0" },
  detailHeader: { marginBottom: 20 },
  detailTitle: { fontSize: 18, fontWeight: 800, margin: 0, color: "#f1f5f9" },
  detailStats: { display: "flex", gap: 16, marginTop: 6, fontSize: 13, fontWeight: 600 },
  emptyDetail: { textAlign: "center", padding: "40px 0" },
  riderList: { display: "flex", flexDirection: "column", gap: 10 },
  riderRow: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 },
  posCircle: { width: 32, height: 32, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#60a5fa", flexShrink: 0 },
  loadingWrap: { textAlign: "center", padding: "80px 0" },
  spinner: { width: 32, height: 32, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
};

/** @type {Object<string, React.CSSProperties>} */
const BS = {
  badge: { borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-block" },
};

export default WarehouseQueueDashboard;
