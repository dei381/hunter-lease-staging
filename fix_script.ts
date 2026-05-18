import fs from 'fs';
const content = fs.readFileSync('src/components/Calculator.tsx', 'utf8');

// 1. Add Deal Insights State
let newContent = content.replace(
  "const [isIncentivesModalOpen, setIsIncentivesModalOpen] = useState(false);",
  "const [isIncentivesModalOpen, setIsIncentivesModalOpen] = useState(false);\n  const [isInsightsOpen, setIsInsightsOpen] = useState(false);"
);

// 2. Remove Wizard Step classes
newContent = newContent.replace(/ isMobile && wizardStep !== 0 && "hidden"/g, '""');
newContent = newContent.replace(/ isMobile && wizardStep !== 1 && "hidden"/g, '""');
newContent = newContent.replace(/ isMobile && wizardStep !== 2 && "hidden"/g, '""');

// 3. Lease/Finance Tabs to Pill
newContent = newContent.replace(
  /{key: 'lease_finance_replace', target: \`.*?\`}/, // Fake regex just to show intent
  ''
);

const leaseFinanceTarget = `{/* Lease/Finance Toggle - Full Width */}
        <div className="flex border-b border-[var(--b2)]">
          {(['lease', 'finance'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setCalcType(m);
                setTerm(m === 'finance' ? 60 : 36);
              }}
              className={cn(
                "flex-1 py-3 text-[10px] font-bold tracking-widest transition-all uppercase border-r last:border-r-0 border-[var(--b2)]",
                calcType === m 
                  ? "bg-[var(--lime)] text-black" 
                  : "text-[var(--mu2)] hover:text-[var(--w)] bg-[var(--s2)]"
              )}
            >
              {m === 'lease' ? t.lease : t.finance}
            </button>
          ))}
        </div>`;

const leaseFinanceReplacement = `{/* Lease/Finance Toggle - Pill Style */}
        <div className="pt-4 px-4 sm:px-5">
          <div className="flex bg-[#e2e8f0]/10 p-1 rounded-xl w-full border border-[var(--b2)]">
            {(['lease', 'finance'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setCalcType(m);
                  setTerm(m === 'finance' ? 60 : 36);
                }}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold tracking-widest transition-all uppercase rounded-lg",
                  calcType === m 
                    ? "bg-white text-black shadow-sm" 
                    : "text-[var(--w)]/60 hover:text-[var(--w)]"
                )}
              >
                {m === 'lease' ? t.lease : t.finance}
              </button>
            ))}
          </div>
        </div>`;

newContent = newContent.replace(leaseFinanceTarget, leaseFinanceReplacement);

// 4. Change Parameters Grid Styles
const gridTarget = `className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 order-2 sm:order-1", "")}`;
const gridReplacement = `className="grid grid-cols-2 md:grid-cols-4 gap-0 border-y border-[var(--b2)] divide-x divide-[var(--b2)] mt-2"`;
newContent = newContent.replace(gridTarget, gridReplacement);

// Replace individual parameter fields styling
newContent = newContent.replace(/bg-\[var\(--s2\)\] rounded-xl border border-\[var\(--b2\)\] hover:border-\[var\(--b3\)\] transition-all group p-2\.5/g, 'p-4 group hover:bg-white/5 transition-colors border-b md:border-b-0 border-[var(--b2)] relative');

