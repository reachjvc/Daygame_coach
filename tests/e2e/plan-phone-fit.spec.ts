import { test, expect as baseExpect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { Client } from "pg"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planWithSteps, seedLifePlan } from "./helpers/lifePlan"
import { stackAdmin, testStackEnv } from "./fixtures/stack"
import { screensOf, screenRoute, sequenceById } from "@/src/goals/planSteps/planSequences"
import { TAB_ORDER } from "@/src/goals/data/northStar"
import { AREA_SECTIONS, GOAL_SECTIONS, STEP_SECTIONS } from "@/src/goals/planSteps/planSections"

/**
 * THE LIFE-PLAN TOOL FITS A PHONE (Plans/plan-new-from-real.md, Phase 5).
 *
 * At 360 and 390 px wide, on every step of today's `/plan` and every screen of `/plan/new/<screen>` (the copy space),
 * and on the sheets that open over them (an area, a goal card), nothing may run past the screen:
 *   - the page itself never scrolls sideways (`scrollWidth <= clientWidth`);
 *   - no visible element reaches past the left or the right edge, except inside a box that scrolls sideways on
 *     purpose (`overflow-x: auto|scroll`, itself inside the screen);
 *   - no box clips its own content sideways (`overflow-x: hidden|clip` with content wider than the box).
 * The failure names each offender by a short selector and its text.
 */

const expect = baseExpect.configure({ timeout: 45_000 })
const NAV = 120_000
const WIDTHS = [360, 390]
/** A goal in the seeded plan; its pill on Experiences opens the goal card. */
const GOAL_TITLE = fullPlan().goals[0].title

async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

async function seedAndCopy(page: Page, ownerId: string): Promise<void> {
  const { error } = await stackAdmin().from("plan_sandboxes").upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true })
  if (error) throw new Error(`could not give the account a copy space: ${error.message}`)
  // seedLifePlan adds to a plan the account already holds (the worker's account is shared by every test here), so the
  // plan is taken out first: every test then sees the same twelve areas and six routines.
  await withDb((db) => db.query("delete from public.life_plans where user_id = $1", [ownerId]))
  const full = fullPlan()
  const extra = (planWithSteps([{ id: "s_e2e", title: "E2E cold shower", daysPerWeek: 7 }]) as { routines: object[] }).routines[0]
  await seedLifePlan(page, ownerId, { ...full, routines: [...full.routines, { ...extra, id: "r_e2e" }] })
  expect((await page.request.post("/api/plan-sandbox/reset")).status()).toBe(200)
  expect((await page.request.post("/api/plan-sandbox/copy")).status()).toBe(200)
  const id = await withDb(async (db) => (await db.query("select sandbox_user_id from public.plan_sandboxes where owner_id = $1", [ownerId])).rows[0]?.sandbox_user_id as string | null)
  if (!id) throw new Error("no copy space")
}

