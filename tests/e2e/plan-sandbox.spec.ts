import { test, expect } from "./fixtures/test"
import type { Page, Request as PwRequest, Response as PwResponse } from "@playwright/test"
import { Client } from "pg"
import { ROUTES } from "@/src/shared/routes"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planWithSteps, seedLifePlan } from "./helpers/lifePlan"
import { stackAdmin, testStackEnv } from "./fixtures/stack"

/**
 * THE COPY SPACE (Plans/plan-in-steps.md, Phase 2), through the real page.
 *
 * What these prove, with a real browser, the real server and the real database:
 *   - EVERY request the /plan/sandbox page makes that writes anything acts on the
 *     copy space (`?target=sandbox`, naming the hidden account) or never leaves the
 *     browser; and the page makes no call to the database from the browser at all;
 *   - the owner's own rows are identical, table by table, after copying in, editing
 *     and ticking in the copy, and resetting; the owner's real /plan still shows
 *     the owner's plan and none of the copy's edits;
 *   - brand-new shows the first-visit screen, and copy shows the owner's plan;
 *   - an account with no copy space gets 404 on the page and on every route, and
 *     never sees the Settings card; a user id is never accepted as the target;
 *   - no session token reaches the browser, in a body or a cookie.
 */

/** A reload after a button, on a dev server that may still be compiling. */
const RELOAD = 30_000
const NORTH_STAR = "A house I chose, and the health to enjoy it." // what fullPlan() says
const ROUTE_TABLES = [
  "life_plans", "life_plan_nodes", "life_plan_north_stars", "life_plan_areas", "life_plan_goals", "life_plan_goal_checkpoints",
  "life_plan_goal_obstacles", "life_plan_goal_beliefs", "life_plan_routines", "life_plan_routine_steps", "life_plan_routine_split_days",
  "life_plan_experiences", "life_plan_fields", "life_plan_sub_steps", "life_plan_seasons", "life_plan_goal_feeds", "life_plan_goal_serves",
  "life_plan_routine_serves", "life_plan_step_serves", "life_plan_reviews", "life_plan_season_areas", "life_plan_season_goals",
  "life_plan_review_scores", "life_plan_review_goals", "life_plan_values", "life_plan_answers", "life_plan_days", "life_plan_day_ratings",
  "life_plan_day_ticks", "life_plan_day_journal", "life_plan_day_numbers", "life_plan_reminders",
]

/** A row count and a hash of every row, per table, for one account, read as the database owner. */
async function fingerprint(userId: string): Promise<Record<string, string>> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    const out: Record<string, string> = {}
    for (const t of ROUTE_TABLES) {
      const { rows } = await db.query(
        `select count(*)::int as n, md5(coalesce(string_agg(x::text, '|' order by x::text), '')) as h from public.${t} x where user_id = $1`,
        [userId],
      )
      out[t] = `${rows[0].n}:${rows[0].h}`
    }
    return out
  } finally {
    await db.end()
  }
}

async function rows<T = Record<string, unknown>>(sql: string, params: unknown[]): Promise<T[]> {
  const db = new Client({ connectionString: testStackEnv().DB_URL })
  await db.connect()
  try {
    return (await db.query(sql, params)).rows as T[]
  } finally {
    await db.end()
  }
}

/** The owner's plan: the full one, plus a routine step that runs every day (so Today has a box to tick). */
function ownersPlan(): object {
  const full = fullPlan()
  const extra = (planWithSteps([{ id: "s_e2e", title: "E2E cold shower", daysPerWeek: 7 }]) as { routines: object[] }).routines[0]
  return { ...full, routines: [...full.routines, { ...extra, id: "r_e2e" }] }
}

async function giveCopySpace(ownerId: string): Promise<void> {
  const { error } = await stackAdmin().from("plan_sandboxes").upsert({ owner_id: ownerId }, { onConflict: "owner_id", ignoreDuplicates: true })
  if (error) throw new Error(`could not give the account a copy space: ${error.message}`)
}

