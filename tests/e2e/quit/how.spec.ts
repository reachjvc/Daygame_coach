/**
 * QUIT TOOL 12, "HOW PEOPLE QUIT" (/quit/nicotine/how), acceptance 1 to 7 of Plans/quit-finish.md.
 *
 * A read page: nothing is saved, so every test starts fresh. Walked at 390x844 (touch) and 1280x800.
 * Expected texts come from the data files. With QUIT_SHOTS_DIR set it saves a screenshot of each state.
 */

import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const data = nicotineJson as unknown as {
  hope: { kind: string; big: string; headline: string }
  numbers: { kind: string; big: string; headline: string }[]
  facts: { id: string; answer: boolean }[]
}
const t = tooltextJson as unknown as { how: Record<string, string>; common: { basis: Record<string, string>; source: string } }
const URL = quitUrl("/quit/nicotine/how")
const SIZES = [
  { name: "phone", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: "desktop", viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false },
] as const

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}

/** Visible buttons and links inside the tool smaller than 44 px high. */
async function smallTargets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-testid=how] button, [data-testid=how] a")]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ text: el.textContent?.trim() ?? "", h: el.getBoundingClientRect().height }))
      .filter((x) => x.h < 44),
  )
}

for (const size of SIZES) {
  test.describe(`how people quit, ${size.name}`, () => {
    test.use({ storageState: SIGNED_OUT, viewport: size.viewport, hasTouch: size.hasTouch, isMobile: size.isMobile })

    test("every number shows once, hope first, with its counted line; Details opens the basis and source", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text())
      })
      await page.goto(URL)
      const cards = page.locator('[data-testid^="number-"]')
      await expect(cards).toHaveCount(data.numbers.length) // the hero is numbers[0] and shows once
      await expect(cards.first()).toHaveAttribute("data-testid", `number-${data.hope.kind}`)
      await expect(page.getByTestId("studies-line")).toHaveText(t.how.studiesLine)
      for (let i = 0; i < data.numbers.length; i++) await expect(cards.nth(i).getByText(/^Counted:/)).toBeVisible()
      await shot(page, `how-${size.name}`)

      const first = cards.nth(1)
      const btn = first.getByTestId("details")
      await expect(btn).toHaveAttribute("aria-expanded", "false")
      await btn.click()
      await expect(btn).toHaveAttribute("aria-expanded", "true")
      const basis = first.getByTestId("basis")
      for (const k of ["design", "who", "n", "where", "when", "measured"]) await expect(basis.getByText(t.common.basis[k], { exact: true })).toBeVisible()
      await basis.getByRole("button", { name: t.common.source, exact: true }).click()
      await expect(basis.getByRole("link").first()).toHaveAttribute("target", "_blank")
      await shot(page, `how-details-${size.name}`)
      await noSideways(page)
      expect(await smallTargets(page)).toEqual([])
      expect(errors).toEqual([])
    })

    test("no headline repeats its figure at the start, and no figure is a time stamp", async ({ page }) => {
      await page.goto(URL)
      const cards = page.locator('[data-testid^="number-"]')
      const n = await cards.count()
      for (let i = 0; i < n; i++) {
        const big = (await cards.nth(i).locator("p").first().innerText()).trim()
        const head = (await cards.nth(i).getByTestId("headline").innerText()).trim()
        expect(head.toLowerCase().startsWith(big.toLowerCase()), `${big} / ${head}`).toBe(false)
        expect(big).not.toMatch(/^Week 1$|^Years 1 and 3$/)
      }
    })

    test("jump buttons reach their section; the closed page is short", async ({ page }) => {
      await page.goto(URL)
      for (const id of ["how-after", "how-outside"]) {
        await page.getByTestId(`jump-${id}`).click()
        await expect(page.locator(`#${id}`)).toBeInViewport()
      }
      if (size.name === "phone") expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(5800)
    })

    test("true or not: a wrong guess says so and shows the answer with its source", async ({ page }) => {
      await page.goto(URL)
      for (const f of data.facts) {
        const card = page.getByTestId(`fact-${f.id}`)
        await card.getByTestId(f.answer ? "guess-false" : "guess-true").click()
        const answer = card.getByTestId("answer")
        await expect(answer).toContainText(t.how.notQuite)
        await expect(answer.getByRole("button", { name: t.common.source, exact: true })).toBeVisible()
      }
      await page.getByTestId("fact-f3").scrollIntoViewIfNeeded()
      await shot(page, `how-facts-${size.name}`)
      await page.reload()
      await expect(page.getByTestId("fact-f1").getByTestId("guess-true")).toBeVisible()
    })

    test("free help lists the four services only, and the library extras are gone", async ({ page }) => {
      await page.goto(URL)
      const rows = page.locator('[data-testid^="outside-"]')
      await expect(rows).toHaveCount(4)
      for (const id of ["forum", "exercise", "tell-one", "combo-nrt"]) await expect(page.getByTestId(`outside-${id}`)).toHaveCount(0)
      await expect(page.getByRole("searchbox")).toHaveCount(0)
      await expect(page.getByText(/Mark as read|min read/)).toHaveCount(0)
      await expect(page.locator('[data-testid^="switch-"]')).toHaveCount(0)
    })
  })
}

test.describe("how people quit, menu", () => {
  test.use({ storageState: SIGNED_OUT, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test("the menu row opens it", async ({ page }) => {
    await page.goto(quitUrl("/quit/nicotine"))
    await page.getByRole("link", { name: /How people quit/ }).click()
    await expect(page).toHaveURL(/\/quit\/nicotine\/how/)
    await expect(page.getByTestId("how")).toBeVisible()
  })
})
