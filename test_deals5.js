import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/deals?limit=50');
    const data = await res.json();
    const nullIds = data.filter(d => d.id == null);
    console.log('Null IDs count:', nullIds.length);
  } catch (err) {
    console.error(err);
  }
}
test();
