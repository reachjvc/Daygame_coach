import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import {
  BLACKBOX_KEY,
  emptyRecord,
  exportRecord,
  fileReport,
  importRecord,
  isCalendarDay,
  nowInBrowser,
  parseRecord,
  recordPastRun,
  serializeRecord,
  startAttempt,
  todayInBrowser,
} from "@/src/vice/blackbox/blackboxStore"
import { VICE_STORAGE_KEY } from "@/src/vice/viceService"

function started() {
  return startAttempt(emptyRecord(), {
    viceId: "smoking", label: "Cigarettes", startedOn: "2026-08-16",
    startedBy: "Read my own record", structure: ["Told my brother"],
  })
}

describe("the black box does not touch the old module's storage", () => {
  it("uses its own key", () => {
    expect(BLACKBOX_KEY).toBe("vice-blackbox-v1")
    expect(BLACKBOX_KEY).not.toBe(VICE_STORAGE_KEY)
  })

  it("never mentions the old key anywhere in the store", () => {
    // The owner's standing rule is that nothing already in their browser gets
    // rewritten. The cheapest guarantee is that this file has no way of naming
    // the old key in CODE.
    //
    // Comments are blanked first, exactly as the guards in architecture.test.ts
    // do, and for the reason that file records: the first version of this test
    // failed on the store's own comment explaining that it leaves the old key
    // alone. A rule that fires on its own explanation trains people to delete
    // the explanation.
    const src = readFileSync("src/vice/blackbox/blackboxStore.ts", "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
    expect(src).not.toContain("quit-vice-v1")
  })
})

describe("reading whatever is in storage", () => {
  it("an absent, empty or corrupt record reads as empty rather than throwing", () => {
    expect(parseRecord(null)).toEqual(emptyRecord())
    expect(parseRecord("")).toEqual(emptyRecord())
    expect(parseRecord("{{{not json")).toEqual(emptyRecord())
    expect(parseRecord('"a string"')).toEqual(emptyRecord())
  })

  it("survives a round trip unchanged", () => {
    const r = started()
    expect(parseRecord(serializeRecord(r))).toEqual(r)
  })
})

describe("filing a report", () => {
  it("a close call leaves the run alive", () => {
    const r = started()
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-02T22:10:00.000Z", wentThrough: false,
      thought: "Maybe I could moderate", ending: "fine", closeness: 7,
      withWhom: "Alone", where: "Balcony", factors: ["A good stretch beforehand"], didInstead: "Read the chart",
    })
    expect(after.attempts[0].endedOn).toBeNull()
    expect(after.attempts[0].endedByReportId).toBeNull()
    expect(after.reports).toHaveLength(1)
  })

  it("going through with it ends the run, dated by the report", () => {
    const r = started()
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-19T23:30:00.000Z", wentThrough: true,
      thought: "I felt fine", ending: "fine", closeness: 9,
      withWhom: "Alone", where: "Home", factors: ["A good stretch beforehand"], didInstead: "",
    })
    expect(after.attempts[0].endedOn).toBe("2026-09-19")
    expect(after.attempts[0].endedByReportId).toBe(after.reports[0].id)
  })

  it("the ending of a run IS a report, so the two cannot disagree", () => {
    const r = started()
    const after = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-19T23:30:00.000Z", wentThrough: true,
      thought: "x", ending: "drink", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    const ending = after.reports.find((x) => x.id === after.attempts[0].endedByReportId)
    expect(ending?.ending).toBe("drink")
  })

  it("does not mutate the record it was given", () => {
    const r = started()
    const before = serializeRecord(r)
    fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-19T23:30:00.000Z", wentThrough: true,
      thought: "x", ending: "fine", closeness: null, withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(serializeRecord(r)).toBe(before)
  })

  it("a second ending cannot re-end a run that is already closed", () => {
    let r = started()
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-10T20:00:00.000Z", wentThrough: true,
      thought: "first", ending: "fine", closeness: null, withWhom: "", where: "", factors: [], didInstead: "",
    })
    const firstEnding = r.attempts[0].endedByReportId
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: "2026-09-12T20:00:00.000Z", wentThrough: true,
      thought: "second", ending: "drink", closeness: null, withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(r.attempts[0].endedOn).toBe("2026-09-10")
    expect(r.attempts[0].endedByReportId).toBe(firstEnding)
  })
})

describe("the record can leave the browser", () => {
  it("exports and imports back to the same record", () => {
    const r = started()
    expect(importRecord(exportRecord(r))).toEqual(r)
  })

  it("refuses anything that is not a record instead of returning an empty one", () => {
    // Returning empty here would silently replace a real history with nothing.
    expect(importRecord("nonsense")).toBeNull()
    expect(importRecord('{"version":1}')).toBeNull()
    expect(importRecord("[]")).toBeNull()
  })
})

describe("the day comes from the person's own calendar", () => {
  it("reads the wall-clock day, not a UTC instant", () => {
    // 20:00 in a zone ahead of UTC is still the 19th locally; a UTC-first
    // conversion would call it the 20th. Constructed from local fields so the
    // assertion holds wherever the suite runs.
    const local = new Date(2026, 8, 19, 20, 0, 0)
    expect(todayInBrowser(local)).toBe("2026-09-19")
  })
})

