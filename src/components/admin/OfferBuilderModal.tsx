import React, { useState } from 'react';
import { X, Save, Calculator, Car, DollarSign } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { toast } from 'react-hot-toast';

export const OfferBuilderModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) => {
  const [saving, setSaving] = useState(false);
  
  // Deal properties
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [type, setType] = useState<'lease' | 'finance'>('lease');
  
  const [msrp, setMsrp] = useState('');
  const [discount, setDiscount] = useState('0');
  const [rebates, setRebates] = useState('0');
  
  const [term, setTerm] = useState('36');
  const [mileage, setMileage] = useState('10000');
  const [downPayment, setDownPayment] = useState('3000');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  
  const [mf, setMf] = useState('');
  const [rv, setRv] = useState('');
  const [apr, setApr] = useState('');
  
  const [imageUrl, setImageUrl] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!make || !model || !msrp || !term || !monthlyPayment) {
      return toast.error('Please fill in required fields (Make, Model, MSRP, Term, Payment)');
    }
    
    setSaving(true);
    try {
      const msrpValue = parseFloat(msrp) || 0;
      const discountValue = parseFloat(discount) || 0;
      
      const financialData = {
        make,
        model,
        trim,
        year: parseInt(year) || new Date().getFullYear(),
        type,
        msrp: { value: msrpValue, provenance_status: 'manual' },
        salePrice: { value: Math.max(0, msrpValue - discountValue), provenance_status: 'manual' },
        dealerDiscount: discountValue,
        rebates: { value: parseFloat(rebates) || 0, provenance_status: 'manual' },
        term: { value: parseInt(term) || 36, provenance_status: 'manual' },
        mileage: { value: parseInt(mileage) || 10000, provenance_status: 'manual' },
        downPayment: { value: parseInt(downPayment) || 0, provenance_status: 'manual' },
        monthlyPayment: { value: parseFloat(monthlyPayment) || 0, provenance_status: 'manual' },
        moneyFactor: { value: parseFloat(mf) || 0, provenance_status: 'manual' },
        residualValue: { value: (parseFloat(rv) || 0) / 100, provenance_status: 'manual' },
        apr: { value: parseFloat(apr) || 0, provenance_status: 'manual' },
        image: imageUrl
      };

      const payload = {
        financialData,
        reviewStatus: 'APPROVED',
        publishStatus: 'PUBLISHED',
        isFirstTimeBuyerEligible: false
      };

      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Deal saved successfully');
        onSave();
        onClose();
      } else {
        const err = await response.json();
        toast.error(err.error || 'Failed to save deal');
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error while saving deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-screen my-8 flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Add Deal (Simple Mode)</h2>
              <p className="text-sm text-slate-500">Fast, manual data-entry without external APIs.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <Car className="w-4 h-4 text-indigo-500" /> Vehicle Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Make *</label>
                <input type="text" value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Toyota" className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Model *</label>
                <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. Camry" className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Trim</label>
                <input type="text" value={trim} onChange={e => setTrim(e.target.value)} placeholder="e.g. SE" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
                <input type="text" value={year} onChange={e => setYear(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Image URL</label>
              <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <DollarSign className="w-4 h-4 text-indigo-500" /> General Financials
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select value={type} onChange={e => setType(e.target.value as 'lease' | 'finance')} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="lease">Lease</option>
                  <option value="finance">Finance</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">MSRP ($) *</label>
                <input type="number" value={msrp} onChange={e => setMsrp(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Dealer Discount ($)</label>
                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rebates ($)</label>
                <input type="number" value={rebates} onChange={e => setRebates(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
              <Calculator className="w-4 h-4 text-indigo-500" /> Structure & Payment
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 border border-indigo-100 bg-indigo-50/30 p-4 rounded-xl">
               <div>
                  <label className="block text-xs font-medium text-indigo-900 mb-1">Target Monthly Payment ($) *</label>
                  <input type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg text-indigo-900 font-bold bg-white focus:border-indigo-500 focus:ring-0" placeholder="e.g. 299" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-900 mb-1">Due At Signing / Down ($)</label>
                  <input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg text-indigo-900 font-bold bg-white focus:border-indigo-500 focus:ring-0" placeholder="3000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-indigo-900 mb-1">Term (mo) *</label>
                  <input type="number" value={term} onChange={e => setTerm(e.target.value)} className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg text-indigo-900 font-bold bg-white focus:border-indigo-500 focus:ring-0" placeholder="36" required />
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {type === 'lease' ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mileage / yr</label>
                    <input type="number" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="10000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Money Factor (optional)</label>
                    <input type="number" step="0.00001" value={mf} onChange={e => setMf(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 0.00125" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Residual % (optional)</label>
                    <input type="number" value={rv} onChange={e => setRv(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 55" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">APR % (optional)</label>
                  <input type="number" step="0.1" value={apr} onChange={e => setApr(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 4.9" />
                </div>
              )}
            </div>
          </section>

        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 sticky bottom-0 z-10 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Manual Deal'}
          </button>
        </div>
      </div>
    </div>
  );
};
