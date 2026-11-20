/**
 * QUIT TOOL 8, DAILY CHECK-IN (/quit/nicotine/checkin), acceptance 1 to 14 of Plans/quit-finish.md.
 *
 * Run at 390x844 (touch) and at 1280x800. The clock is fixed (Thursday 2026-11-19, 10:00) so every day is exact.
 * State lives in the browser (`quit-v1`, `vice-blackbox-v1`); only the signed-in test reaches the worker's own
 * test-backend account. With QUIT_SHOTS_DIR set it saves a screenshot of every screen.
 */

import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import liveTools from "../../../src/quit/data/liveTools.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const tt = tooltextJson as unknown as { sos: { yesStep: string } }
const URL = quitUrl("/quit/nicotine/checkin")
const NOW = new Date("2026-11-19T10:00:00")
const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number, from = NOW) {
  const d = new Date(from.getTime() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
const TODAY = day(0)
const CIG = { quitDate: null, goal: null, breakEnd: null, unit: { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" } }

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}
async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}

/** A Black Box with one nicotine run: living, or ended today by a slip report. */
function blackBox(opts: { startedOn?: string; slipToday?: boolean; slipOn?: string } = {}) {
  const stamp = new Date().toISOString()
  const attemptId = randomUUID()
  const reportId = randomUUID()
  const slipDay = opts.slipOn ?? (opts.slipToday ? TODAY : null)
  const attempt = {
    id: attemptId,
    viceId: "nicotine",
    label: "Smoking or vaping",
    startedOn: opts.startedOn ?? day(-10),
    startedBy: "",
    structure: [],
    endedOn: slipDay,
    endedByReportId: slipDay ? reportId : null,
    updatedAt: stamp,
    deletedAt: null,
  }
  const reports = slipDay
    ? [{ id: reportId, attemptId, at: `${slipDay}T09:00:00`, wentThrough: true, thought: "", ending: "other", closeness: null, withWhom: "", where: "", factors: [], didInstead: "", updatedAt: stamp, deletedAt: null }]
    : []
  return { version: 1, attempts: [attempt], reports }
}

interface Seed {
  bb?: object
  days?: Record<string, object>
  record?: object
}
async function seed(page: Page, s: Seed = {}) {
  await page.goto(URL)
  await expect(page.getByTestId("checkin")).toBeVisible()
  await page.evaluate((x) => {
    if (x.bb) {
      window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(x.bb))
      window.localStorage.removeItem("vice-blackbox-sent-v1")
    }
    const q = JSON.parse(window.localStorage.getItem("quit-v1") ?? "{}")
    q.nicotine = { ...(q.nicotine ?? {}) }
    if (x.days) q.nicotine.checkin = { days: x.days, draft: null }
    if (x.record) q.nicotine.record = x.record
    window.localStorage.setItem("quit-v1", JSON.stringify(q))
  }, s)
  await page.reload()
  await expect(page.getByTestId("checkin")).toBeVisible()
}

const store = (page: Page) => page.evaluate(() => [window.localStorage.getItem("quit-v1"), window.localStorage.getItem("vice-blackbox-v1")])
const livingSlips = (page: Page) =>
  page.evaluate(() => {
    const rec = JSON.parse(window.localStorage.getItem("vice-blackbox-v1") ?? '{"attempts":[],"reports":[]}')
    return {
      slips: (rec.reports as { wentThrough: boolean; deletedAt: string | null; at: string }[]).filter((r) => r.wentThrough && !r.deletedAt).map((r) => r.at.slice(0, 10)),
      liveRuns: (rec.attempts as { endedOn: string | null; deletedAt: string | null }[]).filter((a) => !a.deletedAt && a.endedOn === null).length,
    }
  })

async function openTab(page: Page, id: string) {
  await page.getByTestId(`tab-${id}`).click()
  await expect(page.getByTestId(`tab-${id}-panel`)).toBeVisible()
}
const step = (page: Page, id: string) => expect(page.getByTestId(`step-${id}`)).toBeVisible()

async function startEvening(page: Page) {
  await page.getByTestId("evening-start").click()
  await step(page, "outcome")
}

/** Every visible button and link inside the tool is at least 44 px high. */
async function tapTargets(page: Page) {
  const small = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-testid="checkin"] button, [data-testid="checkin"] a, [data-testid="checkin"] input')]
      .filter((el) => el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled)
      .map((el) => ({ id: el.getAttribute("data-testid") ?? el.textContent?.slice(0, 20) ?? "", h: el.getBoundingClientRect().height }))
      .filter((x) => x.h < 43.5),
  )
  expect(small).toEqual([])
}

