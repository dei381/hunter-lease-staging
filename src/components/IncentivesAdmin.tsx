import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag, Info } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const IncentivesAdmin = () => {
  const { language } = useLanguageStore();
  const adminTranslations = (translations[language] as any).admin || {};
  const t = {
    incentives: 'OEM Incentives',
    addIncentive: 'Add Incentive',
    name: 'Name',
    amount: 'Amount',
    type: 'Type',
    applicability: 'Applicability',
    taxableCa: 'Taxable (CA)',
    make: 'Make',
    model: 'Model',
    status: 'Status',
    actions: 'Actions',
    save: adminTranslations.save || 'Save',
    cancel: adminTranslations.cancel || 'Cancel',
    edit: adminTranslations.edit || 'Edit',
    delete: adminTranslations.delete || 'Delete',
    yes: adminTranslations.yes || 'Yes',
    no: adminTranslations.no || 'No',
    noIncentives: 'No incentives added yet. Click "Add Incentive" to get started.',
    deleteConfirm: 'Are you sure you want to delete this incentive?',
    loading: adminTranslations.loading || 'Loading...'
  };

  const [incentives, setIncentives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchIncentives();
  }, []);

  const fetchIncentives = async () => {
    try {
      const response = await fetch('/api/admin/incentives', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIncentives(data);
      }
    } catch (error) {
      console.error('Failed to fetch incentives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string | null) => {
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/incentives/${id}` : '/api/admin/incentives';
      
      const payload = {
        ...editData,
        amountCents: Math.round(parseFloat(editData.amountDollars || 0) * 100)
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setEditingId(null);
        setIsAdding(false);
        fetchIncentives();
      } else {
        const data = await response.json();
        alert(`Failed to save incentive: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save incentive:', error);
      alert('Failed to save incentive due to a network error.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    
    try {
      const response = await fetch(`/api/admin/incentives/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });

      if (response.ok) {
        fetchIncentives();
      }
    } catch (error) {
      console.error('Failed to delete incentive:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">{t.loading}</div>;

  const renderRow = (incentive: any, isEditingRow: boolean) => {
    return (
      <>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="text" placeholder="Name" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
          ) : (
            <span className="font-medium text-slate-900">{incentive?.name}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <input type="text" placeholder="Make" value={editData.make || ''} onChange={e => setEditData({...editData, make: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Model (Optional)" value={editData.model || ''} onChange={e => setEditData({...editData, model: e.target.value})} className="w-24 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{incentive?.make} {incentive?.model || '(All Models)'}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <select value={editData.type || 'REBATE'} onChange={e => setEditData({...editData, type: e.target.value})} className="w-24 px-2 py-1 border rounded text-sm">
                <option value="REBATE">Rebate</option>
                <option value="SPECIAL_APR">Special APR</option>
                <option value="DEALER_CASH">Dealer Cash</option>
              </select>
              <input type="number" step="0.01" placeholder="$ Amount" value={editData.amountDollars || ''} onChange={e => setEditData({...editData, amountDollars: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{incentive?.type === 'SPECIAL_APR' ? 'APR' : '$'}{(incentive?.amountCents / 100).toFixed(2)} ({incentive?.type})</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <label className="flex items-center space-x-1 text-xs">
                <input type="checkbox" checked={editData.isTaxableCa ?? true} onChange={e => setEditData({...editData, isTaxableCa: e.target.checked})} className="rounded text-indigo-600" />
                <span>Taxable CA</span>
              </label>
              <select value={editData.dealApplicability || 'ALL'} onChange={e => setEditData({...editData, dealApplicability: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm">
                <option value="ALL">All</option>
                <option value="LEASE">Lease</option>
                <option value="FINANCE">Finance</option>
              </select>
            </div>
          ) : (
            <div className="text-xs space-y-1">
              <div>Applies to: {incentive?.dealApplicability}</div>
              <div className={incentive?.isTaxableCa ? 'text-amber-600' : 'text-emerald-600'}>
                {incentive?.isTaxableCa ? 'Taxable in CA' : 'Non-taxable in CA'}
              </div>
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-2">
              <label className="flex items-center space-x-2 text-xs">
                <input type="checkbox" checked={editData.isActive ?? true} onChange={e => setEditData({...editData, isActive: e.target.checked})} className="rounded text-indigo-600" />
                <span>Active</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 w-8">From:</span>
                <input type="date" value={editData.effectiveFrom ? new Date(editData.effectiveFrom).toISOString().split('T')[0] : ''} onChange={e => setEditData({...editData, effectiveFrom: e.target.value})} className="w-28 px-2 py-1 border rounded text-xs" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 w-8">To:</span>
                <input type="date" value={editData.effectiveTo ? new Date(editData.effectiveTo).toISOString().split('T')[0] : ''} onChange={e => setEditData({...editData, effectiveTo: e.target.value})} className="w-28 px-2 py-1 border rounded text-xs" />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${incentive?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {incentive?.isActive ? 'Active' : 'Inactive'}
              </span>
              {(incentive?.effectiveFrom || incentive?.effectiveTo) && (
                <div className="text-[10px] text-slate-500">
                  {incentive?.effectiveFrom && <div>From: {new Date(incentive.effectiveFrom).toLocaleDateString()}</div>}
                  {incentive?.effectiveTo && <div>To: {new Date(incentive.effectiveTo).toLocaleDateString()}</div>}
                </div>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSave(incentive?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setEditingId(incentive.id);
                  setEditData({ ...incentive, amountDollars: (incentive.amountCents / 100).toFixed(2) });
                }} 
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(incentive.id)} 
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </td>
      </>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.incentives}</h2>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditData({ name: '', type: 'REBATE', dealApplicability: 'ALL', isTaxableCa: true, isActive: true, amountDollars: '' });
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addIncentive}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-medium">{t.name}</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">{t.amount} / {t.type}</th>
              <th className="px-4 py-3 font-medium">Rules</th>
              <th className="px-4 py-3 font-medium">{t.status}</th>
              <th className="px-4 py-3 font-medium text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-indigo-50/50">
                {renderRow(null, true)}
              </tr>
            )}

            {incentives.map(incentive => (
              <tr key={incentive.id} className="hover:bg-slate-50 transition-colors">
                {renderRow(incentive, editingId === incentive.id)}
              </tr>
            ))}
            
            {incentives.length === 0 && !isAdding && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  {t.noIncentives}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
