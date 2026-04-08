import { DealEngineFacade } from './server/services/engine/DealEngineFacade';

async function test() {
  const result = await DealEngineFacade.calculateForConsumer({
    quoteType: "LEASE",
    term: 36,
    downPaymentCents: 3000 * 100,
    mileage: 10000,
    creditTier: "t1",
    zipCode: "90210",
    make: "Toyota",
    model: "Camry",
    trim: "LE",
    year: 2026
  });
  console.log(JSON.stringify(result, null, 2));
}

test();
