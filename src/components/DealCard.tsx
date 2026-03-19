import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Scale, Info, ArrowRight } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../translations';
import { cn } from '../utils/cn';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const DealCard = ({ deal, onSelect, effectiveFTB = false }: { deal: any, onSelect?: (deal: any) => void, effectiveFTB?: boolean }) => {
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { settings } = useSettingsStore();
  const { toggleDeal, isSaved, addToCompare, removeFromCompare, isInCompare } = useGarageStore();
  const t = translations[language].deals;
  const tcalc = translations[language].calc;

  return (
    <div 
      onClick={() => {
        if (onSelect) {
          onSelect(deal);
        } else {
          navigate(`/deal/${deal.id}`);
        }
      }}
      className={cn(
        "bg-[var(--s1)] border border-[var(--b1)] rounded-2xl overflow-hidden transition-all hover:border-[var(--lime)]/40 hover:-translate-y-1 cursor-pointer relative group",
        deal.hot && "ring-1 ring-[var(--lime)]/20"
      )}
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
            <span className={cn(
              "text-[8px] font-bold px-2 py-0.5 rounded-md uppercase",
              deal.displayType === 'lease' ? 'bg-blue-500 text-white' : 'bg-[var(--grn)] text-white'
            )}>
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
              toggleDeal(deal.id.toString());
            }}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <Heart 
              size={16} 
              className={isSaved(deal.id.toString()) ? "fill-[var(--lime)] text-[var(--lime)]" : "text-white"} 
            />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isInCompare(deal.id.toString())) {
                removeFromCompare(deal.id.toString());
              } else {
                addToCompare(deal);
              }
            }}
            className={cn(
              "p-2 rounded-full backdrop-blur-sm transition-colors",
              isInCompare(deal.id.toString()) 
                ? 'bg-[var(--lime)] text-black' 
                : 'bg-black/40 text-white hover:bg-black/60'
            )}
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
                {tcalc.mileageOptions[deal.mileage as keyof typeof tcalc.mileageOptions] || deal.mileage} {tcalc.miles}
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
              {fmt(((deal.displayPayment || deal.payment || 0) + (settings?.brokerFee ? (settings.brokerFee / parseInt(deal.displayTerm || deal.term || '36')) : 0)))}
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
                <span className="text-[var(--mu2)] line-through font-mono">{fmt(((deal.displayPayment || deal.payment || 0) + (settings?.brokerFee ? (settings.brokerFee / parseInt(deal.displayTerm || deal.term || '36')) : 0)) * 1.267)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[8px] text-[var(--w)] uppercase font-bold tracking-widest">{tcalc.hunterPrice}</span>
                <span className="text-lg font-display text-[var(--w)]">{fmt(((deal.displayPayment || deal.payment || 0) + (settings?.brokerFee ? (settings.brokerFee / parseInt(deal.displayTerm || deal.term || '36')) : 0)))}</span>
              </div>
              <div className="pt-2 border-t border-[var(--lime)]/20 flex justify-between items-center">
                <span className="text-[8px] text-[var(--lime)] uppercase font-bold tracking-widest">{tcalc.avoidableMarkup}</span>
                <span className="text-sm font-display text-[var(--lime)]">{fmt((((deal.displayPayment || deal.payment || 0) + (settings?.brokerFee ? (settings.brokerFee / parseInt(deal.displayTerm || deal.term || '36')) : 0)) * 0.267) * parseInt(deal.displayTerm || deal.term || '36'))}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-[var(--w)] font-bold">{deal.displayTerm || deal.term} {translations[language].transparency.months}</div>
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
            if (onSelect) {
              onSelect(deal);
            } else {
              navigate(`/deal/${deal.id}`);
            }
          }}
          className="text-[10px] font-bold text-[var(--w)] uppercase tracking-widest hover:text-[var(--lime)] transition-colors flex items-center gap-2"
        >
          {translations[language].common.viewDetails} <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
