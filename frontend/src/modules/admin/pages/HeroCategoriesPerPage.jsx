import React, { useEffect, useState } from "react";
import {
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
  HiOutlineXMark,
} from "react-icons/hi2";
import { adminApi } from "../services/adminApi";
import Card from "@shared/components/ui/Card";
import Modal from "@shared/components/ui/Modal";
import { useToast } from "@shared/components/ui/Toast";
import { cn } from "@/lib/utils";

const emptyBannerItem = () => ({
  imageUrl: "",
  title: "",
  subtitle: "",
  linkType: "none",
  linkValue: "",
  isUploading: false,
});

const emptyPromotionalBannerItem = () => ({
  imageUrl: "",
  title: "",
  subtitle: "",
  discountPrefix: "",
  discountBadge: "",
  originalPrice: "",
  offerPrice: "",
  ctaText: "",
  icon: "",
  cardSize: "square",
  bgColor: "",
  textColor: "",
  prefixBgColor: "",
  badgeBgColor: "",
  linkType: "none",
  linkValue: "",
  isUploading: false,
});

export default function HeroCategoriesPerPage() {
  const { showToast } = useToast();
  const [headers, setHeaders] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [pageData, setPageData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formBanners, setFormBanners] = useState([emptyBannerItem()]);
  const [formBannerType, setFormBannerType] = useState("standard");
  const [formPromotionalBanners, setFormPromotionalBanners] = useState([emptyPromotionalBannerItem()]);
  const [formPromotionalBgColor, setFormPromotionalBgColor] = useState("");
  const [formCategoryIds, setFormCategoryIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const treeRes = await adminApi.getCategoryTree();
        const tree = treeRes.data?.results || treeRes.data?.result || [];
        const headerList = Array.isArray(tree) ? tree : [];
        if (cancelled) return;
        setHeaders(headerList);

        const flatCategories = headerList.flatMap((h) => (h.children || []).map((c) => ({ ...c, headerName: h.name })));
        setAllCategories(flatCategories);

        const homeRes = await adminApi.getHeroConfig({ pageType: "home" });
        const homeResult = homeRes.data?.result || homeRes.data || {};
        const homeBanners = homeResult.banners?.items || [];
        const homePromo = homeResult.promotionalBanners?.items || [];
        const homeType = homeResult.bannerType || "standard";
        const homeCatIds = homeResult.categoryIds || [];

        const rows = [
          {
            id: "home",
            label: "Home",
            pageType: "home",
            headerId: null,
            bannerType: homeType,
            bannerCount: homeType === "promotional" ? homePromo.length : homeBanners.length,
            categoryCount: homeCatIds.length,
          },
        ];

        await Promise.all(
          headerList.map(async (h) => {
            const res = await adminApi.getHeroConfig({
              pageType: "header",
              headerId: h._id,
            });
            if (cancelled) return;
            const result = res.data?.result || res.data || {};
            const items = result.banners?.items || [];
            const promoItems = result.promotionalBanners?.items || [];
            const bannerType = result.bannerType || "standard";
            const catIds = result.categoryIds || [];
            rows.push({
              id: h._id,
              label: h.name || "Unnamed",
              pageType: "header",
              headerId: h._id,
              bannerType,
              bannerCount: bannerType === "promotional" ? promoItems.length : items.length,
              categoryCount: catIds.length,
            });
          })
        );

        if (!cancelled) setPageData(rows);
      } catch (e) {
        if (!cancelled) console.error(e);
        showToast("Failed to load hero config", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [showToast]);

  const openEdit = async (row) => {
    setEditingRow(row);
    setFormCategoryIds([]);
    setFormBanners([emptyBannerItem()]);
    setFormBannerType("standard");
    setFormPromotionalBanners([emptyPromotionalBannerItem()]);
    try {
      const res = await adminApi.getHeroConfig({
        pageType: row.pageType,
        headerId: row.headerId || undefined,
      });
      const result = res.data?.result || res.data || {};
      const items = result.banners?.items || [];
      const catIds = result.categoryIds || [];
      const promoItems = result.promotionalBanners?.items || [];
      
      setFormBannerType(result.bannerType || "standard");
      setFormPromotionalBgColor(result.promotionalBanners?.bgColor || "");
      setFormBanners(
        items.length
          ? items.map((b) => ({ ...b, isUploading: false }))
          : [emptyBannerItem()]
      );
      setFormPromotionalBanners(
        promoItems.length
          ? promoItems.map((b, i) => i === 4 ? { ...b, subtitle: "", discountPrefix: "", discountBadge: "", originalPrice: "", offerPrice: "", isUploading: false } : { ...b, isUploading: false })
          : [emptyPromotionalBannerItem()]
      );
      setFormCategoryIds(Array.isArray(catIds) ? catIds : []);
    } catch (e) {
      console.error(e);
    }
    setModalOpen(true);
  };

  const updateBannerItem = (idx, changes) => {
    setFormBanners((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...changes };
      return next;
    });
  };

  const addBannerItem = () => {
    setFormBanners((prev) => [...prev, emptyBannerItem()]);
  };

  const removeBannerItem = (idx) => {
    setFormBanners((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleBannerFileChange = async (idx, file) => {
    if (!file) return;
    updateBannerItem(idx, { isUploading: true });
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminApi.uploadExperienceBanner(fd);
      const url = res.data?.result?.url || res.data?.url;
      if (!url) throw new Error("Upload failed");
      updateBannerItem(idx, { imageUrl: url, isUploading: false });
      showToast("Banner image uploaded", "success");
    } catch (e) {
      console.error(e);
      updateBannerItem(idx, { isUploading: false });
      showToast("Failed to upload banner image", "error");
    }
  };

  const updatePromoBannerItem = (idx, changes) => {
    setFormPromotionalBanners((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...changes };
      return next;
    });
  };

  const addPromoBannerItem = () => {
    if (formPromotionalBanners.length >= 7) {
      showToast("Maximum layout capacity (7 items) reached.", "error");
      return;
    }
    setFormPromotionalBanners((prev) => [...prev, emptyPromotionalBannerItem()]);
  };

  const removePromoBannerItem = (idx) => {
    setFormPromotionalBanners((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePromoBannerFileChange = async (idx, file) => {
    if (!file) return;
    updatePromoBannerItem(idx, { isUploading: true });
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await adminApi.uploadExperienceBanner(fd);
      const url = res.data?.result?.url || res.data?.url;
      if (!url) throw new Error("Upload failed");
      updatePromoBannerItem(idx, { imageUrl: url, isUploading: false });
      showToast("Promotional banner image uploaded", "success");
    } catch (e) {
      console.error(e);
      updatePromoBannerItem(idx, { isUploading: false });
      showToast("Failed to upload image", "error");
    }
  };

  const toggleCategory = (catId) => {
    setFormCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    const items = formBanners.filter((b) => b.imageUrl).map((b) => ({
      imageUrl: b.imageUrl,
      title: b.title || "",
      subtitle: b.subtitle || "",
      linkType: b.linkType || "none",
      linkValue: b.linkValue || "",
      status: b.status || "active",
    }));

    const promoItems = formPromotionalBanners
      .filter((b) => b.title || b.imageUrl || b.ctaText || b.subtitle || b.discountBadge || b.discountPrefix)
      .map((b, idx) => {
        if (idx === 4) {
          return {
            imageUrl: b.imageUrl || "",
            title: b.title || "",
            subtitle: "",
            discountPrefix: "",
            discountBadge: "",
            originalPrice: 0,
            offerPrice: 0,
            ctaText: b.ctaText || "",
            icon: b.icon || "",
            cardSize: b.cardSize || "square",
            bgColor: b.bgColor || "",
            textColor: b.textColor || "",
            badgeBgColor: b.badgeBgColor || "",
            linkType: b.linkType || "none",
            linkValue: b.linkValue || "",
            status: b.status || "active",
          };
        }
        return {
          imageUrl: b.imageUrl || "",
          title: b.title || "",
          subtitle: b.subtitle || "",
          discountPrefix: b.discountPrefix || "",
          discountBadge: b.discountBadge || "",
          originalPrice: Number(b.originalPrice) || 0,
          offerPrice: Number(b.offerPrice) || 0,
          ctaText: b.ctaText || "",
          icon: b.icon || "",
          cardSize: b.cardSize || "square",
          bgColor: b.bgColor || "",
          textColor: b.textColor || "",
          prefixBgColor: b.prefixBgColor || "",
          badgeBgColor: b.badgeBgColor || "",
          linkType: b.linkType || "none",
          linkValue: b.linkValue || "",
          status: b.status || "active",
        };
      });

    if (!editingRow) return;
    setSaving(true);
    try {
      await adminApi.setHeroConfig({
        pageType: editingRow.pageType,
        headerId: editingRow.headerId || undefined,
        bannerType: formBannerType,
        banners: { items },
        promotionalBanners: { items: promoItems, bgColor: formPromotionalBgColor },
        categoryIds: formCategoryIds,
      });
      showToast("Hero config saved", "success");
      setPageData((prev) =>
        prev.map((p) =>
          p.id === editingRow.id
            ? {
                ...p,
                bannerType: formBannerType,
                bannerCount: formBannerType === "promotional" ? promoItems.length : items.length,
                categoryCount: formCategoryIds.length,
              }
            : p
        )
      );
      setModalOpen(false);
      setEditingRow(null);
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          Hero & categories per page
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure the <strong>separate</strong> hero banners and categories strip at the top of each page.
          If a header page has no config, the storefront shows the home page hero and categories.
          Create Sections are for the main content area only.
        </p>
      </div>

      <Card className="p-4 md:p-6 border border-slate-100 bg-white rounded-xl shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-bold">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Page
                  </th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hero (top banners)
                  </th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Categories below hero
                  </th>
                  <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-slate-50 last:border-0",
                      "hover:bg-slate-50/50 transition-colors"
                    )}
                  >
                    <td className="py-4 pr-4">
                      <span className="font-bold text-slate-800">{row.label}</span>
                    </td>
                    <td className="py-4 pr-4">
                      {row.bannerCount > 0 ? (
                        <span className="text-xs font-semibold text-slate-600">
                          {row.bannerCount} banner(s)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      {row.categoryCount > 0 ? (
                        <span className="text-xs font-semibold text-slate-600">
                          {row.categoryCount} categor
                          {row.categoryCount === 1 ? "y" : "ies"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                      >
                        <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        This is a <strong>separate</strong> hero section. Experience sections in Create Sections
        are unchanged and used for the main content area below.
      </p>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingRow ? `Edit hero & categories — ${editingRow.label}` : "Edit"}
        size="xl"
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        }
      >
        {editingRow && (
          <div className="space-y-6">
            <div className="flex gap-4 p-2 bg-slate-50 rounded-xl mb-4">
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  formBannerType === "standard"
                    ? "bg-white shadow-sm text-primary"
                    : "text-slate-500 hover:bg-slate-100"
                )}
                onClick={() => setFormBannerType("standard")}
              >
                Standard Slider
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                  formBannerType === "promotional"
                    ? "bg-white shadow-sm text-primary"
                    : "text-slate-500 hover:bg-slate-100"
                )}
                onClick={() => setFormBannerType("promotional")}
              >
                Promotional Bento Grid
              </button>
            </div>

            {formBannerType === "standard" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Hero banners
                  </label>
                  <button
                    type="button"
                    onClick={addBannerItem}
                    className="flex items-center gap-1 text-[10px] font-bold text-primary"
                  >
                    <HiOutlinePlus className="h-3 w-3" />
                    Add banner
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {formBanners.map((item, idx) => (
                    <Card key={idx} className="p-3 bg-white border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title || `Banner ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <HiOutlinePhoto className="h-6 w-6 text-slate-300" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                id={`hero-banner-file-${idx}`}
                                onChange={(e) => handleBannerFileChange(idx, e.target.files?.[0])}
                              />
                              <div className="flex items-center gap-2">
                                <label
                                  htmlFor={`hero-banner-file-${idx}`}
                                  className="inline-block px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600 cursor-pointer hover:bg-slate-200"
                                >
                                  {item.isUploading ? "Uploading…" : item.imageUrl ? "Change" : "Upload"}
                                </label>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  Recommended: 1200 × 500 px (2.4:1 ratio)
                                </span>
                              </div>
                              <input
                                value={item.title || ""}
                                onChange={(e) => updateBannerItem(idx, { title: e.target.value })}
                                className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                                placeholder="Title (optional)"
                              />
                              <input
                                value={item.subtitle || ""}
                                onChange={(e) => updateBannerItem(idx, { subtitle: e.target.value })}
                                className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none outline-none"
                                placeholder="Subtitle (optional)"
                              />
                            </div>
                          </div>
                        </div>
                        {formBanners.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBannerItem(idx)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <HiOutlineXMark className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Promotional Deals
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500">Wrapper BG:</span>
                      <input
                        type="color"
                        value={formPromotionalBgColor || "#ffffff"}
                        onChange={(e) => setFormPromotionalBgColor(e.target.value)}
                        className="w-5 h-5 rounded border border-slate-200 cursor-pointer p-0 bg-white"
                      />
                      {formPromotionalBgColor && (
                        <button
                          type="button"
                          onClick={() => setFormPromotionalBgColor("")}
                          className="text-[9px] text-primary hover:underline font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addPromoBannerItem}
                    disabled={formPromotionalBanners.length >= 7}
                    className="flex items-center gap-1 text-[10px] font-bold text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <HiOutlinePlus className="h-3 w-3" />
                    Add deal card
                  </button>
                </div>
                {/* Image Size Guidance Box */}
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl mb-4 text-xs text-amber-900 space-y-1 font-medium">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <span>💡 Recommended Image Sizes (to prevent cropping):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="font-bold block text-slate-800">Card 1 (Left Tall Card)</span>
                      <span className="text-amber-800 font-semibold">400 × 600 px</span> (Portrait 2:3 or Transparent PNG)
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="font-bold block text-slate-800">Cards 2–5 (Square Grid)</span>
                      <span className="text-amber-800 font-semibold">400 × 400 px</span> (Square 1:1 or Transparent PNG)
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                      <span className="font-bold block text-slate-800">Cards 6+ (Bottom Strips)</span>
                      <span className="text-amber-800 font-semibold">1200 × 300 px</span> (Wide Strip 4:1)
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {formPromotionalBanners.map((item, idx) => {
                    return (
                    <Card key={idx} className="p-4 bg-slate-50/50 border-slate-100 relative">
                      {formPromotionalBanners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePromoBannerItem(idx)}
                          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <HiOutlineXMark className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="flex flex-col md:flex-row gap-4 mb-4 pr-8">
                        <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt="Deal image"
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <HiOutlinePhoto className="h-8 w-8 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={`promo-banner-file-${idx}`}
                            onChange={(e) => handlePromoBannerFileChange(idx, e.target.files?.[0])}
                          />
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <label
                              htmlFor={`promo-banner-file-${idx}`}
                              className="inline-block px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 shadow-xs"
                            >
                              {item.isUploading ? "Uploading…" : item.imageUrl ? "Change Image" : "Upload Image"}
                            </label>
                            {item.imageUrl && (
                              <button
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { imageUrl: "" })}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 cursor-pointer hover:bg-rose-100"
                              >
                                Remove Image
                              </button>
                            )}
                            <span className="text-[10px] font-bold text-slate-600 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1 rounded-md">
                              {idx === 0 
                                ? "Size: 400 × 600 px (Portrait 2:3)" 
                                : idx >= 1 && idx <= 4 
                                ? "Size: 400 × 400 px (Square 1:1)" 
                                : "Size: 1200 × 300 px (Strip 4:1)"}
                            </span>
                          </div>
                          {idx !== 4 && (
                            <div className={`grid gap-3 ${idx === 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              <input
                                value={item.title || ""}
                                onChange={(e) => updatePromoBannerItem(idx, { title: e.target.value })}
                                className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                                placeholder="Title (e.g. Tote Bag)"
                              />
                              {idx === 0 && (
                                <input
                                  value={item.subtitle || ""}
                                  onChange={(e) => updatePromoBannerItem(idx, { subtitle: e.target.value })}
                                  className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                                  placeholder="Subtitle (e.g. TOP DEALS)"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {(idx === 0 || (idx >= 1 && idx <= 3)) && (
                        <div className="grid gap-3 grid-cols-2 mt-3">
                          {idx >= 1 && idx <= 3 && (
                            <>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-500">Badge Prefix</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="color"
                                      value={item.prefixBgColor || "#3d3d3d"}
                                      onChange={(e) => updatePromoBannerItem(idx, { prefixBgColor: e.target.value })}
                                      className="w-4 h-4 rounded border border-slate-200 cursor-pointer p-0 bg-white"
                                      title="Prefix Color"
                                    />
                                    {item.prefixBgColor && (
                                      <button
                                        type="button"
                                        onClick={() => updatePromoBannerItem(idx, { prefixBgColor: "" })}
                                        className="text-[9px] text-slate-400 hover:text-slate-600"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <input
                                  value={item.discountPrefix || ""}
                                  onChange={(e) => updatePromoBannerItem(idx, { discountPrefix: e.target.value })}
                                  className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                                  placeholder="e.g. Up to"
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-slate-500">Discount Badge</label>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="color"
                                      value={item.badgeBgColor || "#ba9686"}
                                      onChange={(e) => updatePromoBannerItem(idx, { badgeBgColor: e.target.value })}
                                      className="w-4 h-4 rounded border border-slate-200 cursor-pointer p-0 bg-white"
                                      title="Badge Color"
                                    />
                                    {item.badgeBgColor && (
                                      <button
                                        type="button"
                                        onClick={() => updatePromoBannerItem(idx, { badgeBgColor: "" })}
                                        className="text-[9px] text-slate-400 hover:text-slate-600"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <input
                                  value={item.discountBadge || ""}
                                  onChange={(e) => updatePromoBannerItem(idx, { discountBadge: e.target.value })}
                                  className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                                  placeholder="e.g. 65% OFF"
                                />
                              </div>
                            </>
                          )}
                          {idx === 0 && (
                            <>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">Orig. Price (₹)</label>
                                <input
                                  type="number"
                                  value={item.originalPrice || ""}
                                  onChange={(e) => updatePromoBannerItem(idx, { originalPrice: e.target.value })}
                                  className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                                  placeholder="5499"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500">Offer Price (₹)</label>
                                <input
                                  type="number"
                                  value={item.offerPrice || ""}
                                  onChange={(e) => updatePromoBannerItem(idx, { offerPrice: e.target.value })}
                                  className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                                  placeholder="1469"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {idx >= 5 && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">CTA Text (for strips)</label>
                            <input
                              value={item.ctaText || ""}
                              onChange={(e) => updatePromoBannerItem(idx, { ctaText: e.target.value })}
                              className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                              placeholder="e.g. BUY 2 AT ₹489"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">CTA Subtext</label>
                            <input
                              value={item.icon || ""}
                              onChange={(e) => updatePromoBannerItem(idx, { icon: e.target.value })}
                              className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                              placeholder="e.g. on Jewellery"
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
                         <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500">Redirection Type</label>
                          <select
                            value={item.linkType || "none"}
                            onChange={(e) => updatePromoBannerItem(idx, { linkType: e.target.value })}
                            className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                          >
                            <option value="none">None</option>
                            <option value="category">Category</option>
                            <option value="subcategory">Subcategory</option>
                            <option value="product">Product ID</option>
                            <option value="url">External URL</option>
                          </select>
                        </div>
                        {item.linkType && item.linkType !== "none" && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">
                              {item.linkType === "category" ? "Category Slug/ID" :
                               item.linkType === "subcategory" ? "Subcategory Slug/ID" :
                               item.linkType === "product" ? "Product ID" : "External URL"}
                            </label>
                            <input
                              value={item.linkValue || ""}
                              onChange={(e) => updatePromoBannerItem(idx, { linkValue: e.target.value })}
                              className="w-full p-2 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                              placeholder={
                                item.linkType === "category" ? "e.g. grocery or 60d5ec..." :
                                item.linkType === "subcategory" ? "e.g. fresh-fruits or 60d5ec..." :
                                item.linkType === "product" ? "e.g. 60d5ec..." :
                                "e.g. https://google.com"
                              }
                            />
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {item.linkType === "category" && "Enter the exact category slug or MongoDB ID."}
                              {item.linkType === "subcategory" && "Enter the exact subcategory slug or MongoDB ID."}
                              {item.linkType === "product" && "Enter the exact Product ID."}
                              {item.linkType === "url" && "Enter the full URL starting with https://"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Color Options */}
                      <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                            <span>Card Background</span>
                            {item.bgColor && (
                              <button
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { bgColor: "" })}
                                className="text-[9px] text-primary hover:underline font-semibold"
                              >
                                Reset
                              </button>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={item.bgColor || "#f1e5df"}
                              onChange={(e) => updatePromoBannerItem(idx, { bgColor: e.target.value })}
                              className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                            />
                            <input
                              value={item.bgColor || ""}
                              onChange={(e) => updatePromoBannerItem(idx, { bgColor: e.target.value })}
                              className="w-full p-1.5 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                              placeholder="Default / #HEX"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            {["#f1e5df", "#ffe5d9", "#d8f3dc", "#f3e8ff", "#ffe5ec", "#ffffff", "#1e293b"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { bgColor: preset })}
                                style={{ backgroundColor: preset }}
                                title={preset}
                                className={cn(
                                  "w-4 h-4 rounded-full border border-slate-300 hover:scale-110 transition-transform shadow-xs",
                                  item.bgColor === preset && "ring-2 ring-primary ring-offset-1"
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                            <span>Text Color</span>
                            {item.textColor && (
                              <button
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { textColor: "" })}
                                className="text-[9px] text-primary hover:underline font-semibold"
                              >
                                Reset
                              </button>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={item.textColor || "#0f172a"}
                              onChange={(e) => updatePromoBannerItem(idx, { textColor: e.target.value })}
                              className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                            />
                            <input
                              value={item.textColor || ""}
                              onChange={(e) => updatePromoBannerItem(idx, { textColor: e.target.value })}
                              className="w-full p-1.5 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                              placeholder="Default text / #HEX"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            {["#0f172a", "#692934", "#1e3a8a", "#064e3b", "#ffffff"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { textColor: preset })}
                                style={{ backgroundColor: preset }}
                                title={preset}
                                className={cn(
                                  "w-4 h-4 rounded-full border border-slate-300 hover:scale-110 transition-transform shadow-xs",
                                  item.textColor === preset && "ring-2 ring-primary ring-offset-1"
                                )}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 flex items-center justify-between">
                            <span>Badge Color</span>
                            {item.badgeBgColor && (
                              <button
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { badgeBgColor: "" })}
                                className="text-[9px] text-primary hover:underline font-semibold"
                              >
                                Reset
                              </button>
                            )}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={item.badgeBgColor || "#3d3d3d"}
                              onChange={(e) => updatePromoBannerItem(idx, { badgeBgColor: e.target.value })}
                              className="w-7 h-7 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
                            />
                            <input
                              value={item.badgeBgColor || ""}
                              onChange={(e) => updatePromoBannerItem(idx, { badgeBgColor: e.target.value })}
                              className="w-full p-1.5 bg-white rounded-lg text-xs border border-slate-200 outline-none"
                              placeholder="Default badge / #HEX"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            {["#3d3d3d", "#dc2626", "#ea580c", "#16a34a", "#2563eb", "#7c3aed"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updatePromoBannerItem(idx, { badgeBgColor: preset })}
                                style={{ backgroundColor: preset }}
                                title={preset}
                                className={cn(
                                  "w-4 h-4 rounded-full border border-slate-300 hover:scale-110 transition-transform shadow-xs",
                                  item.badgeBgColor === preset && "ring-2 ring-primary ring-offset-1"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Categories below hero
              </label>
              <div className="flex flex-wrap gap-2">
                {allCategories.map((c) => {
                  const isSelected = formCategoryIds.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleCategory(c._id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                      )}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
              {allCategories.length === 0 && (
                <p className="text-xs text-slate-400">No main categories found. Add categories in Header / Main Categories first.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

