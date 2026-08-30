import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, Loader2, Image as ImageIcon, Link as LinkIcon, Palette } from 'lucide-react';
import * as festivalService from '../services/festivalDeals.service';
import adminApi from '@core/api/axios';

const FestivalDealsAdmin = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form states for config
  const [isEnabled, setIsEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [viewAllText, setViewAllText] = useState('');
  const [viewAllUrl, setViewAllUrl] = useState('');
  const [viewAllEnabled, setViewAllEnabled] = useState(true);

  // Form states for modal
  const defaultCardState = {
    title: '',
    offerText: '',
    image: '',
    backgroundColor: '#FFF8E7',
    textColor: '#B45309',
    buttonColor: '#D97706',
    buttonText: 'SHOP NOW',
    redirectType: 'custom',
    redirectUrl: '',
    isActive: true,
  };
  const [cardForm, setCardForm] = useState(defaultCardState);

  const fetchConfig = async () => {
    try {
      const data = await festivalService.getFestivalDeals();
      setConfig(data);
      setIsEnabled(data.isEnabled || false);
      setTitle(data.title || 'Top Festival Deals');
      setViewAllEnabled(data.viewAll?.enabled ?? true);
      setViewAllText(data.viewAll?.text || 'View All');
      setViewAllUrl(data.viewAll?.url || '');
    } catch (error) {
      toast.error('Failed to load Festival Deals config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await festivalService.updateFestivalDeals({
        title,
        isEnabled,
        viewAll: {
          enabled: viewAllEnabled,
          text: viewAllText,
          url: viewAllUrl
        }
      });
      toast.success('Configuration saved successfully');
      fetchConfig();
    } catch (error) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await adminApi.post('/admin/experience/upload-banner', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const url = response.data.result.url;
      setCardForm(prev => ({ ...prev, image: url }));
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const openAddModal = () => {
    setEditingCard(null);
    setCardForm(defaultCardState);
    setIsModalOpen(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setCardForm(card);
    setIsModalOpen(true);
  };

  const handleSaveCard = async () => {
    if (!cardForm.title || !cardForm.image) {
      return toast.error("Title and Image are required");
    }
    
    try {
      if (editingCard) {
        await festivalService.updateCard(editingCard._id, cardForm);
        toast.success("Card updated");
      } else {
        await festivalService.addCard(cardForm);
        toast.success("Card added");
      }
      setIsModalOpen(false);
      fetchConfig();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving card");
    }
  };

  const handleDeleteCard = async (id) => {
    if (!window.confirm("Are you sure you want to delete this card?")) return;
    try {
      await festivalService.deleteCard(id);
      toast.success("Card deleted");
      fetchConfig();
    } catch (error) {
      toast.error("Error deleting card");
    }
  };

  const handleReorder = async (index, direction) => {
    if (!config?.cards) return;
    const newCards = [...config.cards];
    if (direction === 'up' && index > 0) {
      [newCards[index - 1], newCards[index]] = [newCards[index], newCards[index - 1]];
    } else if (direction === 'down' && index < newCards.length - 1) {
      [newCards[index + 1], newCards[index]] = [newCards[index], newCards[index + 1]];
    } else {
      return;
    }
    
    const orderedIds = newCards.map(c => c._id);
    try {
      await festivalService.reorderCards(orderedIds);
      fetchConfig();
    } catch (error) {
      toast.error("Error reordering cards");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Festival Deals</h1>
          <p className="text-slate-500 font-medium">Manage the dynamic festival deals section on the homepage.</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Save Config
        </button>
      </div>

      {/* Main Config Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Section Configuration</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="font-bold text-slate-700">Display Section</span>
            <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
              <input type="checkbox" className="hidden" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">Section Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-primary/50" 
            />
          </div>
          <div className="space-y-1.5 flex flex-col justify-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={viewAllEnabled} onChange={e => setViewAllEnabled(e.target.checked)} className="w-4 h-4 rounded text-primary border-slate-300" />
              <span className="text-sm font-bold text-slate-700">Show "View All" Link</span>
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">View All Text</label>
            <input 
              type="text" 
              disabled={!viewAllEnabled}
              value={viewAllText} 
              onChange={e => setViewAllText(e.target.value)} 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-primary/50 disabled:opacity-50" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">View All URL</label>
            <input 
              type="text" 
              disabled={!viewAllEnabled}
              value={viewAllUrl} 
              onChange={e => setViewAllUrl(e.target.value)} 
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-primary/50 disabled:opacity-50" 
            />
          </div>
        </div>
      </div>

      {/* Cards List Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Deal Cards ({config?.cards?.length || 0})
          </h2>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Card
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {config?.cards?.map((card, index) => (
            <div key={card._id} className="relative group rounded-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ backgroundColor: card.backgroundColor }}>
              {/* Preview similar to frontend */}
              <div className="p-4 flex flex-col items-center flex-1 text-center">
                <h3 className="font-bold text-sm mb-2" style={{ color: card.textColor }}>{card.title}</h3>
                <div className="h-32 w-full flex items-center justify-center my-2">
                  {card.image ? (
                    <img src={card.image} alt={card.title} className="h-full object-contain drop-shadow-md" />
                  ) : (
                    <div className="h-full w-full bg-black/5 rounded-xl flex items-center justify-center">No Image</div>
                  )}
                </div>
                <div className="font-black mt-auto" style={{ color: card.textColor }}>{card.offerText}</div>
              </div>
              <div className="p-3 w-full">
                <div className="w-full py-2 rounded-xl font-black text-xs text-center text-white shadow-sm" style={{ backgroundColor: card.buttonColor }}>
                  {card.buttonText}
                </div>
              </div>

              {/* Admin Overlay actions (Permanently visible) */}
              <div className="absolute top-2 right-2 flex flex-col gap-1.5 z-10">
                <button onClick={() => openEditModal(card)} className="bg-white border border-slate-200 text-slate-900 p-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors" title="Edit">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDeleteCard(card._id)} className="bg-white border border-rose-200 text-rose-500 hover:text-white hover:bg-rose-500 p-1.5 rounded-lg shadow-sm transition-colors" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                  <button onClick={() => handleReorder(index, 'up')} disabled={index === 0} className="text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors disabled:opacity-30" title="Move Up">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => handleReorder(index, 'down')} disabled={index === config.cards.length - 1} className="text-slate-700 hover:bg-slate-100 p-1 rounded-md transition-colors disabled:opacity-30" title="Move Down">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
              
              {!card.isActive && (
                <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
                  INACTIVE
                </div>
              )}
            </div>
          ))}

          {(!config?.cards || config.cards.length === 0) && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
              <ImageIcon className="h-12 w-12 mb-3 opacity-20" />
              <p className="font-bold">No cards added yet.</p>
              <button onClick={openAddModal} className="text-primary font-bold mt-2 hover:underline">Click here to add your first deal card</button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Add/Edit Card */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-slate-900">{editingCard ? 'Edit Deal Card' : 'Add Deal Card'}</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer mr-4">
                  <input type="checkbox" checked={cardForm.isActive} onChange={e => setCardForm({...cardForm, isActive: e.target.checked})} className="w-4 h-4 rounded text-primary border-slate-300" />
                  <span className="text-sm font-bold text-slate-700">Active</span>
                </label>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Card Heading (e.g., Mega Grocery Sale)</label>
                  <input type="text" value={cardForm.title} onChange={e => setCardForm({...cardForm, title: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-primary/50" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Offer Text (e.g., UP TO 40% OFF)</label>
                  <input type="text" value={cardForm.offerText} onChange={e => setCardForm({...cardForm, offerText: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-primary/50" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Card Image</label>
                  <div className="flex gap-4 items-center">
                    {cardForm.image && <img src={cardForm.image} alt="preview" className="h-16 w-16 object-contain border border-slate-200 rounded-lg p-1 bg-slate-50" />}
                    <label className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl cursor-pointer font-bold transition-colors flex-1">
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      {isUploading ? 'Uploading...' : 'Upload Image'}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-5">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Redirect Configuration</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {['category', 'product', 'custom'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setCardForm({...cardForm, redirectType: type})}
                        className={`py-2 rounded-lg font-bold text-xs capitalize border ${cardForm.redirectType === type ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="text" 
                    placeholder={`Enter ${cardForm.redirectType} ID or URL`}
                    value={cardForm.redirectUrl} 
                    onChange={e => setCardForm({...cardForm, redirectUrl: e.target.value})} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-primary/50 mt-2" 
                  />
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 mt-2 flex items-start gap-2">
                    <span className="text-blue-500 text-sm mt-0.5">💡</span>
                    <p className="text-[11px] text-blue-700 font-medium leading-tight">
                      {cardForm.redirectType === 'category' && "Paste a specific Category ID here. (You can also paste a full https:// link if you prefer)."}
                      {cardForm.redirectType === 'product' && "Paste a specific Product ID here. (You can also paste a full https:// link if you prefer)."}
                      {cardForm.redirectType === 'custom' && "Use a custom path like /search?q=apple, or paste any full https:// website link."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-800 font-bold mb-4 border-b border-slate-200 pb-2"><Palette className="h-4 w-4" /> Theme Colors</div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex justify-between">Background Color <span>{cardForm.backgroundColor}</span></label>
                  <div className="flex gap-2">
                    <input type="color" value={cardForm.backgroundColor} onChange={e => setCardForm({...cardForm, backgroundColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border-0 p-0" />
                    <input type="text" value={cardForm.backgroundColor} onChange={e => setCardForm({...cardForm, backgroundColor: e.target.value})} className="flex-1 border border-slate-200 rounded-lg px-3 text-sm font-medium outline-none focus:border-primary/50 uppercase" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex justify-between">Text & Heading Color <span>{cardForm.textColor}</span></label>
                  <div className="flex gap-2">
                    <input type="color" value={cardForm.textColor} onChange={e => setCardForm({...cardForm, textColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border-0 p-0" />
                    <input type="text" value={cardForm.textColor} onChange={e => setCardForm({...cardForm, textColor: e.target.value})} className="flex-1 border border-slate-200 rounded-lg px-3 text-sm font-medium outline-none focus:border-primary/50 uppercase" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex justify-between">Button Background Color <span>{cardForm.buttonColor}</span></label>
                  <div className="flex gap-2">
                    <input type="color" value={cardForm.buttonColor} onChange={e => setCardForm({...cardForm, buttonColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border-0 p-0" />
                    <input type="text" value={cardForm.buttonColor} onChange={e => setCardForm({...cardForm, buttonColor: e.target.value})} className="flex-1 border border-slate-200 rounded-lg px-3 text-sm font-medium outline-none focus:border-primary/50 uppercase" />
                  </div>
                </div>

                <div className="space-y-1.5 mt-4">
                  <label className="text-xs font-bold text-slate-700">Button Text</label>
                  <input type="text" value={cardForm.buttonText} onChange={e => setCardForm({...cardForm, buttonText: e.target.value})} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-primary/50 uppercase" />
                </div>
              </div>

            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 mt-auto sticky bottom-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleSaveCard} className="px-6 py-2.5 rounded-xl font-black text-white bg-primary hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
                Save Card
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FestivalDealsAdmin;
