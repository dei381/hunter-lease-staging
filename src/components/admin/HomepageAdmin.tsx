import React, { useState, useEffect } from 'react';
import { Layout, Image, Star, MoveUp, MoveDown, Plus, Trash2, Save } from 'lucide-react';

export function HomepageAdmin() {
  const [banners, setBanners] = useState<any[]>([
    { id: '1', title: 'Black Friday EV Event', subtitle: 'Active until Nov 30', status: 'ACTIVE' },
    { id: '2', title: 'Summer Lease Specials', subtitle: 'Draft', status: 'INACTIVE' }
  ]);
  const [featuredDeals, setFeaturedDeals] = useState<string[]>(['Tesla Model Y', 'BMW X5', 'Audi Q5']);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content/homepage')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          if (res.data.banners) setBanners(res.data.banners);
          if (res.data.featuredDeals) setFeaturedDeals(res.data.featuredDeals);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/content/homepage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners, featuredDeals })
      });
      alert('Homepage settings saved successfully!');
    } catch (e) {
      alert('Failed to save');
    }
    setSaving(false);
  };

  const addBanner = () => {
    setBanners([...banners, { id: Date.now().toString(), title: 'New Banner', subtitle: 'Subtitle', status: 'INACTIVE' }]);
  };

  const removeBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const toggleBannerStatus = (id: string) => {
    setBanners(banners.map(b => b.id === id ? { ...b, status: b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : b));
  };

  const removeDeal = (index: number) => {
    const newDeals = [...featuredDeals];
    newDeals.splice(index, 1);
    setFeaturedDeals(newDeals);
  };

  if (loading) return <div className="p-6 text-slate-500">Loading homepage settings...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Homepage Manager</h1>
          <p className="text-sm text-slate-500">Manage banners and featured cars</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Homepage'}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Image className="w-5 h-5 text-indigo-500" /> Hero Banners</h2>
            <button onClick={addBanner} className="text-sm font-bold flex items-center gap-1 text-slate-600 hover:text-indigo-600">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="space-y-4">
            {banners.map((b, i) => (
              <div key={b.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 shadow-sm ${b.status === 'INACTIVE' ? 'opacity-60' : ''}`}>
                <div className="w-24 h-16 bg-slate-100 rounded flex items-center justify-center border">
                  <Image className="w-6 h-6 text-slate-300" />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={b.title} 
                    onChange={e => setBanners(banners.map(bb => bb.id === b.id ? { ...bb, title: e.target.value } : bb))}
                    className="font-bold text-sm bg-transparent border-none p-0 focus:ring-0 w-full"
                  />
                  <input 
                    type="text" 
                    value={b.subtitle} 
                    onChange={e => setBanners(banners.map(bb => bb.id === b.id ? { ...bb, subtitle: e.target.value } : bb))}
                    className="text-xs text-slate-500 bg-transparent border-none p-0 focus:ring-0 w-full mt-1"
                  />
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => toggleBannerStatus(b.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                      {b.status}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => removeBanner(b.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-lg font-bold flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Featured Deals</h2>
             <button className="text-sm text-indigo-600 font-bold">Select Deals...</button>
          </div>
          <div className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
            {featuredDeals.map((name, i) => (
               <div key={i} className="flex items-center justify-between bg-white p-3 rounded border shadow-sm">
                 <input 
                   type="text"
                   value={name}
                   onChange={e => {
                     const newDeals = [...featuredDeals];
                     newDeals[i] = e.target.value;
                     setFeaturedDeals(newDeals);
                   }}
                   className="font-medium text-sm bg-transparent border-none p-0 focus:ring-0"
                 />
                 <div className="flex gap-1 text-slate-400">
                   <Trash2 onClick={() => removeDeal(i)} className="w-4 h-4 cursor-pointer hover:text-red-600 ml-2" />
                 </div>
               </div>
            ))}
            <button 
              onClick={() => setFeaturedDeals([...featuredDeals, 'New Deal'])}
              className="w-full py-2 text-sm text-indigo-600 font-bold border border-dashed border-indigo-200 rounded hover:bg-indigo-50 mt-2"
            >
              + Add Featured Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
