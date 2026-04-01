import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, Settings } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

const fmt = (n: any) => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

interface IncentivesModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  selectedIncentives: string[];
  toggleIncentive: (id: string) => void;
  quoteResult?: any;
  role?: string;
  isFirstTimeBuyer?: boolean;
}

export const IncentivesModal: React.FC<IncentivesModalProps> = ({
  isOpen,
  onClose,
  deal,
  selectedIncentives,
  toggleIncentive,
  quoteResult,
  role,
  isFirstTimeBuyer
}) => {
  const { language } = useLanguageStore();
  const t = translations[language].calc;

  const availableIncentives = deal?.availableIncentives || [];

  const { autoApplied, autoSelected, available } = useMemo(() => {
    const autoApplied: any[] = [];
    const autoSelected: any[] = [];
    const available: any[] = [];

    availableIncentives.forEach((inc: any) => {
      const isFtbIncentive = inc.type === 'first_time_buyer' || inc.name?.toLowerCase().includes('first time buyer');
      
      if (inc.type === 'dealer' || inc.type === 'DEALER_DISCOUNT') {
        autoApplied.push(inc);
      } else if (inc.isDefault || inc.type === 'manufacturer' || inc.type === 'OEM_CASH' || (isFtbIncentive && isFirstTimeBuyer)) {
        autoSelected.push(inc);
      } else {
        available.push(inc);
      }
    });

    return { autoApplied, autoSelected, available };
  }, [availableIncentives, isFirstTimeBuyer]);

  const groupedAvailable = useMemo(() => {
    const groups: Record<string, any[]> = {
      'Loyalty': [],
      'Conquest': [],
      'Military & First Responder': [],
      'College Graduate': [],
      'First Time Buyer': [],
      'Other Offers': []
    };

    available.forEach(inc => {
      const type = (inc.dbType || inc.type || '').toUpperCase();
      const name = (inc.name || '').toUpperCase();
      
      if (type.includes('LOYALTY') || name.includes('LOYALTY')) {
        groups['Loyalty'].push(inc);
      } else if (type.includes('CONQUEST') || name.includes('CONQUEST')) {
        groups['Conquest'].push(inc);
      } else if (type.includes('MILITARY') || type.includes('RESPONDER') || name.includes('MILITARY') || name.includes('RESPONDER')) {
        groups['Military & First Responder'].push(inc);
      } else if (type.includes('COLLEGE') || name.includes('COLLEGE') || name.includes('GRAD')) {
        groups['College Graduate'].push(inc);
      } else if (type.includes('FIRST_TIME') || name.includes('FIRST TIME')) {
        groups['First Time Buyer'].push(inc);
      } else {
        groups['Other Offers'].push(inc);
      }
    });

    // Remove empty groups
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [available]);

  const totalSaved = useMemo(() => {
    return availableIncentives
      .filter((inc: any) => {
        const isFtbIncentive = inc.type === 'first_time_buyer' || inc.name?.toLowerCase().includes('first time buyer');
        return selectedIncentives.includes(inc.id) || autoApplied.some(a => a.id === inc.id) || autoSelected.some(a => a.id === inc.id) || (isFtbIncentive && isFirstTimeBuyer);
      })
      .reduce((sum: number, inc: any) => sum + inc.amount, 0);
  }, [availableIncentives, selectedIncentives, autoApplied, autoSelected, isFirstTimeBuyer]);

  const currentPayment = quoteResult?.monthlyPaymentCents ? quoteResult.monthlyPaymentCents / 100 : (Number(deal?.displayPayment) || 0);
  
  // Approximate base payment without incentives
  const term = quoteResult?.term || parseInt(deal?.displayTerm) || 36;
  const basePayment = currentPayment + (totalSaved / term);
  const monthlySavings = basePayment - currentPayment;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
        >
          {/* Left Panel: Incentives List */}
          <div className="w-full md:w-3/5 p-6 md:p-8 overflow-y-auto max-h-[80vh]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Lease Incentives and Discounts</h2>
                <p className="text-sm text-gray-500">
                  You can save money on your next deal by answering a couple questions that may qualify you for manufacturer incentives.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm font-medium text-gray-700">Do you want to update auto-selected rebates?</span>
              <button className="text-gray-400 hover:text-gray-600 transition-colors">
                <Settings size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Auto Applied (Dealer Discounts) */}
              {autoApplied.map(inc => (
                <div key={inc.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                      {language === 'ru' && inc.nameRu ? inc.nameRu : inc.name}
                      <Info size={14} className="text-gray-400" />
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-green-600" /></div>
                      Auto-Applied
                    </span>
                    <span className="text-sm font-bold text-gray-900">{fmt(inc.amount)}</span>
                  </div>
                </div>
              ))}

              {/* Auto Selected (OEM Cash) */}
              {autoSelected.map(inc => (
                <div key={inc.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {language === 'ru' && inc.nameRu ? inc.nameRu : inc.name}
                        <Info size={14} className="text-gray-400" />
                      </span>
                      {inc.expiresAt && (
                        <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded mt-1 w-fit">
                          Expires on {new Date(inc.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-green-600" /></div>
                      Auto-Selected Applied
                    </span>
                    <span className="text-sm font-bold text-gray-900">{fmt(inc.amount)}</span>
                  </div>
                </div>
              ))}

              {/* Available (Conditional) */}
              {groupedAvailable.map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-6 mb-2">{category}</h4>
                  {items.map(inc => {
                    const isFtbIncentive = inc.type === 'first_time_buyer' || inc.name?.toLowerCase().includes('first time buyer');
                    const isSelected = selectedIncentives.includes(inc.id) || (isFtbIncentive && isFirstTimeBuyer);
                    return (
                      <button
                        key={inc.id}
                        onClick={() => toggleIncentive(inc.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                          isSelected ? 'border-gray-800 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-gray-800 border-gray-800' : 'border-gray-300'
                          }`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            {language === 'ru' && inc.nameRu ? inc.nameRu : inc.name}
                            <Info size={14} className="text-gray-400" />
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">+</div>
                            Available
                          </span>
                          <span className="text-sm font-bold text-gray-900">{fmt(inc.amount)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Summary */}
          <div className="w-full md:w-2/5 bg-gray-50 p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-200">
            <div>
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm">
                <X size={20} />
              </button>
              
              <h3 className="text-xl font-medium text-gray-900 mb-6 leading-snug">
                How much money can be saved with <span className="italic font-serif">selected</span> incentives applied to a lease
              </h3>

              <div className="mb-8">
                <h4 className="text-lg font-medium text-gray-900">{deal?.make} {deal?.model}</h4>
                <p className="text-sm text-gray-500">{deal?.trim}</p>
                
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                  <span>Deal terms</span>
                  <span className="font-medium text-gray-900">{term} months <span className="text-red-500 text-xs font-normal">(Best)</span>, {quoteResult?.mileage || deal?.mileage || '10k'} miles per years</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Monthly payment</span>
                <span className="font-medium">{fmt(basePayment)}/mo</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Monthly payment with incentives applied</span>
                <span className="font-medium">{fmt(currentPayment)}/mo</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Saved on monthly payment</span>
                <span className="font-medium">{fmt(monthlySavings)}/mo</span>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-base font-medium text-gray-900">In total you save</span>
                <span className="text-xl font-bold text-gray-900">{fmt(totalSaved)}</span>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">
                  CLOSE
                </button>
                <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-medium text-white bg-gray-900 hover:bg-black transition-colors">
                  SAVE
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
