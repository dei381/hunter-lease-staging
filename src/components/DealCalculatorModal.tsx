import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, ShieldCheck, TrendingDown, Eye } from 'lucide-react';
import { ProgressScreen } from './ProgressScreen';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { TransparencyModal } from './TransparencyModal';
import { getCarImage, CarPhoto } from '../utils/carImage';

import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

import { calculateFinancePayment } from '../utils/financeCalc';
import { CalculationEngine } from '../services/CalculationEngine';

const getTermMultiplier = (term: number) => {
  if (term <= 24) return 1.15;
  if (term <= 36) return 1.0;
  if (term <= 48) return 0.92;
  if (term <= 60) return 0.85;
  return 0.80;
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
  const [mileage, setMileage] = useState(initialMileage || '7.5k');
  const [msdCount, setMsdCount] = useState(0);
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([]);
  const [carDb, setCarDb] = useState<any>(null);
  const [photos, setPhotos] = useState<CarPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTransparencyOpen, setIsTransparencyOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    Promise.all([
      fetch('/api/cars').then(res => res.json()),
      fetch('/api/car-photos').then(res => res.json())
    ])
      .then(([carsData, photosData]) => {
        setCarDb(carsData);
        setPhotos(photosData);
      })
      .catch(err => console.error('Failed to fetch data', err));
  }, []);

  useEffect(() => {
    if (isOpen && deal) {
      const initialType = deal.displayType || deal.type || 'lease';
      setCalcType(initialType);
      setTier('t1');
      setDown(Number(deal.down) || 3000);
      setTerm(parseInt(deal.displayTerm) || (initialType === 'finance' ? 72 : (parseInt(deal.term) || 36)));
      setSelectedIncentives(deal.availableIncentives?.filter((inc: any) => inc.isDefault).map((inc: any) => inc.id) || []);
      
      const isKiaHyundai = ['Kia', 'Hyundai'].includes(deal.make);
      setMileage(isKiaHyundai ? '10k' : '7.5k');
    }
  }, [isOpen, deal]);

  const toggleIncentive = (id: string) => {
    const incentive = deal?.availableIncentives?.find((inc: any) => inc.id === id);
    if (incentive?.isDefault && role !== 'admin') return;
    
    setSelectedIncentives(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const makeObj = carDb?.makes?.find((m: any) => m.name.toLowerCase() === deal?.make?.toLowerCase());
  const tiers = makeObj?.tiers || [];

  const calculatedPayment = useMemo(() => {
    if (!deal || !carDb) return 0;
    
    // Use displayPayment if available (pre-calculated by DealsPage for the current calcType)
    // Otherwise fallback to deal.payment
    let basePayment = Number(deal.displayPayment) || Number(deal.payment) || 0;
    let baseDown = 3000;
    let baseTerm = calcType === 'finance' ? 72 : 36;
    const baseMileage = deal.mileage || '10k';
    const brokerFee = Number(settings.brokerFee) || 595;

    // If the modal's calcType doesn't match the deal's displayType, we need to calculate the base from scratch
    if (deal.displayType && deal.displayType !== calcType) {
      if (calcType === 'finance') {
        basePayment = calculateFinancePayment(Number(deal.msrp) || 0, Number(deal.savings) || 0, 3000, 72);
      } else {
        // Fallback for lease if original was finance
        basePayment = Math.round((Number(deal.msrp) || 0) * 0.012);
      }
    }

    // Adjust for tier
    const defaultTiers = [
      { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
      { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
      { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
      { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
    ];
    const safeTiers = (tiers && tiers.length > 0) ? tiers : defaultTiers;
    
    const modelObj = makeObj?.models?.find((m: any) => m?.name?.toLowerCase() === deal?.model?.toLowerCase());
    const trimObj = modelObj?.trims?.find((t: any) => t?.name?.toLowerCase() === deal?.trim?.toLowerCase());
    const makeTier = safeTiers.find((t: any) => t.id === tier) || { mfAdd: 0, aprAdd: 0 };
    const modelTier = modelObj?.tiersData?.[tier] || makeTier;
    
    let trimTier = null;
    if (trimObj?.tiersData?.[tier]) {
      trimTier = {
        mfAdd: (trimObj.tiersData[tier].mf || 0) - (trimObj.mf || 0),
        aprAdd: (trimObj.tiersData[tier].baseAPR || 0) - (trimObj.baseAPR || 0)
      };
    }
    
    const activeTier = trimTier || modelTier;
    
    let tierAdjustment = 0;
    if (activeTier) {
      if (calcType === 'lease') {
        tierAdjustment = ((activeTier.mfAdd || 0) * 2400) * 20;
      } else {
        tierAdjustment = (activeTier.aprAdd || 0) * 20;
      }
    }

    // Adjust for selected incentives
    const totalSelectedAmount = deal.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0;
    const defaultIncentivesAmount = deal.availableIncentives?.filter((inc: any) => inc.isDefault).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0;
    
    // The original deal price used to calculate the base payment
    const msrp = Number(deal.msrp) || 0;
    const originalSavings = Number(deal.savings) || 0;
    const originalLeaseCash = Number(deal.leaseCash) || 0;
    const originalSellingPrice = msrp - originalSavings - originalLeaseCash;
    
    // The current selling price based on selected incentives
    const currentSellingPrice = msrp - totalSelectedAmount;
    
    // Calculate the delta and apply it to the payment
    const priceDelta = currentSellingPrice - originalSellingPrice;
    const priceAdjustment = (priceDelta / term) * 1.1; // 1.1 factor for interest/tax on the delta

    if (calcType === 'finance') {
      // For finance, recalculate entirely based on new term and down payment
      const baseAPR = parseFloat(deal.apr || '5.9') + (activeTier?.aprAdd || 0);
      const financePayment = calculateFinancePayment(msrp, msrp - currentSellingPrice, down, term, baseAPR);
      const finalPayment = financePayment + Math.round(brokerFee / term);
      return (isNaN(finalPayment) ? 0 : finalPayment);
    } else {
      // For lease, use the adjustment logic
      const normalizedBasePayment = basePayment / getTermMultiplier(baseTerm);
      const termAdjustedPayment = normalizedBasePayment * getTermMultiplier(term);
      
      const downDiff = baseDown - down;
      const downAdjustment = downDiff / term;

      let mileageAdjustment = 0;
      const mileageMap: Record<string, number> = { '7.5k': 1, '10k': 0, '12k': -1, '15k': -3 };
      const baseVal = mileageMap[baseMileage] || 0;
      const targetVal = mileageMap[mileage] || 0;
      const rvDiffPercent = (targetVal - baseVal) / 100;
      mileageAdjustment = -((Number(deal.msrp) || 0) * rvDiffPercent) / term;

      let finalPayment = Math.max(0, Math.round(termAdjustedPayment + downAdjustment + tierAdjustment + mileageAdjustment + priceAdjustment + (brokerFee / term)));
      
      // Apply MSD reduction if any
      if (msdCount > 0) {
        const msdReduction = ((Number(deal.msrp) || 0) * 0.00007 * 2) * msdCount;
        finalPayment = Math.max(0, Math.round(finalPayment - msdReduction));
      }
      
      return (isNaN(finalPayment) ? 0 : finalPayment);
    }
  }, [deal, tier, down, term, mileage, carDb, selectedIncentives, settings, calcType, msdCount]);

  const marketAvgRatio = useMemo(() => {
    if (!deal || !deal.displayPayment) return 1.267;
    return (deal.displayMarketAvg || (deal.displayPayment * 1.267)) / deal.displayPayment;
  }, [deal]);

  const tcoData = useMemo(() => {
    if (!calculatedPayment || isNaN(calculatedPayment)) return null;
    return CalculationEngine.calculateTCO({
      monthlyPayment: calculatedPayment,
      term: term,
      dueAtSigning: down + (msdCount * Math.ceil(calculatedPayment / 50) * 50),
    });
  }, [calculatedPayment, term, down, msdCount]);

  return (
    <AnimatePresence>
      {isOpen && deal && carDb && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 overflow-y-auto font-sans">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[var(--bg)] border border-[var(--b2)] rounded-3xl w-full max-w-4xl relative z-10 overflow-hidden shadow-2xl flex flex-col my-auto"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-[var(--mu)] hover:text-[var(--w)] z-50 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-full p-2 transition-colors"><X size={20} /></button>
            
            <div className="p-4 md:p-12 border-b border-[var(--b1)] bg-[var(--s1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
                <img 
                  src={deal.image || getCarImage(photos, deal.make, deal.model, deal.year)} 
                  alt={deal.model}
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
              <h2 className="font-display text-4xl md:text-5xl mb-2 relative z-10">{deal.make} {deal.model}</h2>
              <p className="text-[var(--mu)] text-sm uppercase tracking-widest font-medium relative z-10">{deal.trim}</p>
            </div>

            <div className="p-4 md:p-12 grid md:grid-cols-5 gap-8 md:gap-12">
              <div className="md:col-span-3 space-y-8">
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
                          {((tiers && tiers.length > 0) ? tiers : [
                            { id: "t1", label: "Tier 1", score: "740+" },
                            { id: "t2", label: "Tier 2", score: "700–739" },
                            { id: "t3", label: "Tier 3", score: "660–699" },
                            { id: "t4", label: "Tier 4", score: "620–659" }
                          ]).map((tierObj: any) => (
                            <option key={tierObj.id} value={tierObj.id}>{tierObj.label} ({tierObj.score})</option>
                          ))}
                        </select>
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
                        <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.downPayment}</label>
                        <span className="text-[var(--lime)] font-mono text-base bg-[var(--lime)]/10 px-2 py-1 rounded-md">{fmt(down)}</span>
                      </div>
                      <div className="flex gap-2 mb-4">
                        {[0, 2000, 3000].map(amount => (
                          <button
                            key={amount}
                            onClick={() => setDown(amount)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              down === amount 
                                ? 'bg-[var(--lime)] text-black border-[var(--lime)]' 
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
                        <div className="pt-4">
                          <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider block mb-3">{t.incentivesTitle}</label>
                          <p className="text-[10px] text-[var(--mu2)] mb-4">{t.incentivesDesc}</p>
                          <div className="grid grid-cols-1 gap-2">
                            {deal.availableIncentives.map((inc: any) => (
                              <button
                                key={inc.id}
                                onClick={() => {
                                  if (inc.isDefault && role !== 'admin') return;
                                  toggleIncentive(inc.id);
                                }}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                  selectedIncentives.includes(inc.id)
                                    ? 'bg-[var(--lime)]/10 border-[var(--lime)] text-[var(--lime)]'
                                    : 'bg-[var(--s2)] border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)]'
                                } ${inc.isDefault && role !== 'admin' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                              >
                                <span className="text-xs font-bold uppercase tracking-wide">
                                  {language === 'ru' && inc.nameRu ? inc.nameRu : inc.name}
                                </span>
                                <span className="font-mono text-xs">-{fmt(inc.amount)}</span>
                              </button>
                            ))}
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

              <div className="md:col-span-2">
                <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 flex flex-col h-full shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--lime)]/5 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="relative z-10 flex-1">
                    <div className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider mb-2">{t.estimatedPayment}</div>
                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="font-display text-6xl text-[var(--lime)] leading-none">{fmt(calculatedPayment)}</span>
                      <span className="text-sm text-[var(--mu2)] font-medium">/mo</span>
                    </div>

                    {/* Market Comparison Block */}
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

                    {/* TCO Breakdown Block */}
                    {tcoData && (
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
                          {fmt((Number(deal.msrp) || 0) - (deal.availableIncentives?.filter((inc: any) => selectedIncentives.includes(inc.id)).reduce((sum: number, inc: any) => sum + inc.amount, 0) || 0))}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-2">
                        <span className="text-[var(--mu2)] uppercase tracking-widest text-[10px] font-bold">{t.dueAtSigning}</span>
                        <span className="text-[var(--w)] font-mono">{fmt(down + (msdCount * Math.ceil((Number(calculatedPayment) || 0) / 50) * 50))}</span>
                      </div>
                      {msdCount > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--mu2)] uppercase tracking-widest text-[10px] font-bold">{translations[language].calc.msdTitle} (Refundable)</span>
                          <span className="text-[var(--lime)] font-mono">{fmt(msdCount * Math.ceil((Number(calculatedPayment) || 0) / 50) * 50)}</span>
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

                  <button 
                    onClick={() => setIsProcessing(true)}
                    className="w-full mt-8 bg-[var(--lime)] text-black font-bold text-sm uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 relative z-10"
                  >
                    {t.lockIn}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {isProcessing && (
            <ProgressScreen 
              makeName={deal.make}
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
          />
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
};
