import http from 'http';

async function fetchCars() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/cars', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ length: data.length, status: res.statusCode });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  for (let i = 0; i < 5; i++) {
    console.log(`Request ${i + 1}...`);
    const result = await fetchCars();
    console.log(`Result: ${result.status}, Length: ${result.length}`);
  }
}

main().catch(console.error);
