import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Calendar, DollarSign, Percent, Car } from 'lucide-react';

interface LenderProgramsAdminProps {
  lenderId: string;
  lenderName: string;
  onClose: () => void;
}

export const LenderProgramsAdmin: React.FC<LenderProgramsAdminProps> = ({ lenderId, lenderName, onClose }) => {
  const [activeTab, setActiveTab] = useState<'lease' | 'finance'>('lease');
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchPrograms();
  }, [activeTab, lenderId]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' : 'finance-programs';
      const response = await fetch(`/api/admin/lenders/${lenderId}/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPrograms(data);
      }
    } catch (error) {
      console.error('Failed to fetch programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: string | null) => {
    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' : 'finance-programs';
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/admin/lenders/${lenderId}/${endpoint}/${id}` : `/api/admin/lenders/${lenderId}/${endpoint}`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setEditingId(null);
        setIsAdding(false);
        fetchPrograms();
      } else {
        const data = await response.json();
        alert(`Failed to save program: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save program:', error);
      alert('Failed to save program due to a network error.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    
    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' : 'finance-programs';
      const response = await fetch(`/api/admin/lenders/${lenderId}/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` }
      });

      if (response.ok) {
        fetchPrograms();
      }
    } catch (error) {
      console.error('Failed to delete program:', error);
    }
  };

  const renderLeaseRow = (program: any, isEditingRow: boolean) => {
    return (
      <>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <input type="text" placeholder="Make" value={editData.make || ''} onChange={e => setEditData({...editData, make: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Model" value={editData.model || ''} onChange={e => setEditData({...editData, model: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Trim" value={editData.trim || ''} onChange={e => setEditData({...editData, trim: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="number" placeholder="Year" value={editData.year || ''} onChange={e => setEditData({...editData, year: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span className="font-medium">{program.year} {program.make} {program.model} {program.trim}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <input type="number" placeholder="Term" value={editData.term || ''} onChange={e => setEditData({...editData, term: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
              <input type="number" placeholder="Miles" value={editData.mileage || ''} onChange={e => setEditData({...editData, mileage: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{program.term} mo / {program.mileage} mi</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="text" placeholder="Tier" value={editData.internalLenderTier || ''} onChange={e => setEditData({...editData, internalLenderTier: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
          ) : (
            <span>{program.internalLenderTier}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <input type="number" step="0.00001" placeholder="MF" value={editData.buyRateMf || ''} onChange={e => setEditData({...editData, buyRateMf: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="number" step="0.1" placeholder="RV %" value={editData.residualPercentage || ''} onChange={e => setEditData({...editData, residualPercentage: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>MF: {program.buyRateMf} | RV: {program.residualPercentage}%</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="checkbox" checked={editData.isActive ?? true} onChange={e => setEditData({...editData, isActive: e.target.checked})} className="rounded text-indigo-600" />
          ) : (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${program.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSave(program?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditingId(program.id); setEditData({ ...program }); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(program.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </td>
      </>
    );
  };

  const renderFinanceRow = (program: any, isEditingRow: boolean) => {
    return (
      <>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <input type="text" placeholder="Make" value={editData.make || ''} onChange={e => setEditData({...editData, make: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Model" value={editData.model || ''} onChange={e => setEditData({...editData, model: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="text" placeholder="Trim" value={editData.trim || ''} onChange={e => setEditData({...editData, trim: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              <input type="number" placeholder="Year" value={editData.year || ''} onChange={e => setEditData({...editData, year: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span className="font-medium">{program.year} {program.make} {program.model} {program.trim}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="number" placeholder="Term" value={editData.term || ''} onChange={e => setEditData({...editData, term: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
          ) : (
            <span>{program.term} mo</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="text" placeholder="Tier" value={editData.internalLenderTier || ''} onChange={e => setEditData({...editData, internalLenderTier: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
          ) : (
            <span>{program.internalLenderTier}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="number" step="0.01" placeholder="APR %" value={editData.buyRateApr || ''} onChange={e => setEditData({...editData, buyRateApr: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
          ) : (
            <span>{program.buyRateApr}%</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <input type="checkbox" checked={editData.isActive ?? true} onChange={e => setEditData({...editData, isActive: e.target.checked})} className="rounded text-indigo-600" />
          ) : (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${program.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSave(program?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => { setEditingId(program.id); setEditData({ ...program }); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(program.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </td>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Programs for {lenderName}</h2>
            <p className="text-sm text-slate-500">Manage lease and finance programs for this lender.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white">
          <button
            onClick={() => { setActiveTab('lease'); setIsAdding(false); setEditingId(null); }}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'lease' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Lease Programs
          </button>
          <button
            onClick={() => { setActiveTab('finance'); setIsAdding(false); setEditingId(null); }}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          >
            Finance Programs
          </button>
        </div>

        <div className="p-6 flex-1 overflow-auto bg-slate-50">
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setIsAdding(true);
                setEditData({ isActive: true });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add {activeTab === 'lease' ? 'Lease' : 'Finance'} Program</span>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">{activeTab === 'lease' ? 'Term / Miles' : 'Term'}</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">{activeTab === 'lease' ? 'Rates (MF / RV)' : 'APR'}</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isAdding && (
                  <tr className="bg-indigo-50/50">
                    {activeTab === 'lease' ? renderLeaseRow(null, true) : renderFinanceRow(null, true)}
                  </tr>
                )}

                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading programs...</td></tr>
                ) : programs.length === 0 && !isAdding ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No programs found.</td></tr>
                ) : (
                  programs.map(program => (
                    <tr key={program.id} className="hover:bg-slate-50 transition-colors">
                      {activeTab === 'lease' ? renderLeaseRow(program, editingId === program.id) : renderFinanceRow(program, editingId === program.id)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
