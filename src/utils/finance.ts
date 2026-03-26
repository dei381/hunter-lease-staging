
export const getVal = (field: any, fallback: number = 0): number => {
  if (field === undefined || field === null) return fallback;
  if (typeof field === 'number') return field;
  const parsed = parseFloat(field.toString().replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? fallback : parsed;
};
