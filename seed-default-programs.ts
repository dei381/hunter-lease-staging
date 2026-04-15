/**
 * Seed default financial parameters for all VehicleTrims that lack MF/RV/APR.
 * Uses market-average values so the catalog can calculate payments.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Market-average defaults by segment (2024-2025)
const SEGMENT_DEFAULTS: Record<string, { mf: number; rv: number; apr: number }> = {
  // Luxury
  'BMW': { mf: 0.0013, rv: 0.54, apr: 5.49 },
  'Mercedes-Benz': { mf: 0.0015, rv: 0.51, apr: 5.29 },
  'Audi': { mf: 0.0014, rv: 0.52, apr: 4.99 },
  'Lexus': { mf: 0.00085, rv: 0.58, apr: 4.49 },
  'Acura': { mf: 0.0010, rv: 0.55, apr: 4.49 },
  'Infiniti': { mf: 0.0015, rv: 0.50, apr: 5.49 },
  'Genesis': { mf: 0.0012, rv: 0.53, apr: 4.99 },
  'Volvo': { mf: 0.0018, rv: 0.50, apr: 5.49 },
  'Land Rover': { mf: 0.0020, rv: 0.48, apr: 5.99 },
  'Jaguar': { mf: 0.0018, rv: 0.47, apr: 5.99 },
  'Porsche': { mf: 0.0015, rv: 0.56, apr: 5.49 },
  'Lincoln': { mf: 0.0012, rv: 0.50, apr: 4.99 },
  'Cadillac': { mf: 0.0013, rv: 0.51, apr: 4.99 },
  // Mainstream
  'Toyota': { mf: 0.00065, rv: 0.60, apr: 4.49 },
  'Honda': { mf: 0.0008, rv: 0.58, apr: 4.49 },
  'Hyundai': { mf: 0.0012, rv: 0.52, apr: 4.99 },
  'Kia': { mf: 0.0013, rv: 0.51, apr: 4.99 },
  'Nissan': { mf: 0.0015, rv: 0.50, apr: 5.49 },
  'Mazda': { mf: 0.0012, rv: 0.53, apr: 4.99 },
  'Subaru': { mf: 0.0010, rv: 0.55, apr: 4.49 },
  'Volkswagen': { mf: 0.0014, rv: 0.51, apr: 5.29 },
  'Ford': { mf: 0.0013, rv: 0.52, apr: 4.99 },
  'Chevrolet': { mf: 0.0014, rv: 0.50, apr: 5.29 },
  'Jeep': { mf: 0.0015, rv: 0.49, apr: 5.49 },
  'Ram': { mf: 0.0014, rv: 0.50, apr: 5.29 },
};
const DEFAULT = { mf: 0.0015, rv: 0.50, apr: 5.49 };

async function main() {
  // Find all trims without financial data
  const trims = await prisma.vehicleTrim.findMany({
    where: {
      isActive: true,
      msrpCents: { gt: 0 },
      baseMF: 0,
      rv36: 0,
    },
    include: { model: { include: { make: true } } }
  });

  console.log(`Found ${trims.length} trims without financial data`);

  let updated = 0;
  for (const trim of trims) {
    const makeName = trim.model.make.name;
    const defaults = SEGMENT_DEFAULTS[makeName] || DEFAULT;

    await prisma.vehicleTrim.update({
      where: { id: trim.id },
      data: {
        baseMF: defaults.mf,
        rv36: defaults.rv,
        baseAPR: defaults.apr
      }
    });
    updated++;
  }

  console.log(`Updated ${updated} trims with default financial parameters`);

  // Also ensure all trims that have baseMF but no rv36 (or vice versa) get filled
  const partialTrims = await prisma.vehicleTrim.findMany({
    where: {
      isActive: true,
      msrpCents: { gt: 0 },
      OR: [
        { baseMF: { gt: 0 }, rv36: 0 },
        { baseMF: 0, rv36: { gt: 0 } },
      ]
    },
    include: { model: { include: { make: true } } }
  });

  for (const trim of partialTrims) {
    const makeName = trim.model.make.name;
    const defaults = SEGMENT_DEFAULTS[makeName] || DEFAULT;
    const data: any = {};
    if (!trim.baseMF) data.baseMF = defaults.mf;
    if (!trim.rv36) data.rv36 = defaults.rv;
    if (!trim.baseAPR) data.baseAPR = defaults.apr;
    if (Object.keys(data).length > 0) {
      await prisma.vehicleTrim.update({ where: { id: trim.id }, data });
    }
  }

  console.log(`Fixed ${partialTrims.length} trims with partial data`);
}

main()
  .then(() => { console.log('Done!'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
