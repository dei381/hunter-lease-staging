import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { useCarData } from '../../hooks/useCarData';

export const BulkUpdatesAdmin = () => {
  const [filters, setFilters] = useState({
    make: '',
    makeId: '',
    model: '',
    year: '',
    trim: ''
  });

  const { data: makes = [] } = useCarData<{id: string, name: string}[]>('/api/v2/makes');
  const { data: models = [] } = useCarData<{id: string, name: string}[]>(filters.makeId ? `/api/v2/models?makeId=${filters.makeId}` : null);

  const [updates, setUpdates] = useState({
    rvAdjustment: '',
    mfAdjustment: '',
    incentiveName: '',
    incentiveAmount: '',
    dealerDiscount: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/calculator/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filters: {
            make: filters.make || undefined,
            model: filters.model || undefined,
            year: filters.year ? parseInt(filters.year) : undefined,
            trim: filters.trim || undefined
          },
          updates: {
            rvAdjustment: updates.rvAdjustment ? parseFloat(updates.rvAdjustment) : undefined,
            mfAdjustment: updates.mfAdjustment ? parseFloat(updates.mfAdjustment) : undefined,
            addIncentive: updates.incentiveName && updates.incentiveAmount ? {
              name: updates.incentiveName,
              amountCents: parseInt(updates.incentiveAmount) * 100,
              type: 'REBATE'
            } : undefined,
            dealerDiscount: updates.dealerDiscount ? parseInt(updates.dealerDiscount) : undefined
          }
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to apply bulk updates');
      }

      const data = await res.json();
      setMessage({ type: 'success', text: `Successfully updated ${data.updatedProgramsCount} programs.` });
      
      // Reset updates
      setUpdates({
        rvAdjustment: '',
        mfAdjustment: '',
        incentiveName: '',
        incentiveAmount: '',
        dealerDiscount: ''
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Bulk Updates</h2>
        <p className="text-sm text-[var(--mu2)] mt-1">Apply mass changes to residuals, money factors, incentives, and dealer discounts.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div className="text-sm">{message.text}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Filters */}
        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-[var(--b2)] pb-2">1. Target Vehicles</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <label className="space-y-1">
              <span className="text-xs text-[var(--mu2)]">Make</span>
              <select 
                value={filters.makeId} 
                onChange={e => {
                  const make = makes.find(m => m.id === e.target.value);
                  setFilters({...filters, makeId: e.target.value, make: make?.name || '', model: ''});
                }}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
              >
                <option value="">All Makes</option>
                {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[var(--mu2)]">Model</span>
              <select 
                value={filters.model} 
                onChange={e => setFilters({...filters, model: e.target.value})}
                disabled={!filters.makeId}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)] disabled:opacity-50"
              >
                <option value="">All Models</option>
                {models.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[var(--mu2)]">Year</span>
              <input 
                type="number" 
                placeholder="e.g. 2024"
                value={filters.year} 
                onChange={e => setFilters({...filters, year: e.target.value})}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[var(--mu2)]">Trim</span>
              <input 
                type="text" 
                placeholder="e.g. LE"
                value={filters.trim} 
                onChange={e => setFilters({...filters, trim: e.target.value})}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
              />
            </label>
          </div>
        </div>

        {/* Updates */}
        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-lg border-b border-[var(--b2)] pb-2">2. Apply Changes</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs text-[var(--mu2)]">Residual Value Adjustment (%)</span>
                <input 
                  type="number" 
                  step="0.1"
                  placeholder="e.g. 2.0 or -1.5"
                  value={updates.rvAdjustment} 
                  onChange={e => setUpdates({...updates, rvAdjustment: e.target.value})}
                  className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                />
                <p className="text-[10px] text-[var(--mu2)]">Adds or subtracts from the base residual percentage.</p>
              </label>
              
              <label className="block space-y-1">
                <span className="text-xs text-[var(--mu2)]">Money Factor Adjustment</span>
                <input 
                  type="number" 
                  step="0.00001"
                  placeholder="e.g. 0.00010 or -0.00005"
                  value={updates.mfAdjustment} 
                  onChange={e => setUpdates({...updates, mfAdjustment: e.target.value})}
                  className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                />
                <p className="text-[10px] text-[var(--mu2)]">Adds or subtracts from the base money factor.</p>
              </label>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs text-[var(--mu2)] block">Add Global Incentive</span>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Incentive Name"
                    value={updates.incentiveName} 
                    onChange={e => setUpdates({...updates, incentiveName: e.target.value})}
                    className="flex-1 bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                  <input 
                    type="number" 
                    placeholder="Amount ($)"
                    value={updates.incentiveAmount} 
                    onChange={e => setUpdates({...updates, incentiveAmount: e.target.value})}
                    className="w-32 bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                  />
                </div>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-[var(--mu2)]">Set Dealer Discount ($)</span>
                <input 
                  type="number" 
                  placeholder="e.g. 1500"
                  value={updates.dealerDiscount} 
                  onChange={e => setUpdates({...updates, dealerDiscount: e.target.value})}
                  className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]"
                />
                <p className="text-[10px] text-[var(--mu2)]">Creates a manual dealer discount for the selected vehicles.</p>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={loading || (!updates.rvAdjustment && !updates.mfAdjustment && !updates.incentiveName && !updates.dealerDiscount)}
            className="flex items-center gap-2 bg-[var(--lime)] text-black px-6 py-3 rounded-xl font-bold hover:bg-[var(--lime)]/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Applying...' : <><Save className="w-5 h-5" /> Apply Bulk Updates</>}
          </button>
        </div>
      </form>
    </div>
  );
};
