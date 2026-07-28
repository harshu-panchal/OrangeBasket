import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  Shield,
  User,
  ExternalLink,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "../services/adminApi";

const statusConfig = {
  active: {
    label: "Active",
    color: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
  acknowledged: {
    label: "Acknowledged",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
  },
};

const SOSAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getSOSAlerts(params);
      if (res?.data?.success) {
        const data = res.data.result || res.data.data || {};
        setAlerts(data.alerts || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch SOS alerts:", err);
      toast.error("Failed to load SOS alerts");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (id) => {
    setActionLoadingId(id);
    try {
      await adminApi.acknowledgeSOSAlert(id);
      toast.success("Alert acknowledged");
      fetchAlerts();
    } catch (err) {
      toast.error("Failed to acknowledge");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (id) => {
    setActionLoadingId(id);
    try {
      await adminApi.resolveSOSAlert(id, { notes: resolveNotes[id] || "" });
      toast.success("Alert resolved");
      setResolveNotes((prev) => ({ ...prev, [id]: "" }));
      fetchAlerts();
    } catch (err) {
      toast.error("Failed to resolve");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMapLink = (alert) => {
    const coords = alert.location?.coordinates;
    if (!coords || (coords[0] === 0 && coords[1] === 0)) return null;
    return `https://www.google.com/maps?q=${coords[1]},${coords[0]}`;
  };

  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">SOS Alerts</h1>
            <p className="text-sm text-slate-500">
              Emergency alerts from delivery partners
            </p>
          </div>
        </div>

        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center"
          >
            <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center mr-4 animate-pulse">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-red-900">
                {activeCount} Active Emergency{activeCount > 1 ? " Alerts" : " Alert"}
              </h3>
              <p className="text-sm text-red-700">
                Immediate attention required
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { value: "", label: "All" },
          { value: "active", label: "🔴 Active" },
          { value: "acknowledged", label: "🟡 Acknowledged" },
          { value: "resolved", label: "🟢 Resolved" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              statusFilter === f.value
                ? "bg-slate-900 text-white shadow-lg"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500 self-center">
          {total} total alert{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">No SOS Alerts</h3>
          <p className="text-sm text-slate-400">
            {statusFilter
              ? `No ${statusFilter} alerts found.`
              : "All clear! No emergency alerts have been triggered."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {alerts.map((alert, idx) => {
              const config = statusConfig[alert.status] || statusConfig.active;
              const mapLink = getMapLink(alert);
              const isExpanded = expandedId === (alert._id || alert.id);

              return (
                <motion.div
                  key={alert._id || alert.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-white rounded-2xl border overflow-hidden transition-shadow ${
                    alert.status === "active"
                      ? "border-red-300 shadow-lg shadow-red-100"
                      : "border-slate-200 shadow-sm"
                  }`}
                >
                  {/* Alert Header */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : alert._id || alert.id)
                    }
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center ${
                            alert.status === "active"
                              ? "bg-red-100"
                              : alert.status === "acknowledged"
                              ? "bg-amber-100"
                              : "bg-green-100"
                          }`}
                        >
                          {alert.status === "active" ? (
                            <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
                          ) : alert.status === "acknowledged" ? (
                            <Clock className="h-6 w-6 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">
                            {alert.deliveryName || "Unknown Rider"}
                          </h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Phone size={13} />
                            <a
                              href={`tel:${alert.deliveryPhone}`}
                              className="hover:text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {alert.deliveryPhone}
                            </a>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.color}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${config.dot} ${
                              alert.status === "active" ? "animate-pulse" : ""
                            }`}
                          />
                          {config.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(alert.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">
                          {/* Location */}
                          {mapLink && (
                            <div className="bg-blue-50 rounded-xl p-4">
                              <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                <MapPin size={16} /> Location at SOS Trigger
                              </h4>
                              <a
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors"
                              >
                                Open in Google Maps
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          )}

                          {/* Emergency Contacts */}
                          <div className="bg-amber-50 rounded-xl p-4">
                            <h4 className="font-bold text-amber-900 text-sm mb-3 flex items-center gap-2">
                              <User size={16} /> Emergency Contacts
                            </h4>
                            {alert.emergencyContacts?.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {alert.emergencyContacts.map((c, i) => (
                                  <a
                                    key={i}
                                    href={`tel:${c.phone}`}
                                    className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-amber-50 transition-colors border border-amber-100"
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-800 text-sm">
                                        {c.name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {c.phone}
                                      </p>
                                    </div>
                                    <Phone
                                      size={16}
                                      className="text-amber-600"
                                    />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-amber-700 italic">
                                No emergency contacts were saved
                              </p>
                            )}
                          </div>

                          {/* Timeline */}
                          <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                              <Clock size={16} /> Timeline
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-slate-600">
                                  Triggered:{" "}
                                  <strong>{formatDate(alert.createdAt)}</strong>
                                </span>
                              </div>
                              {alert.acknowledgedAt && (
                                <div className="flex items-center gap-3">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="text-slate-600">
                                    Acknowledged:{" "}
                                    <strong>
                                      {formatDate(alert.acknowledgedAt)}
                                    </strong>
                                  </span>
                                </div>
                              )}
                              {alert.resolvedAt && (
                                <div className="flex items-center gap-3">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="text-slate-600">
                                    Resolved:{" "}
                                    <strong>
                                      {formatDate(alert.resolvedAt)}
                                    </strong>
                                  </span>
                                </div>
                              )}
                              {alert.notes && (
                                <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200">
                                  <p className="text-xs font-bold text-slate-500 mb-1">
                                    Resolution Notes
                                  </p>
                                  <p className="text-sm text-slate-700">
                                    {alert.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          {alert.status !== "resolved" && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              {alert.status === "active" && (
                                <button
                                  onClick={() =>
                                    handleAcknowledge(alert._id || alert.id)
                                  }
                                  disabled={
                                    actionLoadingId === (alert._id || alert.id)
                                  }
                                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                                >
                                  {actionLoadingId ===
                                  (alert._id || alert.id) ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2 size={16} />
                                  )}
                                  Acknowledge
                                </button>
                              )}
                              <div className="flex-1 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Resolution notes..."
                                  value={
                                    resolveNotes[alert._id || alert.id] || ""
                                  }
                                  onChange={(e) =>
                                    setResolveNotes((prev) => ({
                                      ...prev,
                                      [alert._id || alert.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                                <button
                                  onClick={() =>
                                    handleResolve(alert._id || alert.id)
                                  }
                                  disabled={
                                    actionLoadingId === (alert._id || alert.id)
                                  }
                                  className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                                >
                                  {actionLoadingId ===
                                  (alert._id || alert.id) ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <CheckCircle2 size={16} />
                                  )}
                                  Resolve
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default SOSAlerts;
