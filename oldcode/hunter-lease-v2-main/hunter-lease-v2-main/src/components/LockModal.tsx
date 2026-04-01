import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const LockModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { language } = useLanguageStore();
  const t = translations[language].lock;

  const keys = [
    { title: t.key1, desc: t.key1Desc },
    { title: t.key2, desc: t.key2Desc },
    { title: t.key3, desc: t.key3Desc },
    { title: t.key4, desc: t.key4Desc },
    { title: t.key5, desc: t.key5Desc },
    { title: t.key6, desc: t.key6Desc },
    { title: t.key7, desc: t.key7Desc },
    { title: t.key8, desc: t.key8Desc },
    { title: t.key9, desc: t.key9Desc },
    { title: t.key10, desc: t.key10Desc },
    { title: t.key11, desc: t.key11Desc },
  ];

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[var(--bg)] border border-[var(--b2)] rounded-[2rem] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col my-auto"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-[var(--mu)] hover:text-[var(--w)] z-50 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-full p-2 transition-colors">
              <X size={20} />
            </button>
            
            <div className="p-8 md:p-10 border-b border-[var(--b1)] bg-gradient-to-br from-[var(--s1)] to-[var(--bg)] relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[var(--lime)]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[var(--lime)]/20 rounded-2xl flex items-center justify-center border border-[var(--lime)]/30">
                  <ShieldCheck className="w-6 h-6 text-[var(--lime)]" />
                </div>
                <div>
                  <h2 className="font-display text-3xl tracking-tight">{t.title}</h2>
                  <p className="text-[var(--lime)] text-xs font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
              </div>
              <p className="text-[var(--mu)] text-sm leading-relaxed max-w-lg">{t.desc}</p>
            </div>

            <div className="p-8 md:p-10 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="grid gap-6">
                {keys.map((key, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="mt-1 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[var(--lime)] opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--w)] mb-1 uppercase tracking-wider">{key.title}</h4>
                      <p className="text-[var(--mu2)] text-xs leading-relaxed">{key.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-[var(--s1)] border-t border-[var(--b1)] flex justify-center">
              <button 
                onClick={onClose}
                className="bg-[var(--lime)] text-white font-bold text-xs uppercase tracking-widest px-10 py-3 rounded-xl hover:bg-[var(--lime2)] transition-all shadow-lg hover:shadow-[var(--lime)]/20"
              >
                {t.close}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
};
