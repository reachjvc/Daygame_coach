/**
 * THE AUDIT'S RULES — src/audit/auditService.ts (Plans/energy-audit.md, Phase 4).
 */
import { describe, expect, it } from "vitest"
import {
  CHANGED_SINCE,
  checkAnswer,
  checkQuiet,
  checkReview,
  correctedTime,
  muteUntil,
  runIsOpen,
  splitByStored,
  type StoredAnswer,
} from "@/src/audit/auditService"
import { nextPingAt } from "@/src/audit/quarterService"
import type { AuditAnswer, AuditRun } from "@/src/audit/types"

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
    review: { choices: {}, notes: {}, week: [] },
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

  it("ends on the quarter the label names, so that quarter's ping is not a minute late (alpha slow-pass-05)", () => {
    // Tapped 18:30:34 on a ping: "Muted until 19:30" must mean 19:30:00, or
    // the 19:30 tick still counts it muted and the ping comes at 19:31.
    const tap = new Date("2026-11-09T17:30:34.841Z")
    expect(muteUntil("1h", run(), tap, CPH)?.toISOString()).toBe("2026-11-09T18:30:00.000Z")
    expect(muteUntil("30m", run(), tap, CPH)?.toISOString()).toBe("2026-11-09T18:00:00.000Z")
    expect(muteUntil("2h", run(), tap, CPH)?.toISOString()).toBe("2026-11-09T19:30:00.000Z")
    // The page's "next ping" agrees: the 18:30 tick, not 18:45.
    const muted = run({ startedAt: "2026-11-09T06:00:00.000Z", quietStart: 0, quietEnd: 0, mutedUntil: muteUntil("1h", run(), tap, CPH)!.toISOString() })
    expect(new Date(nextPingAt(muted, tap.getTime(), CPH)!).toISOString()).toBe("2026-11-09T18:30:00.000Z")
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
      review: { choices: { email: "cut" }, notes: { email: "Batch it" }, week: [] },
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

describe("correctedTime", () => {
  const now = new Date("2026-11-09T10:00:00Z")
  it("moves a phone's time onto the server's clock by the phone's offset", () => {
    // The phone is 10 minutes fast: it sent at 10:10 by its clock, answered at 10:05 by its clock.
    expect(new Date(correctedTime("2026-11-09T10:05:00Z", "2026-11-09T10:10:00Z", now)).toISOString()).toBe("2026-11-09T09:55:00.000Z")
  })
  it("is never after now, and is now when missing or unreadable", () => {
    expect(correctedTime("2026-11-09T11:00:00Z", undefined, now)).toBe(now.getTime())
    expect(correctedTime(undefined, undefined, now)).toBe(now.getTime())
    expect(correctedTime("nonsense", "2026-11-09T10:00:00Z", now)).toBe(now.getTime())
  })
  it("leaves a few seconds of network delay alone", () => {
    expect(new Date(correctedTime("2026-11-09T09:59:55Z", "2026-11-09T09:59:56Z", now)).toISOString()).toBe("2026-11-09T09:59:55.000Z")
  })
  it("ignores an offset of more than a day", () => {
    expect(new Date(correctedTime("2026-11-09T09:00:00Z", "2026-11-01T00:00:00Z", now)).toISOString()).toBe("2026-11-09T09:00:00.000Z")
  })
})

describe("text that cannot be stored", () => {
  it("drops the NUL character and other control characters, keeping newlines", () => {
    const r = checkAnswer(answer({ activity: "Pasted\u0000text", why: "line one\nline\u0007 two" }), run(), new Date("2026-11-09T09:20:00Z"))
    expect("answer" in r && r.answer.activity).toBe("Pastedtext")
    expect("answer" in r && r.answer.why).toBe("line one\nline two")
    expect(checkReview({ notes: { email: "a\u0000b" } })).toEqual({ review: { choices: {}, notes: { email: "ab" }, week: [] } })
  })
})

describe("splitByStored: an older answer loses, the same answer sent twice does not (code review, 2026-11-09)", () => {
  const SLOT = "2026-11-09T15:30:00.000Z"
  const key = `${RUN_ID}:${SLOT}`
  const ans = (over: Partial<AuditAnswer> = {}): AuditAnswer => ({
    id: ID,
    runId: RUN_ID,
    slotAt: SLOT,
    activity: "Daygame sets",
    energy: 6,
    growth: 7,
    avoiding: false,
    why: null,
    source: "app",
    timeEntryId: null,
    answeredAt: "2026-11-09T15:50:00.000Z",
    ...over,
  })
  const held = (over: Partial<StoredAnswer> = {}): StoredAnswer => ({
    id: ID,
    at: Date.parse("2026-11-09T15:50:05.000Z"),
    activity: "Daygame sets",
    energy: 6,
    growth: 7,
    why: null,
    ...over,
  })

  it("stores a quarter nobody answered, and an answer newer than the stored one", () => {
    expect(splitByStored([ans()], new Map()).fresh).toHaveLength(1)
    expect(splitByStored([ans()], new Map([[key, held({ id: "other", at: Date.parse("2026-11-09T15:40:00.000Z") })]])).fresh).toHaveLength(1)
  })

  it("refuses an older answer when another device answered the quarter", () => {
    const r = splitByStored([ans()], new Map([[key, held({ id: "pc-answer", activity: "Email" })]]))
    expect(r.fresh).toEqual([])
    expect(r.refused).toEqual([{ id: ID, error: CHANGED_SINCE, retry: false, stored: { id: "pc-answer", activity: "Email", energy: 6, growth: 7, why: null } }])
  })

  it("takes the same answer sent again (stamped earlier by the clock correction) as stored, not refused, and does not write it", () => {
    const r = splitByStored([ans()], new Map([[key, held()]]))
    expect(r.refused).toEqual([])
    expect(r.fresh).toEqual([])
    expect(r.alreadyStored).toHaveLength(1)
  })

  it("refuses an older edit of the same answer when another device changed it since: same id, other words", () => {
    const r = splitByStored([ans()], new Map([[key, held({ activity: "Email" })]]))
    expect(r.refused).toHaveLength(1)
  })
})

describe("splitByStored with `was`: what the card saw when it opened (alpha slow-pass-06)", () => {
  const SLOT = "2026-11-09T15:30:00.000Z"
  const key = `${RUN_ID}:${SLOT}`
  const ans = (over: Partial<AuditAnswer> = {}): AuditAnswer => ({
    id: ID,
    runId: RUN_ID,
    slotAt: SLOT,
    activity: "Reading",
    energy: 2,
    growth: 2,
    avoiding: false,
    why: null,
    source: "app",
    timeEntryId: null,
    // later than the phone's answer by the clock: the old rule let it overwrite
    answeredAt: "2026-11-09T15:51:00.000Z",
    was: null,
    ...over,
  })
  const phone: StoredAnswer = { id: "phone-answer", at: Date.parse("2026-11-09T15:50:20.000Z"), activity: "Walk", energy: 5, growth: 4, why: null }
  const phoneMark = { id: "phone-answer", activity: "Walk", energy: 5, growth: 4, why: null }

  it("refuses a later save from a card that opened on a gap the phone has answered since, and returns the stored answer", () => {
    const r = splitByStored([ans()], new Map([[key, phone]]))
    expect(r.fresh).toEqual([])
    expect(r.alreadyStored).toEqual([])
    expect(r.refused).toEqual([{ id: ID, error: CHANGED_SINCE, retry: false, stored: phoneMark }])
  })

  it("stores it when the quarter is still empty", () => {
    expect(splitByStored([ans()], new Map()).fresh).toHaveLength(1)
  })

  it("stores it when the card saw the answer that is stored ('Use mine')", () => {
    const r = splitByStored([ans({ was: phoneMark, answeredAt: "2026-11-09T15:40:00.000Z" })], new Map([[key, phone]]))
    expect(r.fresh).toHaveLength(1)
    expect(r.refused).toEqual([])
  })

  it("refuses it when the answer the card saw was changed since, even under the same id", () => {
    const r = splitByStored([ans({ id: "phone-answer", was: { ...phoneMark, activity: "Walking" } })], new Map([[key, phone]]))
    expect(r.refused).toEqual([{ id: "phone-answer", error: CHANGED_SINCE, retry: false, stored: phoneMark }])
  })

  it("takes an identical resend as stored, whatever it saw (Log Out and the page both sent it)", () => {
    const mine: StoredAnswer = { id: ID, at: Date.parse("2026-11-09T15:52:00.000Z"), activity: "Reading", energy: 2, growth: 2, why: null }
    const r = splitByStored([ans()], new Map([[key, mine]]))
    expect(r.refused).toEqual([])
    expect(r.alreadyStored).toHaveLength(1)
  })

  it("stores it when the answer the card saw was deleted since", () => {
    expect(splitByStored([ans({ was: phoneMark })], new Map()).fresh).toHaveLength(1)
  })

  it("an answer with no `was` (queued before this rule) keeps the old rule: newer by the clock wins", () => {
    const old = ans()
    delete old.was
    expect(splitByStored([old], new Map([[key, phone]])).fresh).toHaveLength(1)
    const older = splitByStored([{ ...old, answeredAt: "2026-11-09T15:40:00.000Z" }], new Map([[key, phone]]))
    expect(older.refused).toEqual([{ id: ID, error: CHANGED_SINCE, retry: false, stored: phoneMark }])
  })

  it("checkAnswer keeps `was`: none, an answer, or left out; anything else is refused", () => {
    const now = new Date("2026-11-09T09:20:00Z")
    const none = checkAnswer(answer({ was: null }), run(), now)
    expect("answer" in none && none.answer.was).toBeNull()
    const seen = checkAnswer(answer({ was: { id: "x", activity: " Walk\u0000 ", energy: 5, growth: 4, why: null } }), run(), now)
    expect("answer" in seen && seen.answer.was).toEqual({ id: "x", activity: "Walk", energy: 5, growth: 4, why: null })
    const legacy = checkAnswer(answer(), run(), now)
    expect("answer" in legacy && "was" in legacy.answer).toBe(false)
    expect("error" in checkAnswer(answer({ was: "x" }), run(), now)).toBe(true)
  })
})