/**
 * The four faults a review pass found in this file and its callers, each with
 * the test that fails if it comes back.
 */
describe("faults found in review", () => {
  it("dates a report in the person's own evening, not in UTC", () => {
    // 23:30 on the 19th, west of UTC, used to be recorded as the 20th — so a
    // run that ended on Saturday night was filed as ending on Sunday and every
    // length downstream was a day out.
    const lateEvening = new Date(2026, 8, 19, 23, 30, 0)
    expect(nowInBrowser(lateEvening).slice(0, 10)).toBe("2026-09-19")
    expect(nowInBrowser(lateEvening)).not.toContain("Z")
  })

  it("refuses a start date it cannot read rather than storing NaN", () => {
    const before = emptyRecord()
    const after = startAttempt(before, {
      viceId: "nicotine", label: "Cigarettes", startedOn: "16/08/2026",
      startedBy: "", structure: [],
    })
    expect(after.attempts).toHaveLength(0)
  })

  it("accepts only real calendar days", () => {
    expect(isCalendarDay("2026-08-16")).toBe(true)
    expect(isCalendarDay("2026-02-30")).toBe(false)
    expect(isCalendarDay("16/08/2026")).toBe(false)
    expect(isCalendarDay("2026-8-6")).toBe(false)
    expect(isCalendarDay("")).toBe(false)
  })

  it("bounces a malformed import instead of bricking the page", () => {
    // The old check only asked whether two arrays existed, so a bad row was
    // written to storage and then crashed the page on every load — with the
    // import door sitting on the page that would no longer render.
    const badAttempt = JSON.stringify({
      version: 1,
      attempts: [{ id: "a", viceId: "v", label: "l", startedOn: "16/08/2026", structure: [], endedOn: null, endedByReportId: null }],
      reports: [],
    })
    expect(importRecord(badAttempt)).toBeNull()

    const badReport = JSON.stringify({
      version: 1,
      attempts: [],
      reports: [{ id: "r", attemptId: "a", at: "not-a-date", wentThrough: "yes", thought: "", ending: "fine", factors: [] }],
    })
    expect(importRecord(badReport)).toBeNull()

    const missingStructure = JSON.stringify({
      version: 1,
      attempts: [{ id: "a", viceId: "v", label: "l", startedOn: "2026-08-16", endedOn: null, endedByReportId: null }],
      reports: [],
    })
    expect(importRecord(missingStructure)).toBeNull()
  })

  it("still accepts a record this app wrote", () => {
    let r = started()
    r = fileReport(r, {
      attemptId: r.attempts[0].id, at: nowInBrowser(new Date(2026, 8, 19, 23, 30)), wentThrough: false,
      thought: "maybe", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    expect(importRecord(exportRecord(r))).toEqual(r)
  })
})

/**
 * Entering history. The chart's entire value is that it accumulates, and until
 * this existed nothing already over could be entered at all.
 */
describe("a run you already had", () => {
  const past = {
    viceId: "nicotine", label: "Cigarettes",
    startedOn: "2025-02-10", endedOn: "2025-05-09",
    startedBy: "", structure: [],
    ending: "fine" as const, thought: "Three months in, one at the wedding",
  }

  it("lands as a finished run with the reason it ended attached", () => {
    const r = recordPastRun(emptyRecord(), past)
    expect(r.attempts).toHaveLength(1)
    expect(r.attempts[0].endedOn).toBe("2025-05-09")
    const ending = r.reports.find((x) => x.id === r.attempts[0].endedByReportId)
    expect(ending?.ending).toBe("fine")
    expect(ending?.wentThrough).toBe(true)
    expect(ending?.attemptId).toBe(r.attempts[0].id)
  })

  it("does not become the live run", () => {
    const r = recordPastRun(emptyRecord(), past)
    expect(r.attempts.every((a) => a.endedOn !== null)).toBe(true)
  })

  it("can be added while a run is going, without ending it", () => {
    const withLive = started()
    const r = recordPastRun(withLive, past)
    const live = r.attempts.filter((a) => a.endedOn === null)
    expect(live).toHaveLength(1)
    expect(live[0].id).toBe(withLive.attempts[0].id)
  })

  it("refuses a run that ends before it starts", () => {
    // Accepting it would draw a negative-width bar and subtract from the
    // lifetime total, which is the one number that must never go down.
    const r = recordPastRun(emptyRecord(), { ...past, startedOn: "2025-05-09", endedOn: "2025-02-10" })
    expect(r.attempts).toHaveLength(0)
    expect(r.reports).toHaveLength(0)
  })

  it("refuses dates it cannot read", () => {
    expect(recordPastRun(emptyRecord(), { ...past, startedOn: "10/02/2025" }).attempts).toHaveLength(0)
    expect(recordPastRun(emptyRecord(), { ...past, endedOn: "" }).attempts).toHaveLength(0)
  })

  it("invents nothing it was not given", () => {
    const r = recordPastRun(emptyRecord(), past)
    const ending = r.reports[0]
    expect(ending.closeness).toBeNull()
    expect(ending.withWhom).toBe("")
    expect(ending.factors).toEqual([])
  })

  it("survives export and import like any other row", () => {
    const r = recordPastRun(emptyRecord(), past)
    expect(importRecord(exportRecord(r))).toEqual(r)
  })
})
