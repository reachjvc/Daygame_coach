/**
 * THE AUDIT'S RULES — src/audit/auditService.ts (Plans/energy-audit.md, Phase 4).
 */
import { describe, expect, it } from "vitest"
import { checkAnswer, checkQuiet, checkReview, muteUntil, runIsOpen } from "@/src/audit/auditService"
import type { AuditRun } from "@/src/audit/types"

const CPH = "Europe/Copenhagen"
const RUN_ID = "00000000-0000-4000-8000-000000000001"
const ID = "00000000-0000-4000-8000-0000000000aa"

function run(over: Partial<AuditRun> = {}): AuditRun {
  return {
    id: RUN_ID,
    startedAt: "2026-11-09T09:07:00.000Z",
    endsAt: "2026-11-23T09:07:00.000Z",
    endedAt: null,
    quietStart: 1320,
    quietEnd: 480,
    mutedUntil: null,
    review: { choices: {}, notes: {} },
    endSentAt: null,
    ...over,
  }
}

const answer = (over: Record<string, unknown> = {}) => ({
  id: ID,
  runId: RUN_ID,
  slotAt: "2026-11-09T09:15:00.000Z",
  activity: "  Email  ",
  energy: 3,
  growth: 5,
  avoiding: false,
  why: null,
  source: "app",
  timeEntryId: null,
  ...over,
})

describe("checkAnswer", () => {
  const now = new Date("2026-11-09T09:20:00Z")

  it("accepts the current quarter and trims the activity", () => {
    const r = checkAnswer(answer(), run(), now)
    expect("answer" in r && r.answer.activity).toBe("Email")
  })

  it("refuses the next quarter", () => {
    expect(checkAnswer(answer({ slotAt: "2026-11-09T09:30:00.000Z" }), run(), now)).toEqual({ error: "That quarter has not started yet" })
  })

  it("accepts the quarter the run started in, and refuses one before the run", () => {
    expect("answer" in checkAnswer(answer({ slotAt: "2026-11-09T09:00:00.000Z" }), run(), now)).toBe(true)
    expect(checkAnswer(answer({ slotAt: "2026-11-09T08:45:00.000Z" }), run(), now)).toEqual({ error: "That quarter is outside this audit" })
  })

  it("refuses a time off the quarter, a missing score, a long activity and another run", () => {
    expect("error" in checkAnswer(answer({ slotAt: "2026-11-09T09:07:00.000Z" }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ slotAt: "2026-11-09T09:00:00.400Z" }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ energy: 0 }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ growth: 8 }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ energy: 3.5 }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ activity: "   " }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ activity: "x".repeat(201) }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ runId: "00000000-0000-4000-8000-000000000002" }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ why: "x".repeat(2001) }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ avoiding: "yes" }), run(), now)).toBe(true)
    expect("error" in checkAnswer(answer({ id: "nope" }), run(), now)).toBe(true)
  })

  it("never echoes what was typed in a refusal", () => {
    const r = checkAnswer(answer({ activity: "secret plan " + "x".repeat(300) }), run(), now)
    expect("error" in r && r.error).not.toContain("secret")
  })

  it("refuses a quarter after the run was ended", () => {
    const ended = run({ endedAt: "2026-11-09T09:20:00.000Z" })
    expect("answer" in checkAnswer(answer(), ended, new Date("2026-11-09T10:00:00Z"))).toBe(true)
    expect("error" in checkAnswer(answer({ slotAt: "2026-11-09T09:30:00.000Z" }), ended, new Date("2026-11-09T10:00:00Z"))).toBe(true)
  })
})

describe("muteUntil", () => {
  it("30 minutes, 1 hour and 2 hours from now; off is null", () => {
    const now = new Date("2026-11-09T09:00:00Z")
    expect(muteUntil("30m", run(), now, CPH)?.toISOString()).toBe("2026-11-09T09:30:00.000Z")
    expect(muteUntil("1h", run(), now, CPH)?.toISOString()).toBe("2026-11-09T10:00:00.000Z")
    expect(muteUntil("2h", run(), now, CPH)?.toISOString()).toBe("2026-11-09T11:00:00.000Z")
    expect(muteUntil("off", run(), now, CPH)).toBeNull()
  })

  it("'until morning' outside quiet hours is tomorrow 08:00", () => {
    // 15:00 in Copenhagen.
    expect(muteUntil("morning", run(), new Date("2026-11-09T14:00:00Z"), CPH)?.toISOString()).toBe("2026-11-10T07:00:00.000Z")
  })

  it("'until morning' during quiet hours is the end of these quiet hours", () => {
    // 23:30 in Copenhagen: tomorrow 08:00.
    expect(muteUntil("morning", run(), new Date("2026-11-09T22:30:00Z"), CPH)?.toISOString()).toBe("2026-11-10T07:00:00.000Z")
    // 03:00 in Copenhagen: today 08:00.
    expect(muteUntil("morning", run(), new Date("2026-11-10T02:00:00Z"), CPH)?.toISOString()).toBe("2026-11-10T07:00:00.000Z")
  })

  it("follows the person's own quiet hours", () => {
    const r = run({ quietStart: 1380, quietEnd: 420 })
    expect(muteUntil("morning", r, new Date("2026-11-09T14:00:00Z"), CPH)?.toISOString()).toBe("2026-11-10T06:00:00.000Z")
  })
})

describe("runIsOpen", () => {
  it("is open until its end, and not after End now", () => {
    expect(runIsOpen(run(), new Date("2026-11-10T00:00:00Z"))).toBe(true)
    expect(runIsOpen(run(), new Date("2026-11-23T09:07:00Z"))).toBe(false)
    expect(runIsOpen(run({ endedAt: "2026-11-09T10:00:00Z" }), new Date("2026-11-09T11:00:00Z"))).toBe(false)
  })
})

describe("checkReview", () => {
  it("accepts choices and notes", () => {
    expect(checkReview({ choices: { email: "cut" }, notes: { email: "Batch it" } })).toEqual({
      review: { choices: { email: "cut" }, notes: { email: "Batch it" } },
    })
  })
  it("refuses an unknown choice, extra fields, a long note and too many keys", () => {
    expect("error" in checkReview({ choices: { email: "burn" } })).toBe(true)
    expect("error" in checkReview({ choices: {}, extra: 1 })).toBe(true)
    expect("error" in checkReview({ notes: { email: "x".repeat(2001) } })).toBe(true)
    const many = Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`a${i}`, "keep"]))
    expect("error" in checkReview({ choices: many })).toBe(true)
    expect("error" in checkReview(null)).toBe(true)
    expect("error" in checkReview([])).toBe(true)
  })
})

describe("checkQuiet", () => {
  it("takes quarter-hour minutes of the day only", () => {
    expect(checkQuiet(1320, 480)).toEqual({ quietStart: 1320, quietEnd: 480 })
    expect("error" in checkQuiet(1321, 480)).toBe(true)
    expect("error" in checkQuiet(1440, 480)).toBe(true)
    expect("error" in checkQuiet("22:00", 480)).toBe(true)
  })
})
