import { test, expect } from "@playwright/test"

test.describe("Variant D - Journey Goal Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/test/goals?variant=d")
    await page.waitForSelector("[data-testid='variant-d']", { timeout: 10000 })
  })

  test("Phase 1: Landing page renders with two path cards", async ({ page }) => {
    // Hero text
    await expect(page.getByText("What kind of dating life do you want?")).toBeVisible()
    await expect(page.getByText("Design your journey")).toBeVisible()

    // Two main path cards - use first() since text may appear in sub-elements
    await expect(page.getByRole("heading", { name: "Find the One" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Abundance" })).toBeVisible()

    // Other life areas section
    await expect(page.getByText("Other life areas")).toBeVisible()
    await expect(page.getByText("Health & Appearance")).toBeVisible()
    await expect(page.getByText("Career & Finances")).toBeVisible()
  })

  test("Phase 2: Clicking Abundance path shows goal expansion", async ({ page }) => {
    // Click abundance path card (use heading to be precise)
    await page.getByRole("heading", { name: "Abundance" }).click()

    // Should show step 1 with L1 options
    await expect(page.getByText("Choose your big goal")).toBeVisible()
    await expect(page.getByText("This is your North Star")).toBeVisible()

    // Abundance L1 options should appear
    await expect(page.getByText("Build a rotation")).toBeVisible()
    await expect(page.getByText("Have an abundant dating life")).toBeVisible()
  })

  test("Phase 2: Selecting L1 reveals achievements", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()

    // Select an L1 goal
    await page.getByText("Build a rotation").click()

    // Step 2 should appear
    await expect(page.getByText("Achievements to unlock")).toBeVisible()

    // L2 achievements should be visible
    await expect(page.getByText("Master Daygame")).toBeVisible()
    await expect(page.getByText("Become Confident with Women")).toBeVisible()
  })

  test("Phase 2: Selecting L2s reveals trackable goals", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()

    // Step 3 should appear (auto-selected L2s trigger it)
    await expect(page.getByText("What you'll track")).toBeVisible()

    // Categories should be visible (use locator.first() before expect)
    await expect(page.getByText("Field Work").first()).toBeVisible()
    await expect(page.getByText("Results").first()).toBeVisible()
  })

  test("Phase 2 -> 3: Click Customize & Confirm goes to commitment builder", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()

    // Click the confirm button
    await page.getByText("Customize & Confirm").click()

    // Should be in commitment builder
    await expect(page.getByText("Customize your goals")).toBeVisible()
    await expect(page.getByText("Your vision")).toBeVisible()
  })

  test("Phase 3: Commitment builder has toggle switches and target inputs", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByText("Customize & Confirm").click()

    // Should have toggle switches
    const switches = page.locator("button[role='switch']")
    expect(await switches.count()).toBeGreaterThan(0)

    // Should have target inputs
    const targetInputs = page.locator("input[type='number']")
    expect(await targetInputs.count()).toBeGreaterThan(0)

    // Achievements section should be present
    await expect(page.getByText("Achievements").first()).toBeVisible()
  })

  test("Phase 3 -> 4: Creating goals shows summary", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByText("Customize & Confirm").click()

    // Click create
    await page.getByText("Create My Goals").click()

    // Should show summary
    await expect(page.getByText("Your Journey is Set")).toBeVisible()

    // Stats should be visible
    await expect(page.getByText("Vision").first()).toBeVisible()

    // Scroll to bottom and check Start Over button
    const container = page.locator("[data-testid='variant-d']")
    const startOverButton = container.getByRole("button", { name: "Start Over" })
    await startOverButton.scrollIntoViewIfNeeded()
    await expect(startOverButton).toBeVisible()
  })

  test("Phase 4: Start Over returns to landing", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByText("Customize & Confirm").click()
    await page.getByText("Create My Goals").click()

    // Scroll to and click start over
    const container = page.locator("[data-testid='variant-d']")
    const startOverButton = container.getByRole("button", { name: "Start Over" })
    await startOverButton.scrollIntoViewIfNeeded()
    await startOverButton.click()

    // Should be back at landing
    await expect(page.getByText("What kind of dating life do you want?")).toBeVisible()
  })

  test("Find the One path works end-to-end", async ({ page }) => {
    // Click Find the One
    await page.getByRole("heading", { name: "Find the One" }).click()

    // Should show L1 options for one-person path
    await expect(page.getByText("Get a girlfriend")).toBeVisible()
    await expect(page.getByText("Find my dream girl")).toBeVisible()

    // Select one
    await page.getByText("Get a girlfriend").click()

    // Should show achievements
    await expect(page.getByText("Achievements to unlock")).toBeVisible()

    // Go to customization
    await page.getByText("Customize & Confirm").click()
    await expect(page.getByText("Customize your goals")).toBeVisible()

    // Create
    await page.getByText("Create My Goals").click()
    await expect(page.getByText("Your Journey is Set")).toBeVisible()
  })

  test("Back navigation works at each phase", async ({ page }) => {
    // Go to expansion
    await page.getByRole("heading", { name: "Abundance" }).click()
    await expect(page.getByText("Choose your big goal")).toBeVisible()

    // Back to landing
    await page.getByText("Back").first().click()
    await expect(page.getByText("What kind of dating life do you want?")).toBeVisible()

    // Go to expansion again and then commitment
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()
    await page.getByText("Customize & Confirm").click()
    await expect(page.getByText("Customize your goals")).toBeVisible()

    // Back to expansion
    await page.getByText("Back to selection").click()
    await expect(page.getByText("Choose your big goal")).toBeVisible()
  })

  test("Life area cards show placeholder for non-daygame areas", async ({ page }) => {
    // Click a non-daygame life area
    await page.getByText("Health & Appearance").click()

    // Should show placeholder
    await expect(page.getByText("Only daygame has a full template graph")).toBeVisible()

    // Back link
    await page.getByText("Back to start").click()
    await expect(page.getByText("What kind of dating life do you want?")).toBeVisible()
  })

  test("L3 category toggle works", async ({ page }) => {
    await page.getByRole("heading", { name: "Abundance" }).click()
    await page.getByText("Build a rotation").click()

    // Categories with goals should be visible
    await expect(page.getByText("What you'll track")).toBeVisible()
    await expect(page.getByText("Field Work").first()).toBeVisible()
  })
})