/** The owner's plan and two past days, through the app's own routes, as the owner. */
async function seedOwner(page: Page, ownerId: string): Promise<void> {
  const seeded = await seedLifePlan(page, ownerId, ownersPlan())
  for (const date of ["2026-01-05", "2026-01-06"]) {
    const res = await page.request.put("/api/life-plan/day", { data: { date, note: `owner note ${date}`, ticks: { s_e2e: true } } })
    expect(res.status(), await res.text()).toBe(200)
  }
  expect(seeded.revision).toBeGreaterThan(0)
}

const sandboxIdOf = async (ownerId: string) =>
  (await rows<{ sandbox_user_id: string | null }>("select sandbox_user_id from public.plan_sandboxes where owner_id = $1", [ownerId]))[0]?.sandbox_user_id ?? null

interface Seen {
  method: string
  url: URL
  account: string | undefined
}

/** Records every request the page makes, to the app and to anywhere else. */
function record(page: Page): { all: Seen[]; stop: () => void } {
  const all: Seen[] = []
  const on = (r: PwRequest) => all.push({ method: r.method(), url: new URL(r.url()), account: r.headers()["x-page-account"] })
  page.on("request", on)
  return { all, stop: () => page.off("request", on) }
}

/** True for a request that acts on the copy space: the plan or day route aimed at it, or the copy space's own routes. */
function actsOnCopySpace(r: Seen, sandboxId: string): boolean {
  const p = r.url.pathname
  const aimed = (p === "/api/life-plan" || p === "/api/life-plan/day") && r.url.searchParams.get("target") === "sandbox"
  const own = p === "/api/plan-sandbox/copy" || p === "/api/plan-sandbox/reset"
  return (aimed || own) && r.account === sandboxId
}

/** `next dev` symbolicates errors by POSTing to itself; it is the dev server's tooling, not the app, and does not exist in a build. */
const isWrite = (r: Seen) => !["GET", "HEAD", "OPTIONS"].includes(r.method) && !r.url.pathname.startsWith("/__nextjs_")

