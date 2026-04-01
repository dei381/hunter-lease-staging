import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Navigate to the app
  await page.goto('http://localhost:3000/calculator');
  
  // Wait for the app to load
  await page.waitForSelector('text=Toyota');
  
  // Switch to Finance
  await page.click('text=КРЕДИТ');
  
  // Wait for calculation
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if "Estimate Unavailable" is present
  const unavailable = await page.$('text=Estimate Unavailable');
  if (unavailable) {
    console.log('FAILED: Estimate Unavailable');
  } else {
    console.log('SUCCESS: Finance calculation works');
  }
  
  await browser.close();
})();
