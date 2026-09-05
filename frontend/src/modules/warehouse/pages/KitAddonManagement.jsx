import React, { useState, useEffect, useRef } from 'react';
import warehouseApi from '../../../core/api/axios';
import { toast } from 'sonner';
import {
    Plus, Trash2, Pencil, Loader2, Save, X, Upload,
    Package, Eye, EyeOff, GripVertical, ImageIcon
} from 'lucide-react';

const emptyForm = {
    name: '',
    description: '',
    price: '',
    unit: '1 kg',
    stock: '',
    maxQtyPerOrder: 10,
    sortOrder: 0,
    status: 'active',
    mainImage: null,
    mainImageFile: null,
};

const KitAddonManagement = () => {
    const [addons, setAddons] = useState([]);
    const [kits, setKits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ ...emptyForm, applicableKits: [] });
    const fileInputRef = useRef(null);

    const fetchAddonsAndKits = async () => {
        try {
            const [addonsRes, kitsRes] = await Promise.all([
                warehouseApi.get('/kits/warehouse/addons'),
                warehouseApi.get('/kits/warehouse')
            ]);
            setAddons(addonsRes.data.results || addonsRes.data.result || addonsRes.data.data || []);
            setKits(kitsRes.data.results || kitsRes.data.result || kitsRes.data.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddonsAndKits();
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                mainImageFile: file,
                mainImage: URL.createObjectURL(file),
            }));
        }
    };

    const openCreate = () => {
        setEditId(null);
        setFormData({ ...emptyForm, applicableKits: [] });
        setShowForm(true);
    };

    const openEdit = (addon) => {
        setEditId(addon._id);
        setFormData({
            name: addon.name || '',
            description: addon.description || '',
            price: addon.price || '',
            unit: addon.unit || '1 kg',
            stock: addon.stock || '',
            maxQtyPerOrder: addon.maxQtyPerOrder || 10,
            sortOrder: addon.sortOrder || 0,
            status: addon.status || 'active',
            mainImage: addon.mainImage || null,
            applicableKits: addon.applicableKits || [],
            mainImageFile: null,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Item name is required');
            return;
        }
        if (!formData.price || Number(formData.price) <= 0) {
            toast.error('Valid price is required');
            return;
        }

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('name', formData.name);
            fd.append('description', formData.description);
            fd.append('price', formData.price);
            fd.append('unit', formData.unit);
            fd.append('stock', formData.stock || 0);
            fd.append('maxQtyPerOrder', formData.maxQtyPerOrder);
            fd.append('sortOrder', formData.sortOrder);
            fd.append('status', formData.status);
            fd.append('applicableKits', JSON.stringify(formData.applicableKits));

            if (formData.mainImageFile) {
                fd.append('mainImage', formData.mainImageFile);
            }

            if (editId) {
                await warehouseApi.put(`/kits/warehouse/addons/${editId}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Add-on item updated!');
            } else {
                await warehouseApi.post('/kits/warehouse/addons', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Add-on item created!');
            }

            setShowForm(false);
            setEditId(null);
            setFormData({ ...emptyForm, applicableKits: [] });
            fetchAddonsAndKits();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save add-on item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this add-on item?')) return;
        try {
            await warehouseApi.delete(`/kits/warehouse/addons/${id}`);
            toast.success('Add-on item deleted');
            fetchAddonsAndKits();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete add-on item');
        }
    };

    const handleToggleStatus = async (addon) => {
        try {
            const newStatus = addon.status === 'active' ? 'inactive' : 'active';
            await warehouseApi.put(`/kits/warehouse/addons/${addon._id}`, { status: newStatus });
            toast.success(`Item ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            fetchAddonsAndKits();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Kit Add-On Items</h1>
                    <p className="text-slate-500 font-medium">
                        Manage add-on items (Atta, Oil, Rice) that customers can add to their monthly basket
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Add New Item
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 rounded-t-3xl flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-900">
                                {editId ? 'Edit Add-On Item' : 'Create Add-On Item'}
                            </h2>
                            <button
                                onClick={() => { setShowForm(false); setEditId(null); }}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Item Image</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-full h-48 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 cursor-pointer overflow-hidden group transition-colors bg-slate-50"
                                >
                                    {formData.mainImage ? (
                                        <>
                                            <img
                                                src={formData.mainImage}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Upload className="h-8 w-8 text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <Upload className="h-10 w-10 mb-2" />
                                            <p className="text-sm font-semibold">Click to upload image</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. Atta, Oil, Rice"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Premium quality wheat flour..."
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium resize-none"
                                />
                            </div>

                            {/* Price & Unit */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Price (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                                        placeholder="200"
                                        min="0"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Unit</label>
                                    <input
                                        type="text"
                                        value={formData.unit}
                                        onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                                        placeholder="1 kg, 1 L, 5 kg"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Stock & Max Qty */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Stock</label>
                                    <input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData(p => ({ ...p, stock: e.target.value }))}
                                        placeholder="100"
                                        min="0"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Max Qty/Order</label>
                                    <input
                                        type="number"
                                        value={formData.maxQtyPerOrder}
                                        onChange={(e) => setFormData(p => ({ ...p, maxQtyPerOrder: e.target.value }))}
                                        placeholder="10"
                                        min="1"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Sort Order & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData(p => ({ ...p, sortOrder: e.target.value }))}
                                        placeholder="0"
                                        min="0"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Applicable Kits (Multi-select) */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Applicable Monthly Baskets</label>
                                <p className="text-xs text-slate-500 mb-2">Select which monthly baskets this add-on applies to. If none are selected, it applies to ALL baskets.</p>
                                <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto bg-slate-50">
                                    {kits.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-500">No monthly baskets found</div>
                                    ) : (
                                        kits.map(kit => (
                                            <label key={kit._id} className="flex items-center gap-3 p-3 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-b-0">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                                    checked={formData.applicableKits.includes(kit._id)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            applicableKits: checked 
                                                                ? [...prev.applicableKits, kit._id]
                                                                : prev.applicableKits.filter(id => id !== kit._id)
                                                        }));
                                                    }}
                                                />
                                                <div className="flex items-center gap-2 flex-1">
                                                    {kit.mainImage && (
                                                        <img src={kit.mainImage} alt="" className="w-6 h-6 rounded object-cover" />
                                                    )}
                                                    <span className="text-sm font-semibold text-slate-700">{kit.name}</span>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 rounded-b-3xl flex gap-3">
                            <button
                                onClick={() => { setShowForm(false); setEditId(null); }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="h-5 w-5" /> {editId ? 'Update' : 'Create'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Items List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : addons.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-12 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-black text-slate-900 mb-2">No Add-On Items Yet</h3>
                    <p className="text-slate-500 font-medium mb-6">
                        Create add-on items like Atta, Oil, Rice that customers can add to their monthly basket
                    </p>
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-5 w-5" />
                        Create First Item
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {addons.map((addon) => (
                        <div
                            key={addon._id}
                            className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                                addon.status === 'inactive' ? 'opacity-60 border-slate-200' : 'border-slate-100'
                            }`}
                        >
                            {/* Image */}
                            <div className="relative h-44 bg-gradient-to-br from-slate-50 to-slate-100">
                                {addon.mainImage ? (
                                    <img
                                        src={addon.mainImage}
                                        alt={addon.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-12 w-12 text-slate-300" />
                                    </div>
                                )}
                                {/* Status badge */}
                                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    addon.status === 'active'
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-400 text-white'
                                }`}>
                                    {addon.status === 'active' ? 'Active' : 'Inactive'}
                                </div>
                                {/* Price badge */}
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-black text-slate-900 shadow-sm">
                                    ₹{addon.price}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <h3 className="text-lg font-black text-slate-900 mb-1">{addon.name}</h3>
                                {addon.description && (
                                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-3">{addon.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mb-4">
                                    <span className="bg-slate-100 px-2 py-1 rounded-lg">{addon.unit}</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded-lg">Stock: {addon.stock}</span>
                                    <span className="bg-slate-100 px-2 py-1 rounded-lg">Max: {addon.maxQtyPerOrder}/order</span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleStatus(addon)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                                            addon.status === 'active'
                                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                    >
                                        {addon.status === 'active' ? (
                                            <><EyeOff className="h-4 w-4" /> Hide</>
                                        ) : (
                                            <><Eye className="h-4 w-4" /> Show</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => openEdit(addon)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(addon._id)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KitAddonManagement;
