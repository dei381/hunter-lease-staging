/**
 * Vehicle Database — real specs, features, and verdicts for catalog models.
 * Keyed by "Make|Model" (case-sensitive).
 */

export interface VehicleSpecs {
  engine: string;
  horsepower: string;
  transmission: string;
  drivetrain: string;
  fuelEconomy: string;
  seating: string;
  cargo: string;
  warranty: string;
}

export interface VehicleSpecsLocalized {
  en: Record<string, string>;
  ru: Record<string, string>;
}

export interface VehicleFeatures {
  technology: string[];
  safety: string[];
  interior: string[];
}

export interface VehicleFeaturesLocalized {
  en: VehicleFeatures;
  ru: VehicleFeatures;
}

export interface VehicleVerdict {
  pros: string[];
  cons: string[];
  summary: string;
}

export interface VehicleVerdictLocalized {
  en: VehicleVerdict;
  ru: VehicleVerdict;
}

export interface FuelEconomy {
  city: number;
  hwy: number;
  combined: number;
}

// ─── SPECS DATABASE ─────────────────────────────────────────────────────────

const SPECS_DB: Record<string, VehicleSpecs> = {
  // ── Toyota ──
  'Toyota|Camry': { engine: '2.5L 4-Cylinder', horsepower: '203 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD', fuelEconomy: '28/39 MPG', seating: '5 Passengers', cargo: '15.1 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|Tacoma': { engine: '2.4L Turbo 4-Cylinder', horsepower: '278 hp', transmission: '8-Speed Automatic', drivetrain: '4WD', fuelEconomy: '21/26 MPG', seating: '5 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Toyota|Sienna': { engine: '2.5L Hybrid 4-Cylinder', horsepower: '245 hp (combined)', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '35/36 MPG', seating: '7-8 Passengers', cargo: '33.5 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|Highlander': { engine: '2.5L Hybrid 4-Cylinder', horsepower: '243 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '36/35 MPG', seating: '7-8 Passengers', cargo: '16 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|Grand Highlander': { engine: '2.5L Hybrid 4-Cylinder', horsepower: '245 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '35/34 MPG', seating: '7-8 Passengers', cargo: '20.2 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|Crown Signia': { engine: '2.5L Hybrid 4-Cylinder', horsepower: '243 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '38/38 MPG', seating: '5 Passengers', cargo: '29.4 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|GR Corolla': { engine: '1.6L Turbo 3-Cylinder', horsepower: '300 hp', transmission: '6-Speed Manual', drivetrain: 'AWD', fuelEconomy: '21/28 MPG', seating: '5 Passengers', cargo: '17.8 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|Tundra': { engine: '3.4L Twin-Turbo V6', horsepower: '389 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '17/22 MPG', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Toyota|Sequoia': { engine: '3.4L Twin-Turbo V6 Hybrid', horsepower: '437 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '21/24 MPG', seating: '7-8 Passengers', cargo: '11.5 cu ft', warranty: '3 yr / 36,000 mi' },
  'Toyota|4Runner': { engine: '2.4L Turbo 4-Cylinder', horsepower: '278 hp', transmission: '8-Speed Automatic', drivetrain: '4WD', fuelEconomy: '21/25 MPG', seating: '5-7 Passengers', cargo: '41.7 cu ft', warranty: '3 yr / 36,000 mi' },

  // ── Kia ──
  'Kia|K4': { engine: '2.0L 4-Cylinder', horsepower: '147 hp', transmission: 'CVT', drivetrain: 'FWD', fuelEconomy: '30/39 MPG', seating: '5 Passengers', cargo: '14.5 cu ft', warranty: '5 yr / 60,000 mi' },
  'Kia|Seltos': { engine: '2.0L 4-Cylinder', horsepower: '147 hp', transmission: 'CVT', drivetrain: 'FWD / AWD', fuelEconomy: '29/35 MPG', seating: '5 Passengers', cargo: '26.6 cu ft', warranty: '5 yr / 60,000 mi' },
  'Kia|K5': { engine: '1.6L Turbo 4-Cylinder', horsepower: '180 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD', fuelEconomy: '29/38 MPG', seating: '5 Passengers', cargo: '16 cu ft', warranty: '5 yr / 60,000 mi' },
  'Kia|Sportage': { engine: '1.6L Turbo Hybrid', horsepower: '227 hp', transmission: '6-Speed Automatic', drivetrain: 'FWD / AWD', fuelEconomy: '42/44 MPG', seating: '5 Passengers', cargo: '39.6 cu ft', warranty: '5 yr / 60,000 mi' },
  'Kia|Sorento': { engine: '2.5L Turbo 4-Cylinder', horsepower: '281 hp', transmission: '8-Speed DCT', drivetrain: 'FWD / AWD', fuelEconomy: '22/29 MPG', seating: '7 Passengers', cargo: '12.6 cu ft', warranty: '5 yr / 60,000 mi' },
  'Kia|Niro': { engine: '1.6L Hybrid 4-Cylinder', horsepower: '139 hp', transmission: '6-Speed DCT', drivetrain: 'FWD', fuelEconomy: '53/54 MPG', seating: '5 Passengers', cargo: '22.8 cu ft', warranty: '5 yr / 60,000 mi' },
  'Kia|Carnival': { engine: '3.5L V6', horsepower: '290 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD', fuelEconomy: '19/26 MPG', seating: '7-8 Passengers', cargo: '40.2 cu ft', warranty: '5 yr / 60,000 mi' },

  // ── Acura ──
  'Acura|Integra': { engine: '1.5L Turbo 4-Cylinder', horsepower: '200 hp', transmission: 'CVT / 6-Speed MT', drivetrain: 'FWD', fuelEconomy: '30/37 MPG', seating: '5 Passengers', cargo: '24.3 cu ft', warranty: '4 yr / 50,000 mi' },
  'Acura|ADX': { engine: '1.5L Turbo 4-Cylinder', horsepower: '192 hp', transmission: 'CVT', drivetrain: 'FWD / AWD', fuelEconomy: '29/35 MPG', seating: '5 Passengers', cargo: '24.4 cu ft', warranty: '4 yr / 50,000 mi' },
  'Acura|RDX': { engine: '2.0L Turbo 4-Cylinder', horsepower: '272 hp', transmission: '10-Speed Automatic', drivetrain: 'FWD / SH-AWD', fuelEconomy: '22/28 MPG', seating: '5 Passengers', cargo: '29.5 cu ft', warranty: '4 yr / 50,000 mi' },
  'Acura|MDX': { engine: '3.5L V6', horsepower: '290 hp', transmission: '10-Speed Automatic', drivetrain: 'FWD / SH-AWD', fuelEconomy: '19/26 MPG', seating: '7 Passengers', cargo: '18.1 cu ft', warranty: '4 yr / 50,000 mi' },

  // ── Hyundai ──
  'Hyundai|Santa Fe': { engine: '2.5L Turbo 4-Cylinder', horsepower: '277 hp', transmission: '8-Speed DCT', drivetrain: 'FWD / AWD', fuelEconomy: '25/30 MPG', seating: '5-7 Passengers', cargo: '36.4 cu ft', warranty: '5 yr / 60,000 mi' },
  'Hyundai|Kona EV': { engine: 'Single Electric Motor', horsepower: '201 hp', transmission: 'Single-Speed Reduction', drivetrain: 'FWD', fuelEconomy: '132/105 MPGe', seating: '5 Passengers', cargo: '27.2 cu ft', warranty: '5 yr / 60,000 mi' },
  'Hyundai|IONIQ 5': { engine: 'Single Electric Motor', horsepower: '225 hp', transmission: 'Single-Speed Reduction', drivetrain: 'RWD / AWD', fuelEconomy: '132/113 MPGe', seating: '5 Passengers', cargo: '27.2 cu ft', warranty: '5 yr / 60,000 mi' },
  'Hyundai|Palisade': { engine: '3.8L V6', horsepower: '291 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD / AWD', fuelEconomy: '19/26 MPG', seating: '7-8 Passengers', cargo: '18 cu ft', warranty: '5 yr / 60,000 mi' },
  'Hyundai|IONIQ 9': { engine: 'Dual Electric Motor', horsepower: '218–601 hp', transmission: 'Single-Speed Reduction', drivetrain: 'RWD / AWD', fuelEconomy: '110/95 MPGe', seating: '6-7 Passengers', cargo: '55 cu ft', warranty: '5 yr / 60,000 mi' },

  // ── Ford ──
  'Ford|E-Series Cutaway': { engine: '7.3L V8', horsepower: '350 hp', transmission: '10-Speed Automatic', drivetrain: 'RWD', fuelEconomy: 'N/A', seating: '2 Passengers', cargo: 'Chassis Cab', warranty: '3 yr / 36,000 mi' },
  'Ford|Mustang Mach-E': { engine: 'Single/Dual Electric Motor', horsepower: '266–480 hp', transmission: 'Single-Speed Reduction', drivetrain: 'RWD / AWD', fuelEconomy: '105/93 MPGe', seating: '5 Passengers', cargo: '29.7 cu ft', warranty: '3 yr / 36,000 mi' },
  'Ford|Explorer': { engine: '2.3L EcoBoost Turbo', horsepower: '300 hp', transmission: '10-Speed Automatic', drivetrain: 'RWD / 4WD', fuelEconomy: '22/28 MPG', seating: '6-7 Passengers', cargo: '18.4 cu ft', warranty: '3 yr / 36,000 mi' },
  'Ford|Mustang': { engine: '5.0L Coyote V8', horsepower: '480 hp', transmission: '10-Speed Automatic / 6-Speed MT', drivetrain: 'RWD', fuelEconomy: '15/24 MPG', seating: '4 Passengers', cargo: '13.5 cu ft', warranty: '3 yr / 36,000 mi' },
  'Ford|F-150': { engine: '3.5L EcoBoost V6', horsepower: '400 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '18/24 MPG', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ford|F-150 Lightning': { engine: 'Dual Electric Motor', horsepower: '452 hp', transmission: 'Single-Speed Reduction', drivetrain: 'AWD', fuelEconomy: '76/61 MPGe', seating: '5 Passengers', cargo: 'N/A (Bed + Frunk)', warranty: '3 yr / 36,000 mi' },
  'Ford|Transit Van': { engine: '3.5L EcoBoost V6', horsepower: '310 hp', transmission: '10-Speed Automatic', drivetrain: 'RWD / AWD', fuelEconomy: '14/18 MPG', seating: '2-15 Passengers', cargo: 'Up to 487 cu ft', warranty: '3 yr / 36,000 mi' },
  'Ford|Transit Cutaway': { engine: '3.5L EcoBoost V6', horsepower: '310 hp', transmission: '10-Speed Automatic', drivetrain: 'RWD', fuelEconomy: '14/18 MPG', seating: '2 Passengers', cargo: 'Chassis Cab', warranty: '3 yr / 36,000 mi' },
  'Ford|Bronco': { engine: '2.7L EcoBoost V6', horsepower: '330 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '19/22 MPG', seating: '5 Passengers', cargo: '35.6 cu ft', warranty: '3 yr / 36,000 mi' },
  'Ford|F-350 Super Duty': { engine: '6.7L Power Stroke Diesel V8', horsepower: '475 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ford|F-350 Super Duty Chassis Cab': { engine: '6.7L Power Stroke Diesel V8', horsepower: '475 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '2-3 Passengers', cargo: 'Chassis Cab', warranty: '3 yr / 36,000 mi' },
  'Ford|F-450 Super Duty Chassis Cab': { engine: '6.7L Power Stroke Diesel V8', horsepower: '475 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '2-3 Passengers', cargo: 'Chassis Cab', warranty: '3 yr / 36,000 mi' },
  'Ford|F-550 Super Duty Chassis Cab': { engine: '6.7L Power Stroke Diesel V8', horsepower: '475 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '2-3 Passengers', cargo: 'Chassis Cab', warranty: '3 yr / 36,000 mi' },

  // ── Volvo ──
  'Volvo|XC40': { engine: '2.0L Turbo 4-Cylinder', horsepower: '247 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD / AWD', fuelEconomy: '25/33 MPG', seating: '5 Passengers', cargo: '20.7 cu ft', warranty: '4 yr / 50,000 mi' },
  'Volvo|EX30': { engine: 'Single/Dual Electric Motor', horsepower: '268–422 hp', transmission: 'Single-Speed Reduction', drivetrain: 'RWD / AWD', fuelEconomy: '103/97 MPGe', seating: '5 Passengers', cargo: '14.6 cu ft', warranty: '4 yr / 50,000 mi' },
  'Volvo|XC60': { engine: '2.0L Turbo+Supercharged 4-Cyl', horsepower: '295 hp', transmission: '8-Speed Automatic', drivetrain: 'AWD', fuelEconomy: '23/30 MPG', seating: '5 Passengers', cargo: '22.4 cu ft', warranty: '4 yr / 50,000 mi' },

  // ── Chevrolet ──
  'Chevrolet|Traverse': { engine: '2.5L Turbo 4-Cylinder', horsepower: '315 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD / AWD', fuelEconomy: '22/27 MPG', seating: '7-8 Passengers', cargo: '23.6 cu ft', warranty: '3 yr / 36,000 mi' },
  'Chevrolet|Tahoe': { engine: '5.3L EcoTec3 V8', horsepower: '355 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '16/20 MPG', seating: '7-8 Passengers', cargo: '25.5 cu ft', warranty: '3 yr / 36,000 mi' },
  'Chevrolet|Silverado 1500': { engine: '5.3L EcoTec3 V8', horsepower: '355 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '16/21 MPG', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Chevrolet|Silverado 2500HD': { engine: '6.6L Duramax Diesel V8', horsepower: '470 hp', transmission: '10-Speed Allison', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Chevrolet|Suburban': { engine: '5.3L EcoTec3 V8', horsepower: '355 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '15/20 MPG', seating: '7-9 Passengers', cargo: '41.5 cu ft', warranty: '3 yr / 36,000 mi' },
  'Chevrolet|Corvette': { engine: '6.2L LT2 V8', horsepower: '490 hp', transmission: '8-Speed DCT', drivetrain: 'RWD', fuelEconomy: '16/24 MPG', seating: '2 Passengers', cargo: '12.6 cu ft', warranty: '3 yr / 36,000 mi' },

  // ── Genesis ──
  'Genesis|GV80': { engine: '2.5L Turbo 4-Cylinder', horsepower: '300 hp', transmission: '8-Speed Automatic', drivetrain: 'RWD / AWD', fuelEconomy: '22/28 MPG', seating: '5-7 Passengers', cargo: '34 cu ft', warranty: '5 yr / 60,000 mi' },
  'Genesis|GV80 Coupe': { engine: '3.5L Twin-Turbo V6', horsepower: '375 hp', transmission: '8-Speed Automatic', drivetrain: 'AWD', fuelEconomy: '19/25 MPG', seating: '5 Passengers', cargo: '28 cu ft', warranty: '5 yr / 60,000 mi' },
  'Genesis|G80': { engine: '2.5L Turbo 4-Cylinder', horsepower: '300 hp', transmission: '8-Speed Automatic', drivetrain: 'RWD / AWD', fuelEconomy: '23/32 MPG', seating: '5 Passengers', cargo: '13.1 cu ft', warranty: '5 yr / 60,000 mi' },
  'Genesis|GV70': { engine: '2.5L Turbo 4-Cylinder', horsepower: '300 hp', transmission: '8-Speed DCT', drivetrain: 'RWD / AWD', fuelEconomy: '22/28 MPG', seating: '5 Passengers', cargo: '28.9 cu ft', warranty: '5 yr / 60,000 mi' },
  'Genesis|GV60': { engine: 'Dual Electric Motor', horsepower: '314 hp', transmission: 'Single-Speed Reduction', drivetrain: 'AWD', fuelEconomy: '97/90 MPGe', seating: '5 Passengers', cargo: '24 cu ft', warranty: '5 yr / 60,000 mi' },
  'Genesis|G90': { engine: '3.5L Twin-Turbo V6', horsepower: '409 hp', transmission: '8-Speed Automatic', drivetrain: 'AWD', fuelEconomy: '18/25 MPG', seating: '5 Passengers', cargo: '12.8 cu ft', warranty: '5 yr / 60,000 mi' },

  // ── Ram ──
  'Ram|ProMaster Cargo Van': { engine: '3.6L Pentastar V6', horsepower: '276 hp', transmission: '9-Speed Automatic', drivetrain: 'FWD', fuelEconomy: '15/21 MPG', seating: '2-3 Passengers', cargo: 'Up to 420 cu ft', warranty: '3 yr / 36,000 mi' },
  'Ram|Ram 1500 Pickup': { engine: '3.0L Hurricane Twin-Turbo I6', horsepower: '420 hp', transmission: '8-Speed Automatic', drivetrain: '4WD', fuelEconomy: '18/24 MPG', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ram|1500 Pickup': { engine: '3.0L Hurricane Twin-Turbo I6', horsepower: '420 hp', transmission: '8-Speed Automatic', drivetrain: '4WD', fuelEconomy: '18/24 MPG', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ram|Ram 2500 Pickup': { engine: '6.7L Cummins Turbo Diesel I6', horsepower: '370 hp', transmission: '6-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ram|2500 Pickup': { engine: '6.7L Cummins Turbo Diesel I6', horsepower: '370 hp', transmission: '6-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ram|Ram 3500 Pickup': { engine: '6.7L Cummins Turbo Diesel I6', horsepower: '400 hp', transmission: '6-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },
  'Ram|3500 Pickup': { engine: '6.7L Cummins Turbo Diesel I6', horsepower: '400 hp', transmission: '6-Speed Automatic', drivetrain: '4WD', fuelEconomy: 'N/A', seating: '5-6 Passengers', cargo: 'N/A (Bed)', warranty: '3 yr / 36,000 mi' },

  // ── Lexus ──
  'Lexus|RX': { engine: '2.4L Turbo 4-Cylinder', horsepower: '275 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD / AWD', fuelEconomy: '22/29 MPG', seating: '5 Passengers', cargo: '29.6 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|RX Hybrid': { engine: '2.5L Hybrid 4-Cylinder', horsepower: '246 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '37/36 MPG', seating: '5 Passengers', cargo: '29.6 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|RX PHEV': { engine: '2.5L PHEV 4-Cylinder', horsepower: '304 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '37 mi EV range', seating: '5 Passengers', cargo: '26.4 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|TX': { engine: '2.4L Turbo 4-Cylinder', horsepower: '275 hp', transmission: '8-Speed Automatic', drivetrain: 'FWD / AWD', fuelEconomy: '21/28 MPG', seating: '7-8 Passengers', cargo: '19 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|TX Hybrid': { engine: '2.5L Hybrid 4-Cylinder', horsepower: '250 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '36/33 MPG', seating: '7-8 Passengers', cargo: '19 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|TX PHEV': { engine: '2.5L PHEV 4-Cylinder', horsepower: '304 hp', transmission: 'eCVT', drivetrain: 'AWD', fuelEconomy: '37 mi EV range', seating: '7-8 Passengers', cargo: '19 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|LX': { engine: '3.4L Twin-Turbo V6', horsepower: '409 hp', transmission: '10-Speed Automatic', drivetrain: '4WD', fuelEconomy: '17/22 MPG', seating: '5-7 Passengers', cargo: '12.3 cu ft', warranty: '4 yr / 50,000 mi' },
  'Lexus|LC': { engine: '5.0L V8', horsepower: '471 hp', transmission: '10-Speed Automatic', drivetrain: 'RWD', fuelEconomy: '16/25 MPG', seating: '4 Passengers', cargo: '5.4 cu ft', warranty: '4 yr / 50,000 mi' },
};

// ─── FEATURES DATABASE ──────────────────────────────────────────────────────

const FEATURES_DB: Record<string, { en: VehicleFeatures; ru: VehicleFeatures }> = {
  // ── Toyota ──
  'Toyota|Camry': {
    en: {
      technology: ['12.3" Touchscreen Display', 'Wireless Apple CarPlay & Android Auto', '6-Speaker Audio System', 'USB-C Charging Ports', 'Digital Instrument Cluster'],
      safety: ['Toyota Safety Sense 3.0', 'Pre-Collision System w/ Pedestrian Detection', 'Lane Departure Alert', 'Adaptive Cruise Control', 'Blind Spot Monitor'],
      interior: ['Sport Fabric Seats', 'Dual-Zone Auto Climate Control', '8-Way Power Driver Seat', 'Push Button Start', 'Smart Key System'],
    },
    ru: {
      technology: ['12.3" сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема 6 динамиков', 'USB-C зарядные порты', 'Цифровая приборная панель'],
      safety: ['Toyota Safety Sense 3.0', 'Система предотвращения столкновений', 'Предупреждение о выезде из полосы', 'Адаптивный круиз-контроль', 'Мониторинг слепых зон'],
      interior: ['Спортивные тканевые сиденья', 'Двухзонный климат-контроль', '8-позиционная регулировка водительского сиденья', 'Кнопка запуска', 'Система бесключевого доступа'],
    }
  },
  'Toyota|Tacoma': {
    en: {
      technology: ['14" Touchscreen Display', 'Wireless Apple CarPlay & Android Auto', 'JBL Premium Audio (8 Speakers)', 'Panoramic View Monitor', 'Head-Up Display'],
      safety: ['Toyota Safety Sense 3.0', 'Multi-Terrain Monitor', 'Downhill Assist Control', 'Adaptive Cruise Control', 'Blind Spot Monitor'],
      interior: ['SofTex-Trimmed Seats', 'Heated Front Seats', 'Dual-Zone Auto Climate Control', 'Multi-Terrain Select System', 'Smart Key System'],
    },
    ru: {
      technology: ['14" сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема JBL Premium (8 динамиков)', 'Панорамный обзор', 'Проекционный дисплей'],
      safety: ['Toyota Safety Sense 3.0', 'Монитор бездорожья', 'Ассистент спуска', 'Адаптивный круиз-контроль', 'Мониторинг слепых зон'],
      interior: ['Сиденья SofTex', 'Подогрев передних сидений', 'Двухзонный климат-контроль', 'Система Multi-Terrain Select', 'Система бесключевого доступа'],
    }
  },

  // ── Kia ──
  'Kia|K4': {
    en: {
      technology: ['12.3" Dual Panoramic Display', 'Wireless Apple CarPlay & Android Auto', 'Bose Premium Audio', 'Wireless Phone Charger', 'LED Ambient Lighting'],
      safety: ['Forward Collision-Avoidance Assist', 'Lane Following Assist', 'Blind-Spot View Monitor', 'Highway Driving Assist', 'Rear Cross-Traffic Alert'],
      interior: ['Cloth/Synthetic Leather Seats', 'Heated Front Seats', 'Dual-Zone Climate Control', 'Push Button Start', '60/40 Split Folding Rear Seats'],
    },
    ru: {
      technology: ['12.3" двойной панорамный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Bose Premium', 'Беспроводная зарядка', 'LED-подсветка салона'],
      safety: ['Ассистент предотвращения столкновений', 'Ассистент удержания полосы', 'Камера слепых зон', 'Ассистент движения по шоссе', 'Предупреждение о помехах сзади'],
      interior: ['Комбинированная обивка ткань/эко-кожа', 'Подогрев передних сидений', 'Двухзонный климат-контроль', 'Кнопка запуска', 'Складывающиеся задние сиденья 60/40'],
    }
  },

  // ── Acura ──
  'Acura|Integra': {
    en: {
      technology: ['9" HD Touchscreen', 'Wireless Apple CarPlay & Android Auto', 'ELS Studio Premium Audio (16 Speakers)', 'Wireless Phone Charger', 'Digital Instrument Cluster'],
      safety: ['AcuraWatch Suite', 'Collision Mitigation Braking', 'Adaptive Cruise Control', 'Lane Keeping Assist', 'Traffic Sign Recognition'],
      interior: ['Premium Sport Seats', 'Heated Front Seats', 'Dual-Zone Climate Control', 'Leather-Wrapped Steering Wheel', 'Panoramic Moonroof'],
    },
    ru: {
      technology: ['9" HD сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема ELS Studio (16 динамиков)', 'Беспроводная зарядка', 'Цифровая приборная панель'],
      safety: ['Комплекс AcuraWatch', 'Автоматическое торможение', 'Адаптивный круиз-контроль', 'Ассистент удержания полосы', 'Распознавание дорожных знаков'],
      interior: ['Премиум спортивные сиденья', 'Подогрев передних сидений', 'Двухзонный климат-контроль', 'Руль в кожаной отделке', 'Панорамный люк'],
    }
  },

  // ── Hyundai ──
  'Hyundai|Santa Fe': {
    en: {
      technology: ['12.3" Touchscreen Display', 'Wireless Apple CarPlay & Android Auto', 'Bose Premium Audio (12 Speakers)', 'Wireless Phone Charger', 'Head-Up Display'],
      safety: ['SmartSense Safety Suite', 'Forward Collision-Avoidance Assist', 'Highway Driving Assist 2', 'Blind-Spot View Monitor', 'Remote Smart Parking Assist'],
      interior: ['Leather Seating Surfaces', 'Heated & Ventilated Front Seats', 'Tri-Zone Auto Climate Control', 'Panoramic Sunroof', 'Power Liftgate'],
    },
    ru: {
      technology: ['12.3" сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Bose Premium (12 динамиков)', 'Беспроводная зарядка', 'Проекционный дисплей'],
      safety: ['Комплекс SmartSense', 'Ассистент предотвращения столкновений', 'Ассистент движения по шоссе 2', 'Камера слепых зон', 'Дистанционная парковка'],
      interior: ['Кожаная обивка', 'Подогрев и вентиляция передних сидений', 'Трёхзонный климат-контроль', 'Панорамная крыша', 'Электрический багажник'],
    }
  },

  // ── Ford ──
  'Ford|F-150': {
    en: {
      technology: ['12" Touchscreen (SYNC 4A)', 'Wireless Apple CarPlay & Android Auto', 'B&O Unleashed Audio (18 Speakers)', 'Pro Power Onboard (2.4kW)', 'FordPass Connect'],
      safety: ['Ford Co-Pilot360 2.0', 'Pre-Collision Assist w/ AEB', 'Adaptive Cruise Control', 'Blind Spot Information System', 'Pro Trailer Backup Assist'],
      interior: ['Leather-Trimmed Seats', 'Heated & Ventilated Front Seats', 'Dual-Zone Climate Control', 'Interior Work Surface', 'Max Recline Seats'],
    },
    ru: {
      technology: ['12" сенсорный дисплей (SYNC 4A)', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема B&O (18 динамиков)', 'Бортовая розетка Pro Power (2.4kW)', 'FordPass Connect'],
      safety: ['Ford Co-Pilot360 2.0', 'Ассистент предотвращения столкновений', 'Адаптивный круиз-контроль', 'Система контроля слепых зон', 'Ассистент парковки прицепа'],
      interior: ['Кожаная обивка', 'Подогрев и вентиляция передних сидений', 'Двухзонный климат-контроль', 'Рабочая поверхность в салоне', 'Полностью раскладывающиеся сиденья'],
    }
  },
  'Ford|Bronco': {
    en: {
      technology: ['12" Touchscreen (SYNC 4)', 'Wireless Apple CarPlay & Android Auto', 'Bang & Olufsen Audio (10 Speakers)', 'Trail Turn Assist', 'Off-Road Navigation'],
      safety: ['Ford Co-Pilot360', 'Pre-Collision Assist w/ AEB', 'Adaptive Cruise Control', 'Blind Spot Information System', 'Rear View Camera'],
      interior: ['Marine-Grade Vinyl Seats', 'Washout Interior with Drain Plugs', 'Dual-Zone Climate Control', 'Removable Doors & Roof', 'Grab Handles'],
    },
    ru: {
      technology: ['12" сенсорный дисплей (SYNC 4)', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Bang & Olufsen (10 динамиков)', 'Ассистент разворота на бездорожье', 'Навигация для бездорожья'],
      safety: ['Ford Co-Pilot360', 'Ассистент предотвращения столкновений', 'Адаптивный круиз-контроль', 'Система контроля слепых зон', 'Камера заднего вида'],
      interior: ['Сиденья из морского винила', 'Моющийся салон с дренажом', 'Двухзонный климат-контроль', 'Съёмные двери и крыша', 'Ручки-поручни'],
    }
  },

  // ── Volvo ──
  'Volvo|XC40': {
    en: {
      technology: ['9" Touchscreen (Google Built-In)', 'Wireless Apple CarPlay & Android Auto', 'Harman Kardon Premium Audio (13 Speakers)', 'Wireless Phone Charger', 'Digital Driver Display'],
      safety: ['City Safety w/ Pedestrian Detection', 'Pilot Assist (Semi-Autonomous)', 'Lane Keeping Aid', 'Blind Spot Information System', '360-Degree Camera'],
      interior: ['Leather Seating Surfaces', 'Heated Front Seats & Steering Wheel', 'Dual-Zone Climate Control', 'Panoramic Moonroof', 'Power Liftgate'],
    },
    ru: {
      technology: ['9" сенсорный дисплей (Google Built-In)', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Harman Kardon (13 динамиков)', 'Беспроводная зарядка', 'Цифровая приборная панель'],
      safety: ['City Safety с распознаванием пешеходов', 'Pilot Assist (полуавтоном)', 'Ассистент удержания полосы', 'Система контроля слепых зон', 'Камера кругового обзора 360°'],
      interior: ['Кожаная обивка', 'Подогрев сидений и руля', 'Двухзонный климат-контроль', 'Панорамная крыша', 'Электрический багажник'],
    }
  },

  // ── Chevrolet ──
  'Chevrolet|Tahoe': {
    en: {
      technology: ['13.4" Diagonal Touchscreen', 'Wireless Apple CarPlay & Android Auto', 'Bose Premium Audio (10 Speakers)', 'Head-Up Display', 'Google Built-In'],
      safety: ['Chevy Safety Assist', 'Automatic Emergency Braking', 'Adaptive Cruise Control', 'HD Surround Vision', 'Rear Cross Traffic Alert'],
      interior: ['Perforated Leather Seating', 'Heated & Ventilated Front Seats', 'Tri-Zone Auto Climate Control', 'Power-Folding 3rd Row', 'Panoramic Sunroof'],
    },
    ru: {
      technology: ['13.4" сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Bose Premium (10 динамиков)', 'Проекционный дисплей', 'Google Built-In'],
      safety: ['Комплекс Chevy Safety Assist', 'Автоматическое торможение', 'Адаптивный круиз-контроль', 'HD камера кругового обзора', 'Предупреждение о помехах сзади'],
      interior: ['Перфорированная кожаная обивка', 'Подогрев и вентиляция передних сидений', 'Трёхзонный климат-контроль', 'Электроскладывание 3-го ряда', 'Панорамная крыша'],
    }
  },
  'Chevrolet|Corvette': {
    en: {
      technology: ['8" Diagonal Touchscreen', 'Wireless Apple CarPlay & Android Auto', 'Bose Performance Audio (14 Speakers)', 'Performance Data Recorder', 'Head-Up Display'],
      safety: ['Performance Traction Management', 'Front Lift System', 'Rear Cross Traffic Alert', 'Blind Zone Alert', 'Rear Park Assist'],
      interior: ['GT2 Leather Bucket Seats', 'Heated & Ventilated Seats', 'Dual-Zone Climate Control', 'Flat-Bottom Steering Wheel', 'Carbon Fiber Interior Trim'],
    },
    ru: {
      technology: ['8" сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Bose Performance (14 динамиков)', 'Рекордер данных вождения', 'Проекционный дисплей'],
      safety: ['Система управления тягой', 'Система подъёма передней части', 'Предупреждение о помехах сзади', 'Контроль слепых зон', 'Ассистент парковки'],
      interior: ['Кожаные ковшеобразные сиденья GT2', 'Подогрев и вентиляция сидений', 'Двухзонный климат-контроль', 'Плоский руль', 'Отделка карбоном'],
    }
  },

  // ── Genesis ──
  'Genesis|GV80': {
    en: {
      technology: ['14.5" OLED Touchscreen', 'Wireless Apple CarPlay & Android Auto', 'Lexicon Premium Audio (21 Speakers)', 'Augmented Reality Navigation', 'Fingerprint Authentication'],
      safety: ['Highway Driving Assist 2', 'Forward Collision-Avoidance Assist', 'Blind-Spot View Monitor', 'Remote Smart Parking Assist 2', 'Rear Cross-Traffic Alert'],
      interior: ['Nappa Leather Seating', 'Heated & Ventilated Front/Rear Seats', 'Tri-Zone Climate Control', 'Panoramic Sunroof', 'Power-Folding 3rd Row'],
    },
    ru: {
      technology: ['14.5" OLED дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Lexicon Premium (21 динамик)', 'AR-навигация', 'Аутентификация по отпечатку пальца'],
      safety: ['Ассистент движения по шоссе 2', 'Ассистент предотвращения столкновений', 'Камера слепых зон', 'Дистанционная парковка 2', 'Предупреждение о помехах сзади'],
      interior: ['Обивка Nappa кожа', 'Подогрев и вентиляция передних/задних сидений', 'Трёхзонный климат-контроль', 'Панорамная крыша', 'Электроскладывание 3-го ряда'],
    }
  },

  // ── Lexus ──
  'Lexus|RX': {
    en: {
      technology: ['14" Touchscreen Display', 'Wireless Apple CarPlay & Android Auto', 'Mark Levinson Premium Audio (21 Speakers)', 'Head-Up Display', 'Digital Key'],
      safety: ['Lexus Safety System+ 3.0', 'Pre-Collision System', 'Dynamic Radar Cruise Control', 'Lane Departure Alert', 'Blind Spot Monitor'],
      interior: ['Semi-Aniline Leather', 'Heated & Ventilated Front Seats', 'Dual-Zone Climate Control', 'Panoramic Glass Roof', 'Power Liftgate'],
    },
    ru: {
      technology: ['14" сенсорный дисплей', 'Беспроводной Apple CarPlay и Android Auto', 'Аудиосистема Mark Levinson (21 динамик)', 'Проекционный дисплей', 'Цифровой ключ'],
      safety: ['Lexus Safety System+ 3.0', 'Система предотвращения столкновений', 'Радарный круиз-контроль', 'Предупреждение о выезде из полосы', 'Мониторинг слепых зон'],
      interior: ['Полуанилиновая кожа', 'Подогрев и вентиляция передних сидений', 'Двухзонный климат-контроль', 'Панорамная стеклянная крыша', 'Электрический багажник'],
    }
  },
};

// ─── VERDICTS DATABASE ──────────────────────────────────────────────────────

const VERDICTS_DB: Record<string, { en: VehicleVerdict; ru: VehicleVerdict }> = {
  'Toyota|Camry': {
    en: {
      pros: ['Exceptional reliability and resale value', 'Fuel-efficient 2.5L engine', 'Comprehensive Toyota Safety Sense 3.0 suite'],
      cons: ['No available AWD option', 'Infotainment can lag with complex inputs', 'Road noise at highway speeds'],
      summary: 'The Toyota Camry remains the gold standard for midsize sedans, delivering proven reliability, excellent fuel economy, and strong resale value. Its comfortable ride and comprehensive safety features make it an outstanding daily driver.',
    },
    ru: {
      pros: ['Исключительная надёжность и остаточная стоимость', 'Экономичный двигатель 2.5L', 'Полный комплекс Toyota Safety Sense 3.0'],
      cons: ['Нет полного привода', 'Мультимедиа может тормозить', 'Шум на трассовых скоростях'],
      summary: 'Toyota Camry остаётся золотым стандартом среди среднеразмерных седанов — проверенная надёжность, отличная экономичность и высокая остаточная стоимость. Комфортная езда и полный набор систем безопасности делают его идеальным ежедневным автомобилем.',
    }
  },
  'Toyota|Tacoma': {
    en: {
      pros: ['Legendary off-road capability', 'Outstanding resale value', 'New 2.4L turbo is a huge upgrade'],
      cons: ['Ride quality can be stiff on-road', 'Fuel economy trails competitors', 'Higher price point than segment average'],
      summary: 'The redesigned Tacoma brings a powerful new turbo engine and modern tech to Toyota\'s legendary midsize truck. It excels off-road while offering much-improved daily driving comfort.',
    },
    ru: {
      pros: ['Легендарная проходимость', 'Выдающаяся остаточная стоимость', 'Новый турбомотор 2.4L — значительный шаг вперёд'],
      cons: ['Жёсткая подвеска на дороге', 'Расход топлива выше конкурентов', 'Цена выше среднего по сегменту'],
      summary: 'Обновлённая Tacoma получила мощный новый турбомотор и современные технологии. Она отлично показывает себя на бездорожье и стала значительно комфортнее в городе.',
    }
  },
  'Kia|K4': {
    en: {
      pros: ['Best-in-class interior design', 'Excellent standard tech features', 'Industry-leading 5yr/60K warranty'],
      cons: ['CVT may not please driving enthusiasts', 'Base engine is modest for highway merging', 'Limited rear headroom'],
      summary: 'The Kia K4 impresses with upscale interior design, a loaded feature set, and outstanding warranty coverage. It delivers exceptional value in the compact sedan segment.',
    },
    ru: {
      pros: ['Лучший интерьер в классе', 'Отличное стандартное оснащение', 'Лучшая гарантия 5 лет / 60,000 миль'],
      cons: ['Вариатор может не понравиться энтузиастам', 'Базовый мотор слабоват для трассы', 'Ограниченное пространство над головой сзади'],
      summary: 'Kia K4 впечатляет премиальным интерьером, богатым оснащением и лучшей гарантией на рынке. Отличное соотношение цены и качества в сегменте компактных седанов.',
    }
  },
  'Ford|F-150': {
    en: {
      pros: ['Versatile powertrains including hybrid', 'Pro Power Onboard is a game-changer', 'Hugely capable towing and payload'],
      cons: ['Higher trims get very expensive', 'Fuel economy is modest for the class', 'Infotainment can be distracting'],
      summary: 'The Ford F-150 continues to lead the full-size truck segment with unmatched versatility, innovative features like Pro Power Onboard, and a wide range of configurations to suit any need.',
    },
    ru: {
      pros: ['Разнообразие силовых установок, включая гибрид', 'Pro Power Onboard — революция', 'Огромная грузоподъёмность и буксировочная способность'],
      cons: ['Дорогие старшие комплектации', 'Умеренная экономичность', 'Мультимедиа может отвлекать'],
      summary: 'Ford F-150 продолжает лидировать в сегменте полноразмерных пикапов благодаря непревзойдённой универсальности, инновационным функциям и широкому выбору конфигураций.',
    }
  },
  'Hyundai|Santa Fe': {
    en: {
      pros: ['Bold, modern exterior design', 'Spacious and premium interior', 'Advanced SmartSense safety suite'],
      cons: ['Turbo engine can be jerky at low speeds', 'No V6 option available', 'Some interior materials feel hollow'],
      summary: 'The Hyundai Santa Fe stands out with its striking design, spacious cabin, and advanced technology. It offers compelling value in the midsize SUV segment with a generous warranty.',
    },
    ru: {
      pros: ['Смелый современный дизайн', 'Просторный и премиальный интерьер', 'Продвинутый комплекс безопасности SmartSense'],
      cons: ['Турбомотор может дёргаться на низких скоростях', 'Нет опции V6', 'Некоторые материалы салона ощущаются пустотелыми'],
      summary: 'Hyundai Santa Fe выделяется ярким дизайном, просторным салоном и продвинутыми технологиями. Отличное предложение в сегменте среднеразмерных кроссоверов с щедрой гарантией.',
    }
  },
  'Genesis|GV80': {
    en: {
      pros: ['Stunning interior quality and materials', 'Smooth, refined ride quality', 'Outstanding value vs. German competitors'],
      cons: ['Brand awareness still growing', 'Dealer network is limited', 'Infotainment has a learning curve'],
      summary: 'The Genesis GV80 delivers a truly luxury experience at a price that undercuts BMW X5 and Mercedes GLE significantly. Its refined ride, premium materials, and advanced tech make it one of the best values in luxury SUVs.',
    },
    ru: {
      pros: ['Потрясающее качество интерьера и материалов', 'Плавная, утончённая езда', 'Выдающаяся стоимость по сравнению с немецкими конкурентами'],
      cons: ['Узнаваемость бренда ещё растёт', 'Дилерская сеть ограничена', 'Мультимедиа требует привыкания'],
      summary: 'Genesis GV80 обеспечивает настоящий люксовый опыт по цене значительно ниже BMW X5 и Mercedes GLE. Плавная езда, премиальные материалы и продвинутые технологии делают его одним из лучших предложений среди люксовых кроссоверов.',
    }
  },
  'Volvo|XC40': {
    en: {
      pros: ['Industry-leading safety technology', 'Google Built-In infotainment is excellent', 'Compact yet practical cargo space'],
      cons: ['Limited rear seat legroom', 'Performance is adequate, not exciting', 'Premium price for the segment'],
      summary: 'The Volvo XC40 brings Scandinavian design, class-leading safety, and a refined tech experience to the compact luxury SUV segment. Its Google-powered infotainment is among the best in the industry.',
    },
    ru: {
      pros: ['Лидирующие технологии безопасности', 'Отличная мультимедиа на базе Google', 'Компактный, но практичный багажник'],
      cons: ['Ограниченное пространство для ног сзади', 'Динамика адекватная, но не захватывающая', 'Премиальная цена для сегмента'],
      summary: 'Volvo XC40 привносит скандинавский дизайн, лучшую безопасность в классе и продвинутую мультимедиа в сегмент компактных люксовых кроссоверов.',
    }
  },
  'Chevrolet|Tahoe': {
    en: {
      pros: ['Massive interior space and capability', 'Powerful V8 engine options', 'Strong towing capacity (8,400 lbs)'],
      cons: ['Large footprint difficult in cities', 'Fuel economy is significant expense', 'Base model lacks many features'],
      summary: 'The Chevrolet Tahoe is the ultimate full-size SUV for families who need space, power, and towing capability. Its cavernous interior and proven V8 powertrain make it a go-to choice for those who need serious hauling ability.',
    },
    ru: {
      pros: ['Огромное пространство и возможности', 'Мощные двигатели V8', 'Отличная буксировочная способность (3 800 кг)'],
      cons: ['Большие габариты сложны в городе', 'Расход топлива — серьёзная статья расходов', 'Базовая комплектация бедная'],
      summary: 'Chevrolet Tahoe — идеальный полноразмерный SUV для семей, которым нужно пространство, мощность и буксировочная способность. Огромный салон и проверенный V8 делают его выбором номер один для серьёзных задач.',
    }
  },
  'Lexus|RX': {
    en: {
      pros: ['Exceptionally smooth and quiet ride', 'Premium interior with attention to detail', 'Outstanding reliability track record'],
      cons: ['Not as sporty as some competitors', 'Touchscreen can be distracting while driving', 'Cargo space is average for the class'],
      summary: 'The Lexus RX defines the luxury midsize SUV segment with its silky-smooth ride, meticulous build quality, and outstanding reliability. It\'s the perfect choice for buyers seeking refinement and peace of mind.',
    },
    ru: {
      pros: ['Исключительно плавная и тихая езда', 'Премиальный интерьер с вниманием к деталям', 'Выдающаяся надёжность'],
      cons: ['Не такой спортивный, как некоторые конкуренты', 'Сенсорный дисплей может отвлекать за рулём', 'Объём багажника средний для класса'],
      summary: 'Lexus RX определяет сегмент люксовых среднеразмерных SUV шёлковой плавностью хода, безупречным качеством сборки и выдающейся надёжностью. Идеальный выбор для тех, кто ценит утончённость и спокойствие.',
    }
  },
};

// ─── FUEL ECONOMY DATABASE ──────────────────────────────────────────────────

const FUEL_DB: Record<string, FuelEconomy> = {
  'Toyota|Camry': { city: 28, hwy: 39, combined: 32 },
  'Toyota|Tacoma': { city: 21, hwy: 26, combined: 23 },
  'Toyota|Sienna': { city: 35, hwy: 36, combined: 36 },
  'Toyota|Highlander': { city: 36, hwy: 35, combined: 36 },
  'Toyota|Grand Highlander': { city: 35, hwy: 34, combined: 35 },
  'Toyota|Crown Signia': { city: 38, hwy: 38, combined: 38 },
  'Toyota|GR Corolla': { city: 21, hwy: 28, combined: 24 },
  'Toyota|Tundra': { city: 17, hwy: 22, combined: 19 },
  'Toyota|Sequoia': { city: 21, hwy: 24, combined: 22 },
  'Kia|K4': { city: 30, hwy: 39, combined: 33 },
  'Kia|Seltos': { city: 29, hwy: 35, combined: 31 },
  'Kia|K5': { city: 29, hwy: 38, combined: 32 },
  'Kia|Sportage': { city: 42, hwy: 44, combined: 43 },
  'Kia|Sorento': { city: 22, hwy: 29, combined: 25 },
  'Kia|Niro': { city: 53, hwy: 54, combined: 53 },
  'Kia|Carnival': { city: 19, hwy: 26, combined: 22 },
  'Acura|Integra': { city: 30, hwy: 37, combined: 33 },
  'Acura|ADX': { city: 29, hwy: 35, combined: 31 },
  'Acura|RDX': { city: 22, hwy: 28, combined: 24 },
  'Acura|MDX': { city: 19, hwy: 26, combined: 22 },
  'Hyundai|Santa Fe': { city: 25, hwy: 30, combined: 27 },
  'Hyundai|Kona EV': { city: 132, hwy: 105, combined: 120 },
  'Hyundai|IONIQ 5': { city: 132, hwy: 113, combined: 114 },
  'Hyundai|Palisade': { city: 19, hwy: 26, combined: 22 },
  'Hyundai|IONIQ 9': { city: 110, hwy: 95, combined: 100 },
  'Ford|Mustang Mach-E': { city: 105, hwy: 93, combined: 100 },
  'Ford|Explorer': { city: 22, hwy: 28, combined: 24 },
  'Ford|Mustang': { city: 15, hwy: 24, combined: 18 },
  'Ford|F-150': { city: 18, hwy: 24, combined: 20 },
  'Ford|F-150 Lightning': { city: 76, hwy: 61, combined: 68 },
  'Ford|Bronco': { city: 19, hwy: 22, combined: 20 },
  'Volvo|XC40': { city: 25, hwy: 33, combined: 28 },
  'Volvo|EX30': { city: 103, hwy: 97, combined: 100 },
  'Volvo|XC60': { city: 23, hwy: 30, combined: 26 },
  'Chevrolet|Traverse': { city: 22, hwy: 27, combined: 24 },
  'Chevrolet|Tahoe': { city: 16, hwy: 20, combined: 17 },
  'Chevrolet|Silverado 1500': { city: 16, hwy: 21, combined: 18 },
  'Chevrolet|Suburban': { city: 15, hwy: 20, combined: 17 },
  'Chevrolet|Corvette': { city: 16, hwy: 24, combined: 19 },
  'Genesis|GV80': { city: 22, hwy: 28, combined: 24 },
  'Genesis|G80': { city: 23, hwy: 32, combined: 26 },
  'Genesis|GV70': { city: 22, hwy: 28, combined: 24 },
  'Genesis|GV60': { city: 97, hwy: 90, combined: 94 },
  'Genesis|G90': { city: 18, hwy: 25, combined: 21 },
  'Lexus|RX': { city: 22, hwy: 29, combined: 25 },
  'Lexus|TX': { city: 21, hwy: 28, combined: 24 },
  'Lexus|LX': { city: 17, hwy: 22, combined: 19 },
  'Lexus|LC': { city: 16, hwy: 25, combined: 19 },
};


// ─── LOOKUP FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Look up specs by make + model. Falls back to body-type-based defaults.
 */
export function lookupSpecs(make: string, model: string): VehicleSpecsLocalized {
  const key = `${make}|${model}`;
  const data = SPECS_DB[key];

  if (data) {
    return {
      en: {
        Engine: data.engine,
        Horsepower: data.horsepower,
        Transmission: data.transmission,
        Drivetrain: data.drivetrain,
        'Fuel Economy': data.fuelEconomy,
        Seating: data.seating,
        'Cargo Space': data.cargo,
        Warranty: data.warranty,
      },
      ru: {
        'Двигатель': data.engine,
        'Мощность': data.horsepower,
        'Трансмиссия': data.transmission,
        'Привод': data.drivetrain,
        'Расход': data.fuelEconomy,
        'Мест': data.seating,
        'Багажник': data.cargo,
        'Гарантия': data.warranty,
      },
    };
  }

  // Fallback — generate reasonable defaults based on make and model name
  const m = model.toLowerCase();
  const isEV = m.includes('ev') || m.includes('ioniq') || m.includes('lightning') || m.includes('mach-e') || m.includes('ex30');
  const isTruck = m.includes('f-150') || m.includes('f-250') || m.includes('f-350') || m.includes('silverado') || m.includes('tundra') || m.includes('tacoma') || m.includes('1500') || m.includes('2500') || m.includes('3500');
  const isSUV = m.includes('suv') || m.includes('highlander') || m.includes('tahoe') || m.includes('suburban') || m.includes('traverse') || m.includes('explorer') || m.includes('bronco') || m.includes('santa') || m.includes('palisade') || m.includes('seltos') || m.includes('sportage') || m.includes('sorento') || m.includes('rdx') || m.includes('mdx') || m.includes('gv') || m.includes('xc') || m.includes('rx') || m.includes('tx') || m.includes('lx') || m.includes('4runner') || m.includes('sequoia');
  const isLuxury = ['Lexus', 'Genesis', 'Volvo', 'Acura'].includes(make);
  const warranty = ['Kia', 'Hyundai', 'Genesis'].includes(make) ? '5 yr / 60,000 mi' : isLuxury ? '4 yr / 50,000 mi' : '3 yr / 36,000 mi';

  let engine = '2.0L Turbo 4-Cylinder';
  let hp = '200+ hp';
  let trans = '8-Speed Automatic';
  let drive = 'FWD';
  let mpg = '25/32 MPG';
  let seating = '5 Passengers';
  let cargo = '15 cu ft';

  if (isEV) {
    engine = 'Electric Motor'; hp = '250+ hp'; trans = 'Single-Speed Reduction'; drive = 'RWD / AWD'; mpg = '100+ MPGe'; cargo = '25+ cu ft';
  } else if (isTruck) {
    engine = 'V6 Twin-Turbo'; hp = '350+ hp'; trans = '10-Speed Automatic'; drive = '4WD'; mpg = '17/23 MPG'; seating = '5-6 Passengers'; cargo = 'N/A (Bed)';
  } else if (isSUV) {
    engine = '2.5L Turbo 4-Cylinder'; hp = '250+ hp'; drive = 'AWD'; mpg = '22/28 MPG'; seating = '5-7 Passengers'; cargo = '30+ cu ft';
  }

  return {
    en: { Engine: engine, Horsepower: hp, Transmission: trans, Drivetrain: drive, 'Fuel Economy': mpg, Seating: seating, 'Cargo Space': cargo, Warranty: warranty },
    ru: { 'Двигатель': engine, 'Мощность': hp, 'Трансмиссия': trans, 'Привод': drive, 'Расход': mpg, 'Мест': seating, 'Багажник': cargo, 'Гарантия': warranty },
  };
}

/**
 * Look up features by make + model. Falls back to make-level or generic defaults.
 */
export function lookupFeatures(make: string, model: string): VehicleFeaturesLocalized {
  const key = `${make}|${model}`;
  if (FEATURES_DB[key]) return FEATURES_DB[key];

  // Try brand-level defaults
  const isLuxury = ['Lexus', 'Genesis', 'Volvo', 'Acura'].includes(make);
  const isKorean = ['Kia', 'Hyundai', 'Genesis'].includes(make);

  const screen = isLuxury ? '14" Touchscreen Display' : '12.3" Touchscreen Display';
  const audio = isLuxury ? 'Premium Audio (14+ Speakers)' : isKorean ? 'Bose Premium Audio' : '8-Speaker Audio System';
  const seats = isLuxury ? 'Leather Seating Surfaces' : 'Cloth/Synthetic Leather Seats';
  const heatVent = isLuxury ? 'Heated & Ventilated Front Seats' : 'Heated Front Seats';
  const camera = isLuxury ? '360-Degree Camera System' : 'Rearview Camera';

  const screenRu = isLuxury ? '14" сенсорный дисплей' : '12.3" сенсорный дисплей';
  const audioRu = isLuxury ? 'Премиум аудио (14+ динамиков)' : isKorean ? 'Аудиосистема Bose Premium' : 'Аудиосистема 8 динамиков';
  const seatsRu = isLuxury ? 'Кожаная обивка' : 'Комбинированная обивка ткань/эко-кожа';
  const heatVentRu = isLuxury ? 'Подогрев и вентиляция передних сидений' : 'Подогрев передних сидений';
  const cameraRu = isLuxury ? 'Камера кругового обзора 360°' : 'Камера заднего вида';

  return {
    en: {
      technology: [screen, 'Wireless Apple CarPlay & Android Auto', audio, 'Wireless Phone Charger', 'Digital Instrument Cluster'],
      safety: ['Adaptive Cruise Control', 'Lane Keeping Assist', 'Blind Spot Monitoring', 'Automatic Emergency Braking', camera],
      interior: [seats, heatVent, 'Dual-Zone Climate Control', 'Push Button Start', 'Power Liftgate'],
    },
    ru: {
      technology: [screenRu, 'Беспроводной Apple CarPlay и Android Auto', audioRu, 'Беспроводная зарядка', 'Цифровая приборная панель'],
      safety: ['Адаптивный круиз-контроль', 'Ассистент удержания полосы', 'Мониторинг слепых зон', 'Автоматическое экстренное торможение', cameraRu],
      interior: [seatsRu, heatVentRu, 'Двухзонный климат-контроль', 'Кнопка запуска', 'Электрический багажник'],
    }
  };
}

/**
 * Look up verdict by make + model. Falls back to generic.
 */
export function lookupVerdict(make: string, model: string): VehicleVerdictLocalized {
  const key = `${make}|${model}`;
  if (VERDICTS_DB[key]) return VERDICTS_DB[key];

  // Generate body-type-aware generic verdict
  const m = model.toLowerCase();
  const isTruck = m.includes('f-150') || m.includes('silverado') || m.includes('tundra') || m.includes('tacoma') || m.includes('1500') || m.includes('2500') || m.includes('3500');
  const isEV = m.includes('ev') || m.includes('ioniq') || m.includes('lightning') || m.includes('mach-e') || m.includes('ex30');
  const isLuxury = ['Lexus', 'Genesis', 'Volvo', 'Acura'].includes(make);

  if (isTruck) return {
    en: {
      pros: ['Strong towing and payload capacity', 'Durable construction and rugged design', 'Versatile bed configurations'],
      cons: ['Higher fuel consumption', 'Large footprint in urban settings', 'Premium trims command high prices'],
      summary: `The ${make} ${model} delivers the capability and durability expected from a modern truck, with technology features that make daily driving comfortable.`,
    },
    ru: {
      pros: ['Отличная тяговая и грузовая способность', 'Прочная конструкция и надёжный дизайн', 'Универсальные конфигурации кузова'],
      cons: ['Повышенный расход топлива', 'Большие габариты в городе', 'Старшие комплектации стоят дорого'],
      summary: `${make} ${model} обеспечивает возможности и надёжность, ожидаемые от современного пикапа, с технологиями для комфортной ежедневной езды.`,
    }
  };

  if (isEV) return {
    en: {
      pros: ['Zero emissions and low running costs', 'Instant torque for responsive acceleration', 'Advanced tech and connectivity features'],
      cons: ['Charging infrastructure still developing', 'Range anxiety on long trips', 'Higher upfront purchase price'],
      summary: `The ${make} ${model} represents the future of driving with zero emissions, advanced technology, and impressively low operating costs.`,
    },
    ru: {
      pros: ['Нулевые выбросы и низкие эксплуатационные расходы', 'Мгновенный крутящий момент', 'Продвинутые технологии и подключение'],
      cons: ['Зарядная инфраструктура ещё развивается', 'Беспокойство о запасе хода', 'Высокая начальная цена'],
      summary: `${make} ${model} представляет будущее вождения — нулевые выбросы, продвинутые технологии и впечатляюще низкие эксплуатационные расходы.`,
    }
  };

  if (isLuxury) return {
    en: {
      pros: ['Premium interior materials and finish', 'Refined and comfortable ride quality', 'Comprehensive safety and tech package'],
      cons: ['Maintenance costs above average', 'Options can push price significantly higher', 'Some features require premium trim levels'],
      summary: `The ${make} ${model} delivers a premium driving experience with meticulous attention to detail, refined ride quality, and cutting-edge technology.`,
    },
    ru: {
      pros: ['Премиальные материалы и отделка салона', 'Утончённая и комфортная езда', 'Полный набор систем безопасности и технологий'],
      cons: ['Стоимость обслуживания выше среднего', 'Опции значительно увеличивают цену', 'Некоторые функции только в топовых комплектациях'],
      summary: `${make} ${model} обеспечивает премиальный опыт вождения с вниманием к деталям, утончённой ездой и передовыми технологиями.`,
    }
  };

  // Default
  return {
    en: {
      pros: ['Competitive value for the segment', 'Modern safety and technology features', 'Comfortable daily driving experience'],
      cons: ['Some competitors offer more standard features', 'Infotainment learning curve', 'Interior materials could be upgraded'],
      summary: `The ${make} ${model} offers a compelling blend of value, features, and practicality. It's a solid choice in its segment with modern technology and reliable performance.`,
    },
    ru: {
      pros: ['Конкурентная стоимость для сегмента', 'Современные системы безопасности и технологии', 'Комфортная ежедневная езда'],
      cons: ['Некоторые конкуренты предлагают больше стандартного оснащения', 'Мультимедиа требует привыкания', 'Материалы салона можно улучшить'],
      summary: `${make} ${model} предлагает отличное сочетание стоимости, оснащения и практичности. Надёжный выбор в своём сегменте с современными технологиями.`,
    }
  };
}

/**
 * Look up fuel economy by make + model.
 */
export function lookupFuelEconomy(make: string, model: string): FuelEconomy {
  // Try exact match first, then try without trim suffix (e.g. "RX Hybrid 500h" → "RX Hybrid")
  const key = `${make}|${model}`;
  if (FUEL_DB[key]) return FUEL_DB[key];

  // Try partial match — strip common suffixes
  const baseModel = model.replace(/\s+(Hybrid|PHEV|EV)\s*\d*[hH]?[+]?/g, (match) => {
    // Keep "Hybrid", "PHEV", "EV" markers
    return match.trim().replace(/\s*\d+[hH]?[+]?$/, '');
  }).replace(/\s+\d+[hH]?[+]?$/, '').trim();

  const baseKey = `${make}|${baseModel}`;
  if (FUEL_DB[baseKey]) return FUEL_DB[baseKey];

  // Fallback by type
  const m = model.toLowerCase();
  if (m.includes('ev') || m.includes('ioniq') || m.includes('lightning') || m.includes('mach-e') || m.includes('ex30')) return { city: 110, hwy: 95, combined: 100 };
  if (m.includes('hybrid') || m.includes('phev') || m.includes('prius')) return { city: 45, hwy: 40, combined: 43 };
  if (m.includes('f-150') || m.includes('silverado') || m.includes('tundra') || m.includes('tacoma') || m.includes('1500') || m.includes('2500') || m.includes('3500')) return { city: 17, hwy: 23, combined: 19 };
  if (m.includes('tahoe') || m.includes('suburban') || m.includes('sequoia')) return { city: 16, hwy: 20, combined: 17 };

  // Generic
  return { city: 25, hwy: 32, combined: 28 };
}
