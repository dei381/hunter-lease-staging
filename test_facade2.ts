import { DealEngineFacade } from './server/services/engine/DealEngineFacade.js';

async function run() {
  const quote = await DealEngineFacade.calculateForConsumer({
      make: "Toyota",
      model: "Sequoia",
      trim: "Platinum",
      msrp: 89368,
      sellingPrice: 89368,
      zipCode: "90210",
      type: "lease",
      term: 36,
      mileage: 7500,
      tier: "t1",
      cashDown: 0,
      targetDas: 3000,
      tradeInEquity: 0
  });

  console.log("Calculated:", JSON.stringify(quote, null, 2));
}
run();
