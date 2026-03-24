export function calculateFinancePayment(msrp: number, savings: number, down: number, term: number = 60, apr: number = 5.9): number {
  const sellingPrice = msrp - savings;
  const amountFinanced = sellingPrice - down;
  if (amountFinanced <= 0) return 0;
  
  const r = (apr / 100) / 12;
  const n = term;
  
  if (r === 0) return Math.round(amountFinanced / n);
  
  const payment = amountFinanced * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment);
}
