/**
 * THE IMPROVED IF-THEN PLAN (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: pick two moments, pick a "then" for each (one from the list with its evidence
 * chip and source, one typed), the "won't" nudge, plan cards (edit, reorder), importance, confidence and
 * check-in date, "Did these work?" on the date, the print view, the "used in: SOS" line, the addiction
 * switcher. State lives in the browser (`quit-lab-v1`); nothing is written to the database.
 * Shots of every screen go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/ifthen/shots-ours/best")
const URL = "/quit/lab/ifthen/best?preview=1"

let n = 0
test.beforeAll(() => {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
})

async function shot(page: Page, name: string, width = 390) {
  n++
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
}

const dateKey = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function open(page: Page) {
  expect((await page.goto(URL))?.status()).toBe(200)
  await expect(page.getByTestId("step-pick")).toBeVisible()
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
}

test("two moments, a listed then and a typed then, the nudge, the plan, check-in, print, SOS line", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await open(page)

  // step 1: nothing ticked, next disabled, the quitting line with its basis
  await expect(page.getByTestId("sit-next")).toBeDisabled()
  await expect(page.getByTestId("ev-quitting")).toContainText("Across 12 studies of people trying to quit smoking")
  await shot(page, "pick-empty")
  await page.getByTestId("ev-quitting-basis").click()
  await page.getByTestId("ev-quitting-detail").getByRole("button", { name: "Source" }).click()
  await expect(page.getByTestId("ev-quitting-detail")).toContainText("average 10.7% quit rate for intervention participants (4.9% in controls)")
  await shot(page, "pick-basis")
  await page.getByTestId("ev-quitting-basis").click()

  await page.getByTestId("sit-after-food").click()
  await page.getByTestId("sit-custom-input").fill("Sam calls")
  await page.getByTestId("sit-custom-add").click()
  await expect(page.getByTestId("sit-own-0")).toHaveText("Sam calls")
  await shot(page, "pick-two")
  await page.getByTestId("sit-next").click()

  // step 2, moment 1: a listed then with its evidence chip and source
  await expect(page.getByTestId("sentence")).toHaveText("If it is after a meal, then I ….")
  await expect(page.getByTestId("then-next")).toBeDisabled()
  await page.getByTestId("then-water").click()
  await expect(page.getByTestId("sentence")).toHaveText("If it is after a meal, then I drink a glass of water, slowly.")
  await expect(page.getByTestId("ev-list")).toContainText("In one trial of 193 smokers")
  await shot(page, "then-quick")
  await page.getByTestId("group-1").click()
  await page.getByTestId("then-move5").click()
  await expect(page.getByTestId("then-move5").getByTestId("evidence-strong")).toBeVisible()
  await page.getByTestId("picked-source").getByRole("button", { name: "Source" }).click()
  await expect(page.getByTestId("picked-source")).toContainText("remained reduced for up to 50 minutes after exercise")
  await shot(page, "then-swap-source")
  await page.getByTestId("then-next").click()

  // moment 2: typed then; the won't nudge; the basis on tap; a replacement clears it
  await expect(page.getByTestId("sentence")).toHaveText("If Sam calls, then I ….")
  await page.getByTestId("own-then").fill("I won't pick up")
  await expect(page.getByTestId("nudge")).toContainText("Say what you will do instead.")
  await shot(page, "then-nudge")
  await page.getByTestId("nudge-why").click()
  await expect(page.getByTestId("nudge-ev")).toContainText("made the habit stronger")
  await page.getByTestId("nudge-ev-basis").click()
  await page.getByTestId("nudge-ev-detail").getByRole("button", { name: "Source" }).click()
  await expect(page.getByTestId("nudge-ev-detail")).toContainText("negation implementation intentions resulted in cognitive ironic rebound effects")
  await shot(page, "then-nudge-basis")
  await page.getByTestId("own-then").fill("I will let it ring and go outside")
  await expect(page.getByTestId("nudge")).toHaveCount(0)
  await expect(page.getByTestId("sentence")).toHaveText("If Sam calls, then I let it ring and go outside.")
  await page.getByTestId("see-plan").click()

  // plan cards: text, edit, reorder
  await expect(page.getByTestId("card-text-0")).toHaveText("If it is after a meal, then I walk or climb stairs for five minutes.")
  await expect(page.getByTestId("card-text-1")).toHaveText("If Sam calls, then I let it ring and go outside.")
  await shot(page, "plan")
  await page.getByTestId("card-edit-1").click()
  await page.getByTestId("card-input-1").fill("not answer")
  await expect(page.getByTestId("card-nudge-1")).toBeVisible()
  await page.getByTestId("card-input-1").fill("text him later")
  await expect(page.getByTestId("card-text-1")).toHaveText("If Sam calls, then I text him later.")
  await shot(page, "plan-edit")
  await page.getByTestId("card-up-1").click()
  await expect(page.getByTestId("card-text-0")).toHaveText("If Sam calls, then I text him later.")
  await expect(page.getByTestId("card-up-0")).toBeDisabled()

  // importance, confidence, check-in date, SOS line
  await page.getByTestId("imp-8").click()
  await page.getByTestId("conf-6").click()
  await expect(page.getByTestId("imp-8")).toHaveAttribute("aria-checked", "true")
  await page.getByTestId("checkin-date").fill(dateKey(7))
  await expect(page.getByTestId("due-banner")).toHaveCount(0)
  await expect(page.getByTestId("used-in")).toContainText("Used in: SOS")
  await page.getByTestId("sos-toggle").click()
  await expect(page.getByTestId("sos-toggle")).toHaveAttribute("aria-checked", "true")
  await shot(page, "plan-settings")

  // the check-in date is today: "Did these work?"
  await page.getByTestId("checkin-today").click()
  await expect(page.getByTestId("due-banner")).toContainText("Did these work?")
  await expect(page.getByTestId("due-summary")).toHaveText("0 kept, 0 to change, 2 not answered.")
  await page.getByTestId("kept-0").click()
  await page.getByTestId("change-1").click()
  await expect(page.getByTestId("due-summary")).toHaveText("1 kept, 1 to change, 0 not answered.")
  await expect(page.getByTestId("card-input-1")).toBeVisible()
  await shot(page, "plan-due")
  await page.getByTestId("due-new").click()
  await expect(page.getByTestId("due-banner")).toHaveCount(0)
  await page.getByTestId("checkin-today").click()

  // print view: plain cards, the paper line, back
  await page.getByTestId("print-open").click()
  await expect(page.getByTestId("print-card-0")).toHaveText("If Sam calls, then I text him later.")
  await expect(page.getByTestId("print-view")).toContainText("8 / 10")
  await expect(page.getByTestId("print-view")).toContainText("Print this page or keep a photo of it.")
  await shot(page, "print")
  await page.getByTestId("print-close").click()
  await page.getByTestId("ev-paper-basis").click()
  await page.getByTestId("ev-paper-detail").getByRole("button", { name: "Source" }).click()
  await expect(page.getByTestId("ev-paper-detail")).toContainText("paper (d+ = -0.26, CI [-0.43; -0.09]) versus online (d+ = -0.04, CI [-0.14; 0.06]) mode of delivery")
  await shot(page, "plan-paper-basis")

  expect(await page.locator("body").innerText()).not.toContain("!")
  expect(errors).toEqual([])

  // it all survives a reload
  await page.reload()
  await expect(page.getByTestId("step-plan")).toBeVisible()
  await expect(page.getByTestId("card-text-0")).toHaveText("If Sam calls, then I text him later.")
  await expect(page.getByTestId("imp-8")).toHaveAttribute("aria-checked", "true")
  await expect(page.getByTestId("sos-toggle")).toHaveAttribute("aria-checked", "true")

  // add or change: the ticks come back from the plan
  await page.getByTestId("add-more").click()
  await expect(page.getByTestId("sit-after-food")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "pick-again")
})

test("the plan is stored at ifthen/best/pairs and a past-tries handoff pre-ticks two moments", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("quit-lab-v1", JSON.stringify({ "past/best/handoff-endings": { addiction: "nicotine", items: [{ id: "stress", label: "Stress" }, { id: "late-night", label: "Late at night, alone" }, { id: "bored", label: "Bored" }] } }))
  })
  await open(page)
  await expect(page.getByTestId("prefilled")).toBeVisible()
  await expect(page.getByTestId("sit-stress")).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("sit-late-night")).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByTestId("sit-bored")).toHaveAttribute("aria-pressed", "false")
  await shot(page, "pick-handoff")
  await page.getByTestId("sit-next").click()
  await page.getByTestId("then-breathe").click()
  await page.getByTestId("then-next").click()
  await page.getByTestId("then-leave").click()
  await page.getByTestId("see-plan").click()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("quit-lab-v1") ?? "{}")["ifthen/best/pairs"])
  expect(stored).toHaveLength(2)
  expect(stored[0]).toMatchObject({ addiction: "nicotine", situation: "When I’m stressed", then: "Take ten slow breaths", own: false })
})

test("example plan can be cleared; switching addiction: free text where data is missing, porn hides smoker lines", async ({ page }) => {
  await open(page)
  await page.getByTestId("example-start").click()
  await expect(page.getByTestId("example-bar")).toBeVisible()
  await expect(page.getByTestId("step-plan")).toBeVisible()
  await shot(page, "example")
  await page.getByTestId("example-clear").click()
  await expect(page.getByTestId("step-pick")).toBeVisible()

  // weed: no list, free text, smoker line tagged
  await page.getByTestId("switch-weed").click()
  await expect(page.getByTestId("content-coming")).toBeVisible()
  await expect(page.getByTestId("example-start")).toHaveCount(0)
  await expect(page.getByTestId("ev-quitting-tag")).toHaveText("Studied in people who smoke")
  await shot(page, "weed-free-text")
  await page.getByTestId("sit-custom-input").fill("Friday night with friends")
  await page.getByTestId("sit-custom-add").click()
  await page.getByTestId("sit-next").click()
  await expect(page.getByTestId("sentence")).toHaveText("If Friday night with friends, then I ….")
  await expect(page.getByTestId("then-water")).toHaveCount(0)
  await page.getByTestId("own-then").fill("call my brother")
  await page.getByTestId("see-plan").click()
  await expect(page.getByTestId("card-text-0")).toHaveText("If Friday night with friends, then I call my brother.")
  await shot(page, "weed-plan")

  // alcohol: free text; porn: smoker and drinker lines hidden, the plan still builds
  await page.getByTestId("switch-alcohol").click()
  await expect(page.getByTestId("content-coming")).toBeVisible()
  await expect(page.getByTestId("ev-quitting-tag")).toBeVisible()
  await page.getByTestId("switch-porn").click()
  await expect(page.getByTestId("step-pick")).toBeVisible()
  await expect(page.getByTestId("ev-quitting")).toHaveCount(0)
  await page.getByTestId("sit-custom-input").fill("Alone on the laptop at night")
  await page.getByTestId("sit-custom-add").click()
  await page.getByTestId("sit-next").click()
  await expect(page.getByTestId("ev-list")).toHaveCount(0)
  await expect(page.getByTestId("ev-format")).toHaveCount(0)
  await page.getByTestId("own-then").fill("never open it")
  await expect(page.getByTestId("nudge")).toBeVisible()
  await shot(page, "porn-nudge")
  await page.getByTestId("own-then").fill("close the laptop and go to the kitchen")
  await page.getByTestId("see-plan").click()
  await expect(page.getByTestId("ev-paper")).toHaveCount(0)
  await shot(page, "porn-plan")
  // weed plan is still there
  await page.getByTestId("switch-weed").click()
  await expect(page.getByTestId("card-text-0")).toHaveText("If Friday night with friends, then I call my brother.")
})

test("desktop width 1280: no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page)
  await page.getByTestId("sit-stress").click()
  await page.getByTestId("sit-next").click()
  await page.getByTestId("then-water").click()
  await page.getByTestId("see-plan").click()
  await expect(page.getByTestId("step-plan")).toBeVisible()
  await shot(page, "plan-1280", 1280)
})
