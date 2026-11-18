/**
 * THE LIBRARY COPIES, WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: one test per copy (a to e) opens the copy fresh and walks every seen
 * screen of its spec in order (open a category, open an item, save it where the copy saves).
 * Each screen is shot into ~/.cache/daygame-research/quit-copy/library/shots-ours/<letter>/.
 * Everything lives in this browser's storage; nothing is written to the live database.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import type { Page } from "@playwright/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const SHOTS = path.join(homedir(), ".cache/daygame-research/quit-copy/library/shots-ours")

let n = 0
async function shot(page: Page, letter: string, name: string) {
  n += 1
  const dir = path.join(SHOTS, letter)
  mkdirSync(dir, { recursive: true })
  await page.addStyleTag({ content: "nextjs-portal{display:none !important} nav.fixed{position:static !important}" })
  await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
}

/** Every visible button, textarea and text field is at least 44 px tall (checkboxes, radios and tiny dots aside). */
async function tapsBigEnough(page: Page) {
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll("button, textarea, select, a, input:not([type=checkbox]):not([type=radio]):not([type=file])"))
      .filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect()
        return r.width > 0 && r.height > 0 && r.height < 43.5
      })
      .map((el) => `${el.tagName}:${el.getAttribute("data-testid") ?? (el.textContent ?? "").slice(0, 20)}:${Math.round((el as HTMLElement).getBoundingClientRect().height)}`),
  )
  expect(small).toEqual([])
}

async function start(page: Page, letter: string) {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const res = await page.goto(`/quit/lab/library/${letter}?preview=1`)
  expect(res?.status()).toBe(200)
  await expect(page.getByTestId(`library-${letter}`)).toBeVisible()
  rmSync(path.join(SHOTS, letter), { recursive: true, force: true })
  return errors
}

const tid = (page: Page, id: string) => page.getByTestId(id)
const back = (page: Page) => page.getByTestId("screen-back").click()

test.beforeEach(() => {
  n = 0
})

test("copy A: daily reading, tasks in order, guide, toolkit, discover, course path, saving", async ({ page }) => {
  const errors = await start(page, "a")
  await expect(tid(page, "a-task-0")).toHaveAttribute("data-state", "current")
  await expect(tid(page, "a-task-1")).toBeDisabled()
  await shot(page, "a", "home")
  await tapsBigEnough(page)

  // guide from the banner, contents button
  await tid(page, "a-banner-go").click()
  await expect(tid(page, "a-guide")).toBeVisible()
  await shot(page, "a", "guide")
  await tid(page, "a-guide-save").click()
  await expect(tid(page, "a-guide-save")).toHaveAttribute("aria-pressed", "true")
  await tid(page, "a-guide-contents").click()
  await expect(tid(page, "inferred-tag").first()).toBeVisible()
  await back(page)
  await expect(tid(page, "a-banner")).toBeVisible()

  // toolkit: open a card, save it
  await tid(page, "a-tab-1").click()
  await shot(page, "a", "toolkit")
  await tid(page, "a-tk-craving-0").click()
  await tid(page, "a-item-save").click()
  await expect(tid(page, "a-item-save")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "a", "toolkit-item")
  await back(page)

  // discover: community, courses, course path, course day
  await tid(page, "a-tab-3").click()
  await expect(tid(page, "a-community")).toBeVisible()
  await tid(page, "a-cal-0").click()
  await expect(tid(page, "a-cal-0")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "a", "discover-community")
  await tid(page, "a-dtab-1").click()
  await shot(page, "a", "discover-courses")
  await tid(page, "a-course-card").click()
  await shot(page, "a", "course-before")
  await tid(page, "a-course-begin").click()
  await expect(tid(page, "a-module-1")).toHaveAttribute("data-state", "open")
  await expect(tid(page, "a-module-2")).toHaveAttribute("data-state", "locked")
  await shot(page, "a", "course-path")
  await tid(page, "a-module-begin-1").click()
  await tid(page, "a-courseday-save").click()
  await expect(tid(page, "a-courseday-save")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "a", "course-day")
  await tid(page, "a-courseday-complete").click()
  await expect(tid(page, "a-course-progress")).toHaveText("1 of 5 days")
  await expect(tid(page, "a-module-2")).toHaveAttribute("data-state", "open")
  await back(page)

  // daily tasks, one after the other
  await tid(page, "a-tab-0").click()
  await tid(page, "a-task-0").click()
  await expect(tid(page, "a-reading")).toHaveAttribute("data-page", "0")
  await tid(page, "a-reading-save").click()
  await expect(tid(page, "a-reading-save")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "a", "reading-1")
  await tid(page, "a-reading-next").click()
  await tid(page, "a-reading-next").click()
  await expect(tid(page, "a-reading-next")).toHaveText("Complete")
  await tid(page, "a-thumb-up").click()
  await expect(tid(page, "a-thumb-up")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "a", "reading-3")
  await tid(page, "a-reading-next").click()
  await expect(tid(page, "a-task-0")).toHaveAttribute("data-state", "done")
  await expect(tid(page, "a-task-1")).toHaveAttribute("data-state", "current")
  for (const i of [1, 2, 3]) {
    await tid(page, `a-task-${i}`).click()
    if (i === 1) await shot(page, "a", "task-other")
    await tid(page, "a-task-complete").click()
  }
  await expect(tid(page, "a-streak")).toHaveAttribute("data-days", "1")
  await expect(tid(page, "a-bonus")).toBeVisible()
  await shot(page, "a", "home-complete")
  await tid(page, "a-banner-x").click()
  await expect(tid(page, "a-banner")).toHaveCount(0)

  // bookmarks chip (inferred screen)
  await tid(page, "a-chip-saved").click()
  await expect(tid(page, "placeholder-screen")).toBeVisible()
  await shot(page, "a", "saved")
  expect(errors).toEqual([])
})

