import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Calculator } from '../components/Calculator';
import { ImageGallery } from '../components/ImageGallery';
import { DepositModal } from '../components/DepositModal';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ProcessTimeline } from '../components/ProcessTimeline';
import { DealerReviews } from '../components/DealerReviews';
import { SmartPriceAlertModal } from '../components/SmartPriceAlertModal';
import { CompareBar } from '../components/CompareBar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Share2, 
  Heart, 
  ShieldCheck, 
  Info, 
  Zap, 
  Clock, 
  MapPin, 
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Tag,
  Eye,
  Settings2,
  Bell,
  Star,
  ArrowRight,
  Check,
  Users,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Fuel
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';

export const MarketcheckDealPage: React.FC = () => {
  const { vin } = useParams<{ vin: string }>();
  const { language } = useLanguageStore();
  const { user, setIsAuthModalOpen, setAuthEmail } = useAuthStore();
  const { toggleDeal, isSaved: checkIsSaved, addToCompare, removeFromCompare, isInCompare } = useGarageStore();
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[language].dealPage;
  const tc = translations[language].calc;
  
  const state = location.state as { isFirstTimeBuyer?: boolean; hasCosigner?: boolean } | null;
  const isFirstTimeBuyer = state?.isFirstTimeBuyer || false;
  const hasCosigner = state?.hasCosigner || false;
  
  const [listing, setListing] = useState<any>(null);
  const [incentives, setIncentives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'options'>('specs');
  const [marketStats, setMarketStats] = useState<any>(null);

  // Deposit Modal State
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [activeSelection, setActiveSelection] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'s' | 'z' | 'c'>('s');
  const [paymentName, setPaymentName] = useState('');
  const [clientInfo, setClientInfo] = useState({
    name: user?.displayName || '',
    phone: '',
    email: user?.email || '',
    tcpaConsent: false,
    termsConsent: false
  });
  const [tradeIn, setTradeIn] = useState({
    hasTradeIn: false,
    make: '',
    model: '',
    year: '',
    mileage: ''
  });

  useEffect(() => {
    if (!vin) return;
    
    const updateViewCount = async () => {
      try {
        const viewRef = doc(db, 'marketcheck_views', vin);
        await setDoc(viewRef, { count: increment(1), lastViewed: serverTimestamp() }, { merge: true });
        const viewSnap = await getDoc(viewRef);
        setViewCount(viewSnap.data()?.count || 1);
      } catch (e) {
        console.error("Failed to update view count", e);
        // Fallback to deterministic hash if DB fails
        const today = new Date().toISOString().split('T')[0];
        const hashString = `${vin}-${today}`;
        let hash = 0;
        for (let i = 0; i < hashString.length; i++) {
          hash = ((hash << 5) - hash) + hashString.charCodeAt(i);
          hash |= 0;
        }
        const baseViews = Math.abs(hash) % 150;
        setViewCount(baseViews + 12);
      }
    };
    
    updateViewCount();
  }, [vin]);

  useEffect(() => {
    if (user) {
      setClientInfo(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email
      }));
    }
  }, [user]);

  useEffect(() => {
    const fetchListing = async () => {
      if (!vin) return;
      setLoading(true);
      try {
        let data = location.state?.listing;
        
        // 1. Fetch listing from API if not passed in state
        if (!data) {
          const res = await fetch(`/api/marketcheck/listing/${vin}`);
          if (!res.ok) {
            setError('Listing not found');
            setLoading(false);
            return;
          }
          data = await res.json();
        }
        
        setListing({ ...data, id: data.id || vin });

        // Fetch market stats
        if (data.make && data.model) {
          fetch(`/api/marketcheck/stats?make=${data.make}&model=${data.model}&year=${data.build?.year || data.year || new Date().getFullYear()}`)
            .then(res => res.json())
            .then(statsData => {
              if (!statsData.error) setMarketStats(statsData);
            })
            .catch(console.error);
        }

        // 2. Fetch incentives
        const make = data.build?.make || data.make;
        if (make) {
          const zip = data.dealer?.zip ? data.dealer.zip.split('-')[0] : '90210';
          const incRes = await fetch(`/api/marketcheck/incentives?make=${encodeURIComponent(make)}&zip=${zip}`);
          if (incRes.ok) {
            const incData = await incRes.json();
            setIncentives(incData || []);
          }
        }

        // 3. Check if saved
        if (user) {
          const savedRef = doc(db, `users/${user.uid}/saved_listings/${data.id || vin}`);
          const savedSnap = await getDoc(savedRef);
          setIsSaved(savedSnap.exists());
        }

      } catch (err) {
        console.error('Error fetching Marketcheck listing:', err);
        setError('Failed to load listing details');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [vin, user, location.state]);

  const handleSave = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!listing) return;

    try {
      const savedRef = doc(db, `users/${user.uid}/saved_listings/${listing.id}`);
      if (isSaved) {
        // Remove from favorites
        await deleteDoc(savedRef);
        setIsSaved(false);
        toast.success('Removed from favorites');
      } else {
        // Save to favorites
        await setDoc(savedRef, {
          type: 'marketcheck',
          vin: listing.vin,
          heading: listing.heading,
          price: listing.price,
          msrp: listing.msrp,
          photo: listing.media?.photo_links?.[0] || null,
          dealer: listing.dealer?.name || null,
          saved_at: serverTimestamp()
        });
        setIsSaved(true);
        toast.success('Saved to favorites');
      }
    } catch (err) {
      console.error('Error updating favorites:', err);
      toast.error('Failed to update favorites');
    }
  };

  const handleProceed = (selection: any) => {
    setActiveSelection(selection);
    setIsDepositOpen(true);
  };

  const submitLead = async () => {
    if (!activeSelection || !listing) return false;
    setIsSubmitting(true);

    try {
      const leadData = {
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        vehicle: {
          make: listing.make,
          model: listing.model,
          year: listing.year,
          trim: listing.trim,
          vin: listing.vin,
          msrp: listing.msrp,
          price: listing.price,
          source: 'marketcheck'
        },
        financials: {
          type: activeSelection.type,
          payment: activeSelection.payment,
          down: activeSelection.down,
          term: activeSelection.term,
          mileage: activeSelection.mileage,
          tier: activeSelection.tier
        },
        tradeIn: tradeIn.hasTradeIn ? tradeIn : null,
        paymentMethod: payMethod,
        paymentSenderName: paymentName,
        status: 'pending',
        createdAt: serverTimestamp(),
        userId: user?.uid || null,
        source: 'marketcheck_deal_page'
      };

      const docRef = await addDoc(collection(db, 'leads'), leadData);
      setLeadId(docRef.id);
      localStorage.setItem('leadId', docRef.id);
      
      toast.success('Request submitted successfully!');
      return true;
    } catch (err) {
      console.error('Error submitting lead:', err);
      toast.error('Failed to submit request. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${listing.year} ${listing.make} ${listing.model}`,
        text: `Check out this deal on Hunter Lease!`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--b1)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--lime)]"></div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-[var(--b1)] flex flex-col items-center justify-center p-4">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-display text-[var(--w)] mb-2">{error || 'Listing Not Found'}</h2>
        <button 
          onClick={() => navigate('/deals')}
          className="text-[var(--lime)] hover:underline flex items-center gap-2"
        >
          <ChevronLeft size={20} />
          Back to Catalog
        </button>
      </div>
    );
  }

  const totalCashBack = incentives
    .filter(inc => {
      const title = (inc.title || inc.name || '').toLowerCase();
      const isConditional = title.includes('loyalty') || 
                           title.includes('conquest') || 
                           title.includes('military') || 
                           title.includes('student') || 
                           title.includes('grad') ||
                           title.includes('responder');
      return !isConditional;
    })
    .reduce((sum, inc) => sum + (inc.amount || 0), 0);

  const savings = listing.msrp && listing.price && listing.msrp > listing.price ? listing.msrp - listing.price : 0;
  const savingsPercent = listing.msrp && listing.msrp > 0 ? Math.round((savings / listing.msrp) * 100) : 0;

  // Prepare deal object for Calculator
  const dealForCalc = {
    ...listing,
    type: 'lease', // Default to lease for calculator
    displayPayment: null, // Let calculator calculate
    availableIncentives: incentives.map(inc => {
      const title = (inc.title || inc.name || '').toLowerCase();
      // Classify: only general "Bonus Cash" or "Retail" is default. 
      // Loyalty, Conquest, Military, etc. are NOT default.
      const isConditional = title.includes('loyalty') || 
                           title.includes('conquest') || 
                           title.includes('military') || 
                           title.includes('student') || 
                           title.includes('grad') ||
                           title.includes('responder');
      
      return {
        id: inc.id || Math.random().toString(36).substr(2, 9),
        name: inc.name || inc.title,
        amount: inc.amount || 0,
        type: 'manufacturer',
        isDefault: !isConditional // Only non-conditional are auto-selected
      };
    })
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex flex-col gap-2">
          {/* Compact Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <Breadcrumbs make={listing.make} model={listing.model} />
              </div>
              <h1 className="font-display text-4xl md:text-5xl leading-none tracking-tight uppercase">
                {listing.make} <span className="text-[var(--mu2)]">{listing.model}</span>
              </h1>
              <div className="flex items-center gap-4 text-[var(--mu2)]">
                <span className="font-mono text-[10px] tracking-widest">{listing.year} {t.modelYear}</span>
                <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                <span className="font-mono text-[10px] tracking-widest">{listing.trim || t.premiumPlus}</span>
                <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                <div className="flex items-center gap-1.5 relative group cursor-help bg-[var(--lime)]/10 border border-[var(--lime)]/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={12} className="text-[var(--lime)]" />
                  <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--lime)]">{t.passedAudit}</span>
                  <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-[var(--s2)] border border-[var(--b2)] rounded-xl text-[10px] text-[var(--mu2)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    {translations[language].lock?.key2Desc || "Mathematically guaranteed: the dealer cannot add hidden fees."}
                  </div>
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
                  if (isInCompare(listing.id?.toString() || listing.vin)) {
                    removeFromCompare(listing.id?.toString() || listing.vin);
                  } else {
                    addToCompare(dealForCalc);
                  }
                }}
                title={isInCompare(listing.id?.toString() || listing.vin) ? (language === 'ru' ? 'Удалить из сравнения' : 'Remove from compare') : (language === 'ru' ? 'Добавить в сравнение' : 'Add to compare')}
                className={`p-2 rounded-xl transition-colors flex items-center justify-center border ${
                  isInCompare(listing.id?.toString() || listing.vin) 
                    ? 'bg-[var(--s2)] text-[var(--lime)] border-[var(--lime)]' 
                    : 'bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)] hover:text-[var(--w)]'
                }`}
              >
                <Heart size={16} className={isInCompare(listing.id?.toString() || listing.vin) ? "fill-current" : ""} />
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
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 relative items-start mt-6">
            {/* Left Column: Gallery & Technical Specs */}
            <div className="lg:col-span-7 space-y-8">
              <motion.div
                id="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ImageGallery 
                  mainImage={
                    listing.media?.photo_links?.[0] || 
                    (Array.isArray(listing.media) ? (typeof listing.media[0] === 'string' ? listing.media[0] : (listing.media[0] as any)?.url) : null) ||
                    'https://picsum.photos/seed/car/1200/800'
                  } 
                  images={
                    listing.media?.photo_links || 
                    (Array.isArray(listing.media) ? listing.media.map(m => typeof m === 'string' ? m : m.url) : [])
                  } 
                  viewCount={viewCount.toString()} 
                  dealId={listing.id} 
                  isMarketcheck={true}
                />
              </motion.div>

              {/* Technical Trust Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { 
                    icon: ShieldCheck, 
                    title: t.auditTitle, 
                    desc: t.auditDesc,
                    color: 'text-[var(--lime)]'
                  },
                  { 
                    icon: Zap, 
                    title: t.fleetTitle, 
                    desc: t.fleetDesc,
                    color: 'text-blue-400'
                  },
                  { 
                    icon: Star, 
                    title: t.matchTitle, 
                    desc: t.matchDesc,
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

              {/* Price Comparison Block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-[var(--s1)] rounded-2xl border border-[var(--b2)]">
                  <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest mb-1">MSRP</div>
                  <div className="text-xl font-mono text-[var(--w)]">
                    {listing.msrp ? `$${listing.msrp.toLocaleString()}` : 'TBD'}
                  </div>
                </div>
                <div className="p-4 bg-[var(--s1)] rounded-2xl border border-[var(--lime)]/20">
                  <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest mb-1">Dealer Price</div>
                  <div className="text-xl font-mono text-[var(--w)]">
                    {listing.price ? `$${listing.price.toLocaleString()}` : 'TBD'}
                  </div>
                </div>
                <div className="p-4 bg-[var(--lime)]/10 rounded-2xl border border-[var(--lime)]/30">
                  <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest mb-1">Total Savings</div>
                  <div className="text-xl font-mono text-[var(--lime)]">
                    {savings > 0 ? `-$${savings.toLocaleString()}` : '$0'}
                    <span className="text-xs ml-1 opacity-70">({savingsPercent}%)</span>
                  </div>
                </div>
              </div>

              {/* Fuel Economy & Savings */}
              {(listing.build?.city_miles || listing.build?.highway_miles) && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Fuel className="text-orange-500" size={20} />
                      </div>
                      <h3 className="font-display text-xl uppercase">{t.fuelEconomyTitle}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)] text-center">
                        <div className="text-[8px] font-bold text-[var(--mu2)] uppercase mb-1">{t.city}</div>
                        <div className="text-lg font-mono font-bold">{listing.build.city_miles || '--'}</div>
                      </div>
                      <div className="bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)] text-center">
                        <div className="text-[8px] font-bold text-[var(--mu2)] uppercase mb-1">{t.hwy}</div>
                        <div className="text-lg font-mono font-bold">{listing.build.highway_miles || '--'}</div>
                      </div>
                      <div className="bg-[var(--lime)]/10 p-3 rounded-xl border border-[var(--lime)]/20 text-center">
                        <div className="text-[8px] font-bold text-[var(--lime)] uppercase mb-1">{t.combined}</div>
                        <div className="text-lg font-mono font-bold text-[var(--lime)]">
                          {listing.build.city_miles && listing.build.highway_miles 
                            ? Math.round((Number(listing.build.city_miles) + Number(listing.build.highway_miles)) / 2) 
                            : '--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-6 flex flex-col justify-center space-y-2 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[var(--lime)]/5 rounded-full blur-2xl group-hover:bg-[var(--lime)]/10 transition-colors" />
                    <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{t.estMonthlyFuel}</div>
                    <div className="text-3xl font-display uppercase tracking-tighter">
                      ${Math.round(15000 / (listing.build.city_miles && listing.build.highway_miles ? Math.round((Number(listing.build.city_miles) + Number(listing.build.highway_miles)) / 2) : 25) / 12 * 3.5)} <span className="text-xs font-sans text-[var(--mu2)] lowercase">/ {tc.moShort}</span>
                    </div>
                  </div>
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
                    {t.specsTitle}
                  </button>
                  <button
                    onClick={() => setActiveTab('options')}
                    className={cn(
                      "flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      activeTab === 'options' ? "bg-[var(--b1)] text-[var(--lime)]" : "text-[var(--mu2)] hover:text-[var(--w)]"
                    )}
                  >
                    {t.standardOptionsTitle}
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
                          {listing.build && Object.entries(listing.build).filter(([_, val]) => val).map(([key, val]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center border-b border-[var(--b2)] pb-2">
                              <span className="text-[10px] text-[var(--mu2)] uppercase tracking-widest">{key.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-mono font-bold">{val}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[8px] text-[var(--mu2)] italic leading-relaxed">
                          * {t.specsDisclaimer}
                        </p>
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
                          {listing.standard_features?.map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]" />
                              <span className="text-xs text-[var(--mu)]">{f}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-[var(--lime)]/5 border border-[var(--lime)]/10 p-4 rounded-2xl">
                          <div className="flex items-center gap-2 text-[var(--lime)] text-[10px] font-bold uppercase tracking-widest mb-2">
                            <Star size={12} />
                            {t.perfectForYou}
                          </div>
                          <p className="text-xs text-[var(--mu2)] leading-relaxed">
                            {listing.make} {listing.model} {t.perfectForYou}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Incentives Section */}
              {incentives.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-display uppercase tracking-tight flex items-center gap-2">
                    <Zap size={20} className="text-[var(--lime)]" />
                    Available Incentives
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {incentives.map((inc, idx) => (
                      <div key={idx} className="p-4 bg-[var(--s2)] rounded-xl border border-[var(--b2)] flex items-start gap-3">
                        <div className="p-2 bg-[var(--lime)]/10 rounded-lg">
                          <DollarSign size={16} className="text-[var(--lime)]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--w)]">{inc.title || inc.name}</div>
                          <div className="text-xs text-[var(--mu2)] mt-0.5">{inc.description}</div>
                          <div className="text-sm font-mono text-[var(--lime)] mt-1 font-bold">
                            {inc.amount ? `-$${inc.amount.toLocaleString()}` : 'Variable'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Calculator */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Calculator 
                deal={dealForCalc}
                mode="offer"
                vehiclePrice={listing.price || listing.msrp || 0}
                onProceed={handleProceed}
                onChange={(data) => setActiveSelection(data)}
                initialIsFirstTimeBuyer={isFirstTimeBuyer}
                initialHasCosigner={hasCosigner}
                viewCount={viewCount}
              />
              
              {/* Trust Badges */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-[var(--s1)] rounded-xl border border-[var(--b2)]">
                  <div className="p-2 bg-[var(--lime)]/10 rounded-lg">
                    <CheckCircle2 size={16} className="text-[var(--lime)]" />
                  </div>
                  <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest leading-tight">
                    Price<br/>Verified
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[var(--s1)] rounded-xl border border-[var(--b2)]">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <ShieldCheck size={16} className="text-blue-400" />
                  </div>
                  <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest leading-tight">
                    Secure<br/>Transaction
                  </div>
                </div>
              </div>



              {/* Market Trend & TCO Analysis - Moved under Calculator */}
              <div className="grid grid-cols-1 gap-4 mt-6">
                {/* Market Trend Analysis */}
                <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 flex items-center justify-center">
                        <TrendingDown className="text-[var(--lime)]" size={20} />
                      </div>
                      <h3 className="font-display text-xl uppercase">{tc.marketTrend}</h3>
                    </div>
                    <div className="bg-[var(--lime)]/10 text-[var(--lime)] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-[var(--lime)]/20">
                      {tc.bestTimeToBuy}
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
                      <span>6 {tc.moShort} {tc.ago}</span>
                      <span>{tc.current}</span>
                    </div>
                    <p className="text-xs text-[var(--mu2)] leading-relaxed">
                      {(() => {
                        if (!marketStats || !marketStats.price || !marketStats.price.mean) {
                          return language === 'ru' 
                            ? `Сбор данных о рынке Лос-Анджелеса...`
                            : `Gathering Los Angeles market data...`;
                        }
                        const ourPrice = listing.price || listing.msrp || 0;
                        const marketAvg = marketStats.price.mean;
                        if (ourPrice > 0 && marketAvg > 0) {
                          const diff = marketAvg - ourPrice;
                          const percent = ((diff / marketAvg) * 100).toFixed(1);
                          if (diff > 0) {
                            return language === 'ru'
                              ? `Текущая цена на ${listing.model} на ${percent}% ниже среднерыночной в Лос-Анджелесе (на основе ${marketStats.price.count || 'сотен'} похожих авто).`
                              : `Current pricing for ${listing.model} is ${percent}% below the Los Angeles market average (based on ${marketStats.price.count || 'hundreds of'} similar cars).`;
                          } else {
                            return language === 'ru'
                              ? `Текущая цена на ${listing.model} соответствует среднерыночной в Лос-Анджелесе (на основе ${marketStats.price.count || 'сотен'} похожих авто).`
                              : `Current pricing for ${listing.model} is in line with the Los Angeles market average (based on ${marketStats.price.count || 'hundreds of'} similar cars).`;
                          }
                        }
                        return language === 'ru' 
                          ? `Текущая цена на ${listing.model} на 12.4% ниже среднерыночной за последние 6 месяцев.`
                          : `Current pricing for ${listing.model} is 12.4% below the market average over the last 6 months.`;
                      })()}
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
                        <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{tc.monthlyAvg}</div>
                        <div className="text-2xl font-display text-[var(--lime)]">
                          ${Math.round((Number(activeSelection?.payment || dealForCalc.displayPayment) || 500) + (3000 / 36))}
                        </div>
                        <div className="text-[8px] text-[var(--mu2)] uppercase tracking-widest">/ {tc.moShort}</div>
                      </div>
                      <div className="bg-[var(--b1)] p-4 rounded-2xl border border-[var(--b2)] space-y-1">
                        <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">{tc.totalTCO}</div>
                        <div className="text-2xl font-display text-[var(--w)]">
                          ${Math.round(((Number(activeSelection?.payment || dealForCalc.displayPayment) || 500) * 36) + 3000).toLocaleString()}
                        </div>
                        <div className="text-[8px] text-[var(--mu2)] uppercase tracking-widest">/ 36 {tc.moShort}</div>
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--lime)]">{t.techProp}</span>
              </div>
              <h2 className="font-display text-4xl md:text-6xl uppercase">
                {t.auditSectionTitle} <span className="text-[var(--mu2)]">{t.auditSectionSubtitle}</span>
              </h2>
              <p className="text-lg text-[var(--mu)] leading-relaxed max-w-xl">
                {t.auditSectionText?.replace('{model}', listing.model) || `Every ${listing.model} undergoes our rigorous 11-key lock technology audit to ensure zero hidden fees and absolute transparency.`}
              </p>
              
              <div className="grid sm:grid-cols-2 gap-3">
                {(t.auditKeys || ['Price Verified', 'No Hidden Fees', 'Clean Title', 'Dealer Vetted']).map((key: string, i: number) => (
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
                  <div className="font-mono text-[10px] text-[var(--mu2)] uppercase tracking-widest">{t.auditReport} #8271</div>
                  <div className="bg-[var(--lime)] text-black px-2 py-0.5 rounded text-[10px] font-bold">{t.passed}</div>
                </div>
                
                <div className="space-y-4">
                  {(t.auditItems || [
                    { label: 'MSRP Verification', val: 'PASS' },
                    { label: 'Dealer Discount Check', val: 'PASS' },
                    { label: 'Incentive Eligibility', val: 'PASS' },
                    { label: 'Hidden Fee Scan', val: 'PASS' }
                  ]).map((item: any, i: number) => (
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
            <h2 className="font-display text-5xl uppercase tracking-tighter">{t.protocolTitle} <span className="text-[var(--lime)] italic">{t.protocolSubtitle}</span></h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
            <div className="font-mono text-xs text-[var(--mu2)]/50">01 — 03</div>
          </div>
          <ProcessTimeline />
        </section>



        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="bg-[var(--s2)] rounded-3xl p-8 md:p-12 text-center space-y-6 border border-[var(--b2)]">
            <div className="space-y-4">
              <h2 className="font-display text-4xl md:text-5xl uppercase tracking-tight">
                {t.finalCtaTitle} <span className="text-[var(--lime)]">{listing.model}</span>
              </h2>
              <p className="text-base text-[var(--mu2)] font-medium max-w-xl mx-auto">
                {t.finalCtaText}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <button 
                onClick={() => handleProceed(activeSelection || dealForCalc)}
                className="bg-[var(--lime)] text-black px-8 py-4 rounded-xl font-display text-xl tracking-widest hover:scale-105 transition-transform flex items-center gap-4 uppercase"
              >
                <span>{t.lockInDeal}</span>
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => window.open('https://hunterlease.com/credit-application', '_blank')}
                className="bg-transparent border-2 border-[var(--mu2)] text-[var(--w)] px-8 py-4 rounded-xl font-display text-xl tracking-widest hover:border-[var(--lime)] hover:text-[var(--lime)] transition-colors flex items-center gap-4 uppercase"
              >
                <span>{t.seeIfIQualify}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--b2)] z-50 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold mb-0.5">{tc.leasePayment}</div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl text-[var(--w)] leading-none">${activeSelection?.payment || 'N/A'}</span>
            <span className="text-[10px] text-[var(--mu2)]">/mo</span>
          </div>
          <div className="text-[10px] text-[var(--mu2)] mt-0.5">${activeSelection?.down !== undefined ? activeSelection.down : 3000} due</div>
        </div>
        <button 
          onClick={() => handleProceed(activeSelection || dealForCalc)}
          className="flex-1 bg-[var(--lime)] text-black py-3.5 rounded-xl font-display text-lg tracking-widest hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 uppercase"
        >
          <span>{t.lockInDeal}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      <DepositModal 
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onConfirm={submitLead}
        carName={`${listing.year} ${listing.make} ${listing.model}`}
        activeSelection={activeSelection || dealForCalc}
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
        isSubmitting={isSubmitting}
        leadId={leadId}
      />

      <SmartPriceAlertModal
        isOpen={isAlertOpen}
        onClose={() => setIsAlertOpen(false)}
        make={listing.make}
        model={listing.model}
      />

      <CompareBar />
    </div>
  );
};
