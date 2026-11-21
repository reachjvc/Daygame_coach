/**
 * QUIT TOOL 5, THE 12 LIES TEST (/quit/nicotine/beliefs), acceptance 1 to 12 of Plans/quit-finish.md.
 *
 * Run at 390x844 (touch, a phone) and at 1280x800. Signed out; the state is the browser's `quit-v1`.
 * Expected texts come from the data files. With QUIT_SHOTS_DIR set it saves a screenshot of each screen type.
 * A tap within 250 ms of a move is ignored by the tool, so every tap here first moves the page clock on by 300 ms.
 */

import { writeFileSync } from "node:fs"
import type { Page } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { quitUrl } from "../helpers/quit"
import nicotineJson from "../../../src/quit/data/nicotine.json"
import tooltextJson from "../../../src/quit/data/tooltext.json"
import liveToolsJson from "../../../src/quit/data/liveTools.json"
import menuJson from "../../../src/quit/data/menu.json"

interface Belief {
  id: string
  scene: string
  short: string
  limiting: string
  counterpart: string
  counted: string
  n?: string
  weak?: string
  need: string
}
const data = nicotineJson as unknown as { beliefs: Belief[]; facts: { id: string; statement: string; explain: string; n?: string }[] }
const tt = tooltextJson as unknown as typeof tooltextJson
const finished = liveToolsJson as string[]
const menu = menuJson as unknown as { groups: { tools: { id: string; line: string }[] }[] }
const MENU_LINE = menu.groups.flatMap((g) => g.tools).find((x) => x.id === "beliefs")!.line

const A = "/quit/nicotine"
const URL = quitUrl(`${A}/beliefs`)
const ALL = (n: number) => Array.from({ length: 12 }, () => n)
const SHOTS = process.env.QUIT_SHOTS_DIR

test.use({ storageState: SIGNED_OUT })
test.beforeEach(({ page }) => page.clock.install())

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, touch: true },
  { name: "desktop", width: 1280, height: 800, touch: false },
]

