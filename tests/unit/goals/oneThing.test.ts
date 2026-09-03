/**
 * THE ONE THING — the tests named in docs/plans/one-thing.md before the code.
 *
 * AT2 is the one that would have caught the fault in the first design: a
 * countdown computed on the database's clock instead of the user's. It runs the
 * same instant through three timezones and across a daylight-saving boundary.
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import {
  currentOneThing,
  pastOneThings,
  isSameAsCurrent,
  oneThingState,
  daysBetween,
  addDays,
  defaultDueOn,
  DEFAULT_HORIZON_DAYS,
  dueOnProblem,
  isRealDate,
  oneThingCountdown,
  oneThingPrompt,
  oneThingStage,
  nextDueOn,
  planOneThingWrite,
  MAX_BODY_LENGTH,
  MAX_HORIZON_YEARS,
  ENDING_SOON_DAYS,
} from "@/src/goals/oneThingService"
import type { LifeAnswerRow } from "@/src/db/lifeAnswerRepo"

const row = (over: Partial<LifeAnswerRow> = {}): LifeAnswerRow => ({
  id: "row-1",
  user_id: "user-1",
  answer_key: "one_thing",
  body: "Quit weed for 100 days",
  answered_at: "2026-08-01T09:00:00Z",
  due_on: "2026-11-09",
  created_at: "2026-08-01T09:00:00Z",
  ...over,
})

/** Newest first, the order the repo returns. */
const rows = (...r: LifeAnswerRow[]) => r

afterEach(() => {
  vi.useRealTimers()
})

const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

// ── AT1 ────────────────────────────────────────────────────────────────────
describe("AT1 — what my one thing is", () => {
  it("is nothing when nothing has been written", () => {
    at("2026-08-27T10:00:00Z")
    expect(currentOneThing([], "Europe/Copenhagen")).toBeNull()
    expect(oneThingState(null)).toBe("none")
  })

  it("is the newest row, not the first one written", () => {
    at("2026-08-27T10:00:00Z")
    const current = currentOneThing(
      rows(
        row({ id: "new", body: "Bench 100 kg", answered_at: "2026-08-20T09:00:00Z" }),
        row({ id: "old", body: "Quit weed for 100 days", answered_at: "2026-03-01T09:00:00Z" })
      ),
      "Europe/Copenhagen"
    )
    expect(current?.body).toBe("Bench 100 kg")
  })

  it("keeps the ones before it, newest first, without repeating the current one", () => {
    at("2026-08-27T10:00:00Z")
    const all = rows(
      row({ id: "c", body: "third", answered_at: "2026-08-20T09:00:00Z" }),
      row({ id: "b", body: "second", answered_at: "2026-06-01T09:00:00Z" }),
      row({ id: "a", body: "first", answered_at: "2026-03-01T09:00:00Z" })
    )
    expect(pastOneThings(all, "Europe/Copenhagen").map((o) => o.body)).toEqual(["second", "first"])
  })

  it("makes the previous one current again when the newest is deleted", () => {
    at("2026-08-27T10:00:00Z")
    const all = rows(
      row({ id: "b", body: "second", answered_at: "2026-06-01T09:00:00Z" }),
      row({ id: "a", body: "first", answered_at: "2026-03-01T09:00:00Z" })
    )
    // The repo returns what is left after a delete; nothing else has to happen.
    expect(currentOneThing(all, "Europe/Copenhagen")?.body).toBe("second")
  })
})

