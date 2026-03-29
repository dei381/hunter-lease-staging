import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { Star } from 'lucide-react';

export const SpecificReviews = () => {
  const { language } = useLanguageStore();

  const cases = [
    {
      name: "Michael R.",
      location: "Los Angeles, CA",
      car: "2025 BMW X5 xDrive40i",
      saved: "$4,200",
      quote: language === 'ru' 
        ? "Дилер просил $1,150 в месяц с $5k первоначального взноса. Через Hunter Lease я зафиксировал $980/мес с $3k down. Без торгов, просто приехал и забрал машину."
        : "Dealer quoted $1,150/mo with $5k down. Through Hunter Lease, I locked in $980/mo with $3k down. No haggling, just showed up and signed.",
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=400&h=300"
    },
    {
      name: "Sarah L.",
      location: "Irvine, CA",
      car: "2025 Lexus RX 350 Premium",
      saved: "$3,800",
      quote: language === 'ru'
        ? "Я ненавижу торговаться. Платформа показала реальную цену со всеми скидками производителя. Дилер даже не пытался продать мне допы."
        : "I hate negotiating. The platform showed the real price with all manufacturer rebates applied. The dealer didn't even try to upsell me.",
      image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80&w=400&h=300"
    },
    {
      name: "David T.",
      location: "San Diego, CA",
      car: "2025 Hyundai Ioniq 5 SEL",
      saved: "$5,100",
      quote: language === 'ru'
        ? "Они нашли дилера, который применил все $10,000 EV скидок. Мой платеж составил $349/мес вместо $500+, которые мне предлагали локально."
        : "They found a dealer that passed through the full $10,000 in EV rebates. My payment was $349/mo instead of the $500+ I was quoted locally.",
      image: "https://images.unsplash.com/photo-1669023030485-573b6a75ab64?auto=format&fit=crop&q=80&w=400&h=300"
    }
  ];

  return (
    <div className="py-24 border-y border-[var(--b2)] bg-[var(--bg)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <h2 className="font-display text-4xl tracking-widest uppercase">
            {language === 'ru' ? 'Отзывы клиентов' : 'Client Reviews'}
          </h2>
          <div className="flex-1 h-px bg-[var(--b2)]" />
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {cases.map((c, i) => (
            <div key={i} className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl overflow-hidden flex flex-col">
              <div className="h-48 overflow-hidden relative">
                <img src={c.image} alt={c.car} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--s1)] to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest mb-1">{c.car}</div>
                    <div className="text-sm font-bold text-[var(--w)]">{c.name}</div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{c.location}</div>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14} className="text-[var(--lime)] fill-[var(--lime)]" />
                    ))}
                  </div>
                  <p className="text-sm text-[var(--mu2)] leading-relaxed italic">
                    "{c.quote}"
                  </p>
                </div>
                <div className="pt-4 border-t border-[var(--b2)] flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                    {language === 'ru' ? 'Сэкономлено' : 'Saved'}
                  </span>
                  <span className="text-lg font-display text-[var(--lime)]">{c.saved}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
