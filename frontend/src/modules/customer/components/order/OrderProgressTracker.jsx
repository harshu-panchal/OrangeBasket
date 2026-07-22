import React from "react";
import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { getLegacyStatusFromOrder } from "@/shared/utils/orderStatus";

const OrderProgressTracker = ({
  order,
  estimatedArrivalText = "12:45 PM",
  arrivingInText = "8 mins",
  totalDistanceText = "—",
}) => {
  const status = getLegacyStatusFromOrder(order);

  const steps = [
    { id: "pending", label: "Order Placed", subLabel: "We have received your order" },
    { id: "confirmed", label: "Order Confirmed", subLabel: "Your order has been confirmed" },
    { id: "packed", label: "Order Packed", subLabel: "Your order is packed and ready" },
    { id: "out_for_delivery", label: "Out for Delivery", subLabel: "Your order is on the way" },
    { id: "delivered", label: "Delivered", subLabel: "Order has been delivered" },
  ];

  const statusList = ["pending", "confirmed", "packed", "out_for_delivery", "delivered"];
  let currentStatusIndex = statusList.indexOf(status);
  
  if (status === "cancelled") {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5">
        <p className="text-center text-rose-700 font-semibold">Order Cancelled</p>
      </div>
    );
  }

  // Fallback for unknown status
  if (currentStatusIndex === -1) currentStatusIndex = 0;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col gap-6"
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStatusIndex || (status === "delivered" && index === 4);
          const isActive = index === currentStatusIndex && status !== "delivered";
          const isPending = !isCompleted && !isActive;

          // Determine line color to the NEXT step
          const isLineActive = index < currentStatusIndex;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Connecting Line (drawn below the circle) */}
              {index < steps.length - 1 && (
                <div
                  className={`absolute left-[11px] top-6 bottom-[-24px] w-[2px] ${
                    isLineActive ? "bg-[#1e7145]" : "bg-slate-200"
                  }`}
                />
              )}

              {/* Status Indicator */}
              <div className="relative z-10 flex h-[24px] w-[24px] shrink-0 items-center justify-center bg-white">
                {isCompleted ? (
                  <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#1e7145] text-white">
                    <Check size={12} strokeWidth={4} />
                  </div>
                ) : isActive ? (
                  <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#1e7145]">
                    <div className="h-[6px] w-[6px] rounded-full bg-white" />
                  </div>
                ) : (
                  <div className="flex h-[20px] w-[20px] items-center justify-center rounded-full border-[2px] border-slate-300">
                  </div>
                )}
              </div>

              {/* Step Text */}
              <div className="flex flex-col pt-[2px]">
                <span
                  className={`text-[14px] font-bold leading-none ${
                    isActive
                      ? "text-[#1e7145]"
                      : isCompleted
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {step.subLabel}
                </span>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* ETA Display */}
      {status !== "delivered" && (
        <div className="mt-8 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between bg-emerald-50 rounded-2xl p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-emerald-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Estimated Time
                </p>
                <p className="text-lg font-black text-emerald-900">{estimatedArrivalText}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div>
                <p className="text-xs text-emerald-700 font-semibold">Arriving in</p>
                <p className="text-2xl font-black text-emerald-900">{arrivingInText}</p>
              </div>
              <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                Total distance: {totalDistanceText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderProgressTracker;
