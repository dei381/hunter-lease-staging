export class ModifierEngine {
  static applyMsd(mf: number, msdCount: number): number {
    if (msdCount <= 0) return mf;
    // Typical reduction is 0.00007 per MSD
    return Math.max(0.00001, mf - (msdCount * 0.00007));
  }

  static applyMileageAdjustment(rv: number, mileage?: number): number {
    let adjustedRv = rv;
    if (mileage === 12000) adjustedRv -= 0.01;
    else if (mileage === 15000) adjustedRv -= 0.03;
    else if (mileage === 20000) adjustedRv -= 0.05;
    else if (mileage === 7500) adjustedRv += 0.01;
    return adjustedRv;
  }

  static applyTierAdjustment(mf: number, apr: number, tier: string) {
    let adjustedMf = mf;
    let adjustedApr = apr;
    if (tier === 't2') { adjustedMf *= 1.1; adjustedApr += 1.0; }
    else if (tier === 't3') { adjustedMf *= 1.2; adjustedApr += 2.5; }
    else if (tier === 't4') { adjustedMf *= 1.35; adjustedApr += 4.5; }
    else if (tier === 't5') { adjustedMf *= 1.5; adjustedApr += 7.0; }
    else if (tier === 't6') { adjustedMf *= 1.7; adjustedApr += 10.0; }
    return { mf: adjustedMf, apr: adjustedApr };
  }
}
