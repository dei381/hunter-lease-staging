import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const AccessibilityStatement = () => {
  const { language } = useLanguageStore();
  const t = translations[language].legal;

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-[var(--mu2)] space-y-8">
      <h1 className="font-display text-4xl text-[var(--w)] uppercase tracking-widest mb-12">{t.accessibilityTitle}</h1>
      
      <div className="space-y-6">
        <p>{t.accessibilityText}</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">Conformance Status</h2>
        <p>The Web Content Accessibility Guidelines (WCAG) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. Hunter Lease is partially conformant with WCAG 2.1 level AA.</p>
        
        <h2 className="text-xl font-bold text-[var(--w)]">Technical Specifications</h2>
        <p>Accessibility of Hunter Lease relies on the following technologies to work with the particular combination of web browser and any assistive technologies or plugins installed on your computer:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>HTML</li>
          <li>WAI-ARIA</li>
          <li>CSS</li>
          <li>JavaScript</li>
        </ul>

        <h2 className="text-xl font-bold text-[var(--w)]">Feedback</h2>
        <p>We welcome your feedback on the accessibility of Hunter Lease. Please let us know if you encounter accessibility barriers on Hunter Lease:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Email: hello@hunter.lease</li>
          <li>Address: 2855 Michelle Dr, Office 180, Irvine, CA</li>
        </ul>
        
        <p>We try to respond to feedback within 5 business days.</p>
      </div>
    </div>
  );
};
