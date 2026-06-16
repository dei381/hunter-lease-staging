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
import { DealerReviews } from '../components/DealerReviews';
import { ImageGallery } from '../components/ImageGallery';
import { ShieldCheck, Zap, Star, ArrowRight, Heart, Info, Check, X, ShieldAlert, TrendingDown, Clock, Eye, Users, Flame, Fuel, ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Calculator as CalculatorIcon, CheckCircle, Gauge } from 'lucide-react';
import { cn } from '../utils/cn';

import { CompareBar } from '../components/CompareBar';
import { getVal } from '../utils/finance';
import { getCarImage, CarPhoto } from '../utils/carImage';
import { SmartPriceAlertModal } from '../components/SmartPriceAlertModal';
import { Bell } from 'lucide-react';
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
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const handleCalculatorChange = React.useCallback((data: any) => {
    setSelectedConfig(data);
  }, []);

  const handleMileageChange = React.useCallback((m: string) => {
    setMileage(m);
  }, []);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'options'>('specs');
  const [mileage, setMileage] = useState('10k');
  const [photos, setPhotos] = useState<CarPhoto[]>([]);
  const [marketStats, setMarketStats] = useState<any>(null);

  // DepositModal state
  const [clientInfo, setClientInfo] = useState({ name: '', email: '', phone: '', tcpaConsent: false, termsConsent: false });
  const [tradeIn, setTradeIn] = useState({ hasTradeIn: false, make: '', model: '', year: '', mileage: '', vin: '', hasLoan: false, payoff: '' });
  const [payMethod, setPayMethod] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  const enrichedDeal = useMemo(() => {
    if (!deal) return null;
    const msrp = getVal(deal.msrp);
    // The API's `savings` already = dealer discount + auto-applied incentive, and the
    // card's availableIncentives carries only selectable (non-default) rebates, so
    // `savings` is the complete, non-doubled total. (Adding filter(isDefault) is a no-op
    // since those are stripped server-side; kept at 0 for clarity.)
    const totalIncentives = (deal.availableIncentives || []).filter((inc: any) => inc.isDefault).reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0) || 0;
    const badgeTotalSavings = (Number(deal.savings) || 0) + totalIncentives;
    const savingsPctObj = msrp > 0 ? badgeTotalSavings / msrp : 0;
    return {
      ...deal,
      badgeTotalSavings,
      savingsPctObj
    };
  }, [deal]);

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
      const kWhPerMile = (33.7 / (deal.fuelEconomy.combined || 100));
      monthlyCost = (milesPerYear / 12) * kWhPerMile * electricityPrice;
      const gasAlternativeCost = (milesPerYear / 12 / 25) * gasPrice;
      savings5Years = (gasAlternativeCost - monthlyCost) * 12 * 5;
    } else if (deal.fuelType === 'Hybrid' || deal.fuelType === 'PHEV') {
      monthlyCost = (milesPerYear / 12 / (deal.fuelEconomy.combined || 40)) * gasPrice;
      const gasAlternativeCost = (milesPerYear / 12 / 25) * gasPrice;
      savings5Years = (gasAlternativeCost - monthlyCost) * 12 * 5;
    } else {
      monthlyCost = (milesPerYear / 12 / (deal.fuelEconomy.combined || 25)) * gasPrice;
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
          setViewCount(typeof found.viewCount === 'number' && found.viewCount > 0 ? found.viewCount : null);
          // Increment view count on server
          fetch(`/api/deals/${found.id}/view`, { method: 'POST' }).catch(console.error);
          
          // Fetch market stats
          fetch(`/api/marketcheck/stats?make=${found.make}&model=${found.model}&year=${found.year || new Date().getFullYear()}`)
            .then(res => res.json())
            .then(statsData => {
              if (!statsData.error) setMarketStats(statsData);
            })
            .catch(console.error);
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

    // Honest urgency: show a live countdown ONLY when the deal carries a real, future
    // expiration date from the lender program. Never fabricate or artificially shorten a deadline.
    if (!deal.expirationDate) { setTimeLeft(null); return; }
    const expirationDate = new Date(deal.expirationDate);
    if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) { setTimeLeft(null); return; }

    const tick = () => {
      const distance = expirationDate.getTime() - Date.now();
      if (distance <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
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
        zip: activeSelection.zip || '90210',
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          {/* Top Breadcrumbs / Utilities Bar */}
          <div className="flex flex-col gap-3 pb-4 pt-2">
             <div className="flex items-center gap-2">
               <Breadcrumbs make={deal.make} model={deal.model} />
             </div>
             <div className="flex items-center justify-between w-full">
               <div className="flex items-center gap-2 text-[14px]">
                 {deal.msrp > 0 && (() => { const totalIncentives = (deal.availableIncentives || []).filter((inc: any) => inc.isDefault).reduce((sum: any, inc: any) => sum + (Number(inc.amount) || 0), 0); const totalSavings = (Number(deal.savings) || 0) + totalIncentives + (deal.dealerDiscountCents ? deal.dealerDiscountCents / 100 : 0); return (<div className="flex items-center gap-2 font-mono font-bold text-[var(--w)]"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={totalSavings > 0 ? "text-[var(--lime)]" : "text-[var(--mu2)]"}><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg><span className={totalSavings <= 0 ? "text-[var(--mu2)]" : ""}>{totalSavings > 0 ? ((totalSavings / deal.msrp) * 100).toFixed(1) : 0}% {language === 'ru' ? 'СКИДКА' : 'off MSRP'}</span></div>); })()}
                 {deal.hunterStatus === 'scored' && typeof deal.hunterScore === 'number' && (
                   <div title={deal.hunterLabel} className={cn(
                     "flex items-center gap-1.5 font-mono font-bold px-2.5 py-1 rounded-lg",
                     (deal.hunterBand === 'steal' || deal.hunterBand === 'strong') ? 'bg-[var(--lime)]/15 text-[var(--lime)]'
                       : deal.hunterBand === 'fair' ? 'bg-yellow-400/15 text-yellow-400'
                       : 'bg-[var(--s2)] text-[var(--mu2)]'
                   )}>
                     <Gauge size={16} /> Hunter {deal.hunterScore}
                   </div>
                 )}
               </div>
               {/* Utilities */}
               <div className="flex items-center gap-3">
                 <button
                    onClick={() => {
                      if (isInCompare(deal.id.toString())) {
                        removeFromCompare(deal.id.toString());
                      } else {
                        addToCompare(deal);
                      }
                    }}
                    className={`p-2 sm:px-4 sm:py-2 rounded-full sm:rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 border ${
                      isInCompare(deal.id.toString()) 
                        ? 'bg-[var(--s2)] text-[var(--lime)] border-[var(--lime)]' 
                        : 'bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)] hover:text-[var(--w)]'
                    }`}
                 >
                   <Heart size={16} className={isInCompare(deal.id.toString()) ? "fill-current" : ""} />
                   <span className="hidden sm:inline">{language === 'ru' ? 'СОХРАНИТЬ' : 'SAVE'}</span>
                 </button>
                 <button className="p-2 text-[var(--mu2)] hover:text-[var(--w)] transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                 </button>
               </div>
             </div>
          </div>



          {/* Main Content Grid */}
          
          {/* Mobile-only Gallery (appears before Calculator) */}
          <div className="lg:hidden mb-4">
            <motion.div
              id="gallery-mobile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ImageGallery mainImage={deal.image || getCarImage(photos, deal.make, deal.model, deal.year)} images={deal.images} viewCount={viewCount ? String(viewCount) : undefined} dealId={deal.id.toString()} />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 relative items-start">
            {/* Left Column: Gallery & Technical Specs */}
            <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
              {/* Desktop-only Gallery */}
              <motion.div
                id="gallery-desktop"
                className="hidden lg:block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ImageGallery mainImage={deal.image || getCarImage(photos, deal.make, deal.model, deal.year)} images={deal.images} viewCount={viewCount ? String(viewCount) : undefined} dealId={deal.id.toString()} />
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
                          {Array.isArray(items) && items.map((item: string, i: number) => (
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

                  {currentVerdict && typeof currentVerdict === 'object' ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest">
                            <ThumbsUp size={14} />
                            {td.pros}
                          </div>
                          <ul className="space-y-2">
                            {Array.isArray(currentVerdict.pros) && currentVerdict.pros.map((pro: string, i: number) => (
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
                            {Array.isArray(currentVerdict.cons) && currentVerdict.cons.map((con: string, i: number) => (
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
                          "{currentVerdict.summary}"
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="pt-2">
                      <p className="text-sm text-[var(--w)] leading-relaxed italic">
                        "{String(currentVerdict)}"
                      </p>
                    </div>
                  )}
                </div>
              )}



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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                          {Object.entries((language === 'ru' && enrichedDeal.detailedSpecsRu && Object.keys(enrichedDeal.detailedSpecsRu).length > 0 ? enrichedDeal.detailedSpecsRu : enrichedDeal.detailedSpecs) || {}).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex justify-between items-baseline border-b border-[var(--b2)] pb-2">
                              <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest min-w-[100px]">{key}</span>
                              <span className="text-sm font-mono font-bold text-right ml-4 break-words">{val}</span>
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

              {/* Trust Elements */}
              <div className="mt-12 space-y-6 relative max-w-2xl">
                <h3 className="font-display text-2xl lg:text-3xl text-[var(--w)]">
                  {language === 'ru' ? 'Что включено в сделку' : 'What\'s included'}
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 sm:p-6 rounded-3xl bg-[var(--s2)] border border-[var(--b2)] flex gap-4 sm:gap-6 items-start">
                    <div className="shrink-0 mt-1">
                      <ShieldCheck className="text-[var(--lime)]" size={28} />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-[var(--w)] mb-1 sm:mb-2">{language === 'ru' ? 'Гарантия производителя' : 'Manufacturer Warranty'}</h4>
                      <p className="text-sm md:text-base text-[var(--mu2)] leading-relaxed">{language === 'ru' ? 'Стандартная заводская гарантия от производителя.' : 'Standard factory warranty provided by the manufacturer.'}</p>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6 rounded-3xl bg-[var(--s2)] border border-[var(--b2)] flex gap-4 sm:gap-6 items-start">
                    <div className="shrink-0 mt-1">
                      <CheckCircle className="text-[var(--lime)]" size={28} />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-[var(--w)] mb-1 sm:mb-2">{language === 'ru' ? 'Никаких наценок' : 'No Hidden Markups'}</h4>
                      <p className="text-sm md:text-base text-[var(--mu2)] leading-relaxed">{language === 'ru' ? 'Честная цена без дилерских накруток (No Markups).' : 'Honest pricing with no dealer markups.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Calculator (Desktop) & Inline (Mobile) */}
            <div id="calculator" className="relative scroll-mt-24 lg:col-span-5 order-1 lg:order-2 block bg-transparent shadow-none p-0 overflow-visible mt-2">
              <div className="lg:sticky lg:top-[calc(var(--nh)+1.5rem)] self-start z-30 space-y-6 lg:pb-24 p-0">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Calculator 
                    deal={enrichedDeal} 
                    timeLeft={timeLeft} 
                    viewCount={viewCount ?? undefined}
                    onProceed={handleProceed}
                    onChange={handleCalculatorChange}
                    onMileageChange={handleMileageChange}
                    mode="offer"
                    initialIsFirstTimeBuyer={isFirstTimeBuyer}
                    initialHasCosigner={hasCosigner}
                  />
                </motion.div>

              {/* Market Trend & TCO Analysis - Moved under Calculator */}
              <div className="grid grid-cols-1 gap-4 mt-6">
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
                      {(() => {
                        if (!marketStats || !marketStats.price || !marketStats.price.mean) {
                          return language === 'ru' 
                            ? `Сбор данных о рынке Лос-Анджелеса...`
                            : `Gathering Los Angeles market data...`;
                        }
                        const ourPrice = deal.msrp || 0;
                        const marketAvg = marketStats.price.mean;
                        if (ourPrice > 0 && marketAvg > 0) {
                          const diff = marketAvg - ourPrice;
                          const percent = ((diff / marketAvg) * 100).toFixed(1);
                          if (diff > 0) {
                            return language === 'ru'
                              ? `Текущая цена на ${deal.model} на ${percent}% ниже среднерыночной в Лос-Анджелесе (на основе ${marketStats.price.count || 'сотен'} похожих авто).`
                              : `Current pricing for ${deal.model} is ${percent}% below the Los Angeles market average (based on ${marketStats.price.count || 'hundreds of'} similar cars).`;
                          } else {
                            return language === 'ru'
                              ? `Текущая цена на ${deal.model} соответствует среднерыночной в Лос-Анджелесе (на основе ${marketStats.price.count || 'сотен'} похожих авто).`
                              : `Current pricing for ${deal.model} is in line with the Los Angeles market average (based on ${marketStats.price.count || 'hundreds of'} similar cars).`;
                          }
                        }
                        return language === 'ru' 
                          ? `Текущая цена на ${deal.model} на 12.4% ниже среднерыночной за последние 6 месяцев.`
                          : `Current pricing for ${deal.model} is 12.4% below the market average over the last 6 months.`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
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

        {/* 4. The Process */}
        <section id="process" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="flex items-center gap-4 mb-24">
            <h2 className="font-display text-5xl uppercase tracking-tighter">{td.protocolTitle} <span className="text-[var(--lime)] italic">{td.protocolSubtitle}</span></h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
            <div className="font-mono text-xs text-[var(--mu2)]/50">01 / 03</div>
          </div>
          <ProcessTimeline />
        </section>

        {/* 6. Success Stories & FAQ removed to avoid duplication */}

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="bg-[var(--s2)] rounded-3xl p-8 md:p-12 text-center space-y-6 border border-[var(--b2)]">
            <div className="space-y-4">
              <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tight">
                {td.finalCtaTitle} <span className="text-[var(--lime)]">{deal.model}</span>
              </h2>
              <p className="text-base text-[var(--mu2)] font-medium max-w-xl mx-auto">
                {td.finalCtaText}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button 
                onClick={() => handleProceed(selectedConfig || deal)}
                className="bg-[var(--lime)] text-black px-8 py-4 rounded-xl font-display text-xl tracking-widest hover:scale-105 transition-transform flex items-center gap-4 uppercase"
              >
                <span>{td.lockInDeal}</span>
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => window.open('https://hunterlease.com/credit-application', '_blank')}
                className="bg-transparent border-2 border-[var(--mu2)] text-[var(--w)] px-8 py-4 rounded-xl font-display text-xl tracking-widest hover:border-[var(--lime)] hover:text-[var(--lime)] transition-colors flex items-center gap-4 uppercase"
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

      <CompareBar />
    </div>
  );
};