for (const vp of [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
]) {
  test.describe(`daily check-in, signed out, ${vp.name}`, () => {
    test.use({ storageState: SIGNED_OUT, viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch })
    const S = (n: string) => `${vp.name}-${n}`

    test.beforeEach(async ({ page }) => {
      // test 9 sets its own date (the 3rd of December)
      await page.clock.install({ time: test.info().title.startsWith("9 ") ? new Date("2026-12-03T10:00:00") : NOW })
    })

    test("1 fresh: empty cards; the example fills Month and Pattern; leaving it changes no storage", async ({ page }) => {
      await page.goto(URL)
      await expect(page.getByTestId("morning-card")).toContainText("Not done yet")
      await expect(page.getByTestId("evening-card")).toContainText("Not done yet")
      await expect(page.getByTestId("lookback-start")).toHaveCount(0)
      await expect(page.getByTestId("today-date")).toHaveText("Thu 19 Nov")
      await expect(page.getByText("Your check-ins are kept in this browser.")).toBeVisible()
      await expect(page.getByTestId("main-action")).toHaveText("Start your morning check-in")
      await shot(page, S("1-today-empty"))
      const before = await store(page)
      await page.getByTestId("see-example").click()
      await expect(page.getByTestId("example-bar")).toContainText("Example. Nothing here is yours, and nothing is saved.")
      await expect(page.getByTestId("morning-card")).toContainText("You expected Hard (4)")
      await expect(page.getByTestId("morning-card")).toContainText("Not at the bar tonight.")
      await expect(page.getByTestId("evening-result")).toHaveText("Clear day")
      await expect(page.getByTestId("both-done")).toHaveText("Both done for today.")
      await expect(page.getByText("Your check-ins are kept in this browser.")).toHaveCount(0)
      await shot(page, S("1-example-today"))
      await openTab(page, "month")
      await expect(page.getByTestId("example-bar")).toBeVisible()
      expect(Number(await page.getByTestId("month-checked").getAttribute("data-n"))).toBeGreaterThan(5)
      await expect(page.locator('[data-testid="grid"] [data-state="slip"]').first()).toBeVisible()
      await shot(page, S("1-example-month"))
      await openTab(page, "pattern")
      await expect(page.getByTestId("example-bar")).toBeVisible()
      await expect(page.getByTestId("pattern-forecast")).toContainText("Days you expected Hard or Very hard: you slipped on 3 of 7. Days you expected Easy to In between: you slipped on 1 of 14.")
      await expect(page.getByTestId("pattern-own")).toHaveText("These lines count only the example's days.")
      await shot(page, S("1-example-pattern"))
      await openTab(page, "reminders")
      await expect(page.getByTestId("example-bar")).toBeVisible()
      await shot(page, S("1-example-reminders"))
      expect(await store(page)).toEqual(before)
      await page.getByTestId("example-leave").click()
      await openTab(page, "today")
      await expect(page.getByTestId("example-bar")).toHaveCount(0)
      await expect(page.getByTestId("see-example")).toBeVisible()
      await expect(page.getByTestId("morning-card")).toContainText("Not done yet")
      expect(await store(page)).toEqual(before)
      await openTab(page, "month")
      await expect(page.getByTestId("month-checked")).toHaveAttribute("data-n", "0")
    })

    test("2 morning: pledge and Hard (4) show on Today and survive a reload", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("main-action").click()
      await expect(page.getByTestId("step-pledge")).toHaveText("Your promise for today")
      await shot(page, S("2-morning-pledge"))
      await page.getByTestId("pledge-input").fill("No smoking at the bar")
      await page.getByTestId("flow-next").click()
      await step(page, "forecast")
      await expect(page.getByTestId("forecast-4")).toContainText("Hard")
      await shot(page, S("2-morning-forecast"))
      // a tap on a row saves it and, on the last morning screen, finishes
      await page.getByTestId("forecast-4").click()
      await expect(page.getByTestId("done-screen")).toContainText("Saved for Thu 19 Nov")
      await shot(page, S("2-done"))
      await page.getByTestId("done-back").click()
      // the morning is saved: the main button now offers the evening
      await expect(page.getByTestId("main-action")).toHaveText("Start your evening check-in")
      await expect(page.getByTestId("morning-pledge")).toHaveText("Promise: No smoking at the bar")
      await expect(page.getByTestId("morning-forecast")).toHaveText("You expected Hard (4)")
      await page.reload()
      await expect(page.getByTestId("morning-pledge")).toHaveText("Promise: No smoking at the bar")
      await expect(page.getByTestId("morning-forecast")).toHaveText("You expected Hard (4)")
    })

    test("3 slip with a living run: filed, status, Undo, then one slip after a double tap", async ({ page }) => {
      await seed(page, { bb: blackBox(), record: CIG })
      await startEvening(page)
      await shot(page, S("3-evening-question"))
      await page.getByTestId("outcome-slip").click()
      await expect(page.getByTestId("slip-status")).toHaveText("Saved in this browser.")
      await expect(page.getByText("A slip doesn't undo the days before.")).toBeVisible()
      await shot(page, S("3-slip-filed"))
      expect(await livingSlips(page)).toEqual({ slips: [TODAY], liveRuns: 0 })
      await page.getByTestId("slip-undo").click()
      await expect(page.getByTestId("slip-block")).toHaveCount(0)
      expect(await livingSlips(page)).toEqual({ slips: [], liveRuns: 1 })
      await page.getByTestId("outcome-slip").dblclick()
      await expect(page.getByTestId("slip-status")).toBeVisible()
      expect(await livingSlips(page)).toEqual({ slips: [TODAY], liveRuns: 0 })
      // changing Yes to No takes the slip back out
      await page.getByTestId("outcome-clear").click()
      await expect(page.getByTestId("slip-block")).toHaveCount(0)
      expect(await livingSlips(page)).toEqual({ slips: [], liveRuns: 1 })
    })

    test("4 slip link: Slipped? Restart today when the tool is live, else Tool 2's plain step", async ({ page }) => {
      await seed(page, { bb: blackBox(), record: CIG })
      await startEvening(page)
      await page.getByTestId("outcome-slip").click()
      if ((liveTools as string[]).includes("slip")) {
        await expect(page.getByTestId("slip-link")).toHaveText("Slipped? Restart today")
        await expect(page.getByTestId("slip-link")).toHaveAttribute("href", /\/quit\/nicotine\/slip/)
        // Tool 4 sees the slip already in the record (its case B)
        await page.getByTestId("slip-link").click()
        await expect(page).toHaveURL(/\/quit\/nicotine\/slip/)
        await expect(page.getByTestId("slip-in-record")).toBeVisible()
        await shot(page, S("4-slip-case-b"))
      } else {
        await expect(page.getByTestId("slip-link")).toHaveCount(0)
        await expect(page.getByTestId("slip-step")).toHaveText(tt.sos.yesStep)
      }
    })

    test("5 a slip already in the Black Box: the evening does not ask, it says the slip is in the record", async ({ page }) => {
      await seed(page, { bb: blackBox({ slipToday: true }), record: CIG })
      await expect(page.getByTestId("evening-result")).toHaveText("You smoked")
      // a slip that is only in the Black Box is not a check-in
      await expect(page.getByTestId("counts-start")).toBeVisible()
      await openTab(page, "month")
      await expect(page.getByTestId(`cell-${TODAY}`)).toHaveAttribute("data-state", "slip")
      await shot(page, S("5-month-slip"))
      await openTab(page, "today")
      await page.getByTestId("evening-start").click()
      await expect(page.getByTestId("step-outcome")).toHaveText("Your slip on Thu 19 Nov is in your record.")
      await expect(page.getByTestId("outcome-slip")).toHaveCount(0)
      await expect(page.getByText("Did you smoke")).toHaveCount(0)
      await shot(page, S("5-slip-in-record"))
      await page.getByTestId("flow-next").click()
      await step(page, "hard")
    })

    test("6 no run: Yes is kept in the check-in only, the Black Box is untouched", async ({ page }) => {
      await seed(page, { record: CIG })
      const before = (await store(page))[1]
      await startEvening(page)
      await page.getByTestId("outcome-slip").click()
      await expect(page.getByTestId("slip-none")).toContainText("Your quit hasn't started in your record yet, so this isn't saved as a slip.")
      await expect(page.getByTestId("none-date-link")).toHaveAttribute("href", /\/quit\/nicotine\/date/)
      await expect(page.getByText("A slip doesn't undo the days before.")).toHaveCount(0)
      await shot(page, S("6-no-run"))
      expect((await store(page))[1]).toEqual(before)
      await page.getByTestId("flow-next").click()
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("done-summary")).toContainText("You smoked")
    })

    test("7 evening: Done for today after step 2; reload mid-flow resumes with the answers; a double tap moves one screen", async ({ page }) => {
      await page.goto(URL)
      await startEvening(page)
      await page.getByTestId("outcome-clear").click()
      await page.getByTestId("flow-next").click()
      await step(page, "hard")
      await shot(page, S("7-hard"))
      // a tap on a row saves it and moves on by itself; a double tap moves one screen
      await page.getByTestId("hard-3").dblclick()
      await step(page, "urges")
      await expect(page).toHaveURL(/s=3/)
      await expect(page.getByTestId("urges-4")).toHaveText("Strong")
      await shot(page, S("7-urges"))
      await page.reload()
      await step(page, "urges")
      await page.getByTestId("screen-back").click()
      await step(page, "hard")
      await expect(page.getByTestId("hard-3")).toHaveAttribute("aria-checked", "true")
      await page.getByTestId("flow-next").click()
      await step(page, "urges")
      await page.getByTestId("urges-2").click()
      await step(page, "feelings")
      await expect(page.locator('[data-testid^="feeling-"]')).toHaveCount(10)
      await page.getByTestId("feeling-anxious").click()
      await shot(page, S("7-feelings"))
      await page.getByTestId("flow-next").click()
      await step(page, "note")
      await page.getByTestId("note-input").fill("A calm evening.")
      await shot(page, S("7-note"))
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("done-summary")).toContainText("Felt: Anxious")
      await expect(page.getByTestId("done-summary")).toContainText("A calm evening.")
      await shot(page, S("7-done"))
      await page.getByTestId("done-back").click()
      await expect(page.getByTestId("evening-result")).toHaveText("Clear day")
      // a second evening: answer step 1 and finish at once with Done for today
      await page.getByTestId("evening-start").click()
      await expect(page.getByTestId("flow-done")).toHaveText("Done for today")
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("done-screen")).toBeVisible()
    })

    test("8 yesterday: every question says that day; a cell 20 days back can be filled; a future cell cannot", async ({ page }) => {
      await seed(page, { days: { [day(-25)]: { slipped: false }, [day(-3)]: { slipped: false } }, record: CIG })
      await expect(page.getByTestId("lookback-start")).toHaveText("Fill in yesterday, Wed 18 Nov")
      await page.getByTestId("lookback-start").click()
      const titles: string[] = []
      for (const id of ["outcome", "hard", "urges", "feelings", "note"]) {
        await step(page, id)
        titles.push((await page.getByTestId(`step-${id}`).textContent()) ?? "")
        if (id === "outcome") {
          await shot(page, S("8-yesterday"))
          await page.getByTestId("outcome-clear").click()
        }
        if (id !== "note") await page.getByTestId("flow-next").click()
      }
      expect(titles[0]).toBe("Did you smoke on Wed 18 Nov?")
      for (const q of titles.slice(1)) expect(q).toContain("that day")
      for (const q of titles) expect(q.toLowerCase()).not.toContain("today")
      await expect(page.getByTestId("flow-done")).toHaveText("Done for that day")
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("done-screen")).toContainText("Saved for Wed 18 Nov")
      await page.getByTestId("done-back").click()
      await openTab(page, "month")
      await page.getByTestId("month-prev").click()
      await page.getByTestId(`cell-${day(-20)}`).click()
      await page.getByTestId("fill-day").click()
      await step(page, "outcome")
      await expect(page.getByTestId("step-outcome")).toHaveText("Did you smoke on Fri 30 Oct?")
      await expect(page).toHaveURL(new RegExp(`d=${day(-20)}`))
      await page.getByTestId("outcome-clear").click()
      await page.getByTestId("flow-next").click()
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("done-back")).toHaveText("Back to the month")
      await expect(page.getByTestId("done-clear")).toContainText("Clear day.")
      await expect(page.getByTestId("done-clear")).toContainText("2 clear days this month.")
      await page.getByTestId("done-back").click()
      // back on the same month and day
      await expect(page.getByTestId("month-name")).toHaveText("October 2026")
      await expect(page.getByTestId("day-summary")).toBeVisible()
      await expect(page.getByTestId(`cell-${day(-20)}`)).toHaveAttribute("data-state", "clear")
      await page.getByTestId("month-next").click()
      await expect(page.getByTestId(`cell-${day(1)}`)).toBeDisabled()
    })

    test("9 month: four mode chips fully visible; on the 3rd last month's numbers show", async ({ page }) => {
      await seed(page, { days: { "2026-11-02": { slipped: false }, "2026-11-05": { slipped: true }, "2026-11-09": { slipped: false } } })
      await expect(page.getByTestId("last-month")).toContainText("Last month, November 2026")
      await expect(page.getByTestId("last-checked")).toHaveAttribute("data-n", "3")
      await expect(page.getByTestId("last-clear")).toHaveAttribute("data-n", "2")
      await expect(page.getByTestId("count-checked")).toHaveAttribute("data-n", "0")
      await shot(page, S("9-today-day3"))
      await openTab(page, "month")
      for (const m of ["clear", "hard", "feelings", "notes"]) {
        const b = page.getByTestId(`mode-${m}`)
        await expect(b).toBeInViewport({ ratio: 1 })
        const box = (await b.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      await shot(page, S("9-month"))
      await page.getByTestId("mode-hard").click()
      await shot(page, S("9-month-hard"))
    })

    test("10 pattern: 14 evenings show the forecast line with its four numbers, and no feelings or urges line", async ({ page }) => {
      const days: Record<string, object> = {}
      for (let i = 0; i < 16; i++) {
        const forecast = i < 6 ? 5 : 2
        const hard = i % 3 === 0 ? Math.min(5, forecast + 1) : i % 3 === 1 ? Math.max(1, forecast - 1) : forecast
        days[day(-(i + 1))] = { forecast, hard, urges: 5, feelings: ["bored", "tired"], slipped: i === 0 || i === 1 || i === 6 }
      }
      await seed(page, { days, record: CIG })
      await openTab(page, "pattern")
      await expect(page.getByTestId("pattern-forecast")).toHaveText("Days you expected Hard or Very hard: you slipped on 2 of 6. Days you expected Easy to In between: you slipped on 1 of 10.")
      const harder = Object.values(days).filter((d) => (d as { hard: number; forecast: number }).hard > (d as { forecast: number }).forecast).length
      const easier = Object.values(days).filter((d) => (d as { hard: number; forecast: number }).hard < (d as { forecast: number }).forecast).length
      await expect(page.getByTestId("pairs-line")).toHaveText(`On 16 days you rated the day in the morning and the evening: harder than you expected on ${harder}, easier on ${easier}, as expected on ${16 - harder - easier}.`)
      await expect(page.getByTestId("pattern-own")).toHaveText("These lines count only your own days. They are not a study.")
      const text = await page.getByTestId("tab-pattern-panel").innerText()
      expect(text).not.toMatch(/urge|bored|tired|feel/i)
      await shot(page, S("10-pattern"))
      // fewer than 14: the wait line says how many there are
      await seed(page, { days: { [day(-1)]: { slipped: false, forecast: 3, hard: 3 }, [day(-2)]: { slipped: true }, [day(-3)]: { slipped: false } }, record: CIG })
      await openTab(page, "pattern")
      await expect(page.getByTestId("pattern-wait")).toHaveText("Pattern lines start once 14 days have a yes or no answer. You have 3.")
      await expect(page.getByTestId("pattern-bar-label")).toHaveText("3 of 14")
      await shot(page, S("10-pattern-wait"))
    })

    test("15 history: Back after Done never lands inside the flow; Back from Fill in returns to the same month and day; leaving the example resets the month", async ({ page }) => {
      await seed(page, { days: { [day(-25)]: { slipped: false } }, record: CIG })
      await openTab(page, "month")
      await page.getByTestId("mode-hard").click()
      await page.getByTestId("month-prev").click()
      await page.getByTestId(`cell-${day(-20)}`).click()
      await expect(page).toHaveURL(new RegExp(`m=${day(-20).slice(0, 7)}&mode=hard&day=${day(-20)}`))
      await page.getByTestId("fill-day").click()
      await step(page, "outcome")
      // Back from the flow returns to the same month and day
      await page.goBack()
      await expect(page.getByTestId("month-name")).toHaveText("October 2026")
      await expect(page.getByTestId("day-summary")).toBeVisible()
      await expect(page.getByTestId("mode-hard")).toHaveAttribute("aria-checked", "true")
      await page.goForward()
      await step(page, "outcome")
      await page.getByTestId("outcome-clear").click()
      await page.getByTestId("flow-next").click()
      await step(page, "hard")
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("done-screen")).toBeVisible()
      await page.goBack()
      await expect(page.getByTestId("tab-month-panel")).toBeVisible()
      await expect(page.getByTestId("month-name")).toHaveText("October 2026")
      await expect(page.getByTestId("mode-hard")).toHaveAttribute("aria-checked", "true")
      // the example: leaving it returns to this month
      await page.goto(URL)
      await page.evaluate(() => window.localStorage.removeItem("quit-v1"))
      await page.reload()
      await page.getByTestId("see-example").click()
      await openTab(page, "month")
      await page.getByTestId("month-prev").click()
      await expect(page.getByTestId("month-name")).toHaveText("October 2026")
      await page.getByTestId("example-leave").click()
      await expect(page.getByTestId("month-name")).toHaveText("November 2026")
    })

    test("16 the no-slip line follows the case; the Yes and No buttons wait for the record", async ({ page }) => {
      // the last slip ended the clean days, and no run is going today
      await seed(page, { bb: blackBox({ slipOn: day(-3) }), record: CIG })
      await startEvening(page)
      await page.getByTestId("outcome-slip").click()
      await expect(page.getByTestId("slip-none")).toContainText("You have no new day 1 since your last slip, so this isn't saved as a new slip. It stays in your check-in.")
      if ((liveTools as string[]).includes("slip")) await expect(page.getByTestId("slip-link")).toBeVisible()
      await shot(page, S("16-ended"))
      // a day inside a run that a later slip already ended
      await page.getByTestId("flow-next").click()
      await page.getByTestId("flow-done").click()
      await page.getByTestId("done-back").click()
      await seed(page, { bb: blackBox({ slipToday: true }), days: { [day(-30)]: { slipped: false } }, record: CIG })
      await page.getByTestId("lookback-start").click()
      await page.getByTestId("outcome-slip").click()
      await expect(page.getByTestId("slip-none")).toHaveText("Your record already has a slip after this day, so this one isn't saved as a slip.")
      for (const q of ["no run", "phone"]) expect((await page.locator("body").innerText()).toLowerCase()).not.toContain(q)
    })

    test("17 a slip removed from the record elsewhere is cleared here, with a line once", async ({ page }) => {
      await seed(page, { bb: blackBox(), days: { [TODAY]: { slipped: true, slipReportId: randomUUID() } }, record: CIG })
      await expect(page.getByTestId("evening-card")).toContainText("Not done yet")
      await startEvening(page)
      await expect(page.getByTestId("slip-gone")).toHaveText("The slip saved here was removed from your record.")
      await expect(page.getByTestId("step-outcome")).toHaveText("Did you smoke today?")
      await expect(page.getByTestId("slip-block")).toHaveCount(0)
      await shot(page, S("17-slip-gone"))
    })

    test("18 the Black Box wins over his own No; a double tap on a tab is one history entry; done needs a saved day", async ({ page }) => {
      await seed(page, { bb: blackBox({ slipToday: true }), days: { [TODAY]: { slipped: false } }, record: CIG })
      await expect(page.getByTestId("evening-result")).toHaveText("You smoked")
      await expect(page.getByTestId("count-checked")).toHaveAttribute("data-n", "1")
      await expect(page.getByTestId("count-clear")).toHaveAttribute("data-n", "0")
      await page.getByTestId("tab-month").dblclick()
      await expect(page.getByTestId("tab-month-panel")).toBeVisible()
      await expect(page.getByTestId(`cell-${TODAY}`)).toHaveAttribute("data-state", "slip")
      await page.goBack()
      await expect(page.getByTestId("tab-today-panel")).toBeVisible()
      await page.goto(quitUrl("/quit/nicotine/checkin") + `&done=${day(-9)}`)
      await expect(page.getByTestId("tab-today-panel")).toBeVisible()
    })

    test("11 reminders: the calendar file has two daily events stamped now", async ({ page }) => {
      await page.goto(URL)
      await openTab(page, "reminders")
      await page.getByTestId("reminder-morning").fill("07:30")
      await shot(page, S("11-reminders"))
      const wait = page.waitForEvent("download")
      await page.getByTestId("cal-ics").click()
      const download = await wait
      const nowMs = await page.evaluate(() => Date.now())
      const text = readFileSync((await download.path())!, "utf8").replace(/\r\n /g, "")
      expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2)
      expect(text.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2)
      expect(text).toContain("SUMMARY:Daily check-in: morning")
      expect(text).toContain("SUMMARY:Daily check-in: evening")
      expect(text.match(/TRIGGER:PT0M/g)).toHaveLength(2)
      expect(text).toContain("DTSTART:20261119T073000")
      expect(text).toContain("DTSTART:20261119T210000")
      expect(text).toContain("/quit/nicotine/checkin")
      const stamp = /DTSTAMP:(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(text)!
      const ms = Date.UTC(+stamp[1], +stamp[2] - 1, +stamp[3], +stamp[4], +stamp[5], +stamp[6])
      expect(Math.abs(ms - nowMs)).toBeLessThan(60_000)
      for (const k of ["morning", "evening"]) await expect(page.getByTestId(`cal-google-${k}`)).toHaveAttribute("href", /calendar\.google\.com.*RRULE%3AFREQ%3DDAILY/)
      // the times are kept
      await page.reload()
      await openTab(page, "reminders")
      await expect(page.getByTestId("reminder-morning")).toHaveValue("07:30")
    })

    test("12 the unit sets the verb: vape, cigarettes, none", async ({ page }) => {
      await seed(page, { record: { quitDate: null, goal: null, breakEnd: null, unit: { id: "vape", perDay: 1, priceUsd: 5, priceBasis: "typed" } } })
      await startEvening(page)
      await expect(page.getByTestId("step-outcome")).toHaveText("Did you vape today?")
      await expect(page.getByTestId("outcome-slip")).toHaveText("Yes, I vaped")
      await shot(page, S("12-vape"))
      await seed(page, { record: { quitDate: null, goal: null, breakEnd: null, unit: null } })
      await startEvening(page)
      await expect(page.getByTestId("step-outcome")).toHaveText("Did you use nicotine today?")
      await seed(page, { record: { quitDate: null, goal: null, breakEnd: null, unit: { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" } } })
      await startEvening(page)
      await expect(page.getByTestId("step-outcome")).toHaveText("Did you smoke today?")
    })

    test("14 no console error, no sideways scroll, 44 px targets, a long note, the menu row, tabs and Back", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(String(e)))
      // the menu row opens the tool
      await page.goto(quitUrl("/quit/nicotine"))
      await page.locator('a[href*="/quit/nicotine/checkin"]').first().click()
      await expect(page.getByTestId("tab-today-panel")).toBeVisible()
      await expect(page.locator("h1")).toHaveText("Daily check-in")
      // desktop column
      const box = (await page.getByTestId("checkin").boundingBox())!
      expect(box.width).toBeLessThanOrEqual(640)
      if (vp.width > 640) expect(box.x).toBeGreaterThan(300)
      await noSideways(page)
      await tapTargets(page)
      // tabs are history entries
      await openTab(page, "month")
      await expect(page).toHaveURL(/tab=month/)
      await openTab(page, "pattern")
      await page.goBack()
      await expect(page.getByTestId("tab-month-panel")).toBeVisible()
      await page.reload()
      await expect(page.getByTestId("tab-month-panel")).toBeVisible()
      await noSideways(page)
      await tapTargets(page)
      await page.goBack()
      await expect(page.getByTestId("tab-today-panel")).toBeVisible()
      // a 300-character unbroken note does not widen the page
      const long = "x".repeat(300)
      await page.getByTestId("evening-start").click()
      await page.getByTestId("outcome-clear").click()
      await tapTargets(page)
      for (const id of ["hard", "urges", "feelings", "note"]) {
        await page.getByTestId("flow-next").click()
        await step(page, id)
      }
      await page.getByTestId("note-input").fill(long)
      await noSideways(page)
      await tapTargets(page)
      await page.getByTestId("flow-done").click()
      await expect(page.getByTestId("sum-note")).toBeVisible()
      await noSideways(page)
      await shot(page, S("14-long-note"))
      await page.getByTestId("done-back").click()
      await noSideways(page)
      await openTab(page, "month")
      await page.getByTestId(`cell-${TODAY}`).click()
      await expect(page.getByTestId("day-summary")).toBeVisible()
      await noSideways(page)
      await tapTargets(page)
      await openTab(page, "reminders")
      await tapTargets(page)
      expect(errors).toEqual([])
    })
  })
}

