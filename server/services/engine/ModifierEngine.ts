export class ModifierEngine {
  static applyMileageAdjustment(rv: number, mileage?: number): number {
    // Residual is adjusted relative to the 10k/yr base (as a % of MSRP).
    // Client spec: 7.5k = +1%, 12k = -1.5%, 15k = -4% of MSRP.
    let adjustedRv = rv;
    if (mileage === 7500) adjustedRv += 0.01;
    else if (mileage === 12000) adjustedRv -= 0.015;
    else if (mileage === 15000) adjustedRv -= 0.04;
    else if (mileage === 20000) adjustedRv -= 0.05;
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
