import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Calculator, Landmark, Percent, MapPin, Gift, Database } from 'lucide-react';
import { ProgramBatchesAdmin } from '../components/admin/ProgramBatchesAdmin';

export const CalculatorAdmin = () => {
  const [subTab, setSubTab] = useState<'lenders' | 'programs' | 'policies' | 'incentives' | 'batches'>('batches');
  const [lenders, setLenders] = useState<any[]>([]);
  const [leasePrograms, setLeasePrograms] = useState<any[]>([]);
  const [financePrograms, setFinancePrograms] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [incentives, setIncentives] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, [subTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      if (subTab === 'lenders') {
        const res = await fetch('/api/admin/calculator/lenders', { headers });
        setLenders(await res.json());
      } else if (subTab === 'programs') {
        const resLease = await fetch('/api/admin/calculator/programs/lease', { headers });
        const resFinance = await fetch('/api/admin/calculator/programs/finance', { headers });
        setLeasePrograms(await resLease.json());
        setFinancePrograms(await resFinance.json());
      } else if (subTab === 'policies') {
        const resPolicy = await fetch('/api/admin/calculator/policies', { headers });
        const resTaxes = await fetch('/api/admin/calculator/taxes', { headers });
        setPolicies(await resPolicy.json());
        setTaxes(await resTaxes.json());
      } else if (subTab === 'incentives') {
        const resIncentives = await fetch('/api/admin/calculator/incentives', { headers });
        setIncentives(await resIncentives.json());
      }
    } catch (err) {
      console.error('Failed to fetch calculator data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (item: any) => {
    try {
      const token = localStorage.getItem('admin_token') || '';
      let url = '';
      let method = item.id ? 'PUT' : 'POST';
      
      if (subTab === 'lenders') url = '/api/admin/calculator/lenders';
      else if (subTab === 'programs') {
         url = item.type === 'lease' ? '/api/admin/calculator/programs/lease' : '/api/admin/calculator/programs/finance';
      }
      else if (subTab === 'policies') url = item.zipCode ? '/api/admin/calculator/taxes' : '/api/admin/calculator/policies';
      else if (subTab === 'incentives') url = '/api/admin/calculator/incentives';

      if (item.id && !url.includes(item.id)) {
        url = `${url}/${item.id}`;
      } else if (item.zipCode && subTab === 'policies') {
        url = `${url}/${item.zipCode}`;
        method = 'PUT'; // Taxes are upserted by zipCode
      }

      await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(item),
      });
      
      setEditingItem(null);
      setIsAdding(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save item', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const token = localStorage.getItem('admin_token') || '';
      let url = '';
      if (subTab === 'lenders') url = `/api/admin/calculator/lenders/${id}`;
      else if (subTab === 'programs') url = `/api/admin/calculator/programs/${id}`; // Generic delete
      else if (subTab === 'policies') url = `/api/admin/calculator/taxes/${id}`;
      else if (subTab === 'incentives') url = `/api/admin/calculator/incentives/${id}`;

      await fetch(url, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete item', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-[var(--b2)] pb-4 overflow-x-auto">
        <button onClick={() => setSubTab('batches')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${subTab === 'batches' ? 'bg-[var(--lime)] text-black' : 'text-[var(--mu2)] hover:text-white'}`}>
          <Database className="w-4 h-4" /> Financial Layer (MVP)
        </button>
        <button onClick={() => setSubTab('lenders')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${subTab === 'lenders' ? 'bg-[var(--lime)] text-black' : 'text-[var(--mu2)] hover:text-white'}`}>
          <Landmark className="w-4 h-4" /> Lenders
        </button>
        <button onClick={() => setSubTab('programs')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${subTab === 'programs' ? 'bg-[var(--lime)] text-black' : 'text-[var(--mu2)] hover:text-white'}`}>
          <Percent className="w-4 h-4" /> Legacy Programs
        </button>
        <button onClick={() => setSubTab('policies')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${subTab === 'policies' ? 'bg-[var(--lime)] text-black' : 'text-[var(--mu2)] hover:text-white'}`}>
          <MapPin className="w-4 h-4" /> Taxes & Fees
        </button>
        <button onClick={() => setSubTab('incentives')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${subTab === 'incentives' ? 'bg-[var(--lime)] text-black' : 'text-[var(--mu2)] hover:text-white'}`}>
          <Gift className="w-4 h-4" /> Incentives
        </button>
      </div>

      {subTab === 'batches' ? (
        <ProgramBatchesAdmin />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold capitalize">{subTab} Management</h2>
            <button 
              onClick={() => { setIsAdding(true); setEditingItem({}); }}
              className="flex items-center gap-2 bg-[var(--lime)] text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add {subTab.slice(0, -1)}
            </button>
          </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--mu2)]">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {subTab === 'lenders' && lenders.map(l => (
            <div key={l.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 flex items-center justify-between group hover:border-[var(--lime)]/30 transition-colors">
              <div>
                <div className="font-bold text-lg">{l.name}</div>
                <div className="text-xs text-[var(--mu2)]">
                  {l.isCaptive ? 'Captive' : 'Non-Captive'} • Priority: {l.priority} • {l.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingItem(l); setIsAdding(false); }} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-[var(--lime)] transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(l.id)} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {subTab === 'programs' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-[var(--mu2)] uppercase tracking-widest mb-4">Lease Programs</h3>
                <div className="grid gap-2">
                  {leasePrograms.map(p => (
                    <div key={p.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-lg p-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold">{p.make} {p.model}</span> {p.trim} ({p.year})
                        <div className="text-xs text-[var(--mu2)]">
                          {p.term}mo / {p.mileage}mi • MF: {p.buyRateMf} • RV: {p.residualPercentage}% • {p.internalLenderTier}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingItem({...p, type: 'lease'}); setIsAdding(false); }} className="p-1.5 hover:text-[var(--lime)]"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--mu2)] uppercase tracking-widest mb-4">Finance Programs</h3>
                <div className="grid gap-2">
                  {financePrograms.map(p => (
                    <div key={p.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-lg p-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold">{p.make} {p.model}</span> {p.trim} ({p.year})
                        <div className="text-xs text-[var(--mu2)]">
                          {p.term}mo • APR: {p.buyRateApr}% • {p.internalLenderTier}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingItem({...p, type: 'finance'}); setIsAdding(false); }} className="p-1.5 hover:text-[var(--lime)]"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subTab === 'policies' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-[var(--mu2)] uppercase tracking-widest mb-4">Global Policies</h3>
                {policies.map(p => (
                  <div key={p.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold">Global Estimation Policy</div>
                      <div className="text-xs text-[var(--mu2)]">
                        Tax: {(p.fallbackSalesTaxRate * 100).toFixed(2)}% • DMV: ${p.fallbackDmvFeeCents/100} • Doc: ${p.fallbackDocFeeCents/100}
                      </div>
                    </div>
                    <button onClick={() => { setEditingItem(p); setIsAdding(false); }} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-[var(--lime)] transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--mu2)] uppercase tracking-widest mb-4">Regional Taxes</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {taxes.map(t => (
                    <div key={t.zipCode} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{t.zipCode} - {t.county}, {t.state}</div>
                        <div className="text-xs text-[var(--mu2)]">
                          Tax: {(t.salesTaxRate * 100).toFixed(2)}% • DMV: ${t.estimatedDmvFeeCents/100}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingItem(t); setIsAdding(false); }} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-[var(--lime)] transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t.zipCode)} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {subTab === 'incentives' && (
            <div className="grid gap-4">
              {incentives.map(i => (
                <div key={i.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 flex items-center justify-between group hover:border-[var(--lime)]/30 transition-colors">
                  <div>
                    <div className="font-bold text-lg">{i.name} - ${i.amountCents/100}</div>
                    <div className="text-xs text-[var(--mu2)]">
                      {i.make} {i.model} {i.trim} ({i.year}) • {i.type} • {i.isStackable ? 'Stackable' : 'Non-Stackable'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(i); setIsAdding(false); }} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-[var(--lime)] transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(i.id)} className="p-2 bg-[var(--s2)] rounded-lg text-[var(--w)] hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal / Overlay */}
      {(editingItem || isAdding) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--b2)] pb-4">
              <h2 className="font-bold text-lg">{isAdding ? 'Add New' : 'Edit'} {subTab.slice(0, -1)}</h2>
              <button onClick={() => { setEditingItem(null); setIsAdding(false); }} className="text-[var(--mu2)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {subTab === 'lenders' && (
                <>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Lender Name</span>
                    <input type="text" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Priority (1 = High)</span>
                    <input type="number" value={editingItem.priority || 1} onChange={e => setEditingItem({...editingItem, priority: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={editingItem.isCaptive || false} onChange={e => setEditingItem({...editingItem, isCaptive: e.target.checked})} className="accent-[var(--lime)]" />
                    <span className="text-sm font-bold">Captive Lender</span>
                  </label>
                  <label className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={editingItem.isActive !== false} onChange={e => setEditingItem({...editingItem, isActive: e.target.checked})} className="accent-[var(--lime)]" />
                    <span className="text-sm font-bold">Active</span>
                  </label>
                </>
              )}

              {subTab === 'programs' && (
                <>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Program Type</span>
                    <select value={editingItem.type || 'lease'} onChange={e => setEditingItem({...editingItem, type: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]">
                      <option value="lease">Lease</option>
                      <option value="finance">Finance</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Lender ID</span>
                    <input type="text" value={editingItem.lenderId || ''} onChange={e => setEditingItem({...editingItem, lenderId: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" placeholder="UUID of Lender" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Make</span>
                    <input type="text" value={editingItem.make || ''} onChange={e => setEditingItem({...editingItem, make: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Model</span>
                    <input type="text" value={editingItem.model || ''} onChange={e => setEditingItem({...editingItem, model: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Trim</span>
                    <input type="text" value={editingItem.trim || ''} onChange={e => setEditingItem({...editingItem, trim: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Year</span>
                    <input type="number" value={editingItem.year || 2024} onChange={e => setEditingItem({...editingItem, year: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Term (mo)</span>
                    <input type="number" value={editingItem.term || 36} onChange={e => setEditingItem({...editingItem, term: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  {editingItem.type === 'lease' ? (
                    <>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Mileage</span>
                        <input type="number" value={editingItem.mileage || 10000} onChange={e => setEditingItem({...editingItem, mileage: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Buy Rate MF</span>
                        <input type="number" step="0.00001" value={editingItem.buyRateMf || 0} onChange={e => setEditingItem({...editingItem, buyRateMf: parseFloat(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Residual %</span>
                        <input type="number" step="0.1" value={editingItem.residualPercentage || 0} onChange={e => setEditingItem({...editingItem, residualPercentage: parseFloat(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                    </>
                  ) : (
                    <label className="space-y-1">
                      <span className="text-xs text-[var(--mu2)]">Buy Rate APR %</span>
                      <input type="number" step="0.01" value={editingItem.buyRateApr || 0} onChange={e => setEditingItem({...editingItem, buyRateApr: parseFloat(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                    </label>
                  )}
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Lender Tier</span>
                    <input type="text" value={editingItem.internalLenderTier || 'Tier 1+'} onChange={e => setEditingItem({...editingItem, internalLenderTier: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                </>
              )}

              {subTab === 'policies' && (
                <>
                  {editingItem.zipCode !== undefined ? (
                    <>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Zip Code</span>
                        <input type="text" value={editingItem.zipCode || ''} disabled={!isAdding} onChange={e => setEditingItem({...editingItem, zipCode: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">State</span>
                        <input type="text" value={editingItem.state || ''} onChange={e => setEditingItem({...editingItem, state: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">County</span>
                        <input type="text" value={editingItem.county || ''} onChange={e => setEditingItem({...editingItem, county: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Sales Tax Rate (0.095 = 9.5%)</span>
                        <input type="number" step="0.0001" value={editingItem.salesTaxRate || 0} onChange={e => setEditingItem({...editingItem, salesTaxRate: parseFloat(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Estimated DMV Fee (cents)</span>
                        <input type="number" value={editingItem.estimatedDmvFeeCents || 0} onChange={e => setEditingItem({...editingItem, estimatedDmvFeeCents: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Fallback Sales Tax Rate</span>
                        <input type="number" step="0.0001" value={editingItem.fallbackSalesTaxRate || 0} onChange={e => setEditingItem({...editingItem, fallbackSalesTaxRate: parseFloat(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Fallback DMV Fee (cents)</span>
                        <input type="number" value={editingItem.fallbackDmvFeeCents || 0} onChange={e => setEditingItem({...editingItem, fallbackDmvFeeCents: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-[var(--mu2)]">Fallback Doc Fee (cents)</span>
                        <input type="number" value={editingItem.fallbackDocFeeCents || 0} onChange={e => setEditingItem({...editingItem, fallbackDocFeeCents: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                      </label>
                    </>
                  )}
                </>
              )}

              {subTab === 'incentives' && (
                <>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Incentive Name</span>
                    <input type="text" value={editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Amount (cents)</span>
                    <input type="number" value={editingItem.amountCents || 0} onChange={e => setEditingItem({...editingItem, amountCents: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Type</span>
                    <select value={editingItem.type || 'REBATE'} onChange={e => setEditingItem({...editingItem, type: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]">
                      <option value="REBATE">Rebate</option>
                      <option value="DEALER_CASH">Dealer Cash</option>
                      <option value="SPECIAL_APR">Special APR</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Make</span>
                    <input type="text" value={editingItem.make || ''} onChange={e => setEditingItem({...editingItem, make: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Model</span>
                    <input type="text" value={editingItem.model || ''} onChange={e => setEditingItem({...editingItem, model: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Trim</span>
                    <input type="text" value={editingItem.trim || ''} onChange={e => setEditingItem({...editingItem, trim: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Year</span>
                    <input type="number" value={editingItem.year || 2024} onChange={e => setEditingItem({...editingItem, year: parseInt(e.target.value)})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[var(--mu2)]">Zip Code (Optional)</span>
                    <input type="text" value={editingItem.zipCode || ''} onChange={e => setEditingItem({...editingItem, zipCode: e.target.value})} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--lime)]" />
                  </label>
                  <label className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={editingItem.isStackable || false} onChange={e => setEditingItem({...editingItem, isStackable: e.target.checked})} className="accent-[var(--lime)]" />
                    <span className="text-sm font-bold">Stackable</span>
                  </label>
                </>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-[var(--b2)]">
              <button onClick={() => { setEditingItem(null); setIsAdding(false); }} className="px-4 py-2 text-sm font-bold text-[var(--mu2)] hover:text-white transition-colors">Cancel</button>
              <button onClick={() => handleSave(editingItem)} className="flex items-center gap-2 bg-[var(--lime)] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-[var(--lime)]/90 transition-colors">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};
