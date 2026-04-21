import { describe, expect, it } from 'vitest';
import { filterCatalogItems, getCatalogModelOptions } from './catalogFilters';

const sampleItems = [
  {
    id: '1',
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    bodyStyle: 'Sedan',
    leasePayment: 399,
    financePayment: 589,
  },
  {
    id: '2',
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE',
    bodyStyle: 'SUV',
    leasePayment: 429,
    financePayment: 619,
  },
  {
    id: '3',
    make: 'Lexus',
    model: 'RX',
    trim: '350',
    bodyStyle: 'SUV',
    leasePayment: 699,
    financePayment: 899,
  },
];

describe('catalogFilters', () => {
  it('returns model options scoped to the selected make', () => {
    expect(getCatalogModelOptions(sampleItems, 'Toyota')).toEqual(['All', 'Camry', 'RAV4']);
    expect(getCatalogModelOptions(sampleItems, 'All')).toEqual(['All', 'Camry', 'RAV4', 'RX']);
  });

  it('filters items by selected model and search query', () => {
    const result = filterCatalogItems(sampleItems, {
      searchQuery: 'cam',
      selectedBodyStyle: 'All',
      selectedModel: 'Camry',
      displayMode: 'lease',
      maxPayment: 1000,
    });

    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('Camry');
  });

  it('uses the active display mode when applying the max payment filter', () => {
    const financeResult = filterCatalogItems(sampleItems, {
      searchQuery: '',
      selectedBodyStyle: 'All',
      selectedModel: 'All',
      displayMode: 'finance',
      maxPayment: 600,
    });

    expect(financeResult.map(item => item.id)).toEqual(['1']);
  });
});