/**
 * THE TIME & ENERGY AUDIT'S STORAGE AND CLOCK, through the app's own repo
 * functions and the database's own functions, against the real schema with
 * real row security (Plans/energy-audit.md, Phase 3 step 3).
 *
 * Fixed instants go in through `p_now`, so no test reads a clock. The clock
 * functions read across accounts, so every assertion filters to its own users.
 * Europe/Copenhagen is UTC+2 until 03:00 on 25 Oct 2026 and UTC+1 after.
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, asUser, newUser, type TestUser } from "@/tests/db/harness"
import {
  AuditRefused,
  AuditRunNotFound,
  auditEndsDueAsServer,
  changeReview,
  auditPingsDueAsServer,
  copyPreviousSlot,
  deleteSlot,
  frequentActivities,
  markEndSentAsServer,
  readOpenRun,
  readRuns,
  readSlots,
  startAuditRun,
  updateRun,
  upsertSlots,
} from "@/src/db/auditRepo"
import { openSend, registerDevice } from "@/src/db/notificationsRepo"
import { updateTimezone } from "@/src/db/settingsRepo"
import { readTimeEntriesBetween } from "@/src/db/timetrackRangeRepo"
import type { AuditAnswer } from "@/src/audit/types"
import { applyReviewChange } from "@/src/audit/auditService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const CPH = "Europe/Copenhagen"

function answer(runId: string, slotAt: string, over: Partial<AuditAnswer> = {}): AuditAnswer {
  return {
    id: randomUUID(),
    runId,
    slotAt,
    activity: "Gym",
    energy: 6,
    growth: 7,
    avoiding: false,
    why: null,
    source: "app",
    timeEntryId: null,
    ...over,
  }
}

/** A person in Copenhagen with a run started at `startedAt` and (optionally) a switched-on device. */
async function personWithRun(label: string, startedAt: string, opts: { device?: boolean; tz?: string } = {}) {
  const user = await newUser(label)
  actAs(user)
  await updateTimezone(user.id, opts.tz ?? CPH)
  if (opts.device !== false) {
    await registerDevice(user.id, { endpoint: `https://fcm.googleapis.com/fcm/send/${randomUUID()}`, p256dh: "BNcR", auth: "tBHI", label: "Phone" })
  }
  const run = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date(startedAt) })
  return { user, run }
}

/** The pings due at `now` for these people only. */
async function pingsFor(users: TestUser[], now: string) {
  const ids = new Set(users.map((u) => u.id))
  return (await auditPingsDueAsServer(100_000, new Date(now))).filter((p) => ids.has(p.userId))
}

describe("who can see an audit", () => {
  it("keeps one person's runs and answers from another", async () => {
    const a = await newUser("audit-a")
    const b = await newUser("audit-b")
    actAs(a)
    const run = await startAuditRun(a.id, { id: randomUUID(), startedAt: new Date("2026-11-02T08:00:00Z") })
    await upsertSlots(a.id, [answer(run.id, "2026-11-02T08:00:00Z")])

    actAs(b)
    expect(await readRuns(b.id)).toEqual([])
    expect(await readSlots(b.id, run.id)).toEqual([])
    // Asking in A's name from B's session still returns nothing: the database fences it.
    expect(await readRuns(a.id)).toEqual([])
    expect(await readSlots(a.id, run.id)).toEqual([])
    await expect(upsertSlots(b.id, [answer(run.id, "2026-11-02T08:15:00Z")])).rejects.toBeInstanceOf(AuditRefused)
    await expect(updateRun(b.id, run.id, { mutedUntil: new Date() })).rejects.toThrow("No such audit")

    actAs(a)
    expect((await readSlots(a.id, run.id)).map((s) => s.activity)).toEqual(["Gym"])
  })

  it("is not readable by a signed-in person asking the database directly", async () => {
    const a = await newUser("audit-direct-a")
    const b = await newUser("audit-direct-b")
    actAs(a)
    const run = await startAuditRun(a.id, { id: randomUUID(), startedAt: new Date("2026-11-02T08:00:00Z") })
    await upsertSlots(a.id, [answer(run.id, "2026-11-02T08:00:00Z")])
    await asUser(b.id, async (q) => {
      expect(await q("select count(*)::int as n from audit_runs where id = $1", [run.id])).toEqual([{ n: 0 }])
      expect(await q("select count(*)::int as n from audit_slots where run_id = $1", [run.id])).toEqual([{ n: 0 }])
    })
  })
})

