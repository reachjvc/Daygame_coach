/**
 * WHAT THE AUDIT REFUSES, AND WHAT IT STORES OF WHAT IT TAKES. Every audit write
 * is sent from a phone that may be out of date, so each limit here is a limit
 * on what can reach the account: the boundary value is taken, one past it is
 * refused. Complements auditService.test.ts, which covers the happy paths.
 */
import { describe, expect, it } from "vitest"
import {
  ACTIVITY_MAX,
  REVIEW_KEYS_MAX,
  REVIEW_NOTE_MAX,
  WHY_MAX,
  applyReviewChange,
  checkAnswer,
  checkMark,
  checkQuiet,
  checkReview,
  correctedTime,
  sameMark,
} from "@/src/audit/auditService"
import type { AuditRun } from "@/src/audit/types"

const RUN_ID = "00000000-0000-4000-8000-000000000001"
const ID = "00000000-0000-4000-8000-0000000000aa"
const run: AuditRun = {
  id: RUN_ID,
  startedAt: "2026-11-09T09:07:00.000Z",
  endsAt: "2026-11-23T09:07:00.000Z",
  endedAt: null,
  quietStart: 1320,
  quietEnd: 480,
  mutedUntil: null,
  review: { choices: {}, notes: {}, week: [] },
  endSentAt: null,
}
const NOW = new Date("2026-11-10T12:00:00.000Z")
const base = { id: ID, runId: RUN_ID, slotAt: "2026-11-09T09:15:00.000Z", activity: "Email", energy: 3, growth: 5, avoiding: false, why: null }
const check = (over: Record<string, unknown>) => checkAnswer({ ...base, ...over }, run, NOW)
const stored = { choices: { Email: "more" }, notes: { Email: "keep" }, week: [] } as never

describe("an answer", () => {
  it("an answer is refused one past each limit, stored trimmed, and carries what the card saw", () => {
    { // is refused one past each limit and kept at it, scores 1 to 7 only
      expect(check({ activity: "x".repeat(ACTIVITY_MAX) })).toHaveProperty("answer")
      expect(check({ activity: "x".repeat(ACTIVITY_MAX + 1) })).toHaveProperty("error")
      expect(check({ why: "y".repeat(WHY_MAX) })).toHaveProperty("answer")
      expect(check({ why: "y".repeat(WHY_MAX + 1) })).toHaveProperty("error")
      expect(check({ timeEntryId: "t".repeat(200) })).toHaveProperty("answer")
      expect(check({ timeEntryId: "t".repeat(201) })).toHaveProperty("error")
      for (const bad of [0, 8, 3.5, "3", null]) {
        expect(check({ energy: bad }), `energy ${bad}`).toHaveProperty("error")
        expect(check({ growth: bad }), `growth ${bad}`).toHaveProperty("error")
      }
      for (const ok of [1, 7]) expect(check({ energy: ok, growth: ok })).toHaveProperty("answer")
      expect(check({ why: 5 })).toHaveProperty("error")
      expect(check({ timeEntryId: 5 })).toHaveProperty("error")
      expect(check({ source: "robot" })).toHaveProperty("error")
      expect(check({ source: 5 })).toHaveProperty("error")
      expect(check({ avoiding: "no" })).toHaveProperty("error")
      expect(check({ activity: "   " })).toHaveProperty("error")
      expect(checkAnswer(null, run, NOW)).toHaveProperty("error")
    }
    { // is stored trimmed with an empty why as none, the app as the default source and no time entry
      const out = check({ activity: "  Email  ", why: "   ", source: undefined, timeEntryId: undefined })
      expect(out).toEqual({ answer: expect.objectContaining({ activity: "Email", why: null, source: "app", timeEntryId: null }) })
      expect(check({ why: " because ", timeEntryId: "t1" })).toEqual({ answer: expect.objectContaining({ why: "because", timeEntryId: "t1" }) })
      expect(check({ why: undefined })).toEqual({ answer: expect.objectContaining({ why: null }) })
      expect(check({ timeEntryId: null })).toEqual({ answer: expect.objectContaining({ timeEntryId: null }) })
    }
    { // carries what the card saw only when it is a readable sighting, and none as none
      expect(check({ was: null })).toEqual({ answer: expect.objectContaining({ was: null }) })
      expect(check({})).toEqual({ answer: expect.not.objectContaining({ was: expect.anything() }) })
      const seen = { id: "a", activity: " Mail ", energy: 2, growth: 2, why: " " }
      expect(check({ was: seen })).toEqual({ answer: expect.objectContaining({ was: { id: "a", activity: "Mail", energy: 2, growth: 2, why: null } }) })
      expect(check({ was: "x" })).toHaveProperty("error")
      expect(check({ was: { ...seen, energy: 9 } })).toHaveProperty("error")
    }
  })


})

