import { test, expect } from "./fixtures/test"
import type { Locator, Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"
import { ROUTES } from "@/src/shared/routes"

/**
 * WHAT THE PHONE SHOWS WITHOUT SCROLLING — alpha prove-eye findings of
 * 2026-11-09, severity 4 (~/.cache/daygame-research/alpha/findings-p7.jsonl):
 *
 *  01 Another device answered first: the "Not saved yet" card sat above the
 *     visible area, the sheet had already moved on to the next card.
 *  03 The "turn on pings" help showed on Today, in Mute and in Settings; on an
 *     iPhone it pushed the mute choices below the fold.
 *  14 Quarters Time filled from one entry came as one card each, so a long
 *     entry was a long scroll; the plan says one card for the stretch.
 *
 * SHOT_DIR set: each test also saves a screenshot of what it checked there.
 */

const Q = 15 * 60_000
const H = 60 * 60_000
const qStart = (ms: number) => Math.floor(ms / Q) * Q

/** An open audit begun three hours ago with no quiet hours, and no Time entries. */
async function seedRun(userId: string): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  expect((await admin.from("timetrack_entries").delete().eq("user_id", userId)).error).toBeNull()
  const id = randomUUID()
  const startedAt = qStart(Date.now() - 3 * H)
  const { error } = await admin.from("audit_runs").insert({
    id,
    user_id: userId,
    started_at: new Date(startedAt).toISOString(),
    ends_at: new Date(startedAt + 14 * 24 * H).toISOString(),
    quiet_start: 0,
    quiet_end: 0,
  })
  expect(error).toBeNull()
  return id
}

async function answerAllBut(userId: string, runId: string, open: number[]): Promise<void> {
  const last = qStart(Date.now()) - Q
  const rows = []
  for (let q = qStart(Date.now() - 3 * H); q <= last; q += Q) {
    if (open.includes(q)) continue
    rows.push({ id: randomUUID(), user_id: userId, run_id: runId, slot_at: new Date(q).toISOString(), activity: "Earlier", energy: 4, growth: 4, source: "app" })
  }
  const { error } = await stackAdmin().from("audit_slots").insert(rows)
  expect(error).toBeNull()
}

async function slotsOf(userId: string, runId: string): Promise<{ slot_at: string; activity: string }[]> {
  const { data, error } = await stackAdmin().from("audit_slots").select("slot_at, activity").eq("user_id", userId).eq("run_id", runId).order("slot_at")
  expect(error).toBeNull()
  return (data ?? []) as { slot_at: string; activity: string }[]
}

async function seedTimeEntry(userId: string, description: string, from: number, to: number): Promise<void> {
  const admin = stackAdmin()
  const existing = await admin.from("timetrack_workspaces").select("id").eq("user_id", userId).is("deleted_at", null).maybeSingle()
  let workspaceId = existing.data?.id as string | undefined
  if (!workspaceId) {
    const made = await admin.from("timetrack_workspaces").insert({ user_id: userId }).select("id").single()
    expect(made.error).toBeNull()
    workspaceId = made.data!.id as string
  }
  const { error } = await admin.from("timetrack_entries").insert({
    user_id: userId,
    workspace_id: workspaceId,
    description,
    started_at: new Date(from).toISOString(),
    stopped_at: new Date(to).toISOString(),
    duration_seconds: Math.round((to - from) / 1000),
  })
  expect(error).toBeNull()
}

async function inCopenhagen(page: Page) {
  const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
  expect(res.status()).toBe(200)
}

const clock = (x: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(x))
const pingUrl = (q: number) => `${ROUTES.audit}?answer=${encodeURIComponent(new Date(q).toISOString())}&send=${randomUUID()}`

/** Fully on screen, with no scrolling. */
async function inView(page: Page, el: Locator): Promise<boolean> {
  const box = await el.boundingBox()
  const vp = page.viewportSize()!
  return box !== null && box.y >= 0 && box.y + box.height <= vp.height
}

async function shot(page: Page, name: string) {
  const dir = process.env.SHOT_DIR
  if (dir) await page.screenshot({ path: `${dir}/${test.info().project.name}-${name}.png` })
}

