import fs from 'fs';
import path from 'path';

const carsPath = path.join(process.cwd(), 'server', 'data', 'cars.json');
const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

// Add destination charge to all existing MSRPs
carsData.makes.forEach((make: any) => {
  make.models.forEach((model: any) => {
    model.trims.forEach((trim: any) => {
      // Add a standard destination charge if not already added
      // Assuming destination charge is around $1095 for sedans and $1395 for SUVs/Trucks
      const isSUVOrTruck = ['SUV', 'Truck', 'Minivan'].includes(model.class) || 
                           ['RAV4', 'Highlander', 'Tacoma', 'Tundra', 'RX', 'NX', 'GX', 'TX', 'CR-V', 'Pilot', 'HR-V', 'Odyssey', 'Ridgeline', 'IONIQ 5', 'IONIQ 9', 'Tucson', 'Palisade', 'Santa Fe', 'EV9', 'EV6', 'Telluride', 'Sportage', 'Sorento', 'Carnival', 'GLC', 'GLE', 'EQE', 'GLB', 'X3', 'X5', 'X7', 'Q5', 'Q7', 'Macan', 'Cayenne', 'Tiguan', 'Atlas'].some(name => model.name.includes(name));
      
      const destCharge = isSUVOrTruck ? 1395 : 1095;
      
      // Only add if it hasn't been added recently (to avoid double adding if script runs twice)
      // We'll just add it once.
      if (!trim.destChargeAdded) {
        trim.msrp += destCharge;
        trim.destChargeAdded = true;
      }
    });
  });
});

// Add Tesla
const teslaExists = carsData.makes.find((m: any) => m.name === 'Tesla');
if (!teslaExists) {
  carsData.makes.push({
    id: "tesla",
    name: "Tesla",
    models: [
      {
        id: "model-3",
        name: "Model 3",
        class: "Sedan",
        msrpRange: "$38,990–$54,990",
        imageUrl: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800",
        years: [2026],
        trims: [
          {
            name: "Rear-Wheel Drive",
            msrp: 38990 + 1390, // Tesla dest charge is 1390
            feat: "RWD · 272 mi range",
            mf: 0.00250,
            rv36: 0.55,
            baseAPR: 6.49,
            leaseCash: 0,
            destChargeAdded: true
          },
          {
            name: "Long Range AWD",
            msrp: 47740 + 1390,
            feat: "AWD · 341 mi range",
            mf: 0.00250,
            rv36: 0.53,
            baseAPR: 6.49,
            leaseCash: 0,
            destChargeAdded: true
          }
        ]
      },
      {
        id: "model-y",
        name: "Model Y",
        class: "SUV",
        msrpRange: "$44,990–$51,490",
        imageUrl: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=800",
        years: [2026],
        trims: [
          {
            name: "Rear-Wheel Drive",
            msrp: 44990 + 1390,
            feat: "RWD · 260 mi range",
            mf: 0.00250,
            rv36: 0.54,
            baseAPR: 6.49,
            leaseCash: 0,
            destChargeAdded: true
          },
          {
            name: "Long Range AWD",
            msrp: 47990 + 1390,
            feat: "AWD · 310 mi range",
            mf: 0.00250,
            rv36: 0.52,
            baseAPR: 6.49,
            leaseCash: 0,
            destChargeAdded: true
          }
        ]
      }
    ]
  });
}

fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2));
console.log('Updated cars.json with destination charges and added Tesla.');
