import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const faqs = [
  {
    q: "Does the check affect my credit score?",
    a: "No. At the initial stage, we use a 'soft pull', which does not reflect on your credit history and does not lower your score. A 'hard pull' is done only by the dealer right before signing the contract, when you have already approved all the terms."
  },
  {
    q: "What happens to my $95 deposit?",
    a: "The $95 deposit secures the seriousness of your intentions and allows us to start working with dealers on your behalf. It is non-refundable if you simply change your mind. However, if the bank denies you financing specifically for this car, we will credit you $200 for our services to find another car."
  },
  {
    q: "How long does the whole process take?",
    a: "Usually from 1 to 3 days. After paying the deposit, we contact dealers, negotiate terms, and prepare documents. The car delivery takes place at a convenient time for you."
  },
  {
    q: "How do you make money?",
    a: "We receive a fixed commission from the dealer for the referred client. Our goal is to find the best terms for you, as we work on volume and reputation. We do not charge hidden fees to clients."
  },
  {
    q: "How is the contract checked?",
    a: "Before you sign the contract at the dealer, our specialist requests a copy of it. We check every number: base price, interest rate (Money Factor/APR), absence of hidden insurances and add-ons. You sign only what was agreed upon."
  },
  {
    q: "Can I trade in my old car?",
    a: "Yes! We evaluate cars using KBB algorithms and often give a price $500-$1000 higher than CarMax, as dealers need used cars. You can provide your car's details (including VIN and loan payoff amount) right when submitting the application."
  },
  {
    q: "Is car delivery included?",
    a: "By default, you pick up the car from the dealership yourself. However, we can arrange car delivery right to your home for an additional fee (depends on the distance)."
  },
  {
    q: "Do you work with bad credit history?",
    a: "We work with various credit profiles. Our system will select banks that are most likely to approve your application. If approval cannot be obtained, you will receive $200 in credits for our services."
  }
];

export const FAQ = () => {
  const { language } = useLanguageStore();
  const t = translations[language].faq;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mb-32" id="faq">
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
