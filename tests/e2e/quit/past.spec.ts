
/**
 * QUIT TOOL 10, "YOUR PAST ATTEMPTS" (acceptance 1 to 11 of Plans/quit-finish.md, Tool 10).
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00): this month is November 2026. Signed out.
 * 390x844 with touch for the walk, 1280x800 for the desktop checks. Screenshots go to
 * QUIT_SHOTS_DIR when it is set.
 */

import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotine from "../../../src/quit/data/nicotine.json"
import liveTools from "../../../src/quit/data/liveTools.json"

const URL = quitUrl("/quit/nicotine/past")
const NOW = new Date("2026-11-19T10:00:00")
const b4 = (nicotine as unknown as { beliefs: { id: string; counterpart: string; proof: string; counted: string; refs: { cite: string }[] }[] }).beliefs.find((b) => b.id === "b4")!

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, storageState: SIGNED_OUT })

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}
async function open(page: Page, url = URL) {
  await page.clock.install({ time: NOW })
  await page.goto(url)
  await expect(page.getByTestId("past-page")).toBeVisible()
}
/** Taps and moves the page clock past the double-tap guard, so the next tap is a new one. */
async function tap(page: Page, id: string) {
  await page.getByTestId(id).click()
  await page.clock.runFor(300)
}
interface Spec {
  when?: string
  len?: string
  unit?: string
  ended?: string[]
  helped?: string[]
  endedText?: string
}
async function addTry(page: Page, s: Spec) {
  await tap(page, "add-try")
  await expect(page.getByTestId("try-form")).toBeVisible()
  if (s.when) await page.getByTestId("f-when").fill(s.when)
  if (s.len) await page.getByTestId("f-len").fill(s.len)
  if (s.unit) await page.getByTestId("f-unit").selectOption(s.unit)
  for (const e of s.ended ?? []) await tap(page, `chip-${e}`)
  for (const h of s.helped ?? []) await tap(page, `chip-${h}`)
  if (s.endedText) await page.getByTestId("f-ended-text").fill(s.endedText)
  await tap(page, "f-save")
  await expect(page.getByTestId("past-page")).toBeVisible()
}
const store = (page: Page) => page.evaluate(() => localStorage.getItem("quit-v1"))
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("quit-v1") ?? "{}").nicotine?.past)
const heads = (page: Page) => page.locator('[data-testid^="try-"][data-testid$="-head"]').allTextContents()
const noSideways = async (page: Page, w = 390) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w)
const small = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main button, main a, main input, main select, main summary")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ t: e.getAttribute("data-testid") ?? e.textContent?.slice(0, 20), h: e.getBoundingClientRect().height }))
      .filter((x) => x.h < 43.5),
  )

