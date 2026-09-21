import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";
import Badge from "@shared/components/ui/Badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  HiOutlineArrowLeft,
  HiOutlineQrCode,
  HiOutlineCamera,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineCube,
  HiOutlineUserGroup,
  HiOutlineTruck,
  HiOutlineMapPin,
  HiOutlineCheck,
} from "react-icons/hi2";
import { warehouseApi } from "../services/warehouseApi";

const OrderProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [riders, setRiders] = useState([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [selectedRiderId, setSelectedRiderId] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const scanInputRef = useRef(null);
  const html5QrRef = useRef(null);

  const loadProgress = useCallback(async () => {
    try {
      const res = await warehouseApi.getScanProgress(orderId);
      if (res.data.success) {
        setProgress(res.data.result);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load order");
      navigate("/warehouse/orders");
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Keep the scan input focused so a USB barcode-scanner (keyboard wedge)
  // always has somewhere to type into.
  useEffect(() => {
    if (!loading && progress && !progress.isComplete && !isCameraOpen && !isRiderModalOpen) {
      scanInputRef.current?.focus();
    }
  }, [loading, progress, isCameraOpen, isRiderModalOpen]);

  const submitScan = async (code) => {
    const trimmed = String(code || "").trim();
    if (!trimmed || scanning) return;
    setScanning(true);
    try {
      const res = await warehouseApi.scanOrderItem(orderId, { code: trimmed });
      if (res.data.success) {
        const { scannedProduct, progress: nextProgress } = res.data.result;
        toast.success(`Scanned: ${scannedProduct.name}`);
        setProgress(nextProgress);
        if (nextProgress.isComplete) {
          toast.success("All items scanned! Select a delivery boy to continue.");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Scan failed");
    } finally {
      setScanning(false);
      setScanInput("");
      scanInputRef.current?.focus();
    }
  };

  const handleScanInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitScan(scanInput);
    }
  };

  // ── Camera scanning (html5-qrcode) ──────────────────────────────────────
  // Camera start is triggered directly by the "Enable Camera" button click
  // (not from a useEffect on modal-open) so the getUserMedia permission
  // prompt is a direct response to a user gesture and any rejection reason
  // (blocked permission, no camera, camera in use) is caught and shown to
  // the user explicitly, instead of failing silently inside a library widget.
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);

  const stopCamera = useCallback(() => {
    const scanner = html5QrRef.current;
    html5QrRef.current = null;
    setCameraStarted(false);
    if (scanner) {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    }
  }, []);

  const startCamera = async () => {
    setCameraStarting(true);
    try {
      // Forces the native browser permission prompt right here, in direct
      // response to this click, and gives us the specific rejection reason.
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      testStream.getTracks().forEach((track) => track.stop());

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("order-processing-camera");
      html5QrRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          submitScan(decodedText);
          setIsCameraOpen(false);
        },
        () => {},
      );
      setCameraStarted(true);
    } catch (err) {
      const reason =
        err?.name === "NotAllowedError"
          ? "Camera permission was blocked. Click the camera icon in your browser's address bar, allow access, then try again."
          : err?.name === "NotFoundError"
            ? "No camera was found on this device."
            : err?.name === "NotReadableError"
              ? "Camera is already in use by another app."
              : !window.isSecureContext
                ? "Camera access requires HTTPS (or localhost)."
                : "Unable to access the camera.";
      toast.error(reason);
      stopCamera();
    } finally {
      setCameraStarting(false);
    }
  };

  // Stop the camera whenever the modal closes or the page unmounts.
  useEffect(() => {
    if (!isCameraOpen) {
      stopCamera();
    }
    return () => {
      if (isCameraOpen) stopCamera();
    };
  }, [isCameraOpen, stopCamera]);

  // ── Delivery boy assignment ──────────────────────────────────────────────
  const openRiderModal = async () => {
    setIsRiderModalOpen(true);
    setLoadingRiders(true);
    try {
      const res = await warehouseApi.getEligibleRiders(orderId);
      if (res.data.success) {
        setRiders(res.data.results || res.data.result || []);
      }
    } catch (error) {
      toast.error("Failed to load delivery boys");
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRiderId) {
      toast.error("Select a delivery boy first");
      return;
    }
    setAssigning(true);
    try {
      const res = await warehouseApi.assignDeliveryBoy(orderId, { riderId: selectedRiderId });
      if (res.data.success) {
        toast.success("Offer sent — waiting for the delivery boy to respond");
        setIsRiderModalOpen(false);
        await loadProgress();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign delivery boy");
    } finally {
      setAssigning(false);
    }
  };

  // Poll while an offer is pending so we notice accept/reject/timeout even
  // without a live socket connection on this page.
  const prevWorkflowStatusRef = useRef(null);
  useEffect(() => {
    if (!progress) return;
    const prev = prevWorkflowStatusRef.current;
    const current = progress.workflowStatus;
    if (prev === "DELIVERY_OFFER_PENDING" && current === "READY_FOR_ASSIGNMENT") {
      toast.info("Delivery boy didn't respond in time or declined. Please select another.");
    }
    if (prev === "DELIVERY_OFFER_PENDING" && current === "DELIVERY_ASSIGNED") {
      toast.success("Delivery boy accepted the order!");
      navigate("/warehouse/orders");
    }
    prevWorkflowStatusRef.current = current;
  }, [progress?.workflowStatus, navigate]);

  useEffect(() => {
    if (progress?.workflowStatus !== "DELIVERY_OFFER_PENDING") return undefined;
    const interval = setInterval(() => {
      loadProgress();
    }, 3000);
    return () => clearInterval(interval);
  }, [progress?.workflowStatus, loadProgress]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-slate-600 font-bold mt-4 uppercase tracking-widest text-xs">
          Loading order...
        </p>
      </div>
    );
  }

  if (!progress) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" className="pl-0" onClick={() => navigate("/warehouse/orders")}>
          <HiOutlineArrowLeft className="mr-2 h-5 w-5" />
          Back to Orders
        </Button>
        <Badge variant={progress.isComplete ? "success" : "info"} className="text-xs px-3 py-1 uppercase font-black">
          #{progress.orderId}
        </Badge>
      </div>

      {/* Progress summary */}
      <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-lg bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <HiOutlineQrCode className="h-4 w-4 text-primary" />
            Scan Progress
          </h2>
          <span className="text-xs font-bold text-slate-600">
            {progress.totalScanned} / {progress.totalOrdered} scanned
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${progress.totalOrdered ? Math.min(100, (progress.totalScanned / progress.totalOrdered) * 100) : 0}%`,
            }}
          />
        </div>
      </Card>

      {/* Scan input (USB scanner + manual entry) */}
      {!progress.isComplete && (
        <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-lg bg-white p-5 space-y-3">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">
            Scan or enter barcode / SKU
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={scanInputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={handleScanInputKeyDown}
              disabled={scanning}
              autoFocus
              placeholder="Scan a product barcode..."
              className="flex-1 px-4 py-3 bg-slate-100 border-none rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button onClick={() => submitScan(scanInput)} disabled={scanning} className="whitespace-nowrap">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCameraOpen(true)}
              className="whitespace-nowrap flex items-center gap-1.5"
            >
              <HiOutlineCamera className="h-4 w-4" />
              Camera
            </Button>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            USB scanners auto-submit on Enter. You can also type the code manually.
          </p>
        </Card>
      )}

      {/* Item list */}
      <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-lg bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-black text-slate-900">Order Items</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {progress.items.map((item) => {
            const isDone = item.scannedQty >= item.orderedQty;
            return (
              <div key={item.itemIndex} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isDone ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineCube className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {item.scannedQty} of {item.orderedQty} scanned
                      {item.remainingQty > 0 ? ` • ${item.remainingQty} remaining` : ""}
                    </p>
                  </div>
                </div>
                <Badge variant={isDone ? "success" : "warning"} className="text-[10px] shrink-0">
                  {isDone ? "Complete" : "Pending"}
                </Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Select delivery boy */}
      {progress.isComplete && progress.workflowStatus !== "DELIVERY_OFFER_PENDING" && (
        <Card className="border-none shadow-xl ring-1 ring-primary/10 rounded-lg bg-primary/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <HiOutlineCheckCircle className="h-4 w-4 text-brand-600" />
              All items scanned & stock deducted
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Choose a delivery boy from the warehouse queue to assign this order.
            </p>
          </div>
          <Button onClick={openRiderModal} className="flex items-center gap-2 whitespace-nowrap">
            <HiOutlineUserGroup className="h-4 w-4" />
            Select Delivery Boy
          </Button>
        </Card>
      )}

      {/* Waiting for the selected rider to accept/reject */}
      {progress.workflowStatus === "DELIVERY_OFFER_PENDING" && (
        <Card className="border-none shadow-xl ring-1 ring-amber-200 rounded-lg bg-amber-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0" />
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Waiting for {progress.pendingDeliveryBoy?.name || "the delivery boy"} to respond...
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                They have a limited time to accept. If they decline or don't respond, you can pick someone else.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Camera modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCameraOpen(false)} />
          <div className="w-full max-w-sm relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-black text-slate-900">Scan with Camera</h3>
              <button onClick={() => setIsCameraOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="p-3 overflow-y-auto">
              <div className="relative w-full min-h-[280px] rounded-xl overflow-hidden bg-slate-900">
                <div id="order-processing-camera" className="w-full h-full" />
                {!cameraStarted && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-white px-6 text-center">
                    <HiOutlineCamera className="h-8 w-8 text-slate-400" />
                    <p className="text-xs text-slate-300 font-medium">
                      Grant camera access to scan barcodes directly from this device.
                    </p>
                    <Button
                      onClick={startCamera}
                      disabled={cameraStarting}
                      className="bg-white text-slate-900 hover:bg-slate-100"
                    >
                      {cameraStarting ? "Requesting..." : "Enable Camera"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery boy picker modal */}
      {isRiderModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsRiderModalOpen(false)} />
          <div className="w-full max-w-lg relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <HiOutlineTruck className="h-4 w-4 text-primary" />
                Select Delivery Boy
              </h3>
              <button
                onClick={() => setIsRiderModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {loadingRiders ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : riders.filter((entry) => entry.isEligible).length === 0 ? (
                <p className="text-xs text-slate-500 font-medium text-center py-10">
                  No available delivery boys right now — everyone checked in is already handling another order.
                </p>
              ) : (
                riders.filter((entry) => entry.isEligible).map((entry) => {
                  const rider = entry.rider || {};
                  const isSelected = selectedRiderId === String(rider._id || rider.id);
                  return (
                    <button
                      key={entry.checkinId}
                      type="button"
                      onClick={() => setSelectedRiderId(String(rider._id || rider.id))}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs shrink-0">
                        {entry.queuePosition}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{rider.name || "Rider"}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 font-semibold mt-0.5">
                          <span className="capitalize">{rider.vehicleType || "bike"}</span>
                          <span>•</span>
                          <span>Position #{entry.queuePosition}</span>
                          <span>•</span>
                          <span className="capitalize">{rider.queueStatus?.replace(/_/g, " ") || "waiting"}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <Badge variant="success" className="text-[9px]">
                          Available
                        </Badge>
                        {isSelected && <HiOutlineCheck className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRiderModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={!selectedRiderId || assigning}>
                {assigning ? "Assigning..." : "Assign Delivery Boy"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderProcessing;
