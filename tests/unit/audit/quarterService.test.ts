/**
 * QUARTERS — src/audit/quarterService.ts (Plans/energy-audit.md, Phase 4).
 */
import { describe, expect, it } from "vitest"
import {
  QUARTER_MS,
  answerSheetQuarters,
  withAnswered,
  sheetOrder,
  stretchBefore,
  prefillQuarters,
  quarterLabel,
  quarterStart,
  quartersBetween,
  runQuarters,
  stretchLabel,
} from "@/src/audit/quarterService"
import type { AuditRun, TimeEntryForAudit } from "@/src/audit/types"

const CPH = "Europe/Copenhagen"
const at = (iso: string) => Date.parse(iso)
const min = 60_000

function run(over: Partial<AuditRun> = {}): AuditRun {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    startedAt: "2026-11-09T06:00:00.000Z",
    endsAt: "2026-11-23T06:00:00.000Z",
    endedAt: null,
    quietStart: 1320,
    quietEnd: 480,
    mutedUntil: null,
    review: { choices: {}, notes: {}, week: [] },
    endSentAt: null,
    ...over,
  }
}

function entry(id: string, startedAt: string, stoppedAt: string | null, description = id, projectName: string | null = null): TimeEntryForAudit {
  return { id, description, projectName, startedAt, stoppedAt }
}

describe("quarterStart and quartersBetween", () => {
  it("rounds down to :00, :15, :30, :45", () => {
    expect(new Date(quarterStart(at("2026-11-09T09:07:12Z"))).toISOString()).toBe("2026-11-09T09:00:00.000Z")
    expect(new Date(quarterStart(at("2026-11-09T09:15:00Z"))).toISOString()).toBe("2026-11-09T09:15:00.000Z")
  })
  it("lists the quarters of a stretch, from the one holding the start", () => {
    const qs = quartersBetween(at("2026-11-09T09:07:00Z"), at("2026-11-09T09:45:00Z"))
    expect(qs.map((q) => new Date(q).toISOString().slice(11, 16))).toEqual(["09:00", "09:15", "09:30"])
  })
})

describe("prefillQuarters", () => {
  const q = at("2026-11-09T09:00:00Z")
  const now = at("2026-11-09T12:00:00Z")

  it("an entry covering 8 of 15 minutes wins; one covering 7 does not", () => {
    const eight = prefillQuarters([q], [entry("Email", "2026-11-09T09:07:00Z", "2026-11-09T09:30:00Z")], now)
    expect(eight.get(q)?.text).toBe("Email")
    const seven = prefillQuarters([q], [entry("Email", "2026-11-09T09:08:00Z", "2026-11-09T09:30:00Z")], now)
    expect(seven.has(q)).toBe(false)
  })

  it("of two entries, the larger overlap wins", () => {
    const p = prefillQuarters(
      [q],
      [entry("Email", "2026-11-09T08:00:00Z", "2026-11-09T09:07:00Z"), entry("Gym", "2026-11-09T09:07:00Z", "2026-11-09T10:00:00Z")],
      now,
    )
    expect(p.get(q)?.text).toBe("Gym")
  })

  it("a tie goes to the later start", () => {
    const p = prefillQuarters(
      [q],
      [entry("Early", "2026-11-09T08:00:00Z", "2026-11-09T09:07:30Z"), entry("Late", "2026-11-09T09:07:30Z", "2026-11-09T10:00:00Z")],
      now,
    )
    expect(p.get(q)?.text).toBe("Late")
  })

  it("a running entry counts up to now", () => {
    const running = [entry("Gym", "2026-11-09T09:00:00Z", null)]
    expect(prefillQuarters([q], running, at("2026-11-09T09:20:00Z")).get(q)?.text).toBe("Gym")
    // At 09:06 only 6 minutes of the quarter have happened.
    expect(prefillQuarters([q], running, at("2026-11-09T09:06:00Z")).has(q)).toBe(false)
  })

  it("a running entry counts only up to the read it came from, not on to now (alpha slow-pass-02)", () => {
    // Read at 17:45 while "Writing report" ran; it stopped at 17:50 on another
    // device, but this copy (kept for no signal) still says running.
    const copy = [entry("Writing report", "2026-11-09T17:30:00Z", null)]
    const readAt = at("2026-11-09T17:45:00Z")
    const late = at("2026-11-09T18:45:00Z")
    const p = prefillQuarters([late, at("2026-11-09T17:30:00Z")], copy, at("2026-11-09T19:03:00Z"), readAt)
    expect(p.has(late)).toBe(false)
    // The quarter it did cover while the copy was read still fills.
    expect(p.get(at("2026-11-09T17:30:00Z"))?.text).toBe("Writing report")
    // Without a read time it is "running now", as before.
    expect(prefillQuarters([late], copy, at("2026-11-09T19:03:00Z")).has(late)).toBe(true)
  })

  it("a stopped entry fills only the quarters it overlaps (alpha slow-pass-02)", () => {
    const stopped = [entry("Writing report", "2026-11-09T16:30:00Z", "2026-11-09T17:18:16Z")]
    const p = prefillQuarters([at("2026-11-09T17:00:00Z"), at("2026-11-09T17:15:00Z"), at("2026-11-09T17:45:00Z")], stopped, at("2026-11-09T18:03:00Z"))
    expect(p.get(at("2026-11-09T17:00:00Z"))?.text).toBe("Writing report")
    expect(p.has(at("2026-11-09T17:15:00Z"))).toBe(false)
    expect(p.has(at("2026-11-09T17:45:00Z"))).toBe(false)
  })

  it("a planned (future) entry never counts", () => {
    const planned = [entry("Dinner", "2026-11-09T09:00:00Z", "2026-11-09T10:00:00Z")]
    expect(prefillQuarters([q], planned, at("2026-11-09T08:30:00Z")).has(q)).toBe(false)
  })

  it("uses the project's name when the entry has no description, and skips a blank one", () => {
    const p = prefillQuarters([q], [entry("x", "2026-11-09T09:00:00Z", "2026-11-09T09:15:00Z", "  ", "Work")], now)
    expect(p.get(q)).toEqual({ text: "Work", entryId: "x" })
    const blank = prefillQuarters([q], [entry("y", "2026-11-09T09:00:00Z", "2026-11-09T09:15:00Z", "", null)], now)
    expect(blank.has(q)).toBe(false)
  })
})

