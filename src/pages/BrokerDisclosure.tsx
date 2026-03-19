import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const BrokerDisclosure = () => {
  const { language } = useLanguageStore();
  const t = translations[language].legal;

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-[var(--mu2)] space-y-8">
      <h1 className="font-display text-4xl text-[var(--w)] uppercase tracking-widest mb-12">{t.brokerTitle}</h1>
      
      <div className="space-y-6">
        <p>{t.brokerText}</p>
        <h2 className="text-xl font-bold text-[var(--w)]">California Vehicle Code Section 11713.26</h2>
        <p>As a licensed vehicle leasing broker, we are required to provide you with a written disclosure that includes the following information:</p>
        <ul className="list-disc pl-6 space-y-4">
          <li>
            <strong className="text-[var(--w)]">1. Independent Status:</strong> Hunter Lease is not a franchised new motor vehicle dealer and does not represent any specific manufacturer.
          </li>
          <li>
            <strong className="text-[var(--w)]">2. Compensation:</strong> We receive a fee from the selling dealer for our services. This fee is typically included in the negotiated price of the vehicle.
          </li>
          <li>
            <strong className="text-[var(--w)]">3. Warranty:</strong> All new vehicles come with the full manufacturer's warranty. Service and repairs can be performed at any authorized franchised dealer.
          </li>
          <li>
            <strong className="text-[var(--w)]">4. Delivery:</strong> We can arrange for vehicle delivery to your home or office, or you can pick it up at the dealership.
          </li>
        </ul>
      </div>
    </div>
  );
};
