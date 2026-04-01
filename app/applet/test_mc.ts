import fetch from 'node-fetch';
async function test() {
  const apiKey = process.env.MARKETCHECK_API_KEY || process.env.API_KEY;
  const url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&car_type=new&make=Toyota&model=Camry&rows=5`;
  const res = await fetch(url);
  console.log(res.status);
  const text = await res.text();
  console.log(text);
}
test();
