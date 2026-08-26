import React, { useState, useMemo, useEffect } from "react";
import Button from "@shared/components/ui/Button";
import Badge from "@shared/components/ui/Badge";
import {
  HiOutlineArrowLeft,
  HiOutlineCube,
  HiOutlineTag,
  HiOutlineCurrencyDollar,
  HiOutlineSwatch,
  HiOutlineFolderOpen,
  HiOutlinePhoto,
  HiOutlineScale,
  HiOutlineArrowPath,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineSquaresPlus,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { HiOutlinePhotograph } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { warehouseApi } from "../services/warehouseApi";

export const PRESET_HIGHLIGHT_ICONS = [
  { id: "leaf", emoji: "🌿", name: "Natural / Organic" },
  { id: "avocado", emoji: "🥑", name: "Farm Fresh" },
  { id: "zap", emoji: "⚡", name: "High Protein" },
  { id: "sprout", emoji: "🌱", name: "Source of Fiber" },
  { id: "shield", emoji: "🛡️", name: "Quality / Certified" },
  { id: "heart", emoji: "❤️", name: "Healthy / Low Fat" },
  { id: "star", emoji: "⭐", name: "Premium Quality" },
  { id: "truck", emoji: "🚚", name: "Fast Express Delivery" },
  { id: "wheat", emoji: "🌾", name: "Whole Grain / Pure" },
  { id: "sugarfree", emoji: "🍬", name: "Sugar Free" },
  { id: "sun", emoji: "☀️", name: "Sun Dried" },
  { id: "smile", emoji: "😊", name: "Chemical Free" },
];

const AddProduct = () => {
  const navigate = useNavigate();
  const [modalTab, setModalTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [variantImageFiles, setVariantImageFiles] = useState({});

  const makeSku = (name, index = 1) => {
    const prefix =
      String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5) || "item";
    return `${prefix}-${String(index).padStart(3, "0")}`;
  };

  const isAutoSku = (sku, name, index = 1) =>
    String(sku || "").toLowerCase() === makeSku(name, index);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    sku: "",
    description: "",
    price: "",
    salePrice: "",
    stock: "",
    lowStockAlert: 5,
    category: "",
    subcategory: "",
    header: "",
    status: "active",
    tags: "",
    weight: "",
    brand: "",
    shelfLife: "",
    countryOfOrigin: "",
    fssaiLicense: "",
    mainImage: null,
    galleryImages: [],
    highlights: [
      { icon: "leaf", label: "100% Natural" },
      { icon: "avocado", label: "Farm Fresh" },
      { icon: "zap", label: "High Protein" },
      { icon: "sprout", label: "Source of Fiber" },
    ],
    variants: [
      {
        id: Date.now(),
        name: "",
        price: "",
        salePrice: "",
        stock: "",
        sku: "",
      },
    ],
  });

  const [dbCategories, setDbCategories] = useState([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.name) return prev;

      const nextSku =
        !prev.sku || isAutoSku(prev.sku, prev.name, 1)
          ? makeSku(prev.name, 1)
          : prev.sku;

      const nextVariants = prev.variants.map((variant, idx) => {
        const variantIndex = idx + 1;
        const shouldAuto =
          !variant.sku || isAutoSku(variant.sku, prev.name, variantIndex);
        return shouldAuto
          ? { ...variant, sku: makeSku(prev.name, variantIndex) }
          : variant;
      });

      const changed =
        nextSku !== prev.sku ||
        nextVariants.some((variant, idx) => variant !== prev.variants[idx]);

      return changed ? { ...prev, sku: nextSku, variants: nextVariants } : prev;
    });
  }, [formData.name]);

  React.useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await warehouseApi.getCategoryTree();
        if (res.data.success) {
          setDbCategories(res.data.results || res.data.result || []);
        }
      } catch (error) {
        toast.error("Failed to load categories");
      } finally {
        setIsLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  const categories = dbCategories;

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name) {
      toast.error("Please fill in the Product Title");
      return;
    }

    // Validate all three category levels are selected
    if (!formData.header || !formData.category || !formData.subcategory) {
      toast.error("Please select all three category levels: Main Group, Specific Category, and Sub-Category");
      return;
    }

    const firstVariant = formData.variants[0] || {};
    if (!firstVariant.price || !firstVariant.stock) {
      toast.error("Main variant must have price and stock");
      return;
    }

    // Validate variants price vs salePrice
    const invalidVariant = formData.variants.find((v) => v.salePrice && Number(v.salePrice) > Number(v.price));
    if (invalidVariant) {
      toast.error(`Sale Price cannot be greater than Price for variant: ${invalidVariant.name || 'Main Variant'}`);
      return;
    }
    setIsSaving(true);
    try {
      const data = new FormData();

      // Basic fields
      data.append("name", formData.name);
      data.append("slug", formData.slug);
      data.append("sku", formData.sku);
      data.append("description", formData.description);
      data.append("tags", formData.tags);
      data.append("weight", formData.weight);
      data.append("brand", formData.brand);
      data.append("shelfLife", formData.shelfLife);
      data.append("countryOfOrigin", formData.countryOfOrigin);
      data.append("fssaiLicense", formData.fssaiLicense);
      data.append("status", formData.status);

      // Map top-level price/stock from first variant for indexing/listing
      data.append("price", firstVariant.price);
      data.append("salePrice", firstVariant.salePrice || 0);
      data.append("stock", firstVariant.stock);

      // Category IDs
      data.append("headerId", formData.header);
      data.append("categoryId", formData.category);
      data.append("subcategoryId", formData.subcategory);

      // Variants
      data.append("variants", JSON.stringify(formData.variants));

      // Append variant image files
      Object.keys(variantImageFiles).forEach((vIndex) => {
        const filesArray = variantImageFiles[vIndex];
        if (Array.isArray(filesArray)) {
           filesArray.forEach((file, imgIndex) => {
              if (file) {
                 data.append(`variantImage_${vIndex}_${imgIndex}`, file);
              }
           });
        } else if (filesArray instanceof File || (filesArray && typeof filesArray === 'object' && filesArray.name)) {
           data.append(`variantImage_${vIndex}_0`, filesArray);
        }
      });

      // Highlights
      data.append("highlights", JSON.stringify(formData.highlights || []));

      const response = await warehouseApi.createProduct(data);
      const approvalStatus = response?.data?.result?.approvalStatus;
      if (approvalStatus === "pending") {
        toast.success("Product submitted for admin approval");
      } else {
        toast.success(response?.data?.message || "Product saved successfully!");
      }
      navigate("/warehouse/products");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e, type) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "main") {
          setFormData({
            ...formData,
            mainImage: reader.result,
            mainImageFile: file
          });
        } else {
          setFormData({
            ...formData,
            galleryImages: [...formData.galleryImages, reader.result],
            galleryFiles: [...(formData.galleryFiles || []), file]
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Button
          variant="ghost"
          className="pl-0 hover:bg-transparent hover:text-primary-600"
          onClick={() => navigate(-1)}>
          <HiOutlineArrowLeft className="mr-2 h-5 w-5" />
          Back to Products
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="min-w-[140px]">
            {isSaving ? (
              <>
                <HiOutlineArrowPath className="mr-2 h-5 w-5 animate-spin" />
                Publishing...
              </>
            ) : (
              "Save & Publish"
            )}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-slate-100">
        {/* Sidebar Tabs */}
        <div className="md:w-64 bg-slate-50/50 border-r border-slate-100 p-4 space-y-1 overflow-y-auto">
          {[
            { id: "general", label: "General Info", icon: HiOutlineTag },
            { id: "variants", label: "Item Variants", icon: HiOutlineSwatch },
            { id: "category", label: "Groups", icon: HiOutlineFolderOpen },
            { id: "highlights", label: "Highlights", icon: HiOutlineSparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setModalTab(tab.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-md text-xs font-bold transition-all text-left",
                modalTab === tab.id
                  ? "bg-white text-primary shadow-sm ring-1 ring-slate-100"
                  : "text-slate-600 hover:bg-slate-100",
              )}>
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}

          <div className="pt-8 px-4">
            <div className="p-4 bg-brand-50 rounded-md border border-brand-100">
              <p className="text-[9px] font-bold text-brand-600 uppercase tracking-widest mb-1">
                Status
              </p>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full bg-transparent border-none text-xs font-bold text-brand-700 outline-none p-0 cursor-pointer focus:ring-0">
                <option value="active">PUBLISHED</option>
                <option value="inactive">DRAFT</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {modalTab === "general" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Product Title
                </label>
                <input
                  value={formData.name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name: nextName,
                      sku:
                        !prev.sku || isAutoSku(prev.sku, prev.name, 1)
                          ? makeSku(nextName, 1)
                          : prev.sku,
                      variants: prev.variants.map((variant, idx) => {
                        const variantIndex = idx + 1;
                        const shouldAuto =
                          !variant.sku ||
                          isAutoSku(variant.sku, prev.name, variantIndex);
                        return shouldAuto
                          ? { ...variant, sku: makeSku(nextName, variantIndex) }
                          : variant;
                      }),
                    }));
                  }}
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                  placeholder="e.g. Premium Basmati Rice"
                />
              </div>
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                  About this item
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-semibold min-h-[160px] max-h-[260px] outline-none transition-all focus:ring-2 focus:ring-primary/5 resize-none overflow-y-auto custom-scrollbar"
                  placeholder="Describe the item here..."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Brand Name
                  </label>
                  <input
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="e.g. Amul"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Product Code
                  </label>
                  <input
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-mono font-bold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="AUTO-GENERATED"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Shelf Life
                  </label>
                  <input
                    value={formData.shelfLife}
                    onChange={(e) => setFormData({ ...formData, shelfLife: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="e.g. 3 Days, 6 Months"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Country of Origin
                  </label>
                  <input
                    value={formData.countryOfOrigin}
                    onChange={(e) => setFormData({ ...formData, countryOfOrigin: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="e.g. India"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    FSSAI License
                  </label>
                  <input
                    value={formData.fssaiLicense}
                    onChange={(e) => setFormData({ ...formData, fssaiLicense: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none ring-primary/5 focus:ring-2 transition-all"
                    placeholder="e.g. 100123..."
                  />
                </div>
              </div>
            </div>
          )}

          {modalTab === "variants" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Product Variants
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Add different sizes, colors or weights.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: [
                        ...prev.variants,
                        {
                          id: Date.now(),
                          name: "",
                          price: "",
                          salePrice: "",
                          stock: "",
                          sku: makeSku(prev.name, prev.variants.length + 1),
                        },
                      ],
                    }))
                  }
                  className="flex items-center space-x-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-all">
                  <HiOutlineSquaresPlus className="h-4 w-4" />
                  <span>ADD VARIANT</span>
                </button>
              </div>

              <div className="space-y-3">
                {(formData.variants || []).map((variant, index) => (
                  <div key={variant.id} className="grid grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative group">
                    <div className="col-span-12 md:col-span-3 space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Variant Name
                      </label>
                      <input
                        value={variant.name}
                        onChange={(e) => {
                          setFormData((prev) => {
                            const newVariants = [...prev.variants];
                            newVariants[index].name = e.target.value;
                            return {
                              ...prev,
                              variants: newVariants,
                            };
                          });
                        }}
                        placeholder="e.g. 1kg, 1 pack, 1 liter..."
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        value={variant.price}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;

                          if (val !== '' && variant.salePrice && Number(val) < Number(variant.salePrice)) {
                            toast.error("Regular price cannot be less than sale price");
                            return;
                          }

                          const newVariants = [...formData.variants];
                          newVariants[index].price = val;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder="500"
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1 flex flex-col justify-end">
                      <label className="text-[8px] font-bold text-brand-500 uppercase tracking-widest ml-1">
                        Sale
                      </label>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        value={variant.salePrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;

                          if (val !== '' && variant.price && Number(val) > Number(variant.price)) {
                            toast.error("Sale price cannot be greater than regular price");
                            return;
                          }

                          const newVariants = [...formData.variants];
                          newVariants[index].salePrice = val;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder="450"
                        className="w-full px-3 py-2 bg-brand-50 ring-1 ring-brand-100 border-none rounded-xl text-xs font-bold text-brand-700 outline-none focus:ring-2 focus:ring-brand-200"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        value={variant.stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;
                          const newVariants = [...formData.variants];
                          newVariants[index].stock = val;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-5 md:col-span-2 space-y-1 flex flex-col justify-end">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                        Product Code
                      </label>
                      <input
                        value={variant.sku}
                        onChange={(e) => {
                          const newVariants = [...formData.variants];
                          newVariants[index].sku = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                        placeholder={makeSku(formData.name, index + 1)}
                        className="w-full px-3 py-2 bg-white ring-1 ring-slate-200 border-none rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                    <div className="col-span-1 flex justify-end pb-1 flex-col pb-2">
                      <button
                        onClick={() => {
                          if (formData.variants.length > 1) {
                            setFormData((prev) => {
                              const remaining = prev.variants
                                .map((variant, idx) => ({ variant, oldIndex: idx + 1 }))
                                .filter((item) => item.oldIndex !== index + 1)
                                .map((item, newIdx) => {
                                  const shouldAuto =
                                    !item.variant.sku ||
                                    isAutoSku(item.variant.sku, prev.name, item.oldIndex);
                                  return {
                                    ...item.variant,
                                    sku: shouldAuto ? makeSku(prev.name, newIdx + 1) : item.variant.sku,
                                  };
                                });

                              const newFiles = { ...variantImageFiles };
                              delete newFiles[index];
                              
                              // Re-index variant images
                              const reindexedFiles = {};
                              Object.keys(newFiles).forEach(key => {
                                 const numKey = Number(key);
                                 if (numKey > index) {
                                    reindexedFiles[numKey - 1] = newFiles[key];
                                 } else {
                                    reindexedFiles[numKey] = newFiles[key];
                                 }
                              });
                              setVariantImageFiles(reindexedFiles);

                              return { ...prev, variants: remaining };
                            });
                          }
                        }}
                        className={`p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ${formData.variants.length === 1 ? "opacity-50 cursor-not-allowed" : ""
                          }`}>
                        <HiOutlineTrash className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Variant Images Row */}
                    <div className="col-span-12 mt-2 pt-3 border-t border-slate-200">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block ml-1">Variant Images (Max 5)</label>
                        <div className="flex gap-3 w-full overflow-x-auto pb-2 custom-scrollbar">
                           {[0, 1, 2, 3, 4].map(imgIdx => (
                              <div key={imgIdx} className="relative h-16 w-16 shrink-0 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-primary/50 overflow-hidden cursor-pointer flex items-center justify-center transition-colors">
                                 {variantImageFiles[index]?.[imgIdx] ? (
                                     <img src={URL.createObjectURL(variantImageFiles[index][imgIdx])} alt="" className="h-full w-full object-cover" />
                                 ) : variant.images?.[imgIdx] ? (
                                     <img src={variant.images[imgIdx]} alt="" className="h-full w-full object-cover" />
                                 ) : (
                                     <HiOutlinePhotograph className="h-5 w-5 text-slate-300" />
                                 )}
                                 <input
                                     type="file"
                                     accept="image/*"
                                     className="absolute inset-0 opacity-0 cursor-pointer"
                                     onChange={e => {
                                         if (e.target.files?.[0]) {
                                             const newFiles = [...(variantImageFiles[index] || [])];
                                             newFiles[imgIdx] = e.target.files[0];
                                             setVariantImageFiles({ ...variantImageFiles, [index]: newFiles });
                                         }
                                     }}
                                 />
                              </div>
                           ))}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modalTab === "category" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Main Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.header}
                    onChange={(e) =>
                      setFormData({ ...formData, header: e.target.value, category: "", subcategory: "" })
                    }
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/5 transition-all">
                    <option value="">Select Main Group</option>
                    {categories.map((h) => (
                      <option key={h._id || h.id} value={h._id || h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Specific Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value, subcategory: "" })
                    }
                    disabled={!formData.header}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Select Category</option>
                    {categories
                      .find((h) => (h._id || h.id) === formData.header)
                      ?.children?.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                    Sub-Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) =>
                      setFormData({ ...formData, subcategory: e.target.value })
                    }
                    disabled={!formData.category}
                    className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Select Sub-Category</option>
                    {categories
                      .find((h) => (h._id || h.id) === formData.header)
                      ?.children?.find((c) => (c._id || c.id) === formData.category)
                      ?.children?.map((sc) => (
                        <option key={sc._id || sc.id} value={sc._id || sc.id}>
                          {sc.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {modalTab === "highlights" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Product Highlight Badges (4 Slots)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Select icons and enter custom text labels to display product highlights on the product page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const currentHighlight = formData.highlights?.[slotIdx] || { icon: "leaf", label: "" };
                  return (
                    <div key={slotIdx} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Highlight #{slotIdx + 1}
                        </span>
                        <span className="text-xl">
                          {PRESET_HIGHLIGHT_ICONS.find((i) => i.id === currentHighlight.icon)?.emoji || "🌿"}
                        </span>
                      </div>

                      {/* Icon Selector Grid */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Select Icon
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                          {PRESET_HIGHLIGHT_ICONS.map((ic) => (
                            <button
                              key={ic.id}
                              type="button"
                              onClick={() => {
                                const nextHL = [...(formData.highlights || [])];
                                nextHL[slotIdx] = { ...currentHighlight, icon: ic.id };
                                setFormData({ ...formData, highlights: nextHL });
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                currentHighlight.icon === ic.id
                                  ? "bg-brand-50 border-primary text-primary shadow-xs"
                                  : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                              )}
                            >
                              <span>{ic.emoji}</span>
                              <span className="text-[10px]">{ic.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title Input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Heading / Title Text
                        </label>
                        <input
                          type="text"
                          value={currentHighlight.label}
                          onChange={(e) => {
                            const nextHL = [...(formData.highlights || [])];
                            nextHL[slotIdx] = { ...currentHighlight, label: e.target.value };
                            setFormData({ ...formData, highlights: nextHL });
                          }}
                          placeholder="e.g. 100% Natural"
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