// ── AT2 ────────────────────────────────────────────────────────────────────
describe("AT2 — the countdown runs on the user's calendar", () => {
  it("counts whole calendar days to the deadline", () => {
    at("2026-08-27T10:00:00Z")
    const current = currentOneThing(rows(row({ due_on: "2026-09-01" })), "Europe/Copenhagen")
    expect(current?.daysLeft).toBe(5)
    expect(current?.lapsed).toBe(false)
  })

  it("is lapsed the day after the deadline, not on it", () => {
    at("2026-09-01T10:00:00Z")
    expect(currentOneThing(rows(row({ due_on: "2026-09-01" })), "UTC")?.lapsed).toBe(false)
    at("2026-09-02T10:00:00Z")
    const gone = currentOneThing(rows(row({ due_on: "2026-09-01" })), "UTC")
    expect(gone?.lapsed).toBe(true)
    expect(gone?.daysLeft).toBe(-1)
    expect(oneThingState(gone!)).toBe("lapsed")
  })

  it("gives two people on the same instant the answer their own calendar gives", () => {
    // 2026-09-01 21:00 UTC is already 2026-09-02 in Auckland and still
    // 2026-09-01 in New York. A deadline of 2026-09-01 has lapsed for one and
    // not the other, and the database's own clock is nobody's answer.
    at("2026-09-01T21:00:00Z")
    const auckland = currentOneThing(rows(row({ due_on: "2026-09-01" })), "Pacific/Auckland")
    const newYork = currentOneThing(rows(row({ due_on: "2026-09-01" })), "America/New_York")

    expect(auckland?.lapsed).toBe(true)
    expect(auckland?.daysLeft).toBe(-1)
    expect(newYork?.lapsed).toBe(false)
    expect(newYork?.daysLeft).toBe(0)
  })

  it("counts calendar days across a daylight-saving change, not 24-hour blocks", () => {
    // Copenhagen springs forward on 2026-03-29. That day is 23 hours long, so
    // adding 90 x 86400 seconds lands an hour short and shifts the date.
    expect(addDays("2026-03-20", 90)).toBe("2026-06-18")
    expect(daysBetween("2026-03-20", "2026-06-18")).toBe(90)
    // And through the autumn change, where a day is 25 hours long.
    expect(addDays("2026-10-20", 30)).toBe("2026-11-19")
    expect(daysBetween("2026-10-20", "2026-11-19")).toBe(30)
  })

  it("defaults the deadline to 90 days out in the user's timezone", () => {
    // 22:30 UTC on the 27th is already the 28th in Copenhagen, so the default
    // deadline counts from the 28th for them and the 27th for a UTC user.
    at("2026-08-27T22:30:00Z")
    expect(defaultDueOn("Europe/Copenhagen")).toBe(addDays("2026-08-28", DEFAULT_HORIZON_DAYS))
    expect(defaultDueOn("UTC")).toBe(addDays("2026-08-27", DEFAULT_HORIZON_DAYS))
  })
})

// ── AT3 ────────────────────────────────────────────────────────────────────
describe("AT3 — writing the same words again changes nothing", () => {
  it("recognises an unchanged answer, ignoring surrounding space", () => {
    const all = rows(row({ body: "Quit weed for 100 days" }))
    expect(isSameAsCurrent(all, "Quit weed for 100 days")).toBe(true)
    expect(isSameAsCurrent(all, "  Quit weed for 100 days  ")).toBe(true)
  })

  it("recognises a real change", () => {
    const all = rows(row({ body: "Quit weed for 100 days" }))
    expect(isSameAsCurrent(all, "Quit weed for 200 days")).toBe(false)
  })

  it("treats the first answer of all as a change", () => {
    expect(isSameAsCurrent([], "Quit weed for 100 days")).toBe(false)
  })
})

// ── AT7 ────────────────────────────────────────────────────────────────────
/**
 * THE DEADLINE IS HALF THE ANSWER.
 *
 * The bug this is written against: "quit weed for 100 days" with 120 days on
 * the clock, and no way to make it 100. The save button compared the words
 * alone and stayed grey; had it fired, the server compared the words alone and
 * would have written nothing. The deadline looked editable, was not, and said
 * nothing about it — a silent no, which is the one kind this codebase forbids.
 */
describe("AT7 — moving the deadline is a change", () => {
  it("counts a new deadline on the same sentence as a change", () => {
    const saved = rows(row({ body: "Quit weed", due_on: "2026-11-09" }))
    expect(isSameAsCurrent(saved, "Quit weed", "2026-11-09")).toBe(true)
    expect(isSameAsCurrent(saved, "Quit weed", "2026-12-01")).toBe(false)
  })

  it("still counts new words on the same deadline as a change", () => {
    const saved = rows(row({ body: "Quit weed", due_on: "2026-11-09" }))
    expect(isSameAsCurrent(saved, "Quit vaping", "2026-11-09")).toBe(false)
  })

  it("ignores surrounding space in the sentence, as it always did", () => {
    const saved = rows(row({ body: "Quit weed", due_on: "2026-11-09" }))
    expect(isSameAsCurrent(saved, "  Quit weed  ", "2026-11-09")).toBe(true)
  })

  it("asks only about the words when no deadline is offered", () => {
    // The old two-argument meaning, kept rather than silently comparing a
    // deadline against undefined.
    expect(isSameAsCurrent(rows(row({ body: "Quit weed" })), "Quit weed")).toBe(true)
  })
})

