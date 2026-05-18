export interface Incentive {
  id: string;
  name: string;
  amountCents: number;
  type: 'dealer' | 'manufacturer' | 'loyalty' | 'conquest' | 'military' | 'college' | 'first_responder' | 'other' | 'first_time_buyer';
  isDefault: boolean;
  description?: string;
  exclusiveGroupId?: string | null;
  stackable?: boolean;
  isTaxableCa?: boolean;
}

export interface EvaluatedIncentive extends Incentive {
  status: 'APPLIED' | 'REJECTED';
  reason: string;
}

export class IncentiveResolver {
  /**
   * Resolves the applicable incentives for a given vehicle and user profile.
   * For MVP, it takes the available incentives from the vehicle/deal and the user's selected incentive IDs,
   * and calculates the total rebate amount.
   */
  static resolve(
    availableIncentives: any[] = [], 
    selectedIds: string[] = [], 
    role: string = 'customer', 
    isFirstTimeBuyer: boolean = false,
    context?: any,
    vehicle?: any
  ): {
    appliedIncentives: Incentive[];
    evaluatedIncentives: EvaluatedIncentive[];
    totalRebateCents: number;
    taxableRebateCents: number;
    nonTaxableRebateCents: number;
  } {
    const appliedIncentives: Incentive[] = [];
    const evaluatedIncentives: EvaluatedIncentive[] = [];
    let totalRebateCents = 0;
    let taxableRebateCents = 0;
    let nonTaxableRebateCents = 0;
    
    // Temporary array to hold eligible incentives before applying stackability rules
    const eligibleIncentives: Incentive[] = [];

    for (const inc of availableIncentives) {
      const baseIncentive: Incentive = {
        id: inc.id,
        name: inc.name || 'Discount',
        amountCents: inc.amountCents || (Number(inc.amount) * 100) || 0,
        type: inc.type || 'other',
        isDefault: !!inc.isDefault,
        description: inc.description,
        exclusiveGroupId: inc.exclusiveGroupId,
        stackable: inc.stackable !== undefined ? inc.stackable : true,
        isTaxableCa: inc.isTaxableCa !== undefined ? inc.isTaxableCa : true
      };

      // 1. Check if active
      if (inc.isActive === false) {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: 'Incentive is marked as inactive' });
        continue;
      }

