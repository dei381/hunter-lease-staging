import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, ChevronDown, Zap, Clock, ShieldCheck, Info, TrendingDown, Eye, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { calculateFinancePayment } from '../utils/financeCalc';
import { CalculationEngine } from '../services/CalculationEngine';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

const getTermMultiplier = (term: number) => {
  if (term <= 24) return 1.15;
  if (term <= 36) return 1.0;
  if (term <= 48) return 0.92;
  if (term <= 60) return 0.85;
  return 0.80;
};

interface CalculatorProps {
  deal?: any;
  timeLeft?: { days: number; hours: number; minutes: number; seconds: number } | null;
  viewCount?: number;
  onProceed?: (data: any) => void;
  onMileageChange?: (mileage: string) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ deal = {}, timeLeft, viewCount = 6, onProceed, onMileageChange }) => {
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { role } = useAuthStore();
  const t = translations[language].calc;

  const [calcType, setCalcType] = useState<'lease' | 'finance'>(deal?.displayType || deal?.type || 'lease');
  const [tier, setTier] = useState('t1');
  const [selectedMake, setSelectedMake] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedTrim, setSelectedTrim] = useState<any>(null);
  const [down, setDown] = useState(Number(deal?.down) || 3000);
  const [term, setTerm] = useState(parseInt(deal?.displayTerm) || (calcType === 'finance' ? 72 : (parseInt(deal?.term) || 36)));
  const [mileage, setMileage] = useState(['Kia', 'Hyundai'].includes(deal?.make) ? '10k' : '7.5k');
  const [msdCount, setMsdCount] = useState(0);
  const [zipCode, setZipCode] = useState('90210');
  const [showIncentives, setShowIncentives] = useState(true);
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [carDb, setCarDb] = useState<any>(null);

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

  const calculatedPayment = useMemo(() => {
    if (!currentCar || !carDb) return 0;
    
    let basePayment = Number(currentCar.displayPayment) || Number(currentCar.payment) || 0;
    let baseDown = 3000;
    let baseTerm = calcType === 'finance' ? 72 : 36;
    const baseMileage = currentCar.mileage || '10k';
    const brokerFee = Number(settings.brokerFee) || 595;

    if (!currentCar.id || (currentCar.displayType && currentCar.displayType !== calcType)) {
      if (calcType === 'finance') {
        basePayment = calculateFinancePayment(Number(currentCar.msrp) || 0, Number(currentCar.savings) || 0, 3000, 72);
      } else {
        // Simple lease estimation if no specific deal data
        basePayment = Math.round((Number(currentCar.msrp) || 0) * 0.012);
      }
    }

    const makeObj = carDb?.makes?.find((m: any) => m.name.toLowerCase() === currentCar?.make?.toLowerCase());
    const defaultTiers = [
      { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0 },
      { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040 },
      { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120 },
      { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240 }
    ];
    const safeTiers = (makeObj?.tiers && makeObj.tiers.length > 0) ? makeObj.tiers : defaultTiers;
    const activeTier = safeTiers.find((t: any) => t.id === tier) || { mfAdd: 0, aprAdd: 0 };
    
    let tierAdjustment = 0;
    if (calcType === 'lease') {
      tierAdjustment = ((activeTier.mfAdd || 0) * 2400) * 20;
    } else {
      tierAdjustment = (activeTier.aprAdd || 0) * 20;
    }

    const totalSelectedIncentivesAmount = currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0;
    
    const msrp = Number(currentCar.msrp) || 0;
    const originalSavings = Number(currentCar.savings) || 0;
    const originalLeaseCash = Number(currentCar.leaseCash) || 0;
    
    // The original deal price used to calculate the base payment
    const originalSellingPrice = msrp - originalSavings - originalLeaseCash;
    
    // The current selling price based on selected incentives
    const currentSellingPrice = msrp - (showIncentives ? totalSelectedIncentivesAmount : 0);
    
    // Calculate the delta and apply it to the payment
    const priceDelta = currentSellingPrice - originalSellingPrice;
    const priceAdjustment = (priceDelta / term) * 1.1; // 1.1 factor for interest/tax on the delta
    
    if (calcType === 'finance') {
      const baseAPR = parseFloat(currentCar.apr || '5.9') + (activeTier?.aprAdd || 0);
      const financePayment = calculateFinancePayment(msrp, msrp - currentSellingPrice, down, term, baseAPR);
      return Math.round(financePayment + (brokerFee / term));
    } else {
      const normalizedBasePayment = basePayment / getTermMultiplier(baseTerm);
      const termAdjustedPayment = normalizedBasePayment * getTermMultiplier(term);
      const downAdjustment = (baseDown - down) / term;
      
      let mileageAdjustment = 0;
      const mileageMap: Record<string, number> = { '7.5k': 1, '10k': 0, '12k': -1, '15k': -3 };
      const baseVal = mileageMap[baseMileage] || 0;
      const targetVal = mileageMap[mileage] || 0;
      mileageAdjustment = -((Number(currentCar.msrp) || 0) * ((targetVal - baseVal) / 100)) / term;

      let finalPayment = Math.max(0, Math.round(termAdjustedPayment + downAdjustment + tierAdjustment + mileageAdjustment + priceAdjustment + (brokerFee / term)));
      
      if (msdCount > 0) {
        const msdReduction = ((Number(currentCar.msrp) || 0) * 0.00007 * 2) * msdCount;
        finalPayment = Math.max(0, Math.round(finalPayment - msdReduction));
      }
      
      return finalPayment;
    }
  }, [currentCar, tier, down, term, mileage, carDb, selectedIncentives, settings, calcType, msdCount, showIncentives]);

  const marketAvgRatio = useMemo(() => {
    if (!currentCar || !currentCar.displayPayment) return 1.267;
    return (currentCar.displayMarketAvg || (currentCar.displayPayment * 1.267)) / currentCar.displayPayment;
  }, [currentCar]);

  const tcoData = useMemo(() => {
    if (!calculatedPayment) return null;
    return CalculationEngine.calculateTCO({
      monthlyPayment: calculatedPayment,
      term: term,
      dueAtSigning: down + (msdCount * Math.ceil(calculatedPayment / 50) * 50),
    });
  }, [calculatedPayment, term, down, msdCount]);

  return (
    <div className="bg-[var(--s1)] text-[var(--w)] rounded-2xl border border-[var(--b2)] overflow-hidden shadow-2xl">
      {/* Header with Urgency Timer */}
      <div className="p-4 border-b border-[var(--b2)] bg-[var(--w)]/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 w-full">
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
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-[var(--lime)] text-black text-[10px] font-bold uppercase tracking-tighter rounded">{t.liveDeal}</span>
            <span className="font-mono text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.id}: {currentCar?.id ? (currentCar.id * 12345 ^ 0xABCDEF).toString(16).padStart(8, '0').toUpperCase() : 'CUSTOM'}</span>
          </div>
          <h1 className="text-xl font-display leading-tight uppercase">
            {currentCar?.make} <span className="text-[var(--mu2)]">{currentCar?.model}</span>
          </h1>
          <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">
            {t.msrp}: <span className="text-[var(--w)] font-mono">{fmt(currentCar?.msrp)}</span>
          </div>
        </div>

        {/* Circular Timer */}
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
      </div>

      <div className="p-0">
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
                  ? "bg-[var(--lime)] text-black" 
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

          {calcType === 'lease' && (
            <div className="p-4 border-b border-[var(--b2)] space-y-2">
              <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">{t.mileage}</label>
              <div className="relative">
                <select 
                  value={mileage}
                  onChange={(e) => {
                    setMileage(e.target.value);
                    onMileageChange?.(e.target.value);
                  }}
                  className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6"
                >
                  {Object.entries(t.mileageOptions).map(([key, val]) => (
                    <option key={key} value={key}>{val as string} {t.miles}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
              </div>
            </div>
          )}

          <div className="p-4 border-r border-[var(--b2)] space-y-2">
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
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] pointer-events-none" />
            </div>
          </div>

          <div className="p-4 space-y-2">
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

        <div className="p-6 space-y-6">
          {/* Incentives Toggle - Competitor Style */}
          <div className="space-y-4">
            <div className="flex p-1 bg-[var(--s2)] rounded-xl border border-[var(--b2)]">
              <button
                onClick={() => setShowIncentives(false)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  !showIncentives ? "bg-[var(--lime)] text-black" : "text-[var(--mu2)] hover:text-[var(--w)]"
                )}
              >
                {t.withoutIncentives}
              </button>
              <button
                onClick={() => setShowIncentives(true)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  showIncentives ? "bg-[var(--lime)] text-black" : "text-[var(--mu2)] hover:text-[var(--w)]"
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
                  <Info size={12} />
                  {translations[language].calc.incentiveModal.edit}
                </button>
              </div>
            )}
          </div>

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
                          className="flex-1 py-3 bg-[var(--lime)] text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-all"
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

            <div className="pt-2 border-t border-[var(--b2)] flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">{t.sellingPrice}</span>
              <span className="text-lg font-display text-[var(--lime)]">
                {fmt((Number(currentCar?.msrp) || 0) - (showIncentives ? (currentCar?.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0) : 0))}
              </span>
            </div>
          </div>

          {/* Standard Options & Specs */}
          {(currentCar?.features || currentCar?.specs) && (
            <div className="pt-6 border-t border-[var(--b2)] space-y-6">
              {currentCar?.features && (
                <div>
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info size={14} className="text-[var(--lime)]" />
                    {translations[language].deals.standardOptionsTitle}
                  </h4>
                  <div className="grid grid-cols-1 gap-y-1.5">
                    {currentCar.features.map((feature: string, i: number) => (
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
                    {Object.entries(currentCar.specs).map(([key, value]) => (
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
                  <span className="text-6xl font-display text-[var(--lime)] leading-none">{fmt(calculatedPayment)}</span>
                  <span className="text-sm text-[var(--mu2)] font-bold uppercase tracking-widest">per month</span>
                </div>
                <div className="text-xs text-[var(--mu2)] mt-2">
                  (+{fmt(down)} due at signing)
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
        <span className="relative z-10">{t.lockIn}</span>
        <Zap size={18} fill="currentColor" className="relative z-10" />
      </button>
    </div>
  );
};
