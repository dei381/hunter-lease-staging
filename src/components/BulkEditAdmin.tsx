import React, { useState, useEffect, useMemo } from 'react';
import { Save, Search, Filter, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

export const BulkEditAdmin = () => {
  const [activeTab, setActiveTab] = useState<'lease' | 'finance' | 'incentives' | 'discounts'>('lease');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setEdits({});
    setMessage(null);
    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' :
                       activeTab === 'finance' ? 'finance-programs' :
                       activeTab === 'incentives' ? '../incentives' :
                       'dealer-discounts';
      
      const response = await fetch(`/api/admin/${activeTab === 'incentives' ? 'incentives' : `bulk/${endpoint}`}`, {
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (Object.keys(edits).length === 0) return;
    
    setSaving(true);
    setMessage(null);
    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' :
                       activeTab === 'finance' ? 'finance-programs' :
                       activeTab === 'incentives' ? 'incentives' :
                       'dealer-discounts';
                       
      const updates = Object.entries(edits).map(([id, values]) => ({ id, ...values }));
      
      const response = await fetch(`/api/admin/bulk/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Changes saved successfully!' });
        setEdits({});
        fetchData();
      } else {
        setMessage({ type: 'error', text: 'Failed to save changes.' });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Network error while saving.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEdit = (id: string, field: string, value: any) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const filteredData = useMemo(() => {
    if (!search) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter(item => 
      (item.make?.toLowerCase() || '').includes(lowerSearch) ||
      (item.model?.toLowerCase() || '').includes(lowerSearch) ||
      (item.name?.toLowerCase() || '').includes(lowerSearch) ||
      (item.lender?.name?.toLowerCase() || '').includes(lowerSearch)
    );
  }, [data, search]);

  const hasChanges = Object.keys(edits).length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col h-[calc(100vh-120px)]">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Edit Parameters</h2>
            <p className="text-sm text-slate-500">Quickly update rates, residuals, and discounts across multiple programs.</p>
          </div>
          <div className="flex items-center space-x-4">
            {message && (
              <div className={`flex items-center space-x-2 text-sm font-medium ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{message.text}</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasChanges && !saving
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save {Object.keys(edits).length > 0 ? `(${Object.keys(edits).length})` : ''} Changes</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab('lease')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'lease' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Lease (MF/RV)
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'finance' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Finance (APR)
            </button>
            <button
              onClick={() => setActiveTab('incentives')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'incentives' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              OEM Incentives
            </button>
            <button
              onClick={() => setActiveTab('discounts')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'discounts' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              Dealer Discounts
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by make, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading data...
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex justify-center items-center h-64 text-slate-500">
            No records found.
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle / Program</th>
                {activeTab === 'lease' && (
                  <>
                    <th className="px-4 py-3 font-medium">Term/Miles</th>
                    <th className="px-4 py-3 font-medium">Lender</th>
                    <th className="px-4 py-3 font-medium w-32">Money Factor</th>
                    <th className="px-4 py-3 font-medium w-32">Residual %</th>
                  </>
                )}
                {activeTab === 'finance' && (
                  <>
                    <th className="px-4 py-3 font-medium">Term</th>
                    <th className="px-4 py-3 font-medium">Lender</th>
                    <th className="px-4 py-3 font-medium w-32">APR %</th>
                  </>
                )}
                {activeTab === 'incentives' && (
                  <>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium w-40">Amount ($)</th>
                  </>
                )}
                {activeTab === 'discounts' && (
                  <>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium w-40">Discount ($)</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => {
                const isEdited = !!edits[item.id];
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isEdited ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-4 py-2">
                      {activeTab === 'incentives' ? (
                        <div>
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.make} {item.model || '(All Models)'}</div>
                        </div>
                      ) : activeTab === 'discounts' ? (
                        <div className="font-medium text-slate-900">
                          {item.make || 'All Makes'} {item.model ? `/ ${item.model}` : ''} {item.trim ? `/ ${item.trim}` : ''}
                        </div>
                      ) : (
                        <div className="font-medium text-slate-900">
                          {item.year} {item.make} {item.model} {item.trim}
                        </div>
                      )}
                    </td>
                    
                    {activeTab === 'lease' && (
                      <>
                        <td className="px-4 py-2 text-slate-600">{item.term}mo / {item.mileage}k</td>
                        <td className="px-4 py-2 text-slate-600">{item.lender?.name} ({item.internalLenderTier})</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.00001"
                            value={edits[item.id]?.buyRateMf ?? item.buyRateMf}
                            onChange={(e) => handleEdit(item.id, 'buyRateMf', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${edits[item.id]?.buyRateMf !== undefined ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={edits[item.id]?.residualPercentage ?? item.residualPercentage}
                            onChange={(e) => handleEdit(item.id, 'residualPercentage', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${edits[item.id]?.residualPercentage !== undefined ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
                          />
                        </td>
                      </>
                    )}

                    {activeTab === 'finance' && (
                      <>
                        <td className="px-4 py-2 text-slate-600">{item.term}mo</td>
                        <td className="px-4 py-2 text-slate-600">{item.lender?.name} ({item.internalLenderTier})</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={edits[item.id]?.buyRateApr ?? item.buyRateApr}
                            onChange={(e) => handleEdit(item.id, 'buyRateApr', e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${edits[item.id]?.buyRateApr !== undefined ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
                          />
                        </td>
                      </>
                    )}

                    {activeTab === 'incentives' && (
                      <>
                        <td className="px-4 py-2 text-slate-600">{item.type}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={edits[item.id]?.amountCents !== undefined ? (edits[item.id].amountCents / 100).toFixed(2) : (item.amountCents / 100).toFixed(2)}
                            onChange={(e) => handleEdit(item.id, 'amountCents', Math.round(parseFloat(e.target.value || '0') * 100))}
                            className={`w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${edits[item.id]?.amountCents !== undefined ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
                          />
                        </td>
                      </>
                    )}

                    {activeTab === 'discounts' && (
                      <>
                        <td className="px-4 py-2">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={edits[item.id]?.isActive ?? item.isActive}
                              onChange={(e) => handleEdit(item.id, 'isActive', e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className={`text-xs font-medium ${edits[item.id]?.isActive ?? item.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {edits[item.id]?.isActive ?? item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="1"
                            value={edits[item.id]?.amount ?? item.amount}
                            onChange={(e) => handleEdit(item.id, 'amount', parseInt(e.target.value || '0'))}
                            className={`w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${edits[item.id]?.amount !== undefined ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
