import fetch from 'node-fetch';

async function check() {
  try {
    const res = await fetch('http://localhost:3000/');
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 500));
  } catch (e) {
    console.error(e.message);
  }
}
check();