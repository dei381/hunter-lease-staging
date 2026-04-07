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
import { IncentivesModal } from './IncentivesModal';
import { getVal } from '../utils/finance';
import { TradeInEstimator } from './TradeInEstimator';
import { useDebounce } from '../hooks/useDebounce';
import { useCarData } from '../hooks/useCarData';

const fmt = (n: any) => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};



interface CalculatorProps {
  deal?: any;
  timeLeft?: { days: number; hours: number; minutes: number; seconds: number } | null;
  viewCount?: number;
  onProceed?: (data: any) => void;
  onChange?: (data: any) => void;
  onMileageChange?: (mileage: string) => void;
  mode?: 'standalone' | 'offer';
  initialIsFirstTimeBuyer?: boolean;
  initialHasCosigner?: boolean;
}

export const Calculator: React.FC<CalculatorProps> = ({ 
  deal, 
  timeLeft, 
  viewCount = 6, 
  onProceed, 
  onChange,
  onMileageChange,
  mode = 'offer',
  initialIsFirstTimeBuyer = false,
  initialHasCosigner = false
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
  const [tradeInEquity, setTradeInEquity] = useState(0);
  const [term, setTerm] = useState(parseInt(deal?.displayTerm) || (calcType === 'finance' ? 60 : (parseInt(deal?.term) || 36)));
  const [mileage, setMileage] = useState(['Kia', 'Hyundai'].includes(deal?.make) ? '10k' : '7.5k');
  const [zipCode, setZipCode] = useState('90210');
  const [showIncentives, setShowIncentives] = useState(!isStandalone);
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([]);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(initialIsFirstTimeBuyer);
  const [hasCosigner, setHasCosigner] = useState(initialHasCosigner);
  const [isIncentivesModalOpen, setIsIncentivesModalOpen] = useState(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
  const [carDb, setCarDb] = useState<any>(null);
  const [carDbLoading, setCarDbLoading] = useState(true);
  const [carDbError, setCarDbError] = useState(false);
  const [lenderOptions, setLenderOptions] = useState<any[]>([]);
  const [isLenderLoading, setIsLenderLoading] = useState(false);
  const isCalculating = isLenderLoading;
  
  

  const currentCar = useMemo(() => {
    if (deal) return deal;
    if (!selectedTrim) return null;
    
    const baseMF = Number(selectedTrim.mf) || Number(selectedModel?.mf) || Number(selectedMake?.baseMF) || 0;
    const baseAPR = Number(selectedTrim.baseAPR) || Number(selectedTrim.apr) || Number(selectedModel?.baseAPR) || Number(selectedMake?.baseAPR) || 0;
    const baseRV = Number(selectedTrim.rv36) || Number(selectedTrim.rv) || Number(selectedModel?.rv36) || 0;

    return {
      make: selectedMake?.name,
      model: selectedModel?.name,
      trim: selectedTrim?.name,
      msrp: selectedTrim?.msrp,
      year: selectedModel?.years?.[0] || 2025, // Use model year if available
      savings: 0, // No default savings for standalone calc
      image: selectedModel?.imageUrl,
      ...selectedTrim,
      mf: baseMF,
      baseAPR: baseAPR,
      rv36: baseRV
    };
  }, [deal, selectedMake, selectedModel, selectedTrim]);

  const [backendPayment, setBackendPayment] = useState<number | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);

  useEffect(() => {
    if (!currentCar) return;
    
    const fetchLenderOptions = async () => {
      console.log('Calculator: fetchLenderOptions called');
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
            mileage: mileage === '7.5k' ? 7500 : parseInt(mileage.replace('k', '000')),
            downPaymentCents: down * 100,
            tradeInEquityCents: tradeInEquity * 100,
            tier,
            zipCode,
            selectedIncentives,
            isFirstTimeBuyer,
            hasCosigner,
            isStandalone
          })
        });
        const data = await response.json();
        setQuoteData(data);
        if (data.calcStatus) {
          setQuoteStatus(data.calcStatus);
        } else {
          setQuoteStatus(null);
        }
        
        if (data.options) {
          setLenderOptions(data.options);
        }
        
        if (data.monthlyPaymentCents !== undefined) {
          setBackendPayment(data.monthlyPaymentCents / 100);
        }
      } catch (err) {
        console.error('Failed to fetch lender options', err);
      } finally {
        setIsLenderLoading(false);
      }
    };

    const timer = setTimeout(fetchLenderOptions, 500);
    return () => clearTimeout(timer);
  }, [currentCar, calcType, term, down, tradeInEquity, mileage, tier, zipCode, JSON.stringify(selectedIncentives), isFirstTimeBuyer, hasCosigner]);

  

  useEffect(() => {
    console.log('Calculator: MOUNTED');
    return () => console.log('Calculator: UNMOUNTED');
  }, []);

  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [trims, setTrims] = useState<any[]>([]);
  
  const { data: makesData, loading: makesLoading, error: makesError } = useCarData<any[]>('/api/v2/makes');
  const { data: modelsData } = useCarData<any[]>(selectedMake?.id ? `/api/v2/models?makeId=${selectedMake.id}` : null);
  const { data: trimsData } = useCarData<any[]>(selectedModel?.id ? `/api/v2/trims?modelId=${selectedModel.id}` : null);

  useEffect(() => {
    fetchSettings();
    if (deal?.availableIncentives) {
      setSelectedIncentives(deal.availableIncentives.filter((inc: any) => inc.isDefault).map((inc: any) => inc.id));
    }
  }, []);

  useEffect(() => {
    setCarDbLoading(makesLoading);
    if (makesError) setCarDbError(true);
    
    if (makesData) {
      setMakes(makesData);
      if (!deal && makesData.length > 0 && !selectedMake) {
        setSelectedMake(makesData[0]);
      } else if (!deal && makesData.length === 0) {
        setCarDbError(true);
      }
    }
  }, [makesData, makesLoading, makesError, deal]);

  useEffect(() => {
    if (modelsData) {
      setModels(modelsData);
      if (!deal && modelsData.length > 0) {
        // Only auto-select if we don't already have a selected model for this make
        if (!selectedModel || selectedModel.makeId !== selectedMake?.id) {
          setSelectedModel(modelsData[0]);
        }
      }
    } else if (!selectedMake?.id) {
      setModels([]);
    }
  }, [modelsData, deal, selectedMake?.id]);

  useEffect(() => {
    if (trimsData) {
      setTrims(trimsData);
      if (!deal && trimsData.length > 0) {
        // Only auto-select if we don't already have a selected trim for this model
        if (!selectedTrim || selectedTrim.modelId !== selectedModel?.id) {
          setSelectedTrim(trimsData[0]);
        }
      }
    } else if (!selectedModel?.id) {
      setTrims([]);
    }
  }, [trimsData, deal, selectedModel?.id]);

  const effectiveIncentives = useMemo(() => {
    return deal?.availableIncentives || quoteData?.availableIncentives || currentCar?.availableIncentives || [];
  }, [deal?.availableIncentives, quoteData?.availableIncentives, currentCar?.availableIncentives]);

  useEffect(() => {
    if (effectiveIncentives.length > 0) {
      const defaultIds = effectiveIncentives
        .filter((inc: any) => {
          if (isStandalone && inc.type === 'dealer') return false;
          return inc.isDefault || inc.type === 'dealer';
        })
        .map((inc: any) => inc.id);
      
      setSelectedIncentives(prev => {
        if (prev.length === defaultIds.length && prev.every(id => defaultIds.includes(id))) {
          return prev;
        }
        return defaultIds;
      });
    } else {
      setSelectedIncentives(prev => prev.length === 0 ? prev : []);
    }
  }, [currentCar?.id, currentCar?.trim, isStandalone, effectiveIncentives]);

  const toggleIncentive = (id: string) => {
    const incentive = effectiveIncentives.find((inc: any) => inc.id === id);
    if (incentive?.isDefault && role !== 'admin') return;
    
    setSelectedIncentives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculatedPayment = useMemo(() => {
    if (quoteStatus && quoteStatus !== 'SUCCESS') return currentCar?.displayPayment || null;
    if (backendPayment !== null && backendPayment > 0) return backendPayment;
    return currentCar?.displayPayment || null;
  }, [backendPayment, quoteStatus, currentCar]);

  useEffect(() => {
    if (currentCar && calculatedPayment !== null) {
      onChange?.({
        ...currentCar,
        payment: calculatedPayment,
        type: calcType,
        down,
        term: `${term} mo`,
        tier,
        mileage,
        zip: zipCode,
        source: isStandalone ? 'custom_calculator' : 'catalog_deal'
      });
    }
  }, [currentCar, calculatedPayment, calcType, down, term, tier, mileage, zipCode, isStandalone, onChange]);

  const totalIncentives = useMemo(() => {
    if (quoteData?.totalIncentivesCents !== undefined) {
      return quoteData.totalIncentivesCents / 100;
    }
    return effectiveIncentives.reduce((sum: number, inc: any) => {
      const isFtbIncentive = inc.type === 'first_time_buyer' || inc.name?.toLowerCase().includes('first time buyer');
      if (selectedIncentives.includes(inc.id) || (isFtbIncentive && isFirstTimeBuyer)) {
        return sum + (inc.amount || 0);
      }
      return sum;
    }, 0) || 0;
  }, [quoteData, effectiveIncentives, selectedIncentives, isFirstTimeBuyer]);

  const marketAvgRatio = useMemo(() => {
    if (!currentCar || !currentCar.displayPayment) return 1.267;
    return (currentCar.displayMarketAvg || (currentCar.displayPayment * 1.267)) / currentCar.displayPayment;
  }, [currentCar]);

  const tcoData = useMemo(() => {
    if (!quoteData?.tco) return null;
    return {
      totalCost: quoteData.tco.totalCostCents / 100,
      monthlyAverage: quoteData.tco.monthlyAverageCents / 100,
      breakdown: quoteData.tco.breakdownCents ? {
        lease: quoteData.tco.breakdownCents.lease / 100,
        insurance: quoteData.tco.breakdownCents.insurance / 100,
        maintenance: quoteData.tco.breakdownCents.maintenance / 100,
        registration: quoteData.tco.breakdownCents.registration / 100
      } : null
    };
  }, [quoteData]);

  console.log('Calculator rendering, carDbLoading:', carDbLoading, 'carDbError:', carDbError, 'makes count:', carDb?.makes?.length);

  return (
    <>
    <div className="bg-[var(--s1)] text-[var(--w)] rounded-2xl border border-[var(--b2)] overflow-hidden shadow-2xl">
      {/* Header with Urgency Timer */}
      {!isStandalone && (
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
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">
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
      )}

      <div className="p-0">
        {/* Car Selection - Only if no specific deal */}
        {!deal && (
          <div className="p-4 sm:p-5 bg-[var(--s1)] border-b border-[var(--b2)]">
            <div className="mb-3">
              <h2 className="text-lg font-display uppercase tracking-tight">{language === 'ru' ? 'Выберите автомобиль' : 'Select Vehicle'}</h2>
            </div>
            {carDbLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--lime)]"></div>
              </div>
            ) : carDbError ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {language === 'ru' ? 'Не удалось загрузить базу автомобилей. Пожалуйста, обновите страницу.' : 'Failed to load car database. Please refresh the page.'}
              </div>
            ) : makes && makes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
              <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
                <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.make}</label>
                <div className="relative">
                  <select 
                    value={selectedMake?.id || ''}
                    onChange={(e) => {
                      const make = makes.find((m: any) => m.id === e.target.value);
                      setSelectedMake(make);
                      setSelectedModel(null);
                      setSelectedTrim(null);
                    }}
                    className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate"
                  >
                    {makes.map((m: any) => (
                      <option key={m.id} value={m.id} className="bg-[var(--s1)] text-[var(--w)]">{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
                </div>
              </div>

              <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
                <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.model}</label>
                <div className="relative">
                  <select 
                    value={selectedModel?.id || ''}
                    onChange={(e) => {
                      const model = models.find((m: any) => m.id === e.target.value);
                      setSelectedModel(model);
                      setSelectedTrim(null);
                    }}
                    disabled={!selectedMake || models.length === 0}
                    className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate disabled:opacity-50"
                  >
                    <option value="" disabled>{language === 'ru' ? 'Выберите модель' : 'Select Model'}</option>
                    {models.map((m: any) => (
                      <option key={m.id} value={m.id} className="bg-[var(--s1)] text-[var(--w)]">{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
                </div>
              </div>

              <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
                <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.trimMsrp}</label>
                <div className="relative">
                  <select 
                    value={selectedTrim?.id || ''}
                    onChange={(e) => {
                      const trim = trims.find((t: any) => t.id === e.target.value);
                      setSelectedTrim(trim);
                    }}
                    disabled={!selectedModel || trims.length === 0}
                    className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate disabled:opacity-50"
                  >
                    <option value="" disabled>{language === 'ru' ? 'Выберите комплектацию' : 'Select Trim'}</option>
                    {trims.map((tr: any) => {
                      const displayName = tr.name.length > 40 ? tr.name.substring(0, 40) + '...' : tr.name;
                      return (
                        <option key={tr.id} value={tr.id} className="bg-[var(--s1)] text-[var(--w)]">{displayName} ({fmt(tr.msrp)})</option>
                      );
                    })}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

        {/* Lease/Finance Toggle - Full Width */}
        <div className="flex border-b border-[var(--b2)]">
          {(['lease', 'finance'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setCalcType(m);
                setTerm(m === 'finance' ? 60 : 36);
              }}
              className={cn(
                "flex-1 py-3 text-[10px] font-bold tracking-widest transition-all uppercase border-r last:border-r-0 border-[var(--b2)]",
                calcType === m 
                  ? "bg-[var(--lime)] text-black" 
                  : "text-[var(--mu2)] hover:text-[var(--w)] bg-[var(--s2)]"
              )}
            >
              {m === 'lease' ? t.lease : t.finance}
            </button>
          ))}
        </div>

        {/* Parameters Grid - Compact Style */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 order-2 sm:order-1">
            <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
              <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.term}</label>
              <div className="relative">
                <select 
                  value={term}
                  onChange={(e) => setTerm(parseInt(e.target.value))}
                  className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)]"
                >
                  {(calcType === 'lease' ? [24, 36, 48] : [48, 60, 72, 84, 96]).map(v => (
                    <option key={v} value={v} className="bg-[var(--s1)] text-[var(--w)]">{v} {t.moShort}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
              </div>
            </div>

            <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
              <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.dueAtSigning}</label>
              <div className="relative">
                <select 
                  value={down}
                  onChange={(e) => setDown(parseInt(e.target.value))}
                  className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)]"
                >
                  {[0, 1000, 2000, 3000, 4000, 5000].map(v => (
                    <option key={v} value={v} className="bg-[var(--s1)] text-[var(--w)]">{fmt(v)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
              </div>
            </div>
            
            {calcType === 'lease' && (
              <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
                <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.annualMileage}</label>
                <div className="relative">
                  <select 
                    value={mileage}
                    onChange={(e) => {
                      setMileage(e.target.value);
                      onMileageChange?.(e.target.value);
                    }}
                    className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)]"
                  >
                    <option value="7.5k" className="bg-[var(--s1)] text-[var(--w)]">{t.mileageOptions['7.5k']} {t.miles}</option>
                    <option value="10k" className="bg-[var(--s1)] text-[var(--w)]">{t.mileageOptions['10k']} {t.miles}</option>
                    <option value="12k" className="bg-[var(--s1)] text-[var(--w)]">{t.mileageOptions['12k']} {t.miles}</option>
                    <option value="15k" className="bg-[var(--s1)] text-[var(--w)]">{t.mileageOptions['15k']} {t.miles}</option>
                    <option value="20k" className="bg-[var(--s1)] text-[var(--w)]">{t.mileageOptions['20k']} {t.miles}</option>
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
                </div>
              </div>
            )}

            <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
              <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.creditTier}</label>
              <div className="relative">
                  <select 
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-transparent text-base font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)]"
                  >
                    <option value="t1" className="bg-[var(--s1)] text-[var(--w)]">{t.tier1}</option>
                    <option value="t2" className="bg-[var(--s1)] text-[var(--w)]">{t.tier2}</option>
                    <option value="t3" className="bg-[var(--s1)] text-[var(--w)]">{t.tier3}</option>
                    <option value="t4" className="bg-[var(--s1)] text-[var(--w)]">{t.tier4}</option>
                    <option value="t5" className="bg-[var(--s1)] text-[var(--w)]">{t.tier5}</option>
                    <option value="t6" className="bg-[var(--s1)] text-[var(--w)]">{t.tier6}</option>
                  </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-hover:text-[var(--w)] transition-colors pointer-events-none" />
              </div>
            </div>

            <div className="relative bg-[var(--s2)] rounded-xl border border-[var(--b2)] hover:border-[var(--b3)] transition-all group p-2.5">
              <label className="text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest block mb-0.5">{t.zipCode}</label>
              <input 
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full bg-transparent text-base font-bold outline-none placeholder-[var(--mu2)] text-[var(--w)]"
                placeholder="90210"
                maxLength={5}
              />
            </div>
          </div>

          {/* Results Block & CTA */}
          <div className="p-4 sm:p-5 bg-[var(--s2)] rounded-xl border border-[var(--lime)]/30 shadow-[0_0_20px_rgba(204,255,0,0.05)] order-1 sm:order-2">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--w)]">
                  <Zap size={16} className="text-[var(--lime)]" />
                  <span className="text-sm font-display uppercase tracking-widest">{t.lockIn}</span>
                </div>
              </div>

              <div className="text-right">
                {quoteStatus === 'NO_PROGRAMS' ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-display text-[var(--mu1)] leading-none">Estimate Unavailable</span>
                    <span className="text-[10px] text-[var(--mu2)] max-w-[150px] text-right">No lender programs found for this configuration.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className={cn(
                        "text-4xl sm:text-5xl font-display text-[var(--lime)] leading-none transition-opacity duration-300",
                        isCalculating ? "opacity-50" : "opacity-100"
                      )}>
                        {fmt(calculatedPayment)}
                      </span>
                      <span className="text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest">/mo</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <div className="text-[10px] text-[var(--mu2)]">
                        (+{fmt(down)} due)
                      </div>
                      <button 
                        onClick={() => setIsTransparencyOpen(true)}
                        className="flex items-center gap-1 text-[9px] font-bold text-[var(--lime)] uppercase tracking-widest hover:underline"
                      >
                        <Eye size={10} />
                        {translations[language].transparency.btnTransparency}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={() => currentCar && onProceed?.({ 
                ...currentCar, 
                payment: calculatedPayment, 
                type: calcType, 
                down, 
                term: `${term} mo`, 
                tier, 
                mileage,
                source: isStandalone ? 'custom_calculator' : 'catalog_deal'
              })}
              className="w-full bg-[var(--lime)] hover:bg-[var(--lime2)] text-black py-3 sm:py-4 rounded-xl text-base font-display tracking-widest uppercase transition-all flex items-center justify-center gap-2 group relative overflow-hidden shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_40px_rgba(204,255,0,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <span className="relative z-10">{isStandalone ? (language === 'ru' ? 'Оформить заявку' : 'Submit Request') : t.lockIn}</span>
              <Zap size={18} fill="currentColor" className="relative z-10" />
            </button>
          </div>
        </div>
      </div>


        
        <TradeInEstimator onEquityCalculated={setTradeInEquity} />

        <div className="p-4 sm:p-6 space-y-4">
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

              {showIncentives && effectiveIncentives.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="text-xs font-bold text-blue-400">
                      {translations[language].calc.incentiveSavings
                        .replace('{amount}', fmt(totalIncentives))
                        .replace('{count}', selectedIncentives.length.toString())}
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsIncentivesModalOpen(true)}
                      className="px-3 py-1.5 bg-[var(--s2)] border border-[var(--b2)] rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-[var(--b1)] transition-all flex items-center gap-2"
                    >
                      <span className="flex items-center gap-2">
                        <Info size={12} />
                        {translations[language].calc.incentiveModal.edit}
                      </span>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--b2)] bg-[var(--s2)]">
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">First Time Buyer</div>
                      <div className="text-[10px] text-[var(--mu2)]">Check if you have never financed or leased a car before.</div>
                    </div>
                    <button
                      onClick={() => {
                        setIsFirstTimeBuyer(!isFirstTimeBuyer);
                        if (isFirstTimeBuyer) setHasCosigner(false);
                      }}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        isFirstTimeBuyer ? "bg-[var(--lime)]" : "bg-[var(--b2)]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                        isFirstTimeBuyer ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {isFirstTimeBuyer && (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--b2)] bg-[var(--s2)] mt-2">
                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">Has Co-Signer</div>
                        <div className="text-[10px] text-[var(--mu2)]">Check if you will have a co-signer on the application.</div>
                      </div>
                      <button
                        onClick={() => setHasCosigner(!hasCosigner)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          hasCosigner ? "bg-[var(--lime)]" : "bg-[var(--b2)]"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                          hasCosigner ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Incentive Modal */}
          <IncentivesModal
            isOpen={isIncentivesModalOpen}
            onClose={() => setIsIncentivesModalOpen(false)}
            deal={{ ...currentCar, availableIncentives: effectiveIncentives }}
            selectedIncentives={selectedIncentives}
            toggleIncentive={toggleIncentive}
            isFirstTimeBuyer={isFirstTimeBuyer}
            quoteResult={quoteData}
            role={role}
          />

        {/* Price Breakdown */}
          {!isStandalone && (
            <div className="space-y-3 pt-4 border-t border-[var(--b2)]">
              <div className="space-y-2">
                {/* Dealer Discount */}
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-blue-400">{t.hunterLeaseDiscount}</span>
                  <span className="font-mono text-blue-400">
                    -{fmt(quoteData?.dealerDiscountCents !== undefined ? Math.abs(quoteData.dealerDiscountCents) / 100 : (currentCar?.savings || 0))}
                  </span>
                </div>

                {/* Rebates & Incentives */}
                {showIncentives && totalIncentives > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-orange-400">{t.selectedIncentives}</span>
                    <span className="font-mono text-orange-400">
                      -{fmt(totalIncentives)}
                    </span>
                  </div>
                )}

                {/* Trade-In Equity */}
                {tradeInEquity > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-[var(--lime)]">{language === 'ru' ? 'Капитал Trade-In' : 'Trade-In Equity'}</span>
                    <span className="font-mono text-[var(--lime)]">
                      -{fmt(tradeInEquity)}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-[var(--b2)]">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">{t.sellingPrice}</span>
                <span className="text-lg font-display text-[var(--lime)]">
                  {fmt(quoteData?.sellingPriceCents !== undefined ? quoteData.sellingPriceCents / 100 : ((Number(currentCar?.msrp) || 0) - (currentCar?.savings || 0) - (showIncentives ? totalIncentives : 0)))}
                </span>
              </div>
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
                      <span className="text-lg font-display text-[var(--w)]">{fmt(opt.monthlyPaymentCents / 100)}</span>
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
        </div>
      </div>

      {/* Transparency Modal */}
      <TransparencyModal 
        isOpen={isTransparencyOpen}
        onClose={() => setIsTransparencyOpen(false)}
        deal={currentCar ? {
          ...currentCar,
          term,
          down,
          tradeInEquity,
          type: calcType,
          rv: currentCar?.rv36 || currentCar?.rv || 0.55,
          mf: currentCar?.mf || 0.002,
          apr: currentCar?.baseAPR || currentCar?.apr || 4.9,
          rebates: totalIncentives
        } : null}
        mileage={mileage}
        quoteResult={quoteData}
      />
    </>
  );
};