// 5. Replace Results Block Style (Big Call To Action)
const resultsTarget = `{/* Results Block & CTA */}
          <div className={cn("p-4 sm:p-5 bg-[var(--s2)] rounded-xl border border-[var(--lime)]/30 shadow-[0_0_20px_rgba(204,255,0,0.05)] order-1 sm:order-2", "")}>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[var(--w)]">
                  <Zap size={16} className="text-[var(--lime)]" />
                  <span className="text-sm font-display uppercase tracking-widest">{t.lockIn}</span>
                </div>
              </div>

              <div className="text-right">
                {quoteStatus === 'NO_PROGRAMS' ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-display text-[var(--mu1)] leading-none">Estimate Unavailable</span>
                    <span className="text-[10px] text-[var(--mu2)] max-w-[150px] text-right">No lender programs found for this configuration.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-end gap-1.5">
                      <span className={cn(
                        "text-4xl sm:text-5xl font-display text-[var(--lime)] leading-none transition-opacity duration-300",
                        isCalculating ? "opacity-50" : "opacity-100"
                      )}>
                        {fmt(calculatedPayment)}
                      </span>
                      <span className="text-[10px] text-[var(--mu2)] font-bold uppercase tracking-widest">/mo</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <div className="text-[10px] text-[var(--mu2)]">
                        (+{fmt(down)} due)
                      </div>
                      <button 
                        onClick={() => setIsTransparencyOpen(true)}
                        className="flex items-center gap-1 text-[9px] font-bold text-[var(--lime)] uppercase tracking-widest hover:underline"
                      >
                        <Eye size={10} />
                        {translations[language].transparency.btnTransparency}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {!isCalibrator && (
              <div className="space-y-2 mt-4">
                <button 
                  onClick={() => currentCar && onProceed?.({ 
                    ...currentCar, 
                    payment: calculatedPayment, 
                    type: calcType, 
                    down, 
                    term: \`\${term} mo\`, 
                    tier, 
                    mileage,
                    source: isCustomCar ? 'custom_calculator' : 'catalog_deal'
                  })}
                  className="w-full bg-[var(--lime)] hover:bg-[var(--lime2)] text-black py-3 sm:py-4 rounded-xl text-base font-display tracking-widest uppercase transition-all flex items-center justify-center gap-2 group relative overflow-hidden shadow-[0_0_20px_rgba(204,255,0,0.2)] hover:shadow-[0_0_40px_rgba(204,255,0,0.4)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                  <span className="relative z-10">{isCustomCar ? (language === 'ru' ? 'Отправить заявку дилерам' : 'Submit Request to Dealers') : t.lockIn}</span>
                  <Zap size={18} fill="currentColor" className="relative z-10" />
                </button>
                <div className="text-center">
                  <span className="text-[9px] text-[var(--mu2)] uppercase tracking-widest font-bold">
                    {language === 'ru' ? 'Возвращаемый депозит $95 на следующем шаге' : 'Fully refundable $95 deposit on the next step'}
                  </span>
                </div>
              </div>
            )}
          </div>`;

const resultsReplacement = `{/* Big Price CTA Block */}
          <div className="mt-8 border-y-2 border-[var(--b2)] bg-[var(--s2)] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 order-1">
             <div className="flex flex-col items-center md:items-start text-center md:text-left w-full md:w-auto">
                <div className="text-xs font-bold uppercase tracking-widest text-[#e71a33] mb-2 flex items-center gap-2">
                   <Zap size={14} /> LEASE IT NOW
                </div>
                {quoteStatus === 'NO_PROGRAMS' ? (
                  <div className="text-xl font-display text-[var(--mu2)]">Estimate Unavailable</div>
                ) : (
                  <div className="flex flex-col md:flex-row items-baseline gap-2">
                     <span className={cn(
                       "text-6xl sm:text-8xl font-display text-white leading-none tracking-tighter transition-opacity duration-300",
                       isCalculating ? "opacity-50" : "opacity-100"
                     )}>
                       {fmt(calculatedPayment)}
                     </span>
                     <div className="flex flex-col justify-end pb-2 gap-1 text-[var(--mu2)]">
                        <span className="text-sm font-mono tracking-widest">per month</span>
                        <div className="text-xs uppercase flex items-center gap-1 justify-center md:justify-start">
                           (+{fmt(down)} due at signing)
                           <button onClick={() => setIsTransparencyOpen(true)} className="hover:text-white transition-colors cursor-pointer"><Info size={12} /></button>
                        </div>
                     </div>
                  </div>
                )}
             </div>

             {!isCalibrator && (
                <div className="w-full md:w-auto shrink-0 flex items-center justify-center">
                  <button 
                    onClick={() => currentCar && onProceed?.({ 
                      ...currentCar, payment: calculatedPayment, type: calcType, down, term: \`\${term} mo\`, tier, mileage, source: isCustomCar ? 'custom_calculator' : 'catalog_deal'
                    })}
                    className="w-full md:w-[280px] h-[64px] bg-[#e71a33] text-white font-display text-lg tracking-widest uppercase rounded-full hover:bg-red-600 shadow-[0_4px_14px_0_rgba(231,26,51,0.39)] transition-all flex items-center justify-center relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-2">{isCustomCar ? 'Submit Request' : 'Lease It Now'}</span>
                  </button>
                </div>
             )}
          </div>`;

newContent = newContent.replace(resultsTarget, resultsReplacement);

