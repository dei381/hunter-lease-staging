import { Deal } from '../types';
import { CAR_DB } from './cars';

export const getBodyStyle = (className: string, modelName: string): 'SUV' | 'Sedan' | 'Truck' | 'Coupe' | 'Hatchback' | 'Van' | 'Minivan' | 'Wagon' => {
  const c = className.toLowerCase();
  const m = modelName.toLowerCase();
  
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
  
  if (sedanModels.some(name => m.includes(name))) return 'Sedan';
  if (suvModels.some(name => m.includes(name))) return 'SUV';
  if (truckModels.some(name => m.includes(name))) return 'Truck';
  if (minivanModels.some(name => m.includes(name))) return 'Minivan';
  if (m.includes('prius')) return 'Hatchback';
  if (m.includes('4 series')) return 'Coupe';
  
  return 'SUV';
};

export const getFuelType = (className: string, trimName: string): 'Gas' | 'Hybrid' | 'Electric' | 'PHEV' => {
  const c = className.toLowerCase();
  const t = trimName.toLowerCase();
  if (c.includes('ev') || t.includes('ev')) return 'Electric';
  if (t.includes('phev') || t.includes('h+')) return 'PHEV';
  if (c.includes('hybrid') || t.includes('hybrid')) return 'Hybrid';
  return 'Gas';
};

export const getDetailedSpecs = (model: string, trim: string, bodyStyle: string, fuelType: string) => {
  const specs: Record<string, string> = {};
  const specsRu: Record<string, string> = {};

  // Engine / Motor
  if (fuelType === 'Electric') {
    specs['Powertrain'] = 'Dual Motor AWD';
    specsRu['Силовая установка'] = 'Два мотора, полный привод';
    specs['Horsepower'] = '320 hp';
    specsRu['Мощность'] = '320 л.с.';
    specs['Battery'] = '77.4 kWh';
    specsRu['Батарея'] = '77.4 кВт⋅ч';
    specs['Range'] = '280 miles';
    specsRu['Запас хода'] = '450 км';
  } else if (fuelType === 'PHEV') {
    specs['Engine'] = '2.0L 4-Cylinder + Electric Motor';
    specsRu['Двигатель'] = '2.0Л 4-цилиндровый + Электромотор';
    specs['Horsepower'] = '288 hp';
    specsRu['Мощность'] = '288 л.с.';
    specs['Electric Range'] = '42 miles';
    specsRu['Запас хода (электро)'] = '67 км';
  } else if (fuelType === 'Hybrid') {
    specs['Engine'] = '2.5L 4-Cylinder Hybrid';
    specsRu['Двигатель'] = '2.5Л 4-цилиндровый гибрид';
    specs['Horsepower'] = '225 hp';
    specsRu['Мощность'] = '225 л.с.';
  } else {
    if (bodyStyle === 'Truck' || (bodyStyle === 'SUV' && ['x7', 'gle', 'cayenne', 'q7', 'tahoe'].some(m => model.toLowerCase().includes(m)))) {
      specs['Engine'] = '3.0L Turbo V6';
      specsRu['Двигатель'] = '3.0Л Турбо V6';
      specs['Horsepower'] = '355 hp';
      specsRu['Мощность'] = '355 л.с.';
    } else {
      specs['Engine'] = '2.0L Turbo 4-Cylinder';
      specsRu['Двигатель'] = '2.0Л Турбо 4-цилиндровый';
      specs['Horsepower'] = '201 hp';
      specsRu['Мощность'] = '201 л.с.';
    }
  }

  // Transmission
  if (fuelType === 'Electric') {
    specs['Transmission'] = 'Single-Speed Automatic';
    specsRu['Трансмиссия'] = 'Одноступенчатый автомат';
  } else if (fuelType === 'Hybrid' || fuelType === 'PHEV') {
    specs['Transmission'] = 'eCVT';
    specsRu['Трансмиссия'] = 'eCVT (вариатор)';
  } else {
    specs['Transmission'] = '8-Speed Automatic';
    specsRu['Трансмиссия'] = '8-ступенчатая АКПП';
  }

  // Drivetrain
  const isAWD = trim.toLowerCase().includes('awd') || trim.toLowerCase().includes('4x4') || ['x3', 'x5', 'q5', 'q7', 'macan', 'cayenne'].some(m => model.toLowerCase().includes(m));
  specs['Drivetrain'] = isAWD ? 'All-Wheel Drive (AWD)' : (bodyStyle === 'Truck' ? 'Rear-Wheel Drive (RWD)' : 'Front-Wheel Drive (FWD)');
  specsRu['Привод'] = isAWD ? 'Полный (AWD)' : (bodyStyle === 'Truck' ? 'Задний (RWD)' : 'Передний (FWD)');

  // Dimensions
  if (bodyStyle === 'SUV') {
    specs['Cargo Space'] = '38.4 cu ft';
    specsRu['Объем багажника'] = '1087 л';
    specs['Ground Clearance'] = '8.1 in';
    specsRu['Клиренс'] = '205 мм';
  } else if (bodyStyle === 'Sedan') {
    specs['Cargo Space'] = '15.1 cu ft';
    specsRu['Объем багажника'] = '427 л';
    specs['Ground Clearance'] = '5.5 in';
    specsRu['Клиренс'] = '140 мм';
  } else if (bodyStyle === 'Truck') {
    specs['Towing Capacity'] = '6,500 lbs';
    specsRu['Буксировочная способность'] = '2948 кг';
    specs['Bed Length'] = '60.5 in';
    specsRu['Длина кузова'] = '1536 мм';
  }

  // Seating
  specs['Seating Capacity'] = (bodyStyle === 'Minivan' || model.toLowerCase().includes('x7') || model.toLowerCase().includes('q7') || model.toLowerCase().includes('telluride') || model.toLowerCase().includes('palisade')) ? '7 Passengers' : '5 Passengers';
  specsRu['Количество мест'] = (bodyStyle === 'Minivan' || model.toLowerCase().includes('x7') || model.toLowerCase().includes('q7') || model.toLowerCase().includes('telluride') || model.toLowerCase().includes('palisade')) ? '7 мест' : '5 мест';

  return { specs, specsRu };
};

