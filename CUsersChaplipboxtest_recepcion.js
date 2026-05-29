import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navigate to app
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  console.log('✓ App loaded');
  
  // Check current URL
  const url = page.url();
  console.log('Current URL:', url);
  
  // Take screenshot
  await page.screenshot({ path: 'C:\Users\Chapli\pbox\screenshot1.png' });
  console.log('✓ Screenshot saved');
  
  await browser.close();
})();
