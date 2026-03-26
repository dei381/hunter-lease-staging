import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ChevronRight, ShieldCheck, Car, FileText, CreditCard, Info, AlertCircle, Zap, Lock, Crown } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { translations } from '../translations';

export const DepositModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  carName, 
  activeSelection,
  clientInfo, 
  setClientInfo,
  tradeIn,
  setTradeIn,
  payMethod,
  setPayMethod,
  paymentName,
  setPaymentName,
  isConfirmed,
  setIsConfirmed,
  isSubmitting,
  leadId
}: any) => {
  const { language } = useLanguageStore();
  const { user, setIsAuthModalOpen, setAuthEmail } = useAuthStore();
  const t = translations[language].deposit;

  const [step, setStep] = useState(1);
  const [isVipSelected, setIsVipSelected] = useState(false);
  const [creditAppData, setCreditAppData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    dlNumber: '',
    employer: '',
    position: '',
    employerAddress: '',
    workExperience: '',
    incomeType: 'w2',
    monthlyIncome: '',
    employerPhone: '',
    additionalIncome: '',
    residencyStatus: '',
    address: '',
    prevAddress: '',
    hasCosigner: false,
    prevAuto: false,
    ssn: '',
    signature: '',
  });
  const [isCreditAppSubmitting, setIsCreditAppSubmitting] = useState(false);
  const [isCreditAppSuccess, setIsCreditAppSuccess] = useState(false);
  const [creditAppStep, setCreditAppStep] = useState(1);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      if (leadId) {
        setStep(3);
      } else {
        setStep(1);
      }
      setCreditAppStep(1);
      setPolicyAccepted(false);
      setConsentAccepted(false);
      setIsConfirmed(false);
      setIsVipSelected(false);
      setIsCreditAppSuccess(false);
      setCreditAppData({
        firstName: clientInfo.name?.split(' ')[0] || '',
        lastName: clientInfo.name?.split(' ').slice(1).join(' ') || '',
        email: clientInfo.email || '',
        phone: clientInfo.phone || '',
        dob: '',
        dlNumber: '',
        employer: '',
        position: '',
        employerAddress: '',
        workExperience: '',
        incomeType: 'w2',
        monthlyIncome: '',
        employerPhone: '',
        additionalIncome: '',
        residencyStatus: '',
        address: '',
        prevAddress: '',
        hasCosigner: false,
        prevAuto: false,
        ssn: '',
        signature: '',
      });
    }
  }, [isOpen, clientInfo]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 1 && clientInfo.name && clientInfo.phone && clientInfo.email) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    const success = await onConfirm();
    if (success) {
      setStep(3);
    }
  };

  const handleVipUpgrade = () => {
    setIsVipSelected(true);
    // In a real app, this would trigger another payment or update the lead
    setStep(4);
  };

  const handleCreditAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreditAppSubmitting(true);
    try {
      // Find the lead ID - we should probably return it from onConfirm
      // For now, we'll assume the server can identify the lead by email/phone or we store the ID
      // Let's assume onConfirm returns the lead object or ID
      
      const response = await fetch('/api/lead/credit-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          creditApp: creditAppData
        }),
      });

      if (response.ok) {
        setIsCreditAppSuccess(true);
      } else {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          const messages = errorData.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n');
          alert(`Validation failed:\n${messages}`);
        } else {
          alert(`${translations[language].creditApp.validation.error}${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error submitting credit app:', error);
      alert('Network error while submitting application. Please try again.');
    } finally {
      setIsCreditAppSubmitting(false);
    }
  };

  const ct = translations[language].creditApp;
  const pt = translations[language].pricing;
  const type = activeSelection?.type || 'lease';
  const payment = activeSelection?.result ? (type === 'lease' ? activeSelection.result.leasePay : activeSelection.result.finPay) : activeSelection?.payment || 0;
  const down = activeSelection?.down || 0;
  const msrp = activeSelection?.trim?.msrp || activeSelection?.msrp || 0;

  const lockKeys = [
    translations[language].lock.key1, translations[language].lock.key2, translations[language].lock.key3,
    translations[language].lock.key4, translations[language].lock.key5, translations[language].lock.key6,
    translations[language].lock.key7, translations[language].lock.key8, translations[language].lock.key9,
    translations[language].lock.key10, translations[language].lock.key11
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
      <div className="flex min-h-full items-center justify-center p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(leadId && !isCreditAppSuccess) ? undefined : onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white border border-[var(--b2)] rounded-3xl w-full max-w-5xl relative z-10 shadow-2xl flex flex-col md:flex-row overflow-hidden"
        >
        {!(leadId && !isCreditAppSuccess) && (
          <button onClick={onClose} className="absolute top-6 right-6 text-[var(--mu)] hover:text-[var(--w)] z-50 bg-[var(--s1)] hover:bg-[var(--b2)] rounded-full p-2 transition-colors"><X size={20} /></button>
        )}
        
        {/* Left Column: Wizard */}
        <div className="flex-1 p-4 md:p-12 flex flex-col relative overflow-hidden bg-white">
          <div className="absolute top-0 left-0 -mt-20 -ml-20 w-64 h-64 bg-[var(--lime)]/5 rounded-full blur-3xl pointer-events-none" />
          
          {step < 3 && (
            <div className="mb-10 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">
                  {t.step} {step} {t.of} 2
                </div>
                <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">
                  {step === 1 ? t.contactAndTradeIn : t.paymentConfirm}
                </div>
              </div>
              <div className="flex gap-2">
                <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 1 ? 'bg-[var(--lime)]' : 'bg-[var(--s1)]'}`} />
                <div className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= 2 ? 'bg-[var(--lime)]' : 'bg-[var(--s1)]'}`} />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 relative z-10"
              >
                <h2 className="font-display text-4xl mb-2">{t.contactAndTradeIn}</h2>
                <p className="text-[var(--mu2)] text-base mb-8">{t.contactAndTradeInDesc}</p>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.fullName}</label>
                      <input 
                        type="text" 
                        value={clientInfo.name}
                        onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all font-medium" 
                        placeholder="John Doe" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.phone}</label>
                      <input 
                        type="tel" 
                        value={clientInfo.phone}
                        onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all font-medium" 
                        placeholder="+1 (555) 000-0000" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.email}</label>
                      <input 
                        type="email" 
                        value={clientInfo.email}
                        onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all font-medium" 
                        placeholder="john@example.com" 
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${clientInfo.tcpaConsent ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b3)] bg-[var(--s1)] group-hover:border-[var(--lime)]'}`}>
                          {clientInfo.tcpaConsent && <CheckCircle2 size={14} className="text-black" />}
                        </div>
                        <span className="text-[10px] text-[var(--mu2)] leading-relaxed">
                          {t.tcpaConsent}
                        </span>
                        <input type="checkbox" className="hidden" checked={clientInfo.tcpaConsent || false} onChange={(e) => setClientInfo({...clientInfo, tcpaConsent: e.target.checked})} />
                      </label>
                      
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${clientInfo.termsConsent ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--lime)] bg-[var(--s1)] group-hover:border-[var(--lime)]'}`}>
                          {clientInfo.termsConsent && <CheckCircle2 size={14} className="text-black" />}
                        </div>
                        <span className="text-[10px] text-[var(--mu2)] leading-relaxed">
                          {t.termsConsent}
                        </span>
                        <input type="checkbox" className="hidden" checked={clientInfo.termsConsent || false} onChange={(e) => setClientInfo({...clientInfo, termsConsent: e.target.checked})} />
                      </label>
                    </div>

                    <div className="p-5 border border-[var(--b2)] rounded-2xl bg-[var(--s1)]/50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${tradeIn.hasTradeIn ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b3)] bg-white'}`}>
                          {tradeIn.hasTradeIn && <CheckCircle2 size={14} className="text-black" />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">{t.hasTradeIn}</span>
                        <input type="checkbox" className="hidden" checked={tradeIn.hasTradeIn} onChange={(e) => setTradeIn({...tradeIn, hasTradeIn: e.target.checked})} />
                      </label>

                      {tradeIn.hasTradeIn && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-6 space-y-4"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" value={tradeIn.make} onChange={e => setTradeIn({...tradeIn, make: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)] transition-all" placeholder={t.make} />
                            <input type="text" value={tradeIn.model} onChange={e => setTradeIn({...tradeIn, model: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)] transition-all" placeholder={t.model} />
                            <input type="text" value={tradeIn.year} onChange={e => setTradeIn({...tradeIn, year: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)] transition-all" placeholder={t.year} />
                            <input type="text" value={tradeIn.mileage} onChange={e => setTradeIn({...tradeIn, mileage: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)] transition-all" placeholder={t.mileage} />
                          </div>
                          <input type="text" value={tradeIn.vin} onChange={e => setTradeIn({...tradeIn, vin: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)] transition-all font-mono" placeholder={t.vin} />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  disabled={!clientInfo.name || !clientInfo.phone || !clientInfo.email || !clientInfo.tcpaConsent || !clientInfo.termsConsent}
                  onClick={handleNext}
                  className="w-full bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-5 rounded-xl hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                >
                  {t.nextStep} <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 relative z-10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-4xl">{t.depositTitle}</h2>
                  <div className="bg-[var(--lime)] text-white px-4 py-2 rounded-xl font-display text-2xl tracking-widest shadow-lg shadow-[var(--lime)]/20">
                    $95
                  </div>
                </div>
                <p className="text-[var(--mu2)] text-base mb-8">{t.depositDesc}</p>
                
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.paymentMethod}</label>
                    {(['z', 'v', 'c'] as const).map(m => (
                      <button 
                        key={m}
                        onClick={() => setPayMethod(m)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${payMethod === m ? 'border-[var(--lime)] bg-[var(--lime)]/5' : 'border-[var(--b2)] bg-white hover:border-[var(--b3)]'}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{m === 'z' ? '💚' : m === 'v' ? '💙' : '💵'}</span>
                          <div className="text-left">
                            <div className="text-xs font-bold">{m === 'z' ? 'Zelle' : m === 'v' ? 'Venmo' : 'Cash App'}</div>
                            <div className="text-[9px] text-[var(--mu)] font-mono mt-0.5">
                              {m === 'z' ? '279-208-5707' : m === 'v' ? '@cargwin' : '$cargwin'}
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${payMethod === m ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b2)]'}`}>
                          {payMethod === m && <CheckCircle2 size={12} className="text-black" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.senderName}</label>
                      <input 
                        type="text" 
                        value={paymentName} 
                        onChange={e => setPaymentName(e.target.value)} 
                        className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all font-medium" 
                        placeholder="e.g., John Smith" 
                      />
                    </div>

                    <div className="flex gap-3 items-start cursor-pointer bg-[var(--s1)]/50 p-4 rounded-xl border border-[var(--b2)] hover:border-[var(--lime)]/50 transition-colors" onClick={() => setIsConfirmed(!isConfirmed)}>
                      <div className={`w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${isConfirmed ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b3)] bg-white'}`}>
                        {isConfirmed && <CheckCircle2 size={14} className="text-black" />}
                      </div>
                      <p className="text-[10px] text-[var(--mu2)] leading-relaxed" dangerouslySetInnerHTML={{ __html: t.confirmTerms }} />
                    </div>

                    <div className="mt-4 p-4 bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-xl">
                      <div className="flex gap-3">
                        <Info size={16} className="text-[var(--lime)] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--lime)] mb-1">{translations[language].legal.refundTitle}</div>
                          <p className="text-[9px] text-[var(--mu2)] leading-relaxed">{translations[language].legal.refundText}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={!isConfirmed || isSubmitting || !paymentName}
                  onClick={handleSubmit}
                  className="w-full bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-5 rounded-xl hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                >
                  {isSubmitting ? t.processing : pt.payNow}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-6 relative z-10"
              >
                <div className="w-16 h-16 bg-[var(--lime)]/20 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} className="text-[var(--lime)]" />
                </div>
                <h2 className="font-display text-4xl mb-2">{t.acceptedTitle}</h2>
                <p className="text-[var(--mu2)] text-sm mb-8 max-w-md leading-relaxed" dangerouslySetInnerHTML={{ __html: t.acceptedDesc }} />
                
                <div className="flex flex-col gap-4 w-full max-w-md mb-8">
                  <button 
                    onClick={() => setStep(5)}
                    className="w-full bg-[var(--lime)] text-white font-bold text-[10px] uppercase tracking-widest py-5 rounded-xl hover:bg-[var(--lime2)] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--lime)]/20"
                  >
                    <FileText size={18} /> {type === 'lease' ? t.startLeaseApp : t.startCreditApp}
                  </button>
                  
                  {!user && (
                    <button 
                      onClick={() => {
                        setAuthEmail(clientInfo.email);
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-5 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                    >
                      <Lock size={18} /> {translations[language].calc.createAccount}
                    </button>
                  )}

                  <button 
                    onClick={onClose}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-5 rounded-xl hover:bg-white transition-all"
                  >
                    {t.close}
                  </button>
                </div>

                {/* VIP Upsell */}
                <div className="w-full bg-[var(--s1)] border border-[var(--lime)]/30 rounded-3xl p-8 mb-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap className="w-24 h-24 text-[var(--lime)]" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-[var(--lime)]" />
                      <span className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{pt.upgradeToVip}</span>
                    </div>
                    <h3 className="font-display text-3xl mb-2">{pt.upgradePrice}</h3>
                    <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold mb-6">{pt.upgradeDesc}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      {pt.vipFeatures.map((f: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-left">
                          <CheckCircle2 size={10} className="text-[var(--lime)]" />
                          {f}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleVipUpgrade}
                        className="w-full bg-[var(--lime)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-all shadow-lg shadow-[var(--lime)]/20"
                      >
                        {pt.upgradeToVip}
                      </button>
                      <button 
                        onClick={onClose}
                        className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)] hover:text-[var(--w)] transition-colors"
                      >
                        {pt.skipUpgrade}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-12 relative z-10"
              >
                <div className="w-20 h-20 bg-[var(--teal)]/20 rounded-full flex items-center justify-center mb-8">
                  <Crown size={40} className="text-[var(--teal)]" />
                </div>
                <h2 className="font-display text-5xl mb-4">{t.vipActivatedTitle}</h2>
                <p className="text-[var(--mu2)] text-base mb-12 max-w-md leading-relaxed">
                  {t.vipActivatedDesc}
                </p>
                
                <div className="flex flex-col gap-4 w-full max-w-xs">
                  <button 
                    onClick={() => setStep(5)}
                    className="w-full bg-[var(--lime)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--lime2)] transition-all shadow-lg shadow-[var(--lime)]/20"
                  >
                    {t.startCreditApp}
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-sm"
                  >
                    {t.close}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 relative z-10 overflow-y-auto max-h-[70vh] pr-4 custom-scrollbar"
              >
                {!isCreditAppSuccess ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    
                    // Manual validation for each step
                    if (creditAppStep === 1) {
                      if (!creditAppData.firstName || !creditAppData.lastName || !creditAppData.email || !creditAppData.phone || !creditAppData.dob) {
                        alert(translations[language].creditApp.validation.personal);
                        return;
                      }
                    } else if (creditAppStep === 2) {
                      if (!creditAppData.employer || !creditAppData.position || !creditAppData.monthlyIncome || !creditAppData.workExperience || !creditAppData.employerPhone) {
                        alert(translations[language].creditApp.validation.employment);
                        return;
                      }
                    } else if (creditAppStep === 3) {
                      if (!creditAppData.residencyStatus || !creditAppData.address) {
                        alert(translations[language].creditApp.validation.residency);
                        return;
                      }
                    } else if (creditAppStep === 5) {
                      if (!creditAppData.signature || !creditAppData.ssn) {
                        alert(translations[language].creditApp.validation.signature);
                        return;
                      }
                    }

                    if (creditAppStep < 5) {
                      setCreditAppStep(creditAppStep + 1);
                    } else {
                      handleCreditAppSubmit(e);
                    }
                  }} className="space-y-6 pb-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 bg-[var(--lime)]/10 rounded-xl flex items-center justify-center">
                        <FileText size={20} className="text-[var(--lime)]" />
                      </div>
                      <div>
                        <h2 className="font-display text-2xl">{type === 'lease' ? ct.leaseAppTitle : ct.title}</h2>
                        <p className="text-[9px] text-[var(--mu2)] uppercase tracking-widest font-bold">{ct.subtitle}</p>
                      </div>
                    </div>

                    {/* Personal Info */}
                    {creditAppStep === 1 && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.firstName}</label>
                            <input type="text" value={creditAppData.firstName} onChange={e => setCreditAppData({...creditAppData, firstName: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.lastName}</label>
                            <input type="text" value={creditAppData.lastName} onChange={e => setCreditAppData({...creditAppData, lastName: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.email}</label>
                            <input type="email" value={creditAppData.email} onChange={e => setCreditAppData({...creditAppData, email: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.dob}</label>
                            <input type="date" value={creditAppData.dob} onChange={e => setCreditAppData({...creditAppData, dob: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.dlNumber}</label>
                            <input type="text" value={creditAppData.dlNumber} onChange={e => setCreditAppData({...creditAppData, dlNumber: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                          <div>
                            {/* Empty div to keep grid layout */}
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5 mt-2"
                        >
                          {t.nextStep} <ChevronRight size={18} />
                        </button>
                      </div>
                    )}

                    {/* Employment Info */}
                    {creditAppStep === 2 && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.employer}</label>
                            <input type="text" value={creditAppData.employer} onChange={e => setCreditAppData({...creditAppData, employer: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.position}</label>
                            <input type="text" value={creditAppData.position} onChange={e => setCreditAppData({...creditAppData, position: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.employerAddress}</label>
                          <input type="text" value={creditAppData.employerAddress} onChange={e => setCreditAppData({...creditAppData, employerAddress: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.workExperience}</label>
                            <input type="number" value={creditAppData.workExperience} onChange={e => setCreditAppData({...creditAppData, workExperience: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.employerPhone}</label>
                            <input type="tel" value={creditAppData.employerPhone} onChange={e => setCreditAppData({...creditAppData, employerPhone: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.incomeType}</label>
                            <select value={creditAppData.incomeType} onChange={e => setCreditAppData({...creditAppData, incomeType: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all">
                              <option value="w2">{ct.incomeTypes.w2}</option>
                              <option value="i1099">{ct.incomeTypes.i1099}</option>
                              <option value="self">{ct.incomeTypes.self}</option>
                              <option value="other">{ct.incomeTypes.other}</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.monthlyIncome}</label>
                            <input type="number" value={creditAppData.monthlyIncome} onChange={e => setCreditAppData({...creditAppData, monthlyIncome: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.additionalIncome}</label>
                          <input type="number" value={creditAppData.additionalIncome} onChange={e => setCreditAppData({...creditAppData, additionalIncome: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                        </div>

                        <div className="flex gap-4 mt-2">
                          <button 
                            type="button"
                            onClick={() => setCreditAppStep(1)}
                            className="w-1/3 bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-sm"
                          >
                            {translations[language].calc.back}
                          </button>
                          <button 
                            type="submit"
                            className="w-2/3 bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                          >
                            {t.nextStep} <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Financial & Residency */}
                    {creditAppStep === 3 && (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.residencyStatus}</label>
                          <input type="text" value={creditAppData.residencyStatus} onChange={e => setCreditAppData({...creditAppData, residencyStatus: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" placeholder="e.g., Citizen, Green Card, H1B" />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.address}</label>
                          <input type="text" value={creditAppData.address} onChange={e => setCreditAppData({...creditAppData, address: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.prevAddress}</label>
                          <input type="text" value={creditAppData.prevAddress} onChange={e => setCreditAppData({...creditAppData, prevAddress: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                          <div className="flex items-center justify-between p-4 bg-[var(--s1)] rounded-xl border border-[var(--b2)]">
                            <span className="text-[10px] font-bold uppercase tracking-widest">{ct.hasCosigner}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setCreditAppData({...creditAppData, hasCosigner: true})} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${creditAppData.hasCosigner ? 'bg-[var(--lime)] text-white' : 'bg-white border border-[var(--b2)] text-[var(--mu)]'}`}>{ct.yes}</button>
                              <button type="button" onClick={() => setCreditAppData({...creditAppData, hasCosigner: false})} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${!creditAppData.hasCosigner ? 'bg-[var(--lime)] text-white' : 'bg-white border border-[var(--b2)] text-[var(--mu)]'}`}>{ct.no}</button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-[var(--s1)] rounded-xl border border-[var(--b2)]">
                            <span className="text-[10px] font-bold uppercase tracking-widest">{ct.prevAuto}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setCreditAppData({...creditAppData, prevAuto: true})} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${creditAppData.prevAuto ? 'bg-[var(--lime)] text-white' : 'bg-white border border-[var(--b2)] text-[var(--mu)]'}`}>{ct.yes}</button>
                              <button type="button" onClick={() => setCreditAppData({...creditAppData, prevAuto: false})} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${!creditAppData.prevAuto ? 'bg-[var(--lime)] text-white' : 'bg-white border border-[var(--b2)] text-[var(--mu)]'}`}>{ct.no}</button>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 mt-2">
                          <button 
                            type="button"
                            onClick={() => setCreditAppStep(2)}
                            className="w-1/3 bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-sm"
                          >
                            {translations[language].calc.back}
                          </button>
                          <button 
                            type="submit"
                            className="w-2/3 bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                          >
                            {t.nextStep} <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Policy 1 */}
                    {creditAppStep === 4 && (
                      <div className="space-y-6">
                        <div className="p-6 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl space-y-6">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                              <ShieldCheck size={14} className="text-[var(--lime)]" /> {ct.policyTitle}
                            </h4>
                            <p className="text-[9px] text-[var(--mu2)] leading-relaxed">{ct.policyText}</p>
                          </div>

                          <div className="flex items-start gap-3">
                            <input 
                              type="checkbox" 
                              id="policyAccepted1"
                              checked={policyAccepted}
                              onChange={(e) => setPolicyAccepted(e.target.checked)}
                              className="mt-1 w-4 h-4 text-[var(--lime)] border-[var(--b2)] rounded focus:ring-[var(--lime)]"
                            />
                            <label htmlFor="policyAccepted1" className="text-[9px] text-[var(--mu2)] leading-relaxed italic cursor-pointer">
                              {translations[language].calc.policyAgreement}
                            </label>
                          </div>
                        </div>

                        <div className="flex gap-4 mt-2">
                          <button 
                            type="button"
                            onClick={() => setCreditAppStep(3)}
                            className="w-1/3 bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-sm"
                          >
                            {translations[language].calc.back}
                          </button>
                          <button 
                            type="submit"
                            disabled={!policyAccepted}
                            className="w-2/3 bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-black transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                          >
                            {t.nextStep} <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Policy 2 & Submit */}
                    {creditAppStep === 5 && (
                      <div className="space-y-6">
                        <div className="p-6 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl space-y-6">
                          <div className="p-4 bg-white border border-[var(--b2)] rounded-xl mb-4">
                            <div className="flex gap-3">
                              <ShieldCheck size={16} className="text-[var(--lime)] shrink-0 mt-0.5" />
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--w)] mb-1">{translations[language].legal.fcraTitle}</div>
                                <p className="text-[9px] text-[var(--mu2)] leading-relaxed">{translations[language].legal.fcraText}</p>
                              </div>
                            </div>
                          </div>

                          <p className="text-[9px] text-[var(--mu2)] leading-relaxed italic">{ct.consentText}</p>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.signature}</label>
                            <input type="text" value={creditAppData.signature} onChange={e => setCreditAppData({...creditAppData, signature: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" placeholder="John Doe" />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{ct.ssn}</label>
                            <input type="password" value={creditAppData.ssn} onChange={e => setCreditAppData({...creditAppData, ssn: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-xl p-4 text-sm outline-none focus:border-[var(--lime)] transition-all" placeholder="XXX-XX-XXXX" />
                          </div>

                          <div className="flex items-start gap-3">
                            <input 
                              type="checkbox" 
                              id="consentAccepted"
                              checked={consentAccepted}
                              onChange={(e) => setConsentAccepted(e.target.checked)}
                              className="mt-1 w-4 h-4 text-[var(--lime)] border-[var(--b2)] rounded focus:ring-[var(--lime)]"
                            />
                            <label htmlFor="consentAccepted" className="text-[9px] text-[var(--mu2)] leading-relaxed italic cursor-pointer">
                              {translations[language].calc.policyAgreement}
                            </label>
                          </div>
                        </div>
 
                        <div className="flex gap-4 mt-2">
                          <button 
                            type="button"
                            onClick={() => setCreditAppStep(4)}
                            className="w-1/3 bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all shadow-sm"
                          >
                            {translations[language].calc.back}
                          </button>
                          <button 
                            type="submit"
                            disabled={isCreditAppSubmitting || !consentAccepted}
                            className="w-2/3 bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-black transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                          >
                            {isCreditAppSubmitting ? t.processing : ct.submit} <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center text-center py-12"
                  >
                    <div className="w-20 h-20 bg-[var(--lime)]/20 rounded-full flex items-center justify-center mb-8">
                      <CheckCircle2 size={40} className="text-[var(--lime)]" />
                    </div>
                    <h2 className="font-display text-5xl mb-4">{ct.successTitle}</h2>
                    <p className="text-[var(--mu2)] text-base mb-12 max-w-md leading-relaxed">
                      {ct.successDesc}
                    </p>
                    <button 
                      onClick={onClose}
                      className="bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest px-12 py-4 rounded-xl hover:bg-white transition-all shadow-sm"
                    >
                      {t.close}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Sticky Summary & 11-Key Lock */}
        <div className="w-full md:w-[400px] bg-[var(--s1)] border-l border-[var(--b2)] p-8 md:p-10 flex flex-col relative z-10 shadow-inner">
          <div className="sticky top-10 space-y-10">
            <div>
              <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest mb-3">{t.yourSelection}</div>
              <h3 className="font-display text-3xl leading-tight mb-6">{carName}</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-end border-b border-[var(--b2)] pb-3">
                  <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{t.dealType}</div>
                  <div className="font-bold uppercase tracking-widest text-xs">{type === 'lease' ? t.lease : t.finance}</div>
                </div>
                <div className="flex justify-between items-end border-b border-[var(--b2)] pb-3">
                  <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{t.dueAtSigning}</div>
                  <div className="font-mono text-sm font-bold">${down.toLocaleString()}</div>
                </div>
                <div className="flex justify-between items-end pt-3">
                  <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{t.monthly}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-5xl text-[var(--w)] leading-none">${Math.round(payment)}</span>
                    <span className="text-[10px] text-[var(--mu2)] font-bold">{t.mo}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 11-Key Lock Visualization */}
            <div className="bg-white border border-[var(--b2)] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Lock size={16} className="text-[var(--lime)]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-black">{translations[language].lock.title}</div>
                  <div className="text-[8px] font-bold text-[var(--mu2)] uppercase tracking-widest">{translations[language].lock.subtitle}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {lockKeys.map((key, i) => (
                  <div key={i} className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[var(--mu2)]">
                    <CheckCircle2 size={10} className="text-[var(--grn)]" />
                    {key}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-xl">
              <ShieldCheck size={20} className="text-[var(--lime)] shrink-0" />
              <p className="text-[9px] text-[var(--mu2)] leading-relaxed font-bold uppercase tracking-wider">
                {t.bestPriceDesc}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      </div>
    </div>,
    document.body
  );
};
