import { describe, expect, it } from 'vitest';

import { IncentiveResolver } from '../services/IncentiveResolver';

describe('IncentiveResolver', () => {
  it('does not auto-apply non-stackable incentives without explicit selection', () => {
    const result = IncentiveResolver.resolve([
      {
        id: 'toyota-camry-cash',
        name: 'TFS Customer Cash',
        amountCents: 150000,
        type: 'manufacturer',
        isDefault: true,
        stackable: false,
        isTaxableCa: true,
      },
    ]);

    expect(result.totalRebateCents).toBe(0);
    expect(result.appliedIncentives).toHaveLength(0);
    expect(result.evaluatedIncentives).toContainEqual(
      expect.objectContaining({
        id: 'toyota-camry-cash',
        status: 'REJECTED',
      })
    );
  });

  it('applies non-stackable incentives when explicitly selected', () => {
    const result = IncentiveResolver.resolve(
      [
        {
          id: 'toyota-camry-cash',
          name: 'TFS Customer Cash',
          amountCents: 150000,
          type: 'manufacturer',
          isDefault: true,
          stackable: false,
          isTaxableCa: true,
        },
      ],
      ['toyota-camry-cash']
    );

    expect(result.totalRebateCents).toBe(150000);
    expect(result.appliedIncentives).toHaveLength(1);
    expect(result.appliedIncentives[0].id).toBe('toyota-camry-cash');
  });
});