import { PureMathEngine } from './server/services/engine/PureMathEngine';

try {
  const lease = PureMathEngine.calculateLease({
    msrpCents: 8592000,
    sellingPriceCents: 8592000,
    residualValuePercent: 0.6,
    moneyFactor: 0.0015,
    term: 36,
    downPaymentCents: 0,
    acqFeeCents: 0,
    docFeeCents: 8500,
    dmvFeeCents: 60000,
    brokerFeeCents: 0,
    taxRate: 0.08875
  });
  console.log(lease);
} catch (e) {
  console.error(e);
}
