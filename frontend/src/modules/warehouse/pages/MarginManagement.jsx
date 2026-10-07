import React, { useState, useEffect, useMemo } from "react";
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { warehouseApi } from "../services/warehouseApi";

const TABS = [
  { id: "default", label: "Default Margin" },
  { id: "category", label: "Category Margin" },
  { id: "brand", label: "Brand Margin" },
];

const inputClass =
  "w-24 px-3 py-2 bg-slate-100 border-none rounded-lg text-sm font-bold text-right outline-none focus:ring-2 focus:ring-primary/10";

// One row: label + margin % input + Save. Blank value clears the margin.
const MarginRow = ({ label, sublabel, value, onSave, clearable = true }) => {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const dirty = String(draft) !== String(value ?? "");

  const save = async () => {
    if (draft === "" && !clearable) {
      toast.error("Enter a margin percentage");
      return;
    }
    if (draft !== "" && (Number(draft) < 0 || Number(draft) > 1000)) {
      toast.error("Margin must be between 0 and 1000");
      return;
    }
    setSaving(true);
    try {
      await onSave(draft === "" ? null : Number(draft));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save margin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{label}</p>
        {sublabel && <p className="text-[11px] font-semibold text-slate-500 truncate">{sublabel}</p>}
      </div>
      <input
        type="number"
        min="0"
        step="0.01"
        onKeyDown={(e) => {
          if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
        }}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="—"
        className={inputClass}
      />
      <span className="text-sm font-bold text-slate-500">%</span>
      <Button size="sm" onClick={save} disabled={!dirty || saving} className="min-w-[64px]">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
};

const MarginManagement = () => {
  const [tab, setTab] = useState("default");
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ defaultMargin: 0, subcategoryMargins: [] });
  const [brands, setBrands] = useState([]);
  const [tree, setTree] = useState([]);
  const [search, setSearch] = useState("");
  const [recalculating, setRecalculating] = useState(false);

  const load = async () => {
    try {
      const [marginRes, brandRes, treeRes] = await Promise.all([
        warehouseApi.getMargins(),
        warehouseApi.getBrands(),
        warehouseApi.getCategoryTree(),
      ]);
      setConfig(marginRes.data.result);
      setBrands(brandRes.data.results || brandRes.data.result || []);
      setTree(treeRes.data.results || treeRes.data.result || []);
    } catch {
      toast.error("Failed to load margin settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const subMarginMap = useMemo(
    () => Object.fromEntries((config.subcategoryMargins || []).map((s) => [String(s.subcategoryId), s.margin])),
    [config],
  );

  const saveDefault = async (margin) => {
    const res = await warehouseApi.setDefaultMargin(margin);
    setConfig((c) => ({ ...c, defaultMargin: res.data.result.defaultMargin }));
    toast.success("Default margin saved");
  };

  const saveSubcategory = async (id, margin) => {
    const res = await warehouseApi.setSubcategoryMargin(id, margin);
    setConfig((c) => ({ ...c, subcategoryMargins: res.data.result.subcategoryMargins }));
    toast.success(margin === null ? "Subcategory margin cleared" : "Subcategory margin saved");
  };

  const saveBrand = async (id, margin) => {
    const res = await warehouseApi.setBrandMargin(id, margin);
    setBrands((list) => list.map((b) => (b._id === id ? { ...b, margin: res.data.result.margin } : b)));
    toast.success(margin === null ? "Brand margin cleared" : "Brand margin saved");
  };

  const handleRecalculate = async () => {
    if (!window.confirm("Recalculate selling prices of all products that have a distributor purchase price using the current margins?")) return;
    setRecalculating(true);
    try {
      const res = await warehouseApi.recalculatePrices();
      const { updated, skipped } = res.data.result;
      toast.success(`Updated ${updated} product(s)`);
      if (skipped?.length) {
        toast.warning(`${skipped.length} product(s) skipped (selling price would exceed MRP): ${skipped.slice(0, 3).map((s) => s.name).join(", ")}${skipped.length > 3 ? "…" : ""}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to recalculate prices");
    } finally {
      setRecalculating(false);
    }
  };

  const term = search.trim().toLowerCase();

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Margin Management</h1>
          <p className="text-slate-600 text-sm mt-0.5 font-medium">
            Selling price = distributor purchase price + margin. Priority: Individual product → Brand → Subcategory → Default.
          </p>
        </div>
        <Button variant="outline" onClick={handleRecalculate} disabled={recalculating}>
          {recalculating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Apply to existing products
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
              tab === t.id ? "bg-primary text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {tab === "default" && (
            <Card className="p-0 overflow-hidden">
              <MarginRow
                label="Default margin"
                sublabel="Used when a product has no individual, brand or subcategory margin."
                value={config.defaultMargin}
                clearable={false}
                onSave={saveDefault}
              />
            </Card>
          )}

          {tab === "category" && (
            <div className="space-y-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subcategory..."
                className="w-full max-w-sm px-4 py-2 bg-white ring-1 ring-slate-200 border-none rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/10"
              />
              {tree.map((header) => (
                <Card key={header._id} className="p-0 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 text-xs font-black uppercase tracking-widest text-slate-700">
                    {header.name}
                  </div>
                  {(header.children || []).map((category) => {
                    const subs = (category.children || []).filter(
                      (s) => !term || s.name.toLowerCase().includes(term),
                    );
                    if (subs.length === 0) return null;
                    return (
                      <div key={category._id}>
                        <div className="px-4 pt-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
                          {category.name}
                        </div>
                        <div className="divide-y divide-slate-100">
                          {subs.map((sub) => (
                            <MarginRow
                              key={sub._id}
                              label={sub.name}
                              value={subMarginMap[String(sub._id)]}
                              onSave={(m) => saveSubcategory(sub._id, m)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </Card>
              ))}
              {tree.length === 0 && <p className="text-sm font-semibold text-slate-500">No categories found.</p>}
            </div>
          )}

          {tab === "brand" && (
            <Card className="p-0 overflow-hidden">
              {brands.length === 0 ? (
                <p className="p-10 text-center text-sm font-semibold text-slate-500">
                  No brands yet.{" "}
                  <Link to="/warehouse/brands" className="text-primary font-bold hover:underline">
                    Add brands in Brand Management
                  </Link>
                  .
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {brands.map((brand) => (
                    <MarginRow
                      key={brand._id}
                      label={brand.name}
                      sublabel={`${brand.productCount ?? 0} product(s)`}
                      value={brand.margin}
                      onSave={(m) => saveBrand(brand._id, m)}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MarginManagement;