describe("what a card saw, and when the phone's clock can be trusted", () => {
  it("what a card saw, the phone's clock, and quiet hours", () => {
    { // a sighting is bounded like an answer and compares by words and scores, null being no answer
      const m = { id: "a", activity: "Mail", energy: 2, growth: 2, why: null }
      expect(checkMark(m)).toEqual(m)
      expect(checkMark({ ...m, id: "i".repeat(201) })).toBeNull()
      expect(checkMark({ ...m, id: "i".repeat(200) })).not.toBeNull()
      expect(checkMark({ ...m, activity: "x".repeat(ACTIVITY_MAX * 2 + 1) })).toBeNull()
      expect(checkMark({ ...m, activity: "x".repeat(ACTIVITY_MAX + 1) })).toBeNull()
      expect(checkMark({ ...m, activity: "x".repeat(ACTIVITY_MAX) })).not.toBeNull()
      expect(checkMark({ ...m, why: "y".repeat(WHY_MAX + 1) })).toBeNull()
      expect(checkMark({ ...m, why: "y".repeat(WHY_MAX * 2 + 1) })).toBeNull()
      expect(checkMark({ ...m, why: 5 })).toBeNull()
      expect(checkMark({ ...m, why: undefined })).toEqual(m)
      expect(checkMark({ ...m, id: 5 })).toBeNull()
      expect(checkMark({ ...m, activity: 5 })).toBeNull()
      expect(checkMark({ ...m, growth: 0 })).toBeNull()
      expect(checkMark(null)).toBeNull()

      expect(sameMark(m, { ...m })).toBe(true)
      expect(sameMark(m, { ...m, why: undefined as never })).toBe(true)
      for (const change of [{ id: "b" }, { activity: "x" }, { energy: 3 }, { growth: 3 }, { why: "w" }]) expect(sameMark(m, { ...m, ...change })).toBe(false)
      expect(sameMark(null, null)).toBe(true)
      expect(sameMark(undefined, undefined)).toBe(true)
      expect(sameMark(null, m)).toBe(false)
      expect(sameMark(m, null)).toBe(false)
      expect(sameMark(null, undefined)).toBe(false)
      expect(sameMark(undefined, m)).toBe(false)
    }
    { // corrects a tap time by how far the phone's clock was off when it sent, only between 2 minutes and a day, and never into the future
      const now = new Date("2026-11-10T12:00:00.000Z")
      const ms = (s: string) => Date.parse(s)
      expect(correctedTime("2026-11-10T11:00:00.000Z", "2026-11-10T11:57:00.000Z", now)).toBe(ms("2026-11-10T11:03:00.000Z"))
      expect(correctedTime("2026-11-10T11:00:00.000Z", "2026-11-10T11:58:00.000Z", now)).toBe(ms("2026-11-10T11:02:00.000Z"))
      expect(correctedTime("2026-11-10T11:00:00.000Z", "2026-11-10T11:58:01.000Z", now)).toBe(ms("2026-11-10T11:00:00.000Z"))
      expect(correctedTime("2026-11-09T10:00:00.000Z", "2026-11-09T12:00:00.000Z", now)).toBe(ms("2026-11-10T10:00:00.000Z"))
      expect(correctedTime("2026-11-08T10:00:00.000Z", "2026-11-08T11:59:00.000Z", now)).toBe(ms("2026-11-08T10:00:00.000Z") + 0)
      expect(correctedTime("2026-11-10T11:59:00.000Z", "2026-11-10T09:00:00.000Z", now)).toBe(now.getTime())
      expect(correctedTime("2026-11-10T13:00:00.000Z", undefined, now)).toBe(now.getTime())
      expect(correctedTime("junk", "2026-11-10T11:00:00.000Z", now)).toBe(now.getTime())
      expect(correctedTime(5, "2026-11-10T11:00:00.000Z", now)).toBe(now.getTime())
      expect(correctedTime("2026-11-10T11:00:00.000Z", 5, now)).toBe(ms("2026-11-10T11:00:00.000Z"))
      expect(correctedTime("2026-11-10T11:00:00.000Z", "junk", now)).toBe(ms("2026-11-10T11:00:00.000Z"))
    }
    { // quiet hours are minutes 0 to 1439 on a quarter
      expect(checkQuiet(0, 1425)).toEqual({ quietStart: 0, quietEnd: 1425 })
      for (const bad of [-15, 1440, 10, 15.5, "15", null]) {
        expect(checkQuiet(bad, 0), String(bad)).toHaveProperty("error")
        expect(checkQuiet(0, bad), String(bad)).toHaveProperty("error")
      }
      expect(checkQuiet(1439, 0)).toHaveProperty("error")
    }
  })


})

