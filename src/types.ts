export interface Car {
  make: string;
  model: string;
  year: number;
  trim: string;
  msrp: number;
}

export interface Lead {
  id: string;
  client: {
    name: string;
    phone: string;
    payMethod: string;
    paymentName?: string;
    isFirstTimeBuyer: boolean;
  };
  tradeIn?: {
    hasTradeIn: boolean;
    make: string;
    model: string;
    year: string;
    mileage: string;
    vin?: string;
    hasLoan: boolean;
    payoff: string;
  } | null;
  car: Car;
  calc: {
    type: 'lease' | 'finance';
    payment: number;
    down: number;
    tier: string;
  };
  status: 'pending' | 'active' | 'closed' | 'rejected';
  dealersSent: number;
  dealersAccepted: number;
  acceptedBy?: string;
  appointmentDate?: string;
  creditApp?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Incentive {
  id: string;
  name: string;
  amount: number;
  type: 'dealer' | 'manufacturer' | 'special';
  isDefault: boolean;
  description?: string;
  expiresAt?: string;
}

export interface Deal {
  id: number;
  type: 'lease' | 'finance' | 'cash' | 'disc';
  hot: boolean;
  secret: boolean;
  icon: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  class: string;
  payment?: number;
  term?: string;
  down?: number;
  mf?: string;
  rv?: string;
  msrp: number;
  savings: number;
  dealerDiscount?: number;
  hunterBenefit?: number;
  dealer: string;
  region: string;
  intel: string;
  incHint: string;
  time: number;
  unit: string;
  dot: 'lv' | 'rc' | 'ol';
  isNew: boolean;
  marketAvg?: number;
  image?: string;
  cashback?: number;
  apr?: string;
  discount?: number;
  acquisitionFee?: number;
  rebates?: number;
  leaseCash?: number;
  availableIncentives?: Incentive[];
  lenderId?: string;
  isFirstTimeBuyerEligible?: boolean;
  expirationDate?: string;
  bodyStyle?: 'SUV' | 'Sedan' | 'Truck' | 'Coupe' | 'Hatchback' | 'Van' | 'Minivan' | 'Wagon';
  fuelType?: 'Gas' | 'Hybrid' | 'Electric' | 'PHEV';
  driveType?: 'AWD' | 'FWD' | 'RWD' | '4WD';
  seats?: number;
  features?: string[];
  featuresRu?: string[];
  efficiency?: string; // e.g. "24/32 MPG" or "102 MPGe"
  categorizedFeatures?: {
    safety?: string[];
    tech?: string[];
    comfort?: string[];
  };
  categorizedFeaturesRu?: {
    safety?: string[];
    tech?: string[];
    comfort?: string[];
  };
  fuelEconomy?: {
    city: number;
    hwy: number;
    combined: number;
  };
  ownerVerdict?: {
    pros: string[];
    cons: string[];
    summary: string;
  };
  ownerVerdictRu?: {
    pros: string[];
    cons: string[];
    summary: string;
  };
  detailedSpecs?: Record<string, string>;
  detailedSpecsRu?: Record<string, string>;
}
