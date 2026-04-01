import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { CarsAdmin } from './CarsAdmin';
import { LeadsAdmin } from './LeadsAdmin';
import { FeedbackAdmin } from './FeedbackAdmin';
import { MediaAdmin } from '../components/MediaAdmin';
import { CalculatorAdmin } from './CalculatorAdmin';

export const Admin = () => {
  const [activeTab, setActiveTab] = useState<'deals' | 'cars' | 'leads' | 'media' | 'feedback' | 'calculator'>('leads');
  const [deals, setDeals] = useState<any[]>([]);
  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/admin/deals', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      const data = await res.json();
      setDeals(data);
    } catch (err) {
      console.error('Failed to fetch deals', err);
    }
  };

  const handleSave = async (deal: any) => {
    try {
      if (deal.id) {
        await fetch(`/api/admin/deals/${deal.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: JSON.stringify(deal),
        });
      } else {
        await fetch('/api/admin/deals', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
          },
          body: JSON.stringify(deal),
        });
      }
      setEditingDeal(null);
      setIsAdding(false);
      fetchDeals();
    } catch (err) {
      console.error('Failed to save deal', err);
    }
  };

  const handleDelete = async (id: any) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      await fetch(`/api/admin/deals/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      fetchDeals();
    } catch (err) {
      console.error('Failed to delete deal', err);
    }
  };

  const handleSyncDeals = async () => {
    if (!confirm('This will import all static deals from the code into the database. Continue?')) return;
    try {
      const res = await fetch('/api/admin/deals/sync', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (res.ok) {
        alert('Sync successful!');
        fetchDeals();
      } else {
        alert('Sync failed');
      }
    } catch (err) {
      console.error('Failed to sync deals', err);
    }
  };

  const emptyDeal = {
    type: 'lease', hot: false, secret: false, icon: '🚗', make: '', model: '', year: new Date().getFullYear(), trim: '', class: '',
    payment: 0, term: '36 mo', down: 0, mf: '', rv: '', msrp: 0, savings: 0,
    dealer: '', region: '', intel: '', incHint: '', time: 10, unit: 'min', dot: 'lv', isNew: true
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-4xl tracking-widest text-[var(--lime)]">ADMIN PANEL</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'leads' ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              Leads
            </button>
            <button 
              onClick={() => setActiveTab('deals')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'deals' ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              Offers
            </button>
            <button 
              onClick={() => setActiveTab('cars')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'cars' ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              Car Database
            </button>
            <button 
              onClick={() => setActiveTab('media')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'media' ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              Media Library
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'feedback' ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              Feedback
            </button>
            <button 
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'calculator' ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] text-[var(--mu2)] hover:text-[var(--w)]'}`}
            >
              Calculator
            </button>
          </div>
        </div>

        {activeTab === 'leads' && <LeadsAdmin />}
        {activeTab === 'cars' && <CarsAdmin />}
        {activeTab === 'media' && <MediaAdmin />}
        {activeTab === 'feedback' && <FeedbackAdmin />}
        {activeTab === 'calculator' && <CalculatorAdmin />}

        {activeTab === 'deals' && (
          <>
            <div className="flex justify-end gap-4">
              <button 
                onClick={handleSyncDeals}
                className="flex items-center gap-2 bg-[var(--s1)] text-[var(--mu2)] border border-[var(--b2)] px-4 py-2 rounded-lg font-bold text-sm hover:text-[var(--w)] transition-colors"
              >
                Sync Static Deals
              </button>
              <button 
                onClick={() => { setEditingDeal(emptyDeal); setIsAdding(true); }}
                className="flex items-center gap-2 bg-[var(--lime)] text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Offer
              </button>
            </div>

            {(editingDeal || isAdding) && (
          <div className="bg-[var(--s1)] border border-[var(--lime)]/30 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--b2)] pb-4">
              <h2 className="font-bold text-lg">{isAdding ? 'New Offer' : 'Edit Offer'}</h2>
              <button onClick={() => { setEditingDeal(null); setIsAdding(false); }} className="text-[var(--mu2)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Make</span>
                <input type="text" value={editingDeal.make} onChange={e => setEditingDeal({...editingDeal, make: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Model</span>
                <input type="text" value={editingDeal.model} onChange={e => setEditingDeal({...editingDeal, model: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Trim</span>
                <input type="text" value={editingDeal.trim} onChange={e => setEditingDeal({...editingDeal, trim: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Class (SUV, EV, Sedan...)</span>
                <input type="text" value={editingDeal.class} onChange={e => setEditingDeal({...editingDeal, class: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Year</span>
                <input type="number" value={editingDeal.year} onChange={e => setEditingDeal({...editingDeal, year: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Deal Type</span>
                <select value={editingDeal.type} onChange={e => setEditingDeal({...editingDeal, type: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]">
                  <option value="lease">Lease</option>
                  <option value="finance">Finance</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Payment ($/mo)</span>
                <input type="number" value={editingDeal.payment} onChange={e => setEditingDeal({...editingDeal, payment: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Down Payment ($)</span>
                <input type="number" value={editingDeal.down} onChange={e => setEditingDeal({...editingDeal, down: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">MSRP ($)</span>
                <input type="number" value={editingDeal.msrp} onChange={e => setEditingDeal({...editingDeal, msrp: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Discount/Savings ($)</span>
                <input type="number" value={editingDeal.savings} onChange={e => setEditingDeal({...editingDeal, savings: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Term (mo)</span>
                <input type="text" value={editingDeal.term} onChange={e => setEditingDeal({...editingDeal, term: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">MF (Lease only)</span>
                <input type="text" value={editingDeal.mf || ''} onChange={e => setEditingDeal({...editingDeal, mf: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">RV (Lease only)</span>
                <input type="text" value={editingDeal.rv || ''} onChange={e => setEditingDeal({...editingDeal, rv: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">APR (Finance only)</span>
                <input type="text" value={editingDeal.apr || ''} onChange={e => setEditingDeal({...editingDeal, apr: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[var(--mu2)]">Icon (emoji)</span>
                <input type="text" value={editingDeal.icon} onChange={e => setEditingDeal({...editingDeal, icon: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--mu2)]">Image URL (Unsplash etc.)</span>
                  <button 
                    onClick={async () => {
                      if (!editingDeal.make || !editingDeal.model) {
                        alert('Please enter Make and Model first');
                        return;
                      }
                      try {
                        const res = await fetch('/api/cars');
                        const carDb = await res.json();
                        const make = carDb.makes.find((m: any) => m.name.toLowerCase() === editingDeal.make.toLowerCase());
                        if (make) {
                          const model = make.models.find((m: any) => 
                            editingDeal.model.toLowerCase().includes(m.name.toLowerCase()) || 
                            m.name.toLowerCase().includes(editingDeal.model.toLowerCase())
                          );
                          if (model && model.imageUrl) {
                            setEditingDeal({...editingDeal, image: model.imageUrl});
                          } else {
                            alert('No image found for this model in database');
                          }
                        } else {
                          alert('Manufacturer not found in database');
                        }
                      } catch (err) {
                        console.error('Failed to fetch car image', err);
                      }
                    }}
                    className="text-[10px] font-bold text-[var(--lime)] hover:text-white"
                  >
                    Fetch from Database
                  </button>
                </div>
                <input type="text" value={editingDeal.image || ''} onChange={e => setEditingDeal({...editingDeal, image: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" placeholder="https://images.unsplash.com/..." />
              </label>
              <label className="space-y-1 md:col-span-3">
                <span className="text-xs text-[var(--mu2)]">Description (Intel)</span>
                <textarea value={editingDeal.intel} onChange={e => setEditingDeal({...editingDeal, intel: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)] h-20" />
              </label>
              <label className="space-y-1 md:col-span-3">
                <span className="text-xs text-[var(--mu2)]">Discount Hint (IncHint)</span>
                <input type="text" value={editingDeal.incHint} onChange={e => setEditingDeal({...editingDeal, incHint: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
              </label>
              <div className="flex items-center gap-6 md:col-span-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingDeal.hot} onChange={e => setEditingDeal({...editingDeal, hot: e.target.checked})} className="accent-[var(--lime)] w-4 h-4" />
                  <span className="text-sm font-bold text-red-400">HOT</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editingDeal.secret} onChange={e => setEditingDeal({...editingDeal, secret: e.target.checked})} className="accent-[var(--lime)] w-4 h-4" />
                  <span className="text-sm font-bold text-purple-400">SECRET</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-[var(--b2)]">
              <button onClick={() => { setEditingDeal(null); setIsAdding(false); }} className="px-4 py-2 text-sm font-bold text-[var(--mu2)] hover:text-white transition-colors">Cancel</button>
              <button onClick={() => handleSave(editingDeal)} className="flex items-center gap-2 bg-[var(--lime)] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 transition-colors">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {deals.map(deal => (
            <div key={deal.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 flex items-center justify-between group hover:border-[var(--lime)]/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-2xl">{deal.icon}</div>
                <div>
                  <div className="font-bold text-lg flex items-center gap-2">
                    {deal.make} {deal.model} {deal.trim}
                    {deal.hot && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded uppercase tracking-widest">Hot</span>}
                  </div>
                  <div className="text-xs text-[var(--mu2)]">
                    ${deal.payment}/mo • ${deal.down} down • {deal.term}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingDeal(deal)} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-[var(--lime)] transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(deal.id)} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {deals.length === 0 && (
            <div className="text-center py-12 text-[var(--mu2)]">No offers added</div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};
