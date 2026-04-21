const TEN_K_MAKES = new Set(['hyundai', 'kia', 'toyota']);

export function getDefaultLeaseMileage(make?: string | null): '7.5k' | '10k' {
  const normalizedMake = make?.trim().toLowerCase();
  return normalizedMake && TEN_K_MAKES.has(normalizedMake) ? '10k' : '7.5k';
}