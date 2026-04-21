const caTaxRates: Record<string, number> = {
  '90001': 0.095, '90012': 0.095, '90210': 0.095, '90401': 0.1025,
  '90230': 0.1025,
  '90802': 0.1025,

  '92602': 0.0775,
  '92612': 0.0775,
  '92646': 0.0775,
  '92801': 0.0875,

  '92101': 0.0775,
  '91910': 0.0875,

  '94102': 0.08625, '94105': 0.08625, '94110': 0.08625,

  '94601': 0.1025,
  '94501': 0.1075,

  '95112': 0.09375,
  '94040': 0.09125,

  '95814': 0.0875,
};

export function hasTaxRateByZip(zip: string): boolean {
  return !!zip && Object.prototype.hasOwnProperty.call(caTaxRates, zip);
}

export function getTaxRateByZip(zip: string): number {
  if (hasTaxRateByZip(zip)) {
    return caTaxRates[zip];
  }

  return 0.08875;
}
