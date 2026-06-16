import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { getLanding, ALL_LANDINGS } from '../config/landings';

export const IntentLandingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguageStore();
  const landing = getLanding(slug);

  // Unknown slug: a quiet fallback into the catalog rather than a hard 404.
  if (!landing) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center">
        <h1 className="font-display text-3xl font-bold text-[var(--w)]">
          {language === 'ru' ? 'Страница не найдена' : 'Page not found'}
        </h1>
        <Link to="/deals" className="inline-flex items-center gap-2 mt-6 text-[var(--lime)] font-semibold">
          {language === 'ru' ? 'Смотреть все сделки' : 'Browse all deals'} <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  const c = landing[language];
  const dealsHref = `/deals?${landing.filters}`;
  const related = landing.related
    .map((s) => ALL_LANDINGS.find((l) => l.slug === s))
    .filter((l): l is (typeof ALL_LANDINGS)[number] => Boolean(l));

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: c.title,
      description: c.description,
      url: `${typeof window !== 'undefined' ? window.location.origin : ''}/lease/${landing.slug}`,
      inLanguage: language === 'ru' ? 'ru-RU' : 'en-US',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: language === 'ru' ? 'Сделки' : 'Deals', item: '/deals' },
        { '@type': 'ListItem', position: 3, name: c.h1, item: `/lease/${landing.slug}` },
      ],
    },
  ];

  return (
    <>
      <SEO
        title={c.title}
        description={c.description}
        keywords={c.keywords}
        canonicalUrl={`/lease/${landing.slug}`}
        schema={schema}
      />

      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--mu2)] border border-[var(--b2)] rounded-full px-4 py-2">
          <Check size={14} className="text-[var(--lime)]" />
          {language === 'ru'
            ? 'Лицензированный автоброкер California #21318'
            : 'Licensed California auto broker #21318'}
        </div>

        <h1 className="font-display font-bold tracking-tight text-[var(--w)] mt-6 max-w-[16ch] leading-[1.04] text-[clamp(2.4rem,4.6vw,4rem)]">
          {c.h1}
        </h1>

        <p className="mt-6 text-lg leading-relaxed text-[var(--mu2)] max-w-[46ch]">{c.intro}</p>

        <ul className="mt-8 space-y-3 max-w-[52ch]">
          {c.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-[var(--mu)]">
              <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-[var(--lime)]/12 flex items-center justify-center">
                <Check size={13} className="text-[var(--lime)]" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Link
            to={dealsHref}
            className="inline-flex items-center gap-2 h-[54px] px-7 rounded-2xl bg-[var(--lime)] text-black font-bold text-sm uppercase tracking-wide hover:bg-[var(--lime2)] transition-colors"
          >
            {c.cta} <ArrowRight size={18} />
          </Link>
          <Link to="/deals" className="font-semibold text-sm text-[var(--mu)] hover:text-[var(--w)] transition-colors">
            {language === 'ru' ? 'Смотреть все сделки →' : 'Browse all deals →'}
          </Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--mu2)] mb-5">
            {language === 'ru' ? 'Похожие подборки' : 'Related searches'}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {related.map((r) => (
              <Link
                key={r.slug}
                to={`/lease/${r.slug}`}
                className="group block p-5 rounded-2xl border border-[var(--b2)] bg-[var(--s1)] hover:border-[var(--lime)] transition-colors"
              >
                <div className="font-display font-semibold text-[var(--w)] group-hover:text-[var(--lime2)] transition-colors">
                  {r[language].h1}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--mu2)]">
                  {language === 'ru' ? 'Открыть' : 'Open'} <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
};
