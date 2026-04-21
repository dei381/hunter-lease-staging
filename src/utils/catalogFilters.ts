export interface CatalogFilterItem {
  id: string;
  make: string;
  model: string;
  trim: string;
  bodyStyle: string | null;
  leasePayment: number | null;
  financePayment: number | null;
}

export interface CatalogClientFilters {
  searchQuery: string;
  selectedBodyStyle: string;
  selectedModel: string;
  displayMode: 'lease' | 'finance';
  maxPayment: number;
}

export function getCatalogModelOptions<T extends CatalogFilterItem>(items: T[], selectedMake: string): string[] {
  const scopedItems = selectedMake === 'All'
    ? items
    : items.filter(item => item.make === selectedMake);

  const models = Array.from(new Set(scopedItems.map(item => item.model).filter(Boolean))).sort();
  return ['All', ...models];
}

export function filterCatalogItems<T extends CatalogFilterItem>(items: T[], filters: CatalogClientFilters): T[] {
  let result = items;

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(item =>
      item.make.toLowerCase().includes(query) ||
      item.model.toLowerCase().includes(query) ||
      item.trim.toLowerCase().includes(query)
    );
  }

  if (filters.selectedModel !== 'All') {
    result = result.filter(item => item.model === filters.selectedModel);
  }

  if (filters.selectedBodyStyle !== 'All') {
    result = result.filter(item => item.bodyStyle === filters.selectedBodyStyle);
  }

  result = result.filter(item => {
    const payment = filters.displayMode === 'lease' ? item.leasePayment : item.financePayment;
    return payment !== null && payment <= filters.maxPayment;
  });

  return result;
}