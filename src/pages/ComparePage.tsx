import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { X, ArrowLeft, Check, Minus } from 'lucide-react';
import { useGarageStore } from '../store/garageStore';
import { useLanguageStore } from '../store/languageStore';

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

export const ComparePage = () => {
  const navigate = useNavigate();
  const { compareDeals, removeFromCompare, clearCompare } = useGarageStore();
  const { language } = useLanguageStore();

  useEffect(() => {
    if (compareDeals.length === 0) {
      navigate('/deals');
    }
  }, [compareDeals, navigate]);

  if (compareDeals.length === 0) return null;

  const features = [
    { key: 'msrp', label: 'MSRP', format: fmt },
    { key: 'payment', label: 'Est. Lease', format: fmt },
    { key: 'financePayment', label: 'Est. Finance', format: fmt },
    { key: 'down', label: 'Due at Signing', format: fmt },
    { key: 'term', label: 'Term (Months)', format: (v: any) => `${v} mo` },
    { key: 'mileage', label: 'Mileage', format: (v: any) => v },
    { key: 'savings', label: 'Savings', format: fmt },
    { key: 'valueScore', label: 'Value Score', format: (v: any) => v },
    { key: 'hot', label: 'Hot Deal', format: (v: any) => v ? <Check className="text-[var(--lime)] mx-auto" /> : <Minus className="text-[var(--mu2)] mx-auto" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-24 pb-32 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Compare Deals | Hunter Lease</title>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <button 
              onClick={() => navigate('/deals')}
              className="flex items-center gap-2 text-[var(--mu2)] hover:text-white transition-colors mb-4 text-sm font-bold uppercase tracking-widest"
            >
              <ArrowLeft size={16} /> Back to Deals
            </button>
            <h1 className="text-4xl md:text-6xl font-display tracking-tighter">Compare Deals</h1>
          </div>
          <button 
            onClick={clearCompare}
            className="text-xs font-bold text-[var(--mu2)] uppercase tracking-widest hover:text-white"
          >
            Clear All
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-8">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="flex gap-6 mb-8">
              <div className="w-48 shrink-0" /> {/* Empty corner */}
              {compareDeals.map(deal => (
                <div key={deal.id} className="flex-1 min-w-[250px] relative">
                  <button 
                    onClick={() => removeFromCompare(deal.id)}
                    className="absolute -top-3 -right-3 w-8 h-8 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-full flex items-center justify-center text-[var(--mu2)] hover:text-white transition-colors z-10"
                  >
                    <X size={16} />
                  </button>
                  <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden flex flex-col h-full">
                    <div className="aspect-[16/10] bg-[var(--s2)] relative">
                      <img src={deal.image} alt={deal.model} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-display text-xl mb-1">{deal.make} {deal.model}</h3>
                      <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{deal.trim}</p>
                      <button
                        onClick={() => navigate(`/deal/${deal.id}`)}
                        className="mt-4 w-full py-2 bg-[var(--lime)] text-black rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime)]/90 transition-colors"
                      >
                        View Deal
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Features Rows */}
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden">
              {features.map((feature, idx) => (
                <div 
                  key={feature.key} 
                  className={`flex gap-6 p-4 items-center ${idx !== features.length - 1 ? 'border-b border-[var(--b2)]' : ''} ${idx % 2 === 0 ? 'bg-[var(--s2)]/30' : ''}`}
                >
                  <div className="w-48 shrink-0 text-xs font-bold text-[var(--mu)] uppercase tracking-widest pl-4">
                    {feature.label}
                  </div>
                  {compareDeals.map(deal => (
                    <div key={`${deal.id}-${feature.key}`} className="flex-1 min-w-[250px] text-center font-mono text-lg">
                      {feature.format(deal[feature.key])}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
