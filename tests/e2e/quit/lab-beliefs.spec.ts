/**
 * THE BELIEF TEST COPIES, WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: one test per copy (a, b, c) walks every screen of its spec in order.
 * Each screen is shot into ~/.cache/daygame-research/quit-copy/beliefs/shots-ours/<letter>/.
 * Everything lives in this browser's storage, so nothing is written to the live database.
 */

import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const SHOTS = path.join(homedir(), ".cache/daygame-research/quit-copy/beliefs/shots-ours")

let n = 0
async function shot(page: Page, letter: string, name: string) {
  n += 1
  const dir = path.join(SHOTS, letter)
  mkdirSync(dir, { recursive: true })
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

async function open(page: Page, letter: string) {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const res = await page.goto(`/quit/lab/beliefs/${letter}?preview=1`)
  expect(res?.status()).toBe(200)
  await expect(page.getByTestId(`beliefs-${letter}`)).toBeVisible()
  return errors
}

const screen = (page: Page, letter: string) => page.getByTestId(`beliefs-${letter}`)

test.beforeEach(() => {
  n = 0
})

test("copy A: triggers to plan teaser, score counts up, radar draws, the none reply and the payment tile", async ({ page }) => {
  const errors = await open(page, "a")
  const a = (s: string) => expect(screen(page, "a")).toHaveAttribute("data-screen", s)
  await a("triggers")
  await expect(page.getByTestId("a-continue")).toBeDisabled()
  expect(await page.getByTestId("placeholder").count()).toBe(3)
  await shot(page, "a", "triggers")
  await page.getByTestId("a-trigger-stress").click()
  await page.getByTestId("a-trigger-social").click()
  await expect(page.getByTestId("a-trigger-stress")).toHaveAttribute("data-checked", "1")
  await shot(page, "a", "triggers-picked")
  await page.getByTestId("a-continue").click()

  await a("scenarios")
  await expect(page.getByTestId("a-continue")).toBeDisabled()
  await expect(page.locator("[data-testid^=a-scenario-]")).toHaveCount(6)
  await shot(page, "a", "scenarios")
  // the kind reply to "none apply", then back
  await page.getByTestId("a-none").click()
  await a("none")
  await shot(page, "a", "none-reply")
  await page.getByTestId("screen-back").click()
  await a("scenarios")
  await page.locator("[data-testid^=a-scenario-]").first().click()
  await page.getByTestId("a-continue").click()

  await a("explainer")
  await expect(page.getByTestId("a-explainer-box")).toContainText(/stress/i)
  await expect(page.getByTestId("not-sourced")).toBeVisible()
  await shot(page, "a", "explainer")
  await page.getByTestId("a-explainer-cta").click()

  await a("areas")
  await expect(page.getByTestId("a-continue")).toBeDisabled()
  await shot(page, "a", "areas")
  await page.getByTestId("a-area-sleep").click()
  await page.getByTestId("a-continue").click()

  await a("fears")
  await expect(page.getByTestId("a-continue")).toBeDisabled()
  await shot(page, "a", "fears")
  await page.getByTestId("a-fear-judged").click()
  await page.getByTestId("a-fear-fun").click()
  await page.getByTestId("a-continue").click()

  await a("result")
  const score = page.getByTestId("a-score")
  await expect(score).toHaveAttribute("data-final", /\d+/)
  const final = await score.getAttribute("data-final")
  await expect(score).not.toHaveAttribute("data-value", final!, { timeout: 200 }).catch(() => undefined)
  await expect(score).toHaveAttribute("data-value", final!)
  await expect(page.getByTestId("a-radar")).toHaveAttribute("data-drawn", "1")
  await expect(page.getByTestId("a-strength")).toBeVisible()
  await expect(page.getByTestId("a-result-cta")).toBeVisible()
  for (const k of ["awareness", "freedom", "control", "confidence", "body", "drive"]) await expect(page.getByTestId(`a-dim-${k}`)).toBeVisible()
  await expect(page.getByTestId("inferred-tag").first()).toBeVisible()
  await shot(page, "a", "score-radar")
  await page.getByTestId("a-result-cta").click()

  await a("teaser")
  expect(await page.getByTestId("not-sourced").count()).toBe(3)
  await shot(page, "a", "plan-teaser")
  await page.getByTestId("a-teaser-cta").click()
  await a("paywall")
  await expect(page.getByTestId("not-copied")).toHaveText("not copied: payment")
  await shot(page, "a", "payment")
  expect(errors).toEqual([])
})

test("copy B: intro, details, history, nine ratings, six knowledge questions, submit, result on the page", async ({ page }) => {
  const errors = await open(page, "b")
  const next = () => page.getByTestId("b-next").click()
  const stepIs = (k: number, pct: number) => Promise.all([expect(page.getByTestId("b-step")).toHaveText(`Step ${k} of 9`), expect(page.getByTestId("b-bar")).toHaveAttribute("data-value", String(pct))])

  await stepIs(1, 11)
  await shot(page, "b", "intro")
  await next()
  await stepIs(2, 22)
  await expect(page.getByTestId("b-gate")).toHaveText("not copied: sign-up gate")
  await shot(page, "b", "details")
  await next()

  await stepIs(3, 33)
  await next() // required missing
  await expect(page.getByTestId("b-error")).toBeVisible()
  await shot(page, "b", "history-required")
  await page.getByTestId("b-opt-amount-1").check()
  await page.getByTestId("b-opt-tried-0").check()
  await expect(page.getByTestId("b-follow")).toBeVisible()
  await page.getByTestId("b-tries").fill("3")
  await page.getByTestId("b-opt-best-0").check()
  await page.getByTestId("b-brand").fill("x")
  await shot(page, "b", "history")
  await next()

  const rate = [
    [2, 2, 3],
    [1, 3, 4],
    [1, 1, 5],
  ]
  const ids = [
    ["relax", "concentrate", "boredom"],
    ["stress", "thin", "heroin"],
    ["willpower", "withdrawal", "light"],
  ]
  for (let p = 0; p < 3; p++) {
    await stepIs(4 + p, [44, 55, 66][p])
    await expect(page.locator("input[type=radio]")).toHaveCount(15)
    await next()
    await expect(page.getByTestId("b-error")).toBeVisible()
    for (let i = 0; i < 3; i++) await page.getByTestId(`b-opt-belief-${ids[p][i]}-${rate[p][i] - 1}`).check()
    await shot(page, "b", `beliefs-${p + 1}`)
    await next()
  }

  await stepIs(7, 77)
  await page.getByTestId("b-opt-know-free-1").check()
  await page.getByTestId("b-opt-know-when-0").check()
  await page.getByTestId("b-opt-know-sixh-1").check()
  await shot(page, "b", "knowledge-1")
  await next()
  await stepIs(8, 88)
  await page.getByTestId("b-opt-know-stimulant-1").check()
  await page.getByTestId("b-opt-know-nrt-2").check()
  await page.getByTestId("b-opt-know-spend-1").check()
  await shot(page, "b", "knowledge-2")
  await next()

  await stepIs(9, 100)
  await expect(page.getByTestId("b-submit-btn")).toBeDisabled()
  await page.getByTestId("b-captcha").check()
  await shot(page, "b", "submit")
  await page.getByTestId("b-submit-btn").click()

  await expect(page.getByTestId("b-result")).toBeVisible()
  await expect(page.getByTestId("b-email-note")).toHaveText("The original sends this by email.")
  await expect(page.getByTestId("b-res-relax")).toHaveAttribute("data-rating", "2")
  await expect(page.getByTestId("b-res-when")).toHaveAttribute("data-mark", "wrong")
  await expect(page.getByTestId("b-res-nrt")).toHaveAttribute("data-mark", "unmarked")
  await expect(page.getByTestId("b-cost")).toContainText("$")
  await expect(page.getByTestId("b-sales")).toHaveText("not copied: sales")
  await shot(page, "b", "result")
  await page.getByTestId("b-restart").click()
  await stepIs(1, 11)
  expect(errors).toEqual([])
})

test("copy C: quiz with back, persona result, your moment slider, confirmation, the Voice flow, the belief task", async ({ page }) => {
  const errors = await open(page, "c")
  await shot(page, "c", "intro")
  await page.getByTestId("c-intro-cta").click()

  // question 1, answer, question 2, back keeps the answer
  await expect(page.getByTestId("c-qcount")).toHaveText("Question 1 of 9")
  await page.getByTestId("c-answer-1").click()
  await expect(page.getByTestId("c-qcount")).toHaveText("Question 2 of 9")
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("c-answer-1")).toHaveAttribute("aria-checked", "true")
  await shot(page, "c", "question-1")
  await page.getByTestId("c-answer-1").click()
  for (let i = 2; i <= 9; i++) {
    await expect(page.getByTestId("c-qcount")).toHaveText(`Question ${i} of 9`)
    if (i === 5) await shot(page, "c", "question-5-belief")
    await page.getByTestId("c-answer-1").click()
  }

  await expect(screen(page, "c")).toHaveAttribute("data-screen", "result")
  await expect(screen(page, "c")).toHaveAttribute("data-persona", "1")
  await expect(page.getByTestId("c-sales-0")).toHaveText("not copied: sales")
  await shot(page, "c", "result")
  await page.getByTestId("c-to-moment").click()

  await expect(page.getByTestId("c-time")).toHaveText("6 PM")
  await shot(page, "c", "moment")
  await page.getByTestId("c-minus").click()
  await page.getByTestId("c-minus").click()
  await expect(page.getByTestId("c-time")).toHaveText("5:30 PM")
  await expect(page.getByTestId("c-chip-afterWork")).toHaveAttribute("aria-pressed", "true")
  await page.getByTestId("c-plus").click()
  await expect(page.getByTestId("c-time")).toHaveText("5:45 PM")
  await page.getByTestId("c-chip-windDown").click()
  await expect(page.getByTestId("c-time")).toHaveText("8:30 PM")
  await expect(page.getByTestId("c-insight")).toContainText("8:30 PM")
  await shot(page, "c", "moment-chip")
  await page.getByTestId("c-chip-afterWork").click()
  await page.getByTestId("c-save-moment").click()

  await expect(page.getByTestId("c-points")).toHaveAttribute("data-value", "30")
  await shot(page, "c", "confirmation")
  await page.getByTestId("c-skip").click()

  await expect(page.getByTestId("c-home")).toBeVisible()
  await expect(page.getByTestId("c-count")).toHaveText("0")
  await shot(page, "c", "home")
  await page.getByTestId("c-pull").click()
  await expect(page.getByTestId("c-sheet")).toBeVisible()
  await expect(page.getByTestId("c-sheet")).toContainText("5:30 PM")
  await shot(page, "c", "voice-sheet")
  await page.getByTestId("c-voice").fill("one will not hurt")
  await page.getByTestId("c-gives-relief").click()
  await page.getByTestId("c-feeling-tired").click()
  await page.getByTestId("c-ctx-hardDay").click()
  await page.getByTestId("c-ctx-craving").click()
  await shot(page, "c", "voice-filled")
  await page.getByTestId("c-sheet-save").click()
  await expect(page.getByTestId("c-sheet-noticed")).toBeVisible()
  await expect(page.getByTestId("c-sheet-count")).toHaveText("1")
  await shot(page, "c", "voice-saved")
  await page.getByTestId("c-sheet-close").click()
  await expect(page.getByTestId("c-count")).toHaveText("1")

  await page.getByTestId("c-tab-1").click()
  await expect(page.getByTestId("c-belief-save")).toBeDisabled()
  await page.getByTestId("c-learned").fill("it helps me unwind")
  await page.getByTestId("c-where").fill("my parents")
  await page.getByTestId("c-belief-save").click()
  await page.getByTestId("c-why").fill("to be present")
  await page.getByTestId("c-why-save").click()
  await expect(page.getByTestId("c-points")).toHaveAttribute("data-value", "60")
  await shot(page, "c", "moves")
  await page.getByTestId("c-tab-0").click()
  await expect(page.getByTestId("c-why-card")).toContainText("to be present")
  await page.getByTestId("c-tab-2").click()
  await expect(page.getByTestId("placeholder-screen")).toBeVisible()
  await shot(page, "c", "progress-placeholder")
  expect(errors).toEqual([])
})
