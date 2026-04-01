import React, { useEffect, useState } from 'react';
import { CheckCircle2, Zap } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const RECENT_DEALS = [
  { name: 'Alex M.', car: 'BMW X5 xDrive40i', city: 'Glendale', savings: 8400, time: '2m' },
  { name: 'Sarah K.', car: 'Porsche Macan', city: 'Irvine', savings: 4500, time: '15m' },
  { name: 'Dmitry V.', car: 'Mercedes GLE 450', city: 'Beverly Hills', savings: 12100, time: '42m' },
  { name: 'Elena S.', car: 'Lexus RX 350h', city: 'Santa Monica', savings: 6200, time: '1h' },
  { name: 'Michael R.', car: 'Audi Q7 55 TFSI', city: 'Pasadena', savings: 9800, time: '2h' },
];

export const RecentActivity = () => {
  const { language } = useLanguageStore();
  const t = translations[language].recent;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % RECENT_DEALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const deal = RECENT_DEALS[index];

  return (
    <div className="fixed bottom-8 left-8 z-40 hidden lg:block">
      <div className="bg-[var(--s1)]/80 backdrop-blur-md border border-[var(--b2)] p-4 rounded-2xl shadow-2xl w-72 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[var(--lime)]/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[var(--lime)]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.title}</div>
            <div className="text-[9px] text-[var(--grn)] font-bold uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--grn)] animate-pulse" />
              {t.dealSecured}
            </div>
          </div>
          <div className="ml-auto text-[9px] text-[var(--mu2)] font-bold">{deal.time} {t.ago}</div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs font-bold text-[var(--w)]">{deal.name} {t.from} {deal.city}</div>
          <div className="text-[11px] text-[var(--mu2)]">{deal.car}</div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--b1)]">
            <CheckCircle2 className="w-3 h-3 text-[var(--lime)]" />
            <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">
              {t.saved} ${deal.savings.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
