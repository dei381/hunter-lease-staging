import { PureMathEngine } from './server/services/engine/PureMathEngine';
import { Formatter } from './server/services/engine/Formatter';

function testAlgebraic() {
  const vehicle = { msrpCents: 3000000 };
  const sellingPriceCents = 2800000;
  const appliedRvPercent = 0.50;
  const appliedMf = 0.002;
  const term = 36;
  const targetDasCents = 200000;
  const totalIncentivesCents = 100000;
  const tradeInEquityCents = 0;
  const msdCount = 5;
  
  const settings = {
    acqFeeCents: 65000,
    docFeeCents: 8500,
    dmvFeeCents: 40000,
    brokerFeeCents: 0,
    taxRate: 0.1
  };

  const context: any = {
    quoteType: 'LEASE',
    term,
    downPaymentCents: targetDasCents,
    tradeInEquityCents,
    msdCount
  };

  const resolvedData = {
    settings,
    totalIncentivesCents,
    taxableIncentivesCents: totalIncentivesCents,
    nonTaxableIncentivesCents: 0,
    vehicle
  };

  const modifiers = { mf: appliedMf, apr: 0, rv: appliedRvPercent };

  // ALGEBRAIC
  const S = sellingPriceCents + settings.acqFeeCents;
  const R = Math.round(vehicle.msrpCents * appliedRvPercent);
  const N = context.term;
  const M = appliedMf;
  const t = settings.taxRate;
  const I_t = totalIncentivesCents;
  const I_n = 0;
  const I = I_t + I_n;
  const Fu = settings.docFeeCents + settings.dmvFeeCents + settings.brokerFeeCents;
  const Te = context.tradeInEquityCents;
  const DAS = targetDasCents;

  const k = 1 / N + M;
  const B0 = (S - R) / N + (S + R) * M;
  const P0 = B0 * (1 + t);

  let D_approx = (DAS + Te - P0 - Fu + k * (1 + t) * I - I_t * t) / ((1 + t) * (1 - k));
  if (D_approx + I_t < 0) {
      D_approx = (DAS + Te - P0 - Fu + k * (1 + t) * I) / (1 - k * (1 + t));
  }

  const baseCashDown = Math.round(D_approx - Te);
  console.log("Algebraic baseCashDown:", baseCashDown);

  let bestDiff = Infinity;
  let bestC = baseCashDown;
  let bestFormatted;

  for (let offset = -100; offset <= 100; offset++) {
      const testCashDown = baseCashDown + offset;
      const testDownPayment = testCashDown + Te + totalIncentivesCents;
      const testContext = { ...context, downPaymentCents: testCashDown };
      
      const testMath = PureMathEngine.calculateLease({
          msrpCents: vehicle.msrpCents,
          sellingPriceCents,
          residualValuePercent: appliedRvPercent,
          moneyFactor: appliedMf,
          term: context.term,
          downPaymentCents: testDownPayment,
          acqFeeCents: settings.acqFeeCents,
          docFeeCents: settings.docFeeCents,
          dmvFeeCents: settings.dmvFeeCents,
          brokerFeeCents: settings.brokerFeeCents,
          taxRate: settings.taxRate
      });
      const testFormatted = Formatter.formatLease(testContext, testMath, resolvedData, modifiers);
      
      const diff = Math.abs(testFormatted.dueAtSigningCents - targetDasCents);
      if (diff < bestDiff) {
          bestDiff = diff;
          bestC = testCashDown;
          bestFormatted = testFormatted;
      }
  }

  console.log("Best Cash Down:", bestC);
  console.log("Resulting DAS:", bestFormatted?.dueAtSigningCents);
  console.log("Target DAS:", targetDasCents);
}

testAlgebraic();