/** Everything that runs past an edge, in the page the browser has now. Runs inside the page. */
function findOffenders(): string[] {
  const vw = document.documentElement.clientWidth
  const out: string[] = []
  const root = document.documentElement
  if (root.scrollWidth > root.clientWidth) out.push(`PAGE scrolls sideways: scrollWidth ${root.scrollWidth} > clientWidth ${root.clientWidth}`)
  const short = (el: Element) => {
    const t = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".") : ""
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""} "${t}"`
  }
  const flagged: Element[] = []
  const inside = (el: Element) => flagged.some((f) => f.contains(el))
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    if (inside(el)) continue
    const cs = getComputedStyle(el)
    if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed" && el.getClientRects().length === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    if (el.closest("[aria-hidden='true'], .sr-only, svg *, script, style, [data-nextjs-dialog-overlay], nextjs-portal")) continue
    // Only a box marked data-phone-scroll may hold content wider than itself; any other box that scrolls sideways is reported below.
    let scroller: Element | null = null
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if ((o === "auto" || o === "scroll") && p.hasAttribute("data-phone-scroll")) { scroller = p; break }
    }
    const pastEdge = r.right > vw + 1 || r.left < -1
    if (pastEdge && scroller) {
      const sr = scroller.getBoundingClientRect()
      if (sr.right <= vw + 1 && sr.left >= -1) continue
    }
    if (pastEdge) {
      flagged.push(el)
      out.push(`PAST EDGE ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}: ${short(el)}`)
      continue
    }
    const ox = cs.overflowX
    if (cs.textOverflow === "ellipsis") {
      // One line that ends in "…" is cut on purpose, but not down to a few letters: a title squeezed that far has lost its row.
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth < 90) { flagged.push(el); out.push(`SQUEEZED to ${el.clientWidth}px of ${el.scrollWidth}: ${short(el)}`) }
      continue
    }
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") continue // text inside a box scrolls
    if ((ox === "hidden" || ox === "clip") && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      flagged.push(el)
      out.push(`CLIPS ${el.scrollWidth} in ${el.clientWidth}: ${short(el)}`)
    }
  }
  // A sideways scroller must sit inside the screen; one that scrolls on purpose says so with data-phone-scroll.
  for (const el of Array.from(document.body.querySelectorAll("*"))) {
    const o = getComputedStyle(el).overflowX
    if ((o === "auto" || o === "scroll") && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && !el.hasAttribute("data-phone-scroll")) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.right > 0 && r.left < vw) out.push(`SCROLLS SIDEWAYS ${el.scrollWidth} in ${el.clientWidth}: ${short(el)}`)
    }
  }
  // Chart labels: not cut by the chart's own box, and not drawn smaller than a reader can use.
  for (const svg of Array.from(document.querySelectorAll("svg"))) {
    const sr = svg.getBoundingClientRect()
    if (sr.width === 0) continue
    for (const t of Array.from(svg.querySelectorAll("text"))) {
      const r = t.getBoundingClientRect()
      const label = (t.textContent ?? "").trim().slice(0, 30)
      if (!label || r.width === 0) continue
      if (r.left < sr.left - 1 || r.right > sr.right + 1) out.push(`SVG TEXT CUT OFF ${Math.round(r.left - sr.left)}..${Math.round(r.right - sr.left)} of ${Math.round(sr.width)}: "${label}"`)
      const drawn = Number.parseFloat(t.getAttribute("font-size") ?? "") * (sr.width / (svg.viewBox.baseVal.width || sr.width))
      if (drawn < 8.5) out.push(`SVG TEXT SMALL ${drawn.toFixed(1)}px: "${label}"`)
    }
  }
  // A 0-10 row is one row.
  for (const group of Array.from(document.querySelectorAll("div"))) {
    const kids = Array.from(group.children).filter((c) => /out of 10/.test(c.getAttribute("aria-label") ?? ""))
    if (kids.length >= 11 && new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top))).size > 1) out.push(`WRAPS the 0-10 row (${kids.length} buttons on ${new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top))).size} lines)`)
  }
  // The step bar's buttons keep their words on one line (the save line between them may wrap).
  for (const el of Array.from(document.querySelectorAll(".sticky:not(th) button, .sticky:not(th) a"))) {
    if (el.children.length > 0 || !(el.textContent ?? "").trim()) continue
    const range = document.createRange()
    range.selectNodeContents(el)
    const lines = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top / 4))).size
    if (lines > 1) out.push(`WRAPS in the step bar (${lines} lines): "${(el.textContent ?? "").trim().slice(0, 30)}"`)
  }
  return out.slice(0, 40)
}

async function settle(page: Page): Promise<void> {
  await expect(page.locator("h1, h2").filter({ hasText: /\S/ }).first()).toBeVisible({ timeout: NAV })
  await page.waitForLoadState("networkidle", { timeout: NAV }).catch(() => undefined)
}

/**
 * A column squeezed to a few letters: a block of text with two or more words, narrower than 110 px, that wraps onto three or
 * more lines ("Run a / half / marathon"). Found by the height of the text against
 * its line height, so it needs no list of classes.
 */
function findSqueezed(): string[] {
  const out: string[] = []
  const vis = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("span, p, li, button, label, h2, h3"))) {
    if (!vis(el) || el.closest("svg, [aria-hidden=true], [data-fold-skip]")) continue
    // Leaf text only: an element whose own children are all text or inline phrases.
    if (Array.from(el.children).some((c) => getComputedStyle(c).display === "block" || getComputedStyle(c).display === "flex")) continue
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ")
    const words = text.split(" ").filter(Boolean)
    if (words.length < 2 || text.length > 80) continue
    const r = el.getBoundingClientRect()
    const line = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3
    const lines = Math.round(r.height / line)
    if (r.width < 110 && lines >= 3) out.push(`squeezed to ${Math.round(r.width)} px (${lines} lines): "${text.slice(0, 40)}"`)
  }
  return out
}

async function look(page: Page, label: string, fails: string[]): Promise<void> {
  const found = [...(await page.evaluate(findOffenders)), ...(await page.evaluate(findSqueezed))]
  for (const f of found) fails.push(`[${page.viewportSize()?.width}px] ${label}: ${f}`)
}

type Surface = { name: string; step: (id: string) => string; screens: string[] }
const V1 = sequenceById("v1")
const SURFACES: Surface[] = [
  { name: "/plan", step: (id) => `${ROUTES.plan}?step=${id}`, screens: [...TAB_ORDER] },
  { name: "/plan/new", step: (id) => screenRoute(V1, V1.screens.find((s) => s.id === id)!), screens: screensOf("v1").map((s) => s.id) },
]

for (const surface of SURFACES) {
  test.describe(`${surface.name} fits a phone`, () => {
    test(`every step has nothing past the edge, at ${WIDTHS.join(" and ")} px`, async ({ page, account }) => {
      test.setTimeout(1_500_000)
      await seedAndCopy(page, account.id)
      const fails: string[] = []
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 800 })
        for (const id of surface.screens) {
          await page.goto(surface.step(id), { timeout: NAV })
          await settle(page)
          await look(page, `step ${id}`, fails)
        }
      }
      expect(fails.join("\n"), "offenders").toBe("")
    })

    test(`an area sheet and a goal card have nothing past the edge, at ${WIDTHS.join(" and ")} px`, async ({ page, account }) => {
      test.setTimeout(1_500_000)
      await seedAndCopy(page, account.id)
      const fails: string[] = []
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 800 })
        // The area sheet, from the wheel on Your 10s.
        await page.goto(surface.step("now"), { timeout: NAV })
        await settle(page)
        const pick = page.getByRole("button", { name: /Open it\.$/ }).first()
        await expect(pick).toBeVisible({ timeout: NAV })
        await pick.click()
        await expect(page.getByRole("dialog")).toBeVisible()
        await look(page, "area sheet", fails)
        await page.keyboard.press("Escape")
        await expect(page.getByRole("dialog")).toHaveCount(0)
        // The goal card, opened from a goal on Experiences.
        await page.goto(surface.step("milestones"), { timeout: NAV })
        await settle(page)
        const open = page.getByRole("button", { name: GOAL_TITLE, exact: true }).last()
        await expect(open).toBeVisible({ timeout: NAV })
        await open.click()
        await expect(page.getByRole("dialog")).toBeVisible()
        await look(page, "goal card", fails)
      }
      expect(fails.join("\n"), "offenders").toBe("")
    })
  })
}

/**
 * THE SCREENS OF HIS PICKS (Plans/plan-new-from-real.md, Phase 6): the plan home, Plan my week, each long step shown whole
 * ("see it all"), each part of the area sheet and of the goal card. The short screens themselves are in the loop above
 * (every screen of V1).
 */
test.describe("/plan/new, the screens of his picks, fit a phone", () => {
  test(`nothing past the edge, at ${WIDTHS.join(" and ")} px`, async ({ page, account }) => {
    test.setTimeout(1_500_000)
    await seedAndCopy(page, account.id)
    const fails: string[] = []
    const fullAreaId = fullPlan().areas[0].id
    const goal = fullPlan().goals[0]
    const addresses: Array<[string, string]> = [
      ["plan home", `${ROUTES.planNew}?home=1`],
      ["Plan my week", `${ROUTES.planNew}/week`],
      ...Object.entries(STEP_SECTIONS).map(([step, ids]): [string, string] => [`${step} (see it all)`, `${ROUTES.planNew}/${ids[0]}?all=1`]),
      ...AREA_SECTIONS.map((part): [string, string] => [`area sheet, ${part}`, `${ROUTES.planNew}/now?area=${fullAreaId}&part=${part}`]),
      ["area sheet, all", `${ROUTES.planNew}/now?area=${fullAreaId}&part=all`],
      ...GOAL_SECTIONS.map((part): [string, string] => [`goal card, ${part}`, `${ROUTES.planNew}/milestones?area=${goal.areaId}&goal=${goal.id}&part=${part}`]),
      ["goal card, all", `${ROUTES.planNew}/milestones?area=${goal.areaId}&goal=${goal.id}&part=all`],
    ]
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 800 })
      for (const [name, url] of addresses) {
        await page.goto(url, { timeout: NAV })
        await settle(page)
        await look(page, name, fails)
      }
    }
    expect(fails.join("\n"), "offenders").toBe("")
  })
})
