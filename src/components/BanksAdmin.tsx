import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Building2, Info, List } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { LenderProgramsAdmin } from './LenderProgramsAdmin';
import { LenderEligibilityModal } from './admin/LenderEligibilityModal';
import { getAuthToken } from '../utils/auth';
import { toast } from 'react-hot-toast';

export const BanksAdmin = () => {
  const { language } = useLanguageStore();
  const adminTranslations = (translations[language] as any).admin || {};
  const t = {
    banks: adminTranslations.banks || 'Banks & Lenders',
    addBank: adminTranslations.addBank || 'Add Bank',
    name: adminTranslations.name || 'Name',
    bankName: adminTranslations.bankName || 'Bank Name',
    isCaptive: adminTranslations.isCaptive || 'Captive Bank',
    isCaptiveDesc: adminTranslations.isCaptiveDesc || 'A bank owned by the car manufacturer (e.g., Toyota Financial Services).',
    lenderType: adminTranslations.lenderType || 'Lender Type',
    ftbFriendly: adminTranslations.ftbFriendly || 'First-Time Buyer Friendly',
    ftbFriendlyDesc: adminTranslations.ftbFriendlyDesc || 'Bank that is more likely to approve applicants without prior auto loan history.',
    actions: adminTranslations.actions || 'Actions',
    save: adminTranslations.save || 'Save',
    cancel: adminTranslations.cancel || 'Cancel',
    edit: adminTranslations.edit || 'Edit',
    delete: adminTranslations.delete || 'Delete',
    yes: adminTranslations.yes || 'Yes',
    no: adminTranslations.no || 'No',
    noBanks: adminTranslations.noBanks || 'No banks added yet. Click "Add Bank" to get started.',
    deleteBankConfirm: adminTranslations.deleteBankConfirm || 'Are you sure you want to delete this bank?',
    saveBankFailed: adminTranslations.saveBankFailed || 'Failed to save bank',
    saveBankNetworkError: adminTranslations.saveBankNetworkError || 'Failed to save bank due to a network error.',
    loading: adminTranslations.loading || 'Loading...'
  };

  const [lenders, setLenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [managingProgramsFor, setManagingProgramsFor] = useState<{id: string, name: string} | null>(null);
  const [managingEligibilityFor, setManagingEligibilityFor] = useState<any | null>(null);

  useEffect(() => {
    fetchLenders();
  }, []);

  const fetchLenders = async () => {
    try {
      const response = await fetch('/api/admin/lenders', {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setEditingId(null);
        setIsAdding(false);
        fetchLenders();
      } else {
        const data = await response.json();
        toast.error(`${t.saveBankFailed}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save lender:', error);
      toast.error(t.saveBankNetworkError);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.deleteBankConfirm)) return;
    
    try {
      const response = await fetch(`/api/admin/lenders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });

      if (response.ok) {
        fetchLenders();
      }
    } catch (error) {
      console.error('Failed to delete lender:', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">{t.loading}</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.banks || 'Banks & Lenders'}</h2>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditData({ name: '', isCaptive: false, isFirstTimeBuyerFriendly: false, lenderType: 'NATIONAL_BANK' });
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
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
              <th className="px-6 py-4 font-medium">{t.lenderType || 'Lender Type'}</th>
              <th className="px-6 py-4 font-medium">
                <div className="flex items-center gap-1">
                  {t.isCaptive || 'Captive Bank'}
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {t.isCaptiveDesc}
                    </div>
                  </div>
                </div>
              </th>
              <th className="px-6 py-4 font-medium">
                <div className="flex items-center gap-1">
                  {t.ftbFriendly || 'First-Time Buyer Friendly'}
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {t.ftbFriendlyDesc}
                    </div>
                  </div>
                </div>
              </th>
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
                    placeholder={t.bankName || "Bank Name"}
                  />
                </td>
                <td className="px-6 py-4">
                  <select
                    value={editData.lenderType || 'NATIONAL_BANK'}
                    onChange={e => setEditData({ ...editData, lenderType: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="NATIONAL_BANK">National Bank</option>
                    <option value="CREDIT_UNION">Credit Union</option>
                    <option value="CAPTIVE">Captive (Manufacturer)</option>
                    <option value="REGIONAL_BANK">Regional Bank</option>
                  </select>
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
                    <select
                      value={editData.lenderType || 'NATIONAL_BANK'}
                      onChange={e => setEditData({ ...editData, lenderType: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="NATIONAL_BANK">National Bank</option>
                      <option value="CREDIT_UNION">Credit Union</option>
                      <option value="CAPTIVE">Captive (Manufacturer)</option>
                      <option value="REGIONAL_BANK">Regional Bank</option>
                    </select>
                  ) : (
                    <span className="text-slate-600">
                      {lender.lenderType === 'CREDIT_UNION' ? 'Credit Union' : 
                       lender.lenderType === 'CAPTIVE' ? 'Captive' : 
                       lender.lenderType === 'REGIONAL_BANK' ? 'Regional Bank' : 'National Bank'}
                    </span>
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
                      {lender.isCaptive ? t.yes : t.no}
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
                      {lender.isFirstTimeBuyerFriendly ? t.yes : t.no}
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
                        onClick={() => setManagingEligibilityFor(lender)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Eligibility Rules"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setManagingProgramsFor({ id: lender.id, name: lender.name })}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Manage Programs"
                      >
                        <List className="w-4 h-4" />
                      </button>
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
                  {t.noBanks}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {managingProgramsFor && (
        <LenderProgramsAdmin 
          lenderId={managingProgramsFor.id} 
          lenderName={managingProgramsFor.name} 
          onClose={() => setManagingProgramsFor(null)} 
        />
      )}

      {managingEligibilityFor && (
        <LenderEligibilityModal
          lender={managingEligibilityFor}
          onClose={() => setManagingEligibilityFor(null)}
          onSave={() => {
            fetchLenders();
          }}
        />
      )}
    </div>
  );
};
