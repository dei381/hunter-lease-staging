import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, ShieldCheck, TrendingDown, Eye } from 'lucide-react';
import { ProgressScreen } from './ProgressScreen';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { TransparencyModal } from './TransparencyModal';
import { getCarImage, CarPhoto } from '../utils/carImage';
import { useDebounce } from '../hooks/useDebounce';

import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { IncentivesModal } from './IncentivesModal';

import { fetchWithCache } from '../utils/fetchWithCache';
import { getDefaultLeaseMileage } from '../utils/defaultLeaseMileage';

const fmt = (n: any) => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

export const DealCalculatorModal = ({
  isOpen,
  onClose,
  onProceed,
  deal,
  initialCalcType,
  initialTier,
  initialDown,
  initialTerm,
  initialMileage
}: any) => {
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { role } = useAuthStore();
  const t = translations[language].calc;

  const [calcType, setCalcType] = useState<'lease' | 'finance'>(initialCalcType || 'lease');
  const [tier, setTier] = useState(initialTier || 't1');
  const [down, setDown] = useState(initialDown !== undefined ? initialDown : 3000);
  const [term, setTerm] = useState(initialTerm || 36);
  const [mileage, setMileage] = useState(initialMileage || getDefaultLeaseMileage(deal?.make));
  const [msdCount, setMsdCount] = useState(0);
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([]);
  const [photos, setPhotos] = useState<CarPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);
  const [isIncentivesModalOpen, setIsIncentivesModalOpen] = useState(false);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchWithCache('/api/car-photos')
      .then((photosData: any) => {
        setPhotos(photosData);
      })
      .catch(err => console.error('Failed to fetch photos', err));
  }, []);

  useEffect(() => {
    if (isOpen && deal) {
      const initialType = deal.displayType || deal.type || 'lease';
      setCalcType(initialType);
      setTier('t1');
      setDown(Number(deal.down) || 3000);
      setTerm(parseInt(deal.displayTerm) || (initialType === 'finance' ? 72 : (parseInt(deal.term) || 36)));
      setSelectedIncentives(deal.availableIncentives?.filter((inc: any) => inc.isDefault).map((inc: any) => inc.id) || []);
      
      setMileage(getDefaultLeaseMileage(deal.make));
    }
  }, [isOpen, deal]);

  const toggleIncentive = (id: string) => {
    const incentive = deal?.availableIncentives?.find((inc: any) => inc.id === id);
    if (incentive?.isDefault && role !== 'admin') return;
    
    setSelectedIncentives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const debouncedDown = useDebounce(down, 500);
  const debouncedTerm = useDebounce(term, 500);
  const debouncedMileage = useDebounce(mileage, 500);
  const debouncedTier = useDebounce(tier, 500);
  const debouncedMsdCount = useDebounce(msdCount, 500);
  const debouncedSelectedIncentives = useDebounce(selectedIncentives, 500);
  const debouncedIsFirstTimeBuyer = useDebounce(isFirstTimeBuyer, 500);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!deal) return;
      
      const vehicleId = deal.vehicleId; 
      const lenderId = deal.lenderId || "tfs";

      setIsCalculating(true);
      try {
        const payload: any = {
          lenderId,
          config: {
            type: calcType,
            term: debouncedTerm,
            downPaymentCents: debouncedDown * 100,
            mileage: parseInt(debouncedMileage) * 1000,
            creditTier: debouncedTier,
            zipCode: '90210',
            msdCount: debouncedMsdCount,
            selectedIncentiveIds: debouncedSelectedIncentives,
            isFirstTimeBuyer: debouncedIsFirstTimeBuyer,
            make: deal?.make,
            model: deal?.model,
            trim: deal?.trim,
            year: deal?.year
          }
        };
        
        if (vehicleId) {
          payload.vehicleId = vehicleId;
        }

        const response = await fetch('/api/v2/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          setQuoteResult(data);
        } else {
          console.error("Quote API failed:", await response.text());
        }
      } catch (err) {
        console.error("Failed to fetch quote:", err);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchQuote();
  }, [deal, calcType, debouncedTerm, debouncedDown, debouncedMileage, debouncedTier, debouncedMsdCount, debouncedSelectedIncentives]);

  const calculatedPayment = useMemo(() => {
    if (quoteResult) {
      if (quoteResult.calcStatus === 'NO_PROGRAMS' || quoteResult.calcStatus === 'MISSING_MSRP') return null;
      return Math.round((quoteResult.monthlyPaymentCents || 0) / 100);
    }
    return Number(deal?.displayPayment) || Number(deal?.payment) || 0;
  }, [quoteResult, deal]);

  const marketAvgRatio = useMemo(() => {
    if (!deal || !deal.displayPayment) return 1.267;
    return (deal.displayMarketAvg || (deal.displayPayment * 1.267)) / deal.displayPayment;
  }, [deal]);

  const tcoData = useMemo(() => {
    if (!quoteResult?.tco) return null;
    return {
      totalCost: quoteResult.tco.totalCostCents / 100,
      monthlyAverage: quoteResult.tco.monthlyAverageCents / 100,
      breakdown: quoteResult.tco.breakdownCents ? {
        lease: quoteResult.tco.breakdownCents.lease / 100,
        insurance: quoteResult.tco.breakdownCents.insurance / 100,
        maintenance: quoteResult.tco.breakdownCents.maintenance / 100,
        registration: quoteResult.tco.breakdownCents.registration / 100
      } : null
    };
  }, [quoteResult]);

  return (
    <AnimatePresence>
      {isOpen && deal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 overflow-y-auto font-sans">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md" 
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[var(--bg)] border border-[var(--b2)] rounded-t-3xl md:rounded-3xl w-full max-w-4xl relative z-10 overflow-hidden shadow-2xl flex flex-col mt-auto md:my-auto max-h-[90vh] md:max-h-[95vh] overflow-y-auto"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-[var(--mu)] hover:text-[var(--w)] z-50 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-full p-2 transition-colors"><X size={20} /></button>
            
            <div className="p-4 md:p-12 border-b border-[var(--b1)] bg-[var(--s1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
                <img 
                  src={deal.image || getCarImage(photos, deal.make?.name || deal.make, deal.model?.name || deal.model, deal.year)} 
                  alt={deal.model?.name || deal.model}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[var(--s1)]" />
              </div>
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[var(--lime)]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex gap-2 mb-6 relative z-10">
                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider shadow-sm ${calcType === 'lease' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-[var(--grn)]/20 text-[var(--grn)] border border-[var(--grn)]/30'}`}>
                  {calcType === 'lease' ? t.lease : t.finance}
                </span>
                {deal.hot && <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider bg-[var(--lime)]/20 text-[var(--lime)] border border-[var(--lime)]/30 shadow-sm">{t.hotDeal}</span>}
              </div>
              <h2 className="font-display text-4xl md:text-5xl mb-2 relative z-10">{deal.make?.name || deal.make} {deal.model?.name || deal.model}</h2>
              <p className="text-[var(--mu)] text-sm uppercase tracking-widest font-medium relative z-10">{deal.trim?.name || deal.trim}</p>
            </div>

            <div className="p-4 md:p-12 flex flex-col md:grid md:grid-cols-5 gap-8 md:gap-12">
              <div className="md:col-span-3 space-y-8 order-2 md:order-1">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-display">{t.customizeDeal}</h3>
                    <div className="flex bg-[var(--s2)] p-1 rounded-xl border border-[var(--b2)]">
                      {['lease', 'finance'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setCalcType(type as 'lease' | 'finance');
                            setTerm(type === 'finance' ? 72 : 36);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${calcType === type ? 'bg-[var(--w)] text-white shadow-sm' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
                        >
                          {type === 'lease' ? t.lease : t.finance}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider block mb-3">{t.creditTier}</label>
                        <select 
                          className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)]/50 transition-all appearance-none cursor-pointer"
                          value={tier}
                          onChange={(e) => setTier(e.target.value)}
                        >
                          {[
                            { id: "t1", label: "Tier 1", score: "740+" },
                            { id: "t2", label: "Tier 2", score: "700–739" },
                            { id: "t3", label: "Tier 3", score: "660–699" },
                            { id: "t4", label: "Tier 4", score: "620–659" }
                          ].map((tierObj: any) => (
                            <option key={tierObj.id} value={tierObj.id}>{tierObj.label} ({tierObj.score})</option>
                          ))}
                        </select>
                        <p className="mt-2 text-[9px] text-[var(--mu2)] leading-relaxed italic">
                          {t.creditDisclaimer}
                        </p>
                      </div>
                      {calcType === 'lease' && (
                        <div>
                          <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider block mb-3">{t.mileage}</label>
                          <select 
                            className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)]/50 transition-all appearance-none cursor-pointer"
                            value={mileage}
                            onChange={(e) => setMileage(e.target.value)}
                          >
                            {Object.entries(t.mileageOptions).map(([key, val]) => (
                              <option key={key} value={key}>{val as string} {t.miles}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.dueAtSigning}</label>
                        <span className="text-[var(--lime)] font-mono text-base bg-[var(--lime)]/10 px-2 py-1 rounded-md">{fmt(down)}</span>
                      </div>
                      <div className="flex gap-2 mb-4">
                        {[0, 2000, 3000].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setDown(amount)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              down === amount 
                                ? 'bg-[var(--lime)] text-white border-[var(--lime)]' 
                                : 'bg-[var(--s2)] text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)]'
                            }`}
                          >
                            {amount === 0 ? '$0 Down' : fmt(amount)}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="range" min="0" max="10000" step="500" 
                        value={down} 
                        onChange={(e) => setDown(parseInt(e.target.value))}
                        className="w-full accent-[var(--lime)] h-2 bg-[var(--s2)] rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <div className="flex justify-between text-xs text-[var(--mu2)] font-mono">
                        <span>$0</span>
                        <span>$10,000</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider block mb-3">{t.term} (Months)</label>
                      <div className={`grid gap-1 sm:gap-2 bg-[var(--s2)] p-1 rounded-xl border border-[var(--b2)] ${calcType === 'lease' ? 'grid-cols-3' : 'grid-cols-5'}`}>
                        {(calcType === 'lease' ? [24, 36, 48] : [48, 60, 72, 84, 96]).map(t => (
                          <button
                            key={t}
                            onClick={() => setTerm(t)}
                            className={`py-2 rounded-lg text-sm font-bold transition-all ${term === t ? 'bg-[var(--w)] text-white shadow-sm' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {calcType === 'lease' && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider block">{translations[language].calc.msdTitle}</label>
                          <span className="text-xs font-mono text-[var(--lime)]">{msdCount} MSDs</span>
                        </div>
                        <input 
                          type="range" min="0" max="10" step="1" 
                          value={msdCount} 
                          onChange={(e) => setMsdCount(parseInt(e.target.value))}
                          className="w-full accent-[var(--lime)] h-2 bg-[var(--s2)] rounded-lg appearance-none cursor-pointer mb-2"
                        />
                        <p className="text-[10px] text-[var(--mu2)] leading-relaxed">
                          {translations[language].calc.msdDesc}
                        </p>
                      </div>
                    )}

                      {deal.availableIncentives && deal.availableIncentives.length > 0 && (
                        <div className="pt-4 space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--b2)] bg-[var(--s2)]">
                            <div className="space-y-1">
                              <div className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">First Time Buyer</div>
                              <div className="text-[10px] text-[var(--mu2)]">Check if you have never financed or leased a car before.</div>
                            </div>
                            <button
                              onClick={() => setIsFirstTimeBuyer(!isFirstTimeBuyer)}
                              className={`w-12 h-6 rounded-full transition-colors relative ${isFirstTimeBuyer ? 'bg-[var(--lime)]' : 'bg-[var(--b2)]'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isFirstTimeBuyer ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider block mb-3">{t.incentivesTitle}</label>
                            <p className="text-[10px] text-[var(--mu2)] mb-4">{t.incentivesDesc}</p>
                            <button
                              onClick={() => setIsIncentivesModalOpen(true)}
                              className="w-full flex items-center justify-between p-4 rounded-xl border border-[var(--b2)] bg-[var(--s2)] hover:border-[var(--mu)] transition-all text-left group"
                            >
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[var(--mu)] group-hover:text-[var(--lime)] transition-colors">
                                View & Select Incentives
                              </span>
                              <span className="text-[10px] text-[var(--mu2)] mt-1">
                                {selectedIncentives.length} incentives applied
                              </span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-[var(--b2)] flex items-center justify-center group-hover:bg-[var(--lime)]/10 group-hover:text-[var(--lime)] transition-colors">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                          </div>
                        </div>
                      )}
                    {/* Standard Options & Specs */}
                    {(deal.features || deal.specs) && (
                      <div className="pt-8 border-t border-[var(--b2)] space-y-8">
                        {deal.features && (
                          <div>
                            <h4 className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider mb-4 flex items-center gap-2">
                              <Info size={14} className="text-[var(--lime)]" />
                              {translations[language].deals.standardOptionsTitle}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                              {deal.features.map((feature: string, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[11px] text-[var(--mu2)]">
                                  <div className="w-1 h-1 rounded-full bg-[var(--lime)]" />
                                  {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {deal.specs && (
                          <div>
                            <h4 className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider mb-4 flex items-center gap-2">
                              <ShieldCheck size={14} className="text-[var(--lime)]" />
                              {translations[language].deals.specsTitle}
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {Object.entries(deal.specs).map(([key, value]) => (
                                <div key={key} className="bg-[var(--s2)]/50 p-3 rounded-xl border border-[var(--b2)]">
                                  <div className="text-[8px] text-[var(--mu2)] uppercase tracking-widest mb-1">{key}</div>
                                  <div className="text-xs font-bold text-[var(--w)]">{value as string}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 order-1 md:order-2">
                <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 flex flex-col h-full shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--lime)]/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10 flex-1">
                    <div className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider mb-2">{t.estimatedPayment}</div>
                    <div className="flex items-baseline gap-1 mb-8">
                      {isCalculating ? (
                        <div className="h-16 w-48 bg-[var(--s2)] rounded-xl animate-pulse" />
                      ) : calculatedPayment === null ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-display text-3xl text-[var(--mu1)] leading-none">Estimate Unavailable</span>
                          <span className="text-xs text-[var(--mu2)]">No lender programs found for this configuration.</span>
                        </div>
                      ) : (
                        <>
                          <span className="font-display text-6xl text-[var(--lime)] leading-none">{fmt(calculatedPayment)}</span>
                          <span className="text-sm text-[var(--mu2)] font-medium">/mo</span>
                        </>
                      )}
                    </div>

                    {/* Market Comparison Block */}
                    {isCalculating ? (
                      <div className="bg-[var(--s2)]/30 border border-[var(--b2)] rounded-2xl p-4 space-y-3 mb-6 animate-pulse">
                        <div className="h-4 bg-[var(--s2)] rounded w-full" />
                        <div className="h-8 bg-[var(--s2)] rounded w-full" />
                        <div className="h-6 bg-[var(--s2)] rounded w-full" />
                      </div>
                    ) : calculatedPayment !== null && (
                      <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/10 rounded-2xl p-4 space-y-3 mb-6">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-[var(--mu2)] uppercase font-bold tracking-widest">{t.opportunityCost}</span>
                          <span className="text-[var(--mu2)] line-through font-mono">{fmt(calculatedPayment * marketAvgRatio)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-[var(--w)] uppercase font-bold tracking-widest">{t.hunterPrice}</span>
                          <span className="text-2xl font-display text-[var(--w)]">{fmt(calculatedPayment)}</span>
                        </div>
                        <div className="pt-2 border-t border-[var(--lime)]/20 flex justify-between items-center">
                          <span className="text-[10px] text-[var(--lime)] uppercase font-bold tracking-widest">{t.avoidableMarkup}</span>
                          <span className="text-lg font-display text-[var(--lime)]">{fmt((calculatedPayment * (marketAvgRatio - 1)) * term)}</span>
                        </div>
                      </div>
                    )}

                    {/* TCO Breakdown Block */}
                    {tcoData && tcoData.breakdown && (
                      <div className="bg-[var(--s2)]/30 border border-[var(--b2)] rounded-2xl p-4 space-y-3 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-[var(--mu)] uppercase font-bold tracking-widest">{translations[language].calc.tcoTitle}</span>
                          <span className="text-xs font-mono text-[var(--w)]">{fmt(tcoData.totalCost)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <div className="text-[8px] text-[var(--mu2)] uppercase tracking-wider">{translations[language].calc.insurance}</div>
                            <div className="text-xs font-mono">{fmt(tcoData.breakdown.insurance)}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] text-[var(--mu2)] uppercase tracking-wider">{translations[language].calc.maintenance}</div>
                            <div className="text-xs font-mono">{fmt(tcoData.breakdown.maintenance)}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] text-[var(--mu2)] uppercase tracking-wider">{translations[language].calc.registration}</div>
                            <div className="text-xs font-mono">{fmt(tcoData.breakdown.registration)}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[8px] text-[var(--mu2)] uppercase tracking-wider">{translations[language].calc.monthlyAvg}</div>
                            <div className="text-xs font-mono text-[var(--lime)]">{fmt(tcoData.monthlyAverage)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-4 pt-6 border-t border-[var(--b2)]">
                      <div className="space-y-2">
                        {/* Hunter Lease Discount */}
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">{t.hunterLeaseDiscount}</span>
                          <span className="text-blue-400 font-bold font-mono">
                            -{fmt(deal.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id) && (inc.type === 'dealer' || inc.isDefault)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)}
                          </span>
                        </div>

                        {/* Other Selected Incentives */}
                        {deal.availableIncentives?.some((inc: any) => selectedIncentives.includes(inc.id) && inc.type !== 'dealer' && !inc.isDefault) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-orange-400 font-bold uppercase tracking-widest text-[10px]">{t.selectedIncentives}</span>
                            <span className="text-orange-400 font-bold font-mono">
                              -{fmt(deal.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id) && inc.type !== 'dealer' && !inc.isDefault).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[var(--b2)] flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">{t.sellingPrice}</span>
                        <span className="text-lg font-display text-[var(--lime)]">
                          {fmt(quoteResult?.sellingPriceCents !== undefined ? quoteResult.sellingPriceCents / 100 : ((Number(deal.msrp) || 0) - (deal.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0)))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-2">
                        <span className="text-[var(--mu2)] uppercase tracking-widest text-[10px] font-bold">{t.dueAtSigning}</span>
                        <span className="text-[var(--w)] font-mono">{fmt(quoteResult?.dueAtSigningCents !== undefined ? quoteResult.dueAtSigningCents / 100 : (down + (msdCount * Math.ceil((Number(calculatedPayment) || 0) / 50) * 50)))}</span>
                      </div>
                      {msdCount > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--mu2)] uppercase tracking-widest text-[10px] font-bold">{translations[language].calc.msdTitle} (Refundable)</span>
                          <span className="text-[var(--lime)] font-mono">{fmt(quoteResult?.dasBreakdown?.msdAmountCents !== undefined ? quoteResult.dasBreakdown.msdAmountCents / 100 : (msdCount * Math.ceil((Number(calculatedPayment) || 0) / 50) * 50))}</span>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setIsTransparencyOpen(true)}
                      className="w-full mt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-[var(--mu2)] hover:text-[var(--lime)] uppercase tracking-widest transition-colors py-2 border border-dashed border-[var(--b2)] rounded-xl"
                    >
                      <Eye className="w-3 h-3" /> {translations[language].transparency.btnTransparency}
                    </button>

                    {/* Market Trend Chart */}
                    <div className="mt-8 pt-6 border-t border-[var(--b2)] space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] flex items-center gap-2">
                            <TrendingDown className="w-3 h-3 text-[var(--lime)]" />
                            {t.marketTrend}
                          </div>
                        </div>
                        <div className="text-[9px] font-bold text-[var(--grn)] uppercase tracking-widest bg-[var(--grn)]/10 px-2 py-1 rounded-md border border-[var(--grn)]/20">
                          {t.bestTimeToBuy}
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-between h-20 gap-1.5 px-2">
                        {[
                          { m: 'Oct', v: calculatedPayment * 1.15, h: 75 },
                          { m: 'Nov', v: calculatedPayment * 1.18, h: 80 },
                          { m: 'Dec', v: calculatedPayment * 0.95, h: 50 },
                          { m: 'Jan', v: calculatedPayment * 1.2, h: 85, high: true },
                          { m: 'Feb', v: calculatedPayment * 1.1, h: 70 },
                          { m: 'Mar', v: calculatedPayment, h: 60, active: true },
                        ].map((bar, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                            <div className="w-full relative h-full flex items-end">
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${bar.h}%` }}
                                className={`w-full rounded-t-sm transition-all ${bar.active ? 'bg-[var(--lime)]' : 'bg-[var(--b2)] group-hover:bg-[var(--b3)]'}`}
                              />
                            </div>
                            <div className="text-[7px] uppercase font-bold text-[var(--mu2)]">{bar.m}</div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[8px] text-[var(--mu2)] italic opacity-60">
                        {t.trendNote}
                      </p>
                    </div>
                    
                    <div className="mt-6 flex items-start gap-2 bg-[var(--s2)]/50 p-3 rounded-xl border border-[var(--b1)]">
                      <ShieldCheck className="w-4 h-4 text-[var(--lime)] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[var(--mu2)] leading-relaxed">
                        This deal is <span className="text-[var(--w)] font-bold">11-Key Lock Verified</span>. No hidden fees, no dealer markups. The price you see is the price you get.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 relative z-10">
                    <button 
                      onClick={() => setIsProcessing(true)}
                      className="w-full bg-[var(--lime)] text-black font-bold text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    >
                      {language === 'ru' ? 'Отправить заявку дилерам' : 'Submit Request to Dealers'}
                    </button>
                    <div className="mt-3 text-center">
                      <span className="text-[9px] text-[var(--mu2)] uppercase tracking-widest font-bold">
                        {language === 'ru' ? 'Возвращаемый депозит $95 на следующем шаге' : 'Fully refundable $95 deposit on the next step'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {isProcessing && (
            <ProgressScreen 
              makeName={deal.make?.name || deal.make}
              onComplete={() => {
                setIsProcessing(false);
                onProceed({ ...deal, type: calcType, payment: calculatedPayment, down, term: `${term} mo`, tier, mileage });
              }} 
            />
          )}

          <TransparencyModal 
            isOpen={isTransparencyOpen}
            onClose={() => setIsTransparencyOpen(false)}
            deal={{ ...deal, type: calcType, payment: calculatedPayment, down, term: `${term} mo` }}
            mileage={mileage}
            quoteResult={quoteResult}
          />

          <IncentivesModal
            isOpen={isIncentivesModalOpen}
            onClose={() => setIsIncentivesModalOpen(false)}
            deal={deal}
            selectedIncentives={selectedIncentives}
            toggleIncentive={toggleIncentive}
            quoteResult={quoteResult}
            role={role}
            isFirstTimeBuyer={isFirstTimeBuyer}
          />
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
};
