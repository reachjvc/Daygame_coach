/**
 * THE IMPROVED CRAVING SOS (lab variant `best`), WALKED ON A PHONE.
 *
 * Signed out, 390x844: shelf at once, a chosen wait, every tool opens and returns, "did you use?",
 * the log (a second log inside five minutes updates the first), the pattern after three logs, and
 * the addiction switcher. State lives in the browser (`quit-lab-v1`); nothing is written to the
 * database. Phone screenshots of every screen are saved outside the repo.
 */

import { mkdirSync, rmSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"

test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 } })

const DIR = path.join(homedir(), ".cache/daygame-research/quit-copy/sos/shots-ours/best")

function shooter(page: Page, width: number) {
  rmSync(DIR, { recursive: true, force: true })
  mkdirSync(DIR, { recursive: true })
  let n = 0
  return async (name: string) => {
    n++
    // the dev-server badge is not part of the app: hide it in the picture only
    await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, "0")}-${name}.png`), style: "nextjs-portal { display: none !important }" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
}

const open = (page: Page) => page.goto("/quit/lab/sos/best?preview=1")

test("improved SOS: shelf, wait, every tool, after-flow, logs, pattern, switcher", async ({ page }) => {
  const shot = shooter(page, 390)
  await page.clock.install()
  await open(page)

  // help first: the whole shelf is on the screen before any tap
  await expect(page.getByTestId("shelf")).toBeVisible()
  for (const tool of ["breathe", "bubbles", "blocks", "move", "help", "reasons"]) {
    await expect(page.getByTestId(`tile-${tool}`)).toBeInViewport({ ratio: 1 })
  }
  await expect(page.getByTestId("pattern-wait")).toBeVisible()
  await shot("shelf")

  // a wait he chooses: 10 preselected, pick 5, it runs
  await expect(page.getByTestId("wait-10")).toHaveAttribute("aria-checked", "true")
  await expect(page.getByTestId("ring-clock")).toHaveText("10:00")
  await page.getByTestId("wait-5").click()
  await expect(page.getByTestId("ring-clock")).toHaveText("05:00")
  await page.getByTestId("wait-start").click()
  await page.clock.fastForward(2000)
  await expect(page.getByTestId("ring-clock")).toHaveText(/^04:[1-5]\d$/)
  await shot("wait-running")

  // hold to breathe
  await page.getByTestId("tile-breathe").click()
  await expect(page.getByTestId("ring-mini")).toBeVisible()
  const hold = page.getByTestId("breathe-hold")
  const box = (await hold.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(page.getByTestId("breathe-circle")).toHaveAttribute("data-held", "true")
  await expect(page.getByTestId("breathe-word")).toHaveText("Breathe out")
  await shot("breathe-held")
  await page.clock.fastForward(3000)
  await page.mouse.up()
  await expect(page.getByTestId("breathe-circle")).toHaveAttribute("data-held", "false")
  await expect(page.getByTestId("breathe-count")).toHaveText("1")
  await expect(page.getByTestId("breathe-last")).toHaveText(/^3(\.\d)?$/)
  await shot("breathe-released")
  await page.getByTestId("tool-back").click()
  await expect(page.getByTestId("shelf")).toBeVisible()

  // bubble wrap
  await page.getByTestId("tile-bubbles").click()
  await expect(page.getByTestId("bubble")).toHaveCount(42)
  await page.getByTestId("bubble").nth(0).click()
  await page.getByTestId("bubble").nth(1).click()
  await page.getByTestId("bubble").nth(1).click()
  await expect(page.getByTestId("bubble-count")).toHaveText("2")
  await shot("bubble-wrap")
  await page.getByTestId("tool-back").click()

  // block puzzle
  await page.getByTestId("tile-blocks").click()
  await expect(page.getByTestId("tile")).toHaveCount(16)
  const filled = () => page.locator('[data-testid="tile"]:not([data-value="0"])').count()
  expect(await filled()).toBe(2)
  for (const k of ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"]) await page.keyboard.press(k)
  expect(await filled()).toBeGreaterThan(2)
  await shot("block-puzzle")
  await page.getByTestId("blocks-restart").click()
  expect(await filled()).toBe(2)
  await page.getByTestId("tool-back").click()

  // move for five minutes: the checked swap with its sources
  await page.getByTestId("tile-move").click()
  await expect(page.getByTestId("move-card")).toBeVisible()
  await page.getByTestId("move-card").getByRole("button").click()
  await expect(page.getByTestId("move-card").getByRole("link").first()).toBeVisible()
  await shot("move-five")
  await page.getByTestId("tool-back").click()

  // help for this moment: pick a moment, step through the ideas
  await page.getByTestId("tile-help").click()
  await expect(page.getByTestId("help-card")).toHaveCount(0)
  await page.getByTestId("moment-coffee").click()
  await expect(page.getByTestId("help-card")).toBeVisible()
  const pos = await page.getByTestId("help-pos").innerText()
  await page.getByTestId("help-next").click()
  await expect(page.getByTestId("help-pos")).not.toHaveText(pos)
  await shot("help-card")
  await page.getByTestId("help-prev").click()
  await expect(page.getByTestId("help-pos")).toHaveText(pos)
  await page.getByTestId("tool-back").click()

  // reasons and money, kept across a reload
  await page.getByTestId("tile-reasons").click()
  await page.getByTestId("reason-input").fill("To get my evenings back")
  await page.getByTestId("money-input").fill("120")
  await expect(page.getByTestId("reason-shown")).toHaveText("To get my evenings back")
  await expect(page.getByTestId("money-shown")).toContainText("120")
  await shot("reasons")
  await open(page)
  await page.getByTestId("tile-reasons").click()
  await expect(page.getByTestId("reason-input")).toHaveValue("To get my evenings back")
  await page.getByTestId("tool-back").click()

  // afterwards: did you smoke? no -> a plain line
  await page.getByTestId("finish").click()
  await expect(page.getByTestId("ask")).toContainText("Did you smoke?")
  await shot("did-you-smoke")
  await page.getByTestId("ask-no").click()
  await expect(page.getByTestId("result-plain")).toContainText("You did not smoke.")
  await expect(page.getByTestId("result-plain")).toContainText("Tools used")
  await shot("result-no")

  // the log row: a second log within five minutes updates the first
  await page.getByTestId("strength-7").click()
  await page.getByTestId("log-situation-coffee").click()
  await page.getByTestId("log-save").click()
  await expect(page.getByTestId("log-msg")).toHaveText("Log saved.")
  await expect(page.getByTestId("log-count")).toHaveText("1")
  await shot("log-saved")
  await page.getByTestId("strength-4").click()
  await page.getByTestId("log-save").click()
  await expect(page.getByTestId("log-msg")).toHaveText("Updated the log from a few minutes ago.")
  await expect(page.getByTestId("log-count")).toHaveText("1")
  await page.clock.fastForward("06:00")
  await page.getByTestId("log-situation-drinks").click()
  await page.getByTestId("log-save").click()
  await expect(page.getByTestId("log-msg")).toHaveText("Log saved.")
  await expect(page.getByTestId("log-count")).toHaveText("2")
  await page.clock.fastForward("06:00")
  await page.getByTestId("log-situation-coffee").click()
  await page.getByTestId("log-save").click()
  await expect(page.getByTestId("log-count")).toHaveText(/^3(\.\d)?$/)

  // after three logs the bar list shows; the wait ran out meanwhile
  await page.getByTestId("again").click()
  await expect(page.getByTestId("pattern-bars")).toBeVisible()
  await expect(page.getByTestId("pattern-bar")).toHaveCount(2)
  await expect(page.getByTestId("pattern-bar").first()).toContainText("67 %")
  await expect(page.getByTestId("wait-over")).toBeVisible()
  await shot("pattern")

  // yes: no blame, nothing resets
  await page.getByTestId("finish").click()
  await page.getByTestId("ask-yes").click()
  await expect(page.getByTestId("result-note")).toContainText("Nothing resets")
  await expect(page.getByTestId("diary-link")).toBeVisible()
  await shot("result-yes")
  await page.getByTestId("again").click()

  // the switcher: no crash, missing content says so
  for (const id of ["weed", "porn", "alcohol"]) {
    await page.getByTestId(`switch-${id}`).click()
    await expect(page.getByTestId(`switch-${id}`)).toHaveAttribute("aria-checked", "true")
    await expect(page.getByTestId("shelf")).toBeVisible()
    await expect(page.getByTestId("pattern").getByTestId("content-coming")).toBeVisible()
    for (const tool of ["move", "help"]) {
      await page.getByTestId(`tile-${tool}`).click()
      await expect(page.getByTestId("content-coming")).toHaveText("content coming")
      await page.getByTestId("tool-back").click()
    }
    for (const tool of ["breathe", "bubbles", "blocks", "reasons"]) {
      await page.getByTestId(`tile-${tool}`).click()
      await expect(page.getByTestId(`tool-${tool}`)).toBeVisible()
      await page.getByTestId("tool-back").click()
    }
    if (id === "weed") await shot("weed-content-coming")
  }
  await page.getByTestId("finish").click()
  await expect(page.getByTestId("ask")).toContainText("Did you drink?")
  await page.getByTestId("ask-no").click()
  await expect(page.getByTestId("log-row").getByTestId("content-coming")).toBeVisible()
  await shot("alcohol-result")
})

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test("improved SOS looks sane at 1280 wide", async ({ page }) => {
    await open(page)
    await expect(page.getByTestId("shelf")).toBeVisible()
    await expect(page.getByTestId("ring-card")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280)
    mkdirSync(DIR, { recursive: true })
    await page.screenshot({ path: path.join(DIR, "99-desktop-1280.png"), style: "nextjs-portal { display: none !important }" })
  })
})
