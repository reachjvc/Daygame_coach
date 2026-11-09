import { test, expect } from "./fixtures/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { ROUTES } from "@/src/shared/routes"

/**
 * THE REVIEW IN PLAIN WORDS (alpha picky-eye-14, picky-eye-15, picky-eye-16):
 * - hours as "1 h 15 min", never "1.25 hours", and waking hours rounded;
 * - "energy 6 · growth 6.5", never "E 6.0 · G 6.5";
 * - a "why" written on four quarters shows once, with ×4 and its times;
 * - the green "Saved" is readable on the dark sheet (4.5:1).
 */

const QUARTER = 15 * 60_000
test.use({ accountTimezone: "UTC" })
// 10:00 UTC; a run of 4 h 15 min with no quiet hours: 17 quarters, 4.25 waking hours, not a whole number.
const START = Date.parse("2026-11-02T10:00:00Z")

async function seed(userId: string): Promise<void> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  const id = randomUUID()
  expect(
    (
      await admin.from("audit_runs").insert({
        id,
        user_id: userId,
        started_at: new Date(START).toISOString(),
        ends_at: new Date(START + 14 * 86400_000).toISOString(),
        ended_at: new Date(START + 4 * 3600_000 + 15 * 60_000).toISOString(),
        quiet_start: 0,
        quiet_end: 0,
      })
    ).error,
  ).toBeNull()
  // Scrolling: 5 quarters, four with the same note (one in other case/spacing), one with another.
  const whys = ["Avoiding the tax form", "Avoiding the tax form", "avoiding  the tax form", "Avoiding the tax form", "Bored"]
  const rows = [
    ...whys.map((why, q) => ({ activity: "Scrolling", energy: 2, growth: 1, why, q })),
    ...[5, 6].map((q) => ({ activity: "Deep work", energy: q === 5 ? 6 : 7, growth: 6, why: null, q })),
  ].map(({ q, ...r }) => ({
    id: randomUUID(),
    user_id: userId,
    run_id: id,
    slot_at: new Date(START + q * QUARTER).toISOString(),
    avoiding: false,
    source: "app",
    ...r,
  }))
  expect((await admin.from("audit_slots").insert(rows)).error).toBeNull()
}

/** WCAG contrast of two "rgb(r, g, b)" colours */
function contrast(a: string, b: string): number {
  const lum = (c: string) => {
    const [r, g, bl] = c.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

test.describe("the review in plain words @phone", () => {
  test("hours, scores and repeated notes read like a person wrote them, and Saved is readable", async ({ page, account }) => {
    await seed(account.id)
    await page.goto(`${ROUTES.audit}?view=review`)
    const scrolling = page.getByTestId("review-activity").filter({ hasText: "Scrolling" })
    await expect(scrolling).toBeVisible({ timeout: 60_000 })

    await expect(page.getByTestId("review-basis")).toHaveText(
      "You answered 7 of 17 quarters (1 h 45 min of about 4 waking hours). Quarters you did not answer are not counted.",
    )
    await expect(scrolling).toContainText("1 h 15 min · energy 2 · growth 1 · from 5 answers")
    await expect(page.getByTestId("review-activity").filter({ hasText: "Deep work" })).toContainText("30 min · energy 6.5 · growth 6 · from 2 answers")
    await expect(page.getByTestId("review-box-more")).toContainText("30 min · energy 6.5 · growth 6")

    await scrolling.click()
    const sheet = page.getByTestId("review-activity-sheet")
    const notes = sheet.getByTestId("review-why")
    await expect(notes).toHaveCount(2)
    // Newest first: "Bored" was written last (11:00).
    await expect(notes.nth(0)).toContainText("Bored")
    await expect(notes.nth(0)).not.toContainText("×")
    await expect(notes.nth(1)).toContainText("Avoiding the tax form")
    await expect(notes.nth(1)).toContainText("×4")
    await expect(notes.nth(1)).toContainText("2 Nov, 10:45")
    await expect(notes.nth(1)).toContainText("2 Nov, 10:00")

    await sheet.getByRole("radio", { name: "Cut" }).click()
    await sheet.getByTestId("review-save").click()
    const saved = sheet.getByTestId("review-saved")
    await expect(saved).toBeVisible()
    const [fg, bg] = await saved.evaluate((el) => {
      let node: Element | null = el
      let back = "rgba(0, 0, 0, 0)"
      while (node && /rgba\(.*, 0\)|transparent/.test(back)) {
        back = getComputedStyle(node).backgroundColor
        node = node.parentElement
      }
      return [getComputedStyle(el).color, back]
    })
    expect(contrast(fg, bg), `Saved ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
  })
})
