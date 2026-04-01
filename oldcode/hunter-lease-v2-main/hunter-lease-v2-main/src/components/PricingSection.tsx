import React from 'react';
import { Check, Zap, Crown, ShieldCheck } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { motion } from 'motion/react';

export const PricingSection = () => {
  const { language } = useLanguageStore();
  const t = translations[language].pricing;

  const plans = [
    {
      name: t.free,
      price: t.freePrice,
      desc: t.freeDesc,
      icon: Zap,
      features: t.freeFeatures,
      color: 'var(--mu2)',
      bg: 'var(--s1)'
    },
    {
      name: t.standard,
      price: t.standardPrice,
      desc: t.standardDesc,
      icon: ShieldCheck,
      features: t.standardFeatures,
      color: 'var(--lime)',
      bg: 'var(--s1)',
      popular: true
    },
    {
      name: t.vip,
      price: t.vipPrice,
      desc: t.vipDesc,
      icon: Crown,
      features: t.vipFeatures,
      color: 'var(--teal)',
      bg: 'var(--s1)'
    }
  ];

  return (
    <div id="pricing" className="mb-32">
      <div className="flex items-center gap-4 mb-12">
        <h2 className="font-display text-4xl tracking-widest uppercase">{t.title}</h2>
        <div className="flex-1 h-px bg-[var(--b2)]" />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
            className={`relative p-8 rounded-3xl border ${plan.popular ? 'border-[var(--lime)]/50 shadow-2xl shadow-[var(--lime)]/10' : 'border-[var(--b2)]'} bg-[var(--s1)] overflow-hidden group hover:border-[var(--lime)]/30 transition-all`}
          >
            {plan.popular && (
              <div className="absolute top-4 right-4 bg-[var(--lime)] text-white text-[8px] font-bold px-2 py-1 rounded uppercase tracking-widest">
                {t.popular}
              </div>
            )}
            
            <div className="mb-8">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6`} style={{ backgroundColor: `${plan.color}15`, color: plan.color }}>
                <plan.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-display tracking-widest uppercase mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-display text-[var(--w)]">{plan.price}</span>
                <span className="text-[10px] text-[var(--mu2)] uppercase font-bold tracking-widest">{t.perDeal}</span>
              </div>
              <p className="text-xs text-[var(--mu2)] leading-relaxed">{plan.desc}</p>
            </div>

            <div className="space-y-4 mb-8">
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-[var(--lime)]/10 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-[var(--lime)]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)]">{feature}</span>
                </div>
              ))}
            </div>

            <button className={`w-full py-4 rounded-xl font-display text-sm tracking-widest uppercase transition-all ${plan.popular ? 'bg-[var(--lime)] text-white hover:bg-[var(--lime2)]' : 'bg-[var(--b2)] text-[var(--w)] hover:bg-[var(--b3)]'}`}>
              {t.select}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
