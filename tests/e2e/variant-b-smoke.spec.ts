import { test, expect } from "@playwright/test"

test.describe("Variant B - Holo Orrery Goal Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/test/goalsv4")
    // Click the "Orrery Beta" tab
    await page.getByText("Orrery Beta").click()
    await page.waitForSelector("[data-testid='variant-b-orrery']", { timeout: 10000 })
  })

  test("Phase 1: Landing page renders with orrery and system nodes", async ({ page }) => {
    // Hero text
    await expect(page.getByText("HOLO ORRERY v2.0")).toBeVisible()
    await expect(page.getByText("Initialize System")).toBeVisible()

    // System nodes grid
    await expect(page.getByText("SYSTEM NODES")).toBeVisible()
    await expect(page.getByText("ONLINE")).toBeVisible()

    // Scan button
    await expect(page.locator("[data-testid='holo-scan-daygame']")).toBeVisible()
  })

  test("Phase 1: Clicking scan button reveals path selection", async ({ page }) => {
    // Click scan daygame button
    await page.locator("[data-testid='holo-scan-daygame']").click()

    // Should reveal path selection
    await expect(page.getByText("SELECT TRAJECTORY")).toBeVisible()
    // Use heading role to avoid matching SVG moon labels
    await expect(page.getByRole("heading", { name: "Find the One" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Abundance" })).toBeVisible()
    await expect(page.getByText("CONNECTION PROTOCOL")).toBeVisible()
    await expect(page.getByText("EXPANSION PROTOCOL")).toBeVisible()
  })

  test("Phase 2: Selecting Abundance path shows goal picker", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await expect(page.getByText("SELECT TRAJECTORY")).toBeVisible()

    // Click Abundance path (use heading to be precise)
    await page.getByRole("heading", { name: "Abundance" }).click()

    // Should show goal picker step 1
    await expect(page.getByText("PRIMARY TARGET")).toBeVisible()

    // L1 options should appear
    await expect(page.getByText("Build a rotation")).toBeVisible()
    await expect(page.getByText("Have an abundant dating life")).toBeVisible()
  })

  test("Phase 2: Selecting L1 reveals subsystems and data points", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()

    // Select an L1 goal
    await page.getByText("Build a rotation").click()

    // Step 2 (SUBSYSTEMS) should appear
    await expect(page.getByText("SUBSYSTEMS").first()).toBeVisible()

    // Step 3 (DATA POINTS) should appear since L2s are auto-selected
    await expect(page.getByText("DATA POINTS")).toBeVisible()

    // Categories should be visible
    await expect(page.getByText("FIELD_WORK").first()).toBeVisible()
    await expect(page.getByText("RESULTS").first()).toBeVisible()
  })

  test("Phase 2 -> 3: Click CONFIGURE goes to customizer", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()

    // Click CONFIGURE button
    await page.getByRole("button", { name: /CONFIGURE/i }).click()

    // Should be in customizer
    await expect(page.getByText("CONFIGURE PARAMETERS")).toBeVisible()
    await expect(page.getByText("PRIMARY_TARGET").first()).toBeVisible()
  })

  test("Phase 3: Customizer has toggle switches and target inputs", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByRole("button", { name: /CONFIGURE/i }).click()

    // Should have toggle switches
    const switches = page.locator("button[role='switch']")
    expect(await switches.count()).toBeGreaterThan(0)

    // Should have target inputs
    const targetInputs = page.locator("input[type='number']")
    expect(await targetInputs.count()).toBeGreaterThan(0)

    // NODES ACTIVE count should be displayed
    await expect(page.getByText("NODES ACTIVE")).toBeVisible()
  })

  test("Phase 3 -> 4: PLOT TRAJECTORIES goes to chart", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByRole("button", { name: /CONFIGURE/i }).click()

    // Click PLOT TRAJECTORIES
    await page.getByRole("button", { name: /PLOT TRAJECTORIES/i }).click()

    // Should be in chart view
    await expect(page.getByText("HOLOGRAPHIC SYSTEM MAP")).toBeVisible()
    await expect(page.getByText("TRAJECTORY PLOTTER").first()).toBeVisible()
  })

  test("Phase 4 -> 5: DEPLOY SYSTEM goes to completion", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByRole("button", { name: /CONFIGURE/i }).click()
    await page.getByRole("button", { name: /PLOT TRAJECTORIES/i }).click()

    // Click DEPLOY SYSTEM
    await page.getByRole("button", { name: /DEPLOY SYSTEM/i }).click()

    // Should be on completion page
    await expect(page.getByText("SYSTEM DEPLOYED")).toBeVisible()
    await expect(page.getByText("SYSTEM ONLINE")).toBeVisible()

    // Stats should be visible
    await expect(page.getByText("NODES").first()).toBeVisible()
    await expect(page.getByText("LINKS")).toBeVisible()
    await expect(page.getByText("MILESTONES")).toBeVisible()
    await expect(page.getByText("HABITS")).toBeVisible()
  })

  test("Phase 5: REINITIALIZE returns to landing", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByRole("button", { name: /CONFIGURE/i }).click()
    await page.getByRole("button", { name: /PLOT TRAJECTORIES/i }).click()
    await page.getByRole("button", { name: /DEPLOY SYSTEM/i }).click()

    // Click REINITIALIZE
    await page.getByRole("button", { name: /REINITIALIZE/i }).click()

    // Should be back at landing
    await expect(page.getByText("Initialize System")).toBeVisible()
    await expect(page.getByText("HOLO ORRERY v2.0")).toBeVisible()
  })

  test("Find the One path works end-to-end", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()

    // Select Find the One (use heading role)
    await page.getByRole("heading", { name: "Find the One" }).click()

    // Select an L1
    await expect(page.getByText("Get a girlfriend")).toBeVisible()
    await page.getByText("Get a girlfriend").click()

    // Go through flow
    await page.getByRole("button", { name: /CONFIGURE/i }).click()
    await expect(page.getByText("CONFIGURE PARAMETERS")).toBeVisible()

    await page.getByRole("button", { name: /PLOT TRAJECTORIES/i }).click()
    await expect(page.getByText("HOLOGRAPHIC SYSTEM MAP")).toBeVisible()

    await page.getByRole("button", { name: /DEPLOY SYSTEM/i }).click()
    await expect(page.getByText("SYSTEM DEPLOYED")).toBeVisible()
  })

  test("Back navigation works from picker to landing", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()

    // Should be in picker
    await expect(page.getByText("PRIMARY TARGET")).toBeVisible()

    // Click the top-level BACK button (not the footer one)
    const container = page.locator("[data-testid='variant-b-orrery']")
    await container.getByText("BACK", { exact: true }).first().click()

    // Should be back at landing
    await expect(page.getByText("Initialize System")).toBeVisible()
  })

  test("Back navigation works from customizer to picker", async ({ page }) => {
    await page.locator("[data-testid='holo-scan-daygame']").click()
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByRole("button", { name: /CONFIGURE/i }).click()

    // Should be in customizer
    await expect(page.getByText("CONFIGURE PARAMETERS")).toBeVisible()

    // Click the first BACK (header back button, not footer)
    const container = page.locator("[data-testid='variant-b-orrery']")
    await container.getByText("BACK", { exact: true }).first().click()

    // Should be back in picker - wait a bit for state to update
    await expect(page.getByText("PRIMARY TARGET")).toBeVisible({ timeout: 10000 })
  })
})
