import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CheckCircle } from 'lucide-react';

const DEALS = [
  { name: 'Ivan', city: 'Irvine', car: 'Kia EV9', save: '$4,200' },
  { name: 'Maria', city: 'Glendale', car: 'Toyota Sienna', save: '$3,100' },
  { name: 'Sergey', city: 'Santa Monica', car: 'Mercedes GLC', save: '$5,500' },
  { name: 'Anna', city: 'Pasadena', car: 'Honda Pilot', save: '$2,800' },
  { name: 'Dmitry', city: 'Torrance', car: 'Lexus RX', save: '$4,800' },
];

export const LiveNotification = () => {
  const [currentDeal, setCurrentDeal] = useState<typeof DEALS[0] | null>(null);

  useEffect(() => {
    const showNext = () => {
      const deal = DEALS[Math.floor(Math.random() * DEALS.length)];
      setCurrentDeal(deal);
      
      setTimeout(() => {
        setCurrentDeal(null);
      }, 5000);
    };

    const interval = setInterval(() => {
      showNext();
    }, 15000);

    // Show first one after 3 seconds
    const firstTimeout = setTimeout(showNext, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstTimeout);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
      <AnimatePresence>
        {currentDeal && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 shadow-2xl flex items-center gap-4 max-w-xs pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-[var(--lime)]" />
            </div>
            <div>
              <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-[var(--grn)]" /> Deal closed
              </div>
              <div className="text-xs font-bold text-[var(--w)]">
                {currentDeal.name} from {currentDeal.city}
              </div>
              <div className="text-[10px] text-[var(--mu)]">
                Booked <span className="text-[var(--lime)]">{currentDeal.car}</span>
              </div>
              <div className="text-[9px] font-mono text-[var(--grn)] mt-1">
                Savings {currentDeal.save}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
