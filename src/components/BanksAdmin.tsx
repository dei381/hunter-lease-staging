import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Building2 } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const BanksAdmin = () => {
  const { language } = useLanguageStore();
  const adminTranslations = (translations[language] as any).admin || {};
  const t = {
    banks: adminTranslations.banks || 'Banks & Lenders',
    addBank: adminTranslations.addBank || 'Add Bank',
    name: adminTranslations.name || 'Name',
    isCaptive: adminTranslations.isCaptive || 'Is Captive?',
    ftbFriendly: adminTranslations.ftbFriendly || 'FTB Friendly?',
    actions: adminTranslations.actions || 'Actions',
    save: adminTranslations.save || 'Save',
    cancel: adminTranslations.cancel || 'Cancel',
    edit: adminTranslations.edit || 'Edit',
    delete: adminTranslations.delete || 'Delete'
  };

  const [lenders, setLenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchLenders();
  }, []);

  const fetchLenders = async () => {
    try {
      const response = await fetch('/api/admin/lenders', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLenders(data);
      }
    } catch (error) {
      console.error('Failed to fetch lenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string | null) => {
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/lenders/${id}` : '/api/admin/lenders';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setEditingId(null);
        setIsAdding(false);
        fetchLenders();
      }
    } catch (error) {
      console.error('Failed to save lender:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank?')) return;
    
    try {
      const response = await fetch(`/api/admin/lenders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });

      if (response.ok) {
        fetchLenders();
      }
    } catch (error) {
      console.error('Failed to delete lender:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.banks || 'Banks & Lenders'}</h2>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditData({ name: '', isCaptive: false, isFirstTimeBuyerFriendly: false });
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addBank || 'Add Bank'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">{t.name || 'Name'}</th>
              <th className="px-6 py-4 font-medium">{t.isCaptive || 'Is Captive?'}</th>
              <th className="px-6 py-4 font-medium">{t.ftbFriendly || 'FTB Friendly?'}</th>
              <th className="px-6 py-4 font-medium text-right">{t.actions || 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-indigo-50/50">
                <td className="px-6 py-4">
                  <input
                    type="text"
                    value={editData.name}
                    onChange={e => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Bank Name"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={editData.isCaptive}
                    onChange={e => setEditData({ ...editData, isCaptive: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={editData.isFirstTimeBuyerFriendly}
                    onChange={e => setEditData({ ...editData, isFirstTimeBuyerFriendly: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleSave(null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsAdding(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}

            {lenders.map(lender => (
              <tr key={lender.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  {editingId === lender.id ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <span className="font-medium text-slate-900">{lender.name}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === lender.id ? (
                    <input
                      type="checkbox"
                      checked={editData.isCaptive}
                      onChange={e => setEditData({ ...editData, isCaptive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${lender.isCaptive ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {lender.isCaptive ? 'Yes' : 'No'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === lender.id ? (
                    <input
                      type="checkbox"
                      checked={editData.isFirstTimeBuyerFriendly}
                      onChange={e => setEditData({ ...editData, isFirstTimeBuyerFriendly: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  ) : (
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${lender.isFirstTimeBuyerFriendly ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {lender.isFirstTimeBuyerFriendly ? 'Yes' : 'No'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {editingId === lender.id ? (
                    <>
                      <button onClick={() => handleSave(lender.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setEditingId(lender.id);
                          setEditData({ ...lender });
                        }} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(lender.id)} 
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {lenders.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No banks added yet. Click "Add Bank" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
