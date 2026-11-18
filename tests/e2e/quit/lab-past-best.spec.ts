/**
 * THE IMPROVED PAST ATTEMPTS (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844, dark: example data, a first try with every field, a second with only a length,
 * pattern lines with counts, the danger window, the "used in" line, edit and delete, and the other
 * addictions (free text where the data file has no chips). State lives in the browser (`quit-lab-v1`).
 * Phone screenshots of every screen are saved outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, colorScheme: "dark" })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/past/shots-ours/best")

function shooter(page: Page, width: number) {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
  let n = 0
  return async (name: string) => {
    n++
    await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
    await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
}

test("improved past: tries, pattern, window, handoff, edit, delete, example, switcher", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  const shot = shooter(page, 390)
  await page.goto("/quit/lab/past/best?preview=1")
  await expect(page.getByTestId("past-best")).toBeVisible()

  // example data first: bars, window, no "used in" line, no edit buttons
  await expect(page.getByTestId("example-bar")).toBeVisible()
  await expect(page.getByTestId("chart")).toBeVisible()
  await expect(page.getByTestId("pattern-window")).toContainText("days")
  await expect(page.getByTestId("used-in")).toHaveCount(0)
  await shot("example")

  // first try, every field
  await page.getByTestId("add-try").click()
  await expect(page.getByTestId("f-save")).toBeDisabled()
  await shot("form-empty")
  await page.getByTestId("f-when").fill("2026-03")
  await page.getByTestId("f-len").fill("5")
  await page.getByTestId("f-how").getByTestId("chip-all-at-once").click()
  await page.getByTestId("f-ended").getByTestId("chip-stress").click()
  await page.getByTestId("f-helped").getByTestId("chip-told").click()
  await shot("form-filled")
  await page.getByTestId("f-save").click()
  await expect(page.getByTestId("example-bar")).toHaveCount(0)
  await expect(page.getByTestId("try-0")).toContainText("5 days")
  await expect(page.getByTestId("pattern-longest")).toContainText("Longest run: 5 days. From 1 try with a length.")
  await expect(page.getByTestId("pattern-window")).toHaveCount(0)
  await expect(page.getByTestId("used-in")).toContainText("Used in: if-then plan, quit date, SOS")

  // second try, only a length (weeks)
  await page.getByTestId("add-try").click()
  await page.getByTestId("f-len").fill("2")
  await page.getByTestId("f-unit").selectOption("weeks")
  await page.getByTestId("f-save").click()
  await expect(page.getByTestId("pattern-longest")).toContainText("Longest run: 14 days. From 2 tries with a length.")
  // nothing repeats yet: no most-common lines
  await expect(page.getByTestId("pattern-ending")).toHaveCount(0)
  await expect(page.getByTestId("pattern-helped")).toHaveCount(0)
  await expect(page.getByTestId("pattern-window")).toContainText("Most of your tries ended in days 5–14. 2 of 2 tries with a length.")
  await expect(page.getByTestId("pattern")).toContainText("Weeks count as 7 days")
  await expect(page.getByTestId("chart-avg")).toContainText("Average: 9.5 days · 2 tries with a length")
  await expect(page.getByTestId("bar-1")).toHaveAttribute("aria-label", "Try 2: 14 days")
  await page.getByTestId("window-how").click()
  await expect(page.getByTestId("window-why")).toHaveText("The shortest span of days that holds more than half of your tries.")
  await shot("two-tries")

  // handoff saved to the lab store
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("quit-lab-v1") ?? "{}"))
  expect(stored["past/best/handoff-window"]).toMatchObject({ addiction: "nicotine", from: 5, to: 14 })
  expect(stored["past/best/handoff-endings"].items[0].id).toBe("stress")
  expect(stored["past/best/handoff-helped"].items[0].id).toBe("told")

  // a third try repeats the first one's ending and helper
  await page.getByTestId("add-try").click()
  await page.getByTestId("f-len").fill("6")
  await page.getByTestId("f-ended").getByTestId("chip-stress").click()
  await page.getByTestId("f-helped").getByTestId("chip-told").click()
  await page.getByTestId("f-save").click()
  await expect(page.getByTestId("pattern-ending")).toHaveText("Most common ending: A bad day or stress. 2 of 2 tries naming an ending.")
  await expect(page.getByTestId("pattern-helped")).toHaveText("Helped most often: Told someone. 2 of 2 tries naming what helped.")
  await expect(page.getByTestId("pattern-window")).toContainText("days 5–6. 2 of 3 tries with a length.")

  // edit the second try, then delete the first
  await page.getByTestId("try-1-edit").click()
  await page.getByTestId("f-len").fill("8")
  await page.getByTestId("f-unit").selectOption("days")
  await page.getByTestId("f-save").click()
  await expect(page.getByTestId("try-1-len")).toHaveText("8 days")
  await page.getByTestId("try-0-delete").click()
  await shot("confirm-delete")
  await page.getByTestId("try-0-confirm").click()
  await expect(page.getByTestId("try-list").locator("li")).toHaveCount(2)
  await expect(page.getByTestId("pattern-window")).toContainText("days 6–8.")

  // survives a reload
  await page.reload()
  await expect(page.getByTestId("try-0-len")).toHaveText("8 days")

  // other addictions: no ending chips in their data files, free text works, no crash
  for (const a of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${a}`).click()
    await expect(page.getByTestId("example-bar")).toBeVisible()
    await page.getByTestId("example-clear").click()
    for (const [i, text] of ["a bad night", "A bad night"].entries()) {
      await page.getByTestId("add-try").click()
      await expect(page.getByTestId("chips-coming")).toBeVisible()
      await page.getByTestId("f-ended-text").fill(text)
      await page.getByTestId("f-len").fill("3")
      await page.getByTestId("f-save").click()
      if (i === 0) await expect(page.getByTestId("pattern-ending")).toHaveCount(0)
    }
    await expect(page.getByTestId("pattern-window")).toHaveText("Most of your tries ended on day 3. 2 of 2 tries with a length.")
    await expect(page.getByTestId("pattern-ending")).toHaveText("Most common ending: a bad night. 2 of 2 tries naming an ending.")
    await shot(`switch-${a}`)
  }
  expect(errors).toEqual([])

  // desktop width
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByTestId("pattern")).toBeVisible()
  await page.addStyleTag({ content: "nextjs-portal{display:none !important}" })
  await page.screenshot({ path: path.join(DIR, "09-desktop-1280.png"), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
})
