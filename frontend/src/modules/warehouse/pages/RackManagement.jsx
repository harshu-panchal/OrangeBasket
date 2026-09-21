import React, { useState, useEffect } from "react";
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";
import Badge from "@shared/components/ui/Badge";
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineXMark,
  HiOutlineArchiveBox,
  HiOutlineCube,
  HiOutlineBuildingStorefront,
} from "react-icons/hi2";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { warehouseApi } from "../services/warehouseApi";

const emptyForm = { rackCode: "", name: "", description: "", capacity: "" };

const RackManagement = () => {
  const [racks, setRacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRack, setEditingRack] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedRack, setSelectedRack] = useState(null);
  const [selectedRackProducts, setSelectedRackProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadRacks = async () => {
    try {
      setLoading(true);
      const res = await warehouseApi.getRacks();
      if (res.data.success) {
        setRacks(res.data.result || res.data.results || []);
      }
    } catch (error) {
      toast.error("Failed to load racks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRacks();
  }, []);

  const openCreateModal = () => {
    setEditingRack(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (rack) => {
    setEditingRack(rack);
    setForm({
      rackCode: rack.rackCode,
      name: rack.name || "",
      description: rack.description || "",
      capacity: rack.capacity || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.rackCode.trim()) {
      toast.error("Rack code is required");
      return;
    }
    setSaving(true);
    try {
      if (editingRack) {
        await warehouseApi.updateRack(editingRack._id, form);
        toast.success("Rack updated");
      } else {
        await warehouseApi.createRack(form);
        toast.success("Rack created");
      }
      setIsModalOpen(false);
      loadRacks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save rack");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rack) => {
    if (!window.confirm(`Delete rack "${rack.rackCode}"?`)) return;
    try {
      await warehouseApi.deleteRack(rack._id);
      toast.success("Rack deleted");
      if (selectedRack?._id === rack._id) setSelectedRack(null);
      loadRacks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete rack");
    }
  };

  const viewRackProducts = async (rack) => {
    setSelectedRack(rack);
    setLoadingProducts(true);
    try {
      const res = await warehouseApi.getRackById(rack._id);
      if (res.data.success) {
        setSelectedRackProducts(res.data.result?.products || []);
      }
    } catch (error) {
      toast.error("Failed to load rack products");
    } finally {
      setLoadingProducts(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            Rack Management
          </h1>
          <p className="text-slate-600 text-sm mt-0.5 font-medium">
            Create rack/shelf locations and see which products are stored where.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2 w-fit">
          <HiOutlinePlus className="h-4 w-4" />
          Add Rack
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Rack list */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-lg bg-white overflow-hidden">
            {loading ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : racks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-3">
                  <HiOutlineBuildingStorefront className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No racks yet</h3>
                <p className="text-xs text-slate-600 font-medium text-center mt-1">
                  Create your first rack to start assigning product locations.
                </p>
                <Button className="mt-4 text-xs" onClick={openCreateModal}>
                  <HiOutlinePlus className="h-4 w-4 mr-1" />
                  Add Rack
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {racks.map((rack) => (
                  <div
                    key={rack._id}
                    onClick={() => viewRackProducts(rack)}
                    className={`flex items-center justify-between gap-3 p-4 cursor-pointer transition-colors hover:bg-slate-50/60 ${
                      selectedRack?._id === rack._id ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black text-sm">
                        {rack.rackCode}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {rack.name || rack.rackCode}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {rack.productCount || 0} product(s)
                          {rack.capacity ? ` • Capacity ${rack.capacity}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(rack);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                      >
                        <HiOutlinePencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(rack);
                        }}
                        className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Selected rack products */}
        <div>
          <Card className="border-none shadow-xl ring-1 ring-slate-100 rounded-lg bg-white overflow-hidden sticky top-4">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <HiOutlineArchiveBox className="h-4 w-4 text-primary" />
                {selectedRack ? `Rack ${selectedRack.rackCode}` : "Select a rack"}
              </h3>
            </div>
            <div className="p-4 max-h-[500px] overflow-y-auto">
              {!selectedRack ? (
                <p className="text-xs text-slate-500 font-medium text-center py-8">
                  Click a rack to see which products are stored there.
                </p>
              ) : loadingProducts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : selectedRackProducts.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium text-center py-8">
                  No products assigned to this rack yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedRackProducts.map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/70 ring-1 ring-slate-100"
                    >
                      <div className="h-9 w-9 rounded-lg overflow-hidden bg-white ring-1 ring-slate-200 shrink-0">
                        {p.mainImage ? (
                          <img src={p.mainImage} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-300">
                            <HiOutlineCube className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{p.barcode || p.sku}</p>
                      </div>
                      <Badge variant={p.stock > 0 ? "success" : "error"} className="text-[9px] shrink-0">
                        {p.stock}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="w-full max-w-md relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">
                {editingRack ? "Edit Rack" : "Add Rack"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Rack Code *
                </label>
                <input
                  value={form.rackCode}
                  onChange={(e) => setForm({ ...form, rackCode: e.target.value })}
                  placeholder="e.g. A1"
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Dry Goods Aisle"
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Capacity
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-100 border-none rounded-md text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/10 min-h-[70px] resize-none"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingRack ? "Save Changes" : "Create Rack"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RackManagement;
