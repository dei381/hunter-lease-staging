import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/car-photos');
    if (!res.ok) {
      console.log('Error:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log('Photos count:', data.length);
  } catch (err) {
    console.error(err);
  }
}
test();
