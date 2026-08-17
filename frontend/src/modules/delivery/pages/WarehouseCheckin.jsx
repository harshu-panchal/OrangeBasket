import React, { useState, useEffect, useRef } from "react";
import { Building2, QrCode, MapPin, CheckCircle2, AlertTriangle } from "lucide-react";
import axiosInstance from "@core/api/axios";

/* ── API helpers ──────────────────────────────────────────────────────────── */
const api = {
  checkin: (data) => axiosInstance.post("/delivery/warehouse/checkin", data),
  checkout: () => axiosInstance.post("/delivery/warehouse/checkout"),
  getStatus: () => axiosInstance.get("/delivery/warehouse/checkin-status"),
  getHistory: () => axiosInstance.get("/delivery/warehouse/checkin-history"),
};

/* ── QR Scanner shim (uses MediaDevices API + jsQR CDN via dynamic import) ── */
async function decodeQRFromVideo(videoRef, canvasRef, signal) {
  const jsQR = (await import("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js")).default || window.jsQR;
  return new Promise((resolve, reject) => {
    const scan = () => {
      if (signal?.aborted) return reject(new Error("Aborted"));
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState !== video.READY_STATE_HAVE_ENOUGH_DATA && video.readyState < 3) {
        return requestAnimationFrame(scan);
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code) return resolve(code.data);
      requestAnimationFrame(scan);
    };
    scan();
  });
}

/* ── Haversine helper (client-side distance display) ─────────────────────── */
function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ════════════════════════════════════════════════════════════════════════════
   WarehouseCheckin Page
   ════════════════════════════════════════════════════════════════════════════ */