const translateFeatures = (features: string[]): string[] => {
  const translations: Record<string, string> = {
    'FWD': 'Передний привод',
    'AWD': 'Полный привод',
    'RWD': 'Задний привод',
    '4x4': 'Полный привод 4x4',
    'Hybrid': 'Гибрид',
    'PHEV': 'Плагин-гибрид',
    'EV': 'Электро',
    'Sport': 'Спорт',
    'Premium Audio': 'Премиум аудио',
    'Leather': 'Кожаный салон',
    'Safety Sense 3.0': 'Комплекс безопасности 3.0',
    'JBL': 'Акустика JBL',
    'Navigation': 'Навигация',
    'Sunroof': 'Люк',
    'Panoramic Roof': 'Панорамная крыша',
    'Heated Seats': 'Подогрев сидений',
    'Ventilated Seats': 'Вентиляция сидений',
    '3rd Row': '3-й ряд сидений',
    'Captain Chairs': 'Капитанские кресла',
    'HUD': 'Проекция на лобовое стекло',
    '360 Camera': 'Камера 360',
    'Apple CarPlay': 'Apple CarPlay',
    'Android Auto': 'Android Auto',
    'Wireless Charging': 'Беспроводная зарядка',
    'Power Tailgate': 'Электропривод багажника',
    'Adaptive Cruise': 'Адаптивный круиз-контроль',
    'Blind Spot': 'Мониторинг слепых зон',
    'Lane Assist': 'Удержание в полосе',
    'Parking Sensors': 'Парктроники',
    'Remote Start': 'Удаленный запуск',
    'Keyless Entry': 'Бесключевой доступ',
    'LED Headlights': 'Светодиодные фары',
    'Alloy Wheels': 'Литые диски',
    '18" Alloys': '18" Литые диски',
    '19" Alloys': '19" Литые диски',
    '20" Alloys': '20" Литые диски',
    '21" Alloys': '21" Литые диски',
    '22" Alloys': '22" Литые диски',
    'M Sport': 'M Sport пакет',
    'AMG Line': 'AMG Line',
    'S line': 'S line',
    'F SPORT': 'F SPORT',
    'N Line': 'N Line',
    'X-Line': 'X-Line',
    'Off-Road': 'Внедорожный пакет',
    'Tow Package': 'Пакет для буксировки',
    'Air Suspension': 'Пневмоподвеска',
    '8-speed': '8-ступенчатая АКПП',
    '10-speed': '10-ступенчатая АКПП',
    'CVT': 'Вариатор',
    'eCVT': 'eCVT',
    'Manual': 'Механика',
    'Dual Motor': 'Два мотора',
    'Single Motor': 'Один мотор',
    'Standard Range': 'Стандартная батарея',
    'Long Range': 'Увеличенная батарея',
    'Performance': 'Performance',
    'Quattro': 'Quattro',
    'xDrive': 'xDrive',
    '4MATIC': '4MATIC',
    'SH-AWD': 'SH-AWD',
    '4Motion': '4Motion',
    'Symmetrical AWD': 'Symmetrical AWD',
    'H-TRAC': 'H-TRAC',
    'Active Safety': 'Активная безопасность',
    'ProPILOT': 'ProPILOT',
    'Super Cruise': 'Super Cruise',
    'BlueCruise': 'BlueCruise',
    'Autopilot': 'Autopilot',
    'FSD': 'FSD',
  };

  return features.map(f => {
    // Check for exact match
    if (translations[f]) return translations[f];
    
    // Check for partial match (e.g. "225hp" -> "225 л.с.")
    if (f.match(/^\d+hp$/)) return f.replace('hp', ' л.с.');
    if (f.match(/^\d+mpg$/)) return f.replace('mpg', ' миль/галлон');
    if (f.match(/^\d+mi$/)) return f.replace('mi', ' миль');
    
    return f;
  });
};

