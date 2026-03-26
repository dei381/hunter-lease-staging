import React, { useState } from 'react';
import { Car, CheckCircle2, Loader2, ChevronRight, RefreshCw } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { motion, AnimatePresence } from 'motion/react';

export const TradeInEstimator = ({ onEquityCalculated }: { onEquityCalculated: (equity: number) => void }) => {
  const { language } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [year, setYear] = useState('2020');
  const [make, setMake] = useState('Toyota');
  const [model, setModel] = useState('Camry');
  const [mileage, setMileage] = useState('45000');
  const [payoff, setPayoff] = useState('12000');
  
  // Results
  const [estimatedValue, setEstimatedValue] = useState(0);
  const [equity, setEquity] = useState(0);

  const handleEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call to KBB/Black Book
    setTimeout(() => {
      // Mock valuation logic
      const baseValue = 18500;
      const payoffAmount = parseInt(payoff) || 0;
      const calculatedEquity = Math.max(0, baseValue - payoffAmount);
      
      setEstimatedValue(baseValue);
      setEquity(calculatedEquity);
      setLoading(false);
      setStep(2);
      onEquityCalculated(calculatedEquity);
    }, 1500);
  };

  const handleReset = () => {
    setStep(1);
    setEquity(0);
    onEquityCalculated(0);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between p-4 border-b border-[var(--b2)] hover:bg-[var(--s2)] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--lime)]/10 flex items-center justify-center">
            <Car size={16} className="text-[var(--lime)]" />
          </div>
          <div className="text-left">
            <div className="text-sm font-bold text-[var(--w)]">
              {language === 'ru' ? 'Добавить Trade-In' : 'Add Trade-In'}
            </div>
            <div className="text-xs text-[var(--mu2)]">
              {language === 'ru' ? 'Узнайте стоимость вашего авто за 30 сек' : 'Get instant value for your current car'}
            </div>
          </div>
        </div>
        <ChevronRight size={16} className="text-[var(--mu2)] group-hover:text-[var(--lime)] transition-colors" />
      </button>
    );
  }

  return (
    <div className="p-4 border-b border-[var(--b2)] bg-[var(--s2)]/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Car size={16} className="text-[var(--lime)]" />
          <h3 className="text-sm font-bold text-[var(--w)] uppercase tracking-widest">
            {language === 'ru' ? 'Оценка Trade-In' : 'Trade-In Estimator'}
          </h3>
        </div>
        <button 
          onClick={() => {
            setIsOpen(false);
            handleReset();
          }}
          className="text-xs text-[var(--mu2)] hover:text-white"
        >
          {language === 'ru' ? 'Отменить' : 'Cancel'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form 
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleEstimate} 
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-1">Year</label>
                <input 
                  type="text" 
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b1)] rounded-lg px-3 py-2 text-sm text-[var(--w)] focus:border-[var(--lime)] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-1">Make</label>
                <input 
                  type="text" 
                  value={make}
                  onChange={e => setMake(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b1)] rounded-lg px-3 py-2 text-sm text-[var(--w)] focus:border-[var(--lime)] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-1">Model</label>
                <input 
                  type="text" 
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b1)] rounded-lg px-3 py-2 text-sm text-[var(--w)] focus:border-[var(--lime)] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-1">Mileage</label>
                <input 
                  type="number" 
                  value={mileage}
                  onChange={e => setMileage(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b1)] rounded-lg px-3 py-2 text-sm text-[var(--w)] focus:border-[var(--lime)] outline-none"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-1">
                {language === 'ru' ? 'Остаток по кредиту (Payoff)' : 'Current Loan Payoff'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mu2)]">$</span>
                <input 
                  type="number" 
                  value={payoff}
                  onChange={e => setPayoff(e.target.value)}
                  className="w-full bg-[var(--s1)] border border-[var(--b1)] rounded-lg pl-7 pr-3 py-2 text-sm text-[var(--w)] focus:border-[var(--lime)] outline-none"
                  placeholder="0 if paid off"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-[var(--lime)] text-black font-bold rounded-lg hover:bg-[var(--lime)]/90 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {language === 'ru' ? 'Оценить стоимость' : 'Get Estimated Value'}
            </button>
          </motion.form>
        ) : (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--s1)] border border-[var(--lime)]/30 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 text-[var(--lime)] mb-4">
              <CheckCircle2 size={16} />
              <span className="text-sm font-bold uppercase tracking-widest">
                {language === 'ru' ? 'Оценка завершена' : 'Valuation Complete'}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--mu2)]">{language === 'ru' ? 'Рыночная стоимость' : 'Market Value'}</span>
                <span className="text-[var(--w)] font-bold">${estimatedValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--mu2)]">{language === 'ru' ? 'Остаток долга' : 'Payoff Amount'}</span>
                <span className="text-red-400">-${parseInt(payoff || '0').toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-[var(--b1)] flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--lime)] uppercase tracking-widest">
                  {language === 'ru' ? 'Ваш капитал (Equity)' : 'Trade-In Equity'}
                </span>
                <span className="text-xl font-bold text-[var(--lime)]">+${equity.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="text-[10px] text-[var(--mu2)] mb-4">
              {language === 'ru' 
                ? 'Эта сумма автоматически вычтена из вашего первого взноса (Due at Signing) в калькуляторе.' 
                : 'This equity has been automatically applied to reduce your Due at Signing in the calculator.'}
            </div>

            <button 
              onClick={handleReset}
              className="w-full py-2 border border-[var(--b2)] text-[var(--w)] text-xs font-bold rounded-lg hover:bg-[var(--s2)] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              {language === 'ru' ? 'Пересчитать' : 'Recalculate'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
