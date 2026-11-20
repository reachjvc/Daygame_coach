import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { stackAdmin } from "./fixtures/stack"

/**
 * BACKSTAGE (src/backstage/backstageLinks.ts): the owner's one list of live-but-hidden pages.
 * Only an account with a copy space opens it, and only it sees the ways in (All tools, Settings).
 */
test.describe("backstage", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the owner reaches it from All tools and Settings, and it fits a phone", async ({ page, account }) => {
    const { error } = await stackAdmin().from("plan_sandboxes").upsert({ owner_id: account.id }, { onConflict: "owner_id", ignoreDuplicates: true })
    expect(error).toBeNull()

    await page.goto(ROUTES.tools)
    await page.getByTestId("tools-backstage").click()
    await expect(page).toHaveURL(new RegExp(`${ROUTES.backstage}$`))
    await expect(page.getByTestId("backstage-page")).toBeVisible()
    for (const id of ["plan-new", "plan-sandbox", "quit-lab", "ai-usage"]) await expect(page.getByTestId(`backstage-link-${id}`)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await page.screenshot({ path: test.info().outputPath("backstage-390.png"), fullPage: true })

    await page.getByTestId("backstage-link-quit-lab").click()
    await expect(page).toHaveURL(/\/quit\/lab\?preview=1/, { timeout: 60_000 })
    await expect(page.getByRole("heading").first()).toBeVisible()

    await page.goto(ROUTES.settings)
    await expect(page.getByTestId("backstage-card-link")).toBeVisible()
  })

  test("anyone else gets a 404 and sees no way in", async ({ browser, secondUser }) => {
    const context = await browser.newContext({ storageState: secondUser.storageState })
    const page = await context.newPage()
    const res = await page.goto(ROUTES.backstage)
    expect(res?.status()).toBe(404)
    await page.goto(ROUTES.tools)
    await expect(page.getByTestId("tools-page")).toBeVisible()
    await expect(page.getByTestId("tools-backstage")).toHaveCount(0)
    await context.close()
  })
})
