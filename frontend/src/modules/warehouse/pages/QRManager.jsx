import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "@core/api/axios";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";
import {
  QrCode,
  MapPin,
  RefreshCw,
  Download,
  AlertTriangle,
  Sliders,
  Navigation,
  Building2,
  CheckCircle2
} from "lucide-react";

const libraries = ["places"];
const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

/* ── API ─────────────────────────────────────────────────────────────────── */
const api = {
  getCurrentQR: () => axiosInstance.get("/warehouse/current-qr"),
  generateQR: () => axiosInstance.post("/warehouse/generate-qr"),
  updateCheckinSettings: (data) => axiosInstance.put("/warehouse/checkin-settings", data),
  getProfile: () => axiosInstance.get("/warehouse/profile"),
};

/* ════════════════════════════════════════════════════════════════════════════
   QRManager — Warehouse Panel (Light Theme)
   ════════════════════════════════════════════════════════════════════════════ */
const QRManager = () => {
  const [qrToken, setQrToken] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  // Settings form
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locationName, setLocationName] = useState("");
  
  const [checkinRadius, setCheckinRadius] = useState(100);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    loadProfile();
    loadCurrentQR();
  }, []);

  const loadCurrentQR = async () => {
    try {
      const res = await api.getCurrentQR();
      const d = res.data?.result || res.data?.data;
      if (d?.token) {
        setQrToken(d.token);
        setGeneratedAt(d.generatedAt);
      }
    } catch { /* ignore */ }
  };

  const loadProfile = async () => {
    try {
      const res = await api.getProfile();
      const data = res.data?.result || res.data?.data;
      setProfile(data);
      if (data?.location?.coordinates?.length === 2) {
        const pLng = data.location.coordinates[0];
        const pLat = data.location.coordinates[1];
        setLng(pLng);
        setLat(pLat);
        reverseGeocodeGoogle(pLat, pLng);
      }
      if (data?.checkinRadius) setCheckinRadius(data.checkinRadius);
    } catch { /* ignore */ }
  };

  const reverseGeocodeGoogle = async (latitude, longitude) => {
    if (!window.google?.maps) return;
    try {
      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat: Number(latitude), lng: Number(longitude) } }, (results, status) => {
          if (status === "OK") resolve(results[0]);
          else reject(status);
        });
      });
      setLocationName(result?.formatted_address || "Custom Location");
    } catch {
      setLocationName("Custom Location");
    }
  };

  const onMapClick = (e) => {
    const newLat = e.latLng.lat().toFixed(6);
    const newLng = e.latLng.lng().toFixed(6);
    setLat(newLat);
    setLng(newLng);
    reverseGeocodeGoogle(newLat, newLng);
  };

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const newLat = place.geometry.location.lat().toFixed(6);
        const newLng = place.geometry.location.lng().toFixed(6);
        setLat(newLat);
        setLng(newLng);
        setLocationName(place.formatted_address || "");
        if (mapRef.current) {
          mapRef.current.panTo({ lat: Number(newLat), lng: Number(newLng) });
        }
      }
    }
  };

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await api.generateQR();
      const d = res.data?.result || res.data?.data;
      setQrToken(d?.token);
      setGeneratedAt(d?.generatedAt);
      toast.success("New QR code generated!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate QR");
    } finally {
      setLoading(false);
    }
  };

  const detectGPS = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude.toFixed(6);
        const newLng = pos.coords.longitude.toFixed(6);
        setLat(newLat);
        setLng(newLng);
        reverseGeocodeGoogle(newLat, newLng);
        if (mapRef.current) {
          mapRef.current.panTo({ lat: Number(newLat), lng: Number(newLng) });
        }
        toast.success("GPS location detected!");
        setDetectingGps(false);
      },
      (err) => {
        toast.error("GPS error: " + err.message);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    if (!lat || !lng) return toast.error("GPS coordinates required");
    setSettingsSaving(true);
    try {
      await api.updateCheckinSettings({ lat: Number(lat), lng: Number(lng), checkinRadius: Number(checkinRadius) });
      toast.success("Check-in settings saved!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSettingsSaving(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("warehouse-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    const a = document.createElement("a");
    a.href = url;
    a.download = "warehouse-qr.svg";
    a.click();
  };

  return (
    <div className="p-6 bg-gray-50/50 min-h-screen text-gray-900 font-sans">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <QrCode className="w-6 h-6 text-primary" />
          QR Code Manager
        </h1>
        <p className="text-xs font-semibold text-gray-500 mt-1">Generate and manage your warehouse check-in QR code & GPS boundaries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: QR Code Panel */}
        <div className="lg:col-span-5 bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
              <QrCode className="w-5 h-5 text-primary" />
              Check-in QR Code
            </h2>
            <p className="text-xs text-gray-500 font-medium mb-6">Delivery partners scan this code at your warehouse entrance to enter the queue</p>

            {qrToken ? (
              <div className="text-center">
                <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl inline-block shadow-2xs mb-4">
                  <div id="warehouse-qr-svg" className="bg-white p-4 rounded-xl shadow-xs">
                    <QRCode
                      value={qrToken}
                      size={200}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox="0 0 256 256"
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                  </div>
                </div>

                {generatedAt && (
                  <p className="text-xs font-medium text-gray-400 mb-5">
                    Generated: {new Date(generatedAt).toLocaleString()}
                  </p>
                )}

                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={generateQR}
                    disabled={loading}
                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Generating…" : "Regenerate"}
                  </button>
                  <button
                    onClick={downloadQR}
                    className="px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download SVG
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[11px] font-semibold rounded-xl p-3 flex items-start gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>Regenerating invalidates the old printed QR code immediately.</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
                <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-600">No active QR code generated</p>
                <button
                  onClick={generateQR}
                  disabled={loading}
                  className="mt-4 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Generating…" : "Generate QR Code"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings Panel */}
        <div className="lg:col-span-7 bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-primary" />
            Check-in Settings
          </h2>
          <p className="text-xs text-gray-500 font-medium mb-6">Configure warehouse GPS location and maximum check-in radius</p>

          <form onSubmit={saveSettings} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Warehouse GPS Coordinates</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <button
                type="button"
                onClick={detectGPS}
                disabled={detectingGps}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Navigation className={`w-3.5 h-3.5 text-primary ${detectingGps ? "animate-spin" : ""}`} />
                {detectingGps ? "Detecting GPS…" : "Use My Current GPS Location"}
              </button>
            </div>

            {/* Map Area */}
            <div>
              <div className="relative mb-3">
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(ref) => (autocompleteRef.current = ref)}
                    onPlaceChanged={handlePlaceChanged}
                    options={{
                      componentRestrictions: { country: "IN" },
                      fields: ["geometry", "formatted_address"],
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Search for your warehouse address..."
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-2xs"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    placeholder="Loading search..."
                    disabled
                    className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-400"
                  />
                )}
              </div>

              {locationName && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-semibold text-emerald-900 mb-3 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{locationName}</span>
                </div>
              )}

              <p className="text-[11px] font-semibold text-gray-400 italic mb-2">Click anywhere on the map to pin your exact warehouse location:</p>
              <div className="h-[260px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-2xs">
                {isLoaded ? (
                  <GoogleMap
                    onLoad={(map) => { mapRef.current = map; }}
                    mapContainerStyle={mapContainerStyle}
                    center={lat && lng ? { lat: Number(lat), lng: Number(lng) } : { lat: 22.7196, lng: 75.8577 }}
                    zoom={15}
                    onClick={onMapClick}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                    }}
                  >
                    {lat && lng && (
                      <Marker position={{ lat: Number(lat), lng: Number(lng) }} />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="h-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                    Loading Map...
                  </div>
                )}
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-700">Check-in Radius Limit</label>
                <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">{checkinRadius}m</span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={checkinRadius}
                onChange={(e) => setCheckinRadius(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1">
                <span>10m</span>
                <span>500m</span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-1">Riders must be within {checkinRadius}m radius of warehouse GPS to scan and check in</p>
            </div>

            <button
              type="submit"
              disabled={settingsSaving}
              className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              {settingsSaving ? "Saving Settings…" : "Save Check-in Settings"}
            </button>
          </form>

          {/* Current Saved GPS Summary */}
          {profile?.location?.coordinates?.length === 2 && (
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between text-xs bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
              <div>
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Saved GPS Coordinates</span>
                <span className="font-bold text-gray-800">
                  {profile.location.coordinates[1].toFixed(5)}°N, {profile.location.coordinates[0].toFixed(5)}°E
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-gray-400 uppercase text-[10px] block">Check-in Radius</span>
                <span className="font-bold text-primary">{profile.checkinRadius ?? 100}m</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRManager;
