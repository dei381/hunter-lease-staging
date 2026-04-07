import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator } from '../components/Calculator';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { DepositModal } from '../components/DepositModal';
import { ProcessTimeline } from '../components/ProcessTimeline';
import { HappyClients } from '../components/HappyClients';
import { FAQ } from '../components/FAQ';
import { CaseStudies } from '../components/CaseStudies';
import { TrustSection } from '../components/TrustSection';
import { DealAuditor } from '../components/DealAuditor';
import { DealerReviews } from '../components/DealerReviews';
import { ImageGallery } from '../components/ImageGallery';
import { ShieldCheck, Zap, Star, ArrowRight, Heart, Info, Check, X, ShieldAlert, TrendingDown, Clock, Eye, Users, Flame, Fuel, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Calculator as CalculatorIcon } from 'lucide-react';
import { cn } from '../utils/cn';

import { CompareBar } from '../components/CompareBar';
import { getCarImage, CarPhoto } from '../utils/carImage';
import { PriceHistoryChart } from '../components/PriceHistoryChart';
import { SmartPriceAlertModal } from '../components/SmartPriceAlertModal';
import { GroupBuyingWidget } from '../components/GroupBuyingWidget';
import { AINegotiatorModal } from '../components/AINegotiatorModal';
import { Bell, Bot } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'react-hot-toast';

import { fetchWithCache } from '../utils/fetchWithCache';

