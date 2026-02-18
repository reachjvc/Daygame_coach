import { test, expect } from "@playwright/test"

test.describe("Variant A (Orrery Alpha) V4 Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/test/goalsv4")
    // Wait for Variant A to load (default tab)
    await page.waitForSelector('[data-testid="variant-a-orrery-v4"]', {
      timeout: 15000,
    })
  })

  test("should render the landing page with orrery visualization", async ({
    page,
  }) => {
    // Check the step gauge is visible
    await expect(page.locator("text=Life Area")).toBeVisible()
    await expect(page.locator("text=Goal Path")).toBeVisible()

    // Check the hero heading
    await expect(page.locator("text=Map Your Universe")).toBeVisible()

    // Check the orrery has SVG content
    await expect(page.locator("text=YOUR VISION")).toBeVisible()

    // Check the planetary system section
    await expect(page.locator("text=Planetary System")).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-landing.png",
      fullPage: true,
    })
  })

  test("should show path choice after clicking daygame in grid", async ({
    page,
  }) => {
    // Click the daygame card in the planet grid (static button, reliable click)
    await page.locator('[data-testid="planet-grid-daygame"]').click()

    // Path choice cards should appear
    await expect(page.locator('[data-testid="path-one-person"]')).toBeVisible({
      timeout: 3000,
    })
    await expect(page.locator('[data-testid="path-abundance"]')).toBeVisible()
    await expect(page.locator("text=Choose Your Orbit")).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-path-choice.png",
      fullPage: true,
    })
  })

  test("should navigate through full flow: landing -> pick -> customize -> chart -> complete", async ({
    page,
  }) => {
    // Step 1: Click daygame grid card to reveal path cards
    await page.locator('[data-testid="planet-grid-daygame"]').click()
    await expect(page.locator('[data-testid="path-abundance"]')).toBeVisible({
      timeout: 3000,
    })

    // Step 2: Select "Abundance" path
    await page.locator('[data-testid="path-abundance"]').click()

    // Should be on the pick step now
    await expect(
      page.locator("text=Choose your Polar Star")
    ).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-pick.png",
      fullPage: true,
    })

    // Pick the first L1 option
    const l1Grid = page.locator(".grid button").first()
    await l1Grid.click()

    // Wait for L2/L3 sections to appear
    await expect(page.locator("text=Inner orbit bodies")).toBeVisible({
      timeout: 3000,
    })

    // The "Calibrate Instruments" button should be visible
    const calibrateBtn = page.locator(
      'button:has-text("Calibrate Instruments")'
    )
    await expect(calibrateBtn).toBeVisible({ timeout: 3000 })

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-pick-selected.png",
      fullPage: true,
    })

    // Click "Calibrate Instruments" to go to customizer
    await calibrateBtn.click()

    // Step 3: Customizer
    await expect(
      page.locator("text=Calibrate your instruments")
    ).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-customize.png",
      fullPage: true,
    })

    // The "Chart the System" button should be visible
    const chartBtn = page.locator('button:has-text("Chart the System")')
    await expect(chartBtn).toBeVisible()
    await chartBtn.click()

    // Step 4: Chart
    await expect(
      page.locator("text=Your Planetary System")
    ).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-chart.png",
      fullPage: true,
    })

    // Click "Engage the Orrery" to go to completion
    const engageBtn = page.locator('button:has-text("Engage the Orrery")')
    await expect(engageBtn).toBeVisible()
    await engageBtn.click()

    // Step 5: Complete
    await expect(page.locator("text=System Engaged")).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator("text=Orrery engaged")).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-a-complete.png",
      fullPage: true,
    })
  })

  test("should support back navigation from pick step", async ({ page }) => {
    // Go to pick step
    await page.locator('[data-testid="planet-grid-daygame"]').click()
    await page.locator('[data-testid="path-abundance"]').click()

    // Verify we're on the pick step
    await expect(
      page.locator("text=Choose your Polar Star")
    ).toBeVisible({ timeout: 5000 })

    // Click back button
    const backBtn = page.locator(
      '[data-testid="variant-a-orrery-v4"] button:has-text("Back")'
    ).first()
    await backBtn.click()

    // Should be back on landing
    await expect(page.locator("text=Map Your Universe")).toBeVisible({
      timeout: 3000,
    })
  })

  test("should support start over from complete step", async ({ page }) => {
    // Navigate through full flow quickly
    await page.locator('[data-testid="planet-grid-daygame"]').click()
    await page.locator('[data-testid="path-abundance"]').click()

    // Pick first L1
    await expect(page.locator("text=Choose your Polar Star")).toBeVisible({
      timeout: 5000,
    })
    await page.locator(".grid button").first().click()
    await page.locator('button:has-text("Calibrate Instruments")').click()

    // Customize -> Chart
    await expect(page.locator("text=Calibrate your instruments")).toBeVisible({
      timeout: 5000,
    })
    await page.locator('button:has-text("Chart the System")').click()

    // Chart -> Complete
    await expect(page.locator("text=Your Planetary System")).toBeVisible({
      timeout: 5000,
    })
    await page.locator('button:has-text("Engage the Orrery")').click()

    // Verify complete
    await expect(page.locator("text=System Engaged")).toBeVisible({
      timeout: 5000,
    })

    // Click "Chart a new system" to start over
    await page.locator('button:has-text("Chart a new system")').click()

    // Should be back on landing
    await expect(page.locator("text=Map Your Universe")).toBeVisible({
      timeout: 3000,
    })
  })
})
