import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.oemIncentiveProgram.count();
  console.log('OEM incentives:', count);
  
  if (count > 0) {
    const byMake = await prisma.oemIncentiveProgram.groupBy({ by: ['make'], _count: true });
    console.log('By make:', JSON.stringify(byMake, null, 2));
  }

  // Seed incentives for target brands
  const incentives = [
    // Toyota
    { make: 'Toyota', model: 'Camry', name: 'TFS Customer Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Toyota', model: 'Camry', name: 'TFS Customer Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'FINANCE' },
    { make: 'Toyota', model: 'Corolla', name: 'TFS Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Toyota', model: 'RAV4', name: 'TFS Customer Cash', amount: 750, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Toyota', model: 'Highlander', name: 'TFS Customer Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Toyota', model: 'Tacoma', name: 'TFS Bonus Cash', amount: 500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Toyota', model: null, name: 'Toyota College Grad Rebate', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
    { make: 'Toyota', model: null, name: 'Toyota Military Rebate', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
    // Lexus
    { make: 'Lexus', model: 'RX', name: 'Lexus Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Lexus', model: 'ES', name: 'Lexus Lease Cash', amount: 1500, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Lexus', model: 'NX', name: 'Lexus Customer Cash', amount: 750, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Lexus', model: 'IS', name: 'Lexus Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Lexus', model: null, name: 'Lexus Loyalty Rebate', amount: 1000, type: 'CONDITIONAL', deal: 'BOTH' },
    // Hyundai
    { make: 'Hyundai', model: 'Tucson', name: 'HMF Bonus Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Hyundai', model: 'Sonata', name: 'HMF Customer Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Hyundai', model: 'Elantra', name: 'HMF Bonus Cash', amount: 750, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Hyundai', model: 'Santa Fe', name: 'HMF Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Hyundai', model: null, name: 'Hyundai College Grad Rebate', amount: 400, type: 'CONDITIONAL', deal: 'BOTH' },
    // Kia
    { make: 'Kia', model: 'Sportage', name: 'KMF Bonus Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Kia', model: 'Telluride', name: 'KMF Customer Cash', amount: 750, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Kia', model: 'Forte', name: 'KMF Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Kia', model: 'Sorento', name: 'KMF Customer Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Kia', model: null, name: 'Kia Military Rebate', amount: 400, type: 'CONDITIONAL', deal: 'BOTH' },
    // Ford
    { make: 'Ford', model: 'F-150', name: 'Ford Customer Cash', amount: 2000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Ford', model: 'Explorer', name: 'Ford Bonus Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Ford', model: 'Escape', name: 'Ford Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Ford', model: 'Bronco Sport', name: 'Ford Customer Cash', amount: 750, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Ford', model: null, name: 'Ford Military Appreciation', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
    { make: 'Ford', model: null, name: 'Ford First Responder', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
    // Chevrolet
    { make: 'Chevrolet', model: 'Silverado 1500', name: 'Chevy Customer Cash', amount: 2500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Chevrolet', model: 'Equinox', name: 'Chevy Bonus Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Chevrolet', model: 'Traverse', name: 'Chevy Customer Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Chevrolet', model: 'Trax', name: 'Chevy Lease Cash', amount: 750, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Chevrolet', model: null, name: 'GM Military Discount', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
    // Acura
    { make: 'Acura', model: 'MDX', name: 'Acura Loyalty Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Acura', model: 'TLX', name: 'AFS Lease Cash', amount: 1500, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Acura', model: 'RDX', name: 'Acura Customer Cash', amount: 750, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Acura', model: 'Integra', name: 'Acura Bonus Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Acura', model: null, name: 'Acura Conquest Rebate', amount: 750, type: 'CONDITIONAL', deal: 'BOTH' },
    // Genesis
    { make: 'Genesis', model: 'GV70', name: 'Genesis Lease Cash', amount: 2000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Genesis', model: 'GV80', name: 'Genesis Customer Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Genesis', model: 'G70', name: 'Genesis Lease Cash', amount: 2000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Genesis', model: null, name: 'Genesis Conquest Rebate', amount: 1000, type: 'CONDITIONAL', deal: 'BOTH' },
    // RAM
    { make: 'RAM', model: '1500', name: 'RAM Customer Cash', amount: 2500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'RAM', model: '1500', name: 'RAM Finance Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'FINANCE' },
    { make: 'RAM', model: null, name: 'FCA Military Appreciation', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
    // Volvo
    { make: 'Volvo', model: 'XC60', name: 'Volvo Lease Cash', amount: 1500, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Volvo', model: 'XC90', name: 'Volvo Customer Cash', amount: 2000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Volvo', model: 'S60', name: 'Volvo Lease Cash', amount: 1500, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Volvo', model: 'XC40', name: 'Volvo Bonus Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Volvo', model: null, name: 'Volvo Loyalty Rebate', amount: 1000, type: 'CONDITIONAL', deal: 'BOTH' },
    // Volkswagen (on reference site)
    { make: 'Volkswagen', model: 'Jetta', name: 'VW Customer Cash', amount: 1000, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Volkswagen', model: 'Tiguan', name: 'VW Lease Cash', amount: 1000, type: 'LEASE_CASH', deal: 'LEASE' },
    { make: 'Volkswagen', model: 'Atlas', name: 'VW Customer Cash', amount: 1500, type: 'CUSTOMER_CASH', deal: 'LEASE' },
    { make: 'Volkswagen', model: null, name: 'VW College Grad Rebate', amount: 500, type: 'CONDITIONAL', deal: 'BOTH' },
  ];

  // Delete existing OEM incentives to avoid duplicates
  const deleted = await prisma.oemIncentiveProgram.deleteMany({});
  console.log(`Deleted ${deleted.count} existing incentives`);

  let created = 0;
  for (const inc of incentives) {
    const isConditional = inc.type === 'CONDITIONAL';
    const applicability = inc.deal === 'BOTH' ? 'LEASE' : inc.deal;

    // Create for LEASE applicability
    await prisma.oemIncentiveProgram.create({
      data: {
        name: inc.name,
        amountCents: inc.amount * 100,
        type: isConditional ? 'conditional' : 'manufacturer',
        dealApplicability: applicability,
        isTaxableCa: !isConditional,
        make: inc.make,
        model: inc.model,
        stackable: true,
        isActive: true,
        status: 'PUBLISHED',
        eligibilityRules: isConditional ? JSON.stringify({
          requiresMilitary: inc.name.toLowerCase().includes('military') || inc.name.toLowerCase().includes('first responder'),
          requiresCollegeGrad: inc.name.toLowerCase().includes('college') || inc.name.toLowerCase().includes('grad'),
          requiresLoyalty: inc.name.toLowerCase().includes('loyalty'),
          requiresConquest: inc.name.toLowerCase().includes('conquest'),
        }) : null
      }
    });
    created++;

    // Also create FINANCE version for BOTH
    if (inc.deal === 'BOTH') {
      await prisma.oemIncentiveProgram.create({
        data: {
          name: inc.name,
          amountCents: inc.amount * 100,
          type: isConditional ? 'conditional' : 'manufacturer',
          dealApplicability: 'FINANCE',
          isTaxableCa: !isConditional,
          make: inc.make,
          model: inc.model,
          stackable: true,
          isActive: true,
          status: 'PUBLISHED',
          eligibilityRules: isConditional ? JSON.stringify({
            requiresMilitary: inc.name.toLowerCase().includes('military') || inc.name.toLowerCase().includes('first responder'),
            requiresCollegeGrad: inc.name.toLowerCase().includes('college') || inc.name.toLowerCase().includes('grad'),
            requiresLoyalty: inc.name.toLowerCase().includes('loyalty'),
            requiresConquest: inc.name.toLowerCase().includes('conquest'),
          }) : null
        }
      });
      created++;
    }
  }

  console.log(`Created ${created} OEM incentive programs`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
