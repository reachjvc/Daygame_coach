import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// Login
await page.goto('http://localhost:3000/login');
await page.fill('input[type="email"]', 'test-user-b@daygame-coach-test.local');
await page.fill('input[type="password"]', 'TestUserB_SecurePass123!');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

// Go to goalsv10
await page.goto('http://localhost:3000/test/goalsv10');
await page.waitForTimeout(4000);

// Screenshot default tab (Arcade)
await page.screenshot({ path: '/tmp/v10-tab1-arcade.png', fullPage: true });
console.log('Tab 1 (Arcade) screenshot taken');

// Click through remaining tabs
const tabNames = ['Garden', 'Stars', 'War Room', 'Momentum'];
for (const name of tabNames) {
  try {
    const btns = page.locator('button');
    const count = await btns.count();
    for (let i = 0; i < count; i++) {
      const text = await btns.nth(i).textContent();
      if (text && text.trim() === name) {
        await btns.nth(i).click();
        await page.waitForTimeout(2000);
        const fname = name.toLowerCase().replace(/\s+/g, '-');
        await page.screenshot({ path: `/tmp/v10-${fname}.png`, fullPage: true });
        console.log(`${name} screenshot taken`);
        break;
      }
    }
  } catch (e) {
    console.log(`Error with ${name}: ${e.message}`);
  }
}

await browser.close();
console.log('Done');
