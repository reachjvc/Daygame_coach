import { test } from "../../tests/e2e/fixtures/test"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { ROUTES } from "@/src/shared/routes"
import { seedAndCopy } from "../../tests/e2e/helpers/planNewCopy"

/** Reads what the browser says on the copied Today, Journal and Review (the dev badge's "Issues"). Run by hand. */
test("console on today, journal, review (copied data)", async ({ page, account }) => {
  test.setTimeout(600_000)
  await seedAndCopy(page, account.id, fullPlan())
  const seen: string[] = []
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) seen.push(`[${m.type()}] ${m.text().slice(0, 400)}`) })
  page.on("response", (r) => { if (r.status() >= 400) seen.push(`[http ${r.status()}] ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, "")}`) })
  page.on("pageerror", (e) => seen.push(`[pageerror] ${e.message.slice(0, 400)}`))
  for (const id of ["today", "journal", "review.open", "review.goals", "everything.driving-force"]) {
    seen.push(`--- ${id}`)
    await page.goto(`${ROUTES.planNew}/${id}`, { timeout: 120_000 })
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(2500)
  }
  console.log(seen.join("\n"))
})
