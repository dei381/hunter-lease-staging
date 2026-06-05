import React, { useState } from 'react';
import { Calculator, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

export function OEMReverseEngineer() {
  const [msrp, setMsrp] = useState(37268);
  const [netCapCost, setNetCapCost] = useState(33272);
  const [residualValue, setResidualValue] = useState(22733);
  const [term, setTerm] = useState(36);
  const [payment, setPayment] = useState(449);
  const [das, setDas] = useState(2999);
  const [acqFee, setAcqFee] = useState(750);
  
  // CCR is usually DAS - 1st Payment - AcqFee (If upfront) or DAS - 1st Payment (If Acq is capitalized).
  // OEM disclaimers vary. In Toyota's, Acq fee is capitalized usually, but sometimes not.
  // We'll let the user input CCR if known, else calculate it.
  const [ccr, setCcr] = useState(1800);

  const calculate = () => {
    // 1. Residual %
    const residualPct = (residualValue / msrp) * 100;

    // 2. Gross Cap Cost = Net Cap Cost + CCR 
    const grossCapCost = netCapCost + ccr;

    // 3. Selling Price = Gross Cap Cost - Acq Fee
    const sellingPrice = grossCapCost - acqFee;

    // 4. Dealer Discount
    const dealerDiscount = msrp - sellingPrice;
    const discountPct = (dealerDiscount / msrp) * 100;

    // 5. Depreciation 
    const depreciation = (netCapCost - residualValue) / term;

    // 6. Rent Charge
    const rentCharge = payment - depreciation;

    // 7. Money Factor
    const moneyFactor = rentCharge / (netCapCost + residualValue);
    const apr = moneyFactor * 2400;

    return {
      residualPct,
      grossCapCost,
      sellingPrice,
      dealerDiscount,
      discountPct,
      depreciation,
      rentCharge,
      moneyFactor,
      apr
    };
  };

  const results = calculate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display">OEM Program Reverse-Engineer</h2>
        <p className="text-[var(--text-secondary)]">Extract exact Money Factor and Disguised Discounts from OEM Lease Disclaimers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-medium mb-2 border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[var(--lime)]" />
            Paste Values from OEM Disclaimer
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">MSRP / Total SRP ($)</label>
              <input type="number" value={msrp} onChange={e => setMsrp(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Net Capitalized Cost ($)</label>
              <input type="number" value={netCapCost} onChange={e => setNetCapCost(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Residual Value ($)</label>
              <input type="number" value={residualValue} onChange={e => setResidualValue(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Term (Months)</label>
              <input type="number" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Monthly Payment (Base) ($)</label>
              <input type="number" value={payment} onChange={e => setPayment(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Cap Cost Reduction (CCR) ($)</label>
              <input type="number" value={ccr} onChange={e => setCcr(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
              <p className="text-xs text-[var(--text-secondary)] mt-1">Usually: DAS - 1st Pay - Acq Fee</p>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">Acquisition Fee ($)</label>
              <input type="number" value={acqFee} onChange={e => setAcqFee(Number(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-xl p-6">
             <h3 className="text-lg font-medium text-[var(--lime)] mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Extracted Deal Baseline
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Residual %</div>
                  <div className="text-2xl font-mono text-white">{results.residualPct.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Money Factor</div>
                  <div className="text-2xl font-mono text-white">{results.moneyFactor.toFixed(5)}</div>
                  <div className="text-sm text-[var(--lime)]">APR: {results.apr.toFixed(2)}%</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Implied Selling Price</div>
                  <div className="text-2xl font-mono text-white">${results.sellingPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">OEM Target Discount</div>
                  <div className="text-2xl font-mono text-red-400">-${results.dealerDiscount.toFixed(2)}</div>
                  <div className="text-sm text-red-400/80">{results.discountPct.toFixed(1)}% below MSRP</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-sm space-y-2">
            <h4 className="font-medium">Under the Hood:</h4>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Gross Cap Cost:</span>
              <span className="font-mono">${results.grossCapCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Monthly Depreciation:</span>
              <span className="font-mono">${results.depreciation.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Monthly Rent Charge:</span>
              <span className="font-mono">${results.rentCharge.toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
