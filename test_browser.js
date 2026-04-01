import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if (response.url().includes('/api/v2/quote')) {
      console.log(`QUOTE RESPONSE: ${await response.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`BROWSER ERROR: ${err.toString()}`);
  });

  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.text()}`);
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await browser.close();
})();
