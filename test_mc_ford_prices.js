import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/marketcheck/search?make=Ford&rows=50');
    const data = await res.json();
    data.listings.forEach(item => {
      const price = item.price || item.msrp || 0;
      const amountToFinance = Math.max(0, price - 3000); // 3000 down payment
      const estimatedLease = Math.round((amountToFinance / 36) + (price * 0.00125));
      console.log(`${item.build?.make}-${item.build?.model}-${item.build?.trim}: $${estimatedLease}`);
    });
  } catch (err) {
    console.error(err);
  }
}
test();
