/**
 * TAKING SOMETHING BACK, AND KEEPING TWO THINGS APART.
 *
 * Both halves here were found by driving the page rather than by reading it,
 * and both were invisible to the 249 tests that already passed.
 *
 *   1. There was no undo, edit or delete anywhere in the module. One tap on
 *      "I did it" followed by "File it" ended a 207-day run for good, and the
 *      whole control surface left afterwards was the door, the bar, "Start a
 *      run", "Add a run you already had" and the export. A record nobody can
 *      correct is a record nobody keeps writing in.
 *   2. Every read ignored `viceId`, which has been on every attempt since day
 *      one. A record holding a smoking run and a porn run drew both on one
 *      chart, under one caption, added into one total.
 *
 * The rule these must not break while fixing: **a lapse still subtracts
 * nothing.** "Your days are never taken away from you" and "you may never
 * correct what you typed" are different claims, and only the first is the one
 * the research supports.
 */

import { describe, it, expect } from "vitest"
import {
  emptyRecord,
  exportRecord,
  fileReport,
  importRecord,
  latestReportDay,
  overlapsExisting,
  recordPastRun,
  living,
  removeAttempt,
  removeReport,
  revivalClashes,
  startAttempt,
} from "@/src/vice/blackbox/blackboxStore"
import {
  answerFor,
  chartSpan,
  currentAttempt,
  forVice,
  runLanes,
  stats,
  thoughtCosts,
  vicesOn,
} from "@/src/vice/blackboxService"
import type { BlackBoxRecord } from "@/src/vice/types"

const TODAY = "2026-09-20"

/** A live 204-day run off smoking with one close call survived. */
function liveRun(): BlackBoxRecord {
  let r = startAttempt(emptyRecord(), {
    viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-03-01",
    startedBy: "Woke up coughing", structure: ["Told a specific person"],
    acknowledgedRisk: false, today: TODAY,
  })
  r = fileReport(r, {
    attemptId: r.attempts[0].id, at: "2026-05-04T21:00:00", wentThrough: false,
    thought: "One wouldn't undo this", ending: "fine", closeness: 7,
    withWhom: "On my own", where: "Balcony", factors: ["Bored"], didInstead: "Went to bed",
  })
  return r
}