describe("runs", () => {
  it("lets a person have one open run, and a new one once it has run out", async () => {
    const user = await newUser("audit-one-open")
    actAs(user)
    const first = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date("2026-10-01T08:00:00Z") })
    expect(first.endsAt).toBe("2026-10-15T08:00:00.000Z")

    // The first has run out by Nov 2: starting again closes it at its own end.
    const second = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date("2026-11-02T08:00:00Z") })
    const runs = await readRuns(user.id)
    expect(runs.map((r) => r.id)).toEqual([second.id, first.id])
    expect(runs.find((r) => r.id === first.id)?.endedAt).toBe("2026-10-15T08:00:00.000Z")
    expect(runs.find((r) => r.id === second.id)?.endedAt).toBeNull()
  })

  it("refuses a second start while one is still running, and answers a repeated start with the same run", async () => {
    const user = await newUser("audit-refuse")
    actAs(user)
    const id = randomUUID()
    const startedAt = new Date()
    const run = await startAuditRun(user.id, { id, startedAt })
    expect((await startAuditRun(user.id, { id, startedAt })).id).toBe(run.id)
    await expect(startAuditRun(user.id, { id: randomUUID(), startedAt: new Date() })).rejects.toBeInstanceOf(AuditRefused)
    expect((await readOpenRun(user.id))?.id).toBe(id)
  })

  it("ends now, and then no longer counts as open", async () => {
    const user = await newUser("audit-end")
    actAs(user)
    const run = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date() })
    const ended = await updateRun(user.id, run.id, { endedAt: new Date() })
    expect(ended.endedAt).not.toBeNull()
    expect(await readOpenRun(user.id)).toBeNull()
  })

  it("keeps mute, quiet hours and the review", async () => {
    const user = await newUser("audit-patch")
    actAs(user)
    const run = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date() })
    const until = new Date(Date.now() + 3_600_000)
    const patched = await updateRun(user.id, run.id, {
      mutedUntil: until,
      quietStart: 1380,
      quietEnd: 420,
      review: { choices: { gym: "more" }, notes: { gym: "keep it up" }, week: [{ id: "b1", day: 0, start: 540, end: 660, what: "Write", kind: "deep" }] },
    })
    expect(patched.mutedUntil).toBe(until.toISOString())
    expect([patched.quietStart, patched.quietEnd]).toEqual([1380, 420])
    expect(patched.review).toEqual({ choices: { gym: "more" }, notes: { gym: "keep it up" }, week: [{ id: "b1", day: 0, start: 540, end: 660, what: "Write", kind: "deep" }] })
    await expect(updateRun(user.id, run.id, { quietStart: 1321 })).rejects.toBeInstanceOf(AuditRefused)
  })
})

