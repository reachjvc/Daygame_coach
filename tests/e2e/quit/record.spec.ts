/**
 * QUIT TOOL 3, "YOUR RECORD" (/quit/nicotine/record), acceptance 1 to 9 of Plans/quit-finish.md.
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00:01, paused) so every day count and every cent is exact; `runFor`
 * moves it. State is seeded into the browser before the page loads: the shared record in `quit-v1` and the Black
 * Box in `vice-blackbox-v1`. With QUIT_SHOTS_DIR set it saves a screenshot of each screen.
 */

import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import { isLiveTool } from "../../../src/quit/menu"

const URL = quitUrl("/quit/nicotine/record")
const NOW = new Date("2026-11-19T10:00:00")
const TODAY = "2026-11-19"
const STAMP = "2026-01-01T00:00:00.000Z"

const p2 = (n: number) => String(n).padStart(2, "0")
function day(off: number) {
  const d = new Date(NOW.getTime() + off * 86_400_000)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: SIGNED_OUT })

type Attempt = { id: string; start: string; end: string | null; by?: string | null }
type Report = { id: string; attemptId: string; day: string; wentThrough: boolean; thought: string }

function box(attempts: Attempt[], reports: Report[] = []) {
  return {
    version: 1,
    attempts: attempts.map((a) => ({ id: a.id, viceId: "nicotine", label: "Smoking or vaping", startedOn: a.start, startedBy: "", structure: [], endedOn: a.end, endedByReportId: a.by ?? null, updatedAt: STAMP, deletedAt: null })),
    reports: reports.map((r) => ({ id: r.id, attemptId: r.attemptId, at: `${r.day}T12:00:00`, wentThrough: r.wentThrough, thought: r.thought, ending: "other", closeness: null, withWhom: "", where: "", factors: [], didInstead: "", updatedAt: STAMP, deletedAt: null })),
  }
}
const UNIT = { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" }
const recordOf = (r: object) => ({ quitDate: null, goal: null, breakEnd: null, unit: null, ...r })

/** Writes the browser state once, before the first load of the test (a reload keeps what the page did since). */
async function seed(page: Page, opts: { record?: object; box?: object; tool?: object } = {}) {
  await page.addInitScript(
    ([record, bb, tool]) => {
      try {
        if (window.sessionStorage.getItem("seeded")) return
        window.sessionStorage.setItem("seeded", "1")
        if (record || tool) {
          const q = { nicotine: {} as Record<string, unknown> }
          if (record) q.nicotine.record = JSON.parse(record)
          if (tool) q.nicotine["record-tool"] = JSON.parse(tool)
          window.localStorage.setItem("quit-v1", JSON.stringify(q))
        }
        if (bb) window.localStorage.setItem("vice-blackbox-v1", bb)
      } catch {
        // storage blocked: the test will say so
      }
    },
    [opts.record ? JSON.stringify(opts.record) : null, opts.box ? JSON.stringify(opts.box) : null, opts.tool ? JSON.stringify(opts.tool) : null] as const,
  )
}

async function open(page: Page, url = URL, at = NOW) {
  await page.clock.install({ time: at })
  await page.clock.pauseAt(new Date(at.getTime() + 1000))
  await page.goto(url)
}
async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (!dir) return
  // A screenshot of a page with a paused clock sometimes fails once; a second try is enough.
  for (let i = 0; i < 3; i++) {
    try {
      await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
      return
    } catch (e) {
      if (i === 2) throw e
    }
  }
}
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
const stored = (page: Page) => page.evaluate(() => ({ quit: localStorage.getItem("quit-v1"), box: localStorage.getItem("vice-blackbox-v1") }))
const boxRuns = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("vice-blackbox-v1")
    const rec = raw ? JSON.parse(raw) : { attempts: [] }
    return (rec.attempts as { viceId: string; startedOn: string; endedOn: string | null; deletedAt: string | null }[]).filter((a) => a.viceId === "nicotine" && !a.deletedAt)
  })
async function tab(page: Page, id: "home" | "money" | "milestones" | "calendar") {
  await page.getByTestId(`tab-${id}`).click()
  await expect(page.getByTestId(`panel-${id}`)).toBeVisible()
}
/** A guarded button (Add, Remove, Undo, Save) ignores a second tap within 400 ms: move the page clock past that, then tap. */
async function g(page: Page, id: string) {
  await page.clock.runFor(450)
  await page.getByTestId(id).click()
}
async function targetsOk(page: Page) {
  const small = await page.evaluate(() => {
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea")) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (Math.min(r.width, r.height) < 43.5) out.push(`${el.tagName} ${el.getAttribute("data-testid") ?? el.textContent?.slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
    return out
  })
  expect(small).toEqual([])
}

/** Twenty days ago a stop, ten cigarettes a day at $0.52: 21 clean days, $106.17 kept at 10:00:01. */
const PAST = { record: recordOf({ quitDate: day(-20), goal: "stop", unit: UNIT }) }

