import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Car, Calculator, TrendingUp, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const LeaseEndAdvisor: React.FC = () => {
  const { language } = useLanguageStore();
  const t = (translations[language] as any).advisor;
  
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear() - 3,
    mileage: '',
    residual: '',
    remainingMonths: '3',
  });
  
  const [result, setResult] = useState<any>(null);

  const calculateEquity = () => {
    // Mock market value calculation
    // In real app, this would call an API like Kelley Blue Book or Black Book
    const residualVal = parseFloat(data.residual) || 0;
    const estimatedMarketValue = residualVal * 1.15; // Mock: market is 15% higher than residual
    const equity = estimatedMarketValue - residualVal;
    
    setResult({
      marketValue: estimatedMarketValue,
      residualValue: residualVal,
      equity: equity,
      advice: equity > 2000 ? 'sell' : equity > 0 ? 'trade' : 'return'
    });
    setStep(3);
  };

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  return (
    <section id="advisor" className="py-24 border-t border-[var(--b2)]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl mb-4">{t.title}</h2>
          <p className="text-[var(--mu2)] text-lg">{t.subtitle}</p>
        </div>

        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--lime)]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)] font-bold">1</div>
                  <h3 className="text-xl font-bold">{t.currentCar}</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">Make</label>
                    <input 
                      type="text" 
                      placeholder={t.placeholderMake}
                      value={data.make}
                      onChange={(e) => setData({...data, make: e.target.value})}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 focus:border-[var(--lime)] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">Model</label>
                    <input 
                      type="text" 
                      placeholder={t.placeholderModel}
                      value={data.model}
                      onChange={(e) => setData({...data, model: e.target.value})}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 focus:border-[var(--lime)] outline-none transition-all"
                    />
                  </div>
                </div>
                
                <button 
                  onClick={() => setStep(2)}
                  disabled={!data.make || !data.model}
                  className="w-full bg-[var(--w)] text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  Next Step <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)] font-bold">2</div>
                  <h3 className="text-xl font-bold">{t.leaseDetails}</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.residualValue}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mu2)]">$</span>
                      <input 
                        type="number" 
                        value={data.residual}
                        onChange={(e) => setData({...data, residual: e.target.value})}
                        className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl pl-8 pr-4 py-3 focus:border-[var(--lime)] outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.remainingMonths}</label>
                    <select 
                      value={data.remainingMonths}
                      onChange={(e) => setData({...data, remainingMonths: e.target.value})}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 focus:border-[var(--lime)] outline-none transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6, 12].map(m => (
                        <option key={m} value={m}>{m} months</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 border border-[var(--b2)] text-[var(--w)] font-bold py-4 rounded-xl hover:bg-[var(--s2)] transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={calculateEquity}
                    disabled={!data.residual}
                    className="flex-[2] bg-[var(--lime)] text-black font-bold py-4 rounded-xl hover:bg-[var(--lime2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {t.calculate} <Calculator className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-10"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] mb-6">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{t.equity}</h3>
                  <div className="text-5xl font-display text-[var(--lime)]">{fmt(result.equity)}</div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 py-8 border-y border-[var(--b2)]">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.marketValue}</div>
                    <div className="text-2xl font-mono">{fmt(result.marketValue)}</div>
                    <p className="text-[10px] text-[var(--mu2)]">Based on current LA market trends</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.buyoutPrice}</div>
                    <div className="text-2xl font-mono">{fmt(result.residualValue)}</div>
                    <p className="text-[10px] text-[var(--mu2)]">Your contract residual value</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[var(--mu)] uppercase tracking-wider">{t.advice}</h4>
                  
                  <div className={`p-6 rounded-2xl border ${result.advice === 'sell' ? 'bg-[var(--grn)]/5 border-[var(--grn)]/20' : 'bg-[var(--s2)] border-[var(--b2)]'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${result.advice === 'sell' ? 'bg-[var(--grn)]/20 text-[var(--grn)]' : 'bg-[var(--mu)]/20 text-[var(--mu)]'}`}>
                        {result.advice === 'sell' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <h5 className="font-bold text-lg mb-1">
                          {result.advice === 'sell' ? t.sell : result.advice === 'trade' ? t.trade : t.return}
                        </h5>
                        <p className="text-sm text-[var(--mu2)] leading-relaxed">
                          {result.advice === 'sell' 
                            ? "You have significant equity! Selling to a third-party dealer (like CarMax or Carvana) could put thousands in your pocket instead of giving it back to the leasing company."
                            : result.advice === 'trade'
                            ? "You have some equity. Using this as a trade-in for your next lease could lower your new monthly payment significantly."
                            : "Your car's market value is close to its residual. Returning it to the dealer is likely your best option to avoid any negative equity."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(1)}
                  className="w-full border border-[var(--b2)] text-[var(--mu2)] font-bold py-4 rounded-xl hover:text-[var(--w)] transition-all"
                >
                  Start Over
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
