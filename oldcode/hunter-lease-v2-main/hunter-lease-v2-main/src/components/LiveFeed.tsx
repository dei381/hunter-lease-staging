import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const RECENT_ACTIONS = [
  { name: 'Alex', city: 'Glendale', car: 'BMW X5', action: 'booked' },
  { name: 'Maria', city: 'Santa Monica', car: 'Lexus RX', action: 'reserved' },
  { name: 'John', city: 'Beverly Hills', car: 'Range Rover Sport', action: 'booked' },
  { name: 'Elena', city: 'Pasadena', car: 'Toyota RAV4', action: 'reserved' },
  { name: 'David', city: 'Irvine', car: 'Audi Q5', action: 'booked' },
];

export const LiveFeed = () => {
  const { language } = useLanguageStore();
  const t = translations[language].live;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % RECENT_ACTIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const item = RECENT_ACTIONS[index];

  return (
    <div className="h-8 overflow-hidden bg-[var(--s2)] border-y border-[var(--b1)] flex items-center px-6">
      <div className="flex items-center gap-2 text-[10px] font-mono whitespace-nowrap">
        <div className="ldot" />
        <span className="text-[var(--mu2)] uppercase tracking-widest">{t.title}</span>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-1"
          >
            <span className="text-[var(--w)] font-bold">{item.name}</span>
            <span className="text-[var(--mu2)]">{t.from}</span>
            <span className="text-[var(--w)]">{item.city}</span>
            <span className="text-[var(--mu2)]">{item.action === 'booked' ? t.booked : t.reserved}</span>
            <span className="text-[var(--lime)] font-bold">{item.car}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
