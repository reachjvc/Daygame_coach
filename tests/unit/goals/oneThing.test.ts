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
  wordingsOf,
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
  applyOneThingWrite,
  runningSince,
  MAX_BODY_LENGTH,
  MAX_HORIZON_YEARS,
  ENDING_SOON_DAYS,
  type OneThing,
} from "@/src/goals/oneThingService"
import type { LifeAnswerRow } from "@/src/db/lifeAnswerRepo"
import type { LifeChapterRow } from "@/src/db/lifeChapterRepo"

let seq = 0

/** A wording. Belongs to a chapter; carries no dates of its own — that is the point. */
const row = (over: Partial<LifeAnswerRow> = {}): LifeAnswerRow => ({
  id: `row-${++seq}`,
  user_id: "user-1",
  chapter_id: "ch-1",
  answer_key: "one_thing",
  body: "Quit weed for 100 days",
  answered_at: "2026-08-01T09:00:00Z",
  created_at: "2026-08-01T09:00:00Z",
  ...over,
})

/** A chapter. Owns the dates every countdown is measured against. */
const chapter = (over: Partial<LifeChapterRow> = {}): LifeChapterRow => ({
  id: "ch-1",
  user_id: "user-1",
  statement_key: "one_thing",
  started_on: "2026-08-01",
  due_on: "2026-11-09",
  continues_id: null,
  opened_at: "2026-08-01T09:00:00Z",
  created_at: "2026-08-01T09:00:00Z",
  ...over,
})

/** Newest first, the order both repos return. */
const rows = (...r: LifeAnswerRow[]) => r
const chapters = (...c: LifeChapterRow[]) => c

afterEach(() => {
  vi.useRealTimers()
})

const at = (iso: string) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

/** A OneThing as the reader would build it, for the pure-rule tests. */
const one = (over: Partial<OneThing> = {}): OneThing => ({
  id: "r", chapterId: "ch-1", body: "Quit weed",
  answeredAt: "2026-08-01T09:00:00Z", startedOn: "2026-08-01", dueOn: "2026-12-08",
  daysLeft: 97, lapsed: false, wordings: 1, extended: false,
  supports: { one_why: "", one_cost: "", one_identity: "", one_values: "" },
  ...over,
})

// ── AT1 ────────────────────────────────────────────────────────────────────
describe("AT1 — what my one thing is", () => {
  it("is nothing when nothing has been written", () => {
    expect(currentOneThing([], [], "Europe/Copenhagen")).toBeNull()
    expect(pastOneThings([], [], "Europe/Copenhagen")).toEqual([])
    expect(oneThingState(null)).toBe("none")
  })

  it("is the newest chapter, not the first one started", () => {
    const cs = chapters(
      chapter({ id: "ch-2", opened_at: "2026-09-01T09:00:00Z", started_on: "2026-09-01", due_on: "2026-12-01" }),
      chapter({ id: "ch-1" }),
    )
    const rs = rows(
      row({ chapter_id: "ch-2", body: "Bench 100 kg", answered_at: "2026-09-01T09:00:00Z" }),
      row({ chapter_id: "ch-1", body: "Quit weed" }),
    )
    expect(currentOneThing(cs, rs, "Europe/Copenhagen")?.body).toBe("Bench 100 kg")
  })

  it("keeps the ones before it, newest first, without repeating the current one", () => {
    const cs = chapters(chapter({ id: "ch-2", opened_at: "2026-09-01T09:00:00Z" }), chapter({ id: "ch-1" }))
    const rs = rows(row({ chapter_id: "ch-2", body: "Newer" }), row({ chapter_id: "ch-1", body: "Older" }))
    const past = pastOneThings(cs, rs, "Europe/Copenhagen")
    expect(past.map((p) => p.body)).toEqual(["Older"])
  })

  it("makes the previous one current again when the newest chapter is deleted", () => {
    const cs = chapters(chapter({ id: "ch-1" }))
    const rs = rows(row({ chapter_id: "ch-1", body: "Quit weed" }))
    expect(currentOneThing(cs, rs, "Europe/Copenhagen")?.body).toBe("Quit weed")
  })

  /**
   * THE SECOND LEVEL OF HISTORY, folded away.
   *
   * Chapters are the list a person browses — four or five a year. The wordings
   * inside one are reachable but not in the way, because "all of these I
   * wouldn't care to have different versions of" was the whole reason for
   * separating the two levels in the first place.
   */
  it("can list every wording of one chapter without mixing in another's", () => {
    const rs = rows(
      row({ chapter_id: "ch-1", body: "Quit weed, properly", answered_at: "2026-08-05T09:00:00Z" }),
      row({ chapter_id: "ch-1", body: "Quit weed" }),
      row({ chapter_id: "ch-2", body: "Something else" }),
      row({ chapter_id: "ch-1", answer_key: "one_why", body: "Because" }),
    )
    expect(wordingsOf("ch-1", rs).map((r) => r.body)).toEqual(["Quit weed, properly", "Quit weed"])
    expect(wordingsOf("ch-2", rs).map((r) => r.body)).toEqual(["Something else"])
  })

  /**
   * A CHAPTER WITH NO SENTENCE IS SKIPPED, NOT DRAWN BLANK.
   *
   * A delete can leave a chapter standing with nothing in it. Drawing an empty
   * headline over somebody's real one thing would hide the answer behind a bug.
   */
  it("looks past a chapter that has no wording in it", () => {
    const cs = chapters(chapter({ id: "ch-empty", opened_at: "2026-09-01T09:00:00Z" }), chapter({ id: "ch-1" }))
    const rs = rows(row({ chapter_id: "ch-1", body: "Quit weed" }))
    expect(currentOneThing(cs, rs, "Europe/Copenhagen")?.body).toBe("Quit weed")
  })
})

