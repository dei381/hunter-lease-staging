import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Car, Building2, Tag, Image as ImageIcon, DollarSign } from 'lucide-react';

export const OfferBuilderModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data sources
  const [cars, setCars] = useState<any[]>([]);
  const [lenders, setLenders] = useState<any[]>([]);
  const [leasePrograms, setLeasePrograms] = useState<any[]>([]);
  const [financePrograms, setFinancePrograms] = useState<any[]>([]);
  const [incentives, setIncentives] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);

  // Selections
  const [selectedCarId, setSelectedCarId] = useState('');
  const [selectedLenderId, setSelectedLenderId] = useState('');
  const [dealType, setDealType] = useState<'lease' | 'finance'>('lease');
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedIncentiveIds, setSelectedIncentiveIds] = useState<string[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState('');

  // Manual overrides
  const [manualMsrp, setManualMsrp] = useState('');
  const [manualSellingPrice, setManualSellingPrice] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}` };
      const [carsRes, lendersRes, leaseRes, financeRes, incentivesRes, discountsRes, mediaRes] = await Promise.all([
        fetch('/api/admin/cars', { headers }),
        fetch('/api/admin/lenders', { headers }),
        fetch('/api/admin/bulk/lease-programs', { headers }),
        fetch('/api/admin/bulk/finance-programs', { headers }),
        fetch('/api/admin/incentives', { headers }),
        fetch('/api/admin/bulk/dealer-discounts', { headers }),
        fetch('/api/car-photos') // public endpoint
      ]);

      if (carsRes.ok) setCars(await carsRes.json());
      if (lendersRes.ok) setLenders(await lendersRes.json());
      if (leaseRes.ok) setLeasePrograms(await leaseRes.json());
      if (financeRes.ok) setFinancePrograms(await financeRes.json());
      if (incentivesRes.ok) setIncentives(await incentivesRes.json());
      if (discountsRes.ok) setDiscounts(await discountsRes.json());
      if (mediaRes.ok) setMedia(await mediaRes.json());
    } catch (error) {
      console.error('Failed to fetch builder data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCar = cars.find(c => c.id === selectedCarId);
  const selectedLender = lenders.find(l => l.id === selectedLenderId);
  const programs = dealType === 'lease' ? leasePrograms : financePrograms;
  
  // Filter programs by selected car and lender
  const availablePrograms = programs.filter(p => 
    (!selectedCar || (p.make === selectedCar.make && p.model === selectedCar.model)) &&
    (!selectedLenderId || p.lenderId === selectedLenderId)
  );

  const selectedProgram = availablePrograms.find(p => p.id === selectedProgramId);

  // Filter incentives by selected car
  const availableIncentives = incentives.filter(i => 
    i.isActive && 
    (!selectedCar || i.make === selectedCar.make) &&
    (i.dealApplicability === 'ALL' || i.dealApplicability === dealType.toUpperCase())
  );

  // Filter discounts by selected car
  const availableDiscounts = discounts.filter(d => 
    d.isActive && 
    (!selectedCar || !d.make || d.make === selectedCar.make)
  );

  const selectedDiscount = availableDiscounts.find(d => d.id === selectedDiscountId);
  const selectedIncentives = availableIncentives.filter(i => selectedIncentiveIds.includes(i.id));

  // Calculations
  const msrp = manualMsrp ? parseFloat(manualMsrp) : (selectedCar ? selectedCar.msrpCents / 100 : 0);
  const totalIncentives = selectedIncentives.reduce((sum, i) => sum + (i.amountCents / 100), 0);
  const dealerDiscount = selectedDiscount ? selectedDiscount.amount : 0;
  
  const sellingPrice = manualSellingPrice ? parseFloat(manualSellingPrice) : Math.max(0, msrp - dealerDiscount - totalIncentives);

  let monthlyPayment = 0;
  if (selectedProgram && sellingPrice > 0) {
    if (dealType === 'lease') {
      const rvAmount = msrp * (selectedProgram.residualPercentage / 100);
      const depreciation = (sellingPrice - rvAmount) / selectedProgram.term;
      const rentCharge = (sellingPrice + rvAmount) * selectedProgram.buyRateMf;
      monthlyPayment = depreciation + rentCharge;
    } else {
      const r = (selectedProgram.buyRateApr / 100) / 12;
      const n = selectedProgram.term;
      if (r === 0) {
        monthlyPayment = sellingPrice / n;
      } else {
        monthlyPayment = sellingPrice * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      }
    }
  }

  const handleSave = async () => {
    if (!selectedCar) return alert('Please select a vehicle');
    
    setSaving(true);
    try {
      const financialData = {
        make: selectedCar.make,
        model: selectedCar.model,
        trim: selectedCar.trim,
        year: selectedCar.year,
        msrp: { value: msrp, provenance_status: 'manual' },
        sellingPrice: { value: sellingPrice, provenance_status: 'manual' },
        monthlyPayment: { value: Math.round(monthlyPayment), provenance_status: 'manual' },
        term: { value: selectedProgram?.term || 36, provenance_status: 'manual' },
        mileage: { value: selectedProgram?.mileage || 10000, provenance_status: 'manual' },
        downPayment: { value: 0, provenance_status: 'manual' },
        type: dealType,
        lenderId: selectedLenderId,
        programId: selectedProgramId,
        incentives: selectedIncentives.map(i => ({ name: i.name, amount: i.amountCents / 100 })),
        dealerDiscount,
        image: selectedMediaId ? media.find(m => m.id === selectedMediaId)?.url : undefined
      };

      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify({
          financialData,
          reviewStatus: 'APPROVED',
          publishStatus: 'PUBLISHED',
          lenderId: selectedLenderId || undefined
        })
      });

      if (response.ok) {
        onSave();
        onClose();
      } else {
        alert('Failed to save deal');
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      alert('Network error while saving deal');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Offer Builder</h2>
              <p className="text-sm text-slate-500">Connect catalog, banks, incentives, and media to build a deal.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64 text-slate-500">Loading data sources...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Configuration */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Vehicle Selection */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                    <Car className="w-4 h-4 text-indigo-500" /> 1. Select Vehicle from Catalog
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Vehicle</label>
                      <select 
                        value={selectedCarId} 
                        onChange={e => {
                          setSelectedCarId(e.target.value);
                          setManualMsrp('');
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">-- Select Vehicle --</option>
                        {cars.map(c => (
                          <option key={c.id} value={c.id}>{c.year} {c.make} {c.model} {c.trim}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">MSRP Override ($)</label>
                      <input 
                        type="number" 
                        value={manualMsrp} 
                        onChange={e => setManualMsrp(e.target.value)}
                        placeholder={selectedCar ? (selectedCar.msrpCents / 100).toString() : '0'}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </section>

                {/* 2. Bank & Program Selection */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                    <Building2 className="w-4 h-4 text-indigo-500" /> 2. Select Bank & Program
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Deal Type</label>
                      <select 
                        value={dealType} 
                        onChange={e => { setDealType(e.target.value as any); setSelectedProgramId(''); }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="lease">Lease</option>
                        <option value="finance">Finance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Lender (Bank)</label>
                      <select 
                        value={selectedLenderId} 
                        onChange={e => { setSelectedLenderId(e.target.value); setSelectedProgramId(''); }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">-- Any Lender --</option>
                        {lenders.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Program</label>
                      <select 
                        value={selectedProgramId} 
                        onChange={e => setSelectedProgramId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        disabled={!selectedCarId}
                      >
                        <option value="">-- Select Program --</option>
                        {availablePrograms.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.term}mo {dealType === 'lease' ? `/ ${p.mileage}k` : ''} - 
                            {dealType === 'lease' ? ` MF: ${p.buyRateMf}` : ` APR: ${p.buyRateApr}%`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                {/* 3. Incentives & Discounts */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                    <Tag className="w-4 h-4 text-indigo-500" /> 3. Apply Incentives & Discounts
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">OEM Incentives</label>
                      <div className="border border-slate-300 rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                        {availableIncentives.length === 0 ? (
                          <div className="text-xs text-slate-500 p-1">No incentives for this vehicle</div>
                        ) : availableIncentives.map(i => (
                          <label key={i.id} className="flex items-center space-x-2 text-sm p-1 hover:bg-slate-50 rounded">
                            <input 
                              type="checkbox" 
                              checked={selectedIncentiveIds.includes(i.id)}
                              onChange={e => {
                                if (e.target.checked) setSelectedIncentiveIds([...selectedIncentiveIds, i.id]);
                                else setSelectedIncentiveIds(selectedIncentiveIds.filter(id => id !== i.id));
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span>{i.name} (${(i.amountCents / 100).toFixed(0)})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Dealer Discount</label>
                      <select 
                        value={selectedDiscountId} 
                        onChange={e => setSelectedDiscountId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">-- No Discount --</option>
                        {availableDiscounts.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.make || 'Global'} {d.model || ''} - ${d.amount}
                          </option>
                        ))}
                      </select>
                      
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Selling Price Override ($)</label>
                        <input 
                          type="number" 
                          value={manualSellingPrice} 
                          onChange={e => setManualSellingPrice(e.target.value)}
                          placeholder="Auto-calculated"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Media */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-2">
                    <ImageIcon className="w-4 h-4 text-indigo-500" /> 4. Select Media
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    <div 
                      onClick={() => setSelectedMediaId('')}
                      className={`cursor-pointer border-2 rounded-lg flex items-center justify-center p-4 text-xs text-center ${!selectedMediaId ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      Auto-match from Library
                    </div>
                    {media.slice(0, 7).map(m => (
                      <div 
                        key={m.id}
                        onClick={() => setSelectedMediaId(m.id)}
                        className={`cursor-pointer border-2 rounded-lg overflow-hidden h-20 relative ${selectedMediaId === m.id ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-1' : 'border-transparent'}`}
                      >
                        <img src={m.url} alt="Car" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </section>

              </div>

              {/* Right Column: Summary & Calculation */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 h-fit sticky top-0">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" /> Deal Summary
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">MSRP</span>
                    <span className="font-medium">${msrp.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Dealer Discount</span>
                    <span>-${dealerDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>OEM Incentives</span>
                    <span>-${totalIncentives.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Selling Price</span>
                    <span>${sellingPrice.toLocaleString()}</span>
                  </div>
                  
                  {selectedProgram && (
                    <>
                      <div className="pt-4 pb-2 border-b border-slate-200">
                        <span className="font-bold text-slate-900">Program Details</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Term</span>
                        <span className="font-medium">{selectedProgram.term} months</span>
                      </div>
                      {dealType === 'lease' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mileage</span>
                            <span className="font-medium">{selectedProgram.mileage}k / yr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Residual Value</span>
                            <span className="font-medium">{selectedProgram.residualPercentage}% (${(msrp * (selectedProgram.residualPercentage / 100)).toLocaleString()})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Money Factor</span>
                            <span className="font-medium">{selectedProgram.buyRateMf}</span>
                          </div>
                        </>
                      )}
                      {dealType === 'finance' && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">APR</span>
                          <span className="font-medium">{selectedProgram.buyRateApr}%</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-6 pt-4 border-t-2 border-slate-200">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-700 font-bold">Est. Monthly Payment</span>
                      <span className="text-3xl font-black text-indigo-600">
                        ${monthlyPayment > 0 ? monthlyPayment.toFixed(0) : '---'}
                      </span>
                    </div>
                    {!selectedProgram && (
                      <p className="text-xs text-amber-600 mt-2 text-right">Select a program to calculate</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !selectedCar || !selectedProgram}
                  className={`w-full mt-8 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all ${
                    !selectedCar || !selectedProgram
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  <Save className="w-5 h-5" />
                  <span>{saving ? 'Saving...' : 'Publish Deal'}</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
