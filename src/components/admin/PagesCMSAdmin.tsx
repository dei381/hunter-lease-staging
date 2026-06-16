import React, { useState, useEffect } from 'react';
import { Type, Save } from 'lucide-react';

export function PagesCMSAdmin() {
  const [selectedPage, setSelectedPage] = useState('privacy');
  const [pageContents, setPageContents] = useState<Record<string, string>>({
    'privacy': '<h1>Privacy Policy</h1>\n<p>Last updated: October 2026</p>\n\n<p>This privacy policy explains how Hunter Lease collects...</p>',
    'terms': '<h1>Terms of Service</h1>\n<p>Welcome to Hunter Lease.</p>',
    'faq': '<h1>FAQ</h1>\n<p>Frequently asked questions.</p>',
    'how-it-works': '<h1>How It Works</h1>\n<p>Explaining the process.</p>'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pages = [
    { id: 'privacy', name: 'Privacy Policy' },
    { id: 'terms', name: 'Terms of Service' },
    { id: 'faq', name: 'FAQ' },
    { id: 'how-it-works', name: 'How It Works' }
  ];

  useEffect(() => {
    fetch('/api/admin/content/pages_cms')
      .then(res => res.json())
      .then(res => {
        if (res.data) setPageContents(prev => ({ ...prev, ...res.data }));
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/content/pages_cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageContents)
      });
      alert('Pages saved successfully!');
    } catch (e) {
      alert('Failed to save');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-slate-500">Loading pages...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Static Pages CMS</h1>
          <p className="text-sm text-slate-500">Edit legal texts and content pages</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 space-y-1 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          {pages.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPage(p.id)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPage === p.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 relative'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        
        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex flex-col h-[600px]">
          <div className="border-b border-slate-100 p-2 flex gap-2">
            <button className="p-2 hover:bg-slate-100 rounded text-slate-600 font-bold"><Type className="w-4 h-4" /></button>
            <div className="w-px bg-slate-200" />
            <select className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-medium">
              <option>Heading 1</option>
              <option>Heading 2</option>
              <option>Paragraph</option>
            </select>
          </div>
          <textarea 
            className="flex-1 w-full p-6 border-none resize-none focus:ring-0 text-slate-700 leading-relaxed"
            value={pageContents[selectedPage] || ''}
            onChange={(e) => setPageContents({ ...pageContents, [selectedPage]: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
