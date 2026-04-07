import { PureMathEngine } from './server/services/engine/PureMathEngine';

const msrp = 85920;
const mf = 0.0015;
const rv = 0.6;
const term = 36;
const down = 0; // The user said 58 dollars, maybe down was 0?
const acqFeeCents = 650 * 100;
const docFeeCents = 85 * 100;
const dmvFeeCents = 600 * 100;
const brokerFeeCents = 595 * 100;
const taxRate = 8.875 / 100;

const lease = PureMathEngine.calculateLease({
  msrpCents: msrp * 100,
  sellingPriceCents: msrp * 100,
  residualValuePercent: rv,
  moneyFactor: mf,
  term,
  downPaymentCents: down * 100,
  acqFeeCents,
  docFeeCents,
  dmvFeeCents,
  brokerFeeCents,
  taxRate
});

console.log("Payment:", lease.finalPaymentCents / 100);
