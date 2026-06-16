import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Save } from 'lucide-react';

export function TemplatesAdmin() {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [templateData, setTemplateData] = useState<Record<string, { subject?: string; body: string }>>({
    'welcome': { subject: 'Welcome to Hunter Lease!', body: 'Hi {{user_name}},\n\nWelcome to Hunter Lease. Find the best car deals here!' },
    'price_alert': { subject: 'Great news! {{car_name}} has a new price drop', body: 'Hi {{user_name}},\n\nThe {{car_name}} you were watching has a new price drop!\nIt is now {{new_price}}.\n\nClick here to view: {{link}}\n\nHunter Lease Team' },
    'lead_new': { subject: 'We received your inquiry', body: 'Hi {{user_name}},\n\nWe received your inquiry for the {{car_name}}. Our experts are reviewing it.' },
    'sms_verify': { body: 'Your Hunter Lease verification code is {{code}}.' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const templates = [
    { id: 'welcome', name: 'Welcome Email', type: 'email' },
    { id: 'price_alert', name: 'Smart Price Alert', type: 'email' },
    { id: 'lead_new', name: 'New Lead Auto-Reply', type: 'email' },
    { id: 'sms_verify', name: 'SMS Verification', type: 'sms' }
  ];

  useEffect(() => {
    fetch('/api/admin/content/templates')
      .then(res => res.json())
      .then(res => {
        if (res.data) setTemplateData(prev => ({ ...prev, ...res.data }));
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/content/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      alert('Templates saved successfully!');
    } catch (e) {
      alert('Failed to save');
    }
    setSaving(false);
  };

  const handleChange = (field: 'subject' | 'body', value: string) => {
    setTemplateData({
      ...templateData,
      [selectedTemplate]: { ...templateData[selectedTemplate], [field]: value }
    });
  };

  const selectedType = templates.find(t => t.id === selectedTemplate)?.type;
  const currentData = templateData[selectedTemplate] || { subject: '', body: '' };

  if (loading) return <div className="p-6 text-slate-500">Loading templates...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email & SMS Templates</h1>
          <p className="text-sm text-slate-500">Manage communication texts</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Templates'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 space-y-1 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedTemplate === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.type === 'email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
              {t.name}
            </button>
          ))}
        </div>
        
        <div className="col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="space-y-4">
            {selectedType === 'email' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</label>
                <input 
                  type="text" 
                  value={currentData.subject || ''}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Available Variables</label>
              <div className="flex flex-wrap gap-2">
                {['{{user_name}}', '{{car_name}}', '{{new_price}}', '{{link}}', '{{code}}'].map(v => (
                  <span key={v} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">{v}</span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Body Text</label>
              <textarea 
                className="w-full h-64 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={currentData.body || ''}
                onChange={(e) => handleChange('body', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
