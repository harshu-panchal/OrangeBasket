import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { GoogleMap, useJsApiLoader, Marker, OverlayViewF, OverlayView } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import customerPin from "@/assets/customer-pin.png";
import { deliveryApi } from "../services/deliveryApi";
import deliveryIcon from "@/assets/deliveryIcon.png";
import storePin from "@/assets/store-pin.png";
import {
  getCachedDeliveryPartnerLocation,
  saveDeliveryPartnerLocation,
} from "../utils/deliveryLastLocation";
import {
  decodePolyline,
  routeProgress,
  remainingDurationSeconds,
} from "@/core/utils/routeProgress";

const libraries = ["geometry"];
// Re-fetch the road route when the rider leaves it by this much (wrong turn / new road).
const OFF_ROUTE_THRESHOLD_M = 60;
// Minimum gap between off-route re-fetches, to keep Directions API usage sane.
const OFF_ROUTE_REFETCH_MIN_GAP_MS = 20 * 1000;
// Periodic refresh so traffic-based duration stays current.
const ROUTE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const RECENTER_INTERVAL_MS = 15000;
const LOCATION_POST_INTERVAL_MS = 5000;

// Container style will be 100% to fill parent
const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "200px",
};

/** GeoJSON [lng, lat] → { lat, lng } */
function coordsToLatLng(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}


