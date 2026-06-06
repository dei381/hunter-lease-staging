import { DealEngineFacade } from './server/services/engine/DealEngineFacade.js';

async function run() {
  const quote = await DealEngineFacade.calculateForConsumer({
      make: "Toyota",
      model: "Sequoia",
      trim: "Platinum 4WD (Natl)",
      msrp: 87063,
      sellingPrice: 87063,
      zipCode: "92675",
      type: "lease",
      term: 48,
      mileage: 10000,
      tier: "t1",
      downPaymentCents: 315200,
      tradeInEquity: 0
  });

  console.log("Calculated:", JSON.stringify(quote, null, 2));
}
run();
