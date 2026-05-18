import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, ChevronDown, ChevronUp, Zap, Clock, ShieldCheck, Info, TrendingDown, Eye, X, CheckCircle2, AlertCircle, Building2, ClipboardList } from 'lucide-react';
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
  mode?: 'standalone' | 'offer' | 'calibrator';
  initialIsFirstTimeBuyer?: boolean;
  initialHasCosigner?: boolean;
  vehiclePrice?: number;
  incentiveCashBack?: number;
  hideCTA?: boolean;
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
  initialHasCosigner = false,
  vehiclePrice,
  incentiveCashBack,
  hideCTA = false
}) => {
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { role } = useAuthStore();
  const t = translations[language].calc;

  const isStandalone = mode === 'standalone';
  const isCalibrator = mode === 'calibrator';
  const isCustomCar = isStandalone || isCalibrator;

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
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
  const [carDb, setCarDb] = useState<any>(null);
  const [carDbLoading, setCarDbLoading] = useState(true);
  const [carDbError, setCarDbError] = useState(false);
  const [lenderOptions, setLenderOptions] = useState<any[]>([]);
  const [isLenderLoading, setIsLenderLoading] = useState(false);
  const [deepLinkProcessed, setDeepLinkProcessed] = useState({ make: false, model: false, trim: false });
  const isCalculating = isLenderLoading;
  
  // Mobile Wizard State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  

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
            isStandalone: isCustomCar,
            adminOverrides: (vehiclePrice || incentiveCashBack) ? {
              dealerDiscountCents: vehiclePrice ? (currentCar.msrp * 100 - vehiclePrice * 100) : undefined,
              // We'll handle incentiveCashBack separately in the backend or just add it to selectedIncentives
            } : undefined,
            marketcheckData: (vehiclePrice || incentiveCashBack || currentCar.msrp) ? {
              priceCents: vehiclePrice ? vehiclePrice * 100 : undefined,
              msrpCents: currentCar.msrp ? currentCar.msrp * 100 : undefined,
              cashBackCents: incentiveCashBack ? incentiveCashBack * 100 : undefined
            } : undefined
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
      
      const searchParams = new URLSearchParams(window.location.search);
      const dlMake = searchParams.get('make');

      if (!deal && makesData.length > 0 && !selectedMake) {
        if (dlMake && !deepLinkProcessed.make) {
          const foundMake = makesData.find(m => m.name.toLowerCase() === dlMake.toLowerCase());
          if (foundMake) {
            setSelectedMake(foundMake);
          } else {
            setSelectedMake(makesData[0]);
          }
          setDeepLinkProcessed(prev => ({ ...prev, make: true }));
        } else {
          setSelectedMake(makesData[0]);
        }
      } else if (!deal && makesData.length === 0) {
        setCarDbError(true);
      }
    }
  }, [makesData, makesLoading, makesError, deal, selectedMake, deepLinkProcessed.make]);

  useEffect(() => {
    if (modelsData) {
      setModels(modelsData);
      
      const searchParams = new URLSearchParams(window.location.search);
      const dlModel = searchParams.get('model');

      if (!deal && modelsData.length > 0) {
        if (dlModel && !deepLinkProcessed.model) {
          const foundModel = modelsData.find(m => m.name.toLowerCase() === dlModel.toLowerCase());
          if (foundModel) {
            setSelectedModel(foundModel);
          } else {
            setSelectedModel(modelsData[0]);
          }
          setDeepLinkProcessed(prev => ({ ...prev, model: true }));
        } else if (!selectedModel || selectedModel.makeId !== selectedMake?.id) {
          setSelectedModel(modelsData[0]);
        }
      }
    } else if (!selectedMake?.id) {
      setModels([]);
    }
  }, [modelsData, deal, selectedMake?.id, selectedModel, deepLinkProcessed.model]);

  useEffect(() => {
    if (trimsData) {
      setTrims(trimsData);
      
      const searchParams = new URLSearchParams(window.location.search);
      const dlTrim = searchParams.get('trim');

      if (!deal && trimsData.length > 0) {
        if (dlTrim && !deepLinkProcessed.trim) {
          const foundTrim = trimsData.find(t => t.name.toLowerCase() === dlTrim.toLowerCase());
          if (foundTrim) {
            setSelectedTrim(foundTrim);
          } else {
            setSelectedTrim(trimsData[0]);
          }
          setDeepLinkProcessed(prev => ({ ...prev, trim: true }));
        } else if (!selectedTrim || selectedTrim.modelId !== selectedModel?.id) {
          setSelectedTrim(trimsData[0]);
        }
      }
    } else if (!selectedModel?.id) {
      setTrims([]);
    }
  }, [trimsData, deal, selectedModel?.id, selectedTrim, deepLinkProcessed.trim]);

  const effectiveIncentives = useMemo(() => {
    return deal?.availableIncentives || quoteData?.availableIncentives || currentCar?.availableIncentives || [];
  }, [deal?.availableIncentives, quoteData?.availableIncentives, currentCar?.availableIncentives]);

  useEffect(() => {
    // Only set default incentives on initial load if none are selected
    // Note: To avoid overriding the user's manual unchecks, we ONLY do this
    // right after the car/deal data becomes available for the first time
    if (effectiveIncentives.length > 0 && selectedIncentives.length === 0) {
      const defaultIds = effectiveIncentives
        .filter((inc: any) => {
          if (isCustomCar && inc.type === 'dealer') return false;
          return inc.isDefault || inc.type === 'dealer';
        })
        .map((inc: any) => inc.id);
      
      setSelectedIncentives(defaultIds);
    }
  }, [currentCar?.id, currentCar?.trim, isCustomCar, effectiveIncentives]);

  const toggleIncentive = (id: string) => {
    const incentive = effectiveIncentives.find((inc: any) => inc.id === id);
    // Only block deselection for dealer discounts, allow toggling manufacturer rebates
    if (incentive?.isDefault && (incentive?.type === 'dealer' || incentive?.type === 'DEALER_DISCOUNT') && role !== 'admin') return;
    
    setSelectedIncentives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculatedPayment = useMemo(() => {
    if (quoteStatus === 'NO_PROGRAMS' && currentCar?.displayPayment) return currentCar.displayPayment;
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
        source: isCustomCar ? 'custom_calculator' : 'catalog_deal'
      });
    }
  }, [currentCar, calculatedPayment, calcType, down, term, tier, mileage, zipCode, isCustomCar, onChange]);

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
      {!isCustomCar && (
        <div className="p-4 border-b border-[var(--b2)] bg-[var(--w)]/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                <Eye size={12} className="text-[var(--lime)]" />
                <span>{viewCount} {translations[language].dealPage.viewingNow}</span>
              </div>
              {viewCount > 100 && deal?.createdAt && (viewCount / Math.max(1, (new Date().getTime() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24))) > 33 && (
                <>
                  <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                    <Zap size={12} className="text-orange-500" />
                    <span>{translations[language].dealPage.highDemand}</span>
                  </div>
                </>
              )}
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
              <div className="relative p-4 group hover:bg-white/5 transition-colors border-b md:border-b-0 border-[var(--b2)] relative">
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

              <div className="relative p-4 group hover:bg-white/5 transition-colors border-b md:border-b-0 border-[var(--b2)] relative">
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

              <div className="relative p-4 group hover:bg-white/5 transition-colors border-b md:border-b-0 border-[var(--b2)] relative">
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

        {/* Lease/Finance Toggle & Grid Matrix - Pixel Perfect to Reference */}
        <div className="p-4 sm:p-6 flex flex-col gap-6 w-full max-w-[800px] mx-auto">
          
          {/* Top Pill - Glued to the Grid visually */}
          <div className="flex bg-[var(--s2)] p-1 rounded-xl w-full border border-[var(--b2)] shadow-sm">
            {(['lease', 'finance'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setCalcType(m);
                  setTerm(m === 'finance' ? 60 : 36);
                }}
                className={cn(
                  "flex-1 py-3 text-xs font-bold tracking-widest transition-all uppercase rounded-lg",
                  calcType === m 
                    ? "bg-[var(--w)] text-[var(--s1)] shadow-md" 
                    : "text-[var(--mu2)] hover:text-[var(--w)] bg-transparent"
                )}
              >
                {m === 'lease' ? t.lease : t.finance}
              </button>
            ))}
          </div>

          {/* Grid Constraints matching reference but responsive */}
          <div className="rounded-xl overflow-hidden shadow-xl drop-shadow-2xl border border-[var(--b2)] bg-[var(--b2)]">
            <div className="grid grid-cols-2 2xl:grid-cols-4 gap-[1px] w-full">

              {/* Term */}
              <div className="flex flex-col bg-[var(--s2)] hover:bg-[var(--w)]/5 transition-colors group">
                <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[var(--b2)] min-h-[56px] flex items-center">
                  <span className="text-[9px] font-bold text-[var(--mu2)] uppercase">Term<br/>Length</span>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-4 relative min-h-[56px] flex items-center">
                  <select 
                    value={term}
                    onChange={(e) => setTerm(parseInt(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate"
                  >
                    {(calcType === 'lease' ? [24, 36, 48] : [48, 60, 72, 84, 96]).map(v => (
                      <option key={v} value={v} className="bg-[var(--s1)] text-[var(--w)]">Best - {v} {t.moShort}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--w)] group-hover:scale-110 transition-transform pointer-events-none" />
                </div>
              </div>

              {/* Mileage */}
              <div className={cn("flex flex-col bg-[var(--s2)] hover:bg-[var(--w)]/5 transition-colors group", calcType !== 'lease' && "opacity-50 pointer-events-none")}>
                <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[var(--b2)] min-h-[56px] flex items-center">
                  <span className="text-[9px] font-bold text-[var(--mu2)] uppercase">Annual<br/>Mileage</span>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-4 relative min-h-[56px] flex items-center">
                  <select 
                    value={mileage}
                    onChange={(e) => {
                      setMileage(e.target.value);
                      onMileageChange?.(e.target.value);
                    }}
                    disabled={calcType !== 'lease'}
                    className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate"
                  >
                    {[ '7.5k', '10k', '12k', '15k', '20k' ].map(v => {
                      const val = t.mileageOptions[v as keyof typeof t.mileageOptions] || (v === '20k' ? '20,000' : v);
                      return (
                        <option key={v} value={v} className="bg-[var(--s1)] text-[var(--w)]">{val} mi</option>
                      )
                    })}
                  </select>
                  <ChevronDown className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--w)] group-hover:scale-110 transition-transform pointer-events-none" />
                </div>
              </div>

              {/* Tier */}
              <div className="flex flex-col bg-[var(--s2)] hover:bg-[var(--w)]/5 transition-colors group relative">
                <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[var(--b2)] min-h-[56px] flex items-center">
                  <span className="text-[9px] font-bold text-[var(--mu2)] uppercase">Credit<br/>Tier</span>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-4 relative min-h-[56px] flex items-center">
                  <select 
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-transparent text-sm leading-tight font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate"
                  >
                    <option value="t1" className="bg-[var(--s1)] text-[var(--w)]">Super Elite 740+</option>
                    <option value="t2" className="bg-[var(--s1)] text-[var(--w)]">Elite 720-739</option>
                    <option value="t3" className="bg-[var(--s1)] text-[var(--w)]">Prime 680-719</option>
                    <option value="t4" className="bg-[var(--s1)] text-[var(--w)]">Near Prime 660-679</option>
                    <option value="t5" className="bg-[var(--s1)] text-[var(--w)]">Sub Prime 620-659</option>
                    <option value="t6" className="bg-[var(--s1)] text-[var(--w)]">Poor &lt;620</option>
                  </select>
                  <ChevronDown className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--w)] group-hover:scale-110 transition-transform pointer-events-none" />
                </div>
              </div>

              {/* Down Payment */}
              <div className="flex flex-col bg-[var(--s2)] hover:bg-[var(--w)]/5 transition-colors group">
                <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-[var(--b2)] min-h-[56px] flex items-center">
                  <span className="text-[9px] font-bold text-[var(--mu2)] uppercase">Due At<br/>Signing</span>
                </div>
                <div className="px-3 sm:px-4 py-3 sm:py-4 relative min-h-[56px] flex items-center">
                  <select 
                    value={down}
                    onChange={(e) => setDown(parseInt(e.target.value))}
                    className="w-full bg-transparent text-sm font-bold outline-none appearance-none cursor-pointer pr-6 text-[var(--w)] truncate"
                  >
                    {[0, 1000, 2000, 3000, 4000, 5000].map(v => (
                      <option key={v} value={v} className="bg-[var(--s1)] text-[var(--w)]">{fmt(v)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--w)] group-hover:scale-110 transition-transform pointer-events-none" />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Incentives Box - Like Reference */}
        {!isStandalone && (
          <div className="px-4 sm:px-6 py-2 w-full max-w-[800px] mx-auto">
            <div className="bg-[var(--s1)] rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-6 shadow-inner border border-[var(--b2)]">
              
              <div className="flex bg-[var(--s2)] p-1 rounded-xl w-full sm:max-w-[400px] shadow-sm border border-[var(--b2)]">
                <button
                  onClick={() => {
                    setShowIncentives(false);
                    // Automatically clear selection if choosing without incentives (optional but makes sense logically)
                    setSelectedIncentives([]);
                  }}
                  className={cn(
                    "flex-1 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                    !showIncentives ? "bg-[var(--mu1)] text-[var(--w)] shadow-sm" : "text-[var(--mu2)] hover:text-[var(--w)]"
                  )}
                >
                  {language === 'ru' ? 'БЕЗ ИНСЕНТИВОВ' : 'WITHOUT INCENTIVES'}
                </button>
                <button
                  onClick={() => {
                    setShowIncentives(true);
                     // If switching back to with incentives and it's empty, auto select defaults again
                     if (selectedIncentives.length === 0) {
                        const defaultIds = effectiveIncentives
                          .filter((inc: any) => inc.isDefault || inc.type === 'dealer')
                          .map((inc: any) => inc.id);
                        setSelectedIncentives(defaultIds);
                     }
                  }}
                  className={cn(
                    "flex-1 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                    showIncentives ? "bg-[var(--mu1)] text-[var(--w)] shadow-sm" : "text-[var(--mu2)] hover:text-[var(--w)]"
                  )}
                >
                  {language === 'ru' ? 'С ИНСЕНТИВАМИ*' : 'WITH INCENTIVES*'}
                </button>
              </div>

              {showIncentives && effectiveIncentives.length > 0 && (
                <div className="mt-2 border border-[var(--lime)]/30 bg-[var(--lime)]/5 rounded-2xl py-4 px-6 w-full flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
                  <button 
                    onClick={() => setIsIncentivesModalOpen(true)}
                    className="text-sm font-bold text-[var(--lime)] border-b border-dashed border-[var(--lime)]/40 hover:border-[var(--lime)] transition-colors cursor-pointer text-center md:text-left"
                  >
                    {translations[language].calc.incentiveSavings
                      .replace('{amount}', fmt(totalIncentives))
                      .replace('{count}', selectedIncentives.length.toString())}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsIncentivesModalOpen(true)}
                    className="px-5 py-3 bg-[var(--w)] text-black hover:bg-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 shadow-md w-full md:w-auto justify-center whitespace-nowrap shrink-0"
                  >
                    <ClipboardList size={14} /> 
                    {language === 'ru' ? 'ОБНОВИТЬ ИНСЕНТИВЫ' : 'UPDATE INCENTIVES'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Wizard Nav Placeholder */}
        {isMobile && wizardStep === 0 && (
          <div className="px-4 mt-4">
            <button 
              onClick={() => setWizardStep(1)}
              className="w-full bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-[var(--lime)] transition-colors"
            >
              Next: Results
            </button>
          </div>
        )}

        {/* Big Price CTA Block Layout responsive and fluid */}
        <div className="px-4 sm:px-6 pt-8 pb-10 mt-4 border-t border-[var(--b2)] w-full max-w-[800px] mx-auto min-w-0">
          
          <div className="flex flex-wrap items-end justify-between w-full relative z-10 gap-x-8 gap-y-8">
             
             {/* Left Text Detail */}
             <div className="flex flex-col items-start text-left gap-3 w-full sm:w-auto flex-1 min-w-[240px]">
                <div className="text-xl sm:text-2xl font-display uppercase tracking-widest text-[var(--w)] flex items-start gap-2 sm:gap-3 leading-tight break-words">
                   <span className="text-[var(--lime)] text-2xl sm:text-3xl font-light shrink-0 mt-[-2px]">$</span> 
                   <span className="break-words leading-tight">{isCustomCar ? (language === 'ru' ? 'РАСЧЕТНЫЙ ПЛАТЕЖ' : 'ESTIMATED PAYMENT') : (language === 'ru' ? 'ЗАФИКСИРОВАТЬ СДЕЛКУ' : 'LEASE IT NOW')}</span>
                </div>
                
                <div className="text-sm font-bold text-[var(--mu2)] flex items-center gap-2 mt-2 sm:mt-4 ml-1 w-full flex-wrap">
                   {language === 'ru' ? 'Ежемесячный платеж' : 'Monthly payment'}
                   <button onClick={() => setIsTransparencyOpen(true)} className="hover:text-[var(--w)] transition-colors cursor-pointer bg-[var(--s2)] rounded-full p-0.5"><Info size={14} /></button>
                </div>
                
                <div className="text-xs font-bold text-[var(--mu2)] flex items-center gap-2 mt-1 sm:mt-2 ml-1 opacity-80 w-full min-w-0">
                   <Building2 size={16} className="shrink-0" /> <span className="truncate">{deal?.lender || 'Volkswagen Financial Services'}</span>
                </div>
             </div>

             {/* Right Price & Button aligned */}
             <div className="flex flex-col items-start sm:items-end w-full sm:w-auto flex-[1.5] min-w-[260px] gap-3">
                
                  <>
                    <div className="flex items-baseline sm:items-end gap-2 sm:gap-3 w-full justify-start sm:justify-end flex-wrap">
                       <span className={cn(
                         "text-6xl sm:text-7xl font-display leading-none tracking-tighter transition-opacity duration-300 break-words -ml-1 sm:ml-0",
                         isCalculating ? "opacity-50" : "opacity-100",
                         quoteStatus === 'NO_PROGRAMS' ? "text-[var(--mu2)]" : "text-[var(--w)]"
                       )}>
                         {quoteStatus === 'NO_PROGRAMS' && !currentCar?.displayPayment ? (language === 'ru' ? 'Н/Д' : 'N/A') : fmt(calculatedPayment)}
                       </span>
                       <span className="text-xs sm:text-sm font-bold text-[var(--mu2)] mb-1 sm:mb-2 shrink-0">per month</span>
                    </div>
                    
                    <div className="text-xs sm:text-sm font-bold flex items-center gap-2 text-[var(--mu2)] flex-wrap sm:mr-1">
                       (+{fmt(down)} {language === 'ru' ? 'при подписании' : 'due at signing'})
                       <button onClick={() => setIsTransparencyOpen(true)} className="hover:text-[var(--w)] bg-[var(--s2)] rounded-full p-0.5 transition-colors cursor-pointer shrink-0"><Info size={12} /></button>
                    </div>

                    {!isCalibrator && !hideCTA && (
                       <div className="flex flex-col items-start sm:items-end w-full max-w-[360px] shrink-0 gap-4 mt-2 sm:mt-4">
                          <button 
                            onClick={() => currentCar && onProceed?.({ 
                              ...currentCar, payment: calculatedPayment, type: calcType, down, term: `${term} mo`, tier, mileage, source: isCustomCar ? 'custom_calculator' : 'catalog_deal'
                            })}
                            disabled={isCalculating}
                            className={cn("w-full h-[56px] sm:h-[64px] font-display text-base sm:text-lg tracking-widest uppercase rounded-full shadow-2xl transition-all flex items-center justify-center relative overflow-hidden group",
                              isCalculating 
                              ? "bg-[var(--b2)] text-[var(--mu2)] cursor-not-allowed border border-[var(--b3)]" 
                              : "bg-[var(--lime)] hover:bg-[var(--lime2)] text-black shadow-[0_0_30px_rgba(204,255,0,0.2)] hover:shadow-[0_0_50px_rgba(204,255,0,0.4)]"
                            )}
                          >
                            <span className="relative z-10 flex items-center gap-2 text-center w-full justify-center px-4">
                               {isCustomCar ? (language === 'ru' ? 'ОТПРАВИТЬ ЗАЯВКУ' : 'SUBMIT REQUEST') : (language === 'ru' ? 'ОФОРМИТЬ СДЕЛКУ' : 'LEASE IT NOW')}
                            </span>
                            {!isCalculating && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />}
                          </button>
                          
                          <div className="flex items-center justify-start sm:justify-end gap-2 sm:gap-3 text-xs text-[var(--mu2)] w-full font-bold ml-1 sm:ml-0 flex-wrap">
                              Whats next <button className="bg-[var(--s2)] rounded-full p-0.5 hover:text-white transition-colors cursor-help shrink-0"><Info size={12} /></button>
                              
                              <div className="px-2 sm:px-3 py-1.5 sm:ml-2 bg-[var(--s2)] border border-[var(--b2)] rounded-md uppercase tracking-widest text-[8px] sm:text-[9px] text-[var(--mu2)] flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-pointer whitespace-nowrap">
                                 <span className="text-[var(--w)]">Price</span>
                                 <span className="text-white">Transparency</span>
                                 <CheckCircle2 size={12} className="text-[var(--lime)] ml-0.5" />
                              </div>
                          </div>
                       </div>
                    )}
                  </>
             </div>
          </div>
        </div>
      </div>

        <div className={cn("space-y-4","")}>
          <TradeInEstimator onEquityCalculated={setTradeInEquity} />

          <div className="p-4 sm:p-6 space-y-4">
            {/* Incentives Extra Details - Competitor Style */}
            {!isStandalone && (
              <div className="space-y-4">
              
              {showIncentives && effectiveIncentives.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="text-xs font-bold text-[var(--lime)]">
                      {translations[language].calc.incentiveSavings
                        .replace('{amount}', fmt(totalIncentives))
                        .replace('{count}', selectedIncentives.length.toString())}
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsIncentivesModalOpen(true)}
                      className="px-3 py-1.5 bg-[var(--s2)] border border-[var(--b2)] rounded-lg text-[9px] font-bold uppercase tracking-widest hover:border-[var(--lime)] transition-all flex items-center gap-2"
                    >
                      <span className="flex items-center gap-2 text-[var(--w)]">
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

            {isMobile && wizardStep === 1 && (
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => setWizardStep(0)}
                  className="flex-1 bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[var(--lime)] transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={() => setWizardStep(2)}
                  className="flex-1 bg-[var(--lime)] text-black py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors"
                >
                  See Results
                </button>
              </div>
            )}

          {/* Deal Insights */}
          {!isStandalone && (
            <div className="mt-8 px-4 sm:px-6"> 
              <button 
                onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                className="flex items-center justify-between w-full border-b border-[var(--b2)] pb-4 group"
              >
                <span className="text-lg font-display uppercase tracking-widest text-[var(--w)] group-hover:text-white transition-colors">Deal Insights</span>
                <div className="text-[var(--w)] group-hover:text-white transition-colors">
                  {isInsightsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              {isInsightsOpen && (
                <div className="pt-4 space-y-3 pb-8">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest font-mono">
                    <span className="text-[var(--w)]">MSRP</span>
                    <span className="text-[var(--w)]">{fmt(currentCar?.msrp)}</span>
                  </div>
              <div className="space-y-2">
                {/* Dealer Discount / Markup */}
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className={(quoteData?.dealerDiscountCents < 0 || (!quoteData && currentCar?.savings < 0)) ? "text-red-400" : "text-blue-400"}>
                    {(quoteData?.dealerDiscountCents < 0 || (!quoteData && currentCar?.savings < 0)) ? "Dealer Markup" : t.hunterLeaseDiscount}
                  </span>
                  <span className={`font-mono ${(quoteData?.dealerDiscountCents < 0 || (!quoteData && currentCar?.savings < 0)) ? "text-red-400" : "text-blue-400"}`}>
                    {(quoteData?.dealerDiscountCents < 0 || (!quoteData && currentCar?.savings < 0)) ? "+" : "-"}
                    {fmt(quoteData?.dealerDiscountCents !== undefined ? Math.abs(quoteData.dealerDiscountCents) / 100 : Math.abs(currentCar?.savings || 0))}
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

              <div className="pt-2 flex justify-between items-center border-t border-[var(--w)]/20 mt-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)] font-sans">{t.sellingPrice}</span>
                <span className="text-base font-bold text-[var(--w)] font-mono">
                  {fmt(quoteData?.sellingPriceCents !== undefined ? quoteData.sellingPriceCents / 100 : ((Number(currentCar?.msrp) || 0) - (currentCar?.savings || 0) - (showIncentives ? totalIncentives : 0)))}
                </span>
              </div>
            </div>
           )}
          </div>
          )}

          {isMobile && wizardStep === 2 && (
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => setWizardStep(1)}
                className="w-full bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[var(--lime)] transition-colors"
              >
                Back to Details
              </button>
            </div>
          )}

          {/* Lender Comparison */}
          {lenderOptions.length > 0 && (
            <div className={cn("pt-6 border-t border-[var(--b2)] space-y-4","")}>
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
    </div>
    </>
  );
};
