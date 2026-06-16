import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, X } from 'lucide-react';
import { useLocationStore } from '../store/locationStore';
import { useLanguageStore } from '../store/languageStore';

export const ZipModal: React.FC = () => {
  const { zipCode, hasConfirmedZip, setZipCode, confirmZip, autoDetectZip } = useLocationStore();
  const { language } = useLanguageStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [localZip, setLocalZip] = useState(zipCode);

  useEffect(() => {
    const initializeLocation = async () => {
       if (!hasConfirmedZip) {
          // Attempt auto-detect silently
          await autoDetectZip();
          // After detection (fast or failed), open the modal
          setIsOpen(true);
       }
    };
    initializeLocation();
  }, [hasConfirmedZip, autoDetectZip]);

  // Keep local input in sync when auto-detection updates the store zip
  useEffect(() => {
    setLocalZip(zipCode);
  }, [zipCode]);

  const handleConfirm = () => {
    // Basic validation for US ZIP
    if (/^\d{5}$/.test(localZip)) {
      setZipCode(localZip);
      confirmZip();
      setIsOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999]"
            onClick={() => {}} // Usually we don't let them close it by clicking outside if it's mandatory, or maybe we do? Let's just have it be closeable by action.
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-6 z-[1000] shadow-2xl flex flex-col items-center text-center"
          >
            <button 
              onClick={() => { confirmZip(); setIsOpen(false); }} 
              className="absolute top-4 right-4 text-[var(--mu2)] hover:text-[var(--w)] transition-colors p-2"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-[var(--lime)]/10 text-[var(--lime)] flex items-center justify-center mb-6 border border-[var(--lime)]/20">
              <MapPin size={32} />
            </div>

            <h2 className="text-2xl font-display font-medium text-[var(--w)] tracking-tight mb-2">
              {language === 'ru' ? 'Подтвердите ZIP Code' : 'Verify Your ZIP Code'}
            </h2>
            <p className="text-sm font-medium text-[var(--mu2)] mb-6 text-balance">
              {language === 'ru' 
                ? 'Для точного расчета налогов, сборов и скидок в вашем регионе мы определили ваш ZIP код. Вы можете изменить его ниже.' 
                : 'To calculate accurate taxes, fees, and targeted savings for your area, we need your ZIP code. You can update it below.'}
            </p>

            <div className="w-full flex gap-3 mb-2">
               <input 
                  type="text" 
                  value={localZip}
                  onChange={(e) => setLocalZip(e.target.value.replace(/\D/g, '').substring(0, 5))}
                  className="flex-1 bg-[var(--bg)] border border-[var(--b2)] rounded-xl px-4 text-center text-xl font-bold font-mono tracking-widest text-[var(--w)] focus:border-[var(--lime)] focus:ring-1 focus:ring-[var(--lime)] outline-none transition-all placeholder:text-[var(--mu2)]"
                  placeholder="ZIP"
               />
            </div>
            
            <button 
              onClick={handleConfirm}
              className="w-full h-12 bg-[var(--lime)] text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[var(--lime2)] transition-colors mt-6"
            >
              {language === 'ru' ? 'Подтвердить' : 'Confirm'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
