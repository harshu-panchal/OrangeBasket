import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { warehouseApi } from "../../services/warehouseApi";

export const MARGIN_TYPE_OPTIONS = [
  { value: "auto", label: "Auto (by priority)" },
  { value: "default", label: "Default margin" },
  { value: "brand", label: "Brand margin" },
  { value: "subcategory", label: "Subcategory margin" },
  { value: "individual", label: "Individual margin" },
];

export const MARGIN_SOURCE_LABELS = {
  individual: "Individual",
  brand: "Brand",
  subcategory: "Subcategory",
  default: "Default",
};

const isBlank = (v) => v === "" || v === null || v === undefined;

export const calcSellingPrice = (purchasePrice, margin) =>
  Math.round((Number(purchasePrice) * (1 + Number(margin) / 100) + Number.EPSILON) * 100) / 100;

/**
 * Mirrors backend marginService.resolveMarginFromConfig, for ONE variant.
 * Priority: Individual -> Brand -> Subcategory -> Default.
 * Brand and subcategory come from the product; marginType/individualMargin from the variant.
 * Returns { margin, source } or { error } when a forced type has no value.
 */
export function resolveVariantMargin({ config, brands, formData, variant }) {
  if (!config) return { error: "Margins not loaded" };
  const type = variant.marginType || "auto";
  const individual = isBlank(variant.individualMargin) ? null : Number(variant.individualMargin);
  const brand = (brands || []).find((b) => String(b._id) === String(formData.brandId));
  const brandMargin = brand && !isBlank(brand.margin) ? Number(brand.margin) : null;
  const sub = (config.subcategoryMargins || []).find(
    (s) => String(s.subcategoryId) === String(formData.subcategory),
  );
  const subMargin = sub ? Number(sub.margin) : null;

  const options = {
    individual: individual !== null && !Number.isNaN(individual) ? { margin: individual, source: "individual" } : null,
    brand: brandMargin !== null ? { margin: brandMargin, source: "brand" } : null,
    subcategory: subMargin !== null ? { margin: subMargin, source: "subcategory" } : null,
    default: { margin: Number(config.defaultMargin) || 0, source: "default" },
  };

  if (type !== "auto") {
    return options[type] || { error: `No ${type} margin is set` };
  }
  return options.individual || options.brand || options.subcategory || options.default;
}

/**
 * Loads brands + margin config and keeps every variant's salePrice in sync with
 * (purchasePrice + that variant's resolved margin). Call once per product form.
 * Returns `resolvedVariants` (one resolver result per variant, same order).
 * The backend recalculates authoritatively on save.
 */
