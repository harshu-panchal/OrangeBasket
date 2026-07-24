import React, { useState, useEffect } from 'react';
import adminApi from '../../../core/api/axios';
import { toast } from 'sonner';
import { Plus, Package, Loader2, Save, Upload, Trash2, Edit } from 'lucide-react';

const MonthlyBasketCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const fetchCategories = async () => {
        try {
            const response = await adminApi.get('/categories');
            const allCats = response.data.results || response.data.result || [];
            setCategories(allCats.filter(c => c.isKitCategory));
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !imageFile) {
            toast.error("Name and Image are required");
            return;
        }

        setIsSubmitting(true);
        try {
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-kit-' + Date.now();
            const formData = new FormData();
            formData.append('name', name);
            formData.append('slug', slug);
            formData.append('type', 'header');
            formData.append('isKitCategory', 'true');
            formData.append('image', imageFile);

            await adminApi.post('/admin/categories', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('Kit Category created successfully');
            setName('');
            setImageFile(null);
            setImagePreview(null);
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to create category');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this kit category?")) return;
        try {
            await adminApi.delete(`/admin/categories/${id}`);
            toast.success("Category deleted");
            fetchCategories();
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete category");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
            {/* Left: Create Form */}
            <div className="w-full md:w-1/3">
                <div className="mb-6">
                    <h1 className="text-2xl font-black text-slate-900">Kit Categories</h1>
                    <p className="text-slate-500 font-medium">Create and manage basket categories</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        New Category
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Category Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                                placeholder="e.g. Monthly Essentials"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Image</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden relative">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <Upload className="w-6 h-6 mb-2 text-slate-400" />
                                        <p className="text-xs text-slate-500 font-bold">Upload Image</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} required />
                            </label>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-primary text-white font-black rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                            {isSubmitting ? 'Saving...' : 'Create Category'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Right: List */}
            <div className="w-full md:w-2/3">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full pt-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full pt-32 pb-32 text-slate-400">
                            <Package className="h-16 w-16 mb-4 text-slate-200" />
                            <p className="font-bold text-lg text-slate-500">No Kit Categories Found</p>
                            <p className="text-sm">Create one using the form.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-black">
                                    <th className="p-4 pl-6">Category Details</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {categories.map(cat => (
                                    <tr key={cat._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-14 w-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-inner">
                                                    {cat.image ? (
                                                        <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Package className="h-6 w-6 m-auto text-slate-400 mt-4" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-lg">{cat.name}</p>
                                                    <p className="text-xs font-bold text-primary">Kit Category</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(cat._id)}
                                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete Category"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonthlyBasketCategories;