export const getCategorizedFeatures = (make: string, model: string, trim: string) => {
  const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Land Rover'].includes(make);
  const isEV = ['Tesla', 'Rivian', 'Lucid'].includes(make) || model.includes('e-tron') || model.includes('EQ');

  const safety = ['Safety Suite', 'Lane Assist', 'Collision Warning', 'Blind Spot Monitor', 'Rear Cross Traffic Alert', 'Adaptive Cruise Control'];
  const tech = ['Touchscreen', 'Wireless CarPlay', 'Digital Cluster', 'Premium Audio', 'Wireless Charging', 'Navigation System'];
  const comfort = ['Climate Control', 'Heated Seats', 'Keyless Entry', 'Power Tailgate', 'Sunroof', 'Leather Steering Wheel'];

  const safetyRu = ['Комплекс безопасности', 'Удержание в полосе', 'Предупреждение о столкновении', 'Мониторинг слепых зон', 'Предупреждение о перекрестном движении', 'Адаптивный круиз-контроль'];
  const techRu = ['Сенсорный экран', 'Беспроводной CarPlay', 'Цифровая панель приборов', 'Премиум аудиосистема', 'Беспроводная зарядка', 'Навигационная система'];
  const comfortRu = ['Климат-контроль', 'Подогрев сидений', 'Бесключевой доступ', 'Электропривод багажника', 'Люк', 'Кожаный руль'];

  if (isLuxury) {
    tech.push('Head-Up Display', '360° Camera');
    techRu.push('Проекция на лобовое стекло', 'Камера 360°');
    comfort.push('Ventilated Seats', 'Ambient Lighting');
    comfortRu.push('Вентиляция сидений', 'Атмосферная подсветка');
  }

  if (isEV) {
    tech.push('OTA Updates', 'App Control');
    techRu.push('Обновления по воздуху', 'Управление со смартфона');
  }

  return {
    en: { safety, tech, comfort },
    ru: { safety: safetyRu, tech: techRu, comfort: comfortRu }
  };
};

export const getOwnerVerdict = (make: string, model: string, trim: string, isLuxury: boolean) => {
  if (isLuxury) {
    return {
      en: {
        pros: ['Premium interior quality', 'Advanced technology features', 'Smooth and quiet ride'],
        cons: ['Higher maintenance costs', 'Complex infotainment system'],
        summary: `The ${make} ${model} ${trim} delivers an exceptional luxury experience with top-tier materials and cutting-edge tech.`
      },
      ru: {
        pros: ['Премиальное качество салона', 'Передовые технологии', 'Плавный и тихий ход'],
        cons: ['Высокая стоимость обслуживания', 'Сложная мультимедийная система'],
        summary: `${make} ${model} ${trim} предлагает исключительный уровень роскоши с первоклассными материалами и передовыми технологиями.`
      }
    };
  }

  if (['Toyota', 'Honda', 'Subaru'].includes(make)) {
    return {
      en: {
        pros: ['Outstanding reliability', 'Excellent resale value', 'Great fuel economy'],
        cons: ['Conservative styling', 'Infotainment could be better'],
        summary: `The ${make} ${model} ${trim} is a practical, reliable choice that holds its value incredibly well.`
      },
      ru: {
        pros: ['Выдающаяся надежность', 'Отличная ликвидность', 'Экономичность'],
        cons: ['Консервативный дизайн', 'Мультимедиа могла бы быть лучше'],
        summary: `${make} ${model} ${trim} — практичный и надежный выбор, который отлично сохраняет свою стоимость.`
      }
    };
  }

  return {
    en: {
      pros: ['Great overall value', 'Comfortable ride', 'Good standard features'],
      cons: ['Average fuel economy', 'Some cheap interior plastics'],
      summary: `The ${make} ${model} ${trim} offers a solid balance of features, comfort, and value for everyday driving.`
    },
    ru: {
      pros: ['Отличное соотношение цены и качества', 'Комфортная езда', 'Хорошее базовое оснащение'],
      cons: ['Средняя экономичность', 'Встречается дешевый пластик в салоне'],
      summary: `${make} ${model} ${trim} предлагает отличный баланс функций, комфорта и стоимости для повседневных поездок.`
    }
  };
};

