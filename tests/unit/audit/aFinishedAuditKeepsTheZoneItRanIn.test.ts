/**
 * A FINISHED AUDIT KEEPS THE ZONE IT RAN IN (alpha p9-review-01).
 *
 * Changing the account's zone after an audit rewrote its finished review: the
 * best hour 10:00 became 04:00 (inside the quiet hours) and the count of
 * possible quarters grew. A finished audit now keeps its zone beside its
 * review (`review.zone`); an open one still follows the account's zone, so a
 * traveller can switch zones while it runs.
 */
import { describe, expect, it } from "vitest"
import { buildReview, reviewToStore, runZone, storedZone } from "@/src/audit/auditService"
import type { AuditRun, AuditSlot } from "@/src/audit/types"

const CPH = "Europe/Copenhagen"
const NY = "America/New_York"

function finishedRun(zone: string | null): AuditRun {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    // Mon 2 Nov 2026 08:00 in Copenhagen (07:00 UTC), ended Fri 6 Nov 18:00 there.
    startedAt: "2026-11-02T07:00:00.000Z",
    endsAt: "2026-11-16T07:00:00.000Z",
    endedAt: "2026-11-06T17:00:00.000Z",
    quietStart: 22 * 60,
    quietEnd: 8 * 60,
    mutedUntil: null,
    review: { choices: {}, notes: {}, week: [] },
    endSentAt: null,
    zone,
  }
}

/** Mon to Fri: 10:00-11:00 Copenhagen energy 5 growth 5, 14:00 energy 2 growth 2. */
function slots(): AuditSlot[] {
  const out: AuditSlot[] = []
  let n = 0
  for (let d = 0; d < 5; d++) {
    const day = Date.parse("2026-11-02T00:00:00Z") + d * 86400_000
    const at = (h: number, m: number, e: 2 | 5) => {
      const slotAt = new Date(day + (h - 1) * 3600_000 + m * 60_000).toISOString() // Copenhagen is UTC+1 in November
      out.push({ id: `s${n++}`, runId: "r", slotAt, activity: e === 5 ? "Writing" : "Email", energy: e, growth: e, avoiding: false, why: null, source: "app", timeEntryId: null })
    }
    for (const m of [0, 15, 30, 45]) at(10, m, 5)
    at(14, 0, 2)
  }
  return out
}

describe("the zone a review is shown in", () => {
  it("is the zone stored with a finished audit, not the account's zone now", () => {
    expect(runZone(finishedRun(CPH), NY)).toBe(CPH)
  })

  it("falls back to the account's zone for an audit with no stored zone", () => {
    expect(runZone(finishedRun(null), NY)).toBe(NY)
    expect(runZone({ ...finishedRun(null), zone: undefined }, NY)).toBe(NY)
  })

  it("keeps the best hour and the count of quarters after the account moves to New York", () => {
    const run = finishedRun(CPH)
    const before = buildReview(slots(), run, runZone(run, CPH))
    const after = buildReview(slots(), run, runZone(run, NY))
    expect(after.possibleQuarters).toBe(before.possibleQuarters)
    expect(after.workHours).toEqual(before.workHours)
    expect(after.bestHours.map((h) => h.hour)).toContain(10)
  })
})

describe("the stored zone", () => {
  it("is read from the review json, and only a real zone counts", () => {
    expect(storedZone({ choices: {}, zone: CPH })).toBe(CPH)
    expect(storedZone({ choices: {} })).toBeNull()
    expect(storedZone({ zone: "Not/AZone" })).toBeNull()
    expect(storedZone({ zone: 7 })).toBeNull()
    expect(storedZone(null)).toBeNull()
  })

  it("survives a change to the review", () => {
    const raw = { choices: {}, notes: {}, week: [], zone: CPH }
    const before = { choices: {}, notes: {}, week: [] }
    const stored = reviewToStore(raw, before, { ...before, notes: { writing: "keep" } })
    expect("value" in stored && stored.value.zone).toBe(CPH)
  })
})
