import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, ChevronRight } from 'lucide-react';
import { useGarageStore } from '../store/garageStore';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { CompareModal } from './CompareModal';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const ComparisonTray = () => {
  const { compareDeals, removeFromCompare, clearCompare } = useGarageStore();
  const { language } = useLanguageStore();
  const t = translations[language].compare;
  const [showModal, setShowModal] = useState(false);

  if (compareDeals.length === 0) return null;

  return (
    <>
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] w-full max-w-2xl px-4"
      >
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-1 overflow-x-auto custom-scrollbar pb-1">
            {compareDeals.map((deal) => (
              <div key={deal.id} className="relative group shrink-0">
                <div className="w-16 h-12 rounded-lg overflow-hidden border border-white/10 bg-zinc-900">
                  <img 
                    src={deal.image} 
                    alt={deal.model} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <button 
                  onClick={() => removeFromCompare(deal.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <X size={10} />
                </button>
                <div className="absolute top-full left-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black text-white text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {deal.make} {deal.model}
                  </div>
                </div>
              </div>
            ))}
            {compareDeals.length < 3 && (
              <div className="w-16 h-12 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/20 shrink-0">
                <Scale size={16} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={clearCompare}
              className="text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors"
            >
              {t.clearAll}
            </button>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[var(--lime)] text-white px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-all flex items-center gap-2 shadow-lg shadow-[var(--lime)]/20"
            >
              {t.btnCompare}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      <CompareModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        deals={compareDeals} 
      />
    </>
  );
};