const generateDeals = (): Deal[] => {
  const deals: Deal[] = [];
  let idCounter = 1;

  CAR_DB.makes.forEach(make => {
    make.models.forEach(model => {
      model.trims.forEach(trim => {
        const msrp = trim.msrp;
        const savings = Math.round(msrp * 0.06); // 6% average discount
        const leaseCash = trim.leaseCash || 0;
        const down = 3000;
        const fee = 650;
        const term = 36;
        const mf = trim.mf;
        const rv = trim.rv36;

        // Lease calculation
        const netCap = msrp - savings - leaseCash - down + fee;
        const rvValue = msrp * rv;
        const dep = (netCap - rvValue) / term;
        const rent = (netCap + rvValue) * mf;
        const payment = Math.max(0, Math.round(dep + rent));

        const bodyStyle = getBodyStyle(model.class, model.name);
        const fuelType = getFuelType(model.class, trim.name);

        const { specs, specsRu } = getDetailedSpecs(model.name, trim.name, bodyStyle, fuelType);
        const catFeatures = getCategorizedFeatures(make.name, model.name, trim.name);
        const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Land Rover'].includes(make.name);
        const verdict = getOwnerVerdict(make.name, model.name, trim.name, isLuxury);

        const now = new Date();
        const expirationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (idCounter % 5) + 2, 23, 59, 59).toISOString();

        const hunterLeaseDiscount = savings;

        deals.push({
          id: idCounter++,
          type: 'lease',
          hot: payment < msrp * 0.011,
          secret: idCounter % 15 === 0,
          icon: fuelType === 'Electric' || fuelType === 'PHEV' ? '⚡' : '🚗',
          make: make.name,
          model: model.name,
          year: model.years[0],
          trim: trim.name,
          class: model.class,
          payment,
          term: `${term} mo`,
          down,
          mf: mf.toFixed(5),
          rv: `${Math.round(rv * 100)}%`,
          msrp,
          savings,
          dealerDiscount: hunterLeaseDiscount,
          hunterBenefit: 0,
          dealer: `${make.name} of Beverly Hills`,
          region: 'California',
          intel: `Based on ${Math.round(rv * 100)}% residual and $${savings.toLocaleString()} Hunter Lease discount.`,
          incHint: leaseCash > 0 ? `Includes $${leaseCash.toLocaleString()} Lease Cash` : 'Standard rates apply',
          time: Math.floor(Math.random() * 50) + 1,
          unit: 'min',
          dot: 'lv',
          isNew: true,
          marketAvg: Math.round(payment * 1.18),
          image: model.imageUrl,
          bodyStyle,
          fuelType,
          driveType: trim.feat.includes('AWD') || trim.feat.includes('4x4') ? 'AWD' : 'FWD',
          seats: model.class.includes('3-Row') || model.class.includes('Minivan') ? 7 : 5,
          features: trim.feat.split(' · '),
          featuresRu: translateFeatures(trim.feat.split(' · ')),
          categorizedFeatures: catFeatures.en,
          categorizedFeaturesRu: catFeatures.ru,
          fuelEconomy: { city: 25, hwy: 32, combined: 28 },
          ownerVerdict: verdict.en,
          ownerVerdictRu: verdict.ru,
          detailedSpecs: specs,
          detailedSpecsRu: specsRu,
          expirationDate,
          availableIncentives: ([
            { id: `hunter-${idCounter}`, name: 'Hunter Lease Discount', nameRu: 'Скидка Hunter Lease', amount: hunterLeaseDiscount, type: 'dealer' as const, isDefault: true, description: 'Exclusive Hunter.lease negotiated discount' },
            { id: `lease-${idCounter}`, name: 'Lease Cash', amount: leaseCash, type: 'manufacturer' as const, isDefault: true, description: 'Manufacturer lease incentive' },
            { id: `mil-${idCounter}`, name: 'Military Appreciation', amount: 500, type: 'special' as const, isDefault: false, description: 'Active duty, veterans and their families', expiresAt: '03/31/2026' },
            { id: `grad-${idCounter}`, name: 'College Graduate', amount: 500, type: 'special' as const, isDefault: false, description: 'Recent college graduates', expiresAt: '03/31/2026' },
            { id: `loyalty-${idCounter}`, name: 'Loyalty Rebate', amount: 1000, type: 'manufacturer' as const, isDefault: false, description: 'Current owners of the same brand' }
          ] as const).filter(inc => inc.amount > 0)
        });
      });
    });
  });

  return deals;
};

export const DEALS: Deal[] = generateDeals();
