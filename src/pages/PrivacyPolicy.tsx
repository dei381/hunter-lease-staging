import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const PrivacyPolicy = () => {
  const { language } = useLanguageStore();
  const t = translations[language].legal;

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-[var(--mu2)] space-y-8">
      <h1 className="font-display text-4xl text-[var(--w)] uppercase tracking-widest mb-12">{t.privacyTitle}</h1>
      
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-[var(--w)]">1. Information We Collect</h2>
        <p>We collect information that you provide directly to us, including your name, email address, phone number, and financial information required for credit applications. This may include Social Security Numbers (SSN), employment history, and income details.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">2. How We Use Your Information</h2>
        <p>We use the information we collect to provide, maintain, and improve our services, communicate with you, and process your requests for vehicle leasing and financing. We use your financial data solely for the purpose of securing credit approval from our lending partners.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">3. Information Sharing</h2>
        <p>We share your information with our network of authorized dealers and financial institutions solely for the purpose of securing the best vehicle lease or purchase terms on your behalf. We do not sell your personal data to third parties for marketing purposes.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">4. Data Security</h2>
        <p>We implement robust security measures, including encryption and secure servers, to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">5. CCPA Rights (California Residents)</h2>
        <p>California residents have the right to request access to their personal data, request deletion of their data, and opt-out of the sale of their personal data. To exercise these rights, please contact us at hello@hunter.lease.</p>

        <h2 className="text-xl font-bold text-[var(--w)]">6. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Email: hello@hunter.lease</li>
          <li>Head Office: 2855 Michelle Dr, Office 180, Irvine, CA</li>
          <li>License Address: 4555 Auburn Blvd, Ste E, Sacramento, CA</li>
        </ul>
      </div>
    </div>
  );
};
