export function getTaxRateByZip(zip: string): number {
  // A simplified map of common California ZIP codes to their combined tax rates.
  // In a real production app, this would query a database or external API like Avalara/CDTFA.
  const caTaxRates: Record<string, number> = {
    // Los Angeles County (generally 9.50% - 10.25%)
    '90001': 0.095, '90012': 0.095, '90210': 0.095, '90401': 0.1025, // Santa Monica
    '90230': 0.1025, // Culver City
    '90802': 0.1025, // Long Beach
    
    // Orange County (generally 7.75% - 9.25%)
    '92602': 0.0775, // Irvine
    '92612': 0.0775, // Irvine
    '92646': 0.0775, // Huntington Beach
    '92801': 0.0875, // Anaheim
    
    // San Diego County (generally 7.75% - 8.75%)
    '92101': 0.0775, // San Diego
    '91910': 0.0875, // Chula Vista
    
    // San Francisco County (8.625%)
    '94102': 0.08625, '94105': 0.08625, '94110': 0.08625,
    
    // Alameda County (generally 10.25% - 10.75%)
    '94601': 0.1025, // Oakland
    '94501': 0.1075, // Alameda
    
    // Santa Clara County (generally 9.125% - 9.375%)
    '95112': 0.09375, // San Jose
    '94040': 0.09125, // Mountain View
    
    // Sacramento County (generally 8.75%)
    '95814': 0.0875,
  };

  if (zip && caTaxRates[zip]) {
    return caTaxRates[zip];
  }

  // Default California tax rate if ZIP is unknown (average)
  return 0.08875;
}
