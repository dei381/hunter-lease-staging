import React, { useState, useEffect, Suspense, lazy } from 'react';
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
import { SpecificReviews } from './components/SpecificReviews';
import { FAQ } from './components/FAQ';
import { CarQuiz } from './components/CarQuiz';
import { PricingSection } from './components/PricingSection';
import { LeaseEndAdvisor } from './components/LeaseEndAdvisor';
import { DealAuditor } from './components/DealAuditor';
import { ExtensionPromo } from './components/ExtensionPromo';
import { Footer } from './components/Footer';
import { FeedbackWidget } from './components/FeedbackWidget';
import { AuthModal } from './components/AuthModal';
import { ExpertChat } from './components/ExpertChat';
import { TrackingModal } from './components/TrackingModal';
import { LockModal } from './components/LockModal';
import { VisitTracker } from './components/VisitTracker';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageWelcomeModal } from './components/LanguageWelcomeModal';
import { Lead } from './types';
import { X, ShieldCheck, LogIn, LogOut, Menu, ArrowRight, CheckCircle2, Lock, FileCheck } from 'lucide-react';
import { useLanguageStore } from './store/languageStore';
import { useAuthStore } from './store/authStore';
import { useFeedbackStore } from './store/feedbackStore';
import { auth, db } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { translations } from './translations';
import { doc, getDocFromCache, getDocFromServer, addDoc, setDoc, onSnapshot, collection, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';
import { cn } from './utils/cn';
import { Toaster, toast } from 'react-hot-toast';
import ReactGA from 'react-ga4';

// Lazy loaded pages
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Calibrator = lazy(() => import('./pages/Calibrator').then(module => ({ default: module.Calibrator })));
const DealsPage = lazy(() => import('./pages/DealsPage').then(module => ({ default: module.DealsPage })));
const ComparePage = lazy(() => import('./pages/ComparePage').then(module => ({ default: module.ComparePage })));
const DealPage = lazy(() => import('./pages/DealPage').then(module => ({ default: module.DealPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(module => ({ default: module.BlogPage })));
const BlogPost = lazy(() => import('./pages/BlogPost').then(module => ({ default: module.BlogPost })));
const GlossaryPage = lazy(() => import('./pages/GlossaryPage').then(module => ({ default: module.GlossaryPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsConditions = lazy(() => import('./pages/TermsConditions').then(module => ({ default: module.TermsConditions })));
const LegalDisclosure = lazy(() => import('./pages/LegalDisclosure').then(module => ({ default: module.LegalDisclosure })));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement').then(module => ({ default: module.AccessibilityStatement })));
const FinishSignUp = lazy(() => import('./pages/FinishSignUp').then(module => ({ default: module.FinishSignUp })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const DealerPortal = lazy(() => import('./pages/DealerPortal').then(module => ({ default: module.DealerPortal })));
const LeaseTransfersPage = lazy(() => import('./pages/LeaseTransfersPage').then(module => ({ default: module.LeaseTransfersPage })));
const SavedDealsPage = lazy(() => import('./pages/SavedDealsPage').then(module => ({ default: module.SavedDealsPage })));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(module => ({ default: module.CatalogPage })));
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage').then(module => ({ default: module.VehicleDetailPage })));
const MarketcheckDealPage = lazy(() => import('./pages/MarketcheckDealPage').then(module => ({ default: module.MarketcheckDealPage })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[var(--lime)]/20 border-t-[var(--lime)] rounded-full animate-spin" />
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--lime)] animate-pulse">Loading...</div>
    </div>
  </div>
);

function MainApp() {
  useEffect(() => {
    console.log('MainApp: MOUNTED');
    return () => console.log('MainApp: UNMOUNTED');
  }, []);

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

  // Handle cross-device handoff
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoffLeadId = params.get('creditApp');
    if (handoffLeadId) {
      setLeadId(handoffLeadId);
      localStorage.setItem('leadId', handoffLeadId);
      setIsModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
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

    let currentUserId = auth.currentUser?.uid || null;

    // Shadow Registration: Create anonymous account if not logged in
    if (!currentUserId) {
      try {
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
        
        // Save user profile in Firestore
        await setDoc(doc(db, 'users', currentUserId), {
          uid: currentUserId,
          email: clientInfo.email,
          name: clientInfo.name,
          phone: clientInfo.phone,
          role: 'client',
          createdAt: serverTimestamp(),
          isAnonymous: true
        });
      } catch (error) {
        console.error("Shadow registration failed:", error);
        toast.error("Authentication failed. Please try again or sign in.");
        setIsSubmitting(false);
        return false;
      }
    }

    const payload = {
      userId: currentUserId,
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
        term: activeSelection.term || '36 mo',
        tier: activeSelection.tier || 'Tier 1',
        mileage: activeSelection.mileage || '10k',
      },
      source: activeSelection.source || 'catalog_deal',
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
          userId: currentUserId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit lead to backend');
      }

      const { leadId: prismaLeadId } = await response.json();
      
      setLeadId(prismaLeadId.toString());
      localStorage.setItem('leadId', prismaLeadId.toString());
      localStorage.setItem('activeSelection', JSON.stringify(activeSelection));
      
      return true; // Indicate success
    } catch (e) {
      console.error('Error submitting lead:', e);
      toast.error(e instanceof Error ? e.message : "Failed to submit application. Please try again.");
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
        
        // Restore activeSelection if missing (e.g. cross-device handoff)
        if (!activeSelection && data.car) {
          setActiveSelection({
            make: data.car.make,
            model: data.car.model,
            year: data.car.year,
            type: data.calc?.type,
            payment: data.calc?.payment,
            down: data.calc?.down,
          });
        }

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

  const getEndOfMonth = () => {
    const date = new Date();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return lastDay.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] selection:bg-[var(--lime)] selection:text-black">
      <SEO 
        title={t.seo?.homeTitle || "Hunter Lease | The Marketplace for Pre-Negotiated Car Leases"}
        description={t.seo?.homeDesc || "Skip the dealership. Browse pre-negotiated new car lease deals, customize your payment online, and secure your vehicle with zero hidden markups."}
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

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/deals')} 
                  className="flex flex-col items-start text-left bg-[var(--lime)] text-black p-6 rounded-2xl hover:bg-[var(--lime2)] transition-all group relative overflow-hidden shadow-[0_0_30px_rgba(204,255,0,0.15)] hover:shadow-[0_0_50px_rgba(204,255,0,0.3)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  <div className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">
                    {language === 'ru' ? 'Путь А' : 'Path A'}
                  </div>
                  <div className="text-xl font-display uppercase leading-tight mb-2">
                    {language === 'ru' ? 'Каталог оптовых цен' : 'Wholesale Catalog'}
                  </div>
                  <div className="text-xs opacity-80 font-medium">
                    {language === 'ru' ? 'Выбери готовую машину по оптовой цене из каталога.' : 'Choose a pre-negotiated car at wholesale price from our catalog.'}
                  </div>
                  <ArrowRight className="w-5 h-5 mt-4 group-hover:translate-x-2 transition-transform" />
                </button>

                <button 
                  onClick={() => scrollToSection('calc')} 
                  className="flex flex-col items-start text-left bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] p-6 rounded-2xl hover:border-[var(--lime)] transition-all group"
                >
                  <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-2 group-hover:text-[var(--lime)] transition-colors">
                    {language === 'ru' ? 'Путь Б' : 'Path B'}
                  </div>
                  <div className="text-xl font-display uppercase leading-tight mb-2">
                    {language === 'ru' ? 'Калькулятор сделки' : 'Custom Deal Calculator'}
                  </div>
                  <div className="text-xs text-[var(--mu2)] font-medium">
                    {language === 'ru' ? 'Собери свои условия и отправь заявку дилерам.' : 'Build your own terms and submit a request to dealers.'}
                  </div>
                  <ArrowRight className="w-5 h-5 mt-4 text-[var(--mu2)] group-hover:text-[var(--lime)] group-hover:translate-x-2 transition-all" />
                </button>
              </div>

              <div className="mt-2 p-4 bg-[var(--lime)]/5 border border-[var(--lime)]/20 rounded-xl">
                <p className="text-xs text-[var(--w)] leading-relaxed">
                  <span className="font-bold text-[var(--lime)]">{language === 'ru' ? 'Как мы зарабатываем: ' : 'How we make money: '}</span> 
                  {language === 'ru' ? 'Мы получаем фиксированную комиссию от Fleet-отдела дилера за приведенного клиента. Нам невыгодно завышать вашу ставку, в отличие от классических продавцов.' : 'We receive a fixed commission from the dealer\'s Fleet department for a referred client. It is not profitable for us to inflate your rate, unlike classic sellers.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button onClick={() => scrollToSection('quiz')} className="flex-1 bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl hover:border-[var(--lime)] hover:text-[var(--lime)] transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.quizCta || "Take our 30-second quiz"}
                </button>
                <button onClick={() => scrollToSection('auditor')} className="flex-1 bg-[var(--s2)] border border-[var(--b2)] text-[var(--w)] font-bold text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl hover:border-[var(--lime)] hover:text-[var(--lime)] transition-all flex items-center justify-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  {t.dealAuditorCta || "Upload dealer offer"}
                </button>
              </div>
              <div className="text-center mt-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 text-[var(--grn)]" />
                  {t.softPull || "100% Soft Pull. No impact on your credit score."}
                </span>
              </div>
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
                <div className="text-[var(--mu2)] font-medium">{t.reviewsText || "4.9/5 based on 1,200+ LA deals"}</div>
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
                <div className="text-4xl font-display">{t.statsCount?.dealers || "217+"}</div>
                <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold">{t.stats.dealers}</div>
              </div>
              <div className="h-px bg-[var(--b2)]" />
              <div className="space-y-2 relative z-10">
                <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">{t.stats.license}</div>
                <div className="text-xl font-mono">{t.statsCount?.license || "#21318"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz CTA */}
        <div className="mb-16 bg-[var(--s1)] border border-[var(--b2)] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-[var(--lime)]/50 transition-colors cursor-pointer" onClick={() => scrollToSection('quiz')}>
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--lime)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex-1">
            <h3 className="text-xl font-display mb-2">
              {language === 'ru' ? 'Не знаете, какую машину выбрать?' : 'Don\'t know which car to choose?'}
            </h3>
            <p className="text-[var(--mu2)] text-sm">
              {language === 'ru' 
                ? 'Пройдите наш 30-секундный квиз, чтобы найти лучшие предложения по лизингу для вашего образа жизни.' 
                : 'Take our 30-second quiz to find the best lease deals for your lifestyle.'}
            </p>
          </div>
          <button className="relative z-10 shrink-0 bg-[var(--lime)] text-black px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors flex items-center gap-2">
            {language === 'ru' ? 'Пройти квиз' : 'Take Quiz'} <ArrowRight size={16} />
          </button>
        </div>

        {/* Founder's Letter & Legal Status */}
        <div className="mb-32 grid md:grid-cols-2 gap-8">
          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--lime)]/5 rounded-full blur-3xl group-hover:bg-[var(--lime)]/10 transition-colors" />
            <div className="flex items-center gap-4 mb-6">
              <img src="/azat-photo.jpg" alt="Azat" className="w-16 h-16 rounded-full object-cover border-2 border-[var(--lime)]/20" onError={(e) => { e.currentTarget.src = 'https://picsum.photos/seed/azat/200/200' }} />
              <div>
                <h3 className="font-display text-2xl">{language === 'ru' ? 'Слово основателя' : 'A word from our Founder'}</h3>
                <p className="text-[10px] text-[var(--lime)] uppercase tracking-widest font-bold">Azat Cutliahmetov</p>
              </div>
            </div>
            <p className="text-[var(--mu2)] leading-relaxed mb-6 italic">
              "{language === 'ru' ? 'Я создал Hunter Lease, потому что устал смотреть, как дилеры обманывают моих друзей. Если вам не понравится наш сервис — вот мой личный Telegram:' : 'I created Hunter Lease because I was tired of watching dealers deceive my friends. If you don\'t like our service — here is my personal Telegram:'}"
            </p>
            <a href="https://t.me/azatautosacramento" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--w)] font-bold hover:text-[var(--lime)] transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.686c.223-.195-.054-.296-.346-.105l-6.4 4.026-2.76-.86c-.6-.188-.61-.621.126-.91l10.784-4.16c.5-.188.943.116.826.85z"/></svg>
              @azatautosacramento
            </a>
          </div>

          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 relative overflow-hidden">
            <div className="mb-6">
              <div className="w-12 h-12 bg-[var(--lime)]/10 rounded-xl flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 text-[var(--lime)]" />
              </div>
              <h3 className="font-display text-2xl">{language === 'ru' ? 'Кто мы такие?' : 'Who are we?'}</h3>
            </div>
            <p className="text-[var(--mu2)] leading-relaxed">
              {language === 'ru' 
                ? 'Мы — только IT-платформа и ваши переговорщики. Вы подписываете официальный контракт напрямую с авторизованным дилером (например, Toyota of Los Angeles). Гарантию дает завод-изготовитель. Вы платите дилеру, а не нам.' 
                : 'We are an IT platform and your negotiators. You sign the official contract directly with an authorized dealer (e.g., Toyota of Los Angeles). The manufacturer provides the warranty. You pay the dealer, not us.'}
            </p>
          </div>
        </div>

        {/* Catalog right after Hero */}
        <div id="market" className="mb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
            <div className="flex items-center gap-4 flex-1">
              <h2 className="font-display text-4xl tracking-widest uppercase whitespace-nowrap">{t.market?.title || "Marketplace"}</h2>
              <div className="flex-1 h-px bg-[var(--b2)]" />
            </div>
          </div>
          <DealsGrid limit={6} />
          <div className="mt-8 text-center">
            <button onClick={() => navigate('/deals')} className="bg-[var(--s1)] border border-[var(--b2)] text-[var(--w)] font-bold text-xs uppercase tracking-widest px-10 py-4 rounded-xl hover:border-[var(--lime)] hover:text-[var(--lime)] transition-all">
              {t.market?.viewAll || "View All Deals"}
            </button>
          </div>
        </div>

        {/* Urgency Banner */}
        <div className="mb-16 bg-[var(--s1)] border border-[var(--lime)]/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--lime)]/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 flex items-center justify-center shrink-0">
              <div className="w-2 h-2 rounded-full bg-[var(--lime)] animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--w)]">{language === 'ru' ? 'Банковские программы обновляются' : 'Bank Programs Updating'}</div>
              <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest mt-0.5">
                {t.urgencyBanner?.text?.replace('{date}', getEndOfMonth()) || `Current rates are valid until ${getEndOfMonth()} and subject to change.`}
              </div>
            </div>
          </div>
          <button onClick={() => scrollToSection('calc')} className="relative z-10 shrink-0 bg-[var(--lime)] text-black px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[var(--lime2)] transition-colors">
            {language === 'ru' ? 'Зафиксировать ставку' : 'Lock Rate Now'}
          </button>
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
        <div className="mb-32 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[var(--bg)] to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[var(--bg)] to-transparent z-10" />
          <motion.div 
            animate={{ x: [0, -1035] }}
            transition={{ repeat: Infinity, ease: "linear", duration: 20 }}
            className="flex items-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all w-max"
          >
            {['BMW', 'Audi', 'Mercedes-Benz', 'Toyota', 'Kia', 'Hyundai', 'Porsche', 'Lexus', 'Volkswagen', 'Range Rover', 'BMW', 'Audi', 'Mercedes-Benz', 'Toyota', 'Kia', 'Hyundai', 'Porsche', 'Lexus', 'Volkswagen', 'Range Rover'].map((brand, i) => (
              <div key={i} className="font-display text-2xl tracking-tighter whitespace-nowrap">{brand}</div>
            ))}
          </motion.div>
        </div>

        <div id="calc" className="mb-32">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h2 className="font-display text-4xl tracking-widest uppercase">{t.calc.title}</h2>
                <div className="flex-1 h-px bg-[var(--b2)] hidden md:block" />
              </div>
              <div className="max-w-3xl space-y-4">
                <p className="text-lg text-[var(--w)] font-medium">
                  {language === 'ru' 
                    ? 'Идеальный калькулятор для получения квот среди всех дилеров в радиусе 50 миль.' 
                    : 'The ideal calculator for getting quotes among all dealers within a 50-mile radius.'}
                </p>
                <p className="text-[var(--mu2)] leading-relaxed">
                  {language === 'ru'
                    ? 'Наш калькулятор считает платежи по честной цене MSRP, без скрытых наценок дилера (markups), без завышения кредитной ставки и без навязанных допов. Используйте его, чтобы сравнить текущие предложения от дилеров с реальной рыночной ценой. Если наши условия вам нравятся больше — отправьте заявку, и первый дилер, готовый выполнить эти условия, заберет сделку.'
                    : 'Our calculator computes payments at honest MSRP, with no hidden dealer markups, no inflated money factors or APRs, and no forced add-ons. Use it to compare your current dealer offers with true market pricing. If you prefer our terms, submit a request, and the first dealer willing to meet these terms will win your deal.'}
                </p>
              </div>
            </div>
          </div>
          <Calculator 
            onProceed={(data) => {
              setActiveSelection({
                ...data,
                source: 'custom_calculator'
              });
              setIsModalOpen(true);
            }} 
            mode="standalone" 
          />
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
                  <div className="text-2xl font-display text-[var(--lime)]">{t.statsCount?.dealers || "217+"}</div>
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

        {/* Transparency & Trust Section */}
        <div className="mb-32">
          <div className="bg-[var(--s1)] border border-[var(--b2)] rounded-3xl p-8 flex flex-col justify-center max-w-3xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-6 h-6 text-[var(--lime)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display text-2xl mb-4">{t.businessModel?.title || "How we make money"}</h3>
            <p className="text-[var(--mu2)] leading-relaxed">
              {t.businessModel?.desc || "We receive a fixed commission from the dealer's Fleet department for a referred client. It is not profitable for us to inflate your rate, unlike classic sellers."}
            </p>
          </div>
        </div>

        <div id="quiz" className="mb-32">
          <CarQuiz onSelect={handleSelect} />
        </div>

        {language === 'ru' && <SpecialBenefits />}



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
                <div className="flex items-center gap-3 mb-6 border-b border-[var(--b1)] pb-4">
                  <ShieldCheck className="w-6 h-6 text-[var(--lime)]" />
                  <div className="text-sm font-bold uppercase tracking-widest">{t.security.verified}</div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-[var(--mu2)]" />
                    <div className="text-xs text-[var(--w)] font-mono">256-BIT SSL ENCRYPTION</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-4 h-4 text-[var(--mu2)]" />
                    <div className="text-xs text-[var(--w)] font-mono">11-KEY LOCK PRICE GUARANTEE</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-[var(--mu2)]" />
                    <div className="text-xs text-[var(--w)] font-mono">ZERO THIRD-PARTY SHARING</div>
                  </div>
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
        <SpecificReviews />
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
          <button onClick={() => navigate('/deals')} className="bg-[var(--lime)] text-black font-display text-2xl tracking-widest px-12 py-6 rounded-xl hover:bg-[var(--lime2)] transition-all hover:scale-105 shadow-2xl shadow-[var(--lime)]/20 flex flex-col items-center justify-center mx-auto">
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
  
  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);

  const isHome = location.pathname === '/';
  const { language, setLanguage } = useLanguageStore();
  const { user, role, isAuthModalOpen, setIsAuthModalOpen } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = translations[language];

  const navLinks = [
    { to: '/#calc', label: t.nav.calculator, id: 'calc' },
    { to: '/catalog', label: language === 'ru' ? 'Каталог' : 'Catalog' },
    { to: '/deals', label: t.nav.dealsCatalog },
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
  useEffect(() => {
    console.log('App: MOUNTED');
    return () => console.log('App: UNMOUNTED');
  }, []);

  return (
    <ErrorBoundary>
      <Toaster position="top-right" />
      <VisitTracker />
      <LanguageWelcomeModal />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout><MainApp /></Layout>} />
          <Route path="/deals" element={<Layout><DealsPage /></Layout>} />
          <Route path="/catalog" element={<Layout><CatalogPage /></Layout>} />
          <Route path="/catalog/:trimId" element={<Layout><VehicleDetailPage /></Layout>} />
          <Route path="/lease-transfers" element={<Layout><LeaseTransfersPage /></Layout>} />
          <Route path="/compare" element={<Layout><ComparePage /></Layout>} />
          <Route path="/deal/:id" element={<Layout><DealPage /></Layout>} />
          <Route path="/deal/mc/:vin" element={<Layout><MarketcheckDealPage /></Layout>} />
          <Route path="/saved" element={<Layout><SavedDealsPage /></Layout>} />
          <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
          <Route path="/blog/:id" element={<Layout><BlogPost /></Layout>} />
          <Route path="/glossary" element={<Layout><GlossaryPage /></Layout>} />
          <Route path="/about" element={<Layout><AboutPage /></Layout>} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/calibrator" element={<Calibrator />} />
          <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
          <Route path="/terms" element={<Layout><TermsConditions /></Layout>} />
          <Route path="/legal-disclosure" element={<Layout><LegalDisclosure /></Layout>} />
          <Route path="/accessibility" element={<Layout><AccessibilityStatement /></Layout>} />
          <Route path="/finish-sign-up" element={<Layout><FinishSignUp /></Layout>} />
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/dealer" element={<Layout><DealerPortal /></Layout>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
