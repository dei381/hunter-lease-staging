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
      def_ru: "Цена, которую производитель рекомендует дилеру за машину. Её ещё называют ценой по прайсу."
    },
    {
      term_en: "Capitalized Cost (Cap Cost)",
      term_ru: "Capitalized Cost (Капитализированная стоимость)",
      def_en: "The negotiated price of the vehicle, plus any fees or taxes that are rolled into the lease. This is the starting point for calculating your lease payments.",
      def_ru: "Итоговая цена машины, которую вы согласовали, плюс сборы и налоги внутри лизинга. С этой суммы начинается расчёт месячного платежа."
    },
    {
      term_en: "Residual Value",
      term_ru: "Residual Value (Остаточная стоимость)",
      def_en: "The estimated value of the car at the end of the lease term. A higher residual value generally means lower monthly payments.",
      def_ru: "Сколько машина будет стоить в конце лизинга. Чем выше residual, тем ниже месячный платёж."
    },
    {
      term_en: "Money Factor (Lease Rate)",
      term_ru: "Money Factor (Процентная ставка лизинга)",
      def_en: "The interest rate on a lease, expressed as a small decimal fraction. To convert it to an approximate annual percentage rate (APR), multiply by 2400.",
      def_ru: "Ставка по лизингу, записанная маленькой десятичной дробью. Умножьте её на 2400 и получите примерный APR."
    },
    {
      term_en: "Disposition Fee",
      term_ru: "Disposition Fee (Комиссия за возврат)",
      def_en: "A fee charged by the leasing company at the end of the lease to cover the costs of preparing the vehicle for resale.",
      def_ru: "Комиссия, которую лизинговая компания берёт в конце срока. Она покрывает подготовку машины к перепродаже."
    },
    {
      term_en: "Acquisition Fee",
      term_ru: "Acquisition Fee (Комиссия за оформление)",
      def_en: "An administrative fee charged by the leasing company to set up the lease. Also known as a bank fee.",
      def_ru: "Сбор лизинговой компании за оформление лизинга. Его ещё называют банковской комиссией."
    },
    {
      term_en: "SSN (Social Security Number)",
      term_ru: "SSN (Номер социального страхования)",
      def_en: "A nine-digit number issued to US citizens, permanent residents, and work-authorized residents. An SSN is required to lease or finance with us. If your US credit is thin or new, we match you with lenders friendly to first-time borrowers, and a co-signer can help.",
      def_ru: "Девятизначный номер для граждан США, постоянных и рабочих резидентов. SSN обязателен для лизинга или кредита у нас. Если кредитная история в США короткая или новая, мы подберём банк, лояльный к первым заёмщикам, а поручитель поможет."
    },
    {
      term_en: "Credit Score",
      term_ru: "Credit Score (Кредитный рейтинг)",
      def_en: "A number from your credit history that lenders use to price your rate. Being new to US credit is common, not a dead end: we show which tier you fall into and find a lender that works with thin files. An SSN is required.",
      def_ru: "Число из вашей кредитной истории, по которому банк назначает ставку. Короткая история в США это норма, а не тупик: мы покажем ваш тир и найдём банк, работающий с тонкими профилями. SSN обязателен."
    },
    {
      term_en: "Co-signer",
      term_ru: "Co-signer (Поручитель)",
      def_en: "A person with good credit who signs the lease with you and assumes legal responsibility for the payments if you default. Often used by international students.",
      def_ru: "Человек с хорошим скором, который подписывает договор вместе с вами. Если вы перестанете платить, по закону платит он. Часто к нему прибегают иностранные студенты."
    },
    {
      term_en: "Cap Cost Reduction (Down Payment)",
      term_ru: "Cap Cost Reduction (Первоначальный взнос)",
      def_en: "Any upfront payment, trade-in allowance, or rebate that reduces the capitalized cost of the lease, thereby lowering the monthly payments.",
      def_ru: "Аванс, зачёт машины в trade-in или скидка, которые уменьшают cap cost. А вместе с ним падает и месячный платёж."
    },
    {
      term_en: "Drive-off / Due at Signing",
      term_ru: "Drive-off (Сумма при подписании)",
      def_en: "The total cash due up front at signing: first month, fees, and any down payment. We show it in full, so a $0-down deal is honestly $0, with nothing hidden in the monthly.",
      def_ru: "Вся сумма наличными при подписании: первый месяц, сборы и взнос. Мы показываем её целиком, поэтому сделка с $0 взноса это честный $0, без скрытого в платеже."
    },
    {
      term_en: "APR (Annual Percentage Rate)",
      term_ru: "APR (Годовая процентная ставка)",
      def_en: "The yearly cost of borrowing as a percent. For a lease, money factor times 2400 gives the approximate APR, so you can compare a lease rate to a loan rate on the same scale.",
      def_ru: "Годовая стоимость заёмных денег в процентах. Для лизинга money factor умножить на 2400 даёт примерный APR, чтобы сравнить ставку лизинга и кредита в одной шкале."
    },
    {
      term_en: "MSD (Multiple Security Deposits)",
      term_ru: "MSD (Несколько страховых депозитов)",
      def_en: "Refundable deposits some captive lenders accept to lower your money factor, and your monthly, returned in full at lease end. A legitimate way to cut the rate; it never hurts your Hunter Score.",
      def_ru: "Возвратные депозиты, которые некоторые банки-кэптивы принимают, чтобы снизить money factor и платёж, и возвращают полностью в конце. Законный способ сбить ставку; на Hunter Score не влияет."
    },
    {
      term_en: "Doc Fee (Documentation Fee)",
      term_ru: "Doc Fee (Сбор за оформление)",
      def_en: "A dealer paperwork fee. California caps it at $85, so anything higher is not standard. We list fees line by line so you can check each one.",
      def_ru: "Сбор дилера за бумаги. В Калифорнии он ограничен $85, поэтому всё выше нестандартно. Мы показываем сборы построчно, чтобы проверить каждый."
    },
    {
      term_en: "Mileage Allowance & Excess Mileage Fee",
      term_ru: "Лимит пробега и плата за перепробег",
      def_en: "The miles per year included in the lease, often 10k, 12k, or 15k. Going over costs a per-mile fee at the end, commonly 15 to 25 cents. Pick the allowance that fits how you drive so you do not overpay either way.",
      def_ru: "Мили в год, включённые в лизинг, обычно 10k, 12k или 15k. Перепробег стоит платы за милю в конце, обычно от 15 до 25 центов. Берите лимит под свой стиль езды, чтобы не переплатить ни в ту, ни в другую сторону."
    },
    {
      term_en: "Gap Coverage",
      term_ru: "Gap-страховка",
      def_en: "Covers the difference between what you owe and the car's value if it is totaled or stolen. It is often already included in a lease, so check before paying for it separately.",
      def_ru: "Покрывает разницу между долгом и стоимостью машины, если её разбили или угнали. В лизинге она часто уже включена, так что проверьте, прежде чем платить отдельно."
    },
    {
      term_en: "Purchase Option (Buyout)",
      term_ru: "Право выкупа (Buyout)",
      def_en: "Your right to buy the car at lease end for its residual value plus fees. Worth it when the car is worth more than the residual.",
      def_ru: "Право выкупить машину в конце лизинга по residual плюс сборы. Имеет смысл, когда машина на рынке стоит дороже residual."
    },
    {
      term_en: "Lease vs Finance vs Cash",
      term_ru: "Лизинг, кредит или наличные",
      def_en: "Three ways to get the car. Lease: lowest monthly, return or buy at the end. Finance: you own it after the loan and build equity. Cash: no interest, paid in full up front. We show all three side by side so you choose on the numbers, not on pressure.",
      def_ru: "Три способа взять машину. Лизинг: самый низкий месячный платёж, в конце вернуть или выкупить. Кредит: после выплат машина ваша, копится капитал. Наличные: без процентов, всё сразу. Мы показываем все три рядом, чтобы выбор был по цифрам, а не под давлением."
    },
    {
      term_en: "Hunter Score",
      term_ru: "Hunter Score",
      def_en: "Our 0 to 100 score for how good a deal is versus the best realistic price for that car. Higher is better, and we show how it is calculated on the Hunter Score page.",
      def_ru: "Наша оценка от 0 до 100 того, насколько сделка хороша против лучшей реальной цены на эту машину. Выше лучше; как считается, показано на странице Hunter Score."
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
        title={language === 'ru' ? 'Словарь терминов лизинга и кредита авто | Hunter Lease' : 'Car Lease & Finance Glossary | Hunter Lease'}
        description={language === 'ru' ? 'Понятный двуязычный словарь терминов лизинга и кредита авто в США: money factor, residual, MSD, drive-off, сборы и кредит простым языком.' : 'A clear, bilingual glossary of US car lease and finance terms: money factor, residual, MSD, drive-off, fees and credit, in plain language.'}
        schema={faqSchema}
      />

      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] mb-6">
            <BookOpen size={32} />
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-widest uppercase mb-6">
            {language === 'ru' ? 'Лизинг и кредит: словарь' : 'Lease & Finance Glossary'}
          </h1>
          <p className="text-[var(--mu2)] text-xl max-w-2xl mx-auto">
            {language === 'ru'
              ? 'Термины лизинга и кредита простым языком, чтобы вы могли прочитать любую сделку и заметить, что не сходится. Без жаргона и без игр.'
              : 'Lease and finance terms in plain language, so you can read any deal and spot what does not add up. No jargon, no games.'}
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
