import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BlogSection = () => {
  const { language } = useLanguageStore();
  const t = translations[language];

  // Placeholder blog posts. In a real app, these would come from a CMS or database.
  const posts = [
    {
      id: '1',
      title: language === 'ru' ? 'Как купить машину в США без кредитной истории?' : 'How to buy a car in the US without credit history?',
      excerpt: language === 'ru' ? 'Подробное руководство для новоприбывших иммигрантов. Узнайте, какие документы нужны и как избежать высоких процентов.' : 'A comprehensive guide for new immigrants. Learn what documents you need and how to avoid high interest rates.',
      date: 'Oct 15, 2023',
      readTime: '5 min read',
      category: language === 'ru' ? 'Финансы' : 'Finance',
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '2',
      title: language === 'ru' ? 'Лизинг против покупки: что выгоднее в 2024 году?' : 'Leasing vs Buying: What is more profitable in 2024?',
      excerpt: language === 'ru' ? 'Разбираем плюсы и минусы обоих вариантов. Узнайте, почему лизинг становится все более популярным выбором.' : 'We analyze the pros and cons of both options. Find out why leasing is becoming an increasingly popular choice.',
      date: 'Nov 02, 2023',
      readTime: '7 min read',
      category: language === 'ru' ? 'Советы' : 'Tips',
      image: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=800'
    },
    {
      id: '3',
      title: language === 'ru' ? 'Скрытые платежи в дилершипах: как их избежать' : 'Hidden fees at dealerships: how to avoid them',
      excerpt: language === 'ru' ? 'Раскрываем секреты автосалонов. На что обращать внимание при подписании контракта, чтобы не переплатить тысячи долларов.' : 'Revealing the secrets of car dealerships. What to look out for when signing a contract so you don\'t overpay thousands of dollars.',
      date: 'Dec 10, 2023',
      readTime: '6 min read',
      category: language === 'ru' ? 'Безопасность' : 'Security',
      image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=800'
    }
  ];

  return (
    <div className="mb-32">
      <div className="flex items-center gap-4 mb-12">
        <h2 className="font-display text-4xl tracking-widest uppercase">{language === 'ru' ? 'Полезные статьи' : 'Latest Articles'}</h2>
        <div className="flex-1 h-px bg-[var(--b2)]" />
        <Link to="/blog" className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--lime)] hover:text-[var(--w)] transition-colors">
          {language === 'ru' ? 'Все статьи' : 'View All'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {posts.map((post) => (
          <Link to="/blog" key={post.id} className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden hover:border-[var(--lime)]/50 transition-colors group flex flex-col">
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
              <h3 className="font-display text-xl mb-3 text-[var(--w)] group-hover:text-[var(--lime)] transition-colors line-clamp-2">
                {post.title}
              </h3>
              
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
          </Link>
        ))}
      </div>
      
      <div className="mt-8 text-center md:hidden">
        <Link to="/blog" className="inline-flex items-center gap-2 bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-xs uppercase tracking-widest px-10 py-4 rounded-xl hover:border-[var(--lime)] hover:text-[var(--lime)] transition-all">
          {language === 'ru' ? 'Все статьи' : 'View All'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
