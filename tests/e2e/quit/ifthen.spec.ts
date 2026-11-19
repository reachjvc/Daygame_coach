/**
 * QUIT TOOL 7, IF-THEN PLAN (/quit/nicotine/ifthen), acceptance 1 to 10 of Plans/quit-finish.md.
 *
 * Runs at 390x844 (touch) and 1280x800. The clock is fixed (Thursday 2026-11-19, 10:00). State lives in the
 * browser (`quit-v1`, `vice-blackbox-v1`); signed out, nothing reaches a server. Expected texts come from the data
 * file. With QUIT_SHOTS_DIR set it saves a screenshot of each screen.
 */

import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotineJson from "../../../src/quit/data/nicotine.json"

const data = nicotineJson as unknown as {
  riskyMoments: { id: string; label: string }[]
  momentSwaps: { momentId: string; cards: string[] }[]
  responses: { id: string; text: string }[]
}
const URL = quitUrl("/quit/nicotine/ifthen")
const NOW = new Date("2026-11-19T10:00:00")
const swapsOf = (id: string) => data.momentSwaps.find((s) => s.momentId === id)!.cards
const idea = (id: string) => data.responses.find((r) => r.id === id)!.text
const label = (id: string) => data.riskyMoments.find((m) => m.id === id)!.label
const stop = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`)

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}
async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}
/** Every visible button, link and field inside the tool is at least 44 px high. */
async function bigEnough(page: Page) {
  const small = await page.evaluate(() => {
    const out: string[] = []
    const root = document.querySelector('[data-testid="question"], [data-testid="result"], [data-testid="print-view"]')
    root?.querySelectorAll<HTMLElement>("button, a, input").forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return
      if (r.height < 43.5) out.push(`${el.getAttribute("data-testid") ?? el.textContent} ${Math.round(r.height)}`)
    })
    return out
  })
  expect(small).toEqual([])
}
async function tap(page: Page, id: string) {
  await page.getByTestId(id).click()
  await page.clock.runFor(300)
}

/** A Black Box with one living nicotine run and the given reports, written the way it keeps it. */
function box(reports: { where: string; wentThrough: boolean }[]) {
  const stamp = new Date().toISOString()
  const attemptId = randomUUID()
  return {
    version: 1,
    attempts: [{ id: attemptId, viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-11-01", startedBy: "", structure: [], endedOn: null, endedByReportId: null, updatedAt: stamp, deletedAt: null }],
    reports: reports.map((r, i) => ({
      id: randomUUID(),
      attemptId,
      at: `2026-11-1${i}T12:00:00`,
      wentThrough: r.wentThrough,
      thought: "",
      ending: "other",
      closeness: null,
      withWhom: "",
      where: r.where,
      factors: [],
      didInstead: "",
      updatedAt: stamp,
      deletedAt: null,
    })),
  }
}

async function open(page: Page, blackBox?: unknown) {
  await page.clock.install({ time: NOW })
  if (blackBox) {
    await page.goto(URL)
    await page.evaluate((bb) => window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(bb)), blackBox)
  }
  await page.goto(URL)
}
/** Ticks the moments, walks the "then" screens with the picks, and lands on the plan. */
async function build(page: Page, steps: { moment?: string; own?: string; swap?: number; idea?: string; ownThen?: string }[]) {
  for (const s of steps) {
    if (s.moment) await page.getByTestId(`moment-${s.moment}`).click()
    if (s.own) {
      await page.getByTestId("own-moment").fill(s.own)
      await page.getByTestId("own-moment-add").click()
    }
  }
  await tap(page, "pick-next")
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (s.swap !== undefined) await page.getByTestId(`swap-${s.swap}`).click()
    if (s.idea) await page.getByTestId(`idea-${s.idea}`).click()
    if (s.ownThen) await page.getByTestId("own-then").fill(s.ownThen)
    await tap(page, i === steps.length - 1 ? "see-plan" : "then-next")
  }
  await expect(page.getByTestId("result")).toBeVisible()
}

const SIZES = [
  { name: "phone", viewport: { width: 390, height: 844 }, touch: true },
  { name: "desktop", viewport: { width: 1280, height: 800 }, touch: false },
] as const

for (const size of SIZES) {
  test.describe(`if-then plan, ${size.name}`, () => {
    test.use({ storageState: SIGNED_OUT, viewport: size.viewport, hasTouch: size.touch, isMobile: size.touch })

    test("1 fresh: two moments, Tool 2's three cards, a quick idea, the plan", async ({ page }) => {
      await open(page)
      await expect(page.getByTestId("banner")).toHaveCount(0)
      await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0)
      await expect(page.getByTestId("pick-next")).toBeDisabled()
      await expect(page.getByText("Tick at least one moment.")).toBeVisible()
      await expect(page.locator('[data-testid^="moment-"]')).toHaveCount(data.riskyMoments.length)
      await shot(page, `1-pick-${size.name}`)
      await page.getByTestId("moment-after-food").click()
      await page.getByTestId("moment-driving").click()
      await tap(page, "pick-next")
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 1 of 2")
      const cards = page.getByTestId("swap-0").locator("xpath=ancestor::div[@role='radiogroup']").locator('[role="radio"]')
      await expect(cards).toHaveText(swapsOf("after-food"))
      await expect(page.getByTestId("see-plan")).toHaveCount(0)
      await expect(page.getByTestId("then-next")).toBeDisabled()
      await expect(page.getByTestId("ev-list")).toBeVisible()
      await expect(page.locator('[data-testid^="idea-"]')).toHaveCount(8)
      await expect(page.getByTestId("idea-reasons")).toHaveCount(0)
      await expect(page.getByTestId("idea-craving")).toHaveCount(0)
      await page.getByTestId("swap-1").click()
      await expect(page.getByTestId("live-card-if")).toHaveText(label("after-food"))
      await expect(page.getByTestId("live-card-then")).toHaveText(swapsOf("after-food")[1])
      await shot(page, `1-then-${size.name}`)
      await tap(page, "then-next")
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 2 of 2")
      await expect(page.getByTestId("ev-list")).toHaveCount(0)
      await page.getByTestId("idea-water").click()
      await tap(page, "see-plan")
      await expect(page.getByTestId("result")).toBeVisible()
      await expect(page.getByTestId("card-0-text-if")).toHaveText(label("after-food"))
      await expect(page.getByTestId("card-0-text-then")).toHaveText(swapsOf("after-food")[1])
      await expect(page.getByTestId("card-1-text-if")).toHaveText(label("driving"))
      await expect(page.getByTestId("card-1-text-then")).toHaveText(stop(idea("water")))
      await expect(page.getByTestId("kept-here")).toHaveText("Your plan is kept on this phone.")
      await shot(page, `1-plan-${size.name}`)
    })

    test("2 own moment and own then; the nudge shows for a won't and not for 'stop at the shop'", async ({ page }) => {
      await open(page)
      await build(page, [{ own: "Payday", ownThen: "go to the gym" }])
      await expect(page.getByTestId("card-0-text-if")).toHaveText("Payday")
      await expect(page.getByTestId("card-0-text-then")).toHaveText("go to the gym.")
      await expect(page.getByTestId("card-0-text")).toContainText("If Payday")
      await tap(page, "add-more")
      await tap(page, "pick-next")
      const own = page.getByTestId("own-then")
      await own.fill("I won't smoke")
      await expect(page.getByTestId("nudge")).toBeVisible()
      await expect(page.getByTestId("nudge")).toContainText("Say what you will do instead.")
      await shot(page, `2-nudge-${size.name}`)
      await own.fill("stop at the shop")
      await expect(page.getByTestId("nudge")).toHaveCount(0)
      await own.fill("   ")
      await expect(page.getByTestId("see-plan")).toBeDisabled()
    })

    test("3 pre-ticks from the Black Box saves, and nothing when nothing is saved", async ({ page }) => {
      await open(
        page,
        box([
          { where: "driving", wentThrough: false },
          { where: "driving", wentThrough: false },
          { where: "driving", wentThrough: false },
          { where: "after-food", wentThrough: false },
        ]),
      )
      await expect(page.getByTestId("moment-driving")).toHaveAttribute("aria-pressed", "true")
      await expect(page.getByTestId("moment-after-food")).toHaveAttribute("aria-pressed", "true")
      await expect(page.locator('[aria-pressed="true"]')).toHaveCount(2)
      await expect(page.getByTestId("banner")).toHaveText(`Ticked from your saves in Craving now? and Slipped?: ${label("driving")} (3), ${label("after-food")} (1). Change them if they're wrong.`)
      await shot(page, `3-pre-${size.name}`)
      // untick one: the banner counts what is really ticked
      await page.getByTestId("moment-after-food").click()
      await expect(page.getByTestId("banner")).toHaveText(`Ticked from your saves in Craving now? and Slipped?: ${label("driving")} (3). Change them if they're wrong.`)
      // reload keeps the ticks
      await page.reload()
      await expect(page.locator('[aria-pressed="true"]')).toHaveCount(1)
      await expect(page.getByTestId("moment-driving")).toHaveAttribute("aria-pressed", "true")
    })

    test("3b nothing saved: nothing ticked, no banner", async ({ page }) => {
      await open(page, box([]))
      await expect(page.getByTestId("pick-next")).toBeVisible()
      await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0)
      await expect(page.getByTestId("banner")).toHaveCount(0)
    })

    test("4 unticking a moment takes its line out; Undo brings it back", async ({ page }) => {
      await open(page)
      await build(page, [
        { moment: "driving", swap: 0 },
        { moment: "coffee", idea: "gum" },
      ])
      await tap(page, "add-more")
      await expect(page.getByTestId("moment-driving")).toHaveAttribute("aria-pressed", "true")
      await page.getByTestId("moment-driving").click()
      await tap(page, "pick-next")
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 1 of 1")
      await expect(page.getByTestId("live-card-then")).toHaveText(stop(idea("gum")))
      await tap(page, "see-plan")
      await expect(page.locator('[data-testid^="card-"][data-testid$="-text"]')).toHaveCount(1)
      await expect(page.getByTestId("removed")).toContainText(`Removed: ${label("driving")}.`)
      await shot(page, `4-removed-${size.name}`)
      await tap(page, "undo")
      await expect(page.locator('[data-testid^="card-"][data-testid$="-text"]')).toHaveCount(2)
      await expect(page.getByTestId("card-0-text-if")).toHaveText(label("driving"))
      await expect(page.getByTestId("card-1-text-if")).toHaveText(label("coffee"))
    })

    test("5 remove and undo, move up and down survives reload, an empty change cannot be saved", async ({ page }) => {
      await open(page)
      await build(page, [
        { moment: "stress", idea: "breathe" },
        { moment: "bored", idea: "teeth" },
        { moment: "coffee", idea: "gum" },
      ])
      await expect(page.getByTestId("card-0-up")).toBeDisabled()
      await expect(page.getByTestId("card-2-down")).toBeDisabled()
      await expect(page.getByTestId("card-0-up")).toHaveAttribute("aria-label", "Move up")
      await expect(page.getByTestId("card-0-down")).toHaveAttribute("aria-label", "Move down")
      await tap(page, "card-1-remove")
      await expect(page.getByTestId("removed")).toBeVisible()
      await expect(page.locator('[data-testid^="card-"][data-testid$="-text"]')).toHaveCount(2)
      await tap(page, "undo")
      await expect(page.getByTestId("card-1-text-if")).toHaveText("I’m bored")
      await tap(page, "card-2-up")
      await expect(page.getByTestId("card-1-text-if")).toHaveText(label("coffee"))
      await tap(page, "card-0-down")
      await expect(page.getByTestId("card-0-text-if")).toHaveText(label("coffee"))
      await page.reload()
      await expect(page.getByTestId("card-0-text-if")).toHaveText(label("coffee"))
      await expect(page.getByTestId("card-1-text-if")).toHaveText("I’m stressed")
      await expect(page.getByTestId("card-2-text-if")).toHaveText(label("bored"))
      await tap(page, "card-0-change")
      await expect(page.getByTestId("card-0-done")).toBeEnabled()
      await page.getByTestId("edit-0-own-then").fill("x")
      await page.getByTestId("edit-0-own-then").fill("")
      await expect(page.getByTestId("card-0-done")).toBeDisabled()
      await page.getByTestId("edit-0-own-then").fill("stand outside")
      await shot(page, `5-edit-${size.name}`)
      await tap(page, "card-0-done")
      await expect(page.getByTestId("card-0-text-then")).toHaveText("stand outside.")
    })

    test("6 check back in 1 week; eight days on: Did these work?, Kept / Change, then Set a new date", async ({ page }) => {
      await open(page)
      await build(page, [
        { moment: "stress", idea: "breathe" },
        { moment: "bored", idea: "teeth" },
      ])
      await expect(page.getByTestId("check-back")).toContainText("When should the plan ask you: did these work?")
      await expect(page.getByTestId("due-banner")).toHaveCount(0)
      await tap(page, "check-1w")
      await expect(page.getByTestId("check-shown")).toHaveText("The plan will ask you on Thu 26 Nov.")
      await shot(page, `6-checkback-${size.name}`)
      await page.clock.setSystemTime(new Date("2026-11-27T10:00:00"))
      await page.reload()
      await expect(page.getByTestId("due-banner")).toContainText("Did these work?")
      await expect(page.getByTestId("due-new")).toHaveCount(0)
      await shot(page, `6-due-${size.name}`)
      await tap(page, "kept-0")
      await tap(page, "change-1")
      await expect(page.getByTestId("card-1-edit")).toBeVisible()
      await expect(page.getByTestId("due-summary")).toHaveText("1 kept, 1 to change, 0 not answered.")
      await expect(page.getByTestId("due-new")).toBeVisible()
      await tap(page, "due-new")
      await expect(page.getByTestId("due-banner")).toHaveCount(0)
      await expect(page.getByTestId("check-1w")).toBeVisible()
      await tap(page, "check-2w")
      await expect(page.getByTestId("check-shown")).toHaveText("The plan will ask you on Fri 11 Dec.")
    })

    test("7 Craving now? shows his plan line first for a moment that has one", async ({ page }) => {
      await open(page)
      await build(page, [{ moment: "after-food", ownThen: "go to the gym" }])
      await page.goto(quitUrl("/quit/nicotine/sos"))
      await tap(page, "tile-help")
      await page.getByTestId("chip-after-food").click()
      const items = page.getByTestId("help-cards").locator("li")
      await expect(items).toHaveCount(4)
      await expect(items.first()).toHaveAttribute("data-testid", "help-plan")
      await expect(items.first()).toContainText("Your plan")
      await expect(items.first()).toContainText("go to the gym.")
      await expect(page.getByTestId("help-card")).toHaveText(swapsOf("after-food"))
      await shot(page, `7-sos-${size.name}`)
      await page.getByTestId("chip-coffee").click()
      await expect(page.getByTestId("help-plan")).toHaveCount(0)
      await expect(page.getByTestId("help-card")).toHaveText(swapsOf("coffee"))
    })

    test("8 reload resumes on every screen; browser Back steps back; a double tap moves one screen", async ({ page }) => {
      await open(page)
      await page.getByTestId("moment-coffee").click()
      await page.getByTestId("moment-stress").click()
      await page.reload()
      await expect(page.locator('[aria-pressed="true"]')).toHaveCount(2)
      await page.getByTestId("pick-next").dblclick()
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 1 of 2")
      await page.getByTestId("swap-2").click()
      await page.reload()
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 1 of 2")
      await expect(page.getByTestId("live-card-then")).toHaveText(swapsOf("coffee")[2])
      await expect(page.getByTestId("swap-2")).toHaveAttribute("aria-checked", "true")
      await page.getByTestId("then-next").dblclick()
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 2 of 2")
      await page.getByTestId("own-then").fill("walk to the shop")
      await page.reload()
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 2 of 2")
      await expect(page.getByTestId("own-then")).toHaveValue("walk to the shop")
      await page.goBack()
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 1 of 2")
      await page.goBack()
      await expect(page.getByTestId("pick-next")).toBeVisible()
      await expect(page.locator('[aria-pressed="true"]')).toHaveCount(2)
      await page.goForward()
      await page.goForward()
      await tap(page, "see-plan")
      await expect(page.getByTestId("result")).toBeVisible()
      await page.reload()
      await expect(page.getByTestId("result")).toBeVisible()
      await expect(page.getByTestId("card-1-text-then")).toHaveText("walk to the shop.")
      await page.goBack()
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 2 of 2")
      // in-page Back
      await tap(page, "screen-back")
      await expect(page.getByTestId("moment-of")).toHaveText("Moment 1 of 2")
    })

    test("9 print view shows the cards and the date, and only Print and Back as controls", async ({ page }) => {
      await open(page)
      await build(page, [
        { moment: "stress", idea: "breathe" },
        { own: "Payday", ownThen: "go to the gym" },
      ])
      await tap(page, "check-2w")
      await tap(page, "print-open")
      await expect(page.getByTestId("print-view")).toBeVisible()
      await expect(page.getByTestId("print-card-0-text-if")).toHaveText("I’m stressed")
      await expect(page.getByTestId("print-card-1-text-then")).toHaveText("go to the gym.")
      await expect(page.getByTestId("print-check")).toContainText("Thu 3 Dec")
      await expect(page.getByTestId("print-view").locator("button")).toHaveCount(2)
      await expect(page.getByTestId("print-go")).toHaveText("Print")
      await expect(page.getByTestId("print-close")).toHaveText("Back to my plan")
      await shot(page, `9-print-${size.name}`)
      await page.emulateMedia({ media: "print" })
      await expect(page.getByTestId("print-go")).toBeHidden()
      await expect(page.getByTestId("print-card-0")).toBeVisible()
      await page.emulateMedia({ media: "screen" })
      await tap(page, "print-close")
      await expect(page.getByTestId("card-0")).toBeVisible()
    })

    test("10 no console error, no sideways scroll, 44 px taps, a 160-character unbroken text, the menu row", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(e.message))
      await open(page)
      await noSideways(page)
      await bigEnough(page)
      await page.getByTestId("moment-coffee").click()
      await page.getByTestId("own-moment").fill("m".repeat(80))
      await page.getByTestId("own-moment-add").click()
      await noSideways(page)
      await bigEnough(page)
      await tap(page, "pick-next")
      await noSideways(page)
      await bigEnough(page)
      await page.getByTestId("idea-gum").click()
      await tap(page, "then-next")
      const long = "x".repeat(160)
      await page.getByTestId("own-then").fill(long)
      await expect(page.getByTestId("own-then")).toHaveValue(long)
      await noSideways(page)
      await tap(page, "see-plan")
      await expect(page.getByTestId("result")).toBeVisible()
      await noSideways(page)
      await bigEnough(page)
      await tap(page, "check-1w")
      await tap(page, "card-1-change")
      await noSideways(page)
      await bigEnough(page)
      await tap(page, "print-open")
      await noSideways(page)
      await bigEnough(page)
      await tap(page, "print-close")
      expect(errors).toEqual([])
      // the menu row carries the new name and line, and opens the tool
      await page.goto(quitUrl("/quit/nicotine"))
      const row = page.getByTestId("row-ifthen")
      await expect(row).toContainText("If-then plan")
      await expect(row).toContainText("Your riskiest moments, and what you'll do there instead.")
      await noSideways(page)
      // it is live: the row is a link that opens the tool
      await row.click()
      await expect(page).toHaveURL(/\/quit\/nicotine\/ifthen/)
      await expect(page.locator("[data-testid=result], [data-testid=moment-after-food]").first()).toBeVisible()
    })
  })
}
