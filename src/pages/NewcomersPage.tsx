import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { NEWCOMER as N } from '../config/newcomerCopy';

export const NewcomersPage: React.FC = () => {
  const { language } = useLanguageStore();
  const ru = language === 'ru';
  const pick = (en: string, rus: string) => (ru ? rus : en);

  const bullets = ru ? N.bullets_ru : N.bullets_en;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pick(N.seo_title_en, N.seo_title_ru),
    description: pick(N.seo_desc_en, N.seo_desc_ru),
    inLanguage: ru ? 'ru-RU' : 'en-US',
  };

  return (
    <>
      <SEO
        title={pick(N.seo_title_en, N.seo_title_ru)}
        description={pick(N.seo_desc_en, N.seo_desc_ru)}
        keywords={pick(N.keywords_en, N.keywords_ru)}
        canonicalUrl="/newcomers"
        schema={schema}
      />

      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 md:pt-28">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--mu2)] border border-[var(--b2)] rounded-full px-4 py-2">
          <Check size={14} className="text-[var(--lime)]" />
          {pick('Licensed California auto broker #21318', 'Лицензированный автоброкер California #21318')}
        </div>

        <h1 className="font-display font-bold tracking-tight text-[var(--w)] mt-6 leading-[1.05] text-[clamp(2.3rem,4.6vw,3.8rem)] max-w-[18ch]">
          {pick(N.h1_en, N.h1_ru)}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-[var(--mu2)] max-w-[58ch]">{pick(N.sub_en, N.sub_ru)}</p>

        <ul className="mt-8 space-y-3 max-w-[60ch]">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-[var(--mu)]">
              <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-[var(--lime)]/12 flex items-center justify-center">
                <Check size={13} className="text-[var(--lime)]" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-5">
          <Link to="/deals?sort=hunterScore" className="inline-flex items-center gap-2 h-[54px] px-7 rounded-2xl bg-[var(--lime)] text-black font-bold text-sm uppercase tracking-wide hover:bg-[var(--lime2)] transition-colors">
            {pick(N.cta_en, N.cta_ru)} <ArrowRight size={18} />
          </Link>
          <Link to="/deal-auditor" className="font-semibold text-sm text-[var(--mu)] hover:text-[var(--w)] transition-colors inline-flex items-center gap-1">
            {pick('Check a dealer quote', 'Проверить дилерский оффер')} <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-12">
        <div className="space-y-5">
          {N.sections.map((s, i) => (
            <div key={i} className="p-6 rounded-3xl border border-[var(--b2)] bg-[var(--s1)]">
              <h2 className="font-display text-xl font-semibold text-[var(--w)]">{pick(s.title_en, s.title_ru)}</h2>
              <p className="mt-3 text-[var(--mu)] leading-relaxed">{pick(s.body_en, s.body_ru)}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-5 rounded-2xl bg-[var(--lime)]/8 border border-[var(--lime)]/20 text-sm text-[var(--mu)] leading-relaxed">
          {pick(N.trustline_en, N.trustline_ru)}
        </div>

        <div className="mt-10">
          <Link to="/deals?sort=hunterScore" className="inline-flex items-center gap-2 h-[54px] px-7 rounded-2xl bg-[var(--lime)] text-black font-bold text-sm uppercase tracking-wide hover:bg-[var(--lime2)] transition-colors">
            {pick(N.cta_en, N.cta_ru)} <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
};
