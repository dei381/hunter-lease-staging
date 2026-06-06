import React, { useState, useEffect } from 'react';
import { Languages, Save, Search, Plus } from 'lucide-react';

export function TranslationsAdmin() {
  const [search, setSearch] = useState('');
  const [translations, setTranslations] = useState<any[]>([
    { key: 'nav.deals', en: 'Deals', ru: 'Каталог' },
    { key: 'nav.how_it_works', en: 'How it works', ru: 'Как это работает' },
    { key: 'btn.get_offer', en: 'Get Offer', ru: 'Получить предложение' },
    { key: 'form.first_name', en: 'First Name', ru: 'Имя' },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/content/translations')
      .then(res => res.json())
      .then(res => {
        if (res.data && Array.isArray(res.data)) setTranslations(res.data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/content/translations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(translations)
      });
      alert('Translations saved successfully!');
    } catch (e) {
      alert('Failed to save');
    }
    setSaving(false);
  };

  const updateTranslation = (index: number, field: 'en' | 'ru', value: string) => {
    const newTranslations = [...translations];
    newTranslations[index][field] = value;
    setTranslations(newTranslations);
  };

  const addTranslation = () => {
    setTranslations([...translations, { key: 'new.key.' + Date.now(), en: '', ru: '' }]);
  };

  const filteredTranslations = translations.filter(t => 
    t.key.toLowerCase().includes(search.toLowerCase()) || 
    t.en.toLowerCase().includes(search.toLowerCase()) || 
    t.ru.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6 text-slate-500">Loading translations...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Translations & Dictionary</h1>
          <p className="text-sm text-slate-500">Manage EN / RU interface keys</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addTranslation} className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Key
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Dictionary'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search keys or text..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-1/4">Key</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-2/4">English (EN)</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-2/4">Русский (RU)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTranslations.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50 group">
                <td className="px-6 py-3">
                  <input type="text" className="text-xs font-mono text-slate-500 bg-transparent border-none p-1 focus:ring-0 hover:bg-white rounded" value={t.key} onChange={(e) => {
                    const newT = [...translations];
                    const idx = translations.findIndex(tr => tr.key === t.key);
                    if(idx !== -1) {
                      newT[idx].key = e.target.value;
                      setTranslations(newT);
                    }
                  }} />
                </td>
                <td className="px-6 py-3">
                  <input type="text" className="w-full bg-transparent border-none p-1 text-sm focus:ring-0 hover:bg-white rounded" 
                    value={t.en}
                    onChange={(e) => {
                      const idx = translations.findIndex(tr => tr.key === t.key);
                      if(idx !== -1) updateTranslation(idx, 'en', e.target.value);
                    }}
                  />
                </td>
                <td className="px-6 py-3">
                  <input type="text" className="w-full bg-transparent border-none p-1 text-sm focus:ring-0 hover:bg-white rounded" 
                    value={t.ru}
                    onChange={(e) => {
                      const idx = translations.findIndex(tr => tr.key === t.key);
                      if(idx !== -1) updateTranslation(idx, 'ru', e.target.value);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
