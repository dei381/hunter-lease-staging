// SEO intent landing pages. Each entry is an indexable page at /lease/:slug that explains a
// high-intent search (budget, $0 down, EV, best-scored) and funnels into the existing catalog at
// /deals with the matching filters pre-applied. Copy describes the mechanism and our transparency
// promise; it never invents inventory counts, savings figures, or "no-SSN" claims (SSN is required).
//
// Filters use only catalog params verified in DealsPage: max, down, fuelType=Electric, sort=hunterScore.

export interface LandingCopy {
  title: string;        // <title> + og
  description: string;  // meta description
  keywords: string;
  h1: string;
  intro: string;
  bullets: string[];
  cta: string;
}

export interface IntentLanding {
  slug: string;
  filters: string;          // querystring appended to /deals
  related: string[];        // other slugs to cross-link
  en: LandingCopy;
  ru: LandingCopy;
}

export const INTENT_LANDINGS: IntentLanding[] = [
  {
    slug: 'best-deals',
    filters: 'sort=hunterScore',
    related: ['under-400', 'zero-down', 'ev-california'],
    en: {
      title: 'Best Car Lease & Finance Deals in Southern California | Hunter Lease',
      description:
        "See Southern California's top car lease and finance deals, ranked 0 to 100 by Hunter Score. All-in price, money factor and drive-off shown up front. No dealer markups, English and Russian support.",
      keywords:
        'best car lease deals Los Angeles, top lease deals Southern California, car deal score, transparent lease California, лучшие лизинг сделки Калифорния',
      h1: 'The best-scored car deals in Southern California',
      intro:
        'Every deal gets one honest number, the Hunter Score from 0 to 100, so you can see how close it is to the best price for that car before you talk to anyone.',
      bullets: [
        'All-in price, money factor and drive-off shown up front',
        'Ranked by Hunter Score, not by who paid to sit on top',
        'Lease or finance, your choice, with bilingual support',
      ],
      cta: 'See top-scored deals',
    },
    ru: {
      title: 'Лучшие сделки по лизингу и кредиту авто в Южной Калифорнии | Hunter Lease',
      description:
        'Топовые сделки по лизингу и кредиту авто в Южной Калифорнии, отранжированные от 0 до 100 по Hunter Score. Цена, ставка и сборы показаны заранее. Без наценок дилера, поддержка на русском и английском.',
      keywords:
        'лучшие лизинг сделки Калифорния, авто лизинг Лос-Анджелес, оценка сделки авто, прозрачный лизинг, car lease deals Los Angeles',
      h1: 'Сделки с лучшим рейтингом в Южной Калифорнии',
      intro:
        'У каждой сделки одно честное число, Hunter Score от 0 до 100. Он сразу показывает, насколько цена близка к лучшей на эту машину. Видно всё до разговора с дилером.',
      bullets: [
        'Цена, ставка и все сборы показаны заранее',
        'Наверху списка не тот, кто заплатил, а у кого выше Hunter Score',
        'Lease или finance на выбор, говорим по-русски',
      ],
      cta: 'Смотреть лучшие сделки',
    },
  },
  {
    slug: 'under-400',
    filters: 'max=400&sort=hunterScore',
    related: ['zero-down', 'best-deals', 'ev-california'],
    en: {
      title: 'Car Leases Under $400 a Month in SoCal | Hunter Lease',
      description:
        'Browse Southern California car leases at or below $400 per month, with taxes and fees included in the number and ranked by Hunter Score. Lease or finance, English and Russian support.',
      keywords:
        'car lease under 400 a month, cheap lease deals Los Angeles, affordable lease Southern California, лизинг до 400 в месяц',
      h1: 'Car leases under $400 a month',
      intro:
        'Set your ceiling and see what is actually available at that payment, with taxes and fees in the number, not hidden until signing.',
      bullets: [
        'A payment cap with taxes and fees included, no surprises at delivery',
        'Sorted by Hunter Score so the best value rises to the top',
        'Reserve and pick up, the price is locked in advance',
      ],
      cta: 'See leases under $400',
    },
    ru: {
      title: 'Лизинг авто до $400 в месяц в Южной Калифорнии | Hunter Lease',
      description:
        'Лизинг авто в Южной Калифорнии с платежом до $400 в месяц, налоги и сборы уже в цифре, ранжировано по Hunter Score. Лизинг или кредит, поддержка на русском и английском.',
      keywords:
        'лизинг до 400 в месяц, дешёвый лизинг Лос-Анджелес, доступный лизинг Калифорния, car lease under 400',
      h1: 'Лизинг авто до $400 в месяц',
      intro:
        'Задайте потолок платежа и смотрите, что реально доступно. Налоги и сборы уже в цифре. Ничего не всплывёт при подписании.',
      bullets: [
        'Потолок платежа с налогами и сборами внутри, без сюрпризов на выдаче',
        'Сортируем по Hunter Score: наверху машины, где выгода больше',
        'Бронируете и забираете, цена зафиксирована заранее',
      ],
      cta: 'Смотреть лизинг до $400',
    },
  },
  {
    slug: 'zero-down',
    filters: 'down=0&sort=hunterScore',
    related: ['under-400', 'best-deals', 'ev-california'],
    en: {
      title: '$0 Down Car Lease Deals in California | Hunter Lease',
      description:
        'Find $0 down car lease deals in Southern California with the true monthly payment shown up front and ranked by Hunter Score. No rolled-in surprises, English and Russian support.',
      keywords:
        'zero down car lease, 0 down lease deals California, no money down lease Los Angeles, лизинг без первого взноса',
      h1: 'Zero down car lease deals',
      intro:
        'See deals with nothing due at signing, and the real monthly that comes with it, calculated the same way the dealer would, with no rolled-in surprises.',
      bullets: [
        'Nothing due at signing, the real monthly shown honestly',
        'Drive-off math you can check, not marketing',
        'Lease or finance with thin-credit-friendly lenders, an SSN is required',
      ],
      cta: 'See $0 down deals',
    },
    ru: {
      title: 'Лизинг авто с $0 первого взноса в Калифорнии | Hunter Lease',
      description:
        'Сделки по лизингу авто в Южной Калифорнии с $0 первого взноса и честным месячным платежом, ранжировано по Hunter Score. Без скрытых надбавок, поддержка на русском и английском.',
      keywords:
        'лизинг без первого взноса, лизинг 0 первый взнос Калифорния, лизинг без вложений Лос-Анджелес, zero down lease',
      h1: 'Лизинг авто с $0 первого взноса',
      intro:
        'Смотрите сделки, где при подписании платить нечего. Рядом честный месячный платёж. Считаем его как дилер, без скрытых надбавок.',
      bullets: [
        'При подписании платить нечего, месячный платёж показан честно',
        'Drive-off расписан по пунктам, каждый можно проверить',
        'Lease или finance через банки, которые дают первый кредит в США. Нужен SSN.',
      ],
      cta: 'Смотреть сделки с $0 взноса',
    },
  },
  {
    slug: 'ev-california',
    filters: 'fuelType=Electric&sort=hunterScore',
    related: ['best-deals', 'under-400', 'zero-down'],
    en: {
      title: 'Electric Car Lease Deals in California | Hunter Lease',
      description:
        'Lease an electric car in Southern California with the all-in price shown up front and California incentives explained, ranked by Hunter Score. English and Russian support.',
      keywords:
        'electric car lease California, EV lease deals Los Angeles, EV lease incentive California, лизинг электромобиля Калифорния',
      h1: 'Electric car leases in California',
      intro:
        'See EV lease deals with the all-in price on the card and California incentives explained, so you compare real numbers, not a teaser.',
      bullets: [
        'All-in payment, money factor and drive-off shown up front',
        'California EV incentives explained in plain language',
        'Ranked by Hunter Score across Southern California',
      ],
      cta: 'See EV lease deals',
    },
    ru: {
      title: 'Лизинг электромобиля в Калифорнии | Hunter Lease',
      description:
        'Лизинг электромобиля в Южной Калифорнии с ценой all-in заранее и понятным разбором льгот Калифорнии, ранжировано по Hunter Score. Поддержка на русском и английском.',
      keywords:
        'лизинг электромобиля Калифорния, EV лизинг Лос-Анджелес, льготы на электромобиль Калифорния, electric car lease California',
      h1: 'Лизинг электромобиля в Калифорнии',
      intro:
        'Смотрите EV в lease с полной ценой прямо на карточке. Льготы Калифорнии разбираем по пунктам. Сравниваете реальные цифры, а не приманку.',
      bullets: [
        'Полный платёж, money factor и drive-off показаны заранее',
        'Льготы Калифорнии на электромобили объясняем по-человечески',
        'Ранжируем по Hunter Score по всей Южной Калифорнии',
      ],
      cta: 'Смотреть сделки на электромобили',
    },
  },
];

export const INTENT_LANDING_SLUGS = INTENT_LANDINGS.map((l) => l.slug);
export const getLanding = (slug: string | undefined) =>
  INTENT_LANDINGS.find((l) => l.slug === slug);
