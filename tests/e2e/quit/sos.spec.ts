/**
 * QUIT TOOL 2, CRAVING NOW? (/quit/nicotine/sos).
 *
 * Walks the brief's acceptance list: shelf and ring at once, the ring over a tile, Back in each tile, the ten
 * situations, the three answers, the pattern, a new visit, the unit word, the money kept, and a signed-in save
 * to the Black Box. State lives in the browser (`quit-v1`, `vice-blackbox-v1`); only the signed-in test reaches
 * the worker's own test-backend account. Expected texts come from the data files.
 * With QUIT_SHOTS_DIR set it saves a screenshot of each screen.
 */

import { randomUUID } from "node:crypto"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"

const data = nicotineJson as unknown as {
  riskyMoments: { id: string; label: string }[]
  momentSwaps: { momentId: string; cards: string[] }[]
}
const tt = tooltextJson as unknown as { blackbox: { undone: string; keepRecord: string } }
const URL = quitUrl("/quit/nicotine/sos")
const TILES = ["voice", "breathe", "move", "bubbles", "blocks", "help", "reasons"] as const
const DAY0 = "2026-11-18"

async function shot(page: Page, name: string) {
  const dir = process.env.QUIT_SHOTS_DIR
  if (dir) await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
}

async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}

async function startClock(page: Page) {
  await page.clock.install({ time: new Date(`${DAY0}T10:00:00`) })
  await page.clock.pauseAt(new Date(`${DAY0}T10:00:01`))
}

/** A Black Box with one nicotine run still going, written the way it keeps it. */
function liveRun() {
  const stamp = new Date().toISOString()
  return {
    version: 1,
    attempts: [
      {
        id: randomUUID(),
        viceId: "nicotine",
        label: "Smoking or vaping",
        startedOn: "2026-11-01",
        startedBy: "",
        structure: [],
        endedOn: null,
        endedByReportId: null,
        updatedAt: stamp,
        deletedAt: null,
      },
    ],
    reports: [],
  }
}

async function seed(page: Page, opts: { run?: boolean; record?: unknown } = {}) {
  await page.goto(URL)
  await expect(page.getByTestId("shelf")).toBeVisible()
  await page.evaluate(
    ({ run, record }) => {
      if (run) {
        window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(run))
        window.localStorage.removeItem("vice-blackbox-sent-v1")
      }
      if (record) {
        const q = JSON.parse(window.localStorage.getItem("quit-v1") ?? "{}")
        q.nicotine = { ...(q.nicotine ?? {}), record }
        window.localStorage.setItem("quit-v1", JSON.stringify(q))
      }
    },
    { run: opts.run ? liveRun() : null, record: opts.record ?? null },
  )
  await page.reload()
  await expect(page.getByTestId("shelf")).toBeVisible()
}

function ring(page: Page) {
  return page.getByTestId("ring-clock")
}

