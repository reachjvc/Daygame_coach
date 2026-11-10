import { test, expect } from "./fixtures/test"
import { cardOf, shownPeople } from "@/src/role-models/catalog"
import { ROLE_MODELS_HREF } from "@/src/role-models/routes"

/**
 * THE ROLE MODEL LIBRARY (Plans/role-models.md, Phase 5). @phone
 *
 * Through the real pages: the gallery shows every validated person and nobody
 * else, a value word filters it, a card opens its own address, Back returns,
 * and nothing animates (the look is deferred, D6). The phone's first screen
 * must stay under 300 KB in total.
 */

const shown = shownPeople().map(cardOf)

test.describe("role model library @phone", () => {
  test("the gallery, search, a profile and back", async ({ page }) => {
    expect(shown.length, "at least one validated person in the catalogue").toBeGreaterThan(0)
    await page.goto(ROLE_MODELS_HREF)
    await expect(page.getByTestId("role-models-page")).toBeVisible()
    await expect(page.locator('[data-testid^="role-model-card-"]')).toHaveCount(shown.length)

    // Search by a value word: only the people holding it stay.
    const word = shown[0].search.split(" ").find((w) => shown.some((c) => !c.search.includes(w))) ?? shown[0].values[0].toLowerCase()
    const expected = shown.filter((c) => c.search.includes(word))
    await page.getByTestId("role-model-search").fill(word)
    await expect(page.locator('[data-testid^="role-model-card-"]')).toHaveCount(expected.length)
    await page.getByTestId("role-model-search").fill("")

    const first = shown[0]
    await page.getByTestId(`role-model-card-${first.id}`).click()
    await expect(page).toHaveURL(new RegExp(`${ROLE_MODELS_HREF}/${first.id}$`))
    await expect(page.getByRole("heading", { level: 1, name: first.name })).toBeVisible()
    for (const id of ["profile-values", "profile-quotes", "profile-principles", "profile-started", "profile-shadow", "profile-sources"]) {
      await expect(page.getByTestId(id)).toBeVisible()
    }
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`${ROLE_MODELS_HREF}$`))
    await expect(page.locator('[data-testid^="role-model-card-"]')).toHaveCount(shown.length)
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
  })

  test("a person who is not validated has no page", async ({ page }) => {
    const res = await page.goto(`${ROLE_MODELS_HREF}/no-such-person`)
    expect(res?.status()).toBe(404)
  })

  test("the first screen transfers under 300 KB", async ({ page }) => {
    await page.goto(ROLE_MODELS_HREF)
    await expect(page.getByTestId("role-models-page")).toBeVisible()
    await page.waitForLoadState("networkidle")
    const dev = await page.evaluate(() =>
      performance.getEntriesByType("resource").some((e) => /\/_next\/static\/chunks\/(webpack|main-app)\.js(\?|$)|react-refresh|hot-update|turbopack/.test(e.name)),
    )
    test.skip(
      dev,
      "Under `next dev` every script is unminified and unsplit, so its weight says nothing about what a phone downloads. " +
        "CI runs this against a production build (`npm run build && npm start`).",
    )
    const bytes = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      return [...nav, ...res].reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0)
    })
    console.log(`role models first screen: ${Math.round(bytes / 1024)} KB`)
    expect(bytes).toBeLessThan(300 * 1024)
  })
})
