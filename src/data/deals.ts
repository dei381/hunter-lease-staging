export const getBodyStyle = (make: string = '', model: string = ''): 'SUV' | 'Sedan' | 'Truck' | 'Coupe' | 'Hatchback' | 'Van' | 'Minivan' | 'Wagon' => {
  const m = (model || '').toLowerCase();

  const sedanModels = ['corolla', 'camry', 'accord', 'civic', 'elantra', 'sonata', 'k5', 'class', 'series', 'a4', 'is ', 'es '];
  const suvModels = ['rav4', 'highlander', 'cr-v', 'pilot', 'hr-v', 'tucson', 'palisade', 'santa fe', 'ev9', 'ev6', 'telluride', 'sportage', 'sorento', 'glc', 'gle', 'eqe', 'glb', 'x3', 'x5', 'x7', 'q5', 'q7', 'macan', 'cayenne', 'rz', 'rx', 'nx', 'gx', 'tx', '4runner', 'rav4', 'sequoia', 'venza'];
  const truckModels = ['tacoma', 'tundra', 'ridgeline'];
  const minivanModels = ['sienna', 'odyssey', 'carnival'];

  if (sedanModels.some(s => m.includes(s))) return 'Sedan';
  if (suvModels.some(s => m.includes(s))) return 'SUV';
  if (truckModels.some(s => m.includes(s))) return 'Truck';
  if (minivanModels.some(s => m.includes(s))) return 'Minivan';

  return 'SUV';
};

export const getFuelType = (make: string = '', model: string = ''): 'Gas' | 'Hybrid' | 'PHEV' | 'Electric' => {
  const m = (model || '').toLowerCase();

  if (m.includes('phev') || m.includes('prime') || m.includes('plug-in')) return 'PHEV';
  if (m.includes('hybrid') || m.includes('prius')) return 'Hybrid';
  if (m.includes('ev') || m.includes('bz4x') || m.includes('ioniq') || m.includes('ariya') || m.includes('mach-e') || m.includes('lightning') || m.includes('tesla') || m.includes('polestar') || m.includes('lucid')) return 'Electric';

  return 'Gas';
};

export const getDetailedSpecs = (make: string, model: string) => {
  const bodyStyle = getBodyStyle(make, model);
  const fuelType = getFuelType(make, model);

  const en: Record<string, string> = {
    Engine: fuelType === 'Electric' ? 'Dual Motor AWD' : fuelType === 'Hybrid' ? '2.5L 4-Cyl Hybrid' : '2.0L Turbo 4-Cyl',
    Horsepower: '200+ hp',
    Transmission: fuelType === 'Electric' ? 'Single-Speed Direct Drive' : '8-Speed Automatic',
    Drivetrain: 'FWD',
    'Fuel Economy': fuelType === 'Electric' ? '100+ MPGe' : fuelType === 'Hybrid' ? '40+ MPG' : '25+ MPG',
    Seating: '5 Passengers',
    'Cargo Space': bodyStyle === 'SUV' ? '35+ cu ft' : '15+ cu ft',
    Warranty: '3 yr / 36,000 mi basic',
  };
  const ru: Record<string, string> = {
    'Двигатель': fuelType === 'Electric' ? 'Двойной мотор AWD' : fuelType === 'Hybrid' ? '2.5L 4-цил. гибрид' : '2.0L Турбо 4-цил.',
    'Мощность': '200+ л.с.',
    'Трансмиссия': fuelType === 'Electric' ? 'Прямой привод' : '8-ступ. автомат',
    'Привод': 'Передний',
    'Расход': fuelType === 'Electric' ? '100+ MPGe' : fuelType === 'Hybrid' ? '40+ MPG' : '25+ MPG',
    'Мест': '5 пассажиров',
    'Багажник': bodyStyle === 'SUV' ? '35+ куб. фт' : '15+ куб. фт',
    'Гарантия': '3 года / 36,000 миль',
  };
  return { en, ru };
};

