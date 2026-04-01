import React from 'react';
import { ShieldCheck, Clock, HeartHandshake, Car } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const SpecialBenefits = () => {
  const { language } = useLanguageStore();
  const t = translations[language].benefits;

  const icons = [ShieldCheck, Clock, HeartHandshake, Car];

  return (
    <div className="mb-32">
      <div className="text-center mb-16">
        <h2 className="font-display text-4xl tracking-widest uppercase mb-4">{t.title}</h2>
        <p className="text-[var(--mu2)] text-lg max-w-2xl mx-auto">{t.subtitle}</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {t.items.map((item, index) => {
          const Icon = icons[index];
          return (
            <div key={index} className="bg-[var(--s1)] border border-[var(--b2)] p-8 rounded-3xl hover:border-[var(--lime)]/50 transition-colors group">
              <div className="w-12 h-12 bg-[var(--s2)] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[var(--lime)]/10 transition-colors">
                <Icon className="w-6 h-6 text-[var(--lime)]" />
              </div>
              <h3 className="font-display text-xl tracking-widest uppercase mb-4 text-[var(--w)]">{item.title}</h3>
              <p className="text-[var(--mu2)] leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
