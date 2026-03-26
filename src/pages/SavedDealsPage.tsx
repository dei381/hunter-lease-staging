import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import { DealCard } from '../components/DealCard';
import { Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { CompareBar } from '../components/CompareBar';

export const SavedDealsPage = () => {
  const { language } = useLanguageStore();
  const t = translations[language];
  const { savedDealIds } = useGarageStore();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/deals')
      .then(res => res.json())
      .then(data => {
        setDeals(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching deals:', err);
        setLoading(false);
      });
  }, []);

  const savedDeals = useMemo(() => {
    return deals.filter(deal => savedDealIds.includes(deal.id.toString()));
  }, [deals, savedDealIds]);

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-24">
      <Helmet>
        <title>{language === 'ru' ? 'Сохраненные предложения' : 'Saved Deals'} | Hunter Lease</title>
      </Helmet>

      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-display uppercase tracking-tighter mb-4">
            {language === 'ru' ? 'Сохраненные предложения' : 'Saved Deals'}
          </h1>
          <p className="text-[var(--mu2)] text-lg max-w-2xl">
            {language === 'ru' 
              ? 'Ваша персональная коллекция автомобилей. Сравнивайте предложения и выбирайте лучшее.' 
              : 'Your personal collection of saved vehicles. Compare deals and choose the best one.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--lime)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedDeals.map(deal => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-12 text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 bg-[var(--s2)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart size={32} className="text-[var(--mu2)]" />
            </div>
            <h2 className="text-2xl font-display uppercase tracking-widest mb-4">
              {language === 'ru' ? 'Нет сохраненных предложений' : 'No Saved Deals'}
            </h2>
            <p className="text-[var(--mu2)] mb-8">
              {language === 'ru' 
                ? 'Вы еще не сохранили ни одного предложения. Просмотрите наш каталог и добавьте понравившиеся автомобили.' 
                : 'You haven\'t saved any deals yet. Browse our inventory and save vehicles you like.'}
            </p>
            <Link 
              to="/deals"
              className="inline-flex items-center gap-2 bg-[var(--lime)] text-black px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors"
            >
              {language === 'ru' ? 'Смотреть каталог' : 'Browse Inventory'}
              <ArrowRight size={20} />
            </Link>
          </div>
        )}
      </div>
      <CompareBar />
    </div>
  );
};