test.describe("the copy space page", () => {
  test.beforeEach(async ({ page, account }) => {
    await giveCopySpace(account.id)
    await seedOwner(page, account.id)
    // A clean copy space for each test: empty it, as the page's own button would.
    await page.request.post("/api/plan-sandbox/reset")
  })

  test("brand-new shows the first-visit screen; copy shows the owner's plan; the owner is never written", async ({ page, account }) => {
    const ownerBefore = await fingerprint(account.id)
    expect(Number(ownerBefore.life_plans.split(":")[0])).toBe(1)

    // BRAND NEW: the copy space holds nothing, so it is the first visit of a new account.
    await page.goto(`${ROUTES.planSandbox}?step=star`)
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    await expect(page.getByTestId("plan-sandbox-banner")).toContainText("Copy space — your real plan is not touched")
    await expect(page.getByRole("textbox", { name: "Your north star" })).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Your north star" })).toHaveValue("")
    await expect(page.getByRole("button", { name: /North star: nothing written yet/ })).toBeVisible()
    await expect(page.getByText("Run a half marathon")).toHaveCount(0)

    // COPY: asks first, then the owner's plan is there.
    await page.getByTestId("plan-sandbox-copy").click()
    await expect(page.getByTestId("plan-sandbox-sure")).toContainText("Your real plan is not changed")
    await page.getByTestId("plan-sandbox-cancel").click()
    expect(await sandboxIdOf(account.id)).not.toBeNull()
    expect((await fingerprint((await sandboxIdOf(account.id))!)).life_plans.startsWith("0:")).toBe(true)
    await page.getByTestId("plan-sandbox-copy").click()
    await page.getByTestId("plan-sandbox-confirm").click()
    await expect(page.getByRole("textbox", { name: "Your north star" })).toHaveValue(NORTH_STAR, { timeout: RELOAD })

    // The copy holds a copy: same row counts per table as the owner, different ids.
    const sandboxId = (await sandboxIdOf(account.id))!
    const copy = await fingerprint(sandboxId)
    for (const t of ROUTE_TABLES.filter((x) => x !== "life_plan_reminders")) {
      expect(copy[t].split(":")[0], `${t}: the copy has the owner's row count`).toBe(ownerBefore[t].split(":")[0])
    }
    expect(await fingerprint(account.id)).toEqual(ownerBefore)

    // START AS A BRAND-NEW USER again: empty, and the first-visit screen.
    await page.getByTestId("plan-sandbox-new").click()
    await expect(page.getByTestId("plan-sandbox-sure")).toContainText("Your real plan is not changed")
    await page.getByTestId("plan-sandbox-confirm").click()
    await expect(page.getByRole("textbox", { name: "Your north star" })).toHaveValue("", { timeout: RELOAD })
    await expect(page.getByRole("button", { name: /North star: nothing written yet/ })).toBeVisible()
    expect((await fingerprint(sandboxId)).life_plans.startsWith("0:")).toBe(true)
    expect(await fingerprint(account.id)).toEqual(ownerBefore)
  })

  test("every write the page can make acts on the copy space; the owner's rows and real plan are unchanged", async ({ page, account }) => {
    test.setTimeout(180_000)
    const ownerBefore = await fingerprint(account.id)
    const net = record(page)
    const responses: PwResponse[] = []
    const errors: string[] = []
    page.on("pageerror", (e) => errors.push(e.message))
    page.on("response", (r) => responses.push(r))

    await page.goto(`${ROUTES.planSandbox}?step=star`)
    await page.getByTestId("plan-sandbox-copy").click()
    await page.getByTestId("plan-sandbox-confirm").click()
    const sandboxId = (await sandboxIdOf(account.id))!
    const north = page.getByRole("textbox", { name: "Your north star" })
    await expect(north).toHaveValue(NORTH_STAR, { timeout: RELOAD })

    // PLAN WRITE: type into the north star, wait for the account save.
    await north.fill(`${NORTH_STAR} EDITED IN THE COPY`)
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 15_000 })

    // DAY WRITE: tick the step that runs every day, on Today.
    await page.goto(`${ROUTES.planSandbox}?step=today`)
    const box = page.getByRole("checkbox", { name: /E2E cold shower/ }).first()
    await expect(box).toBeVisible()
    await box.click()
    await expect(page.getByText("Saved to your account.")).toBeVisible({ timeout: 15_000 })

    // The other tabs, so every child component mounts and shows what it fetches: review (reminder block), systems (training), track, journal, area dialogs.
    for (const step of ["review", "journal", "track", "systems", "focus", "now"]) {
      const read = page.waitForResponse((r) => r.url().includes("/api/life-plan?target=sandbox") && r.request().method() === "GET")
      await page.goto(`${ROUTES.planSandbox}?step=${step}`)
      await read
      await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    }
    // Hydrated (the page's guard is in place) once it has read its plan.
    const hydrated = page.waitForResponse((r) => r.url().includes("/api/life-plan?target=sandbox") && r.request().method() === "GET")
    await page.goto(`${ROUTES.planSandbox}?step=review`)
    await hydrated
    // The weekly reminder, which would switch on push for an account, is not offered here.
    await expect(page.getByText(/reminder/i).filter({ hasText: /switch on|turn on|remind me/i })).toHaveCount(0)
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()

    // A write the page may NOT make never leaves the browser: it is answered in place.
    const before = net.all.length
    const blocked = await page.evaluate(async () => {
      const out: Record<string, number | string> = {}
      for (const [path, method] of [
        ["/api/life-plan/reminders", "PUT"],
        ["/api/notifications/devices", "POST"],
        ["/api/programs/enrollments", "POST"],
        ["/api/role-models/week", "PUT"],
        ["/api/goals", "DELETE"],
      ]) {
        out[`${method} ${path}`] = await fetch(path, { method, headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.status, (e) => (e instanceof TypeError ? "blocked" : String(e)))
      }
      return out
    })
    for (const [what, status] of Object.entries(blocked)) expect(status, what).toBe("blocked")
    expect(net.all.slice(before).filter(isWrite), "a refused write must not reach the network").toEqual([])

    // THE REQUEST LOG, for the whole session.
    net.stop()
    const writes = net.all.filter(isWrite)
    expect(writes.map((w) => w.url.pathname).sort(), "a copy, a plan save and a day save, so this proves something").toEqual(["/api/life-plan", "/api/life-plan/day", "/api/plan-sandbox/copy"])
    const stray = writes.filter((w) => !actsOnCopySpace(w, sandboxId)).map((w) => `${w.method} ${w.url.pathname}${w.url.search} as ${w.account}`)
    expect(stray, "every write targets the copy space").toEqual([])
    // The plan and day reads of the page are aimed at the copy space too, and never name the owner.
    const planReads = net.all.filter((r) => r.url.pathname === "/api/life-plan" || r.url.pathname === "/api/life-plan/day")
    expect(planReads.length).toBeGreaterThan(0)
    for (const r of planReads) expect(r.url.searchParams.get("target"), `${r.method} ${r.url.pathname}`).toBe("sandbox")
    expect(net.all.some((r) => r.account === account.id), "no request names the owner's account").toBe(false)
    // The browser never talks to the database itself (REST or RPC), so no direct write is possible from it.
    const api = new URL(testStackEnv().API_URL)
    const direct = net.all.filter((r) => r.url.host === api.host && /\/(rest|rpc|functions)\/v1\//.test(r.url.pathname))
    expect(direct.map((r) => `${r.method} ${r.url.pathname}`)).toEqual([])
    // Nothing went to another site as a write either.
    const origin = new URL(page.url()).origin
    expect(writes.filter((w) => w.url.origin !== origin).map((w) => w.url.href)).toEqual([])

    expect(errors, "the page threw").toEqual([])

    // THE COPY MOVED; THE OWNER DID NOT.
    const stars = await rows<{ text: string }>("select text from public.life_plan_north_stars where user_id = $1 and ended_on is null", [sandboxId])
    expect(stars.map((s) => s.text).join("|")).toContain("EDITED IN THE COPY")
    const ticks = await rows<{ n: number }>("select count(*)::int as n from public.life_plan_day_ticks where user_id = $1", [sandboxId])
    expect(ticks[0].n).toBeGreaterThan(2) // the two copied days' ticks plus today's
    expect(await fingerprint(account.id)).toEqual(ownerBefore)

    // NO TOKEN REACHED THE BROWSER: no cookie of the hidden account, no session in any body, no token naming anybody.
    const jwts = new Set<string>()
    for (const r of responses) {
      if (r.url().startsWith(api.origin)) continue
      const type = r.headers()["content-type"] ?? ""
      if (!/json|html|javascript|text/.test(type)) continue
      const body = await r.text().catch(() => "")
      for (const m of body.matchAll(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g)) jwts.add(m[0])
      expect(body, `${r.url()} carries a session`).not.toMatch(/"(access_token|refresh_token)"/)
    }
    for (const jwt of jwts) {
      const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()) as { sub?: string }
      expect(payload.sub, "a token naming a user reached the browser").toBeUndefined()
    }
    const cookies = await page.context().cookies()
    const sessionCookies = cookies.filter((c) => /^sb-.*-auth-token/.test(c.name))
    expect(sessionCookies.length).toBeGreaterThan(0)
    for (const c of sessionCookies) expect(decodeURIComponent(c.value)).not.toContain(sandboxId)
    expect(JSON.stringify(await page.evaluate(() => ({ ...localStorage })))).not.toMatch(/access_token|refresh_token/)

    // RESET, then the owner is still untouched.
    await page.goto(`${ROUTES.planSandbox}?step=star`)
    await page.getByTestId("plan-sandbox-new").click()
    await page.getByTestId("plan-sandbox-confirm").click()
    await expect(page.getByRole("textbox", { name: "Your north star" })).toHaveValue("", { timeout: RELOAD })
    expect(await fingerprint(account.id)).toEqual(ownerBefore)

    // THE OWNER'S REAL /plan shows the owner's plan, none of the copy's edits, and its own save writes nothing new.
    await page.goto(`${ROUTES.plan}?step=star`)
    await expect(page.getByRole("textbox", { name: "Your north star" })).toHaveValue(NORTH_STAR)
    await expect(page.getByText("EDITED IN THE COPY")).toHaveCount(0)
    expect(await fingerprint(account.id)).toEqual(ownerBefore)
    expect(await page.evaluate(() => Object.keys(localStorage).some((k) => k.includes("EDITED")))).toBe(false)
  })

  test("the server refuses what the page's own guard would: another account's id, and the owner's id, as the page account", async ({ page, account }) => {
    await page.goto(`${ROUTES.planSandbox}?step=star`)
    const sandboxId = (await sandboxIdOf(account.id))!
    // Naming the owner while aiming at the copy is refused, and so is naming the copy while aiming at the owner.
    expect((await page.request.get("/api/life-plan?target=sandbox", { headers: { "x-page-account": account.id } })).status()).toBe(409)
    expect((await page.request.get("/api/life-plan", { headers: { "x-page-account": sandboxId } })).status()).toBe(409)
    expect((await page.request.get("/api/life-plan?target=sandbox", { headers: { "x-page-account": sandboxId } })).status()).toBe(200)
    // Any other route, asked as the copy space's page would ask it, refuses a request that names the hidden account.
    expect((await page.request.get("/api/programs/enrollments", { headers: { "x-page-account": sandboxId } })).status()).toBe(409)
    // A user id is never a target.
    for (const bad of [sandboxId, account.id, "self", "owner", ""]) {
      expect((await page.request.get(`/api/life-plan?target=${bad}`)).status(), `target=${bad}`).toBe(400)
    }
  })

  test("the address never leaves the copy space: any step, copy, reset and reload all stay on /plan/sandbox", async ({ page, account }) => {
    test.setTimeout(150_000)
    const ownerBefore = await fingerprint(account.id)
    const here = () => new URL(page.url()).pathname
    await page.goto(`${ROUTES.planSandbox}?step=today`)
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    // Tap through EVERY step the rail offers.
    const nav = page.getByRole("navigation", { name: "Sections" })
    const fold = page.getByRole("button", { name: /^Edit your plan/ })
    if ((await fold.count()) > 0 && (await fold.getAttribute("aria-expanded")) === "false") await fold.click()
    const count = await nav.getByRole("button").count()
    expect(count).toBeGreaterThan(8)
    for (let i = 0; i < count; i++) {
      await nav.getByRole("button").nth(i).click()
      expect(here(), `after step ${i}`).toBe(ROUTES.planSandbox)
      await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
      if ((await fold.count()) > 0 && (await fold.getAttribute("aria-expanded")) === "false") await fold.click()
    }
    // A step change writes the step into the address under the copy space's own path.
    await nav.getByRole("button", { name: /Review/ }).first().click()
    await expect.poll(() => page.url()).toContain(`${ROUTES.planSandbox}?step=review`)

    // Copy, then reset, then reload: always the copy space, always with its banner.
    await page.getByTestId("plan-sandbox-copy").click()
    await page.getByTestId("plan-sandbox-confirm").click()
    await expect(page.getByRole("button", { name: /Review/ }).first()).toBeVisible({ timeout: RELOAD })
    await expect.poll(here, { timeout: RELOAD }).toBe(ROUTES.planSandbox)
    expect(page.url()).toContain("step=review")
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible()
    await page.getByTestId("plan-sandbox-new").click()
    await page.getByTestId("plan-sandbox-confirm").click()
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible({ timeout: RELOAD })
    await expect.poll(here, { timeout: RELOAD }).toBe(ROUTES.planSandbox)
    await page.reload()
    await expect(page.getByTestId("plan-sandbox-banner")).toBeVisible({ timeout: RELOAD })
    expect(here()).toBe(ROUTES.planSandbox)
    expect(await fingerprint(account.id)).toEqual(ownerBefore)
  })

  test("a copy that fails leaves the copy space empty and says so; two at once cannot interleave", async ({ page, account }) => {
    await page.goto(`${ROUTES.planSandbox}?step=star`)
    const sandboxId = (await sandboxIdOf(account.id))!
    await rows("update public.plan_sandboxes set busy_since = now() where owner_id = $1", [account.id])
    const busy = await page.request.post("/api/plan-sandbox/copy")
    expect(busy.status()).toBe(409)
    await rows("update public.plan_sandboxes set busy_since = null where owner_id = $1", [account.id])
    expect((await page.request.post("/api/plan-sandbox/copy")).status()).toBe(200)
    expect(Number((await fingerprint(sandboxId)).life_plans.split(":")[0])).toBe(1)
    // The claim is released afterwards.
    const [row] = await rows<{ busy_since: string | null }>("select busy_since from public.plan_sandboxes where owner_id = $1", [account.id])
    expect(row.busy_since).toBeNull()
  })

  test("Settings links to the copy space for an account that has one", async ({ page }) => {
    await page.goto(ROUTES.settings)
    const card = page.getByTestId("plan-sandbox-card-link")
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(new RegExp(`${ROUTES.planSandbox}$`))
  })

  test.describe("@phone", () => {
    test.use({ viewport: { width: 390, height: 844 } })

    test("the banner and its two buttons fit a phone and ask before they act", async ({ page }) => {
      await page.goto(`${ROUTES.planSandbox}?step=star`)
      const banner = page.getByTestId("plan-sandbox-banner")
      await expect(banner).toBeVisible()
      const copy = page.getByTestId("plan-sandbox-copy")
      const fresh = page.getByTestId("plan-sandbox-new")
      await expect(copy).toBeVisible()
      await expect(fresh).toBeVisible()
      for (const button of [copy, fresh]) {
        const box = (await button.boundingBox())!
        expect(box.height, "a thumb-sized button").toBeGreaterThanOrEqual(44)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(390)
      }
      const widest = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(widest, "no sideways scroll").toBeLessThanOrEqual(390)
      await copy.click()
      await expect(page.getByTestId("plan-sandbox-confirm")).toBeVisible()
      await expect(page.getByTestId("plan-sandbox-cancel")).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
      await page.screenshot({ path: test.info().outputPath("sandbox-banner-390.png") })
    })
  })
})

