import React from 'react';
import { Building2, Globe2, Map, ShieldCheck } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const DEALERS = [
  'Toyota of Glendale', 'BMW Beverly Hills', 'Lexus of Santa Monica', 
  'Mercedes-Benz of Long Beach', 'Audi Pasadena', 'Honda of Hollywood',
  'Ford of Orange', 'Kia of Irvine', 'Volkswagen of Santa Monica', 
  'Porsche Downtown LA', 'Subaru of Sherman Oaks', 'Hyundai of Van Nuys'
];

export const DealerNetwork = () => {
  const { language } = useLanguageStore();
  const t = translations[language].network;

  return (
    <div className="py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="font-display text-4xl tracking-widest">{t.title}</h2>
          <div className="flex-1 h-px bg-[var(--b2)]" />
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-lg text-[var(--mu2)] leading-relaxed" dangerouslySetInnerHTML={{ __html: t.desc }} />
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--lime)] font-bold uppercase tracking-widest text-xs">
                  <Building2 className="w-4 h-4" /> 217+ {t.dealers}
                </div>
                <p className="text-[10px] text-[var(--mu)]">{t.contracts}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--lime)] font-bold uppercase tracking-widest text-xs">
                  <Globe2 className="w-4 h-4" /> {t.allCA}
                </div>
                <p className="text-[10px] text-[var(--mu)]">{t.partners}</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-[var(--lime)]/10 rounded-3xl blur-3xl" />
            <div className="relative bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 grid grid-cols-3 gap-4">
              {DEALERS.map((d, i) => (
                <div key={i} className="text-[9px] text-[var(--mu2)] font-bold uppercase tracking-tighter border border-[var(--b1)] p-2 rounded-lg bg-[var(--s2)]/50 text-center flex items-center justify-center min-h-[40px]">
                  {d}
                </div>
              ))}
              <div className="col-span-3 mt-4 pt-4 border-t border-[var(--b1)] flex items-center justify-center gap-2 text-[10px] text-[var(--lime)] font-bold uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4" /> {t.partners}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scrolling Ticker */}
      <div className="relative flex overflow-x-hidden border-y border-[var(--b2)] bg-[var(--s1)] py-6">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-12">
          {[...DEALERS, ...DEALERS].map((d, i) => (
            <span key={i} className="text-2xl font-display text-[var(--b2)] uppercase tracking-widest hover:text-[var(--lime)] transition-colors cursor-default">
              {d}
            </span>
          ))}
        </div>
        <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[var(--bg)] to-transparent z-10" />
        <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[var(--bg)] to-transparent z-10" />
      </div>
    </div>
  );
};
