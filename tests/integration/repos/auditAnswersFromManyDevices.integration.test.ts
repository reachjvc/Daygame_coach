/**
 * ANSWERS FROM A PHONE THAT WAS OFFLINE, AND FROM TWO DEVICES, against the real
 * schema (Plans/energy-audit.md, Phase 7: the adversarial audit's findings).
 *
 * Each test was red before its fix:
 *   - one refused answer cost every other answer in the send;
 *   - an older offline answer, or an offline delete, overwrote a newer answer
 *     from another device;
 *   - an answer holding the NUL character made every save fail with a 500;
 *   - the audit's write routes took a cross-site or non-JSON request.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, newUser } from "@/tests/db/harness"
import { call } from "@/tests/integration/routes/call"
import { readSlots, startAuditRun, updateRun } from "@/src/db/auditRepo"
import { quarterStart, QUARTER_MS } from "@/src/audit/quarterService"
import type { AuditAnswer } from "@/src/audit/types"
import * as slotsRoute from "@/app/api/audit/slots/route"
import * as slotRoute from "@/app/api/audit/slots/[id]/route"
import * as runsRoute from "@/app/api/audit/runs/route"
import * as runRoute from "@/app/api/audit/runs/[id]/route"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type SaveAnswer = { stored: number; refused: { id: string; error: string; retry: boolean }[] }

/** A person with a run begun three hours ago, and its last ended quarters. */
async function person(label: string) {
  const user = await newUser(label)
  actAs(user)
  const now = Date.now()
  const run = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date(now - 3 * 60 * 60_000) })
  const q = (back: number) => new Date(quarterStart(now) - back * QUARTER_MS).toISOString()
  return { user, run, q }
}

function answer(runId: string, slotAt: string, over: Partial<AuditAnswer> = {}): AuditAnswer {
  return { id: randomUUID(), runId, slotAt, activity: "Email", energy: 3, growth: 4, avoiding: false, why: null, source: "app", timeEntryId: null, ...over }
}

const save = (slots: AuditAnswer[], sentAt = new Date().toISOString(), headers: Record<string, string> = {}) =>
  call<SaveAnswer>(slotsRoute.PUT, "/api/audit/slots", { method: "PUT", body: { slots, sentAt }, headers })

describe("saving a phone's waiting answers", () => {
  it("stores the good answers when one in the send is refused, and says which may pass later", async () => {
    const p = await person("batch-partial")
    // Ended on another device 30 minutes ago: the quarters after that are outside the audit now.
    await updateRun(p.user.id, p.run.id, { endedAt: new Date(Date.now() - 30 * 60_000) })
    const early = answer(p.run.id, p.q(8), { activity: "Early valid" })
    const late = answer(p.run.id, p.q(1), { activity: "After the end" })
    const res = await save([early, late])
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ stored: 1, refused: [{ id: late.id, error: "That quarter is outside this audit", retry: false }] })
    expect((await readSlots(p.user.id, p.run.id)).map((s) => s.activity)).toEqual(["Early valid"])
  })

  it("marks a quarter the server's clock has not reached as one that may pass later", async () => {
    const p = await person("batch-later")
    const ok = answer(p.run.id, p.q(2))
    const future = answer(p.run.id, new Date(quarterStart(Date.now()) + 2 * QUARTER_MS).toISOString(), { activity: "Clock ahead" })
    const res = await save([ok, future])
    expect(res.body).toEqual({ stored: 1, refused: [{ id: future.id, error: "That quarter has not started yet", retry: true }] })
  })

  it("keeps a newer answer from another device when an older offline one arrives", async () => {
    const p = await person("older-loses")
    const slotAt = p.q(2)
    const phoneAnsweredAt = new Date(Date.now() - 10 * 60_000).toISOString()
    // The laptop answers now; the phone answered 10 minutes ago, offline, and sends it now.
    expect((await save([answer(p.run.id, slotAt, { activity: "Laptop newer", answeredAt: new Date().toISOString() })])).body.stored).toBe(1)
    const old = answer(p.run.id, slotAt, { activity: "Phone old", answeredAt: phoneAnsweredAt })
    const res = await save([old])
    expect(res.body.refused).toEqual([{ id: old.id, error: "Changed on another device since", retry: false }])
    expect((await readSlots(p.user.id, p.run.id))[0].activity).toBe("Laptop newer")
  })

  it("corrects the phone's clock: a phone 10 minutes fast still replaces its own earlier answer", async () => {
    const p = await person("clock-fast")
    const slotAt = p.q(2)
    const first = answer(p.run.id, slotAt, { activity: "First" })
    await save([first])
    const fast = (ms: number) => new Date(ms + 10 * 60_000).toISOString()
    const edit = { ...first, activity: "Edited", answeredAt: fast(Date.now()) }
    const res = await save([edit], fast(Date.now()))
    expect(res.body).toMatchObject({ stored: 1, refused: [] })
    expect((await readSlots(p.user.id, p.run.id))[0].activity).toBe("Edited")
  })

  it("an edit sent after a slow first save is not refused as older", async () => {
    const p = await person("slow-first")
    const slotAt = p.q(2)
    const t1 = new Date(Date.now() - 6_000).toISOString()
    const t2 = new Date(Date.now() - 5_000).toISOString()
    const first = answer(p.run.id, slotAt, { activity: "First version", answeredAt: t1 })
    await save([first])
    const res = await save([{ ...first, activity: "Edited version", answeredAt: t2 }])
    expect(res.body.stored).toBe(1)
    expect((await readSlots(p.user.id, p.run.id))[0].activity).toBe("Edited version")
  })

  it("stores an answer holding the NUL character, without it", async () => {
    const p = await person("nul")
    const res = await save([answer(p.run.id, p.q(2), { activity: "Pasted\u0000text", why: "a\u0000b" })])
    expect(res.status).toBe(200)
    expect(res.body.stored).toBe(1)
    expect((await readSlots(p.user.id, p.run.id))[0]).toMatchObject({ activity: "Pastedtext", why: "ab" })
  })
})

