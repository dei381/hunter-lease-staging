function parseTermMonths(term: string | number | undefined, fallback: number): number {
  if (typeof term === 'number' && Number.isFinite(term) && term > 0) {
    return term;
  }

  if (typeof term === 'string') {
    const parsed = parseInt(term, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export function getVehicleCostSummary(args: {
  msrp: number;
  selectedConfig?: {
    payment?: number | null;
    down?: number | null;
    term?: string | number | null;
    tco?: {
      monthlyAverage?: number | null;
      totalCost?: number | null;
    } | null;
  } | null;
  defaultDown?: number;
  defaultTermMonths?: number;
}) {
  const {
    msrp,
    selectedConfig,
    defaultDown = 3000,
    defaultTermMonths = 36,
  } = args;

  const down = Number(selectedConfig?.down) > 0 ? Number(selectedConfig?.down) : defaultDown;
  const termMonths = parseTermMonths(selectedConfig?.term ?? undefined, defaultTermMonths);

  if (
    typeof selectedConfig?.tco?.monthlyAverage === 'number' &&
    typeof selectedConfig?.tco?.totalCost === 'number'
  ) {
    return {
      monthlyAverage: selectedConfig.tco.monthlyAverage,
      totalCost: selectedConfig.tco.totalCost,
      termMonths,
      down,
    };
  }

  if (typeof selectedConfig?.payment === 'number' && selectedConfig.payment > 0) {
    return {
      monthlyAverage: selectedConfig.payment + Math.round(down / termMonths),
      totalCost: selectedConfig.payment * termMonths + down,
      termMonths,
      down,
    };
  }

  return {
    monthlyAverage: Math.round(msrp * 0.015 + down / termMonths),
    totalCost: Math.round(msrp * 0.015 * termMonths + down),
    termMonths,
    down,
  };
}

export function getDisplayedSellingPrice(args: {
  quoteSellingPrice?: number | null;
  msrp?: number | null;
  savings?: number | null;
  totalIncentives?: number | null;
  showIncentives: boolean;
}) {
  const baseSellingPrice = typeof args.quoteSellingPrice === 'number'
    ? args.quoteSellingPrice
    : (Number(args.msrp) || 0) - (Number(args.savings) || 0);

  if (!args.showIncentives) {
    return Math.max(0, baseSellingPrice);
  }

  return Math.max(0, baseSellingPrice - (Number(args.totalIncentives) || 0));
}