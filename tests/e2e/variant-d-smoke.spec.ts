import { test, expect } from "@playwright/test"

test.describe("Variant D (Aurora Beta / Solar Storm) V4 Smoke Test", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/test/goalsv4")
    // Click the Aurora Beta tab
    await page.locator("button", { hasText: "Aurora Beta" }).click()
    // Wait for Variant D to load
    await page.waitForSelector('[data-testid="variant-d"]', { timeout: 15000 })
  })

  test("Landing page renders with storm theme and two paths", async ({ page }) => {
    // Storm badge
    await expect(page.locator("text=Solar Storm")).toBeVisible()

    // Hero text
    await expect(page.locator("text=Ignite your trajectory")).toBeVisible()

    // Two path options
    await expect(page.locator("h2", { hasText: "Find the One" })).toBeVisible()
    await expect(page.locator("h2", { hasText: "Abundance" })).toBeVisible()

    // Frequency bands section
    await expect(page.locator("text=Frequency Bands")).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-landing.png",
      fullPage: true,
    })
  })

  test("Full flow: landing -> pick -> customize -> chart -> complete (Abundance)", async ({ page }) => {
    // Step 1: Select Abundance path
    await page.locator("h2", { hasText: "Abundance" }).click()

    // Should show goal picker with storm metaphors
    await expect(page.locator("text=Choose your solar flare")).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-pick-l1.png",
      fullPage: true,
    })

    // Pick an L1 goal (first option)
    const l1Options = page.locator("button").filter({ hasText: "Build a rotation" })
    if (await l1Options.count() > 0) {
      await l1Options.first().click()
    } else {
      // Fallback: click the first L1 option in the grid
      const l1Grid = page.locator(".grid button").first()
      await l1Grid.click()
    }

    // Step 2 should auto-appear: Magnetic field lines
    await expect(page.locator("text=Magnetic field lines")).toBeVisible({ timeout: 5000 })

    // Step 3 should auto-appear: Charged particles
    await expect(page.locator("text=Charged particles")).toBeVisible({ timeout: 5000 })

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-pick-l2l3.png",
      fullPage: true,
    })

    // Click "Calibrate Storm" to proceed to customizer
    const calibrateBtn = page.locator("button", { hasText: "Calibrate Storm" })
    await calibrateBtn.scrollIntoViewIfNeeded()
    await calibrateBtn.click()

    // Should be in customizer step
    await expect(page.locator("text=Calibrate the storm")).toBeVisible({ timeout: 5000 })

    // Should have toggle switches
    const switches = page.locator("button[role='switch']")
    expect(await switches.count()).toBeGreaterThan(0)

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-customize.png",
      fullPage: true,
    })

    // Click "View Storm" to proceed to chart
    const viewStormBtn = page.locator("button", { hasText: "View Storm" })
    await viewStormBtn.scrollIntoViewIfNeeded()
    await viewStormBtn.click()

    // Should be in chart step
    await expect(page.locator("text=Your Solar Storm")).toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=Storm Observatory")).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-chart.png",
      fullPage: true,
    })

    // Click "Complete Storm" to finish
    const completeBtn = page.locator("button", { hasText: "Complete Storm" })
    await completeBtn.scrollIntoViewIfNeeded()
    await completeBtn.click()

    // Should be on complete screen
    await expect(page.getByRole("heading", { name: "Storm Activated" })).toBeVisible({ timeout: 5000 })

    // Should show stats
    await expect(page.getByText("Nodes", { exact: true })).toBeVisible()
    await expect(page.getByText("Fields", { exact: true })).toBeVisible()
    await expect(page.getByText("Milestones", { exact: true })).toBeVisible()
    await expect(page.getByText("Habits", { exact: true })).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-complete.png",
      fullPage: true,
    })
  })

  test("Start over from complete screen returns to landing", async ({ page }) => {
    const container = page.locator("[data-testid='variant-d']")

    // Run through entire flow quickly
    await page.locator("h2", { hasText: "Abundance" }).click()
    await expect(page.locator("text=Choose your solar flare")).toBeVisible({ timeout: 5000 })

    // Pick first L1
    const l1Grid = container.locator("button").filter({ hasText: "Build a rotation" })
    if (await l1Grid.count() > 0) {
      await l1Grid.first().click()
    }
    await expect(page.locator("text=Magnetic field lines")).toBeVisible({ timeout: 5000 })

    // Calibrate Storm
    const calibrateBtn = container.locator("button", { hasText: "Calibrate Storm" })
    await calibrateBtn.scrollIntoViewIfNeeded()
    await calibrateBtn.click()
    await expect(page.locator("text=Calibrate the storm")).toBeVisible({ timeout: 5000 })

    // View Storm
    const viewStormBtn = container.locator("button", { hasText: "View Storm" })
    await viewStormBtn.scrollIntoViewIfNeeded()
    await viewStormBtn.click()
    await expect(page.locator("text=Your Solar Storm")).toBeVisible({ timeout: 5000 })

    // Complete Storm
    const completeBtn = container.locator("button", { hasText: "Complete Storm" })
    await completeBtn.scrollIntoViewIfNeeded()
    await completeBtn.click()
    await expect(page.getByRole("heading", { name: "Storm Activated" })).toBeVisible({ timeout: 5000 })

    // Click "Ignite a new storm"
    const startOverBtn = container.locator("button", { hasText: "Ignite a new storm" })
    await startOverBtn.scrollIntoViewIfNeeded()
    await startOverBtn.click()

    // Should be back at landing
    await expect(page.locator("text=Ignite your trajectory")).toBeVisible({ timeout: 5000 })
  })

  test("Back navigation works at each phase", async ({ page }) => {
    const container = page.locator("[data-testid='variant-d']")

    // Go to goal picker
    await page.locator("h2", { hasText: "Abundance" }).click()
    await expect(page.locator("text=Choose your solar flare")).toBeVisible({ timeout: 5000 })

    // Back to landing - use the specific back button within variant-d container
    await container.locator("button", { hasText: "Back" }).first().click()
    await expect(page.locator("text=Ignite your trajectory")).toBeVisible({ timeout: 5000 })

    // Go to picker again, select L1, go to customizer
    await page.locator("h2", { hasText: "Abundance" }).click()
    await expect(page.locator("text=Choose your solar flare")).toBeVisible({ timeout: 5000 })

    const l1Options = page.locator("button").filter({ hasText: "Build a rotation" })
    if (await l1Options.count() > 0) {
      await l1Options.first().click()
    }

    const calibrateBtn = page.locator("button", { hasText: "Calibrate Storm" })
    await calibrateBtn.scrollIntoViewIfNeeded()
    await calibrateBtn.click()
    await expect(page.locator("text=Calibrate the storm")).toBeVisible({ timeout: 5000 })

    // Back to picker
    await page.locator("text=Back to selection").click()
    await expect(page.locator("text=Choose your solar flare")).toBeVisible({ timeout: 5000 })
  })

  test("Find the One path works", async ({ page }) => {
    // Click Find the One
    await page.locator("h2", { hasText: "Find the One" }).click()

    // Should show goal picker
    await expect(page.locator("text=Choose your solar flare")).toBeVisible({ timeout: 5000 })

    // Should show Find the One L1 options
    await expect(page.locator("text=Get a girlfriend")).toBeVisible()

    await page.screenshot({
      path: "tests/e2e/screenshots/v4-variant-d-one-person.png",
      fullPage: true,
    })
  })
})