describe("a mis-tap can be taken back", () => {
  it("removing the report that ended a run brings the run back alive", () => {
    const before = liveRun()
    const after = fileReport(before, {
      attemptId: before.attempts[0].id, at: "2026-09-20T23:00:00", wentThrough: true,
      thought: "I felt fine", ending: "fine", closeness: 9,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(currentAttempt(after)).toBeNull()

    const ending = after.attempts[0].endedByReportId
    expect(ending).not.toBeNull()
    const undone = removeReport(after, ending as string)

    expect(currentAttempt(undone)?.id).toBe(before.attempts[0].id)
    expect(undone.attempts[0].endedOn).toBeNull()
    // The ending report is a TOMBSTONE, not a gap — see `living`. What the page
    // reads is `forVice`, which drops it; the raw record keeps it so a device
    // that was offline learns it went rather than putting it back.
    expect(undone.reports.find((x) => x.id === ending)?.deletedAt).not.toBeNull()
    expect(living(undone.reports).map((x) => x.id)).toEqual(before.reports.map((x) => x.id))
    // And the run is the length it was, not a day shorter for having died.
    expect(stats(forVice(undone, null), TODAY)).toEqual(stats(forVice(before, null), TODAY))
  })

  it("an ending and its report are removed together, never one without the other", () => {
    // A run left ended with `endedByReportId` pointing at nothing would show
    // "How it ended: it has not" beside a bar the chart draws as finished.
    let r = liveRun()
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-20T23:00:00", wentThrough: true,
      thought: "x", ending: "justone", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    const undone = removeReport(r, r.attempts[0].endedByReportId as string)
    expect(undone.attempts[0].endedByReportId).toBeNull()
    expect(undone.attempts[0].endedOn).toBeNull()
  })

  it("removing a close call leaves the run exactly as it was", () => {
    const r = liveRun()
    const after = removeReport(r, r.reports[0].id)
    expect(living(after.reports)).toHaveLength(0)
    expect(after.reports[0].deletedAt).not.toBeNull()
    // The run row is untouched: removing a close call is not a change to it,
    // and bumping its stamp would make another device re-take an identical row.
    expect(after.attempts[0]).toEqual(r.attempts[0])
    expect(currentAttempt(after)).not.toBeNull()
  })

  it("removing a run takes its reports with it", () => {
    // A report against a run that no longer exists is counted by
    // `thoughtCosts` and drawn nowhere — a number with no bar behind it.
    const r = liveRun()
    const after = removeAttempt(r, r.attempts[0].id)
    expect(living(after.attempts)).toHaveLength(0)
    expect(living(after.reports)).toHaveLength(0)
    // Both rows survive as tombstones, and neither reaches any screen.
    expect(after.attempts).toHaveLength(1)
    expect(after.reports).toHaveLength(1)
    expect(thoughtCosts(forVice(after, null), TODAY)).toEqual([])
  })

  it("an id that is not on the record changes nothing", () => {
    const r = liveRun()
    expect(removeReport(r, "nope")).toEqual(r)
    expect(removeAttempt(r, "nope")).toEqual(r)
  })

  it("refuses an undo that would leave two runs alive off one vice", () => {
    // Reviving a run beside a later one still going would have them covering
    // the same days, which `overlapsExisting` refuses on the way in — so it
    // has to be refused on the way back out. The screen asks the same question
    // and says "end the newer run first" rather than offering a dead control.
    let r = liveRun()
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-06-30T20:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    const endedBy = r.attempts[0].endedByReportId as string
    r = startAttempt(r, {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-07-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    expect(r.attempts).toHaveLength(2)
    expect(revivalClashes(r, endedBy)).toBe(true)
    expect(removeReport(r, endedBy)).toEqual(r)
  })

  it("allows the undo once the newer run is off a different thing", () => {
    let r = liveRun()
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-06-30T20:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    const endedBy = r.attempts[0].endedByReportId as string
    r = startAttempt(r, {
      viceId: "porn", label: "Porn", startedOn: "2026-07-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    expect(revivalClashes(r, endedBy)).toBe(false)
    expect(currentAttempt(forVice(removeReport(r, endedBy), "nicotine"))).not.toBeNull()
  })
})

describe("a removed row reaches no screen, ever", () => {
  /**
   * THE GUARD THE WHOLE TOMBSTONE DESIGN RESTS ON.
   *
   * A removal is now a row with `deletedAt` set rather than a gap, so that a
   * device which was offline when it happened learns about it instead of
   * helpfully uploading the row again. The cost of that decision is that every
   * read in the module is one forgotten filter away from drawing a run the
   * person deleted, counting it in "Across every run", and ranking its ending
   * in the cost list.
   *
   * `forVice` and `vicesOn` are the two places that filter, and this asserts it
   * from the outside: give every read a record in which everything is deleted,
   * and every one of them must answer empty.
   */
  function allRemoved(): BlackBoxRecord {
    let r = recordPastRun(liveRun(), {
      viceId: "porn", label: "Porn", startedOn: "2025-01-01", endedOn: "2025-02-01",
      startedBy: "", structure: [], ending: "justone", thought: "x",
    })
    for (const a of [...r.attempts]) r = removeAttempt(r, a.id)
    return r
  }

  it("leaves the raw record holding every row, so a sync can see them go", () => {
    const r = allRemoved()
    expect(r.attempts.length).toBeGreaterThan(0)
    expect(r.attempts.every((a) => a.deletedAt !== null)).toBe(true)
    expect(r.reports.every((x) => x.deletedAt !== null)).toBe(true)
  })

  it("shows nothing on any read surface", () => {
    const view = forVice(allRemoved(), null)
    expect(view.attempts).toEqual([])
    expect(view.reports).toEqual([])
    expect(stats(view, TODAY)).toEqual({
      longestDays: 0, totalCleanDays: 0, currentDays: null, runs: 0, closeCallsSurvived: 0,
    })
    expect(runLanes(view, TODAY)).toEqual([])
    expect(thoughtCosts(view, TODAY)).toEqual([])
    expect(currentAttempt(view)).toBeNull()
    expect(chartSpan(view, TODAY)).toBeNull()
    expect(answerFor(view, "fine", TODAY).empty).toBe(true)
  })

  it("offers no vice in the switcher", () => {
    expect(vicesOn(allRemoved())).toEqual([])
  })

  it("keeps a removed run out of the vice it belonged to", () => {
    // The narrower case: one vice removed, the other untouched.
    let r = recordPastRun(liveRun(), {
      viceId: "porn", label: "Porn", startedOn: "2025-01-01", endedOn: "2025-02-01",
      startedBy: "", structure: [], ending: "justone", thought: "x",
    })
    const porn = r.attempts.find((a) => a.viceId === "porn")
    r = removeAttempt(r, porn!.id)
    expect(vicesOn(r).map((v) => v.viceId)).toEqual(["nicotine"])
    expect(forVice(r, "porn").attempts).toEqual([])
    expect(forVice(r, "nicotine").attempts).toHaveLength(1)
  })

  it("lets the days a removed run held leave the lifetime total", () => {
    // "Nothing ever resets" is about a LAPSE, never about a row you deleted on
    // purpose. A deleted run's days staying in the total would be a number
    // nobody could account for.
    const before = liveRun()
    const after = removeAttempt(before, before.attempts[0].id)
    expect(stats(forVice(before, null), TODAY).totalCleanDays).toBeGreaterThan(0)
    expect(stats(forVice(after, null), TODAY).totalCleanDays).toBe(0)
  })
})

describe("a report is dated by the night, not by the filing", () => {
  it("accepts a day earlier than today", () => {
    // Almost nobody files at the moment. They file the next morning, and with
    // no field for it the run went on the chart a day longer than it lasted.
    const r = liveRun()
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-19T12:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(after.attempts[0].endedOn).toBe("2026-09-19")
  })

  it("refuses a report older than the run it is filed against", () => {
    // It would give the run a negative length, and `runDays` would clamp it to
    // 1 — a 204-day run silently becoming a one-day one.
    const r = liveRun()
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-01-01T12:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(after).toEqual(r)
  })

  it("refuses a lapse dated before something already filed against the run", () => {
    // A lapse ENDS the run, so dating it before a close call the run already
    // holds leaves the record saying you nearly went on the 5th during a run
    // that ended on the 2nd — and the chart hides the contradiction, because
    // `laneGeometry` clamps a dot outside its bar back onto the end of it.
    // Found by driving it, not by reading it.
    const r = liveRun() // holds a close call on 2026-05-04
    expect(latestReportDay(r, r.attempts[0].id)).toBe("2026-05-04")
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-04-01T12:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(after).toEqual(r)
  })

  it("still allows a CLOSE CALL dated before another one", () => {
    // Only an ending is constrained. Two close calls in any order are just two
    // nights, and refusing the second would make the form refuse the truth.
    const r = liveRun()
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-04-01T12:00:00", wentThrough: false,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(after.reports).toHaveLength(2)
    expect(currentAttempt(after)).not.toBeNull()
  })

  it("uses the run's own start when nothing has been filed against it yet", () => {
    let r = startAttempt(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-03-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    expect(latestReportDay(r, r.attempts[0].id)).toBe("2026-03-01")
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-03-01T20:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(r.attempts[0].endedOn).toBe("2026-03-01")
  })

  it("refuses a report filed against no run at all", () => {
    const r = liveRun()
    expect(fileReport(r, {
      attemptId: "gone", at: "2026-09-20T12:00:00", wentThrough: false,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })).toEqual(r)
  })
})

describe("a loaded file has to hang together, not merely parse", () => {
  /**
   * An orphan used to be accepted and then be INVISIBLE rather than wrong.
   * Every read is filtered to the vice on screen by way of the attempt a report
   * is filed against, so a report pointing at no run appears on no chart, in no
   * cost list and behind no door — on a screen whose entire claim is that it
   * shows you your own record. Bouncing the file is the only honest answer;
   * dropping the rows quietly is the silent fallback the project bans.
   */
  function file(record: unknown): string {
    return JSON.stringify(record)
  }

  const goodRun = {
    id: "a1", viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-03-01",
    startedBy: "", structure: [] as string[], endedOn: null, endedByReportId: null,
  }
  const goodReport = {
    id: "r1", attemptId: "a1", at: "2026-04-01T12:00:00", wentThrough: false,
    thought: "", ending: "fine", closeness: null,
    withWhom: "", where: "", factors: [] as string[], didInstead: "",
  }

  it("accepts a record whose reports all belong to a run in the file", () => {
    expect(importRecord(file({ version: 1, attempts: [goodRun], reports: [goodReport] }))).not.toBeNull()
  })

  it("refuses a report filed against a run the file does not carry", () => {
    expect(importRecord(file({
      version: 1, attempts: [goodRun], reports: [{ ...goodReport, attemptId: "GONE" }],
    }))).toBeNull()
  })

  it("refuses a run whose ending names a report the file does not carry", () => {
    // The mirror image: the chart would draw the run as finished while its
    // panel said "How it ended: it has not".
    expect(importRecord(file({
      version: 1, attempts: [{ ...goodRun, endedOn: "2026-04-01", endedByReportId: "GONE" }], reports: [],
    }))).toBeNull()
  })

  it("still accepts a record with runs and no reports at all", () => {
    expect(importRecord(file({ version: 1, attempts: [goodRun], reports: [] }))).not.toBeNull()
  })

  it("round-trips everything this app writes", () => {
    // The guard must not refuse the app's own export, which is the one file
    // anybody actually loads.
    const r = recordPastRun(liveRun(), {
      viceId: "porn", label: "Porn", startedOn: "2025-01-01", endedOn: "2025-02-01",
      startedBy: "", structure: [], ending: "justone", thought: "x",
    })
    expect(importRecord(exportRecord(r))).toEqual(r)
  })
})

describe("two things quit at once are two records, not one", () => {
  /** Smoking, quit and lost in 2025; porn, still going. */
  function both(): BlackBoxRecord {
    let r = recordPastRun(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping",
      startedOn: "2025-01-01", endedOn: "2025-04-10",
      startedBy: "", structure: [], ending: "justone", thought: "One at the wedding",
    })
    r = startAttempt(r, {
      viceId: "porn", label: "Porn", startedOn: "2026-06-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    return r
  }

  it("does not add one vice's days into the other's total", () => {
    // The screen read every number off the whole record and titled it with the
    // MOST RECENT run's vice: "Lit is time without porn" over a 100-day
    // smoking bar, and 215 days "across every run" for two different things.
    const r = both()
    expect(stats(r, TODAY).totalCleanDays).toBe(212)
    expect(stats(forVice(r, "nicotine"), TODAY).totalCleanDays).toBe(100)
    expect(stats(forVice(r, "porn"), TODAY).totalCleanDays).toBe(112)
  })

  it("keeps each vice's reports with its own runs", () => {
    const r = both()
    expect(thoughtCosts(forVice(r, "porn"), TODAY)).toEqual([])
    expect(thoughtCosts(forVice(r, "nicotine"), TODAY).map((c) => c.ending)).toEqual(["justone"])
  })

  it("lists what is on the record, most recently started first", () => {
    expect(vicesOn(both())).toEqual([
      { viceId: "porn", label: "Porn", runs: 1, live: true, lastStartedOn: "2026-06-01" },
      { viceId: "nicotine", label: "Smoking or vaping", runs: 1, live: false, lastStartedOn: "2025-01-01" },
    ])
  })

  it("names a vice by its newest run, so a rename is not half-applied", () => {
    let r = startAttempt(emptyRecord(), {
      viceId: "custom", label: "Energy drinks", startedOn: "2025-01-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    r = { ...r, attempts: [{ ...r.attempts[0], endedOn: "2025-02-01" }] }
    r = startAttempt(r, {
      viceId: "custom", label: "Caffeine", startedOn: "2026-01-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    expect(vicesOn(r)).toEqual([
      { viceId: "custom", label: "Caffeine", runs: 2, live: true, lastStartedOn: "2026-01-01" },
    ])
  })

  it("an unfiltered view is the record itself", () => {
    const r = both()
    expect(forVice(r, null)).toEqual(r)
  })
})

describe("the overlap rule is per vice, because the total it protects is", () => {
  it("lets you stop two different things over the same months", () => {
    // It refused this, at the store as well as on the screen, so "Add it"
    // simply did nothing — the most ordinary thing a person does.
    const r = recordPastRun(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping",
      startedOn: "2026-01-01", endedOn: "2026-03-01",
      startedBy: "", structure: [], ending: "fine", thought: "",
    })
    expect(overlapsExisting(r, "2026-01-15", "2026-02-15", "porn")).toBe(false)
    const after = recordPastRun(r, {
      viceId: "porn", label: "Porn", startedOn: "2026-01-15", endedOn: "2026-02-15",
      startedBy: "", structure: [], ending: "fine", thought: "",
    })
    expect(after.attempts).toHaveLength(2)
  })

  it("still refuses the same days twice off one vice", () => {
    const r = recordPastRun(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping",
      startedOn: "2026-01-01", endedOn: "2026-03-01",
      startedBy: "", structure: [], ending: "fine", thought: "",
    })
    expect(overlapsExisting(r, "2026-02-01", "2026-02-10", "nicotine")).toBe(true)
    expect(recordPastRun(r, {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-02-01", endedOn: "2026-02-10",
      startedBy: "", structure: [], ending: "fine", thought: "",
    })).toEqual(r)
  })

  it("refuses a run started inside a run that is already going", () => {
    // `startAttempt` had no overlap guard at all, so the identical double count
    // the remembered-run form refuses went straight in from the other door —
    // including a second live run off a vice that already had one.
    const r = liveRun()
    const after = startAttempt(r, {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-06-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    expect(after).toEqual(r)
  })

  it("lets a new run start the day after the last one ended", () => {
    let r = recordPastRun(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping",
      startedOn: "2026-01-01", endedOn: "2026-03-01",
      startedBy: "", structure: [], ending: "fine", thought: "",
    })
    r = startAttempt(r, {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-03-02",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    expect(r.attempts).toHaveLength(2)
  })
})
