export class ModifierEngine {
  static applyMileageAdjustment(rv: number, mileage?: number): number {
    let adjustedRv = rv;
    if (mileage === 12000) adjustedRv -= 0.02;
    else if (mileage === 15000) adjustedRv -= 0.03;
    else if (mileage === 20000) adjustedRv -= 0.05;
    else if (mileage === 7500) adjustedRv += 0.01;
    return adjustedRv;
  }

  static applyTierAdjustment(mf: number, apr: number, tier: string) {
    let adjustedMf = mf;
    let adjustedApr = apr;
    let factor = 0;
    
    if (tier === 't2') factor = 0.2;
    else if (tier === 't3') factor = 0.4;
    else if (tier === 't4') factor = 0.6;
    else if (tier === 't5') factor = 0.8;
    else if (tier === 't6') factor = 1.0;

    const MAX_APR = 24.0;
    const MAX_MF = 0.01000;

    if (factor > 0) {
       adjustedApr = apr + (MAX_APR - apr) * factor;
       adjustedMf = mf + (MAX_MF - mf) * factor;
    }
    
    return { mf: adjustedMf, apr: adjustedApr };
  }
}
