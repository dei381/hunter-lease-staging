import { describe, expect, it } from 'vitest';

import {
  buildCatalogSelectedIncentiveIds,
  formatCatalogEntryFromQuote,
  toCatalogIncentiveForSelection,
} from '../utils/catalogQuote';

describe('catalog quote parity helpers', () => {
  it('marks lease manufacturer incentives as default for detail calculator parity', () => {
    const incentive = toCatalogIncentiveForSelection({
      id: 'lease-cash',
      name: 'TFS Customer Cash',
      amountCents: 150000,
      type: 'manufacturer',
      dealApplicability: 'LEASE',
    });

    expect(incentive).toEqual({
      id: 'lease-cash',
      name: 'TFS Customer Cash',
      amountCents: 150000,
      type: 'manufacturer',
      isDefault: true,
      dealApplicability: 'LEASE',
    });
  });

  it('does not mark finance-only manufacturer incentives as default on lease detail pages', () => {
    const incentive = toCatalogIncentiveForSelection({
      id: 'finance-cash',
      name: 'TFS Customer Cash',
      amountCents: 100000,
      type: 'manufacturer',
      dealApplicability: 'FINANCE',
    }, 'lease');

    expect(incentive.isDefault).toBe(false);
  });

  it('selects only advertised default incentives for catalog quote calculations', () => {
    const incentives = [
      { id: 'military', type: 'conditional', isDefault: false },
      { id: 'college', type: 'special', isDefault: false },
      { id: 'manufacturer-cash', type: 'manufacturer', isDefault: true },
      { id: 'dealer-discount', type: 'dealer', isDefault: true },
    ];

    expect(buildCatalogSelectedIncentiveIds(incentives)).toEqual(['manufacturer-cash', 'dealer-discount']);
  });

  it('uses the quote response as the source of truth for catalog payment and incentives', () => {
    const entry = formatCatalogEntryFromQuote({
      trim: {
        id: 'trim-1',
        name: 'SE',
        msrpCents: 3150000,
        bodyStyle: 'Sedan',
        model: {
          name: 'Toyota Camry',
          imageUrl: null,
          make: { name: 'Toyota' },
          years: [2026],
        },
      },
      modelName: 'Camry',
      makeName: 'Toyota',
      year: 2026,
      photoUrl: 'https://example.com/camry.jpg',
      requestedTerm: 36,
      requestedDown: 3000,
      requestedMileage: 10000,
      mode: 'lease',
      leaseQuote: {
        calcStatus: 'SUCCESS',
        monthlyPaymentCents: 42460,
        appliedMf: 0.00065,
        appliedRvPercent: 0.55,
        totalIncentivesCents: 150000,
        sellingPriceCents: 3000000,
        sourceMetadata: { lenderName: 'Toyota Financial Services' },
      },
      financeQuote: {
        calcStatus: 'SUCCESS',
        monthlyPaymentCents: 56130,
        appliedApr: 5.49,
        totalIncentivesCents: 150000,
        sellingPriceCents: 3000000,
        sourceMetadata: { lenderName: 'Toyota Financial Services' },
      },
      matchedIncentives: [
        { name: 'TFS Customer Cash', amountCents: 150000, type: 'manufacturer' },
        { name: 'Toyota Military Rebate', amountCents: 50000, type: 'conditional' },
      ],
    });

    expect(entry.status).toBe('ready');
    expect(entry.leasePayment).toBe(424.6);
    expect(entry.financePayment).toBe(561.3);
    expect(entry.totalIncentivesCents).toBe(150000);
    expect(entry.savings).toBe(1500);
    expect(entry.sellingPrice).toBe(30000);
    expect(entry.lenderName).toBe('Toyota Financial Services');
  });
});
