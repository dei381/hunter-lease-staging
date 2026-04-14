import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { SEO } from '../components/SEO';
import { Calculator } from '../components/Calculator';
import { DepositModal } from '../components/DepositModal';
import { ProcessTimeline } from '../components/ProcessTimeline';
import { TrustSection } from '../components/TrustSection';
import { FAQ } from '../components/FAQ';
import { CompareBar } from '../components/CompareBar';
import { useLanguageStore } from '../store/languageStore';
import { useGarageStore } from '../store/garageStore';
import { translations } from '../translations';
import { ArrowLeft, ArrowRight, Heart, Tag, ShieldCheck, Zap, Star, Info, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const VehicleDetailPage = () => {
  const { trimId } = useParams<{ trimId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { toggleDeal, isSaved, addToCompare, removeFromCompare, isInCompare } = useGarageStore();
  const t = translations[language];
  const td = t.dealPage;

  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Deposit modal state
  const [clientInfo, setClientInfo] = useState({ name: '', email: '', phone: '', tcpaConsent: false, termsConsent: false });
  const [tradeIn, setTradeIn] = useState({ hasTradeIn: false, make: '', model: '', year: '', mileage: '', vin: '', hasLoan: false, payoff: '' });
  const [payMethod, setPayMethod] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (!trimId) return;
    setLoading(true);
    fetch(`/api/v2/catalog/${trimId}`)
      .then(res => {
        if (!res.ok) throw new Error('Vehicle not found');
        return res.json();
      })
      .then(data => {
        setVehicle(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [trimId]);

  // Build deal object for Calculator auto-fill
  const dealForCalc = vehicle ? {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    year: vehicle.year,
    msrp: vehicle.msrpCents / 100,
    mf: vehicle.baseMF || 0,
    baseAPR: vehicle.baseAPR || 0,
    rv36: vehicle.rv36 || 0,
    image: vehicle.imageUrl,
    type: 'lease',
    availableIncentives: (vehicle.incentives || []).map((inc: any) => ({
      id: inc.id,
      name: inc.name,
      amount: inc.amountCents / 100,
      type: inc.type,
      isDefault: true
    })),
  } : null;

  const handleCalculatorChange = useCallback((data: any) => {
    setSelectedConfig(data);
  }, []);

  const handleProceed = (config: any) => {
    setSelectedConfig(config);
    setIsDepositOpen(true);
  };

  const submitLead = async () => {
    if (!vehicle) return false;
    setIsSubmitting(true);
    try {
      const payload = {
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone,
        userId: auth.currentUser?.uid || null,
        payMethod,
        paymentName,
        status: 'new',
        legalConsent: { tcpa: clientInfo.tcpaConsent, terms: clientInfo.termsConsent },
        tradeIn: tradeIn.hasTradeIn ? tradeIn : null,
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          trim: vehicle.trim,
          msrp: vehicle.msrpCents / 100,
        },
        calc: {
          type: selectedConfig?.type || 'lease',
          payment: selectedConfig?.payment || 0,
          down: selectedConfig?.down || 0,
          term: selectedConfig?.term || '36 mo',
          tier: selectedConfig?.tier || 'Tier 1',
          mileage: selectedConfig?.mileage || '10k'
        },
        source: 'catalog_vehicle',
        client: { ...clientInfo, payMethod, paymentName },
        car: { make: vehicle.make, model: vehicle.model, year: vehicle.year, trim: vehicle.trim, msrp: vehicle.msrpCents / 100 }
      };

      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to submit lead');
      const { leadId: newLeadId } = await response.json();
      setLeadId(newLeadId.toString());
      localStorage.setItem('leadId', newLeadId.toString());
      return true;
    } catch (e) {
      console.error('Lead error:', e);
      toast.error('Failed to submit. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--lime)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-[var(--bg)] pt-32 pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-4xl mb-4 text-[var(--w)] uppercase">{td?.dealNotFound || 'Vehicle Not Found'}</h1>
          <button onClick={() => navigate('/catalog')} className="text-[var(--lime)] hover:underline font-bold uppercase tracking-widest text-xs">
            {language === 'ru' ? 'Назад к каталогу' : 'Back to Catalog'}
          </button>
        </div>
      </div>
    );
  }

  const msrp = vehicle.msrpCents / 100;
  const totalIncentives = (vehicle.incentives || []).reduce((s: number, i: any) => s + i.amountCents, 0) / 100;
  const sellingPrice = msrp - totalIncentives;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--w)] pb-32 lg:pb-20 selection:bg-[var(--lime)] selection:text-black">
      <SEO
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} | AutoBandit`}
        description={`Lease or finance a ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}. MSRP ${fmt(msrp)}. Verified pricing, no hidden fees.`}
        ogImage={vehicle.imageUrl}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex flex-col gap-2">
          {/* Compact Header Area */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-1">
            <div className="space-y-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-1 text-[10px] text-[var(--mu2)] uppercase tracking-widest">
                <button onClick={() => navigate('/catalog')} className="hover:text-[var(--lime)] transition-colors flex items-center gap-1">
                  <ArrowLeft size={12} />
                  {language === 'ru' ? 'Каталог' : 'Catalog'}
                </button>
                <span>/</span>
                <span>{vehicle.make}</span>
                <span>/</span>
                <span className="text-[var(--w)]">{vehicle.model}</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl leading-none tracking-tight uppercase">
                {vehicle.make} <span className="text-[var(--mu2)]">{vehicle.model}</span>
              </h1>
              <div className="flex items-center gap-4 text-[var(--mu2)]">
                <span className="font-mono text-[10px] tracking-widest">{vehicle.year} {td?.modelYear || 'Model Year'}</span>
                <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                <span className="font-mono text-[10px] tracking-widest">{vehicle.trim}</span>
                <div className="w-1 h-1 rounded-full bg-[var(--b2)]" />
                <div className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-[var(--lime)]" />
                  <span className="font-mono text-[10px] tracking-widest">{td?.passedAudit || 'Verified'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isInCompare(trimId || '')) removeFromCompare(trimId || '');
                  else addToCompare(vehicle);
                }}
                className={`p-2 rounded-xl transition-colors flex items-center justify-center border ${
                  isInCompare(trimId || '')
                    ? 'bg-[var(--s2)] text-[var(--lime)] border-[var(--lime)]'
                    : 'bg-transparent text-[var(--mu2)] border-[var(--b2)] hover:border-[var(--mu)] hover:text-[var(--w)]'
                }`}
              >
                <Heart size={16} className={isInCompare(trimId || '') ? "fill-current" : ""} />
              </button>
            </div>
          </div>

          {/* Sticky Navigation */}
          <div className="sticky top-[var(--nh)] z-40 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--b2)] py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
            <nav className="flex items-center gap-4 overflow-x-auto no-scrollbar">
              {[
                { id: 'gallery', label: language === 'ru' ? 'Фото' : 'Photo' },
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
            {/* Left Column: Photo & Vehicle Info */}
            <div className="lg:col-span-7 space-y-8">
              {/* Image */}
              <motion.div
                id="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative aspect-video bg-[var(--s1)] rounded-2xl overflow-hidden border border-[var(--b2)]">
                  {vehicle.imageUrl ? (
                    <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[var(--mu2)] text-sm uppercase font-bold tracking-widest">No Image</span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Technical Trust Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: ShieldCheck,
                    title: td?.auditTitle || 'Verified Deal',
                    desc: td?.auditDesc || 'Every number has been independently verified.',
                    color: 'text-[var(--lime)]'
                  },
                  {
                    icon: Zap,
                    title: td?.fleetTitle || 'Fleet Pricing',
                    desc: td?.fleetDesc || 'Access to dealer fleet and volume discounts.',
                    color: 'text-blue-400'
                  },
                  {
                    icon: Star,
                    title: td?.matchTitle || 'Best Match',
                    desc: td?.matchDesc || 'AI-matched to your requirements and budget.',
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

              {/* Pricing & Incentives Block */}
              <div className="bg-[var(--s2)] border border-[var(--b2)] rounded-3xl p-8 space-y-6">
                <h3 className="font-display text-2xl uppercase tracking-tighter">
                  {language === 'ru' ? 'Цена и скидки' : 'Pricing & Incentives'}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--b1)] p-4 rounded-2xl border border-[var(--b2)] space-y-1">
                    <div className="text-[10px] font-bold text-[var(--mu2)] uppercase tracking-widest">MSRP</div>
                    <div className={cn("text-2xl font-display", totalIncentives > 0 ? "line-through text-[var(--mu)]" : "text-[var(--w)]")}>{fmt(msrp)}</div>
                  </div>
                  {totalIncentives > 0 && (
                    <div className="bg-[var(--lime)]/10 p-4 rounded-2xl border border-[var(--lime)]/20 space-y-1">
                      <div className="text-[10px] font-bold text-[var(--lime)] uppercase tracking-widest">
                        {language === 'ru' ? 'Ваша цена' : 'Your Price'}
                      </div>
                      <div className="text-2xl font-display text-[var(--lime)]">{fmt(sellingPrice)}</div>
                    </div>
                  )}
                </div>

                {/* Incentives list */}
                {vehicle.incentives && vehicle.incentives.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest flex items-center gap-2">
                      <Tag size={12} className="text-[var(--lime)]" />
                      {language === 'ru' ? 'Доступные скидки' : 'Available Incentives'}
                    </h4>
                    {vehicle.incentives.map((inc: any) => (
                      <div key={inc.id} className="flex justify-between items-center bg-[var(--b1)] p-3 rounded-xl border border-[var(--b2)]">
                        <span className="text-xs text-[var(--w)]">{inc.name}</span>
                        <span className="text-[var(--grn)] font-bold text-sm font-mono">−{fmt(inc.amountCents / 100)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center border-t border-[var(--b2)] pt-3">
                      <span className="text-sm font-bold text-[var(--lime)]">
                        {language === 'ru' ? 'Итого экономия' : 'Total Savings'}
                      </span>
                      <span className="text-lg font-bold text-[var(--lime)] font-mono">−{fmt(totalIncentives)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Calculator (sticky) */}
            <div id="calculator" className="lg:col-span-5 relative scroll-mt-24">
              <div className="sticky top-[calc(var(--nh)+3rem)] self-start z-30 space-y-6">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Calculator
                    deal={dealForCalc}
                    onChange={handleCalculatorChange}
                    onProceed={handleProceed}
                    mode="offer"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Page Journey */}
      <div className="mt-32 space-y-32">
        {/* Process */}
        <section id="process" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
          <div className="flex items-center gap-4 mb-24">
            <h2 className="font-display text-5xl uppercase tracking-tighter">
              {td?.protocolTitle || 'Our'} <span className="text-[var(--lime)] italic">{td?.protocolSubtitle || 'Process'}</span>
            </h2>
            <div className="flex-1 h-px bg-[var(--b2)]" />
          </div>
          <ProcessTimeline />
        </section>

        {/* FAQ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <FAQ />
        </section>

        {/* Final CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="bg-[var(--s2)] rounded-3xl p-12 md:p-24 text-center space-y-8 border border-[var(--b2)]">
            <div className="space-y-4">
              <h2 className="font-display text-5xl md:text-8xl uppercase tracking-tight">
                {td?.finalCtaTitle || 'Get Your'} <span className="text-[var(--lime)]">{vehicle.model}</span>
              </h2>
              <p className="text-lg text-[var(--mu2)] font-medium max-w-xl mx-auto">
                {td?.finalCtaText || 'Lock in your deal today with a verified, transparent payment.'}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-8">
              <button
                onClick={() => handleProceed(selectedConfig || dealForCalc)}
                className="bg-[var(--lime)] text-black px-12 py-6 rounded-xl font-display text-2xl tracking-widest hover:scale-105 transition-transform flex items-center gap-4 uppercase"
              >
                <span>{td?.lockInDeal || 'Lock In This Deal'}</span>
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg)]/95 backdrop-blur-md border-t border-[var(--b2)] z-50 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col">
          <div className="text-[10px] text-[var(--mu2)] uppercase tracking-widest font-bold mb-0.5">
            {selectedConfig?.type === 'finance' ? (language === 'ru' ? 'Кредит' : 'Finance') : (language === 'ru' ? 'Лизинг' : 'Lease')}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl text-[var(--w)] leading-none">{selectedConfig?.payment ? fmt(selectedConfig.payment) : '—'}</span>
            <span className="text-[10px] text-[var(--mu2)]">/mo</span>
          </div>
        </div>
        <button
          onClick={() => handleProceed(selectedConfig || dealForCalc)}
          className="flex-1 bg-[var(--lime)] text-black py-3.5 rounded-xl font-display text-lg tracking-widest hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 uppercase"
        >
          <span>{td?.lockInDeal || 'Lock In Deal'}</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onConfirm={submitLead}
        isSubmitting={isSubmitting}
        carName={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`}
        activeSelection={selectedConfig || { make: vehicle.make, model: vehicle.model, year: vehicle.year, trim: vehicle.trim, msrp }}
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

      <CompareBar />
    </div>
  );
};
