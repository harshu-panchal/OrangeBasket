import React from "react";
import { cn } from "@/lib/utils";

// On/off switch for showing highlight badges on the customer product page.
const HighlightsToggle = ({ checked, onChange }) => (
  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
    <div>
      <p className="text-xs font-black text-slate-800 uppercase tracking-widest">
        Show highlights to customers
      </p>
      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
        {checked
          ? "ON: these badges appear on the customer product page."
          : "OFF: badges are hidden from the customer product page."}
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-slate-300",
      )}>
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  </div>
);

export default HighlightsToggle;