test.describe("craving now, signed out", () => {
  test.use({ storageState: SIGNED_OUT })

  test.describe("phone @phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

    test("1 first visit: shelf and running ring in view, no question first", async ({ page }) => {
      await startClock(page)
      await page.goto(URL)
      await expect(page.getByTestId("shelf")).toBeVisible()
      await expect(ring(page)).toHaveText("10:00")
      for (const tile of TILES) {
        const b = page.getByTestId(`tile-${tile}`)
        await expect(b).toBeInViewport()
        const box = (await b.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      await expect(page.getByTestId("ask")).toHaveCount(0)
      await noSideways(page)
      await shot(page, "1-shelf-phone")
      await page.clock.runFor(60_000)
      await expect(ring(page)).toHaveText("09:00")
    })

    test("2 ring at 5, page clock +5 min inside Hold to breathe: How is it now? shows there", async ({ page }) => {
      await startClock(page)
      await page.goto(URL)
      await page.getByTestId("wait-5").click()
      await expect(ring(page)).toHaveText("05:00")
      await page.getByTestId("tile-breathe").click()
      await expect(page.getByTestId("tool-breathe")).toBeVisible()
      await page.clock.runFor(5 * 60_000 + 1000)
      await expect(page.getByTestId("ring-over")).toBeVisible()
      await expect(page.getByTestId("ring-over")).toContainText("Five minutes. How is it now?")
      await expect(page.getByTestId("ring-over").getByTestId("ask-no")).toBeVisible()
      await shot(page, "2-ring-over-in-tile")
    })

    test("inside a tile: the small ring shows, I'm through it opens the answer, Back goes to the shelf", async ({ page }) => {
      await startClock(page)
      await page.goto(URL)
      await page.getByTestId("tile-breathe").click()
      await expect(page.getByTestId("ring-mini")).toBeVisible()
      await page.clock.runFor(60_000)
      await expect(page.getByTestId("ring-mini")).toContainText("09:")
      await page.getByTestId("mini-finish").click()
      await expect(page.getByTestId("ask")).toBeVisible()
      await page.goBack()
      await expect(page.getByTestId("shelf")).toBeVisible()
      // the banner inside a tile, answered: Back reaches the shelf in one step
      await page.getByTestId("wait-5").click()
      await page.getByTestId("tile-help").click()
      await page.clock.runFor(5 * 60_000 + 1000)
      await page.getByTestId("ring-over").getByTestId("ask-fight").click()
      await expect(page.getByTestId("shelf")).toBeVisible()
      await expect(ring(page)).toHaveText("05:00")
      await page.clock.runFor(5 * 60_000 + 1000)
      await expect(page.getByTestId("ring-over")).toBeVisible()
    })

    test("3 Back inside every tile returns to the shelf, never off the page", async ({ page }) => {
      await page.goto(URL)
      for (const tile of TILES) {
        await page.getByTestId(`tile-${tile}`).click()
        await expect(page).toHaveURL(new RegExp(`t=${tile}`))
        await expect(page.getByTestId(`tool-${tile}`)).toBeVisible()
        await noSideways(page)
        await shot(page, `3-tile-${tile}-phone`)
        await page.goBack()
        await expect(page.getByTestId("shelf")).toBeVisible()
        expect(page.url()).toContain("/quit/nicotine/sos")
      }
      // the in-page back button does the same
      await page.getByTestId("tile-help").click()
      await page.getByTestId("tool-back").click()
      await expect(page.getByTestId("shelf")).toBeVisible()
    })

    test("voice tile: pick a voice, read the other side with its basis", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("tile-voice").click()
      await page.getByTestId("chip-other").click()
      await expect(page.getByTestId("sos-other")).toBeVisible()
      const first = page.locator('[data-testid^="chip-"]:not([data-testid="chip-other"])').first()
      await first.click()
      await expect(page.getByTestId("sos-counterpart")).toBeVisible()
      await page.getByTestId("sos-basis").locator("summary").click()
      await shot(page, "3-voice-answer")
    })

    test("move tile: countdown, no five-minute promise", async ({ page }) => {
      await startClock(page)
      await page.goto(URL)
      await page.getByTestId("tile-move").click()
      await page.getByTestId("move-start").click()
      await expect(page.getByTestId("move-clock")).toHaveText("05:00")
      await page.clock.runFor(5 * 60_000 + 1000)
      await expect(page.getByTestId("move-done")).toBeVisible()
      const body = await page.getByTestId("tool-move").innerText()
      expect(body).not.toMatch(/50 minutes|Taylor/i)
      await shot(page, "3-move-done")
    })

    test("bubble wrap and block puzzle respond to touch", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("tile-bubbles").click()
      await page.getByTestId("bubble").first().tap()
      await expect(page.getByTestId("bubble-count")).toHaveText("1")
      await page.goBack()
      await page.getByTestId("tile-blocks").click()
      await expect(page.getByTestId("board")).toBeVisible()
      await noSideways(page)
    })

    test("4 every situation shows its own three cards, the car shows driving", async ({ page }) => {
      await page.goto(URL)
      await page.getByTestId("tile-help").click()
      for (const m of data.riskyMoments) {
        await page.getByTestId(`chip-${m.id}`).click()
        const cards = data.momentSwaps.find((s) => s.momentId === m.id)!.cards
        await expect(page.getByTestId("help-card")).toHaveCount(3)
        for (let i = 0; i < 3; i++) await expect(page.getByTestId("help-card").nth(i)).toHaveText(cards[i])
      }
      await page.getByTestId("chip-driving").click()
      await expect(page.getByTestId("help-cards")).toContainText("song you know by heart")
      await shot(page, "4-help-driving")
    })

    test("5 No: close call saved, a row adds where; the pattern counts it; a second save inside 5 minutes updates it", async ({ page }) => {
      await startClock(page)
      await seed(page, { run: true })
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-no").click()
      await expect(page.getByTestId("result-no")).toBeVisible()
      await expect(page.getByTestId("sos-saved-text")).toHaveText("Saved in this browser.")
      await page.getByTestId("strength-7").click()
      await page.getByTestId("log-situation-coffee").click()
      await page.getByTestId("log-save").click()
      await expect(page.getByTestId("log-msg")).toBeVisible()
      await shot(page, "5-result-no")
      const reports = () =>
        page.evaluate(() => (JSON.parse(window.localStorage.getItem("vice-blackbox-v1") ?? "{}").reports as { deletedAt: string | null; where?: string }[]).filter((r) => !r.deletedAt))
      expect(await reports()).toHaveLength(1)
      // reload: a new visit; the pattern waits for three saves
      await page.clock.fastForward(2 * 60_000)
      await page.goto(URL)
      await expect(page.getByTestId("pattern-wait")).toBeVisible()
      // second save inside five minutes: one row only
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-no").click()
      await expect(page.getByText("Updated the one from a few minutes ago.")).toBeVisible()
      expect(await reports()).toHaveLength(1)
      // two more saves later, each at least 6 minutes apart: the bars show
      for (const where of ["coffee", "stress"]) {
        await page.clock.fastForward(6 * 60_000)
        await page.goto(URL)
        await page.getByTestId("finish").click()
        await page.getByTestId("ask-no").click()
        await page.getByTestId(`log-situation-${where}`).click()
        await page.getByTestId("log-save").click()
        await expect(page.getByTestId("log-msg")).toBeVisible()
      }
      await page.clock.fastForward(2 * 60 * 60_000)
      await page.goto(URL)
      await expect(page.getByTestId("pattern-bars")).toBeVisible()
      await expect(page.getByTestId("pattern-bar")).toHaveCount(2)
      await shot(page, "5-pattern")
    })

    test("6 Still fighting it: ring back at 5:00, shelf, no slip text", async ({ page }) => {
      await startClock(page)
      await seed(page, { run: true })
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-fight").click()
      await expect(page.getByTestId("shelf")).toBeVisible()
      await expect(ring(page)).toHaveText("05:00")
      await expect(page.getByTestId("fight-note")).toBeVisible()
      expect(await page.locator("body").innerText()).not.toMatch(/slip/i)
      await shot(page, "6-still-fighting")
    })

    test("7 Yes: slip saved, a step to take, Undo removes it", async ({ page }) => {
      await startClock(page)
      await seed(page, { run: true })
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-yes").click()
      await expect(page.getByTestId("result-yes")).toBeVisible()
      await expect(page.getByTestId("slip-step")).toContainText("steps 1")
      await expect(page.getByTestId("sos-saved")).toBeVisible()
      await shot(page, "7-result-yes")
      const live = () =>
        page.evaluate(() => (JSON.parse(window.localStorage.getItem("vice-blackbox-v1") ?? "{}").reports as { deletedAt: string | null }[]).filter((r) => !r.deletedAt).length)
      expect(await live()).toBe(1)
      await page.getByTestId("sos-undo").click()
      await expect(page.getByTestId("sos-undone")).toHaveText(tt.blackbox.undone)
      expect(await live()).toBe(0)
    })

    test("8 next visit 61 minutes later: fresh shelf, new ring, no old result", async ({ page }) => {
      await startClock(page)
      await page.goto(URL)
      await page.getByTestId("wait-15").click()
      await page.getByTestId("tile-reasons").click()
      await page.clock.fastForward(61 * 60_000)
      await page.goto(URL)
      await expect(page.getByTestId("shelf")).toBeVisible()
      await expect(ring(page)).toHaveText("10:00")
      await expect(page.getByTestId("ring-over")).toHaveCount(0)
      await expect(page.getByTestId("result")).toHaveCount(0)
    })

    test("9 the unit decides the word: vape, then none", async ({ page }) => {
      await startClock(page)
      const rec = (unit: unknown) => ({ quitDate: null, runs: [], slips: [], unit })
      await seed(page, { record: rec({ id: "vape", perDay: 3, priceUsd: 14.07, priceBasis: "default" }) })
      await page.getByTestId("finish").click()
      await expect(page.getByTestId("ask")).toContainText("Did you vape?")
      await page.evaluate(() => {
        const q = JSON.parse(window.localStorage.getItem("quit-v1") ?? "{}")
        q.nicotine.record.unit = null
        delete q.nicotine.sos
        window.localStorage.setItem("quit-v1", JSON.stringify(q))
      })
      await page.reload()
      await page.getByTestId("finish").click()
      await expect(page.getByTestId("ask")).toContainText("Did you use it?")
    })

    test("10 reasons with a past quit date show the money kept and its sum", async ({ page }) => {
      await startClock(page)
      const record = { quitDate: "2026-10-19", runs: [{ start: "2026-10-19", end: null, endedBy: null }], slips: [], unit: { id: "cigarettes", perDay: 10, priceUsd: 0.517, priceBasis: "typed" } }
      await seed(page, { record })
      await page.getByTestId("tile-reasons").click()
      await expect(page.getByTestId("kept-amount")).toContainText("About $155 kept")
      await expect(page.getByTestId("kept-sum")).toContainText("30")
      await page.getByTestId("reason-input").fill("Run with my son")
      await noSideways(page)
      await shot(page, "10-reasons-money")
      await page.reload()
      await expect(page.getByTestId("reason-input")).toHaveValue("Run with my son")
    })

    test("no run in the Black Box: a link to keep a record, nothing filed", async ({ page }) => {
      await startClock(page)
      await page.goto(URL)
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-no").click()
      await expect(page.getByTestId("sos-keep-record")).toHaveText(tt.blackbox.keepRecord)
      await expect(page.getByTestId("sos-saved")).toHaveCount(0)
    })

    test("11 no console error on the shelf, a tile and the answer", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(String(e)))
      await page.goto(URL)
      await page.getByTestId("tile-help").click()
      await page.goBack()
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-fight").click()
      // with no sign-in cookie the tool does not ask /api/whoami, so no 401 shows in the console
      expect(errors).toEqual([])
    })
  })

  test.describe("desktop", () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test("shelf sits in the page column, flush with the heading, tiles and results fit", async ({ page }) => {
      await page.goto(URL)
      const box = (await page.getByTestId("sos").boundingBox())!
      expect(box.width).toBeLessThanOrEqual(640)
      expect(box.x).toBeGreaterThan(300)
      // the heading and the tool start at the same left edge
      const h = (await page.locator("h1").first().boundingBox())!
      expect(Math.abs(h.x - box.x)).toBeLessThanOrEqual(2)
      await noSideways(page)
      await shot(page, "d-shelf")
      for (const tile of TILES) {
        await page.getByTestId(`tile-${tile}`).click()
        await expect(page.getByTestId(`tool-${tile}`)).toBeVisible()
        await shot(page, `d-tile-${tile}`)
        await page.goBack()
      }
      await page.getByTestId("finish").click()
      await page.getByTestId("ask-no").click()
      await shot(page, "d-result")
      await noSideways(page)
    })
  })
})