describe("deleting with a phone that was offline", () => {
  it("keeps an answer that another device gave again after the delete", async () => {
    const p = await person("delete-older")
    const slot = answer(p.run.id, p.q(2), { activity: "Original" })
    await save([slot])
    const deletedAt = new Date(Date.now() - 5 * 60_000).toISOString()
    // The laptop changes it now; the phone's delete was made 5 minutes ago, offline.
    await save([{ ...slot, activity: "Laptop later edit", answeredAt: new Date().toISOString() }])
    const res = await call<{ deleted: boolean }>(slotRoute.DELETE, `/api/audit/slots/${slot.id}?at=${encodeURIComponent(deletedAt)}&sentAt=${encodeURIComponent(new Date().toISOString())}`, {
      method: "DELETE",
      params: { id: slot.id },
    })
    expect(res.status).toBe(200)
    expect(res.body.deleted).toBe(false)
    expect((await readSlots(p.user.id, p.run.id))[0].activity).toBe("Laptop later edit")
  })

  it("deletes when nothing changed since", async () => {
    const p = await person("delete-plain")
    const slot = answer(p.run.id, p.q(2))
    await save([slot])
    const res = await call<{ deleted: boolean }>(slotRoute.DELETE, `/api/audit/slots/${slot.id}?at=${encodeURIComponent(new Date().toISOString())}`, {
      method: "DELETE",
      params: { id: slot.id },
    })
    expect(res.body.deleted).toBe(true)
    expect(await readSlots(p.user.id, p.run.id)).toEqual([])
  })
})

describe("every audit route that changes something takes same-site JSON only", () => {
  it("refuses a cross-site request and a body that is not JSON", async () => {
    const p = await person("cross-site")
    const cross = { "Sec-Fetch-Site": "cross-site" }
    expect((await save([answer(p.run.id, p.q(2))], undefined, cross)).status).toBe(403)
    expect((await call(runsRoute.POST, "/api/audit/runs", { method: "POST", body: { id: randomUUID() }, headers: cross })).status).toBe(403)
    expect((await call(runRoute.PATCH, `/api/audit/runs/${p.run.id}`, { method: "PATCH", body: { mute: "1h" }, params: { id: p.run.id }, headers: cross })).status).toBe(403)
    expect((await call(slotRoute.DELETE, `/api/audit/slots/${randomUUID()}`, { method: "DELETE", params: { id: randomUUID() }, headers: cross })).status).toBe(403)
    const form = await call(runsRoute.POST, "/api/audit/runs", {
      method: "POST",
      body: JSON.stringify({ id: randomUUID(), x: "=" }),
      headers: { "Content-Type": "text/plain" },
    })
    expect(form.status).toBe(415)
    expect(await readSlots(p.user.id, p.run.id)).toEqual([])
  })
})

describe("a finished audit's record", () => {
  it("refuses a change of quiet hours after the audit ended", async () => {
    const p = await person("quiet-after-end")
    await updateRun(p.user.id, p.run.id, { endedAt: new Date() })
    const res = await call(runRoute.PATCH, `/api/audit/runs/${p.run.id}`, { method: "PATCH", body: { quietStart: 600, quietEnd: 720 }, params: { id: p.run.id } })
    expect(res.status).toBe(409)
  })
})