// ── AT8 ────────────────────────────────────────────────────────────────────
/**
 * A DEADLINE THAT IS A REAL DAY, AND STILL AHEAD.
 *
 * `/^\d{4}-\d{2}-\d{2}$/` was the whole check. It says yes to the 45th of
 * month 13 — which reached Postgres, failed there, and came back to the person
 * as "That did not save" — and yes to last Tuesday, so a one thing written this
 * morning could announce on the same screen that it had already run its course.
 */
describe("AT8 — the deadline has to be a day that exists, and one still ahead", () => {
  const TODAY = "2026-09-02"

  it("refuses a date that is not on the calendar", () => {
    expect(isRealDate("2026-13-45")).toBe(false)
    expect(isRealDate("2026-02-30")).toBe(false)
    expect(isRealDate("not-a-date")).toBe(false)
    expect(dueOnProblem("2026-13-45", TODAY)).toMatch(/not a date on the calendar/)
  })

  it("accepts the real end of a real February", () => {
    expect(isRealDate("2028-02-29")).toBe(true)
    expect(isRealDate("2027-02-29")).toBe(false)
  })

  it("refuses a deadline that has already been", () => {
    expect(dueOnProblem("2026-09-01", TODAY)).toMatch(/already been/)
  })

  it("allows today itself — a one thing may run out this evening", () => {
    expect(dueOnProblem(TODAY, TODAY)).toBeNull()
  })

  it("refuses a deadline past the horizon, so a mistyped year cannot be saved", () => {
    expect(dueOnProblem("9999-01-01", TODAY)).toMatch(/season, not a decade/)
    expect(dueOnProblem(addDays(TODAY, MAX_HORIZON_YEARS * 365), TODAY)).toBeNull()
  })

  it("passes the default the app offers", () => {
    expect(dueOnProblem(defaultDueOn("Europe/Copenhagen"), "2026-09-02")).toBeNull()
  })
})

// ── AT9 ────────────────────────────────────────────────────────────────────
/**
 * ASKING FOR THE NEXT ONE AS THE DATE COMES UP.
 *
 * One rule, in one place, because the tracking header and the step both draw it
 * and two wordings of one fact is how they end up disagreeing on the same day.
 * Silent while there is road left: a prompt that is always on is not a prompt.
 */
describe("AT9 — the countdown, and when it starts asking", () => {
  const one = (daysLeft: number) => ({
    id: "r", body: "Quit weed", answeredAt: "2026-08-01T09:00:00Z",
    dueOn: addDays("2026-09-02", daysLeft), daysLeft, lapsed: daysLeft < 0,
  })

  it("says nothing while there is road left", () => {
    expect(oneThingStage(one(60))).toBe("running")
    expect(oneThingPrompt(one(60))).toBeNull()
  })

  it("starts asking a fortnight out", () => {
    expect(oneThingStage(one(ENDING_SOON_DAYS + 1))).toBe("running")
    expect(oneThingStage(one(ENDING_SOON_DAYS))).toBe("ending")
    expect(oneThingPrompt(one(ENDING_SOON_DAYS))).toMatch(/what comes after/)
  })

  it("asks outright once it has run out", () => {
    expect(oneThingStage(one(-1))).toBe("lapsed")
    expect(oneThingPrompt(one(-1))).toMatch(/Write the one thing for the next one/)
  })

  it("says nothing at all when nothing has been written", () => {
    expect(oneThingStage(null)).toBe("none")
    expect(oneThingPrompt(null)).toBeNull()
    expect(oneThingCountdown(null)).toBe("")
  })

  /**
   * THE DAY ITSELF, EVERYWHERE IT IS DRAWN. "120 days left" is not something
   * anybody can put in a calendar, and the day it names is the day they typed
   * on the form.
   */
  it("carries the date, not only the number of sleeps", () => {
    // Matched loosely on the month only: Node abbreviates September as "Sept"
    // or "Sep" depending on which ICU data it was built with, and a test that
    // pins that is a test that fails on somebody else's machine for no reason.
    expect(oneThingCountdown(one(120))).toBe("120 days left, until 31 Dec 2026")
    expect(oneThingCountdown(one(1))).toMatch(/^1 day left, until 3 Sept? 2026$/)
    expect(oneThingCountdown(one(0))).toMatch(/^Last day — it runs out today, 2 Sept? 2026$/)
    expect(oneThingCountdown(one(-3))).toBe("Ran out 30 Aug 2026, 3 days ago — name the next one")
  })
})

