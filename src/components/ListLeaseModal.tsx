import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Car, FileText, Image as ImageIcon, CheckCircle, ChevronRight, ChevronLeft, Upload, DollarSign, Info } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { cn } from '../utils/cn';

interface ListLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BANK_FEES: Record<string, number> = {
  'BMW Financial Services': 500,
  'Mercedes-Benz Financial': 595,
  'Toyota Financial': 200,
  'Tesla': 150,
  'Chase Auto': 300,
  'Other': 350,
};

export const ListLeaseModal: React.FC<ListLeaseModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguageStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '2024',
    bank: 'BMW Financial Services',
    payment: '',
    monthsLeft: '',
    currentMileage: '',
    allowedMileage: '',
    incentive: '',
    photos: [] as string[],
  });

  const t = {
    en: {
      title: 'List Your Lease',
      step1: 'Vehicle & Bank',
      step2: 'Lease Terms',
      step3: 'Photos',
      step4: 'Review & List',
      make: 'Make',
      model: 'Model',
      year: 'Year',
      bank: 'Leasing Bank',
      payment: 'Monthly Payment ($)',
      monthsLeft: 'Months Remaining',
      currentMileage: 'Current Mileage',
      allowedMileage: 'Total Allowed Mileage',
      incentive: 'Cash Incentive to Buyer ($) - Optional',
      uploadPhotos: 'Upload Photos',
      uploadDesc: 'Drag and drop or click to upload vehicle photos',
      reviewTitle: 'Listing Summary',
      bankFee: 'Bank Transfer Fee (Est.)',
      platformFee: 'Platform Listing Fee',
      totalDue: 'Total Due Today',
      next: 'Next Step',
      back: 'Back',
      submit: 'Pay & List Vehicle',
      successTitle: 'Vehicle Listed Successfully!',
      successDesc: 'Your lease transfer listing is now live on the marketplace.',
      close: 'Close',
      feeNote: 'The bank transfer fee is typically paid by the buyer or split, but varies by bank. The platform fee is required to list.'
    },
    ru: {
      title: 'Выставить авто',
      step1: 'Авто и Банк',
      step2: 'Условия',
      step3: 'Фото',
      step4: 'Проверка',
      make: 'Марка',
      model: 'Модель',
      year: 'Год',
      bank: 'Лизинговый банк',
      payment: 'Ежемесячный платеж ($)',
      monthsLeft: 'Осталось месяцев',
      currentMileage: 'Текущий пробег',
      allowedMileage: 'Разрешенный пробег за весь срок',
      incentive: 'Бонус покупателю ($) - Необязательно',
      uploadPhotos: 'Загрузить фото',
      uploadDesc: 'Перетащите или нажмите для загрузки фотографий',
      reviewTitle: 'Сводка объявления',
      bankFee: 'Комиссия банка за перевод (Прим.)',
      platformFee: 'Комиссия платформы',
      totalDue: 'К оплате сегодня',
      next: 'Далее',
      back: 'Назад',
      submit: 'Оплатить и выставить',
      successTitle: 'Автомобиль успешно выставлен!',
      successDesc: 'Ваше объявление о передаче лизинга теперь доступно на бирже.',
      close: 'Закрыть',
      feeNote: 'Комиссия банка обычно оплачивается покупателем или делится, но зависит от банка. Комиссия платформы обязательна для публикации.'
    }
  }[language];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoUpload = () => {
    // Simulate photo upload
    if (formData.photos.length < 4) {
      setFormData({
        ...formData,
        photos: [...formData.photos, `https://images.unsplash.com/photo-1555353540-64fd8b0ebd36?auto=format&fit=crop&q=80&w=400&h=300&rnd=${Math.random()}`]
      });
    }
  };

  const bankFee = BANK_FEES[formData.bank] || 350;
  const platformFee = 99;

  const renderStepIndicator = () => {
    const steps = [
      { num: 1, icon: Car, label: t.step1 },
      { num: 2, icon: FileText, label: t.step2 },
      { num: 3, icon: ImageIcon, label: t.step3 },
      { num: 4, icon: CheckCircle, label: t.step4 },
    ];

    return (
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[var(--b2)] -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--lime)] -z-10 transition-all duration-500"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        />
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = step >= s.num;
          return (
            <div key={s.num} className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300",
                isActive ? "bg-[var(--lime)] text-black" : "bg-[var(--s2)] border border-[var(--b2)] text-[var(--mu2)]"
              )}>
                <Icon size={18} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest absolute -bottom-6 whitespace-nowrap",
                isActive ? "text-[var(--lime)]" : "text-[var(--mu2)]"
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
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
          className="relative w-full max-w-2xl bg-[var(--bg)] border border-[var(--b2)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-[var(--b2)] flex items-center justify-between shrink-0">
            <h2 className="font-display text-2xl uppercase">{t.title}</h2>
            <button onClick={onClose} className="p-2 text-[var(--mu2)] hover:text-[var(--w)] transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {step < 5 && renderStepIndicator()}

            <div className="mt-12">
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.make}</label>
                      <input type="text" name="make" value={formData.make} onChange={handleInputChange} placeholder="e.g. BMW" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.model}</label>
                      <input type="text" name="model" value={formData.model} onChange={handleInputChange} placeholder="e.g. M340i" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.year}</label>
                      <select name="year" value={formData.year} onChange={handleInputChange} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none appearance-none">
                        {[2025, 2024, 2023, 2022, 2021].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.bank}</label>
                      <select name="bank" value={formData.bank} onChange={handleInputChange} className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none appearance-none">
                        {Object.keys(BANK_FEES).map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.payment}</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mu2)]" />
                        <input type="number" name="payment" value={formData.payment} onChange={handleInputChange} placeholder="650" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl pl-10 pr-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.monthsLeft}</label>
                      <input type="number" name="monthsLeft" value={formData.monthsLeft} onChange={handleInputChange} placeholder="18" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.currentMileage}</label>
                      <input type="number" name="currentMileage" value={formData.currentMileage} onChange={handleInputChange} placeholder="12000" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.allowedMileage}</label>
                      <input type="number" name="allowedMileage" value={formData.allowedMileage} onChange={handleInputChange} placeholder="36000" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[var(--mu)] mb-2">{t.incentive}</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--mu2)]" />
                      <input type="number" name="incentive" value={formData.incentive} onChange={handleInputChange} placeholder="1000" className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl pl-10 pr-4 py-3 text-[var(--w)] focus:border-[var(--lime)] focus:outline-none" />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div 
                    onClick={handlePhotoUpload}
                    className="border-2 border-dashed border-[var(--b2)] hover:border-[var(--lime)] bg-[var(--s2)] rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                  >
                    <div className="w-16 h-16 bg-[var(--b1)] group-hover:bg-[var(--lime)]/10 rounded-full flex items-center justify-center mb-4 transition-colors">
                      <Upload size={24} className="text-[var(--mu2)] group-hover:text-[var(--lime)] transition-colors" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{t.uploadPhotos}</h3>
                    <p className="text-[var(--mu2)] text-sm text-center">{t.uploadDesc}</p>
                  </div>

                  {formData.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-4">
                      {formData.photos.map((photo, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--b2)]">
                          <img src={photo} alt={`Upload ${i+1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6">
                    <h3 className="font-display text-xl uppercase mb-4">{t.reviewTitle}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--mu)]">Vehicle</span>
                        <span className="font-bold">{formData.year} {formData.make} {formData.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--mu)]">Monthly Payment</span>
                        <span className="font-bold">${formData.payment}/mo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--mu)]">Months Left</span>
                        <span className="font-bold">{formData.monthsLeft}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--mu)]">Miles Remaining</span>
                        <span className="font-bold">{Number(formData.allowedMileage) - Number(formData.currentMileage)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-2xl p-6">
                    <div className="space-y-3 text-sm mb-4 pb-4 border-b border-[var(--lime)]/20">
                      <div className="flex justify-between">
                        <span className="text-[var(--mu)] flex items-center gap-2">
                          {t.bankFee}
                          <div className="group relative">
                            <Info size={14} className="text-[var(--mu2)] cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[var(--s2)] border border-[var(--b2)] rounded-lg text-[10px] text-[var(--w)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              {t.feeNote}
                            </div>
                          </div>
                        </span>
                        <span className="font-bold">${bankFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--mu)]">{t.platformFee}</span>
                        <span className="font-bold">${platformFee}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase tracking-widest text-xs">{t.totalDue}</span>
                      <span className="font-display text-3xl text-[var(--lime)]">${platformFee}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                  <div className="w-24 h-24 bg-[var(--lime)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={48} className="text-[var(--lime)]" />
                  </div>
                  <h3 className="font-display text-3xl uppercase mb-4">{t.successTitle}</h3>
                  <p className="text-[var(--mu)] mb-8">{t.successDesc}</p>
                  <button onClick={onClose} className="px-8 py-4 bg-[var(--w)] text-black rounded-xl font-bold uppercase tracking-widest hover:bg-[var(--lime)] transition-colors">
                    {t.close}
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          {step < 5 && (
            <div className="p-6 border-t border-[var(--b2)] bg-[var(--s2)] flex items-center justify-between shrink-0">
              <button 
                onClick={() => setStep(s => Math.max(1, s - 1))}
                className={cn(
                  "px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-colors",
                  step === 1 ? "opacity-0 pointer-events-none" : "text-[var(--w)] hover:bg-[var(--b1)]"
                )}
              >
                <ChevronLeft size={16} />
                {t.back}
              </button>
              
              <button 
                onClick={() => setStep(s => Math.min(5, s + 1))}
                className="px-8 py-3 bg-[var(--w)] text-black rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[var(--lime)] transition-colors"
              >
                {step === 4 ? t.submit : t.next}
                {step < 4 && <ChevronRight size={16} />}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