// 6. Restrict Incentives Visuals to pill style
const incentivesTarget = `              <div className="flex p-1 bg-[var(--s2)] rounded-xl border border-[var(--b2)]">
                <button
                  onClick={() => setShowIncentives(false)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    !showIncentives ? "bg-[var(--lime)] text-white" : "text-[var(--mu2)] hover:text-[var(--w)]"
                  )}
                >
                  {t.withoutIncentives}
                </button>
                <button
                  onClick={() => setShowIncentives(true)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    showIncentives ? "bg-[var(--lime)] text-white" : "text-[var(--mu2)] hover:text-[var(--w)]"
                  )}
                >
                  {t.withIncentives}
                </button>
              </div>`;

const incentivesReplacement = `              <div className="flex bg-[#e2e8f0]/10 p-1 rounded-xl w-full border border-[var(--b2)] max-w-sm mx-auto">
                <button
                  onClick={() => setShowIncentives(false)}
                  className={cn(
                    "flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                    !showIncentives ? "bg-white text-black shadow" : "text-[var(--w)]/60 hover:text-[var(--w)]"
                  )}
                >
                  {t.withoutIncentives}
                </button>
                <button
                  onClick={() => setShowIncentives(true)}
                  className={cn(
                    "flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                    showIncentives ? "bg-white text-black shadow" : "text-[var(--w)]/60 hover:text-[var(--w)]"
                  )}
                >
                  {t.withIncentives}*
                </button>
              </div>`;
              
newContent = newContent.replace(incentivesTarget, incentivesReplacement);

// 7. Deal Insights Accordion wrapper around Price Breakdown
const priceBreakdownTargetStr = `{/* Price Breakdown */}
          {!isStandalone && (
            <div className="space-y-3 pt-4 border-t border-[var(--b2)]">`;
            
const newPriceBreakdownStart = `{/* Deal Insights */}
          {!isStandalone && (
            <div className="mt-8 px-4 sm:px-6"> 
              <button 
                onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                className="flex items-center justify-between w-full border-b border-[var(--b2)] pb-4 group"
              >
                <span className="text-lg font-display uppercase tracking-widest text-[var(--w)] group-hover:text-white transition-colors">Deal Insights</span>
                <div className="text-[var(--w)] group-hover:text-white transition-colors">
                  {isInsightsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              {isInsightsOpen && (
                <div className="pt-4 space-y-3 pb-8">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest font-mono">
                    <span className="text-[var(--w)]">MSRP</span>
                    <span className="text-[var(--w)]">{fmt(currentCar?.msrp)}</span>
                  </div>`;
                  
newContent = newContent.replace(priceBreakdownTargetStr, newPriceBreakdownStart);

const priceBreakdownEndTarget = `              <div className="pt-2 flex justify-between items-center border-t border-[var(--b2)]">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)]">{t.sellingPrice}</span>
                <span className="text-lg font-display text-[var(--lime)]">
                  {fmt(quoteData?.sellingPriceCents !== undefined ? quoteData.sellingPriceCents / 100 : ((Number(currentCar?.msrp) || 0) - (currentCar?.savings || 0) - (showIncentives ? totalIncentives : 0)))}
                </span>
              </div>
            </div>
          )}`;

const newPriceBreakdownEnd = `              <div className="pt-2 flex justify-between items-center border-t border-[var(--w)]/20 mt-4">
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--w)] font-sans">{t.sellingPrice}</span>
                <span className="text-base font-bold text-[var(--w)] font-mono">
                  {fmt(quoteData?.sellingPriceCents !== undefined ? quoteData.sellingPriceCents / 100 : ((Number(currentCar?.msrp) || 0) - (currentCar?.savings || 0) - (showIncentives ? totalIncentives : 0)))}
                </span>
              </div>
            </div>
           )}
          </div>
          )}`;

newContent = newContent.replace(priceBreakdownEndTarget, newPriceBreakdownEnd);

// Wrap lender options with logic to ONLY show if Insights is open (like the reference)
const lenderOptionsTarget = `{/* Lender Comparison */}
          {lenderOptions.length > 0 && (
            <div className={cn("pt-6 border-t border-[var(--b2)] space-y-4", "")}>`;
const newLenderOptions = `{/* Lender Comparison */}
          {isInsightsOpen && lenderOptions.length > 0 && (
            <div className="px-4 sm:px-6 pt-6 border-t border-[var(--b2)] space-y-4">`;
newContent = newContent.replace(lenderOptionsTarget, newLenderOptions);

fs.writeFileSync('src/components/Calculator.tsx', newContent);
console.log('Update script prepared and applied.');
