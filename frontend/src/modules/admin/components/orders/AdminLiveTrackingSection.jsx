/**
 * AdminLiveTrackingSection
 *
 * Observer-only live-tracking panel embedded in the Admin OrderDetail page.
 * Subscribes to the same Firebase RTDB paths and backend route endpoint that
 * the customer OrderDetailPage uses — no GPS posting, no side-effects.
 *
 * Renders:
 *  - OrderProgressTracker  (status stepper)
 *  - LiveTrackingMap       (Google Maps with rider icon + polyline)
 *  - ETA / distance summary card
 *  - Rider info card (name + phone)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Navigation2,
  Truck,
  Phone,
  MessageSquare,
  CheckCircle,
  Clock,
} from "lucide-react";

import LiveTrackingMap from "@/modules/customer/components/order/LiveTrackingMap";
import OrderProgressTracker from "@/modules/customer/components/order/OrderProgressTracker";
import {
  subscribeToOrderLocation,
  subscribeToOrderRoute,
} from "@/core/services/trackingClient";
import { adminApi } from "../../services/api";

const DEFAULT_CITY_SPEED_KMPH = 24;
const ROUTE_REFRESH_THRESHOLD_M = 150;
const ROUTE_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const hasValidLatLng = (loc) =>
  loc &&
  typeof loc.lat === "number" &&
  typeof loc.lng === "number" &&
  Number.isFinite(loc.lat) &&
  Number.isFinite(loc.lng);

const toRadians = (v) => (v * Math.PI) / 180;

const distanceMeters = (from, to) => {
  if (!hasValidLatLng(from) || !hasValidLatLng(to)) return null;
  const r = 6371000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatArrivalTime = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const formatArrivingIn = (minutes) => {
  if (!Number.isFinite(minutes) || minutes < 0) return "Soon";
  const r = Math.max(1, Math.round(minutes));
  return `${r} min`;
};

const formatDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km`;
};

const estimateMinutesFromDistance = (meters) => {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  return (meters * 60) / (DEFAULT_CITY_SPEED_KMPH * 1000);
};

const coordsToLatLng = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

const getTrackingPhase = (order) => {
  if (!order) return "pickup";
  const ws = String(order.workflowStatus || "").toUpperCase();
  const ls = String(order.status || "").toLowerCase();
  const step = Number(order.deliveryRiderStep) || 0;
  const isDelivery =
    ws === "OUT_FOR_DELIVERY" ||
    ws === "DELIVERED" ||
    ls === "out_for_delivery" ||
    ls === "delivered" ||
    step >= 3 ||
    Boolean(order.pickupConfirmedAt);
  return isDelivery ? "delivery" : "pickup";
};

const AdminLiveTrackingSection = ({ orderId, order }) => {
  const [liveLocation, setLiveLocation] = useState(null);
  const [routePolyline, setRoutePolyline] = useState(null);
  const [clockTick, setClockTick] = useState(Date.now());

  const routeOriginRef = useRef(null);
  const routeRequestRef = useRef({ phase: "", startedAt: 0 });

  const status = String(order?.status || "").toLowerCase();
  const workflowStatus = String(order?.workflowStatus || "").toUpperCase();
  const routePhase = getTrackingPhase(order);
  const sellerLocation = coordsToLatLng(order?.seller?.location?.coordinates);
  const destinationLocation = order?.address?.location ?? null;

  const activeRoutePolyline = useMemo(() => {
    if (!routePolyline?.polyline) return null;
    if (routePolyline.phase && routePolyline.phase !== routePhase) return null;
    return routePolyline;
  }, [routePolyline, routePhase]);

  useEffect(() => {
    if (!orderId) return undefined;
    const unsubLoc = subscribeToOrderLocation(orderId, (loc) => {
      if (hasValidLatLng(loc)) setLiveLocation({ lat: loc.lat, lng: loc.lng });
    });
    const unsubRoute = subscribeToOrderRoute(orderId, (routeData) => {
      if (routeData?.polyline) setRoutePolyline(routeData);
    });
    return () => {
      unsubLoc();
      unsubRoute();
    };
  }, [orderId]);

  useEffect(() => {
    const iv = setInterval(() => setClockTick(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!orderId || status === "delivered" || status === "cancelled") return undefined;

    // If rider location isn't available yet, fallback to seller location so we can at least show the polyline
    const currentOrigin = hasValidLatLng(liveLocation)
      ? { lat: liveLocation.lat, lng: liveLocation.lng }
      : sellerLocation;

    if (!currentOrigin || !hasValidLatLng(currentOrigin)) return undefined;

    const originDrift =
      routeOriginRef.current && hasValidLatLng(routeOriginRef.current)
        ? distanceMeters(routeOriginRef.current, currentOrigin)
        : null;

    const routeIsFresh =
      activeRoutePolyline?.polyline &&
      originDrift !== null &&
      originDrift < ROUTE_REFRESH_THRESHOLD_M &&
      routePhase === activeRoutePolyline?.phase;

    if (routeIsFresh) return undefined;

    const now = Date.now();
    if (
      routeRequestRef.current.phase === routePhase &&
      now - routeRequestRef.current.startedAt < ROUTE_REFRESH_INTERVAL_MS &&
      (originDrift === null || originDrift < ROUTE_REFRESH_THRESHOLD_M)
    ) {
      return undefined;
    }

    routeRequestRef.current = { phase: routePhase, startedAt: now };
    let ignore = false;

    adminApi
      .getOrderRoute(orderId, {
        phase: routePhase,
        originLat: currentOrigin.lat,
        originLng: currentOrigin.lng,
        _t: now,
      })
      .then((response) => {
        if (ignore) return;
        const nextRoute = response.data?.result;
        if (nextRoute?.polyline) {
          setRoutePolyline(nextRoute);
          routeOriginRef.current = currentOrigin;
        }
      })
      .catch(() => {});

    return () => { ignore = true; };
  }, [activeRoutePolyline?.polyline, liveLocation, orderId, routePhase, status]);

  const estimatedArrival = useMemo(() => {
    if (!order) return { arrivalTimeText: "--", arrivingInText: "--", totalDistanceText: "—" };

    if (status === "delivered") {
      return { arrivalTimeText: "Arrived", arrivingInText: "Delivered", totalDistanceText: "—" };
    }

    const targetLocation = routePhase === "delivery" ? destinationLocation : sellerLocation;

    let minutes = null;
    const routeDurationSeconds = Number(activeRoutePolyline?.duration);
    if (Number.isFinite(routeDurationSeconds) && routeDurationSeconds > 0) {
      minutes = routeDurationSeconds / 60;
    } else {
      const routeDistanceMeters = Number(activeRoutePolyline?.distanceMeters);
      minutes =
        estimateMinutesFromDistance(routeDistanceMeters) ??
        estimateMinutesFromDistance(distanceMeters(liveLocation, targetLocation));
    }

    if (!Number.isFinite(minutes) || minutes <= 0) {
      minutes = status === "confirmed" ? 12 : 8;
    }

    const arrivalMs = clockTick + minutes * 60 * 1000;
    const routeDistanceMeters = Number(activeRoutePolyline?.distanceMeters ?? activeRoutePolyline?.distance);

    return {
      arrivalTimeText: formatArrivalTime(arrivalMs),
      arrivingInText: formatArrivingIn(minutes),
      totalDistanceText: formatDistance(routeDistanceMeters || distanceMeters(liveLocation, targetLocation)),
    };
  }, [activeRoutePolyline?.distanceMeters, activeRoutePolyline?.duration, liveLocation, order, routePhase, sellerLocation, status, clockTick, destinationLocation]);

  if (status === "cancelled") return null;

  const mapStatus = useMemo(() => {
    if (!order) return status;
    const ws = String(order?.workflowStatus || "").toUpperCase();
    const riderActive =
      Boolean(order?.deliveryBoy) ||
      ws === "DELIVERY_ASSIGNED" ||
      ws === "PICKUP_READY" ||
      ws === "OUT_FOR_DELIVERY" ||
      ws === "DELIVERED" ||
      (Number(order?.deliveryRiderStep) || 0) >= 1;
    
    // If a rider is assigned, but the legacy status is 'confirmed', 
    // we want the map to show the rider, not the 'searching' animation.
    if (riderActive && status === "confirmed") return "out_for_delivery";
    
    // Fallback to existing logic for search states
    return ws === "DELIVERY_SEARCH" || status === "confirmed"
      ? "confirmed"
      : ws === "SELLER_ACCEPTED" || status === "seller_pending"
      ? "seller_pending"
      : status;
  }, [order, status]);

  const hasRider = Boolean(order?.deliveryBoy);
  const isDelivered = status === "delivered";

  const handleOpenInMaps = () => {
    const dest = destinationLocation;
    const rider = liveLocation;
    if (rider && hasValidLatLng(rider) && dest && hasValidLatLng(dest)) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${rider.lat},${rider.lng}&destination=${dest.lat},${dest.lng}`,
        "_blank"
      );
      return;
    }
    if (dest && hasValidLatLng(dest)) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`, "_blank");
      return;
    }
    window.open("https://maps.google.com", "_blank");
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl bg-brand-50 flex items-center justify-center">
          <Truck className="h-4 w-4 text-brand-600" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Live Delivery Tracking
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Admin observer view · Real-time
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 rounded-full border border-brand-100">
          <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[10px] font-black text-brand-700 uppercase tracking-widest">
            {isDelivered ? "Delivered" : liveLocation ? "Live" : "Waiting"}
          </span>
        </div>
      </div>

      <OrderProgressTracker
        order={order}
        estimatedArrivalText={estimatedArrival.arrivalTimeText}
        arrivingInText={estimatedArrival.arrivingInText}
        totalDistanceText={estimatedArrival.totalDistanceText}
      />

      {!isDelivered && (
        <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200/50 bg-white">
          <LiveTrackingMap
            status={mapStatus}
            eta={estimatedArrival.arrivingInText}
            riderName={order?.deliveryBoy?.name}
            riderPhone={order?.deliveryBoy?.phone}
            riderLocation={liveLocation}
            sellerLocation={sellerLocation}
            destinationLocation={hasValidLatLng(destinationLocation) ? destinationLocation : null}
            routePhase={routePhase}
            routePolyline={activeRoutePolyline}
            onOpenInMaps={handleOpenInMaps}
          />
        </div>
      )}

      {isDelivered && (
        <div className="bg-brand-50 border border-brand-100 rounded-3xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-200">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-brand-700 uppercase tracking-widest mb-0.5">
              Order Delivered
            </p>
            <p className="text-sm font-bold text-brand-900">
              Successfully delivered to {order?.address?.name || "customer"}
            </p>
            {order?.deliveredAt && (
              <p className="text-[10px] font-bold text-brand-600 mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(order.deliveredAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}

      {!isDelivered && hasRider && liveLocation && (
        <div className="bg-[#FFF8E8] rounded-3xl p-4 shadow-sm border border-[#F4D98B] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 bg-[#F6E7BF] rounded-xl flex items-center justify-center text-[#C87400]">
              <Navigation2 size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#C85D00] uppercase tracking-wider">
                Estimated Arrival
              </p>
              <p className="text-xl font-black text-[#8B3F00] leading-none">
                {estimatedArrival.arrivalTimeText}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div>
              <p className="text-[11px] font-bold text-[#C85D00] uppercase tracking-wider">
                Arriving in
              </p>
              <p className="text-xl font-black text-[#8B3F00] leading-none">
                {estimatedArrival.arrivingInText}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#C87400] ring-1 ring-[#F4D98B]">
              Distance: {estimatedArrival.totalDistanceText}
            </div>
          </div>
        </div>
      )}

      {hasRider && !isDelivered && (
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl p-5 shadow-lg text-white">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 shadow-lg flex items-center justify-center">
                <span className="text-2xl font-black text-white">
                  {(order.deliveryBoy?.name || "D")[0].toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white text-brand-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                Rider
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Delivery Partner
              </p>
              <h3 className="font-bold text-white text-lg">
                {order.deliveryBoy?.name || "Delivery Partner"}
              </h3>
              <p className="text-xs text-white/90 mt-0.5 flex items-center gap-1">
                <span className={"h-2 w-2 rounded-full " + (liveLocation ? "bg-green-300 animate-pulse" : "bg-white/40")} />
                {liveLocation ? "Location live" : "Waiting for location…"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={"sms:" + (order.deliveryBoy?.phone || "")}
                className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30"
              >
                <MessageSquare size={20} className="text-white" />
              </a>
              <a
                href={"tel:" + (order.deliveryBoy?.phone || "")}
                className="h-11 w-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors border border-white/30"
              >
                <Phone size={20} className="text-white" />
              </a>
            </div>
          </div>
          {order.deliveryBoy?.phone && (
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-white/60" />
              <span className="text-xs font-bold text-white/80">
                {order.deliveryBoy.phone}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminLiveTrackingSection;
