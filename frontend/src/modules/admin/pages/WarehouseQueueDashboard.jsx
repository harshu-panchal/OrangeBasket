import React, { useState, useEffect, useCallback } from "react";
import axiosInstance from "@core/api/axios";
import { getOrderSocket } from "@core/services/orderSocket";
import { createSocketTokenReader } from "@core/utils/authStorage";
import { STORAGE_KEYS } from "@core/utils/storageKeys";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Clock,
  Send,
  Truck,
  RefreshCw,
  Package,
  MapPin,
  Smartphone,
  Navigation
} from "lucide-react";

/* ── API ──────────────────────────────────────────────────────────────────── */
const api = {
  getAllQueues: () => axiosInstance.get("/admin/warehouse-queue/all"),
  getWarehouseQueue: (wid) => axiosInstance.get(`/admin/warehouse-queue/${wid}`),
};

/* ── Status badge ──────────────────────────────────────────────────────────── */
const STATUS = {
  waiting: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Waiting" },
  order_offered: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Offer Sent" },
  order_assigned: { bg: "bg-purple-50 text-purple-700 border-purple-200", label: "Assigned" },
  delivering: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Delivering" },
  offline: { bg: "bg-gray-100 text-gray-600 border-gray-200", label: "Offline" },
};

const Badge = ({ status }) => {
  const c = STATUS[status] || STATUS.waiting;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.bg} inline-flex items-center gap-1 shadow-2xs`}>
      {c.label}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   WarehouseQueueDashboard — Admin Panel (Light Theme)
   ════════════════════════════════════════════════════════════════════════════ */
const WarehouseQueueDashboard = () => {
  const [snapshots, setSnapshots] = useState([]);
  const [selectedWh, setSelectedWh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await api.getAllQueues();
      const list = res.data?.results || res.data?.result || res.data?.data || [];
      setSnapshots(list);
      setLastRefresh(new Date());
      // Default select first warehouse if none selected
      if (!selectedWh && list.length > 0) {
        setSelectedWh(list[0].warehouseId);
      }
    } catch {
      toast.error("Failed to load warehouse queues");
    } finally {
      setLoading(false);
    }
  }, [selectedWh]);

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
    { riders: 0, waiting: 0, offered: 0, delivering: 0 }
  );

  const activeWarehouse = snapshots.find((s) => String(s.warehouseId) === String(selectedWh));

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen text-gray-900 font-sans">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Warehouse Queue Monitor</h1>
          <p className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-2">
            <span>{snapshots.length} Warehouses Active</span>
            <span>•</span>
            <span>{lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : "Loading…"}</span>
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="self-start sm:self-auto px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:text-primary transition-all shadow-xs flex items-center gap-2 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <GlobalStat
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50 border-blue-100"
          label="Warehouses"
          value={snapshots.length}
          textColor="text-blue-700"
        />
        <GlobalStat
          icon={<Users className="w-5 h-5 text-purple-600" />}
          iconBg="bg-purple-50 border-purple-100"
          label="Total Riders"
          value={totals.riders}
          textColor="text-purple-700"
        />
        <GlobalStat
          icon={<Clock className="w-5 h-5 text-sky-600" />}
          iconBg="bg-sky-50 border-sky-100"
          label="Waiting"
          value={totals.waiting}
          textColor="text-sky-700"
        />
        <GlobalStat
          icon={<Send className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100"
          label="Offers Active"
          value={totals.offered}
          textColor="text-amber-700"
        />
        <GlobalStat
          icon={<Truck className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100"
          label="Delivering"
          value={totals.delivering}
          textColor="text-emerald-700"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-xs">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">Loading queue status…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Warehouse List */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
              Warehouses List
            </h2>
            {snapshots.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center text-xs font-semibold text-gray-400">
                No active warehouses found
              </div>
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

          {/* Right Column: Selected Warehouse Detail */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 min-h-[480px]">
              {!activeWarehouse ? (
                <div className="text-center py-24">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-gray-500">Select a warehouse from the left panel to inspect queue details</p>
                </div>
              ) : (
                <WarehouseDetail snapshot={activeWarehouse} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const GlobalStat = ({ icon, iconBg, label, value, textColor }) => (
  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-3.5">
    <div className={`p-2.5 rounded-xl border ${iconBg} flex items-center justify-center shrink-0`}>
      {icon}
    </div>
    <div>
      <div className={`text-xl font-black ${textColor} leading-tight`}>{value}</div>
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  </div>
);

const WarehouseCard = ({ snapshot, selected, onClick }) => (
  <div
    onClick={onClick}
    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
      selected
        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
        : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-2xs"
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">{snapshot.warehouseName}</h3>
        <p className="text-xs font-medium text-gray-500 mt-0.5">
          {snapshot.stats?.total ?? 0} rider{snapshot.stats?.total !== 1 ? "s" : ""} in queue
        </p>
      </div>
      <div className="text-right shrink-0">
        {snapshot.stats?.offered > 0 && <Badge status="order_offered" />}
        {snapshot.stats?.delivering > 0 && (
          <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center justify-end gap-1">
            <Truck className="w-3 h-3" />
            {snapshot.stats.delivering} delivering
          </div>
        )}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100/80 text-center">
      <MiniStat label="Wait" value={snapshot.stats?.waiting ?? 0} textColor="text-sky-600" />
      <MiniStat label="Offer" value={snapshot.stats?.offered ?? 0} textColor="text-amber-600" />
      <MiniStat label="Active" value={snapshot.stats?.delivering ?? 0} textColor="text-emerald-600" />
    </div>
  </div>
);

const MiniStat = ({ label, value, textColor }) => (
  <div className="bg-gray-50/60 rounded-lg py-1 px-1.5 border border-gray-100/60">
    <div className={`text-xs font-black ${textColor}`}>{value}</div>
    <div className="text-[9px] font-bold text-gray-400 uppercase">{label}</div>
  </div>
);

const WarehouseDetail = ({ snapshot }) => {
  const { queue = [], stats = {}, warehouseName } = snapshot;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {warehouseName}
          </h2>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Real-time rider assignment & status overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 bg-sky-50 text-sky-700 border border-sky-100 font-bold text-xs rounded-xl">
            {stats.total || 0} Total
          </span>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 font-bold text-xs rounded-xl">
            {stats.offered || 0} Offered
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs rounded-xl">
            {stats.delivering || 0} Delivering
          </span>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-16 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">No riders currently checked into this queue</p>
          <p className="text-xs text-gray-400 mt-1">Checked-in delivery partners will appear here automatically</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
            Rider Queue ({queue.length})
          </div>
          {queue.map((entry) => {
            const r = entry.rider || {};
            const since = entry.checkinTime
              ? Math.round((Date.now() - new Date(entry.checkinTime).getTime()) / 60000)
              : null;
            return (
              <div
                key={entry.checkinId}
                className="bg-gray-50/70 hover:bg-white border border-gray-100 hover:border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-sm text-primary shrink-0">
                    #{entry.queuePosition}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {r.name || "Unknown Rider"}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 font-medium mt-0.5">
                      {r.vehicleType && <span className="capitalize">{r.vehicleType}</span>}
                      {r.phone && (
                        <span className="flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-gray-400" />
                          {r.phone}
                        </span>
                      )}
                      {since !== null && (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-3 h-3" />
                          {since}m in queue
                        </span>
                      )}
                    </div>

                    {entry.currentOrder && (
                      <div className="mt-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span>Order #{entry.currentOrder.orderId || entry.currentOrder._id}</span>
                        {entry.currentOrder.dropAddress && (
                          <span className="text-purple-600/80 truncate max-w-[240px] flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {entry.currentOrder.dropAddress}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <Badge status={r.queueStatus || entry.status || "waiting"} />
                  {entry.gpsStatus?.lastVerifiedAt && (
                    <div className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-1">
                      <Navigation className="w-2.5 h-2.5 text-emerald-500" />
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

export default WarehouseQueueDashboard;
