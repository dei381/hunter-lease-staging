import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Filter, Search, Info, ShieldCheck, Zap, ChevronRight, SlidersHorizontal, Eye, Heart, X, ChevronDown, Fuel, Gauge, Users, Settings2, Star } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../translations';
import { getCarImage, CarPhoto } from '../utils/carImage';

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

import { calculateFinancePayment } from '../utils/financeCalc';
import { logEvent } from '../components/VisitTracker';

export const DealsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const { toggleDeal, isSaved } = useGarageStore();
  const { settings } = useSettingsStore();
  const t = translations[language].deals;
  const tc = translations[language].calc;

  const initialMake = searchParams.get('make') || 'All';
  const initialModel = searchParams.get('model') || '';

  const [deals, setDeals] = useState<any[]>([]);
  const [photos, setPhotos] = useState<CarPhoto[]>([]);
  const [maxPayment, setMaxPayment] = useState(1500);
  const [selectedMake, setSelectedMake] = useState(initialMake);
  const [selectedModel, setSelectedModel] = useState(initialModel || 'All');
  const [selectedTrim, setSelectedTrim] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');
  const [displayMode, setDisplayMode] = useState<'lease' | 'finance'>('lease');
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [hasCosigner, setHasCosigner] = useState(false);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialModel);
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedTerm, setSelectedTerm] = useState<number>(36);
  const [selectedMileage, setSelectedMileage] = useState<string>('10k');
  const [zipCode, setZipCode] = useState<string>('');
  
  // Advanced Filters
  const [selectedBodyStyle, setSelectedBodyStyle] = useState('All');
  const [selectedFuelType, setSelectedFuelType] = useState('All');
  const [selectedDriveType, setSelectedDriveType] = useState('All');
  const [selectedSeats, setSelectedSeats] = useState('All');
  const [creditScore, setCreditScore] = useState(740);
  const [downPayment, setDownPayment] = useState(3000);
  const [sortBy, setSortBy] = useState<'payment' | 'savings' | 'value'>('payment');

  useEffect(() => {
    Promise.all([
      fetch('/api/deals').then(res => {
        if (!res.ok) throw new Error('Failed to fetch deals');
        return res.json();
      }),
      fetch('/api/car-photos').then(res => {
        if (!res.ok) throw new Error('Failed to fetch car photos');
        return res.json();
      })
    ])
      .then(([data, photosData]) => {
        if (!Array.isArray(data)) {
          console.error('Expected array of deals, got:', data);
          return;
        }
        setPhotos(photosData);
        
        // Deduplicate deals by make + model + trim
        const uniqueDealsMap = new Map();
        data.forEach((deal: any) => {
          const key = `${deal.make}-${deal.model}-${deal.trim}`;
          if (!uniqueDealsMap.has(key) || deal.type === 'lease') {
            uniqueDealsMap.set(key, deal);
          }
        });
        const uniqueDeals = Array.from(uniqueDealsMap.values());

        // Recalculate deals for $3,000 down payment default
        const recalculated = uniqueDeals.map((deal: any) => {
          const targetDown = 3000;
          const currentDown = Number(deal.down) || 0;
          const termStr = String(deal.term || '36');
          const term = parseInt(termStr) || 36;
          
          // Adjust payment based on down payment difference
          const downDiff = currentDown - targetDown;
          const paymentAdjustment = term > 0 ? downDiff / term : 0;
          
          let payment = Math.round((Number(deal.payment) || 0) + paymentAdjustment);
          let marketAvg = deal.marketAvg ? Math.round(Number(deal.marketAvg) + paymentAdjustment) : Math.round(payment * 1.267);

          if (deal.type === 'lease') {
            const isKiaHyundai = ['Kia', 'Hyundai'].includes(deal.make);
            if (!isKiaHyundai) {
              const msrp = Number(deal.msrp) || 0;
              const rvIncrease = msrp * 0.01;
              const monthlySaving = term > 0 ? rvIncrease / term : 0;
              payment = Math.round(payment - monthlySaving);
              // Also adjust marketAvg if it was based on the original payment
              if (deal.marketAvg) {
                marketAvg = Math.round(marketAvg - monthlySaving);
              } else {
                marketAvg = Math.round(payment * 1.267);
              }
            }
          }
          
          return {
            ...deal,
            payment: isNaN(payment) ? (Number(deal.payment) || 0) : payment,
            marketAvg: isNaN(marketAvg) ? (Number(deal.marketAvg) || Math.round((Number(deal.payment) || 0) * 1.267)) : marketAvg,
            down: targetDown,
            mileage: ['Kia', 'Hyundai'].includes(deal.make) ? '10k' : '7.5k'
          };
        });
        setDeals(recalculated);
      })
      .catch(err => console.error('Failed to fetch deals:', err));
  }, []);

  const makes = useMemo(() => ['All', ...Array.from(new Set(deals.map(d => d.make)))].sort(), [deals]);
  const availableModels = useMemo(() => {
    if (selectedMake === 'All') return ['All'];
    const filtered = deals.filter(d => d.make === selectedMake);
    return ['All', ...Array.from(new Set(filtered.map(d => d.model)))].sort();
  }, [deals, selectedMake]);

  const availableTrims = useMemo(() => {
    if (selectedMake === 'All' || selectedModel === 'All') return ['All'];
    const filtered = deals.filter(d => d.make === selectedMake && d.model === selectedModel);
    return ['All', ...Array.from(new Set(filtered.map(d => d.trim)))].sort();
  }, [deals, selectedMake, selectedModel]);
  const classes = useMemo(() => ['All', ...Array.from(new Set(deals.map(d => d.class)))], [deals]);

  const processedDeals = useMemo(() => {
    return deals.map(deal => {
      let currentPayment = Number(deal.payment) || 0;
      let currentType = displayMode;
      let currentTerm = selectedTerm;
      
      // Recalculate based on custom down payment
      const defaultDown = 3000;
      const downDiff = defaultDown - downPayment;
      const downAdjustment = currentTerm > 0 ? downDiff / currentTerm : 0;
      currentPayment = Math.round(currentPayment + downAdjustment);

      // Recalculate based on term difference (simplified estimation)
      const defaultTerm = parseInt(deal.term) || 36;
      if (currentTerm !== defaultTerm && currentTerm > 0) {
        // Rough estimation: longer term = lower payment, shorter term = higher payment
        // This is a placeholder for actual lease/finance math
        const termRatio = defaultTerm / currentTerm;
        currentPayment = Math.round(currentPayment * termRatio);
      }

      // Recalculate based on credit score
      // Tier 1 (740+): Base
      // Tier 2 (700-739): +$25/mo
      // Tier 3 (680-699): +$60/mo
      if (creditScore < 740 && creditScore >= 700) {
        currentPayment += 25;
      } else if (creditScore < 700) {
        currentPayment += 60;
      }

      let currentMarketAvg = Number(deal.marketAvg) || Math.round(currentPayment * 1.267);

      if (displayMode === 'finance') {
        currentPayment = calculateFinancePayment(Number(deal.msrp) || 0, Number(deal.savings) || 0, downPayment, currentTerm);
        currentMarketAvg = Math.round(currentPayment * 1.15);
      }

      // Calculate Value Score (MSRP / (Payment * Term))
      // A higher score means you're getting more car for your money
      const totalCost = currentPayment * currentTerm;
      const valueScore = totalCost > 0 ? (deal.msrp / totalCost).toFixed(2) : '0';

      return {
        ...deal,
        displayPayment: isNaN(currentPayment) ? 0 : currentPayment,
        displayMarketAvg: isNaN(currentMarketAvg) ? 0 : currentMarketAvg,
        displayType: currentType,
        displayTerm: currentTerm,
        valueScore: parseFloat(valueScore)
      };
    });
  }, [deals, displayMode, creditScore, downPayment, selectedTerm]);

  const effectiveFTB = isFirstTimeBuyer && !hasCosigner;

  const filteredDeals = useMemo(() => {
    let result = processedDeals.filter(deal => {
      const brokerFee = Number(settings.brokerFee) || 595;
      const term = parseInt(deal.displayTerm) || 36;
      const finalPayment = ((Number(deal.displayPayment) || 0) + (brokerFee / term));
      const matchesSearch = deal.make.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           deal.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPayment = finalPayment <= maxPayment;
      const matchesMake = selectedMake === 'All' || deal.make === selectedMake;
      const matchesModel = selectedModel === 'All' || deal.model === selectedModel;
      const matchesTrim = selectedTrim === 'All' || deal.trim === selectedTrim;
      const matchesClass = selectedClass === 'All' || deal.class === selectedClass;
      const matchesFTB = !effectiveFTB || deal.isFirstTimeBuyerEligible !== false;
      
      // Advanced Filters
      const matchesBody = selectedBodyStyle === 'All' || deal.bodyStyle === selectedBodyStyle;
      const matchesFuel = selectedFuelType === 'All' || deal.fuelType === selectedFuelType;
      const matchesDrive = selectedDriveType === 'All' || deal.driveType === selectedDriveType;
      const matchesSeats = selectedSeats === 'All' || deal.seats >= parseInt(selectedSeats);

      // Quick Filters logic
      if (selectedQuickFilter) {
        if (selectedQuickFilter === 'hybrids' && !(deal.fuelType === 'Hybrid' && finalPayment <= 400)) return false;
        if (selectedQuickFilter === 'suvs' && !(deal.bodyStyle === 'SUV' && finalPayment <= 600)) return false;
        if (selectedQuickFilter === 'evs' && !(deal.fuelType === 'Electric' && finalPayment <= 600)) return false;
        if (selectedQuickFilter === 'luxury' && !(deal.class.toLowerCase().includes('luxury') && finalPayment <= 800)) return false;
        if (selectedQuickFilter === 'threeRow' && !(deal.seats >= 7)) return false;
      }
      
      return matchesSearch && matchesPayment && matchesMake && matchesModel && matchesTrim && matchesClass && matchesFTB && 
             matchesBody && matchesFuel && matchesDrive && matchesSeats;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'payment') return a.displayPayment - b.displayPayment;
      if (sortBy === 'savings') return b.savings - a.savings;
      if (sortBy === 'value') return b.valueScore - a.valueScore;
      return 0;
    });
  }, [processedDeals, searchQuery, maxPayment, selectedMake, selectedModel, selectedTrim, selectedClass, effectiveFTB, selectedQuickFilter, selectedBodyStyle, selectedFuelType, selectedDriveType, selectedSeats, sortBy, settings.brokerFee]);

  const handleCardClick = (deal: any) => {
    logEvent('select_item', { item_list_name: 'deals_catalog', items: [{ item_id: deal.id, item_name: `${deal.make} ${deal.model}` }] });
    navigate(`/deal/${deal.id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] pt-4 pb-32 font-sans">
      <Helmet>
        <title>Best Car Lease Deals in Los Angeles | Hunter Lease</title>
        <meta name="description" content="Browse the best car lease and finance deals in Los Angeles. AI-monitored inventory with transparent pricing and zero markup." />
      </Helmet>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="mb-6 mt-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-tighter leading-none mb-2">
              {t.title}
            </h1>
            <p className="text-[var(--mu2)] text-sm max-w-2xl" dangerouslySetInnerHTML={{ __html: t.subtitle }} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* LEFT SIDEBAR - 320px */}
          <aside className={`w-full lg:w-[320px] shrink-0 ${showFilters ? 'block' : 'hidden lg:block'} lg:sticky lg:top-[calc(var(--nh)+1.5rem)] lg:max-h-[calc(100vh-var(--nh)-3rem)] lg:overflow-y-auto custom-scrollbar rounded-2xl bg-[var(--s1)] border border-[var(--b2)] shadow-lg lg:z-10`}>
            
            <div className="p-5 space-y-8">
              {/* Section A: Deal assumptions */}
              <div className="space-y-5">
                <div className="border-b border-[var(--b2)] pb-3">
                  <h3 className="text-xs font-bold text-[var(--w)] uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Settings2 size={14} className="text-[var(--lime)]" />
                    {t.dealAssumptions}
                  </h3>
                  <p className="text-[10px] text-[var(--mu2)] leading-relaxed">Payments update in real time based on your assumptions.</p>
                </div>
                
                {/* Deal Type Toggle */}
                <div className="bg-[var(--s2)] p-1 rounded-xl flex border border-[var(--b2)]">
                  {['lease', 'finance'].map(type => (
                    <button
                      key={type}
                      onClick={() => setDisplayMode(type as 'lease' | 'finance')}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${displayMode === type ? 'bg-[var(--w)] text-white shadow-sm' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
                    >
                      {type === 'lease' ? t.lease : t.finance}
                    </button>
                  ))}
                </div>

                {/* Credit Tier */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.creditScore}</label>
                  <select 
                    value={creditScore}
                    onChange={(e) => setCreditScore(parseInt(e.target.value))}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                  >
                    <option value={740}>740+ (Tier 1)</option>
                    <option value={700}>700-739 (Tier 2)</option>
                    <option value={680}>680-699 (Tier 3)</option>
                  </select>
                </div>

                {/* Down Payment */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.dueAtSigning} / {t.downPayment}</label>
                    <span className="text-[var(--lime)] font-mono font-bold">{fmt(downPayment)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="10000" step="500"
                    value={downPayment}
                    onChange={(e) => setDownPayment(parseInt(e.target.value))}
                    className="w-full accent-[var(--lime)] h-1.5 bg-[var(--s2)] rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Term Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.term}</label>
                  <select 
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                  >
                    {displayMode === 'lease' ? (
                      <>
                        <option value={24}>24 {t.months}</option>
                        <option value={36}>36 {t.months}</option>
                        <option value={48}>48 {t.months}</option>
                      </>
                    ) : (
                      <>
                        <option value={48}>48 {t.months}</option>
                        <option value={60}>60 {t.months}</option>
                        <option value={72}>72 {t.months}</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Mileage Selector (Lease Only) */}
                {displayMode === 'lease' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.annualMileage}</label>
                    <select 
                      value={selectedMileage}
                      onChange={(e) => setSelectedMileage(e.target.value)}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                    >
                      <option value="7.5k">7,500 {t.milesYr}</option>
                      <option value="10k">10,000 {t.milesYr}</option>
                      <option value="12k">12,000 {t.milesYr}</option>
                      <option value="15k">15,000 {t.milesYr}</option>
                    </select>
                  </div>
                )}
                
                {/* ZIP Code */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.zipCode}</label>
                  <input 
                    type="text" 
                    placeholder={t.enterZip} 
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all"
                  />
                </div>
              </div>

              {/* Section B: Search + filters */}
              <div className="space-y-6 pt-6 border-t border-[var(--b2)]">
                <h3 className="text-xs font-bold text-[var(--w)] uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Filter size={14} className="text-[var(--lime)]" />
                  {t.filters}
                </h3>
                
                {/* Search */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)] group-focus-within:text-[var(--lime)] transition-colors" />
                  <input 
                    type="text" 
                    placeholder={t.searchPlaceholder} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-[var(--lime)] transition-all shadow-sm"
                  />
                </div>

                {/* Make Filter */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.make}</h4>
                  <select 
                    value={selectedMake}
                    onChange={(e) => {
                      setSelectedMake(e.target.value);
                      setSelectedModel('All');
                      setSelectedTrim('All');
                    }}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                  >
                    {makes.map(make => (
                      <option key={make} value={make}>{make === 'All' ? t.allMakes : make}</option>
                    ))}
                  </select>
                </div>

                {/* Model Filter */}
                {selectedMake !== 'All' && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.model}</h4>
                    <select 
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        setSelectedTrim('All');
                      }}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                    >
                      {availableModels.map(model => (
                        <option key={model} value={model}>{model === 'All' ? t.all : model}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Trim Filter */}
                {selectedMake !== 'All' && selectedModel !== 'All' && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.trim}</h4>
                    <select 
                      value={selectedTrim}
                      onChange={(e) => setSelectedTrim(e.target.value)}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                    >
                      {availableTrims.map(trim => (
                        <option key={trim} value={trim}>{trim === 'All' ? t.all : trim}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Body Style Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.bodyStyle}</h4>
                  <button onClick={() => setSelectedBodyStyle('All')} className="text-[10px] text-[var(--lime)] font-bold uppercase hover:underline">{t.all}</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'SUV', icon: '🏔️' },
                    { id: 'Sedan', icon: '🚗' },
                    { id: 'Truck', icon: '🛻' },
                    { id: 'Coupe', icon: '🏎️' },
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedBodyStyle(selectedBodyStyle === style.id ? 'All' : style.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedBodyStyle === style.id ? 'bg-[var(--lime)] border-[var(--lime)] text-black' : 'bg-[var(--s2)] border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)]'}`}
                    >
                      <span className="text-xl mb-1">{style.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {(t.bodyStyles as any)[style.id] || style.id}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fuel Type Filter */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.fuelType}</h4>
                <div className="space-y-2">
                  {['Electric', 'Hybrid', 'Gas'].map(fuel => (
                    <button
                      key={fuel}
                      onClick={() => setSelectedFuelType(selectedFuelType === fuel ? 'All' : fuel)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${selectedFuelType === fuel ? 'bg-[var(--lime)] border-[var(--lime)] text-black' : 'bg-[var(--s2)] border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)]'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Fuel size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {(t.fuelTypes as any)[fuel] || fuel}
                        </span>
                      </div>
                      {selectedFuelType === fuel && <Zap size={12} className={selectedFuelType === fuel ? 'fill-black' : 'fill-[var(--lime)]'} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seats Filter */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.seats}</h4>
                <div className="flex bg-[var(--s2)] border border-[var(--b2)] rounded-xl p-1">
                  {['All', '5', '7'].map(num => (
                    <button
                      key={num}
                      onClick={() => setSelectedSeats(num)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedSeats === num ? 'bg-[var(--w)] text-white shadow-sm' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
                    >
                      {num === 'All' ? t.any : num + '+'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.maxPayment}</h4>
                  <span className="text-[var(--lime)] font-mono font-bold">{fmt(maxPayment)}</span>
                </div>
                <input 
                  type="range" min="200" max="3000" step="50" 
                  value={maxPayment} 
                  onChange={(e) => setMaxPayment(parseInt(e.target.value))}
                  className="w-full accent-[var(--lime)] h-1.5 bg-[var(--s2)] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Reset Filters */}
              <button 
                onClick={() => {
                  setSelectedMake('All');
                  setSelectedModel('All');
                  setSelectedTrim('All');
                  setSelectedClass('All');
                  setSelectedBodyStyle('All');
                  setSelectedFuelType('All');
                  setSelectedDriveType('All');
                  setSelectedSeats('All');
                  setMaxPayment(3000);
                  setSearchQuery('');
                  setSelectedQuickFilter(null);
                  setCreditScore(740);
                  setDownPayment(3000);
                }}
                className="w-full py-3 rounded-xl border border-dashed border-[var(--b2)] text-[var(--mu2)] text-[10px] font-bold uppercase tracking-widest hover:border-[var(--mu)] hover:text-[var(--w)] transition-all"
              >
                {t.clearFilters}
              </button>
              </div>
            </div>
          </aside>

          {/* CENTER COLUMN - flex-1 */}
          <main className="flex-1 min-w-0 flex flex-col">
            {/* Top Toolbar */}
            <div className="mb-6 flex flex-col gap-4 pb-4 border-b border-[var(--b2)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-display tracking-tight">
                    <span className="text-[var(--w)]">{filteredDeals.length}</span> <span className="text-[var(--mu2)]">{t.verifiedDeals}</span>
                  </h2>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)]">
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{displayMode === 'lease' ? t.lease : t.finance}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{t.tier} {creditScore >= 740 ? '1' : creditScore >= 700 ? '2' : '3'}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{fmt(downPayment)} {t.down}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{selectedTerm} {t.moShort}</span>
                    {displayMode === 'lease' && <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{selectedMileage}/{t.yrShort}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.sort}:</span>
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs font-bold uppercase tracking-widest outline-none cursor-pointer text-[var(--w)]"
                    >
                      <option value="value">{t.bestDeal}</option>
                      <option value="payment">{t.lowestPayment}</option>
                      <option value="savings">{t.highestSavings}</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden p-2 bg-[var(--s1)] border border-[var(--b2)] rounded-lg text-[var(--mu2)]"
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'hybrids', label: t.quickFilters.hybrids },
                  { id: 'suvs', label: t.quickFilters.suvs },
                  { id: 'evs', label: t.quickFilters.evs },
                  { id: 'luxury', label: t.quickFilters.luxury },
                  { id: 'threeRow', label: t.quickFilters.threeRow },
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => setSelectedQuickFilter(selectedQuickFilter === chip.id ? null : chip.id)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${selectedQuickFilter === chip.id ? 'bg-[var(--lime)] border-[var(--lime)] text-black' : 'bg-[var(--s1)] border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)] hover:text-[var(--w)]'}`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredDeals.length > 0 ? filteredDeals.map(deal => (
                  <motion.div 
                    key={deal.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleCardClick(deal)}
                    className="group bg-[var(--s1)] border border-[var(--b2)] hover:border-[var(--lime)]/50 rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col h-full shadow-sm hover:shadow-xl"
                  >
                    {/* Image Section - Top */}
                    <div className="relative w-full aspect-[16/10] bg-[var(--s2)] overflow-hidden shrink-0">
                      <img 
                        src={deal.image || getCarImage(photos, deal.make, deal.model, deal.year)} 
                        alt={`${deal.make} ${deal.model}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {deal.hot && (
                          <span className="bg-[var(--lime)] text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            {t.hot}
                          </span>
                        )}
                        <span className="bg-white/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                          Verified
                        </span>
                      </div>
                    </div>

                    {/* Content Section - Bottom */}
                    <div className="p-5 flex-1 flex flex-col">
                      {/* 1. Vehicle Identity */}
                      <div className="mb-4">
                        <h3 className="font-display text-xl tracking-tight leading-tight mb-1 text-[var(--w)] line-clamp-2">
                          {deal.year} {deal.make} {deal.model} {deal.trim}
                        </h3>
                      </div>

                      {/* 2. Payment */}
                      <div className="mb-4 bg-[var(--s2)] rounded-xl p-4 border border-[var(--b2)] shadow-inner">
                        <div className="flex justify-between items-end mb-1">
                          <span className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold">
                            {displayMode === 'lease' ? 'Est. Lease' : 'Est. Finance'}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-display text-3xl text-[var(--lime)] leading-none">
                              {fmt(deal.displayPayment + ((Number(settings.brokerFee) || 595) / deal.displayTerm))}
                            </span>
                            <span className="text-xs text-[var(--mu2)] font-bold">/mo</span>
                          </div>
                        </div>
                        
                        {/* 3. Term + Due at signing */}
                        <div className="flex justify-between items-center text-[11px] text-[var(--mu2)] pt-3 border-t border-[var(--b2)] mt-3">
                          <span>{deal.displayTerm} months</span>
                          <span>
                            <strong className="text-[var(--w)]">{fmt(downPayment)}</strong> {displayMode === 'lease' ? 'due at signing' : 'down'}
                          </span>
                        </div>
                      </div>

                      {/* 4. MSRP / Savings */}
                      <div className="flex items-center justify-between mb-6 text-xs bg-[var(--s1)] p-3 rounded-lg border border-[var(--b2)]">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold">{t.msrp}</span>
                          <span className="font-mono text-[var(--w)]">{fmt(deal.msrp)}</span>
                        </div>
                        {(deal.savings > 0 || deal.valueScore > 0) && (
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-[var(--grn)] uppercase tracking-widest font-bold">{deal.savings > 0 ? t.totalSavings : 'Value Score'}</span>
                            <span className="font-mono text-[var(--grn)] font-bold bg-[var(--grn)]/10 px-2 py-0.5 rounded">{deal.savings > 0 ? fmt(deal.savings) : deal.valueScore}</span>
                          </div>
                        )}
                      </div>

                      {/* 5. CTA */}
                      <div className="mt-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/deal/${deal.id}`);
                          }}
                          className="w-full py-3 bg-[var(--lime)] text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--lime)]/10"
                        >
                          View Deal Details <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-[var(--s1)] border border-dashed border-[var(--b2)] rounded-3xl"
                  >
                    <Search className="w-12 h-12 text-[var(--mu2)] mb-4 opacity-20" />
                    <h3 className="text-2xl font-display mb-2">{t.noDeals}</h3>
                    <p className="text-sm text-[var(--mu)] max-w-sm mx-auto">{t.noDealsDesc}</p>
                    <button 
                      onClick={() => {
                        setSelectedMake('All');
                        setSelectedModel('All');
                        setSelectedTrim('All');
                        setSelectedClass('All');
                        setSelectedBodyStyle('All');
                        setSelectedFuelType('All');
                        setSelectedDriveType('All');
                        setSelectedSeats('All');
                        setMaxPayment(3000);
                        setSearchQuery('');
                        setSelectedQuickFilter(null);
                        setCreditScore(740);
                        setDownPayment(3000);
                      }}
                      className="mt-6 px-6 py-3 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      {t.clearFilters}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Custom Search Block */}
        <div className="mt-32 bg-[var(--s1)] border border-[var(--b2)] rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 -mt-32 -mr-32 w-96 h-96 bg-[var(--lime)]/5 rounded-full blur-[120px] pointer-events-none" />
           <div className="absolute bottom-0 left-0 -mb-32 -ml-32 w-96 h-96 bg-[var(--teal)]/5 rounded-full blur-[120px] pointer-events-none" />
           
           <h3 className="font-display text-6xl md:text-8xl tracking-tighter mb-6 relative z-10">{t.dreamCarTitle}</h3>
           <p className="text-[var(--mu2)] text-xl mb-12 max-w-2xl mx-auto relative z-10 leading-relaxed">
             {t.dreamCarDesc}
           </p>
           <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="inline-flex items-center gap-3 bg-[var(--lime)] text-black font-bold px-10 py-5 rounded-2xl relative z-10 hover:bg-[var(--lime2)] transition-all shadow-xl hover:shadow-[var(--lime)]/20 hover:-translate-y-1 uppercase tracking-widest text-sm">
             {t.requestSearch} <ChevronRight className="w-6 h-6" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default DealsPage;

