/**
 * AN OLD AUDIT IS NEVER STAMPED WITH TODAY'S ZONE (review of 8190829d, sev 2).
 *
 * The page's read stored the account's CURRENT zone on every finished audit
 * that had none, the first time it was read after the deploy, for good. An
 * audit lived in Copenhagen and read after a move to New York was stamped New
 * York. Now the zone is recorded when the audit STARTS, End now stamps the zone
 * at that moment, and the read stores nothing: an audit with no stored zone
 * keeps falling back to the account's zone when shown.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const CPH = "Europe/Copenhagen"
const NY = "America/New_York"
const RUN_ID = "00000000-0000-4000-8000-000000000001"

const h = vi.hoisted(() => ({
  keepRunZone: vi.fn(async (_u: string, _r: string, zone: string) => zone),
  startAuditRun: vi.fn(async (_u: string, input: { id: string; zone?: string | null }) => ({ id: input.id })),
  runs: [] as Record<string, unknown>[],
  zone: "America/New_York" as string,
}))

vi.mock("@/src/db/auth", () => ({ requireAuth: vi.fn(async () => ({ success: true, userId: "u1", supabase: {} })) }))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: vi.fn(async () => h.zone) }))
vi.mock("@/src/db/timetrackRangeRepo", () => ({ readTimeEntriesBetween: vi.fn(async () => []) }))
vi.mock("@/src/db/auditRepo", () => {
  class AuditRefused extends Error {}
  class AuditRunNotFound extends Error {}
  return {
    AuditRefused,
    AuditRunNotFound,
    frequentActivities: vi.fn(async () => []),
    keepRunZone: h.keepRunZone,
    readOpenRun: vi.fn(async () => null),
    readRuns: vi.fn(async () => h.runs.map((r) => ({ ...r }))),
    readSlots: vi.fn(async () => []),
    startAuditRun: h.startAuditRun,
    updateRun: vi.fn(async (_u: string, id: string) => ({ ...h.runs.find((r) => r.id === id), endedAt: new Date().toISOString() })),
    changeReview: vi.fn(),
  }
})

import { GET } from "@/app/api/audit/route"
import { POST as START } from "@/app/api/audit/runs/route"
import { PATCH } from "@/app/api/audit/runs/[id]/route"
import { runZone } from "@/src/audit/auditService"
import type { AuditRun } from "@/src/audit/types"

function run(over: Partial<AuditRun> = {}): AuditRun {
  return {
    id: RUN_ID,
    startedAt: "2026-10-01T07:00:00.000Z",
    endsAt: "2026-10-15T07:00:00.000Z",
    endedAt: null,
    quietStart: 22 * 60,
    quietEnd: 8 * 60,
    mutedUntil: null,
    review: { choices: {}, notes: {}, week: [] },
    endSentAt: null,
    zone: null,
    ...over,
  }
}

const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

beforeEach(() => {
  h.keepRunZone.mockClear()
  h.startAuditRun.mockClear()
  h.zone = NY
  h.runs = []
})

describe("reading the audit page", () => {
  it("stores no zone on a finished audit that has none, and shows it in the account's zone", async () => {
    h.runs = [run()]
    const res = await GET(new Request("http://x/api/audit"))
    expect(res.status).toBe(200)
    expect(h.keepRunZone).not.toHaveBeenCalled()
    const body = (await res.json()) as { runs: AuditRun[] }
    expect(body.runs[0].zone ?? null).toBeNull()
    expect(runZone(body.runs[0], NY)).toBe(NY)
  })
})

describe("starting an audit", () => {
  it("records the account's zone at the start", async () => {
    h.zone = CPH
    const res = await START(new Request("http://x/api/audit/runs", json({ id: RUN_ID })))
    expect(res.status).toBe(200)
    expect(h.startAuditRun).toHaveBeenCalledWith("u1", expect.objectContaining({ id: RUN_ID, zone: CPH }))
  })
})

describe("End now", () => {
  it("stamps the zone at that moment over the one recorded at the start", async () => {
    const now = Date.now()
    h.runs = [run({ startedAt: new Date(now - 86400_000).toISOString(), endsAt: new Date(now + 86400_000).toISOString(), zone: CPH })]
    const res = await PATCH(new Request(`http://x/api/audit/runs/${RUN_ID}`, { ...json({ end: true }), method: "PATCH" }), {
      params: Promise.resolve({ id: RUN_ID }),
    })
    expect(res.status).toBe(200)
    expect(h.keepRunZone).toHaveBeenCalledWith("u1", RUN_ID, NY, { replace: true })
  })
})

describe("an open audit", () => {
  it("follows the account's zone, whatever was recorded at its start", () => {
    const open = run({ startedAt: new Date(Date.now() - 3600_000).toISOString(), endsAt: new Date(Date.now() + 86400_000).toISOString(), zone: CPH })
    expect(runZone(open, NY)).toBe(NY)
    expect(runZone(run({ endedAt: "2026-10-05T07:00:00.000Z", zone: CPH }), NY)).toBe(CPH)
  })
})