const WarehouseCheckin = () => {
  const [step, setStep] = useState("status"); // status | scan | location | success | error
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [gps, setGps] = useState(null);
  const [qrToken, setQrToken] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const abortRef = useRef(null);

  /* ── Load current check-in status on mount ── */
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getStatus();
      const d = res.data?.result || res.data?.data;
      setCheckinStatus(d);
      setStep(d?.isCheckedIn ? "success" : "status");

      try {
        const histRes = await api.getHistory();
        setHistory(histRes.data?.result || histRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load history", err);
      }
    } catch {
      setStep("status");
    } finally {
      setLoading(false);
    }
  };

  /* ── GPS ── */
  const requestGPS = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("GPS not supported"));
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        (e) => reject(new Error(e.message)),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });

  /* ── Start QR scan flow ── */
  const startScan = async () => {
    setError(null);
    setGpsError(null);
    setScanning(true);
    setQrToken(null);
    setStep("scan");

    try {
      // Start camera
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Decode QR
      abortRef.current = new AbortController();
      const token = await decodeQRFromVideo(videoRef, canvasRef, abortRef.current.signal);

      // Stop camera
      stopCamera(mediaStream);

      setQrToken(token);
      setStep("location"); // Move to location step
    } catch (err) {
      stopCamera(stream);
      setError(err.message || "Failed to scan QR");
      setStep("error");
    } finally {
      setScanning(false);
    }
  };

  const verifyLocationAndSubmit = async () => {
    setError(null);
    setStep("location");
    setLoading(true);
    try {
      // Request GPS
      const gpsPos = await requestGPS();
      setGps(gpsPos);

      // Call backend
      const res = await api.checkin({ qrToken: qrToken, lat: gpsPos.lat, lng: gpsPos.lng });
      setResult(res.data?.result || res.data?.data);
      await loadStatus();
      setStep("success");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Check-in failed");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = (s) => {
    const target = s || stream;
    if (target) target.getTracks().forEach((t) => t.stop());
    setStream(null);
    abortRef.current?.abort();
  };

  /* ── Check-out ── */
  const handleCheckout = async () => {
    if (!window.confirm("Check out from warehouse?")) return;
    try {
      await api.checkout();
      setCheckinStatus(null);
      setStep("status");
    } catch (err) {
      alert(err?.response?.data?.message || "Checkout failed");
    }
  };

  useEffect(() => () => stopCamera(stream), []);

  /* ═══════════════════ RENDER ═══════════════════ */
  if (loading) return <LoadingScreen />;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerIcon}>
          <Building2 size={48} color="#2563eb" />
        </div>
        <h1 style={S.title}>Warehouse Check-in</h1>
        <p style={S.sub}>Scan the warehouse QR code to join the delivery queue</p>
      </div>

      {/* STEP: Already checked in */}
      {step === "success" && checkinStatus?.isCheckedIn && (
        <CheckedInCard status={checkinStatus} onCheckout={handleCheckout} />
      )}

      {/* STEP: Not checked in */}
      {step === "status" && !checkinStatus?.isCheckedIn && (
        <div style={S.card}>
          <div style={S.qrIcon}>
            <QrCode size={40} color="#64748b" style={{display: 'inline', marginRight: 8}} />
            <span style={{fontSize: 24, verticalAlign: 'middle', color: '#cbd5e1'}}>+</span>
            <MapPin size={40} color="#64748b" style={{display: 'inline', marginLeft: 8}} />
          </div>
          <h2 style={S.cardTitle}>Attendance Not Marked</h2>
          <p style={S.cardSub}>You must verify your live location AND scan the warehouse QR code to mark your attendance.</p>

          <button style={S.btnPrimary} onClick={startScan}>
            Start Attendance Check-in
          </button>

          <GPSNote />
        </div>
      )}

      {/* STEP: Not checked in - History */}
      {step === "status" && !checkinStatus?.isCheckedIn && history && history.length > 0 && (
        <div style={{...S.card, marginTop: 24, padding: "20px 16px"}}>
          <h3 style={{...S.cardTitle, fontSize: 16, textAlign: "left", marginBottom: 12}}>Recent Attendance</h3>
          <div style={{display: "flex", flexDirection: "column", gap: 10}}>
            {history.slice(0, 5).map((h, i) => {
              const d = new Date(h.checkinTime);
              return (
                <div key={i} style={{background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <div>
                    <div style={{fontWeight: 600, color: "#334155", fontSize: 13, textAlign: "left"}}>{d.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</div>
                    <div style={{color: "#64748b", fontSize: 12, marginTop: 2, textAlign: "left"}}>{h.warehouseId?.name || "Warehouse"}</div>
                  </div>
                  <div style={{background: "#e0f2fe", color: "#0284c7", padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700}}>
                    {d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP: Scanning */}
      {step === "scan" && (
        <div style={S.card}>
          <div style={S.stepPill}>Step 1 of 2</div>
          <h2 style={S.cardTitle}>Scan Warehouse QR Code</h2>
          <p style={S.cardSub}>Point your camera at the warehouse check-in QR code.</p>
          <div style={S.videoWrap}>
            <video ref={videoRef} style={S.video} playsInline muted />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <div style={S.scanOverlay}>
              <div style={S.scanCorner} />
            </div>
          </div>
          <button style={S.btnSecondary} onClick={() => { stopCamera(); setStep("status"); }}>
            Cancel
          </button>
        </div>
      )}

      {/* STEP: Verify Location */}
      {step === "location" && (
        <div style={S.card}>
          <div style={S.stepPill}>Step 2 of 2</div>
          <div style={S.qrIcon}>
             <MapPin size={48} color="#2563eb" />
          </div>
          <h2 style={S.cardTitle}>Verify Live Location</h2>
          <p style={S.cardSub}>QR code scanned! Now we need to verify your location to make sure you are at the warehouse.</p>

          <button style={S.btnPrimary} onClick={verifyLocationAndSubmit}>
            Verify Location & Check-in
          </button>
          <button style={S.btnSecondary} onClick={() => setStep("status")}>
            Cancel
          </button>
        </div>
      )}

      {/* STEP: Error */}
      {step === "error" && (
        <div style={S.card}>
          <div style={{ marginBottom: 16 }}>
            <AlertTriangle size={56} color="#ef4444" />
          </div>
          <h2 style={{ ...S.cardTitle, color: "#ef4444" }}>Check-in Failed</h2>
          <p style={S.cardSub}>{error}</p>
          <button style={S.btnPrimary} onClick={startScan}>Try Again</button>
          <button style={S.btnSecondary} onClick={() => setStep("status")}>Go Back</button>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

const CheckedInCard = ({ status, onCheckout }) => (
  <div style={{ ...S.card, borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
    <div style={{ marginBottom: 16 }}>
       <CheckCircle2 size={56} color="#22c55e" />
    </div>
    <h2 style={{ ...S.cardTitle, color: "#22c55e" }}>Attendance Marked!</h2>
    <p style={S.cardSub}>You are checked in at {status.warehouseName}</p>

    <div style={S.infoGrid}>
      <InfoRow label="Queue Position" value={`#${status.queuePosition ?? "—"}`} accent />
      <InfoRow label="Check-in Time" value={new Date(status.checkinTime).toLocaleTimeString()} />
      {status.currentOrderId && <InfoRow label="Current Order" value="On Delivery 🚀" accent />}
    </div>

    <button style={S.btnDanger} onClick={onCheckout}>Check Out</button>
  </div>
);

const InfoRow = ({ label, value, accent }) => (
  <div style={S.infoRow}>
    <span style={S.infoLabel}>{label}</span>
    <span style={{ ...S.infoVal, ...(accent ? { color: "#22c55e", fontWeight: 700 } : {}) }}>{value}</span>
  </div>
);

const GPSNote = () => (
  <p style={S.note}>📍 Your GPS location will be verified to ensure you're at the warehouse.</p>
);

const LoadingScreen = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
    <div style={{ textAlign: "center" }}>
      <div style={S.spinner} />
      <p style={{ color: "#64748b", marginTop: 12 }}>Loading...</p>
    </div>
  </div>
);

/* ── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  page: { minHeight: "100vh", background: "#f8fafc", padding: "24px 16px", fontFamily: "system-ui,sans-serif", color: "#0f172a" },
  header: { textAlign: "center", marginBottom: 24 },
  headerIcon: { display: "flex", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 800, margin: 0, color: "#1e293b" },
  sub: { color: "#64748b", fontSize: 13, margin: "6px 0 0" },
  card: { background: "#ffffff", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)", borderRadius: 20, padding: "28px 20px", textAlign: "center", maxWidth: 400, margin: "0 auto" },
  qrIcon: { display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  cardTitle: { fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#1e293b" },
  cardSub: { color: "#64748b", fontSize: 14, margin: "0 0 20px", lineHeight: 1.6 },
  btnPrimary: { display: "block", width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 },
  btnSecondary: { display: "block", width: "100%", padding: "12px", borderRadius: 14, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "#475569", fontSize: 14, cursor: "pointer", marginTop: 8 },
  btnDanger: { display: "block", width: "100%", padding: "13px", borderRadius: 14, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 16 },
  videoWrap: { position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", marginBottom: 12 },
  video: { width: "100%", display: "block", maxHeight: 260, objectFit: "cover" },
  scanOverlay: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  scanCorner: { width: 160, height: 160, border: "3px solid #3b82f6", borderRadius: 16, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" },
  gpsTag: { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 99, padding: "6px 14px", fontSize: 12, color: "#3b82f6", marginBottom: 12, display: "inline-block" },
  infoGrid: { background: "rgba(0,0,0,0.02)", borderRadius: 14, padding: "12px 16px", marginBottom: 4, textAlign: "left" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" },
  infoLabel: { color: "#64748b", fontSize: 13 },
  infoVal: { color: "#334155", fontSize: 13, fontWeight: 500 },
  note: { color: "#64748b", fontSize: 12, marginTop: 12 },
  stepPill: { background: "rgba(59,130,246,0.1)", color: "#3b82f6", display: "inline-block", padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, marginBottom: 12 },
  spinner: { width: 32, height: 32, border: "3px solid rgba(0,0,0,0.1)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
};

export default WarehouseCheckin;