test.describe("your record", () => {
  test("1 fresh: empty state with the link to Your quit date; the example fills every tab and leaves nothing behind", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page)
    await expect(page.getByTestId("empty-title")).toHaveText("Your record starts on your quit date.")
    await expect(page.getByTestId("to-date")).toHaveAttribute("href", /\/quit\/nicotine\/date/)
    await expect(page.getByTestId("tab-home")).toHaveCount(0)
    await shot(page, "m-empty")
    const before = await stored(page)
    await page.getByTestId("see-example").click()
    await expect(page.getByTestId("example-bar")).toHaveText(/Example\. Nothing here is yours, and nothing is saved\./)
    await expect(page.getByTestId("ring-total")).toHaveText("46")
    await expect(page.getByTestId("run-row")).toHaveCount(2)
    // 44.4 clean days x $5.20 (an hour more when the zone changes its clock between the two dates)
    await expect(page.getByTestId("tile-money-value")).toHaveText(/^\$23[01]\.\d\d$/)
    const kept = await page.getByTestId("tile-money-value").innerText()
    await shot(page, "m-example-home")
    await tab(page, "money")
    await expect(page.getByTestId("money-total")).toHaveText(kept)
    await expect(page.getByTestId("target-row")).toHaveCount(1)
    await expect(page.getByTestId("amount-change")).toHaveCount(0)
    await shot(page, "m-example-money")
    await tab(page, "milestones")
    await expect(page.getByTestId("step-day-30")).toHaveAttribute("data-reached", "true")
    await expect(page.getByTestId("step-money-100")).toHaveAttribute("data-reached", "true")
    await shot(page, "m-example-milestones")
    await tab(page, "calendar")
    await shot(page, "m-example-calendar")
    await page.getByTestId("cal-prev").click()
    await expect(page.getByTestId("cal-month")).toHaveText("October 2026")
    await expect(page.getByTestId("cal-prev")).toBeDisabled()
    await expect(page.getByTestId(`cal-${day(-37)}`)).toHaveAttribute("data-state", "slip")
    await shot(page, "m-example-calendar-oct")
    expect(await stored(page)).toEqual(before)
    await page.getByTestId("leave-example").click()
    await expect(page.getByTestId("empty-title")).toBeVisible()
    await expect(page.getByTestId("example-bar")).toHaveCount(0)
    expect(await stored(page)).toEqual(before)
    expect(errors).toEqual([])
  })

  test("2 the date is today: a run starts, 1 clean day, Day 1, the counter ticks", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: TODAY, goal: "stop" }) })
    await open(page)
    await expect(page.getByTestId("ring-total")).toHaveText("1")
    await expect(page.getByTestId("counter-day")).toHaveText("Day 1 · since Thu, Nov 19")
    await expect(page.getByTestId("counter-d")).toHaveText("0")
    await expect(page.getByTestId("counter-h")).toHaveText("10")
    await expect(page.getByTestId("counter-m")).toHaveText("00")
    await expect(page.getByTestId("counter-s")).toHaveText("01")
    await page.clock.runFor(65_000)
    await expect(page.getByTestId("counter-m")).toHaveText("01")
    await expect(page.getByTestId("counter-s")).toHaveText("06")
    const runs = await boxRuns(page)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ startedOn: TODAY, endedOn: null })
    await page.getByTestId("counter").click()
    await expect(page.getByTestId("counter-basis")).toHaveText("Counted from midnight on this run's first day; the hour you stopped is not saved.")
    await expect(page.getByTestId("ring-dot")).toBeVisible()
    await expect(page.getByTestId("top-line")).toHaveText("Every clean day counts. Nothing here resets.")
    await shot(page, "m-home-day1")
    await tab(page, "milestones")
    await expect(page.getByTestId("step-day-1")).toContainText("Reached today, Thu, Nov 19")
    await expect(page.getByTestId("step-day-1")).toHaveClass(/bg-primary\/10/)
    await tab(page, "home")
    // a reload does not start a second run
    await page.reload()
    await expect(page.getByTestId("ring-total")).toHaveText("1")
    expect(await boxRuns(page)).toHaveLength(1)
  })

  test("3 a date 20 days ago, 10 a day at $0.52: 21 clean days, tile and Money total agree, the formula shows its numbers", async ({ page }) => {
    await seed(page, PAST)
    await open(page)
    await expect(page.getByTestId("ring-total")).toHaveText("21")
    await expect(page.getByTestId("ring-step")).toHaveText("Next step: 30 days, 9 to go")
    await expect(page.getByTestId("counter-day")).toContainText("Day 21")
    await expect(page.getByTestId("tile-money-value")).toHaveText("$106.17")
    await page.getByTestId("tile-money").getByRole("button").click()
    await expect(page.getByTestId("money-formula")).toHaveText("10 cigarettes a day × $0.52 × 20.42 days of clean time = about $106.17")
    await expect(page.getByTestId("tile-money-formula")).toContainText("Clean time: from midnight of each run's first day to now, slip days left out.")
    await expect(page.getByTestId("tile-units-value")).toHaveText("204")
    await expect(page.getByTestId("tile-units")).toContainText("Cigarettes not smoked")
    await expect(page.getByTestId("price-basis")).toHaveCount(0)
    await page.getByTestId("tile-price").getByRole("button").first().click()
    await expect(page.getByTestId("price-basis")).toContainText("a pack of 20 averages $10.34")
    await expect(page.getByTestId("price-basis-more")).toHaveCount(0)
    await page.getByTestId("price-basis-toggle").click()
    await expect(page.getByTestId("price-basis-more")).toContainText("$9.95")
    await expect(page.getByTestId("price-formula")).toHaveText("10 cigarettes a day × $0.52 = $5.20 a day")
    await page.getByTestId("tile-units").getByRole("button").click()
    await expect(page.getByTestId("units-formula")).toHaveText("10 cigarettes a day × 20.42 days = about 204 cigarettes")
    await page.getByTestId("ring").click()
    await expect(page.getByTestId("ring-basis")).toContainText("Every day of every run, added up, the day of a slip too.")
    await expect(page.getByTestId("card-run-value")).toHaveText("21")
    await expect(page.getByTestId("card-best-value")).toHaveText("21")
    await expect(page.getByTestId("card-close-value")).toHaveText("None yet")
    await page.getByTestId("card-close").click()
    await expect(page.getByTestId("card-formula")).toContainText("Close calls you wrote down and did not give in to: 0.")
    await expect(page.getByTestId("next-step")).toHaveText("Next: 30 clean days, on Sat, Nov 28 if this run keeps going.")
    await shot(page, "m-home")
    await tab(page, "money")
    await expect(page.getByTestId("money-total")).toHaveText("$106.17")
    await expect(page.getByTestId("money-formula")).toContainText("10 cigarettes a day × $0.52 × 20.42 days of clean time")
    await expect(page.getByTestId("amount-line")).toHaveText("10 cigarettes a day × $0.52 = $5.20 a day")
    await expect(page.getByText("Clean time: from midnight of each run's first day to now, slip days left out.")).toHaveCount(1)
    await expect(page.getByText(/^Clean time from /)).toHaveCount(0)
    await expect(page.getByTestId("proj-month")).toHaveText("$158.17 a month: $5.20 × 365 ÷ 12")
    await expect(page.getByTestId("proj-year")).toHaveText("$1,898.00 a year: $5.20 × 365")
    await page.getByTestId("period-d7").click()
    await expect(page.getByTestId("money-total")).toHaveText("$36.40")
    await expect(page.getByTestId("money-formula")).toContainText("7.00 days of clean time")
    await expect(page.getByText(/^Clean time from /)).toHaveCount(1)
    await shot(page, "m-money")
    await tab(page, "milestones")
    await expect(page.getByTestId("step-day-14")).toContainText("Reached on Thu, Nov 12")
    await expect(page.getByTestId("step-day-30")).toContainText("9 clean days to go, on Sat, Nov 28 if this run keeps going")
    await expect(page.getByTestId("step-money-100")).toHaveAttribute("data-reached", "true")
    await expect(page.getByTestId("step-money-250")).toContainText("about 28 clean days at your rate of $5.20 a day")
    await shot(page, "m-milestones")
    await tab(page, "calendar")
    await expect(page.getByTestId(`cal-${TODAY}`)).toHaveAttribute("data-today", "true")
    await page.getByTestId(`cal-${day(-16)}`).click()
    await expect(page.getByTestId("cal-line")).toContainText("Clean. Day 5 of the run that started Oct 30.")
    await page.getByTestId(`cal-${day(3)}`).click()
    await expect(page.getByTestId("cal-line")).toContainText("Still to come.")
    await shot(page, "m-calendar")
  })

  test("4 a slip on day 10, then a new run: both runs listed, the first run's days stay, the slip day is dashed", async ({ page }) => {
    const thought = "One will not matter"
    await seed(page, {
      record: recordOf({ quitDate: day(-20), goal: "stop", unit: UNIT }),
      box: box(
        [
          { id: "a", start: day(-20), end: day(-12), by: "s" },
          { id: "b", start: day(-11), end: null },
        ],
        [
          { id: "s", attemptId: "a", day: day(-12), wentThrough: true, thought },
          { id: "c", attemptId: "a", day: day(-15), wentThrough: false, thought: "Just one with friends" },
        ],
      ),
    })
    await open(page)
    // 9 days in run one (slip day counted, as in the Black Box) + 12 in run two
    await expect(page.getByTestId("ring-total")).toHaveText("21")
    await expect(page.getByTestId("run-row")).toHaveCount(2)
    await expect(page.getByTestId("run-row").first()).toContainText("Going now")
    await expect(page.getByTestId("run-row").last()).toContainText("9 days · Oct 30 to Nov 7")
    await expect(page.getByTestId("run-row").last()).toContainText("Ended by a slip on Nov 7")
    await expect(page.getByTestId("run-row").last()).toContainText(thought)
    await expect(page.getByTestId("run-row").last()).toContainText("1 close call beaten")
    await expect(page.getByTestId("card-close-value")).toHaveText("1")
    // money: 9 days of run one are 8 clean days for money (the slip day does not count), run two is 11.4
    await expect(page.getByTestId("tile-money-value")).toHaveText("$100.97")
    await tab(page, "calendar")
    const slip = page.getByTestId(`cal-${day(-12)}`)
    await expect(slip).toHaveAttribute("data-state", "slip")
    await expect(slip).toHaveClass(/border-dashed/)
    await slip.click()
    await expect(page.getByTestId("cal-line")).toContainText(`Slip: ${thought}`)
    await expect(page.getByTestId(`cal-${day(-15)}`)).toHaveAttribute("data-close", "true")
    await expect(page.getByTestId(`cal-${day(-15)}`)).toHaveAttribute("aria-label", /, close call beaten$/)
    await page.getByTestId(`cal-${day(-15)}`).click()
    await expect(page.getByTestId("cal-line")).toContainText("Close call beaten: Just one with friends")
    await page.getByTestId(`cal-${day(-3)}`).click()
    await expect(page.getByTestId("cal-line")).toContainText("Clean. Day 9 of the run that started Nov 8.")
    // the page does not start a run on top of the two it found
    expect(await boxRuns(page)).toHaveLength(2)
  })

  test("4b every run ended by a slip: no run going, the totals stay, no counter, the slip tool is plain text", async ({ page }) => {
    await seed(page, {
      record: recordOf({ quitDate: day(-30), goal: "stop", unit: UNIT }),
      box: box([{ id: "a", start: day(-30), end: day(-22), by: "s" }], [{ id: "s", attemptId: "a", day: day(-22), wentThrough: true, thought: "Stress at work" }]),
    })
    await open(page)
    await expect(page.getByTestId("ring-total")).toHaveText("9")
    await expect(page.getByTestId("no-run")).toContainText("Your 9 clean days still count.")
    await expect(page.getByTestId("counter")).toHaveCount(0)
    await expect(page.getByTestId("ring-dot")).toHaveCount(0)
    await expect(page.getByTestId("card-run-value")).toHaveText("None now")
    if (isLiveTool("slip")) {
      await expect(page.getByTestId("slip-link")).toHaveAttribute("href", /\/quit\/nicotine\/slip/)
    } else {
      await expect(page.getByTestId("slip-link")).toHaveCount(0)
      await expect(page.getByTestId("date-link")).toHaveText("Pick a new day 1 in Your quit date")
    }
    expect(await boxRuns(page)).toHaveLength(1)
    await shot(page, "m-no-run")
  })

  test("5 spending $500: negative money with its line, the $100 step falls back, a target's days grow, Remove then Undo", async ({ page }) => {
    await seed(page, PAST)
    await open(page)
    await tab(page, "money")
    await page.getByTestId("target-open").click()
    await page.getByTestId("target-name").fill("Shoes")
    await page.getByTestId("target-price").fill("200")
    await g(page, "target-add")
    const before = await page.getByTestId("target-days").innerText()
    expect(before).toMatch(/^about 19 clean days at your rate of \$5\.20 a day/)
    await page.getByTestId("spend-open").click()
    await page.getByTestId("spend-amount").fill("500")
    await page.getByTestId("spend-note").fill("Patches")
    await g(page, "spend-add")
    await expect(page.getByTestId("money-total")).toHaveText("−$393.83")
    await expect(page.getByTestId("money-negative")).toHaveText("Spending is more than the money kept so far.")
    await expect(page.getByTestId("money-formula")).toContainText("− $500.00 spent = about −$393.83")
    await expect(page.getByTestId("target-days")).toHaveText(/^about 115 clean days at your rate of \$5\.20 a day \(\$593\.83 still missing\)/)
    await expect(page.getByTestId("spend-row")).toContainText("Patches · $500.00 · Nov 19")
    await shot(page, "m-money-negative")
    await tab(page, "milestones")
    await expect(page.getByTestId("step-money-100")).toHaveAttribute("data-reached", "false")
    await expect(page.getByTestId("step-money-10")).toHaveAttribute("data-reached", "false")
    await tab(page, "home")
    await expect(page.getByTestId("tile-money-value")).toHaveText("−$393.83")
    await tab(page, "money")
    // Remove, then Undo: the "Removed" line takes the row's place
    await g(page, "spend-remove")
    await expect(page.getByTestId("money-total")).toHaveText("$106.17")
    await expect(page.getByTestId("spend-row")).toHaveCount(0)
    await expect(page.getByTestId("removed-row")).toHaveText(/Removed “Patches”\.\s*Undo/)
    // the Undo survives a change of tab
    await tab(page, "home")
    await tab(page, "money")
    await expect(page.getByTestId("removed-row")).toHaveCount(1)
    await g(page, "undo")
    await expect(page.getByTestId("money-total")).toHaveText("−$393.83")
    await expect(page.getByTestId("spend-row")).toHaveCount(1)
    await expect(page.getByTestId("removed-row")).toHaveCount(0)
    await g(page, "target-remove")
    await expect(page.getByTestId("target-row")).toHaveCount(0)
    await g(page, "undo")
    await expect(page.getByTestId("target-title")).toHaveText("Shoes")
    // limits: above $100,000 and below one cent are refused
    await page.getByTestId("spend-open").click()
    await page.getByTestId("spend-amount").fill("100001")
    await g(page, "spend-add")
    await expect(page.getByTestId("spend-error")).toHaveText("Up to $100,000.")
    await page.getByTestId("spend-amount").fill("0.004")
    await g(page, "spend-add")
    await expect(page.getByTestId("spend-error")).toBeVisible()
    await page.getByTestId("spend-amount").fill("0.005")
    await g(page, "spend-add")
    await expect(page.getByTestId("spend-row")).toHaveCount(2)
    await expect(page.getByTestId("spend-row").last()).toContainText("$0.01")
    // saved in the browser, and a reload keeps it
    await page.reload()
    await expect(page.getByTestId("spend-row")).toHaveCount(2)
    await expect(page.getByTestId("target-title")).toHaveText("Shoes")
  })

  test("5b a double tap acts once: Remove, Undo and Add", async ({ page }) => {
    await seed(page, { ...PAST, tool: { spends: [{ id: "a", day: TODAY, amount: 5, note: "Gum" }, { id: "b", day: TODAY, amount: 7, note: "Patch" }], targets: [] } })
    await open(page)
    await tab(page, "money")
    await expect(page.getByTestId("spend-row")).toHaveCount(2)
    await page.clock.runFor(450)
    await page.getByTestId("spend-remove").first().dblclick()
    await expect(page.getByTestId("removed-row")).toHaveCount(1)
    await expect(page.getByTestId("spend-row")).toHaveCount(1)
    await page.clock.runFor(450)
    await page.getByTestId("undo").dblclick()
    await expect(page.getByTestId("spend-row")).toHaveCount(2)
    await expect(page.getByTestId("removed-row")).toHaveCount(0)
    // another row's Remove right after is a different action: it works at once
    await page.getByTestId("spend-remove").nth(1).click()
    await expect(page.getByTestId("removed-row")).toHaveCount(1)
    await page.clock.runFor(450)
    await page.getByTestId("undo").click()
    await expect(page.getByTestId("spend-row")).toHaveCount(2)
    await page.getByTestId("spend-open").click()
    await page.getByTestId("spend-amount").fill("3")
    await page.clock.runFor(450)
    await page.getByTestId("spend-add").dblclick()
    await expect(page.getByTestId("spend-row")).toHaveCount(3)
    await expect(page.getByTestId("spend-error")).toHaveCount(0)
  })

  test("6 Change: 7,50 saves 7.50 to the shared record; abc, 0 and 501 are refused", async ({ page }) => {
    await seed(page, PAST)
    await open(page)
    await tab(page, "money")
    await page.getByTestId("amount-change").click()
    await expect(page.getByTestId("amount-perday")).toHaveValue("10")
    await expect(page.getByTestId("amount-price")).toHaveValue("0.52")
    await expect(page.getByTestId("amount-form")).toContainText("Less than one a day? Type 0.5 for one every two days.")
    await page.getByTestId("amount-perday").fill("abc")
    await expect(page.getByTestId("amount-error-perday")).toHaveText("Type a number, like 7.50")
    await page.getByTestId("amount-perday").fill("501")
    await expect(page.getByTestId("amount-error-perday")).toHaveText("That is more than 500. Type up to 500 a day.")
    await page.getByTestId("amount-perday").fill("0")
    await expect(page.getByTestId("amount-error-perday")).toHaveText("Type a number above 0, or leave the count empty")
    await page.getByTestId("amount-perday").fill("12")
    await page.getByTestId("amount-price").fill("0")
    await expect(page.getByTestId("amount-error-price")).toHaveText("Type a number above 0, like 7.50")
    await page.getByTestId("amount-price").fill("1,001")
    await expect(page.getByTestId("amount-error-price")).toHaveText("That is more than $1,000. Type up to $1,000.")
    await page.getByTestId("amount-price").fill("1,000")
    await expect(page.getByTestId("amount-error-price")).toHaveCount(0)
    await page.getByTestId("amount-price").fill("0")
    await g(page, "amount-save")
    expect(JSON.parse((await stored(page)).quit as string).nicotine.record.unit.priceUsd).toBe(0.52)
    await page.getByTestId("amount-price").fill("7,50")
    await g(page, "amount-save")
    await expect(page.getByTestId("amount-line")).toHaveText("12 cigarettes a day × $7.50 = $90.00 a day")
    await expect(page.getByTestId("amount-saved")).toBeVisible()
    const unit = JSON.parse((await stored(page)).quit as string).nicotine.record.unit
    expect(unit).toMatchObject({ id: "cigarettes", perDay: 12, priceUsd: 7.5, priceBasis: "typed" })
    // the quit date, goal and run are untouched
    expect(JSON.parse((await stored(page)).quit as string).nicotine.record).toMatchObject({ quitDate: day(-20), goal: "stop" })
    await tab(page, "home")
    await page.getByTestId("tile-price").getByRole("button").first().click()
    await expect(page.getByTestId("price-basis")).toHaveText("Your own price.")
    await expect(page.getByTestId("tile-money-value")).toHaveText("$1,837.50")
    // Change on the price tile opens the same form on the Money tab
    await page.getByTestId("price-change").click()
    await expect(page.getByTestId("panel-money")).toBeVisible()
    await expect(page.getByTestId("amount-form")).toBeVisible()
  })

  test("6c malformed Black Box rows are skipped, not a crash", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    const b = box([{ id: "a", start: day(-5), end: null }, { id: "bad", start: "nonsense", end: null }], [{ id: "r", attemptId: "a", day: day(-2), wentThrough: false, thought: "ok" }])
    ;(b.reports as { at: unknown }[]).push({ ...(b.reports[0] as object), id: "r2", at: undefined } as never)
    await seed(page, { record: recordOf({ quitDate: day(-5), goal: "stop", unit: UNIT }), box: b })
    await open(page)
    await expect(page.getByTestId("ring-total")).toHaveText("6")
    await expect(page.getByTestId("card-close-value")).toHaveText("1")
    expect(errors).toEqual([])
  })

  test("6b no numbers yet: dashes and Add your numbers, which opens the unit form", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: day(-20), goal: "stop" }) })
    await open(page)
    await expect(page.getByTestId("tile-money-value")).toHaveText("–")
    await expect(page.getByTestId("tile-units-value")).toHaveText("–")
    await expect(page.getByTestId("tile-units")).toContainText("Not used (about)")
    await expect(page.getByTestId("tile-money")).toContainText("Add your numbers to see this.")
    await expect(page.getByRole("button", { name: "Add your numbers", exact: true })).toHaveCount(1)
    await page.getByTestId("add-numbers").click()
    await expect(page.getByTestId("panel-money")).toBeVisible()
    await expect(page.getByTestId("money-total")).toHaveText("–")
    await expect(page.getByRole("button", { name: "Add your numbers", exact: true })).toHaveCount(1)
    await page.getByTestId("amount-add").click()
    await expect(page.getByText("What do you use?")).toBeVisible()
    await page.getByTestId("chip-vape").click()
    await page.getByTestId("amount-perday").fill("2")
    await g(page, "amount-save")
    await expect(page.getByTestId("amount-line")).toHaveText("2 disposable vapes a day × $14.07 = $28.14 a day")
    await tab(page, "home")
    await expect(page.getByTestId("tile-units")).toContainText("Disposable vapes not used")
  })

  test("7 a date in the future: countdown, no counter, no run, the example is offered", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: day(3), goal: "stop", unit: UNIT }) })
    await open(page)
    await expect(page.getByTestId("future-title")).toHaveText("3 days to go.")
    await expect(page.getByTestId("future-line")).toHaveText("Your record starts on Sun, Nov 22.")
    await expect(page.getByTestId("counter")).toHaveCount(0)
    await expect(page.getByTestId("ring")).toHaveCount(0)
    await expect(page.getByTestId("see-example")).toBeVisible()
    await expect(page.getByTestId("to-date")).toHaveText("Change your quit date")
    expect(await boxRuns(page)).toHaveLength(0)
    await shot(page, "m-future")
  })

  test("7b a break: the end is named, and after it a plain line", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: day(-3), goal: "break", breakEnd: day(11), unit: UNIT }) })
    await open(page)
    await expect(page.getByTestId("break-line")).toHaveText("Break: ends Mon, Nov 30.")
    await expect(page.getByTestId("ring-total")).toHaveText("4")
  })

  test("7c a break that has ended", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: day(-20), goal: "break", breakEnd: day(-2), unit: UNIT }) })
    await open(page)
    await expect(page.getByTestId("break-line")).toContainText("Your break ended on Tue, Nov 17.")
  })

  test("8 tabs are history entries, reload stays, an unbroken text does not widen the page", async ({ page }) => {
    const long = "y".repeat(200)
    await seed(page, {
      record: recordOf({ quitDate: day(-20), goal: "stop", unit: UNIT }),
      box: box([{ id: "a", start: day(-20), end: day(-12), by: "s" }, { id: "b", start: day(-11), end: null }], [
        { id: "s", attemptId: "a", day: day(-12), wentThrough: true, thought: long },
        { id: "c", attemptId: "b", day: day(-5), wentThrough: false, thought: long },
      ]),
    })
    await open(page)
    await expect(page.getByTestId("panel-home")).toBeVisible()
    await noSideways(page)
    await tab(page, "money")
    await tab(page, "calendar")
    expect(page.url()).toContain("tab=calendar")
    expect(page.url()).toContain("preview=1")
    await page.goBack()
    await expect(page.getByTestId("panel-money")).toBeVisible()
    await page.goBack()
    await expect(page.getByTestId("panel-home")).toBeVisible()
    await page.goForward()
    await expect(page.getByTestId("panel-money")).toBeVisible()
    await tab(page, "milestones")
    await page.reload()
    await expect(page.getByTestId("panel-milestones")).toBeVisible()
    expect(page.url()).toContain("tab=milestones")
    // long unbroken text: in a spend note and a target name, in the runs list and the calendar line
    await tab(page, "money")
    await page.getByTestId("spend-open").click()
    await page.getByTestId("spend-amount").fill("5")
    await page.getByTestId("spend-note").fill("x".repeat(200))
    await g(page, "spend-add")
    await page.getByTestId("target-open").click()
    await page.getByTestId("target-name").fill("z".repeat(200))
    await page.getByTestId("target-price").fill("50")
    await g(page, "target-add")
    await expect(page.getByTestId("spend-row")).toHaveCount(1)
    expect((await page.getByTestId("spend-row").innerText()).length).toBeLessThan(120)
    await noSideways(page)
    await tab(page, "home")
    await noSideways(page)
    await tab(page, "calendar")
    await page.getByTestId(`cal-${day(-12)}`).click()
    await expect(page.getByTestId("cal-line")).toContainText("y".repeat(200))
    await noSideways(page)
  })

  test("9 no console error, no sideways scroll, every tap target 44 px, on every tab", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await seed(page, {
      record: recordOf({ quitDate: day(-20), goal: "stop", unit: UNIT }),
      box: box([{ id: "a", start: day(-20), end: day(-12), by: "s" }, { id: "b", start: day(-11), end: null }], [{ id: "s", attemptId: "a", day: day(-12), wentThrough: true, thought: "x" }]),
    })
    await open(page)
    for (const id of ["home", "money", "milestones", "calendar"] as const) {
      await tab(page, id)
      await noSideways(page)
      await targetsOk(page)
    }
    await tab(page, "money")
    await page.getByTestId("spend-open").click()
    await page.getByTestId("spend-amount").fill("5")
    await targetsOk(page)
    await g(page, "spend-add")
    await page.getByTestId("target-open").click()
    await targetsOk(page)
    await page.getByTestId("amount-change").click()
    await targetsOk(page)
    await tab(page, "home")
    await page.getByTestId("tile-money").getByRole("button").click()
    await page.getByTestId("counter").click()
    await targetsOk(page)
    expect(errors).toEqual([])
  })

  test("9b the menu row: a link to the tool once it is open to the public, greyed until then", async ({ page }) => {
    await open(page, quitUrl("/quit/nicotine"))
    const row = page.getByText("Your record", { exact: true }).first()
    await expect(row).toBeVisible()
    if (isLiveTool("record")) {
      await page.getByRole("link", { name: /Your record/ }).first().click()
      await expect(page).toHaveURL(/\/quit\/nicotine\/record/)
      await expect(page.getByTestId("empty-title")).toBeVisible()
    } else {
      await expect(page.getByRole("link", { name: /Your record/ })).toHaveCount(0)
    }
  })

  test("a signed-out visitor makes no account call and the page is not a 404", async ({ page }) => {
    const calls: string[] = []
    page.on("request", (r) => /\/api\/(whoami|black-box)/.test(r.url()) && calls.push(r.url()))
    await seed(page, PAST)
    await open(page)
    await expect(page.getByTestId("ring-total")).toHaveText("21")
    expect(calls).toEqual([])
    await expect(page.locator("h1")).toHaveText("Your record")
  })
})

