export interface CatalogEntry {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  msrp: number;
  bodyStyle: string | null;
  imageUrl: string | null;
  leasePayment: number | null;
  leaseTerm: number;
  leaseMileage: number;
  leaseDown: number;
  leaseMF: number;
  leaseRV: number;
  financePayment: number | null;
  financeTerm: number;
  financeAPR: number;
  financeDown: number;
  totalIncentivesCents: number;
  incentives: { name: string; amountCents: number; type: string }[];
  sellingPrice: number;
  savings: number;
  status: 'ready' | 'incomplete';
  missingFields: string[];
  lenderName: string | null;
}

export type CatalogQuoteMode = 'lease' | 'finance';

interface IncentiveForCatalogSelection {
  id?: string | null;
  name?: string | null;
  amountCents?: number | null;
  type?: string | null;
  isDefault?: boolean | null;
  dealApplicability?: string | null;
}

interface DbIncentiveForCatalogSelection {
  id?: string | null;
  name?: string | null;
  amountCents?: number | null;
  type?: string | null;
  dealApplicability?: string | null;
}

interface QuoteForCatalogEntry {
  calcStatus?: string;
  monthlyPaymentCents?: number;
  appliedMf?: number;
  appliedApr?: number;
  appliedRvPercent?: number;
  totalIncentivesCents?: number;
  sellingPriceCents?: number;
  sourceMetadata?: {
    lenderName?: string | null;
  };
}

const CONDITIONAL_INCENTIVE_TYPES = new Set([
  'conditional',
  'special',
  'military',
  'college',
  'first_responder',
  'first_time_buyer',
  'loyalty',
  'conquest',
]);

const ADVERTISED_DEFAULT_INCENTIVE_TYPES = new Set([
  'manufacturer',
  'oem_cash',
  'dealer',
  'dealer_discount',
]);

export function isCatalogAdvertisedDefaultIncentive(incentive: IncentiveForCatalogSelection): boolean {
  const type = String(incentive.type || '').toLowerCase();

  if (CONDITIONAL_INCENTIVE_TYPES.has(type)) {
    return false;
  }

  return incentive.isDefault === true || ADVERTISED_DEFAULT_INCENTIVE_TYPES.has(type);
}

export function buildCatalogSelectedIncentiveIds(incentives: IncentiveForCatalogSelection[] = []): string[] {
  return incentives
    .filter(isCatalogAdvertisedDefaultIncentive)
    .map(incentive => incentive.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function toCatalogIncentiveForSelection(
  incentive: DbIncentiveForCatalogSelection,
  mode?: CatalogQuoteMode,
): IncentiveForCatalogSelection {
  const dealApplicability = String(incentive.dealApplicability || 'ALL').toUpperCase();
  const normalizedType = incentive.type === 'conditional' ? 'special' : incentive.type;
  const matchesMode = !mode || dealApplicability === 'ALL' || dealApplicability === mode.toUpperCase();
  const isDefault = matchesMode && isCatalogAdvertisedDefaultIncentive({
    type: normalizedType,
    isDefault: true,
  });

  return {
    id: incentive.id,
    name: incentive.name,
    amountCents: incentive.amountCents,
    type: normalizedType,
    isDefault,
    dealApplicability,
  };
}

function isSuccessfulQuote(quote?: QuoteForCatalogEntry | null): quote is QuoteForCatalogEntry {
  return quote?.calcStatus === 'SUCCESS' && typeof quote.monthlyPaymentCents === 'number' && quote.monthlyPaymentCents > 0;
}

export function formatCatalogEntryFromQuote(args: {
  trim: any;
  makeName: string;
  modelName: string;
  year: number;
  photoUrl: string | null;
  requestedTerm: number;
  requestedDown: number;
  requestedMileage: number;
  mode: CatalogQuoteMode;
  leaseQuote?: QuoteForCatalogEntry | null;
  financeQuote?: QuoteForCatalogEntry | null;
  matchedIncentives?: IncentiveForCatalogSelection[];
}): CatalogEntry {
  const {
    trim,
    makeName,
    modelName,
    year,
    photoUrl,
    requestedTerm,
    requestedDown,
    requestedMileage,
    mode,
    leaseQuote,
    financeQuote,
    matchedIncentives = [],
  } = args;

  const primaryQuote = mode === 'finance' ? financeQuote : leaseQuote;
  const fallbackQuote = isSuccessfulQuote(leaseQuote) ? leaseQuote : isSuccessfulQuote(financeQuote) ? financeQuote : null;
  const totalsQuote = isSuccessfulQuote(primaryQuote) ? primaryQuote : fallbackQuote;
  const primaryIsReady = isSuccessfulQuote(primaryQuote);
  const totalIncentivesCents = totalsQuote?.totalIncentivesCents || 0;
  const msrpCents = trim.msrpCents || 0;
  const sellingPriceCents = typeof totalsQuote?.sellingPriceCents === 'number'
    ? totalsQuote.sellingPriceCents
    : Math.max(0, msrpCents - totalIncentivesCents);
  const missingReason = primaryQuote && typeof primaryQuote.calcStatus === 'string'
    ? primaryQuote.calcStatus
    : 'quoteCalculation';

  const advertisedIncentives = matchedIncentives
    .filter(isCatalogAdvertisedDefaultIncentive)
    .map(incentive => ({
      name: incentive.name || 'Incentive',
      amountCents: incentive.amountCents || 0,
      type: incentive.type || 'manufacturer',
    }));

  return {
    id: trim.id,
    make: makeName,
    model: modelName,
    trim: trim.name,
    year,
    msrp: msrpCents / 100,
    bodyStyle: trim.bodyStyle || null,
    imageUrl: photoUrl || trim.model?.imageUrl || null,
    leasePayment: isSuccessfulQuote(leaseQuote) ? leaseQuote.monthlyPaymentCents! / 100 : null,
    leaseTerm: requestedTerm,
    leaseMileage: requestedMileage,
    leaseDown: requestedDown,
    leaseMF: isSuccessfulQuote(leaseQuote) ? leaseQuote.appliedMf || 0 : 0,
    leaseRV: isSuccessfulQuote(leaseQuote) ? leaseQuote.appliedRvPercent || 0 : 0,
    financePayment: isSuccessfulQuote(financeQuote) ? financeQuote.monthlyPaymentCents! / 100 : null,
    financeTerm: requestedTerm,
    financeAPR: isSuccessfulQuote(financeQuote) ? financeQuote.appliedApr || 0 : 0,
    financeDown: requestedDown,
    totalIncentivesCents,
    incentives: advertisedIncentives,
    sellingPrice: sellingPriceCents / 100,
    savings: totalIncentivesCents / 100,
    status: primaryIsReady ? 'ready' : 'incomplete',
    missingFields: primaryIsReady ? [] : [missingReason],
    lenderName: primaryQuote?.sourceMetadata?.lenderName || fallbackQuote?.sourceMetadata?.lenderName || null,
  };
}
