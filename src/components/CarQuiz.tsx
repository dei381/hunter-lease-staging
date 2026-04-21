import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Users, Zap, Shield, DollarSign, CheckCircle2, RefreshCw, ChevronRight } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useSettingsStore } from '../store/settingsStore';
import { translations } from '../translations';
import { fetchWithCache } from '../utils/fetchWithCache';
import { getDefaultLeaseMileage } from '../utils/defaultLeaseMileage';

interface CarQuizProps {
  onSelect: (deal: any) => void;
}

export const CarQuiz: React.FC<CarQuizProps> = ({ onSelect }) => {
  const { language } = useLanguageStore();
  const { settings, fetchSettings } = useSettingsStore();
  const t = translations[language].quiz;
  
  const [step, setStep] = useState(0); // 0 = intro, 1-3 = questions, 4 = analyzing, 5 = results
  const [answers, setAnswers] = useState({ purpose: '', budget: '', feature: '' });
  const [deals, setDeals] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchWithCache('/api/deals?limit=100')
      .then((data: any) => {
        // Deduplicate deals by make + model + trim
        const uniqueDealsMap = new Map();
        data.forEach((deal: any) => {
          const key = `${deal.make}-${deal.model}-${deal.trim}`;
          if (!uniqueDealsMap.has(key) || deal.type === 'lease') {
            uniqueDealsMap.set(key, deal);
          }
        });
        const uniqueDeals = Array.from(uniqueDealsMap.values());

        const recalculated = uniqueDeals.map((deal: any) => {
          const targetDown = 3000;
          const currentDown = deal.down || 0;
          const term = parseInt(deal.term || '36');
          
          const downDiff = currentDown - targetDown;
          const paymentAdjustment = downDiff / term;
          
          let payment = Math.round(deal.payment + paymentAdjustment);

          if (deal.type === 'lease') {
            const usesTenKDefault = getDefaultLeaseMileage(deal.make) === '10k';
            if (!usesTenKDefault) {
              const rvIncrease = deal.msrp * 0.01;
              const monthlySaving = rvIncrease / term;
              payment = Math.round(payment - monthlySaving);
            }
          }
          
          return {
            ...deal,
            payment,
            down: targetDown,
            mileage: getDefaultLeaseMileage(deal.make)
          };
        });
        setDeals(recalculated);
      })
      .catch(err => console.error('Failed to fetch deals for quiz:', err));
  }, []);

  const questions = [
    {
      id: 'purpose',
      question: t.q1,
      options: [
        { id: 'commute', label: t.q1a1, icon: <Car className="w-6 h-6" /> },
        { id: 'family', label: t.q1a2, icon: <Users className="w-6 h-6" /> },
        { id: 'luxury', label: t.q1a3, icon: <Shield className="w-6 h-6" /> },
        { id: 'eco', label: t.q1a4, icon: <Zap className="w-6 h-6" /> },
      ]
    },
    {
      id: 'budget',
      question: t.q2,
      options: [
        { id: 'under400', label: t.q2a1, icon: <DollarSign className="w-6 h-6" /> },
        { id: '400to600', label: t.q2a2, icon: <DollarSign className="w-6 h-6" /> },
        { id: '600to800', label: t.q2a3, icon: <DollarSign className="w-6 h-6" /> },
        { id: 'over800', label: t.q2a4, icon: <DollarSign className="w-6 h-6" /> },
      ]
    },
    {
      id: 'feature',
      question: t.q3,
      options: [
        { id: 'awd', label: t.q3a1, icon: <Shield className="w-6 h-6" /> },
        { id: '3rdrow', label: t.q3a2, icon: <Users className="w-6 h-6" /> },
        { id: 'audio', label: t.q3a3, icon: <Zap className="w-6 h-6" /> },
        { id: 'mpg', label: t.q3a4, icon: <Car className="w-6 h-6" /> },
      ]
    }
  ];

  const handleAnswer = (questionId: string, answerId: string) => {
    const newAnswers = { ...answers, [questionId]: answerId };
    setAnswers(newAnswers);
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      setStep(4); // Analyzing
      analyzeResults(newAnswers);
    }
  };

  const analyzeResults = (finalAnswers: typeof answers) => {
    setTimeout(() => {
      // Simple recommendation engine logic based on available deals
      let filtered = [...deals];
      
      // Filter by Budget
      if (finalAnswers.budget === 'under400') {
        filtered = filtered.filter(d => d.payment <= 400);
      } else if (finalAnswers.budget === '400to600') {
        filtered = filtered.filter(d => d.payment > 400 && d.payment <= 600);
      } else if (finalAnswers.budget === '600to800') {
        filtered = filtered.filter(d => d.payment > 600 && d.payment <= 800);
      } else if (finalAnswers.budget === 'over800') {
        filtered = filtered.filter(d => d.payment > 800);
      }

      // Filter by Purpose (rough matching by class)
      if (finalAnswers.purpose === 'commute') {
        filtered = filtered.filter(d => d.class?.includes('Sedan') || d.class?.includes('Compact') || d.class?.includes('Hatchback'));
      } else if (finalAnswers.purpose === 'family') {
        filtered = filtered.filter(d => d.class?.includes('SUV') || d.class?.includes('Minivan') || d.class?.includes('Truck'));
      } else if (finalAnswers.purpose === 'luxury') {
        filtered = filtered.filter(d => d.class?.includes('Luxury') || d.class?.includes('Premium') || d.payment > 600);
      } else if (finalAnswers.purpose === 'eco') {
        filtered = filtered.filter(d => d.class?.includes('EV') || d.class?.includes('Hybrid') || d.class?.includes('PHEV') || d.model?.toLowerCase().includes('hybrid') || d.model?.toLowerCase().includes('ev'));
      }

      // Filter by Features (rough matching)
      if (finalAnswers.feature === 'awd') {
        filtered = filtered.filter(d => d.trim?.includes('AWD') || d.trim?.includes('4WD') || d.trim?.includes('xDrive') || d.trim?.includes('4MATIC') || d.trim?.includes('quattro'));
      } else if (finalAnswers.feature === '3rdrow') {
        filtered = filtered.filter(d => d.class?.includes('SUV') || d.class?.includes('Minivan'));
      } else if (finalAnswers.feature === 'mpg') {
        filtered = filtered.filter(d => d.class?.includes('Hybrid') || d.class?.includes('EV') || d.class?.includes('PHEV') || d.class?.includes('Compact'));
      }

      // If we filtered too much, fallback to some deals to ensure we show something
      if (filtered.length < 3) {
        // Relax criteria: just use budget and purpose
        filtered = [...deals];
        if (finalAnswers.budget === 'under400') filtered = filtered.filter(d => d.payment <= 400);
        else if (finalAnswers.budget === '400to600') filtered = filtered.filter(d => d.payment > 400 && d.payment <= 600);
        else if (finalAnswers.budget === '600to800') filtered = filtered.filter(d => d.payment > 600 && d.payment <= 800);
        else if (finalAnswers.budget === 'over800') filtered = filtered.filter(d => d.payment > 800);
        
        if (filtered.length < 3) {
          filtered = [...deals]; // Ultimate fallback
        }
      }

      // Sort by savings or hot deals
      filtered.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || b.savings - a.savings);
      
      setRecommendations(filtered.slice(0, 3));
      setStep(5); // Show results
    }, 1500);
  };

  const resetQuiz = () => {
    setAnswers({ purpose: '', budget: '', feature: '' });
    setStep(0);
  };

  return (
    <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <div className="w-64 h-64 border-4 border-[var(--lime)] rounded-full" />
      </div>

      <div className="p-6 md:p-12 relative z-10 min-h-[400px] flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {/* Intro Step */}
          {step === 0 && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-2xl mx-auto space-y-6"
            >
              <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Car className="w-8 h-8 text-[var(--lime)]" />
              </div>
              <h2 className="font-display text-4xl md:text-5xl">{t.title}</h2>
              <p className="text-[var(--mu2)] text-lg leading-relaxed">{t.subtitle}</p>
              <button 
                onClick={() => setStep(1)}
                className="bg-[var(--lime)] text-white font-bold uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[var(--lime2)] transition-all shadow-lg shadow-[var(--lime)]/20 flex items-center gap-2 mx-auto mt-8"
              >
                {t.startBtn} <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* Question Steps */}
          {step > 0 && step < 4 && (
            <motion.div
              key={`q${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-3xl mx-auto"
            >
              <div className="mb-8">
                <div className="flex justify-between text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-4">
                  <span>Question {step} of 3</span>
                </div>
                <div className="flex gap-2 mb-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${step >= i ? 'bg-[var(--lime)]' : 'bg-[var(--s2)]'}`} />
                  ))}
                </div>
                <h3 className="font-display text-3xl md:text-4xl text-center mb-10">{questions[step - 1].question}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {questions[step - 1].options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(questions[step - 1].id, opt.id)}
                    className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-[var(--lime)] hover:bg-[var(--lime)]/5 transition-all group"
                  >
                    <div className="text-[var(--mu2)] group-hover:text-[var(--lime)] transition-colors">
                      {opt.icon}
                    </div>
                    <span className="font-bold text-sm tracking-wide text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Analyzing Step */}
          {step === 4 && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center flex flex-col items-center justify-center space-y-6"
            >
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-[var(--s2)] rounded-full" />
                <div className="absolute inset-0 border-4 border-[var(--lime)] rounded-full border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Car className="w-8 h-8 text-[var(--lime)] animate-pulse" />
                </div>
              </div>
              <h3 className="font-display text-2xl animate-pulse">{t.analyzing}</h3>
            </motion.div>
          )}

          {/* Results Step */}
          {step === 5 && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-[var(--lime)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[var(--lime)]" />
                </div>
                <h2 className="font-display text-4xl mb-2">{t.resultsTitle}</h2>
                <p className="text-[var(--mu2)]">{t.resultsSubtitle}</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-10">
                {recommendations.map((deal, i) => (
                  <div key={i} className="bg-[var(--s2)] border border-[var(--b2)] rounded-2xl overflow-hidden flex flex-col">
                    <div className="h-40 relative bg-[var(--s1)]">
                      {deal.image ? (
                        <img src={deal.image} alt={deal.model} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--mu2)] text-xs uppercase tracking-widest font-bold">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--s2)] to-transparent" />
                      {deal.hot && <span className="absolute top-3 left-3 text-[8px] font-bold px-2 py-0.5 rounded-md uppercase bg-[var(--lime)] text-black">🔥 HOT</span>}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="font-display text-xl mb-1">{deal.make} {deal.model}</h4>
                      <p className="text-[10px] text-[var(--mu)] uppercase tracking-widest font-bold mb-4">{deal.trim}</p>
                      
                      <div className="mt-auto pt-4 border-t border-[var(--b2)] flex items-end justify-between">
                        <div>
                          <div className="text-[8px] text-[var(--mu2)] uppercase tracking-widest mb-1">Est. Payment</div>
                          <div className="font-display text-2xl text-[var(--lime)]">${Math.round(deal.payment)}<span className="text-sm text-[var(--mu2)]">/mo</span></div>
                        </div>
                        <button 
                          onClick={() => onSelect(deal)}
                          className="bg-[var(--w)] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-[var(--lime)] hover:text-black transition-colors"
                        >
                          {t.getDealBtn}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <button 
                  onClick={resetQuiz}
                  className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest hover:text-[var(--w)] transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> {t.retakeBtn}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};