      // 2. Check effective dates
      const now = new Date();
      if (inc.effectiveFrom && new Date(inc.effectiveFrom) > now) {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: `Not effective until ${new Date(inc.effectiveFrom).toLocaleDateString()}` });
        continue;
      }
      if (inc.effectiveTo && new Date(inc.effectiveTo) < now) {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: `Expired on ${new Date(inc.effectiveTo).toLocaleDateString()}` });
        continue;
      }

      // 3. Check trim match
      if (vehicle && inc.trim && vehicle.trim !== inc.trim) {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: `Trim mismatch. Required: ${inc.trim}, Found: ${vehicle.trim}` });
        continue;
      }

      // 4. Check trim group match (simplified check for now)
      if (vehicle && inc.trimGroup && vehicle.trim && !vehicle.trim.includes(inc.trimGroup)) {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: `Trim group mismatch. Required: ${inc.trimGroup}` });
        continue;
      }

      // 5. Check deal applicability
      if (context && inc.dealApplicability && inc.dealApplicability !== 'ALL' && inc.dealApplicability !== context.quoteType) {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: `Applicability mismatch. Required: ${inc.dealApplicability}, Found: ${context.quoteType}` });
        continue;
      }

      // 6. Check eligibility rules (JSON)
      if (inc.eligibilityRules) {
        let failedRule = false;
        let ruleReason = '';
        
        // Example: { "term": [36, 48] }
        if (context && inc.eligibilityRules.term && Array.isArray(inc.eligibilityRules.term) && !inc.eligibilityRules.term.includes(context.term)) {
          failedRule = true;
          ruleReason = `Term mismatch. Required: ${inc.eligibilityRules.term.join(', ')}, Found: ${context.term}`;
        }
        
        if (failedRule) {
          evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: ruleReason });
          continue;
        }
      }

      // Default incentives are always applied unless the user is an admin and explicitly unselected it (if we allow that).
      // For now, if it's default, or if it's selected, we apply it.
      const isSelected = selectedIds.includes(inc.id);
      
      // Check if it's a first-time buyer incentive and the user is a first-time buyer
      const isFtbIncentive = inc.type === 'first_time_buyer' || inc.name?.toLowerCase().includes('first time buyer');
      
      if (inc.isDefault) {
        eligibleIncentives.push(baseIncentive);
      } else if (isFtbIncentive) {
        if (isFirstTimeBuyer) {
          eligibleIncentives.push(baseIncentive);
        } else {
          evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: 'Not a first-time buyer' });
        }
      } else if (isSelected) {
        eligibleIncentives.push(baseIncentive);
      } else {
        evaluatedIncentives.push({ ...baseIncentive, status: 'REJECTED', reason: 'Not selected by user' });
      }
    }

    // Apply Stackability Rules (exclusiveGroupId and stackable)
    const groups = new Map<string, Incentive[]>();
    const nonStackableEligible: Incentive[] = [];
    const standaloneIncentives: Incentive[] = [];

    for (const inc of eligibleIncentives) {
      if (inc.stackable === false) {
        nonStackableEligible.push(inc);
      } else if (inc.exclusiveGroupId) {
        if (!groups.has(inc.exclusiveGroupId)) {
          groups.set(inc.exclusiveGroupId, []);
        }
        groups.get(inc.exclusiveGroupId)!.push(inc);
      } else {
        standaloneIncentives.push(inc);
      }
    }

    // Calculate best stackable combination
    let bestStackableSum = 0;
    const bestStackableIncentives: Incentive[] = [];
    const rejectedStackableIncentives: { inc: Incentive, reason: string }[] = [];

    // Process exclusive groups (pick highest in each group)
    for (const [groupId, groupIncentives] of groups.entries()) {
      if (groupIncentives.length === 1) {
        const inc = groupIncentives[0];
        bestStackableIncentives.push(inc);
        bestStackableSum += inc.amountCents;
      } else {
        // Pick the highest
        const bestInGroup = groupIncentives.reduce((prev, current) => (prev.amountCents > current.amountCents) ? prev : current);
        bestStackableIncentives.push(bestInGroup);
        bestStackableSum += bestInGroup.amountCents;

        // Reject others in the group
        for (const inc of groupIncentives) {
          if (inc.id !== bestInGroup.id) {
            rejectedStackableIncentives.push({ inc, reason: `Lower amount in exclusive group ${groupId}` });
          }
        }
      }
    }

    // Process standalone stackable incentives
    for (const inc of standaloneIncentives) {
      bestStackableIncentives.push(inc);
      bestStackableSum += inc.amountCents;
    }

    // Find best non-stackable
    let bestNonStackable: Incentive | null = null;
    if (nonStackableEligible.length > 0) {
      bestNonStackable = nonStackableEligible.reduce((prev, current) => (prev.amountCents > current.amountCents) ? prev : current);
    }

    // Compare and apply
    if (bestNonStackable && bestNonStackable.amountCents > bestStackableSum) {
      // Non-stackable is better
      appliedIncentives.push(bestNonStackable);
      totalRebateCents += bestNonStackable.amountCents;
      if (bestNonStackable.isTaxableCa) {
        taxableRebateCents += bestNonStackable.amountCents;
      } else {
        nonTaxableRebateCents += bestNonStackable.amountCents;
      }
      evaluatedIncentives.push({ ...bestNonStackable, status: 'APPLIED', reason: 'Highest non-stackable incentive applied (better than stackable combo)' });

      // Reject all others
      for (const inc of eligibleIncentives) {
        if (inc.id !== bestNonStackable.id) {
          evaluatedIncentives.push({ ...inc, status: 'REJECTED', reason: 'Rejected in favor of better non-stackable incentive' });
        }
      }
    } else {
      // Stackable combo is better (or no non-stackable)
      for (const inc of bestStackableIncentives) {
        appliedIncentives.push(inc);
        totalRebateCents += inc.amountCents;
        if (inc.isTaxableCa) {
          taxableRebateCents += inc.amountCents;
        } else {
          nonTaxableRebateCents += inc.amountCents;
        }
        evaluatedIncentives.push({ ...inc, status: 'APPLIED', reason: inc.exclusiveGroupId ? `Highest amount in group ${inc.exclusiveGroupId}` : 'Applied stackable incentive' });
      }

      for (const { inc, reason } of rejectedStackableIncentives) {
        evaluatedIncentives.push({ ...inc, status: 'REJECTED', reason });
      }

      // Reject all non-stackables
      for (const inc of nonStackableEligible) {
        evaluatedIncentives.push({ ...inc, status: 'REJECTED', reason: 'Rejected in favor of better stackable combination' });
      }
    }

    return {
      appliedIncentives,
      evaluatedIncentives,
      totalRebateCents,
      taxableRebateCents,
      nonTaxableRebateCents
    };
  }
}