function destinationForPhase(order, phase) {
  const isReturn = order?.returnStatus && order.returnStatus !== "none";
  const pickupCoords = order?.seller?.location?.coordinates || order?.warehouseId?.location?.coordinates;
  if (phase === "pickup") {
    if (isReturn) {
      const loc = order?.address?.location;
      if (
        loc &&
        typeof loc.lat === "number" &&
        typeof loc.lng === "number" &&
        Number.isFinite(loc.lat) &&
        Number.isFinite(loc.lng)
      ) {
        return { lat: loc.lat, lng: loc.lng };
      }
      return null;
    }
    return coordsToLatLng(pickupCoords);
  }
  if (isReturn) {
    return coordsToLatLng(pickupCoords);
  }
  const loc = order?.address?.location;
  if (
    loc &&
    typeof loc.lat === "number" &&
    typeof loc.lng === "number" &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng)
  ) {
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

/**
 * Live tracking map: rider + one road route from GET /orders/workflow/:orderId/route.
 * Uses a single native google.maps.Polyline (ref) so the React wrapper cannot leave
 * duplicate overlays. No geodesic rider→dest line — that caused a second “straight” path.
 */
const DeliveryTrackingMapComponent = ({
  orderId,
  phase,
  order,
  onRouteStatsChange,
}) => {
  const mapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [rider, setRider] = useState(() => {
    const c = getCachedDeliveryPartnerLocation();
    return c ? { lat: c.lat, lng: c.lng } : null;
  });
  // Initialize riderRef from cache so fetchRoute works immediately on mount
  const riderRef = useRef((() => {
    const c = getCachedDeliveryPartnerLocation();
    return c ? { lat: c.lat, lng: c.lng } : null;
  })());
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const lastFetchRef = useRef({ at: 0, phase: null, orderId: null });
  const routeOriginRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastLocationPostRef = useRef(0);
  const locationInFlightRef = useRef(false);
  const locationAbortRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "delivery-tracking-map",
    googleMapsApiKey: apiKey,
    libraries,
  });

  const isSimulatingRef = useRef(false);
  const simulationIntervalRef = useRef(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (isSimulatingRef.current) return; // Ignore real GPS during simulation
        
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const heading = pos.coords.heading;
        const speed = pos.coords.speed;
        
        saveDeliveryPartnerLocation(lat, lng);
        setRider({ lat, lng });
        riderRef.current = { lat, lng };
        
        // Throttle location POSTs to once every 5s and skip if one is already in-flight
        const now = Date.now();
        if (now - lastLocationPostRef.current < LOCATION_POST_INTERVAL_MS) return;
        if (locationInFlightRef.current) return;
        lastLocationPostRef.current = now;
        locationInFlightRef.current = true;

        // Abort any previous stale request
        if (locationAbortRef.current) locationAbortRef.current.abort();
        const controller = new AbortController();
        locationAbortRef.current = controller;

        deliveryApi.postLocation(
          { lat, lng, accuracy, heading, speed, orderId: orderId || null },
          { signal: controller.signal, timeout: 8000 },
        ).catch(() => {}).finally(() => {
          locationInFlightRef.current = false;
          if (locationAbortRef.current === controller) locationAbortRef.current = null;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (locationAbortRef.current) {
        locationAbortRef.current.abort();
        locationAbortRef.current = null;
      }
      locationInFlightRef.current = false;
      if (simulationIntervalRef.current) {
        cancelAnimationFrame(simulationIntervalRef.current);
      }
    };
  }, [orderId]);

  const routeAbortRef = useRef(null);
  const routeInFlightRef = useRef(false);

  // Seller/warehouse location — used as the route origin for the drop leg
  // until the rider's GPS fix arrives, so a seller → customer road route still shows.
  const pickupOrigin = useMemo(
    () =>
      coordsToLatLng(
        order?.seller?.location?.coordinates ||
          order?.warehouseId?.location?.coordinates,
      ),
    [order],
  );
  const pickupOriginRef = useRef(pickupOrigin);
  pickupOriginRef.current = pickupOrigin;

  const fetchRoute = useCallback(async ({ force = false } = {}) => {
    const isReturnOrder = order?.returnStatus && order.returnStatus !== "none";
    const currentRider =
      riderRef.current ||
      (phase !== "pickup" && !isReturnOrder ? pickupOriginRef.current : null);
    if (!orderId || !currentRider) return;
    if (routeInFlightRef.current) return;
    const now = Date.now();
    const sameRouteContext =
      lastFetchRef.current.phase === phase &&
      lastFetchRef.current.orderId === orderId;
    // Route was built from the seller fallback, and real GPS is now available → rebuild.
    const originWasFallback = Boolean(
      routeOriginRef.current && !routeOriginRef.current.fromRider && riderRef.current,
    );

    if (
      !force &&
      !originWasFallback &&
      sameRouteContext &&
      lastFetchRef.current.at &&
      now - lastFetchRef.current.at < ROUTE_REFRESH_INTERVAL_MS
    ) {
      return;
    }

    lastFetchRef.current = { at: now, phase, orderId };
    routeInFlightRef.current = true;

    if (routeAbortRef.current) routeAbortRef.current.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;

    setRouteLoading(true);
    try {
      const res = await deliveryApi.getOrderRoute(orderId, {
        phase,
        originLat: currentRider.lat,
        originLng: currentRider.lng,
        _t: now,
      }, { signal: controller.signal });
      if (res.data?.success) {
        const nextRoute = res.data.result || res.data.data || null;
        setRouteData(nextRoute);
        routeOriginRef.current = {
          lat: currentRider.lat,
          lng: currentRider.lng,
          fromRider: currentRider === riderRef.current,
        };
      }
    } catch {
      setRouteData((prev) => prev || { degraded: true });
    } finally {
      routeInFlightRef.current = false;
      if (routeAbortRef.current === controller) routeAbortRef.current = null;
      setRouteLoading(false);
    }
  // Stable — uses riderRef so GPS ticks don't recreate this callback
  }, [orderId, phase, order?.returnStatus]);

  useEffect(() => {
    setRouteData((prev) => (prev?.phase === phase ? prev : null));
    lastFetchRef.current = { at: 0, phase: null, orderId: null };
    routeOriginRef.current = null;
  }, [orderId, phase]);

  const canRoute = Boolean(rider || (phase !== "pickup" && pickupOrigin));
  useEffect(() => {
    if (!canRoute) return undefined;
    fetchRoute();
    const iv = setInterval(() => fetchRoute({ force: true }), ROUTE_REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(iv);
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
        routeAbortRef.current = null;
      }
      routeInFlightRef.current = false;
    };
  // rider in deps only to trigger initial fetch when location first becomes available
  // fetchRoute is stable (doesn't depend on rider state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRoute, !!rider, fetchRoute, phase, orderId]);

  const isReturn = order?.returnStatus && order.returnStatus !== "none";
  // Use order address location, fall back to the destination resolved by the route API
  const dest = useMemo(() => {
    const fromOrder = destinationForPhase(order, phase);
    if (fromOrder) return fromOrder;
    // routeData may contain the resolved destination (set by backend geocode fallback)
    const rd = routeData?.destination;
    if (rd && typeof rd.lat === "number" && typeof rd.lng === "number") {
      return { lat: rd.lat, lng: rd.lng };
    }
    return null;
  }, [order, phase, routeData]);

  /** Full road route from the Directions API, as plain { lat, lng } points. */
  const linePath = useMemo(
    () => decodePolyline(routeData?.polyline),
    [routeData?.polyline],
  );

  /** Where the rider is on that route — drives trimming, re-routing and live ETA. */
  const progress = useMemo(
    () => (rider && linePath.length >= 2 ? routeProgress(linePath, rider) : null),
    [linePath, rider],
  );

  // Rider took a different road → fetch a fresh route from where they are now.
  useEffect(() => {
    if (!progress || progress.offRouteMeters < OFF_ROUTE_THRESHOLD_M) return;
    if (Date.now() - lastFetchRef.current.at < OFF_ROUTE_REFETCH_MIN_GAP_MS) return;
    fetchRoute({ force: true });
  }, [progress, fetchRoute]);

  useEffect(() => {
    if (typeof onRouteStatsChange !== "function") return undefined;
    const fullDuration = Number(routeData?.duration) || null;
    const fullDistance =
      Number(routeData?.distanceMeters ?? routeData?.distance) || null;
    const liveDuration = remainingDurationSeconds(fullDuration, progress);
    onRouteStatsChange({
      phase,
      rider,
      destination: dest,
      routeDurationSeconds: liveDuration ?? fullDuration,
      routeDistanceMeters: progress ? progress.remainingMeters : fullDistance,
    });
    return undefined;
  }, [onRouteStatsChange, phase, rider, dest, routeData, progress]);

  const riderMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;

    return {
      url: deliveryIcon,
      scaledSize: new window.google.maps.Size(44, 64),
      anchor: new window.google.maps.Point(22, 64),
    };
  }, [isLoaded]);

  const customerMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;

    return {
      url: customerPin,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 40),
    };
  }, [isLoaded]);

  const storeMarkerIcon = useMemo(() => {
    if (!isLoaded || !window.google?.maps) return undefined;

    return {
      url: storePin,
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 40),
    };
  }, [isLoaded]);

  const mapCenter = useMemo(() => {
    if (rider) return rider;
    if (dest) return dest;
    return { lat: 20.5937, lng: 78.9629 };
  }, [rider, dest]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  /** Fit the whole route (rider → destination) on screen. */
  const fitWholeRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;
    linePath.forEach((p) => {
      bounds.extend(p);
      count += 1;
    });
    if (riderRef.current) {
      bounds.extend(riderRef.current);
      count += 1;
    }
    if (dest) {
      bounds.extend(dest);
      count += 1;
    }
    if (count === 0) return;
    if (count === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(16);
      return;
    }
    map.fitBounds(bounds, 48);
  }, [linePath, dest]);

  // One road polyline (native, via ref). Created once per route, then trimmed
  // as the rider moves so it always shows "from here to there".
  useEffect(() => {
    if (!isLoaded || !mapInstance || !window.google?.maps) return undefined;
    if (!linePath.length) return undefined;

    const pl = new window.google.maps.Polyline({
      path: linePath,
      strokeColor: "#2563eb",
      strokeOpacity: 0.95,
      strokeWeight: 6,
      map: mapInstance,
      zIndex: 10,
    });
    routePolylineRef.current = pl;

    return () => {
      pl.setMap(null);
      if (routePolylineRef.current === pl) routePolylineRef.current = null;
    };
  }, [isLoaded, mapInstance, linePath]);

  useEffect(() => {
    if (!routePolylineRef.current) return;
    routePolylineRef.current.setPath(progress?.remainingPath || linePath);
  }, [progress, linePath]);

  // Whenever a new route arrives (or the destination changes), show all of it.
  useEffect(() => {
    if (!isLoaded || !mapInstance) return;
    fitWholeRoute();
  }, [isLoaded, mapInstance, fitWholeRoute]);

  // Follow the rider without resetting the zoom the rider picked.
  useEffect(() => {
    if (!isLoaded || !mapInstance) return undefined;
    const id = setInterval(() => {
      if (riderRef.current) mapRef.current?.panTo(riderRef.current);
    }, RECENTER_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLoaded, mapInstance]);

  // Map container height can change (layout/animation) — refit when it does.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google) return undefined;
    const mapContainer = map.getDiv()?.parentElement;
    if (!mapContainer || !window.ResizeObserver) return undefined;
    const resizeObserver = new ResizeObserver(() => fitWholeRoute());
    resizeObserver.observe(mapContainer);
    return () => resizeObserver.disconnect();
  }, [mapInstance, fitWholeRoute]);


  const [heading, setHeading] = useState(0);

  const startSimulation = useCallback(() => {
    if (isSimulating) {
      setIsSimulating(false);
      isSimulatingRef.current = false;
      cancelAnimationFrame(simulationIntervalRef.current);
      return;
    }

    if (!linePath || linePath.length < 2) return;
    setIsSimulating(true);
    isSimulatingRef.current = true;

    const path = linePath;
    let currentSegment = 0;
    let fraction = 0; 
    const speed = 0.5; // Smooth but reasonably fast movement (approx ~30-40km/h depending on frame rate)
    let lastPostTime = Date.now();

    const animate = () => {
      if (!isSimulatingRef.current) return;
      if (currentSegment >= path.length - 1) {
        setIsSimulating(false);
        isSimulatingRef.current = false;
        return;
      }

      const p1 = new window.google.maps.LatLng(path[currentSegment].lat, path[currentSegment].lng);
      const p2 = new window.google.maps.LatLng(path[currentSegment + 1].lat, path[currentSegment + 1].lng);
      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
      
      if (dist === 0) {
        currentSegment++;
        simulationIntervalRef.current = requestAnimationFrame(animate);
        return;
      }

      // Compute heading to rotate rider marker
      const newHeading = window.google.maps.geometry.spherical.computeHeading(p1, p2);
      setHeading(newHeading);

      fraction += speed / dist;

      if (fraction >= 1) {
        fraction = 0;
        currentSegment++;
        simulationIntervalRef.current = requestAnimationFrame(animate);
        return;
      }

      const interpolated = window.google.maps.geometry.spherical.interpolate(p1, p2, fraction);
      const nextPoint = { lat: interpolated.lat(), lng: interpolated.lng() };

      setRider(nextPoint);
      riderRef.current = nextPoint;

      // Post location to backend every 1.5 seconds during simulation
      const now = Date.now();
      if (now - lastPostTime > 1500) {
        lastPostTime = now;
        deliveryApi.postLocation(
          { lat: nextPoint.lat, lng: nextPoint.lng, accuracy: 5, heading: newHeading, orderId: orderId || null },
          {}
        ).catch(() => {});
      }

      simulationIntervalRef.current = requestAnimationFrame(animate);
    };

    simulationIntervalRef.current = requestAnimationFrame(animate);
  }, [isSimulating, linePath, orderId]);

  if (!apiKey) {
    return (
      <div className="relative w-full h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-center px-4">
        <p className="text-xs text-slate-500">
          Set <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to show live
          tracking.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative w-full h-48 bg-rose-50 rounded-2xl flex items-center justify-center text-xs text-rose-700 px-4">
        Map failed to load. Check the API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative w-full h-48 bg-slate-50 rounded-2xl flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={14}
        onLoad={onMapLoad}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {rider && (
          <OverlayViewF
            position={rider}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(width, height) => ({
              x: -(width / 2),
              y: -height,
            })}
          >
            <div
              style={{
                width: "44px",
                height: "64px",
                transform: `rotate(${heading}deg)`,
                transformOrigin: "bottom center",
                transition: "transform 0.1s linear",
                willChange: "transform",
              }}
            >
              <img
                src={deliveryIcon}
                alt="Rider"
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>
          </OverlayViewF>
        )}
        {dest && (
          <Marker
            position={dest}
            title={
              phase === "pickup"
                ? isReturn
                  ? "Pickup (customer)"
                  : "Pickup (store)"
                : isReturn
                  ? "Drop (seller)"
                  : "Drop (customer)"
            }
            icon={
              phase === "pickup"
                ? isReturn
                  ? customerMarkerIcon
                  : storeMarkerIcon
                : isReturn
                  ? storeMarkerIcon
                  : customerMarkerIcon
            }
          />
        )}
      </GoogleMap>
      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded-md text-[10px] text-slate-600 font-bold border border-slate-200 shadow-sm">
        {routeLoading ? "Updating route…" : "Tracking View"}
      </div>
      
      {import.meta.env.DEV && linePath?.length > 0 && (
        <button
          onClick={startSimulation}
          className={`absolute top-4 right-4 px-4 py-2 rounded-full text-xs font-bold shadow-lg z-50 flex items-center gap-2 transition-all duration-300 ${
            isSimulating ? "bg-rose-500 text-white" : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          {isSimulating ? (
            <>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Stop Simulation
            </>
          ) : (
            "Simulate Ride"
          )}
        </button>
      )}

      {routeData?.degraded && (
        <div className="absolute top-2 left-2 bg-amber-50/95 text-amber-900 text-[10px] px-2 py-1 rounded border border-amber-200 max-w-[85%] leading-snug">
          Route unavailable. Add{" "}
          <span className="font-mono">GOOGLE_MAPS_API_KEY</span> to the{" "}
          <strong>backend</strong> <span className="font-mono">.env</span>, enable
          Directions API + billing, then restart the API server.
        </div>
      )}
    </div>
  );
}


// Memoized export to prevent unnecessary re-renders and reduce Google Maps API costs
const DeliveryTrackingMap = memo(DeliveryTrackingMapComponent, (prevProps, nextProps) => {
  // Only re-render if these props actually change
  const destPrev = destinationForPhase(prevProps.order, prevProps.phase);
  const destNext = destinationForPhase(nextProps.order, nextProps.phase);
  
  return (
    prevProps.orderId === nextProps.orderId &&
    prevProps.phase === nextProps.phase &&
    destPrev?.lat === destNext?.lat &&
    destPrev?.lng === destNext?.lng
  );
});

DeliveryTrackingMap.displayName = 'DeliveryTrackingMap';

export default DeliveryTrackingMap;
