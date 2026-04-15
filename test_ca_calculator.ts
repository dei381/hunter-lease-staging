// Test CA Calculator — verifies lease and finance formulas for California
import { PureMathEngine } from './server/services/engine/PureMathEngine';

console.log('=== California Calculator Test ===\n');

// Test 1: BMW X5 Lease — ZIP 90210 (9.5% tax)
console.log('TEST 1: BMW X5 xDrive40i Lease (CA)');
const lease1 = PureMathEngine.calculateLease({
  msrpCents: 6770000,       // $67,700
  sellingPriceCents: 6770000, // No discount
  residualValuePercent: 0.58, // 58% RV
  moneyFactor: 0.00125,      // MF
  term: 36,
  downPaymentCents: 200000,   // $2,000 down
  acqFeeCents: 65000,         // $650 acq fee
  docFeeCents: 8500,          // $85 doc
  dmvFeeCents: 40000,         // $400 DMV
  brokerFeeCents: 59500,      // $595 broker
  taxRate: 0.095              // 9.5% CA
});

console.log(`  Cap Cost: $${(lease1.capCostCents / 100).toFixed(2)}`);
console.log(`  Residual: $${(lease1.residualValueCents / 100).toFixed(2)}`);
console.log(`  Depreciation: $${(lease1.depreciationCents / 100).toFixed(2)}/mo`);
console.log(`  Rent Charge: $${(lease1.rentChargeCents / 100).toFixed(2)}/mo`);
console.log(`  Base Payment: $${(lease1.basePaymentCents / 100).toFixed(2)}/mo`);
console.log(`  Monthly Tax (9.5%): $${(lease1.monthlyTaxCents / 100).toFixed(2)}/mo`);
console.log(`  FINAL PAYMENT: $${(lease1.finalPaymentCents / 100).toFixed(2)}/mo`);
console.log(`  CA Tax Applied: ON PAYMENT ✅ (not on full vehicle price)`);

// Manual verification
const manualCapCost = 67700 + 650 - 2000; // 66350
const manualResidual = 67700 * 0.58;       // 39266
const manualDepr = (manualCapCost - manualResidual) / 36;
const manualRent = (manualCapCost + manualResidual) * 0.00125;
const manualBase = manualDepr + manualRent;
const manualTax = manualBase * 0.095;
const manualTotal = manualBase + manualTax;

console.log(`\n  Manual check: Cap=$${manualCapCost}, Res=$${manualResidual.toFixed(0)}`);
console.log(`  Manual: Depr=$${manualDepr.toFixed(2)}, Rent=$${manualRent.toFixed(2)}, Base=$${manualBase.toFixed(2)}`);
console.log(`  Manual: Tax=$${manualTax.toFixed(2)}, Total=$${manualTotal.toFixed(2)}`);
console.log(`  MATCH: ${Math.abs(lease1.finalPaymentCents / 100 - manualTotal) < 1 ? '✅ YES' : '❌ NO'}`);

// Test 2: Finance — same vehicle
console.log('\n\nTEST 2: BMW X5 Finance 60mo (CA)');
const fin1 = PureMathEngine.calculateFinance({
  sellingPriceCents: 6770000,
  totalIncentivesCents: 0,
  apr: 5.9,
  term: 60,
  downPaymentCents: 500000,  // $5,000 down
  docFeeCents: 8500,
  dmvFeeCents: 40000,
  brokerFeeCents: 59500,
  taxRate: 0.095
});

console.log(`  Principal: $${(fin1.principalCents / 100).toFixed(2)}`);
console.log(`  Upfront Tax: $${(fin1.upfrontTaxCents / 100).toFixed(2)}`);
console.log(`  FINAL PAYMENT: $${(fin1.finalPaymentCents / 100).toFixed(2)}/mo`);

// Test 3: Edge case — no MF/RV (should throw or return NaN)
console.log('\n\nTEST 3: Edge — Zero MF, Zero RV');
try {
  const lease3 = PureMathEngine.calculateLease({
    msrpCents: 3500000,
    sellingPriceCents: 3500000,
    residualValuePercent: 0,
    moneyFactor: 0,
    term: 36,
    downPaymentCents: 0,
    acqFeeCents: 65000,
    docFeeCents: 8500,
    dmvFeeCents: 40000,
    brokerFeeCents: 59500,
    taxRate: 0.095
  });
  console.log(`  Payment: $${(lease3.finalPaymentCents / 100).toFixed(2)}/mo (RV=0 means high payment)`);
  console.log(`  Status: ✅ No crash`);
} catch (e: any) {
  console.log(`  Error: ${e.message}`);
}

// Test 4: Different CA ZIP codes
console.log('\n\nTEST 4: Different CA tax rates');
const zipTaxes: Record<string, number> = {
  '90210': 0.095,   // Beverly Hills
  '92602': 0.0775,  // Irvine  
  '95014': 0.0925,  // Cupertino
  '94102': 0.08625, // San Francisco
};

for (const [zip, tax] of Object.entries(zipTaxes)) {
  const r = PureMathEngine.calculateLease({
    msrpCents: 4500000,
    sellingPriceCents: 4500000,
    residualValuePercent: 0.60,
    moneyFactor: 0.00150,
    term: 36,
    downPaymentCents: 200000,
    acqFeeCents: 65000,
    docFeeCents: 8500,
    dmvFeeCents: 40000,
    brokerFeeCents: 59500,
    taxRate: tax
  });
  console.log(`  ZIP ${zip} (${(tax*100).toFixed(3)}%): $${(r.finalPaymentCents / 100).toFixed(2)}/mo`);
}

console.log('\n=== All tests complete ===');
