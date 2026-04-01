import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Filter, Info, TrendingDown, Eye, Heart, Scale } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useSettingsStore } from '../store/settingsStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import { TransparencyModal } from './TransparencyModal';
import { ComparisonTray } from './ComparisonTray';
import { InventoryAlertModal } from './InventoryAlertModal';
import { DealCard } from './DealCard';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const DealsGrid = ({ onSelect, filter = '', limit }: { onSelect?: (deal: any) => void, filter?: string, limit?: number }) => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const { toggleDeal, isSaved, addToCompare, removeFromCompare, isInCompare, compareDeals } = useGarageStore();
  const t = translations[language].deals;
  const tc = translations[language].compare;
  const td = translations[language].deposit;
  const tcalc = translations[language].calc;
  const at = (translations[language] as any).alerts;
  const [deals, setDeals] = useState<any[]>([]);
  const [maxPayment, setMaxPayment] = useState(1000);
  const [selectedClass, setSelectedClass] = useState('All');
  const [displayMode, setDisplayMode] = useState<'lease' | 'finance'>('lease');
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [hasCosigner, setHasCosigner] = useState(false);
  const [transparencyDeal, setTransparencyDeal] = useState<any>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/deals')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch deals');
        return res.json();
      })
      .then(data => {
        if (!Array.isArray(data)) {
          console.error('Expected array of deals, got:', data);
          return;
        }
        // Deduplicate deals by make + model + trim
        const uniqueDealsMap = new Map();
        data.forEach((deal: any) => {
          const key = `${deal.make}-${deal.model}-${deal.trim}`;
          if (!uniqueDealsMap.has(key) || deal.type === 'lease') {
            uniqueDealsMap.set(key, deal);
          }
        });
        const uniqueDeals = Array.from(uniqueDealsMap.values());

        // Use deals as returned from server
        const recalculated = uniqueDeals.map((deal: any) => {
          return {
            ...deal,
            payment: Number(deal.payment) || 0,
            down: Number(deal.down) || 3000,
            mileage: ['Kia', 'Hyundai'].includes(deal.make) ? '10k' : '7.5k'
          };
        });
        setDeals(recalculated);
      })
      .catch(err => console.error('Failed to fetch deals:', err));
  }, []);

  const classes = useMemo(() => ['All', ...Array.from(new Set(deals.map(d => d.class)))], [deals]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const processedDeals = useMemo(() => {
    return deals.map(deal => {
      let currentPayment = Number(deal.payment) || 0;
      let currentType = displayMode;
      let currentTerm = deal.term || '36';
      
      if (displayMode === 'finance') {
        currentPayment = Number(deal.financePayment) || currentPayment;
        currentType = 'finance';
        currentTerm = '60';
      } else if (displayMode === 'lease' && deal.type === 'finance') {
        currentPayment = Number(deal.payment) || 0;
        currentType = 'lease';
        currentTerm = '36';
      }

      return {
        ...deal,
        displayPayment: currentPayment,
        displayType: currentType,
        displayTerm: currentTerm
      };
    });
  }, [deals, displayMode]);

  const effectiveFTB = isFirstTimeBuyer && !hasCosigner;

  const filteredDeals = processedDeals.filter(deal => {
    const matchesSearch = deal.make.toLowerCase().includes(filter.toLowerCase()) || 
                         deal.model.toLowerCase().includes(filter.toLowerCase());
    const matchesPayment = (deal.displayPayment || 0) <= maxPayment;
    const matchesClass = selectedClass === 'All' || deal.class === selectedClass;
    const matchesFTB = !effectiveFTB || deal.isFirstTimeBuyerEligible !== false;
    
    return matchesSearch && matchesPayment && matchesClass && matchesFTB;
  });

  const displayedDeals = limit ? filteredDeals.slice(0, limit) : filteredDeals;

  return (
    <div className="space-y-8">
      {/* Advanced Filters */}
      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-4 flex flex-wrap gap-6 items-end">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest block">{t.maxPayment}</label>
            <span className="bg-[var(--lime)]/10 text-[var(--lime)] px-2 py-0.5 rounded text-[10px] font-bold font-mono">{fmt(maxPayment)}</span>
          </div>
          <input 
            type="range" min="200" max="1500" step="50" 
            value={maxPayment} 
            onChange={(e) => setMaxPayment(parseInt(e.target.value))}
            className="w-48 accent-[var(--lime)] cursor-pointer"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest block">{t.class}</label>
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-[var(--s2)] border border-[var(--b2)] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[var(--lime)]"
          >
            {classes.map(c => <option key={c} value={c}>{c === 'All' ? t.all : c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest block">{translations[language].calc.dealType}</label>
          <div className="flex bg-[var(--s2)] p-1 rounded-xl border border-[var(--b2)]">
            {['lease', 'finance'].map(type => (
              <button
                key={type}
                onClick={() => setDisplayMode(type as 'lease' | 'finance')}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${displayMode === type ? 'bg-[var(--w)] text-white shadow-sm' : 'text-[var(--mu2)] hover:text-[var(--w)]'}`}
              >
                {type === 'lease' ? t.lease : t.finance}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest block">{t.buyerStatus}</label>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsFirstTimeBuyer(!isFirstTimeBuyer);
                if (isFirstTimeBuyer) setHasCosigner(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isFirstTimeBuyer 
                  ? 'bg-[var(--lime)] text-white border-[var(--lime)]' 
                  : 'bg-[var(--s2)] text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)]'
              }`}
            >
              {isFirstTimeBuyer ? t.firstTimeBuyer : t.experiencedBuyer}
            </button>
            {isFirstTimeBuyer && (
              <label className="flex items-center gap-2 text-xs text-[var(--mu2)] cursor-pointer hover:text-[var(--w)] transition-colors">
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

        <div className="ml-auto flex items-center gap-3 bg-[var(--s2)] px-4 py-2 rounded-xl border border-[var(--b2)]">
          <div className="flex items-center gap-2 text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest">
            <Filter className="w-3 h-3 text-[var(--lime)]" /> {t.dealsFound}: <span className="text-[var(--w)]">{filteredDeals.length}</span>
          </div>
        </div>

        <button 
          onClick={() => setIsAlertModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-xl text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest hover:bg-[var(--lime)]/20 transition-all"
        >
          <TrendingDown className="w-3 h-3" /> {(translations[language] as any).alerts.btnNotify}
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedDeals.length > 0 ? displayedDeals.map(deal => (
          <div 
            key={deal.id}
            onClick={() => {
              if (onSelect) {
                onSelect({ ...deal, isFirstTimeBuyer: effectiveFTB, hasCosigner });
              } else {
                navigate(`/deal/${deal.id}`);
              }
            }}
            className={`bg-[var(--s1)] border border-[var(--b1)] rounded-2xl overflow-hidden transition-all hover:border-[var(--lime)]/40 hover:-translate-y-1 cursor-pointer relative group ${deal.hot ? 'ring-1 ring-[var(--lime)]/20' : ''}`}
          >
            {deal.hot && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--lime)] to-[var(--teal)]" />}
            
            <div className="relative h-48 overflow-hidden group">
              {deal.image ? (
                <img 
                  src={deal.image} 
                  alt={`${deal.make} ${deal.model}`} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-[var(--s2)] flex items-center justify-center">
                  <span className="text-[var(--mu2)] text-xs uppercase font-bold tracking-widest">No Image</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--s1)]/80 to-transparent opacity-60" />
              
              <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5">
                <div className="flex gap-1.5">
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md uppercase ${deal.displayType === 'lease' ? 'bg-blue-500 text-white' : 'bg-[var(--grn)] text-white'}`}>
                    {deal.displayType === 'lease' ? t.lease : t.finance}
                  </span>
                  {deal.hot && <span className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase bg-[var(--lime)] text-black">🔥 {t.hot}</span>}
                </div>
                {(deal.class?.toLowerCase() === 'ev' || deal.fuelType?.toLowerCase() === 'electric') && (
                  <span className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 backdrop-blur-md">
                    ⚡ {t.evBadge}
                  </span>
                )}
              </div>

              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDeal(deal.id);
                  }}
                  className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
                >
                  <Heart 
                    size={16} 
                    className={isSaved(deal.id) ? "fill-[var(--lime)] text-[var(--lime)]" : "text-white"} 
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isInCompare(deal.id)) {
                      removeFromCompare(deal.id);
                    } else {
                      addToCompare(deal);
                    }
                  }}
                  className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                    isInCompare(deal.id) 
                      ? 'bg-[var(--lime)] text-white' 
                      : 'bg-black/40 text-white hover:bg-black/60'
                  }`}
                >
                  <Scale size={16} />
                </button>
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="text-[var(--grn)] font-bold text-[10px] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                  −{fmt(deal.savings)} {t.totalSavings}
                </div>
              </div>
            </div>

            <div className="p-5 border-b border-[var(--b1)]">
              <h3 className="font-display text-2xl tracking-tight leading-tight mb-1">{deal.make} {deal.model}</h3>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-[var(--mu)] font-bold uppercase tracking-widest">{deal.trim}</p>
                <div className="flex items-center gap-2">
                  {deal.displayType === 'lease' && (
                    <span className="text-[9px] text-[var(--lime)] font-bold bg-[var(--lime)]/10 px-2 py-0.5 rounded-full">
                      {tcalc.mileageOptions[deal.mileage as keyof typeof tcalc.mileageOptions]} {tcalc.miles}
                    </span>
                  )}
                  <span className="text-[9px] text-[var(--mu2)] bg-[var(--s2)] px-2 py-0.5 rounded-full">{deal.class}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[8px] font-bold text-[var(--mu)] uppercase tracking-widest mb-1">{t.monthly}</div>
                  <div className="font-display text-5xl text-[var(--lime)] leading-none mb-2">
                    {fmt(((deal.displayPayment || 0) + (settings.brokerFee / parseInt(deal.displayTerm || '36'))))}
                  </div>
                  
                  {effectiveFTB && (
                    <div className="text-[8px] text-[var(--mu2)] italic mb-2">
                      * {t.ftbNote}
                    </div>
                  )}
                  
                  {/* Market Comparison Block */}
                  <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/10 rounded-xl p-3 space-y-2 mb-4">
                    <div className="flex justify-between items-center text-[8px]">
                      <span className="text-[var(--mu2)] uppercase font-bold tracking-widest">{tcalc.opportunityCost}</span>
                      <span className="text-[var(--mu2)] line-through font-mono">{fmt(((deal.displayPayment + (settings.brokerFee / parseInt(deal.displayTerm || '36'))) * 1.25))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-[var(--w)] uppercase font-bold tracking-widest">{tcalc.hunterPrice}</span>
                      <span className="text-lg font-display text-[var(--w)]">{fmt((deal.displayPayment + (settings.brokerFee / parseInt(deal.displayTerm || '36'))))}</span>
                    </div>
                    <div className="pt-2 border-t border-[var(--lime)]/20 flex justify-between items-center">
                      <span className="text-[8px] text-[var(--lime)] uppercase font-bold tracking-widest">{tcalc.avoidableMarkup}</span>
                      <span className="text-sm font-display text-[var(--lime)]">{fmt((( (deal.displayPayment + (settings.brokerFee / parseInt(deal.displayTerm || '36'))) * 0.25) * parseInt(deal.displayTerm || '36')))}</span>
                    </div>
                  </div>

                  {/* TCO Data */}
                  <div className="flex flex-col gap-2 border-t border-[var(--b1)] pt-3">
                    <div className="flex justify-between items-center text-[9px] text-[var(--mu2)] uppercase tracking-widest">
                      <div className="flex items-center gap-1">
                        <span>{translations[language].deals.msrp}</span>
                        <div className="group relative">
                          <Info size={10} className="text-[var(--mu2)] cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center normal-case">
                            {language === 'ru' ? 'MSRP включает стоимость доставки до дилера' : 'MSRP includes destination and delivery fees'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[var(--w)] font-bold">{fmt(deal.msrp)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-[var(--mu2)] uppercase tracking-widest">
                      <span>{tcalc.tcoLabel}</span>
                      <span className="text-[var(--w)] font-bold">{fmt((deal.displayPayment + (settings.brokerFee / parseInt(deal.displayTerm || '36'))) + 200)} / {tcalc.mo}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[var(--w)] font-bold">{deal.displayTerm} {translations[language].transparency.months}</div>
                  <div className="text-[9px] text-[var(--mu2)]">{tcalc.downPayment}: {fmt(deal.down || 0)}</div>
                </div>
              </div>


              
              <div className="flex gap-2 items-start bg-[var(--lime)]/5 p-3 rounded-xl border border-[var(--lime)]/10">
                <Info className="w-3 h-3 text-[var(--lime)] mt-0.5 shrink-0" />
                <p className="text-[10px] text-[var(--mu2)] leading-relaxed italic">"{deal.intel}"</p>
              </div>
            </div>

            <div className="p-4 bg-[var(--s2)]/30 border-t border-[var(--b1)] flex justify-between items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setTransparencyDeal(deal);
                }}
                className="flex items-center gap-2 text-[10px] font-bold text-[var(--mu2)] hover:text-[var(--lime)] uppercase tracking-widest transition-colors"
              >
                <Eye className="w-3 h-3" /> {translations[language].transparency.btnTransparency}
              </button>
              <button className="bg-[var(--lime)] text-white font-display text-xs tracking-widest px-6 py-2 rounded-lg hover:bg-[var(--lime2)] transition-all group-hover:scale-105">
                {t.lockInDeal}
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-[var(--s1)] border border-dashed border-[var(--b2)] rounded-3xl">
            <div className="text-5xl mb-6">🔍</div>
            <div className="font-display text-3xl text-[var(--mu2)] uppercase tracking-widest">{t.noDeals}</div>
            <p className="text-sm text-[var(--mu)] mt-3">{t.noDealsDesc}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button 
                onClick={() => { setMaxPayment(1000); setSelectedClass('All'); setDisplayMode('lease'); setIsFirstTimeBuyer(false); setHasCosigner(false); }}
                className="text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest hover:underline"
              >
                {t.clearFilters}
              </button>
              <button 
                onClick={() => setIsAlertModalOpen(true)}
                className="bg-[var(--lime)] text-white font-bold text-[10px] uppercase tracking-widest px-8 py-3 rounded-xl hover:bg-[var(--lime2)] transition-all"
              >
                {(translations[language] as any).alerts.btnNotify}
              </button>
            </div>
          </div>
        )}
      </div>

      <InventoryAlertModal 
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        initialMake={filter}
      />

      <TransparencyModal 
        isOpen={!!transparencyDeal}
        onClose={() => setTransparencyDeal(null)}
        deal={transparencyDeal}
        mileage={transparencyDeal?.mileage || '10k'}
        isFirstTimeBuyer={effectiveFTB}
      />

      <ComparisonTray />
    </div>
  );
};
