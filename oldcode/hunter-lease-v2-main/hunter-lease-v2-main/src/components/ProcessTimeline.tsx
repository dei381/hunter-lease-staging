import React from 'react';
import { Search, ShieldCheck, FileText } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const ProcessTimeline = () => {
  const { language } = useLanguageStore();
  const t = translations[language].howItWorks;

  const STEPS = [
    {
      icon: Search,
      title: t.step1Title,
      desc: t.step1Desc,
      color: "var(--lime)"
    },
    {
      icon: ShieldCheck,
      title: t.step2Title,
      desc: t.step2Desc,
      color: "var(--teal)"
    },
    {
      icon: FileText,
      title: t.step3Title,
      desc: t.step3Desc,
      color: "var(--grn)"
    }
  ];

  return (
    <div className="py-24 border-y border-[var(--b2)] bg-[var(--s1)]/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-16">
          <h2 className="font-display text-4xl tracking-widest uppercase">{t.title}</h2>
          <div className="flex-1 h-px bg-[var(--b2)]" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-12">
          {STEPS.map((step, i) => (
            <div key={i} className="relative group">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-[var(--b2)] to-transparent z-0" />
              )}
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-[var(--s2)] border border-[var(--b2)] flex items-center justify-center mb-6 group-hover:border-[var(--lime)]/40 transition-all duration-500 group-hover:scale-110">
                  <step.icon className="w-8 h-8" style={{ color: step.color }} />
                </div>
                <h3 className="font-display text-xl tracking-widest mb-4 group-hover:text-[var(--lime)] transition-colors">{step.title}</h3>
                <p className="text-sm text-[var(--mu2)] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 p-8 bg-[var(--s2)] border border-[var(--b2)] rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-full bg-[var(--grn)]/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[var(--grn)]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--w)] uppercase tracking-widest">{t.guaranteeTitle}</div>
              <p className="text-xs text-[var(--mu2)]">{t.guaranteeDesc}</p>
            </div>
          </div>
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-[var(--lime)] text-white font-display text-lg tracking-widest px-10 py-4 rounded-xl hover:bg-[var(--lime2)] transition-all shadow-xl shadow-[var(--lime)]/20 w-full md:w-auto"
          >
            {t.btnStart}
          </button>
        </div>
      </div>
    </div>
  );
};
