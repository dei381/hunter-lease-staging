import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguageStore } from '../store/languageStore';
import { motion, AnimatePresence } from 'motion/react';
import { Globe } from 'lucide-react';

export const LanguageWelcomeModal = () => {
  const { hasSelectedLanguage, setLanguage } = useLanguageStore();

  if (hasSelectedLanguage) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8 text-[var(--lime)]" />
          </div>
          
          <h2 className="font-display text-2xl text-[var(--w)] mb-2 tracking-widest uppercase">
            Select Language
          </h2>
          <p className="text-[var(--mu2)] text-sm mb-8">
            Выберите язык / Choose your language
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setLanguage('ru')}
              className="w-full bg-[var(--lime)] text-white font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors"
            >
              Русский
            </button>
            <button
              onClick={() => setLanguage('en')}
              className="w-full bg-[var(--s2)] text-[var(--w)] border border-[var(--b2)] font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--b1)] transition-colors"
            >
              English
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