describe("the review, changed from two devices", () => {
  it("applies each change to what is stored, so saves sent at once all stay", async () => {
    const user = await newUser("audit-review-change")
    actAs(user)
    const run = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date() })
    const changes = [
      { activity: "daygame", choice: "more", note: "Mornings" },
      { activity: "scrolling", choice: "cut", note: "" },
      { block: { id: "pc", day: 0, start: 540, end: 720, what: "Write the book", kind: "deep" } },
      { block: { id: "phone", day: 1, start: 1020, end: 1080, what: "Gym", kind: "workout" } },
    ]
    await Promise.all(changes.map((c) => changeReview(user.id, run.id, (stored) => applyReviewChange(stored, c))))
    const after = (await readRuns(user.id)).find((r) => r.id === run.id)!
    expect(after.review).toEqual({
      choices: { daygame: "more", scrolling: "cut" },
      notes: { daygame: "Mornings" },
      week: [
        { id: "pc", day: 0, start: 540, end: 720, what: "Write the book", kind: "deep" },
        { id: "phone", day: 1, start: 1020, end: 1080, what: "Gym", kind: "workout" },
      ],
    })
    const removed = await changeReview(user.id, run.id, (stored) => applyReviewChange(stored, { removeBlock: "pc" }))
    expect("review" in removed && removed.review.week.map((b) => b.id)).toEqual(["phone"])
  })

  it("returns a refusal without writing, and refuses someone else's audit", async () => {
    const user = await newUser("audit-review-refuse")
    const other = await newUser("audit-review-other")
    actAs(user)
    const run = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date() })
    expect(await changeReview(user.id, run.id, () => ({ error: "No" }))).toEqual({ error: "No" })
    expect((await readRuns(user.id)).find((r) => r.id === run.id)!.review).toEqual({ choices: {}, notes: {}, week: [] })
    actAs(other)
    await expect(changeReview(other.id, run.id, (stored) => ({ review: stored }))).rejects.toBeInstanceOf(AuditRunNotFound)
  })
})

