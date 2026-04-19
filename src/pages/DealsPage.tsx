import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { Filter, Search, Info, ShieldCheck, Zap, ChevronRight, SlidersHorizontal, Eye, Heart, X, ChevronDown, Fuel, Gauge, Users, Settings2, Star } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../translations';
import { getCarImage, CarPhoto } from '../utils/carImage';
import { getVal } from '../utils/finance';
import { useDebounce } from '../hooks/useDebounce';
import { useMarketcheck } from '../hooks/useMarketcheck';
import { CompareBar } from '../components/CompareBar';
import { logEvent } from '../components/VisitTracker';
import { fetchWithCache } from '../utils/fetchWithCache';

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

export const DealsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const { toggleDeal, isSaved, addToCompare, removeFromCompare, isInCompare } = useGarageStore();
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
  
  const { mcInventory, mcTotalCount, isLoading: isMcLoading } = useMarketcheck(useMemo(() => ({
    make: selectedMake,
    model: selectedModel
  }), [selectedMake, selectedModel]));
  const [selectedTrim, setSelectedTrim] = useState('All');
  const [selectedClass, setSelectedClass] = useState('All');
  const [displayMode, setDisplayMode] = useState<'lease' | 'finance'>('lease');
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [hasCosigner, setHasCosigner] = useState(false);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialModel);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedMaxPayment = useDebounce(maxPayment, 300);
  
  const [selectedTerm, setSelectedTerm] = useState<number>(36);
  const [selectedMileage, setSelectedMileage] = useState<string>('10k');
  const [zipCode, setZipCode] = useState<string>('');
  const debouncedZipCode = useDebounce(zipCode, 500);
  
  // Advanced Filters
  const [selectedBodyStyle, setSelectedBodyStyle] = useState('All');
  const [selectedFuelType, setSelectedFuelType] = useState('All');
  const [selectedDriveType, setSelectedDriveType] = useState('All');
  const [selectedSeats, setSelectedSeats] = useState('All');
  const [tier, setTier] = useState('t1');
  const [downPayment, setDownPayment] = useState(3000);
  const debouncedDownPayment = useDebounce(downPayment, 500);
  const [sortBy, setSortBy] = useState<'payment' | 'savings' | 'value'>('payment');
  const [quoteSnapshots, setQuoteSnapshots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({
      zipCode: debouncedZipCode || '90210',
      isFirstTimeBuyer: isFirstTimeBuyer.toString(),
      tier: tier,
      term: selectedTerm.toString(),
      down: debouncedDownPayment.toString(),
      mileage: selectedMileage,
      displayMode: displayMode,
      limit: '50' // Limit to 50 deals as requested to improve performance
    });

    Promise.allSettled([
      fetchWithCache(`/api/deals?${params.toString()}`),
      fetchWithCache('/api/car-photos'),
      fetchWithCache(`/api/v2/quotes?zipCode=${debouncedZipCode || '90210'}&uxTier=${tier === 't1' ? 'TIER_1_PLUS' : 'TIER_1'}&isFirstTimeBuyer=${isFirstTimeBuyer}`)
    ])
      .then((results: any[]) => {
        const data = results[0].status === 'fulfilled' ? results[0].value : [];
        const photosData = results[1].status === 'fulfilled' ? results[1].value : [];
        const snapshots = results[2].status === 'fulfilled' ? results[2].value : [];

        setPhotos(photosData as CarPhoto[] || []);
        setQuoteSnapshots(snapshots as any[] || []);
        
        if (!Array.isArray(data)) {
          console.error('Expected array of deals, got:', data);
          setDeals([]);
          setIsLoading(false);
          return;
        }

        // Deduplicate deals by make + model + trim
        const uniqueDealsMap = new Map();
        data.forEach((deal: any) => {
          if (!deal || !deal.make || !deal.model) return;
          const key = `${deal.make}-${deal.model}-${deal.trim || 'base'}`;
          if (!uniqueDealsMap.has(key) || deal.type === 'lease') {
            uniqueDealsMap.set(key, deal);
          }
        });
        const uniqueDeals = Array.from(uniqueDealsMap.values());

        // Optimize snapshots lookup with a Map
        const snapshotsMap = new Map();
        if (Array.isArray(snapshots)) {
          snapshots.forEach((s: any) => {
            if (!s?.vehicle?.make || !s?.vehicle?.model) return;
            const key = `${s.vehicle.make}-${s.vehicle.model}-${s.vehicle.trim || 'base'}-${s.quoteType}`;
            snapshotsMap.set(key, s);
          });
        }

        // Merge with snapshots if available
        const recalculated = uniqueDeals.map((deal: any) => {
          const trimKey = deal.trim || 'base';
          const leaseKey = `${deal.make}-${deal.model}-${trimKey}-LEASE`;
          const financeKey = `${deal.make}-${deal.model}-${trimKey}-FINANCE`;
          
          const leaseSnapshot = snapshotsMap.get(leaseKey);
          const financeSnapshot = snapshotsMap.get(financeKey);

          if (leaseSnapshot || financeSnapshot) {
            const snapshot = leaseSnapshot || financeSnapshot;
            return {
              ...deal,
              payment: leaseSnapshot ? leaseSnapshot.monthlyPaymentCents / 100 : deal.payment,
              financePayment: financeSnapshot ? financeSnapshot.monthlyPaymentCents / 100 : deal.financePayment,
              msrp: snapshot?.vehicle?.msrpCents ? snapshot.vehicle.msrpCents / 100 : deal.msrp,
              isFromSnapshot: true
            };
          }

          return {
            ...deal,
            payment: Number(deal.payment) || 0,
            marketAvg: Number(deal.marketAvg) || Math.round((Number(deal.payment) || 0) * 1.267),
            down: Number(deal.down) || 3000,
            mileage: ['Kia', 'Hyundai'].includes(deal.make) ? '10k' : '7.5k'
          };
        });
        setDeals(recalculated);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Critical error in catalog loading:', err);
        setIsLoading(false);
      });
  }, [debouncedZipCode, isFirstTimeBuyer, tier, selectedTerm, debouncedDownPayment, selectedMileage, displayMode]);

  const TARGET_MAKES = ['Acura', 'Chevrolet', 'Ford', 'Genesis', 'Hyundai', 'Kia', 'Lexus', 'RAM', 'Toyota', 'Volvo'];
  const makes = useMemo(() => ['All', ...TARGET_MAKES].sort(), []);
  const availableModels = useMemo(() => {
    if (selectedMake === 'All') return ['All'];
    const filtered = deals.filter(d => d.make === selectedMake);
    const mcFiltered = mcInventory.filter(d => d.make === selectedMake);
    return ['All', ...Array.from(new Set([...filtered.map(d => d.model), ...mcFiltered.map(d => d.model)]))].sort();
  }, [deals, mcInventory, selectedMake]);

  const availableTrims = useMemo(() => {
    if (selectedMake === 'All' || selectedModel === 'All') return ['All'];
    const filtered = deals.filter(d => d.make === selectedMake && d.model === selectedModel);
    const mcFiltered = mcInventory.filter(d => d.make === selectedMake && d.model === selectedModel);
    return ['All', ...Array.from(new Set([...filtered.map(d => d.trim), ...mcFiltered.map(d => d.trim)]))].sort();
  }, [deals, mcInventory, selectedMake, selectedModel]);
  const classes = useMemo(() => ['All', ...Array.from(new Set(deals.map(d => d.class)))], [deals]);

  const processedDeals = useMemo(() => {
    // Map Marketcheck inventory to deal structure
    const mcDealsMap = new Map();
    
    mcInventory.forEach(item => {
      // Skip listings that have neither price nor msrp
      if (!item.price && !item.msrp) return;
      
      const price = item.price || item.msrp || 0;
      const msrp = item.msrp || price;
      
      const amountToFinance = Math.max(0, price - downPayment);
      const estimatedLease = Math.round((amountToFinance / selectedTerm) + (price * 0.00125));
      const estimatedFinance = Math.round((amountToFinance / selectedTerm) * 1.05);
      
      // Robust image extraction
      let image = null;
      if (item.media?.photo_links?.[0]) {
        image = item.media.photo_links[0];
      } else if (Array.isArray(item.media) && item.media[0]) {
        image = typeof item.media[0] === 'string' ? item.media[0] : (item.media[0] as any).url;
      }

      const deal = {
        id: item.vin, // Use VIN as ID for Marketcheck
        vin: item.vin,
        make: item.make,
        model: item.model,
        year: item.year,
        trim: item.trim,
        msrp: msrp,
        price: price,
        payment: estimatedLease, // Estimated lease payment
        financePayment: estimatedFinance, // Estimated finance payment
        savings: Math.max(0, msrp - price),
        image,
        dealer: item.dealer?.name,
        type: 'marketcheck',
        status: 'active',
        hot: false,
        class: 'Other',
        fuelType: (item as any).fuel_type || (item as any).build?.fuel_type,
        bodyStyle: (item as any).body_style || (item as any).build?.body_type,
        driveType: (item as any).drive_type || (item as any).build?.drivetrain,
        transmission: (item as any).transmission || (item as any).build?.transmission,
        engine: (item as any).engine || (item as any).build?.engine,
        miles: item.miles
      };
      
      const key = `${deal.make}-${deal.model}-${deal.trim || 'base'}`;
      // Deduplicate: keep the one with the lowest price
      if (!mcDealsMap.has(key) || mcDealsMap.get(key).price > price) {
        mcDealsMap.set(key, deal);
      }
    });
    
    const mcDeals = Array.from(mcDealsMap.values());

    const allDeals = [...deals, ...mcDeals];

    return allDeals.map(deal => {
      const msrp = getVal(deal.msrp);
      let currentPayment = displayMode === 'lease' ? deal.payment : deal.financePayment || deal.payment;
      let currentMarketAvg = displayMode === 'lease' ? Math.round(currentPayment * 1.267) : Math.round(currentPayment * 1.15);

      const totalCost = (currentPayment * selectedTerm) + downPayment;
      const valueScore = totalCost > 0 ? (msrp / totalCost).toFixed(2) : '0';

      return {
        ...deal,
        msrp, // Ensure msrp is a number in the processed deal
        displayPayment: isNaN(currentPayment) ? 0 : currentPayment,
        displayMarketAvg: isNaN(currentMarketAvg) ? 0 : currentMarketAvg,
        displayType: displayMode,
        displayTerm: selectedTerm,
        valueScore: parseFloat(valueScore)
      };
    });
  }, [deals, mcInventory, displayMode, selectedTerm, downPayment]);

  const filteredDeals = useMemo(() => {
    let result = processedDeals.filter(deal => {
      const finalPayment = Number(deal.displayPayment) || 0;
      const makeStr = deal.make || '';
      const modelStr = deal.model || '';
      const matchesSearch = makeStr.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
                           modelStr.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesPayment = finalPayment <= debouncedMaxPayment;
      const matchesMake = selectedMake === 'All' || deal.make === selectedMake;
      const matchesModel = selectedModel === 'All' || deal.model === selectedModel;
      const matchesTrim = selectedTrim === 'All' || deal.trim === selectedTrim;
      const matchesClass = selectedClass === 'All' || deal.class === selectedClass;
      
      let matchesFTB = true;
      if (isFirstTimeBuyer) {
        if (hasCosigner) {
          matchesFTB = deal.allowWithCoSigner !== false;
        } else {
          matchesFTB = deal.isFirstTimeBuyerEligible !== false;
        }
      }
      
      // Advanced Filters
      const matchesBody = selectedBodyStyle === 'All' || deal.bodyStyle === selectedBodyStyle;
      const matchesFuel = selectedFuelType === 'All' || deal.fuelType === selectedFuelType;
      const matchesDrive = selectedDriveType === 'All' || deal.driveType === selectedDriveType;
      const matchesSeats = selectedSeats === 'All' || (deal.seats || 0) >= parseInt(selectedSeats);

      // Quick Filters logic
      if (selectedQuickFilter) {
        const dealClass = (deal.class || '').toLowerCase();
        if (selectedQuickFilter === 'hybrids' && !(deal.fuelType === 'Hybrid' && finalPayment <= 400)) return false;
        if (selectedQuickFilter === 'suvs' && !(deal.bodyStyle === 'SUV' && finalPayment <= 600)) return false;
        if (selectedQuickFilter === 'evs' && !(deal.fuelType === 'Electric' && finalPayment <= 600)) return false;
        if (selectedQuickFilter === 'luxury' && !(dealClass.includes('luxury') && finalPayment <= 800)) return false;
        if (selectedQuickFilter === 'threeRow' && !((deal.seats || 0) >= 7)) return false;
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
  }, [processedDeals, debouncedSearchQuery, debouncedMaxPayment, selectedMake, selectedModel, selectedTrim, selectedClass, isFirstTimeBuyer, hasCosigner, selectedQuickFilter, selectedBodyStyle, selectedFuelType, selectedDriveType, selectedSeats, sortBy]);

  const displayedDeals = useMemo(() => filteredDeals.slice(0, 55), [filteredDeals]);

  useEffect(() => {
    console.log('DealsPage Debug:', {
      localDeals: deals.length,
      mcInventory: mcInventory.length,
      processed: processedDeals.length,
      filtered: filteredDeals.length,
      displayed: displayedDeals.length,
      mcTotalCount
    });
  }, [deals, mcInventory, processedDeals, filteredDeals, displayedDeals, mcTotalCount]);

  const handleCardClick = (deal: any) => {
    logEvent('select_item', { item_list_name: 'deals_catalog', items: [{ item_id: deal.id, item_name: `${deal.make} ${deal.model}` }] });
    if (deal.type === 'marketcheck') {
      const originalListing = mcInventory.find(item => item.vin === deal.vin);
      navigate(`/deal/mc/${deal.vin}`, { state: { isFirstTimeBuyer, hasCosigner, listing: originalListing } });
    } else {
      navigate(`/deal/${deal.id}`, { state: { isFirstTimeBuyer, hasCosigner } });
    }
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": filteredDeals.slice(0, 10).map((deal, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${window.location.origin}${deal.type === 'marketcheck' ? '/deal/mc/' + deal.vin : '/deal/' + deal.id}`,
      "name": `${deal.year} ${deal.make} ${deal.model} ${deal.trim}`
    }))
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] pt-4 pb-32 font-sans">


      <SEO 
        title={`${selectedMake !== 'All' ? selectedMake + ' ' : ''}${selectedModel !== 'All' ? selectedModel + ' ' : ''}Lease Deals in Los Angeles | Hunter Lease`}
        description={`Browse the best ${selectedMake !== 'All' ? selectedMake + ' ' : ''}car lease and finance deals in Los Angeles. AI-monitored inventory with transparent pricing and zero markup.`}
        schema={itemListSchema}
      />

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
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                  >
                    <option value="t1">{t.tier1}</option>
                    <option value="t2">{t.tier2}</option>
                    <option value="t3">{t.tier3}</option>
                    <option value="t4">{t.tier4}</option>
                    <option value="t5">{t.tier5}</option>
                    <option value="t6">{t.tier6}</option>
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
                      <option value="7.5k">{t.mileageOptions['7.5k']} {t.milesYr}</option>
                      <option value="10k">{t.mileageOptions['10k']} {t.milesYr}</option>
                      <option value="12k">{t.mileageOptions['12k']} {t.milesYr}</option>
                      <option value="15k">{t.mileageOptions['15k']} {t.milesYr}</option>
                      <option value="20k">{t.mileageOptions['20k']} {t.milesYr}</option>
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

                {/* Buyer Status */}
                <div className="space-y-3 pt-4 border-t border-[var(--b2)]">
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.buyerStatus}</h4>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        setIsFirstTimeBuyer(!isFirstTimeBuyer);
                        if (isFirstTimeBuyer) setHasCosigner(false);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left ${
                        isFirstTimeBuyer 
                          ? 'bg-[var(--lime)] text-black border-[var(--lime)]' 
                          : 'bg-[var(--s2)] text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)]'
                      }`}
                    >
                      {isFirstTimeBuyer ? t.firstTimeBuyer : t.experiencedBuyer}
                    </button>
                    {isFirstTimeBuyer && (
                      <label className="flex items-center gap-2 text-xs text-[var(--mu2)] cursor-pointer hover:text-[var(--w)] transition-colors p-2 bg-[var(--s2)] rounded-xl border border-[var(--b2)]">
                        <input 
                          type="checkbox" 
                          checked={hasCosigner} 
                          onChange={(e) => setHasCosigner(e.target.checked)}
                          className="accent-[var(--lime)] w-4 h-4 rounded border-[var(--b2)] bg-[var(--s2)]"
                        />
                        {t.hasCosigner}
                      </label>
                    )}
                  </div>
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
                    {makes.map((make, idx) => (
                      <option key={`${make}-${idx}`} value={make}>{make === 'All' ? t.allMakes : make}</option>
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
                      {availableModels.map((model, idx) => (
                        <option key={`${model}-${idx}`} value={model}>{model === 'All' ? t.all : model}</option>
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
                      {availableTrims.map((trim, idx) => (
                        <option key={`${trim}-${idx}`} value={trim}>{trim === 'All' ? t.all : trim}</option>
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
                  setTier('t1');
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
                    <span className="text-[var(--w)]">
                      {filteredDeals.length >= 55 ? '55+' : filteredDeals.length}
                    </span> <span className="text-[var(--mu2)]">{t.verifiedDeals}</span>
                  </h2>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)]">
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{displayMode === 'lease' ? t.lease : t.finance}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{t.tier} {tier.replace('t', '')}</span>
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
                {(isLoading || isMcLoading) ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <motion.div
                      key={`skeleton-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden flex flex-col h-full shadow-sm"
                    >
                      <div className="w-full aspect-[16/10] bg-[var(--s2)] animate-pulse" />
                      <div className="p-5 flex flex-col flex-1 gap-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-[var(--s2)] rounded w-1/3 animate-pulse" />
                          <div className="h-6 bg-[var(--s2)] rounded w-2/3 animate-pulse" />
                        </div>
                        <div className="flex gap-2">
                          <div className="h-6 bg-[var(--s2)] rounded-full w-16 animate-pulse" />
                          <div className="h-6 bg-[var(--s2)] rounded-full w-16 animate-pulse" />
                        </div>
                        <div className="mt-auto pt-4 border-t border-[var(--b2)] space-y-3">
                          <div className="flex justify-between">
                            <div className="h-4 bg-[var(--s2)] rounded w-1/4 animate-pulse" />
                            <div className="h-6 bg-[var(--s2)] rounded w-1/3 animate-pulse" />
                          </div>
                          <div className="h-10 bg-[var(--s2)] rounded-xl w-full animate-pulse" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : displayedDeals.length > 0 ? displayedDeals.map((deal, idx) => (
                  <motion.div 
                    key={deal.id || deal.vin || idx}
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
                        src={deal.image || getCarImage(photos, deal.make, deal.model, deal.year) || 'https://picsum.photos/seed/car/1200/800'} 
                        alt={`${deal.year} ${deal.make} ${deal.model} ${deal.trim} - Hunter Lease`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                        referrerPolicy="no-referrer" 
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/car/1200/800'; }}
                      />
                      
                      {/* Obscure dealer info on top and bottom for Marketcheck deals */}
                      {deal.type === 'marketcheck' && (
                        <>
                          <div className="absolute top-0 left-0 right-0 h-12 bg-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] pointer-events-none z-10" />
                          <div className="absolute bottom-0 left-0 right-0 h-12 bg-transparent backdrop-blur-xl [mask-image:linear-gradient(to_top,black_50%,transparent_100%)] pointer-events-none z-10" />
                        </>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
                      
                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-2 z-20">
                        {deal.hot && (
                          <span className="bg-[var(--lime)] text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            {t.hot}
                          </span>
                        )}
                        {deal.type === 'marketcheck' ? (
                          <span className="bg-[var(--lime)] text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            LIVE INVENTORY
                          </span>
                        ) : (
                          <span className="bg-white/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            Verified
                          </span>
                        )}
                        {deal.savings > 0 && (
                          <span className="bg-[var(--grn)] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit animate-pulse">
                            SAVE {fmt(deal.savings)}
                          </span>
                        )}
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
                              {fmt(deal.displayPayment)}
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
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold">{t.msrp}</span>
                          </div>
                          <span className="font-mono text-[var(--w)]">{fmt(deal.msrp)}</span>
                        </div>
                        {deal.savings > 0 && (
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-[var(--grn)] uppercase tracking-widest font-bold">{t.totalSavings}</span>
                            <span className="font-mono text-[var(--grn)] font-bold bg-[var(--grn)]/10 px-2 py-0.5 rounded">{fmt(deal.savings)}</span>
                          </div>
                        )}
                        {deal.type !== 'marketcheck' && deal.savings <= 0 && deal.valueScore > 0 && (
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-[var(--grn)] uppercase tracking-widest font-bold">Value Score</span>
                            <span className="font-mono text-[var(--grn)] font-bold bg-[var(--grn)]/10 px-2 py-0.5 rounded">{deal.valueScore}</span>
                          </div>
                        )}
                      </div>

                      {/* 5. CTA */}
                      <div className="mt-auto flex flex-col gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInCompare(String(deal.id))) {
                              removeFromCompare(String(deal.id));
                            } else {
                              addToCompare(deal);
                            }
                          }}
                          className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border ${
                            isInCompare(String(deal.id)) 
                              ? 'bg-[var(--s2)] text-[var(--w)] border-[var(--lime)]' 
                              : 'bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)]'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${isInCompare(String(deal.id)) ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--mu2)]'}`}>
                            {isInCompare(String(deal.id)) && <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-2 h-2 text-black"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          {isInCompare(String(deal.id)) ? 'Added to Compare' : 'Compare'}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(deal);
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
                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
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
                          setTier('t1');
                          setDownPayment(3000);
                        }}
                        className="px-8 py-3 bg-[var(--s2)] text-[var(--w)] border border-[var(--b2)] rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-[var(--mu)] transition-all"
                      >
                        {t.clearFilters}
                      </button>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-[var(--lime)] text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-all shadow-lg shadow-[var(--lime)]/20"
                      >
                        Refresh Page
                      </button>
                    </div>
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
      <CompareBar />
    </div>
  );
};

export default DealsPage;

