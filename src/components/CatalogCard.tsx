import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Scale, Zap, Tag, Info } from 'lucide-react';
import { useGarageStore } from '../store/garageStore';
import { cn } from '../utils/cn';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

interface CatalogItem {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  msrp: number;
  imageUrl: string | null;
  bodyStyle: string | null;
  leasePayment: number | null;
  leaseTerm: number;
  leaseDown: number;
  financePayment: number | null;
  financeTerm: number;
  financeAPR: number;
  totalIncentivesCents: number;
  incentives: { name: string; amountCents: number; type: string }[];
  sellingPrice: number;
  savings: number;
  lenderName: string | null;
}

export const CatalogCard = ({ item, displayMode = 'lease' }: { item: CatalogItem; displayMode?: 'lease' | 'finance' }) => {
  const navigate = useNavigate();
  const { toggleDeal, isSaved, addToCompare, removeFromCompare, isInCompare } = useGarageStore();

  const payment = displayMode === 'lease' ? item.leasePayment : item.financePayment;
  const term = displayMode === 'lease' ? item.leaseTerm : item.financeTerm;
  const hasIncentives = item.totalIncentivesCents > 0;
  const itemId = item.id;

  return (
    <div
      onClick={() => navigate(`/catalog/${item.id}`)}
      className={cn(
        "bg-[var(--s1)] border border-[var(--b1)] rounded-2xl overflow-hidden transition-all hover:border-[var(--lime)]/40 hover:-translate-y-1 cursor-pointer relative group"
      )}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={`${item.year} ${item.make} ${item.model} ${item.trim}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[var(--s2)] flex items-center justify-center">
            <span className="text-[var(--mu2)] text-xs uppercase font-bold tracking-widest">No Image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--s1)]/80 to-transparent opacity-60" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={cn(
            "text-[8px] font-bold px-2 py-0.5 rounded-md uppercase",
            displayMode === 'lease' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
          )}>
            {displayMode === 'lease' ? 'Lease' : 'Finance'}
          </span>
          {hasIncentives && (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase bg-[var(--lime)] text-black">
              <Tag size={8} className="inline mr-0.5" />
              {fmt(item.savings)} off
            </span>
          )}
          {item.bodyStyle && (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase bg-black/50 text-white backdrop-blur-sm">
              {item.bodyStyle}
            </span>
          )}
        </div>

        {/* Save / Compare */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); toggleDeal(itemId); }}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
          >
            <Heart size={16} className={isSaved(itemId) ? "fill-[var(--lime)] text-[var(--lime)]" : "text-white"} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isInCompare(itemId)) removeFromCompare(itemId);
              else addToCompare(item);
            }}
            className={cn(
              "p-2 rounded-full backdrop-blur-sm transition-colors",
              isInCompare(itemId) ? 'bg-[var(--lime)] text-white' : 'bg-black/40 text-white hover:bg-black/60'
            )}
          >
            <Scale size={16} />
          </button>
        </div>

        {/* Savings badge bottom */}
        {item.savings > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className="text-[var(--grn)] font-bold text-[10px] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
              −{fmt(item.savings)} savings
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-display text-xl tracking-tight leading-tight">
            {item.year} {item.make} {item.model}
          </h3>
        </div>
        <p className="text-[10px] text-[var(--mu)] font-bold uppercase tracking-widest mb-3">{item.trim}</p>

        {/* Price row */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-[10px] text-[var(--mu)] uppercase tracking-wider">MSRP</span>
            <span className="text-sm text-[var(--mu)] ml-1">{fmt(item.msrp)}</span>
          </div>
          {item.savings > 0 && (
            <div>
              <span className="text-[10px] text-[var(--grn)] uppercase tracking-wider">Sale Price</span>
              <span className="text-sm text-[var(--grn)] ml-1 font-semibold">{fmt(item.sellingPrice)}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--b1)] pt-3">
          {payment !== null ? (
            <div className="flex items-end justify-between">
              <div>
                <span className="font-display text-3xl tracking-tight text-[var(--lime)]">{fmt(payment)}</span>
                <span className="text-[10px] text-[var(--mu)] ml-1">/mo</span>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[var(--mu)] uppercase tracking-wider">{term} months</div>
                {item.leaseDown > 0 && (
                  <div className="text-[9px] text-[var(--mu)]">{fmt(item.leaseDown)} down</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-2">
              <span className="text-[var(--mu)] text-sm">Contact for pricing</span>
            </div>
          )}
        </div>

        {/* Lender */}
        {item.lenderName && (
          <div className="mt-2 flex items-center gap-1 text-[9px] text-[var(--mu2)]">
            <Info size={10} />
            <span>via {item.lenderName}</span>
          </div>
        )}

        {/* Incentives summary */}
        {item.incentives.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.incentives.slice(0, 2).map((inc, i) => (
              <span key={i} className="text-[8px] bg-[var(--lime)]/10 text-[var(--lime)] px-1.5 py-0.5 rounded-full font-medium">
                {inc.name}: {fmt(inc.amountCents / 100)}
              </span>
            ))}
            {item.incentives.length > 2 && (
              <span className="text-[8px] text-[var(--mu)] px-1.5 py-0.5">+{item.incentives.length - 2} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