// ── AT10 ───────────────────────────────────────────────────────────────────
/**
 * THE DEADLINE A FORM OPENS ON.
 *
 * Found in review, before it shipped: the picker followed the saved deadline,
 * which is right until the day it goes past. After that the page asks for the
 * next one thing while the form holds a date that has already been — the server
 * refuses it, correctly, and the person is left with a refusal and no way out
 * unless they spot the date box themselves.
 */
describe("AT10 — a run-out deadline is not the default for the next one", () => {
  const one = (over = {}) => ({
    id: "r", body: "Quit weed", answeredAt: "2026-08-01T09:00:00Z",
    dueOn: "2026-12-08", daysLeft: 97, lapsed: false, ...over,
  })

  it("keeps the saved deadline while there is road left", () => {
    expect(nextDueOn(one(), "2027-06-01")).toBe("2026-12-08")
  })

  it("offers the fresh one once it has run out", () => {
    expect(nextDueOn(one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true }), "2027-06-01")).toBe("2027-06-01")
  })

  it("offers the fresh one when nothing has ever been written", () => {
    expect(nextDueOn(null, "2027-06-01")).toBe("2027-06-01")
  })

  it("keeps the last day itself, which is still a day that can be saved", () => {
    expect(nextDueOn(one({ daysLeft: 0 }), "2027-06-01")).toBe("2026-12-08")
  })
})

// ── AT11 ───────────────────────────────────────────────────────────────────
/**
 * REFUSE IT, DO NOTHING, OR APPEND — the whole decision, in one place.
 *
 * The rule that broke twice is the third case: the deadline is part of the
 * answer only when the caller NAMED one. Compared against the server's rolling
 * ninety-day default instead, the identical request sent on two different days
 * looks like two different answers and appends a duplicate row — which is the
 * duplication this check exists to prevent.
 */
describe("AT11 — what writing a one thing should do", () => {
  const TZ = "Europe/Copenhagen"
  const saved = (over: Partial<LifeAnswerRow> = {}) => rows(row({ body: "Quit weed", due_on: "2026-12-08", ...over }))

  it("appends when the words are new", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(saved(), "Quit vaping", "2026-12-08", TZ)).toEqual({ kind: "append", dueOn: "2026-12-08" })
  })

  it("appends when only the deadline moves", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(saved(), "Quit weed", "2027-01-01", TZ)).toEqual({ kind: "append", dueOn: "2027-01-01" })
  })

  it("does nothing for the same words on the same deadline", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(saved(), "  Quit weed  ", "2026-12-08", TZ)).toEqual({ kind: "unchanged" })
  })

  /**
   * THE DUPLICATE-ROW BUG, WRITTEN DOWN. Same request, no deadline named, two
   * different days. The server's default differs between them; the answer must
   * not.
   */
  it("does nothing for the same words on two different days when no deadline was named", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(saved(), "Quit weed", undefined, TZ)).toEqual({ kind: "unchanged" })
    at("2026-09-20T09:00:00Z")
    expect(planOneThingWrite(saved(), "Quit weed", undefined, TZ)).toEqual({ kind: "unchanged" })
  })

  it("fills in the ninety-day default when no deadline was named and the words are new", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(saved(), "Something else", undefined, TZ)
    expect(out).toEqual({ kind: "append", dueOn: defaultDueOn(TZ) })
  })

  it("refuses a blank answer and one longer than the column allows", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(saved(), "   ", undefined, TZ).kind).toBe("reject")
    expect(planOneThingWrite(saved(), "x".repeat(MAX_BODY_LENGTH + 1), undefined, TZ).kind).toBe("reject")
    expect(planOneThingWrite(saved(), "x".repeat(MAX_BODY_LENGTH), undefined, TZ).kind).toBe("append")
  })

  it("refuses a deadline that has already been, before it can reach the database", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(saved(), "Quit weed", "2026-08-01", TZ)
    expect(out).toEqual({ kind: "reject", reason: expect.stringMatching(/already been/) })
  })

  it("refuses a day that is not on the calendar with the reason, not a database error", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(saved(), "Quit weed", "2026-13-45", TZ)
    expect(out).toEqual({ kind: "reject", reason: expect.stringMatching(/not a date on the calendar/) })
  })
})
