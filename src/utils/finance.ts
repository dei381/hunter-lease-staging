
export const getVal = (field: any, fallback: number = 0): number => {
  if (field === undefined || field === null) return fallback;
  if (typeof field === 'number') return field;
  if (typeof field === 'object' && field !== null) {
    if ('value' in field) {
      return getVal(field.value, fallback);
    }
  }
  const parsed = parseFloat(field.toString().replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? fallback : parsed;
};