test.describe("daily check-in, signed in", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test("13 the slip reaches /api/black-box and Undo takes it out", async ({ page }) => {
    await page.clock.install({ time: NOW })
    // seed from a page that has no Black Box open, so nothing writes the browser copy back over it
    await page.goto(quitUrl("/quit/nicotine/symptoms"))
    const rows = (await (await page.request.get("/api/black-box")).json()).rows as { attempts: object[]; reports: object[] }
    const buried = new Date(Date.now() + 5000).toISOString()
    const bury = (r: object) => ({ ...r, updated_at: buried, deleted_at: buried })
    if (rows.attempts.length || rows.reports.length) {
      expect((await page.request.put("/api/black-box", { data: { rows: { attempts: rows.attempts.map(bury), reports: rows.reports.map(bury) } } })).ok()).toBe(true)
    }
    await page.evaluate((r) => {
      window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
      window.localStorage.removeItem("vice-blackbox-sent-v1")
    }, blackBox())
    await page.goto(URL)
    await startEvening(page)
    await page.getByTestId("outcome-slip").click()
    const serverSlips = async () =>
      ((await (await page.request.get("/api/black-box")).json()).rows.reports as { went_through: boolean; deleted_at: string | null }[]).filter((r) => !r.deleted_at && r.went_through).length
    await expect.poll(serverSlips, { timeout: 20000 }).toBe(1)
    await expect(page.getByTestId("slip-status")).toHaveText("Saved to your account.")
    await shot(page, "phone-13-signed-in-saved")
    await page.getByTestId("slip-undo").click()
    await expect.poll(serverSlips, { timeout: 20000 }).toBe(0)
  })
})
