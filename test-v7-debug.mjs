import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console messages
  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.message}`);
  });

  console.log('=== STEP 1: Navigate to /test/goalsv7 ===');
  await page.goto('http://localhost:3000/test/goalsv7', { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for dynamic imports to load
  await page.waitForTimeout(3000);

  console.log('\n=== CONSOLE MESSAGES ===');
  for (const msg of consoleMessages) {
    console.log(msg);
  }

  console.log('\n=== PAGE ERRORS ===');
  if (errors.length === 0) console.log('(none)');
  for (const err of errors) {
    console.log(err);
  }

  // Check what buttons exist
  console.log('\n=== STEP 2: Check for buttons ===');
  const allButtons = await page.$$eval('button', btns =>
    btns.map(b => ({
      text: b.textContent?.trim().substring(0, 60),
      visible: b.offsetWidth > 0 && b.offsetHeight > 0,
      disabled: b.disabled,
      rect: b.getBoundingClientRect(),
      computedPointerEvents: getComputedStyle(b).pointerEvents,
      computedZIndex: getComputedStyle(b).zIndex,
    }))
  );
  console.log(`Found ${allButtons.length} buttons:`);
  for (const btn of allButtons) {
    console.log(`  "${btn.text}" visible=${btn.visible} disabled=${btn.disabled} pointerEvents=${btn.computedPointerEvents} zIndex=${btn.computedZIndex} rect=[${Math.round(btn.rect.x)},${Math.round(btn.rect.y)},${Math.round(btn.rect.width)}x${Math.round(btn.rect.height)}]`);
  }

  // Check what element is at the position of the FTO button
  console.log('\n=== STEP 3: Hit test at FTO button position ===');
  const ftoBtn = allButtons.find(b => b.text?.includes('Find The One'));
  if (ftoBtn) {
    const cx = ftoBtn.rect.x + ftoBtn.rect.width / 2;
    const cy = ftoBtn.rect.y + ftoBtn.rect.height / 2;
    const hitElement = await page.evaluate(({x, y}) => {
      const el = document.elementFromPoint(x, y);
      if (!el) return 'null';
      let info = `<${el.tagName.toLowerCase()}`;
      if (el.className) info += ` class="${el.className.toString().substring(0,80)}"`;
      if (el.id) info += ` id="${el.id}"`;
      info += '>';
      // Check parents
      let parent = el.parentElement;
      const parents = [];
      for (let i = 0; i < 5 && parent; i++) {
        parents.push(`<${parent.tagName.toLowerCase()} class="${(parent.className?.toString() || '').substring(0,60)}">`);
        parent = parent.parentElement;
      }
      return { element: info, parents, textContent: el.textContent?.substring(0, 40) };
    }, { x: cx, y: cy });
    console.log(`Hit test at (${Math.round(cx)}, ${Math.round(cy)}):`, JSON.stringify(hitElement, null, 2));
  } else {
    console.log('FTO button not found!');
  }

  // Try clicking the FTO button
  console.log('\n=== STEP 4: Click FTO button ===');
  consoleMessages.length = 0; // Reset to only see new messages
  errors.length = 0;

  try {
    // Find and click by text
    const ftoLocator = page.locator('button:has-text("Find The One")');
    const count = await ftoLocator.count();
    console.log(`Found ${count} buttons with "Find The One"`);

    if (count > 0) {
      await ftoLocator.first().click({ timeout: 5000 });
      console.log('Click succeeded!');

      // Wait for any transitions
      await page.waitForTimeout(1000);

      console.log('\nConsole after click:');
      for (const msg of consoleMessages) {
        console.log(`  ${msg}`);
      }

      if (errors.length > 0) {
        console.log('\nErrors after click:');
        for (const err of errors) {
          console.log(`  ${err}`);
        }
      }

      // Check if step changed
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('\nPage content after click (first 500 chars):');
      console.log(bodyText);
    }
  } catch (err) {
    console.log(`Click failed: ${err.message}`);
  }

  // Check for any overlay elements
  console.log('\n=== STEP 5: Check fixed/absolute overlays ===');
  const overlays = await page.$$eval('*', els =>
    els.filter(el => {
      const style = getComputedStyle(el);
      return (style.position === 'fixed' || style.position === 'absolute')
        && el.offsetWidth > 200
        && el.offsetHeight > 200
        && style.pointerEvents !== 'none';
    }).map(el => ({
      tag: el.tagName.toLowerCase(),
      className: el.className?.toString()?.substring(0, 80) || '',
      zIndex: getComputedStyle(el).zIndex,
      position: getComputedStyle(el).position,
      pointerEvents: getComputedStyle(el).pointerEvents,
      rect: el.getBoundingClientRect(),
    }))
  );
  console.log(`Found ${overlays.length} large positioned overlays:`);
  for (const o of overlays) {
    console.log(`  <${o.tag} class="${o.className}"> position=${o.position} z=${o.zIndex} pointerEvents=${o.pointerEvents} rect=[${Math.round(o.rect.x)},${Math.round(o.rect.y)},${Math.round(o.rect.width)}x${Math.round(o.rect.height)}]`);
  }

  await browser.close();
  console.log('\n=== DONE ===');
})();