test("copy B: discover strip, featured and carousels, article, search, home rows, game, stories, tips", async ({ page }) => {
  const errors = await start(page, "b")
  await shot(page, "b", "discover-top")
  await tapsBigEnough(page)
  await tid(page, "b-feat-0").click()
  await expect(tid(page, "b-article")).toBeVisible()
  await shot(page, "b", "article")
  await back(page)
  await expect(tid(page, "b-sec-0-count")).toHaveText("1 of 6")
  await tid(page, "b-sec-0-next").click()
  await expect(tid(page, "b-sec-0-count")).toHaveText("2 of 6")
  await tid(page, "b-sec-0-prev").click()
  await tid(page, "b-sec-0-first").click()
  await back(page)
  await shot(page, "b", "discover-sections")
  for (const i of [1, 2, 3]) {
    await tid(page, `b-strip-${i}`).click()
    await shot(page, "b", `strip-${i}`)
  }
  await tid(page, "b-strip-0").click()
  await tid(page, "b-search-field").fill("x")
  await tid(page, "b-search-go").click()
  await expect(tid(page, "b-search")).toBeVisible()
  await shot(page, "b", "search")
  await back(page)

  // home rows
  await tid(page, "b-tab-0").click()
  await shot(page, "b", "home")
  await tid(page, "b-weekly-open").click()
  await shot(page, "b", "weekly-guide")
  await back(page)
  await tid(page, "b-crv-0").click()
  await shot(page, "b", "cravings-card")
  await tid(page, "b-play").click()
  await expect(tid(page, "snake")).toBeVisible()
  await shot(page, "b", "game")
  await tid(page, "snake-back").click()
  await tid(page, "b-all-stories").click()
  await expect(tid(page, "b-story").first()).toBeVisible()
  await shot(page, "b", "stories")
  await back(page)
  await tid(page, "b-add-tip").click()
  await tid(page, "b-tip-title").fill("A tip title")
  await tid(page, "b-tip-text").fill("A tip text")
  await shot(page, "b", "tip-form")
  await tid(page, "b-tip-save").click()
  await expect(tid(page, "b-my-tip")).toHaveCount(1)
  await shot(page, "b", "tips-list")
  await tid(page, "b-tipcard-0").click()
  await expect(tid(page, "b-article")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy C: first-visit sheet, journeys, locked card, journey page, day page, meditations", async ({ page }) => {
  const errors = await start(page, "c")
  await expect(tid(page, "c-first")).toBeVisible()
  await shot(page, "c", "first-visit")
  await tid(page, "c-first-finish").click()
  await expect(tid(page, "c-first")).toHaveCount(0)
  await shot(page, "c", "journeys")
  await tapsBigEnough(page)
  await tid(page, "c-journey-1").click()
  await expect(tid(page, "c-locked")).toBeVisible()
  await shot(page, "c", "locked")
  await back(page)
  await tid(page, "c-current").click()
  await expect(tid(page, "c-progress")).toHaveText("0 of 7 days")
  await shot(page, "c", "journey")
  await expect(tid(page, "c-day-2")).toBeDisabled()
  await tid(page, "c-day-1").click()
  await tid(page, "c-comment-input").fill("hello")
  await tid(page, "c-comment-post").click()
  await expect(tid(page, "c-comment")).toHaveCount(1)
  await shot(page, "c", "day")
  await tid(page, "c-day-complete").click()
  await expect(tid(page, "c-progress")).toHaveText("1 of 7 days")
  await tid(page, "c-crumb").click()
  await tid(page, "c-sub-1").click()
  await shot(page, "c", "meditations")
  await tid(page, "c-med-0").click()
  await tid(page, "c-play").click()
  await expect(tid(page, "c-play")).toHaveAttribute("aria-pressed", "true")
  await shot(page, "c", "player")
  await back(page)
  await tid(page, "lab-saved").click()
  await expect(tid(page, "placeholder-screen")).toBeVisible()
  expect(errors).toEqual([])
  // the sheet stays gone after a reload
  await page.reload()
  await expect(tid(page, "c-first")).toHaveCount(0)
})

test("copy D: milestones, category, item, recovery phases, tips, symptom page", async ({ page }) => {
  const errors = await start(page, "d")
  await shot(page, "d", "milestones")
  await tapsBigEnough(page)
  await tid(page, "d-ring-0").click()
  await expect(tid(page, "d-group")).toBeVisible()
  await back(page)
  await tid(page, "d-ring-1").click()
  await shot(page, "d", "category")
  await tid(page, "d-row-0").click()
  await tid(page, "d-sources").click()
  await expect(tid(page, "d-sources-panel")).toBeVisible()
  await shot(page, "d", "item")
  await back(page)
  await tid(page, "d-recent").click()
  await back(page)
  await tid(page, "d-tab-2").click()
  await expect(tid(page, "d-phase")).toHaveAttribute("data-phase", "2")
  await shot(page, "d", "recovery")
  await tid(page, "d-dot-1").click()
  await expect(tid(page, "d-phase")).toHaveAttribute("data-phase", "1")
  await tid(page, "d-phase-row-0").click()
  await shot(page, "d", "phase-detail")
  await back(page)
  await tid(page, "d-phase-row-2").click()
  await shot(page, "d", "tips")
  await tid(page, "d-practice-0").click()
  await shot(page, "d", "practice")
  await back(page)
  await tid(page, "d-symptom-1").click()
  await expect(tid(page, "d-article")).toBeVisible()
  expect(errors).toEqual([])
})

test("copy E: explore decks, quit kit saving, home, website index, menu, category, article", async ({ page }) => {
  const errors = await start(page, "e")
  await expect(tid(page, "e-explore")).toBeVisible()
  await shot(page, "e", "explore")
  await tapsBigEnough(page)
  await tid(page, "e-deck-1").click()
  await tid(page, "e-add-0").click()
  await expect(tid(page, "e-add-0")).toHaveAttribute("aria-pressed", "true")
  await tid(page, "e-cards-next").click()
  await expect(tid(page, "e-cards-count")).toHaveText("2 of 3")
  await shot(page, "e", "explore-saved")
  await tid(page, "e-tab-0").click()
  await expect(tid(page, "e-fav-count-1")).toHaveText("1")
  await shot(page, "e", "quit-kit")
  await tid(page, "e-view-fav").click()
  await expect(tid(page, "placeholder-screen")).toBeVisible()
  await back(page)
  await tid(page, "e-tab-2").click()
  await shot(page, "e", "home")

  // website
  await tid(page, "e-view-1").click()
  await expect(tid(page, "e-tools")).toBeVisible()
  await shot(page, "e", "web-tools")
  await tid(page, "e-menu-open").click()
  await shot(page, "e", "web-menu")
  await tid(page, "e-menu-chev-2").click()
  await shot(page, "e", "web-menu-challenges")
  await tid(page, "e-menu-kid-1").click()
  await expect(tid(page, "e-category")).toBeVisible()
  await shot(page, "e", "web-category")
  await tid(page, "e-cat-1").click()
  await expect(tid(page, "e-article")).toBeVisible()
  await tid(page, "e-note-0").fill("one")
  await shot(page, "e", "web-article")
  await tid(page, "e-search-open").click()
  await expect(tid(page, "e-search-panel")).toBeVisible()
  await tid(page, "e-crumb-0").click()
  await expect(tid(page, "e-challenges")).toBeVisible()
  await shot(page, "e", "web-challenges")
  expect(errors).toEqual([])
})
