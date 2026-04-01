import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, ChevronDown, Zap, Clock, ShieldCheck, Info, TrendingDown, Eye, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { TransparencyModal } from './TransparencyModal';
import { calculateLease, calculateFinance, getVal, DEFAULT_FEES } from '../utils/finance';

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};



interface CalculatorProps {
  deal?: any;
  timeLeft?: { days: number; hours: number; minutes: number; seconds: number } | null;
  viewCount?: number;
  onProceed?: (data: any) => void;
  onMileageChange?: (mileage: string) => void;
  mode?: 'standalone' | 'offer';
}

export const Calculator: React.FC<CalculatorProps> = ({ 
  deal = {}, 
  timeLeft, 
  viewCount = 6, 
  onProceed, 
  onMileageChange,
  mode = 'offer'
}) => {
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { role } = useAuthStore();
  const t = translations[language].calc;

  const isStandalone = mode === 'standalone';

  const [calcType, setCalcType] = useState<'lease' | 'finance'>(deal?.displayType || deal?.type || 'lease');
  const [tier, setTier] = useState('t1');
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedTrim, setSelectedTrim] = useState<any>(null);
  const [down, setDown] = useState(Number(deal?.down) || 3000);
  const [term, setTerm] = useState(parseInt(deal?.displayTerm) || (calcType === 'finance' ? 72 : (parseInt(deal?.term) || 36)));
  const [mileage, setMileage] = useState(['Kia', 'Hyundai'].includes(deal?.make) ? '10k' : '7.5k');
  const [zipCode, setZipCode] = useState('90210');
  const isCalculating = false;
  const [showIncentives, setShowIncentives] = useState(!isStandalone);
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
    const [carDb, setCarDb] = useState<any>(null);
  const [lenderOptions, setLenderOptions] = useState<any[]>([]);
  const [isLenderLoading, setIsLenderLoading] = useState(false);
  
  

  const currentCar = useMemo(() => {
    if (deal?.id) return deal;
    if (!selectedTrim) return null;
    return {
      make: selectedMake?.name,
      model: selectedModel?.name,
      trim: selectedTrim?.name,
      msrp: selectedTrim?.msrp,
      year: 2025, // Default year
      savings: selectedTrim?.msrp * 0.05, // Default 5% savings for standalone calc
      ...selectedTrim
    };
  }, [deal, selectedMake, selectedModel, selectedTrim]);

  useEffect(() => {
    if (!currentCar) return;
    
    const fetchLenderOptions = async () => {
      setIsLenderLoading(true);
      try {
        const response = await fetch('/api/v2/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId: currentCar.id,
            make: currentCar.make,
            model: currentCar.model,
            trim: currentCar.trim,
            type: calcType,
            term,
            mileage: mileage.replace('k', '000'),
            downPayment: down,
            tier,
            zipCode
          })
        });
        const data = await response.json();
        if (data.options) {
          setLenderOptions(data.options);
        }
      } catch (err) {
        console.error('Failed to fetch lender options', err);
      } finally {
        setIsLenderLoading(false);
      }
    };

    const timer = setTimeout(fetchLenderOptions, 500);
    return () => clearTimeout(timer);
  }, [currentCar, calcType, term, down, mileage, tier, zipCode]);

  

  useEffect(() => {
    fetchSettings();
    if (deal?.availableIncentives) {
      setSelectedIncentives(deal.availableIncentives.filter((inc: any) => inc.isDefault).map((inc: any) => inc.id));
    }
    fetch('/api/cars')
      .then(res => res.json())
      .then(data => {
        setCarDb(data);
        if (!deal?.id && data?.makes?.length > 0) {
          // Initialize with first make/model/trim if no deal
          const firstMake = data.makes[0];
          setSelectedMake(firstMake);
          if (firstMake.models?.length > 0) {
            const firstModel = firstMake.models[0];
            setSelectedModel(firstModel);
            if (firstModel.trims?.length > 0) {
              setSelectedTrim(firstModel.trims[0]);
            }
          }
        }
      })
      .catch(err => console.error('Failed to fetch car db', err));
  }, []);

  const toggleIncentive = (id: string) => {
    const incentive = currentCar?.availableIncentives?.find((inc: any) => inc.id === id);
    if (incentive?.isDefault && role !== 'admin') return;
    
    setSelectedIncentives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculatedPayment = useMemo(() => {
    if (!currentCar) return 0;
    const msrp = getVal(currentCar.msrp);
    const savings = getVal(currentCar.savings);
    const leaseCash = getVal(currentCar.leaseCash);
    let totalIncentives = leaseCash;
    if (currentCar?.availableIncentives) {
      currentCar.availableIncentives.forEach((inc: any) => {
        if (selectedIncentives.includes(inc.id)) {
          totalIncentives += getVal(inc.amount);
        }
      });
    }
    
    const taxRate = DEFAULT_FEES.taxRate;
    const acqFee = DEFAULT_FEES.acqFee;
    const docFee = DEFAULT_FEES.docFee;
    const dmvFee = DEFAULT_FEES.dmvFee;
    const brokerFee = getVal(settings.brokerFee, DEFAULT_FEES.brokerFee);

    if (calcType === 'lease') {
      let rv = getVal(currentCar.rv, 0.5);
      
      if (mileage === '12k') rv -= 0.01;
      else if (mileage === '15k') rv -= 0.03;
      else if (mileage === '20k') rv -= 0.05;
      else if (mileage === '7.5k') rv += 0.01;
      
      let mf = getVal(currentCar.mf, 0.002);
      
      if (tier === 't2') mf *= 1.1;
      else if (tier === 't3') mf *= 1.2;
      else if (tier === 't4') mf *= 1.35;
      else if (tier === 't5') mf *= 1.5;
      else if (tier === 't6') mf *= 1.7;
      
      const lease = calculateLease({
        msrp, savings, leaseCash: totalIncentives, rebates: 0, discount: 0,
        term, down, rv, mf, taxRate,
        acqFee, docFee, dmvFee, brokerFee
      });
      
      return lease.monthlyPayment;
    } else {
      let apr = getVal(currentCar.apr, 4.9);
      if (tier === 't2') apr += 1.0;
      else if (tier === 't3') apr += 2.5;
      else if (tier === 't4') apr += 4.5;
      else if (tier === 't5') apr += 7.0;
      else if (tier === 't6') apr += 10.0;
      
      const finance = calculateFinance({
        msrp, savings, leaseCash: 0, rebates: totalIncentives, discount: 0,
        term, down, apr, taxRate,
        rv: 0, mf: 0, acqFee: 0, docFee, dmvFee, brokerFee
      });
      
      return finance.monthlyPayment;
    }
  }, [currentCar, calcType, term, down, mileage, tier, zipCode, selectedIncentives, settings.brokerFee]);

  const marketAvgRatio = useMemo(() => {
    if (!currentCar || !currentCar.displayPayment) return 1.267;
    return (currentCar.displayMarketAvg || (currentCar.displayPayment * 1.267)) / currentCar.displayPayment;
  }, [currentCar]);

  const tcoData = useMemo(() => {
    if (!calculatedPayment || isNaN(calculatedPayment)) return null;
    const insurancePerMonth = 150;
    const maintenancePerMonth = 50;
    const registrationPerYear = 400;

    const totalLeasePayments = calculatedPayment * term;
    const totalInsurance = insurancePerMonth * term;
    const totalMaintenance = maintenancePerMonth * term;
    const totalRegistration = (registrationPerYear / 12) * term;
    const dueAtSigning = down;

    const totalCost = totalLeasePayments + dueAtSigning + totalInsurance + totalMaintenance + totalRegistration;

    return {
      totalCost,
      monthlyAverage: totalCost / term,
      breakdown: {
        lease: totalLeasePayments + dueAtSigning,
        insurance: totalInsurance,
        maintenance: totalMaintenance,
        registration: totalRegistration
      }
    };
  }, [calculatedPayment, term, down, ]);

  return (
    <>
    <div className="bg-[var(--s1)] text-[var(--w)] rounded-2xl border border-[var(--b2)] overflow-hidden shadow-2xl">
      {/* Header with Urgency Timer */}
      <div className="p-4 border-b border-[var(--b2)] bg-[var(--w)]/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 w-full">
          {!isStandalone && (
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                <Eye size={12} className="text-[var(--lime)]" />
                <span>{viewCount} {translations[language].dealPage.viewingNow}</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                <Zap size={12} className="text-orange-500" />
                <span>{translations[language].dealPage.highDemand}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            {!isStandalone && <span className="px-1.5 py-0.5 bg-[var(--lime)] text-black text-[10px] font-bold uppercase tracking-tighter rounded">{t.liveDeal}</span>}
            <span className="font-mono text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.id}: {currentCar?.id ? (currentCar.id * 12345 ^ 0xABCDEF).toString(16).padStart(8, '0').toUpperCase() : 'CUSTOM'}</span>
          </div>
          <h1 className="text-xl font-display leading-tight uppercase">
            {currentCar?.make} <span className="text-[var(--mu2)]">{currentCar?.model}</span>
          </h1>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">
            {t.msrp}: <span className="text-[var(--w)] font-mono">{fmt(currentCar?.msrp)}</span>
            <div className="group/msrp relative inline-flex items-center">
              <Info size={12} className="text-[var(--lime)] cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded text-[9px] uppercase tracking-widest leading-relaxed opacity-0 group-hover/msrp:opacity-100 transition-opacity pointer-events-none z-50">
                {language === 'ru' 
                  ? 'MSRP включает заводскую стоимость доставки (Destination Fee). Никаких скрытых наценок.' 
                  : 'MSRP includes the factory destination fee. Zero hidden markups.'}
              </div>
            </div>
          </div>
        </div>

        {/* Circular Timer */}
        {!isStandalone && (
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[var(--b2)] pt-3 sm:pt-0">
            <div className="text-left sm:text-right">
              <div className="text-[8px] font-bold text-[var(--lime)] uppercase tracking-widest">{translations[language].dealPage.verifiedDeal}</div>
              <div className="text-[10px] font-mono font-bold text-[var(--w)]">
                {timeLeft ? (
                  timeLeft.days > 0 
                    ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m` 
                    : `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
                ) : '0d 0h 0m'} {translations[language].dealPage.remaining}
              </div>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--b2)]" />
                <motion.circle 
                  cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" 
                  className="text-[var(--lime)]"
                  strokeDasharray="132"
                  initial={{ strokeDashoffset: 132 }}
                  animate={{ 
                    strokeDashoffset: 132 * (1 - (
                      ((timeLeft?.days || 0) * 24 + (timeLeft?.hours || 0) + (timeLeft?.minutes || 0) / 60) / 72
                    )) 
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-mono font-bold text-[var(--w)] leading-none">
                  {timeLeft?.days && timeLeft.days > 0 ? `${timeLeft.days}d` : `${timeLeft?.hours}h`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-0">
        {/* Car Selection - Only if no specific deal */}
        {!deal?.id && carDb && (
          <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-[var(--b2)] bg-[var(--w)]/[0.01]">
            <div className="p-4 border-r border-b sm:border-b-0 border-[var(--b2)] space-y-2">
              <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.make}</label>
              <div className="relative">
                <select 
                  value={selectedMake?.name || ''}
                  onChange={(e) => {
                    const make = carDb?.makes?.find((m: any) => m.name === e.target.value);
                    setSelectedMake(make);
                    if (make?.models?.length > 0) {
                      const model = make.models[0];
                      setSelectedModel(model);
                      if (model.trims?.length > 0) {
                        setSelectedTrim(model.trims[0]);
                      }
                    }
                  }}
                  className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
                >
                  {carDb?.makes?.map((m: any) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
              </div>
            </div>

            <div className="p-4 border-r border-b sm:border-b-0 border-[var(--b2)] space-y-2">
              <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.model}</label>
              <div className="relative">
                <select 
                  value={selectedModel?.name || ''}
                  onChange={(e) => {
                    const model = selectedMake?.models?.find((m: any) => m.name === e.target.value);
                    setSelectedModel(model);
                    if (model?.trims?.length > 0) {
                      setSelectedTrim(model.trims[0]);
                    }
                  }}
                  className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
                >
                  {selectedMake?.models?.map((m: any) => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
              </div>
            </div>

            <div className="p-4 space-y-2">
              <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.trimMsrp}</label>
              <div className="relative">
                <select 
                  value={selectedTrim?.name || ''}
                  onChange={(e) => {
                    const trim = selectedModel?.trims?.find((t: any) => t.name === e.target.value);
                    setSelectedTrim(trim);
                  }}
                  className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
                >
                  {selectedModel?.trims?.map((tr: any) => (
                    <option key={tr.name} value={tr.name}>{tr.name} ({fmt(tr.msrp)})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Lease/Finance Toggle - Full Width */}
        <div className="flex border-b border-[var(--b2)]">
          {(['lease', 'finance'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setCalcType(m);
                setTerm(m === 'finance' ? 72 : 36);
              }}
              className={cn(
                "flex-1 py-4 text-xs font-bold tracking-widest transition-all uppercase border-r last:border-r-0 border-[var(--b2)]",
                calcType === m 
                  ? "bg-[var(--lime)] text-white" 
                  : "text-[var(--mu2)] hover:text-[var(--w)] bg-[var(--s2)]"
              )}
            >
              {m === 'lease' ? t.lease : t.finance}
            </button>
          ))}
        </div>

        {/* Parameters Grid - Competitor Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[var(--b2)]">
          <div className="p-4 border-r border-b border-[var(--b2)] space-y-2">
            <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.term}</label>
            <div className="relative">
              <select 
                value={term}
                onChange={(e) => setTerm(parseInt(e.target.value))}
                className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
              >
                {(calcType === 'lease' ? [24, 36, 48] : [48, 60, 72, 84, 96]).map(v => (
                  <option key={v} value={v}>{v} {t.moShort}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
            </div>
          </div>

          <div className="p-4 border-b border-[var(--b2)] space-y-2">
            <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.dueAtSigning}</label>
            <div className="relative">
              <select 
                value={down}
                onChange={(e) => setDown(parseInt(e.target.value))}
                className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
              >
                {[0, 1000, 2000, 3000, 4000, 5000].map(v => (
                  <option key={v} value={v}>{fmt(v)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
            </div>
          </div>
        </div>

        
                <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-[var(--b2)]">
                  

                  <div className="p-4 border-r border-b border-[var(--b2)] space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.creditTier}</label>
                    <div className="relative">
                        <select 
                          value={tier}
                          onChange={(e) => setTier(e.target.value)}
                          className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
                        >
                          <option value="t1">{t.tier1}</option>
                          <option value="t2">{t.tier2}</option>
                          <option value="t3">{t.tier3}</option>
                          <option value="t4">{t.tier4}</option>
                          <option value="t5">{t.tier5}</option>
                          <option value="t6">{t.tier6}</option>
                        </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-4 border-r border-b border-[var(--b2)] space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.zipCode}</label>
                    <input 
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full bg-transparent text-sm font-bold outline-none"
                      placeholder="90210"
                    />
                  </div>

                  {calcType === 'lease' && (
                    <div className="p-4 border-b border-[var(--b2)] space-y-2">
                      <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.annualMileage}</label>
                      <div className="relative">
                        <select 
                          value={mileage}
                          onChange={(e) => {
                            setMileage(e.target.value);
                            onMileageChange?.(e.target.value);
                          }}
                          className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
                        >
                          <option value="7.5k">{t.mileageOptions['7.5k']} {t.miles}</option>
                          <option value="10k">{t.mileageOptions['10k']} {t.miles}</option>
                          <option value="12k">{t.mileageOptions['12k']} {t.miles}</option>
                          <option value="15k">{t.mileageOptions['15k']} {t.miles}</option>
                          <option value="20k">{t.mileageOptions['20k']} {t.miles}</option>
                        </select>
                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
                      </div>
                    </div>
                  )}

                  
                </div>
              
        </div>

        <div className="p-6 space-y-6">
          {/* Incentives Toggle - Competitor Style */}
          {!isStandalone && (
            <div className="space-y-4">
              <div className="flex p-1 bg-[var(--s2)] rounded-xl border border-[var(--b2)]">
                <button
                  onClick={() => setShowIncentives(false)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    !showIncentives ? "bg-[var(--lime)] text-white" : "text-[var(--mu2)] hover:text-[var(--w)]"
                  )}
                >
                  {t.withoutIncentives}
                </button>
                <button
                  onClick={() => setShowIncentives(true)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    showIncentives ? "bg-[var(--lime)] text-white" : "text-[var(--mu2)] hover:text-[var(--w)]"
                  )}
                >
                  {t.withIncentives}
                </button>
              </div>

              {showIncentives && currentCar?.availableIncentives && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="text-xs font-bold text-blue-400">
                    {translations[language].calc.incentiveSavings
                      .replace('{amount}', fmt(currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0))
                      .replace('{count}', selectedIncentives.length.toString())}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-3 py-1.5 bg-[var(--s2)] border border-[var(--b2)] rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-[var(--b1)] transition-all flex items-center gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <Info size={12} />
                      {translations[language].calc.incentiveModal.edit}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Incentive Modal */}
          {createPortal(
            <AnimatePresence>
              {isModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsModalOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />
                  <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-4xl bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row"
                >
                  {/* Left Side: Selection */}
                  <div className="flex-1 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-[var(--b2)] overflow-y-auto max-h-[60vh] lg:max-h-[80vh]">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-display uppercase tracking-tight">{translations[language].calc.incentiveModal.title}</h2>
                        <p className="text-xs text-[var(--mu2)] leading-relaxed max-w-md">
                          {translations[language].calc.incentiveModal.desc}
                        </p>
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 hover:bg-[var(--s2)] rounded-full transition-colors"
                      >
                        <X size={20} className="text-[var(--mu2)]" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {currentCar?.availableIncentives?.map((inc: any) => (
                        <div 
                          key={inc.id}
                          onClick={() => {
                            const isDefault = inc.isDefault || inc.type === 'dealer';
                            if (isDefault && role !== 'admin') return;
                            toggleIncentive(inc.id);
                          }}
                          className={cn(
                            "group p-4 rounded-2xl border transition-all flex items-center gap-4",
                            selectedIncentives.includes(inc.id)
                              ? "bg-[var(--lime)]/5 border-[var(--lime)]/30"
                              : "bg-[var(--s2)] border-[var(--b2)] hover:border-[var(--b3)]",
                            (inc.isDefault || inc.type === 'dealer') && role !== 'admin' ? "cursor-default opacity-80" : "cursor-pointer"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-all",
                            selectedIncentives.includes(inc.id)
                              ? "bg-[var(--lime)] border-[var(--lime)]"
                              : "border-[var(--b3)] group-hover:border-[var(--mu2)]",
                            (inc.isDefault || inc.type === 'dealer') && role !== 'admin' && "opacity-50"
                          )}>
                            {selectedIncentives.includes(inc.id) && <X size={14} className="text-black" />}
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold uppercase tracking-tight">
                                {language === 'ru' && inc.nameRu ? inc.nameRu : inc.name}
                              </span>
                              <div className="group/info relative">
                                <Info size={14} className="text-[var(--mu2)] cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 border border-white/10 rounded text-[10px] uppercase tracking-widest leading-relaxed opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50">
                                  {language === 'ru' 
                                    ? (inc.descriptionRu || 'Детали этого предложения уточняются.') 
                                    : (inc.description || 'Details for this incentive are being finalized.')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className={cn(
                                  (inc.isDefault || inc.type === 'dealer') ? "text-blue-400" : "text-[var(--lime)]"
                                )} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)]">
                                  {(inc.isDefault || inc.type === 'dealer') ? translations[language].calc.incentiveModal.autoApplied : translations[language].calc.incentiveModal.autoSelected}
                                </span>
                              </div>
                              {inc.expiresAt && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-bold text-red-400 uppercase tracking-widest">
                                  {translations[language].calc.incentiveModal.expires} {inc.expiresAt}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-lg font-display tracking-tight">
                            {fmt(inc.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Side: Summary */}
                  <div className="w-full lg:w-[380px] bg-[var(--s2)] p-6 sm:p-8 flex flex-col">
                    <div className="space-y-4 flex-1">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--mu2)]">
                        {translations[language].calc.incentiveModal.summaryTitle}
                      </h3>

                      <div className="space-y-1">
                        <div className="text-xl font-display uppercase">{currentCar?.make} {currentCar?.model}</div>
                        <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                          {currentCar?.trim} • {term} {translations[language].calc.moShort}, {translations[language].calc.mileageOptions[mileage as keyof typeof translations.en.calc.mileageOptions]} {translations[language].calc.miles}
                        </div>
                      </div>

                      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-[var(--b2)] bg-[var(--s1)]">
                        <img 
                          src={currentCar?.image || "https://picsum.photos/seed/car/800/450"} 
                          alt={currentCar?.model}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="space-y-3 pt-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--mu2)] uppercase tracking-widest font-bold">{translations[language].calc.incentiveModal.basePayment}</span>
                          <span className="font-mono font-bold">{fmt(calculatedPayment + (currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0) / term)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--mu2)] uppercase tracking-widest font-bold">{translations[language].calc.incentiveModal.withIncentivesPayment}</span>
                          <span className="font-mono font-bold text-[var(--lime)]">{fmt(calculatedPayment)}</span>
                        </div>
                        <div className="h-px bg-[var(--b2)]" />
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--mu2)] uppercase tracking-widest font-bold">{translations[language].calc.incentiveModal.savedOnPayment}</span>
                          <span className="font-mono font-bold text-blue-400">{fmt((currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0) / term)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-sm font-bold uppercase tracking-widest text-[var(--w)]">{translations[language].calc.incentiveModal.totalSaved}</span>
                          <span className="text-2xl font-display text-[var(--lime)]">
                            {fmt(currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-8 mt-auto">
                        <button 
                          onClick={() => setIsModalOpen(false)}
                          className="flex-1 py-3 border border-[var(--b2)] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[var(--b1)] transition-all"
                        >
                          {translations[language].calc.incentiveModal.close}
                        </button>
                        <button 
                          onClick={() => setIsModalOpen(false)}
                          className="flex-1 py-3 bg-[var(--lime)] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-all"
                        >
                          {translations[language].calc.incentiveModal.save}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body
          )}

        {/* Price Breakdown */}
          <div className="space-y-3 pt-4 border-t border-[var(--b2)]">
            {!isStandalone && (
              <div className="space-y-2">
                {/* Hunter Lease Discount */}
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-blue-400">{t.hunterLeaseDiscount}</span>
                  <span className="font-mono text-blue-400">
                    -{fmt(currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id) && (inc.type === 'dealer' || inc.isDefault)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)}
                  </span>
                </div>

                {/* Other Selected Incentives */}
                {showIncentives && currentCar?.availableIncentives?.some((inc: any) => selectedIncentives.includes(inc.id) && inc.type !== 'dealer' && !inc.isDefault) && (
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-orange-400">{t.selectedIncentives}</span>
                    <span className="font-mono text-orange-400">
                      -{fmt(currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id) && inc.type !== 'dealer' && !inc.isDefault).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className={cn("pt-2 flex justify-between items-center", !isStandalone && "border-t border-[var(--b2)]")}>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">{t.sellingPrice}</span>
              <span className="text-lg font-display text-[var(--lime)]">
                {fmt((Number(currentCar?.msrp) || 0) - (showIncentives ? (currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0) : 0))}
              </span>
            </div>
          </div>

          {/* Standard Options & Specs */}
          {!isStandalone && (currentCar?.features || currentCar?.specs) && (
            <div className="pt-6 border-t border-[var(--b2)] space-y-6">
              {currentCar?.features && (
                <div>
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={14} className="text-[var(--lime)]" />
                    {translations[language].deals.standardOptionsTitle}
                  </h4>
                  <div className="grid grid-cols-1 gap-y-1.5">
                    {currentCar?.features?.map((feature: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] text-[var(--mu2)] uppercase tracking-wider">
                        <div className="w-1 h-1 rounded-full bg-[var(--lime)]" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentCar?.specs && (
                <div>
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ShieldCheck size={14} className="text-[var(--lime)]" />
                    {translations[language].deals.specsTitle}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {currentCar?.specs && Object.entries(currentCar.specs).map(([key, value]) => (
                      <div key={key} className="bg-[var(--s2)]/50 p-2 rounded-lg border border-[var(--b2)]">
                        <div className="text-[7px] text-[var(--mu2)] uppercase tracking-widest mb-0.5">{key}</div>
                        <div className="text-[10px] font-bold text-[var(--w)] uppercase">{value as string}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lender Comparison */}
          {lenderOptions.length > 0 && (
            <div className="pt-6 border-t border-[var(--b2)] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest flex items-center gap-2">
                  <TrendingDown size={14} className="text-[var(--lime)]" />
                  {language === 'ru' ? 'Сравнение банков' : 'Lender Comparison'}
                </h4>
                {isLenderLoading && <div className="w-3 h-3 border-2 border-[var(--lime)] border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lenderOptions.map((opt, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex flex-col gap-1",
                      opt.isBest 
                        ? "bg-[var(--lime)]/5 border-[var(--lime)]/30" 
                        : "bg-[var(--s2)]/50 border-[var(--b2)]"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                        {opt.lenderType === 'CAPTIVE' ? (language === 'ru' ? 'Каптивный банк' : 'Captive Bank') : 
                         opt.lenderType === 'CREDIT_UNION' ? (language === 'ru' ? 'Кредитный союз' : 'Credit Union') : 
                         (language === 'ru' ? 'Национальный банк' : 'National Bank')}
                      </span>
                      {opt.isBest && (
                        <span className="px-1.5 py-0.5 bg-[var(--lime)] text-black text-[7px] font-bold uppercase tracking-tighter rounded">
                          {language === 'ru' ? 'Лучшая цена' : 'Best Deal'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-[var(--w)] uppercase truncate">{opt.lenderName}</div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-display text-[var(--w)]">{fmt(opt.monthlyPayment)}</span>
                      <span className="text-[8px] text-[var(--mu2)] font-bold uppercase tracking-widest">/mo</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[8px] text-[var(--mu2)] leading-relaxed italic">
                {language === 'ru' 
                  ? '* Кредитные союзы часто предлагают более низкие ставки, но требуют членства.' 
                  : '* Credit unions often offer lower rates but require membership.'}
              </p>
            </div>
          )}

          {/* Results Block */}
          <div className="pt-6 border-t border-[var(--b2)] space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--w)]">
                  <Zap size={20} className="text-[var(--lime)]" />
                  <span className="text-xl font-display uppercase tracking-widest">{t.lockIn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[var(--s2)] flex items-center justify-center border border-[var(--b2)]">
                    <ShieldCheck size={16} className="text-[var(--lime)]" />
                  </div>
                  <div className="text-[10px] font-bold text-[var(--mu2)] uppercase leading-tight">
                    {currentCar?.make} Motor<br />Finance
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-baseline justify-end gap-2">
                  {isCalculating ? (
                    <div className="h-12 w-32 bg-[var(--b2)] animate-pulse rounded-lg" />
                  ) : (
                    <span className="text-6xl font-display text-[var(--lime)] leading-none">{fmt(calculatedPayment)}</span>
                  )}
                  <span className="text-sm text-[var(--mu2)] font-bold uppercase tracking-widest">per month</span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                  <div className="text-xs text-[var(--mu2)]">
                    (+{fmt(down)} due at signing)
                  </div>
                  <button 
                    onClick={() => setIsTransparencyOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest hover:underline"
                  >
                    <Eye size={12} />
                    {translations[language].transparency.btnTransparency}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="flex items-start gap-2 bg-[var(--s2)] p-2 rounded-xl border border-[var(--b2)]">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--lime)] shrink-0" />
          <p className="text-[8px] text-[var(--mu2)] leading-relaxed">
            {t.trustBadge}
          </p>
        </div>
      </div>

      {/* CTA */}
      <button 
        onClick={() => currentCar && onProceed?.({ 
          ...currentCar, 
          payment: calculatedPayment, 
          type: calcType, 
          down, 
          term: `${term} mo`, 
          tier, 
          mileage 
        })}
        className="w-full bg-[var(--lime)] hover:bg-[var(--lime2)] text-black py-3 text-base font-display tracking-widest uppercase transition-all flex items-center justify-center gap-2.5 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
        <span className="relative z-10">{isStandalone ? translations[language].nav.deals : t.lockIn}</span>
        <Zap size={18} fill="currentColor" className="relative z-10" />
      </button>

      {/* Transparency Modal */}
      <TransparencyModal 
        isOpen={isTransparencyOpen}
        onClose={() => setIsTransparencyOpen(false)}
        deal={currentCar ? {
          ...currentCar,
          term,
          down,
          type: calcType,
          rv: currentCar?.rv || 0.55,
          mf: currentCar?.mf || 0.002,
          apr: currentCar?.apr || 4.9,
          rebates: (currentCar?.leaseCash || 0) + (currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)
        } : null}
        mileage={mileage}
        quoteResult={{ 
          calculation: { 
            msrpCents: (currentCar?.msrp || 0) * 100, 
            sellingPriceCents: ((currentCar?.msrp || 0) - (currentCar?.savings || 0)) * 100, 
            residualValueCents: (currentCar?.msrp || 0) * (currentCar?.rv || 0.55) * 100, 
            dealerDiscountCents: -(currentCar?.savings || 0) * 100, 
            incentivesCents: ((currentCar?.leaseCash || 0) + (currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)) * 100, 
            fees: [
              {name: "Acquisition Fee", amountCents: 65000}, 
              {name: "Doc Fee", amountCents: 8500}, 
              {name: "DMV Fee", amountCents: 40000}, 
              {name: "Broker Fee", amountCents: 59500}
            ], 
            monthlyPaymentCents: Math.round(calculatedPayment * 100), 
            totalDueAtSigningCents: down * 100 
          }, 
          metadata: { 
            debug: { 
              bankProgram: { 
                rv: currentCar?.rv || 0.55, 
                mf: currentCar?.mf || 0.002, 
                apr: currentCar?.apr || 4.9 
              } 
            } 
          } 
        }}
      />
    </>
  );
};
