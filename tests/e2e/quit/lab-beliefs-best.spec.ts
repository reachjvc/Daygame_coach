/**
 * THE IMPROVED BELIEF TEST (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: twelve beliefs rated 1 to 5 (a reply with a source after each 4 or 5,
 * none after 1 to 3), the fears screen with its "none of these" reply, the last question, the result
 * (count, band line, top three cards), taking it again with both results shown, and the addiction
 * switcher. State lives in the browser (`quit-lab-v1`); nothing is written to the database.
 * Shots of every screen go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/beliefs/shots-ours/best")
const URL = "/quit/lab/beliefs/best?preview=1"
/** Mixed answers; 4 and 5 are b1, b3, b6, b8, b11 (five held), top three b1, b6, b11 (rated 5, data order). */
const RATINGS = [5, 2, 4, 1, 3, 5, 2, 4, 1, 3, 5, 2]

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

async function answerAll(page: Page, withShots: boolean, fears: string[]) {
  for (let i = 0; i < 12; i++) {
    await expect(page.getByTestId("question")).toHaveAttribute("data-step", String(i + 1))
    await expect(page.getByTestId("limiting")).toBeVisible()
    if (withShots && i < 2) await shot(page, `belief-${i + 1}`)
    await page.getByTestId(`rate-${RATINGS[i]}`).click()
    if (RATINGS[i] >= 4) {
      await expect(page.getByTestId("reply")).toBeVisible()
      await expect(page.getByTestId("reply-counterpart")).not.toBeEmpty()
      await expect(page.getByTestId("reply-proof")).not.toBeEmpty()
      await page.getByTestId("reply").getByRole("button", { name: "Source" }).click()
      await expect(page.getByTestId("reply").getByRole("link", { name: /source/i }).first()).toBeVisible()
      if (withShots && i === 0) await shot(page, "reply-with-source")
      await page.getByTestId("reply-next").click()
    } else {
      await expect(page.getByTestId("reply")).toHaveCount(0)
    }
  }
  await expect(page.getByTestId("step-fears")).toBeVisible()
  for (const f of fears) await page.getByTestId(`fear-${f}`).click()
}

test("the test: twelve answers, replies, fears, last question, result", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  expect((await page.goto(URL))?.status()).toBe(200)
  // no gate: the first belief is on the page at once
  await expect(page.getByTestId("limiting")).toBeVisible()
  await expect(page.getByTestId("screen-back")).toHaveCount(0)
  await answerAll(page, true, ["b2", "b11"])

  // fears: multi-select, then "none of these" clears them and shows the reply
  await expect(page.getByTestId("fear-b2")).toHaveAttribute("aria-checked", "true")
  await shot(page, "fears")
  await page.getByTestId("fear-none").click()
  await expect(page.getByTestId("fear-none-reply")).toBeVisible()
  await expect(page.getByTestId("fear-b2")).toHaveAttribute("aria-checked", "false")
  await shot(page, "fears-none")
  await page.getByTestId("fear-b12").click()
  await expect(page.getByTestId("fear-none-reply")).toHaveCount(0)
  await page.getByTestId("fear-b1").click()
  await page.getByTestId("fears-next").click()

  // last question, never scored
  await expect(page.getByTestId("step-canstop")).toBeVisible()
  await shot(page, "last-question")
  await page.getByTestId("canstop-unsure").click()

  // result
  const r = page.getByTestId("result-latest")
  await expect(r).toBeVisible()
  await expect(r).toHaveAttribute("data-held", "5")
  await expect(r.getByTestId("held-line")).toContainText("5 of 12")
  await expect(r.getByTestId("band")).toContainText("Several of these still have a grip.")
  await expect(r.getByTestId("canstop-answer")).toContainText("Not sure")
  const tops = r.getByTestId("top-belief")
  await expect(tops).toHaveCount(3)
  await expect(tops.nth(0)).toContainText("I’ve smoked too long.")
  for (let i = 0; i < 3; i++) {
    const c = tops.nth(i)
    await expect(c).toContainText("When this thought comes")
    await expect(c).toContainText("Test it this week")
    await expect(c.getByRole("button", { name: "Source" })).toBeVisible()
    await expect(c.getByTestId("need-link")).toHaveAttribute("href", /\/quit\/nicotine\/gives.*#need=/)
  }
  await expect(r.getByTestId("named-fears")).toContainText("smoked too long")
  await expect(page.getByTestId("next-gives")).toHaveAttribute("href", /\/quit\/nicotine\/gives/)
  await tops.nth(0).getByRole("button", { name: "Source" }).click()
  await shot(page, "result")

  // a reload keeps the result
  await page.reload()
  await expect(page.getByTestId("result-latest")).toBeVisible()
  expect(errors).toEqual([])
})

test("take it again: both results shown with their dates", async ({ page }) => {
  await page.goto(URL)
  await answerAll(page, false, [])
  await page.getByTestId("fears-next").click()
  await page.getByTestId("canstop-yes").click()
  await expect(page.getByTestId("result-latest")).toBeVisible()
  await expect(page.getByTestId("result-earlier")).toHaveCount(0)
  await page.getByTestId("again").click()
  await expect(page.getByTestId("limiting")).toBeVisible()
  await expect(page.getByTestId("question")).toHaveAttribute("data-step", "1")
  // the second time: all 1, nothing held
  for (let i = 0; i < 12; i++) await page.getByTestId("rate-1").click()
  await page.getByTestId("fear-none").click()
  await page.getByTestId("fears-next").click()
  await page.getByTestId("canstop-no").click()
  const latest = page.getByTestId("result-latest")
  const earlier = page.getByTestId("result-earlier")
  await expect(latest).toHaveAttribute("data-held", "0")
  await expect(earlier).toHaveAttribute("data-held", "5")
  await expect(latest.getByTestId("taken-on")).toContainText("Taken")
  await expect(earlier.getByTestId("taken-on")).toContainText("Taken")
  await expect(earlier.getByTestId("earlier-top")).toHaveCount(3)
  await shot(page, "result-again")
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(earlier).toBeVisible()
  await shot(page, "result-again-desktop", 1280)
})

test("back walks to the question, not the reply", async ({ page }) => {
  await page.goto(URL)
  await page.getByTestId("rate-4").click()
  await expect(page.getByTestId("reply")).toBeVisible()
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("belief-question")).toBeVisible()
  await expect(page.getByTestId("rate-4")).toHaveAttribute("aria-checked", "true")
  await page.getByTestId("rate-2").click()
  await expect(page.getByTestId("question")).toHaveAttribute("data-step", "2")
  await page.getByTestId("screen-back").click()
  await expect(page.getByTestId("question")).toHaveAttribute("data-step", "1")
})

test("switcher: weed, porn and alcohol say content coming, nothing crashes", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(URL)
  await expect(page.getByTestId("switch-nicotine")).toHaveAttribute("aria-checked", "true")
  for (const id of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${id}`).click()
    await expect(page.getByTestId(`switch-${id}`)).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("content-coming")).toHaveText("content coming")
    await shot(page, `switch-${id}`)
  }
  await page.getByTestId("switch-nicotine").click()
  await expect(page.getByTestId("limiting")).toBeVisible()
  expect(errors).toEqual([])
})
