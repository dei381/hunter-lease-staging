import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { ArrowRight, Calendar, User, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BlogPage = () => {
  const { language } = useLanguageStore();
  const t = translations[language];

  // Placeholder blog posts. In a real app, these would come from a CMS or database.
  const posts = [
    {
      id: '1',
      title: language === 'ru' ? 'Как купить машину в США без кредитной истории?' : 'How to buy a car in the US without credit history?',
      excerpt: language === 'ru' ? 'Подробное руководство для новоприбывших иммигрантов. Узнайте, какие документы нужны и как избежать высоких процентов.' : 'A comprehensive guide for new immigrants. Learn what documents you need and how to avoid high interest rates.',
      date: 'Oct 15, 2023',
      author: 'Hunter Lease Team',
      readTime: '5 min read',
      category: language === 'ru' ? 'Финансы' : 'Finance',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '2',
      title: language === 'ru' ? 'Лизинг против покупки: что выгоднее в 2024 году?' : 'Leasing vs Buying: What is more profitable in 2024?',
      excerpt: language === 'ru' ? 'Разбираем плюсы и минусы обоих вариантов. Узнайте, почему лизинг становится все более популярным выбором.' : 'We analyze the pros and cons of both options. Find out why leasing is becoming an increasingly popular choice.',
      date: 'Nov 02, 2023',
      author: 'Hunter Lease Team',
      readTime: '7 min read',
      category: language === 'ru' ? 'Советы' : 'Tips',
      image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '3',
      title: language === 'ru' ? 'Скрытые платежи в дилершипах: как их избежать' : 'Hidden fees at dealerships: how to avoid them',
      excerpt: language === 'ru' ? 'Раскрываем секреты автосалонов. На что обращать внимание при подписании контракта, чтобы не переплатить тысячи долларов.' : 'Revealing the secrets of car dealerships. What to look out for when signing a contract so you don\'t overpay thousands of dollars.',
      date: 'Dec 10, 2023',
      author: 'Hunter Lease Team',
      readTime: '6 min read',
      category: language === 'ru' ? 'Безопасность' : 'Security',
      image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20">
      <Helmet>
        <title>{language === 'ru' ? 'Блог | Hunter Lease' : 'Blog | Hunter Lease'}</title>
        <meta name="description" content={language === 'ru' ? 'Полезные статьи о покупке и лизинге авто в США.' : 'Useful articles about buying and leasing cars in the US.'} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="font-display text-5xl tracking-widest uppercase mb-6">
            {language === 'ru' ? 'Блог' : 'Blog'}
          </h1>
          <p className="text-[var(--mu2)] text-xl max-w-2xl mx-auto">
            {language === 'ru' 
              ? 'Полезные советы, руководства и новости из мира автолизинга в США.' 
              : 'Useful tips, guides, and news from the world of auto leasing in the US.'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article key={post.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden hover:border-[var(--lime)]/50 transition-colors group flex flex-col">
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-[var(--bg)]/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-[var(--lime)]">
                  {post.category}
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h2 className="font-display text-xl mb-3 text-[var(--w)] group-hover:text-[var(--lime)] transition-colors line-clamp-2">
                  {post.title}
                </h2>
                
                <p className="text-[var(--mu2)] text-sm mb-6 line-clamp-3 flex-1">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold pt-4 border-t border-[var(--b2)]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
