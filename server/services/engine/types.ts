import { z } from 'zod';

export const QuoteContextSchema = z.object({
  quoteType: z.enum(['LEASE', 'FINANCE']),
  term: z.number().int().min(12).max(84),
  zipCode: z.string().min(5).default('90210'),
  
  vehicleId: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),
  year: z.number().optional(),

  downPaymentCents: z.number().int().min(0).default(0),
  tradeInEquityCents: z.number().int().default(0),
  mileage: z.number().int().optional(),
  creditTier: z.enum(['t1', 't2', 't3', 't4', 't5', 't6']).default('t1'),
  msdCount: z.number().int().min(0).max(10).default(0),
  isFirstTimeBuyer: z.boolean().default(false),
  hasCosigner: z.boolean().default(false),
  selectedIncentiveIds: z.array(z.string()).default([]),
  saveSnapshot: z.boolean().default(false),
  isStandalone: z.boolean().default(false),

  adminOverrides: z.object({
    msrpCents: z.number().optional(),
    mf: z.number().optional(),
    apr: z.number().optional(),
    rv: z.number().optional(),
    dealerDiscountCents: z.number().optional(),
  }).optional(),
  audit: z.boolean().default(false)
});

export type QuoteContext = z.infer<typeof QuoteContextSchema>;

export interface PaymentBreakdown {
  calcStatus: 'SUCCESS' | 'NO_PROGRAMS' | 'MISSING_MSRP' | 'MATH_ERROR';
  warnings: string[];
  
  monthlyPaymentCents: number;
  dueAtSigningCents: number;
  
  dasBreakdown: {
    downPaymentCents: number;
    firstMonthCents: number;
    upfrontTaxesCents: number;
    upfrontFeesCents: number;
    msdAmountCents: number;
  };

  msrpCents: number;
  sellingPriceCents: number;
  dealerDiscountCents: number;
  totalIncentivesCents: number;
  residualValueCents: number;
  
  appliedMf: number;
  appliedApr: number;
  appliedRvPercent: number;

  taxes: {
    rate: number;
    monthlyTaxCents: number;
    upfrontTaxCents: number;
  };
  fees: {
    acqFeeCents: number;
    docFeeCents: number;
    dmvFeeCents: number;
    brokerFeeCents: number;
    capitalizedFeesCents: number;
    upfrontFeesCents: number;
  };

  tco: {
    totalCostCents: number;
    monthlyAverageCents: number;
  };

  sourceMetadata: {
    lenderId: string | null;
    lenderName: string;
    msrpSource: 'DB' | 'ADMIN_OVERRIDE';
    ratesSource: 'BANK_PROGRAM' | 'ADMIN_OVERRIDE';
  };

  dealerReserveCents?: number;
  lenderPriority?: number;

  quoteId?: string;
  options?: {
    lenderType: string;
    lenderName: string;
    monthlyPaymentCents: number;
    isBest: boolean;
  }[];
}
