import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Phone,
  Trash2,
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  MapPin,
  PhoneCall,
  Bell,
  X,
  Loader2,
} from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import Input from "@/shared/components/ui/Input";
import { toast } from "sonner";
import { useSettings } from "@core/context/SettingsContext";
import { useAuth } from "@core/context/AuthContext";
import { deliveryApi } from "../../services/deliveryApi";
import { motion, AnimatePresence } from "framer-motion";

const SafetyPrivacy = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";
  const { user, refreshUser } = useAuth();

  const [contacts, setContacts] = useState(user?.emergencyContacts || []);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [showAddContact, setShowAddContact] = useState(false);
  const [savingContacts, setSavingContacts] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [triggeringSOS, setTriggeringSOS] = useState(false);
  const [sosTriggered, setSOSTriggered] = useState(false);
  const longPressTimer = useRef(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const progressInterval = useRef(null);

  React.useEffect(() => {
    if (user?.emergencyContacts) {
      setContacts(user.emergencyContacts);
    }
  }, [user]);

  // Persist contacts to database
  const persistContacts = useCallback(
    async (updatedContacts) => {
      setSavingContacts(true);
      try {
        await deliveryApi.updateEmergencyContacts({
          contacts: updatedContacts.map((c) => ({
            name: c.name,
            phone: c.phone,
          })),
        });
        if (typeof refreshUser === "function") refreshUser();
      } catch (err) {
        console.error("Failed to save contacts:", err);
        toast.error("Failed to save contacts to server");
      } finally {
        setSavingContacts(false);
      }
    },
    [refreshUser]
  );

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error("Please fill in both name and phone");
      return;
    }
    const updated = [
      ...contacts,
      { name: newContact.name.trim(), phone: newContact.phone.trim() },
    ];
    setContacts(updated);
    setNewContact({ name: "", phone: "" });
    setShowAddContact(false);
    toast.success("Emergency contact added!");
    await persistContacts(updated);
  };

  const handleRemoveContact = async (index) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    toast.success("Contact removed");
    await persistContacts(updated);
  };

  // SOS Long-press handlers
  const startLongPress = () => {
    setIsLongPressing(true);
    setLongPressProgress(0);
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += 2;
      setLongPressProgress(Math.min(progress, 100));
    }, 30);
    longPressTimer.current = setTimeout(() => {
      clearInterval(progressInterval.current);
      setIsLongPressing(false);
      setLongPressProgress(0);
      setShowSOSModal(true);
    }, 1500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (progressInterval.current) clearInterval(progressInterval.current);
    setIsLongPressing(false);
    setLongPressProgress(0);
  };

  // Get current location
  const getCurrentLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: 0, longitude: 0 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve({ latitude: 0, longitude: 0 }),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });

  // Trigger SOS
  const handleTriggerSOS = async () => {
    setTriggeringSOS(true);
    try {
      const location = await getCurrentLocation();
      await deliveryApi.triggerSOS(location);
      setSOSTriggered(true);
      toast.success("🚨 SOS Alert sent to Admin!");
    } catch (err) {
      console.error("SOS trigger failed:", err);
      toast.error("Failed to send SOS alert. Please try again or call 112.");
    } finally {
      setTriggeringSOS(false);
    }
  };

  const handleEmergencyCall = () => {
    window.location.href = "tel:112";
  };

  const handleShareLocation = async () => {
    const location = await getCurrentLocation();
    if (location.latitude && location.longitude) {
      const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: "My Emergency Location",
            text: "I need help! Here is my location:",
            url,
          });
        } catch {
          navigator.clipboard?.writeText(url);
          toast.success("Location link copied!");
        }
      } else {
        navigator.clipboard?.writeText(url);
        toast.success("Location link copied to clipboard!");
      }
    } else {
      toast.error("Could not get location. Please enable GPS.");
    }
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">Safety & Privacy</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* SOS Button Section */}
        <section>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 border border-red-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/30 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <h2 className="text-lg font-bold text-red-900 mb-2 flex items-center">
                <AlertTriangle size={20} className="mr-2 text-red-600" />
                Emergency SOS
              </h2>
              <p className="text-sm text-red-700 mb-5">
                Press and hold the SOS button for 1.5 seconds to activate
                emergency mode. Admin will be notified immediately.
              </p>

              <div className="flex justify-center">
                <button
                  onMouseDown={startLongPress}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={startLongPress}
                  onTouchEnd={cancelLongPress}
                  onTouchCancel={cancelLongPress}
                  className="relative w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-xl shadow-red-500/40 active:scale-95 transition-transform flex flex-col items-center justify-center select-none"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {/* Progress ring */}
                  {isLongPressing && (
                    <svg
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 128 128"
                    >
                      <circle
                        cx="64"
                        cy="64"
                        r="60"
                        fill="none"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="6"
                        strokeDasharray={`${(longPressProgress / 100) * 377} 377`}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  <AlertTriangle size={32} className="mb-1" />
                  <span className="text-sm font-black tracking-wider">SOS</span>
                  <span className="text-[10px] font-medium opacity-80 mt-0.5">
                    HOLD TO ACTIVATE
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Emergency Contacts */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <Shield size={20} className="mr-2 text-primary" /> Emergency
            Contacts
            {savingContacts && (
              <Loader2 size={16} className="ml-2 animate-spin text-gray-400" />
            )}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            These contacts will be notified if you trigger the SOS alert during
            a delivery.
          </p>

          <div className="space-y-3">
            {contacts.length > 0 ? (
              contacts.map((contact, idx) => (
                <Card
                  key={contact._id || idx}
                  className="p-4 flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-gray-800">{contact.name}</h4>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Phone size={14} className="mr-1" /> {contact.phone}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => handleRemoveContact(idx)}
                    disabled={savingContacts}
                  >
                    <Trash2 size={18} />
                  </Button>
                </Card>
              ))
            ) : (
              <div className="text-sm text-gray-500 p-4 text-center border rounded-xl border-dashed">
                No emergency contacts added.
              </div>
            )}

            {showAddContact ? (
              <Card className="p-4 border-dashed border-2 border-gray-200 bg-gray-50">
                <Input
                  placeholder="Name (e.g. Wife, Brother)"
                  value={newContact.name}
                  onChange={(e) =>
                    setNewContact({ ...newContact, name: e.target.value })
                  }
                  className="mb-3 bg-white"
                />
                <Input
                  placeholder="Phone Number"
                  value={newContact.phone}
                  onChange={(e) =>
                    setNewContact({ ...newContact, phone: e.target.value })
                  }
                  className="mb-3 bg-white"
                />
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleAddContact}
                    className="flex-1"
                    disabled={savingContacts}
                  >
                    {savingContacts ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddContact(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary"
                onClick={() => setShowAddContact(true)}
              >
                <UserPlus size={18} className="mr-2" /> Add New Contact
              </Button>
            )}
          </div>
        </section>

        {/* Privacy Settings */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
            <Lock size={20} className="mr-2 text-primary" /> Privacy Settings
          </h2>
          <Card className="divide-y divide-gray-100">
            <div className="p-4 flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-800">
                  Share Live Location
                </h4>
                <p className="text-xs text-gray-500">
                  Allow customers to track you during delivery
                </p>
              </div>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-brand-500 cursor-pointer">
                <span className="absolute left-6 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out transform"></span>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-800">
                  Profile Visibility
                </h4>
                <p className="text-xs text-gray-500">
                  Show your photo to customers
                </p>
              </div>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full bg-brand-500 cursor-pointer">
                <span className="absolute left-6 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ease-in-out transform"></span>
              </div>
            </div>
          </Card>
        </section>

        <div className="bg-brand-50 p-4 rounded-xl flex items-start">
          <Eye size={20} className="text-brand-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-brand-800">
            {appName} values your privacy. Your location is only shared while
            you are on an active delivery.
          </p>
        </div>
      </div>

      {/* SOS Actions Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md shadow-2xl"
            >
              {/* Close button */}
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-black text-red-600 flex items-center">
                  <AlertTriangle size={24} className="mr-2" />
                  {sosTriggered ? "SOS Alert Sent!" : "Emergency SOS"}
                </h2>
                <button
                  onClick={() => {
                    setShowSOSModal(false);
                    setSOSTriggered(false);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {sosTriggered && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-green-800">
                    ✅ Admin has been notified with your location and emergency
                    contacts. Help is on the way!
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {/* Notify Admin */}
                <button
                  onClick={handleTriggerSOS}
                  disabled={triggeringSOS || sosTriggered}
                  className="w-full flex items-center p-4 rounded-2xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center mr-4 flex-shrink-0">
                    {triggeringSOS ? (
                      <Loader2 size={22} className="animate-spin" />
                    ) : (
                      <Bell size={22} />
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-red-900">
                      {sosTriggered ? "Alert Sent ✓" : "Notify Admin"}
                    </h4>
                    <p className="text-xs text-red-700">
                      Send emergency alert with your location
                    </p>
                  </div>
                </button>

                {/* Share Live Location */}
                <button
                  onClick={handleShareLocation}
                  className="w-full flex items-center p-4 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center mr-4 flex-shrink-0">
                    <MapPin size={22} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-blue-900">
                      Share Live Location
                    </h4>
                    <p className="text-xs text-blue-700">
                      Share your current GPS location
                    </p>
                  </div>
                </button>

                {/* Emergency Contacts */}
                {contacts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <h4 className="font-bold text-amber-900 mb-3 flex items-center">
                      <Phone size={16} className="mr-2" /> Emergency Contacts
                    </h4>
                    <div className="space-y-2">
                      {contacts.map((contact, idx) => (
                        <a
                          key={idx}
                          href={`tel:${contact.phone}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-white hover:bg-amber-50 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">
                              {contact.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {contact.phone}
                            </p>
                          </div>
                          <PhoneCall
                            size={18}
                            className="text-amber-600"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Call 112 */}
                <button
                  onClick={handleEmergencyCall}
                  className="w-full flex items-center p-4 rounded-2xl bg-gray-900 hover:bg-gray-800 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-white text-red-600 flex items-center justify-center mr-4 flex-shrink-0">
                    <PhoneCall size={22} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-white">
                      Emergency Call (112)
                    </h4>
                    <p className="text-xs text-gray-300">
                      Call national emergency helpline
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SafetyPrivacy;
