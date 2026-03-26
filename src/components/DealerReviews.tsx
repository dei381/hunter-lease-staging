import React from 'react';
import { motion } from 'motion/react';
import { Star, ShieldCheck, ThumbsUp } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';

const MOCK_REVIEWS = [
  {
    id: 1,
    author: 'Michael R.',
    rating: 5,
    date: '2024-02-15',
    text: 'The dealer honored the exact terms negotiated by Hunter Lease. No hidden fees, no pressure to buy add-ons. I was in and out of the dealership in 45 minutes.',
    verified: true,
    car: 'BMW M340i'
  },
  {
    id: 2,
    author: 'Sarah J.',
    rating: 5,
    date: '2024-01-28',
    text: 'Incredible experience. The finance manager tried to pitch a warranty, but when I mentioned the VIP Certificate, they immediately backed off and processed the paperwork as agreed.',
    verified: true,
    car: 'Lexus RX 350'
  },
  {
    id: 3,
    author: 'David T.',
    rating: 4,
    date: '2023-12-10',
    text: 'Great deal overall. The dealership was a bit busy so I had to wait 20 minutes to see the finance guy, but the numbers matched exactly to the penny.',
    verified: true,
    car: 'Audi Q5'
  }
];

export const DealerReviews = () => {
  const { language } = useLanguageStore();

  const t = {
    en: {
      title: 'Dealer Reviews',
      subtitle: 'Verified feedback from recent buyers at this dealership',
      verified: 'Verified Buyer',
      overall: 'Overall Rating',
      basedOn: 'Based on recent transactions',
      noPressure: 'No-Pressure Guarantee',
      noPressureDesc: 'Dealers in our network are strictly monitored for compliance with agreed terms.'
    },
    ru: {
      title: 'Отзывы о дилере',
      subtitle: 'Проверенные отзывы от недавних покупателей у этого дилера',
      verified: 'Проверенный покупатель',
      overall: 'Общий рейтинг',
      basedOn: 'На основе недавних сделок',
      noPressure: 'Гарантия без давления',
      noPressureDesc: 'Дилеры в нашей сети строго контролируются на предмет соблюдения согласованных условий.'
    }
  }[language];

  return (
    <div className="py-16 border-t border-[var(--b2)]">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Left Column - Stats */}
        <div className="md:w-1/3 space-y-8">
          <div>
            <h2 className="font-display text-4xl uppercase mb-2">{t.title}</h2>
            <p className="text-[var(--mu2)]">{t.subtitle}</p>
          </div>

          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6">
            <div className="text-[var(--mu2)] text-sm uppercase tracking-widest font-bold mb-2">{t.overall}</div>
            <div className="flex items-end gap-4 mb-2">
              <div className="font-display text-6xl text-[var(--lime)]">4.8</div>
              <div className="flex pb-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star key={star} size={20} className={star <= 4 ? "fill-[var(--lime)] text-[var(--lime)]" : "fill-[var(--lime)]/30 text-[var(--lime)]/30"} />
                ))}
              </div>
            </div>
            <p className="text-xs text-[var(--mu2)]">{t.basedOn}</p>
          </div>

          <div className="bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[var(--lime)]/20 rounded-full flex items-center justify-center">
                <ShieldCheck size={20} className="text-[var(--lime)]" />
              </div>
              <h3 className="font-bold uppercase tracking-widest text-sm text-[var(--lime)]">{t.noPressure}</h3>
            </div>
            <p className="text-sm text-[var(--mu)]">{t.noPressureDesc}</p>
          </div>
        </div>

        {/* Right Column - Reviews List */}
        <div className="md:w-2/3 space-y-6">
          {MOCK_REVIEWS.map((review, i) => (
            <motion.div 
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{review.author}</span>
                    {review.verified && (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-[var(--lime)] bg-[var(--lime)]/10 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={12} />
                        {t.verified}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--mu2)] flex items-center gap-2">
                    <span>{new Date(review.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{review.car}</span>
                  </div>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      size={16} 
                      className={star <= review.rating ? "fill-[var(--lime)] text-[var(--lime)]" : "text-[var(--s1)]"} 
                    />
                  ))}
                </div>
              </div>
              <p className="text-[var(--mu)] leading-relaxed">"{review.text}"</p>
              <div className="mt-4 pt-4 border-t border-[var(--b2)] flex items-center gap-2">
                <button className="flex items-center gap-1 text-xs text-[var(--mu2)] hover:text-[var(--w)] transition-colors">
                  <ThumbsUp size={14} />
                  Helpful
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
