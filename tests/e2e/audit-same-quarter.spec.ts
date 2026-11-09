import { test, expect } from "./fixtures/test"
import type { Browser, Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"

/**
 * THE SAME QUARTER ANSWERED ON THE PHONE AND THE PC (alpha slow-pass-06).
 *
 * Both open the card for one quarter; the phone saves "Walk", then the PC
 * saves "Reading" from its card still open. The PC's save used to overwrite
 * the phone's with a plain "Saved". Now the PC is told, "Answered on another
 * device: Walk · E 5 · G 4", and chooses: "Keep that one" or "Use mine".
 * The same holds for an answer that waited on a phone with no signal.
 */

const Q = 15 * 60_000
const H = 60 * 60_000
const qStart = (ms: number) => Math.floor(ms / Q) * Q

async function seedRun(userId: string): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
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

async function stored(userId: string, runId: string): Promise<string[]> {
  const { data, error } = await stackAdmin().from("audit_slots").select("activity, energy, growth").eq("user_id", userId).eq("run_id", runId).order("slot_at")
  expect(error).toBeNull()
  return (data ?? []).map((r) => `${r.activity} E${r.energy} G${r.growth}`)
}

async function openAudit(page: Page) {
  await page.goto("/audit")
  await whenHydrated(page.getByTestId("audit-page"), 60_000)
  await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
}

const labelOf = (q: number) => {
  const f = (x: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(x))
  return `${f(q)}–${f(q + Q)}`
}

async function inCopenhagen(page: Page) {
  const res = await page.request.put("/api/settings/time-preferences", { data: { timezone: "Europe/Copenhagen", source: "chosen" } })
  expect(res.status()).toBe(200)
}

async function openCard(page: Page, label: string) {
  await page.getByTestId("audit-row-gap").filter({ hasText: label }).click()
  await page.getByTestId("audit-answer-selection").click()
  const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card")
  await expect(card).toHaveCount(1)
  return card
}

/** Fill a new card; the tap that completes it saves it (3 taps from a ping). */
async function fill(card: ReturnType<Page["getByTestId"]>, activity: string, energy: number, growth: number) {
  await card.getByTestId("audit-activity").fill(activity)
  await expect(card).toHaveAttribute("data-autosave", "yes")
  await card.getByTestId("audit-energy").getByRole("radio", { name: `Energy ${energy}` }).click()
  await card.getByTestId("audit-growth").getByRole("radio", { name: `Growth ${growth}` }).click()
}

async function secondDevice(browser: Browser, storageState: string) {
  const info = test.info()
  const ctx = await browser.newContext({ ...info.project.use, storageState, baseURL: info.project.use.baseURL })
  return { ctx, page: await ctx.newPage() }
}

test.describe("one quarter, two devices @phone", () => {
  /** Both cards open on the gap; the phone saves Walk; the PC's re-read is held back, so its card never saw Walk. */
  async function bothAnswer(page: Page, browser: Browser, account: { id: string; storageState: string }) {
    await inCopenhagen(page)
    const runId = await seedRun(account.id)
    const label = labelOf(qStart(Date.now()) - 2 * Q)
    const phone = await secondDevice(browser, account.storageState)
    await openAudit(phone.page)
    await openAudit(page)
    const pcCard = await openCard(page, label)
    // the PC's 30 s re-read must not bring Walk first: that case says "Saving replaces it"
    await page.route("**/api/audit", (route) => route.abort("internetdisconnected"))
    const phoneCard = await openCard(phone.page, label)
    await fill(phoneCard, "Walk", 5, 4)
    await expect(phoneCard.getByTestId("audit-card-saved")).toBeVisible()
    await expect.poll(() => stored(account.id, runId)).toEqual(["Walk E5 G4"])
    await fill(pcCard, "Reading", 2, 2)
    return { runId, phone, pcCard }
  }

  test("the later save is not stored over the earlier one: the PC is told and keeps the phone's", async ({ page, account, browser }) => {
    test.setTimeout(150_000)
    const { runId, phone, pcCard } = await bothAnswer(page, browser, account)
    try {
      const conflict = pcCard.getByTestId("audit-card-conflict")
      await expect(conflict).toContainText("Answered on another device: Walk · E 5 · G 4", { timeout: 15_000 })
      await expect(pcCard.getByTestId("audit-card-saved")).toHaveCount(0)
      expect(await stored(account.id, runId)).toEqual(["Walk E5 G4"])
      await pcCard.getByRole("button", { name: "Keep that one" }).click()
      await expect(pcCard.getByTestId("audit-card-kept")).toContainText("Walk · E 5 · G 4")
      await page.unroute("**/api/audit")
      await page.keyboard.press("Escape")
      await expect(page.getByTestId("audit-not-kept")).toHaveCount(0)
      expect(await stored(account.id, runId)).toEqual(["Walk E5 G4"])
      await phone.page.reload()
      await expect(phone.page.getByTestId("audit-row-answered").filter({ hasText: "Walk" })).toHaveCount(1, { timeout: 30_000 })
    } finally {
      await phone.ctx.close()
    }
  })

  test("Use mine stores the PC's answer over the phone's, once he chose it", async ({ page, account, browser }) => {
    test.setTimeout(150_000)
    const { runId, phone, pcCard } = await bothAnswer(page, browser, account)
    try {
      await expect(pcCard.getByTestId("audit-card-conflict")).toContainText("Walk · E 5 · G 4", { timeout: 15_000 })
      await pcCard.getByRole("button", { name: "Use mine" }).click()
      await expect(pcCard.getByTestId("audit-card-saved")).toContainText("Reading", { timeout: 15_000 })
      await expect.poll(() => stored(account.id, runId)).toEqual(["Reading E2 G2"])
    } finally {
      await page.unroute("**/api/audit")
      await phone.ctx.close()
    }
  })

  test("an answer that waited offline on the phone is not lost to the PC's: Use mine sends it", async ({ page, account, browser }) => {
    test.setTimeout(150_000)
    await inCopenhagen(page)
    const runId = await seedRun(account.id)
    const label = labelOf(qStart(Date.now()) - 2 * Q)
    const phone = await secondDevice(browser, account.storageState)
    try {
      await openAudit(phone.page)
      await openAudit(page)
      await phone.ctx.setOffline(true)
      const phoneCard = await openCard(phone.page, label)
      await fill(phoneCard, "Daygame sets", 6, 7)
      await expect(phoneCard.getByTestId("audit-card-saved")).toBeVisible()
      await fill(await openCard(page, label), "Email", 2, 3)
      await expect.poll(() => stored(account.id, runId)).toEqual(["Email E2 G3"])
      await phone.ctx.setOffline(false)
      await phone.page.evaluate(() => window.dispatchEvent(new Event("online")))
      const conflict = phoneCard.getByTestId("audit-card-conflict")
      await expect(conflict).toContainText("Answered on another device: Email · E 2 · G 3", { timeout: 30_000 })
      expect(await stored(account.id, runId)).toEqual(["Email E2 G3"])
      await phoneCard.getByRole("button", { name: "Use mine" }).click()
      await expect.poll(() => stored(account.id, runId), { timeout: 15_000 }).toEqual(["Daygame sets E6 G7"])
      await expect(phoneCard.getByTestId("audit-card-saved")).toContainText("Daygame sets")
    } finally {
      await phone.ctx.close()
    }
  })

  test("a refusal that came with the sheet closed offers the same choice on the page", async ({ page, account, browser }) => {
    test.setTimeout(150_000)
    await inCopenhagen(page)
    const runId = await seedRun(account.id)
    const label = labelOf(qStart(Date.now()) - 2 * Q)
    const phone = await secondDevice(browser, account.storageState)
    try {
      await openAudit(phone.page)
      await openAudit(page)
      await phone.ctx.setOffline(true)
      await fill(await openCard(phone.page, label), "Daygame sets", 6, 7)
      await phone.page.keyboard.press("Escape")
      await fill(await openCard(page, label), "Email", 2, 3)
      await expect.poll(() => stored(account.id, runId)).toEqual(["Email E2 G3"])
      await phone.ctx.setOffline(false)
      await phone.page.evaluate(() => window.dispatchEvent(new Event("online")))
      const line = phone.page.getByTestId("audit-not-kept")
      await expect(line).toContainText("Answered on another device: Email · E 2 · G 3", { timeout: 30_000 })
      await line.getByRole("button", { name: "Keep that one" }).click()
      await expect(line).toHaveCount(0)
      expect(await stored(account.id, runId)).toEqual(["Email E2 G3"])
    } finally {
      await phone.ctx.close()
    }
  })
})

/**
 * THE CHECK AND THE WRITE ARE ONE STEP (review of a5d7a5f0; `writeSlotsOverSeen`,
 * asserted here on the rows stored). Two saves that
 * saw the same thing, sent at the same instant: exactly one is stored, the
 * other is refused with it. Read-then-write let both pass, the second over the
 * first.
 */
test.describe("two saves at the same instant", () => {
  const body = (runId: string, slotAt: string, activity: string, was: unknown) => ({
    sentAt: new Date().toISOString(),
    slots: [
      { id: randomUUID(), runId, slotAt, activity, energy: 3, growth: 3, avoiding: false, why: null, source: "app", timeEntryId: null, answeredAt: new Date().toISOString(), was },
    ],
  })
  type Reply = { stored: number; refused: { error: string; stored: { activity: string } | null }[] }

  async function race(page: Page, runId: string, slotAt: string, was: unknown) {
    const send = (activity: string) => page.request.put("/api/audit/slots", { data: body(runId, slotAt, activity, was) })
    const replies = await Promise.all([send("Phone"), send("PC"), send("Tablet")])
    for (const r of replies) expect(r.status()).toBe(200)
    return (await Promise.all(replies.map((r) => r.json()))) as Reply[]
  }

  function oneWins(replies: Reply[], stored: string[]) {
    expect(replies.filter((r) => r.stored === 1)).toHaveLength(1)
    const losers = replies.filter((r) => r.stored === 0)
    expect(losers).toHaveLength(2)
    for (const l of losers) expect(l.refused).toEqual([expect.objectContaining({ error: "Changed on another device since", stored: expect.objectContaining({ activity: stored[0].split(" ")[0] }) })])
  }

  test("on an empty quarter (was: none)", async ({ page, account }) => {
    const runId = await seedRun(account.id)
    const slotAt = new Date(qStart(Date.now()) - 2 * Q).toISOString()
    const replies = await race(page, runId, slotAt, null)
    const now = await stored(account.id, runId)
    expect(now).toHaveLength(1)
    oneWins(replies, now)
  })

  test("over the same answer (was: that answer)", async ({ page, account }) => {
    const runId = await seedRun(account.id)
    const slotAt = new Date(qStart(Date.now()) - 2 * Q).toISOString()
    const first = body(runId, slotAt, "Walk", null)
    expect((await (await page.request.put("/api/audit/slots", { data: first })).json()).stored).toBe(1)
    const seen = { id: first.slots[0].id, activity: "Walk", energy: 3, growth: 3, why: null }
    const replies = await race(page, runId, slotAt, seen)
    const now = await stored(account.id, runId)
    expect(now).toHaveLength(1)
    expect(now[0]).not.toContain("Walk")
    oneWins(replies, now)
  })
})
