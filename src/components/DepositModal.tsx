import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, ChevronRight, ShieldCheck, Car, FileText, CreditCard, Info, AlertCircle, Zap, Lock, Crown } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';
import { translations } from '../translations';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

import { QRCodeSVG } from 'qrcode.react';

import { DocumentUploader } from './DocumentUploader';
import { StripePaymentForm } from './StripePaymentForm';

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
  const [waitingStatus, setWaitingStatus] = useState(0);
  const [showQrCode, setShowQrCode] = useState(false);
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
  const [creditAppStep, setCreditAppStep] = useState(0);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [creditCheckConsent, setCreditCheckConsent] = useState(false);
  const [creditCheckData, setCreditCheckData] = useState({ ssnLast4: '', dob: '', address: '', city: '', state: '', zip: '' });
  const [creditCheckResult, setCreditCheckResult] = useState<any>(null);
  const [creditCheckError, setCreditCheckError] = useState('');
  const [isCreditCheckRunning, setIsCreditCheckRunning] = useState(false);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      if (leadId) {
        setStep(2);
      } else {
        setStep(1);
      }
      setCreditAppStep(0);
      setPolicyAccepted(false);
      setConsentAccepted(false);
      setIsConfirmed(false);
      setIsCreditAppSuccess(false);
      setWaitingStatus(0);
      setShowQrCode(false);
      setCreditCheckConsent(false);
      setCreditCheckData({ ssnLast4: '', dob: '', address: '', city: '', state: '', zip: '' });
      setCreditCheckResult(null);
      setCreditCheckError('');
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

  useEffect(() => {
    if (isCreditAppSuccess) {
      const t1 = setTimeout(() => setWaitingStatus(1), 2500);
      const t2 = setTimeout(() => setWaitingStatus(2), 5500);
      const t3 = setTimeout(() => setWaitingStatus(3), 9000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isCreditAppSuccess]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const success = await onConfirm();
    if (success) {
      if (payMethod === 's') {
        setStep(1.5); // Stripe payment step
      } else {
        setStep(2); // Credit app step
      }
    }
  };

  const handleCreditCheck = async () => {
    if (!leadId || !creditCheckConsent) return;
    setIsCreditCheckRunning(true);
    setCreditCheckError('');
    try {
      const consentRes = await fetch('/api/credit/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, userId: user?.uid }),
      });
      const consentData = await consentRes.json();
      if (!consentRes.ok) throw new Error(consentData.error || 'Failed to record consent');
      const pullRes = await fetch('/api/credit/soft-pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditCheckId: consentData.id,
          applicant: {
            firstName: clientInfo.name?.split(' ')[0] || '',
            lastName: clientInfo.name?.split(' ').slice(1).join(' ') || '',
            address: creditCheckData.address,
            city: creditCheckData.city,
            state: creditCheckData.state,
            zipCode: creditCheckData.zip,
            dateOfBirth: creditCheckData.dob,
            ssn: creditCheckData.ssnLast4,
          }
        }),
      });
      const pullData = await pullRes.json();
      if (!pullRes.ok) throw new Error(pullData.error || 'Failed to run credit check');
      setCreditCheckResult(pullData);
      toast.success('Credit check completed!');
      setCreditAppStep(1);
    } catch (err: any) {
      setCreditCheckError(err.message || 'Credit check failed');
      toast.error(err.message || 'Credit check failed');
    } finally {
      setIsCreditCheckRunning(false);
    }
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
        if (leadId) {
          try {
            await updateDoc(doc(db, 'leads', leadId), { hasCreditApp: true });
          } catch (fsError) {
            console.warn("Failed to update Firestore with hasCreditApp:", fsError);
          }
        }
      } else {
        const errorData = await response.json();
        if (errorData.details && Array.isArray(errorData.details)) {
          const messages = errorData.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join('\n');
          toast.error(`Validation failed:\n${messages}`);
        } else {
          toast.error(`${translations[language].creditApp.validation.error}${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error submitting credit app:', error);
      toast.error('Network error while submitting application. Please try again.');
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
          
          {step < 2 && (
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
                className="flex-1 relative z-10 overflow-y-auto max-h-[70vh] pr-4 custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-4xl">{t.contactAndTradeIn}</h2>
                  <div className="bg-[var(--lime)] text-white px-4 py-2 rounded-xl font-display text-2xl tracking-widest shadow-lg shadow-[var(--lime)]/20">
                    $95
                  </div>
                </div>
                <p className="text-[var(--mu2)] text-base mb-8">
                  {carName ? t.depositDescCatalog : t.depositDescCalc}
                </p>
                
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

                    {/* Conditional Trade-In */}
                    {!tradeIn.make && (
                      <div className="pt-4 border-t border-[var(--b2)]">
                        <label className="flex items-center gap-3 cursor-pointer group mb-4">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${tradeIn.hasTradeIn ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b3)] bg-[var(--s1)] group-hover:border-[var(--lime)]'}`}>
                            {tradeIn.hasTradeIn && <CheckCircle2 size={14} className="text-black" />}
                          </div>
                          <span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.hasTradeIn}</span>
                          <input type="checkbox" className="hidden" checked={tradeIn.hasTradeIn} onChange={(e) => setTradeIn({...tradeIn, hasTradeIn: e.target.checked})} />
                        </label>

                        {tradeIn.hasTradeIn && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.make}</label>
                                <input type="text" value={tradeIn.make} onChange={e => setTradeIn({...tradeIn, make: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-3 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.model}</label>
                                <input type="text" value={tradeIn.model} onChange={e => setTradeIn({...tradeIn, model: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-3 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.year}</label>
                                <input type="text" value={tradeIn.year} onChange={e => setTradeIn({...tradeIn, year: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-3 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest mb-2">{t.mileage}</label>
                                <input type="text" value={tradeIn.mileage} onChange={e => setTradeIn({...tradeIn, mileage: e.target.value})} className="w-full bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-3 text-sm outline-none focus:border-[var(--lime)] transition-all" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.paymentMethod}</label>
                      {(['s', 'z', 'c'] as const).map(m => (
                        <button 
                          key={m}
                          onClick={() => setPayMethod(m)}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all w-full ${payMethod === m ? 'border-[var(--lime)] bg-[var(--lime)]/5' : 'border-[var(--b2)] bg-white hover:border-[var(--b3)]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{m === 's' ? '💳' : m === 'z' ? '💚' : '💵'}</span>
                            <div className="text-left">
                              <div className="text-xs font-bold">{m === 's' ? 'Credit Card (Stripe)' : m === 'z' ? 'Zelle' : 'Cash App'}</div>
                              <div className="text-[9px] text-[var(--mu)] font-mono mt-0.5">
                                {m === 's' ? 'Secure Payment' : m === 'z' ? '279-208-5707' : '$cargwin'}
                              </div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${payMethod === m ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b2)]'}`}>
                            {payMethod === m && <CheckCircle2 size={12} className="text-black" />}
                          </div>
                        </button>
                      ))}
                    </div>

                    {payMethod !== 's' && (
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
                    )}

                    <div className="flex gap-3 items-start cursor-pointer bg-[var(--s1)]/50 p-4 rounded-xl border border-[var(--b2)] hover:border-[var(--lime)]/50 transition-colors" onClick={() => setIsConfirmed(!isConfirmed)}>
                      <div className={`w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-colors ${isConfirmed ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--b3)] bg-white'}`}>
                        {isConfirmed && <CheckCircle2 size={14} className="text-black" />}
                      </div>
                      <p className="text-[10px] text-[var(--mu2)] leading-relaxed" dangerouslySetInnerHTML={{ __html: t.confirmTerms }} />
                    </div>

                    <div className="mt-4 p-4 bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-xl">
                      <div className="flex gap-3">
                        <ShieldCheck size={16} className="text-[var(--lime)] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--lime)] mb-1">{t.refundGuaranteeTitle}</div>
                          <p className="text-[9px] text-[var(--mu2)] leading-relaxed">{t.refundGuaranteeDesc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={!clientInfo.name || !clientInfo.phone || !clientInfo.email || !clientInfo.tcpaConsent || !clientInfo.termsConsent || !isConfirmed || isSubmitting || (payMethod !== 's' && !paymentName)}
                  onClick={handleSubmit}
                  className="w-full bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-5 rounded-xl hover:bg-black transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/5"
                >
                  {isSubmitting ? t.processing : pt.payNow}
                </button>
              </motion.div>
            )}

            {step === 1.5 && (
              <motion.div 
                key="step1.5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 relative z-10"
              >
                <div className="mb-8">
                  <div className="w-12 h-12 bg-[var(--lime)]/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">💳</span>
                  </div>
                  <h2 className="font-display text-3xl mb-2">Secure Payment</h2>
                  <p className="text-[var(--mu2)] text-sm">
                    Complete your $95 refundable deposit to lock in this deal.
                  </p>
                </div>

                <StripePaymentForm 
                  leadId={leadId || localStorage.getItem('leadId') || ''} 
                  amount={95}
                  onSuccess={() => setStep(2)}
                  onError={(err) => toast.error(`Payment failed: ${err}`)}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 relative z-10 overflow-y-auto max-h-[70vh] pr-4 custom-scrollbar"
              >
                {!isCreditAppSuccess && creditAppStep === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-3xl mb-2">Credit Pre-Check</h2>
                      <p className="text-[var(--mu2)] text-sm">A soft pull helps us find you the best rates. No impact on your credit score.</p>
                    </div>
                    {!creditCheckResult ? (
                      <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <ShieldCheck size={20} className="text-[var(--lime)]" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">700Credit Soft Pull</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="date" value={creditCheckData.dob} onChange={e => setCreditCheckData({...creditCheckData, dob: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)]" placeholder="Date of Birth" />
                          <input type="text" maxLength={4} value={creditCheckData.ssnLast4} onChange={e => setCreditCheckData({...creditCheckData, ssnLast4: e.target.value.replace(/\D/g,'').slice(0,4)})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)] font-mono" placeholder="SSN last 4" />
                        </div>
                        <input type="text" value={creditCheckData.address} onChange={e => setCreditCheckData({...creditCheckData, address: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)]" placeholder="Street Address" />
                        <div className="grid grid-cols-3 gap-3">
                          <input type="text" value={creditCheckData.city} onChange={e => setCreditCheckData({...creditCheckData, city: e.target.value})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)]" placeholder="City" />
                          <input type="text" maxLength={2} value={creditCheckData.state} onChange={e => setCreditCheckData({...creditCheckData, state: e.target.value.toUpperCase().slice(0,2)})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)]" placeholder="State" />
                          <input type="text" maxLength={5} value={creditCheckData.zip} onChange={e => setCreditCheckData({...creditCheckData, zip: e.target.value.replace(/\D/g,'').slice(0,5)})} className="w-full bg-white border border-[var(--b2)] rounded-lg p-3 text-xs outline-none focus:border-[var(--lime)]" placeholder="ZIP" />
                        </div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={creditCheckConsent} onChange={e => setCreditCheckConsent(e.target.checked)} className="mt-1" />
                          <span className="text-[9px] text-[var(--mu2)] leading-relaxed">I authorize Hunter Lease to obtain my credit report via a soft inquiry. This will NOT affect my credit score.</span>
                        </label>
                        {creditCheckError && <p className="text-red-500 text-xs">{creditCheckError}</p>}
                        <button type="button" onClick={handleCreditCheck} disabled={!creditCheckConsent || !creditCheckData.ssnLast4 || !creditCheckData.dob || isCreditCheckRunning} className="w-full bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-black transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                          {isCreditCheckRunning ? 'Running...' : 'Check My Credit'} <ShieldCheck size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-2xl p-6 text-center">
                        <ShieldCheck size={28} className="text-[var(--lime)] mx-auto mb-3" />
                        <div className="text-2xl font-display text-[var(--lime)] mb-1">{creditCheckResult.creditBand || creditCheckResult.tier || 'Approved'}</div>
                        <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold mb-4">{creditCheckResult.scoreRange || 'Soft Pull Complete'}</p>
                      </div>
                    )}
                    <button type="button" onClick={() => setCreditAppStep(1)} className="w-full bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest py-4 rounded-xl hover:bg-white transition-all">
                      {creditCheckResult ? 'Continue to Full Application →' : 'Skip & Continue →'}
                    </button>
                  </div>
                )}

                {!isCreditAppSuccess && creditAppStep > 0 ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    
                    // Manual validation for each step
                    if (creditAppStep === 1) {
                      if (!creditAppData.firstName || !creditAppData.lastName || !creditAppData.email || !creditAppData.phone || !creditAppData.dob) {
                        toast.error(translations[language].creditApp.validation.personal);
                        return;
                      }
                    } else if (creditAppStep === 2) {
                      if (!creditAppData.employer || !creditAppData.position || !creditAppData.monthlyIncome || !creditAppData.workExperience || !creditAppData.employerPhone) {
                        toast.error(translations[language].creditApp.validation.employment);
                        return;
                      }
                    } else if (creditAppStep === 3) {
                      if (!creditAppData.residencyStatus || !creditAppData.address) {
                        toast.error(translations[language].creditApp.validation.residency);
                        return;
                      }
                    } else if (creditAppStep === 5) {
                      if (!creditAppData.signature || !creditAppData.ssn) {
                        toast.error(translations[language].creditApp.validation.signature);
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

                    {/* Cross-Device Handoff */}
                    <div className="p-4 bg-[var(--s1)] border border-[var(--b2)] rounded-xl flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-[var(--b2)]">
                            <Lock size={20} className="text-[var(--mu)]" />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{t.continueOnPhone || "Continue on Phone"}</div>
                            <div className="text-xs text-[var(--mu2)]">{t.scanQrCode || "Scan QR code to securely complete on your mobile device"}</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => setShowQrCode(!showQrCode)} className="px-4 py-2 bg-white border border-[var(--b2)] rounded-lg text-xs font-bold hover:border-[var(--lime)] transition-colors">
                          {t.showQr || "Show QR"}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {showQrCode && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-center pt-4 border-t border-[var(--b2)] overflow-hidden"
                          >
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-[var(--b2)]">
                              <QRCodeSVG value={`${window.location.origin}/?creditApp=${leadId || 'pending'}`} size={160} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                    {waitingStatus < 3 ? (
                      <div className="space-y-8 w-full max-w-sm">
                        <div className="relative w-24 h-24 mx-auto">
                          <div className="absolute inset-0 border-4 border-[var(--b2)] rounded-full" />
                          <motion.div 
                            className="absolute inset-0 border-4 border-[var(--lime)] rounded-full border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-mono text-xl font-bold">{Math.min(99, waitingStatus * 33 + 15)}%</span>
                          </div>
                        </div>
                        
                        <div className="space-y-4 text-left">
                          <div className={`flex items-center gap-3 transition-opacity duration-500 ${waitingStatus >= 0 ? 'opacity-100' : 'opacity-30'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${waitingStatus > 0 ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] border border-[var(--b2)]'}`}>
                              {waitingStatus > 0 && <CheckCircle2 size={12} />}
                            </div>
                            <span className="text-sm font-medium">{t.waitingStatus0}</span>
                          </div>
                          <div className={`flex items-center gap-3 transition-opacity duration-500 ${waitingStatus >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${waitingStatus > 1 ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] border border-[var(--b2)]'}`}>
                              {waitingStatus > 1 && <CheckCircle2 size={12} />}
                            </div>
                            <span className="text-sm font-medium">{t.waitingStatus1}</span>
                          </div>
                          <div className={`flex items-center gap-3 transition-opacity duration-500 ${waitingStatus >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${waitingStatus > 2 ? 'bg-[var(--lime)] text-black' : 'bg-[var(--s1)] border border-[var(--b2)]'}`}>
                              {waitingStatus > 2 && <CheckCircle2 size={12} />}
                            </div>
                            <span className="text-sm font-medium">{t.waitingStatus2}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                        <div className="w-20 h-20 bg-[var(--lime)]/20 rounded-full flex items-center justify-center mx-auto mb-8">
                          <CheckCircle2 size={40} className="text-[var(--lime)]" />
                        </div>
                        <h2 className="font-display text-4xl mb-4">{ct.successTitle}</h2>
                        <p className="text-[var(--mu2)] text-sm mb-8 max-w-md mx-auto leading-relaxed">
                          {ct.successDesc}
                        </p>
                        
                        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 text-left mb-8">
                          <h3 className="font-bold text-[10px] uppercase tracking-widest text-[var(--lime)] mb-4">{t.prepareDocsTitle}</h3>
                          <div className="space-y-6">
                            <DocumentUploader 
                              leadId={leadId || 'temp'} 
                              documentType="insurance" 
                              label={t.prepareDocsInsurance} 
                              description="Upload a copy of your current auto insurance policy."
                            />
                            {creditAppData.incomeType === 'w2' && (
                              <DocumentUploader 
                                leadId={leadId || 'temp'} 
                                documentType="w2" 
                                label={t.prepareDocsW2} 
                                description="Upload your most recent W2 or pay stubs."
                              />
                            )}
                            {(creditAppData.incomeType === 'i1099' || creditAppData.incomeType === 'self') && (
                              <DocumentUploader 
                                leadId={leadId || 'temp'} 
                                documentType="1099" 
                                label={t.prepareDocs1099} 
                                description="Upload your most recent 1099 or 6 months of bank statements."
                              />
                            )}
                          </div>
                        </div>

                        <button 
                          onClick={onClose}
                          className="bg-[var(--w)] text-white font-bold text-[10px] uppercase tracking-widest px-12 py-4 rounded-xl hover:bg-black transition-all shadow-sm w-full"
                        >
                          {t.close}
                        </button>
                      </motion.div>
                    )}
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
