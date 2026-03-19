import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Send, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';
import { useFeedbackStore } from '../store/feedbackStore';
import { cn } from '../utils/cn';

export const FeedbackWidget = () => {
  const { language } = useLanguageStore();
  const { isOpen, close } = useFeedbackStore();
  const t = translations[language].feedback || {
    title: language === 'ru' ? 'Обратная связь' : 'Feedback',
    subtitle: language === 'ru' ? 'Помогите нам стать лучше' : 'Help us improve',
    successTitle: language === 'ru' ? 'Отправлено' : 'Sent',
    successMsg: language === 'ru' ? 'Спасибо за ваш отзыв!' : 'Thank you for your feedback!',
    nameLabel: language === 'ru' ? 'Имя' : 'Name',
    emailLabel: language === 'ru' ? 'Email' : 'Email',
    typeLabel: language === 'ru' ? 'Тип сообщения' : 'Message Type',
    messageLabel: language === 'ru' ? 'Сообщение' : 'Message',
    messagePlaceholder: language === 'ru' ? 'Опишите проблему или предложение...' : 'Describe the issue or suggestion...',
    submitBtn: language === 'ru' ? 'Отправить' : 'Send',
    errorMsg: language === 'ru' ? 'Ошибка при отправке' : 'Error sending',
    types: {
      general: language === 'ru' ? 'Общее' : 'General',
      bug: language === 'ru' ? 'Ошибка' : 'Bug',
      feature: language === 'ru' ? 'Предложение' : 'Feature',
      pricing: language === 'ru' ? 'Цены' : 'Pricing'
    }
  };
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    type: 'general' as 'general' | 'bug' | 'feature' | 'pricing'
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const prompts = language === 'ru' ? [
    "Опишите, что именно пошло не так",
    "На каком этапе возникла проблема?",
    "Какой результат вы ожидали получить?",
    "Ваши предложения по улучшению"
  ] : [
    "Describe exactly what went wrong",
    "At what stage did the problem occur?",
    "What result did you expect to get?",
    "Your suggestions for improvement"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          url: window.location.href
        })
      });

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', message: '', type: 'general' });
        setTimeout(() => {
          setStatus('idle');
          close();
        }, 3000);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  const insertPrompt = (prompt: string) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message ? `${prev.message}\n\n${prompt}: ` : `${prompt}: `
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-[var(--b2)] flex items-center justify-between bg-[var(--w)]/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center">
                  <MessageSquare className="text-[var(--lime)]" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-display uppercase tracking-tight">{t.title}</h2>
                  <p className="text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest">{t.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={close}
                className="p-2 hover:bg-[var(--s2)] rounded-full transition-colors"
              >
                <X size={20} className="text-[var(--mu2)]" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="text-[var(--lime)]" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display uppercase">{t.successTitle}</h3>
                  <p className="text-sm text-[var(--mu2)]">{t.successMsg}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.nameLabel}</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-sm focus:border-[var(--lime)] outline-none transition-colors"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.emailLabel}</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-sm focus:border-[var(--lime)] outline-none transition-colors"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.typeLabel}</label>
                  <div className="flex flex-wrap gap-2">
                    {(['general', 'bug', 'feature', 'pricing'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type })}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all",
                          formData.type === type
                            ? "bg-[var(--lime)] border-[var(--lime)] text-black"
                            : "bg-[var(--s2)] border-[var(--b2)] text-[var(--mu2)] hover:border-[var(--mu)]"
                        )}
                      >
                        {t.types[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.messageLabel}</label>
                    <div className="flex items-center gap-1 text-[9px] text-[var(--mu2)] uppercase tracking-widest">
                      <HelpCircle size={10} />
                      {language === 'ru' ? 'Подсказки ниже' : 'Prompts below'}
                    </div>
                  </div>
                  
                  {/* Prompts/Suggestions */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {prompts.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => insertPrompt(p)}
                        className="px-2 py-1 bg-[var(--w)]/5 hover:bg-[var(--w)]/10 border border-[var(--b2)] rounded text-[9px] text-[var(--mu2)] transition-colors"
                      >
                        + {p}
                      </button>
                    ))}
                  </div>

                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[var(--s2)] border border-[var(--b2)] rounded-xl px-4 py-3 text-sm focus:border-[var(--lime)] outline-none transition-colors resize-none"
                    placeholder={t.messagePlaceholder}
                  />
                </div>

                {status === 'error' && (
                  <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    <AlertCircle size={14} />
                    {t.errorMsg}
                  </div>
                )}

                <button
                  disabled={status === 'loading'}
                  type="submit"
                  className="w-full bg-[var(--lime)] hover:bg-[var(--lime2)] disabled:opacity-50 text-black py-4 rounded-xl font-display text-lg tracking-widest uppercase transition-all flex items-center justify-center gap-3"
                >
                  {status === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t.submitBtn}</span>
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
};
