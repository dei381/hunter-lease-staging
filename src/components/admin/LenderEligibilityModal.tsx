import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';

export const LenderEligibilityModal = ({ 
  lender, 
  onClose, 
  onSave 
}: { 
  lender: any, 
  onClose: () => void, 
  onSave: () => void 
}) => {
  const [rules, setRules] = useState<any[]>(lender.eligibilityRules || []);
  const [saving, setSaving] = useState(false);

  const handleAddRule = () => {
    setRules([...rules, {
      make: 'ALL',
      model: 'ALL',
      dealApplicability: 'ALL',
      allowFirstTimeBuyer: false,
      allowWithCoSigner: true,
      requiresEstablishedCredit: true,
      minUxTierRequired: 't1'
    }]);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };

  const handleChange = (index: number, field: string, value: any) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/lenders/${lender.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          name: lender.name,
          isCaptive: lender.isCaptive,
          isFirstTimeBuyerFriendly: lender.isFirstTimeBuyerFriendly,
          eligibilityRules: rules
        })
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        const data = await response.json();
        alert(`Failed to save rules: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save rules:', error);
      alert('Network error while saving rules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Eligibility Rules for {lender.name}</h2>
            <p className="text-sm text-slate-500">Configure which makes, models, and buyer profiles this lender accepts.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {rules.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">No specific rules</h3>
              <p className="text-slate-500 text-sm mb-4">This lender will use its default global settings for all deals.</p>
              <button 
                onClick={handleAddRule}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Rule
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
                  <button 
                    onClick={() => handleRemoveRule(index)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <h4 className="font-medium text-slate-900 mb-4 pr-8">Rule #{index + 1}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Make</label>
                      <input 
                        type="text" 
                        value={rule.make} 
                        onChange={e => handleChange(index, 'make', e.target.value)}
                        placeholder="e.g. Toyota, BMW, ALL"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
                      <input 
                        type="text" 
                        value={rule.model} 
                        onChange={e => handleChange(index, 'model', e.target.value)}
                        placeholder="e.g. Camry, X5, ALL"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Deal Type</label>
                      <select 
                        value={rule.dealApplicability} 
                        onChange={e => handleChange(index, 'dealApplicability', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="ALL">All Deals</option>
                        <option value="LEASE">Lease Only</option>
                        <option value="FINANCE">Finance Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={rule.allowFirstTimeBuyer} 
                        onChange={e => handleChange(index, 'allowFirstTimeBuyer', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900">Allow First-Time Buyers</div>
                        <div className="text-xs text-slate-500">Can approve applicants with no auto loan history</div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={rule.allowWithCoSigner} 
                        onChange={e => handleChange(index, 'allowWithCoSigner', e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <div>
                        <div className="text-sm font-medium text-slate-900">Allow Co-Signer</div>
                        <div className="text-xs text-slate-500">Accepts applications with a co-signer</div>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={handleAddRule}
                className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center font-medium text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Rule
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Rules'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