test.describe("craving now, signed in @phone", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  async function serverReports(page: Page) {
    const res = await page.request.get("/api/black-box")
    expect(res.ok()).toBe(true)
    return ((await res.json()).rows.reports as { went_through: boolean; deleted_at: string | null }[]).filter((r) => !r.deleted_at)
  }

  test("11 the close call reaches /api/black-box and Undo takes it out", async ({ page }) => {
    // seed from a page that has no Black Box open, so nothing writes the browser copy back over it
    await page.goto(quitUrl("/quit/nicotine/symptoms"))
    // start from an empty account
    const rows = (await (await page.request.get("/api/black-box")).json()).rows as { attempts: object[]; reports: object[] }
    const buried = new Date(Date.now() + 5000).toISOString()
    const bury = (r: object) => ({ ...r, updated_at: buried, deleted_at: buried })
    if (rows.attempts.length || rows.reports.length) {
      expect((await page.request.put("/api/black-box", { data: { rows: { attempts: rows.attempts.map(bury), reports: rows.reports.map(bury) } } })).ok()).toBe(true)
    }
    await page.evaluate((r) => {
      window.localStorage.setItem("vice-blackbox-v1", JSON.stringify(r))
      window.localStorage.removeItem("vice-blackbox-sent-v1")
    }, liveRun())
    await page.goto(URL)
    await page.getByTestId("finish").click()
    await page.getByTestId("ask-no").click()
    await expect(page.getByTestId("result-no")).toBeVisible()
    await expect.poll(async () => (await serverReports(page)).length, { timeout: 20000 }).toBe(1)
    expect((await serverReports(page))[0].went_through).toBe(false)
    await expect(page.getByTestId("sos-saved-text")).toHaveText("Saved to your account.")
    await shot(page, "11-signed-in-saved")
    await page.getByTestId("sos-undo").click()
    await expect.poll(async () => (await serverReports(page)).length, { timeout: 20000 }).toBe(0)
  })
})
