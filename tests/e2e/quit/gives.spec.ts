/**
 * QUIT TOOL 13, "WHAT IT GIVES YOU", WALKED ON A PHONE AND AT DESKTOP WIDTH (acceptance 1 to 12 of Plans/quit-finish.md).
 *
 * The clock is fixed (Thursday 2026-11-19, 10:00). Signed out; nothing is written to a server.
 * Screenshots of each screen go to GIVES_SHOTS (default: the quit-finish scratch folder).
 */

import { mkdirSync, readFileSync } from "node:fs"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotineJson from "../../../src/quit/data/nicotine.json"

const data = nicotineJson as unknown as {
  beliefs: { id: string; need: string; limiting: string }[]
  needs: { id: string; name: string; line: string; swaps: { id: string; text: string; evidence: string }[] }[]
}
const SHOTS = process.env.GIVES_SHOTS ?? "/home/jonaswsl/.cache/daygame-research/quit-finish/gives/shots"
const PAGE = quitUrl("/quit/nicotine/gives")
const NOW = new Date("2026-11-19T10:00:00")
const TODAY = "2026-11-19"
const belief = (id: string) => data.beliefs.find((b) => b.id === id)!
const need = (id: string) => data.needs.find((n) => n.id === id)!

for (const view of [
  { name: "390x844 touch", width: 390, height: 844, mobile: true },
  { name: "1280x800", width: 1280, height: 800, mobile: false },
]) {
  test.describe(`what it gives you, ${view.name}`, () => {
    test.use({ storageState: SIGNED_OUT, viewport: { width: view.width, height: view.height }, hasTouch: view.mobile, isMobile: view.mobile })

    const shot = async (page: Page, name: string) => {
      mkdirSync(SHOTS, { recursive: true })
      await page.screenshot({ path: `${SHOTS}/gives-${name}-${view.width}.png`, fullPage: true })
    }
    async function open(page: Page, url = PAGE) {
      await page.clock.install({ time: NOW })
      await page.goto(url)
    }
    /** Taps and moves the page clock past the double-tap guard, so the next tap is a new one. */
    async function tap(page: Page, id: string, nth = 0) {
      await page.getByTestId(id).nth(nth).click()
      await page.clock.runFor(300)
    }
    const seed = (page: Page, value: unknown) => page.evaluate((v) => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: v })), value)
    const stored = (page: Page) =>
      page.evaluate(() => {
        const raw = localStorage.getItem("quit-v1")
        return raw ? (JSON.parse(raw).nicotine ?? {}) : {}
      })
    const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(view.width)
    /** Every button, link and field that can be tapped is at least 44 px tall. */
    const bigTargets = async (page: Page) => {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main button, main a, main input, main select")]
          .filter((el) => el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled)
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ el, r }) => r.width > 0 && (r.height < 43.5 || (el.tagName === "BUTTON" && el.getAttribute("data-testid") !== "screen-back" && r.width < 43.5)))
          .map(({ el, r }) => `${el.tagName} ${(el.textContent ?? "").trim().slice(0, 30)} ${Math.round(r.height)}`),
      )
      expect(small).toEqual([])
    }
    const pick = async (page: Page, ...ids: string[]) => {
      for (const id of ids) await page.getByTestId(`need-${id}`).click()
    }
    const toResult = async (page: Page) => {
      await expect(page.getByTestId("result")).toBeVisible()
    }
    /** Picks needs, continues, adds the first data swap on each needs screen, walks to the result. */
    async function walk(page: Page, ids: string[], addFirst = true) {
      await pick(page, ...ids)
      await tap(page, "gives-continue")
      for (let i = 0; i < ids.length; i++) {
        if (addFirst) await page.getByTestId("toggle-swap").first().click()
        await tap(page, "gives-next")
      }
      await toResult(page)
    }

    test("1 fresh: nine cards with their lines; a fourth pick is not possible", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(e.message))
      await open(page)
      await expect(page.getByRole("progressbar")).toBeVisible()
      await expect(page.locator('[data-testid^="need-"]')).toHaveCount(9)
      for (const n of data.needs) {
        await expect(page.getByTestId(`need-${n.id}`)).toContainText(n.name)
        await expect(page.getByTestId(`need-${n.id}`)).toContainText(n.line)
      }
      await expect(page.getByTestId("need-own")).toContainText("Something else")
      await expect(page.getByTestId("gives-continue")).toBeDisabled()
      await shot(page, "1-pick")
      await pick(page, "relief", "reward", "sleep")
      await expect(page.getByTestId("pick-max")).toHaveText("Three is the most. Untick one to change.")
      await expect(page.getByTestId("need-focus")).toBeDisabled()
      await page.getByTestId("need-own").click({ force: true })
      await expect(page.getByTestId("need-own")).toHaveAttribute("aria-checked", "false")
      await expect(page.getByTestId("need-relief")).toHaveAttribute("aria-checked", "true")
      await shot(page, "1-pick-three")
      await page.getByTestId("need-reward").click()
      await expect(page.getByTestId("pick-max")).toHaveCount(0)
      await expect(page.getByTestId("need-focus")).toBeEnabled()
      await noSideways(page)
      await bigTargets(page)
      expect(errors).toEqual([])
    })

    test("2 lies test b3 = 5 and b9 = 4: Relief and Sleep preselected; Relief quotes only b3, not b12 rated 1", async ({ page }) => {
      await open(page)
      await seed(page, { beliefs: { ratings: { b3: 5, b9: 4, b12: 1 }, facts: {} } })
      await page.goto(PAGE)
      await expect(page.getByTestId("need-relief")).toHaveAttribute("aria-checked", "true")
      await expect(page.getByTestId("need-sleep")).toHaveAttribute("aria-checked", "true")
      await expect(page.getByTestId("need-focus")).toHaveAttribute("aria-checked", "false")
      await tap(page, "gives-continue")
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      await expect(page.getByTestId("quotes")).toContainText("What you tell yourself")
      await expect(page.getByTestId("quotes")).toContainText(belief("b3").limiting)
      await expect(page.getByTestId("quotes")).not.toContainText(belief("b12").limiting)
      await shot(page, "2-need-quotes")
      // taken, but none rated 3 or more: the section is left out
      await seed(page, { beliefs: { ratings: { b3: 2, b12: 1 }, facts: {} } })
      await page.goto(PAGE)
      await pick(page, "relief")
      await tap(page, "gives-continue")
      await expect(page.getByTestId("quotes")).toHaveCount(0)
    })

    test("2 no lies test saved: 'What people tell themselves' with both lines", async ({ page }) => {
      await open(page)
      await pick(page, "relief")
      await tap(page, "gives-continue")
      await expect(page.getByTestId("quotes")).toContainText("What people tell themselves")
      await expect(page.getByTestId("quotes")).toContainText(belief("b3").limiting)
      await expect(page.getByTestId("quotes")).toContainText(belief("b12").limiting)
    })

    test("3 #need=focus preselects Focus; ?need=focus becomes #need=focus; #need=nonsense is ignored", async ({ page }) => {
      await open(page, quitUrl("/quit/nicotine/gives#need=focus"))
      await expect(page.getByTestId("need-focus")).toHaveAttribute("aria-checked", "true")
      await expect(page.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(1)
      await page.goto(quitUrl("/quit/nicotine/gives?need=focus"))
      await expect(page.getByTestId("need-focus")).toHaveAttribute("aria-checked", "true")
      await expect.poll(() => new URL(page.url()).search).not.toMatch(/need=/)
      expect(new URL(page.url()).hash).toBe("#need=focus")
      await page.evaluate(() => localStorage.clear())
      await page.goto("about:blank")
      await page.goto(quitUrl("/quit/nicotine/gives#need=nonsense"))
      await expect(page.locator('[role="checkbox"][aria-checked="true"]')).toHaveCount(0)
      await expect(page.getByTestId("gives-continue")).toBeDisabled()
    })

    test("4 add, then remove, a swap: gone from the list, from tried, and its rating", async ({ page }) => {
      await open(page)
      await pick(page, "relief")
      await tap(page, "gives-continue")
      const first = need("relief").swaps[0]
      const card = page.locator(`[data-swap="${first.id}"]`)
      await expect(card.getByTestId("toggle-swap")).toHaveText("Add to my list")
      await card.getByTestId("toggle-swap").click()
      await expect(card.getByTestId("toggle-swap")).toHaveText("On my list · Remove")
      expect(Object.keys((await stored(page)).gives.tried)).toEqual([first.id])
      expect((await stored(page)).gives.tried[first.id]).toEqual({ swapId: first.id, triedOn: TODAY })
      await shot(page, "2-need-added")
      await tap(page, "gives-next")
      await tap(page, "rate-80")
      await page.goBack()
      await card.getByTestId("toggle-swap").click()
      await expect(card.getByTestId("toggle-swap")).toHaveText("Add to my list")
      const g = (await stored(page)).gives
      expect(g.tried).toEqual({})
      expect(g.rated).toEqual({})
      await tap(page, "gives-next")
      await expect(page.getByTestId("need-empty")).toContainText("Nothing on your list for Relief yet.")
    })

    test("5 own swap on Relief; Something else gets its own screen; the list shows both", async ({ page }) => {
      await open(page)
      await pick(page, "relief", "own")
      await expect(page.getByTestId("gives-continue")).toBeDisabled()
      await page.getByLabel("What does it give you?", { exact: true }).fill("a reason to step outside")
      await expect(page.getByTestId("gives-continue")).toBeEnabled()
      await shot(page, "1-pick-other")
      await tap(page, "gives-continue")
      await page.getByLabel("Something that gives you this, in your words").fill("Call my brother")
      await page.getByTestId("own-add").click()
      await expect(page.getByTestId("own-swap")).toHaveText(/Call my brother/)
      await expect(page.getByTestId("own-input")).toHaveValue("")
      expect((await stored(page)).gives.own.relief).toHaveLength(1)
      await shot(page, "2-need-own")
      await tap(page, "gives-next")
      // the Something else screen: heading is his words, only the own-swap field
      await expect(page.getByTestId("need-heading")).toHaveText("A reason to step outside")
      await expect(page.getByTestId("swap")).toHaveCount(0)
      await expect(page.getByTestId("quotes")).toHaveCount(0)
      await expect(page.getByTestId("own-input")).toBeVisible()
      await page.getByTestId("own-input").fill("Stand on the step for five minutes")
      await page.getByTestId("own-input").press("Enter")
      await expect(page.getByTestId("own-swap")).toHaveCount(1)
      await shot(page, "2-need-other")
      await tap(page, "gives-next")
      await toResult(page)
      const groups = page.getByTestId("result-need")
      await expect(groups.nth(0)).toContainText("Relief")
      await expect(groups.nth(0)).toContainText("Call my brother")
      await expect(groups.nth(1)).toContainText("A reason to step outside")
      await expect(groups.nth(1)).toContainText("Stand on the step for five minutes")
      // remove an own swap
      await tap(page, "change-needs")
      await tap(page, "gives-continue")
      await page.getByTestId("own-remove").click()
      await expect(page.getByTestId("own-swap")).toHaveCount(0)
      expect((await stored(page)).gives.own.relief).toEqual([])
    })

    test("5 a sixth own swap is not possible; a 60-character unbroken swap does not widen the page", async ({ page }) => {
      await open(page)
      await pick(page, "relief")
      await tap(page, "gives-continue")
      await page.getByTestId("own-input").fill("W".repeat(70))
      await expect(page.getByTestId("own-input")).toHaveValue("W".repeat(60))
      await page.getByTestId("own-add").click()
      await noSideways(page)
      for (let i = 1; i < 5; i++) {
        await page.getByTestId("own-input").fill(`swap ${i}`)
        await page.getByTestId("own-add").click()
      }
      await expect(page.getByTestId("own-swap")).toHaveCount(5)
      await expect(page.getByTestId("own-input")).toHaveCount(0)
      await expect(page.getByTestId("own-swaps")).toContainText("Five is the most")
      await noSideways(page)
    })

    test("6 rate Most of it: the 80% mark, and that swap is first on the screen; None: Try another one", async ({ page }) => {
      await open(page)
      const swaps = need("relief").swaps
      await pick(page, "relief")
      await tap(page, "gives-continue")
      await page.locator(`[data-swap="${swaps[1].id}"]`).getByTestId("toggle-swap").click()
      await page.locator(`[data-swap="${swaps[2].id}"]`).getByTestId("toggle-swap").click()
      await tap(page, "gives-next")
      
      await expect(page.getByTestId("result")).toContainText("Find your 80% swaps")
      await expect(page.getByTestId("result")).not.toContainText("On your list since")
      await expect(page.getByTestId("rate-question")).toHaveText("Tried it? How much of it did it give you?")
      await expect(page.getByText("Tried it? How much of it did it give you?")).toHaveCount(1)
      const row = (id: string) => page.locator(`[data-testid="listed"][data-swap="${id}"]`)
      for (const label of ["None", "A little", "About half", "Most of it", "All of it"]) await expect(row(swaps[1].id).getByRole("radio", { name: label })).toBeVisible()
      await shot(page, "3-result-fresh")
      await row(swaps[2].id).getByTestId("rate-80").click()
      await expect(row(swaps[2].id).getByTestId("mark-80")).toHaveText("80% swap")
      await expect(row(swaps[1].id).getByTestId("mark-80")).toHaveCount(0)
      expect((await stored(page)).gives.rated).toEqual({ [swaps[2].id]: 80 })
      // tap the chosen button again: cleared
      await row(swaps[2].id).getByTestId("rate-80").click()
      await expect(row(swaps[2].id).getByTestId("mark-80")).toHaveCount(0)
      await row(swaps[2].id).getByTestId("rate-100").click()
      await expect(row(swaps[2].id).getByTestId("mark-80")).toBeVisible()
      await row(swaps[1].id).getByTestId("rate-0").click()
      await expect(row(swaps[1].id).getByTestId("try-another")).toBeVisible()
      await expect(row(swaps[2].id).getByTestId("try-another")).toHaveCount(0)
      await shot(page, "3-result-rated")
      await page.getByTestId("try-another").click()
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      await expect(page.getByTestId("swap").first()).toHaveAttribute("data-swap", swaps[2].id)
      // None clears nothing else: a little also offers another one
      await page.getByTestId("gives-next").click()
    })

    test("7 reminder: .ics has one event and one alarm, 7 days ahead at 19:00; the Google link holds the same date", async ({ page }) => {
      await open(page)
      await walk(page, ["relief"])
      const href = await page.getByTestId("remind-google").getAttribute("href")
      expect(href).toContain("calendar.google.com/calendar/render")
      expect(href).toContain("dates=20261126T190000/20261126T193000")
      expect(href).toContain("text=Rate%20your%20swaps")
      expect(href).not.toContain("preview")
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("remind-ics").click()])
      const path = await download.path()
      const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
      expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(1)
      expect(text.match(/BEGIN:VALARM/g)).toHaveLength(1)
      expect(text).toContain("DTSTART:20261126T190000")
      expect(text).toContain("DTEND:20261126T193000")
      expect(text).toContain("SUMMARY:Rate your swaps")
      expect(text).toContain("/quit/nicotine/gives")
      expect(text).not.toContain("preview")
      const stamp = text.match(/DTSTAMP:(\d{8}T\d{6})Z/)![1]
      const at = Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8), +stamp.slice(9, 11), +stamp.slice(11, 13), +stamp.slice(13, 15))
      expect(Math.abs(at - NOW.getTime())).toBeLessThan(60_000)
    })

    test("8 start again asks; Keep changes nothing; Clear empties the gives key only", async ({ page }) => {
      await open(page)
      await seed(page, { beliefs: { ratings: { b3: 2 }, facts: {} } })
      await page.goto(PAGE)
      await walk(page, ["relief"])
      await expect(page.getByTestId("result")).toContainText("Your list is kept on this device.")
      await expect(page.getByTestId("start-again-ask")).toHaveCount(0)
      await page.getByTestId("start-again").click()
      await expect(page.getByTestId("start-again-ask")).toContainText("This empties your list, your own swaps and your ratings.")
      await shot(page, "3-result-ask")
      const before = await stored(page)
      await page.getByTestId("start-again-keep").click()
      await expect(page.getByTestId("start-again-ask")).toHaveCount(0)
      expect(await stored(page)).toEqual(before)
      await page.getByTestId("start-again").click()
      await page.getByTestId("start-again-clear").click()
      await expect(page.getByTestId("question")).toBeVisible()
      await expect(page.locator('[data-testid^="need-"]')).toHaveCount(9)
      const after = await stored(page)
      expect(after.gives).toBeUndefined()
      expect(after.beliefs).toEqual(before.beliefs)
    })

    test("9 every Based on fold shows Who, How many and Caveat; Not tested swaps have none", async ({ page }) => {
      await open(page)
      await pick(page, "relief", "reward", "connection")
      await tap(page, "gives-continue")
      for (const id of ["relief", "reward", "connection"]) {
        for (const s of need(id).swaps) {
          const card = page.locator(`[data-swap="${s.id}"]`)
          if (s.evidence === "none") {
            await expect(card.getByTestId("swap-basis")).toHaveCount(0)
            await expect(card).toContainText("Not tested")
          } else {
            await expect(card.getByTestId("swap-basis-detail")).toHaveCount(0)
            await card.getByTestId("swap-basis-toggle").click()
            const d = card.getByTestId("swap-basis-detail")
            await expect(d).toContainText("Who:")
            await expect(d).toContainText("How many:")
            await expect(d).toContainText("Caveat:")
            await expect(d).not.toContainText("Not stated")
            await expect(d.locator("a")).not.toHaveCount(0)
            await expect(d.locator("em, i, p.italic").first()).toBeVisible()
          }
        }
        if (id === "relief") await shot(page, "2-need-basis")
        await tap(page, "gives-next")
      }
    })

    test("10 double tap on Continue and Next moves one screen; reload resumes; Back steps back", async ({ page }) => {
      await open(page)
      await pick(page, "relief", "reward")
      await page.getByTestId("gives-continue").dblclick()
      await expect.poll(() => new URL(page.url()).searchParams.get("s")).toBe("2")
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      await page.clock.runFor(300)
      await page.getByTestId("toggle-swap").first().click()
      await page.getByTestId("gives-next").dblclick()
      await expect.poll(() => new URL(page.url()).searchParams.get("s")).toBe("3")
      await expect(page.getByTestId("need-heading")).toHaveText("Reward")
      await page.clock.runFor(300)
      // reload on screen 3 resumes there (a saved list opens the result, so a reload keeps the screen in the address)
      await page.reload()
      await expect(page.getByTestId("need-heading")).toHaveText("Reward")
      await tap(page, "gives-next")
      await toResult(page)
      await page.reload()
      await toResult(page)
      await page.goBack()
      await expect(page.getByTestId("need-heading")).toHaveText("Reward")
      await page.goBack()
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      await expect(page.getByTestId("screen-back")).toBeVisible()
      await page.getByTestId("screen-back").click()
      await expect(page.getByTestId("need-relief")).toBeVisible()
      await expect(page.getByTestId("screen-back")).toHaveCount(0)
    })

    test("10 reopening: a saved list opens the result; picks without a list open the first need; nothing opens the pick", async ({ page }) => {
      await open(page)
      await expect(page.getByTestId("need-relief")).toBeVisible()
      await seed(page, { gives: { done: 1, picked: ["sleep"], tried: {}, rated: {} } })
      await page.goto(PAGE)
      await expect(page.getByTestId("need-heading")).toHaveText("Sleep")
      await seed(page, { gives: { done: 1, picked: ["sleep"], tried: { "sleep-2": { swapId: "sleep-2", triedOn: TODAY } }, rated: {} } })
      await page.goto(PAGE)
      await toResult(page)
      await expect(page.getByTestId("listed")).toContainText(need("sleep").swaps[1].text)
    })

    test("wave-1 save (no new fields, a slider rating) opens, and the old rating shows on the nearest button", async ({ page }) => {
      await open(page)
      await seed(page, { gives: { done: 1, picked: ["relief"], tried: { "relief-2": { swapId: "relief-2", triedOn: "2026-11-10" } }, rated: { "relief-2": 70 } } })
      await page.goto(PAGE)
      await toResult(page)
      await expect(page.getByTestId("listed")).toContainText("On your list since Tue, Nov 10")
      await expect(page.getByTestId("rate-80")).toHaveAttribute("aria-checked", "true")
      await expect(page.getByTestId("mark-80")).toBeVisible()
    })

    test("11 next links appear only for live tools; change goes to screen 1 and keeps the list; menu link", async ({ page }) => {
      await open(page)
      await walk(page, ["relief"])
      await expect(page.getByTestId("next-sos")).toContainText("Craving now?")
      await expect(page.getByTestId("next-sos")).toContainText("Help for the moment itself")
      await expect(page.getByTestId("next-date")).toContainText("Your quit date")
      await expect(page.getByTestId("next-date")).toContainText("Step 3 of the plan: pick day 1")
      expect(await page.getByTestId("next-date").getAttribute("href")).toMatch(/\/quit\/nicotine\/date/)
      expect(await page.getByTestId("to-menu").getAttribute("href")).toMatch(/^\/quit\/nicotine/)
      await shot(page, "3-result-links")
      await tap(page, "change-needs")
      await expect(page.getByTestId("need-relief")).toHaveAttribute("aria-checked", "true")
      expect(Object.keys((await stored(page)).gives.tried)).toHaveLength(1)
    })

    test("12 result: no console error, no sideways scroll, tap targets at least 44 px; the menu opens the tool", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(e.message))
      await open(page)
      await seed(page, { beliefs: { ratings: { b3: 5, b9: 4 }, facts: {} } })
      await page.goto(PAGE)
      await tap(page, "gives-continue")
      await page.locator('[data-testid="swap-basis-toggle"]').first().click()
      await bigTargets(page)
      await noSideways(page)
      await tap(page, "gives-next")
      await shot(page, "2-need-sleep")
      await page.getByTestId("own-input").fill("Q".repeat(60))
      await page.getByTestId("own-add").click()
      await page.getByTestId("toggle-swap").first().click()
      await bigTargets(page)
      await noSideways(page)
      await tap(page, "gives-next")
      await toResult(page)
      await shot(page, "3-result")
      await bigTargets(page)
      await noSideways(page)
      await page.getByTestId("start-again").click()
      await bigTargets(page)
      expect(errors).toEqual([])
      await page.goto(quitUrl("/quit/nicotine"))
      const link = page.locator('a[href*="/quit/nicotine/gives"]').first()
      await expect(link).toContainText("Find swaps that give you most of it.")
      await expect(link).toContainText("3 min")
      await link.click()
      await expect(page.locator("h1")).toHaveText("What it gives you")
      await expect(page).toHaveURL(/\/quit\/nicotine\/gives/)
    })

    test("R1 Back reaches the pick screen: in-page Back and browser Back from screen 2; from the result Back walks back to screen 1", async ({ page }) => {
      await open(page)
      await pick(page, "relief", "reward")
      await tap(page, "gives-continue")
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      await page.goBack()
      await expect(page.getByTestId("need-relief")).toHaveAttribute("aria-checked", "true")
      await expect(page.getByTestId("gives-continue")).toBeVisible()
      await page.goForward()
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      await page.getByTestId("screen-back").click()
      await expect(page.getByTestId("need-relief")).toBeVisible()
      await expect(page.getByTestId("screen-back")).toHaveCount(0)
      await tap(page, "gives-continue")
      await page.getByTestId("toggle-swap").first().click()
      await tap(page, "gives-next")
      await tap(page, "gives-next")
      await toResult(page)
      for (const heading of ["Reward", "Relief"]) {
        await page.goBack()
        await expect(page.getByTestId("need-heading")).toHaveText(heading)
      }
      await page.goBack()
      await expect(page.getByTestId("need-relief")).toBeVisible()
    })

    test("R1 a 60-character unbroken Something else heading does not widen the page and starts with a capital", async ({ page }) => {
      await open(page)
      await pick(page, "own")
      await expect(page.getByTestId("own-need-hint")).toHaveText("Type what it gives you, or untick Something else.")
      await page.getByTestId("own-need").fill("w".repeat(60))
      await expect(page.getByTestId("own-need-hint")).toHaveCount(0)
      await tap(page, "gives-continue")
      await expect(page.getByTestId("need-heading")).toHaveText("W" + "w".repeat(59))
      await noSideways(page)
      expect((await stored(page)).gives.ownNeed).toBe("w".repeat(60))
    })

    test("R1 rating a card does not move it; a swap of a need he no longer picks shows under Also on your list and can be removed", async ({ page }) => {
      await open(page)
      const swaps = need("relief").swaps
      await pick(page, "relief", "reward")
      await tap(page, "gives-continue")
      await page.locator(`[data-swap="${swaps[0].id}"]`).getByTestId("toggle-swap").click()
      await page.locator(`[data-swap="${swaps[1].id}"]`).getByTestId("toggle-swap").click()
      await tap(page, "gives-next")
      await page.getByTestId("toggle-swap").first().click()
      await tap(page, "gives-next")
      await toResult(page)
      const ids = () => page.getByTestId("listed").evaluateAll((els) => els.map((e) => e.getAttribute("data-swap")))
      const before = await ids()
      expect(before).toHaveLength(3)
      await page.locator(`[data-testid="listed"][data-swap="${swaps[1].id}"]`).getByTestId("rate-100").click()
      await page.locator(`[data-testid="listed"][data-swap="${swaps[0].id}"]`).getByTestId("rate-0").click()
      expect(await ids()).toEqual(before)
      // change the picks: Relief out, Focus in
      await tap(page, "change-needs")
      await page.getByTestId("need-relief").click()
      await page.getByTestId("need-focus").click()
      await tap(page, "gives-continue")
      await tap(page, "gives-next")
      await tap(page, "gives-next")
      await toResult(page)
      const also = page.getByTestId("result-also")
      await expect(also).toContainText("Also on your list")
      await expect(also.getByTestId("listed")).toHaveCount(2)
      await expect(page.getByTestId("result-need").nth(0)).toContainText("Reward")
      await also.locator(`[data-swap="${swaps[1].id}"]`).getByTestId("listed-remove").click()
      await expect(also.getByTestId("listed")).toHaveCount(1)
      expect((await stored(page)).gives.tried[swaps[1].id]).toBeUndefined()
      await shot(page, "3-result-also")
    })

    test("R1 a repeated own swap says so and keeps the text; ratings follow the bands; empty list has no reminder", async ({ page }) => {
      await open(page)
      await pick(page, "relief")
      await tap(page, "gives-continue")
      await page.getByTestId("own-input").fill("Call my brother")
      await page.getByTestId("own-add").click()
      await page.getByTestId("own-input").fill("call my brother")
      await page.getByTestId("own-add").click()
      await expect(page.getByTestId("own-dup")).toHaveText("Already on your list.")
      await expect(page.getByTestId("own-input")).toHaveValue("call my brother")
      await expect(page.getByTestId("own-swap")).toHaveCount(1)
      await expect(page.getByTestId("own-swaps").getByRole("heading")).toHaveText("Your own swap")
      // swaps come before the own-swap field, with no "Three swaps" label
      await expect(page.locator("body")).not.toContainText("Three swaps")
      const order = await page.evaluate(() => {
        const sw = document.querySelector('[data-testid="swap"]')!
        const own = document.querySelector('[data-testid="own-swaps"]')!
        return !!(sw.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING)
      })
      expect(order).toBe(true)
      await page.getByTestId("own-remove").click()
      await expect(page.getByTestId("own-swaps").getByRole("heading")).toHaveCount(0)
      await tap(page, "gives-next")
      await expect(page.getByTestId("remind-ics")).toHaveCount(0)
      await expect(page.getByTestId("remind-google")).toHaveCount(0)
      await expect(page.getByTestId("rate-question")).toHaveCount(0)
      await expect(page.getByTestId("empty-link")).toHaveText("Pick swaps")
      const box = await page.getByTestId("empty-link").boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(43.5)
      await page.getByTestId("empty-link").click()
      await expect(page.getByTestId("need-heading")).toHaveText("Relief")
      // bands
      await seed(page, { gives: { done: 2, picked: ["relief"], tried: { "relief-2": { swapId: "relief-2", triedOn: TODAY } }, rated: { "relief-2": 60 } } })
      await page.goto(PAGE)
      await expect(page.getByTestId("rate-80")).toHaveAttribute("aria-checked", "true")
      await expect(page.getByTestId("mark-80")).toBeVisible()
      await seed(page, { gives: { done: 2, picked: ["relief"], tried: { "relief-2": { swapId: "relief-2", triedOn: TODAY } }, rated: { "relief-2": 59 } } })
      await page.goto("about:blank")
      await page.goto(PAGE)
      await expect(page.getByTestId("rate-50")).toHaveAttribute("aria-checked", "true")
      await expect(page.getByTestId("mark-80")).toHaveCount(0)
    })

    test("R1 result: rating buttons are one row of five; the reminder button is named for Apple or Outlook; .ics lines are at most 75 octets", async ({ page }) => {
      await open(page)
      await pick(page, "relief")
      await tap(page, "gives-continue")
      await page.getByTestId("own-input").fill("Q".repeat(60))
      await page.getByTestId("own-add").click()
      await tap(page, "gives-next")
      const tops = await page.getByTestId("listed").first().locator('[role="radio"]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)))
      expect(new Set(tops).size).toBe(1)
      await expect(page.getByTestId("remind-ics")).toHaveText("Apple or Outlook calendar")
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("remind-ics").click()])
      const text = readFileSync(await download.path(), "utf8")
      for (const line of text.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
      await expect(page.getByTestId("result")).toContainText("Your list is kept on this device.")
      await noSideways(page)
      await bigTargets(page)
      await shot(page, "3-result-own")
    })
  })
}
