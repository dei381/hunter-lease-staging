import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/cars');
    const data = await res.json();
    console.log(data.makes[0].name, data.makes[0].models[0].name);
  } catch (e) {
    console.error(e);
  }
}

run();
