import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, FileText, Search, AlertTriangle, CheckCircle, Loader2, UploadCloud } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { useLanguageStore } from '../store/languageStore';
import { translations } from '../translations';

export const DealAuditor: React.FC = () => {
  const { language } = useLanguageStore();
  const t = (translations[language] as any).auditor;
  
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await analyzeFile(e.target.files[0]);
    }
  };

  const fileToPart = async (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const analyzeFile = async (file: File) => {
    setIsUploading(true);
    setResult(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const imagePart = await fileToPart(file);
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              imagePart as any,
              { text: `Analyze this car dealer offer/contract. 
              1. Identify the MSRP, Selling Price, and all fees (Doc fee, Acquisition fee, Registration, etc.).
              2. Look for hidden markups or unnecessary add-ons (Paint protection, VIN etching, nitrogen tires, etc.).
              3. Compare the Money Factor/APR if visible to market averages.
              4. Provide a clear summary: Is this a good deal or are there hidden markups?
              5. Give a recommendation on what the user should negotiate.
              6. Generate a 0-100 "Deal Score" where 100 is a perfect wholesale deal and 0 is a total rip-off.
              7. Provide a word-for-word "Negotiation Script" the user can copy-paste to email the dealer.
              
              Respond in ${language === 'ru' ? 'Russian' : 'English'}. 
              Use Markdown for the main analysis. 
              Crucially, include the Deal Score at the very beginning of your response in the format: [SCORE: XX].` }
            ]
          }
        ]
      });

      setResult(response.text || 'Could not analyze the document.');
    } catch (err) {
      console.error('Audit error:', err);
      setError('Failed to analyze the document. Please make sure it is a clear image or PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const extractScore = (text: string | null) => {
    if (!text) return null;
    const match = text.match(/\[SCORE:\s*(\d+)\]/);
    return match ? parseInt(match[1]) : null;
  };

  const cleanResult = (text: string | null) => {
    if (!text) return '';
    return text.replace(/\[SCORE:\s*\d+\]/, '').trim();
  };

  const score = extractScore(result);
  const displayResult = cleanResult(result);

  return (
    <section id="auditor" className="py-24 border-t border-[var(--b2)]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/20 text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest mb-4">
            <ShieldAlert className="w-3 h-3" /> {t.aiAudit}
          </div>
          <h2 className="font-display text-4xl md:text-5xl mb-4">{t.title}</h2>
          <p className="text-[var(--mu2)] text-lg">{t.subtitle}</p>
        </div>

        <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-xl p-8 md:p-12 relative overflow-hidden">
          <div className="relative z-10">
            {!result && !isUploading && (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--b2)] rounded-2xl p-12 text-center hover:border-[var(--lime)] hover:bg-[var(--lime)]/5 transition-all cursor-pointer group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf"
                />
                <div className="w-16 h-16 bg-[var(--s2)] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-[var(--mu2)]" />
                </div>
                <h3 className="text-xl font-bold mb-2">{t.uploadBtn}</h3>
                <p className="text-sm text-[var(--mu2)]">{t.uploadDesc}</p>
              </div>
            )}

            {isUploading && (
              <div className="py-20 text-center space-y-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="inline-block"
                >
                  <Loader2 className="w-12 h-12 text-[var(--lime)]" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold animate-pulse">{t.analyzing}</h3>
                  <p className="text-sm text-[var(--mu2)]">{t.scanning}</p>
                </div>
              </div>
            )}

            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between border-b border-[var(--b2)] pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)]">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{t.resultTitle}</h3>
                      {score !== null && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1.5 w-24 bg-[var(--b2)] rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              className={`h-full ${score > 80 ? 'bg-[var(--lime)]' : score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            />
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${score > 80 ? 'text-[var(--lime)]' : score > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {t.dealScore}: {score}/100
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setResult(null)}
                    className="text-xs font-bold text-[var(--mu2)] hover:text-[var(--w)] uppercase tracking-widest"
                  >
                    {t.auditAnother}
                  </button>
                </div>

                <div className="prose prose-invert max-w-none prose-sm prose-headings:text-[var(--lime)] prose-strong:text-[var(--w)] prose-p:text-[var(--mu2)]">
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {displayResult}
                  </div>
                </div>

                <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)] shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{t.recommendation}</h4>
                    <p className="text-xs text-[var(--mu2)] leading-relaxed">
                      {t.recText}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
                {error}
                <button onClick={() => setError(null)} className="ml-4 underline">{t.tryAgain}</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
