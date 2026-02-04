import { test, expect } from "@playwright/test"

/**
 * Smoke tests - verify critical paths work after changes.
 * These run on every PR to catch breaking changes early.
 */

test.describe("Smoke Tests", () => {
  test("homepage loads", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.status()).toBe(200)
  })

  test("auth pages load", async ({ page }) => {
    const loginResponse = await page.goto("/auth/login")
    expect(loginResponse?.status()).toBe(200)
    await expect(page.locator("body")).toBeVisible()

    const signupResponse = await page.goto("/auth/sign-up")
    expect(signupResponse?.status()).toBe(200)
    await expect(page.locator("body")).toBeVisible()
  })

  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    // Without auth, dashboard should redirect to login
    await page.goto("/dashboard/tracking")

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test("test pages load (no auth required)", async ({ page }) => {
    const testResponse = await page.goto("/test")
    expect(testResponse?.status()).toBe(200)
    await expect(page.locator("body")).toBeVisible()
  })
})
