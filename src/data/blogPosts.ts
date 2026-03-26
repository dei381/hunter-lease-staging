export interface BlogPost {
  id: string;
  title: { en: string; ru: string };
  excerpt: { en: string; ru: string };
  content: { en: string; ru: string };
  date: string;
  author: string;
  authorRole: { en: string; ru: string };
  authorImage: string;
  readTime: { en: string; ru: string };
  category: { en: string; ru: string };
  image: string;
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: {
      ru: 'Как купить машину в США без кредитной истории?',
      en: 'How to buy a car in the US without credit history?'
    },
    excerpt: {
      ru: 'Подробное руководство для новоприбывших иммигрантов. Узнайте, какие документы нужны и как избежать высоких процентов.',
      en: 'A comprehensive guide for new immigrants. Learn what documents you need and how to avoid high interest rates.'
    },
    content: {
      ru: `
        <h2>Введение</h2>
        <p>Переезд в США — это большой шаг, и покупка автомобиля часто становится первой необходимостью. Однако без кредитной истории (Credit Score) этот процесс может показаться сложным. В этой статье мы разберем основные шаги и хитрости.</p>
        
        <h2>Что такое кредитная история и почему она важна?</h2>
        <p>В США ваша финансовая репутация измеряется кредитным рейтингом. Без него банки видят в вас "высокий риск" и либо отказывают в кредите, либо предлагают грабительские проценты (APR 15-25%).</p>
        
        <h2>Альтернативные пути покупки</h2>
        <ul>
          <li><strong>Покупка за наличные (Cash):</strong> Самый простой путь, если у вас есть сбережения. Вы можете купить подержанный автомобиль на Craigslist или Facebook Marketplace.</li>
          <li><strong>Специальные программы для экспатов:</strong> Некоторые производители (например, VW, Ford, Audi) имеют программы "Foreign Professional" или "International Student". Они позволяют получить лизинг или кредит на основе вашей визы и оффера от работодателя.</li>
          <li><strong>Кредит с косайнером (Cosigner):</strong> Если у вас есть родственник или друг с хорошей кредитной историей, он может выступить поручителем.</li>
        </ul>

        <h2>Как Hunter Lease может помочь?</h2>
        <p>Мы специализируемся на поиске оптимальных решений. Наша платформа позволяет найти дилеров, которые работают с программами для экспатов, гарантируя честные условия без скрытых наценок.</p>
      `,
      en: `
        <h2>Introduction</h2>
        <p>Moving to the US is a big step, and buying a car is often the first necessity. However, without a credit history (Credit Score), this process can seem daunting. In this article, we will break down the main steps and tricks.</p>
        
        <h2>What is a credit history and why is it important?</h2>
        <p>In the US, your financial reputation is measured by a credit score. Without it, banks see you as "high risk" and either deny the loan or offer extortionate interest rates (APR 15-25%).</p>
        
        <h2>Alternative ways to buy</h2>
        <ul>
          <li><strong>Cash Purchase:</strong> The easiest way if you have savings. You can buy a used car on Craigslist or Facebook Marketplace.</li>
          <li><strong>Special Expat Programs:</strong> Some manufacturers (e.g., VW, Ford, Audi) have "Foreign Professional" or "International Student" programs. They allow you to get a lease or loan based on your visa and job offer.</li>
          <li><strong>Loan with a Cosigner:</strong> If you have a relative or friend with good credit history, they can act as a guarantor.</li>
        </ul>

        <h2>How can Hunter Lease help?</h2>
        <p>We specialize in finding optimal solutions. Our platform allows you to find dealers who work with expat programs, guaranteeing fair terms without hidden markups.</p>
      `
    },
    date: 'Oct 15, 2023',
    author: 'Alex Carter',
    authorRole: { ru: 'Финансовый эксперт', en: 'Financial Expert' },
    authorImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
    readTime: { ru: '5 мин', en: '5 min read' },
    category: { ru: 'Финансы', en: 'Finance' },
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200',
    featured: true
  },
  {
    id: '2',
    title: {
      ru: 'Лизинг против покупки: что выгоднее в 2024 году?',
      en: 'Leasing vs Buying: What is more profitable in 2024?'
    },
    excerpt: {
      ru: 'Разбираем плюсы и минусы обоих вариантов. Узнайте, почему лизинг становится все более популярным выбором.',
      en: 'We analyze the pros and cons of both options. Find out why leasing is becoming an increasingly popular choice.'
    },
    content: {
      ru: '<p>Контент в разработке...</p>',
      en: '<p>Content under development...</p>'
    },
    date: 'Nov 02, 2023',
    author: 'Sarah Jenkins',
    authorRole: { ru: 'Авто-аналитик', en: 'Auto Analyst' },
    authorImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100',
    readTime: { ru: '7 мин', en: '7 min read' },
    category: { ru: 'Советы', en: 'Tips' },
    image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '3',
    title: {
      ru: 'Скрытые платежи в дилершипах: как их избежать',
      en: 'Hidden fees at dealerships: how to avoid them'
    },
    excerpt: {
      ru: 'Раскрываем секреты автосалонов. На что обращать внимание при подписании контракта, чтобы не переплатить тысячи долларов.',
      en: 'Revealing the secrets of car dealerships. What to look out for when signing a contract so you don\'t overpay thousands of dollars.'
    },
    content: {
      ru: '<p>Контент в разработке...</p>',
      en: '<p>Content under development...</p>'
    },
    date: 'Dec 10, 2023',
    author: 'Mike Ross',
    authorRole: { ru: 'Юрист', en: 'Legal Advisor' },
    authorImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100',
    readTime: { ru: '6 мин', en: '6 min read' },
    category: { ru: 'Безопасность', en: 'Security' },
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: '4',
    title: {
      ru: 'Топ-5 электромобилей для лизинга в этом сезоне',
      en: 'Top 5 EVs to lease this season'
    },
    excerpt: {
      ru: 'Обзор лучших предложений на рынке электромобилей с учетом налоговых вычетов.',
      en: 'Review of the best EV deals on the market factoring in tax credits.'
    },
    content: {
      ru: '<p>Контент в разработке...</p>',
      en: '<p>Content under development...</p>'
    },
    date: 'Jan 05, 2024',
    author: 'Elena Petrova',
    authorRole: { ru: 'EV Эксперт', en: 'EV Expert' },
    authorImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100',
    readTime: { ru: '4 мин', en: '4 min read' },
    category: { ru: 'Обзоры', en: 'Reviews' },
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938cb?auto=format&fit=crop&q=80&w=800'
  }
];
