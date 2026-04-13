import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Heart, Tag, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';
import { auth } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

export const VehicleDetailPage = () => {
  const { trimId } = useParams<{ trimId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguageStore();
  const { toggleDeal, isSaved } = useGarageStore();
  const t = translations[language];

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

  const handleGetDeal = () => {
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={32} className="animate-spin text-[var(--lime)]" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-4">
        <p className="text-red-400">{error || 'Vehicle not found'}</p>
        <button onClick={() => navigate('/catalog')} className="px-4 py-2 bg-[var(--lime)] text-black rounded-lg text-sm font-bold">
          Back to Catalog
        </button>
      </div>
    );
  }

  const msrp = vehicle.msrpCents / 100;
  const totalIncentives = (vehicle.incentives || []).reduce((s: number, i: any) => s + i.amountCents, 0) / 100;
  const sellingPrice = msrp - totalIncentives;

  return (
    <>
      <SEO
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} | AutoBandit`}
        description={`Lease or finance a ${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}. MSRP ${fmt(msrp)}. Verified pricing, no hidden fees.`}
      />

      <div className="min-h-screen bg-[var(--bg)]">
        {/* Top bar */}
        <div className="border-b border-[var(--b1)] bg-[var(--s1)]">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigate('/catalog')} className="flex items-center gap-2 text-[var(--mu)] hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
              Back to Catalog
            </button>
            <button
              onClick={() => toggleDeal(trimId || '')}
              className="p-2 rounded-full hover:bg-[var(--s2)] transition-colors"
            >
              <Heart size={18} className={isSaved(trimId || '') ? "fill-[var(--lime)] text-[var(--lime)]" : "text-[var(--mu)]"} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Vehicle Info */}
            <div>
              {/* Image */}
              <div className="aspect-video bg-[var(--s1)] rounded-2xl overflow-hidden mb-6">
                {vehicle.imageUrl ? (
                  <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[var(--mu2)] text-sm uppercase font-bold tracking-widest">No Image</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-2">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-[var(--mu)] text-sm uppercase font-bold tracking-widest mb-6">{vehicle.trim}</p>

              {/* Price block */}
              <div className="bg-[var(--s1)] border border-[var(--b1)] rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <span className="text-xs text-[var(--mu)] uppercase tracking-wider">MSRP</span>
                    <div className={cn("text-2xl font-bold", totalIncentives > 0 && "line-through text-[var(--mu)]")}>{fmt(msrp)}</div>
                  </div>
                  {totalIncentives > 0 && (
                    <div className="text-right">
                      <span className="text-xs text-[var(--grn)] uppercase tracking-wider">Your Price</span>
                      <div className="text-2xl font-bold text-[var(--grn)]">{fmt(sellingPrice)}</div>
                    </div>
                  )}
                </div>

                {/* Incentives list */}
                {vehicle.incentives && vehicle.incentives.length > 0 && (
                  <div className="border-t border-[var(--b1)] pt-4">
                    <h3 className="text-xs text-[var(--mu)] uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                      <Tag size={12} />
                      Available Incentives
                    </h3>
                    <div className="space-y-2">
                      {vehicle.incentives.map((inc: any) => (
                        <div key={inc.id} className="flex justify-between items-center text-sm">
                          <span className="text-white">{inc.name}</span>
                          <span className="text-[var(--grn)] font-bold">−{fmt(inc.amountCents / 100)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-[var(--b1)] mt-3 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-[var(--lime)]">Total Savings</span>
                      <span className="text-lg font-bold text-[var(--lime)]">−{fmt(totalIncentives)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Trust */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2 bg-[var(--s1)] border border-[var(--b1)] rounded-xl px-3 py-2 text-xs">
                  <ShieldCheck size={14} className="text-[var(--lime)]" />
                  Verified Pricing
                </div>
                <div className="flex items-center gap-2 bg-[var(--s1)] border border-[var(--b1)] rounded-xl px-3 py-2 text-xs">
                  <Info size={14} className="text-blue-400" />
                  No Hidden Fees
                </div>
              </div>
            </div>

            {/* Right: Calculator */}
            <div>
              <div className="sticky top-4">
                <div className="bg-[var(--s1)] border border-[var(--b1)] rounded-2xl p-6 mb-4">
                  <h2 className="font-display text-xl mb-4">Calculate Your Payment</h2>
                  <Calculator
                    deal={dealForCalc}
                    onChange={handleCalculatorChange}
                    mode="offer"
                  />
                </div>

                {/* CTA */}
                <button
                  onClick={handleGetDeal}
                  className="w-full py-4 bg-[var(--lime)] text-black font-bold text-lg rounded-2xl hover:brightness-110 transition-all"
                >
                  Get This Deal →
                </button>
              </div>
            </div>
          </div>

          {/* Bottom sections */}
          <div className="mt-12 space-y-12">
            <ProcessTimeline />
            <TrustSection />
            <FAQ />
          </div>
        </div>
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
    </>
  );
};
