import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag, Info, Percent, Settings } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { getAuthToken } from '../utils/auth';
import { toast } from 'react-hot-toast';

export const IncentivesAdmin = () => {
  const { language } = useLanguageStore();
  const adminTranslations = (translations[language] as any).admin || {};
  const t = {
    incentives: 'Incentives & Discounts',
    addIncentive: 'Add Incentive',
    addDiscount: 'Add Dealer Discount',
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
    noDiscounts: 'No dealer discounts added yet.',
    deleteConfirm: 'Are you sure you want to delete this item?',
    loading: adminTranslations.loading || 'Loading...'
  };

  const [activeTab, setActiveTab] = useState<'oem' | 'dealer' | 'overrides'>('oem');
  const [incentives, setIncentives] = useState<any[]>([]);
  const [dealerDiscounts, setDealerDiscounts] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // OEM State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);

  // Dealer State
  const [editingDealerId, setEditingDealerId] = useState<string | null>(null);
  const [editDealerData, setEditDealerData] = useState<any>({});
  const [isAddingDealer, setIsAddingDealer] = useState(false);

  // Override State
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(null);
  const [editOverrideData, setEditOverrideData] = useState<any>({});
  const [isAddingOverride, setIsAddingOverride] = useState(false);

  const [selectedOemIncentives, setSelectedOemIncentives] = useState<Set<string>>(new Set());
  const [isBulkEditingOem, setIsBulkEditingOem] = useState(false);
  const [bulkOemAmount, setBulkOemAmount] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${await getAuthToken()}` };
      const [incRes, dealerRes, overrideRes] = await Promise.all([
        fetch('/api/admin/incentives', { headers }),
        fetch('/api/admin/dealer-adjustments', { headers }),
        fetch('/api/admin/program-overrides', { headers })
      ]);
      
      if (incRes.ok) setIncentives(await incRes.json());
      if (dealerRes.ok) setDealerDiscounts(await dealerRes.json());
      if (overrideRes.ok) setOverrides(await overrideRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOem = async (id: string | null) => {
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/incentives/${id}` : '/api/admin/incentives';
      
      const { id: _id, amountDollars, ...rest } = editData;
      const payload = {
        ...rest,
        amountCents: Math.round(parseFloat(editData.amountDollars || 0) * 100),
        verifiedByAdmin: true,
        verifiedAt: new Date().toISOString(),
        effectiveFrom: editData.effectiveFrom ? new Date(editData.effectiveFrom).toISOString() : null,
        effectiveTo: editData.effectiveTo ? new Date(editData.effectiveTo).toISOString() : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setEditingId(null);
        setIsAdding(false);
        fetchData();
        toast.success('Incentive saved');
      } else {
        const data = await response.json();
        toast.error(`Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save incentive:', error);
      toast.error('Failed to save due to a network error.');
    }
  };

  const handleBulkSaveOem = async () => {
    if (selectedOemIncentives.size === 0) return;
    
    try {
      const amountCents = Math.round(parseFloat(bulkOemAmount || '0') * 100);
      
      for (const id of Array.from(selectedOemIncentives)) {
        await fetch(`/api/admin/incentives/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify({ amountCents, verifiedByAdmin: true, verifiedAt: new Date().toISOString() })
        });
      }
      
      setIsBulkEditingOem(false);
      setSelectedOemIncentives(new Set());
      setBulkOemAmount('');
      fetchData();
      toast.success(`Updated ${selectedOemIncentives.size} incentives`);
    } catch (error) {
      console.error('Failed to bulk save incentives:', error);
      toast.error('Failed to bulk save due to a network error.');
    }
  };

  const handleSaveDealer = async (id: string | null) => {
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/dealer-adjustments/${id}` : '/api/admin/dealer-adjustments';
      
      const { id: _id, amountDollars, ...rest } = editDealerData;
      const payload = {
        ...rest,
        amount: Math.round(parseFloat(editDealerData.amountDollars || 0) * 100),
        startsAt: editDealerData.startsAt ? new Date(editDealerData.startsAt).toISOString() : new Date().toISOString(),
        endsAt: editDealerData.endsAt ? new Date(editDealerData.endsAt).toISOString() : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setEditingDealerId(null);
        setIsAddingDealer(false);
        fetchData();
        toast.success('Dealer discount saved');
      } else {
        const data = await response.json();
        toast.error(`Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save dealer discount:', error);
      toast.error('Failed to save due to a network error.');
    }
  };

  const handleSaveOverride = async (id: string | null) => {
    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/program-overrides/${id}` : '/api/admin/program-overrides';
      
      const { id: _id, mfMarkup, aprMarkup, bankId, make, model, ...rest } = editOverrideData;
      const payload = {
        ...rest,
        bankId: bankId?.trim() || null,
        make: make?.trim() || null,
        model: model?.trim() || null,
        mfMarkup: mfMarkup ? parseFloat(mfMarkup) : null,
        aprMarkup: aprMarkup ? parseFloat(aprMarkup) : null
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setEditingOverrideId(null);
        setIsAddingOverride(false);
        fetchData();
        toast.success('Program override saved');
      } else {
        const data = await response.json();
        toast.error(`Failed to save: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save program override:', error);
      toast.error('Failed to save due to a network error.');
    }
  };

  const handleDelete = async (id: string, type: 'oem' | 'dealer' | 'override') => {
    if (!confirm(t.deleteConfirm)) return;
    
    try {
      const url = type === 'oem' ? `/api/admin/incentives/${id}` : type === 'dealer' ? `/api/admin/dealer-adjustments/${id}` : `/api/admin/program-overrides/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });

      if (response.ok) {
        fetchData();
        toast.success('Deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">{t.loading}</div>;

  const renderOemRow = (incentive: any, isEditingRow: boolean) => {
    return (
      <>
        <td className="px-4 py-3">
          {incentive && (
            <input 
              type="checkbox" 
              checked={selectedOemIncentives.has(incentive.id)}
              onChange={(e) => {
                const newSet = new Set(selectedOemIncentives);
                if (e.target.checked) newSet.add(incentive.id);
                else newSet.delete(incentive.id);
                setSelectedOemIncentives(newSet);
              }}
              className="rounded text-indigo-600"
            />
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="text" placeholder="Name" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
          ) : (
            <span className="font-medium text-slate-900">{incentive?.name}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input type="text" placeholder="Make" value={editData.make || ''} onChange={e => setEditData({...editData, make: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                <input type="text" placeholder="Model (Optional)" value={editData.model || ''} onChange={e => setEditData({...editData, model: e.target.value})} className="w-24 px-2 py-1 border rounded text-sm" />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Trim (Optional)" value={editData.trim || ''} onChange={e => setEditData({...editData, trim: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                <input type="text" placeholder="Trim Group (Optional)" value={editData.trimGroup || ''} onChange={e => setEditData({...editData, trimGroup: e.target.value})} className="w-24 px-2 py-1 border rounded text-sm" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <span>{incentive?.make} {incentive?.model || '(All Models)'}</span>
              {(incentive?.trim || incentive?.trimGroup) && (
                <span className="text-xs text-slate-500">
                  {incentive?.trim && `Trim: ${incentive.trim}`}
                  {incentive?.trim && incentive?.trimGroup && ' | '}
                  {incentive?.trimGroup && `Group: ${incentive.trimGroup}`}
                </span>
              )}
            </div>
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
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <label className="flex items-center space-x-1 text-xs">
                  <input type="checkbox" checked={editData.isTaxableCa ?? true} onChange={e => setEditData({...editData, isTaxableCa: e.target.checked})} className="rounded text-indigo-600" />
                  <span>Taxable CA</span>
                </label>
                <label className="flex items-center space-x-1 text-xs">
                  <input type="checkbox" checked={editData.stackable ?? true} onChange={e => setEditData({...editData, stackable: e.target.checked})} className="rounded text-indigo-600" />
                  <span>Stackable</span>
                </label>
              </div>
              <input type="text" placeholder="Exclusive Group ID (e.g. loyalty_conquest)" value={editData.exclusiveGroupId || ''} onChange={e => setEditData({...editData, exclusiveGroupId: e.target.value})} className="w-full px-2 py-1 border rounded text-xs font-mono" />
              <select value={editData.dealApplicability || 'ALL'} onChange={e => setEditData({...editData, dealApplicability: e.target.value})} className="w-full px-2 py-1 border rounded text-sm">
                <option value="ALL">All</option>
                <option value="LEASE">Lease</option>
                <option value="FINANCE">Finance</option>
              </select>
              <input type="text" placeholder="Eligibility Rules (JSON)" value={editData.eligibilityRules ? JSON.stringify(editData.eligibilityRules) : ''} onChange={e => {
                try {
                  const val = e.target.value ? JSON.parse(e.target.value) : null;
                  setEditData({...editData, eligibilityRules: val});
                } catch(err) {
                  // Ignore parse errors while typing
                }
              }} className="w-full px-2 py-1 border rounded text-xs font-mono" />
            </div>
          ) : (
            <div className="text-xs space-y-1">
              <div>Applies to: {incentive?.dealApplicability}</div>
              <div className={incentive?.isTaxableCa ? 'text-amber-600' : 'text-emerald-600'}>
                {incentive?.isTaxableCa ? 'Taxable in CA' : 'Non-taxable in CA'}
              </div>
              <div className={incentive?.stackable ? 'text-blue-600' : 'text-slate-500'}>
                {incentive?.stackable ? 'Stackable' : 'Not Stackable'}
              </div>
              {incentive?.exclusiveGroupId && (
                <div className="text-purple-600 font-mono">Group: {incentive.exclusiveGroupId}</div>
              )}
              {incentive?.eligibilityRules && (
                <div className="text-[10px] text-slate-500 truncate max-w-[150px]" title={JSON.stringify(incentive.eligibilityRules)}>
                  Rules: {JSON.stringify(incentive.eligibilityRules)}
                </div>
              )}
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
              <select value={editData.status || 'PUBLISHED'} onChange={e => setEditData({...editData, status: e.target.value})} className="w-full px-2 py-1 border rounded text-xs">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
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
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ml-1 ${incentive?.status === 'PUBLISHED' ? 'bg-blue-100 text-blue-700' : incentive?.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                {incentive?.status || 'PUBLISHED'}
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
              <button onClick={() => handleSaveOem(incentive?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
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
                onClick={() => handleDelete(incentive.id, 'oem')} 
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

  const renderDealerRow = (discount: any, isEditingRow: boolean) => {
    return (
      <>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-2">
              <input type="text" placeholder="Make" value={editDealerData.make || ''} onChange={e => setEditDealerData({...editDealerData, make: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Model (Optional)" value={editDealerData.model || ''} onChange={e => setEditDealerData({...editDealerData, model: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Trim (Optional)" value={editDealerData.trim || ''} onChange={e => setEditDealerData({...editDealerData, trim: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{discount?.make} {discount?.model || '(All Models)'}</span>
              {discount?.trim && <span className="text-xs text-slate-500">Trim: {discount.trim}</span>}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">$</span>
              <input type="number" step="0.01" placeholder="Discount Amount ($)" value={editDealerData.amountDollars || ''} onChange={e => setEditDealerData({...editDealerData, amountDollars: e.target.value})} className="w-32 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span className="font-mono font-medium text-emerald-600">
              ${(discount?.amount / 100).toFixed(2)}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-2">
              <label className="flex items-center space-x-2 text-xs">
                <input type="checkbox" checked={editDealerData.isActive ?? true} onChange={e => setEditDealerData({...editDealerData, isActive: e.target.checked})} className="rounded text-indigo-600" />
                <span>Active</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 w-8">From:</span>
                <input type="date" value={editDealerData.startsAt ? new Date(editDealerData.startsAt).toISOString().split('T')[0] : ''} onChange={e => setEditDealerData({...editDealerData, startsAt: e.target.value})} className="w-28 px-2 py-1 border rounded text-xs" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 w-8">To:</span>
                <input type="date" value={editDealerData.endsAt ? new Date(editDealerData.endsAt).toISOString().split('T')[0] : ''} onChange={e => setEditDealerData({...editDealerData, endsAt: e.target.value})} className="w-28 px-2 py-1 border rounded text-xs" />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${discount?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {discount?.isActive ? 'Active' : 'Inactive'}
              </span>
              {(discount?.startsAt || discount?.endsAt) && (
                <div className="text-[10px] text-slate-500">
                  {discount?.startsAt && <div>From: {new Date(discount.startsAt).toLocaleDateString()}</div>}
                  {discount?.endsAt && <div>To: {new Date(discount.endsAt).toLocaleDateString()}</div>}
                </div>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSaveDealer(discount?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingDealerId(null); setIsAddingDealer(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setEditingDealerId(discount.id);
                  setEditDealerData({ ...discount, amountDollars: (discount.amount / 100).toFixed(2) });
                }} 
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(discount.id, 'dealer')} 
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

  const renderOverrideRow = (override: any, isEditingRow: boolean) => {
    return (
      <>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-2">
              <input type="text" placeholder="Bank ID (Optional)" value={editOverrideData.bankId || ''} onChange={e => setEditOverrideData({...editOverrideData, bankId: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Make (Optional)" value={editOverrideData.make || ''} onChange={e => setEditOverrideData({...editOverrideData, make: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Model (Optional)" value={editOverrideData.model || ''} onChange={e => setEditOverrideData({...editOverrideData, model: e.target.value})} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">
                {override?.bankId ? `Bank: ${override.bankId}` : 'All Banks'}
              </span>
              <span className="text-xs text-slate-500">
                {override?.make ? `${override.make} ${override.model || ''}` : 'All Vehicles'}
              </span>
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs w-16">MF Markup:</span>
                <input type="number" step="0.00001" placeholder="e.g. 0.00040" value={editOverrideData.mfMarkup || ''} onChange={e => setEditOverrideData({...editOverrideData, mfMarkup: e.target.value})} className="w-24 px-2 py-1 border rounded text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-xs w-16">APR Markup:</span>
                <input type="number" step="0.01" placeholder="e.g. 1.0" value={editOverrideData.aprMarkup || ''} onChange={e => setEditOverrideData({...editOverrideData, aprMarkup: e.target.value})} className="w-24 px-2 py-1 border rounded text-sm" />
                <span className="text-slate-500 text-xs">%</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {override?.mfMarkup !== null && <span className="font-mono text-sm text-indigo-600">MF: +{override.mfMarkup}</span>}
              {override?.aprMarkup !== null && <span className="font-mono text-sm text-indigo-600">APR: +{override.aprMarkup}%</span>}
              {override?.mfMarkup === null && override?.aprMarkup === null && <span className="text-slate-400 italic">None</span>}
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <label className="flex items-center space-x-2 text-xs">
              <input type="checkbox" checked={editOverrideData.isActive ?? true} onChange={e => setEditOverrideData({...editOverrideData, isActive: e.target.checked})} className="rounded text-indigo-600" />
              <span>Active</span>
            </label>
          ) : (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${override?.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {override?.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSaveOverride(override?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => { setEditingOverrideId(null); setIsAddingOverride(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setEditingOverrideId(override.id);
                  setEditOverrideData({ ...override });
                }} 
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleDelete(override.id, 'override')} 
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
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">{t.incentives}</h2>
        </div>
        
        <div className="flex bg-slate-200/50 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('oem')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'oem' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            OEM Incentives
          </button>
          <button 
            onClick={() => setActiveTab('dealer')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'dealer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Dealer Discounts
          </button>
          <button 
            onClick={() => setActiveTab('overrides')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'overrides' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Overrides
          </button>
        </div>

        {activeTab === 'oem' && (
          <div className="flex items-center gap-2">
            {selectedOemIncentives.size > 0 && (
              <div className="flex items-center gap-2 mr-4 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                <span className="text-sm font-medium text-indigo-700">{selectedOemIncentives.size} selected</span>
                <input 
                  type="number" 
                  placeholder="New Amount ($)" 
                  value={bulkOemAmount}
                  onChange={e => setBulkOemAmount(e.target.value)}
                  className="w-32 px-2 py-1 border border-indigo-200 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleBulkSaveOem}
                  disabled={!bulkOemAmount || isBulkEditingOem}
                  className="px-3 py-1 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setIsAdding(true);
                setEditData({ name: '', type: 'REBATE', dealApplicability: 'ALL', isTaxableCa: true, isActive: true, stackable: true, amountDollars: '' });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addIncentive}</span>
            </button>
          </div>
        )}
        {activeTab === 'dealer' && (
          <button
            onClick={() => {
              setIsAddingDealer(true);
              setEditDealerData({ make: '', isActive: true, amountDollars: '' });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addDiscount}</span>
          </button>
        )}
        {activeTab === 'overrides' && (
          <button
            onClick={() => {
              setIsAddingOverride(true);
              setEditOverrideData({ isActive: true });
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Override</span>
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        {activeTab === 'oem' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium w-10">
                  <input 
                    type="checkbox" 
                    checked={selectedOemIncentives.size === incentives.length && incentives.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOemIncentives(new Set(incentives.map(i => i.id)));
                      } else {
                        setSelectedOemIncentives(new Set());
                      }
                    }}
                    className="rounded text-indigo-600"
                  />
                </th>
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
                  {renderOemRow(null, true)}
                </tr>
              )}

              {incentives.map(incentive => (
                <tr key={incentive.id} className="hover:bg-slate-50 transition-colors">
                  {renderOemRow(incentive, editingId === incentive.id)}
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
        )}

        {activeTab === 'dealer' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle Target</th>
                <th className="px-4 py-3 font-medium">Discount Amount</th>
                <th className="px-4 py-3 font-medium">Status & Dates</th>
                <th className="px-4 py-3 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isAddingDealer && (
                <tr className="bg-emerald-50/50">
                  {renderDealerRow(null, true)}
                </tr>
              )}

              {dealerDiscounts.map(discount => (
                <tr key={discount.id} className="hover:bg-slate-50 transition-colors">
                  {renderDealerRow(discount, editingDealerId === discount.id)}
                </tr>
              ))}
              
              {dealerDiscounts.length === 0 && !isAddingDealer && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {t.noDiscounts}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'overrides' && (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Target (Bank/Vehicle)</th>
                <th className="px-4 py-3 font-medium">Markup</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isAddingOverride && (
                <tr className="bg-purple-50/50">
                  {renderOverrideRow(null, true)}
                </tr>
              )}

              {overrides.map(override => (
                <tr key={override.id} className="hover:bg-slate-50 transition-colors">
                  {renderOverrideRow(override, editingOverrideId === override.id)}
                </tr>
              ))}
              
              {overrides.length === 0 && !isAddingOverride && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No program overrides added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