// ── AT2 ────────────────────────────────────────────────────────────────────
/**
 * The countdown is the fault the first design would have shipped: a date
 * computed on the database's clock instead of the person's. It now reads the
 * CHAPTER's deadline rather than the row's, which is the whole change, so these
 * run the same instant through three timezones and a daylight-saving boundary.
 */
describe("AT2 — the countdown runs on the user's calendar", () => {
  const readOn = (todayISO: string, dueOn: string, tz = "Europe/Copenhagen") => {
    at(todayISO)
    return currentOneThing(chapters(chapter({ due_on: dueOn })), rows(row()), tz)
  }

  it("counts whole calendar days to the deadline", () => {
    expect(readOn("2026-08-01T09:00:00Z", "2026-11-09")!.daysLeft).toBe(100)
  })

  it("is lapsed the day after the deadline, not on it", () => {
    expect(readOn("2026-11-09T12:00:00Z", "2026-11-09")!.lapsed).toBe(false)
    expect(readOn("2026-11-09T12:00:00Z", "2026-11-09")!.daysLeft).toBe(0)
    expect(readOn("2026-11-10T12:00:00Z", "2026-11-09")!.lapsed).toBe(true)
  })

  it("gives two people on the same instant the answer their own calendar gives", () => {
    // 23:30 UTC: already tomorrow in Copenhagen, still today in Los Angeles.
    const iso = "2026-11-08T23:30:00Z"
    expect(readOn(iso, "2026-11-09", "Europe/Copenhagen")!.daysLeft).toBe(0)
    expect(readOn(iso, "2026-11-09", "America/Los_Angeles")!.daysLeft).toBe(1)
  })

  it("counts calendar days across a daylight-saving change, not 24-hour blocks", () => {
    // Europe puts the clocks back on 2026-10-25. Ninety 24-hour blocks from
    // 1 Aug land an hour short and quietly move the date; calendar days do not.
    expect(daysBetween("2026-08-01", "2026-10-30")).toBe(90)
    expect(addDays("2026-08-01", 90)).toBe("2026-10-30")
  })

  it("defaults the deadline to 90 days out in the user's timezone", () => {
    at("2026-08-01T23:30:00Z")
    expect(DEFAULT_HORIZON_DAYS).toBe(90)
    expect(defaultDueOn("Europe/Copenhagen")).toBe("2026-10-31")
    expect(defaultDueOn("America/Los_Angeles")).toBe("2026-10-30")
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
 * AMENDING IS NOT REPLACING, AND MOVING A DEADLINE IS NEITHER.
 *
 * The bug this began as: "quit weed for 100 days" with 120 days on the clock,
 * and no way to make it 100. The fix for that turned every reworded sentence
 * into a new commitment, which was the opposite mistake — fixing a typo
 * restarted the clock. Three acts now, and these hold them apart.
 */
describe("AT7 — amend, extend, and start are three different things", () => {
  const TZ = "Europe/Copenhagen"
  const mine = () => rows(row({ chapter_id: "ch-1", body: "Quit weed" }))

  it("amending adds a wording to the chapter it is already in", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one(), mine(), "amend", "Quit weed, properly", null, TZ)
    expect(out).toEqual({ kind: "amend", chapterId: "ch-1", key: "one_thing", body: "Quit weed, properly" })
  })

  it("amending the same words does nothing at all", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(one(), mine(), "amend", "  Quit weed  ", null, TZ)).toEqual({ kind: "unchanged" })
  })

  /**
   * THE LINE THE WHOLE DESIGN EXISTS FOR. An extension opens a new chapter and
   * carries the ORIGINAL start date across, so the deadline moves and "running
   * since" does not.
   */
  it("extending keeps the day it started, and only moves the deadline", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one({ startedOn: "2026-08-01" }), mine(), "extend", "Quit weed", "2027-01-01", TZ)
    expect(out).toEqual({
      kind: "open", startedOn: "2026-08-01", dueOn: "2027-01-01",
      continuesId: "ch-1", body: "Quit weed",
    })
  })

  it("starting a new one begins today, and continues nothing", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one({ startedOn: "2026-08-01" }), mine(), "start", "Bench 100 kg", "2027-01-01", TZ)
    expect(out).toEqual({
      kind: "open", startedOn: "2026-09-02", dueOn: "2027-01-01",
      continuesId: null, body: "Bench 100 kg",
    })
  })

  it("extending to the same deadline with the same words does nothing", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one({ dueOn: "2026-12-08" }), mine(), "extend", "Quit weed", "2026-12-08", TZ)
    expect(out).toEqual({ kind: "unchanged" })
  })

  it("opens the first chapter whatever act was asked for, since there is nothing to amend", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(null, [], "amend", "Quit weed", "2026-12-08", TZ)
    expect(out).toEqual({
      kind: "open", startedOn: "2026-09-02", dueOn: "2026-12-08", continuesId: null, body: "Quit weed",
    })
  })

  it("compares only the words, because the row no longer holds a deadline", () => {
    expect(isSameAsCurrent(mine(), "Quit weed")).toBe(true)
    expect(isSameAsCurrent(mine(), "Quit vaping")).toBe(false)
    expect(isSameAsCurrent([], "Quit weed")).toBe(false)
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
  /** Shorthand over the shared factory: a one thing with N days left. */
  const inDays = (daysLeft: number) =>
    one({ dueOn: addDays("2026-09-02", daysLeft), daysLeft, lapsed: daysLeft < 0 })

  it("says nothing while there is road left", () => {
    expect(oneThingStage(inDays(60))).toBe("running")
    expect(oneThingPrompt(inDays(60))).toBeNull()
  })

  it("starts asking a fortnight out", () => {
    expect(oneThingStage(inDays(ENDING_SOON_DAYS + 1))).toBe("running")
    expect(oneThingStage(inDays(ENDING_SOON_DAYS))).toBe("ending")
    expect(oneThingPrompt(inDays(ENDING_SOON_DAYS))).toMatch(/what comes after/)
  })

  it("asks outright once it has run out", () => {
    expect(oneThingStage(inDays(-1))).toBe("lapsed")
    expect(oneThingPrompt(inDays(-1))).toMatch(/Write the one thing for the next one/)
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
    expect(oneThingCountdown(inDays(120))).toBe("120 days left, until 31 Dec 2026")
    expect(oneThingCountdown(inDays(1))).toMatch(/^1 day left, until 3 Sept? 2026$/)
    expect(oneThingCountdown(inDays(0))).toMatch(/^Last day — it runs out today, 2 Sept? 2026$/)
    expect(oneThingCountdown(inDays(-3))).toBe("Ran out 30 Aug 2026, 3 days ago — name the next one")
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
 * REFUSE IT, DO NOTHING, OR WRITE IT — the whole decision, in one place.
 */
describe("AT11 — what writing a one thing should do", () => {
  const TZ = "Europe/Copenhagen"
  const mine = () => rows(row({ chapter_id: "ch-1", body: "Quit weed" }))

  it("refuses a blank answer and one longer than the column allows", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(one(), mine(), "amend", "   ", null, TZ).kind).toBe("reject")
    expect(planOneThingWrite(one(), mine(), "amend", "x".repeat(MAX_BODY_LENGTH + 1), null, TZ).kind).toBe("reject")
    expect(planOneThingWrite(one(), mine(), "amend", "x".repeat(MAX_BODY_LENGTH), null, TZ).kind).toBe("amend")
  })

  it("refuses a deadline that has already been, before it can reach the database", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one(), mine(), "extend", "Quit weed", "2026-08-01", TZ)
    expect(out).toEqual({ kind: "reject", reason: expect.stringMatching(/already been/) })
  })

  it("refuses a day that is not on the calendar with the reason, not a database error", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one(), mine(), "start", "Something", "2026-13-45", TZ)
    expect(out).toEqual({ kind: "reject", reason: expect.stringMatching(/not a date on the calendar/) })
  })

  /**
   * A SUPPORT CANNOT BE THE FIRST THING WRITTEN.
   *
   * Found in review before it shipped. The "open" branch writes whatever body it
   * is given as the SENTENCE, so a stray "one_why" arriving before anything else
   * existed would have stored somebody's reason as their one thing — on the
   * step, on the tracking header, everywhere.
   */
  it("refuses a support when there is no one thing for it to be about", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(null, [], "amend", "Because I want my head back", null, TZ, "one_why")
    expect(out).toEqual({ kind: "reject", reason: expect.stringMatching(/Write your one thing first/) })
  })

  it("still opens the first chapter for the sentence itself", () => {
    at("2026-09-02T09:00:00Z")
    expect(planOneThingWrite(null, [], "amend", "Quit weed", null, TZ, "one_thing").kind).toBe("open")
  })

  /**
   * AMENDING NEVER CHECKS A DEADLINE, because it cannot move one. A page that
   * refused a reworded sentence over a stale date in a hidden field would be
   * refusing the one act that is supposed to be free.
   */
  it("does not judge the deadline when all that changed is the words", () => {
    at("2026-09-02T09:00:00Z")
    const out = planOneThingWrite(one(), mine(), "amend", "Quit weed properly", "1999-01-01", TZ)
    expect(out.kind).toBe("amend")
  })

  /**
   * THE HORIZON THE DATABASE MEASURES, MEASURED HERE TOO.
   *
   * `dueOnProblem` counts five years from TODAY. `life_chapters_dates_sane`
   * counts `due_on <= started_on + 1830` from the day the chapter began — and an
   * extension carries that start across. So a deadline four years out, on a
   * chapter that started two years ago, passed here and was refused by the
   * database. The person got "That did not save" and no reason: the right
   * refusal for the wrong reason, which is the thing the migration comment
   * claims was eliminated. Two records of one rule, and they disagreed.
   */
  it("refuses an extension the database would refuse, and says why", () => {
    at("2026-09-02T09:00:00Z")
    // Started two years ago; four years past today is over five from the start.
    const old = one({ startedOn: "2024-09-02", dueOn: "2026-12-08" })
    const out = planOneThingWrite(old, mine(), "extend", "Quit weed", "2030-09-02", TZ)
    expect(out).toEqual({
      kind: "reject",
      reason: expect.stringMatching(/from the day this one began/i),
    })
  })

  it("still allows an extension that sits inside the horizon from the chapter's start", () => {
    at("2026-09-02T09:00:00Z")
    const old = one({ startedOn: "2024-09-02", dueOn: "2026-12-08" })
    expect(planOneThingWrite(old, mine(), "extend", "Quit weed", "2028-09-02", TZ).kind).toBe("open")
  })
})

