import { DealEngineFacade } from './server/services/engine/DealEngineFacade.js';

async function run() {
  const quote = await DealEngineFacade.calculateForConsumer({
      make: "Toyota",
      model: "Sequoia",
      trim: "Platinum",
      msrp: 79758,
      sellingPrice: 79758,
      zipCode: "90210",
      type: "lease",
      term: 48,
      mileage: 10000,
      tier: "t1",
      targetDas: 2964,
      tradeInEquity: 0
  });

  console.log("Calculated:", JSON.stringify(quote, null, 2));
}
run();
