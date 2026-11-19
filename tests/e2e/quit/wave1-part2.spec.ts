/**
 * QUIT TOOLS, WAVE 1 PART 2: SYMPTOM GUIDE.
 *
 * Signed out: the symptom list and one symptom. (The slip tool has its own spec, slip.spec.ts.)
 * Every expected text is read from the data files at run time.
 * With QUIT_SHOTS_DIR set it also saves a screenshot of each screen.
 */

import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import type { Page } from "@playwright/test"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const data = nicotineJson as unknown as {
  symptomCourse: { symptom: string; peak: string | null; lasts: string; text: string }[]
  symptomHelp: { symptom: string; text: string }[]
  symptomWords: Record<string, string>
  symptomCourseNote: string
}
const t = tooltextJson
const A = "/quit/nicotine"

test.use({ viewport: { width: 390, height: 844 } })

async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

test.describe("quit wave 1 part 2, signed out @phone", () => {
  test.use({ storageState: SIGNED_OUT })

  test("symptom guide: list, one symptom, sleep rules, no forum share", async ({ page }) => {
    await page.goto(quitUrl(`${A}/symptoms`))
    const list = page.getByTestId("symptom-list")
    await expect(list.locator("button")).toHaveCount(data.symptomCourse.length)
    await expect(page.getByTestId("symptom-tired")).toHaveCount(0)
    await noSideways(page)
    await shot(page, "symptoms-list")
    const sleep = data.symptomCourse.find((s) => s.symptom === "sleep")!
    await page.getByTestId("symptom-sleep").click()
    await expect(page.getByTestId("symptom-worst")).toHaveText(`Worst: ${sleep.peak}`)
    await expect(page.getByTestId("symptom-eases")).toHaveText(`Usually eases: ${sleep.lasts}`)
    await expect(page.getByTestId("symptom-detail")).not.toContainText(sleep.text)
    // the four rules below answer sleep, so its single help row is hidden
    await expect(page.getByTestId("symptom-help")).toHaveCount(0)
    await expect(page.getByTestId("sleep-rules").locator("li")).toHaveCount(4)
    await expect(page.getByTestId("symptom-detail")).toContainText(data.symptomCourseNote)
    await expect(page.getByTestId("symptom-detail")).toContainText(t.evidence.weak)
    await noSideways(page)
    await shot(page, "symptoms-detail-sleep")
    expect(await page.locator("body").innerText()).not.toMatch(/in 100 posts|posts mention|of posts/i)
    // browser Back returns to the list
    await page.goBack()
    await expect(page.getByTestId("symptom-list")).toBeVisible()
    await page.getByTestId("symptom-irritable").click()
    await expect(page.getByTestId("sleep-rules")).toHaveCount(0)
    await shot(page, "symptoms-detail-irritable")
    await page.getByTestId("symptom-back").click()
    await expect(page.getByTestId("symptom-list")).toBeVisible()
  })
})
