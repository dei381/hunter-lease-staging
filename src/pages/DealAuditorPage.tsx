import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, AlertTriangle, Search } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { computeHunterScore, type HunterBand } from '@/server/services/engine/HunterScore';

// Band presentation. Labels/colors live here so the engine stays presentation-free.
const BAND_META: Record<HunterBand, { ru: string; en: string; color: string; readEn: string; readRu: string }> = {
  steal: {
    en: 'Hunter Verified Steal', ru: 'Отличная сделка', color: '#22c997',
    readEn: 'This is an excellent lease rate for this car. Lock it in.',
    readRu: 'Отличная ставка лизинга для этой машины. Фиксируйте.',
  },
  strong: {
    en: 'Strong Deal', ru: 'Сильная сделка', color: '#22c997',
    readEn: 'A strong deal. Worth taking, and we may still be able to beat it.',
    readRu: 'Сильная сделка. Брать стоит, но мы её, скорее всего, побьём.',
  },
  fair: {
    en: 'Fair Deal', ru: 'Нормальная сделка', color: '#f59e0b',
    readEn: 'Average for this car. There is likely room to do better.',
    readRu: 'Для этой машины так себе. Можно выбить лучше.',
  },
  above_market: {
    en: 'Above Market', ru: 'Выше рынка', color: '#ef4444',
    readEn: 'This looks above market. Do not sign yet, see what else is out there.',
    readRu: 'Это выше рынка. Не подписывайте, сначала сравните.',
  },
};

const RADIUS = 66;
const CIRC = 2 * Math.PI * RADIUS;

