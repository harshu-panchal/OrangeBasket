import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  ChevronLeft,
  User,
  Bike,
  ChevronDown,
  Mail,
  MapPin,
  FileText,
  Upload,
  X,
  Camera,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import deliveryRiding from "@/assets/lottie/Delivery Riding.json";
import { deliveryApi } from "../services/deliveryApi";
import { useAuth } from "@core/context/AuthContext";
import { useSettings } from "@core/context/SettingsContext";
import { toast } from "sonner";
import Tesseract from "tesseract.js";

// Live Standard Input Validation Helpers
const isValidName = (val) => /^[a-zA-Z\s]{2,50}$/.test((val || "").trim());
const isValidPhone = (val) => /^[6-9]\d{9}$/.test((val || "").trim()) || /^\d{10}$/.test((val || "").trim());
const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((val || "").trim());
const isValidAddress = (val) => (val || "").trim().length >= 10;
const isValidVehicleNumber = (val) => /^[A-Z]{2}\s?[0-9]{2}\s?[A-Z]{1,2}\s?[0-9]{4}$/.test((val || "").trim().toUpperCase()) || (val || "").trim().length >= 8;
const isValidDL = (val) => /^[A-Z]{2}[- ]?[0-9]{13}$/.test((val || "").trim().toUpperCase()) || /^[A-Z0-9]{13,16}$/.test((val || "").replace(/[^A-Z0-9]/gi, ""));
const isValidAadhar = (val) => /^\d{12}$/.test((val || "").trim());
const isValidPan = (val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((val || "").trim().toUpperCase());
const isValidAccountHolder = (val) => /^[a-zA-Z\s]{3,50}$/.test((val || "").trim());
const isValidAccountNumber = (val) => /^\d{9,18}$/.test((val || "").trim());
const isValidIfsc = (val) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test((val || "").trim().toUpperCase());

const VEHICLE_TYPES = [
  { value: "bike", label: "Bike" },
  { value: "scooter", label: "Scooter" },
  { value: "cycle", label: "Cycle" },
];

const DeliveryAuth = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";
  const logoUrl = settings?.logoUrl || "";
  const { login } = useAuth();

  const [touched, setTouched] = useState({
    signupName: false,
    signupPhone: false,
    signupEmail: false,
    signupAddress: false,
    signupVehicleNumber: false,
    signupDLNumber: false,
    signupAadharNumber: false,
    signupPanNumber: false,
    signupAccountHolder: false,
    signupAccountNumber: false,
    signupIfsc: false,
    loginPhone: false,
  });

  const markTouched = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const getDeliveryFieldBorderClass = (fieldName, value, isValid) => {
    if (!touched[fieldName] || !value) {
      return "border-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400";
    }
    return isValid
      ? "border-emerald-500 bg-emerald-50/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
      : "border-rose-400 bg-rose-50/20 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500";
  };

  // mode: "login" | "signup"
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form"); // "form" | "otp"

  // Login state
  const [loginPhone, setLoginPhone] = useState("");

  // Signup state
  const [signupStep, setSignupStep] = useState(1);
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupAddress, setSignupAddress] = useState("");
  const [signupVehicle, setSignupVehicle] = useState("bike");
  const [signupVehicleNumber, setSignupVehicleNumber] = useState("");
  const [signupDLNumber, setSignupDLNumber] = useState("");
  const [signupPanNumber, setSignupPanNumber] = useState("");
  const [signupAadharNumber, setSignupAadharNumber] = useState("");
  const [signupAccountNumber, setSignupAccountNumber] = useState("");
  const [signupIfsc, setSignupIfsc] = useState("");
  const [signupAccountHolder, setSignupAccountHolder] = useState("");
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");

  // Document states
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [dlFile, setDlFile] = useState(null);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  // OCR States
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [dlVerified, setDlVerified] = useState(null);
  const [panVerified, setPanVerified] = useState(null);
  const [aadharVerified, setAadharVerified] = useState(null);

  useEffect(() => {
    let interval;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const performOCR = async (file, type) => {
    setIsScanning(true);
    setOcrProgress(0);

    // Reset specific verification state
    if (type === "dl") setDlVerified(null);
    if (type === "pan") setPanVerified(null);
    if (type === "aadhar") setAadharVerified(null);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const rawText = result.data.text.toLowerCase();
      const cleanText = rawText.replace(/[^a-z0-9]/g, "");

      // Handle common OCR character substitutions for more robust matching
      // e.g., '0' read as 'o', '5' as 's', '1' as 'i' or 'l'
      const normalize = (str) => str.replace(/o/g, "0").replace(/s/g, "5").replace(/[il]/g, "1");
      const normalizedCleanText = normalize(cleanText);

      console.log(`OCR Raw [${type}]:`, rawText);
      console.log(`OCR Cleaned [${type}]:`, cleanText);

      let isMatch = false;
      let targetNumber = "";

      if (type === "dl") {
        targetNumber = signupDLNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        // Match either exact cleaned text or normalized text (handles 0/O, 5/S etc)
        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        const dlKeywords = ["driving", "licence", "license", "india", "union", "government", "transport", "validity", "form", "rj"];
        const hasDlKeywords = dlKeywords.some(k => rawText.includes(k));

        if (isMatch) {
          setDlVerified(true);
          setDlFile(file);
          toast.success("Driving License Verified!");
        } else {
          setDlVerified(false);
          setDlFile(null);
          toast.error("DL Number mismatch. Make sure you typed the exact number from the photo.");
        }
      } else if (type === "pan") {
        targetNumber = signupPanNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        const panKeywords = ["permanent", "account", "income", "tax", "department", "india", "signature", "card", "govt"];
        const hasPanKeywords = panKeywords.some(k => rawText.includes(k));

        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        if (isMatch || (hasPanKeywords && isMatch)) {
          setPanVerified(true);
          setPanFile(file);
          toast.success("PAN Card Verified!");
        } else {
          setPanVerified(false);
          setPanFile(null);
          toast.error("PAN mismatch. Photo must be clear and show the PAN number.");
        }
      } else if (type === "aadhar") {
        targetNumber = signupAadharNumber.toLowerCase().replace(/[^a-z0-9]/g, "");
        const normalizedTarget = normalize(targetNumber);

        const aadharKeywords = ["government", "india", "male", "female", "unique", "identification", "authority", "enrollment", "birth", "dob", "address", "आधार", "भारत"];
        const hasAadharKeywords = aadharKeywords.some(k => rawText.includes(k));

        isMatch = (targetNumber && cleanText.includes(targetNumber)) ||
          (normalizedTarget && normalizedCleanText.includes(normalizedTarget));

        if (isMatch || (hasAadharKeywords && isMatch)) {
          setAadharVerified(true);
          setAadharFile(file);
          toast.success("Aadhar Card Verified!");
        } else {
          setAadharVerified(false);
          setAadharFile(null);
          toast.error("Aadhar mismatch. 12-digit number should be clearly visible.");
        }
      }
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("Failed to scan document. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDLUpload = (file) => {
    if (file) performOCR(file, "dl");
    else { setDlFile(null); setDlVerified(null); }
  };

  const handlePanUpload = (file) => {
    if (file) performOCR(file, "pan");
    else { setPanFile(null); setPanVerified(null); }
  };

  const handleAadharUpload = (file) => {
    if (file) performOCR(file, "aadhar");
    else { setAadharFile(null); setAadharVerified(null); }
  };

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      if (mode === "login") {
        if (!loginPhone || loginPhone.length < 10) {
          toast.error("Please enter a valid 10-digit phone number");
          return;
        }
        const res = await deliveryApi.sendLoginOtp({ phone: loginPhone });
        toast.success(res.data?.message || "OTP sent!");
      } else {
        if (!signupName.trim()) { toast.error("Please enter your name"); return; }
        if (!signupPhone || signupPhone.length < 10) { toast.error("Please enter a valid 10-digit phone number"); return; }
        if (!profileImageFile) { toast.error("Please upload your profile photo"); return; }

        const formData = new FormData();
        formData.append("name", signupName.trim());
        formData.append("phone", signupPhone);
        formData.append("vehicleType", signupVehicle);
        formData.append("email", signupEmail);
        formData.append("address", signupAddress);
        formData.append("vehicleNumber", signupVehicleNumber);
        formData.append("drivingLicenseNumber", signupDLNumber);
        formData.append("accountHolder", signupAccountHolder);
        formData.append("accountNumber", signupAccountNumber);
        formData.append("ifsc", signupIfsc);

        if (profileImageFile) formData.append("profileImage", profileImageFile);
        if (aadharFile) formData.append("aadhar", aadharFile);
        if (panFile) formData.append("pan", panFile);
        if (dlFile) formData.append("dl", dlFile);

        const res = await deliveryApi.sendSignupOtp(formData);
        toast.success(res.data?.message || "OTP sent!");
      }
      setOtp(["", "", "", ""]);
      setTimer(30);
      setStep("otp");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.some((d) => d === "") || !agreed) return;
    setLoading(true);
    try {
      const phone = mode === "login" ? loginPhone : signupPhone;
      const otpString = otp.join("");
      const response = await deliveryApi.verifyOtp({ phone, otp: otpString });
      const { token, delivery } = response.data.result;

      login({ ...delivery, token, role: "delivery" });

      toast.success("Welcome! Redirecting to dashboard...");
      navigate("/delivery/dashboard");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setStep("form");
    setOtp(["", "", "", ""]);
    setLoginPhone("");
    setSignupStep(1);
    setSignupName("");
    setSignupPhone("");
    setSignupEmail("");
    setSignupAddress("");
    setSignupVehicle("bike");
    setSignupVehicleNumber("");
    setSignupDLNumber("");
    setSignupAccountNumber("");
    setSignupIfsc("");
    setSignupAccountHolder("");
    setAadharFile(null);
    setPanFile(null);
    setDlFile(null);
    setAgreed(false);
    setProfileImageFile(null);
    setProfileImagePreview("");
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -30, transition: { duration: 0.2 } },
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-8 font-['Outfit',_sans-serif]">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[380px] bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50 relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-6">
            <img 
                src="/bg%20remove%20logo%20.png" 
                alt="Logo" 
                className="h-28 w-auto object-contain" 
            />
        </div>

        {step === "form" && (
          <div className="text-left mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                  Login / Signup
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                  {mode === "login" ? 'Enter your mobile number' : `Partner Registration - Step ${signupStep} of 4`}
              </p>
          </div>
        )}

        {step === "otp" && (
          <div className="text-left mb-6">
              <div className="flex items-center gap-3 mb-1">
                  <button
                      onClick={() => setStep("form")}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                      <ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">
                      Verify OTP
                  </h2>
              </div>
              <p className="mt-1 text-sm text-gray-500 ml-8">
                  Sent to +91 {mode === "login" ? loginPhone : signupPhone}
              </p>
          </div>
        )}

        <div>
            <AnimatePresence mode="wait">
              {step === "form" && (
                <motion.div
                  key={`form-${mode}`}
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-4"
                >
                  {/* ────────── SIGNUP MODE ────────── */}
                  {mode === "signup" && (
                    <div className="space-y-4">
                      {/* Step 1: Personal Information */}
                      {signupStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          {/* Profile Photo Capture */}
                          <div className="flex flex-col items-center justify-center py-2">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 self-start ml-1">Profile Photo</label>
                            <div className="relative group">
                              <div className="w-24 h-24 rounded-3xl bg-brand-50 border-2 border-dashed border-brand-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-400">
                                {profileImagePreview ? (
                                  <img src={profileImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-10 h-10 text-brand-300" />
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                id="profile-upload"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    setProfileImageFile(file);
                                    setProfileImagePreview(URL.createObjectURL(file));
                                  }
                                }}
                              />
                              <label
                                htmlFor="profile-upload"
                                className="absolute -bottom-2 -right-2 p-2.5 bg-black  text-primary-foreground rounded-2xl shadow-lg shadow-brand-200 cursor-pointer hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all"
                              >
                                <Camera className="w-4 h-4" />
                              </label>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold mt-3">Upload a clear photo of your face</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupName}
                                onChange={(e) => {
                                  setSignupName(e.target.value.replace(/[^a-zA-Z\s]/g, ""));
                                  markTouched("signupName");
                                }}
                                onBlur={() => markTouched("signupName")}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupName", signupName, isValidName(signupName))}`}
                                placeholder="Enter your full name"
                              />
                            </div>
                            {touched.signupName && signupName && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidName(signupName) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Valid Full Name
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Name must be at least 2 letters (alphabets only)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2.5">+91</span>
                              <input
                                type="tel"
                                value={signupPhone}
                                onChange={(e) => {
                                  setSignupPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                                  markTouched("signupPhone");
                                }}
                                onBlur={() => markTouched("signupPhone")}
                                maxLength={10}
                                className={`w-full pl-24 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupPhone", signupPhone, isValidPhone(signupPhone))}`}
                                placeholder="00000 00000"
                              />
                            </div>
                            {touched.signupPhone && signupPhone && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidPhone(signupPhone) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard 10-digit Mobile Number
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Enter a valid 10-digit mobile number ({signupPhone.length}/10)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="email"
                                value={signupEmail}
                                onChange={(e) => {
                                  setSignupEmail(e.target.value.replace(/\s+/g, "").toLowerCase());
                                  markTouched("signupEmail");
                                }}
                                onBlur={() => markTouched("signupEmail")}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupEmail", signupEmail, isValidEmail(signupEmail))}`}
                                placeholder="example@gmail.com"
                              />
                            </div>
                            {touched.signupEmail && signupEmail && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidEmail(signupEmail) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard Email format
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Enter a valid email (e.g. name@domain.com)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Permanent Address</label>
                            <div className="relative">
                              <MapPin className="absolute left-4 top-4 text-gray-300 w-4 h-4" />
                              <textarea
                                value={signupAddress}
                                onChange={(e) => {
                                  setSignupAddress(e.target.value);
                                  markTouched("signupAddress");
                                }}
                                onBlur={() => markTouched("signupAddress")}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all resize-none h-24 ${getDeliveryFieldBorderClass("signupAddress", signupAddress, isValidAddress(signupAddress))}`}
                                placeholder="Complete building address..."
                              />
                            </div>
                            {touched.signupAddress && signupAddress && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidAddress(signupAddress) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Complete Address provided
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Address must be at least 10 characters ({signupAddress.trim().length}/10)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              markTouched("signupName");
                              markTouched("signupPhone");
                              markTouched("signupEmail");
                              markTouched("signupAddress");
                              if (!signupName || !signupPhone || !signupEmail || !signupAddress || !profileImageFile) {
                                toast.error("Please fill all personal information fields and upload photo");
                                return;
                              }
                              if (!isValidName(signupName)) {
                                toast.error("Please enter a valid full name (letters only, min 2 chars)");
                                return;
                              }
                              if (!isValidPhone(signupPhone)) {
                                toast.error("Please enter a valid 10-digit phone number");
                                return;
                              }
                              if (!isValidEmail(signupEmail)) {
                                toast.error("Please enter a valid email address");
                                return;
                              }
                              if (!isValidAddress(signupAddress)) {
                                toast.error("Please enter a complete address (min 10 characters)");
                                return;
                              }
                              setSignupStep(2);
                            }}
                            className="w-full mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center transition-all"
                          >
                            Next Step
                          </button>
                        </motion.div>
                      )}

                      {/* Step 2: Vehicle Information */}
                      {signupStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle Type</label>
                            <div className="relative">
                              <Bike className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <button
                                type="button"
                                onClick={() => setShowVehicleDropdown(!showVehicleDropdown)}
                                className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none text-left"
                              >
                                {VEHICLE_TYPES.find((v) => v.value === signupVehicle)?.label}
                              </button>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                              <AnimatePresence>
                                {showVehicleDropdown && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="absolute top-full left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-lg mt-2 overflow-hidden z-20"
                                  >
                                    {VEHICLE_TYPES.map((v) => (
                                      <button
                                        key={v.value}
                                        onClick={() => { setSignupVehicle(v.value); setShowVehicleDropdown(false); }}
                                        className="w-full px-4 py-3 text-sm font-bold text-left hover:bg-brand-50 transition-colors"
                                      >
                                        {v.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Vehicle Plate Number</label>
                            <div className="relative">
                              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupVehicleNumber}
                                onChange={(e) => {
                                  setSignupVehicleNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9\s]/g, ""));
                                  markTouched("signupVehicleNumber");
                                }}
                                onBlur={() => markTouched("signupVehicleNumber")}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupVehicleNumber", signupVehicleNumber, isValidVehicleNumber(signupVehicleNumber))}`}
                                placeholder="KA 05 MN 8921"
                              />
                            </div>
                            {touched.signupVehicleNumber && signupVehicleNumber && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidVehicleNumber(signupVehicleNumber) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard Vehicle Plate format
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Enter valid vehicle plate number (e.g. KA05MN8921)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Driving License Number</label>
                            <div className="relative">
                              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                              <input
                                type="text"
                                value={signupDLNumber}
                                onChange={(e) => {
                                  setSignupDLNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
                                  markTouched("signupDLNumber");
                                }}
                                onBlur={() => markTouched("signupDLNumber")}
                                className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupDLNumber", signupDLNumber, isValidDL(signupDLNumber))}`}
                                placeholder="DL-1420110012345"
                              />
                            </div>
                            {touched.signupDLNumber && signupDLNumber && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidDL(signupDLNumber) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard Driving License format
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Enter valid DL number (e.g. RJ1420110012345)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-4 pt-2">
                            <button
                              onClick={() => setSignupStep(1)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => {
                                markTouched("signupVehicleNumber");
                                markTouched("signupDLNumber");
                                if (!signupVehicleNumber) {
                                  toast.error("Please enter your vehicle plate number");
                                  return;
                                }
                                if (!isValidVehicleNumber(signupVehicleNumber)) {
                                  toast.error("Please enter a valid vehicle plate number");
                                  return;
                                }
                                if (!signupDLNumber) {
                                  toast.error("Please enter your driving license number");
                                  return;
                                }
                                if (!isValidDL(signupDLNumber)) {
                                  toast.error("Please enter a valid driving license number");
                                  return;
                                }
                                setSignupStep(3);
                              }}
                              className="flex-[2] mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center transition-all"
                            >
                              Next Step
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Bank Information */}
                      {signupStep === 3 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                            <input
                              type="text"
                              value={signupAadharNumber}
                              onChange={(e) => {
                                setSignupAadharNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
                                markTouched("signupAadharNumber");
                              }}
                              onBlur={() => markTouched("signupAadharNumber")}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all font-mono ${getDeliveryFieldBorderClass("signupAadharNumber", signupAadharNumber, isValidAadhar(signupAadharNumber))}`}
                              placeholder="0000 0000 0000"
                            />
                            {touched.signupAadharNumber && signupAadharNumber && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidAadhar(signupAadharNumber) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard 12-digit Aadhar Number
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Aadhar must be 12 digits ({signupAadharNumber.length}/12)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">PAN Card Number</label>
                            <input
                              type="text"
                              value={signupPanNumber}
                              onChange={(e) => {
                                setSignupPanNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                                markTouched("signupPanNumber");
                              }}
                              onBlur={() => markTouched("signupPanNumber")}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all font-mono ${getDeliveryFieldBorderClass("signupPanNumber", signupPanNumber, isValidPan(signupPanNumber))}`}
                              placeholder="ABCDE1234F"
                            />
                            {touched.signupPanNumber && signupPanNumber && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidPan(signupPanNumber) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard PAN Card format
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Enter valid PAN (5 letters + 4 numbers + 1 letter, e.g. ABCDE1234F) ({signupPanNumber.length}/10)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Account Holder Name</label>
                            <input
                              type="text"
                              value={signupAccountHolder}
                              onChange={(e) => {
                                setSignupAccountHolder(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, ""));
                                markTouched("signupAccountHolder");
                              }}
                              onBlur={() => markTouched("signupAccountHolder")}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupAccountHolder", signupAccountHolder, isValidAccountHolder(signupAccountHolder))}`}
                              placeholder="AS PER BANK RECORDS"
                            />
                            {touched.signupAccountHolder && signupAccountHolder && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidAccountHolder(signupAccountHolder) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Valid Account Holder Name
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Name as per bank records (letters only, min 3 chars)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                            <input
                              type="text"
                              value={signupAccountNumber}
                              onChange={(e) => {
                                setSignupAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 18));
                                markTouched("signupAccountNumber");
                              }}
                              onBlur={() => markTouched("signupAccountNumber")}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupAccountNumber", signupAccountNumber, isValidAccountNumber(signupAccountNumber))}`}
                              placeholder="000000000000"
                            />
                            {touched.signupAccountNumber && signupAccountNumber && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidAccountNumber(signupAccountNumber) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Valid Bank Account Number format
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Account number must be between 9 and 18 digits
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">IFSC Code</label>
                            <input
                              type="text"
                              value={signupIfsc}
                              onChange={(e) => {
                                setSignupIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11));
                                markTouched("signupIfsc");
                              }}
                              onBlur={() => markTouched("signupIfsc")}
                              className={`w-full px-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all ${getDeliveryFieldBorderClass("signupIfsc", signupIfsc, isValidIfsc(signupIfsc))}`}
                              placeholder="HDFC0001234"
                            />
                            {touched.signupIfsc && signupIfsc && (
                              <div className="mt-1 px-1 text-xs font-semibold">
                                {isValidIfsc(signupIfsc) ? (
                                  <span className="text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={13} className="shrink-0" /> Standard 11-character IFSC Code
                                  </span>
                                ) : (
                                  <span className="text-rose-500 flex items-center gap-1">
                                    <AlertCircle size={13} className="shrink-0" /> Enter valid IFSC (e.g. HDFC0001234 - 5th digit must be 0) ({signupIfsc.length}/11)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-4 pt-2">
                            <button
                              onClick={() => setSignupStep(2)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              onClick={() => {
                                markTouched("signupAadharNumber");
                                markTouched("signupPanNumber");
                                markTouched("signupAccountHolder");
                                markTouched("signupAccountNumber");
                                markTouched("signupIfsc");
                                if (!signupAadharNumber || !signupPanNumber || !signupAccountHolder || !signupAccountNumber || !signupIfsc) {
                                  toast.error("Please fill all bank and identification fields");
                                  return;
                                }
                                if (!isValidAadhar(signupAadharNumber)) {
                                  toast.error("Aadhar number must be 12 digits");
                                  return;
                                }
                                if (!isValidPan(signupPanNumber)) {
                                  toast.error("Please enter a valid 10-character PAN card number (e.g. ABCDE1234F)");
                                  return;
                                }
                                if (!isValidAccountHolder(signupAccountHolder)) {
                                  toast.error("Please enter a valid account holder name (min 3 letters)");
                                  return;
                                }
                                if (!isValidAccountNumber(signupAccountNumber)) {
                                  toast.error("Account number must be between 9 and 18 digits");
                                  return;
                                }
                                if (!isValidIfsc(signupIfsc)) {
                                  toast.error("Please enter a valid 11-character IFSC code (e.g. HDFC0001234)");
                                  return;
                                }
                                setSignupStep(4);
                              }}
                              className="flex-[2] mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center transition-all"
                            >
                              Next Step
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 4: Documents Upload */}
                      {signupStep === 4 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="space-y-4"
                        >
                          <div className="space-y-3">
                            {[
                              { label: "Aadhar Card (Front/Back)", state: aadharFile, setter: setAadharFile, id: "aadhar" },
                              { label: "PAN Card", state: panFile, setter: setPanFile, id: "pan" },
                              { label: "Driving License", state: dlFile, setter: setDlFile, id: "dl" },
                            ].map((doc) => (
                              <div key={doc.id} className="relative">
                                <input
                                  type="file"
                                  id={doc.id}
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (doc.id === "dl") handleDLUpload(file);
                                    else if (doc.id === "pan") handlePanUpload(file);
                                    else if (doc.id === "aadhar") handleAadharUpload(file);
                                    else doc.setter(file);
                                  }}
                                />
                                <label
                                  htmlFor={doc.id}
                                  className={`flex items-center justify-between p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${doc.state
                                    ? "border-brand-200 bg-brand-50/50"
                                    : "border-gray-100 bg-gray-50 hover:border-brand-200 hover:bg-brand-50/30"
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${doc.state ? "bg-brand-100 text-brand-600" : "bg-white text-gray-400 shadow-sm"}`}>
                                      {doc.state ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                                    </div>
                                    <div className="text-left">
                                      <p className={`text-xs font-black uppercase tracking-tight ${doc.state ? "text-brand-700" : "text-gray-500"}`}>
                                        {doc.label}
                                      </p>
                                      <p className="text-[10px] text-gray-400 font-bold truncate max-w-[180px]">
                                        {doc.state ? doc.state.name : "Tap to upload document"}
                                      </p>
                                    </div>
                                  </div>
                                  {doc.state && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        doc.setter(null);
                                      }}
                                      className="p-1.5 hover:bg-brand-100 rounded-lg text-brand-600 transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </label>

                                {/* OCR Progress & Badge for DL */}
                                {doc.id === "dl" && (
                                  <div className="mt-2 px-1">
                                    {(isScanning && doc.state === null) && (
                                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-500">
                                          <span>AI Scanning DL...</span>
                                          <span>{ocrProgress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-brand-50 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${ocrProgress}%` }}
                                            className="h-full bg-brand-500"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {!isScanning && dlVerified === true && (
                                      <div className="flex items-center gap-1.5 text-brand-600 animate-in zoom-in-95 duration-300">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">AI Verified: Valid DL Found</span>
                                      </div>
                                    )}

                                    {!isScanning && dlVerified === false && (
                                      <div className="flex items-center gap-1.5 text-rose-500 animate-in shake duration-500">
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">AI Warning: DL Match Failed</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* OCR Progress & Badge for PAN */}
                                {doc.id === "pan" && (
                                  <div className="mt-2 px-1">
                                    {(isScanning && doc.state === null) && (
                                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-500">
                                          <span>AI Scanning PAN...</span>
                                          <span>{ocrProgress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-brand-50 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${ocrProgress}%` }}
                                            className="h-full bg-brand-500"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {!isScanning && panVerified === true && (
                                      <div className="flex items-center gap-1.5 text-brand-600 animate-in zoom-in-95 duration-300">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">AI Verified: Valid PAN Found</span>
                                      </div>
                                    )}

                                    {!isScanning && panVerified === false && (
                                      <div className="flex items-center gap-1.5 text-rose-500 animate-in shake duration-500">
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">AI Warning: PAN Match Failed</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* OCR Progress & Badge for Aadhar */}
                                {doc.id === "aadhar" && (
                                  <div className="mt-2 px-1">
                                    {(isScanning && doc.state === null) && (
                                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-500">
                                          <span>AI Scanning Aadhar...</span>
                                          <span>{ocrProgress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-brand-50 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${ocrProgress}%` }}
                                            className="h-full bg-brand-500"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {!isScanning && aadharVerified === true && (
                                      <div className="flex items-center gap-1.5 text-brand-600 animate-in zoom-in-95 duration-300">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider">AI Verified: Valid Aadhar Found</span>
                                      </div>
                                    )}

                                    {!isScanning && aadharVerified === false && (
                                      <div className="flex items-center gap-1.5 text-rose-500 animate-in shake duration-500">
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">AI Warning: Aadhar Match Failed</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            <p className="text-[10px] text-gray-400 italic px-1 flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3 text-brand-300" />
                              Documents will be verified by our team after submission.
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => setSignupStep(3)}
                              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              onClick={handleSendOtp}
                              disabled={loading || dlVerified !== true || panVerified !== true || aadharVerified !== true}
                              className="flex-[2] mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>Register</>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <p className="text-center text-xs text-gray-400 font-semibold pt-1">
                        By joining, you agree to our{" "}
                        <span className="text-brand-500 font-bold cursor-pointer hover:underline">Terms</span>{" "}
                        &amp;{" "}
                        <span className="text-brand-500 font-bold cursor-pointer hover:underline">Privacy Policy</span>
                      </p>
                    </div>
                  )}

                  {/* ────────── LOGIN MODE ────────── */}
                  {mode === "login" && (
                    <div className="space-y-4">
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                          <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2.5">
                            +91
                          </span>
                          <input
                            type="tel"
                            value={loginPhone}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setLoginPhone(val);
                              markTouched("loginPhone");
                            }}
                            onBlur={() => markTouched("loginPhone")}
                            maxLength={10}
                            className={`w-full pl-24 pr-4 py-3.5 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 transition-all placeholder:text-gray-300 ${getDeliveryFieldBorderClass("loginPhone", loginPhone, isValidPhone(loginPhone))}`}
                            placeholder="00000 00000"
                          />
                        </div>
                        {touched.loginPhone && loginPhone && (
                          <div className="mt-1 px-1 text-xs font-semibold">
                            {isValidPhone(loginPhone) ? (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle size={13} className="shrink-0" /> Standard 10-digit Mobile Number
                              </span>
                            ) : (
                              <span className="text-rose-500 flex items-center gap-1">
                                <AlertCircle size={13} className="shrink-0" /> Enter a valid 10-digit phone number ({loginPhone.length}/10)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>Login Now</>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="mt-6 text-center">
                      <button
                          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                          className="text-sm font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                      >
                          {mode === 'login' ? "New partner? Register now" : "Already registered? Login"}
                      </button>
                  </div>

                </motion.div>
              )}

              {/* ─── OTP STEP ─── */}
              {step === "otp" && (
                <motion.div
                  key="otp"
                  variants={slideVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  {/* OTP Boxes */}
                  <div className="space-y-2 text-center">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Enter Security Code
                    </label>
                    <div className="flex justify-center gap-3 pt-1">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          id={`otp-${index}`}
                          type="tel"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                          className="w-14 h-14 text-center text-2xl font-black border-2 border-gray-100 rounded-2xl focus:border-brand-500 focus:ring-4 focus:ring-brand-100 outline-none transition-all bg-gray-50 text-gray-900"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Timer / Resend */}
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-gray-400 text-sm font-medium">
                        Resend code in <span className="text-brand-600 font-bold">{timer}s</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleSendOtp}
                        className="text-brand-600 font-black text-sm uppercase tracking-wide hover:underline"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-brand-600 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                      I confirm my phone number is correct and I agree to the{" "}
                      <span className="text-brand-600 font-bold">Terms of Service</span> &amp;{" "}
                      <span className="text-brand-600 font-bold">Privacy Policy</span>.
                    </label>
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleVerifyOtp}
                    disabled={!agreed || otp.some((d) => !d) || loading}
                    className="w-full mt-2 text-white bg-[#f97316] hover:bg-orange-600 py-3.5 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Verify &amp; Login</>
                    )}
                  </button>

                  {/* Back */}
                  <button
                    onClick={() => { setStep("form"); setOtp(["", "", "", ""]); }}
                    className="w-full flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Edit Phone Number
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        {/* Footer */}
        <div className="pt-8 flex flex-col items-center gap-1.5">
            <p className="text-[11px] text-gray-400 text-center font-medium">
                By continuing, you agree to our
            </p>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => navigate('/terms')}
                    className="text-[11px] font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                >
                    Terms & Conditions
                </button>
                <span className="text-[10px] text-gray-300">•</span>
                <button 
                    onClick={() => navigate('/privacy-policy')}
                    className="text-[11px] font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
                >
                    Privacy Policy
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryAuth;
