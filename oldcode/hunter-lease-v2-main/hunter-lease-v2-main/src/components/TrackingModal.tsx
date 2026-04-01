import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, MessageSquare, ExternalLink, ShieldCheck, Truck, FileText, Building2 } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const TrackingModal = ({ isOpen, onClose, leadData }: any) => {
  const { language } = useLanguageStore();
  const t = translations[language].tracking;

  if (!leadData) return null;

  const steps = [
    { id: 1, title: t.step1, desc: t.step1Desc, icon: ShieldCheck, status: 'completed' },
    { id: 2, title: t.step2, desc: t.step2Desc, icon: Building2, status: leadData.status === 'pending' ? 'current' : 'completed' },
    { id: 3, title: t.step3, desc: t.step3Desc, icon: FileText, status: leadData.status === 'pending' ? 'upcoming' : (leadData.acceptedBy ? 'completed' : 'current') },
    { id: 4, title: t.step4, desc: t.step4Desc, icon: CheckCircle2, status: leadData.acceptedBy ? 'current' : 'upcoming' },
    { id: 5, title: t.step5, desc: t.step5Desc, icon: Truck, status: 'upcoming' },
  ];

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 overflow-y-auto font-sans">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[var(--bg)] border border-[var(--b2)] rounded-3xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col my-auto"
          >
            <button onClick={onClose} className="absolute top-6 right-6 text-[var(--mu)] hover:text-[var(--w)] z-50 bg-[var(--s2)] hover:bg-[var(--b2)] rounded-full p-2 transition-colors"><X size={20} /></button>
            
            <div className="p-8 md:p-10 border-b border-[var(--b1)] bg-[var(--s1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-[var(--lime)]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="ldot" />
                <span className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{t.status}</span>
              </div>
              <h2 className="font-display text-4xl mb-2">{t.title}</h2>
              <p className="text-[var(--mu2)] text-sm uppercase tracking-widest font-medium">{t.subtitle}</p>
            </div>

            <div className="p-8 md:p-10 space-y-8">
              <div className="relative">
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[var(--b2)]" />
                
                <div className="space-y-10 relative">
                  {steps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="flex gap-6">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                          step.status === 'completed' ? 'bg-[var(--lime)] border-[var(--lime)] text-black' :
                          step.status === 'current' ? 'bg-[var(--s1)] border-[var(--lime)] text-[var(--lime)]' :
                          'bg-[var(--s1)] border-[var(--b2)] text-[var(--mu2)]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className={`text-sm font-bold uppercase tracking-widest ${
                            step.status === 'upcoming' ? 'text-[var(--mu2)]' : 'text-[var(--w)]'
                          }`}>{step.title}</h3>
                          <p className="text-xs text-[var(--mu2)] leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-[var(--b2)]">
                <div className="bg-[var(--s1)] p-4 rounded-2xl border border-[var(--b2)]">
                  <div className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-1">{t.estimated}</div>
                  <div className="text-sm font-bold text-[var(--w)] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--lime)]" /> {t.days}
                  </div>
                </div>
                <button className="bg-[var(--s1)] p-4 rounded-2xl border border-[var(--b2)] hover:border-[var(--lime)] transition-colors text-left group">
                  <div className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-1">Concierge</div>
                  <div className="text-sm font-bold text-[var(--w)] flex items-center gap-2 group-hover:text-[var(--lime)]">
                    <MessageSquare className="w-4 h-4" /> Open Chat
                  </div>
                </button>
              </div>

              <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/10 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--s2)] border border-[var(--b2)] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[var(--mu2)]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-0.5">Dealer Assigned</div>
                    <div className="text-sm font-bold text-[var(--w)]">{leadData.acceptedBy || 'Searching...'}</div>
                  </div>
                </div>
                {leadData.acceptedBy && (
                  <button className="text-[var(--lime)] hover:underline text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    View Dealer <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
};