export const DealAuditorPage: React.FC = () => {
  const { language } = useLanguageStore();
  const ru = language === 'ru';

  const [payment, setPayment] = useState('');
  const [msrp, setMsrp] = useState('');
  const [term, setTerm] = useState('36');
  const [dueAtSigning, setDueAtSigning] = useState('');

  const num = (s: string) => {
    const n = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };

  const result = useMemo(() => {
    const p = num(payment);
    const m = num(msrp);
    const t = num(term) || 36;
    const das = num(dueAtSigning);
    if (!(p > 0) || !(m > 0)) return null;
    // Effective monthly spreads any due-at-signing above the first payment across the term,
    // so a "$0/mo with big money down" trick cannot fake a great score.
    const effMonthly = p + (das > p ? (das - p) / t : 0);
    return { ...computeHunterScore({ paymentMonthly: effMonthly, msrp: m }), effMonthly };
  }, [payment, msrp, term, dueAtSigning]);

  const scored = result && result.status === 'scored' && result.score != null && result.band;
  const meta = scored ? BAND_META[result!.band as HunterBand] : null;
  const score = scored ? (result!.score as number) : 0;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: ru ? 'Аудитор лизинговой сделки' : 'Lease Deal Auditor',
    applicationCategory: 'FinanceApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: ru
      ? 'Проверьте оффер дилера по lease бесплатно. Дадим оценку 0-100 по методике Hunter Score.'
      : 'Free check of a dealer lease quote: get a 0-100 verdict using the same Hunter Score method.',
  };

  const inputCls =
    'w-full h-14 px-4 rounded-xl bg-[var(--bg)] border border-[var(--b2)] text-lg font-semibold text-[var(--w)] focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)] outline-none transition-all';
  const labelCls = 'block text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-2';

  return (
    <>
      <SEO
        title={ru ? 'Аудитор лизинговой сделки: ваш оффер выгоден? | Hunter Lease' : 'Lease Deal Auditor: Is Your Car Lease Quote a Good Deal? | Hunter Lease'}
        description={ru
          ? 'Введите платёж и MSRP из оффера дилера. За секунды узнаете, насколько он хорош, по методике Hunter Score. Без логина, бесплатно.'
          : 'Enter the payment and MSRP from a dealer lease quote and see in seconds how good it is, by the Hunter Score method. No login, free.'}
        keywords={ru
          ? 'проверить лизинг сделку, выгодный ли лизинг, аудит оффера авто, lease deal checker'
          : 'is my car lease a good deal, lease quote checker, lease deal auditor, lease payment calculator Los Angeles'}
        canonicalUrl="/deal-auditor"
        schema={schema}
      />

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-24 md:pt-24">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--mu2)] border border-[var(--b2)] rounded-full px-4 py-2">
          <Search size={14} className="text-[var(--lime)]" />
          {ru ? 'Бесплатно, без логина' : 'Free, no login'}
        </div>

        <h1 className="font-display font-bold tracking-tight text-[var(--w)] mt-6 leading-[1.05] text-[clamp(2.2rem,4.4vw,3.6rem)] max-w-[18ch]">
          {ru ? 'Вам дали хорошую цену на лизинг?' : 'Is your lease quote actually good?'}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-[var(--mu2)] max-w-[46ch]">
          {ru
            ? 'Вбейте платёж и MSRP из оффера дилера. Прогоним через движок Hunter Score и скажем прямо: брать или торговаться.'
            : 'Enter the payment and MSRP from your dealer quote. We score it with the same Hunter Score engine and tell you straight: take it or push back.'}
        </p>

        <div className="mt-10 grid md:grid-cols-2 gap-x-5 gap-y-6 p-6 rounded-3xl border border-[var(--b2)] bg-[var(--s1)]">
          <div>
            <label className={labelCls}>{ru ? 'Платёж в месяц' : 'Monthly payment'}</label>
            <input className={inputCls} inputMode="decimal" placeholder="$389" value={payment} onChange={(e) => setPayment(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>MSRP</label>
            <input className={inputCls} inputMode="decimal" placeholder="$42,000" value={msrp} onChange={(e) => setMsrp(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{ru ? 'Срок, месяцев' : 'Term, months'}</label>
            <input className={inputCls} inputMode="numeric" placeholder="36" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>{ru ? 'При подписании (необязательно)' : 'Due at signing (optional)'}</label>
            <input className={inputCls} inputMode="decimal" placeholder="$0" value={dueAtSigning} onChange={(e) => setDueAtSigning(e.target.value)} />
          </div>
        </div>

        {/* Verdict */}
        {result && (
          <div className="mt-8 p-7 rounded-3xl border border-[var(--b2)] bg-[var(--bg)] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)]">
            {scored && meta ? (
              <div className="flex flex-col sm:flex-row items-center gap-7">
                <svg width="170" height="170" viewBox="0 0 170 170" className="shrink-0">
                  <circle cx="85" cy="85" r={RADIUS} fill="none" stroke="#e6efec" strokeWidth="14" />
                  <circle
                    cx="85" cy="85" r={RADIUS} fill="none" stroke={meta.color} strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - score / 100)} transform="rotate(-90 85 85)"
                  />
                  <text x="85" y="80" textAnchor="middle" fontFamily="Outfit" fontWeight="700" fontSize="46" fill="var(--w)">{score}</text>
                  <text x="85" y="104" textAnchor="middle" fontFamily="Inter" fontWeight="600" fontSize="11" letterSpacing="2" fill={meta.color}>
                    {(ru ? meta.ru : meta.en).toUpperCase()}
                  </text>
                </svg>
                <div className="text-center sm:text-left">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--mu2)]">Hunter Score</div>
                  <div className="font-display text-2xl font-bold text-[var(--w)] mt-1">{ru ? meta.ru : meta.en}</div>
                  <p className="mt-2 text-[var(--mu)] leading-relaxed">{ru ? meta.readRu : meta.readEn}</p>
                  <div className="mt-3 text-sm text-[var(--mu2)]">
                    {ru ? 'Платёж к MSRP (LCR): ' : 'Payment to MSRP (LCR): '}
                    <span className="font-semibold text-[var(--w)]">{result.lcrPercent}%</span>
                    {num(dueAtSigning) > num(payment) && (
                      <> · {ru ? 'эфф. платёж' : 'eff. monthly'} <span className="font-semibold text-[var(--w)]">${Math.round(result.effMonthly)}</span></>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#f59e0b] mt-0.5 shrink-0" />
                <p className="text-[var(--mu)] leading-relaxed">
                  {ru
                    ? 'Для lease эти цифры не сходятся: платёж слишком мал к MSRP. Перепроверьте платёж и MSRP. А может, это и не lease.'
                    : 'These numbers do not add up for a lease (the payment is too low relative to the MSRP). Double-check the payment and MSRP, or this may not be a lease.'}
                </p>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-[var(--b2)] text-xs text-[var(--mu2)] leading-relaxed">
              {ru
                ? 'Оценку даём по отношению платежа к MSRP (LCR). По сделкам из каталога Hunter Score ещё и сравнивает с живым местным рынком. Money factor и реальные incentives уточняйте у консьержа.'
                : 'This score uses your payment vs MSRP (the lease cost ratio). On deals listed here, Hunter Score also compares to the live local market. Confirm the money factor and real incentives with a concierge.'}
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link to="/deals?sort=hunterScore" className="inline-flex items-center gap-2 h-[54px] px-7 rounded-2xl bg-[var(--lime)] text-black font-bold text-sm uppercase tracking-wide hover:bg-[var(--lime2)] transition-colors">
            {ru ? 'Сделки, которые бьют вашу' : 'See deals that beat this'} <ArrowRight size={18} />
          </Link>
          <Link to="/hunter-score" className="font-semibold text-sm text-[var(--mu)] hover:text-[var(--w)] transition-colors inline-flex items-center gap-1">
            {ru ? 'Как считается Hunter Score' : 'How Hunter Score works'} <ArrowRight size={14} />
          </Link>
        </div>

        <ul className="mt-10 space-y-3 max-w-[52ch]">
          {(ru
            ? ['Нам не платят за место в топе. Считаем честно.', 'Без логина. Данные дилерам не уходят.', 'Тот же движок, что оценивает сделки в каталоге.']
            : ['No one pays us to rank on top, the math is honest', 'No login and nothing handed to dealers', 'The same engine that scores deals in our catalog']
          ).map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-[var(--mu)]">
              <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-[var(--lime)]/12 flex items-center justify-center">
                <Check size={13} className="text-[var(--lime)]" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};
