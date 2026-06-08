import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { Filter, Search, Info, ShieldCheck, Zap, ChevronRight, SlidersHorizontal, Eye, Heart, X, ChevronDown, Fuel, Gauge, Users, Settings2, Star, ExternalLink, FileText } from 'lucide-react';
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
import { cn } from '../utils/cn';
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
  const [maxPayment, setMaxPayment] = useState(searchParams.has('max') ? parseInt(searchParams.get('max')!) : 3000);
  const [selectedMake, setSelectedMake] = useState(initialMake);
  const [selectedModel, setSelectedModel] = useState(initialModel || 'All');
  const [selectedTrim, setSelectedTrim] = useState('All');
  
  const { mcInventory, mcTotalCount, isLoading: isMcLoading } = useMarketcheck(useMemo(() => ({
    make: selectedMake,
    model: selectedModel,
    trim: selectedTrim
  }), [selectedMake, selectedModel, selectedTrim]));
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || 'All');
  const [displayMode, setDisplayMode] = useState<'lease' | 'finance'>('lease');
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [hasCosigner, setHasCosigner] = useState(false);
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(searchParams.get('quick') || null);
  const [searchQuery, setSearchQuery] = useState(initialModel);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettingsOptions, setShowSettingsOptions] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const debouncedMaxPayment = useDebounce(maxPayment, 300);
  
  const [selectedTerm, setSelectedTerm] = useState<number>(36);
  const [selectedMileage, setSelectedMileage] = useState<string>('10k');
  const [zipCode, setZipCode] = useState<string>('');
  const debouncedZipCode = useDebounce(zipCode, 500);
  
  // Advanced Filters
  const [selectedBodyStyle, setSelectedBodyStyle] = useState(searchParams.get('bodyStyle') || 'All');
  const [selectedFuelType, setSelectedFuelType] = useState(searchParams.get('fuelType') || 'All');
  const [selectedDriveType, setSelectedDriveType] = useState('All');
  const [selectedSeats, setSelectedSeats] = useState('All');
  const [tier, setTier] = useState('t1');
  const [downPayment, setDownPayment] = useState(searchParams.has('down') ? parseInt(searchParams.get('down')!) : 3000);
  const debouncedDownPayment = useDebounce(downPayment, 500);
  const [sortBy, setSortBy] = useState<'payment' | 'savings' | 'value' | 'price_asc' | 'price_desc' | 'popular' | 'recent'>('payment');
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
      limit: '1000',
      timestamp: Date.now().toString()
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

        // Deduplicate deals by Make + Model + Trim + Color
        const uniqueDealsMap = new Map();
        data.forEach((deal: any) => {
          if (!deal || !deal.make || !deal.model) return;
          const key = `${deal.make}-${deal.model}-${deal.trim || 'base'}-${deal.color || deal.exteriorColor || 'any-color'}`;
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

  const makes = useMemo(() => {
    const activeMakes = Array.from(new Set(deals.map(d => d.make)));
    return ['All', ...activeMakes].sort();
  }, [deals]);

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
        vdp_url: (item as any).vdp_url,
        dealer_website: (item as any).dealer?.website,
        window_sticker_url: (item as any).build?.window_sticker_url,
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
      
      const key = item.vin;
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

      const totalIncentives = (deal.availableIncentives || []).filter((inc: any) => inc.isDefault).reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0) || 0;
      const badgeTotalSavings = (Number(deal.savings) || 0) + totalIncentives + (deal.dealerDiscountCents ? deal.dealerDiscountCents / 100 : 0);
      const savingsPctObj = msrp > 0 ? badgeTotalSavings / msrp : 0;
      const leaseValueRatio = msrp > 0 ? currentPayment / msrp : 0;

      return {
        ...deal,
        msrp, // Ensure msrp is a number in the processed deal
        displayPayment: isNaN(currentPayment) ? 0 : currentPayment,
        displayMarketAvg: isNaN(currentMarketAvg) ? 0 : currentMarketAvg,
        displayType: displayMode,
        displayTerm: selectedTerm,
        valueScore: parseFloat(valueScore),
        badgeTotalSavings,
        savingsPctObj,
        leaseValueRatio
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
      
      let matchesFTB = true; // We no longer strictly filter out deals for thin-credit/FTB users upfront
      
      // Advanced Filters
      const matchesBody = selectedBodyStyle === 'All' || deal.bodyStyle === selectedBodyStyle;
      const matchesFuel = selectedFuelType === 'All' || deal.fuelType === selectedFuelType;
      const matchesDrive = selectedDriveType === 'All' || deal.driveType === selectedDriveType;
      const matchesSeats = selectedSeats === 'All' || (deal.seats || 0) >= parseInt(selectedSeats);

      // Quick Filters logic
      if (selectedQuickFilter) {
        const fuelType = (deal.fuelType || '').toLowerCase();
        const bodyStyle = (deal.bodyStyle || '').toLowerCase();
        const dealClass = (deal.class || '').toLowerCase();
        const makeStrLower = makeStr.toLowerCase();
        const modelStrLower = modelStr.toLowerCase();
        
        const isHybrid = fuelType.includes('hybrid') || modelStrLower.includes('hybrid') || modelStrLower.includes('phev');
        const isEV = fuelType.includes('electric') || modelStrLower.includes('ev') || makeStrLower === 'tesla' || makeStrLower === 'rivian' || makeStrLower === 'lucid';
        const isSUV = bodyStyle.includes('suv') || dealClass.includes('suv') || modelStrLower.includes('suv') || modelStrLower.includes('cross') || dealClass.includes('crossover');
        const isLuxury = dealClass.includes('luxury') || ['bmw', 'mercedes-benz', 'audi', 'lexus', 'porsche', 'land rover', 'acura', 'infiniti', 'lincoln', 'cadillac', 'volvo'].includes(makeStrLower);
        const seats = deal.seats || 0;
        
        if (selectedQuickFilter === 'hybrids' && !(isHybrid && finalPayment <= 399)) return false;
        if (selectedQuickFilter === 'suvs' && !(isSUV && finalPayment <= 599)) return false;
        if (selectedQuickFilter === 'evs' && !(isEV && finalPayment <= 599)) return false;
        if (selectedQuickFilter === 'luxury' && !(isLuxury && finalPayment <= 699)) return false;
        if (selectedQuickFilter === 'threeRow' && !(isSUV && seats >= 7)) return false;
      }
      
      return matchesSearch && matchesPayment && matchesMake && matchesModel && matchesTrim && matchesClass && matchesFTB && 
             matchesBody && matchesFuel && matchesDrive && matchesSeats;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'payment') return a.displayPayment - b.displayPayment;
      if (sortBy === 'savings') return b.savingsPctObj - a.savingsPctObj;
      if (sortBy === 'value') {
        const ratioA = a.leaseValueRatio || (a.displayPayment / (a.msrp || 1));
        const ratioB = b.leaseValueRatio || (b.displayPayment / (b.msrp || 1));
        return ratioA - ratioB;
      }
      if (sortBy === 'popular') {
        const popA = a.isPopular ? 1 : 0;
        const popB = b.isPopular ? 1 : 0;
        return popB - popA || (b.views || 0) - (a.views || 0);
      }
      if (sortBy === 'recent') {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'price_asc') return (a.price || a.msrp || 0) - (b.price || b.msrp || 0);
      if (sortBy === 'price_desc') return (b.price || b.msrp || 0) - (a.price || a.msrp || 0);
      return 0;
    });
  }, [processedDeals, debouncedSearchQuery, debouncedMaxPayment, selectedMake, selectedModel, selectedTrim, selectedClass, isFirstTimeBuyer, hasCosigner, selectedQuickFilter, selectedBodyStyle, selectedFuelType, selectedDriveType, selectedSeats, sortBy]);

  const displayedDeals = useMemo(() => filteredDeals, [filteredDeals]);

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

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12 items-start">
          {/* LEFT SIDEBAR - 300px */}
          <aside className={`w-full lg:w-[300px] shrink-0 ${showFilters ? 'block' : 'hidden lg:block'} lg:sticky lg:top-[calc(var(--nh)+1.5rem)] lg:max-h-[calc(100vh-var(--nh)-3rem)] lg:overflow-y-auto custom-scrollbar rounded-2xl bg-[var(--s1)] border-transparent lg:border-[var(--b2)] lg:shadow-lg lg:z-10`}>
            
            <div className="p-5 space-y-8">
              {/* Search + filters */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-[var(--w)] uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Filter size={14} className="text-[var(--lime)]" />
                  Параметры поиска
                </h3>

                <div className="space-y-4 pb-6">
                  {/* Quick Filters */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">Type</label>
                    <div className="bg-[var(--s2)] p-1 rounded-lg flex border border-[var(--b2)]">
                      {['lease', 'finance'].map(type => (
                        <button
                          key={type}
                          onClick={() => setDisplayMode(type as 'lease' | 'finance')}
                          className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${displayMode === type ? 'bg-[var(--w)] text-black shadow-sm' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
                        >
                          {type === 'lease' ? t.lease : t.finance}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.creditScore}</label>
                    <select value={tier} onChange={(e) => setTier(e.target.value)} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-xs font-bold text-[var(--w)] outline-none cursor-pointer appearance-none focus:border-[var(--lime)] transition-colors">
                      <option value="t1">{t.tier1}</option>
                      <option value="t2">{t.tier2}</option>
                      <option value="t3">{t.tier3}</option>
                      <option value="t4">{t.tier4}</option>
                    </select>
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

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.term}</label>
                    <select value={selectedTerm} onChange={(e) => setSelectedTerm(parseInt(e.target.value))} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-xs font-bold text-[var(--w)] outline-none cursor-pointer appearance-none focus:border-[var(--lime)] transition-colors">
                      {displayMode === 'lease' ? (
                        <><option value={24}>24 {t.months}</option><option value={36}>36 {t.months}</option><option value={48}>48 {t.months}</option></>
                      ) : (
                        <><option value={48}>48 {t.months}</option><option value={60}>60 {t.months}</option><option value={72}>72 {t.months}</option></>
                      )}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.dueAtSigning}</label>
                    <select value={downPayment} onChange={(e) => setDownPayment(parseInt(e.target.value))} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-xs font-bold text-[var(--w)] outline-none cursor-pointer appearance-none focus:border-[var(--lime)] transition-colors">
                      <option value={0}>$0</option>
                      <option value={1000}>$1,000</option>
                      <option value={2000}>$2,000</option>
                      <option value={3000}>$3,000</option>
                      <option value={5000}>$5,000</option>
                    </select>
                  </div>
                  
                  {displayMode === 'lease' && (
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.annualMileage}</label>
                      <select value={selectedMileage} onChange={(e) => setSelectedMileage(e.target.value)} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-xs font-bold text-[var(--w)] outline-none cursor-pointer appearance-none focus:border-[var(--lime)] transition-colors">
                        <option value="7.5k">7.5k</option>
                        <option value="10k">10k</option>
                        <option value="12k">12k</option>
                        <option value="15k">15k</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 text-xs text-[var(--w)] cursor-pointer">
                      <input type="checkbox" checked={isFirstTimeBuyer} onChange={(e) => { setIsFirstTimeBuyer(e.target.checked); if (!e.target.checked) setHasCosigner(false); }} className="accent-[var(--lime)] w-3.5 h-3.5" />
                      {t.firstTimeBuyer}
                    </label>
                    {isFirstTimeBuyer && (
                      <label className="flex items-center gap-2 text-xs text-[var(--mu2)] cursor-pointer pr-1 animate-in fade-in ml-5">
                        <input type="checkbox" checked={hasCosigner} onChange={(e) => setHasCosigner(e.target.checked)} className="accent-[var(--lime)] w-3.5 h-3.5" />
                        {t.hasCosigner}
                      </label>
                    )}
                  </div>
                </div>

                <h3 className="text-xs font-bold text-[var(--w)] uppercase tracking-widest mb-1 mt-6 flex items-center gap-2">
                  <Search size={14} className="text-[var(--lime)]" />
                  Уточнить
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

                {/* Quick Filters */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.quickFilters.title}</h4>
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
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${selectedQuickFilter === chip.id ? 'bg-[var(--w)] text-black' : 'bg-[var(--s2)] text-[var(--mu2)] hover:text-[var(--w)] border border-[var(--b2)]'}`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                </div>

                {/* Advanced Filters Expander */}
                <div className="pt-4 border-t border-[var(--b2)]">
                  <button 
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-[var(--w)] uppercase tracking-widest py-2 hover:text-[var(--lime)] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                       <SlidersHorizontal size={14} /> Расширенные фильтры
                    </span>
                    <ChevronRight size={14} className={`transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`} />
                  </button>
                  
                  {showAdvancedFilters && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-top-2 duration-200">
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
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${selectedBodyStyle === style.id ? 'bg-[var(--lime)] border-[var(--lime)] text-black' : 'bg-transparent border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)]'}`}
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
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${selectedFuelType === fuel ? 'bg-[var(--lime)] border-[var(--lime)] text-black' : 'bg-transparent border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)]'}`}
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
                    </div>
                  )}
                </div>

              {/* Active Filters & Quick Filters */}
              {(selectedMake !== 'All' || selectedModel !== 'All' || selectedTrim !== 'All' || selectedClass !== 'All' || selectedBodyStyle !== 'All' || selectedFuelType !== 'All' || selectedDriveType !== 'All' || selectedSeats !== 'All') && (
                <div className="flex flex-wrap gap-2">
                  {selectedMake !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedMake}
                      <button onClick={() => { setSelectedMake('All'); setSelectedModel('All'); setSelectedTrim('All'); }} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedModel !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedModel}
                      <button onClick={() => { setSelectedModel('All'); setSelectedTrim('All'); }} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedTrim !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedTrim}
                      <button onClick={() => setSelectedTrim('All')} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedClass !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedClass}
                      <button onClick={() => setSelectedClass('All')} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedBodyStyle !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedBodyStyle}
                      <button onClick={() => setSelectedBodyStyle('All')} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedFuelType !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedFuelType}
                      <button onClick={() => setSelectedFuelType('All')} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedDriveType !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedDriveType}
                      <button onClick={() => setSelectedDriveType('All')} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                  {selectedSeats !== 'All' && (
                    <span className="flex items-center gap-1 bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1.5 rounded-full text-xs font-medium text-[var(--w)] shadow-sm">
                      {selectedSeats}+ Seats
                      <button onClick={() => setSelectedSeats('All')} className="text-[var(--lime)] hover:text-white ml-1"><X size={12} /></button>
                    </span>
                  )}
                </div>
              )}

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
                <div className="flex items-center gap-4 flex-wrap">
                  <h2 className="text-xl font-display tracking-tight">
                    <span className="text-[var(--w)]">
                      {mcTotalCount > 0 ? (mcTotalCount + filteredDeals.length).toLocaleString() : filteredDeals.length}
                    </span> <span className="text-[var(--mu2)]">{t.verifiedDeals}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-[var(--mu2)] flex items-center gap-1.5 bg-[var(--s2)] px-3 py-1.5 rounded-full border border-[var(--b2)]">
                      <span>{displayMode === 'lease' ? t.lease : t.finance}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--mu)]"></span>
                      <span>{selectedTerm} {t.moShort}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--mu)]"></span>
                      <span>{fmt(downPayment)} {t.down}</span>
                    </p>
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
                      <option value="popular">{language === 'ru' ? 'Популярность' : 'Trending'}</option>
                      <option value="price_asc">Price (Low - High)</option>
                      <option value="price_desc">Price (High - Low)</option>
                      <option value="recent">{language === 'ru' ? 'Новинки' : 'Recently Added'}</option>
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
                          <div className="flex gap-2">
                            <div className="h-10 bg-[var(--s2)] rounded-xl flex-1 animate-pulse" />
                            <div className="h-10 bg-[var(--s2)] rounded-xl flex-[2] animate-pulse" />
                          </div>
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
                      <div className="absolute top-3 left-3 flex flex-col gap-2 z-20 hover:z-30">
                        {deal.isSoldOut ? (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            {language === 'ru' ? 'ПРОДАНО' : 'SOLD OUT'}
                          </span>
                        ) : deal.hot ? (
                          <span className="flex items-center gap-1 bg-[var(--lime)] text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            🔥 {language === 'ru' ? 'ХИТ ПРОДАЖ' : 'TOP SELLER'}
                          </span>
                        ) : (deal.viewCount && deal.viewCount > 50) ? (
                          <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            {language === 'ru' ? 'ПОПУЛЯРНОЕ' : 'POPULAR'}
                          </span>
                        ) : null}

                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit relative",
                          deal.savingsPctObj > 0 ? 'bg-[#00E58F] text-black' : 'bg-[var(--s2)] text-[var(--mu2)] border border-[var(--b2)] backdrop-blur-md'
                        )}>
                          {deal.savingsPctObj > 0 
                            ? `${(deal.savingsPctObj * 100).toFixed(1)}% ${language === 'ru' ? 'СКИДКА' : 'OFF MSRP'}`
                            : `0% ${language === 'ru' ? 'СКИДКА' : 'OFF MSRP'}`
                          }
                        </span>

                        {(deal.class?.toLowerCase() === 'ev' || deal.fuelType?.toLowerCase() === 'electric') && (
                          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            ⚡ EV
                          </span>
                        )}
                      </div>
                    </div>

                      {/* Content Section - Bottom */}
                      <div className="p-5 flex-1 flex flex-col pt-4">
                        {/* 1. Vehicle Identity */}
                        <div className="mb-3 flex justify-between items-start">
                          <h3 className="font-display text-xl tracking-tight leading-tight text-[var(--w)] line-clamp-2 min-h-[3.3rem]">
                            {deal.year} {deal.make} {deal.model} <span className="text-[var(--mu2)] font-sans text-sm tracking-normal">{deal.trim}</span>
                          </h3>
                        </div>

                        {/* 2. Contract / Price Box */}
                        <div className="border border-[var(--b2)] rounded-2xl p-4 bg-[var(--s2)]/40 mb-4 relative flex flex-col justify-center">
                          <div className="text-[10px] uppercase font-bold text-[var(--mu2)] mb-1 tracking-widest">
                            {displayMode === 'lease' ? t.lease : t.finance}
                          </div>
                          
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="font-display text-4xl text-[var(--w)] leading-none">
                              {fmt(deal.displayPayment)}
                            </span>
                            <span className="text-xs text-[var(--mu2)] font-bold">/mo.</span>
                          </div>
                          
                          <div className="text-[11px] text-[var(--mu2)] flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                            <span><span className="text-[var(--w)]">+{fmt(downPayment)}</span> due</span>
                            <span className="text-[var(--mu)] opacity-50">•</span>
                            <span><span className="text-[var(--w)]">{deal.displayTerm}</span> mo</span>
                            {displayMode === 'lease' && selectedMileage && (
                              <>
                                <span className="text-[var(--mu)] opacity-50">•</span>
                                <span><span className="text-[var(--w)]">{selectedMileage.replace('k', ',000')}</span> mi/yr</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* 3. Discounts & Incentives Pill */}
                        <div className="flex justify-between items-center mb-5 mt-auto">
                          <span className="text-xs font-medium text-[var(--mu2)]">Discounts & Incentives</span>
                          {deal.badgeTotalSavings > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {deal.discountPercent > 0 && (
                                <span className="text-[10px] font-mono text-[var(--grn)] uppercase font-bold tracking-widest bg-[var(--grn)]/10 px-1.5 py-0.5 rounded border border-[var(--grn)]/20">
                                  -{deal.discountPercent.toFixed(1)}%
                                </span>
                              )}
                              {deal.badgeTotalSavings > 0 && (
                                <span className="bg-[var(--grn)]/10 text-[var(--grn)] text-[11px] font-bold px-2.5 py-1 rounded-md border border-[var(--grn)]/20 shadow-sm whitespace-nowrap">
                                  - {fmt(deal.badgeTotalSavings)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-[var(--mu2)]">—</span>
                          )}
                        </div>

                        {/* 4. Actions */}
                        <div className="space-y-2 mt-auto">
                          {/* External Links */}
                          {(deal.vdp_url || deal.dealer_website || deal.window_sticker_url) && (
                            <div className="flex gap-2 mb-3">
                              {(deal.vdp_url || deal.dealer_website) && (
                                <a 
                                  href={(deal.vdp_url || deal.dealer_website).startsWith('http') ? (deal.vdp_url || deal.dealer_website) : `https://${deal.vdp_url || deal.dealer_website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--s2)] hover:bg-[var(--s1)] border border-[var(--b2)] hover:border-[var(--mu)] text-[9px] font-bold uppercase tracking-widest text-[var(--w)] transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <ExternalLink size={12} className="text-[var(--lime)] shrink-0" />
                                  <span className="truncate">Dealer Page</span>
                                </a>
                              )}
                              {deal.window_sticker_url && (
                                <a 
                                  href={deal.window_sticker_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--s2)] hover:bg-[var(--s1)] border border-[var(--b2)] hover:border-[var(--mu)] text-[9px] font-bold uppercase tracking-widest text-[var(--w)] transition-colors flex items-center justify-center gap-1.5"
                                >
                                  <FileText size={12} className="text-[var(--lime)] shrink-0" />
                                  <span className="truncate">Sticker</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Primary CTA */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(deal);
                            }}
                            className="w-full h-11 bg-[var(--lime)] text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--lime)]/5"
                          >
                            View Deal
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

        {/* Popular Searches / Quick Categories - temporarily hidden */}
        {/* <div className="mt-32 pt-16 border-t border-[var(--b2)]">...</div> */}
      </div>
    </div>
  );
};

export default DealsPage;