test.describe("your record, over time", () => {
  test("1b a page left open when a future date arrives starts the run at midnight, with no refusal", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: day(1), goal: "stop", unit: UNIT }) })
    await open(page)
    await expect(page.getByTestId("future-title")).toContainText("1")
    expect(await boxRuns(page)).toHaveLength(0)
    await page.clock.fastForward(14 * 3_600_000)
    await page.clock.runFor(3000)
    await expect(page.getByTestId("ring-total")).toHaveText("1")
    await expect(page.getByTestId("run-refused")).toHaveCount(0)
    const runs = await boxRuns(page)
    expect(runs).toHaveLength(1)
    expect(runs[0]).toMatchObject({ startedOn: day(1), endedOn: null })
  })

  test("9c the calendar follows today across a month end until he moves it", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: "2026-11-01", goal: "stop", unit: UNIT }) })
    await open(page, URL, new Date("2026-11-30T23:59:50"))
    await tab(page, "calendar")
    await expect(page.getByTestId("cal-month")).toHaveText("November 2026")
    await expect(page.getByTestId("cal-2026-11-30")).toHaveAttribute("data-today", "true")
    await page.clock.runFor(20_000)
    await expect(page.getByTestId("cal-month")).toHaveText("December 2026")
    await expect(page.getByTestId("cal-2026-12-01")).toHaveAttribute("data-today", "true")
  })

  test("9d a moved month stays where he put it", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: "2026-10-20", goal: "stop", unit: UNIT }) })
    await open(page, URL, new Date("2026-11-30T23:59:50"))
    await tab(page, "calendar")
    await page.getByTestId("cal-prev").click()
    await expect(page.getByTestId("cal-month")).toHaveText("October 2026")
    await page.clock.runFor(20_000)
    await expect(page.getByTestId("cal-month")).toHaveText("October 2026")
  })

  test("10 a date in another year shows the year", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: "2025-10-04", goal: "stop", unit: UNIT }), box: box([{ id: "a", start: "2025-10-04", end: null }]) })
    await open(page)
    await expect(page.getByTestId("counter-day")).toContainText("since Sat, Oct 4, 2025")
    await expect(page.getByTestId("run-row")).toContainText("since Oct 4, 2025")
  })

  test("no run going with a slip: 'None now', the sentence leads, money steps say once a new run starts", async ({ page }) => {
    await seed(page, {
      record: recordOf({ quitDate: day(-30), goal: "stop", unit: UNIT }),
      box: box([{ id: "a", start: day(-30), end: day(-22), by: "s" }], [{ id: "s", attemptId: "a", day: day(-22), wentThrough: true, thought: "x" }]),
    })
    await open(page)
    await expect(page.getByTestId("no-run")).toContainText("No run going. Your 9 clean days still count.")
    await expect(page.getByTestId("card-run-value")).toHaveText("None now")
    await tab(page, "milestones")
    await expect(page.getByTestId("step-money-250")).toContainText("once a new run starts")
    await expect(page.getByTestId("step-day-14")).not.toContainText("if this run keeps going")
  })
})

