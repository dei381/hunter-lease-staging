import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, ShieldCheck, Calculator, Landmark, Receipt, Percent } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../translations';

interface TransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  mileage: string;
  isFirstTimeBuyer?: boolean;
}

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
  <div className="group relative flex items-center gap-1 cursor-help">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center font-normal normal-case tracking-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black" />
    </div>
  </div>
);

export const TransparencyModal = ({ isOpen, onClose, deal, mileage, isFirstTimeBuyer = false }: TransparencyModalProps) => {
  const { language } = useLanguageStore();
  const { settings } = useSettingsStore();
  const t = translations[language].transparency;
  const tc = translations[language].calc;

  if (!isOpen || !deal) return null;

  // Calculate transparency data based on deal
  const msrp = Number(deal.msrp) || 0;
  const leaseCash = Number(deal.leaseCash || deal.rebates) || 0;
  const acqFee = deal.acquisitionFee !== undefined ? Number(deal.acquisitionFee) : 695;
  const docFee = 85;
  const taxRate = (Number(settings.taxRateDefault) || 8.875) / 100;
  const term = parseInt(deal.displayTerm || deal.term) || 36;
  const isFinance = deal.displayType === 'finance' || deal.type === 'finance';
  const downPayment = Number(deal.down) || 3000; // This is now total DAS
  const savings = Number(deal.savings) || 0;
  const sellingPrice = deal.price || (msrp - savings) || msrp * 0.92;
  
  // Basic lease math for transparency
  const parseRV = (val: any) => {
    if (typeof val === 'number') return val > 1 ? val / 100 : val;
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (val.includes('%') || num > 1) return num / 100;
      return num;
    }
    return 0.60;
  };

  const rvPct = parseRV(deal.rv);
  const rvAmt = msrp * rvPct;
  const mf = typeof deal.mf === 'string' ? parseFloat(deal.mf) : (deal.mf || 0.0025);
  const apr = typeof deal.apr === 'string' ? parseFloat(deal.apr) : (deal.apr || 4.99);
  
  let basePayment = 0;
  let totalPayment = 0;
  let totalDas = downPayment; // User input is the total DAS
  let firstPayment = 0;
  let totalFees = 0;
  let taxOnFees = 0;

  if (isFinance) {
    totalFees = docFee;
    const amountFinanced = sellingPrice + docFee + (sellingPrice * taxRate) - totalDas;
    const monthlyRate = (apr / 100) / 12;
    totalPayment = (amountFinanced * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1));
    basePayment = totalPayment;
    firstPayment = 0;
  } else {
    totalFees = acqFee + docFee;
    taxOnFees = totalFees * taxRate;
    
    // Approximate first payment to find cap reduction
    const approxCapCost = sellingPrice - totalDas + totalFees;
    const approxDepreciation = (approxCapCost - rvAmt) / term;
    const approxRent = (approxCapCost + rvAmt) * mf;
    const approxFirstPayment = (approxDepreciation + approxRent) * (1 + taxRate);
    
    const capReduction = Math.max(0, totalDas - approxFirstPayment - totalFees - taxOnFees);
    const capCost = sellingPrice - capReduction + totalFees;
    
    const depreciation = (capCost - rvAmt) / term;
    const rentCharge = (capCost + rvAmt) * mf;
    basePayment = depreciation + rentCharge;
    totalPayment = basePayment * (1 + taxRate);
    firstPayment = totalPayment;
  }

  return (
    <AnimatePresence>
      {createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--lime)]/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[var(--lime)]" />
              </div>
              <div>
                <h2 className="font-display text-2xl tracking-widest text-black">{t.title}</h2>
                <p className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{deal.make} {deal.model}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[var(--s1)] flex items-center justify-center hover:bg-[var(--b1)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--mu)]" />
            </button>
          </div>

          <div className="p-8 pt-0 overflow-y-auto max-h-[70vh] custom-scrollbar">
            <p className="text-xs text-[var(--mu2)] leading-relaxed mb-8">
              {t.subtitle}
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Payment Breakdown */}
              <div className="space-y-6">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="w-4 h-4 text-[var(--lime)]" />
                    <h3 className="text-[10px] font-bold text-black uppercase tracking-widest">{t.monthlyPayment}</h3>
                  </div>
                  <div className="bg-[var(--s1)] rounded-2xl p-5 border border-[var(--b1)] space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--mu2)]">{t.basePayment}</span>
                      <span className="text-black font-medium">{fmt(basePayment)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--mu2)]">{t.salesTax} ({(taxRate * 100).toFixed(2)}%)</span>
                      <span className="text-black font-medium">{fmt(basePayment * taxRate)}</span>
                    </div>
                    <div className="pt-3 border-t border-[var(--b1)] flex justify-between items-end">
                      <span className="text-[10px] font-bold text-black uppercase tracking-widest">{t.totalMonthly}</span>
                      <span className="text-2xl font-display text-[var(--lime)] leading-none">{fmt(totalPayment)}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Receipt className="w-4 h-4 text-[var(--lime)]" />
                    <h3 className="text-[10px] font-bold text-black uppercase tracking-widest">{t.dueAtSigning}</h3>
                  </div>
                  <div className="bg-[var(--s1)] rounded-2xl p-5 border border-[var(--b1)] space-y-3">
                    {downPayment > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--mu2)]">{tc.downPayment}</span>
                        <span className="text-black font-medium">{fmt(downPayment)}</span>
                      </div>
                    )}
                    {!isFinance && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--mu2)]">{t.firstPayment}</span>
                        <span className="text-black font-medium">{fmt(firstPayment)}</span>
                      </div>
                    )}
                    {!isFinance && (
                      <div className="flex justify-between text-xs">
                        <Tooltip text={t.tooltips.acquisitionFee}>
                          <span className="text-[var(--mu2)] border-b border-dashed border-[var(--mu2)]">{t.acquisitionFee}</span>
                        </Tooltip>
                        <span className="text-black font-medium">{fmt(acqFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <Tooltip text={t.tooltips.docFee}>
                        <span className="text-[var(--mu2)] border-b border-dashed border-[var(--mu2)]">{t.docFee}</span>
                      </Tooltip>
                      <span className="text-black font-medium">{fmt(docFee)}</span>
                    </div>
                    {!isFinance && (
                      <div className="flex justify-between text-xs">
                        <Tooltip text={t.tooltips.taxOnFees}>
                          <span className="text-[var(--mu2)] border-b border-dashed border-[var(--mu2)]">{t.taxOnFees}</span>
                        </Tooltip>
                        <span className="text-black font-medium">{fmt(taxOnFees)}</span>
                      </div>
                    )}
                    {leaseCash > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--mu2)]">{t.manufacturerRebates}</span>
                        <span className="text-black font-medium">-{fmt(leaseCash)}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-[var(--b1)] flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-black uppercase tracking-widest block">{t.totalDas}</span>
                        <span className="text-[8px] text-[var(--mu2)] uppercase tracking-widest leading-tight block max-w-[120px]">
                          {t.dasTypeDesc}
                        </span>
                      </div>
                      <span className="text-2xl font-display text-black leading-none">{fmt(totalDas)}</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Lease/Finance Conditions */}
              <div className="space-y-6">
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Percent className="w-4 h-4 text-[var(--lime)]" />
                    <h3 className="text-[10px] font-bold text-black uppercase tracking-widest">{t.discountsAndSavings}</h3>
                  </div>
                  <div className="bg-[var(--lime)]/5 rounded-2xl p-5 border border-[var(--lime)]/20 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.wholesaleDiscount}</span>
                      <span className="text-sm font-bold text-[var(--lime)]">-{fmt(msrp - sellingPrice)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.totalSavings}</span>
                      <span className="text-sm font-bold text-[var(--lime)]">{fmt((msrp - sellingPrice) + leaseCash)}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Landmark className="w-4 h-4 text-[var(--lime)]" />
                    <h3 className="text-[10px] font-bold text-black uppercase tracking-widest">
                      {isFinance ? t.financeConditions : t.leaseConditions}
                    </h3>
                  </div>
                  <div className="bg-[var(--s1)] rounded-2xl p-5 border border-[var(--b1)] space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.termLength}</span>
                      <span className="text-sm font-bold text-black">{term} {t.months}</span>
                    </div>
                    
                    {!isFinance && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.annualMileage}</span>
                          <span className="text-sm font-bold text-black">{translations[language].calc.mileageOptions[mileage as keyof typeof translations.en.calc.mileageOptions]} {t.miles}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-[var(--b1)]">
                          <Tooltip text={t.tooltips.residualValue}>
                            <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest border-b border-dashed border-[var(--mu2)]">{t.residualValue}</span>
                          </Tooltip>
                          <span className="text-sm font-bold text-black">{fmt(rvAmt)} ({(rvPct * 100).toFixed(0)}%)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Tooltip text={t.tooltips.moneyFactor}>
                            <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest border-b border-dashed border-[var(--mu2)]">{t.moneyFactor}</span>
                          </Tooltip>
                          <span className="text-sm font-mono font-bold text-black">{mf.toFixed(5)}</span>
                        </div>
                      </>
                    )}

                    {isFinance && (
                      <div className="flex justify-between items-center pt-4 border-t border-[var(--b1)]">
                        <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.apr}</span>
                        <span className="text-sm font-bold text-black">{apr.toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Percent className="w-4 h-4 text-[var(--lime)]" />
                    <h3 className="text-[10px] font-bold text-black uppercase tracking-widest">{t.rebates}</h3>
                  </div>
                  <div className="bg-[var(--lime)]/5 rounded-2xl p-5 border border-[var(--lime)]/20">
                    <div className="flex items-start gap-3">
                      <Info className="w-4 h-4 text-[var(--lime)] mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest mb-1">{t.manufacturerRebates}</p>
                        <p className="text-[11px] text-[var(--mu2)] leading-relaxed">
                          {leaseCash > 0 
                            ? `Includes ${fmt(leaseCash)} in manufacturer lease incentives already applied to your selling price.`
                            : t.noRebates}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 bg-[var(--s1)] border-t border-[var(--b1)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--lime)]" />
              <span className="text-[9px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.transparencyGuaranteed}</span>
            </div>
            <button 
              onClick={onClose}
              className="bg-black text-white px-8 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    )}
  </AnimatePresence>
);
};
