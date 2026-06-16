import React, { useEffect } from 'react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { motion } from 'motion/react';
import { Gauge, TrendingDown, Scale, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';

// Keep these in sync with server/services/engine/HunterScore.ts
const LCR_BEST = 0.8;   // % of MSRP / mo -> LCR axis 100
const LCR_WORST = 2.4;  // % of MSRP / mo -> LCR axis 0
const MIN_LCR = 0.6;    // below this -> "Pending", never scored

const isRu = (l: string) => l === 'ru';

export const HunterScorePage = () => {
  const { language } = useLanguageStore();
  const ru = isRu(language);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'Hunter Score methodology',
    description: 'How the Hunter Score rates a car deal from 0 to 100 against the real local market.',
    publisher: { '@type': 'Organization', name: 'Hunter Lease', url: 'https://hunterlease.com' },
  };

  const bands = [
    {
      range: '85 - 100', color: 'var(--lime)',
      name_en: 'Hunter Verified Steal', name_ru: 'Hunter Verified Steal',
      desc_en: 'Top-tier. Clearly below the local market and very cheap relative to MSRP. Lock it.',
      desc_ru: 'Высшая лига. Явно ниже местного рынка и очень дёшево относительно MSRP. Можно фиксировать.',
    },
    {
      range: '65 - 84', color: '#34d399',
      name_en: 'Strong Deal', name_ru: 'Сильная сделка',
      desc_en: 'A genuinely good deal: below market with a healthy payment-to-MSRP ratio.',
      desc_ru: 'Действительно хорошая сделка: ниже рынка и со здоровым отношением платежа к MSRP.',
    },
    {
      range: '50 - 64', color: '#facc15',
      name_en: 'Fair Deal', name_ru: 'Нормальная сделка',
      desc_en: 'About market. Fine, but not a standout. Worth comparing against higher-scored cars.',
      desc_ru: 'Примерно по рынку. Нормально, но не выдающееся. Стоит сравнить с машинами с более высоким скором.',
    },
    {
      range: 'below 50', color: 'var(--mu2)',
      name_en: 'Above Market', name_ru: 'Выше рынка',
      desc_en: 'Priced above the local market for this car. Keep looking.',
      desc_ru: 'Дороже местного рынка по этой машине. Лучше поискать ещё.',
    },
  ];

  const axes = [
    {
      icon: TrendingDown, weight: '60%',
      title_en: 'How far below the local market', title_ru: 'Насколько ниже местного рынка',
      desc_en: 'We compare the deal’s monthly payment to the average monthly for the same car in your area. Exactly at market scores 50; about 20% below market scores 100. This is the part you feel: am I paying less than everyone else?',
      desc_ru: 'Сравниваем месячный платёж сделки со средним месячным по такой же машине в вашем регионе. Ровно по рынку - 50 баллов; примерно на 20% ниже рынка - 100. Это то, что ощущается: я плачу меньше остальных?',
    },
    {
      icon: Scale, weight: '40%',
      title_en: 'How cheap relative to the car’s price (LCR)', title_ru: 'Насколько дёшево относительно цены машины (LCR)',
      desc_en: `LCR = monthly payment as a percent of MSRP. A $40,000 car at $320/mo is 0.8% - excellent. Around 0.8% scores 100; around 2.4% scores 0. This is an absolute yardstick that does not depend on anyone’s opinion of "market".`,
      desc_ru: `LCR = месячный платёж в процентах от MSRP. Машина за $40,000 по $320/мес = 0.8% - отлично. Около 0.8% - 100 баллов; около 2.4% - 0. Это абсолютная мера, не зависящая от чьего-либо мнения о «рынке».`,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20">
      <SEO
        title={ru ? 'Hunter Score: как он считается | Hunter Lease' : 'Hunter Score: how it works | Hunter Lease'}
        description={ru
          ? 'Hunter Score оценивает автосделку от 0 до 100 относительно реального местного рынка. Полная методология и формула.'
          : 'The Hunter Score rates a car deal from 0 to 100 against the real local market. Full methodology and formula.'}
        schema={schema}
      />

      <div className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl bg-[var(--lime)]/10 text-[var(--lime)] flex items-center justify-center mx-auto mb-6">
            <Gauge size={32} />
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-widest uppercase mb-6">Hunter Score</h1>
          <p className="text-[var(--mu2)] text-xl max-w-2xl mx-auto">
            {ru
              ? 'Одно число от 0 до 100, которое сразу говорит: насколько хороша эта сделка относительно реального рынка. Чтобы вы перестали гадать и выбирали уверенно.'
              : 'One number from 0 to 100 that tells you, at a glance, how good a deal is against the real market. So you stop guessing and choose with confidence.'}
          </p>
        </div>

        <div className="space-y-12">
          {/* What it is */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--s1)] border border-[var(--b2)] p-8 rounded-2xl">
            <h2 className="font-display text-2xl tracking-widest uppercase mb-4">
              {ru ? 'Зачем он нужен' : 'Why it exists'}
            </h2>
            <p className="text-[var(--mu2)] leading-relaxed">
              {ru
                ? 'Лизинг и кредит специально устроены запутанно: money factor, остаточная стоимость, cap cost. Понять, хорошая ли цена, почти невозможно. Hunter Score сводит всё к одному честному числу: чем выше, тем лучше сделка. Никакой лизинговый сервис в США так не делает.'
                : 'Leases and loans are deliberately confusing: money factor, residual, cap cost. It is nearly impossible to tell if a price is good. The Hunter Score collapses all of it into one honest number: the higher it is, the better the deal. No US lease service does this.'}
            </p>
          </motion.section>

          {/* Bands */}
          <section>
            <h2 className="font-display text-2xl tracking-widest uppercase mb-6 text-center">
              {ru ? 'Что означают баллы' : 'What the score means'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {bands.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="bg-[var(--s1)] border border-[var(--b2)] p-6 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono font-bold text-lg" style={{ color: b.color }}>{b.range}</span>
                    <span className="text-sm font-bold uppercase tracking-widest" style={{ color: b.color }}>
                      {ru ? b.name_ru : b.name_en}
                    </span>
                  </div>
                  <p className="text-[var(--mu2)] text-sm leading-relaxed">{ru ? b.desc_ru : b.desc_en}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Two axes */}
          <section>
            <h2 className="font-display text-2xl tracking-widest uppercase mb-6 text-center">
              {ru ? 'Из чего складывается' : 'What it measures'}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {axes.map((a, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-[var(--s1)] border border-[var(--b2)] p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--lime)]/10 text-[var(--lime)] flex items-center justify-center">
                      <a.icon size={20} />
                    </div>
                    <span className="font-mono font-bold text-[var(--lime)] text-sm">{a.weight}</span>
                  </div>
                  <h3 className="font-bold text-[var(--w)] mb-2">{ru ? a.title_ru : a.title_en}</h3>
                  <p className="text-[var(--mu2)] text-sm leading-relaxed">{ru ? a.desc_ru : a.desc_en}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-[var(--mu2)] text-xs text-center mt-4">
              {ru
                ? 'Если для машины пока нет проверенной рыночной средней, считаем только по LCR, а не выдумываем «рынок».'
                : 'If we do not yet have a verified market average for a car, we score on LCR alone rather than inventing a "market".'}
            </p>
          </section>

          {/* The ideal deal */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--lime)]/5 border border-[var(--lime)]/30 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="text-[var(--lime)]" size={24} />
              <h2 className="font-display text-2xl tracking-widest uppercase">
                {ru ? 'Какая сделка - идеал' : 'What an ideal deal looks like'}
              </h2>
            </div>
            <p className="text-[var(--mu2)] leading-relaxed">
              {ru
                ? `Идеал (95-100, «Hunter Verified Steal») - это платёж около ${LCR_BEST}% от MSRP в месяц И минимум на 20% ниже местного рынка, без накруток. Пример: машина за $40,000 примерно за $320/мес, когда по рынку в районе берут ближе к $480. Это и есть «опт, а не розница».`
                : `An ideal deal (95-100, "Hunter Verified Steal") is a payment near ${LCR_BEST}% of MSRP per month AND at least 20% below the local market, with no markups. Example: a $40,000 car around $320/mo when the local market is closer to $480. That is wholesale, not retail.`}
            </p>
          </motion.section>

          {/* The formula */}
          <section className="bg-[var(--s1)] border border-[var(--b2)] p-8 rounded-2xl">
            <h2 className="font-display text-2xl tracking-widest uppercase mb-4">
              {ru ? 'Формула (для тех, кто любит точность)' : 'The formula (for the precise)'}
            </h2>
            <p className="text-[var(--mu2)] text-sm leading-relaxed mb-4">
              {ru ? 'Каждая ось приводится к шкале 0-100, затем складывается с весами.' : 'Each axis is mapped to 0-100, then combined by weight.'}
            </p>
            <pre className="bg-[var(--bg)] border border-[var(--b2)] rounded-xl p-4 text-xs text-[var(--mu2)] overflow-x-auto font-mono leading-relaxed">
{`LCR%        = monthly_payment / MSRP * 100
LCR_axis    = clamp( (${LCR_WORST} - LCR%) / (${LCR_WORST} - ${LCR_BEST}) * 100 , 0..100 )

market_delta = (market_avg - monthly_payment) / market_avg
market_axis  = clamp( 50 + market_delta * 250 , 0..100 )

Hunter Score = round( 0.6 * market_axis + 0.4 * LCR_axis )
             = round( LCR_axis )   // when no verified market average

Bands: >=85 Steal | 65-84 Strong | 50-64 Fair | <50 Above Market`}
            </pre>
          </section>

          {/* Data + honesty */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--s1)] border border-[var(--b2)] p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="text-[var(--lime)]" size={20} />
                <h3 className="font-bold text-[var(--w)]">{ru ? 'На каких данных' : 'What it runs on'}</h3>
              </div>
              <ul className="text-[var(--mu2)] text-sm leading-relaxed space-y-2 list-disc pl-4">
                <li>{ru ? 'Реальный платёж - тот же, что в калькуляторе: живые ставки банков, инсентивы и дилерская скидка, налог и сборы Калифорнии.' : 'The real payment, identical to the calculator: live bank rates, incentives and dealer discount, CA tax and fees.'}</li>
                <li>{ru ? 'MSRP машины.' : 'The vehicle MSRP.'}</li>
                <li>{ru ? 'Средний месячный платёж по такой же машине в вашем регионе.' : 'The average monthly for the same car in your area.'}</li>
              </ul>
            </div>
            <div className="bg-[var(--s1)] border border-[var(--b2)] p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="text-[var(--lime)]" size={20} />
                <h3 className="font-bold text-[var(--w)]">{ru ? 'Мы не показываем фейк' : 'We never fake it'}</h3>
              </div>
              <p className="text-[var(--mu2)] text-sm leading-relaxed">
                {ru
                  ? `Если данных не хватает или платёж подозрительно низкий (ниже ${MIN_LCR}% от MSRP - почти всегда ошибка в данных), мы ставим «Pending», а не выдуманную цифру. Лучше ничего, чем фейковая «сотка».`
                  : `If data is incomplete or the payment is implausibly low (below ${MIN_LCR}% of MSRP, almost always a data error), we show "Pending" instead of a made-up number. Better nothing than a fake 100.`}
              </p>
            </div>
          </section>

          {/* Roadmap honesty */}
          <section className="bg-[var(--s1)] border border-[var(--b2)] p-8 rounded-2xl">
            <h2 className="font-display text-2xl tracking-widest uppercase mb-4">
              {ru ? 'Что дальше' : 'What is coming'}
            </h2>
            <p className="text-[var(--mu2)] leading-relaxed">
              {ru
                ? 'Сегодня Score измеряет цену относительно рынка и MSRP. Дальше добавим анти-накрутку: наценку дилера на money factor, долю захваченных инсентивов и чистоту сборов (doc fee в пределах лимита Калифорнии, без мусорных допов). Чем больше данных, тем труднее обмануть скор.'
                : 'Today the score measures price against the market and MSRP. Next we add anti-markup factors: the dealer’s money-factor markup, the share of available incentives captured, and fee cleanliness (doc fee within California’s cap, no junk add-ons). The more data, the harder it is to game.'}
            </p>
          </section>

          {/* CTA */}
          <div className="text-center pt-4">
            <a href="/deals?sort=hunterScore"
              className="inline-flex items-center gap-2 bg-[var(--lime)] text-black font-display text-sm tracking-widest uppercase px-8 py-4 rounded-xl hover:bg-[var(--lime2)] transition-colors">
              <Gauge size={18} /> {ru ? 'Смотреть сделки по Hunter Score' : 'Browse deals by Hunter Score'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
