import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Car, Building2, Tag, Image as ImageIcon, DollarSign } from 'lucide-react';
import { getAuthToken } from '../../utils/auth';
import { toast } from 'react-hot-toast';
import { safeValidate, LendersResponseSchema, ProgramsResponseSchema, IncentivesResponseSchema } from '../../utils/schemas';

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

  const logError = (source: string, payload: any, error: any) => {
    console.error(`[OfferBuilder Error] Source: ${source}`, { payload, error });
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${await getAuthToken()}` };
      const [carsRes, lendersRes, leaseRes, financeRes, incentivesRes, discountsRes, mediaRes] = await Promise.all([
        fetch('/api/admin/cars', { headers }),
        fetch('/api/admin/lenders', { headers }),
        fetch('/api/admin/bulk/lease-programs', { headers }),
        fetch('/api/admin/bulk/finance-programs', { headers }),
        fetch('/api/admin/incentives', { headers }),
        fetch('/api/admin/bulk/dealer-discounts', { headers }),
        fetch('/api/car-photos') // public endpoint
      ]);

      if (carsRes.ok) {
        const carDb = await carsRes.json();
        const flatCars: any[] = [];
        if (carDb && Array.isArray(carDb.makes)) {
          carDb.makes.forEach((make: any) => {
            if (Array.isArray(make.models)) {
              make.models.forEach((model: any) => {
                if (Array.isArray(model.trims)) {
                  model.trims.forEach((trim: any) => {
                    const years = Array.isArray(model.years) ? model.years : [parseInt(model.years) || new Date().getFullYear()];
                    years.forEach((year: number) => {
                      flatCars.push({
                        id: `${make.id}-${model.id}-${trim.id || trim.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-${year}`,
                        make: make.name,
                        model: model.name,
                        trim: trim.name || 'Unknown',
                        year: year,
                        msrpCents: trim.msrp != null ? trim.msrp * 100 : null
                      });
                    });
                  });
                }
              });
            }
          });
        }
        setCars(flatCars);
      }
      if (lendersRes.ok) {
        const data = await lendersRes.json();
        setLenders(safeValidate(LendersResponseSchema, data, [], 'fetchLenders'));
      }
      if (leaseRes.ok) {
        const data = await leaseRes.json();
        setLeasePrograms(safeValidate(ProgramsResponseSchema, data, [], 'fetchLeasePrograms'));
      }
      if (financeRes.ok) {
        const data = await financeRes.json();
        setFinancePrograms(safeValidate(ProgramsResponseSchema, data, [], 'fetchFinancePrograms'));
      }
      if (incentivesRes.ok) {
        const data = await incentivesRes.json();
        setIncentives(safeValidate(IncentivesResponseSchema, data, [], 'fetchIncentives'));
      }
      if (discountsRes.ok) {
        const data = await discountsRes.json();
        setDiscounts(Array.isArray(data) ? data : []);
      }
      if (mediaRes.ok) {
        const data = await mediaRes.json();
        setMedia(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logError('Fetch Builder Data', null, error);
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
  const msrp = manualMsrp ? parseFloat(manualMsrp) : (selectedCar && selectedCar.msrpCents != null ? selectedCar.msrpCents / 100 : null);
  const totalIncentives = selectedIncentives.reduce((sum, i) => sum + (i.amountCents / 100), 0);
  const dealerDiscount = selectedDiscount?.amount ?? null;
  
  const sellingPrice = manualSellingPrice ? parseFloat(manualSellingPrice) : (msrp !== null && dealerDiscount !== null ? Math.max(0, msrp - dealerDiscount - totalIncentives) : null);

  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  
  // Input validation: term cannot be 0, MSRP, selling price, rate/MF must be present
  const isTermValid = selectedProgram && selectedProgram.term > 0;
  const isRateValid = selectedProgram && (dealType === 'lease' ? selectedProgram.buyRateMf !== null && selectedProgram.residualPercentage !== null : selectedProgram.buyRateApr !== null);
  const canCalculate = isTermValid && isRateValid && msrp !== null && sellingPrice !== null;

  useEffect(() => {
    if (!canCalculate || !selectedCar) {
      setMonthlyPayment(null);
      return;
    }

    const calculatePreview = async () => {
      setCalculating(true);
      try {
        const financialData = {
          make: selectedCar.make,
          model: selectedCar.model,
          trim: selectedCar.trim,
          year: selectedCar.year,
          msrp: { value: msrp, provenance_status: 'manual' },
          salePrice: { value: sellingPrice, provenance_status: 'manual' },
          monthlyPayment: { value: 0, provenance_status: 'unresolved' },
          term: { value: selectedProgram?.term || 36, provenance_status: 'manual' },
          mileage: { value: selectedProgram?.mileage || 10000, provenance_status: 'manual' },
          downPayment: { value: 0, provenance_status: 'manual' },
          moneyFactor: { value: selectedProgram?.mf || 0.002, provenance_status: 'manual' },
          residualValue: { value: (selectedProgram?.rv || 50) / 100, provenance_status: 'manual' },
          docFee: { value: 85, provenance_status: "estimated_from_rule" },
          dmvFee: { value: 600, provenance_status: "estimated_from_rule" },
          taxMonthly: { value: 0, provenance_status: "estimated_from_rule" },
          acquisitionFee: { value: 0, provenance_status: "estimated_from_rule" },
          rebates: { value: 0, provenance_status: "manual" },
          hunterDiscount: { value: 0, provenance_status: "manual" },
          manufacturerRebate: { value: 0, provenance_status: "manual" },
          type: dealType,
          lenderId: selectedLenderId,
          programId: selectedProgramId,
          incentives: selectedIncentives.map(i => ({ name: i.name, amount: i.amountCents / 100 })),
          availableIncentives: availableIncentives.map(i => ({
            id: i.id,
            name: i.name,
            amount: i.amountCents / 100,
            type: i.type,
            isDefault: selectedIncentives.some(si => si.id === i.id)
          })),
          dealerDiscount,
          image: selectedMediaId ? media.find(m => m.id === selectedMediaId)?.url : undefined
        };

        const response = await fetch('/api/admin/calculate-preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify({ financialData })
        });

        if (response.ok) {
          const data = await response.json();
          setMonthlyPayment(data.monthlyPayment);
        } else {
          setMonthlyPayment(null);
        }
      } catch (error) {
        console.error('Failed to calculate preview:', error);
        setMonthlyPayment(null);
      } finally {
        setCalculating(false);
      }
    };

    const debounceTimer = setTimeout(calculatePreview, 300);
    return () => clearTimeout(debounceTimer);
  }, [canCalculate, selectedCar, msrp, sellingPrice, selectedProgram, dealType, selectedLenderId, selectedProgramId, selectedIncentives, dealerDiscount, selectedMediaId]);

  const handleSave = async () => {
    if (!selectedCar) return toast.error('Please select a vehicle');
    if (!canCalculate) return toast.error('Missing required data for calculation (MSRP, Selling Price, Term, or Rate)');
    
    setSaving(true);
    try {
      const financialData = {
        make: selectedCar.make,
        model: selectedCar.model,
        trim: selectedCar.trim,
        year: selectedCar.year,
        msrp: { value: msrp, provenance_status: 'manual' },
        salePrice: { value: sellingPrice, provenance_status: 'manual' },
        monthlyPayment: { value: 0, provenance_status: 'unresolved' },
        term: { value: selectedProgram?.term || 36, provenance_status: 'manual' },
        mileage: { value: selectedProgram?.mileage || 10000, provenance_status: 'manual' },
        downPayment: { value: 0, provenance_status: 'manual' },
        moneyFactor: { value: selectedProgram?.mf || 0.002, provenance_status: 'manual' },
        residualValue: { value: (selectedProgram?.rv || 50) / 100, provenance_status: 'manual' },
        docFee: { value: 85, provenance_status: "estimated_from_rule" },
        dmvFee: { value: 600, provenance_status: "estimated_from_rule" },
        taxMonthly: { value: 0, provenance_status: "estimated_from_rule" },
        acquisitionFee: { value: 0, provenance_status: "estimated_from_rule" },
        rebates: { value: 0, provenance_status: "manual" },
        hunterDiscount: { value: 0, provenance_status: "manual" },
        manufacturerRebate: { value: 0, provenance_status: "manual" },
        type: dealType,
        lenderId: selectedLenderId,
        programId: selectedProgramId,
        incentives: selectedIncentives.map(i => ({ name: i.name, amount: i.amountCents / 100 })),
        availableIncentives: availableIncentives.map(i => ({
          id: i.id,
          name: i.name,
          amount: i.amountCents / 100,
          type: i.type,
          isDefault: selectedIncentives.some(si => si.id === i.id)
        })),
        dealerDiscount,
        image: selectedMediaId ? media.find(m => m.id === selectedMediaId)?.url : undefined
      };

      const payload = {
        financialData,
        reviewStatus: 'APPROVED',
        publishStatus: 'PUBLISHED',
        lenderId: selectedLenderId || undefined,
        isFirstTimeBuyerEligible: false
      };

      const response = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Deal saved successfully');
        onSave();
        onClose();
      } else {
        const errData = await response.json().catch(() => ({}));
        logError('Save Deal API', payload, errData);
        toast.error('Failed to save deal');
      }
    } catch (error) {
      logError('Save Deal Network', null, error);
      toast.error('Network error while saving deal');
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
                        placeholder={selectedCar && selectedCar.msrpCents != null ? (selectedCar.msrpCents / 100).toString() : '0'}
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
                    <span className="font-medium">{msrp !== null ? `$${msrp.toLocaleString()}` : 'данные недоступны'}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Dealer Discount</span>
                    <span>{dealerDiscount !== null ? `-$${dealerDiscount.toLocaleString()}` : 'данные недоступны'}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>OEM Incentives</span>
                    <span>-${totalIncentives.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                    <span>Selling Price</span>
                    <span>{sellingPrice !== null ? `$${sellingPrice.toLocaleString()}` : 'данные недоступны'}</span>
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
                            <span className="font-medium">
                              {selectedProgram.residualPercentage !== null ? `${selectedProgram.residualPercentage}%` : 'данные недоступны'}
                              {selectedProgram.residualPercentage !== null && msrp !== null ? ` ($${(msrp * (selectedProgram.residualPercentage / 100)).toLocaleString()})` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Money Factor</span>
                            <span className="font-medium">{selectedProgram.buyRateMf !== null ? selectedProgram.buyRateMf : 'данные недоступны'}</span>
                          </div>
                        </>
                      )}
                      {dealType === 'finance' && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">APR</span>
                          <span className="font-medium">{selectedProgram.buyRateApr !== null ? `${selectedProgram.buyRateApr}%` : 'данные недоступны'}</span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-6 pt-4 border-t-2 border-slate-200">
                    <div className="flex justify-between items-end">
                      <span className="text-slate-700 font-bold">Est. Monthly Payment</span>
                      <span className="text-3xl font-black text-indigo-600">
                        {monthlyPayment !== null && monthlyPayment > 0 && isFinite(monthlyPayment) ? `$${monthlyPayment.toFixed(0)}` : 'данные недоступны'}
                      </span>
                    </div>
                    {!selectedProgram && (
                      <p className="text-xs text-amber-600 mt-2 text-right">Select a program to calculate</p>
                    )}
                    {selectedProgram && !canCalculate && (
                      <p className="text-xs text-red-600 mt-2 text-right">Missing required data for calculation</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || !selectedCar || !selectedProgram || !canCalculate}
                  className={`w-full mt-8 flex items-center justify-center space-x-2 py-3 rounded-xl font-bold transition-all ${
                    !selectedCar || !selectedProgram || !canCalculate
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
