import React from 'react';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const CaseStudies = () => {
  const { language } = useLanguageStore();
  const t = translations[language].caseStudies;

  return (
    <div className="py-24 border-y border-[var(--b2)] bg-[var(--s1)]/30">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div>
            <h2 className="font-display text-4xl tracking-widest uppercase mb-4">{t.title}</h2>
            <p className="text-[var(--mu2)] max-w-xl">
              {t.subtitle}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[var(--lime)] text-sm font-bold uppercase tracking-widest bg-[var(--lime)]/10 px-4 py-2 rounded-lg border border-[var(--lime)]/20">
            <FileText size={18} />
            {t.confirmed}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {t.items.map((c: any) => (
            <div key={c.id} className="bg-[var(--bg)] border border-[var(--b2)] rounded-3xl p-6 md:p-8 relative overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start mb-8 border-b border-[var(--b2)] pb-6">
                <div>
                  <h3 className="font-display text-2xl mb-1">{c.car}</h3>
                  <div className="text-[10px] text-[var(--mu)] uppercase tracking-widest">
                    MSRP: {c.msrp} • {c.term}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--lime)] font-bold uppercase tracking-widest mb-1">{t.savings}</div>
                  <div className="font-display text-3xl text-[var(--lime)]">{c.savings}</div>
                </div>
              </div>

              {/* Comparison */}
              <div className="grid md:grid-cols-2 gap-6 relative">
                {/* VS Badge */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[var(--s2)] border border-[var(--b2)] rounded-full items-center justify-center text-[10px] font-bold text-[var(--mu)] z-10">
                  VS
                </div>

                {/* Dealer Offer */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 relative">
                  <div className="absolute top-0 right-0 bg-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                    {t.dealerOffer}
                  </div>
                  <div className="flex items-center gap-2 mb-4 text-red-400">
                    <XCircle size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.walkIn}</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.payment}</div>
                      <div className="font-mono text-xl text-red-400">{c.dealer.payment}<span className="text-sm opacity-60">{t.perMo}</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.downPayment}</div>
                      <div className="font-mono text-lg">{c.dealer.down}</div>
                    </div>
                    <div className="pt-3 border-t border-red-500/20">
                      <div className="text-[10px] text-red-400/80 leading-relaxed">{c.dealer.fees}</div>
                    </div>
                  </div>
                </div>

                {/* Hunter Offer */}
                <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/30 rounded-2xl p-5 relative shadow-[0_0_30px_rgba(204,255,0,0.05)]">
                  <div className="absolute top-0 right-0 bg-[var(--lime)] text-black text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl rounded-tr-2xl">
                    {t.ourOffer}
                  </div>
                  <div className="flex items-center gap-2 mb-4 text-[var(--lime)]">
                    <CheckCircle2 size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">Hunter.Lease</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.payment}</div>
                      <div className="font-mono text-3xl text-[var(--lime)]">{c.hunter.payment}<span className="text-sm opacity-60">{t.perMo}</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.downPayment}</div>
                      <div className="font-mono text-lg">{c.hunter.down}</div>
                    </div>
                    <div className="pt-3 border-t border-[var(--lime)]/20">
                      <div className="text-[10px] text-[var(--lime)]/80 leading-relaxed">{c.hunter.fees}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
