import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Save, X, Building2, MapPin, Phone, Mail, Tag } from 'lucide-react';
import { getAuthToken } from '../utils/auth';

interface DealerPartner {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  adjustments: DealerAdjustment[];
}

interface DealerAdjustment {
  id: string;
  make: string | null;
  model: string | null;
  trim: string | null;
  amount: number;
  isActive: boolean;
}

export const DealersAdmin = () => {
  const [dealers, setDealers] = useState<DealerPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDealer, setEditingDealer] = useState<DealerPartner | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<DealerPartner>>({});
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchDealers(page);
  }, [page]);

  const fetchDealers = async (pageNum: number) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/dealers?page=${pageNum}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setDealers(data.data);
          setTotalPages(Math.ceil(data.total / data.limit));
        } else {
          setDealers(data);
        }
      } else {
        throw new Error('Failed to fetch dealers');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load dealer network');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = await getAuthToken();
      const method = editingDealer ? 'PUT' : 'POST';
      const url = editingDealer ? `/api/admin/dealers/${editingDealer.id}` : '/api/admin/dealers';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        await fetchDealers(page);
        setEditingDealer(null);
        setIsAdding(false);
        setFormData({});
      } else {
        throw new Error('Failed to save dealer');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to save dealer');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this dealer?')) return;
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/admin/dealers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchDealers(page);
      } else {
        throw new Error('Failed to delete dealer');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to delete dealer');
    }
  };

  const filteredDealers = dealers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.contactName && d.contactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (d.email && d.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dealer network...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-900">Dealer Network</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingDealer(null);
            setFormData({ isActive: true });
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Dealer
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search dealers..."
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
                <th className="px-6 py-3 font-medium">Dealer Name</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Adjustments</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDealers.map((dealer) => (
                <tr key={dealer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3">
                        {dealer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{dealer.name}</div>
                        {dealer.address && <div className="text-xs text-slate-500 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> {dealer.address}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-900">{dealer.contactName || 'N/A'}</div>
                    {dealer.email && <div className="text-xs text-slate-500 flex items-center mt-1"><Mail className="w-3 h-3 mr-1" /> {dealer.email}</div>}
                    {dealer.phone && <div className="text-xs text-slate-500 flex items-center mt-1"><Phone className="w-3 h-3 mr-1" /> {dealer.phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-slate-600">
                      <Tag className="w-4 h-4 mr-2" />
                      {dealer.adjustments?.length || 0} active rules
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      dealer.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {dealer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => {
                          setEditingDealer(dealer);
                          setFormData(dealer);
                          setIsAdding(true);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dealer.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDealers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No dealers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900">
                {editingDealer ? 'Edit Dealer' : 'Add New Dealer'}
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingDealer(null);
                  setFormData({});
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Company Details</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dealership Name *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
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
                      Active Partner
                    </label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900 border-b border-slate-100 pb-2">Contact Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={formData.contactName || ''}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Any special arrangements or notes about this dealer..."
                />
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-slate-900">Discount Matrix (Adjustments)</h4>
                  <button 
                    onClick={() => {
                      const newAdj = { make: '', model: '', trim: '', amount: 0, isActive: true };
                      setFormData({
                        ...formData,
                        adjustments: [...(formData.adjustments || []), newAdj as any]
                      });
                    }}
                    className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                  >
                    + Add Rule
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.adjustments?.map((adj, index) => (
                    <div key={adj.id || index} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-start gap-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Make</label>
                          <input
                            type="text"
                            value={adj.make || ''}
                            onChange={(e) => {
                              const newAdjs = [...(formData.adjustments || [])];
                              newAdjs[index] = { ...newAdjs[index], make: e.target.value };
                              setFormData({ ...formData, adjustments: newAdjs });
                            }}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                            placeholder="e.g. BMW"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Model (Optional)</label>
                          <input
                            type="text"
                            value={adj.model || ''}
                            onChange={(e) => {
                              const newAdjs = [...(formData.adjustments || [])];
                              newAdjs[index] = { ...newAdjs[index], model: e.target.value };
                              setFormData({ ...formData, adjustments: newAdjs });
                            }}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                            placeholder="e.g. X5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Discount Amount ($)</label>
                          <input
                            type="number"
                            value={adj.amount || 0}
                            onChange={(e) => {
                              const newAdjs = [...(formData.adjustments || [])];
                              newAdjs[index] = { ...newAdjs[index], amount: parseInt(e.target.value) || 0 };
                              setFormData({ ...formData, adjustments: newAdjs });
                            }}
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex items-center pt-5">
                          <input
                            type="checkbox"
                            checked={adj.isActive !== false}
                            onChange={(e) => {
                              const newAdjs = [...(formData.adjustments || [])];
                              newAdjs[index] = { ...newAdjs[index], isActive: e.target.checked };
                              setFormData({ ...formData, adjustments: newAdjs });
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                          />
                          <span className="text-xs text-slate-600">Active</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (adj.id && editingDealer) {
                            if (!window.confirm('Delete this rule?')) return;
                            try {
                              const token = await getAuthToken();
                              await fetch(`/api/admin/dealers/${editingDealer.id}/adjustments/${adj.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                            } catch (err) {
                              console.error(err);
                            }
                          }
                          const newAdjs = [...(formData.adjustments || [])];
                          newAdjs.splice(index, 1);
                          setFormData({ ...formData, adjustments: newAdjs });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors mt-5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!formData.adjustments || formData.adjustments.length === 0) && (
                    <p className="text-sm text-slate-500 text-center py-4">No discount rules defined yet.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end space-x-3 sticky bottom-0">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingDealer(null);
                  setFormData({});
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingDealer ? 'Save Changes' : 'Create Dealer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