describe("sheetOrder and stretchBefore (alpha F08/F09: one card per quarter)", () => {
  const base = at("2026-11-09T07:30:00Z")
  const qs = Array.from({ length: 8 }, (_, i) => base + i * QUARTER_MS)

  it("newest first, and the quarter a ping asked about on top", () => {
    expect(sheetOrder(qs.slice(0, 3), null)).toEqual([qs[2], qs[1], qs[0]])
    expect(sheetOrder(qs.slice(0, 4), qs[1])).toEqual([qs[1], qs[3], qs[2], qs[0]])
    // an asked quarter not in the sheet changes nothing
    expect(sheetOrder(qs.slice(0, 2), qs[5])).toEqual([qs[1], qs[0]])
  })

  it("covers the open quarters right before, with the same Time entry or none", () => {
    const gym = [entry("Gym", "2026-11-09T07:30:00Z", "2026-11-09T08:30:00Z")]
    const prefill = prefillQuarters(qs, gym, at("2026-11-09T12:00:00Z"))
    const entryOf = (q: number) => prefill.get(q)?.entryId ?? null
    const open = (q: number) => qs.includes(q)
    // 08:30-09:30 is Gym (qs[0..3]); qs[4..7] are blank
    expect(stretchBefore(qs[3], open, entryOf)).toEqual([qs[0], qs[1], qs[2]])
    expect(stretchBefore(qs[7], open, entryOf)).toEqual([qs[4], qs[5], qs[6]])
    expect(stretchBefore(qs[4], open, entryOf)).toEqual([])
  })

  it("an answered or saved quarter ends the stretch", () => {
    const open = (q: number) => qs.includes(q) && q !== qs[2]
    expect(stretchBefore(qs[5], open, () => null)).toEqual([qs[3], qs[4]])
  })
})

describe("runQuarters", () => {
  it("the first ping of the day does not include quiet quarters", () => {
    // 07:00 UTC is 08:00 in Copenhagen in November; the run began at 06:00 local.
    const r = run({ startedAt: "2026-11-09T05:00:00.000Z" })
    const qs = runQuarters(r, at("2026-11-09T07:15:30Z"), CPH)
    expect(qs.map((q) => quarterLabel(q, CPH))).toEqual(["08:00–08:15"])
  })

  it("a run started at 10:07 includes the 10:00 quarter", () => {
    const r = run({ startedAt: "2026-11-09T09:07:00.000Z" })
    const qs = runQuarters(r, at("2026-11-09T09:15:30Z"), CPH)
    expect(qs.map((q) => quarterLabel(q, CPH))).toEqual(["10:00–10:15"])
  })

  it("leaves out the quarter still running and stops where the run was ended", () => {
    const r = run({ startedAt: "2026-11-09T09:00:00.000Z", endedAt: "2026-11-09T09:40:00.000Z" })
    const qs = runQuarters(r, at("2026-11-09T11:00:00Z"), CPH)
    expect(qs.map((q) => quarterLabel(q, CPH))).toEqual(["10:00–10:15", "10:15–10:30", "10:30–10:45"])
    const open = runQuarters(run({ startedAt: "2026-11-09T09:00:00.000Z" }), at("2026-11-09T09:20:00Z"), CPH)
    expect(open.map((q) => quarterLabel(q, CPH))).toEqual(["10:00–10:15"])
  })

  it("the 21:45 quarter is awake and 22:00 is quiet", () => {
    const r = run({ startedAt: "2026-11-09T19:00:00.000Z" })
    const qs = runQuarters(r, at("2026-11-09T21:30:00Z"), CPH)
    const labels = qs.map((q) => quarterLabel(q, CPH))
    expect(labels[labels.length - 1]).toBe("21:45–22:00")
  })

  it("quarters are local quarters in Asia/Kathmandu (+5:45)", () => {
    const KTM = "Asia/Kathmandu"
    // 04:15 UTC is 10:00 in Kathmandu.
    const r = run({ startedAt: "2026-11-09T04:15:00.000Z" })
    const qs = runQuarters(r, at("2026-11-09T04:46:00Z"), KTM)
    expect(qs.map((q) => quarterLabel(q, KTM))).toEqual(["10:00–10:15", "10:15–10:30"])
  })

  it("an empty run before its first quarter ends", () => {
    expect(runQuarters(run({ startedAt: "2026-11-09T09:07:00.000Z" }), at("2026-11-09T09:10:00Z"), CPH)).toEqual([])
    void min
  })
})