export const getCategorizedFeatures = (make: string, model: string) => {
  const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Volvo', 'Land Rover'].includes(make);
  const fuelType = getFuelType(make, model);
  const isElectric = fuelType === 'Electric';

  const en = {
    technology: [
      isLuxury ? '14" Touchscreen Display' : '10.25" Touchscreen Display',
      'Wireless Apple CarPlay & Android Auto',
      isLuxury ? 'Premium 14-Speaker Audio' : '6-Speaker Audio System',
      'Wireless Device Charging',
      isLuxury ? 'Head-Up Display' : 'Digital Instrument Cluster',
    ],
    safety: [
      'Adaptive Cruise Control',
      'Lane Keeping Assist',
      'Blind Spot Monitoring',
      'Automatic Emergency Braking',
      isLuxury ? '360-Degree Camera System' : 'Rearview Camera',
    ],
    interior: [
      isLuxury ? 'Premium Leather Seating' : 'Synthetic Leather Seating',
      'Heated Front Seats',
      isLuxury ? 'Ventilated Front Seats' : 'Dual-Zone Climate Control',
      'Power Adjustable Driver Seat',
      isLuxury ? 'Panoramic Sunroof' : 'Power Moonroof',
    ],
  };
  const ru = {
    technology: [
      isLuxury ? '14" сенсорный дисплей' : '10.25" сенсорный дисплей',
      'Беспроводной Apple CarPlay и Android Auto',
      isLuxury ? 'Премиум аудио 14 динамиков' : 'Аудиосистема 6 динамиков',
      'Беспроводная зарядка устройств',
      isLuxury ? 'Проекционный дисплей' : 'Цифровая приборная панель',
    ],
    safety: [
      'Адаптивный круиз-контроль',
      'Ассистент удержания полосы',
      'Мониторинг слепых зон',
      'Автоматическое экстренное торможение',
      isLuxury ? 'Камера кругового обзора 360°' : 'Камера заднего вида',
    ],
    interior: [
      isLuxury ? 'Премиальная кожаная обивка' : 'Обивка из эко-кожи',
      'Подогрев передних сидений',
      isLuxury ? 'Вентиляция передних сидений' : 'Двухзонный климат-контроль',
      'Электрорегулировка водительского сиденья',
      isLuxury ? 'Панорамная крыша' : 'Люк с электроприводом',
    ],
  };
  return { en, ru };
};

export const getOwnerVerdict = (make: string, model: string) => {
  const en = {
    pros: [
      'Excellent build quality and reliability',
      'Comfortable and quiet ride',
      'Strong value for the price point',
    ],
    cons: [
      'Infotainment system can be complex',
      'Cargo space is average for the class',
      'Base engine could use more power',
    ],
    summary: `The ${make} ${model} offers a compelling blend of value, features, and reliability. It stands out in its class with excellent build quality and a comfortable ride, making it a strong choice for most buyers.`,
  };
  const ru = {
    pros: [
      'Отличное качество сборки и надежность',
      'Комфортная и тихая езда',
      'Выгодное соотношение цены и качества',
    ],
    cons: [
      'Мультимедийная система может быть сложной',
      'Объем багажника средний для класса',
      'Базовому двигателю не хватает мощности',
    ],
    summary: `${make} ${model} предлагает отличное сочетание ценности, оснащения и надежности. Он выделяется в своём классе превосходным качеством сборки и комфортной ездой, что делает его отличным выбором для большинства покупателей.`,
  };
  return { en, ru };
};

export const getFuelEconomy = (make: string, model: string) => {
  const fuelType = getFuelType(make, model);
  const bodyStyle = getBodyStyle(make, model);

  if (fuelType === 'Electric') return { city: 120, hwy: 100, combined: 110 };
  if (fuelType === 'Hybrid') return { city: 50, hwy: 45, combined: 48 };
  if (fuelType === 'PHEV') return { city: 90, hwy: 40, combined: 55 };

  if (bodyStyle === 'Truck') return { city: 20, hwy: 26, combined: 22 };
  if (bodyStyle === 'SUV') return { city: 25, hwy: 32, combined: 28 };
  return { city: 30, hwy: 38, combined: 33 };
};
