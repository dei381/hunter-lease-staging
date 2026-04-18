import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { CompareBar } from '../components/CompareBar';
import { Search, SlidersHorizontal, ChevronRight, X, Loader2, Settings2, Filter, Heart, Tag, Camera } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import { useDebounce } from '../hooks/useDebounce';
import { cn } from '../utils/cn';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const CatalogPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const t = translations[language].deals;
  const { addToCompare, removeFromCompare, isInCompare } = useGarageStore();

  // Data
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deal assumptions (sidebar section A)
  const [displayMode, setDisplayMode] = useState<'lease' | 'finance'>(
    (searchParams.get('mode') as 'lease' | 'finance') || 'lease'
  );
  const [tier, setTier] = useState('t1');
  const [downPayment, setDownPayment] = useState(parseInt(searchParams.get('down') || '3000'));
  const [selectedTerm, setSelectedTerm] = useState(parseInt(searchParams.get('term') || '36'));
  const [selectedMileage, setSelectedMileage] = useState('10k');

  // Filters (sidebar section B)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedMake, setSelectedMake] = useState(searchParams.get('make') || 'All');
  const [selectedBodyStyle, setSelectedBodyStyle] = useState('All');
  const [maxPayment, setMaxPayment] = useState(parseInt(searchParams.get('maxPay') || '3000'));
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'payment');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedDown = useDebounce(downPayment, 500);

  // Fetch catalog
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const mileageNum = parseInt(selectedMileage.replace('k', '')) * 1000;
    const params = new URLSearchParams({
      term: selectedTerm.toString(),
      down: debouncedDown.toString(),
      mileage: mileageNum.toString(),
      tier,
      sort: sortBy
    });

    if (selectedMake !== 'All') params.set('make', selectedMake);
    if (maxPayment < 3000) params.set('maxPrice', maxPayment.toString());

    fetch(`/api/v2/catalog?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setItems(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch catalog:', err);
        setError(err.message);
        setIsLoading(false);
      });
  }, [selectedMake, selectedTerm, debouncedDown, sortBy, maxPayment, tier, selectedMileage]);

  // Derived data
  const makes = useMemo(() => {
    const all = Array.from(new Set(items.map(i => i.make))).sort();
    return ['All', ...all];
  }, [items]);

  const bodyStyles = useMemo(() => {
    const all = Array.from(new Set(items.filter(i => i.bodyStyle).map(i => i.bodyStyle))).sort();
    return ['All', ...all];
  }, [items]);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.make.toLowerCase().includes(q) ||
        i.model.toLowerCase().includes(q) ||
        i.trim.toLowerCase().includes(q)
      );
    }

    if (selectedBodyStyle !== 'All') {
      result = result.filter(i => i.bodyStyle === selectedBodyStyle);
    }

    result = result.filter(i => {
      const pay = displayMode === 'lease' ? i.leasePayment : i.financePayment;
      return pay !== null && pay <= maxPayment;
    });

    return result;
  }, [items, searchQuery, selectedBodyStyle, displayMode, maxPayment]);

  const handleCardClick = (item: any) => {
    navigate(`/catalog/${item.id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] pt-4 pb-32 font-sans">
      <SEO
        title={`${selectedMake !== 'All' ? selectedMake + ' ' : ''}Vehicle Catalog | AutoBandit`}
        description="Browse our calculated vehicle catalog with real lease and finance payments. Every price is verified."
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="mb-6 mt-2 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl tracking-tighter leading-none mb-2">
              {t.title}
            </h1>
            <p className="text-[var(--mu2)] text-sm max-w-2xl">
              {language === 'ru'
                ? 'Каждый автомобиль с проверенным расчётом платежа — без скрытых комиссий.'
                : 'Every vehicle comes with a verified, calculated payment — no hidden fees, no surprises.'}
            </p>
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
                  <p className="text-[10px] text-[var(--mu2)] leading-relaxed">
                    {language === 'ru' ? 'Платежи обновляются в реальном времени.' : 'Payments update in real time based on your assumptions.'}
                  </p>
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

                {/* Mileage (Lease Only) */}
                {displayMode === 'lease' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.annualMileage}</label>
                    <select
                      value={selectedMileage}
                      onChange={(e) => setSelectedMileage(e.target.value)}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-2.5 px-3 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                    >
                      <option value="7.5k">{t.mileageOptions?.['7.5k'] || '7,500'} {t.milesYr}</option>
                      <option value="10k">{t.mileageOptions?.['10k'] || '10,000'} {t.milesYr}</option>
                      <option value="12k">{t.mileageOptions?.['12k'] || '12,000'} {t.milesYr}</option>
                      <option value="15k">{t.mileageOptions?.['15k'] || '15,000'} {t.milesYr}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Section B: Search + Filters */}
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
                    onChange={(e) => setSelectedMake(e.target.value)}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl py-3 px-4 text-sm font-bold text-[var(--w)] outline-none focus:border-[var(--lime)] transition-all appearance-none cursor-pointer"
                  >
                    {makes.map((make, idx) => (
                      <option key={`${make}-${idx}`} value={make}>{make === 'All' ? (t.allMakes || 'All Makes') : make}</option>
                    ))}
                  </select>
                </div>

                {/* Body Style Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.bodyStyle}</h4>
                    <button onClick={() => setSelectedBodyStyle('All')} className="text-[10px] text-[var(--lime)] font-bold uppercase hover:underline">{t.all || 'All'}</button>
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
                          {(t.bodyStyles as any)?.[style.id] || style.id}
                        </span>
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
                    setSelectedBodyStyle('All');
                    setMaxPayment(3000);
                    setSearchQuery('');
                    setTier('t1');
                    setDownPayment(3000);
                    setSelectedTerm(36);
                    setSelectedMileage('10k');
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
                    <span className="text-[var(--w)]">{filteredItems.length}</span> <span className="text-[var(--mu2)]">{t.verifiedDeals || 'vehicles'}</span>
                  </h2>
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)]">
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{displayMode === 'lease' ? t.lease : t.finance}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{t.tier || 'Tier'} {tier.replace('t', '')}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{fmt(downPayment)} {t.down || 'down'}</span>
                    <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{selectedTerm} {t.moShort || 'mo'}</span>
                    {displayMode === 'lease' && <span className="px-2 py-1 bg-[var(--s1)] rounded border border-[var(--b2)]">{selectedMileage}/{t.yrShort || 'yr'}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.sort || 'Sort'}:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent text-xs font-bold uppercase tracking-widest outline-none cursor-pointer text-[var(--w)]"
                    >
                      <option value="payment">{t.lowestPayment || 'Lowest Payment'}</option>
                      <option value="savings">{t.highestSavings || 'Highest Savings'}</option>
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
                {isLoading ? (
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
                ) : error ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full text-center py-20"
                  >
                    <p className="text-red-400 text-sm mb-2">Failed to load catalog</p>
                    <p className="text-[var(--mu)] text-xs">{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[var(--lime)] text-black rounded-lg text-sm font-bold">Retry</button>
                  </motion.div>
                ) : filteredItems.length > 0 ? filteredItems.map(item => {
                  const payment = displayMode === 'lease' ? item.leasePayment : item.financePayment;
                  const itemId = item.id;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => handleCardClick(item)}
                      className="group bg-[var(--s1)] border border-[var(--b2)] hover:border-[var(--lime)]/50 rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col h-full shadow-sm hover:shadow-xl"
                    >
                      {/* Image Section */}
                      <div className="relative w-full aspect-[16/10] bg-[var(--s2)] overflow-hidden shrink-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={`${item.year} ${item.make} ${item.model} ${item.trim}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.03] to-white/[0.08]">
                            <Camera size={24} className="text-white/15" />
                            <span className="text-white/20 text-[9px] uppercase font-bold tracking-widest">Photos soon</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                        {/* Badges */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                          <span className="bg-white/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit">
                            Verified
                          </span>
                          {item.savings > 0 && (
                            <span className="bg-[var(--lime)] text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-widest shadow-sm w-fit flex items-center gap-1">
                              <Tag size={10} />
                              {fmt(item.savings)} off
                            </span>
                          )}
                        </div>

                        {/* Save */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isInCompare(itemId)) removeFromCompare(itemId);
                              else addToCompare(item);
                            }}
                            className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
                          >
                            <Heart size={16} className={isInCompare(itemId) ? "fill-[var(--lime)] text-[var(--lime)]" : "text-white"} />
                          </button>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-5 flex-1 flex flex-col">
                        {/* Vehicle Identity */}
                        <div className="mb-4">
                          <h3 className="font-display text-xl tracking-tight leading-tight mb-1 text-[var(--w)] line-clamp-2">
                            {item.year} {item.make} {item.model} {item.trim}
                          </h3>
                        </div>

                        {/* Payment */}
                        <div className="mb-4 bg-[var(--s2)] rounded-xl p-4 border border-[var(--b2)] shadow-inner">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold">
                              {displayMode === 'lease' ? 'Est. Lease' : 'Est. Finance'}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="font-display text-3xl text-[var(--lime)] leading-none">
                                {payment !== null ? fmt(payment) : '—'}
                              </span>
                              <span className="text-xs text-[var(--mu2)] font-bold">/mo</span>
                            </div>
                          </div>

                          {/* Term + Due at signing */}
                          <div className="flex justify-between items-center text-[11px] text-[var(--mu2)] pt-3 border-t border-[var(--b2)] mt-3">
                            <span>{selectedTerm} months</span>
                            <span>
                              <strong className="text-[var(--w)]">{fmt(downPayment)}</strong> {displayMode === 'lease' ? 'due at signing' : 'down'}
                            </span>
                          </div>
                        </div>

                        {/* MSRP / Savings */}
                        <div className="flex items-center justify-between mb-6 text-xs bg-[var(--s1)] p-3 rounded-lg border border-[var(--b2)]">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold">{t.msrp || 'MSRP'}</span>
                            <span className="font-mono text-[var(--w)]">{fmt(item.msrp)}</span>
                          </div>
                          {item.savings > 0 && (
                            <div className="flex flex-col text-right">
                              <span className="text-[10px] text-[var(--grn)] uppercase tracking-widest font-bold">{t.totalSavings || 'Savings'}</span>
                              <span className="font-mono text-[var(--grn)] font-bold bg-[var(--grn)]/10 px-2 py-0.5 rounded">{fmt(item.savings)}</span>
                            </div>
                          )}
                        </div>

                        {/* CTA */}
                        <div className="mt-auto flex flex-col gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isInCompare(itemId)) removeFromCompare(itemId);
                              else addToCompare(item);
                            }}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border ${
                              isInCompare(itemId)
                                ? 'bg-[var(--s2)] text-[var(--w)] border-[var(--lime)]'
                                : 'bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)]'
                            }`}
                          >
                            <div className={`w-3 h-3 rounded-sm border flex items-center justify-center transition-colors ${isInCompare(itemId) ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--mu2)]'}`}>
                              {isInCompare(itemId) && <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-2 h-2 text-black"><path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            {isInCompare(itemId) ? 'Added to Compare' : 'Compare'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/catalog/${item.id}`);
                            }}
                            className="w-full py-3 bg-[var(--lime)] text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--lime)]/10"
                          >
                            {language === 'ru' ? 'Подробнее' : 'View Deal Details'} <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full py-24 flex flex-col items-center justify-center text-center bg-[var(--s1)] border border-dashed border-[var(--b2)] rounded-3xl"
                  >
                    <Search className="w-12 h-12 text-[var(--mu2)] mb-4 opacity-20" />
                    <h3 className="text-2xl font-display mb-2">{t.noDeals || 'No vehicles found'}</h3>
                    <p className="text-sm text-[var(--mu)] max-w-sm mx-auto">{t.noDealsDesc || 'Try adjusting your filters'}</p>
                    <button
                      onClick={() => {
                        setSelectedMake('All');
                        setSelectedBodyStyle('All');
                        setMaxPayment(3000);
                        setSearchQuery('');
                        setTier('t1');
                        setDownPayment(3000);
                      }}
                      className="mt-6 px-6 py-3 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      {t.clearFilters || 'Clear Filters'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <CompareBar />
    </div>
  );
};

export default CatalogPage;
