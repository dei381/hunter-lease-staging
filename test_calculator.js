import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait for React to render the calculator
  await page.waitForSelector('select', { timeout: 10000 });
  
  // Wait for the car DB to load and populate the dropdowns
  await new Promise(r => setTimeout(r, 5000));
  
  // Get the initial payment
  const initialPayment = await page.evaluate(() => {
    const el = document.querySelector('.text-6xl.font-display.text-\\[var\\(--lime\\)\\]');
    return el ? el.textContent : null;
  });
  console.log('Initial Payment:', initialPayment);
  
  // Change the term to 48 months
  const selects = await page.$$('select');
  if (selects.length >= 4) {
    await selects[3].select('48'); // Assuming the 4th select is the term
    await new Promise(r => setTimeout(r, 2000)); // wait for API call
    
    const newPayment = await page.evaluate(() => {
      const el = document.querySelector('.text-6xl.font-display.text-\\[var\\(--lime\\)\\]');
      return el ? el.textContent : null;
    });
    console.log('New Payment after changing term:', newPayment);
  } else {
    console.log('Could not find term select element');
  }
  
  await browser.close();
}

run().catch(console.error);
