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

  test("text is painted in the app's own font, with the right stand-in while it loads", async ({ page }) => {
    // The regression: globals.css named "Geist Mono Fallback" — the MONOSPACE
    // metric-matched stand-in — as the fallback for SANS text, so every cold
    // load flashed oversized text in the wrong shape until Geist arrived. The
    // token now comes from next/font, so both the face and its fallback are the
    // ones next/font generated. Checked here, in a real browser, because no
    // unit test can see what a browser paints.
    await page.goto("/")
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready
      return {
        body: getComputedStyle(document.body).fontFamily,
        geistLoaded: document.fonts.check("16px Geist"),
      }
    })
    expect(fonts.body).toMatch(/^"?Geist"?,\s*"?Geist Fallback"?/)
    expect(fonts.body).not.toContain("Mono")
    expect(fonts.geistLoaded).toBe(true)
  })

  test("test pages load (no auth required)", async ({ page }) => {
    const testResponse = await page.goto("/test")
    expect(testResponse?.status()).toBe(200)
    await expect(page.locator("body")).toBeVisible()
  })
})
