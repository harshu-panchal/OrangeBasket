import React, { useState, useEffect } from "react";
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";
import Badge from "@shared/components/ui/Badge";
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { warehouseApi } from "../services/warehouseApi";

const inputClass =
  "w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/10";

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const loadBrands = async () => {
    try {
      const res = await warehouseApi.getBrands();
      setBrands(res.data.results || res.data.result || []);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a brand name");
      return;
    }
    setCreating(true);
    try {
      await warehouseApi.createBrand({ name: name.trim() });
      toast.success("Brand added");
      setName("");
      await loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add brand");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (brand) => {
    if (!editName.trim()) {
      toast.error("Brand name cannot be empty");
      return;
    }
    try {
      await warehouseApi.updateBrand(brand._id, { name: editName.trim() });
      toast.success("Brand updated");
      setEditingId(null);
      await loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update brand");
    }
  };

  const handleToggle = async (brand) => {
    try {
      await warehouseApi.updateBrand(brand._id, { isActive: !brand.isActive });
      await loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update brand");
    }
  };

  const handleDelete = async (brand) => {
    const note = brand.productCount
      ? ` ${brand.productCount} product(s) use it and will lose their brand margin link.`
      : "";
    if (!window.confirm(`Delete brand "${brand.name}"?${note}`)) return;
    try {
      await warehouseApi.deleteBrand(brand._id);
      toast.success("Brand deleted");
      await loadBrands();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete brand");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Brand Management</h1>
        <p className="text-slate-600 text-sm mt-0.5 font-medium">
          Add the brands/companies you stock. They appear in product listing and in{" "}
          <Link to="/warehouse/margins" className="text-primary font-bold hover:underline">
            Margin Management
          </Link>{" "}
          where you can set a margin per brand.
        </p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Brand / company name, e.g. Tata"
            className={inputClass}
          />
          <Button type="submit" disabled={creating} className="shrink-0">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <HiOutlinePlus className="h-4 w-4 mr-2" />}
            Add Brand
          </Button>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : brands.length === 0 ? (
          <p className="p-10 text-center text-sm font-semibold text-slate-500">No brands yet. Add your first brand above.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {brands.map((brand) => (
              <div key={brand._id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  {editingId === brand._id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(brand)}
                      className={inputClass}
                    />
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-900 truncate">{brand.name}</p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {brand.productCount} product(s) ·{" "}
                        {brand.margin !== null && brand.margin !== undefined ? `${brand.margin}% margin` : "no brand margin"}
                      </p>
                    </>
                  )}
                </div>
                <Badge variant={brand.isActive ? "success" : "gray"}>{brand.isActive ? "Active" : "Inactive"}</Badge>
                <div className="flex items-center gap-1">
                  {editingId === brand._id ? (
                    <>
                      <button onClick={() => handleRename(brand)} className="p-2 rounded-lg hover:bg-slate-100 text-emerald-600" title="Save">
                        <HiOutlineCheck className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Cancel">
                        <HiOutlineXMark className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(brand._id);
                          setEditName(brand.name);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Rename">
                        <HiOutlinePencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(brand)}
                        className="px-2 py-1 rounded-lg hover:bg-slate-100 text-[11px] font-bold text-slate-600">
                        {brand.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => handleDelete(brand)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BrandManagement;
