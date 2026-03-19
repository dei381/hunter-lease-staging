import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2, Search, Zap, ShieldCheck } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const ProgressScreen = ({ makeName, onComplete }: { makeName: string, onComplete: () => void }) => {
  const { language } = useLanguageStore();
  const tc = translations[language].dealerCounts;
  const [currentStep, setCurrentStep] = useState(0);

  const dealerCount = tc[makeName.toLowerCase() as keyof typeof tc] || tc.default;

  const steps = [
    { id: 1, text: `Analyzing ${dealerCount} ${makeName} dealer offers...`, icon: Search },
    { id: 2, text: "Comparing financing programs...", icon: Zap },
    { id: 3, text: "Checking for hidden fees...", icon: ShieldCheck },
    { id: 4, text: "Calculating final payment...", icon: CheckCircle2 }
  ];

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) {
        setCurrentStep(step);
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 800);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [onComplete, steps.length]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--lime)]/10 mb-4 relative">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--lime)]/20 animate-ping" />
            <Loader2 className="w-8 h-8 text-[var(--lime)] animate-spin" />
          </div>
          <h2 className="font-display text-2xl tracking-widest uppercase">System Processing</h2>
          <p className="text-[var(--mu2)] text-sm">Please wait. We are generating the best offer.</p>
        </div>

        <div className="space-y-4 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                  isCompleted ? 'bg-[var(--lime)] text-black' : 
                  isActive ? 'bg-[var(--lime)]/20 text-[var(--lime)]' : 
                  'bg-[var(--s2)] text-[var(--mu2)]'
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className={`text-sm font-bold uppercase tracking-widest transition-colors duration-500 ${
                  isCompleted ? 'text-[var(--w)]' : 
                  isActive ? 'text-[var(--lime)]' : 
                  'text-[var(--mu2)]'
                }`}>
                  {step.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};