describe("withAnswered", () => {
  it("adds answered quarters to the awake ones, sorted, without duplicates", () => {
    expect(withAnswered([3, 1], [2, 1])).toEqual([1, 2, 3])
  })
})

describe("answerSheetQuarters", () => {
  const r = run({ startedAt: "2026-11-09T07:00:00.000Z" }) // 08:00 Copenhagen
  const now = at("2026-11-09T13:05:00Z") // 14:05 Copenhagen

  it("offers the unanswered quarters that ended in the last 3 hours", () => {
    const qs = answerSheetQuarters(r, now, CPH, new Set())
    expect(quarterLabel(qs[0], CPH)).toBe("11:00–11:15")
    expect(quarterLabel(qs[qs.length - 1], CPH)).toBe("13:45–14:00")
  })

  it("also offers the quarter a ping named, however old, when it is unanswered", () => {
    const asked = at("2026-11-09T09:00:00Z") // 10:00 Copenhagen
    const qs = answerSheetQuarters(r, now, CPH, new Set(), asked)
    expect(quarterLabel(qs[0], CPH)).toBe("10:00–10:15")
    expect(answerSheetQuarters(r, now, CPH, new Set([asked]), asked)[0]).not.toBe(asked)
  })

  it("ignores a named quarter outside the run, off the quarter, or not started", () => {
    const base = answerSheetQuarters(r, now, CPH, new Set())
    expect(answerSheetQuarters(r, now, CPH, new Set(), at("2026-11-09T05:00:00Z"))).toEqual(base)
    expect(answerSheetQuarters(r, now, CPH, new Set(), at("2026-11-09T09:07:00Z"))).toEqual(base)
    expect(answerSheetQuarters(r, now, CPH, new Set(), at("2026-11-09T14:00:00Z"))).toEqual(base)
  })
})

describe("stretchLabel", () => {
  it("names each unbroken part of a stretch, and a whole day 00:00–24:00", () => {
    const q = (hhmm: string) => at(`2026-11-09T${hhmm}:00Z`) // UTC labels
    expect(stretchLabel([q("05:45"), q("06:15")], "UTC")).toBe("05:45–06:00, 06:15–06:30")
    expect(stretchLabel([q("10:00"), q("10:15"), q("10:30")], "UTC")).toBe("10:00–10:45")
    const day = Array.from({ length: 96 }, (_, i) => at("2026-11-09T00:00:00Z") + i * QUARTER_MS)
    expect(stretchLabel(day, "UTC")).toBe("00:00–24:00")
  })
})

describe("times never depend on the device's own zone", () => {
  // Run under TZ=Europe/Copenhagen too: the spring-forward gap there is 02:00–03:00 on 29 March 2026.
  it("labels a UTC account's 02:30 on 29 March as 02:30", () => {
    expect(quarterLabel(at("2026-03-29T02:30:00Z"), "UTC")).toBe("02:30–02:45")
  })
  it("keeps a quarter at 02:30 UTC quiet with quiet hours 22:00–03:00", () => {
    const r = run({ startedAt: "2026-03-28T20:00:00.000Z", endsAt: "2026-04-11T20:00:00.000Z", quietStart: 1320, quietEnd: 180 })
    const qs = runQuarters(r, at("2026-03-29T04:00:00Z"), "UTC").map((q) => quarterLabel(q, "UTC"))
    expect(qs).not.toContain("02:30–02:45")
    expect(qs).toContain("03:00–03:15")
  })
})
