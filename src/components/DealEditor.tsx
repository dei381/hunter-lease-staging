import React, { useState, useEffect } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function DealEditor({ deal, carDb, lenders, onSave, onCancel, t }: any) {
  const [editingData, setEditingData] = useState<any>(null);
  const [selectedLenderId, setSelectedLenderId] = useState<string | null>(null);
  const [isFirstTimeBuyerEligible, setIsFirstTimeBuyerEligible] = useState(false);
  const [seoData, setSeoData] = useState({ seoTitle: '', seoDescription: '', customUrl: '' });
  const [revenueData, setRevenueData] = useState({ brokerFee: '0', dealerReserve: '0', profit: '0' });
  const [lifecycleData, setLifecycleData] = useState({
    expirationDate: '',
    isSoldOut: false,
    isPinned: false,
    tags: '',
    dealerNotes: ''
  });
  const [addFieldModal, setAddFieldModal] = useState({ isOpen: false, fieldName: '', isNumeric: false });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (deal) {
      try {
        const parsed = JSON.parse(deal.financialData);
        setEditingData(parsed);
        setSelectedLenderId(deal.lenderId || null);
        setIsFirstTimeBuyerEligible(deal.isFirstTimeBuyerEligible || false);
        setSeoData({
          seoTitle: deal.seoTitle || '',
          seoDescription: deal.seoDescription || '',
          customUrl: deal.customUrl || ''
        });
        setRevenueData({
          brokerFee: ((deal.brokerFeeCents || 0) / 100).toString(),
          dealerReserve: ((deal.dealerReserveCents || 0) / 100).toString(),
          profit: ((deal.profitCents || 0) / 100).toString()
        });
        setLifecycleData({
          expirationDate: deal.expirationDate ? new Date(deal.expirationDate).toISOString().split('T')[0] : '',
          isSoldOut: deal.isSoldOut || false,
          isPinned: deal.isPinned || false,
          tags: deal.tags || '',
          dealerNotes: deal.dealerNotes || ''
        });
      } catch (e) {
        console.error("Failed to parse deal data", e);
      }
    }
  }, [deal]);

  const handleFieldChange = (key: string, value: any) => {
    setHasUnsavedChanges(true);
    setEditingData((prev: any) => {
      if (!prev) return prev;
      const newData = { ...prev };
      if (typeof newData[key] === 'object' && newData[key] !== null && 'value' in newData[key]) {
        newData[key] = {
          ...newData[key],
          value: value
        };
      } else {
        newData[key] = value;
      }
      return newData;
    });
  };

  const handleAddField = () => {
    setAddFieldModal({ isOpen: true, fieldName: '', isNumeric: false });
  };

  const confirmAddField = () => {
    if (!addFieldModal.fieldName) return;
    
    setHasUnsavedChanges(true);
    setEditingData((prev: any) => ({
      ...prev,
      [addFieldModal.fieldName]: addFieldModal.isNumeric 
        ? { value: 0, provenance_status: 'manual' }
        : ''
    }));
    
    setAddFieldModal({ isOpen: false, fieldName: '', isNumeric: false });
  };

  const handleSave = async (status: string) => {
    setIsSaving(true);
    try {
      await onSave(deal.id, status, {
        financialData: editingData,
        lenderId: selectedLenderId,
        isFirstTimeBuyerEligible,
        seoTitle: seoData.seoTitle,
        seoDescription: seoData.seoDescription,
        customUrl: seoData.customUrl,
        brokerFeeCents: Math.round(parseFloat(revenueData.brokerFee || '0') * 100),
        dealerReserveCents: Math.round(parseFloat(revenueData.dealerReserve || '0') * 100),
        profitCents: Math.round(parseFloat(revenueData.profit || '0') * 100),
        expirationDate: lifecycleData.expirationDate ? new Date(lifecycleData.expirationDate).toISOString() : null,
        isSoldOut: lifecycleData.isSoldOut,
        isPinned: lifecycleData.isPinned,
        tags: lifecycleData.tags,
        dealerNotes: lifecycleData.dealerNotes
      });
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        return;
      }
    }
    onCancel();
  };

  if (!editingData) return null;

  return (
    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{t.dataExtractionReview}</h4>
          <span className="text-xs text-slate-500">{t.extractionReviewDesc}</span>
        </div>
        <div className="text-right flex items-center gap-4">
          {hasUnsavedChanges && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
          <div>
            <span className="text-xs font-mono text-slate-500 block">{t.eligibilityStatus}:</span>
            <span className={`text-xs font-bold ${JSON.parse(deal.eligibility || '{}').is_publishable ? 'text-emerald-600' : 'text-amber-600'}`}>
              {JSON.parse(deal.eligibility || '{}').is_publishable ? t.publishable : t.blocked}
            </span>
          </div>
        </div>
      </div>

      {JSON.parse(deal.eligibility || '{}').blocking_reasons?.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="text-sm font-bold text-red-800 mb-2">{t.blockingReasons}</h5>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {JSON.parse(deal.eligibility || '{}').blocking_reasons.map((reason: string, idx: number) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
        <div>
          <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">
            {t.lenderBank}
          </label>
          <select
            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            value={selectedLenderId || ''}
            onChange={(e) => {
              setHasUnsavedChanges(true);
              setSelectedLenderId(e.target.value || null);
            }}
          >
            <option value="">{t.defaultCaptive}</option>
            {lenders.map((lender: any) => (
                <option key={lender.id} value={lender.id}>
                  {lender.name} {lender.isFirstTimeBuyerFriendly ? `(${t.ftbFriendly})` : ''}
                </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">
            {t.ftbEligibility}
          </label>
          <div className="flex items-center space-x-4 mt-2">
            <button
              onClick={() => {
                setHasUnsavedChanges(true);
                setIsFirstTimeBuyerEligible(true);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                isFirstTimeBuyerEligible 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.eligible}
            </button>
            <button
              onClick={() => {
                setHasUnsavedChanges(true);
                setIsFirstTimeBuyerEligible(false);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                !isFirstTimeBuyerEligible 
                  ? 'bg-red-600 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.notEligible}
            </button>
          </div>
          <p className="text-[10px] text-indigo-600 mt-2 italic">
            {t.ftbEligibilityDesc}
          </p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-indigo-900 uppercase mb-2">
            Image URL
          </label>
          <p className="text-[10px] text-slate-500 mb-2">
            Вы можете использовать внешнюю ссылку или загрузить фото в <strong>Библиотеку медиа</strong> и скопировать путь (например, /uploads/cars/filename.png).
          </p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={editingData.image || ''} 
              onChange={e => handleFieldChange('image', e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://images.unsplash.com/..."
            />
            <button 
              onClick={async () => {
                if (!editingData.make || !editingData.model) {
                  toast.error('Please enter Make and Model first');
                  return;
                }
                try {
                  const res = await fetch('/api/cars');
                  const fetchedCarDb = await res.json();
                  const make = fetchedCarDb.makes.find((m: any) => m.name.toLowerCase() === editingData.make.toLowerCase());
                  if (make) {
                    const model = make.models.find((m: any) => 
                      editingData.model.toLowerCase().includes(m.name.toLowerCase()) || 
                      m.name.toLowerCase().includes(editingData.model.toLowerCase())
                    );
                    if (model && model.imageUrl) {
                      handleFieldChange('image', model.imageUrl);
                    } else {
                      toast.error('No image found for this model in database');
                    }
                  } else {
                    toast.error('Manufacturer not found in database');
                  }
                } catch (err) {
                  console.error('Failed to fetch car image', err);
                }
              }}
              className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              Fetch
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(editingData).map(([key, data]: [string, any]) => {
          if (key === 'image') return null; // Handled above
          
          if (typeof data === 'string' || typeof data === 'number') {
            let inputElement = (
              <input
                type={typeof data === 'number' || (typeof data === 'string' && /^-?\d*\.?\d*$/.test(data)) ? 'number' : 'text'}
                className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                value={data}
                onChange={(e) => handleFieldChange(key, e.target.value)}
              />
            );

            if (carDb && (key === 'make' || key === 'model' || key === 'trim')) {
              if (key === 'make') {
                inputElement = (
                  <select
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                    value={data}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                  >
                    <option value="">Select Make</option>
                    {carDb.makes.map((m: any, idx: number) => <option key={`${m.name}-${idx}`} value={m.name}>{m.name}</option>)}
                  </select>
                );
              } else if (key === 'model' && editingData.make) {
                const makeObj = carDb.makes.find((m: any) => m.name.toLowerCase() === editingData.make.toLowerCase());
                if (makeObj) {
                  inputElement = (
                    <select
                      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                      value={data}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                    >
                      <option value="">Select Model</option>
                      {makeObj.models.map((m: any, idx: number) => <option key={`${m.name}-${idx}`} value={m.name}>{m.name}</option>)}
                    </select>
                  );
                }
              } else if (key === 'trim' && editingData.make && editingData.model) {
                const makeObj = carDb.makes.find((m: any) => m.name.toLowerCase() === editingData.make.toLowerCase());
                const modelObj = makeObj?.models.find((m: any) => m.name.toLowerCase() === editingData.model.toLowerCase());
                if (modelObj) {
                  inputElement = (
                    <select
                      className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
                      value={data}
                      onChange={(e) => {
                        handleFieldChange(key, e.target.value);
                        const trimObj = modelObj.trims.find((t: any) => t.name === e.target.value);
                        if (trimObj) {
                          if (trimObj.msrp) handleFieldChange('msrp', trimObj.msrp);
                          if (trimObj.mf) handleFieldChange('moneyFactor', trimObj.mf);
                          if (trimObj.rv36) handleFieldChange('residualValue', trimObj.rv36);
                          if (trimObj.leaseCash) handleFieldChange('manufacturerRebate', trimObj.leaseCash);
                        }
                      }}
                    >
                      <option value="">Select Trim</option>
                      {modelObj.trims.map((t: any, idx: number) => <option key={`${t.name}-${idx}`} value={t.name}>{t.name}</option>)}
                    </select>
                  );
                }
              }
            }

            return (
              <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                  {key.replace(/_/g, ' ')}
                </label>
                <div className="relative">
                  {inputElement}
                </div>
              </div>
            );
          }
          if (typeof data !== 'object' || data === null || !('value' in data)) return null;
          return (
            <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="block text-xs font-medium text-slate-700 uppercase mb-1">
                {key.replace(/_/g, ' ')}
              </label>
              <div className="relative">
                <input
                  type={typeof data.value === 'number' || (typeof data.value === 'string' && /^-?\d*\.?\d*$/.test(data.value)) ? 'number' : 'text'}
                  step="any"
                  className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  value={data.value !== null && data.value !== undefined ? data.value : ''}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  data.provenance_status === 'extracted_from_document' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : data.provenance_status === 'matched_from_verified_program'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {data.provenance_status === 'extracted_from_document' ? t.foundInDoc : 
                   data.provenance_status === 'matched_from_verified_program' ? t.verified11Key : t.missingAssumed}
                </span>

                {(key === 'hunterDiscount' || key === 'manufacturerRebate' || key === 'rebates' || key === 'savings') && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-3 w-3"
                      checked={data.isGlobal || false}
                      onChange={(e) => {
                        setEditingData((prev: any) => ({
                          ...prev,
                          [key]: {
                            ...prev[key],
                            isGlobal: e.target.checked
                          }
                        }));
                      }}
                    />
                    <span className="text-[10px] font-medium text-slate-600">For Everyone</span>
                  </label>
                )}
              </div>
            </div>
          );
        })}
        <button 
          onClick={handleAddField}
          className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="text-xs font-bold">{t.addField}</span>
        </button>
      </div>

      <div className="mb-6 border-t border-slate-200 pt-6">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Revenue Tracking</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Broker Fee ($)</label>
            <input
              type="number"
              value={revenueData.brokerFee}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setRevenueData({ ...revenueData, brokerFee: e.target.value });
              }}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Dealer Reserve ($)</label>
            <input
              type="number"
              value={revenueData.dealerReserve}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setRevenueData({ ...revenueData, dealerReserve: e.target.value });
              }}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Total Profit ($)</label>
            <input
              type="number"
              value={revenueData.profit}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setRevenueData({ ...revenueData, profit: e.target.value });
              }}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 border-t border-slate-200 pt-6">
        <h4 className="text-sm font-bold text-slate-900 mb-4">SEO & Marketing</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Custom URL Slug</label>
            <input
              type="text"
              value={seoData.customUrl}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setSeoData({ ...seoData, customUrl: e.target.value });
              }}
              placeholder="e.g. 2024-honda-civic-lease"
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Meta Title</label>
            <input
              type="text"
              value={seoData.seoTitle}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setSeoData({ ...seoData, seoTitle: e.target.value });
              }}
              placeholder="Best Honda Civic Lease Deals"
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Meta Description</label>
            <textarea
              value={seoData.seoDescription}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setSeoData({ ...seoData, seoDescription: e.target.value });
              }}
              rows={2}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 border-t border-slate-200 pt-6">
        <h4 className="text-sm font-bold text-slate-900 mb-4">Lifecycle & Marketing</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Expiration Date</label>
            <input
              type="date"
              value={lifecycleData.expirationDate}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setLifecycleData({ ...lifecycleData, expirationDate: e.target.value });
              }}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={lifecycleData.tags}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setLifecycleData({ ...lifecycleData, tags: e.target.value });
              }}
              placeholder="e.g. EV, Special, SUV"
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lifecycleData.isSoldOut}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setLifecycleData({ ...lifecycleData, isSoldOut: e.target.checked });
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">Mark as Sold Out</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lifecycleData.isPinned}
                onChange={(e) => {
                  setHasUnsavedChanges(true);
                  setLifecycleData({ ...lifecycleData, isPinned: e.target.checked });
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">Pin to Top</span>
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 uppercase mb-1">Dealer Notes (Internal)</label>
            <textarea
              value={lifecycleData.dealerNotes}
              onChange={(e) => {
                setHasUnsavedChanges(true);
                setLifecycleData({ ...lifecycleData, dealerNotes: e.target.value });
              }}
              rows={2}
              placeholder="Internal notes about this deal..."
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center border-t border-slate-200 pt-4">
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => handleSave('REJECTED')}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
          >
            {t.rejectDeal}
          </button>
          <button
            onClick={() => handleSave('NEEDS_REVIEW')}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : t.saveDraft}
          </button>
          <button
            onClick={() => handleSave('APPROVED')}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : t.approvePublish}
          </button>
        </div>
      </div>

      {addFieldModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Add New Field</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Name</label>
                  <input
                    type="text"
                    value={addFieldModal.fieldName}
                    onChange={(e) => setAddFieldModal(prev => ({ ...prev, fieldName: e.target.value }))}
                    placeholder="e.g. money_factor, residual_value"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isNumeric"
                    checked={addFieldModal.isNumeric}
                    onChange={(e) => setAddFieldModal(prev => ({ ...prev, isNumeric: e.target.checked }))}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isNumeric" className="ml-2 block text-sm text-slate-700">
                    Is this a numeric field?
                  </label>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={() => setAddFieldModal({ isOpen: false, fieldName: '', isNumeric: false })}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddField}
                disabled={!addFieldModal.fieldName}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
