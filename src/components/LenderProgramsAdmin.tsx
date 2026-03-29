import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Calendar, DollarSign, Percent, Car, Copy, HelpCircle } from 'lucide-react';
import { getAuthToken } from '../utils/auth';
import { toast } from 'react-hot-toast';

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
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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

  const [isAllVehicles, setIsAllVehicles] = useState(true);

  const handleCopy = (program: any) => {
    setEditingId('new');
    setIsAdding(true);
    const isAll = program.make === 'ALL' && program.model === 'ALL' && program.trim === 'ALL' && program.year === 0;
    setIsAllVehicles(isAll);
    setEditData({
      ...program,
      id: undefined,
      make: program.make === 'ALL' ? '' : program.make,
      model: program.model === 'ALL' ? '' : program.model,
      trim: program.trim === 'ALL' ? '' : program.trim,
      year: program.year === 0 ? '' : program.year
    });
  };

  const handleSave = async (id: string | null) => {
    // Validation
    if (!editData.term) {
      toast.error('Term is required');
      return;
    }
    if (activeTab === 'lease') {
      if (!editData.mileage) {
        toast.error('Mileage is required');
        return;
      }
      if (!editData.buyRateMf) {
        toast.error('Money Factor (MF) is required');
        return;
      }
      if (!editData.residualPercentage) {
        toast.error('Residual Value (RV) is required');
        return;
      }
    } else {
      if (!editData.buyRateApr) {
        toast.error('APR is required');
        return;
      }
    }

    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' : 'finance-programs';
      const method = id && id !== 'new' ? 'PUT' : 'POST';
      const url = id && id !== 'new' ? `/api/admin/lenders/${lenderId}/${endpoint}/${id}` : `/api/admin/lenders/${lenderId}/${endpoint}`;
      
      const payload = {
        ...editData,
        make: isAllVehicles ? 'ALL' : (editData.make || 'ALL'),
        model: isAllVehicles ? 'ALL' : (editData.model || 'ALL'),
        trim: isAllVehicles ? 'ALL' : (editData.trim || 'ALL'),
        year: isAllVehicles ? 0 : (editData.year ? parseInt(editData.year) : 0),
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
        fetchPrograms();
      } else {
        const data = await response.json();
        toast.error(`Failed to save program: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save program:', error);
      toast.error('Failed to save program due to a network error.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    
    try {
      const endpoint = activeTab === 'lease' ? 'lease-programs' : 'finance-programs';
      const response = await fetch(`/api/admin/lenders/${lenderId}/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
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
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAllVehicles} 
                  onChange={(e) => setIsAllVehicles(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Apply to all vehicles (Credit Union style)
              </label>
              {!isAllVehicles && (
                <div className="flex gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Make</span>
                    <input type="text" placeholder="ALL" title="Leave empty for ALL makes" value={editData.make || ''} onChange={e => setEditData({...editData, make: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Model</span>
                    <input type="text" placeholder="ALL" title="Leave empty for ALL models" value={editData.model || ''} onChange={e => setEditData({...editData, model: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Trim</span>
                    <input type="text" placeholder="ALL" title="Leave empty for ALL trims" value={editData.trim || ''} onChange={e => setEditData({...editData, trim: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Year</span>
                    <input type="number" placeholder="ALL" title="Leave empty for ALL years" value={editData.year || ''} onChange={e => setEditData({...editData, year: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="font-medium">
              {program.year === 0 ? 'Any Year' : program.year}{' '}
              {program.make === 'ALL' ? 'Any Make' : program.make}{' '}
              {program.model === 'ALL' ? 'Any Model' : program.model}{' '}
              {program.trim === 'ALL' ? 'Any Trim' : program.trim}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Term</span>
                <input type="number" placeholder="36" title="Lease Term (e.g., 36)" value={editData.term || ''} onChange={e => setEditData({...editData, term: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Miles</span>
                <input type="number" placeholder="10000" title="Annual Mileage (e.g., 10000)" value={editData.mileage || ''} onChange={e => setEditData({...editData, mileage: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              </div>
            </div>
          ) : (
            <span>{program.term} mo / {program.mileage} mi</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Tier</span>
              <input type="text" placeholder="1+" title="Credit Tier (e.g., 1, 1+, Standard)" value={editData.internalLenderTier || ''} onChange={e => setEditData({...editData, internalLenderTier: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{program.internalLenderTier}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">MF</span>
                <input type="number" step="0.00001" placeholder="0.00230" title="Money Factor (e.g., 0.00230)" value={editData.buyRateMf || ''} onChange={e => setEditData({...editData, buyRateMf: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 uppercase font-semibold">RV %</span>
                <input type="number" step="0.1" placeholder="66" title="Residual Value Percentage (e.g., 66)" value={editData.residualPercentage || ''} onChange={e => setEditData({...editData, residualPercentage: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
              </div>
            </div>
          ) : (
            <span>MF: {program.buyRateMf} | RV: {program.residualPercentage}%</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Active</span>
              <input type="checkbox" title="Is Program Active?" checked={editData.isActive ?? true} onChange={e => setEditData({...editData, isActive: e.target.checked})} className="rounded text-indigo-600 mt-1" />
            </div>
          ) : (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${program.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSave(program?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Save"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancel"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => handleCopy(program)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md" title="Copy Program"><Copy className="w-4 h-4" /></button>
              <button onClick={() => { 
                setEditingId(program.id); 
                const isAll = program.make === 'ALL' && program.model === 'ALL' && program.trim === 'ALL' && program.year === 0;
                setIsAllVehicles(isAll);
                setEditData({ 
                  ...program,
                  make: program.make === 'ALL' ? '' : program.make,
                  model: program.model === 'ALL' ? '' : program.model,
                  trim: program.trim === 'ALL' ? '' : program.trim,
                  year: program.year === 0 ? '' : program.year
                }); 
              }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Edit Program"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(program.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md" title="Delete Program"><Trash2 className="w-4 h-4" /></button>
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
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isAllVehicles} 
                  onChange={(e) => setIsAllVehicles(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Apply to all vehicles (Credit Union style)
              </label>
              {!isAllVehicles && (
                <div className="flex gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Make</span>
                    <input type="text" placeholder="ALL" title="Leave empty for ALL makes" value={editData.make || ''} onChange={e => setEditData({...editData, make: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Model</span>
                    <input type="text" placeholder="ALL" title="Leave empty for ALL models" value={editData.model || ''} onChange={e => setEditData({...editData, model: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Trim</span>
                    <input type="text" placeholder="ALL" title="Leave empty for ALL trims" value={editData.trim || ''} onChange={e => setEditData({...editData, trim: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Year</span>
                    <input type="number" placeholder="ALL" title="Leave empty for ALL years" value={editData.year || ''} onChange={e => setEditData({...editData, year: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="font-medium">
              {program.year === 0 ? 'Any Year' : program.year}{' '}
              {program.make === 'ALL' ? 'Any Make' : program.make}{' '}
              {program.model === 'ALL' ? 'Any Model' : program.model}{' '}
              {program.trim === 'ALL' ? 'Any Trim' : program.trim}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Term</span>
              <input type="number" placeholder="60" title="Finance Term (e.g., 60)" value={editData.term || ''} onChange={e => setEditData({...editData, term: e.target.value})} className="w-16 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{program.term} mo</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Tier</span>
              <input type="text" placeholder="1+" title="Credit Tier (e.g., 1, 1+, Standard)" value={editData.internalLenderTier || ''} onChange={e => setEditData({...editData, internalLenderTier: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{program.internalLenderTier}</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">APR %</span>
              <input type="number" step="0.01" placeholder="4.99" title="Annual Percentage Rate (e.g., 4.99)" value={editData.buyRateApr || ''} onChange={e => setEditData({...editData, buyRateApr: e.target.value})} className="w-20 px-2 py-1 border rounded text-sm" />
            </div>
          ) : (
            <span>{program.buyRateApr}%</span>
          )}
        </td>
        <td className="px-4 py-3">
          {isEditingRow ? (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Active</span>
              <input type="checkbox" title="Is Program Active?" checked={editData.isActive ?? true} onChange={e => setEditData({...editData, isActive: e.target.checked})} className="rounded text-indigo-600 mt-1" />
            </div>
          ) : (
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${program.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {program.isActive ? 'Active' : 'Inactive'}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-right space-x-2">
          {isEditingRow ? (
            <>
              <button onClick={() => handleSave(program?.id || null)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md" title="Save"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md" title="Cancel"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => handleCopy(program)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md" title="Copy Program"><Copy className="w-4 h-4" /></button>
              <button onClick={() => { 
                setEditingId(program.id); 
                const isAll = program.make === 'ALL' && program.model === 'ALL' && program.trim === 'ALL' && program.year === 0;
                setIsAllVehicles(isAll);
                setEditData({ 
                  ...program,
                  make: program.make === 'ALL' ? '' : program.make,
                  model: program.model === 'ALL' ? '' : program.model,
                  trim: program.trim === 'ALL' ? '' : program.trim,
                  year: program.year === 0 ? '' : program.year
                }); 
              }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Edit Program"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(program.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md" title="Delete Program"><Trash2 className="w-4 h-4" /></button>
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

        <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-start gap-3 shrink-0">
          <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How to fill out programs (especially for Credit Unions):</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Credit Unions / Flat Rates:</strong> Check the <strong>"Apply to all vehicles"</strong> box. This will hide the Make, Model, Trim, and Year fields and automatically apply the rate to all vehicles.</li>
              <li><strong>Captive Banks (e.g., Toyota Financial):</strong> Uncheck the "Apply to all vehicles" box and type the exact values into the Vehicle fields (e.g., 2024 Toyota RAV4).</li>
              <li><strong>Term / Miles:</strong> Enter the term in months (e.g., <code>36</code> or <code>60</code>). For leases, also enter annual mileage (e.g., <code>10000</code>).</li>
              <li><strong>Tier:</strong> The credit tier name (e.g., <code>1</code>, <code>1+</code>, <code>Standard</code>). This must match the tier you assign to the customer.</li>
              <li><strong>Rates:</strong> For Lease: Money Factor (e.g., <code>0.00230</code>) and Residual Value % (e.g., <code>66</code>). For Finance: APR % (e.g., <code>4.99</code>).</li>
            </ul>
          </div>
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
                setIsAllVehicles(true);
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