export const DealPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguageStore();
  const { toggleDeal, isSaved: checkIsSaved, addToCompare, removeFromCompare, isInCompare } = useGarageStore();
  const t = translations[language];
  const td = t.dealPage;

  const state = location.state as { isFirstTimeBuyer?: boolean; hasCosigner?: boolean } | null;
  const isFirstTimeBuyer = state?.isFirstTimeBuyer || false;
  const hasCosigner = state?.hasCosigner || false;

  const [deal, setDeal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isNegotiatorOpen, setIsNegotiatorOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const handleCalculatorChange = React.useCallback((data: any) => {
    setSelectedConfig(data);
  }, []);

  const handleMileageChange = React.useCallback((m: string) => {
    setMileage(m);
  }, []);
  const [viewCount, setViewCount] = useState(Math.floor(Math.random() * 5) + 2);
  const [activeTab, setActiveTab] = useState<'specs' | 'options'>('specs');
  const [mileage, setMileage] = useState('10k');
  const [photos, setPhotos] = useState<CarPhoto[]>([]);

  // DepositModal state
  const [clientInfo, setClientInfo] = useState({ name: '', email: '', phone: '', tcpaConsent: false, termsConsent: false });
  const [tradeIn, setTradeIn] = useState({ hasTradeIn: false, make: '', model: '', year: '', mileage: '', vin: '', hasLoan: false, payoff: '' });
  const [payMethod, setPayMethod] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const enrichedDeal = deal;

  const currentFeatures = language === 'ru' && enrichedDeal?.categorizedFeaturesRu && Object.keys(enrichedDeal.categorizedFeaturesRu).length > 0 ? enrichedDeal.categorizedFeaturesRu : enrichedDeal?.categorizedFeatures;
  const currentVerdict = language === 'ru' && enrichedDeal?.ownerVerdictRu && Object.keys(enrichedDeal.ownerVerdictRu).length > 0 ? enrichedDeal.ownerVerdictRu : enrichedDeal?.ownerVerdict;
  const isSaved = enrichedDeal ? checkIsSaved(enrichedDeal.id.toString()) : false;

  const fuelStats = useMemo(() => {
    if (!deal || !deal.fuelEconomy) return null;
    const milesPerYear = parseInt(mileage) * 1000;
    const gasPrice = 4.5;
    const electricityPrice = 0.3;
    
    let monthlyCost = 0;
    let savings5Years = 0;
    
    if (deal.fuelType === 'Electric') {
      const kWhPerMile = (33.7 / deal.fuelEconomy.combined);
      monthlyCost = (milesPerYear / 12) * kWhPerMile * electricityPrice;
      const gasAlternativeCost = (milesPerYear / 12 / 25) * gasPrice;
      savings5Years = (gasAlternativeCost - monthlyCost) * 12 * 5;
    } else if (deal.fuelType === 'Hybrid' || deal.fuelType === 'PHEV') {
      monthlyCost = (milesPerYear / 12 / deal.fuelEconomy.combined) * gasPrice;
      const gasAlternativeCost = (milesPerYear / 12 / 25) * gasPrice;
      savings5Years = (gasAlternativeCost - monthlyCost) * 12 * 5;
    } else {
      monthlyCost = (milesPerYear / 12 / deal.fuelEconomy.combined) * gasPrice;
      savings5Years = 0;
    }
    
    return { monthlyCost, savings5Years };
  }, [deal, mileage]);

  useEffect(() => {
    Promise.all([
      fetchWithCache(`/api/deals?id=${id}`),
      fetchWithCache('/api/car-photos')
    ])
      .then(([data, photosData]: any) => {
        setPhotos(photosData || []);
        if (!Array.isArray(data)) {
          console.error('Expected array of deals, got:', data);
          setLoading(false);
          return;
        }
        const found = data.length > 0 ? data[0] : null;
        setDeal(found);
        if (found) {
          setViewCount(found.viewCount || Math.floor(Math.random() * 5) + 2);
          // Increment view count on server
          fetch(`/api/deals/${found.id}/view`, { method: 'POST' }).catch(console.error);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data:', err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!deal) return;
    
    let expirationDate: Date;
    if (deal.expirationDate) {
      expirationDate = new Date(deal.expirationDate);
    } else {
      // Fallback if not in DB
      const now = new Date();
      if (deal.id === 2 || deal.id === '2') {
        expirationDate = new Date(now.getTime() - 100000); // Expired
      } else {
        const numId = typeof deal.id === 'string' ? deal.id.charCodeAt(0) : deal.id;
        const daysToAdd = (numId % 3) + 1;
        expirationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd, 23, 59, 59);
      }
    }

    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      const distance = expirationDate.getTime() - currentTime;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deal]);

  const handleProceed = (config: any) => {
    setSelectedConfig(config);
    setIsDepositOpen(true);
  };

  const submitLead = async () => {
    setIsSubmitting(true);
    const activeSelection = selectedConfig || deal;

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
        term: activeSelection.term || '36 mo',
        tier: activeSelection.tier || 'Tier 1',
        mileage: activeSelection.mileage || '10k',
      },
      source: activeSelection.source || 'catalog_deal',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
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

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to submit lead to backend');
      }

      const { leadId: prismaLeadId } = responseData;
      
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
      
      return true;
    } catch (e) {
      console.error('Error submitting lead:', e);
      toast.error(e instanceof Error ? e.message : "Failed to submit application. Please try again.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const offerId = useMemo(() => {
    // Generate an 8-character random alphanumeric ID
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }, [deal?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--lime)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4 text-[var(--w)] uppercase">{td.dealNotFound}</h1>
          <button onClick={() => navigate('/deals')} className="text-[var(--lime)] hover:underline font-bold uppercase tracking-widest text-xs">
            {td.backToDeals}
          </button>
        </div>
      </div>
    );
  }

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": `${deal.year} ${deal.make} ${deal.model} ${deal.trim}`,
    "image": deal.image || getCarImage(photos, deal.make, deal.model, deal.year),
    "description": `Exclusive lease deal for ${deal.year} ${deal.make} ${deal.model}.`,
    "brand": {
      "@type": "Brand",
      "name": deal.make
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "USD",
      "price": deal.payment,
      "priceValidUntil": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] pb-32 lg:pb-20 selection:bg-[var(--lime)] selection:text-black">
      <SEO 
        title={`${deal.year} ${deal.make} ${deal.model} | Hunter Lease`}
        description={`Exclusive lease deal for ${deal.year} ${deal.make} ${deal.model}. Save $${deal.savings?.toLocaleString() || 0}.`}
        ogImage={deal.image || getCarImage(photos, deal.make, deal.model, deal.year)}
        schema={productSchema}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex flex-col gap-2">
          {/* Compact Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Breadcrumbs make={deal.make} model={deal.model} />
              </div>
              <h1 className="font-display text-4xl md:text-5xl leading-none tracking-tight uppercase">
                {deal.make} <span className="text-[var(--mu2)]">{deal.model}</span>
              </h1>
              <div className="flex items-center gap-4 text-[var(--mu2)]">
                <span className="font-mono text-[10px] tracking-widest">{deal.year} {td.modelYear}</span>
                <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                <span className="font-mono text-[10px] tracking-widest">{deal.trim || td.premiumPlus}</span>
                <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                <div className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[var(--lime)]" />
                  <span className="font-mono text-[10px] tracking-widest">{td.passedAudit}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAlertOpen(true)}
                className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)] hover:text-[var(--w)]"
              >
                <Bell size={12} className="text-[var(--lime)]" />
                {language === 'ru' ? 'Следить за ценой' : 'Price Alert'}
              </button>
              <button
                onClick={() => {
                  if (isInCompare(deal.id.toString())) {
                    removeFromCompare(deal.id.toString());
                  } else {
                    addToCompare(deal);
                  }
                }}
                title={isInCompare(deal.id.toString()) ? (language === 'ru' ? 'Удалить из сравнения' : 'Remove from compare') : (language === 'ru' ? 'Добавить в сравнение' : 'Add to compare')}
                className={`p-2 rounded-xl transition-colors flex items-center justify-center border ${
                  isInCompare(deal.id.toString()) 
                    ? 'bg-[var(--s2)] text-[var(--lime)] border-[var(--lime)]' 
                    : 'bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)] hover:text-[var(--w)]'
                }`}
              >
                <Heart size={16} className={isInCompare(deal.id.toString()) ? "fill-current" : ""} />
              </button>
            </div>
          </div>

          {/* Sticky Navigation - More Compact */}
          <div className="sticky top-[var(--nh)] z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--b2)] py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar">
              {[
                { id: 'gallery', label: language === 'ru' ? 'Галерея' : 'Gallery' },
                { id: 'specs', label: language === 'ru' ? 'Характеристики' : 'Specs' },
                { id: 'calculator', label: language === 'ru' ? 'Калькулятор' : 'Calculator' },
                { id: 'process', label: language === 'ru' ? 'Процесс' : 'Process' }
              ].map(item => (
                <a 
                  key={item.id} 
                  href={`#${item.id}`}
                  className="text-[9px] font-bold uppercase tracking-widest text-[var(--mu2)] hover:text-[var(--lime)] whitespace-nowrap transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Main Content Grid */}
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 relative items-start">
            {/* Left Column: Gallery & Technical Specs */}
            <div className="lg:col-span-7 space-y-8">
              <motion.div
                id="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ImageGallery mainImage={deal.image || getCarImage(photos, deal.make, deal.model, deal.year)} images={deal.images} viewCount={viewCount.toString()} dealId={deal.id.toString()} />
              </motion.div>

              {/* Technical Trust Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    icon: ShieldCheck, 
                    title: td.auditTitle, 
                    desc: td.auditDesc,
                    color: 'text-[var(--lime)]'
                  },
                  { 
                    icon: Zap, 
                    title: td.fleetTitle, 
                    desc: td.fleetDesc,
                    color: 'text-blue-400'
                  },
                  { 
                    icon: Star, 
                    title: td.matchTitle, 
                    desc: td.matchDesc,
                    color: 'text-orange-400'
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-[var(--s2)] border border-[var(--b2)] p-5 rounded-2xl space-y-3 hover:bg-[var(--b1)] transition-colors">
                    <div className={cn("w-8 h-8 rounded-lg bg-[var(--w)]/5 flex items-center justify-center", item.color)}>
                      <item.icon size={16} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest">{item.title}</div>
                      <div className="text-[10px] text-[var(--mu2)] leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Categorized Features */}
              {currentFeatures && (
                <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl uppercase tracking-tighter">{td.featuresTitle}</h3>
                    <div className="flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--lime)]" />
                      <div className="w-2 h-2 rounded-full bg-[var(--lime)]/30" />
                      <div className="w-2 h-2 rounded-full bg-[var(--lime)]/10" />
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-8">
                    {Object.entries(currentFeatures || {}).map(([category, items]: [string, any]) => (
                      <div key={category} className="space-y-4">
                        <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest border-b border-[var(--b2)] pb-2">
                          {(td[category as keyof typeof td] as string) || category}
                        </div>
                        <ul className="space-y-3">
                          {(Array.isArray(items) ? items : []).map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 group">
                              <Check size={12} className="text-[var(--lime)] mt-0.5 shrink-0" />
                              <span className="text-xs text-[var(--mu)] group-hover:text-[var(--w)] transition-colors">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fuel Economy & Savings */}
              {deal.fuelEconomy && fuelStats && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Fuel className="text-orange-500" size={20} />
                      </div>
                      <h3 className="font-display text-xl uppercase">{td.fuelEconomyTitle}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)] text-center">
                        <div className="text-[8px] font-bold text-[var(--mu2)] uppercase mb-1">{td.city}</div>
                        <div className="text-lg font-mono font-bold">{deal.fuelEconomy.city}</div>
                      </div>
                      <div className="bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)] text-center">
                        <div className="text-[8px] font-bold text-[var(--mu2)] uppercase mb-1">{td.hwy}</div>
                        <div className="text-lg font-mono font-bold">{deal.fuelEconomy.hwy}</div>
                      </div>
                      <div className="bg-[var(--lime)]/10 p-3 rounded-xl border border-[var(--lime)]/20 text-center">
                        <div className="text-[8px] font-bold text-[var(--lime)] uppercase mb-1">{td.combined}</div>
                        <div className="text-lg font-mono font-bold text-[var(--lime)]">{deal.fuelEconomy.combined}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-6 flex flex-col justify-center space-y-2 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--lime)]/5 rounded-full blur-2xl group-hover:bg-[var(--lime)]/10 transition-colors" />
                    <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{td.estMonthlyFuel}</div>
                    <div className="text-3xl font-display uppercase tracking-tighter">
                      ${Math.round(fuelStats.monthlyCost)} <span className="text-xs font-sans text-[var(--mu2)] lowercase">/ {t.deals.moShort}</span>
                    </div>
                    {fuelStats.savings5Years > 0 && (
                      <div className="flex items-center gap-2 text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest bg-[var(--lime)]/10 w-fit px-2 py-1 rounded">
                        <TrendingDown size={12} />
                        {td.savingsOver5Years}: ${Math.round(fuelStats.savings5Years).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Owner Verdict */}
              {currentVerdict && (
                <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="text-blue-500" size={20} />
                    </div>
                    <h3 className="font-display text-xl uppercase">{td.ownerVerdictTitle}</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest">
                        <ThumbsUp size={14} />
                        {td.pros}
                      </div>
                      <ul className="space-y-2">
                        {(currentVerdict.pros || []).map((pro: string, i: number) => (
                          <li key={i} className="text-xs text-[var(--mu)] flex items-start gap-2">
                            <span className="text-[var(--lime)]">•</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest">
                        <ThumbsDown size={14} />
                        {td.cons}
                      </div>
                      <ul className="space-y-2">
                        {(currentVerdict.cons || []).map((con: string, i: number) => (
                          <li key={i} className="text-xs text-[var(--mu)] flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[var(--b2)]">
                    <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-2">{td.summary}</div>
                    <p className="text-sm text-[var(--w)] leading-relaxed italic">
                      "{currentVerdict.summary || currentVerdict}"
                    </p>
                  </div>
                </div>
              )}

              {/* Market Trend & TCO Analysis - New Spacious Layout */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Market Trend Analysis */}
                <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center">
                        <TrendingDown className="text-[var(--lime)]" size={20} />
                      </div>
                      <h3 className="font-display text-xl uppercase">{t.calc.marketTrend}</h3>
                    </div>
                    <div className="bg-[var(--lime)]/10 text-[var(--lime)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--lime)]/20">
                      {t.calc.bestTimeToBuy}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-end justify-between h-32 gap-2">
                      {[65, 80, 45, 90, 70, 55, 40].map((h, i) => (
                        <div key={i} className="flex-1 bg-[var(--b1)] rounded-t-xl relative group h-full flex items-end overflow-hidden border border-[var(--b2)]">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${h}%` }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className={cn(
                              "w-full transition-all",
                              i === 6 ? "bg-[var(--lime)]" : "bg-[var(--mu2)]/20 group-hover:bg-[var(--mu2)]/40"
                            )}
                          />
                          {i === 6 && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-black bg-[var(--lime)] px-1 rounded">
                              NOW
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-[var(--mu2)] uppercase tracking-widest px-1">
                      <span>6 {t.calc.moShort} {t.calc.ago}</span>
                      <span>{t.calc.current}</span>
                    </div>
                    <p className="text-xs text-[var(--mu2)] leading-relaxed">
                      {language === 'ru' 
                        ? `Текущая цена на ${deal.model} на 12.4% ниже среднерыночной за последние 6 месяцев.`
                        : `Current pricing for ${deal.model} is 12.4% below the market average over the last 6 months.`}
                    </p>
                  </div>
                </div>

                {/* TCO Analysis */}
                <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <ShieldCheck className="text-blue-500" size={20} />
                    </div>
                    <h3 className="font-display text-xl uppercase">{language === 'ru' ? 'Анализ TCO' : 'TCO Analysis'}</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--b1)] p-4 rounded-2xl border border-[var(--b2)] space-y-1">
                        <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.calc.monthlyAvg}</div>
                        <div className="text-2xl font-display text-[var(--lime)]">
                          ${Math.round((Number(deal.displayPayment) || 500) + (3000 / 36))}
                        </div>
                        <div className="text-[8px] text-[var(--mu2)] uppercase tracking-widest">/ {t.calc.moShort}</div>
                      </div>
                      <div className="bg-[var(--b1)] p-4 rounded-2xl border border-[var(--b2)] space-y-1">
                        <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.calc.totalTCO}</div>
                        <div className="text-2xl font-display text-[var(--w)]">
                          ${Math.round(((Number(deal.displayPayment) || 500) * 36) + 3000).toLocaleString()}
                        </div>
                        <div className="text-[8px] text-[var(--mu2)] uppercase tracking-widest">/ 36 {t.calc.moShort}</div>
                      </div>
                    </div>

                    <div className="bg-[var(--b1)]/50 p-4 rounded-2xl border border-[var(--b2)]">
                      <div className="flex items-start gap-3">
                        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[var(--mu2)] leading-relaxed">
                          {language === 'ru'
                            ? 'Total Cost of Ownership (TCO) — это реальная стоимость владения, включающая все платежи и взносы, распределенные на весь срок аренды.'
                            : 'Total Cost of Ownership (TCO) represents the true cost, including all payments and fees spread across the entire lease term.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specs & Options Tabs */}
              <div id="specs" className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl overflow-hidden scroll-mt-24">
                <div className="flex border-b border-[var(--b2)]">
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      activeTab === 'specs' ? "bg-[var(--b1)] text-[var(--lime)]" : "text-[var(--mu2)] hover:text-[var(--w)]"
                    )}
                  >
                    {td.specsTitle}
                  </button>
                  <button
                    onClick={() => setActiveTab('options')}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      activeTab === 'options' ? "bg-[var(--b1)] text-[var(--lime)]" : "text-[var(--mu2)] hover:text-[var(--w)]"
                    )}
                  >
                    {td.standardOptionsTitle}
                  </button>
                </div>

                <div className="p-8">
                  <AnimatePresence mode="wait">
                    {activeTab === 'specs' ? (
                      <motion.div
                        key="specs"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                          {Object.entries((language === 'ru' && enrichedDeal.detailedSpecsRu && Object.keys(enrichedDeal.detailedSpecsRu).length > 0 ? enrichedDeal.detailedSpecsRu : enrichedDeal.detailedSpecs) || {}).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center border-b border-[var(--b2)] pb-2">
                              <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{key}</span>
                              <span className="text-xs font-mono font-bold">{val}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] text-[var(--mu2)] italic leading-relaxed">
                          * {td.specsDisclaimer}
                        </p>
                        <div className="pt-4">
                           <button className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                             {td.viewFullSpecs} <ChevronRight size={14} />
                           </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="options"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          {(language === 'ru' && enrichedDeal.featuresRu && enrichedDeal.featuresRu.length > 0 ? enrichedDeal.featuresRu : enrichedDeal.features)?.map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" />
                              <span className="text-xs text-[var(--mu)]">{f}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/10 p-4 rounded-2xl">
                          <div className="flex items-center gap-2 text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest mb-2">
                            <Star size={12} />
                            {td.perfectForYou}
                          </div>
                          <p className="text-xs text-[var(--mu2)] leading-relaxed">
                            {deal.make} {deal.model} {td.perfectForYou}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Price History Chart */}
              <div className="mt-8">
                <PriceHistoryChart make={deal.make} model={deal.model} />
              </div>

              {/* AI Negotiator Banner */}
              <div className="mt-8 bg-[var(--s2)] border border-[var(--b2)] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center shrink-0 border border-[var(--lime)]/20">
                    <Bot size={24} className="text-[var(--lime)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest mb-1">
                      {language === 'ru' ? 'Нашли эту машину у дилера?' : 'Found this car at a local dealer?'}
                    </h3>
                    <p className="text-[10px] text-[var(--mu2)] uppercase tracking-widest leading-relaxed">
                      {language === 'ru' 
                        ? 'Позвольте нашему AI написать идеальный контр-оффер, чтобы сбить цену.' 
                        : 'Let our AI write the perfect counter-offer script to negotiate the best price.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNegotiatorOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-[var(--b1)] border border-[var(--b2)] hover:border-[var(--lime)] text-[var(--w)] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0 whitespace-nowrap"
                >
                  {language === 'ru' ? 'Запустить AI' : 'Launch AI Negotiator'}
                </button>
              </div>
            </div>

            {/* Right Column: Calculator */}
            <div id="calculator" className="lg:col-span-5 relative scroll-mt-24">
              <div className="sticky top-[calc(var(--nh)+3rem)] self-start z-30 space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Calculator 
                    deal={enrichedDeal} 
                    timeLeft={timeLeft} 
                    viewCount={viewCount}
                    onProceed={handleProceed}
                    onChange={handleCalculatorChange}
                    onMileageChange={handleMileageChange}
                    mode="offer"
                    initialIsFirstTimeBuyer={isFirstTimeBuyer}
                    initialHasCosigner={hasCosigner}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <GroupBuyingWidget make={deal.make} model={deal.model} />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Page Journey */}
      <div className="mt-32 space-y-32">
        
        {/* 1. The Audit */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-block bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-3 py-1 rounded-full">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--lime)]">{td.techProp}</span>
              </div>
              <h2 className="font-display text-4xl md:text-6xl uppercase">
                {td.auditSectionTitle} <span className="text-[var(--mu2)]">{td.auditSectionSubtitle}</span>
              </h2>
              <p className="text-lg text-[var(--mu)] leading-relaxed max-w-xl">
                {td.auditSectionText.replace('{model}', deal.model)}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-3">
                {td.auditKeys.map((key: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 bg-[var(--s2)] p-3 rounded-xl border border-[var(--b2)]">
                    <Check size={14} className="text-[var(--lime)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{key}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 shadow-xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--b2)] pb-4">
                  <div className="font-mono text-[10px] text-[var(--mu2)] uppercase tracking-widest">{td.auditReport} #8271</div>
                  <div className="bg-[var(--lime)] text-black px-2 py-0.5 rounded text-[10px] font-bold">{td.passed}</div>
                </div>
                
                <div className="space-y-4">
                  {td.auditItems.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-[var(--mu2)]">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{item.val}</span>
                        <Check size={12} className="text-[var(--lime)]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Comparison */}
        <section className="bg-[var(--s1)] py-32 border-y border-[var(--b2)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-display text-4xl md:text-6xl uppercase">
                {td.compTitle} <span className="text-[var(--mu2)]">{td.compVs}</span> {td.compSubtitle}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Retail Column */}
              <div className="bg-[var(--s2)] border border-[var(--b2)] p-8 rounded-2xl space-y-8 opacity-60">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl uppercase">{td.retailDealer}</h3>
                  <X className="text-red-500" size={24} />
                </div>
                <ul className="space-y-4">
                  {td.retailPoints.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-[var(--mu2)] text-xs">
                      <div className="w-1 h-1 rounded-full bg-red-500/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hunter Column */}
              <div className="bg-[var(--s2)] border border-[var(--lime)]/20 p-8 rounded-2xl space-y-8 relative">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl uppercase">Hunter Lease</h3>
                  <Check className="text-[var(--lime)]" size={24} />
                </div>
                <ul className="space-y-4">
                  {td.hunterPoints.map((item: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-[var(--w)] text-xs font-medium">
                      <div className="w-1 h-1 rounded-full bg-[var(--lime)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-6 border-t border-[var(--b2)]">
                  <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest mb-1">{td.yourSavings}</div>
                  <div className="font-mono text-3xl text-[var(--lime)] font-bold">${Math.max(0, (deal.savings || 0) + (deal.leaseCash || 0) + (deal.rebates || 0) + (deal.discount || 0)).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Auditor */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="font-display text-4xl md:text-6xl uppercase">
                {td.auditorTitle} <span className="text-[var(--mu2)]">{td.auditorSubtitle}</span>
              </h2>
              <p className="text-lg text-[var(--mu)] leading-relaxed">
                {td.auditorText}
              </p>
            </div>
            <div className="lg:w-1/2 w-full">
              <DealAuditor />
            </div>
          </div>
        </section>

        {/* 4. The Process */}
        <section id="process" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="flex items-center gap-4 mb-24">
            <h2 className="font-display text-5xl uppercase tracking-tighter">{td.protocolTitle} <span className="text-[var(--lime)] italic">{td.protocolSubtitle}</span></h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
            <div className="font-mono text-xs text-[var(--mu2)]/50">01 — 03</div>
          </div>
          <ProcessTimeline />
        </section>

        {/* 5. Dealer Reviews */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <DealerReviews />
        </section>

        {/* 6. Success Stories & FAQ removed to avoid duplication */}

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="bg-[var(--s2)] rounded-3xl p-12 md:p-24 text-center space-y-8 border border-[var(--b2)]">
            <div className="space-y-4">
              <h2 className="font-display text-5xl md:text-8xl uppercase tracking-tight">
                {td.finalCtaTitle} <span className="text-[var(--lime)]">{deal.model}</span>
              </h2>
              <p className="text-lg text-[var(--mu2)] font-medium max-w-xl mx-auto">
                {td.finalCtaText}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 pt-8">
              <button 
                onClick={() => handleProceed(selectedConfig || deal)}
                className="bg-[var(--lime)] text-black px-12 py-6 rounded-xl font-display text-2xl tracking-widest hover:scale-105 transition-transform flex items-center gap-4 uppercase"
              >
                <span>{td.lockInDeal}</span>
                <ArrowRight size={24} />
              </button>
              <button 
                onClick={() => window.open('https://hunterlease.com/credit-application', '_blank')}
                className="bg-transparent border-2 border-[var(--mu2)] text-[var(--w)] px-12 py-6 rounded-xl font-display text-2xl tracking-widest hover:border-[var(--lime)] hover:text-[var(--lime)] transition-colors flex items-center gap-4 uppercase"
              >
                <span>{td.seeIfIQualify}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* TrustSection removed to avoid duplication with homepage */}

      <DepositModal 
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onConfirm={submitLead}
        isSubmitting={isSubmitting}
        carName={selectedConfig ? `${selectedConfig.make?.name || selectedConfig.make} ${selectedConfig.model?.name || selectedConfig.model} ${selectedConfig.year || ''}` : `${deal?.make?.name || deal?.make} ${deal?.model?.name || deal?.model} ${deal?.year || ''}`}
        activeSelection={selectedConfig || deal}
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

      <SmartPriceAlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        make={deal.make}
        model={deal.model}
      />

      <AINegotiatorModal
        isOpen={isNegotiatorOpen}
        onClose={() => setIsNegotiatorOpen(false)}
      />

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--b2)] z-50 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold mb-0.5">{selectedConfig?.type === 'finance' ? (language === 'ru' ? 'Платеж по кредиту' : 'Finance Payment') : t.calc.leasePayment}</div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl text-[var(--w)] leading-none">${selectedConfig?.payment || deal.leasePay}</span>
            <span className="text-[10px] text-[var(--mu2)]">/mo</span>
          </div>
          <div className="text-[10px] text-[var(--mu2)] mt-0.5">${selectedConfig?.down !== undefined ? selectedConfig.down : deal.dueAtSigning} due</div>
        </div>
        <button 
          onClick={() => handleProceed(selectedConfig || deal)}
          className="flex-1 bg-[var(--lime)] text-black py-3.5 rounded-xl font-display text-lg tracking-widest hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 uppercase"
        >
          <span>{td.lockInDeal}</span>
          <ArrowRight size={18} />
        </button>
      </div>
      <CompareBar />
    </div>
  );
};
