import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { toast } from 'react-hot-toast';
import { clearClientCache } from '../../utils/fetchWithCache';

interface BulkEditDealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDealIds: string[];
  onSuccess: () => void;
  lenders?: any[];
}

export function BulkEditDealsModal({ isOpen, onClose, selectedDealIds, onSuccess, lenders = [] }: BulkEditDealsModalProps) {
  const [updates, setUpdates] = useState<any>({});
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (Object.keys(updates).length === 0) {
      toast.error('No updates specified');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/deals/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          dealIds: selectedDealIds,
          updates
        })
      });

      if (!response.ok) throw new Error('Failed to bulk update deals');
      
      const result = await response.json();
      clearClientCache();
      toast.success(`Successfully updated ${result.count} deals`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast.error('Failed to update deals');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Bulk Edit Deals</h2>
            <p className="text-sm text-slate-500 mt-1">Applying changes to {selectedDealIds.length} selected deals</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Changes made here will be applied to all {selectedDealIds.length} selected deals. Only fields with values entered will be updated. Empty fields will remain unchanged.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Financial Adjustments</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Money Factor (MF)</label>
                <input
                  type="number"
                  step="0.00001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 0.00150"
                  value={updates.mf || ''}
                  onChange={e => setUpdates({ ...updates, mf: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Residual Value (RV %)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 55.0"
                  value={updates.rv || ''}
                  onChange={e => setUpdates({ ...updates, rv: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">APR (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 4.9"
                  value={updates.apr || ''}
                  onChange={e => setUpdates({ ...updates, apr: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 5.0"
                  value={updates.discountPercent || ''}
                  onChange={e => setUpdates({ ...updates, discountPercent: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 border-b pb-2">Lifecycle & Marketing</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Review Status</label>
                <select
                  value={updates.reviewStatus || ''}
                  onChange={e => setUpdates({ ...updates, reviewStatus: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Change --</option>
                  <option value="APPROVED">Approved</option>
                  <option value="NEEDS_WORK">Needs Work</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Publish Status</label>
                <select
                  value={updates.publishStatus || ''}
                  onChange={e => setUpdates({ ...updates, publishStatus: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Change --</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Time Buyer Eligible</label>
                <select
                  value={updates.isFirstTimeBuyerEligible === undefined ? '' : String(updates.isFirstTimeBuyerEligible)}
                  onChange={e => {
                    const val = e.target.value;
                    setUpdates({ ...updates, isFirstTimeBuyerEligible: val === '' ? undefined : val === 'true' });
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Change --</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lender</label>
                <select
                  value={updates.lenderId || ''}
                  onChange={e => setUpdates({ ...updates, lenderId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- No Change --</option>
                  <option value="null">None</option>
                  {lenders.map(lender => (
                    <option key={lender.id} value={lender.id}>{lender.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiration Date</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={updates.expirationDate || ''}
                  onChange={e => setUpdates({ ...updates, expirationDate: e.target.value || undefined })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (JSON Array)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder='e.g. ["Special", "1 Left"]'
                  value={updates.tags || ''}
                  onChange={e => setUpdates({ ...updates, tags: e.target.value || undefined })}
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded text-indigo-600"
                    checked={updates.isSoldOut === true}
                    onChange={e => setUpdates({ ...updates, isSoldOut: e.target.checked ? true : undefined })}
                  />
                  <span className="text-sm text-slate-700">Mark as Sold Out</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded text-indigo-600"
                    checked={updates.isPinned === true}
                    onChange={e => setUpdates({ ...updates, isPinned: e.target.checked ? true : undefined })}
                  />
                  <span className="text-sm text-slate-700">Pin to Top</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(updates).length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