test.describe("your record, desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false })

  test("the same screens sit in the page column and fit", async ({ page }) => {
    await seed(page, {
      record: recordOf({ quitDate: day(-30), goal: "stop", unit: UNIT }),
      box: box([{ id: "a", start: day(-30), end: day(-22), by: "s" }, { id: "b", start: day(-21), end: null }], [
        { id: "s", attemptId: "a", day: day(-22), wentThrough: true, thought: "Stress at work" },
        { id: "c", attemptId: "b", day: day(-9), wentThrough: false, thought: "A coffee break" },
      ]),
    })
    await open(page)
    const col = (await page.getByTestId("record").boundingBox())!
    expect(col.width).toBeLessThanOrEqual(640)
    expect(col.x).toBeGreaterThan(300)
    // the three tiles are equal height
    await expect(page.getByTestId("tile-price")).toBeVisible()
    const heights = await Promise.all(["money", "units", "price"].map(async (k) => Math.round((await page.getByTestId(`tile-${k}`).boundingBox())!.height)))
    expect(new Set(heights).size).toBe(1)
    const h = (await page.locator("h1").first().boundingBox())!
    expect(Math.abs(h.x - col.x)).toBeLessThanOrEqual(2)
    await noSideways(page)
    await shot(page, "d-home")
    for (const id of ["money", "milestones", "calendar"] as const) {
      await tab(page, id)
      await noSideways(page)
      await shot(page, `d-${id}`)
    }
    await page.goto(URL)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.getByTestId("empty-title")).toBeVisible()
    await shot(page, "d-empty")
    await page.getByTestId("see-example").click()
    await expect(page.getByTestId("example-bar")).toBeVisible()
    await shot(page, "d-example")
  })

  test("future date and no-run screens at desktop width", async ({ page }) => {
    await seed(page, { record: recordOf({ quitDate: day(3), goal: "stop" }) })
    await open(page)
    await expect(page.getByTestId("future-title")).toBeVisible()
    await shot(page, "d-future")
    await page.evaluate(() => {
      const bb = {
        version: 1,
        attempts: [{ id: "a", viceId: "nicotine", label: "x", startedOn: "2026-10-20", startedBy: "", structure: [], endedOn: "2026-10-28", endedByReportId: "s", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: null }],
        reports: [{ id: "s", attemptId: "a", at: "2026-10-28T12:00:00", wentThrough: true, thought: "Stress", ending: "other", closeness: null, withWhom: "", where: "", factors: [], didInstead: "", updatedAt: "2026-01-01T00:00:00.000Z", deletedAt: null }],
      }
      localStorage.setItem("vice-blackbox-v1", JSON.stringify(bb))
    })
    await page.reload()
    await expect(page.getByTestId("no-run")).toBeVisible()
    await shot(page, "d-no-run")
  })
})
