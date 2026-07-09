import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { useSettings } from "@core/context/SettingsContext";

const Splash = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/delivery/login");
    }, 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      <img 
        src="/driverinit page .png" 
        alt="Delivery Splash"
        className="w-full h-full object-cover absolute inset-0"
      />
    </div>
  );
};

export default Splash;