test.describe("past attempts", () => {
  test("1 fresh: no example; See an example fills the page; Leave the example empties it and storage is unchanged", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page)
    await expect(page.getByTestId("example-bar")).toHaveCount(0)
    await expect(page.getByTestId("see-example")).toBeVisible()
    await expect(page.getByTestId("pattern")).toContainText("Add a length, an ending or what helped, and your pattern shows here.")
    await expect(page.getByTestId("chart")).toHaveCount(0)
    await expect(page.getByTestId("saved-line")).toHaveText("Saved on this phone.")
    await shot(page, "01-fresh-390")
    const before = await store(page)
    await tap(page, "see-example")
    await expect(page.getByTestId("example-bar")).toContainText("Example. Nothing here is yours, and nothing is saved.")
    await expect(page.getByTestId("pattern-longest")).toHaveText("Longest try: 14 days. From 4 tries with a length.")
    await expect(page.getByTestId("chart")).toBeVisible()
    await expect(page.getByTestId("bar-0-month")).toHaveText("Jul 25")
    await expect(page.getByTestId("try-0-head")).toHaveText("Aug 2026 · 6 days")
    await expect(page.locator('[data-testid^="try-"][data-testid$="-head"]')).toHaveCount(4)
    await expect(page.getByTestId("add-try")).toHaveCount(0)
    await expect(page.getByTestId("try-0-edit")).toHaveCount(0)
    await expect(page.getByTestId("try-0-delete")).toHaveCount(0)
    await expect(page.getByTestId("after-slip")).toBeVisible()
    await tap(page, "chip-justOnce")
    await shot(page, "02-example-390")
    await tap(page, "example-clear")
    await expect(page.getByTestId("example-bar")).toHaveCount(0)
    await expect(page.locator('[data-testid^="try-"][data-testid$="-head"]')).toHaveCount(0)
    await expect(page.getByTestId("see-example")).toBeVisible()
    await expect(page.getByTestId("chip-4-9")).toHaveAttribute("aria-checked", "false")
    expect(await store(page)).toBe(before)
    expect(errors).toEqual([])
  })

  test("2 count: 4-9 shows the after-slip and many-tries sections; Never shows the no-tries line and hides both", async ({ page }) => {
    await open(page)
    await expect(page.getByTestId("after-slip")).toHaveCount(0)
    await expect(page.getByTestId("many-tries")).toHaveCount(0)
    await tap(page, "chip-4-9")
    await expect(page.getByTestId("after-slip")).toBeVisible()
    await expect(page.getByTestId("many-tries")).toContainText("You have 4–9 tries behind you.")
    await expect(page.getByTestId("many-tries")).toContainText("An average, not a forecast for you.")
    await expect(page.getByTestId("many-tries")).not.toContainText("About 30")
    await tap(page, "many-basis-toggle")
    await expect(page.getByTestId("many-basis-detail")).toContainText("1,092")
    await expect(page.getByTestId("many-basis-detail")).toContainText("Ontario")
    await expect(page.getByTestId("many-basis-detail")).toContainText("Caveat")
    await shot(page, "03-many-390")
    await tap(page, "chip-never")
    await expect(page.getByTestId("no-tries")).toContainText("No tries yet. Your first one starts with your quit date.")
    await expect(page.getByTestId("after-slip")).toHaveCount(0)
    await expect(page.getByTestId("many-tries")).toHaveCount(0)
    // tap again clears
    await tap(page, "chip-never")
    await expect(page.getByTestId("no-tries")).toHaveCount(0)
    await expect(page.getByTestId("chip-never")).toHaveAttribute("aria-checked", "false")
    // the answer survives a reload
    await tap(page, "chip-2-3")
    await page.reload()
    await expect(page.getByTestId("chip-2-3")).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("many-tries")).toContainText("You have 2–3 tries behind you.")
  })

  test("3 three tries: longest 14 days, 2 of 2 naming an ending, the window with its basis; two tries show none", async ({ page }) => {
    await open(page)
    await addTry(page, { when: "2026-01", len: "5", ended: ["stress"] })
    await addTry(page, { when: "2026-04", len: "2", unit: "weeks" })
    await expect(page.getByTestId("pattern-longest")).toHaveText("Longest try: 14 days. From 2 tries with a length.")
    await expect(page.getByTestId("pattern-window")).toHaveCount(0)
    await expect(page.getByTestId("pattern")).toContainText("Three tries with a length show the days most of them ended in.")
    await expect(page.getByTestId("rough-note")).toHaveText("Weeks count as 7 days, months as 30, years as 365.")
    await addTry(page, { when: "2026-07", len: "9", ended: ["stress"] })
    await expect(page.getByTestId("pattern-longest")).toHaveText("Longest try: 14 days. From 3 tries with a length.")
    await expect(page.getByTestId("pattern-ending")).toHaveText("Most common ending: A bad day or stress. 2 of 2 tries naming an ending.")
    await expect(page.getByTestId("pattern-window")).toHaveText("Most of your tries ended in days 5–9. 2 of 3 tries with a length.")
    await tap(page, "window-how")
    await expect(page.getByTestId("window-why")).toContainText("The shortest span of days that holds more than half of your tries. Worked out from your own tries, not from a study.")
    await expect(page.getByTestId("chart-avg")).toHaveText("Average: 9.3 days · 3 tries with a length")
    await shot(page, "04-three-390")
  })

  test("4 typed lengths: 1,5 months is saved as 1.5; abc shows the error; a month after this month is refused", async ({ page }) => {
    await open(page)
    await tap(page, "add-try")
    await page.getByTestId("f-len").fill("1,5")
    await page.getByTestId("f-unit").selectOption("months")
    await expect(page.getByTestId("f-len-error")).toHaveCount(0)
    await tap(page, "f-save")
    await expect(page.getByTestId("past-page")).toBeVisible()
    await expect.poll(async () => (await saved(page)).tries[0]).toMatchObject({ len: 1.5, unit: "months" })
    await expect(page.getByTestId("try-0-head")).toHaveText("Date not given · 45 days")
    await expect(page.getByTestId("rough-note")).toBeVisible()
    await tap(page, "add-try")
    await page.getByTestId("f-len").fill("abc")
    await expect(page.getByTestId("f-len-error")).toHaveText("Type a number, like 3")
    await expect(page.getByTestId("f-save")).toBeDisabled()
    await page.getByTestId("f-len").fill("3")
    await expect(page.getByTestId("f-len-error")).toHaveCount(0)
    await expect(page.getByTestId("f-save")).toBeEnabled()
    await page.getByTestId("f-when").fill("2026-12")
    await expect(page.getByTestId("f-when-error")).toBeVisible()
    await expect(page.getByTestId("f-save")).toBeDisabled()
    await page.getByTestId("f-when").fill("2026-11")
    await expect(page.getByTestId("f-when-error")).toHaveCount(0)
    await expect(page.getByTestId("f-save")).toBeEnabled()
    await page.getByTestId("f-when").fill("")
    await page.getByTestId("f-len").fill("")
    await expect(page.getByTestId("f-save")).toBeDisabled()
    await expect(page.getByTestId("try-form")).toContainText("Fill in at least one field.")
    // 1 to 999: a year length reads as years
    await page.getByTestId("f-len").fill("2")
    await page.getByTestId("f-unit").selectOption("years")
    await tap(page, "f-save")
    await expect(page.getByTestId("try-1-head")).toHaveText("Date not given · about 2 years")
  })

  test("5 list and chart are in month order whatever order they were added; bars carry month labels", async ({ page }) => {
    await open(page)
    await addTry(page, { when: "2026-07", len: "9" })
    await addTry(page, { len: "4" })
    await addTry(page, { when: "2025-02", len: "5" })
    await addTry(page, { when: "2026-03", len: "2", unit: "weeks" })
    await addTry(page, { when: "2026-05" })
    expect(await heads(page)).toEqual(["Jul 2026 · 9 days", "May 2026 · No length given", "Mar 2026 · 14 days", "Feb 2025 · 5 days", "Date not given · 4 days"])
    const months = await page.locator('[data-testid^="bar-"][data-testid$="-month"]').allTextContents()
    expect(months).toEqual(["Feb 25", "Mar 26", "Jul 26", "—"])
    const tops = await page.locator('[data-testid^="bar-"][data-testid$="-top"]').allTextContents()
    expect(tops).toEqual(["5", "14", "9", "4"])
    await expect(page.getByTestId("avg-line")).toBeVisible()
    await shot(page, "05-order-390")
    expect(await page.getByTestId("chart-scroll").evaluate((e) => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).overflowX === "auto")).toBe(true)
  })

  test("6 delete asks first, says Removed with Undo, and Undo puts the try back in its place", async ({ page }) => {
    await open(page)
    await addTry(page, { when: "2026-01", len: "3" })
    await addTry(page, { when: "2026-03", len: "5" })
    await addTry(page, { when: "2026-05", len: "7" })
    const before = await heads(page)
    expect(before).toEqual(["May 2026 · 7 days", "Mar 2026 · 5 days", "Jan 2026 · 3 days"])
    await tap(page, "try-1-delete")
    await expect(page.getByTestId("try-1-confirm")).toHaveText("Delete this try")
    await tap(page, "try-1-keep")
    expect(await heads(page)).toEqual(before)
    await tap(page, "try-1-delete")
    await tap(page, "try-1-confirm")
    await expect(page.getByTestId("removed")).toContainText("Removed.")
    expect(await heads(page)).toEqual(["May 2026 · 7 days", "Jan 2026 · 3 days"])
    await tap(page, "undo")
    await expect(page.getByTestId("removed")).toHaveCount(0)
    expect(await heads(page)).toEqual(before)
    expect((await saved(page)).tries.map((t: { len: number }) => t.len)).toEqual([3, 5, 7])
  })

  test("7 every after-slip answer has its reply; Just this once shows b4's counterpart and the Kenford fact card", async ({ page }) => {
    await open(page)
    await tap(page, "chip-2-3")
    await expect(page.locator('[data-testid^="slip-reply-"]')).toHaveCount(0)
    await expect(page.getByTestId("fact-card")).toHaveCount(0)
    await tap(page, "chip-gaveUp")
    await expect(page.getByTestId("slip-reply-gaveUp")).toContainText("That first slip is where most tries end. A slip ends a run, not the quit: save it, keep your days, pick a new day 1.")
    await expect(page.getByTestId("slip-reply-gaveUp")).toContainText(liveTools.includes("slip") ? "Slipped? Restart today" : "Next time, go back through steps 1–3 the same day.")
    await expect(page.getByTestId("fact-card")).toBeVisible()
    await tap(page, "chip-restarted")
    await expect(page.getByTestId("slip-reply-restarted")).toHaveText("Keep doing that. Going back through steps 1–3 the same day is step 3 of the plan.")
    await tap(page, "chip-dontRemember")
    await expect(page.getByTestId("slip-reply-dontRemember")).toHaveText("Next time, notice the first thought after a slip and write it down.")
    await tap(page, "chip-justOnce")
    const reply = page.getByTestId("slip-reply-justOnce")
    await expect(reply).toContainText("That is one of the 12 lies.")
    await expect(reply).toContainText(b4.counterpart)
    const card = page.getByTestId("fact-card")
    await expect(card).toContainText(b4.proof)
    await expect(card).toContainText(b4.counted)
    await expect(card.getByRole("button", { name: "Source" })).toBeVisible()
    await card.getByRole("button", { name: /^Source/ }).click()
    await expect(card).toContainText("Kenford")
    await shot(page, "06-justonce-390")
    // a second tap on the same answer clears it
    await tap(page, "chip-justOnce")
    await expect(page.getByTestId("fact-card")).toHaveCount(0)
  })

  test("8 wave-1 state in storage shows as count 2-3, one try of 3 weeks, its endings, the gave-up reply", async ({ page }) => {
    await page.clock.install({ time: NOW })
    await page.goto(URL)
    await page.evaluate(() => {
      const w1 = { done: 4, tries: "2-3", stretchN: 3, stretchUnit: "weeks", lastEnded: "year", endings: ["stress", "offered"], helped: ["told"], afterSlip: "gaveUp", result: null }
      localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { past: w1 } }))
    })
    await page.reload()
    await expect(page.getByTestId("chip-2-3")).toHaveAttribute("aria-checked", "true")
    await expect(page.locator('[data-testid^="try-"][data-testid$="-head"]')).toHaveCount(1)
    await expect(page.getByTestId("try-0-head")).toHaveText("Date not given · 21 days")
    await expect(page.getByTestId("try-0")).toContainText("A bad day or stress, Someone offered one")
    await expect(page.getByTestId("try-0")).toContainText("Told someone")
    await expect(page.getByTestId("slip-reply-gaveUp")).toBeVisible()
    // the old shape is read once: the first change saves the new shape and keeps the try
    await tap(page, "chip-4-9")
    const s = await saved(page)
    expect(s).toMatchObject({ v: 2, count: "4-9", afterSlip: "gaveUp" })
    expect(s.tries).toHaveLength(1)
    expect(s.tries[0]).toMatchObject({ len: 3, unit: "weeks", ended: ["stress", "offered"], helped: ["told"] })
  })

  test("9 the form: Back closes it unsaved, reload keeps it open, edit shows the saved try, a double tap saves one, a long word does not widen", async ({ page }) => {
    await open(page)
    await tap(page, "add-try")
    await expect(page).toHaveURL(/try=new/)
    await page.getByTestId("f-len").fill("4")
    await page.goBack()
    await expect(page.getByTestId("past-page")).toBeVisible()
    await expect(page.locator('[data-testid^="try-"][data-testid$="-head"]')).toHaveCount(0)
    expect(await saved(page)).toBeUndefined()
    await tap(page, "add-try")
    await page.reload()
    await expect(page.getByTestId("try-form")).toBeVisible()
    await expect(page.getByTestId("f-len")).toHaveValue("")
    // a double tap on Save makes one try
    await page.getByTestId("f-len").fill("6")
    await page.getByTestId("f-ended-text").fill("x".repeat(200))
    await expect(page.getByTestId("f-ended-text")).toHaveValue("x".repeat(60))
    await noSideways(page)
    await page.getByTestId("f-save").dblclick()
    await expect(page.getByTestId("past-page")).toBeVisible()
    await expect(page.locator('[data-testid^="try-"][data-testid$="-head"]')).toHaveCount(1)
    expect((await saved(page)).tries).toHaveLength(1)
    await noSideways(page)
    // the history is clean: one Back leaves the page, not an old form
    await expect(page).not.toHaveURL(/try=/)
    // edit shows the saved try, reload keeps it open
    await tap(page, "try-0-edit")
    await expect(page.getByTestId("try-form")).toContainText("Edit this try")
    await expect(page.getByTestId("f-len")).toHaveValue("6")
    await page.reload()
    await expect(page.getByTestId("try-form")).toContainText("Edit this try")
    await expect(page.getByTestId("f-len")).toHaveValue("6")
    await page.getByTestId("f-len").fill("8")
    await tap(page, "f-save")
    await expect(page.getByTestId("try-0-head")).toHaveText("Date not given · 8 days")
    expect((await saved(page)).tries).toHaveLength(1)
    // Cancel leaves the try as it was
    await tap(page, "try-0-edit")
    await page.getByTestId("f-len").fill("99")
    await tap(page, "f-cancel")
    await expect(page.getByTestId("try-0-head")).toHaveText("Date not given · 8 days")
    // ?preview=1 is kept through the form
    await tap(page, "add-try")
    await expect(page).toHaveURL(/preview=1/)
    await shot(page, "07-form-390")
  })

  test("10 no link to a tool that is not live; no Used in, Keep these in your plan or lab only text", async ({ page }) => {
    await open(page)
    await addTry(page, { when: "2026-01", len: "5", ended: ["stress"], helped: ["told"] })
    await tap(page, "chip-2-3")
    await tap(page, "chip-gaveUp")
    const body = page.locator("main")
    for (const bad of [/Used in/i, /Keep these in your plan/i, /lab only/i, /Risky moments for your if-then/i, /Clear my answers/i]) await expect(body).not.toContainText(bad)
    const hrefs = await page.locator("main a[href^='/quit/nicotine/']").evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""))
    for (const h of hrefs) {
      const tool = h.split("/")[3].split("?")[0]
      expect(liveTools, h).toContain(tool)
    }
    for (const tool of ["slip", "beliefs", "ifthen", "record"]) if (!liveTools.includes(tool)) expect(hrefs.some((h) => h.includes(`/${tool}`))).toBe(false)
    // the next section names only what is live; the record line is plain text while it is not
    await expect(page.getByTestId("next-date")).toHaveCount(liveTools.includes("date") ? 1 : 0)
    if (liveTools.includes("record")) await expect(page.getByTestId("next-record")).toHaveText("See the runs since your quit date in Your record")
    else await expect(page.getByTestId("next")).toContainText("Runs since your quit date are in Your record.")
    await expect(page.getByTestId("next-ifthen")).toHaveCount(liveTools.includes("ifthen") ? 1 : 0)
    if (liveTools.includes("date")) {
      await expect(page.getByTestId("next-date")).toHaveText("Pick your next day 1")
      expect(await page.getByTestId("next-date").getAttribute("href")).toContain("preview=1")
    }
  })

  test("11 no console error, no sideways scroll, every tap target 44 px; the menu names the tool", async ({ page }) => {
    const errors: string[] = []
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
    page.on("pageerror", (e) => errors.push(e.message))
    await open(page)
    await addTry(page, { when: "2026-01", len: "5", ended: ["stress"], helped: ["told"] })
    await addTry(page, { when: "2026-03", len: "2", unit: "weeks", ended: ["stress"] })
    await addTry(page, { when: "2026-05", len: "9" })
    await tap(page, "chip-4-9")
    await tap(page, "chip-justOnce")
    await tap(page, "window-how")
    await tap(page, "many-basis-toggle")
    await tap(page, "try-0-delete")
    expect(await small(page)).toEqual([])
    await noSideways(page)
    await tap(page, "try-0-keep")
    await tap(page, "add-try")
    expect(await small(page)).toEqual([])
    await noSideways(page)
    await shot(page, "08-form-bottom-390")
    await page.goBack()
    expect(errors).toEqual([])
    await page.goto(quitUrl("/quit/nicotine"))
    await expect(page.getByTestId("row-past")).toContainText("Your past attempts")
    await expect(page.getByTestId("row-past")).toContainText("How often you tried, what lasted, what ended it.")
    if (liveTools.includes("past")) {
      await page.getByTestId("row-past").click()
      await expect(page.getByTestId("past-page")).toBeVisible()
    }
  })
})

test.describe("past attempts at 1280", () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false })

  test("the same page in the page column, with the example, no sideways scroll", async ({ page }) => {
    await open(page)
    await tap(page, "see-example")
    await expect(page.getByTestId("chart")).toBeVisible()
    await tap(page, "chip-justOnce")
    await tap(page, "window-how")
    await tap(page, "many-basis-toggle")
    await noSideways(page, 1280)
    const w = await page.getByTestId("past-page").evaluate((e) => e.getBoundingClientRect().width)
    expect(w).toBeLessThanOrEqual(720)
    expect(await small(page)).toEqual([])
    await shot(page, "09-example-1280")
    await tap(page, "example-clear")
    await addTryDesktop(page)
    await shot(page, "10-form-1280")
    await noSideways(page, 1280)
  })
})

async function addTryDesktop(page: Page) {
  await tap(page, "add-try")
  await expect(page.getByTestId("try-form")).toBeVisible()
  await expect(page.getByTestId("f-when")).toBeVisible()
}