describe("answers", () => {
  it("refuses what the database's rules forbid", async () => {
    const { user, run } = await personWithRun("audit-rules", "2026-11-02T08:00:00Z")
    actAs(user)
    await expect(upsertSlots(user.id, [answer(run.id, "2026-11-02T10:07:00Z")])).rejects.toBeInstanceOf(AuditRefused)
    await expect(upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00.4Z")])).rejects.toBeInstanceOf(AuditRefused)
    await expect(upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z", { energy: 0 as never })])).rejects.toBeInstanceOf(AuditRefused)
    await expect(upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z", { energy: 8 as never })])).rejects.toBeInstanceOf(AuditRefused)
    await expect(upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z", { activity: "x".repeat(201) })])).rejects.toBeInstanceOf(AuditRefused)
    expect(await readSlots(user.id, run.id)).toEqual([])
  })

  it("keeps one row when the same quarter is saved twice, and replaces it", async () => {
    const { user, run } = await personWithRun("audit-twice", "2026-11-02T08:00:00Z")
    actAs(user)
    await upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z", { activity: "Email" })])
    await upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z", { activity: "Deep work", energy: 3 })])
    const slots = await readSlots(user.id, run.id)
    expect(slots.map((s) => [s.activity, s.energy])).toEqual([["Deep work", 3]])
  })

  it("reads more than 1,000 answers, because the read pages", async () => {
    const { user, run } = await personWithRun("audit-many", "2026-11-02T00:00:00Z")
    await asOwner((q) =>
      q(
        `insert into audit_slots (id, user_id, run_id, slot_at, activity, energy, growth, source)
         select gen_random_uuid(), $1, $2, $3::timestamptz + (n * interval '15 minutes'), 'Work', 4, 4, 'later'
           from generate_series(0, 1399) as n`,
        [user.id, run.id, "2026-11-02T00:00:00Z"],
      ),
    )
    actAs(user)
    expect(await readSlots(user.id, run.id)).toHaveLength(1400)
  })

  it("deletes one answer", async () => {
    const { user, run } = await personWithRun("audit-delete", "2026-11-02T08:00:00Z")
    actAs(user)
    const a = answer(run.id, "2026-11-02T10:00:00Z")
    await upsertSlots(user.id, [a, answer(run.id, "2026-11-02T10:15:00Z")])
    await deleteSlot(user.id, a.id)
    expect((await readSlots(user.id, run.id)).map((s) => s.slotAt)).toEqual(["2026-11-02T10:15:00.000Z"])
  })

  it("deletes the answers with the run, and both with the person", async () => {
    const { user, run } = await personWithRun("audit-cascade", "2026-11-02T08:00:00Z")
    actAs(user)
    await upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z")])
    await asOwner((q) => q("delete from audit_runs where id = $1", [run.id]))
    expect(await asOwner((q) => q("select count(*)::int as n from audit_slots where run_id = $1", [run.id]))).toEqual([{ n: 0 }])

    const second = await startAuditRun(user.id, { id: randomUUID(), startedAt: new Date("2026-11-03T08:00:00Z") })
    await upsertSlots(user.id, [answer(second.id, "2026-11-03T10:00:00Z")])
    await asOwner((q) => q("delete from auth.users where id = $1", [user.id]))
    expect(await asOwner((q) => q("select count(*)::int as n from audit_runs where user_id = $1", [user.id]))).toEqual([{ n: 0 }])
    expect(await asOwner((q) => q("select count(*)::int as n from audit_slots where user_id = $1", [user.id]))).toEqual([{ n: 0 }])
  })

  it("lists a person's most frequent activities across every audit", async () => {
    const { user, run } = await personWithRun("audit-frequent", "2026-11-02T08:00:00Z")
    actAs(user)
    await upsertSlots(user.id, [
      answer(run.id, "2026-11-02T10:00:00Z", { activity: "Email" }),
      answer(run.id, "2026-11-02T10:15:00Z", { activity: "email" }),
      answer(run.id, "2026-11-02T10:30:00Z", { activity: "Email" }),
      answer(run.id, "2026-11-02T10:45:00Z", { activity: "Gym" }),
    ])
    expect(await frequentActivities(user.id, 5)).toEqual([
      { activity: "Email", count: 3 },
      { activity: "Gym", count: 1 },
    ])
  })

  it("copies the previous quarter for 'same as before', never its why, and refuses when it should", async () => {
    const { user, run } = await personWithRun("audit-same", "2026-11-02T08:00:00Z")
    actAs(user)
    await upsertSlots(user.id, [answer(run.id, "2026-11-02T10:00:00Z", { activity: "Gym", energy: 3, growth: 7, avoiding: true, why: "private words" })])

    const copied = await copyPreviousSlot(user.id, run.id, new Date("2026-11-02T10:15:00Z"), randomUUID())
    expect(copied).toMatchObject({ activity: "Gym", energy: 3, growth: 7, avoiding: true, why: null, source: "same" })
    // This quarter is now answered, and the one before 10:45 (10:30) is not.
    expect(await copyPreviousSlot(user.id, run.id, new Date("2026-11-02T10:15:00Z"), randomUUID())).toBeNull()
    expect(await copyPreviousSlot(user.id, run.id, new Date("2026-11-02T10:45:00Z"), randomUUID())).toBeNull()
  })
})

describe("audit_pings_due", () => {
  it("is due at 10:15:30 for the 10:00 quarter, and no longer at 10:21", async () => {
    const { user, run } = await personWithRun("ping-due", "2026-11-02T07:00:00Z")
    const due = await pingsFor([user], "2026-11-02T09:15:30Z") // 10:15:30 in Copenhagen (UTC+1)
    expect(due).toEqual([{ runId: run.id, userId: user.id, slotAt: "2026-11-02T09:00:00.000Z", timezone: CPH }])
    expect(await pingsFor([user], "2026-11-02T09:21:00Z")).toEqual([])
  })

  it("is not due while muted, and is again when the mute has run out", async () => {
    const { user, run } = await personWithRun("ping-muted", "2026-11-02T07:00:00Z")
    actAs(user)
    await updateRun(user.id, run.id, { mutedUntil: new Date("2026-11-02T09:30:00Z") })
    expect(await pingsFor([user], "2026-11-02T09:15:30Z")).toHaveLength(0)
    expect(await pingsFor([user], "2026-11-02T09:30:30Z")).toHaveLength(1)
  })

  it("sends the 21:45 quarter at 22:00:30 and not the 07:45 quarter at 08:00:30", async () => {
    const { user } = await personWithRun("ping-quiet", "2026-11-02T07:00:00Z")
    const evening = await pingsFor([user], "2026-11-02T21:00:30Z") // 22:00:30 Copenhagen
    expect(evening.map((p) => p.slotAt)).toEqual(["2026-11-02T20:45:00.000Z"])
    expect(await pingsFor([user], "2026-11-03T07:00:30Z")).toEqual([]) // 08:00:30: quarter 07:45 starts in quiet hours
    expect((await pingsFor([user], "2026-11-03T07:15:30Z")).map((p) => p.slotAt)).toEqual(["2026-11-03T07:00:00.000Z"])
  })

  it("is not due once the quarter is answered", async () => {
    const { user, run } = await personWithRun("ping-answered", "2026-11-02T07:00:00Z")
    actAs(user)
    await upsertSlots(user.id, [answer(run.id, "2026-11-02T09:00:00Z")])
    expect(await pingsFor([user], "2026-11-02T09:15:30Z")).toEqual([])
  })

  it("is not due after a send for that quarter: a second send with the same entry id is refused", async () => {
    const { user, run } = await personWithRun("ping-sent", "2026-11-02T07:00:00Z")
    const entryId = `audit:${run.id}:${Date.parse("2026-11-02T09:00:00Z") / 1000}`
    const first = await openSend(user.id, "audit-ping", new Date("2026-11-02T09:15:30Z"), entryId)
    expect(first).not.toBeNull()
    expect(await openSend(user.id, "audit-ping", new Date("2026-11-02T09:15:31Z"), entryId)).toBeNull()
    expect(await pingsFor([user], "2026-11-02T09:15:40Z")).toEqual([])
  })

  it("is not due with no switched-on device", async () => {
    const { user } = await personWithRun("ping-nodevice", "2026-11-02T07:00:00Z", { device: false })
    expect(await pingsFor([user], "2026-11-02T09:15:30Z")).toEqual([])
  })

  it("counts the quarter a run started in: started at 10:07, the 10:00 quarter is due at 10:15:30", async () => {
    const { user } = await personWithRun("ping-midquarter", "2026-11-02T09:07:00Z")
    expect((await pingsFor([user], "2026-11-02T09:15:30Z")).map((p) => p.slotAt)).toEqual(["2026-11-02T09:00:00.000Z"])
    expect(await pingsFor([user], "2026-11-02T09:00:30Z")).toEqual([]) // the 08:45 quarter ended before the run began
  })

  it("is not due after the run ended or ran out", async () => {
    const { user, run } = await personWithRun("ping-ended", "2026-11-02T07:00:00Z")
    expect(await pingsFor([user], "2026-11-16T09:15:30Z")).toEqual([]) // 14 days later
    actAs(user)
    await updateRun(user.id, run.id, { endedAt: new Date("2026-11-02T09:10:00Z") })
    expect(await pingsFor([user], "2026-11-02T09:15:30Z")).toEqual([])
  })

  it("reads quarters in local time on the clock-change day, 2026-10-25", async () => {
    const { user } = await personWithRun("ping-dst", "2026-10-24T20:00:00Z")
    // 02:15:30 Copenhagen summer time (UTC+2) = 00:15:30Z, still before the change at 03:00 -> 01:00Z.
    expect((await pingsFor([user], "2026-10-25T00:15:30Z")).length).toBe(0) // quiet: 02:00 is inside 22:00-08:00
    // 08:15:30 winter time (UTC+1) = 07:15:30Z: the 08:00 quarter, local.
    const morning = await pingsFor([user], "2026-10-25T07:15:30Z")
    expect(morning.map((p) => p.slotAt)).toEqual(["2026-10-25T07:00:00.000Z"])
    // 08:00:30 winter time is 07:00:30Z; the 07:45 quarter (06:45Z) is quiet, so nothing.
    expect(await pingsFor([user], "2026-10-25T07:00:30Z")).toEqual([])
  })

  it("falls back to UTC for a zone the database does not know", async () => {
    const { user } = await personWithRun("ping-badzone", "2026-11-02T07:00:00Z")
    await asOwner((q) => q("update profiles set timezone = 'Not/AZone' where id = $1", [user.id]))
    const due = await pingsFor([user], "2026-11-02T10:15:30Z")
    expect(due).toEqual([expect.objectContaining({ timezone: "UTC", slotAt: "2026-11-02T10:00:00.000Z" })])
  })
})

describe("audit_ends_due", () => {
  async function ends(users: TestUser[], now: string) {
    const ids = new Set(users.map((u) => u.id))
    return (await auditEndsDueAsServer(100_000, new Date(now))).filter((e) => ids.has(e.userId))
  }

  it("is due once, after the 14 days, and not before", async () => {
    const { user, run } = await personWithRun("end-due", "2026-11-02T08:00:00Z")
    expect(await ends([user], "2026-11-16T07:59:00Z")).toEqual([])
    expect(await ends([user], "2026-11-16T08:00:30Z")).toEqual([{ runId: run.id, userId: user.id }])
    // Sent: the send record and `end_sent_at` each stop it.
    await openSend(user.id, "audit-end", new Date("2026-11-16T08:00:40Z"), `audit-end:${run.id}`)
    expect(await ends([user], "2026-11-16T08:01:30Z")).toEqual([])
  })

  it("is not due again once end_sent_at is set, and not after 2 days", async () => {
    const { user, run } = await personWithRun("end-marked", "2026-11-02T08:00:00Z")
    expect(await ends([user], "2026-11-18T08:00:30Z")).toEqual([])
    await markEndSentAsServer(run.id)
    expect(await ends([user], "2026-11-16T08:00:30Z")).toEqual([])
  })

  it("is never due after 'End now'", async () => {
    const { user, run } = await personWithRun("end-now", "2026-11-02T08:00:00Z")
    actAs(user)
    await updateRun(user.id, run.id, { endedAt: new Date("2026-11-05T08:00:00Z") })
    expect(await ends([user], "2026-11-16T08:00:30Z")).toEqual([])
  })
})

describe("readTimeEntriesBetween", () => {
  it("returns a running entry and one crossing the range start, and never a deleted one", async () => {
    const user = await newUser("range")
    actAs(user)
    const ws = `ws-${randomUUID()}`
    const key = ws.slice(3, 11)
    const id = (name: string) => `${name}-${key}`
    await asOwner(async (q) => {
      await q("insert into timetrack_workspaces (id, user_id, name) values ($1, $2, 'W')", [ws, user.id])
      await q("insert into timetrack_projects (id, user_id, workspace_id, name) values ($1, $2, $3, 'Health')", [`p-${ws}`, user.id, ws])
      const entry = (id: string, desc: string, start: string, stop: string | null, extra = "") =>
        q(
          `insert into timetrack_entries (id, user_id, workspace_id, project_id, description, started_at, stopped_at, duration_seconds ${extra ? ", deleted_at" : ""})
           values ($1, $2, $3, $4, $5, $6, $7, $8 ${extra ? ", now()" : ""})`,
          [id, user.id, ws, `p-${ws}`, desc, start, stop, stop ? 600 : null],
        )
      await entry(id("e-before"), "Before", "2026-11-02T07:00:00Z", "2026-11-02T07:30:00Z")
      await entry(id("e-cross"), "Crossing", "2026-11-02T08:50:00Z", "2026-11-02T09:10:00Z")
      await entry(id("e-inside"), "Inside", "2026-11-02T09:20:00Z", "2026-11-02T09:40:00Z")
      await entry(id("e-running"), "Running", "2026-11-02T09:50:00Z", null)
      await entry(id("e-deleted"), "Deleted", "2026-11-02T09:20:00Z", "2026-11-02T09:30:00Z", "deleted")
      await entry(id("e-after"), "After", "2026-11-02T11:00:00Z", "2026-11-02T11:30:00Z")
    })
    const got = await readTimeEntriesBetween(user.id, "2026-11-02T09:00:00Z", "2026-11-02T10:30:00Z")
    expect(got.map((e) => e.id).sort()).toEqual([id("e-cross"), id("e-inside"), id("e-running")])
    expect(got.find((e) => e.id === id("e-cross"))).toMatchObject({ description: "Crossing", projectName: "Health", stoppedAt: "2026-11-02T09:10:00+00:00" })
    expect(got.find((e) => e.id === id("e-running"))?.stoppedAt).toBeNull()
  })
})
