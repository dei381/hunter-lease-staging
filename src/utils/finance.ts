
export interface FinanceParams {
  msrp: number;
  savings: number;
  leaseCash: number;
  rebates: number;
  discount: number;
  term: number;
  down: number;
  rv: number; // Decimal (e.g. 0.55) or Percentage (e.g. 55)
  mf: number;
  taxRate: number;
  acqFee: number;
  docFee: number;
  dmvFee: number;
  brokerFee: number;
}

export const getVal = (field: any, fallback: number = 0): number => {
  if (field === undefined || field === null) return fallback;
  if (typeof field === 'number') return field;
  const parsed = parseFloat(field.toString().replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? fallback : parsed;
};

export const DEFAULT_FEES = {
  acqFee: 650,
  docFee: 85,
  dmvFee: 400,
  taxRate: 0.095,
  brokerFee: 595
};

export const calculateLease = (params: FinanceParams) => {
  const {
    msrp, savings, leaseCash, rebates, discount,
    term, down, rv, mf, taxRate,
    acqFee, docFee, dmvFee, brokerFee
  } = params;

  const totalIncentives = leaseCash + rebates;
  const sellingPrice = msrp - savings - totalIncentives - discount;
  const totalFees = acqFee + docFee + dmvFee + brokerFee;

  let baseRvPercent = rv;
  if (baseRvPercent > 1) baseRvPercent /= 100;
  if (baseRvPercent <= 0) baseRvPercent = 0.5; // Final fallback if data is corrupt

  const rvAmt = msrp * baseRvPercent;
  
  // Cap cost calculation
  // We subtract down payment from the total (selling price + fees)
  const capCost = sellingPrice + totalFees - down;
  
  const depreciation = (capCost - rvAmt) / term;
  const rentCharge = (capCost + rvAmt) * (mf || 0.002);
  
  const basePayment = depreciation + rentCharge;
  const monthlyPayment = Math.round(basePayment * (1 + taxRate));
  
  return {
    monthlyPayment,
    basePayment,
    depreciation,
    rentCharge,
    capCost,
    rvAmt,
    totalFees,
    sellingPrice
  };
};

export const calculateFinance = (params: FinanceParams & { apr: number }) => {
  const {
    msrp, savings, rebates, discount,
    term, down, apr, taxRate,
    docFee, dmvFee, brokerFee
  } = params;

  const totalIncentives = rebates;
  const sellingPrice = msrp - savings - totalIncentives - discount;
  const totalFees = docFee + dmvFee + brokerFee;

  const principal = sellingPrice + totalFees + (sellingPrice * taxRate) - down;
  const monthlyRate = (apr / 100) / 12;

  let monthlyPayment = 0;
  if (monthlyRate === 0) {
    monthlyPayment = Math.round(principal / term);
  } else {
    monthlyPayment = Math.round((principal * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1));
  }

  return {
    monthlyPayment,
    principal,
    apr
  };
};
