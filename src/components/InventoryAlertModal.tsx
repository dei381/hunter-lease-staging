import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, CheckCircle2, Mail, Car } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface InventoryAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMake?: string;
  initialModel?: string;
}

export const InventoryAlertModal: React.FC<InventoryAlertModalProps> = ({ isOpen, onClose, initialMake = '', initialModel = '' }) => {
  const { language } = useLanguageStore();
  const t = (translations[language] as any).alerts;
  
  const [email, setEmail] = useState('');
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState(initialModel);
  const [maxPayment, setMaxPayment] = useState('800');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'subscriptions'), {
        email,
        make,
        model,
        maxPayment: parseInt(maxPayment),
        status: 'active',
        createdAt: serverTimestamp(),
      });
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setEmail('');
      }, 3000);
    } catch (error) {
      console.error('Error saving subscription:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
            className="relative w-full max-w-md bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--lime)]/5 rounded-full blur-2xl pointer-events-none" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-[var(--mu2)] hover:text-[var(--w)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--grn)]/10 text-[var(--grn)] mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Awesome!</h3>
                <p className="text-[var(--mu2)]">{t.success}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)]">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{t.title}</h3>
                    <p className="text-xs text-[var(--mu2)]">{t.subtitle}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-wider">{t.emailPlaceholder}</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--mu2)]" />
                      <input 
                        required
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl pl-11 pr-4 py-3 focus:border-[var(--lime)] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-wider">{t.make}</label>
                      <input 
                        type="text" 
                        value={make}
                        onChange={(e) => setMake(e.target.value)}
                        placeholder="Any Make"
                        className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 focus:border-[var(--lime)] outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-wider">{t.model}</label>
                      <input 
                        type="text" 
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="Any Model"
                        className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 focus:border-[var(--lime)] outline-none transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-wider">{t.maxPayment}</label>
                      <span className="text-xs font-mono text-[var(--lime)]">${maxPayment}/mo</span>
                    </div>
                    <input 
                      type="range" min="300" max="2500" step="50" 
                      value={maxPayment} 
                      onChange={(e) => setMaxPayment(e.target.value)}
                      className="w-full accent-[var(--lime)] h-2 bg-[var(--s2)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--lime)] text-black font-bold py-4 rounded-xl hover:bg-[var(--lime2)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Setting up...' : t.btnNotify}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
};
