import React, { useEffect } from 'react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { motion } from 'motion/react';
import { ShieldCheck, Globe, Users, Car } from 'lucide-react';

export const AboutPage = () => {
  const { language } = useLanguageStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "mainEntity": {
      "@type": "Organization",
      "name": "Hunter Lease",
      "url": "https://hunterlease.com",
      "logo": "https://hunterlease.com/logo.png",
      "description": "Hunter Lease is the premier auto leasing marketplace in the US, specializing in helping immigrants, expats, and international students get cars without SSN or credit history.",
      "sameAs": [
        "https://www.instagram.com/hunterlease",
        "https://twitter.com/hunterlease"
      ]
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20">
      <SEO 
        title={language === 'ru' ? 'О нас | Hunter Lease' : 'About Us | Hunter Lease'}
        description={language === 'ru' ? 'Узнайте больше о Hunter Lease. Мы помогаем иммигрантам и экспатам получить авто в лизинг без SSN и кредитной истории в США.' : 'Learn more about Hunter Lease. We help immigrants and expats lease cars without an SSN or credit history in the US.'}
        schema={aboutSchema}
      />

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl tracking-widest uppercase mb-6">
            {language === 'ru' ? 'О нас' : 'About Us'}
          </h1>
          <p className="text-[var(--mu2)] text-xl max-w-2xl mx-auto">
            {language === 'ru' 
              ? 'Hunter Lease — это первый маркетплейс автолизинга в США, созданный специально для иммигрантов, экспатов и иностранных студентов.' 
              : 'Hunter Lease is the first auto leasing marketplace in the US built specifically for immigrants, expats, and international students.'}
          </p>
        </div>

        <div className="space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--s1)] border border-[var(--b2)] p-8 rounded-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] flex items-center justify-center">
                <Globe size={24} />
              </div>
              <h2 className="font-display text-2xl tracking-widest uppercase">
                {language === 'ru' ? 'Наша миссия' : 'Our Mission'}
              </h2>
            </div>
            <p className="text-[var(--mu2)] leading-relaxed mb-4">
              {language === 'ru' 
                ? 'Мы верим, что отсутствие кредитной истории (Credit Score) или номера социального страхования (SSN) не должно быть препятствием для мобильности в США. Наша миссия — сделать процесс лизинга и покупки автомобилей прозрачным, честным и доступным для каждого новоприбывшего.' 
                : 'We believe that lacking a Credit Score or a Social Security Number (SSN) should not be a barrier to mobility in the US. Our mission is to make the car leasing and buying process transparent, fair, and accessible for every newcomer.'}
            </p>
            <p className="text-[var(--mu2)] leading-relaxed">
              {language === 'ru' 
                ? 'Мы берем на себя все переговоры с дилерами, избавляя вас от скрытых наценок, языковых барьеров и стресса. С Hunter Lease вы получаете лучшие условия на рынке, даже если вы только что переехали.' 
                : 'We handle all negotiations with dealers, saving you from hidden markups, language barriers, and stress. With Hunter Lease, you get the best deals on the market, even if you just moved here.'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: ShieldCheck,
                title_en: "Zero Hidden Markups",
                title_ru: "Никаких скрытых наценок",
                desc_en: "We guarantee 100% transparent pricing. The price you see is the price you pay.",
                desc_ru: "Мы гарантируем 100% прозрачное ценообразование. Цена, которую вы видите, — это цена, которую вы платите."
              },
              {
                icon: Users,
                title_en: "No SSN Required",
                title_ru: "SSN не требуется",
                desc_en: "Special programs for expats, international students, and immigrants without a US credit history.",
                desc_ru: "Специальные программы для экспатов, иностранных студентов и иммигрантов без кредитной истории в США."
              },
              {
                icon: Car,
                title_en: "Huge Inventory",
                title_ru: "Огромный выбор",
                desc_en: "Access to thousands of pre-negotiated lease deals across Los Angeles and beyond.",
                desc_ru: "Доступ к тысячам заранее согласованных предложений по лизингу по всему Лос-Анджелесу и за его пределами."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[var(--s1)] border border-[var(--b2)] p-6 rounded-2xl"
              >
                <feature.icon className="w-8 h-8 text-[var(--lime)] mb-4" />
                <h3 className="font-display text-lg tracking-widest uppercase mb-2">
                  {language === 'ru' ? feature.title_ru : feature.title_en}
                </h3>
                <p className="text-[var(--mu2)] text-sm leading-relaxed">
                  {language === 'ru' ? feature.desc_ru : feature.desc_en}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
