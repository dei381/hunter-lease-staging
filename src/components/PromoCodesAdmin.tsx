import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Save, X, Tag, Percent, DollarSign } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

interface PromoCode {
  id: string;
  code: string;
  discountAmount: number;
  discountType: string;
  isActive: boolean;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
}

export const PromoCodesAdmin = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<PromoCode>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPromos();
  }, []);

  const fetchPromos = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/admin/promos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPromos(data);
      } else {
        throw new Error('Failed to fetch promos');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = await getAuthToken();
      const method = editingPromo ? 'PUT' : 'POST';
      const url = editingPromo ? `/api/admin/promos/${editingPromo.id}` : '/api/admin/promos';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchPromos();
        setEditingPromo(null);
        setIsAdding(false);
        setFormData({});
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save promo code');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save promo code');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/promos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchPromos();
      } else {
        throw new Error('Failed to delete promo code');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete promo code');
    }
  };

  const filteredPromos = promos.filter(p => 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Loading promo codes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Promo Codes & Referrals</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingPromo(null);
            setFormData({ isActive: true, discountType: 'FIXED', discountAmount: 0 });
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Promo Code
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-medium">Code</th>
                <th className="px-6 py-3 font-medium">Discount</th>
                <th className="px-6 py-3 font-medium">Usage</th>
                <th className="px-6 py-3 font-medium">Expires</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPromos.map((promo) => (
                <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 text-indigo-500 mr-2" />
                      <span className="font-bold text-slate-900 font-mono">{promo.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center font-medium text-slate-900">
                      {promo.discountType === 'FIXED' ? (
                        <><DollarSign className="w-3 h-3 text-slate-400 mr-1" />{promo.discountAmount / 100}</>
                      ) : (
                        <>{promo.discountAmount}<Percent className="w-3 h-3 text-slate-400 ml-1" /></>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">
                      {promo.uses} {promo.maxUses ? `/ ${promo.maxUses}` : 'uses'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-500">
                      {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      promo.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingPromo(promo);
                          setFormData({
                            ...promo,
                            discountAmount: promo.discountType === 'FIXED' ? promo.discountAmount / 100 : promo.discountAmount
                          });
                          setIsAdding(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPromos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No promo codes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingPromo(null);
                  setFormData({});
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Promo Code *</label>
                <input
                  type="text"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase"
                  placeholder="e.g. SUMMER2024"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType || 'FIXED'}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="FIXED">Fixed Amount ($)</option>
                    <option value="PERCENT">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={formData.discountAmount || ''}
                    onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={formData.discountType === 'FIXED' ? 'e.g. 500' : 'e.g. 10'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses (Optional)</label>
                  <input
                    type="number"
                    value={formData.maxUses || ''}
                    onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expires At (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiresAt ? new Date(formData.expiresAt).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-slate-700">
                  Active
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 rounded-b-xl">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingPromo(null);
                  setFormData({});
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.code || formData.discountAmount === undefined}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingPromo ? 'Save Changes' : 'Create Promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
