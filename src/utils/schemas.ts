import { z } from 'zod';

// Helper to ensure no nulls for financial fields
const financialNumber = z.number().nullable().transform(val => val ?? 0);

export const LenderSchema = z.object({
  id: z.string(),
  name: z.string(),
  isCaptive: z.boolean().default(false),
  isFirstTimeBuyerFriendly: z.boolean().default(false),
  lenderType: z.string().default('NATIONAL_BANK'),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
  createdAt: z.union([z.string(), z.date()]).transform(d => new Date(d).toISOString()).optional(),
}).passthrough();

export const LendersResponseSchema = z.array(LenderSchema);

export const ProgramSchema = z.object({
  id: z.string(),
  batchId: z.string(),
  lenderId: z.string().nullable().optional(),
  programType: z.string(),
  make: z.string(),
  model: z.string(),
  trim: z.string(),
  year: z.number(),
  term: z.number(),
  mileage: z.number().nullable().transform(val => val ?? 10000),
  rv: financialNumber,
  mf: financialNumber,
  apr: financialNumber,
  rebates: financialNumber,
  buyRateMf: financialNumber.optional(),
  residualPercentage: financialNumber.optional(),
  buyRateApr: financialNumber.optional(),
  internalLenderTier: z.string().optional(),
  lenderName: z.string().optional(),
}).passthrough();

export const ProgramsResponseSchema = z.array(ProgramSchema);

export const IncentiveSchema = z.object({
  id: z.string(),
  name: z.string(),
  amountCents: financialNumber,
  type: z.string(),
  dealApplicability: z.string().default('ALL'),
  isTaxableCa: z.boolean().default(true),
  exclusiveGroupId: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  effectiveFrom: z.union([z.string(), z.date()]).nullable().optional(),
  effectiveTo: z.union([z.string(), z.date()]).nullable().optional(),
}).passthrough();

export const IncentivesResponseSchema = z.array(IncentiveSchema);

export const DealRecordSchema = z.object({
  id: z.string(),
  type: z.string().default('legacy'),
  ingestionId: z.string().nullable().optional(),
  publishStatus: z.string().default('draft'),
  reviewStatus: z.string().default('pending'),
  financialData: z.string().nullable().optional(),
  programKeys: z.string().nullable().optional(),
  eligibility: z.string().nullable().optional(),
  isFirstTimeBuyerEligible: z.boolean().nullable().optional(),
  lenderId: z.string().nullable().optional(),
  payload: z.string().default('{}'),
  createdAt: z.union([z.string(), z.date()]).transform(d => new Date(d).toISOString()).optional(),
  updatedAt: z.union([z.string(), z.date()]).transform(d => new Date(d).toISOString()).optional(),
  brokerFeeCents: financialNumber,
  customUrl: z.string().nullable().optional(),
  dealerReserveCents: financialNumber,
  profitCents: financialNumber,
  seoDescription: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
}).passthrough();

export const DealsResponseSchema = z.array(DealRecordSchema);

export const CreateDealRequestSchema = z.object({
  financialData: z.record(z.string(), z.any()).optional(),
  reviewStatus: z.string().optional(),
  publishStatus: z.string().optional(),
  lenderId: z.string().nullable().optional(),
  isFirstTimeBuyerEligible: z.boolean().optional(),
  expirationDate: z.union([z.string(), z.date()]).nullable().optional(),
  isSoldOut: z.boolean().optional(),
  tags: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  dealerNotes: z.string().nullable().optional()
});

export const UpdateDealRequestSchema = z.object({
  financialData: z.record(z.string(), z.any()).optional(),
  reviewStatus: z.string().optional(),
  publishStatus: z.string().optional(),
  lenderId: z.string().nullable().optional(),
  isFirstTimeBuyerEligible: z.boolean().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  customUrl: z.string().nullable().optional(),
  brokerFeeCents: z.number().optional(),
  dealerReserveCents: z.number().optional(),
  profitCents: z.number().optional(),
  expirationDate: z.union([z.string(), z.date()]).nullable().optional(),
  isSoldOut: z.boolean().optional(),
  tags: z.string().nullable().optional(),
  isPinned: z.boolean().optional(),
  dealerNotes: z.string().nullable().optional()
});

export const BulkUpdateDealsSchema = z.object({
  dealIds: z.array(z.string()),
  updates: z.object({
    mf: z.number().optional(),
    rv: z.number().optional(),
    apr: z.number().optional(),
    discountPercent: z.number().optional(),
    discountCents: z.number().optional(),
    addRebate: z.object({
      name: z.string(),
      amount: z.number()
    }).optional(),
    removeRebate: z.string().optional(),
    expirationDate: z.union([z.string(), z.date()]).nullable().optional(),
    isSoldOut: z.boolean().optional(),
    tags: z.string().nullable().optional(),
    isPinned: z.boolean().optional(),
    reviewStatus: z.string().optional(),
    publishStatus: z.string().optional(),
    lenderId: z.string().nullable().optional(),
    isFirstTimeBuyerEligible: z.boolean().optional()
  })
});

export const safeValidate = <T>(schema: z.ZodType<T>, data: any, fallback: T, endpointName: string): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod Validation Error] Endpoint: ${endpointName}`, result.error.format());
    return fallback;
  }
  return result.data;
};
