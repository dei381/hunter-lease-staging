import fs from 'fs';
import path from 'path';

const carsDataPath = path.join(process.cwd(), 'server/data/cars.json');
const carsData = JSON.parse(fs.readFileSync(carsDataPath, 'utf-8'));

if (!carsData.makes.find((m: any) => m.name === 'Volkswagen')) {
  carsData.makes.push({
    "id": "volkswagen",
    "name": "Volkswagen",
    "models": [
      {
        "id": "tiguan",
        "name": "Tiguan",
        "class": "SUV",
        "msrpRange": "$28,880–$38,880",
        "imageUrl": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800",
        "years": [2026],
        "trims": [
          {
            "name": "S",
            "msrp": 28880,
            "feat": "FWD · IQ.DRIVE",
            "features": ["IQ.DRIVE", "Heated Front Seats", "Digital Cockpit"],
            "specs": { "engine": "2.0L Turbo", "hp": "184 hp", "mpg": "24/31", "drive": "FWD", "transmission": "8-Speed Auto" },
            "mf": 0.00180,
            "rv36": 0.58,
            "baseAPR": 3.9,
            "leaseCash": 1500
          },
          {
            "name": "SE R-Line Black",
            "msrp": 34580,
            "feat": "AWD · R-Line Styling",
            "mf": 0.00180,
            "rv36": 0.56,
            "baseAPR": 3.9,
            "leaseCash": 1500
          }
        ]
      },
      {
        "id": "atlas",
        "name": "Atlas",
        "class": "SUV",
        "msrpRange": "$37,995–$52,890",
        "imageUrl": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&q=80&w=800",
        "years": [2026],
        "trims": [
          {
            "name": "SE",
            "msrp": 37995,
            "feat": "FWD · V-Tex Leatherette",
            "mf": 0.00210,
            "rv36": 0.59,
            "baseAPR": 4.9,
            "leaseCash": 2000
          },
          {
            "name": "SEL Premium R-Line",
            "msrp": 52890,
            "feat": "AWD · Leather · Premium Audio",
            "mf": 0.00210,
            "rv36": 0.55,
            "baseAPR": 4.9,
            "leaseCash": 2000
          }
        ]
      }
    ]
  });
  fs.writeFileSync(carsDataPath, JSON.stringify(carsData, null, 2));
  console.log('Added Volkswagen to cars.json');
} else {
  console.log('Volkswagen already exists');
}
