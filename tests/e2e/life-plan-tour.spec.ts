import { readFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { test, expect } from "./fixtures/test"
import { ROUTES } from "@/src/shared/routes"
import { stepFor, TAB_ORDER, TAB_LABELS } from "@/src/goals/data/northStar"
import { seedLifePlan } from "./helpers/lifePlan"

/**
 * A PHOTO OF EVERY STEP OF /plan, FOR THE OWNER TO LOOK AT. Not a test.
 *
 * Plans/life-plan-rebuild.md: no phase counts as done until the owner has seen
 * it. This loads a plan into the worker's throwaway account (the local test
 * backend, never the live project) and saves one full-page picture per step,
 * in TAB_ORDER, so it follows the step list as it changes.
 *
 *   TOUR_PLAN=<plan.json> TOUR_DIR=<folder> npx playwright test life-plan-tour --project=desktop
 *
 * Optional: TOUR_STEPS=today,journal for some steps only; TOUR_DAYS=<patches.json>
 * for days written after the seed (see below).
 *
 * TOUR_PLAN is an `NsPlan` as the flow keeps it (a backup turned into one with
 * `rowsToPlan`, or a made-up one). Without both variables it is skipped, so CI
 * and an ordinary run never take it.
 */

const PLAN = process.env.TOUR_PLAN
const DIR = process.env.TOUR_DIR

test.describe("life plan tour", () => {
  test.skip(!PLAN || !DIR, "set TOUR_PLAN and TOUR_DIR to take the tour")
  test.setTimeout(300_000)

  test("one picture per step", async ({ page, account }) => {
    await seedLifePlan(page, account.id, JSON.parse(readFileSync(PLAN!, "utf8")))
    // TOUR_DAYS=<patches.json>: days written through the app's own day route
    // after the seed (the seed carries the plan only), so a picture can show a
    // number box or a rating with something in it. `date: "today-N"` is N days
    // before today.
    if (process.env.TOUR_DAYS) {
      for (const patch of JSON.parse(readFileSync(process.env.TOUR_DAYS, "utf8")) as Array<{ date: string }>) {
        const back = /^today-(\d+)$/.exec(patch.date)
        const at = new Date()
        if (back) at.setDate(at.getDate() - Number(back[1]))
        const date = back ? `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}` : patch.date
        const res = await page.request.put("/api/life-plan/day", { data: { ...patch, date } })
        expect(res.status(), `the day route refused ${date}: ${await res.text()}`).toBe(200)
      }
    }
    mkdirSync(DIR!, { recursive: true })
    await page.setViewportSize({ width: 1280, height: 900 })

    // TOUR_STEPS=pick,templates photographs only those, by the address a link
    // would use (`templates` is Where to start with the catalogue open);
    // otherwise every step in the rail.
    const steps = process.env.TOUR_STEPS ? (process.env.TOUR_STEPS.split(",") as typeof TAB_ORDER) : TAB_ORDER
    for (const [i, step] of steps.entries()) {
      await page.goto(`${ROUTES.plan}?step=${step}`)
      await expect(page.getByText(TAB_LABELS[stepFor(step)]).first()).toBeVisible()
      // The account's read replaces the plan on screen a moment after load;
      // the footer says so once it has.
      await expect(page.getByText("Saved to your account.")).toBeVisible()
      // The window as tall as the page, not a full-page stitch: the save bar is
      // fixed to the window's foot and would otherwise sit across the middle.
      const height = await page.evaluate(() => document.documentElement.scrollHeight)
      await page.setViewportSize({ width: 1280, height: Math.min(height, 16_000) })
      const name = `${String(i + 1).padStart(2, "0")}-${step}.jpg`
      await page.screenshot({ path: path.join(DIR!, name), type: "jpeg", quality: 70 })
      await page.setViewportSize({ width: 1280, height: 900 })
    }
  })
})