export function useMarginData(formData, setFormData) {
  const [brands, setBrands] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [brandRes, marginRes] = await Promise.all([
          warehouseApi.getBrands(),
          warehouseApi.getMargins(),
        ]);
        if (cancelled) return;
        setBrands(brandRes.data.results || brandRes.data.result || []);
        setConfig(marginRes.data.result || {});
      } catch {
        if (!cancelled) toast.error("Failed to load margin settings");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedVariants = formData.variants.map((variant) =>
    resolveVariantMargin({ config, brands, formData, variant }),
  );

  const syncKey = formData.variants
    .map((v, i) => {
      const r = resolvedVariants[i];
      return `${v.purchasePrice}|${v.salePrice}|${r.error ? "x" : r.margin}`;
    })
    .join(",");

  useEffect(() => {
    setFormData((prev) => {
      let changed = false;
      const variants = prev.variants.map((v, i) => {
        const r = resolvedVariants[i];
        if (!r || r.error || isBlank(v.purchasePrice)) return v;
        const selling = String(calcSellingPrice(v.purchasePrice, r.margin));
        if (String(v.salePrice) === selling) return v;
        changed = true;
        return { ...v, salePrice: selling };
      });
      return changed ? { ...prev, variants } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  return { brands, config, resolvedVariants };
}

export const BrandSelect = ({ brands, formData, setFormData, className }) => (
  <div className="space-y-1.5 flex flex-col">
    <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
      Brand
    </label>
    <select
      value={formData.brandId || ""}
      onChange={(e) => {
        const brand = brands.find((b) => b._id === e.target.value);
        setFormData((prev) => ({
          ...prev,
          brandId: e.target.value,
          brand: brand ? brand.name : prev.brandId ? "" : prev.brand,
        }));
      }}
      className={className}>
      <option value="">{formData.brand && !formData.brandId ? `${formData.brand} (not linked)` : "No brand"}</option>
      {brands
        .filter((b) => b.isActive !== false || b._id === formData.brandId)
        .map((b) => (
          <option key={b._id} value={b._id}>
            {b.name}
            {!isBlank(b.margin) ? ` (${b.margin}%)` : ""}
          </option>
        ))}
    </select>
    <Link to="/warehouse/brands" className="text-[10px] font-bold text-primary ml-1 hover:underline">
      Manage brands
    </Link>
  </div>
);

const inputClass =
  "w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10";

const Field = ({ label, children, className = "" }) => (
  <div className={"space-y-1 flex flex-col justify-end " + className}>
    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

export const MarginPricingPanel = ({ formData, setFormData, brands, config, resolvedVariants }) => {
  const updateVariant = (index, patch) =>
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));

  const blockBadKeys = (e) => {
    if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
      <div>
        <h4 className="text-sm font-bold text-slate-900">Pricing &amp; Margin</h4>
        <p className="text-xs text-slate-600 font-medium">
          Set price and margin for each variant. Selling price = distributor purchase price + margin,
          calculated automatically. Customers only see MRP and selling price.
        </p>
      </div>

      <div className="max-w-sm">
        <BrandSelect
          brands={brands}
          formData={formData}
          setFormData={setFormData}
          className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2"
        />
        <p className="text-[10px] font-medium text-slate-500 ml-1 mt-1">
          Brand applies to all variants. Priority: Individual → Brand → Subcategory → Default.{" "}
          <Link to="/warehouse/margins" className="text-primary font-bold hover:underline">
            Margin Management
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        {formData.variants.map((variant, index) => {
          const resolved = resolvedVariants[index] || {};
          const type = variant.marginType || "auto";
          const hasPurchase = !isBlank(variant.purchasePrice);
          const selling =
            hasPurchase && !resolved.error ? calcSellingPrice(variant.purchasePrice, resolved.margin) : null;
          const overMrp = selling !== null && !isBlank(variant.price) && selling > Number(variant.price);

          return (
            <div key={variant.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-slate-800 uppercase tracking-widest truncate">
                  {variant.name || (index === 0 ? "Main Variant" : `Variant ${index + 1}`)}
                </p>
                <p className={"text-[11px] font-bold " + (resolved.error ? "text-red-600" : "text-brand-700")}>
                  {resolved.error
                    ? resolved.error
                    : `Margin: ${resolved.margin}% (${MARGIN_SOURCE_LABELS[resolved.source]})${!config ? " - loading..." : ""}`}
                </p>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <Field label="MRP" className="col-span-6 md:col-span-3">
                  <input
                    type="number"
                    min="0"
                    onKeyDown={blockBadKeys}
                    value={variant.price ?? ""}
                    onChange={(e) => updateVariant(index, { price: e.target.value })}
                    placeholder="100"
                    className={inputClass}
                  />
                </Field>
                <Field label="Distributor Purchase Price" className="col-span-6 md:col-span-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    onKeyDown={blockBadKeys}
                    value={variant.purchasePrice ?? ""}
                    onChange={(e) => updateVariant(index, { purchasePrice: e.target.value })}
                    placeholder="60"
                    className={inputClass}
                  />
                </Field>
                <Field label="Margin Type" className="col-span-6 md:col-span-3">
                  <select
                    value={type}
                    onChange={(e) => updateVariant(index, { marginType: e.target.value })}
                    className={inputClass}>
                    {MARGIN_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {["auto", "individual"].includes(type) ? (
                  <Field
                    label={type === "auto" ? "Individual Margin % (optional)" : "Individual Margin %"}
                    className="col-span-6 md:col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      onKeyDown={blockBadKeys}
                      value={variant.individualMargin ?? ""}
                      onChange={(e) => updateVariant(index, { individualMargin: e.target.value })}
                      placeholder="e.g. 30"
                      className={inputClass}
                    />
                  </Field>
                ) : (
                  <div className="hidden md:block md:col-span-3" />
                )}
              </div>

              <div
                className={
                  "px-4 py-3 rounded-xl text-sm font-black flex items-center justify-between " +
                  (overMrp ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700")
                }>
                <span className="text-[10px] uppercase tracking-widest font-bold">Selling Price (auto)</span>
                <span>{selling !== null ? `₹${selling}` : hasPurchase ? "—" : "Enter purchase price"}</span>
              </div>
              {overMrp && (
                <p className="text-[10px] font-bold text-red-600 ml-1">
                  Selling price exceeds MRP. Lower the margin or purchase price before saving.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Returns an error message when margin pricing would produce an invalid price.
export function validateMarginPricing(formData, resolvedVariants) {
  for (let i = 0; i < formData.variants.length; i += 1) {
    const v = formData.variants[i];
    if (isBlank(v.purchasePrice)) continue;
    const name = v.name || (i === 0 ? "Main Variant" : `Variant ${i + 1}`);
    const r = resolvedVariants[i];
    if (!r || r.error) return `${r?.error || "Margin not available"} (${name})`;
    if (!isBlank(v.price) && calcSellingPrice(v.purchasePrice, r.margin) > Number(v.price)) {
      return `Selling price exceeds MRP for variant: ${name}`;
    }
  }
  return null;
}
