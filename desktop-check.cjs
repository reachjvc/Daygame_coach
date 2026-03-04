const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: 'tests/e2e/.auth/user.json',
  });
  const page = await context.newPage();

  const pages = [
    { name: 'dashboard', url: '/dashboard' },
    { name: 'goals', url: '/dashboard/goals' },
    { name: 'tracking', url: '/dashboard/tracking' },
    { name: 'scenarios', url: '/dashboard/scenarios' },
    { name: 'settings', url: '/dashboard/settings' },
    { name: 'goals-setup', url: '/dashboard/goals/setup' },
  ];

  for (const p of pages) {
    await page.goto(`http://localhost:3000${p.url}`, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `desktop-check-${p.name}.png`, fullPage: true });
    console.log(`${p.name} done`);
  }

  await browser.close();
})();
