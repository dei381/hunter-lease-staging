import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/marketcheck/search?rows=1');
    const data = await res.json();
    console.log(Object.keys(data.listings[0]));
    console.log('id:', data.listings[0].id);
  } catch (err) {
    console.error(err);
  }
}
test();
