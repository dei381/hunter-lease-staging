import fs from 'fs';
import path from 'path';

const carsPath = path.join(process.cwd(), 'server', 'data', 'cars.json');
const carsData = JSON.parse(fs.readFileSync(carsPath, 'utf8'));

const updates: Record<string, Record<string, any[]>> = {
  "Toyota": {
    "RAV4": [
      { name: "XLE Premium Hybrid", msrp: 36125, class: "SUV" },
      { name: "SE Hybrid", msrp: 34420, class: "SUV" },
      { name: "XSE Hybrid", msrp: 37385, class: "SUV" }
    ],
    "4Runner": [
      { name: "SR5", msrp: 40705, class: "SUV" },
      { name: "TRD Sport", msrp: 43565, class: "SUV" },
      { name: "TRD Off-Road", msrp: 44550, class: "SUV" },
      { name: "Limited", msrp: 49940, class: "SUV" },
      { name: "TRD Pro", msrp: 55170, class: "SUV" }
    ],
    "Grand Highlander": [
      { name: "XLE", msrp: 43320, class: "SUV" },
      { name: "Limited", msrp: 48110, class: "SUV" },
      { name: "Platinum", msrp: 53795, class: "SUV" }
    ],
    "Corolla Cross": [
      { name: "L", msrp: 23860, class: "SUV" },
      { name: "LE", msrp: 26190, class: "SUV" },
      { name: "XLE", msrp: 28085, class: "SUV" },
      { name: "Hybrid S", msrp: 28220, class: "SUV" },
      { name: "Hybrid SE", msrp: 29540, class: "SUV" },
      { name: "Hybrid XSE", msrp: 31405, class: "SUV" }
    ],
    "bZ4X": [
      { name: "XLE", msrp: 43070, class: "SUV" },
      { name: "Limited", msrp: 47180, class: "SUV" }
    ],
    "Sequoia": [
      { name: "SR5", msrp: 61275, class: "SUV" },
      { name: "Limited", msrp: 67675, class: "SUV" },
      { name: "Platinum", msrp: 73865, class: "SUV" },
      { name: "TRD Pro", msrp: 79110, class: "SUV" },
      { name: "Capstone", msrp: 78265, class: "SUV" }
    ],
    "Crown": [
      { name: "XLE", msrp: 40350, class: "Sedan" },
      { name: "Limited", msrp: 45950, class: "Sedan" },
      { name: "Platinum", msrp: 53070, class: "Sedan" }
    ]
  },
  "Lexus": {
    "UX 300h": [
      { name: "Base", msrp: 37490, class: "SUV" },
      { name: "Premium", msrp: 40690, class: "SUV" },
      { name: "F SPORT Design", msrp: 41440, class: "SUV" },
      { name: "F SPORT Handling", msrp: 45955, class: "SUV" }
    ],
    "LS 500": [
      { name: "Base", msrp: 80685, class: "Sedan" },
      { name: "F SPORT", msrp: 84825, class: "Sedan" }
    ],
    "LC 500": [
      { name: "Coupe", msrp: 99800, class: "Coupe" },
      { name: "Convertible", msrp: 107300, class: "Coupe" }
    ]
  },
  "Honda": {
    "Prologue": [
      { name: "EX", msrp: 47400, class: "SUV" },
      { name: "Touring", msrp: 51700, class: "SUV" },
      { name: "Elite", msrp: 57900, class: "SUV" }
    ],
    "Passport": [
      { name: "EX-L", msrp: 41900, class: "SUV" },
      { name: "TrailSport", msrp: 44500, class: "SUV" },
      { name: "Black Edition", msrp: 47970, class: "SUV" }
    ]
  },
  "Hyundai": {
    "Kona": [
      { name: "SE", msrp: 24250, class: "SUV" },
      { name: "SEL", msrp: 25600, class: "SUV" },
      { name: "N Line", msrp: 30800, class: "SUV" },
      { name: "Limited", msrp: 31800, class: "SUV" }
    ],
    "Venue": [
      { name: "SE", msrp: 19900, class: "SUV" },
      { name: "SEL", msrp: 21900, class: "SUV" },
      { name: "Limited", msrp: 23150, class: "SUV" }
    ],
    "Santa Cruz": [
      { name: "SE", msrp: 26900, class: "Truck" },
      { name: "SEL", msrp: 29400, class: "Truck" },
      { name: "Night", msrp: 38460, class: "Truck" },
      { name: "XRT", msrp: 40050, class: "Truck" },
      { name: "Limited", msrp: 41300, class: "Truck" }
    ]
  },
  "Kia": {
    "Soul": [
      { name: "LX", msrp: 20190, class: "SUV" },
      { name: "S", msrp: 22690, class: "SUV" },
      { name: "GT-Line", msrp: 23790, class: "SUV" },
      { name: "EX", msrp: 24490, class: "SUV" }
    ],
    "Seltos": [
      { name: "LX", msrp: 24490, class: "SUV" },
      { name: "S", msrp: 25090, class: "SUV" },
      { name: "EX", msrp: 25890, class: "SUV" },
      { name: "X-Line", msrp: 28790, class: "SUV" },
      { name: "SX", msrp: 30090, class: "SUV" }
    ],
    "Niro": [
      { name: "Hybrid LX", msrp: 26940, class: "SUV" },
      { name: "Hybrid EX", msrp: 29640, class: "SUV" },
      { name: "PHEV EX", msrp: 34390, class: "SUV" },
      { name: "EV Wind", msrp: 39600, class: "SUV" }
    ]
  },
  "Mercedes-Benz": {
    "GLA": [
      { name: "GLA 250", msrp: 43000, class: "SUV" },
      { name: "GLA 250 4MATIC", msrp: 45000, class: "SUV" }
    ],
    "GLS": [
      { name: "GLS 450 4MATIC", msrp: 87000, class: "SUV" },
      { name: "GLS 580 4MATIC", msrp: 112000, class: "SUV" }
    ],
    "G-Class": [
      { name: "G 550", msrp: 143000, class: "SUV" },
      { name: "AMG G 63", msrp: 183000, class: "SUV" }
    ],
    "CLA": [
      { name: "CLA 250", msrp: 44400, class: "Sedan" },
      { name: "CLA 250 4MATIC", msrp: 46400, class: "Sedan" }
    ],
    "CLE": [
      { name: "CLE 300 4MATIC", msrp: 56500, class: "Coupe" },
      { name: "CLE 450 4MATIC", msrp: 65650, class: "Coupe" }
    ]
  },
  "BMW": {
    "X1": [
      { name: "xDrive28i", msrp: 40500, class: "SUV" },
      { name: "M35i", msrp: 49900, class: "SUV" }
    ],
    "X2": [
      { name: "xDrive28i", msrp: 42000, class: "SUV" },
      { name: "M35i", msrp: 51400, class: "SUV" }
    ],
    "X4": [
      { name: "xDrive30i", msrp: 55000, class: "SUV" },
      { name: "M40i", msrp: 66400, class: "SUV" }
    ],
    "X6": [
      { name: "xDrive40i", msrp: 74500, class: "SUV" },
      { name: "M60i", msrp: 94300, class: "SUV" }
    ],
    "i4": [
      { name: "eDrive35", msrp: 52200, class: "Sedan" },
      { name: "eDrive40", msrp: 57300, class: "Sedan" },
      { name: "xDrive40", msrp: 61600, class: "Sedan" },
      { name: "M50", msrp: 69700, class: "Sedan" }
    ],
    "iX": [
      { name: "xDrive50", msrp: 87250, class: "SUV" },
      { name: "M60", msrp: 111500, class: "SUV" }
    ],
    "2 Series": [
      { name: "230i Coupe", msrp: 38800, class: "Coupe" },
      { name: "M240i xDrive", msrp: 51700, class: "Coupe" }
    ],
    "8 Series": [
      { name: "840i Coupe", msrp: 90800, class: "Coupe" },
      { name: "M850i xDrive", msrp: 106300, class: "Coupe" }
    ]
  },
  "Audi": {
    "Q3": [
      { name: "40 TFSI Premium", msrp: 37400, class: "SUV" },
      { name: "45 TFSI Premium", msrp: 39800, class: "SUV" }
    ],
    "Q4 e-tron": [
      { name: "40 Premium", msrp: 49800, class: "SUV" },
      { name: "50 e-tron Premium", msrp: 55200, class: "SUV" }
    ],
    "Q8": [
      { name: "55 TFSI Premium", msrp: 73700, class: "SUV" },
      { name: "55 TFSI Premium Plus", msrp: 77500, class: "SUV" }
    ],
    "A3": [
      { name: "40 TFSI Premium", msrp: 35800, class: "Sedan" },
      { name: "40 TFSI Premium Plus", msrp: 39400, class: "Sedan" }
    ],
    "A5": [
      { name: "45 TFSI Premium", msrp: 48400, class: "Coupe" }
    ],
    "A6": [
      { name: "45 TFSI Premium", msrp: 58100, class: "Sedan" },
      { name: "55 TFSI Premium", msrp: 61800, class: "Sedan" }
    ],
    "e-tron GT": [
      { name: "Premium Plus", msrp: 106500, class: "Sedan" },
      { name: "Prestige", msrp: 114500, class: "Sedan" }
    ]
  },
  "Porsche": {
    "911": [
      { name: "Carrera", msrp: 114400, class: "Coupe" },
      { name: "Carrera S", msrp: 131300, class: "Coupe" },
      { name: "Carrera 4S", msrp: 138600, class: "Coupe" },
      { name: "Turbo S", msrp: 230400, class: "Coupe" },
      { name: "GT3", msrp: 182900, class: "Coupe" }
    ],
    "Taycan": [
      { name: "Taycan", msrp: 90900, class: "Sedan" },
      { name: "4S", msrp: 111100, class: "Sedan" },
      { name: "Turbo", msrp: 160800, class: "Sedan" },
      { name: "Turbo S", msrp: 194900, class: "Sedan" }
    ],
    "Panamera": [
      { name: "Panamera", msrp: 92000, class: "Sedan" },
      { name: "Panamera 4", msrp: 97000, class: "Sedan" },
      { name: "Turbo E-Hybrid", msrp: 191000, class: "Sedan" }
    ],
    "718": [
      { name: "Cayman", msrp: 68300, class: "Coupe" },
      { name: "Cayman S", msrp: 80300, class: "Coupe" },
      { name: "Boxster", msrp: 70400, class: "Coupe" }
    ]
  },
  "Volkswagen": {
    "Jetta": [
      { name: "S", msrp: 21435, class: "Sedan" },
      { name: "Sport", msrp: 22585, class: "Sedan" },
      { name: "SE", msrp: 24875, class: "Sedan" },
      { name: "SEL", msrp: 28825, class: "Sedan" }
    ],
    "Taos": [
      { name: "S", msrp: 23995, class: "SUV" },
      { name: "SE", msrp: 28165, class: "SUV" },
      { name: "SEL", msrp: 33515, class: "SUV" }
    ],
    "ID.4": [
      { name: "Standard", msrp: 39735, class: "SUV" },
      { name: "Pro", msrp: 44875, class: "SUV" },
      { name: "Pro S", msrp: 49995, class: "SUV" },
      { name: "Pro S Plus", msrp: 53145, class: "SUV" }
    ],
    "Golf GTI": [
      { name: "S", msrp: 31965, class: "Hatchback" },
      { name: "SE", msrp: 36915, class: "Hatchback" },
      { name: "Autobahn", msrp: 40505, class: "Hatchback" }
    ],
    "Golf R": [
      { name: "Golf R", msrp: 45665, class: "Hatchback" }
    ]
  },
  "Tesla": {
    "Model S": [
      { name: "Long Range AWD", msrp: 74990, class: "Sedan" },
      { name: "Plaid", msrp: 89990, class: "Sedan" }
    ],
    "Model X": [
      { name: "Long Range AWD", msrp: 79990, class: "SUV" },
      { name: "Plaid", msrp: 94990, class: "SUV" }
    ],
    "Cybertruck": [
      { name: "All-Wheel Drive", msrp: 79990, class: "Truck" },
      { name: "Cyberbeast", msrp: 99990, class: "Truck" }
    ]
  }
};

