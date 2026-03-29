import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Clock, Info, Share2, Heart, MessageCircle } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export const AutoBanditHero = () => {
  const [activeTab, setActiveTab] = useState<'lease' | 'finance'>('lease');
  const [incentives, setIncentives] = useState(true);
  const [zipCode, setZipCode] = useState('90210');
  const [creditTier, setCreditTier] = useState('Super Elite');
  const [term, setTerm] = useState(24);
  const [mileage, setMileage] = useState('10k');
  const [das, setDas] = useState(2035);
  
  const [quoteResult, setQuoteResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const debouncedDas = useDebounce(das, 500);
  const debouncedTerm = useDebounce(term, 500);
  const debouncedMileage = useDebounce(mileage, 500);
  const debouncedZipCode = useDebounce(zipCode, 500);
  const debouncedCreditTier = useDebounce(creditTier, 500);

  const vehicleInfo = {
    make: 'Hyundai',
    model: 'Elantra',
    trim: 'SE',
    year: 2026
  };

  useEffect(() => {
    const fetchQuote = async () => {
      setIsCalculating(true);
      try {
        const response = await fetch('/api/v2/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...vehicleInfo,
            zipCode: debouncedZipCode,
            quoteType: activeTab.toUpperCase(),
            term: debouncedTerm,
            mileage: parseInt(debouncedMileage) * 1000,
            creditTier: debouncedCreditTier === 'Super Elite' ? 't1' : 't2',
            isFirstTimeBuyer: false,
            downPaymentCents: debouncedDas * 100,
            tradeInEquityCents: 0
          })
        });
        if (response.ok) {
          const data = await response.json();
          setQuoteResult(data);
        }
      } catch (err) {
        console.error('Failed to fetch quote', err);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchQuote();
  }, [activeTab, debouncedZipCode, debouncedCreditTier, debouncedTerm, debouncedMileage, debouncedDas]);

  const displayPayment = useMemo(() => {
    if (isCalculating) return '...';
    if (!quoteResult) return '---';
    return activeTab === 'lease' 
      ? Math.round(quoteResult.leasePaymentCents / 100)
      : Math.round(quoteResult.financePaymentCents / 100);
  }, [quoteResult, isCalculating, activeTab]);

  return (
    <div className="bg-white min-h-screen font-sans text-[#1A1A1A]">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
        <span>HOME</span> <ChevronRight size={10} />
        <span>DEALS</span> <ChevronRight size={10} />
        <span className="text-gray-900">HYUNDAI ELANTRA</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-[1.2fr,0.8fr] gap-8 pb-20">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="relative bg-[#F8F9FA] rounded-sm overflow-hidden border border-gray-100 aspect-[16/10] flex items-center justify-center">
            {/* Best Deal Ribbon */}
            <div className="absolute top-12 right-[-40px] bg-[#E63946] text-white px-20 py-2 transform rotate-45 shadow-lg z-10">
              <span className="font-display text-2xl font-bold italic">Best Deal</span>
            </div>
            
            {/* Refer & Earn Tab */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#37B24D] text-white px-3 py-6 rounded-r-xl flex flex-col items-center gap-2 z-10 cursor-pointer hover:bg-[#2E9640] transition-colors">
               <span className="[writing-mode:vertical-lr] rotate-180 font-bold text-xs tracking-widest">REFER & EARN $200</span>
            </div>

            <img 
              src="https://images.unsplash.com/photo-1707328905904-866468758807?auto=format&fit=crop&q=80&w=1200" 
              alt="Hyundai Elantra" 
              className="w-full h-full object-contain p-8"
              referrerPolicy="no-referrer"
            />

            <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[11px] font-bold text-gray-600 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              2453 views last 24H
            </div>

            <div className="absolute bottom-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
               <Share2 size={20} />
            </div>
          </div>

          {/* Thumbnails */}
          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`aspect-video bg-gray-50 border rounded-sm overflow-hidden cursor-pointer hover:border-blue-500 transition-colors ${i === 1 ? 'border-blue-500' : 'border-gray-200'}`}>
                <img 
                  src={`https://picsum.photos/seed/elantra${i}/200/120`} 
                  alt={`Thumbnail ${i}`} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-400 italic">
            <Info size={12} />
            Images are generic and may not be representative of paint color or selected options
          </div>
          <div className="text-[11px] font-bold text-gray-500">Deal ID: 286877</div>
        </div>

        {/* Right Column: Details & Pricing */}
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-4xl font-display font-medium text-[#002C5F]">Hyundai Elantra lease</h1>
              <div className="text-lg text-gray-500 font-medium">2026 SE IVT</div>
              <div className="text-sm text-gray-400">MSRP $24,480</div>
            </div>
            <div className="flex flex-col items-center">
               <div className="w-20 h-20 rounded-full border-4 border-gray-100 flex flex-col items-center justify-center relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#E9ECEF" strokeWidth="4" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#002C5F" strokeWidth="4" strokeDasharray="226" strokeDashoffset="60" />
                  </svg>
                  <div className="text-[9px] font-bold text-gray-400 uppercase leading-none">TIME LEFT</div>
                  <div className="text-[11px] font-bold text-gray-900">1 day 7 hours</div>
               </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-[#E9ECEF] p-1 rounded-sm">
            <button 
              onClick={() => setActiveTab('lease')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'lease' ? 'bg-white text-[#002C5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              LEASE
            </button>
            <button 
              onClick={() => setActiveTab('finance')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white text-[#002C5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              FINANCE
            </button>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-2 border border-gray-200 rounded-sm overflow-hidden">
            <div className="p-4 border-r border-b border-gray-200 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TERM LENGTH</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Best - {term} months</span>
                <ChevronRight size={14} className="rotate-90 text-gray-400" />
              </div>
            </div>
            <div className="p-4 border-b border-gray-200 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ANNUAL MILEAGE</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{mileage.replace('k', ',000')} mi</span>
                <ChevronRight size={14} className="rotate-90 text-gray-400" />
              </div>
            </div>
            <div className="p-4 border-r border-gray-200 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CREDIT TIER</div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold">{creditTier}</span>
                  <span className="text-[10px] text-gray-400">{creditTier === 'Super Elite' ? '740+' : '700-739'}</span>
                </div>
                <ChevronRight size={14} className="rotate-90 text-gray-400" />
              </div>
            </div>
            <div className="p-4 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">DUE AT SIGNING</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">${das.toLocaleString()}</span>
                <ChevronRight size={14} className="rotate-90 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Incentives Toggle */}
          <div className="flex bg-[#E9ECEF] p-1 rounded-sm">
            <button 
              onClick={() => setIncentives(false)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${!incentives ? 'bg-white text-[#002C5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              WITHOUT INCENTIVES
            </button>
            <button 
              onClick={() => setIncentives(true)}
              className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${incentives ? 'bg-white text-[#002C5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              WITH INCENTIVES*
            </button>
          </div>

          {/* Incentives Box */}
          <div className="bg-[#F0F7FF] border border-[#D0E7FF] p-6 rounded-sm flex items-center justify-between">
            <div className="text-sm font-bold text-[#002C5F] text-center flex-1">
               $3,500 savings with 3 incentives applied
            </div>
            <button className="bg-[#002C5F] text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#001F44] transition-colors">
              <Share2 size={12} className="rotate-90" />
              UPDATE INCENTIVES
            </button>
          </div>

          {/* Final Pricing */}
          <div className="pt-6 space-y-4">
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <div className="text-xl font-bold text-[#002C5F] flex items-center gap-2">
                  $ LEASE IT NOW
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  Monthly payment <Info size={12} className="text-gray-400" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700 font-bold">
                  <span className="w-4 h-4 bg-[#002C5F] rounded-sm flex items-center justify-center text-[8px] text-white">H</span>
                  Hyundai Motor Finance
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-6xl font-medium text-[#002C5F]">${displayPayment}</span>
                  <span className="text-gray-400 font-medium">per month</span>
                </div>
                <div className="text-xs text-gray-500 font-medium flex items-center justify-end gap-1">
                  (+ ${das.toLocaleString()} due at signing) <Info size={12} className="text-gray-400" />
                </div>
              </div>
            </div>

            <button className="w-full bg-[#E63946] text-white py-5 rounded-full text-lg font-bold uppercase tracking-widest hover:bg-[#D62828] transition-all shadow-lg shadow-red-200">
              LEASE IT NOW
            </button>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
        <div className="bg-[#E63946] p-4 flex items-center gap-3">
          <div className="relative">
            <img src="https://picsum.photos/seed/cindy/100/100" className="w-12 h-12 rounded-full border-2 border-white" alt="Cindy" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="text-white">
            <div className="font-bold">Talk with Cindy</div>
            <div className="text-[10px] opacity-80 uppercase font-bold tracking-widest">Online</div>
          </div>
        </div>
        <div className="p-4 h-80 overflow-y-auto bg-[#F8F9FA] space-y-4">
          <div className="bg-white p-3 rounded-2xl rounded-tl-none text-xs text-gray-700 shadow-sm border border-gray-100 max-w-[85%]">
            Hi Azat, I'm Cindy. I'm here to help you find the best car deal that's easy, clear, and stress free. Just tell me what you're looking for and I'll handle the rest.
          </div>
          <div className="bg-white p-3 rounded-2xl rounded-tl-none text-xs text-gray-700 shadow-sm border border-gray-100 max-w-[85%]">
            Hello Azat, I see you were recently looking at a Hyundai Elantra Hybrid Blue and a Toyota Corolla Hybrid LE. I can certainly help you find a great deal on a vehicle. Want me to start?
          </div>
          <div className="flex justify-end">
            <div className="bg-blue-50 p-3 rounded-2xl rounded-tr-none text-xs text-blue-900 shadow-sm border border-blue-100 max-w-[85%]">
              Hello!
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center gap-2">
          <input type="text" placeholder="Type your message..." className="flex-1 text-xs outline-none" />
          <MessageCircle size={18} className="text-gray-400 cursor-pointer" />
        </div>
      </div>
    </div>
  );
};
