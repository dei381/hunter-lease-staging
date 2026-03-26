import { BankProgram, Lender } from '@prisma/client';

export interface ResolvedProgram {
  bankProgram: BankProgram & { lender: Lender | null };
  finalPaymentCents: number;
  sellingPriceCents: number;
  residualValueCents: number;
  totalFeesCents: number;
  depreciationCents?: number;
  rentChargeCents?: number;
  principalCents?: number;
  interestCents?: number;
}

export class ProgramResolver {
  /**
   * Resolves the best program from a list of calculated results.
   * Returns the best overall program, and the best program per lender type.
   */
  static resolveBestPrograms(results: ResolvedProgram[]): {
    bestOverall: ResolvedProgram | null;
    bestByLenderType: Record<string, ResolvedProgram>;
  } {
    if (!results || results.length === 0) {
      return { bestOverall: null, bestByLenderType: {} };
    }

    const bestByLenderType: Record<string, ResolvedProgram> = {};
    results.forEach(res => {
      const type = res.bankProgram.lender?.lenderType || 'NATIONAL_BANK';
      if (!bestByLenderType[type] || res.finalPaymentCents < bestByLenderType[type].finalPaymentCents) {
        bestByLenderType[type] = res;
      }
    });

    const bestOverall = [...results].sort((a, b) => a.finalPaymentCents - b.finalPaymentCents)[0];

    return { bestOverall, bestByLenderType };
  }
}