// ── AT12 ───────────────────────────────────────────────────────────────────
/**
 * CARRYING OUT THE DECISION, including the part that is easy to forget.
 */
describe("AT12 — what actually gets written", () => {
  const writers = () => {
    const calls: Array<{ what: string; args: unknown[] }> = []
    return {
      calls,
      addAnswer: async (key: string, body: string, chapterId: string) => {
        calls.push({ what: "answer", args: [key, body, chapterId] })
        return { id: `row-${calls.length}` }
      },
      openChapter: async (startedOn: string, dueOn: string, continuesId: string | null) => {
        calls.push({ what: "chapter", args: [startedOn, dueOn, continuesId] })
        return { id: "ch-new" }
      },
      dropChapter: async (chapterId: string) => {
        calls.push({ what: "drop", args: [chapterId] })
      },
    }
  }

  it("writes one wording and opens nothing when amending", async () => {
    const w = writers()
    await applyOneThingWrite({ kind: "amend", chapterId: "ch-1", key: "one_thing", body: "New words" }, one(), w)
    expect(w.calls).toEqual([{ what: "answer", args: ["one_thing", "New words", "ch-1"] }])
  })

  /**
   * THE ONE THAT WOULD HAVE SHIPPED BROKEN. Moving a deadline opens a new
   * chapter; without carrying the supports across, somebody who added a
   * fortnight to a date would find the why, the cost, the identity and the
   * values all blank underneath an unchanged sentence, and reasonably conclude
   * the app had thrown three weeks of writing away.
   */
  it("carries the supports across when a deadline is extended", async () => {
    const w = writers()
    const current = one({
      supports: { one_why: "Because I want my head back", one_cost: "Another year gone", one_identity: "", one_values: "Clarity" },
    })
    await applyOneThingWrite(
      { kind: "open", startedOn: "2026-08-01", dueOn: "2027-01-01", continuesId: "ch-1", body: "Quit weed" },
      current, w,
    )
    expect(w.calls[0]).toEqual({ what: "chapter", args: ["2026-08-01", "2027-01-01", "ch-1"] })
    expect(w.calls.map((c) => c.args[0])).toEqual(["2026-08-01", "one_thing", "one_why", "one_cost", "one_values"])
    // The blank one is not carried: an empty answer is not an answer.
    expect(w.calls.map((c) => c.args[0])).not.toContain("one_identity")
  })

  /**
   * AND A FRESH START DOES NOT CARRY THEM. That is the difference between the
   * two acts: a new commitment deserves its own reasons, and inheriting the old
   * ones would put last season's why under this season's sentence.
   */
  it("leaves the supports behind when a genuinely new one is started", async () => {
    const w = writers()
    const current = one({ supports: { one_why: "Old reason", one_cost: "", one_identity: "", one_values: "" } })
    await applyOneThingWrite(
      { kind: "open", startedOn: "2026-09-02", dueOn: "2027-01-01", continuesId: null, body: "Bench 100 kg" },
      current, w,
    )
    expect(w.calls.map((c) => c.args[0])).toEqual(["2026-09-02", "one_thing"])
  })

  /**
   * A CHAPTER WITH NO SENTENCE IN IT IS INVISIBLE AND UNDELETABLE.
   *
   * Opening one is two writes. When the second failed, the first had already
   * landed: `toOneThing` skips a chapter that holds no wording, so it never
   * appeared in the history and there was no row anybody could point at to
   * delete — while being the newest chapter, which is what "current" means, so
   * the page went blank. Found in review, and the half-written state was
   * acknowledged in a comment rather than undone.
   */
  it("takes the empty chapter back when the sentence fails to write", async () => {
    const w = writers()
    const boom = new Error("connection lost")
    const failing = { ...w, addAnswer: async () => { throw boom } }

    await expect(
      applyOneThingWrite(
        { kind: "open", startedOn: "2026-09-02", dueOn: "2027-01-01", continuesId: null, body: "Bench 100 kg" },
        null, failing,
      ),
    ).rejects.toThrow("connection lost")

    // The chapter was opened and then removed; the caller still hears why.
    expect(w.calls.map((c) => c.what)).toEqual(["chapter", "drop"])
    expect(w.calls[1].args).toEqual(["ch-new"])
  })

  it("writes nothing for a rejection or a no-op", async () => {
    const w = writers()
    expect(await applyOneThingWrite({ kind: "unchanged" }, one(), w)).toBeNull()
    expect(await applyOneThingWrite({ kind: "reject", reason: "no" }, one(), w)).toBeNull()
    expect(w.calls).toEqual([])
  })
})

// ── AT13 ───────────────────────────────────────────────────────────────────
/**
 * "RUNNING SINCE" — the line that proves the clock was not restarted.
 *
 * Silent on a one thing nobody has touched, because there is nothing to
 * reassure anybody about yet.
 */
describe("AT13 — how long you have been on this", () => {
  it("says nothing on a one thing written once and never changed", () => {
    expect(runningSince(one({ wordings: 1, extended: false }))).toBeNull()
  })

  it("says it once the wording has been changed", () => {
    expect(runningSince(one({ wordings: 2, startedOn: "2026-08-01" }))).toMatch(/Running since 1 Aug 2026/)
  })

  it("says it once the deadline has been moved", () => {
    expect(runningSince(one({ wordings: 1, extended: true, startedOn: "2026-08-01" }))).toMatch(/Running since 1 Aug 2026/)
  })

  it("says nothing when there is nothing", () => {
    expect(runningSince(null)).toBeNull()
  })
})
