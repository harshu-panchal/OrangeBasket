import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deliveryApi } from "../services/deliveryApi";

/**
 * DeliverySlideButton - A slide-to-confirm button for delivery actions
 * 
 * This component handles the slide gesture to trigger OTP generation.
 * It calls the generate-otp endpoint which uses the delivery person's stored location
 * from the database for proximity validation.
 * 
 * @param {Object} props
 * @param {string} props.orderId - The order ID for OTP generation
 * @param {Function} props.onSuccess - Callback when OTP is successfully generated
 * @param {Function} props.onError - Callback when an error occurs
 * @param {string} props.label - Label text for the slide button (default: "SLIDE TO GENERATE OTP")
 * @param {string} props.bgColor - Background color class (default: "bg-black ")
 * @param {string} props.bgColorLight - Light background color class (default: "bg-brand-50")
 */
const DeliverySlideButton = ({
  orderId,
  onSuccess,
  onError,
  isReturn = false,
  isReturnDrop = false,
  label = "SLIDE TO GENERATE OTP",
  bgColor = "bg-black ",
  bgColorLight = "bg-brand-50",
}) => {
  const [isSlideComplete, setIsSlideComplete] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Reset slide state when orderId changes
  useEffect(() => {
    setIsSlideComplete(false);
    setDragX(0);
    setIsLoading(false);
  }, [orderId]);

  const resetSlide = () => {
    setIsSlideComplete(false);
    setDragX(0);
    setIsLoading(false);
  };

  /**
   * Handle slide completion - generate OTP using stored location
   */
  const handleSlideComplete = async () => {
    setIsLoading(true);

    try {
      // Call appropriate endpoint based on flow type
      const response = isReturnDrop
        ? await deliveryApi.requestReturnDropOtp(orderId, {})
        : isReturn
          ? await deliveryApi.requestReturnOtp(orderId, {})
          : await deliveryApi.requestDeliveryOtp(orderId, {});

      // Handle success
      toast.success(response.data?.message || "OTP generated and sent to customer");

      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      // Handle different error types. Same dual-shape access pattern as
      // OtpInput.jsx — the canonical workflow controller wraps the
      // structured payload inside `result.error`.
      const respData = error.response?.data || {};
      const structured =
        (respData.result && respData.result.error) ||
        (typeof respData.error === "object" ? respData.error : null) ||
        {};
      const errorMessage =
        structured.message ||
        respData.message ||
        error.message ||
        "Failed to generate OTP";
      const errorCode = structured.code;

      // Display user-friendly error messages
      if (errorCode === "PROXIMITY_OUT_OF_RANGE") {
        // Fallback to the detailed error message from the backend if it exists
        toast.error(
          errorMessage || "You are too far. You must be within 120m of the delivery location.",
          { duration: 5000 }
        );
      } else if (errorCode === "LOCATION_REQUIRED" || errorCode === "LOCATION_STALE") {
        toast.error(errorMessage || "Location data is not available. Please ensure location tracking is enabled.");
      } else if (errorCode === "ORDER_NOT_FOUND") {
        toast.error("Order not found. Please refresh and try again.");
      } else if (errorCode === "UNAUTHORIZED_DELIVERY") {
        toast.error("This order is not assigned to you.");
      } else {
        toast.error(errorMessage);
      }

      if (onError) {
        onError(error);
      }

      resetSlide();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={() => {
        if (!isLoading) handleSlideComplete();
      }}
      disabled={isLoading}
      className={`relative w-full h-14 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${bgColor}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin mr-2" size={20} />
          <span className="text-sm font-medium">
            {isReturn ? "Requesting OTP..." : "Generating OTP..."}
          </span>
        </>
      ) : (
        <>
          {label.replace("SLIDE TO ", "")}
          <ChevronRight className="ml-1" size={20} />
        </>
      )}
    </button>
  );
};

export default DeliverySlideButton;
