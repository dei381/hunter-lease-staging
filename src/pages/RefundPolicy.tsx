import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const RefundPolicy = () => {
  const { language } = useLanguageStore();
  const t = translations[language].legal;

  const isRu = language === 'ru';

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-[var(--mu2)] space-y-8">
      <h1 className="font-display text-4xl text-[var(--w)] uppercase tracking-widest mb-12">
        {isRu ? 'Политика Возврата Депозита' : 'Refund & Deposit Policy'}
      </h1>
      
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--w)]">1. Deposit Terms</h2>
        <p>
          {isRu 
            ? 'Для отправки запроса в дилерский центр предусмотрен депозит в размере $95 (или иная сумма, указанная на этапе оформления). Этот депозит подтверждает ваши серьезные намерения и позволяет нашим экспертам начать процесс согласования сделки с дилером.' 
            : 'To submit your request to the dealership, a platform deposit of $95 (or other amount specified during checkout) is required. This deposit confirms your serious intent and allows our experts to begin the negotiation and fulfillment process with the dealer.'}
        </p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">2. Refundability Before Fulfillment</h2>
        <p>
          {isRu 
            ? 'Депозит полностью подлежит возврату (100% refundable), если дилер не может выполнить ваш запрос по указанным ориентировочным условиям, и мы не можем найти для вас подходящий автомобиль.'
            : 'This deposit is fully refundable (100% refundable) if the dealer cannot fulfill your request at the estimated terms, and we are unable to source a matching vehicle for you.'}
        </p>

        <h2 className="text-xl font-bold text-[var(--w)]">3. Non-Refundable Nature After Service Delivery</h2>
        <p>
          {isRu
            ? 'Важно: Депозит может стать невозвратным (non-refundable) после того, как услуга оказана. Как только ваш запрос принимается дилером, сделка согласована, и автомобиль готов к выдаче, услуга нашей платформы считается предоставленной, и депозит больше не подлежит возврату.'
            : 'Important: The deposit may become non-refundable after the service is provided. Once your request is accepted by the dealer, the deal is successfully negotiated on your behalf, and the vehicle is ready for delivery or pickup, our platform service is considered fully rendered and the deposit is therefore strictly non-refundable.'}
        </p>

        <h2 className="text-xl font-bold text-[var(--w)]">4. Requesting a Refund</h2>
        <p>
          {isRu
            ? 'Вы можете в любой момент до подтверждения сделки дилером отменить свой запрос и потребовать возврат средств. Для этого свяжитесь с нами любым удобным способом.'
            : 'You may cancel your request and ask for a full refund at any point before the dealership confirms your deal. To do so, simply contact us via email, phone, or live chat.'}
        </p>

        <h2 className="text-xl font-bold text-[var(--w)]">5. Contact Information</h2>
        <p>{isRu ? 'По всем вопросам, касающимся возвратов:' : 'For any questions regarding refunds or deposits, please contact us:'}</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Email: hello@hunter.lease</li>
          <li>{isRu ? 'Телефон' : 'Phone'}: +1 (310) 909-7755</li>
          <li>{isRu ? 'Адрес' : 'Head Office'}: 2855 Michelle Dr, Office 180, Irvine, CA</li>
        </ul>
      </div>
    </div>
  );
};
