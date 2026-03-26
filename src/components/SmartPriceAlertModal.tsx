import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';

export const SmartPriceAlertModal = ({ 
  isOpen, 
  onClose, 
  make, 
  model 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  make: string;
  model: string;
}) => {
  const { language } = useLanguageStore();
  const [email, setEmail] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setEmail('');
      setTargetPrice('');
    }, 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[var(--s1)] border border-[var(--b1)] rounded-2xl shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-[var(--mu2)] hover:text-white transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-[var(--lime)]/10 flex items-center justify-center mb-6">
                <Bell className="text-[var(--lime)]" size={24} />
              </div>

              <h2 className="text-2xl font-display font-bold text-[var(--w)] mb-2 uppercase tracking-widest">
                {language === 'ru' ? 'Умная подписка' : 'Smart Price Alert'}
              </h2>
              <p className="text-[var(--mu2)] mb-6">
                {language === 'ru' 
                  ? `Мы сообщим, когда цена на ${make} ${model} упадет или появятся новые заводские скидки.`
                  : `We'll notify you when the price for ${make} ${model} drops or new factory incentives arrive.`}
              </p>

              {submitted ? (
                <div className="bg-[var(--lime)]/10 border border-[var(--lime)]/20 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--lime)] text-black flex items-center justify-center mx-auto mb-4">
                    <Check size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--w)] mb-2">
                    {language === 'ru' ? 'Подписка оформлена!' : 'Alert Set!'}
                  </h3>
                  <p className="text-[var(--mu2)]">
                    {language === 'ru' 
                      ? 'Мы будем следить за ценами и пришлем уведомление.'
                      : 'We will monitor prices and send you a notification.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--mu1)] mb-2 uppercase tracking-wider">
                      {language === 'ru' ? 'Желаемый платеж ($/мес)' : 'Target Monthly Payment ($/mo)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mu2)]">$</span>
                      <input
                        type="number"
                        required
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder="e.g. 450"
                        className="w-full bg-[var(--s2)] border border-[var(--b1)] rounded-xl py-3 pl-8 pr-4 text-[var(--w)] focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[var(--mu1)] mb-2 uppercase tracking-wider">
                      {language === 'ru' ? 'Email для уведомлений' : 'Email for notifications'}
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[var(--s2)] border border-[var(--b1)] rounded-xl py-3 px-4 text-[var(--w)] focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)] outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[var(--lime)] text-black font-bold rounded-xl hover:bg-[var(--lime)]/90 transition-colors uppercase tracking-widest mt-6"
                  >
                    {language === 'ru' ? 'Создать алерт' : 'Set Price Alert'}
                  </button>
                  <p className="text-xs text-center text-[var(--mu2)] mt-4">
                    {language === 'ru' 
                      ? 'Никакого спама. Только реальные снижения цен.'
                      : 'No spam. Only real price drops.'}
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
