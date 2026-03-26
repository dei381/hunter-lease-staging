import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const TermsConditions = () => {
  const { language } = useLanguageStore();
  const t = translations[language].legal;

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-[var(--mu2)] space-y-8">
      <h1 className="font-display text-4xl text-[var(--w)] uppercase tracking-widest mb-12">{t.termsTitle}</h1>
      
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--w)]">1. Service Description</h2>
        <p>Hunter.Lease (operated by Cargwin LLC) acts as an independent vehicle leasing platform (CA License #21318). We are not a dealership. We facilitate vehicle pricing and lease/finance terms on your behalf with our network of participating dealers.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">2. Deposit & Refund Policy</h2>
        <p>To submit your request to the dealership, a platform deposit of $95 is required. This deposit is fully refundable if the dealer cannot fulfill your request at the estimated terms. Once the request is accepted by the dealer, the deposit becomes non-refundable.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">3. Platform Fees</h2>
        <p>Our compensation is typically paid by the dealership. Any direct platform fees charged to the client will be explicitly disclosed and agreed upon prior to finalizing the transaction.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">4. Vehicle Availability & Pricing</h2>
        <p>All quotes and estimates provided on our platform are subject to vehicle availability, credit approval, and final dealer confirmation. Prices, money factors, and residual values are subject to change by the manufacturer or financial institution without prior notice.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">5. Arbitration Agreement</h2>
        <p>Any dispute arising out of or relating to these terms or our services shall be settled by binding arbitration in accordance with the rules of the American Arbitration Association.</p>

        <h2 className="text-xl font-bold text-[var(--w)]">6. Limitation of Liability</h2>
        <p>Hunter.Lease is not responsible for any manufacturer defects, warranty claims, or issues arising after the delivery of the vehicle. All vehicle warranties are provided directly by the manufacturer.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">7. Contact Information</h2>
        <p>For any questions regarding these terms, please contact us:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Email: hello@hunter.lease</li>
          <li>Head Office: 2855 Michelle Dr, Office 180, Irvine, CA</li>
          <li>License Address: 4555 Auburn Blvd, Ste E, Sacramento, CA</li>
          <li>CA License: #21318</li>
        </ul>
      </div>
    </div>
  );
};