describe("a review", () => {
  it("a review holds choices, notes and a week within limits", () => {
    { // holds choices, notes and a week only; each limit is kept at and refused one past
      const key = "k".repeat(ACTIVITY_MAX)
      expect(checkReview({ choices: { [key]: "more" }, notes: { [key]: "n".repeat(REVIEW_NOTE_MAX) } })).toHaveProperty("review")
      expect(checkReview({ choices: { [key + "k"]: "more" } })).toHaveProperty("error")
      expect(checkReview({ notes: { [key + "k"]: "n" } })).toHaveProperty("error")
      expect(checkReview({ choices: { "": "more" } })).toHaveProperty("error")
      expect(checkReview({ notes: { "": "n" } })).toHaveProperty("error")
      expect(checkReview({ notes: { a: "n".repeat(REVIEW_NOTE_MAX + 1) } })).toHaveProperty("error")
      expect(checkReview({ notes: { a: 5 } })).toHaveProperty("error")
      expect(checkReview({ choices: { a: "sometimes" } })).toHaveProperty("error")
      expect(checkReview({ choices: { a: 5 } })).toHaveProperty("error")
      expect(checkReview({ choices: [] })).toHaveProperty("error")
      expect(checkReview({ notes: [] })).toHaveProperty("error")
      expect(checkReview({ extra: 1 })).toHaveProperty("error")
      expect(checkReview([])).toHaveProperty("error")
      expect(checkReview(null)).toHaveProperty("error")
      const many = Object.fromEntries(Array.from({ length: REVIEW_KEYS_MAX }, (_, i) => [`a${i}`, "more"]))
      expect(checkReview({ choices: many })).toHaveProperty("review")
      expect(checkReview({ choices: { ...many, extra: "more" } })).toHaveProperty("error")
      expect(checkReview({ notes: { ...many, extra: "n" } })).toHaveProperty("error")
    }
    { // a blank note is no note, and what is stored is the cleaned text
      expect(checkReview({ notes: { a: "   ", b: "kept" } })).toEqual({ review: { choices: {}, notes: { b: "kept" }, week: [] } })
    }
  })


  it("a change to a review is refused when malformed or out of date", () => {
    { // a change to one activity is refused when its parts are malformed, and a note-only save leaves the choice alone
      const change = (over: Record<string, unknown>) => applyReviewChange(stored, { activity: "Email", note: "new", ...over })
      expect(change({})).toEqual({ review: { choices: { Email: "more" }, notes: { Email: "new" }, week: [] } })
      expect(change({ choice: "cut" })).toMatchObject({ review: { choices: { Email: "cut" } } })
      expect(change({ choice: null })).toMatchObject({ review: { choices: {} } })
      expect(change({ note: "  " })).toMatchObject({ review: { notes: {} } })
      for (const bad of [
        { activity: "" },
        { activity: "a".repeat(ACTIVITY_MAX + 1) },
        { activity: 5 },
        { choice: "sometimes" },
        { choice: 5 },
        { choiceWas: "sometimes" },
        { note: "n".repeat(REVIEW_NOTE_MAX + 1) },
        { note: 5 },
        { noteWas: 5 },
        { noteTried: "x" },
        { noteTried: [5] },
        { noteTried: Array.from({ length: 50 }, () => "x") },
        { choiceTried: "x" },
        { choiceTried: ["sometimes"] },
        { choiceTried: Array.from({ length: 50 }, () => null) },
      ]) {
        expect(change(bad), JSON.stringify(bad).slice(0, 40)).toHaveProperty("error")
      }
      expect(applyReviewChange(stored, null)).toHaveProperty("error")
      expect(applyReviewChange(stored, [])).toHaveProperty("error")
      expect(applyReviewChange(stored, { nothing: 1 })).toHaveProperty("error")
    }
    { // a change made on an out-of-date sheet is refused naming what changed, unless the stored value is this sheet's own earlier save
      const change = (over: Record<string, unknown>) => applyReviewChange(stored, { activity: "Email", note: "new", choice: "cut", ...over })
      expect(change({ noteWas: "old" })).toEqual({ error: expect.stringContaining("note was changed") })
      expect(change({ choiceWas: "keep" })).toEqual({ error: expect.stringContaining("choice was changed") })
      expect(change({ noteWas: "old", choiceWas: "keep" })).toEqual({ error: expect.stringContaining("choice and note") })
      expect(change({ noteWas: "keep", choiceWas: "more" })).toHaveProperty("review")
      expect(change({ noteWas: "old", noteTried: ["keep"] })).toHaveProperty("review")
      expect(change({ choiceWas: "keep", choiceTried: ["more"] })).toHaveProperty("review")
      expect(change({ choiceWas: "keep", choiceTried: [null] })).toHaveProperty("error")
      expect(change({ note: "keep", choice: "more", noteWas: "older", choiceWas: "keep" })).toHaveProperty("review")
    }
  })

})
