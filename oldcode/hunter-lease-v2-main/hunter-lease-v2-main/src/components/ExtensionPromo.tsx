import React from 'react';
import { motion } from 'motion/react';
import { Chrome, ShieldCheck, Zap, BarChart3, Download } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const ExtensionPromo: React.FC = () => {
  const { language } = useLanguageStore();
  const t = (translations[language] as any).extension;

  return (
    <section className="py-24 border-t border-[var(--b2)]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
              <Chrome className="w-3 h-3" /> Chrome Extension
            </div>
            <h2 className="font-display text-5xl md:text-6xl tracking-tight leading-[0.9]">
              {t.title}
            </h2>
            <p className="text-[var(--mu2)] text-lg max-w-md">
              {t.subtitle}
            </p>
            
            <ul className="space-y-4">
              {t.features.map((feature: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-[var(--w)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" />
                  {feature}
                </li>
              ))}
            </ul>

            <button className="bg-[var(--w)] text-white font-bold text-sm uppercase tracking-widest px-10 py-4 rounded-xl hover:bg-white transition-all flex items-center gap-2 shadow-xl">
              <Download className="w-4 h-4" /> {t.btnDownload}
            </button>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 bg-[var(--lime)]/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Mock Browser Window */}
            <div className="relative bg-[var(--s1)] border border-[var(--b2)] rounded-2xl shadow-2xl overflow-hidden aspect-video">
              <div className="bg-[var(--s2)] px-4 py-2 border-b border-[var(--b2)] flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
                </div>
                <div className="flex-1 bg-[var(--s1)] rounded-md h-5 mx-4 border border-[var(--b2)]" />
              </div>
              
              <div className="p-8 space-y-6 opacity-40">
                <div className="h-8 bg-[var(--b2)] rounded-lg w-3/4" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-32 bg-[var(--b2)] rounded-xl" />
                  <div className="h-32 bg-[var(--b2)] rounded-xl" />
                  <div className="h-32 bg-[var(--b2)] rounded-xl" />
                </div>
                <div className="h-4 bg-[var(--b2)] rounded-lg w-full" />
                <div className="h-4 bg-[var(--b2)] rounded-lg w-5/6" />
              </div>

              {/* Extension Popup Overlay */}
              <motion.div 
                initial={{ opacity: 0, y: 20, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute top-12 right-8 w-64 bg-black border border-[var(--b2)] rounded-2xl shadow-2xl p-5 z-20"
              >
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                  <div className="text-[10px] font-bold tracking-widest text-[var(--lime)]">HUNTER AUDIT</div>
                  <div className="w-2 h-2 rounded-full bg-[var(--lime)] animate-pulse" />
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-[8px] text-white/50 uppercase font-bold tracking-widest">Detected Price</div>
                    <div className="text-xl font-display text-white">$749/mo</div>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 space-y-1">
                    <div className="text-[8px] text-red-400 uppercase font-bold tracking-widest flex items-center gap-1">
                      <ShieldCheck className="w-2 h-2" /> Markup Alert
                    </div>
                    <div className="text-[10px] text-red-200 font-bold leading-tight">
                      $1,995 "Dealer Prep" fee detected in fine print.
                    </div>
                  </div>

                  <button className="w-full bg-[var(--lime)] text-white text-[10px] font-bold uppercase tracking-widest py-2.5 rounded-lg">
                    Audit Contract
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
