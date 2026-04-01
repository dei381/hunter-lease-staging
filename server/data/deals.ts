export const getBodyStyle = (className: string = '', modelName: string = ''): 'SUV' | 'Sedan' | 'Truck' | 'Coupe' | 'Hatchback' | 'Van' | 'Minivan' | 'Wagon' => {
  const c = (className || '').toLowerCase();
  const m = (modelName || '').toLowerCase();
  
  if (c.includes('sedan')) return 'Sedan';
  if (c.includes('suv')) return 'SUV';
  if (c.includes('truck')) return 'Truck';
  if (c.includes('minivan')) return 'Minivan';
  if (c.includes('wagon')) return 'Wagon';
  if (c.includes('coupe')) return 'Coupe';
  if (c.includes('hatchback')) return 'Hatchback';
  
  // Fallbacks based on model name
  const sedanModels = ['corolla', 'camry', 'accord', 'civic', 'elantra', 'sonata', 'k5', 'class', 'series', 'a4', 'is ', 'es '];
  const suvModels = ['rav4', 'highlander', 'cr-v', 'pilot', 'hr-v', 'tucson', 'palisade', 'santa fe', 'ev9', 'ev6', 'telluride', 'sportage', 'sorento', 'glc', 'gle', 'eqe', 'glb', 'x3', 'x5', 'x7', 'q5', 'q7', 'macan', 'cayenne', 'rz', 'rx', 'nx', 'gx', 'tx'];
  const truckModels = ['tacoma', 'tundra', 'ridgeline'];
  const minivanModels = ['sienna', 'odyssey', 'carnival'];
  
  if (sedanModels.some(model => m.includes(model))) return 'Sedan';
  if (suvModels.some(model => m.includes(model))) return 'SUV';
  if (truckModels.some(model => m.includes(model))) return 'Truck';
  if (minivanModels.some(model => m.includes(model))) return 'Minivan';
  
  return 'SUV'; // Default fallback
};

export const getFuelType = (trimName: string = '', modelName: string = ''): 'Gas' | 'Hybrid' | 'PHEV' | 'Electric' => {
  const t = (trimName || '').toLowerCase();
  const m = (modelName || '').toLowerCase();
  
  if (t.includes('phev') || t.includes('prime') || t.includes('plug-in')) return 'PHEV';
  if (t.includes('hybrid') || m.includes('hybrid') || m.includes('prius')) return 'Hybrid';
  if (t.includes('ev') || m.includes('ev') || m.includes('bz4x') || m.includes('ioniq') || m.includes('ariya') || m.includes('mach-e') || m.includes('lightning') || m.includes('rivian') || m.includes('tesla') || m.includes('polestar') || m.includes('lucid')) return 'Electric';
  
  return 'Gas';
};

export const getDetailedSpecs = (model: string, trim: string, bodyStyle: string, fuelType: string) => {
  const specs = {
    engine: fuelType === 'Electric' ? 'Dual Motor AWD' : fuelType === 'Hybrid' ? '2.5L 4-Cyl Hybrid' : '2.0L Turbo 4-Cyl',
    horsepower: '200+ hp',
    transmission: fuelType === 'Electric' ? 'Single-Speed Direct Drive' : '8-Speed Automatic',
    drivetrain: 'FWD',
    fuelEconomy: fuelType === 'Electric' ? '100+ MPGe' : fuelType === 'Hybrid' ? '40+ MPG' : '25+ MPG',
    seating: bodyStyle === 'SUV' ? '5 Passengers' : '5 Passengers',
    cargoSpace: bodyStyle === 'SUV' ? '35+ cu ft' : '15+ cu ft',
    warranty: '3 yr/36,000 mi basic'
  };
  return { specs, specsRu: specs };
};

export const getCategorizedFeatures = (make: string, model: string, trim: string) => {
  const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Volvo', 'Land Rover'].includes(make);
  const isElectric = getFuelType(trim, model) === 'Electric';
  
  const en = {
    technology: [
      isLuxury ? '14" Touchscreen Display' : '10.25" Touchscreen Display',
      'Wireless Apple CarPlay & Android Auto',
      isLuxury ? 'Premium 14-Speaker Audio' : '6-Speaker Audio System',
      'Wireless Device Charging',
      isLuxury ? 'Head-Up Display' : 'Digital Instrument Cluster'
    ],
    safety: [
      'Adaptive Cruise Control',
      'Lane Keeping Assist',
      'Blind Spot Monitoring',
      'Automatic Emergency Braking',
      isLuxury ? '360-Degree Camera System' : 'Rearview Camera'
    ],
    interior: [
      isLuxury ? 'Premium Leather Seating' : 'Synthetic Leather Seating',
      'Heated Front Seats',
      isLuxury ? 'Ventilated Front Seats' : 'Dual-Zone Climate Control',
      'Power Adjustable Driver Seat',
      isLuxury ? 'Panoramic Sunroof' : 'Power Moonroof'
    ],
    exterior: [
      isLuxury ? '20" Alloy Wheels' : '18" Alloy Wheels',
      'LED Headlights & Taillights',
      'Power Liftgate',
      'Heated Side Mirrors',
      isElectric ? 'Aerodynamic Wheel Covers' : 'Dual Exhaust Tips'
    ]
  };
  return { en, ru: en };
};

export const getOwnerVerdict = (make: string, model: string, trim: string, isLuxury: boolean) => {
  const en = `The ${make} ${model} offers a compelling blend of value, features, and reliability. It stands out in its class with excellent build quality and a comfortable ride, making it a strong choice for most buyers.`;
  return { en, ru: en };
};
