import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, Percent, Hash } from 'lucide-react';

export const IndependentCalculator = () => {
  const [msrp, setMsrp] = useState<number>(40000);
  const [sellingPrice, setSellingPrice] = useState<number>(38000);
  const [rvPercent, setRvPercent] = useState<number>(60);
  const [mf, setMf] = useState<number>(0.00210);
  const [term, setTerm] = useState<number>(36);
  const [downPayment, setDownPayment] = useState<number>(2000);
  const [taxRate, setTaxRate] = useState<number>(8.875);
  const [fees, setFees] = useState<number>(1135); // Acq + Doc + DMV

  const [payment, setPayment] = useState({ preTax: 0, postTax: 0, das: 0 });

  useEffect(() => {
    // Lease Calculation Logic
    const residualValue = msrp * (rvPercent / 100);
    const capCost = sellingPrice + fees;
    const adjustedCapCost = capCost - downPayment;
    
    const depreciation = adjustedCapCost - residualValue;
    const basePayment = depreciation / term;
    
    const rentCharge = (adjustedCapCost + residualValue) * mf;
    const preTaxPayment = basePayment + rentCharge;
    const postTaxPayment = preTaxPayment * (1 + taxRate / 100);

    // Due at signing (simplified: Down + 1st month + fees if not rolled in, but here we rolled fees into cap cost)
    // If fees are in cap cost, DAS is just Down Payment + 1st Month
    const das = downPayment + postTaxPayment;

    setPayment({
      preTax: Math.max(0, preTaxPayment),
      postTax: Math.max(0, postTaxPayment),
      das: Math.max(0, das)
    });
  }, [msrp, sellingPrice, rvPercent, mf, term, downPayment, taxRate, fees]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Calculator className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="font-bold text-slate-900">Независимый Калькулятор</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">MSRP</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" value={msrp} onChange={e => setMsrp(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selling Price</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Residual Value (%)</label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" value={rvPercent} onChange={e => setRvPercent(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Money Factor (MF)</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" step="0.00001" value={mf} onChange={e => setMf(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Term (Months)</label>
          <select value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value={24}>24 мес</option>
            <option value={36}>36 мес</option>
            <option value={48}>48 мес</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Down Payment</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tax Rate (%)</label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" step="0.1" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Fees (Acq+Doc+DMV)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="number" value={fees} onChange={e => setFees(Number(e.target.value))} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 text-white">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Monthly Payment</p>
            <div className="text-3xl font-display font-bold">${payment.postTax.toFixed(0)} <span className="text-sm font-normal text-slate-400">/mo (incl. tax)</span></div>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Pre-tax</p>
            <div className="text-lg font-medium">${payment.preTax.toFixed(0)}</div>
          </div>
        </div>
        <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
          <span className="text-sm text-slate-300">Due at Signing (Down + 1st Mo)</span>
          <span className="font-bold text-emerald-400">${payment.das.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
};
