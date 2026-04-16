import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, Check, Minus } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  deals: any[];
}

export const CompareModal = ({ isOpen, onClose, deals }: CompareModalProps) => {
  const { language } = useLanguageStore();
  const t = translations[language].compare;
  const tcalc = translations[language].calc;

  if (!isOpen) return null;

  const parameters = [
    { label: t.monthly, key: 'displayPayment', format: (v: number) => fmt(v) + '/mo' },
    { label: t.msrp, key: 'msrp', format: (v: number) => fmt(v) },
    { label: t.savings, key: 'savings', format: (v: number) => fmt(v) },
    { label: t.down, key: 'down', format: (v: number) => fmt(v) },
    { label: t.term, key: 'displayTerm', format: (v: any) => v + ' ' + tcalc.months },
    { label: t.mileage, key: 'mileage', format: (v: string) => v + ' ' + tcalc.miles },
  ];

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 pb-6 flex items-center justify-between border-b border-zinc-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--lime)]/10 flex items-center justify-center">
                <Scale className="w-6 h-6 text-[var(--lime)]" />
              </div>
              <div>
                <h2 className="font-display text-3xl tracking-widest text-black uppercase">{t.title}</h2>
                <p className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">Side-by-side analysis</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px] p-8">
              <div className="grid grid-cols-[200px,repeat(3,1fr)] gap-8">
                {/* Labels Column */}
                <div className="pt-48 space-y-12">
                  {parameters.map((p) => (
                    <div key={p.label} className="h-8 flex items-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{p.label}</span>
                    </div>
                  ))}
                  <div className="h-8 flex items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.features}</span>
                  </div>
                  <div className="h-auto min-h-[80px] flex items-start pt-8">
                    <span className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{translations[language].compareVerdict || "Hunter's Verdict"}</span>
                  </div>
                </div>

                {/* Deal Columns */}
                {deals.map((deal, idx) => (
                  <div key={deal.id} className="space-y-12 relative">
                    {/* Car Info */}
                    <div className="h-48 flex flex-col">
                      <div className="aspect-video rounded-2xl overflow-hidden border border-zinc-100 bg-zinc-50 mb-4">
                        <img 
                          src={deal.image} 
                          alt={deal.model} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <h3 className="font-display text-xl text-black leading-tight">{deal.make} {deal.model}</h3>
                      <p className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{deal.trim}</p>
                    </div>

                    {/* Parameters */}
                    {parameters.map((p) => (
                      <div key={p.label} className="h-8 flex items-center">
                        <span className={`text-lg font-display ${p.key === 'displayPayment' ? 'text-[var(--lime)]' : 'text-black'}`}>
                          {p.format(deal[p.key])}
                        </span>
                      </div>
                    ))}

                    {/* Features (Mock for now or extract from deal.intel) */}
                    <div className="space-y-3">
                      {['Verified 11-Key Lock', 'Zero Hidden Fees', 'Market-Leading Savings'].map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] text-zinc-600">
                          <Check size={12} className="text-[var(--lime)]" />
                          {f}
                        </div>
                      ))}
                    </div>

                    {/* Hunter's Verdict */}
                    <div className="pt-8 min-h-[80px]">
                      <div className="bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-xl p-4 h-full">
                        <p className="text-[10px] font-bold text-black leading-relaxed">
                          {idx === 0 ? (language === 'ru' ? "Лучшее соотношение цены и качества. Самый низкий ежемесячный платеж." : "Best overall value. Lowest monthly payment with strong features.") : (language === 'ru' ? "Отличная альтернатива, если вы предпочитаете этот бренд, но немного дороже." : "Great alternative if you prefer this brand, but slightly higher cost.")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-8">
                      <button className="w-full bg-black text-white py-4 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                        Select This Deal
                      </button>
                    </div>
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: 3 - deals.length }).map((_, i) => (
                  <div key={i} className="border-2 border-dashed border-zinc-100 rounded-[2rem] flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
                      <Scale className="w-8 h-8 text-zinc-200" />
                    </div>
                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest leading-relaxed">
                      {t.emptyCompare}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>,
      document.body
    )}
  </AnimatePresence>
);
};
