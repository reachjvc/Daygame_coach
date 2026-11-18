/**
 * THE IMPROVED LIBRARY (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844: four sections, "What helps" strong first with chip and sources on tap, "True or not?"
 * card reveal, "What to expect", "Help outside the app", search, open a result, save, Saved tab, read mark,
 * addiction switcher. State lives in the browser (`quit-lab-v1`). Screenshots go outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/library/shots-ours/best")

function shooter(page: Page, width: number) {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
  let n = 0
  return async (name: string) => {
    n++
    await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), style: "nextjs-portal { display: none !important }" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
}

test("improved Library: sections, sources, quiz cards, search, save, read, switcher", async ({ page }) => {
  const shot = shooter(page, 390)
  await page.goto("/quit/lab/library/best?preview=1")

  // all four sections are on the page
  for (const s of ["helps", "true", "expect", "outside"]) await expect(page.getByTestId(`section-${s}`)).toBeVisible()
  await shot("sections")

  // what helps: strong first, a chip, sources on tap
  const helps = page.getByTestId("section-helps").getByTestId("item-helps")
  await expect(helps.first().getByTestId("evidence-strong")).toBeVisible()
  const chips = await page.getByTestId("section-helps").locator('[data-testid^="evidence-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")))
  const rank = { "evidence-strong": 0, "evidence-moderate": 1, "evidence-weak": 2, "evidence-none": 3 } as Record<string, number>
  expect(chips.map((c) => rank[c!])).toEqual([...chips.map((c) => rank[c!])].sort((a, b) => a - b))
  await helps.first().getByRole("button", { name: /source/i }).click()
  await expect(helps.first().getByRole("link").first()).toBeVisible()
  await shot("helps-sources")
  await expect(page.getByTestId("ideas-helps")).toBeVisible()
  await shot("ideas")

  // true or not: reveal
  const quiz = page.getByTestId("true-carousel")
  await quiz.scrollIntoViewIfNeeded()
  await expect(quiz.getByTestId("answer")).toHaveCount(0)
  await quiz.getByTestId("reveal").click()
  await expect(quiz.getByTestId("answer")).toBeVisible()
  await quiz.getByRole("button", { name: /source/i }).click()
  await expect(quiz.getByRole("link").first()).toBeVisible()
  await shot("true-revealed")
  await expect(page.getByTestId("true-count")).toHaveText("1 of 3")
  await page.getByTestId("true-next").click()
  await expect(page.getByTestId("true-count")).toHaveText("2 of 3")
  await expect(quiz.getByTestId("answer")).toHaveCount(0)

  // what to expect, help outside
  await expect(page.getByTestId("section-expect").getByTestId("item-expect").first()).toBeVisible()
  await expect(page.getByTestId("expect-note")).toBeVisible()
  await page.getByTestId("section-expect").scrollIntoViewIfNeeded()
  await shot("expect")
  await expect(page.getByTestId("section-outside").getByTestId("item-outside").first()).toBeVisible()
  await page.getByTestId("section-outside").scrollIntoViewIfNeeded()
  await shot("outside")

  // category chip filters
  await page.getByTestId("cat-expect").click()
  await expect(page.getByTestId("section-helps")).toHaveCount(0)
  await expect(page.getByTestId("section-expect")).toBeVisible()
  await page.getByTestId("cat-all").click()

  // read time wording
  await expect(page.getByTestId("read-time").first()).toHaveText(/^about \d+ min read$/)

  // search a word, open the result
  await page.getByTestId("search").fill("quitline")
  await expect(page.getByTestId("result").first()).toBeVisible()
  await shot("search")
  await page.getByTestId("result").first().click()
  await expect(page.getByTestId("item-view")).toBeVisible()
  await expect(page.getByTestId("item-outside")).toContainText(/quitline|QUIT/i)
  await shot("item")

  // save it, mark read
  await page.getByTestId("save-btn").click()
  await expect(page.getByTestId("save-btn")).toHaveAttribute("aria-pressed", "true")
  await page.getByTestId("read-btn").click()
  await expect(page.getByTestId("read-btn")).toHaveAttribute("aria-pressed", "true")
  await page.getByTestId("item-back").click()
  await page.getByTestId("search-clear").click()

  // Saved tab lists it, still saved and read
  await page.getByTestId("lib-tab-1").click()
  await expect(page.getByTestId("saved-list").getByTestId("item-outside")).toHaveCount(1)
  await expect(page.getByTestId("read-btn")).toHaveAttribute("aria-pressed", "true")
  await shot("saved")
  await page.reload()
  await page.getByTestId("lib-tab-1").click()
  await expect(page.getByTestId("saved-list").getByTestId("item-outside")).toHaveCount(1)
  await page.getByTestId("save-btn").click()
  await expect(page.getByTestId("saved-empty")).toBeVisible()

  // no result
  await page.getByTestId("lib-tab-0").click()
  await page.getByTestId("search").fill("zzzzqq")
  await expect(page.getByTestId("no-results")).toBeVisible()
  await page.getByTestId("search-clear").click()

  // switcher: content coming per missing section, no crash
  for (const a of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${a}`).click()
    await expect(page.getByTestId("content-coming")).toHaveCount(4)
    await expect(page.getByTestId("library-best")).toBeVisible()
    await shot(`switch-${a}`)
  }
  await page.getByTestId("switch-nicotine").click()
  await expect(page.getByTestId("content-coming")).toHaveCount(0)

  // desktop width: no horizontal scroll
  await page.setViewportSize({ width: 1280, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})
