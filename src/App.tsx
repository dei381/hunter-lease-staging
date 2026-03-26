import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO } from './components/SEO';
import { Calculator } from './components/Calculator';
import { DealsGrid } from './components/DealsGrid';
import { LeadStatus } from './components/LeadStatus';
import { DepositModal } from './components/DepositModal';
import { DealCalculatorModal } from './components/DealCalculatorModal';
import { TrustSection } from './components/TrustSection';
import { LiveFeed } from './components/LiveFeed';
import { LiveNotification } from './components/LiveNotification';
import { RecentActivity } from './components/RecentActivity';
import { ProcessTimeline } from './components/ProcessTimeline';
import { DealerNetwork } from './components/DealerNetwork';
import { HappyClients } from './components/HappyClients';
import { SpecialBenefits } from './components/SpecialBenefits';
import { BlogSection } from './components/BlogSection';
import { CaseStudies } from './components/CaseStudies';
import { FAQ } from './components/FAQ';
import { CarQuiz } from './components/CarQuiz';
import { PricingSection } from './components/PricingSection';
import { LeaseEndAdvisor } from './components/LeaseEndAdvisor';
import { DealAuditor } from './components/DealAuditor';
import { ExtensionPromo } from './components/ExtensionPromo';
import { Footer } from './components/Footer';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AdminDashboard } from './components/AdminDashboard';
import { DealsPage } from './pages/DealsPage';
import { ComparePage } from './pages/ComparePage';
import { DealPage } from './pages/DealPage';
import { BlogPage } from './pages/BlogPage';
import { BlogPost } from './pages/BlogPost';
import { GlossaryPage } from './pages/GlossaryPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsConditions } from './pages/TermsConditions';
import { LegalDisclosure } from './pages/LegalDisclosure';
import { AccessibilityStatement } from './pages/AccessibilityStatement';
import { FinishSignUp } from './pages/FinishSignUp';
import { Dashboard } from './pages/Dashboard';
import { DealerPortal } from './pages/DealerPortal';
import { LeaseTransfersPage } from './pages/LeaseTransfersPage';
import { SavedDealsPage } from './pages/SavedDealsPage';
import { AuthModal } from './components/AuthModal';
import { ExpertChat } from './components/ExpertChat';
import { TrackingModal } from './components/TrackingModal';
import { LockModal } from './components/LockModal';
import { VisitTracker } from './components/VisitTracker';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageWelcomeModal } from './components/LanguageWelcomeModal';
import { Lead } from './types';
import { X, ShieldCheck, LogIn, LogOut, Menu, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguageStore } from './store/languageStore';
import { useAuthStore } from './store/authStore';
import { useFeedbackStore } from './store/feedbackStore';
import { auth, db } from './firebase';
import { translations } from './translations';
import { doc, getDocFromCache, getDocFromServer, addDoc, setDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { cn } from './utils/cn';

function MainApp() {
  const { language } = useLanguageStore();
  const t = translations[language];
  const [leadId, setLeadId] = useState<string | null>(localStorage.getItem('leadId'));
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedDealForCalc, setSelectedDealForCalc] = useState<any>(null);
  const [activeSelection, setActiveSelection] = useState<any>(() => {
    const saved = localStorage.getItem('activeSelection');
    return saved ? JSON.parse(saved) : null;
  });
  const [payMethod, setPayMethod] = useState<'z' | 'v' | 'c'>('z');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '', tcpaConsent: false, termsConsent: false });
  const [tradeIn, setTradeIn] = useState({ hasTradeIn: false, make: '', model: '', year: '', mileage: '', vin: '', hasLoan: false, payoff: '' });
  const [paymentName, setPaymentName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'connection-test'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
        // Other errors are expected if the document doesn't exist, which is fine for a connection test
      }
    };
    testConnection();
  }, []);

  const handleSelect = (data: any) => {
    if (data.id) {
      setSelectedDealForCalc(data);
      setIsCalcModalOpen(true);
    } else {
      setActiveSelection(data);
      setIsModalOpen(true);
    }
  };

  const handleProceedFromCalc = (updatedDeal: any) => {
    setIsCalcModalOpen(false);
    setActiveSelection(updatedDeal);
    setIsModalOpen(true);
  };

  const submitLead = async () => {
    setIsSubmitting(true);

    const payload = {
      userId: auth.currentUser?.uid || null,
      name: clientInfo.name,
      email: clientInfo.email,
      phone: clientInfo.phone,
      payMethod: payMethod,
      paymentName: paymentName,
      status: 'new',
      legalConsent: {
        tcpa: clientInfo.tcpaConsent,
        terms: clientInfo.termsConsent
      },
      tradeIn: tradeIn.hasTradeIn ? tradeIn : null,
      vehicle: {
        make: activeSelection.make?.name || activeSelection.make,
        model: activeSelection.model?.name || activeSelection.model,
        year: activeSelection.year,
        trim: activeSelection.trim?.name || activeSelection.trim,
        msrp: activeSelection.trim?.msrp || activeSelection.msrp,
      },
      calc: {
        type: activeSelection.type || 'lease',
        payment: activeSelection.result ? (activeSelection.type === 'lease' ? activeSelection.result.leasePay : activeSelection.result.finPay) : activeSelection.payment || 0,
        down: activeSelection.down || 0,
        tier: activeSelection.tier || 'Tier 1',
        mileage: activeSelection.mileage || '10k',
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      // First, send to backend for email notification and persistence
      // The backend returns the Prisma UUID which we should use as our source of truth
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...payload, 
          client: { ...clientInfo, payMethod, paymentName }, 
          car: payload.vehicle,
          userId: auth.currentUser?.uid || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit lead to backend');
      }

      const { leadId: prismaLeadId } = await response.json();
      
      // Also add to Firestore for real-time tracking
      try {
        await setDoc(doc(db, 'leads', prismaLeadId.toString()), {
          ...payload,
          prismaId: prismaLeadId,
          status: 'pending',
          updatedAt: serverTimestamp()
        });
      } catch (fsError) {
        console.warn("Firestore backup failed, but backend succeeded:", fsError);
      }

      setLeadId(prismaLeadId.toString());
      localStorage.setItem('leadId', prismaLeadId.toString());
      localStorage.setItem('activeSelection', JSON.stringify(activeSelection));
      
      return true; // Indicate success
    } catch (e) {
      console.error('Error submitting lead:', e);
      alert(e instanceof Error ? e.message : "Failed to submit application. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (location.hash === '#calc') {
      setTimeout(() => {
        const el = document.getElementById('calc');
        if (el) {
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 80,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [location]);

  // Real-time lead tracking via Firestore
  useEffect(() => {
    if (!leadId) return;

    const leadRef = doc(db, 'leads', leadId);
    const unsubscribe = onSnapshot(leadRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Lead;
        setLeadData(data);
        
        // If credit app is not submitted, open DepositModal
        if (!data.creditApp) {
          setIsModalOpen(true);
        } else if (data.status === 'active' || data.status === 'closed') {
          setIsTrackingModalOpen(true);
        }
      } else {
        // Fallback to API if doc doesn't exist yet or was deleted
        fetch(`/api/lead/${leadId}`)
          .then(res => res.json())
          .then(data => {
            if (data && !data.error) {
              setLeadData(data);
            }
          })
          .catch(err => console.error("API fallback failed:", err));
      }
    }, (error) => {
      console.error("Error tracking lead:", error);
    });

    return () => unsubscribe();
  }, [leadId]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 80; // nav height
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] selection:bg-[var(--lime)] selection:text-black">
      <SEO 
        title="Hunter Lease | The Marketplace for Pre-Negotiated Car Leases"
        description="Skip the dealership. Browse pre-negotiated new car lease deals, customize your payment online, and secure your vehicle with zero hidden markups."
        ogImage="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&q=80&w=1200&h=630"
        schema={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Hunter Lease",
          "url": "https://hunterlease.com",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://hunterlease.com/deals?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <main className="max-w-7xl mx-auto px-6 py-12 pb-32">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-16 mb-32 items-center pt-12">
          <div className="space-y-10">
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/20 text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] animate-pulse" />
                {t.hero.badge}
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight"
              >
                {t.hero.title1} <br />
                <span className="text-[var(--lime)]">{t.hero.title2}</span>
              </motion.h1>
              <p className="text-[var(--mu2)] max-w-xl text-lg md:text-xl leading-relaxed">
                {t.hero.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/deals')} className="group bg-[var(--lime)] text-white font-display text-xl tracking-widest px-6 py-4 md:px-10 md:py-5 rounded-xl hover:bg-[var(--lime2)] transition-all hover:scale-105 shadow-xl shadow-[var(--lime)]/20 flex flex-col items-center justify-center w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span>{t.hero.btnCalc}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-[10px] font-sans font-bold uppercase opacity-70 mt-1">{t.hero.btnCalcSub}</span>
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] font-bold text-xs uppercase tracking-widest px-6 py-4 md:px-10 md:py-5 rounded-xl hover:border-[var(--b3)] transition-all flex flex-col items-center justify-center w-full sm:w-auto">
                <span>{t.hero.btnDeals}</span>
                <span className="text-[10px] font-sans font-normal text-[var(--mu2)] mt-1">{t.hero.btnDealsSub}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-[var(--b2)]">
              {[
                { step: '01', title: t.hero.step1, desc: t.hero.step1Desc },
                { step: '02', title: t.hero.step2, desc: t.hero.step2Desc },
                { step: '03', title: t.hero.step3, desc: t.hero.step3Desc }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <div className="text-xl font-display text-[var(--lime)]/20 group-hover:text-[var(--lime)]/40 transition-colors">{item.step}</div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--w)]">{item.title}</div>
                    <div className="text-[9px] text-[var(--mu2)] uppercase tracking-widest font-medium">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[var(--bg)] bg-[var(--s2)] overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1 mb-0.5">
                  <button 
                    onClick={() => setIsLockModalOpen(true)}
                    className="text-[var(--lime)] font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" /> {t.hero.lockLink}
                  </button>
                </div>
                <div className="text-[var(--mu2)] font-medium">4.9/5 based on 1,200+ LA deals</div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <div className="w-64 h-64 border-4 border-[var(--lime)] rounded-full" />
              </div>
              <div className="space-y-2 relative z-10">
                <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{t.stats.companyName}</div>
                <div className="text-4xl font-display">200+</div>
                <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{t.stats.dealers}</div>
              </div>
              <div className="h-px bg-[var(--b2)]" />
              <div className="space-y-2 relative z-10">
                <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{t.stats.license}</div>
                <div className="text-xl font-mono">#21318</div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-32 border-y border-[var(--b2)] py-8">
          {[
            { title: t.trust.licensed, desc: t.trust.licensedDesc },
            { title: t.trust.softCredit, desc: t.trust.softCreditDesc },
            { title: t.trust.contract, desc: t.trust.contractDesc },
            { title: t.trust.transparent, desc: t.trust.transparentDesc }
          ].map((item, i) => (
            <div key={i} className="text-center md:text-left px-4 border-r border-[var(--b2)] last:border-0">
              <div className="font-bold text-sm text-[var(--w)] mb-1">{item.title}</div>
              <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Brand Logos Strip */}
        <div className="mb-32 overflow-hidden">
          <div className="flex items-center gap-8 opacity-30 grayscale hover:grayscale-0 transition-all">
            {['BMW', 'Audi', 'Mercedes-Benz', 'Toyota', 'Kia', 'Hyundai', 'Porsche', 'Lexus', 'Volkswagen', 'Range Rover'].map((brand) => (
              <div key={brand} className="font-display text-2xl tracking-tighter whitespace-nowrap">{brand}</div>
            ))}
            {['BMW', 'Audi', 'Mercedes-Benz', 'Toyota', 'Kia', 'Hyundai', 'Porsche', 'Lexus', 'Volkswagen', 'Range Rover'].map((brand) => (
              <div key={brand + '_2'} className="font-display text-2xl tracking-tighter whitespace-nowrap">{brand}</div>
            ))}
          </div>
        </div>

        <div id="calc" className="mb-32">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-display text-4xl tracking-widest uppercase">{t.calc.title}</h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
          </div>
          <Calculator onProceed={() => navigate('/deals')} mode="standalone" />
        </div>

        {/* How it works / Why us Consolidated */}
        <div className="mb-32">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="font-display text-4xl tracking-widest uppercase">{t.why.title}</h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
          </div>
          <div className="grid lg:grid-cols-[1fr,1.5fr] gap-16">
            <div className="space-y-8">
              <p className="text-xl text-[var(--mu2)] leading-relaxed font-display">
                {t.why.desc1}
              </p>
              <div className="grid gap-4">
                {[
                  { title: t.team.step1Title, desc: t.team.step1Desc },
                  { title: t.team.step2Title, desc: t.team.step2Desc },
                  { title: t.team.step3Title, desc: t.team.step3Desc }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl">
                    <div className="w-8 h-8 rounded-lg bg-[var(--lime)]/10 flex items-center justify-center text-[var(--lime)] font-display shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-[var(--w)] mb-1">{item.title}</div>
                      <p className="text-[10px] text-[var(--mu2)] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-6 relative z-10">
                <h3 className="font-display text-3xl leading-tight">{t.why.desc2}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[t.why.bullet1, t.why.bullet2, t.why.bullet3].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--w)] bg-[var(--s2)] p-4 rounded-xl border border-[var(--b2)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-12 pt-12 border-t border-[var(--b2)] flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--lime)] to-[var(--teal)]" />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest">{t.stats.verifiedNetwork}</div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase font-bold tracking-widest">{t.stats.activeDealers}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-display text-[var(--lime)]">217+</div>
                  <div className="text-[8px] text-[var(--mu2)] uppercase font-bold tracking-widest">{t.stats.activeDealers}</div>
                </div>
              </div>
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <svg className="w-64 h-64 text-[var(--lime)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div id="how-it-works">
          <ProcessTimeline />
        </div>

        <div className="mb-32">
          <CarQuiz onSelect={handleSelect} />
        </div>

        {language === 'ru' && <SpecialBenefits />}

        <div id="market" className="mb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="font-display text-4xl tracking-widest uppercase whitespace-nowrap">{t.market.title}</h2>
              <div className="flex-1 h-px bg-[var(--b2)]" />
            </div>
          </div>
          <DealsGrid filter={searchQuery} limit={3} />
          <div className="mt-8 text-center">
            <button onClick={() => navigate('/deals')} className="bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-xs uppercase tracking-widest px-10 py-4 rounded-xl hover:border-[var(--lime)] hover:text-[var(--lime)] transition-all">
              {t.market.viewAll}
            </button>
          </div>
        </div>

        <div className="mb-32">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="font-display text-4xl tracking-widest uppercase">{t.security.title}</h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
          </div>
          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="font-display text-3xl">{t.security.subtitle}</h3>
              <p className="text-[var(--mu2)] leading-relaxed">
                {t.security.desc}
              </p>
              <ul className="space-y-3">
                {[t.security.bullet1, t.security.bullet2, t.security.bullet3, t.security.bullet4].map((check, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[var(--w)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" />
                    {check}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-[var(--lime)]/10 rounded-full blur-3xl" />
              <div className="relative bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4 border-b border-[var(--b1)] pb-4">
                  <div className="w-3 h-3 rounded-full bg-[var(--lime)]" />
                  <div className="text-[10px] font-bold uppercase tracking-widest">{t.security.verified}</div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-[var(--b2)] rounded-full w-3/4" />
                  <div className="h-2 bg-[var(--b2)] rounded-full w-1/2" />
                  <div className="h-2 bg-[var(--b2)] rounded-full w-5/6" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DealerNetwork />
        <LeaseEndAdvisor />
        <DealAuditor />
        <ExtensionPromo />
        <CaseStudies />
        <div id="reviews">
          <HappyClients />
        </div>
        <BlogSection />
        <div id="faq">
          <FAQ />
        </div>
        <TrustSection />

        <div className="mt-32 text-center space-y-8">
          <h2 className="font-display text-5xl md:text-6xl tracking-tight">{t.cta.title}</h2>
          <button onClick={() => navigate('/deals')} className="bg-[var(--lime)] text-white font-display text-2xl tracking-widest px-12 py-6 rounded-xl hover:bg-[var(--lime2)] transition-all hover:scale-105 shadow-2xl shadow-[var(--lime)]/20 flex flex-col items-center justify-center mx-auto">
            <span>{t.hero.btnCalc}</span>
            <span className="text-xs font-sans font-bold uppercase opacity-70 mt-2">{t.hero.btnCalcSub}</span>
          </button>
        </div>
      </main>

      <AnimatePresence>
        {leadData && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-50"
          >
            <div className="bg-[var(--s2)] border border-[var(--lime)]/30 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
              <div className="bg-[var(--lime)]/10 px-4 py-2 border-b border-[var(--lime)]/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="ldot" />
                  <span className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{t.liveStatus.status}</span>
                </div>
                <button onClick={() => setLeadData(null)} className="text-[var(--mu2)] hover:text-[var(--w)]">×</button>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.liveStatus.car}</div>
                    <div className="font-display text-xl leading-none">{leadData.car.make} {leadData.car.model}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mb-1">{t.liveStatus.statusLabel}</div>
                    <div className={`text-[10px] font-bold uppercase ${leadData.status === 'pending' ? 'text-amber-500' : 'text-[var(--lime)]'}`}>
                      {leadData.status === 'pending' ? t.liveStatus.pending : t.liveStatus.inProgress}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--mu2)]">{t.liveStatus.received}</span>
                    <span className="text-[var(--w)] font-bold">{leadData.dealersSent}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[var(--mu2)]">{t.liveStatus.accepted}</span>
                    <span className="text-[var(--grn)] font-bold">{leadData.dealersAccepted}</span>
                  </div>
                </div>

                <div className="w-full bg-[var(--b2)] h-1 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    className="h-full bg-[var(--lime)]"
                    initial={{ width: '10%' }}
                    animate={{ width: leadData.status === 'pending' ? '30%' : leadData.acceptedBy ? '100%' : '70%' }}
                  />
                </div>

                <button 
                  onClick={() => setIsTrackingModalOpen(true)}
                  className="w-full bg-[var(--b2)] text-[var(--w)] text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg hover:bg-[var(--b3)] transition-all"
                >
                  {t.liveStatus.details}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LockModal 
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
      />

      <TrackingModal 
        isOpen={isTrackingModalOpen}
        onClose={() => setIsTrackingModalOpen(false)}
        leadData={leadData}
      />

      <DealCalculatorModal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        onProceed={handleProceedFromCalc}
        deal={selectedDealForCalc}
      />

      <DepositModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={submitLead}
        isSubmitting={isSubmitting}
        carName={activeSelection ? `${activeSelection.make?.name || activeSelection.make} ${activeSelection.model?.name || activeSelection.model} ${activeSelection.year || ''}` : ''}
        activeSelection={activeSelection}
        clientInfo={clientInfo}
        setClientInfo={setClientInfo}
        tradeIn={tradeIn}
        setTradeIn={setTradeIn}
        payMethod={payMethod}
        setPayMethod={setPayMethod}
        paymentName={paymentName}
        setPaymentName={setPaymentName}
        isConfirmed={isConfirmed}
        setIsConfirmed={setIsConfirmed}
        leadId={leadId}
      />
    </div>
  );
}



const BetaBanner = () => {
  const { language } = useLanguageStore();
  const { open: openFeedback } = useFeedbackStore();
  const t = translations[language].beta;
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-[var(--lime)] text-black py-2 px-6 flex items-center justify-between gap-4 relative z-[60]">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="bg-black text-[var(--lime)] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">BETA</span>
        <p className="text-[10px] font-bold uppercase tracking-widest truncate">
          {t.message}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <button 
          onClick={openFeedback}
          className="text-[10px] font-bold uppercase tracking-widest border-b border-black hover:opacity-70 transition-opacity"
        >
          {t.feedbackBtn}
        </button>
        <button onClick={() => setIsVisible(false)} className="hover:opacity-70">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const { language, setLanguage } = useLanguageStore();
  const { user, role, isAuthModalOpen, setIsAuthModalOpen } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = translations[language];

  const navLinks = [
    { to: '/#calc', label: t.nav.calculator, id: 'calc' },
    { to: '/deals', label: t.nav.dealsCatalog },
    { to: '/lease-transfers', label: t.nav.leaseTransfers },
    { to: '/saved', label: t.nav.savedDeals },
    { to: '/blog', label: t.nav.blog },
    ...(user ? [{ to: '/dashboard', label: t.nav.dashboard }] : []),
    ...(role === 'admin' ? [{ to: '/admin', label: t.nav.admin, isAdmin: true }] : [])
  ];

  const handleNavClick = (link: any, e: React.MouseEvent) => {
    setIsMobileMenuOpen(false);
    if (link.id === 'calc' && isHome) {
      e.preventDefault();
      const el = document.getElementById('calc');
      if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 80,
          behavior: 'smooth'
        });
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] selection:bg-[var(--lime)] selection:text-black">
      <BetaBanner />
      {/* Header */}
      <nav className="h-[var(--nh)] border-b border-[var(--b1)] flex items-center justify-between px-6 sticky top-0 bg-[var(--bg)]/90 backdrop-blur-xl z-50">
        <Link to="/" className="font-display text-xl tracking-widest cursor-pointer flex items-center gap-2 shrink-0">
          HUNTER<span className="text-[var(--lime)]">.</span>LEASE
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link 
              key={link.to}
              to={link.to}
              onClick={(e) => handleNavClick(link, e)}
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest transition-colors",
                link.isAdmin ? "text-[var(--lime)] hover:text-[var(--w)]" : 
                (location.pathname === link.to || (link.id === 'calc' && isHome)) ? "text-[var(--lime)]" : "text-[var(--mu2)] hover:text-[var(--w)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <button onClick={() => auth.signOut()} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)] hover:text-[var(--w)] transition-colors">
                <LogOut className="w-4 h-4" />
                <span>{t.nav.signOut}</span>
              </button>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--mu2)] hover:text-[var(--w)] transition-colors">
                <LogIn className="w-4 h-4" />
                <span>{t.nav.signIn}</span>
              </button>
            )}
            <div className="flex items-center bg-[var(--s2)] rounded-lg p-0.5 border border-[var(--b2)] ml-2">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'en' ? 'bg-[var(--s1)] text-[var(--w)] border border-[var(--b2)]' : 'text-[var(--mu2)] hover:text-[var(--w)] border border-transparent'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('ru')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${language === 'ru' ? 'bg-[var(--s1)] text-[var(--w)] border border-[var(--b2)]' : 'text-[var(--mu2)] hover:text-[var(--w)] border border-transparent'}`}
              >
                RU
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[var(--mu2)] hover:text-[var(--w)] transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-[var(--nh)] left-0 right-0 bg-[var(--bg)] border-b border-[var(--b1)] p-6 md:hidden flex flex-col gap-6 z-40 shadow-2xl"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.to}
                    to={link.to}
                    onClick={(e) => handleNavClick(link, e)}
                    className={cn(
                      "text-sm font-bold uppercase tracking-widest transition-colors py-2",
                      link.isAdmin ? "text-[var(--lime)]" : 
                      (location.pathname === link.to || (link.id === 'calc' && isHome)) ? "text-[var(--lime)]" : "text-[var(--mu2)]"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              
              <div className="h-px bg-[var(--b1)]" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-[var(--s2)] rounded-lg p-0.5 border border-[var(--b2)]">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`px-4 py-2 text-[10px] font-bold rounded-md transition-colors ${language === 'en' ? 'bg-[var(--s1)] text-[var(--w)] border border-[var(--b2)]' : 'text-[var(--mu2)] border border-transparent'}`}
                  >
                    ENGLISH
                  </button>
                  <button 
                    onClick={() => setLanguage('ru')}
                    className={`px-4 py-2 text-[10px] font-bold rounded-md transition-colors ${language === 'ru' ? 'bg-[var(--s1)] text-[var(--w)] border border-[var(--b2)]' : 'text-[var(--mu2)] border border-transparent'}`}
                  >
                    РУССКИЙ
                  </button>
                </div>
                
                {user ? (
                  <button onClick={() => { auth.signOut(); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-red-400">
                    <LogOut className="w-4 h-4" />
                    <span>{t.nav.signOut}</span>
                  </button>
                ) : (
                  <button onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--lime)]">
                    <LogIn className="w-4 h-4" />
                    <span>{t.nav.signIn}</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      {children}
      <Footer />
      <ExpertChat />
      <FeedbackWidget />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <VisitTracker />
      <LanguageWelcomeModal />
      <Routes>
        <Route path="/" element={<Layout><MainApp /></Layout>} />
        <Route path="/deals" element={<Layout><DealsPage /></Layout>} />
        <Route path="/lease-transfers" element={<Layout><LeaseTransfersPage /></Layout>} />
        <Route path="/compare" element={<Layout><ComparePage /></Layout>} />
        <Route path="/deal/:id" element={<Layout><DealPage /></Layout>} />
        <Route path="/saved" element={<Layout><SavedDealsPage /></Layout>} />
        <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
        <Route path="/blog/:id" element={<Layout><BlogPost /></Layout>} />
        <Route path="/glossary" element={<Layout><GlossaryPage /></Layout>} />
        <Route path="/about" element={<Layout><AboutPage /></Layout>} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
        <Route path="/terms" element={<Layout><TermsConditions /></Layout>} />
        <Route path="/legal-disclosure" element={<Layout><LegalDisclosure /></Layout>} />
        <Route path="/accessibility" element={<Layout><AccessibilityStatement /></Layout>} />
        <Route path="/finish-sign-up" element={<Layout><FinishSignUp /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/dealer" element={<Layout><DealerPortal /></Layout>} />
      </Routes>
    </ErrorBoundary>
  );
}