let addedModels = 0;
let addedTrims = 0;

Object.entries(updates).forEach(([makeName, modelsMap]) => {
  let make = carsData.makes.find((m: any) => m.name.toLowerCase() === makeName.toLowerCase());
  
  if (!make) {
    make = {
      id: makeName.toLowerCase().replace(/\s+/g, '-'),
      name: makeName,
      models: [],
      tiers: [
        { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
        { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
        { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
        { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
      ],
      baseMF: 0.002,
      baseAPR: 6.9
    };
    carsData.makes.push(make);
  }

  Object.entries(modelsMap).forEach(([modelName, trimsList]) => {
    let model = make.models.find((m: any) => m.name.toLowerCase() === modelName.toLowerCase());
    
    if (!model) {
      model = {
        id: modelName.toLowerCase().replace(/\s+/g, '-'),
        name: modelName,
        class: trimsList[0]?.class || 'Unknown',
        msrpRange: `$${Math.min(...trimsList.map(t => t.msrp)).toLocaleString()} - $${Math.max(...trimsList.map(t => t.msrp)).toLocaleString()}`,
        years: [2026],
        mf: 0.00150,
        rv36: 0.60,
        baseAPR: 4.9,
        leaseCash: 0,
        trims: []
      };
      make.models.push(model);
      addedModels++;
    }

    trimsList.forEach((trimDef) => {
      const trimExists = model.trims.find((t: any) => t.name.toLowerCase().trim() === trimDef.name.toLowerCase().trim());
      
      if (!trimExists) {
        // Calculate destination charge based on class
        const isSUVOrTruck = ['SUV', 'Truck', 'Minivan'].includes(trimDef.class);
        const destCharge = make.name === 'Tesla' ? 1390 : (isSUVOrTruck ? 1395 : 1095);
        
        model.trims.push({
          name: trimDef.name,
          msrp: trimDef.msrp + destCharge, // Add CA dest charge
          feat: `${trimDef.class} · Auto`,
          mf: 0.00200,
          rv36: 0.55,
          baseAPR: 5.9,
          leaseCash: 0,
          destChargeAdded: true
        });
        addedTrims++;
      }
    });
  });
});

// Enforce Toyota Camry and RAV4 to be Hybrid only
const toyota = carsData.makes.find((m: any) => m.name === 'Toyota');
if (toyota) {
  const camry = toyota.models.find((m: any) => m.name === 'Camry');
  if (camry) {
    camry.trims = camry.trims.filter((t: any) => t.name.toLowerCase().includes('hybrid'));
  }
  
  const rav4 = toyota.models.find((m: any) => m.name === 'RAV4');
  if (rav4) {
    rav4.trims = rav4.trims.filter((t: any) => t.name.toLowerCase().includes('hybrid'));
  }
}

fs.writeFileSync(carsPath, JSON.stringify(carsData, null, 2));
console.log(`Successfully added ${addedModels} models and ${addedTrims} trims with CA destination fees.`);
