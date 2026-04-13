import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { CatalogCard } from '../components/CatalogCard';
import { CompareBar } from '../components/CompareBar';
import { Search, SlidersHorizontal, ChevronDown, X, Loader2 } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { fetchWithCache } from '../utils/fetchWithCache';
import { useDebounce } from '../hooks/useDebounce';
import { cn } from '../utils/cn';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguageStore();
  const t = translations[language];

  // State
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedMake, setSelectedMake] = useState(searchParams.get('make') || 'All');
  const [displayMode, setDisplayMode] = useState<'lease' | 'finance'>(
    (searchParams.get('mode') as 'lease' | 'finance') || 'lease'
  );
  const [selectedTerm, setSelectedTerm] = useState(parseInt(searchParams.get('term') || '36'));
  const [maxPayment, setMaxPayment] = useState(parseInt(searchParams.get('maxPay') || '1500'));
  const [downPayment, setDownPayment] = useState(parseInt(searchParams.get('down') || '0'));
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'payment');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBodyStyle, setSelectedBodyStyle] = useState('All');

  const debouncedDown = useDebounce(downPayment, 500);

  // Fetch catalog
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      term: selectedTerm.toString(),
      down: debouncedDown.toString(),
      sort: sortBy
    });

    if (selectedMake !== 'All') params.set('make', selectedMake);
    if (maxPayment < 1500) params.set('maxPrice', maxPayment.toString());

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
  }, [selectedMake, selectedTerm, debouncedDown, sortBy, maxPayment]);

  // Derived data
  const makes = useMemo(() => {
    const all = Array.from(new Set(items.map(i => i.make))).sort();
    return ['All', ...all];
  }, [items]);

  const bodyStyles = useMemo(() => {
    const all = Array.from(new Set(items.filter(i => i.bodyStyle).map(i => i.bodyStyle))).sort();
    return ['All', ...all];
  }, [items]);

  // Client-side filtering (search, body style)
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

    // Payment filter
    result = result.filter(i => {
      const pay = displayMode === 'lease' ? i.leasePayment : i.financePayment;
      return pay !== null && pay <= maxPayment;
    });

    return result;
  }, [items, searchQuery, selectedBodyStyle, displayMode, maxPayment]);

  // Stats
  const totalCount = filteredItems.length;
  const avgPayment = totalCount > 0
    ? Math.round(filteredItems.reduce((sum, i) => sum + (displayMode === 'lease' ? (i.leasePayment || 0) : (i.financePayment || 0)), 0) / totalCount)
    : 0;

  return (
    <>
      <SEO
        title="Vehicle Catalog | AutoBandit"
        description="Browse our calculated vehicle catalog with real lease and finance payments. Every price is verified."
      />

      <div className="min-h-screen bg-[var(--bg)]">
        {/* Header */}
        <div className="border-b border-[var(--b1)] bg-[var(--s1)]">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-2">Vehicle Catalog</h1>
            <p className="text-[var(--mu)] text-sm">
              Every vehicle comes with a verified, calculated payment — no hidden fees, no surprises.
            </p>

            {/* Quick stats */}
            {!isLoading && (
              <div className="flex gap-6 mt-4 text-xs">
                <div>
                  <span className="text-[var(--mu)]">Vehicles: </span>
                  <span className="font-bold text-[var(--lime)]">{totalCount}</span>
                </div>
                <div>
                  <span className="text-[var(--mu)]">Avg Payment: </span>
                  <span className="font-bold text-[var(--lime)]">{fmt(avgPayment)}/mo</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mu)]" />
              <input
                type="text"
                placeholder="Search make, model, or trim..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--s1)] border border-[var(--b1)] rounded-xl text-sm focus:border-[var(--lime)] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={14} className="text-[var(--mu)]" />
                </button>
              )}
            </div>

            {/* Make filter */}
            <select
              value={selectedMake}
              onChange={e => setSelectedMake(e.target.value)}
              className="px-4 py-2.5 bg-[var(--s1)] border border-[var(--b1)] rounded-xl text-sm focus:border-[var(--lime)] focus:outline-none"
            >
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* Lease / Finance toggle */}
            <div className="flex bg-[var(--s1)] border border-[var(--b1)] rounded-xl overflow-hidden">
              <button
                onClick={() => setDisplayMode('lease')}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
                  displayMode === 'lease' ? 'bg-blue-500 text-white' : 'text-[var(--mu)] hover:text-white'
                )}
              >
                Lease
              </button>
              <button
                onClick={() => setDisplayMode('finance')}
                className={cn(
                  "px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors",
                  displayMode === 'finance' ? 'bg-emerald-500 text-white' : 'text-[var(--mu)] hover:text-white'
                )}
              >
                Finance
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-[var(--s1)] border border-[var(--b1)] rounded-xl text-sm focus:border-[var(--lime)] focus:outline-none"
            >
              <option value="payment">Lowest Payment</option>
              <option value="msrp">Lowest MSRP</option>
              <option value="savings">Best Savings</option>
            </select>

            {/* More filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm transition-colors",
                showFilters ? 'border-[var(--lime)] text-[var(--lime)]' : 'border-[var(--b1)] text-[var(--mu)] hover:border-[var(--lime)]'
              )}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="bg-[var(--s1)] border border-[var(--b1)] rounded-2xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Term */}
                  <div>
                    <label className="text-[10px] text-[var(--mu)] uppercase tracking-wider font-bold mb-1 block">Term</label>
                    <select
                      value={selectedTerm}
                      onChange={e => setSelectedTerm(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--b1)] rounded-lg text-sm"
                    >
                      <option value={24}>24 months</option>
                      <option value={36}>36 months</option>
                      <option value={48}>48 months</option>
                    </select>
                  </div>

                  {/* Down Payment */}
                  <div>
                    <label className="text-[10px] text-[var(--mu)] uppercase tracking-wider font-bold mb-1 block">Down Payment</label>
                    <input
                      type="number"
                      value={downPayment}
                      onChange={e => setDownPayment(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--b1)] rounded-lg text-sm"
                      placeholder="$0"
                      min={0}
                      step={500}
                    />
                  </div>

                  {/* Max Payment */}
                  <div>
                    <label className="text-[10px] text-[var(--mu)] uppercase tracking-wider font-bold mb-1 block">Max Payment</label>
                    <input
                      type="range"
                      min={200}
                      max={2000}
                      step={50}
                      value={maxPayment}
                      onChange={e => setMaxPayment(parseInt(e.target.value))}
                      className="w-full accent-[var(--lime)]"
                    />
                    <div className="text-xs text-[var(--mu)] mt-1">{fmt(maxPayment)}/mo</div>
                  </div>

                  {/* Body Style */}
                  <div>
                    <label className="text-[10px] text-[var(--mu)] uppercase tracking-wider font-bold mb-1 block">Body Style</label>
                    <select
                      value={selectedBodyStyle}
                      onChange={e => setSelectedBodyStyle(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--s2)] border border-[var(--b1)] rounded-lg text-sm"
                    >
                      {bodyStyles.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[var(--lime)]" />
              <span className="ml-3 text-[var(--mu)] text-sm">Calculating payments...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center py-20">
              <p className="text-red-400 text-sm mb-2">Failed to load catalog</p>
              <p className="text-[var(--mu)] text-xs">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-[var(--lime)] text-black rounded-lg text-sm font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && filteredItems.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[var(--mu)] text-lg mb-2">No vehicles match your criteria</p>
              <p className="text-[var(--mu2)] text-sm">Try adjusting your filters or increasing the max payment</p>
            </div>
          )}

          {/* Grid */}
          {!isLoading && !error && filteredItems.length > 0 && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
            >
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  <CatalogCard item={item} displayMode={displayMode} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <CompareBar />
    </>
  );
};