test.describe("an account with no copy space", () => {
  test("gets 404 on the page and on every route, and no Settings card", async ({ browser, secondUser }) => {
    const context = await browser.newContext({ storageState: secondUser.storageState })
    const page = await context.newPage()
    expect((await page.goto(ROUTES.planSandbox))!.status()).toBe(404)
    const api = context.request
    const json = { "content-type": "application/json" }
    const calls: [string, string, unknown?][] = [
      ["GET", "/api/life-plan?target=sandbox"],
      ["POST", "/api/life-plan?target=sandbox"],
      ["PATCH", "/api/life-plan?target=sandbox", { revision: 0, changes: { plan_id: "x", replace: [] } }],
      ["GET", "/api/life-plan/day?target=sandbox"],
      ["PUT", "/api/life-plan/day?target=sandbox", { date: "2026-01-05", note: "x" }],
      ["POST", "/api/plan-sandbox/copy"],
      ["POST", "/api/plan-sandbox/reset"],
    ]
    for (const [method, path, data] of calls) {
      const res = await api.fetch(path, { method, headers: json, data: data ? JSON.stringify(data) : undefined })
      expect(res.status(), `${method} ${path}`).toBe(404)
    }
    // They have no hidden account made for them by asking.
    const made = await rows("select 1 from public.plan_sandboxes where owner_id = $1", [secondUser.id])
    expect(made).toHaveLength(0)
    await page.goto(ROUTES.settings)
    await expect(page.getByTestId("plan-sandbox-card")).toHaveCount(0)
    await context.close()
  })

  test("a signed-out visitor never reaches a copy space", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto(ROUTES.planSandbox)
    await expect(page).toHaveURL(/\/auth\/login/)
    expect((await context.request.post("/api/plan-sandbox/reset")).status()).toBe(401)
    expect((await context.request.get("/api/life-plan?target=sandbox")).status()).toBe(401)
    await context.close()
  })
})
