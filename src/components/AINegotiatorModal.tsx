import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bot, Link as LinkIcon, Copy, Check, Sparkles, ChevronRight, MessageSquare, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'react-hot-toast';

interface AINegotiatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AINegotiatorModal = ({ isOpen, onClose }: AINegotiatorModalProps) => {
  const { language } = useLanguageStore();
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success'>('idle');
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [script, setScript] = useState('');

  const t = {
    en: {
      title: 'AI Negotiation Proxy',
      subtitle: 'Paste a link from any dealer. We will write the perfect counter-offer.',
      placeholder: 'https://www.cars.com/vehicledetail/...',
      btnAnalyze: 'Analyze Deal',
      steps: [
        'Extracting VIN & Dealer Info...',
        'Checking Edmunds for base Money Factor...',
        'Calculating true invoice price...',
        'Drafting aggressive counter-offer...'
      ],
      resultTitle: 'Your Negotiation Script',
      copyBtn: 'Copy Script',
      copiedBtn: 'Copied!',
      error: 'Failed to generate script. Please try again.'
    },
    ru: {
      title: 'AI-Переговорщик',
      subtitle: 'Вставьте ссылку от любого дилера. Мы напишем идеальный скрипт для торга.',
      placeholder: 'https://www.cars.com/vehicledetail/...',
      btnAnalyze: 'Анализировать сделку',
      steps: [
        'Извлекаем VIN и данные дилера...',
        'Проверяем базовый Money Factor...',
        'Считаем реальную закупочную цену...',
        'Пишем агрессивный контр-оффер...'
      ],
      resultTitle: 'Ваш скрипт для переговоров',
      copyBtn: 'Скопировать текст',
      copiedBtn: 'Скопировано!',
      error: 'Не удалось сгенерировать скрипт. Пожалуйста, попробуйте еще раз.'
    }
  }[language] || {
    title: 'AI Negotiation Proxy',
    subtitle: 'Paste a link from any dealer. We will write the perfect counter-offer.',
    placeholder: 'https://www.cars.com/vehicledetail/...',
    btnAnalyze: 'Analyze Deal',
    steps: [
      'Extracting VIN & Dealer Info...',
      'Checking Edmunds for base Money Factor...',
      'Calculating true invoice price...',
      'Drafting aggressive counter-offer...'
    ],
    resultTitle: 'Your Negotiation Script',
    copyBtn: 'Copy Script',
    copiedBtn: 'Copied!',
    error: 'Failed to generate script. Please try again.'
  };

  const handleAnalyze = async () => {
    if (!url) return;
    setStatus('analyzing');
    setStep(0);
    setScript('');

    try {
      // Simulate steps progressing while API call is happening
      const stepInterval = setInterval(() => {
        setStep(s => Math.min(s + 1, t.steps.length - 1));
      }, 1500);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `You are an expert car negotiator. The user is looking at a car listing at this URL: ${url}
        
Please write a highly aggressive, professional, and effective email script to send to the dealer's internet sales manager.
The goal is to get 10% off MSRP before incentives, buy rate money factor, and 0 markups.
If you can deduce the make/model from the URL, use it. Otherwise, use placeholders like [Make] [Model].
Keep it concise and punchy. Do not include any pleasantries beyond a simple "Hi".
The language of the script should be English.`,
        config: {
          systemInstruction: "You are a master car negotiator who knows all the dealer tricks."
        }
      });

      clearInterval(stepInterval);
      setStep(t.steps.length);
      
      const text = response.text;
      if (text) {
        setScript(text.trim());
        setStatus('success');
      } else {
        throw new Error("No text returned");
      }
    } catch (error) {
      console.error("AI Negotiation error:", error);
      toast.error(t.error);
      setStatus('idle');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
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
        className="relative w-full max-w-lg bg-[var(--bg)] border border-[var(--b2)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--b2)] bg-[var(--s2)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center border border-[var(--lime)]/20">
              <Bot size={20} className="text-[var(--lime)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest">{t.title}</h2>
              <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--mu2)] hover:text-[var(--w)] hover:bg-[var(--b1)] rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest block">
                    Dealer Listing URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--mu2)]" />
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder={t.placeholder}
                      className="w-full bg-[var(--b1)] border border-[var(--b2)] rounded-xl py-4 pl-12 pr-4 text-sm font-mono focus:outline-none focus:border-[var(--lime)] transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!url}
                  className="w-full py-4 bg-[var(--lime)] text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  {t.btnAnalyze}
                </button>
              </motion.div>
            )}

            {status === 'analyzing' && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="py-12 flex flex-col items-center justify-center space-y-8"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--b2)] border-t-[var(--lime)] animate-spin" />
                  <Bot className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-[var(--lime)]" />
                </div>
                
                <div className="space-y-3 w-full max-w-xs">
                  {t.steps.map((stepText, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex items-center gap-3 text-xs font-mono transition-all duration-500",
                        idx < step ? "text-[var(--lime)]" : idx === step ? "text-[var(--w)]" : "text-[var(--mu2)] opacity-50"
                      )}
                    >
                      {idx < step ? <Check size={14} /> : <ChevronRight size={14} className={idx === step ? "animate-pulse" : ""} />}
                      {stepText}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 text-[var(--lime)]">
                  <CheckCircle2 size={20} />
                  <span className="text-sm font-bold uppercase tracking-widest">{t.resultTitle}</span>
                </div>

                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--lime)]/10 to-transparent rounded-xl pointer-events-none" />
                  <textarea
                    readOnly
                    value={script}
                    className="w-full h-48 bg-[var(--b1)] border border-[var(--b2)] rounded-xl p-4 text-sm font-mono text-[var(--mu)] resize-none focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute top-4 right-4 p-2 bg-[var(--s2)] border border-[var(--b2)] rounded-lg text-[var(--w)] hover:text-[var(--lime)] hover:border-[var(--lime)] transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {copied ? t.copiedBtn : t.copyBtn}
                    </span>
                  </button>
                </div>

                <div className="bg-[var(--s2)] p-4 rounded-xl border border-[var(--b2)] flex gap-3">
                  <MessageSquare size={16} className="text-[var(--mu2)] shrink-0" />
                  <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest leading-relaxed">
                    Send this exact message to the dealer's internet sales manager. Do not negotiate over the phone. If they agree, ask for a signed buyer's order.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
