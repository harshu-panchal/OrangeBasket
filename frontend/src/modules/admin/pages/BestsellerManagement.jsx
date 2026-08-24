import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { toast } from 'sonner';
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";

const BestsellerManagement = () => {
  const [headerCategories, setHeaderCategories] = useState([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState('all'); // 'all' for Home page
  const [allConfigs, setAllConfigs] = useState([]);
  
  const [mainCategories, setMainCategories] = useState([]);
  const [selectedMainCategoryIds, setSelectedMainCategoryIds] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchHeaderCategories();
    fetchAllConfigs();
  }, []);

  useEffect(() => {
    if (selectedHeaderId) {
      fetchMainCategories(selectedHeaderId);
      fetchBestsellerConfig(selectedHeaderId);
    }
  }, [selectedHeaderId]);

  const fetchHeaderCategories = async () => {
    try {
      const res = await adminApi.getCategories();
      if (res.data?.success) {
        const categories = res.data.results || res.data.result || [];
        const headers = categories.filter(c => c.type === 'header' && c.name?.toLowerCase() !== 'all');
        setHeaderCategories(headers);
      }
    } catch (error) {
      toast.error('Failed to load header categories');
    }
  };

  const fetchAllConfigs = async () => {
    try {
      const res = await adminApi.getAllBestsellerConfigs();
      if (res.data?.success) {
        setAllConfigs(res.data.result || res.data.results || []);
      }
    } catch (error) {
      console.error('Failed to load all configs', error);
    }
  };

  const fetchMainCategories = async (headerId) => {
    try {
      const res = await adminApi.getCategories();
      if (res.data?.success) {
        const categories = res.data.results || res.data.result || [];
        // All categories of type 'category' (main categories)
        const mainCats = categories.filter(c => c.type === 'category');
        setMainCategories(mainCats);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchBestsellerConfig = async (headerId) => {
    setLoading(true);
    try {
      const res = await adminApi.getBestsellerConfig(headerId);
      if (res.data?.success && res.data.result) {
        setSelectedMainCategoryIds(res.data.result.mainCategoryIds || []);
      } else {
        setSelectedMainCategoryIds([]);
      }
    } catch (error) {
      setSelectedMainCategoryIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminApi.updateBestsellerConfig(selectedHeaderId, {
        mainCategoryIds: selectedMainCategoryIds
      });
      if (res.data?.success) {
        toast.success('Bestseller configuration saved successfully!');
        fetchAllConfigs(); // Refresh the configured list
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (catId) => {
    setSelectedMainCategoryIds((prev) => {
      if (prev.includes(catId)) {
        return prev.filter(id => id !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Bestsellers Configuration</h1>
        <p className="text-slate-500 mt-2">Manage dynamic bestseller sections for the Home page and specific categories.</p>
      </div>

      <Card className="p-6 md:p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          
          {/* Header Category Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">Header Category (Page)</label>
            <select
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors"
              value={selectedHeaderId}
              onChange={(e) => setSelectedHeaderId(e.target.value)}
            >
              <option value="all">
                Home Page (All) {allConfigs.find(c => c.headerId === 'all') && allConfigs.find(c => c.headerId === 'all').mainCategoryIds?.length > 0 ? '✓ (Configured)' : ''}
              </option>
              {headerCategories.map((header) => {
                const config = allConfigs.find(c => c.headerId === header._id);
                const isConfigured = config && config.mainCategoryIds?.length > 0;
                return (
                  <option key={header._id} value={header._id}>
                    {header.name} {isConfigured ? `✓ (Configured)` : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-slate-500">Select which tab/page this config applies to.</p>
            
            {/* Quick links to configured pages */}
            {allConfigs.filter(c => c.mainCategoryIds?.length > 0).length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-2">Currently Configured Pages:</p>
                <div className="flex flex-wrap gap-2">
                  {allConfigs.filter(c => c.mainCategoryIds?.length > 0).map(config => {
                    let name = 'Unknown';
                    if (config.headerId === 'all') name = 'Home Page (All)';
                    else {
                      const header = headerCategories.find(h => h._id === config.headerId);
                      if (header) name = header.name;
                    }
                    return (
                      <span 
                        key={config.headerId} 
                        onClick={() => setSelectedHeaderId(config.headerId)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${selectedHeaderId === config.headerId ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-800 hover:bg-blue-300'}`}
                      >
                        {name} ({config.mainCategoryIds.length})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Multi-Select Main Categories */}
        <div className="flex flex-col gap-3 mb-8">
          <label className="text-sm font-semibold text-slate-700">Select Bestseller Categories</label>
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : mainCategories.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No categories found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mainCategories.map((cat) => (
                  <label key={cat._id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-md cursor-pointer hover:border-orange-500 transition-colors">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                      checked={selectedMainCategoryIds.includes(cat._id)}
                      onChange={() => handleCheckboxChange(cat._id)}
                    />
                    <span className="text-sm font-medium text-slate-700 truncate" title={cat.name}>
                      {cat.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">Selected categories will be displayed as bestsellers on the chosen page.</p>
        </div>

        {/* Selected Categories Display (Chips) */}
        {selectedMainCategoryIds.length > 0 && (
          <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-lg">
            <h3 className="text-sm font-semibold text-orange-800 mb-3">Currently Selected ({selectedMainCategoryIds.length})</h3>
            <div className="flex flex-wrap gap-2">
              {selectedMainCategoryIds.map(id => {
                const cat = mainCategories.find(c => c._id === id);
                if (!cat) return null;
                return (
                  <div key={id} className="flex items-center gap-1 bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full shadow-sm text-sm font-medium">
                    <span>{cat.name}</span>
                    <button 
                      onClick={() => handleCheckboxChange(id)}
                      className="ml-1 text-orange-400 hover:text-red-500 hover:bg-orange-100 rounded-full p-0.5 transition-colors focus:outline-none"
                    >
                      <X size={14} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : (
              <Save size={18} />
            )}
            Save Configuration
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BestsellerManagement;
