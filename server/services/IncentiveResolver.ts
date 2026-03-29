export interface Incentive {
  id: string;
  name: string;
  amountCents: number;
  type: 'dealer' | 'manufacturer' | 'loyalty' | 'conquest' | 'military' | 'college' | 'first_responder' | 'other';
  isDefault: boolean;
  description?: string;
}

export class IncentiveResolver {
  /**
   * Resolves the applicable incentives for a given vehicle and user profile.
   * For MVP, it takes the available incentives from the vehicle/deal and the user's selected incentive IDs,
   * and calculates the total rebate amount.
   */
  static resolve(availableIncentives: any[] = [], selectedIds: string[] = [], role: string = 'customer', isFirstTimeBuyer: boolean = false): {
    appliedIncentives: Incentive[];
    totalRebateCents: number;
  } {
    const appliedIncentives: Incentive[] = [];
    let totalRebateCents = 0;

    for (const inc of availableIncentives) {
      // Default incentives are always applied unless the user is an admin and explicitly unselected it (if we allow that).
      // For now, if it's default, or if it's selected, we apply it.
      const isSelected = selectedIds.includes(inc.id);
      
      // Check if it's a first-time buyer incentive and the user is a first-time buyer
      const isFtbIncentive = inc.type === 'first_time_buyer' || inc.name?.toLowerCase().includes('first time buyer');
      
      if (inc.isDefault || isSelected || (isFtbIncentive && isFirstTimeBuyer)) {
        let amount = Number(inc.amount) || 0;
        if (isNaN(amount)) amount = 0;
        const amountCents = amount * 100;
        appliedIncentives.push({
          id: inc.id,
          name: inc.name || 'Discount',
          amountCents,
          type: inc.type || 'other',
          isDefault: !!inc.isDefault,
          description: inc.description
        });
        totalRebateCents += amountCents;
      }
    }

    return {
      appliedIncentives,
      totalRebateCents
    };
  }
}
