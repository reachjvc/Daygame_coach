import { test, expect } from "./fixtures/test"
import type { Page } from "@playwright/test"
import { randomUUID } from "node:crypto"
import { stackAdmin } from "./fixtures/stack"
import { whenHydrated } from "./helpers/hydration"

/**
 * DELETES ACROSS DEVICES AND RELOADS, AND THE WHY IN ONE PASS — alpha test
 * findings prove-audit-01, -02 and -03 (2026-11-09), from the tester's steps:
 *
 *  01 Delete, then the page reloads inside the 6 s Undo time: the delete was
 *     never sent while the page stayed open, and the page said "sent when you
 *     have signal" with the signal fine.
 *  02 The optional why sat below the scores; the Growth tap saves and folds
 *     the card, so a why cost a pencil and a Save.
 *  03 An edit on one device and a delete on another at the same moment
 *     sometimes deleted the edit its device had been told was saved.
 *
 * Real server clock. Every test seeds an open audit begun three hours ago
 * with no quiet hours.
 */

const Q = 15 * 60_000
const H = 60 * 60_000
const qStart = (ms: number) => Math.floor(ms / Q) * Q

async function seedRun(userId: string, hoursAgo = 3): Promise<string> {
  const admin = stackAdmin()
  expect((await admin.from("audit_runs").delete().eq("user_id", userId)).error).toBeNull()
  const id = randomUUID()
  const startedAt = qStart(Date.now() - hoursAgo * H)
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

async function seedAnswer(userId: string, runId: string, slotAt: number, activity: string): Promise<string> {
  const id = randomUUID()
  const { error } = await stackAdmin()
    .from("audit_slots")
    .insert({ id, user_id: userId, run_id: runId, slot_at: new Date(slotAt).toISOString(), activity, energy: 5, growth: 5, why: null, source: "app" })
  expect(error).toBeNull()
  return id
}

async function rows(userId: string, runId: string): Promise<{ activity: string; why: string | null; slot_at: string }[]> {
  const { data, error } = await stackAdmin().from("audit_slots").select("activity, why, slot_at").eq("user_id", userId).eq("run_id", runId).order("slot_at")
  expect(error).toBeNull()
  return (data ?? []) as { activity: string; why: string | null; slot_at: string }[]
}

async function openAudit(page: Page, url = "/audit") {
  await page.goto(url)
  await whenHydrated(page.getByTestId("audit-page"), 60_000)
  await expect(page.getByTestId("audit-today")).toBeVisible({ timeout: 30_000 })
}

test.describe("audit deletes and the why @phone", () => {
  test("prove-audit-01: a delete stored in its Undo time is sent after a reload, with no word about signal", async ({ page, account }) => {
    test.setTimeout(90_000)
    const runId = await seedRun(account.id)
    await seedAnswer(account.id, runId, qStart(Date.now()) - 2 * Q, "Old answer")
    await openAudit(page)
    await page.getByTestId("audit-row-answered").filter({ hasText: "Old answer" }).click()
    await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
    await expect(page.getByTestId("audit-undo")).toBeVisible()
    await page.reload()
    await whenHydrated(page.getByTestId("audit-page"), 60_000)
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Old answer" })).toHaveCount(0)
    // no focus, online or visibility event: the page itself sends it when the Undo time ends
    await expect.poll(async () => (await rows(account.id, runId)).length, { timeout: 15_000 }).toBe(0)
    await expect(page.getByTestId("audit-waiting")).toBeHidden()
    expect(await page.getByText("when you have signal").count()).toBe(0)
  })

  test("prove-audit-02: a why written top-down is saved by the Growth tap, in one pass", async ({ page, account }) => {
    const runId = await seedRun(account.id)
    const q = qStart(Date.now()) - Q
    await page.goto(`/audit?answer=${encodeURIComponent(new Date(q).toISOString())}&send=${randomUUID()}`)
    const card = page.getByTestId("audit-answer-sheet").getByTestId("audit-card").first()
    await expect(card.getByTestId("audit-why-open")).toBeVisible({ timeout: 30_000 })
    await card.getByTestId("audit-activity").fill("Approach in the street")
    // one extra tap opens it above the scores; Energy and Growth then save it
    await card.getByTestId("audit-why-open").click()
    await expect(card.getByTestId("audit-why")).toBeFocused()
    await page.keyboard.type("Scared, but it builds me")
    await card.getByTestId("audit-energy").getByRole("radio", { name: "Energy 3" }).click()
    await card.getByTestId("audit-growth").getByRole("radio", { name: "Growth 7" }).click()
    await expect.poll(async () => (await rows(account.id, runId)).map((r) => [r.activity, r.why]), { timeout: 15_000 }).toEqual([
      ["Approach in the street", "Scared, but it builds me"],
    ])
  })

  test("prove-audit-03: an edit and a delete at the same moment, 20 times: never an edit told 'saved' and then deleted", async ({ page, account, browser }, info) => {
    test.setTimeout(180_000)
    const runId = await seedRun(account.id, 8)
    const ctx2 = await browser.newContext({ ...info.project.use, storageState: account.storageState, baseURL: info.project.use.baseURL })
    try {
      const p2 = await ctx2.newPage()
      await openAudit(page)
      await openAudit(p2)
      const out: string[] = []
      let bad = 0
      for (let i = 0; i < 20; i++) {
        const q = qStart(Date.now()) - (i + 2) * Q
        const id = await seedAnswer(account.id, runId, q, "Gym")
        const seen = { id, activity: "Gym", energy: 5, growth: 5, why: null }
        const edit = {
          id,
          runId,
          slotAt: new Date(q).toISOString(),
          activity: `Edit ${i}`,
          energy: 4,
          growth: 5,
          avoiding: false,
          why: null,
          source: "app",
          timeEntryId: null,
          answeredAt: new Date().toISOString(),
          was: seen,
        }
        const [e, d] = await Promise.all([
          page.evaluate(
            async ({ edit, account }) => {
              const r = await fetch("/api/audit/slots", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "x-page-account": account },
                body: JSON.stringify({ slots: [edit], sentAt: new Date().toISOString() }),
              })
              return (await r.json()) as { stored: number; refused: { stored?: unknown }[] }
            },
            { edit, account: account.id },
          ),
          p2.evaluate(
            async ({ id, seen, account, delay }) => {
              // the save does more reads before its write: a stagger lets either land first
              await new Promise((r) => setTimeout(r, delay))
              const r = await fetch(`/api/audit/slots/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json", "x-page-account": account },
                body: JSON.stringify({ at: new Date().toISOString(), sentAt: new Date().toISOString(), seen }),
              })
              return (await r.json()) as { deleted: boolean; changed?: { activity: string } }
            },
            { id, seen, account: account.id, delay: (i % 5) * 15 },
          ),
        ])
        const left = (await rows(account.id, runId)).filter((r) => Date.parse(r.slot_at) === q).map((r) => r.activity)
        // exactly one wins, and the other device is told what happened
        const editWon = e.stored === 1 && !d.deleted && d.changed?.activity === `Edit ${i}` && left.join() === `Edit ${i}`
        const deleteWon = e.stored === 0 && e.refused.length === 1 && e.refused[0].stored === null && d.deleted && left.length === 0
        if (!editWon && !deleteWon) bad++
        out.push(`${i}:${editWon ? "edit" : deleteWon ? "delete" : `BAD ${JSON.stringify({ e, d, left })}`}`)
      }
      console.log(`prove-audit-03 ${info.project.name}: ${out.join(" ")}`)
      // both orders happened, so both refusals were checked
      expect(out.some((x) => x.endsWith(":edit")) && out.some((x) => x.endsWith(":delete")), out.join(" ")).toBe(true)
      expect(bad, out.join(" ")).toBe(0)
    } finally {
      await ctx2.close()
    }
  })

  test("prove-audit-03: a delete of an answer changed on another device is refused and named, with Delete anyway / Keep", async ({ page, account }) => {
    const runId = await seedRun(account.id)
    const q = qStart(Date.now()) - 2 * Q
    const id = await seedAnswer(account.id, runId, q, "Gym")
    expect((await stackAdmin().from("audit_slots").update({ why: "Private reason" }).eq("id", id)).error).toBeNull()
    const sent: { url: string; body: string | null }[] = []
    page.on("request", (r) => {
      if (r.method() === "DELETE" && r.url().includes("/api/audit/slots/")) sent.push({ url: r.url(), body: r.postData() })
    })
    await openAudit(page)
    await page.getByTestId("audit-row-answered").filter({ hasText: "Gym" }).click()
    await page.getByTestId("audit-answer-sheet").getByTestId("audit-delete").click()
    await expect(page.getByTestId("audit-undo")).toBeVisible()
    // another device changes it inside the Undo time
    expect((await stackAdmin().from("audit_slots").update({ activity: "Changed on the PC" }).eq("id", id)).error).toBeNull()
    const line = page.getByTestId("audit-not-deleted")
    await expect(line).toContainText("Changed on another device: Changed on the PC", { timeout: 15_000 })
    // what it saw goes in the body; his words never in the address (review of 81f325e9)
    expect(sent).toHaveLength(1)
    expect(decodeURIComponent(sent[0].url)).not.toContain("Private reason")
    expect(decodeURIComponent(sent[0].url)).not.toContain("Gym")
    expect(JSON.parse(sent[0].body ?? "{}").seen).toMatchObject({ id, activity: "Gym", why: "Private reason" })
    expect((await rows(account.id, runId)).map((r) => r.activity)).toEqual(["Changed on the PC"])
    await expect(page.getByTestId("audit-row-answered").filter({ hasText: "Changed on the PC" })).toHaveCount(1)
    await line.getByTestId("audit-not-deleted-delete").click()
    await expect.poll(async () => (await rows(account.id, runId)).length, { timeout: 15_000 }).toBe(0)
    await expect(line).toBeHidden()
  })
})
