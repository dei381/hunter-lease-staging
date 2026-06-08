import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, HelpCircle } from 'lucide-react';
import { useLanguageStore } from '../store/languageStore';
import { useSettingsStore } from '../store/settingsStore';

interface TransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: any;
  mileage: string;
  isFirstTimeBuyer?: boolean;
  quoteResult?: any;
}

const fmt = (n: any) => {
  const num = Number(n);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
};

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
  <div className="group relative flex items-center gap-1 cursor-help">
    {children}
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center font-normal normal-case shadow-xl">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
    </div>
  </div>
);

const Divider = ({ children }: { children: React.ReactNode }) => (
  <div className="relative flex items-center py-6">
    <div className="flex-grow border-t border-gray-200"></div>
    <span className="flex-shrink-0 mx-4 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </span>
    <div className="flex-grow border-t border-gray-200"></div>
  </div>
);

export const TransparencyModal = ({ isOpen, onClose, deal, mileage, quoteResult }: TransparencyModalProps) => {
  const { language } = useLanguageStore();
  const { settings } = useSettingsStore();

  if (!deal) return null;

  // Case-robust finance detection (calculator uses lowercase 'finance'); otherwise the
  // modal mixed lease rows (residual/MF/mileage) into finance breakdowns.
  const isFinance = String(quoteResult?.quoteType || deal.displayType || deal.type || 'lease').toLowerCase() === 'finance';
  
  const msrp = quoteResult ? quoteResult.msrpCents / 100 : Number(deal.msrp) || 0;
  const totalPayment = quoteResult ? quoteResult.monthlyPaymentCents / 100 : Number(deal.displayPayment || deal.payment) || 0;
  const totalDas = quoteResult ? quoteResult.dueAtSigningCents / 100 : Number(deal.down) || 0;
  
  const taxRate = quoteResult?.taxes?.rate || ((Number(settings.taxRateDefault) || 8.875) / 100);
  
  const feesList = quoteResult?.fees ? [
    { name: 'Doc Fee', amountCents: quoteResult.fees.docFeeCents || 0 },
    { name: 'DMV Fee', amountCents: quoteResult.fees.dmvFeeCents || 0 },
    { name: 'Broker Fee', amountCents: quoteResult.fees.brokerFeeCents || 0 },
    ...(quoteResult.fees.acquisitionFeeCents ? [{ name: 'Acquisition Fee', amountCents: quoteResult.fees.acquisitionFeeCents }] : [])
  ].filter(f => f.amountCents > 0) : [
    { name: 'Registration Fee', amountCents: (Number((settings as any).dmvFee) || 480) * 100 },
    { name: 'Doc Fee', amountCents: (Number((settings as any).docFee) || 85) * 100 },
    { name: 'Acquisition Fee', amountCents: (isFinance ? 0 : 750) * 100 }
  ];

  const firstPayment = isFinance ? 0 : totalPayment;
  const term = parseInt(deal.displayTerm || deal.term) || 36;
  
  const rvPct = quoteResult ? (quoteResult.residualValueCents / 100 / msrp) : Number(deal.rv) || 0;
  const rvAmt = quoteResult ? quoteResult.residualValueCents / 100 : msrp * rvPct;
  const mf = quoteResult ? quoteResult.moneyFactor : Number(deal.mf) || 0;
  const apr = isFinance ? (quoteResult ? quoteResult.apr : (Number(deal.apr) || 0)) : 0;
  const lender = deal.lender || 'Ally Financial';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col justify-center items-center p-4 sm:p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 md:p-8 pb-4">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl text-[#1f2937] font-medium mb-4">
              Price Transparency by Hunter Lease
            </h2>
            <p className="text-[#4b5563] text-[15px] leading-relaxed max-w-[90%]">
              included. Shop with confidence knowing exactly what you'll pay, with full price transparency at every step.
            </p>
          </div>

          <div className="p-6 md:p-8 pt-0 overflow-y-auto custom-scrollbar">
            
            <Divider>YOUR {isFinance ? 'FINANCE' : 'LEASE'} (INCLUDING TAXES AND FEES)</Divider>

            {/* Monthly Payment Row */}
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-[#1f2937] text-base">Monthly payment</span>
              <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-semibold text-[#1e3a5f]">{fmt(totalPayment)}</span>
                 <span className="text-gray-500 text-[15px]">per month</span>
              </div>
            </div>

            {/* DAS Row */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-base text-[#1f2937]">
                <div className="flex items-center gap-1.5 cursor-help group relative">
                  Due at signing
                  <HelpCircle className="w-4 h-4 text-gray-400 rounded-full bg-gray-100" />
                  <div className="absolute px-3 py-2 bg-gray-900 text-white text-[11px] rounded shadow-lg bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 text-center opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                    Amount to be paid at lease signing
                  </div>
                </div>
                <span className="font-semibold">{fmt(totalDas)}</span>
              </div>

              {/* DAS Breakdown */}
              <div className="pl-6 space-y-3 text-[15px] text-gray-600">
                {!isFinance && (
                  <div className="flex justify-between items-center">
                    <span>First Monthly Payment</span>
                    <span className="font-medium text-[#1f2937]">{fmt(firstPayment)}</span>
                  </div>
                )}
                {quoteResult?.dasBreakdown?.downPaymentCents > 0 && (
                  <div className="flex justify-between items-center">
                    <span>Down Payment</span>
                    <span className="font-medium text-[#1f2937]">{fmt(quoteResult.dasBreakdown.downPaymentCents / 100)}</span>
                  </div>
                )}
                
                {quoteResult?.dasBreakdown?.upfrontTaxesCents > 0 ? (
                  <div className="flex justify-between items-center">
                    <span>Down Pmt. Tax {(taxRate * 100).toFixed(2)}%</span>
                    <span className="font-medium text-[#1f2937]">{fmt(quoteResult.dasBreakdown.upfrontTaxesCents / 100)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span>Down Pmt. Tax {(taxRate * 100).toFixed(2)}%</span>
                    <span className="font-medium text-[#1f2937]">{fmt(0)}</span>
                  </div>
                )}

                {feesList.map((fee: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{fee.name}</span>
                    <span className="font-medium text-[#1f2937]">{fmt(fee.amountCents / 100)}</span>
                  </div>
                ))}
                
                <div className="flex justify-between items-center">
                  <span>Tax On Fees</span>
                  <span className="font-medium text-[#1f2937]">{fmt(quoteResult?.taxes?.upfrontTaxCents ? (quoteResult.taxes.upfrontTaxCents/100) : 7)}</span>
                </div>
              </div>
            </div>

            <Divider>POTENTIAL REBATES AND INCENTIVES</Divider>

            <div className="space-y-4">
              <div className="flex justify-between items-baseline text-base text-[#1f2937]">
                <span>Total rebates</span>
                <span className="font-semibold">{fmt(deal.rebates || 0)}</span>
              </div>
              
              {deal?.availableIncentives?.filter((inc:any) => deal?.selectedIncentives?.includes(inc.id) || !deal.selectedIncentives).map((inc:any, i:number) => (
                 <div key={i} className="pl-6 space-y-2">
                   <div className="flex justify-between items-center text-[15px] text-gray-600">
                     <span>{inc.name}</span>
                     <span className="font-medium text-[#1f2937]">{fmt(inc.amount)}</span>
                   </div>
                   {inc.expires && (
                     <div className="inline-block bg-[#d32f2f] text-white text-[11px] px-2.5 py-1 rounded">
                       Expires on {inc.expires}
                     </div>
                   )}
                 </div>
              ))}
              
              {(!deal.availableIncentives || deal.availableIncentives.length === 0) && deal.rebates > 0 && (
                 <div className="pl-6 space-y-2">
                   <div className="flex justify-between items-center text-[15px] text-gray-600">
                     <span>Manufacturer Rebate</span>
                     <span className="font-medium text-[#1f2937]">{fmt(deal.rebates)}</span>
                   </div>
                 </div>
              )}
            </div>

            <Divider>{isFinance ? 'FINANCE CONDITIONS' : 'LEASE CONDITIONS'}</Divider>

            <div className="space-y-4 text-[15px]">
              <div className="flex justify-between items-start">
                <span className="text-[#1e3a5f] w-1/2">Term length</span>
                <span className="text-[#1f2937] w-1/2 text-right">{term} months</span>
              </div>
              {!isFinance && (
                <div className="flex justify-between items-start">
                  <span className="text-[#1e3a5f] w-1/2">Annual mileage</span>
                  <span className="text-[#1f2937] w-1/2 text-right">{mileage.replace('k', ',000')} miles</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-[#1e3a5f] w-1/2">Due At Signing Type</span>
                <span className="text-[#1f2937] w-1/2 text-right">First monthly payment + All fees (excluding Sales Tax)</span>
              </div>
              {!isFinance && (
                <div className="flex justify-between items-start">
                  <span className="text-[#1e3a5f] w-1/2">Residual value</span>
                  <span className="text-[#1f2937] w-1/2 text-right">{fmt(rvAmt)}</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-[#1e3a5f] w-1/2">Lender Name</span>
                <span className="text-[#1f2937] w-1/2 text-right">{lender}</span>
              </div>
            </div>

          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

