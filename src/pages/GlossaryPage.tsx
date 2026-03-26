import React, { useEffect } from 'react';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';

export const GlossaryPage = () => {
  const { language } = useLanguageStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const terms = [
    {
      term_en: "MSRP (Manufacturer's Suggested Retail Price)",
      term_ru: "MSRP (Рекомендованная розничная цена)",
      def_en: "The price the manufacturer recommends the dealer sell the car for. Also known as the sticker price.",
      def_ru: "Цена, по которой производитель рекомендует дилеру продавать автомобиль. Также известна как цена по прайсу."
    },
    {
      term_en: "Capitalized Cost (Cap Cost)",
      term_ru: "Capitalized Cost (Капитализированная стоимость)",
      def_en: "The negotiated price of the vehicle, plus any fees or taxes that are rolled into the lease. This is the starting point for calculating your lease payments.",
      def_ru: "Окончательная согласованная цена автомобиля плюс любые сборы или налоги, включенные в лизинг. Это отправная точка для расчета лизинговых платежей."
    },
    {
      term_en: "Residual Value",
      term_ru: "Residual Value (Остаточная стоимость)",
      def_en: "The estimated value of the car at the end of the lease term. A higher residual value generally means lower monthly payments.",
      def_ru: "Оценочная стоимость автомобиля в конце срока лизинга. Чем выше остаточная стоимость, тем ниже ежемесячные платежи."
    },
    {
      term_en: "Money Factor (Lease Rate)",
      term_ru: "Money Factor (Процентная ставка лизинга)",
      def_en: "The interest rate on a lease, expressed as a small decimal fraction. To convert it to an approximate annual percentage rate (APR), multiply by 2400.",
      def_ru: "Процентная ставка по лизингу, выраженная в виде небольшой десятичной дроби. Чтобы перевести ее в примерную годовую процентную ставку (APR), умножьте на 2400."
    },
    {
      term_en: "Disposition Fee",
      term_ru: "Disposition Fee (Комиссия за возврат)",
      def_en: "A fee charged by the leasing company at the end of the lease to cover the costs of preparing the vehicle for resale.",
      def_ru: "Комиссия, взимаемая лизинговой компанией в конце срока лизинга для покрытия расходов на подготовку автомобиля к перепродаже."
    },
    {
      term_en: "Acquisition Fee",
      term_ru: "Acquisition Fee (Комиссия за оформление)",
      def_en: "An administrative fee charged by the leasing company to set up the lease. Also known as a bank fee.",
      def_ru: "Административный сбор, взимаемый лизинговой компанией за оформление лизинга. Также известен как банковская комиссия."
    },
    {
      term_en: "SSN (Social Security Number)",
      term_ru: "SSN (Номер социального страхования)",
      def_en: "A nine-digit number issued to U.S. citizens, permanent residents, and temporary (working) residents. Hunter Lease specializes in helping clients lease without an SSN.",
      def_ru: "Девятизначный номер, выдаваемый гражданам США, постоянным и временным резидентам. Hunter Lease специализируется на помощи клиентам в оформлении лизинга без SSN."
    },
    {
      term_en: "Credit Score",
      term_ru: "Credit Score (Кредитный рейтинг)",
      def_en: "A number representing your creditworthiness based on your credit history. We help expats and international students get approved even with zero credit history.",
      def_ru: "Число, отражающее вашу кредитоспособность на основе кредитной истории. Мы помогаем экспатам и иностранным студентам получить одобрение даже с нулевой кредитной историей."
    },
    {
      term_en: "Co-signer",
      term_ru: "Co-signer (Поручитель)",
      def_en: "A person with good credit who signs the lease with you and assumes legal responsibility for the payments if you default. Often used by international students.",
      def_ru: "Человек с хорошей кредитной историей, который подписывает договор лизинга вместе с вами и берет на себя юридическую ответственность за платежи в случае вашего дефолта. Часто используется иностранными студентами."
    },
    {
      term_en: "Cap Cost Reduction (Down Payment)",
      term_ru: "Cap Cost Reduction (Первоначальный взнос)",
      def_en: "Any upfront payment, trade-in allowance, or rebate that reduces the capitalized cost of the lease, thereby lowering the monthly payments.",
      def_ru: "Любой авансовый платеж, стоимость сданного в trade-in авто или скидка, которая снижает капитализированную стоимость лизинга и, следовательно, ежемесячные платежи."
    }
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": terms.map((t) => ({
      "@type": "Question",
      "name": language === 'ru' ? t.term_ru : t.term_en,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": language === 'ru' ? t.def_ru : t.def_en
      }
    }))
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20">
      <SEO 
        title={language === 'ru' ? 'Словарь терминов автолизинга | Hunter Lease' : 'Auto Leasing Glossary | Hunter Lease'}
        description={language === 'ru' ? 'Понятный словарь терминов автолизинга в США для иммигрантов и экспатов.' : 'A clear auto leasing glossary in the US for immigrants and expats.'}
        schema={faqSchema}
      />

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] mb-6">
            <BookOpen size={32} />
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-widest uppercase mb-6">
            {language === 'ru' ? 'Словарь Автолизинга' : 'Auto Leasing Glossary'}
          </h1>
          <p className="text-[var(--mu2)] text-xl max-w-2xl mx-auto">
            {language === 'ru' 
              ? 'Разбираемся в сложных терминах автолизинга в США. Специально для иммигрантов и экспатов.' 
              : 'Understanding complex auto leasing terms in the US. Specially curated for immigrants and expats.'}
          </p>
        </div>

        <div className="space-y-6">
          {terms.map((item, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[var(--s1)] border border-[var(--b2)] p-6 rounded-2xl"
            >
              <h3 className="font-display text-xl tracking-widest text-[var(--lime)] mb-3">
                {language === 'ru' ? item.term_ru : item.term_en}
              </h3>
              <p className="text-[var(--mu2)] leading-relaxed">
                {language === 'ru' ? item.def_ru : item.def_en}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
