import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { Helmet } from 'react-helmet-async';

export const FAQ = () => {
  const { language } = useLanguageStore();
  const t = translations[language].faq;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": t.questions.map((faq: any) => ({
      "@type": "Question",
      "name": faq.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.a
      }
    }))
  };

  return (
    <div className="mb-32" id="faq">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
      <div className="flex items-center gap-4 mb-12">
        <h2 className="font-display text-4xl tracking-widest uppercase">{t.title}</h2>
        <div className="flex-1 h-px bg-[var(--b2)]" />
      </div>

      <div className="space-y-4 max-w-4xl mx-auto">
        {t.questions.map((faq: any, i: number) => (
          <div 
            key={i} 
            className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden transition-colors hover:border-[var(--b3)]"
          >
            <button 
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-6 py-5 flex items-center justify-between text-left"
            >
              <span className="font-bold text-sm md:text-base">{faq.q}</span>
              <ChevronDown 
                className={`w-5 h-5 text-[var(--lime)] transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`} 
              />
            </button>
            <AnimatePresence>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="px-6 pb-5 text-sm text-[var(--mu2)] leading-relaxed border-t border-[var(--b2)] pt-4 mt-2">
                    {faq.a}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