test.describe("the answer sheet fits the phone @phone", () => {
  test("14: a stretch Time filled from one entry is one card, and splits into its quarters", async ({ page, account }) => {
    await inCopenhagen(page)
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    const gym = [newest - 3 * Q, newest - 2 * Q, newest - Q, newest]
    await answerAllBut(account.id, run, [newest - 4 * Q, ...gym])
    await seedTimeEntry(account.id, "Gym", newest - 3 * Q, newest + Q)
    await page.goto(pingUrl(newest))
    const cards = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    // the blank quarter before stays a card of its own (F08)
    await expect(cards).toHaveCount(2, { timeout: 60_000 })
    const stretch = cards.first()
    await expect(stretch.locator("h3")).toContainText(`${clock(gym[0])}–${clock(newest + Q)} · this ping · 4 quarters · from Time: Gym`)
    await expect(stretch.getByTestId("audit-activity")).toHaveValue("Gym")
    expect(await inView(page, stretch.locator("h3"))).toBe(true)
    await shot(page, "time-stretch-card")

    await stretch.getByTestId("audit-split").click()
    await expect(cards).toHaveCount(5)
    await expect(cards.first().locator("h3")).toContainText(`${clock(newest)}–${clock(newest + Q)} · this ping`)
    await page.keyboard.press("Escape")

    // one answer for the stretch writes each of its quarters
    await page.goto(pingUrl(newest))
    await expect(cards).toHaveCount(2, { timeout: 60_000 })
    await cards.first().getByRole("radio", { name: "Energy 4" }).click()
    await cards.first().getByRole("radio", { name: "Growth 6" }).click()
    await expect(page.getByTestId("audit-card-saved").first()).toContainText("Gym")
    await expect.poll(async () => (await slotsOf(account.id, run)).filter((s) => s.activity === "Gym").map((s) => Date.parse(s.slot_at)), { timeout: 20_000 }).toEqual(gym)
  })

  test("01: the card another device answered first is brought back into view", async ({ page, account }) => {
    test.setTimeout(120_000)
    await inCopenhagen(page)
    const run = await seedRun(account.id)
    const newest = qStart(Date.now()) - Q
    await answerAllBut(account.id, run, [newest - 2 * Q, newest - Q, newest])
    await page.goto(pingUrl(newest))
    const cards = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
    await expect(cards).toHaveCount(3, { timeout: 60_000 })
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    // the page's re-read must not bring the other answer first: that case says "Saving replaces it"
    await page.route("**/api/audit", (route) => route.abort("internetdisconnected"))
    const first = cards.first()
    await first.getByTestId("audit-activity").fill("Reading")
    await first.getByRole("radio", { name: "Energy 2" }).click()
    // the other device answers this quarter now
    const { error } = await stackAdmin().from("audit_slots").insert({ id: randomUUID(), user_id: account.id, run_id: run, slot_at: new Date(newest).toISOString(), activity: "Walk", energy: 5, growth: 4, source: "app" })
    expect(error).toBeNull()
    await first.getByRole("radio", { name: "Growth 2" }).click()
    const conflict = page.getByTestId("audit-card-conflict")
    await expect(conflict).toContainText("Answered on another device: Walk · E 5 · G 4", { timeout: 15_000 })
    await expect(page.getByTestId("audit-sheet-needs-you")).toContainText("1 answer needs you")
    await expect.poll(() => inView(page, page.getByTestId("audit-answer-sheet").getByRole("button", { name: "Use mine" })), { timeout: 5_000 }).toBe(true)
    await shot(page, "refused-card")
    await page.getByTestId("audit-answer-sheet").getByRole("button", { name: "Keep that one" }).click()
    await expect(page.getByTestId("audit-sheet-needs-you")).toHaveCount(0)
  })

  test("03: with no device getting pings, Mute shows its choices and one line to Settings", async ({ page, account }) => {
    await seedRun(account.id)
    const { devices } = await (await page.request.get("/api/notifications/devices")).json()
    for (const d of devices as { id: string }[]) await page.request.delete(`/api/notifications/devices/${d.id}`)
    await page.goto(ROUTES.audit)
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    // Today: one line, not the help box
    await expect(page.getByTestId("audit-pings-line")).toBeVisible()
    await expect(page.getByTestId("audit-today").getByTestId("audit-pings-install")).toHaveCount(0)
    await expect(page.getByTestId("audit-today").getByTestId("audit-pings-offer")).toHaveCount(0)
    await page.getByTestId("audit-mute-open").click()
    const sheet = page.getByTestId("audit-mute-sheet")
    await expect(sheet.getByTestId("audit-mute-state")).toContainText("No device gets pings")
    await expect(sheet.getByTestId("audit-pings-install")).toHaveCount(0)
    // every choice on screen once the sheet has slid in, with no scrolling
    for (const choice of ["30 min", "1 hour", "2 hours", "Until morning"]) {
      await expect.poll(() => inView(page, sheet.getByRole("button", { name: new RegExp(choice) })), { message: choice, timeout: 5_000 }).toBe(true)
    }
    await shot(page, "mute-sheet")
    // the full help is one tap away, in Settings
    await sheet.getByTestId("audit-mute-setup").click()
    const settings = page.getByTestId("audit-settings-sheet")
    await expect(settings.getByTestId("audit-pings-this-device")).toBeVisible()
    await expect(settings).toContainText("Devices that get pings")
  })
})
