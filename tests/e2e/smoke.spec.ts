import { test, expect, SIGNED_OUT } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"

/**
 * The two signed-out checks that need a real browser and that nothing else
 * makes: the auth gate turns a stranger away, and text is painted in the app's
 * own font.
 *
 * Three more lived here. "Homepage loads" and "auth pages load" are what the
 * cold-open sweeps assert in more detail on every page, and "test pages load"
 * opened `/test`, which returns 404 in the production build CI runs.
 */

test.describe("Smoke Tests", { tag: ["@phone", "@engine"] }, () => {
  // A stranger: no session, so no account is made for this file at all.
  test.use({ storageState: SIGNED_OUT })

  test("unauthenticated dashboard redirects to login", async ({ page }) => {
    await page.goto(ROUTES.tracking)
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
})
