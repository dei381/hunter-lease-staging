import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, Scale } from 'lucide-react';
import { useGarageStore } from '../store/garageStore';
import { useNavigate } from 'react-router-dom';

export const CompareBar = () => {
  const { compareDeals, removeFromCompare, clearCompare } = useGarageStore();
  const navigate = useNavigate();

  if (compareDeals.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto bg-[var(--s1)] border border-[var(--lime)]/50 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4 pointer-events-auto backdrop-blur-xl bg-opacity-90">
          <div className="flex items-center gap-4 flex-1 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
            <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-[var(--b2)]">
              <Scale className="w-5 h-5 text-[var(--lime)]" />
              <span className="text-sm font-bold text-[var(--w)] uppercase tracking-wider">
                Compare ({compareDeals.length}/3)
              </span>
            </div>
            
            <div className="flex gap-2 shrink-0">
              {compareDeals.map(deal => (
                <div key={deal.id} className="relative bg-[var(--s2)] rounded-lg p-2 pr-8 flex items-center gap-2 border border-[var(--b2)] w-48 shrink-0">
                  <div className="w-10 h-6 bg-[var(--bg)] rounded overflow-hidden shrink-0">
                    <img src={deal.image} alt={deal.model} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[10px] font-bold text-[var(--w)] truncate">{deal.make} {deal.model}</span>
                    <span className="text-[9px] text-[var(--mu2)] uppercase tracking-widest truncate">{deal.trim}</span>
                  </div>
                  <button 
                    onClick={() => removeFromCompare(deal.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--mu2)] hover:text-white bg-[var(--s1)] rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={clearCompare}
              className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest hover:text-white hidden md:block"
            >
              Clear All
            </button>
            <button
              onClick={() => navigate('/compare')}
              disabled={compareDeals.length < 2}
              className="bg-[var(--lime)] text-black px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[var(--lime)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
            >
              Compare Now
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