async function shot(page: Page, name: string, tag: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-${name}.png`, fullPage: true })
}
async function noSideways(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth))
}
async function tap(page: Page, id: string) {
  await page.clock.runFor(300)
  await page.getByTestId(id).click()
}
const stored = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem("quit-v1")
    return raw ? JSON.parse(raw).nicotine?.beliefs : undefined
  })

/** Rates question `from`..11 with the given ratings; a 4 or 5 shows its reply, which is read and left. */
async function rateFrom(page: Page, ratings: number[], from = 0, tag?: string, to = 12) {
  for (let i = from; i < to; i++) {
    await expect(page.getByTestId("scene")).toHaveText(data.beliefs[i].scene)
    await expect(page.getByTestId("step-text")).toHaveText(`Question ${i + 1} of 16`)
    if (tag && i === 0) await shot(page, "q1", tag)
    await tap(page, `rate-${ratings[i]}`)
    if (ratings[i] >= 4) {
      await expect(page.getByTestId("reply-counterpart")).toHaveText(data.beliefs[i].counterpart)
      if (tag && i === 2) await shot(page, "reply", tag)
      await tap(page, "reply-next")
    } else {
      await expect(page.getByTestId("reply")).toHaveCount(0)
    }
  }
}
async function answerFacts(page: Page, tag?: string) {
  for (let i = 0; i < data.facts.length; i++) {
    await expect(page.getByTestId("fact-statement")).toHaveText(data.facts[i].statement)
    await tap(page, "fact-true")
    await expect(page.getByTestId("fact-answer")).toContainText(data.facts[i].explain)
    if (tag && i === 0) await shot(page, "fact", tag)
    await tap(page, "fact-next")
  }
}
async function finishWith(page: Page, canStop: "yes" | "unsure" | "no", tag?: string) {
  await expect(page.getByTestId("canstop-question")).toHaveText(tt.beliefs.canStopQuestion)
  await expect(page.getByTestId("step-text")).toHaveText("Question 16 of 16")
  if (tag) await shot(page, "canstop", tag)
  await tap(page, `canstop-${canStop}`)
  await expect(page.getByTestId("result")).toBeVisible()
  // the visit's history entries are walked back and the landing entry has the plain address
  await expect.poll(() => page.url()).not.toContain("s=")
}
async function fullTest(page: Page, ratings: number[], canStop: "yes" | "unsure" | "no" = "unsure", tag?: string) {
  await rateFrom(page, ratings, 0, tag)
  await answerFacts(page, tag)
  await finishWith(page, canStop, tag)
}

for (const vp of VIEWPORTS) {
  test.describe(`12 lies test ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.touch, isMobile: vp.touch })

    test("1 fresh: all Somewhat, no replies, can-stop Not sure, soft list of 3 and never 'hold you most'", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(e.message))
      await page.goto(URL)
      await expect(page.getByTestId("question")).toBeVisible()
      await expect(page.getByTestId("limiting")).toHaveText(`“${data.beliefs[0].limiting}”`)
      for (const w of tt.beliefs.ratings) await expect(page.getByRole("radio", { name: w, exact: true })).toBeVisible()
      await expect(page.getByText(tt.beliefs.rateQuestion)).toBeVisible()
      await noSideways(page)
      await fullTest(page, ALL(3), "unsure", vp.name)
      await noSideways(page)
      await expect(page.getByTestId("held-line")).toHaveText(tt.beliefs.heldNone.replace("{total}", "12"))
      await expect(page.getByTestId("top-heading")).toHaveText(tt.beliefs.softHeading)
      await expect(page.getByTestId("top-belief")).toHaveCount(3)
      await expect(page.locator("body")).not.toContainText(tt.beliefs.topHeading)
      await expect(page.getByTestId("canstop-answer")).toContainText(tt.beliefs.canStopLine.unsure)
      await expect(page.getByTestId("taken-on")).toContainText(/^Taken [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}$/)
      await shot(page, "result", vp.name)
      await page.getByTestId("answers").locator("summary").click()
      await expect(page.getByTestId("answers")).toContainText(tt.beliefs.ratings[2])
      await expect(page.getByTestId("answers")).toContainText(tt.beliefs.factRight.replace(".", "") || "Right")
      expect(errors).toEqual([])
    })

    test("2 rating b3 That's me opens its reply with the basis box; Back steps reply then question 3", async ({ page }) => {
      await page.goto(URL)
      await rateFrom(page, [3, 3], 0, undefined, 2)
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
      await tap(page, "rate-5")
      await expect(page.getByTestId("reply")).toBeVisible()
      await expect(page.getByText(tt.beliefs.replyTitle, { exact: true })).toBeVisible()
      await page.getByTestId("belief-basis").locator("summary").click()
      await expect(page.getByTestId("basis-who")).toHaveText(data.beliefs[2].counted)
      await expect(page.getByTestId("basis-n")).toHaveText("469 heart patients who wanted to stop")
      await expect(page.getByTestId("basis-n")).toHaveText(data.beliefs[2].n!)
      await expect(page.getByTestId("basis-caveat")).toHaveText(data.beliefs[2].weak!)
      await expect(page.getByTestId("step-text")).toHaveCount(0)
      await noSideways(page)
      await tap(page, "reply-next")
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[3].scene)
      await expect(page.getByTestId("step-text")).toHaveText("Question 4 of 16")
      await page.goBack()
      await expect(page.getByTestId("reply")).toBeVisible()
      await page.goBack()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
      await expect(page.getByTestId("rate-5")).toHaveAttribute("aria-checked", "true")
    })

    test("3 a double tap moves one screen and saves one rating", async ({ page }) => {
      // the page clock stands still, so the two taps of a double tap are the same instant however slow the machine is
      await page.clock.pauseAt(new Date(Date.now() + 60_000))
      await page.goto(URL)
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[0].scene)
      await page.getByTestId("rate-3").dblclick()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[1].scene)
      await expect.poll(async () => (await stored(page)).draft.ratings).toEqual({ b1: 3 })
      await page.clock.runFor(300)
      await page.getByTestId("rate-5").dblclick()
      await expect(page.getByTestId("reply")).toBeVisible()
      await expect.poll(async () => (await stored(page)).draft.ratings).toEqual({ b1: 3, b2: 5 })
      await page.clock.runFor(300)
      await page.getByTestId("reply-next").dblclick()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
      await expect.poll(async () => Object.keys((await stored(page)).draft.ratings)).toEqual(["b1", "b2"])
    })

    test("4 a reload resumes on a question, a reply, a fact reveal and the result", async ({ page }) => {
      await page.goto(URL)
      await rateFrom(page, ALL(3), 0, undefined, 2)
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
      await page.reload()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
      await tap(page, "rate-5")
      await expect(page.getByTestId("reply")).toBeVisible()
      await page.reload()
      await expect(page.getByTestId("reply-counterpart")).toHaveText(data.beliefs[2].counterpart)
      await tap(page, "reply-next")
      await rateFrom(page, ALL(3), 3)
      await tap(page, "fact-true")
      await expect(page.getByTestId("fact-answer")).toBeVisible()
      await page.reload()
      await expect(page.getByTestId("fact-answer")).toContainText(data.facts[0].explain)
      await tap(page, "fact-next")
      await tap(page, "fact-true")
      await tap(page, "fact-next")
      await tap(page, "fact-true")
      await tap(page, "fact-next")
      await finishWith(page, "yes")
      await page.reload()
      await expect(page.getByTestId("result")).toBeVisible()
      await expect(page.getByTestId("held-line")).toHaveText("1 of 12 hold you")
    })

    test("5 finish twice: since last time, Last time, one earlier result with its own time, Delete asks first", async ({ page }) => {
      await page.clock.setSystemTime(new Date("2026-11-19T10:42:00"))
      await page.goto(URL)
      await fullTest(page, ALL(3), "no")
      await expect(page.getByTestId("since-last")).toHaveCount(0)
      await expect(page.getByTestId("taken-on")).toContainText("10:4")
      await page.clock.setSystemTime(new Date("2026-11-19T11:15:00"))
      await tap(page, "again")
      const second = ALL(3)
      second[1] = 5
      second[4] = 1
      await fullTest(page, second, "yes")
      await expect(page.getByTestId("taken-on")).toContainText("11:1")
      const changes = page.getByTestId("since-change")
      await expect(changes).toHaveCount(2)
      const w = tt.beliefs.ratings
      await expect(changes.nth(0)).toHaveText(`More: ${data.beliefs[1].short} (${w[2]} → ${w[4]})`)
      await expect(changes.nth(1)).toHaveText(`Less: ${data.beliefs[4].short} (${w[2]} → ${w[0]})`)
      await expect(page.getByTestId("canstop-last")).toHaveText("Last time: No.")
      await expect(page.getByTestId("earlier-result")).toHaveCount(1)
      await expect(page.getByTestId("earlier-when")).toContainText("10:4")
      await expect(page.getByTestId("earlier-result")).toContainText("0 of 12 hold you")
      await shot(page, "result-twice", vp.name)
      const s = await stored(page)
      expect(s.results).toHaveLength(2)
      expect(s.ratings).toEqual(s.results[1].ratings)
      await page.getByTestId("earlier-delete").click()
      await expect(page.getByText(tt.beliefs.deleteAsk)).toBeVisible()
      await expect(page.getByTestId("earlier-result")).toHaveCount(1)
      await page.getByTestId("earlier-delete-yes").click()
      await expect(page.getByTestId("earlier-result")).toHaveCount(0)
      await expect(page.getByTestId("since-last")).toHaveCount(0)
      expect((await stored(page)).results).toHaveLength(1)
    })

    test("6 take it again: Stop and keep my last result goes back at once, then asks after one answer", async ({ page }) => {
      await page.goto(URL)
      await fullTest(page, ALL(3), "yes")
      await tap(page, "again")
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[0].scene)
      await expect(page.getByTestId("stop-retake")).toHaveText(tt.beliefs.stopKeep)
      await page.getByTestId("stop-retake").click()
      await expect(page.getByTestId("result")).toBeVisible()
      await expect(page.getByTestId("stop-confirm")).toHaveCount(0)
      expect((await stored(page)).results).toHaveLength(1)
      await tap(page, "again")
      await tap(page, "rate-4")
      await tap(page, "reply-next")
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[1].scene)
      await page.getByTestId("stop-retake").click()
      await expect(page.getByTestId("stop-confirm")).toContainText(tt.beliefs.stopAsk)
      await page.getByTestId("stop-no").click()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[1].scene)
      await page.getByTestId("stop-retake").click()
      await page.getByTestId("stop-yes").click()
      await expect(page.getByTestId("result")).toBeVisible()
      const s = await stored(page)
      expect(s.draft).toBeNull()
      expect(s.results).toHaveLength(1)
      expect(s.results[0].ratings.b1).toBe(3)
    })

    test("7 a wave-1 save opens as a result Taken before, and gives still reads it", async ({ page }) => {
      await page.goto(quitUrl(`${A}/symptoms`))
      const ratings = Object.fromEntries(data.beliefs.map((b, i) => [b.id, i === 0 ? 5 : 3]))
      await page.evaluate((r) => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { beliefs: { ratings: r, facts: { f1: true, f2: false, f3: true } } } })), ratings)
      await page.goto(URL)
      await expect(page.getByTestId("result")).toBeVisible()
      await expect(page.getByTestId("taken-on")).toHaveText("Taken before Nov 19, 2026")
      await expect(page.getByTestId("held-line")).toHaveText("1 of 12 hold you")
      await expect(page.getByTestId("canstop-answer")).toHaveCount(0)
      // slip reads the wave-1 ratings: with no run, two skipped questions reach its result, whose top lie is the one rated 5
      await page.goto(quitUrl(`${A}/slip`))
      await tap(page, "slip-skip")
      await tap(page, "slip-skip")
      await expect(page.getByTestId("result")).toBeVisible()
      await expect(page.getByTestId("top-lie").first()).toContainText(data.beliefs[0].counterpart)
      // a partial wave-1 save is the draft: the tool resumes at the first unanswered question
      await page.evaluate(() => localStorage.setItem("quit-v1", JSON.stringify({ nicotine: { beliefs: { ratings: { b1: 3, b2: 3 }, facts: {} } } })))
      await page.goto(URL)
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[2].scene)
    })

    test("8 Save the image downloads a PNG and stays; the card reads the new line; the page has an og:image", async ({ page, request }) => {
      await page.goto(URL)
      await fullTest(page, [5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1], "yes")
      await expect(page.getByTestId("held-line")).toHaveText("7 of 12 hold you")
      const before = page.url()
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("save-image").click()])
      expect(download.suggestedFilename()).toBe("12-lies-result.png")
      const path = await download.path()
      const { readFileSync } = await import("node:fs")
      expect(readFileSync(path).subarray(1, 4).toString()).toBe("PNG")
      expect(page.url()).toBe(before)
      await expect(page.getByTestId("result")).toBeVisible()

      const card = await request.get(quitUrl(`${A}/card?held=7&v=2`))
      expect(card.status()).toBe(200)
      expect(card.headers()["content-type"]).toContain("image/png")
      const question = await request.get(quitUrl(`${A}/card?v=2`))
      expect(question.status()).toBe(200)
      if (SHOTS) {
        writeFileSync(`${SHOTS}/${vp.name}-card-held7.png`, await card.body())
        writeFileSync(`${SHOTS}/${vp.name}-card-question.png`, await question.body())
      }
      expect((await request.get(quitUrl(`${A}/card?held=13`))).status()).toBe(400)
      expect((await request.get(quitUrl(`${A}/card?held=x`))).status()).toBe(400)
      expect((await request.get(quitUrl("/quit/nope/card?held=3"))).status()).toBe(404)

      await page.goto(URL)
      const og = await page.locator('meta[property="og:image"]').getAttribute("content")
      expect(og).toMatch(/\/quit\/nicotine\/card\?preview=1&v=2$/)
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", MENU_LINE)
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", MENU_LINE)
    })

    test("8b share: the card file where allowed, else text and link, else the link is copied", async ({ page }) => {
      await page.addInitScript(() => {
        const w = window as unknown as Record<string, unknown>
        w.__shared = null
        Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t: string) => void (w.__copied = t) }, configurable: true })
        Object.defineProperty(navigator, "share", { value: async (d: unknown) => void (w.__shared = { ...(d as object), files: ((d as { files?: File[] }).files ?? undefined)?.map((f) => f.name) }), configurable: true, writable: true })
        Object.defineProperty(navigator, "canShare", { value: (d: { files?: unknown[] }) => (w.__files === false ? false : Array.isArray(d.files)), configurable: true, writable: true })
      })
      await page.goto(URL)
      await fullTest(page, [5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1], "yes")
      const text = "I believed 7 of the 12 lies nicotine tells you."
      // the card is fetched ahead; share carries it as a file once it has arrived
      const shared = () => page.evaluate(() => (window as unknown as { __shared: { text: string; title?: string; files?: string[] } | null }).__shared)
      await expect
        .poll(async () => {
          await page.getByTestId("share").click()
          return (await shared())?.files
        })
        .toEqual(["12-lies-result.png"])
      expect((await shared())?.text).toBe(text)
      expect(((await shared()) as { title?: string }).title).toBe("The 12 lies nicotine tells you")
      await page.evaluate(() => ((window as unknown as Record<string, unknown>).__files = false))
      await page.getByTestId("share").click()
      const plain = await page.evaluate(() => (window as unknown as { __shared: { text: string; url: string; files?: unknown } }).__shared)
      expect(plain.text).toBe(text)
      expect(plain.url).toMatch(/\/quit\/nicotine\/beliefs$/)
      expect(plain.files).toBeUndefined()
      await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }))
      await page.getByTestId("share").click()
      await expect(page.getByTestId("link-copied")).toHaveText(tt.beliefs.linkCopied)
      expect(await page.evaluate(() => (window as unknown as { __copied: string }).__copied)).toMatch(/\/quit\/nicotine\/beliefs$/)
    })

    test("9 gives is linked only while finished; the band link only while date is finished", async ({ page }) => {
      await page.goto(URL)
      await fullTest(page, [5, 4, 4, 3, 2, 1, 1, 1, 1, 1, 1, 1], "unsure")
      await expect(page.getByTestId("top-belief")).toHaveCount(3)
      await expect(page.getByTestId("need-link")).toHaveCount(finished.includes("gives") ? 3 : 0)
      await expect(page.getByTestId("next-gives")).toHaveCount(finished.includes("gives") ? 1 : 0)
      await expect(page.getByTestId("band-link")).toHaveCount(finished.includes("date") ? 1 : 0)
      await expect(page.locator('main a[href*="/gives"]')).toHaveCount(finished.includes("gives") ? 4 : 0)
      await expect(page.getByTestId("to-menu")).toHaveAttribute("href", `${A}?preview=1`)
    })

    test("10 the craving tool's voice tile shows the same basis box", async ({ page }) => {
      await page.goto(quitUrl(`${A}/sos`))
      await page.getByTestId("tile-voice").click()
      await page.getByTestId("chip-b3").click()
      await expect(page.getByTestId("sos-counterpart")).toBeVisible()
      await page.getByTestId("sos-basis").locator("summary").click()
      await expect(page.getByTestId("sos-basis").getByTestId("basis-who")).toHaveText(data.beliefs[2].counted)
      await expect(page.getByTestId("sos-basis").getByTestId("basis-n")).toHaveText(data.beliefs[2].n!)
      await expect(page.getByTestId("sos-basis").getByTestId("basis-caveat")).toHaveText(data.beliefs[2].weak!)
      await shot(page, "sos-basis", vp.name)
    })

    // phone width only
    if (vp.width === 390) test("11 present mode: all five answers are visible without scrolling on every question", async ({ page }) => {
      await page.goto(quitUrl(`${A}/beliefs?present=1`))
      for (let i = 0; i < 12; i++) {
        await expect(page.getByTestId("scene")).toHaveText(data.beliefs[i].scene)
        for (const r of [1, 5]) {
          const box = await page.getByTestId(`rate-${r}`).boundingBox()
          expect(box!.y).toBeGreaterThanOrEqual(0)
          expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height)
        }
        if (i === 0) await shot(page, "present-q1", vp.name)
        await tap(page, "rate-1")
      }
    })

    test("12 no console error, no sideways scroll, every tap target at least 44 px", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
      page.on("pageerror", (e) => errors.push(e.message))
      const small = async (label: string) => {
        const bad = await page.evaluate(() => {
          const out: string[] = []
          const roots = document.querySelectorAll('[data-testid="question"], [data-testid="result"], [data-testid="stop-retake"], [data-testid="stop-confirm"]')
          roots.forEach((root) =>
            root.querySelectorAll<HTMLElement>("button, a[href], summary, [role=radio]").forEach((el) => {
              const r = el.getBoundingClientRect()
              if (r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5)) out.push(`${el.textContent?.trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}px`)
            }),
          )
          return out
        })
        expect(bad, label).toEqual([])
        await noSideways(page)
      }
      await page.goto(URL)
      await small("q1")
      await tap(page, "rate-5")
      await small("reply")
      await page.getByTestId("belief-basis").locator("summary").click()
      await page.getByTestId("belief-basis").getByRole("button", { name: tt.common.source }).click()
      await small("reply open")
      await tap(page, "reply-next")
      await rateFrom(page, ALL(4), 1)
      await tap(page, "fact-true")
      await page.getByTestId("fact-answer").locator("summary").click()
      await small("fact")
      await tap(page, "fact-next")
      await tap(page, "fact-false")
      await tap(page, "fact-next")
      await tap(page, "fact-true")
      await tap(page, "fact-next")
      await small("canstop")
      await tap(page, "canstop-no")
      await expect(page.getByTestId("result")).toBeVisible()
      await page.getByTestId("top-proof").first().locator(":scope > summary").click()
      await page.getByTestId("answers").locator("summary").click()
      await small("result")
      await tap(page, "again")
      await tap(page, "rate-1")
      await small("retake")
      await page.getByTestId("stop-retake").click()
      await small("stop confirm")
      await page.getByTestId("stop-yes").click()
      await page.getByTestId("clear-answers").click()
      await small("clear confirm")
      await page.getByTestId("clear-yes").click()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[0].scene)
      expect((await stored(page)) ?? null).toBeNull()
      expect(errors).toEqual([])
    })
    test("13 one browser Back from the result leaves the test; a reload on the result keeps the result", async ({ page }) => {
      await page.goto(quitUrl(A))
      await page.goto(URL)
      await rateFrom(page, [5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3])
      await answerFacts(page)
      await finishWith(page, "yes")
      await page.reload()
      await expect(page.getByTestId("result")).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL(new RegExp(`${A}(\\?preview=1)?$`))
      await page.goForward()
      await expect(page.getByTestId("result")).toBeVisible()
      expect(page.url()).not.toContain("s=")
    })

    test("13b a reload in the middle of the test does not leave dead entries either", async ({ page }) => {
      await page.goto(quitUrl(A))
      await page.goto(URL)
      await rateFrom(page, ALL(3), 0, undefined, 4)
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
      await page.reload()
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[4].scene)
      await rateFrom(page, ALL(3), 4)
      await answerFacts(page)
      await finishWith(page, "yes")
      await page.goBack()
      await expect(page).toHaveURL(new RegExp(`${A}(\\?preview=1)?$`))
    })

    test("14 round 1: reply and fact screens, chevrons, one entry per paper, You said", async ({ page }) => {
      await page.goto(URL)
      await rateFrom(page, [3, 3], 0, undefined, 2)
      await tap(page, "rate-5")
      await expect(page.getByTestId("reply")).toBeVisible()
      await expect(page.getByTestId("reply")).not.toContainText(tt.common.counted)
      await expect(page.locator("details#sources")).toHaveCount(0)
      const basis = page.getByTestId("belief-basis")
      await expect(basis.getByTestId("fold-chevron")).toBeVisible()
      const turn = () => basis.getByTestId("fold-chevron").evaluate((el) => getComputedStyle(el).rotate)
      const closed = await turn()
      await basis.locator("summary").click()
      await expect.poll(turn).not.toBe(closed)
      await basis.getByRole("button", { name: tt.common.source }).click()
      const papers = basis.getByTestId("basis-paper")
      const cites = new Set(
        (nicotineJson as unknown as { beliefs: { id: string; refs: { cite: string; quote?: string }[] }[] }).beliefs[2].refs.map((r) => r.cite),
      )
      await expect(papers).toHaveCount(cites.size)
      await tap(page, "reply-next")
      await rateFrom(page, ALL(3), 3)
      await tap(page, "fact-false")
      await expect(page.getByTestId("fact-said")).toHaveText("You said False.")
      await expect(page.getByTestId("fact-answer")).not.toContainText(tt.common.counted)
      await expect(page.locator("details#sources")).toHaveCount(0)
      await expect(page.getByTestId("fact-answer").getByTestId("fold-chevron")).toBeVisible()
    })

    test("15 round 1: the verdict card and the No answer", async ({ page }) => {
      await page.goto(URL)
      await fullTest(page, ALL(1), "no")
      await expect(page.getByTestId("held-line")).toHaveText("None of the 12 hold you")
      await expect(page.getByTestId("canstop-line")).toHaveText(tt.beliefs.canStopLineNoneHeld)
      const link = page.getByTestId("band-link")
      await expect(link).toHaveText(tt.beliefs.readySetDate)
      // a No on can-stop: the band action is the secondary button, not the purple one
      await expect(link).not.toHaveClass(/bg-primary/)
      await expect(link).toHaveClass(/bg-card/)
      const card = await page.getByTestId("band").boundingBox()
      const btn = await link.boundingBox()
      expect(btn!.width).toBeGreaterThan(card!.width - 40)
      await expect(page.getByTestId("band").getByTestId("band-link")).toHaveCount(1)
      await expect(page.getByTestId("see-through").locator("li").first()).toHaveCSS("border-top-width", "0px")
      await expect(page.getByTestId("answers").getByTestId("fold-chevron")).toBeVisible()
      await page.clock.runFor(300)
      await tap(page, "again")
      await rateFrom(page, ALL(1), 0)
      await answerFacts(page)
      await finishWith(page, "unsure")
      await expect(page.getByTestId("band-link")).toHaveText(tt.beliefs.bandFreeLink)
      await tap(page, "again")
      await rateFrom(page, [5, 4, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1], 0)
      await answerFacts(page)
      await finishWith(page, "no")
      await expect(page.getByTestId("canstop-line")).toHaveText(tt.beliefs.canStopLine.no)
      await expect(page.getByTestId("band-link")).toHaveText(tt.beliefs.readySetDate)
      await expect(page.getByTestId("top-proof").first().getByTestId("fold-chevron").first()).toBeVisible()
    })

    test("16 round 1: Take it again starts at the top of question 1", async ({ page }) => {
      await page.goto(URL)
      await fullTest(page, ALL(3), "yes")
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200)
      await tap(page, "again")
      await expect(page.getByTestId("scene")).toHaveText(data.beliefs[0].scene)
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
      await expect(page.getByRole("heading", { level: 1 })).toBeInViewport()
    })
    /** Opens the test the way a reader does: the menu page, then the menu row. */
    async function viaMenu(page: Page) {
      await page.goto(quitUrl(A))
      await page.locator('a[href*="/nicotine/beliefs"]').first().click()
      await expect(page.getByTestId("question")).toBeVisible()
    }
    const backToMenu = async (page: Page) => {
      await page.goBack()
      await expect(page).toHaveURL(new RegExp(`${A}(\\?preview=1)?$`))
    }
    /** The address and the screen shown agree: no `s` means the first screen or the result. */
    async function inStep(page: Page) {
      const s = new globalThis.URL(page.url()).searchParams.get("s")
      if (await page.getByTestId("result").count()) return expect(s).toBeNull()
      const n = Number((await page.getByTestId("step-text").textContent())!.match(/Question (\d+)/)![1])
      expect(s === null ? 1 : Number(s)).toBe(n)
    }

    test("17 round 2: after a retake one browser Back from the result reaches the menu", async ({ page }) => {
      await viaMenu(page)
      await fullTest(page, ALL(3), "yes")
      await tap(page, "again")
      await fullTest(page, [4, ...ALL(3).slice(1)], "unsure")
      await backToMenu(page)
    })

    test("17b round 2: Stop and keep my last result on a retake leaves no dead entry, with and without answers", async ({ page }) => {
      await viaMenu(page)
      await fullTest(page, ALL(3), "yes")
      await tap(page, "again")
      await page.getByTestId("stop-retake").click()
      await expect(page.getByTestId("result")).toBeVisible()
      await expect.poll(() => page.url()).not.toContain("s=")
      await tap(page, "again")
      await rateFrom(page, ALL(3), 0, undefined, 3)
      await page.getByTestId("stop-retake").click()
      await page.getByTestId("stop-yes").click()
      await expect(page.getByTestId("result")).toBeVisible()
      await expect.poll(() => page.url()).not.toContain("s=")
      await backToMenu(page)
    })

    test("18 round 2: Forward after Back from a result, and after Clear all, never shows a stale address", async ({ page }) => {
      await viaMenu(page)
      await fullTest(page, ALL(3), "yes")
      await tap(page, "again")
      await fullTest(page, ALL(3), "no")
      await backToMenu(page)
      await page.goForward()
      await expect(page.getByTestId("result")).toBeVisible()
      await page.goForward().catch(() => null)
      await expect(page.getByTestId("result")).toBeVisible()
      await expect.poll(() => page.url()).not.toContain("s=")
      await tap(page, "clear-answers")
      await page.getByTestId("clear-yes").click()
      await expect(page.getByTestId("question")).toBeVisible()
      await backToMenu(page)
      await page.goForward()
      await expect(page.getByTestId("question")).toBeVisible()
      await inStep(page)
      await page.goForward().catch(() => null)
      await expect(page.getByTestId("question")).toBeVisible()
      await inStep(page)
      await tap(page, "rate-3")
      await expect(page.getByTestId("step-text")).toHaveText("Question 2 of 16")
      await inStep(page)
      expect(new globalThis.URL(page.url()).searchParams.get("s")).toBe("2")
    })

    test("19 round 2: Previous question, True or false?, no Counted line on result cards, 0 held has no noTop line", async ({ page }) => {
      await page.goto(URL)
      await rateFrom(page, [5, 3], 0, undefined, 2)
      await expect(page.getByTestId("screen-back")).toHaveText(tt.beliefs.previous)
      await expect(page.getByRole("link", { name: /Back/ }).first()).toBeVisible()
      await rateFrom(page, ALL(3), 2)
      await expect(page.getByTestId("fact-heading")).toHaveText(tt.beliefs.factHeading)
      await expect(page.getByTestId("screen-back")).toHaveText(tt.beliefs.previous)
      await answerFacts(page)
      await expect(page.getByTestId("screen-back")).toHaveText(tt.beliefs.previous)
      await finishWith(page, "yes")
      await expect(page.getByTestId("held-line")).toHaveText("1 of 12 hold you")
      await expect(page.getByTestId("top-proof")).toHaveCount(1)
      await expect(page.getByTestId("top-proof")).not.toContainText(tt.common.counted)
      await expect(page.getByTestId("band-link")).toHaveClass(/bg-primary/)
      await tap(page, "again")
      await fullTest(page, ALL(1), "yes")
      await expect(page.getByTestId("held-line")).toHaveText("None of the 12 hold you")
      await expect(page.locator("body")).not.toContainText(tt.beliefs.noTop)
    })

    test("20 round 2: Last time shows only when the count changed", async ({ page }) => {
      await page.goto(URL)
      await fullTest(page, ALL(3), "yes")
      await expect(page.getByTestId("last-held")).toHaveCount(0)
      await tap(page, "again")
      await fullTest(page, ALL(3), "yes")
      await expect(page.getByTestId("last-held")).toHaveCount(0)
      await tap(page, "again")
      await fullTest(page, [5, 5, ...ALL(3).slice(2)], "yes")
      await expect(page.getByTestId("held-line")).toHaveText("2 of 12 hold you")
      await expect(page.getByTestId("last-held")).toHaveText("Last time: 0 of 12")
    })

    test("21 round 2: Delete, Clear and Stop confirm buttons read as large as Take it again, at least 44 px", async ({ page }) => {
      await page.goto(URL)
      await fullTest(page, ALL(3), "yes")
      await tap(page, "again")
      await fullTest(page, ALL(3), "yes")
      const size = (id: string) => page.getByTestId(id).evaluate((el) => getComputedStyle(el).fontSize)
      const again = await size("again")
      await page.getByTestId("earlier-delete").click()
      await page.getByTestId("clear-answers").click()
      for (const id of ["earlier-delete-yes", "earlier-delete-no", "clear-yes", "clear-no"]) {
        expect(await size(id)).toBe(again)
        const box = (await page.getByTestId(id).boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
      await tap(page, "again")
      await tap(page, "rate-3")
      await page.getByTestId("stop-retake").click()
      for (const id of ["stop-yes", "stop-no"]) {
        expect(await size(id)).toBe(again)
        const box = (await page.getByTestId(id).boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    })
  })
}
