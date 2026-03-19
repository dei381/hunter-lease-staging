import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, MapPin, Calendar, Tag, Info, ExternalLink } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const Inventory = () => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    make: '',
    model: '',
    year: '',
    state: '',
    minPrice: '',
    maxPrice: ''
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      setListings(data);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAutoComplete = async (field: string, input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/search/auto-complete?field=${field}&input=${input}`);
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions.map((s: any) => s.name || s));
      }
    } catch (err) {
      console.error('Auto-complete failed', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] py-12 px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="font-display text-5xl tracking-tight uppercase">Live Inventory</h1>
            <p className="text-[var(--mu2)] uppercase text-[10px] font-bold tracking-widest">Real-time data from 200+ dealers in LA</p>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)]" />
              <input 
                type="text"
                placeholder="Search Make..."
                className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl py-3 pl-10 pr-4 text-xs font-bold uppercase tracking-widest focus:border-[var(--lime)] outline-none transition-all"
                value={filters.make}
                onChange={(e) => {
                  setFilters({ ...filters, make: e.target.value });
                  handleAutoComplete('make', e.target.value);
                  setActiveField('make');
                }}
                onBlur={() => setTimeout(() => setActiveField(null), 200)}
              />
              {activeField === 'make' && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--s2)] border border-[var(--b2)] rounded-xl overflow-hidden z-50 shadow-2xl">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i}
                      className="w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime)] hover:text-white transition-colors border-b border-[var(--b1)] last:border-0"
                      onClick={() => {
                        setFilters({ ...filters, make: s });
                        setSuggestions([]);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              onClick={fetchInventory}
              className="bg-[var(--lime)] text-white px-8 py-3 rounded-xl font-display text-lg tracking-widest hover:bg-[var(--lime2)] transition-all"
            >
              Search
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-2 text-[var(--lime)]">
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-[var(--mu2)] uppercase font-bold tracking-widest">Model</label>
                  <input 
                    type="text"
                    className="w-full bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-[var(--lime)]"
                    value={filters.model}
                    onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-[var(--mu2)] uppercase font-bold tracking-widest">Year</label>
                  <select 
                    className="w-full bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-[var(--lime)]"
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  >
                    <option value="">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--mu2)] uppercase font-bold tracking-widest">Min Price</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-[var(--lime)]"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-[var(--mu2)] uppercase font-bold tracking-widest">Max Price</label>
                    <input 
                      type="number"
                      className="w-full bg-[var(--s2)] border border-[var(--b1)] rounded-lg p-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-[var(--lime)]"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="md:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-12 text-center space-y-4">
                <div className="text-4xl font-display opacity-20">NO RESULTS</div>
                <p className="text-[var(--mu2)] uppercase text-[10px] font-bold tracking-widest">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {listings.map((listing, i) => (
                  <motion.div 
                    key={listing.vin}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-4 flex flex-col md:flex-row gap-6 hover:border-[var(--lime)]/30 transition-all group"
                  >
                    <div className="w-full md:w-48 h-32 bg-[var(--s2)] rounded-xl overflow-hidden shrink-0 relative">
                      {listing.photoUrl ? (
                        <img src={listing.photoUrl} alt={listing.model} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--mu2)] text-[10px] font-bold uppercase">No Photo</div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest">
                        {listing.year}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-display text-xl leading-none">{listing.make} {listing.model}</h3>
                            <p className="text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest mt-1">{listing.trim || 'Standard Trim'}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-display text-[var(--lime)]">{formatCurrency(listing.price)}</div>
                            <div className="text-[8px] text-[var(--mu2)] font-bold uppercase tracking-widest">MSRP {formatCurrency(listing.msrp)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-[var(--mu2)]">
                          <MapPin className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{listing.dealerCity}, {listing.dealerState}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--mu2)]">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{listing.dom} Days on Market</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--mu2)]">
                          <Tag className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{listing.fuelType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--mu2)]">
                          <Info className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">VIN: {listing.vin.slice(-6)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-2">
                      <button className="bg-[var(--lime)] text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[var(--lime2)] transition-all">
                        Get Deal
                      </button>
                      <button className="bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:border-[var(--b3)] transition-all flex items-center justify-center gap-2">
                        Details <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
