import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@core/api/axios";
import { getOrderSocket } from "@core/services/orderSocket";
import { createSocketTokenReader } from "@core/utils/authStorage";
import { STORAGE_KEYS } from "@core/utils/storageKeys";
import { toast } from "sonner";
import { useAuth } from "@core/context/AuthContext";
import {
  Users,
  Clock,
  Send,
  Truck,
  RefreshCw,
  Package,
  AlertCircle,
  Building2,
  Smartphone
} from "lucide-react";

/* ── API ──────────────────────────────────────────────────────────────────── */
const api = {
  getQueue: (warehouseId) => axiosInstance.get(`/warehouse/${warehouseId}/queue/snapshot`),
};

/* ── Status badge colors ──────────────────────────────────────────────────── */
const STATUS_COLORS = {
  waiting: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Waiting" },
  order_offered: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Offer Sent" },
  order_assigned: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Assigned" },
  delivering: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Delivering" },
  offline: { bg: "bg-gray-100 text-gray-600 border-gray-200", label: "Offline" },
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg} inline-flex items-center gap-1 shadow-2xs`}>
      {c.label}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   QueueMonitor — Warehouse panel page (Light Theme)
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
    <div className="p-6 bg-gray-50/50 min-h-screen text-gray-900 font-sans">
      <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-xs">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-700">Warehouse ID not available. Please log in again.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="p-6 bg-gray-50/50 min-h-screen text-gray-900 font-sans">
      <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-xs">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-gray-500">Loading queue snapshot…</p>
      </div>
    </div>
  );

  const { queue = [], stats = {}, warehouseName } = snapshot || {};

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen text-gray-900 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Queue Monitor
          </h1>
          <p className="text-xs font-semibold text-gray-500 mt-1">
            {warehouseName || "Warehouse"} {lastRefresh ? `• Last updated ${lastRefresh.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:text-primary transition-all shadow-xs flex items-center gap-2 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<Users className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50 border-purple-100"
          label="Total in Queue"
          value={stats.total ?? 0}
          textColor="text-purple-700"
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-sky-600" />}
          iconBg="bg-sky-50 border-sky-100"
          label="Waiting"
          value={stats.waiting ?? 0}
          textColor="text-sky-700"
        />
        <StatCard
          icon={<Send className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100"
          label="Offer Sent"
          value={stats.offered ?? 0}
          textColor="text-amber-700"
        />
        <StatCard
          icon={<Truck className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100"
          label="Delivering"
          value={stats.delivering ?? 0}
          textColor="text-emerald-700"
        />
      </div>

      {/* Queue list */}
      {queue.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-xs">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-600">No riders currently checked into queue</p>
          <p className="text-xs text-gray-400 mt-1">Delivery partners will appear here in real time when they scan the QR code</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Riders Queue List ({queue.length})
          </h2>
          <div className="space-y-3">
            {queue.map((entry, idx) => (
              <RiderRow key={entry.checkinId || idx} entry={entry} pos={idx + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const StatCard = ({ icon, iconBg, label, value, textColor }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
    <div className={`p-2.5 rounded-xl border ${iconBg} flex items-center justify-center shrink-0`}>
      {icon}
    </div>
    <div>
      <div className={`text-xl font-black ${textColor} leading-tight`}>{value}</div>
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  </div>
);

const RiderRow = ({ entry, pos }) => {
  const r = entry.rider || {};
  const sinceCheckin = entry.checkinTime ? Math.round((Date.now() - new Date(entry.checkinTime).getTime()) / 60000) : null;

  return (
    <div className="bg-gray-50/70 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-all">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-sm text-primary shrink-0">
          #{pos}
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-900">{r.name || "Unknown Rider"}</h4>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mt-0.5">
            {r.vehicleType && <span className="capitalize">{r.vehicleType}</span>}
            {sinceCheckin !== null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                {sinceCheckin}m in queue
              </span>
            )}
            {r.phone && (
              <span className="flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-gray-400" />
                {r.phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <StatusBadge status={r.queueStatus || "waiting"} />
        {entry.currentOrder && (
          <div className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-md mt-1.5 flex items-center justify-end gap-1">
            <Package className="w-3 h-3 text-purple-500" />
            #{entry.currentOrder.orderId || entry.currentOrder._id}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueMonitor;
