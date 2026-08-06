import React, { useState, useEffect, useRef } from "react";
import axiosInstance from "@core/api/axios";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from "@react-google-maps/api";

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
   QRManager — Warehouse panel page
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  
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
    } catch (error) {
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
      { enableHighAccuracy: true, timeout: 10000 },
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
    <div style={S.page}>
      {/* Page header */}
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>QR Code Manager</h1>
        <p style={S.pageSub}>Generate and manage your warehouse check-in QR code</p>
      </div>

      <div style={S.grid}>
        {/* Left: QR Code Panel */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>📱 Check-in QR Code</h2>
          <p style={S.cardSub}>Riders scan this code to check in at your warehouse</p>

          {qrToken ? (
            <div style={S.qrWrap}>
              <div id="warehouse-qr-svg" style={S.qrInner}>
                <QRCode
                  value={qrToken}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 256 256"
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              </div>
              {generatedAt && (
                <p style={S.genAt}>Generated: {new Date(generatedAt).toLocaleString()}</p>
              )}
              <div style={S.btnRow}>
                <button style={{ ...S.btn, ...S.btnPrimary }} onClick={generateQR} disabled={loading}>
                  {loading ? "Generating…" : "🔄 Regenerate"}
                </button>
                <button style={{ ...S.btn, ...S.btnSecondary }} onClick={downloadQR}>
                  ⬇ Download
                </button>
              </div>
              <p style={S.warning}>⚠️ Regenerating invalidates the old QR code immediately.</p>
            </div>
          ) : (
            <div style={S.emptyQr}>
              <div style={S.emptyIcon}>📷</div>
              <p style={S.emptyText}>No QR code generated yet</p>
              <button style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginTop: 16 }} onClick={generateQR} disabled={loading}>
                {loading ? "Generating…" : "Generate QR Code"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Settings Panel */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>⚙️ Check-in Settings</h2>
          <p style={S.cardSub}>Configure warehouse GPS location and check-in radius</p>

          <form onSubmit={saveSettings}>
            <div style={S.fieldGroup}>
              <label style={S.label}>Warehouse GPS Location</label>
              <div style={S.coordRow}>
                <input
                  style={S.input}
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <input
                  style={S.input}
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
              <button
                type="button"
                style={{ ...S.btn, ...S.btnSecondary, marginTop: 8, width: "100%" }}
                onClick={detectGPS}
                disabled={detectingGps}
              >
                {detectingGps ? "Detecting…" : "📍 Use My Location (GPS)"}
              </button>

              <div style={S.mapWrap}>
                <div style={S.searchWrap}>
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
                        style={S.searchInput}
                        type="text"
                        placeholder="Search for your warehouse area..."
                      />
                    </Autocomplete>
                  ) : (
                    <input
                      style={S.searchInput}
                      type="text"
                      placeholder="Loading search..."
                      disabled
                    />
                  )}
                </div>

                {locationName && (
                  <div style={S.locationNameBox}>
                    <strong>Selected:</strong> {locationName}
                  </div>
                )}

                <p style={S.mapHint}>Or click on the map to pin your warehouse location</p>
                <div style={{ height: "300px", width: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
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
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
                      Loading Map...
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={S.fieldGroup}>
              <label style={S.label}>
                Check-in Radius: <strong style={{ color: "#60a5fa" }}>{checkinRadius}m</strong>
              </label>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={checkinRadius}
                onChange={(e) => setCheckinRadius(Number(e.target.value))}
                style={S.slider}
              />
              <div style={S.sliderLabels}>
                <span>10m</span>
                <span>500m</span>
              </div>
              <p style={S.hint}>Riders must be within {checkinRadius}m to check in</p>
            </div>

            <button type="submit" style={{ ...S.btn, ...S.btnPrimary, width: "100%" }} disabled={settingsSaving}>
              {settingsSaving ? "Saving…" : "Save Settings"}
            </button>
          </form>

          {/* Current settings display */}
          {profile?.location?.coordinates?.length === 2 && (
            <div style={S.currentSettings}>
              <p style={S.currentTitle}>Current GPS</p>
              <p style={S.currentVal}>
                {profile.location.coordinates[1].toFixed(5)}°N, {profile.location.coordinates[0].toFixed(5)}°E
              </p>
              <p style={S.currentTitle}>Radius</p>
              <p style={S.currentVal}>{profile.checkinRadius ?? 100}m</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  page: { padding: "24px", fontFamily: "system-ui,sans-serif", color: "#f1f5f9", minHeight: "100vh" },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 800, margin: 0, color: "#f1f5f9" },
  pageSub: { color: "#64748b", fontSize: 13, marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 },
  card: { background: "linear-gradient(145deg,#0f172a,#1e293b)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 24 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#f1f5f9" },
  cardSub: { color: "#64748b", fontSize: 13, margin: "0 0 20px" },
  qrWrap: { textAlign: "center" },
  qrInner: { background: "#fff", borderRadius: 16, padding: 20, display: "inline-block", marginBottom: 12 },
  genAt: { color: "#64748b", fontSize: 12, marginBottom: 12 },
  btnRow: { display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 },
  btn: { padding: "11px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none" },
  btnPrimary: { background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff" },
  btnSecondary: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" },
  warning: { color: "#f59e0b", fontSize: 11, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "6px 10px" },
  emptyQr: { textAlign: "center", padding: "32px 0" },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#64748b", fontSize: 14 },
  fieldGroup: { marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 },
  coordRow: { display: "flex", gap: 8 },
  input: { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" },
  slider: { width: "100%", accentColor: "#3b82f6", cursor: "pointer" },
  sliderLabels: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 4 },
  hint: { color: "#475569", fontSize: 12, margin: "6px 0 16px" },
  mapWrap: { marginTop: 16, marginBottom: 8, position: "relative" },
  searchWrap: { position: "relative", marginBottom: 12 },
  searchInput: { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "#f1f5f9", fontSize: 13, outline: "none" },
  locationNameBox: { background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px", color: "#f1f5f9", fontSize: 12, marginBottom: 12, lineHeight: 1.4 },
  mapHint: { color: "#94a3b8", fontSize: 12, marginBottom: 8, fontStyle: "italic" },
  currentSettings: { marginTop: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "12px 14px" },
  currentTitle: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", margin: "6px 0 2px" },
  currentVal: { color: "#f1f5f9", fontSize: 13, fontWeight: 500, margin: 0 },
};

export default QRManager;
