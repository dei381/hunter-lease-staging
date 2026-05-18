import React, { useState, useEffect } from 'react';
import { Search, Globe, Plus, Settings, Save, Trash2, X } from 'lucide-react';

export function LandingPagesAdmin() {
  const [pages, setPages] = useState<any[]>([
    { id: '1', title: 'Best SUVs under $500', slug: '/deals/best-suvs-under-500', filters: 'Body: SUV, Max: $500' },
    { id: '2', title: 'Los Angeles EV Deals', slug: '/deals/los-angeles-ev', filters: 'Fuel: Electric, Zip: 90001' },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content/landing_pages')
      .then(res => res.json())
      .then(res => {
        if (res.data && Array.isArray(res.data)) setPages(res.data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/content/landing_pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pages)
      });
      alert('Landing pages saved successfully!');
    } catch (e) {
      alert('Failed to save');
    }
    setSaving(false);
  };

  const addPage = () => {
    setPages([...pages, { id: Date.now().toString(), title: 'New SEO Page', slug: '/deals/new-page', filters: '' }]);
  };

  const updatePage = (id: string, field: string, value: string) => {
    setPages(pages.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePage = (id: string) => {
    setPages(pages.filter(p => p.id !== id));
  };

  if (loading) return <div className="p-6 text-slate-500">Loading landing pages...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Landing Pages & SEO</h1>
          <p className="text-sm text-slate-500">Create custom SEO pages and filters</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addPage} className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Page
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Pages'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-[200px]">Page Setup</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-[200px]">URL Slug</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages.map((p, i) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <input 
                    type="text" 
                    value={p.title}
                    onChange={(e) => updatePage(p.id, 'title', e.target.value)}
                    className="font-bold text-sm text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-1 rounded p-1 w-full"
                  />
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Search className="w-3 h-3" /> Filters: 
                    <input 
                      type="text" 
                      value={p.filters}
                      onChange={(e) => updatePage(p.id, 'filters', e.target.value)}
                      className="bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-1 rounded p-1 w-full max-w-[200px]"
                    />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600 font-mono flex items-center gap-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={p.slug}
                      onChange={(e) => updatePage(p.id, 'slug', e.target.value)}
                      className="bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:ring-1 rounded p-1 w-full"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => removePage(p.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
