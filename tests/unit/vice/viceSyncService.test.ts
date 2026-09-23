/**
 * THE MERGE, CASE BY CASE.
 *
 * Every test here is a way somebody loses a night. They are written as the
 * situation rather than as the function call, because the question this file
 * answers is not "does `mergeRows` work" but "what happens when the phone and
 * the laptop disagree".
 */

import { describe, it, expect } from "vitest"
import {
  canPush,
  decideOnLoad,
  mergeRecords,
  mergeRows,
  pendingSince,
  recordIsEmpty,
  syncNotice,
  watermark,
} from "@/src/vice/blackbox/viceSyncService"
import { emptyRecord, fileReport, removeReport, startAttempt } from "@/src/vice/blackbox/blackboxStore"
import { forVice, stats } from "@/src/vice/blackboxService"
import type { BlackBoxRecord, ViceReport } from "@/src/vice/types"

const TODAY = "2026-09-23"

function report(over: Partial<ViceReport> = {}): ViceReport {
  return {
    id: "r1", attemptId: "a1", at: "2026-05-04T21:00:00", wentThrough: false,
    thought: "One wouldn't undo this", ending: "fine", closeness: null,
    withWhom: "", where: "", factors: [], didInstead: "",
    updatedAt: "2026-05-04T19:00:00.000Z", deletedAt: null,
    ...over,
  }
}

function recordOf(reports: ViceReport[]): BlackBoxRecord {
  return { version: 1, attempts: [], reports }
}

describe("two devices, two different nights", () => {
  it("keeps both", () => {
    // The commonest case by far, and the one a stale-save refusal would ruin:
    // the phone filed Tuesday, the laptop filed Thursday, neither knows.
    const phone = recordOf([report({ id: "tue", at: "2026-05-04T21:00:00" })])
    const laptop = recordOf([report({ id: "thu", at: "2026-05-06T21:00:00" })])
    const merged = mergeRecords(phone, laptop)
    expect(merged.reports.map((r) => r.id).sort()).toEqual(["thu", "tue"])
  })

  it("keeps a row the other side has never heard of", () => {
    // Rule 4. Absence is "not heard of", never "deleted" — otherwise the first
    // sync from a fresh browser empties the account.
    expect(mergeRows([report({ id: "only-here" })], []).map((r) => r.id)).toEqual(["only-here"])
    expect(mergeRows([], [report({ id: "only-there" })]).map((r) => r.id)).toEqual(["only-there"])
  })
})

describe("the same row, edited twice", () => {
  it("takes the later edit", () => {
    const older = report({ thought: "typed in a hurry", updatedAt: "2026-05-04T19:00:00.000Z" })
    const newer = report({ thought: "what I actually thought", updatedAt: "2026-05-04T20:00:00.000Z" })
    expect(mergeRows([older], [newer])[0].thought).toBe("what I actually thought")
    expect(mergeRows([newer], [older])[0].thought).toBe("what I actually thought")
  })

  it("does not let an unsent local edit be overwritten by an older server copy", () => {
    // Rule 3. The upload is slow; the server answers with what it had before
    // this device's edit. That answer must not win.
    const local = report({ thought: "edited just now", updatedAt: "2026-05-04T20:00:00.000Z" })
    const fromServer = report({ thought: "what the server had", updatedAt: "2026-05-04T19:00:00.000Z" })
    expect(mergeRows([local], [fromServer])[0].thought).toBe("edited just now")
  })

  it("leaves an identical row alone, so a no-op sync is really a no-op", () => {
    // Ties go to the copy already held. If they did not, every sync would look
    // to the NEXT device like every row had just been edited.
    const held = report({ thought: "same" })
    const same = report({ thought: "same" })
    expect(mergeRows([held], [same])[0]).toBe(held)
  })
})

describe("a deletion travels", () => {
  it("a tombstone beats a live copy the other side still has", () => {
    // Rule 2. The laptop deleted it; the phone was offline and still holds it.
    const stillHere = report({ updatedAt: "2026-05-04T19:00:00.000Z", deletedAt: null })
    const deleted = report({ updatedAt: "2026-05-05T09:00:00.000Z", deletedAt: "2026-05-05T09:00:00.000Z" })
    expect(mergeRows([stillHere], [deleted])[0].deletedAt).not.toBeNull()
    expect(mergeRows([deleted], [stillHere])[0].deletedAt).not.toBeNull()
  })

  it("an edit made AFTER a deletion brings the row back", () => {
    // Not a bug. Removing a report and then undoing the removal is exactly this
    // shape, and the later stamp is the person's later intention.
    const deleted = report({ updatedAt: "2026-05-05T09:00:00.000Z", deletedAt: "2026-05-05T09:00:00.000Z" })
    const undone = report({ updatedAt: "2026-05-05T09:05:00.000Z", deletedAt: null })
    expect(mergeRows([deleted], [undone])[0].deletedAt).toBeNull()
  })

  it("never resurrects a row the other side deleted while this one slept", () => {
    // The failure the whole tombstone design exists to stop: a hard delete
    // would leave the server simply lacking the row, and this device would
    // upload it again on the next push.
    const phoneOffline = recordOf([report({ id: "gone", deletedAt: null, updatedAt: "2026-05-01T10:00:00.000Z" })])
    const laptop = recordOf([report({ id: "gone", deletedAt: "2026-05-02T10:00:00.000Z", updatedAt: "2026-05-02T10:00:00.000Z" })])
    const merged = mergeRecords(phoneOffline, laptop)
    expect(forVice(merged, null).reports).toEqual([])
    expect(merged.reports).toHaveLength(1)
  })
})

describe("a lapse carries its run with it", () => {
  /**
   * THE CASE I EXPECTED TO GET WRONG, and the reason `fileReport` bumps the
   * attempt's stamp. A lapse writes one new report AND edits the run it ended.
   * A device that took only the report would show a run still going with the
   * report that ended it sitting underneath.
   */
  it("moves both rows, so the other device sees the run ended", () => {
    let phone = startAttempt(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-03-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    const laptop = phone
    phone = fileReport(phone, {
      attemptId: phone.attempts[0].id, at: "2026-09-20T22:00:00", wentThrough: true,
      thought: "I felt fine", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })

    const onLaptop = mergeRecords(laptop, phone)
    const view = forVice(onLaptop, null)
    expect(view.attempts[0].endedOn).toBe("2026-09-20")
    expect(view.attempts[0].endedByReportId).toBe(view.reports[0].id)
    expect(stats(view, TODAY).currentDays).toBeNull()
  })

  it("and undoing it moves both rows back", () => {
    // Phase 4's case: the tombstone on the report and the revived run have the
    // same stamp, so they cannot arrive half-applied.
    let phone = startAttempt(emptyRecord(), {
      viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-03-01",
      startedBy: "", structure: [], acknowledgedRisk: false, today: TODAY,
    })
    phone = fileReport(phone, {
      attemptId: phone.attempts[0].id, at: "2026-09-20T22:00:00", wentThrough: true,
      thought: "x", ending: "fine", closeness: null,
      withWhom: "", where: "", factors: [], didInstead: "",
    })
    const ended = phone
    // The real undo, not a hand-built one: the point of the test is that what
    // `removeReport` actually writes survives a merge, and a hand-built stamp
    // proves only that I can write a newer number.
    const undone = removeReport(phone, phone.attempts[0].endedByReportId as string)
    const onLaptop = forVice(mergeRecords(ended, undone), null)
    expect(onLaptop.attempts[0].endedOn).toBeNull()
    expect(onLaptop.reports).toEqual([])
  })
})

describe("what to do on load", () => {
  const browser = recordOf([report()])

  it("stays offline, and writes nothing, when the account could not be read", () => {
    // Rule 1. `undefined` is not `null`, and this is why.
    const d = decideOnLoad({ server: undefined, browser })
    expect(d.kind).toBe("offline")
    expect(canPush(d)).toBe(false)
  })

  /**
   * THE ONE THAT COST A RECORD, IN THE VERSION BEFORE THIS.
   *
   * There used to be an `imported` marker, and a branch that read: if the
   * account is empty and the import already ran, take the account's answer.
   * The account's answer is nothing. So a marker written before the upload
   * landed — and any interruption in between — told a browser holding four
   * years of nights that the truth was zero rows.
   *
   * I wrote that branch AND a test asserting it, which is the part worth
   * remembering: the test agreed with the code because the same wrong idea
   * wrote both. It was caught by a peer hitting the identical bug in
   * `src/goals/lifePlanSync.ts` on the same day and saying so.
   *
   * There is no marker now. The union cannot lose a row, so these cases are
   * all the same case.
   */
  it("never hands back less than the browser already had", () => {
    for (const server of [null, emptyRecord()]) {
      const d = decideOnLoad({ server, browser })
      expect(d.kind).toBe("merge")
      expect(d.kind === "merge" && d.record.reports.map((r) => r.id)).toEqual(["r1"])
    }
  })

  it("says when the account was empty, so the caller knows to push everything", () => {
    const d = decideOnLoad({ server: null, browser })
    expect(d.kind === "merge" && d.accountWasEmpty).toBe(true)
  })

  it("does not call an account with rows empty", () => {
    const d = decideOnLoad({ server: recordOf([report({ id: "theirs" })]), browser })
    expect(d.kind === "merge" && d.accountWasEmpty).toBe(false)
  })

  it("merges when both sides hold rows", () => {
    const server = recordOf([report({ id: "from-server" })])
    const d = decideOnLoad({ server, browser })
    expect(d.kind === "merge" && d.record.reports.map((r) => r.id).sort()).toEqual(["from-server", "r1"])
  })

  it("starts empty when neither side has anything", () => {
    const d = decideOnLoad({ server: null, browser: emptyRecord() })
    expect(d.kind === "merge" && recordIsEmpty(d.record)).toBe(true)
  })

  it("does not resurrect a record deliberately cleared on the account", () => {
    // What the marker was FOR. Here a deletion is a row, so a cleared account
    // holds tombstones, the union takes them, and nothing comes back — the
    // protection lives in the data instead of in a flag that can be wrong.
    const cleared = recordOf([
      report({ deletedAt: "2026-06-01T10:00:00.000Z", updatedAt: "2026-06-01T10:00:00.000Z" }),
    ])
    const d = decideOnLoad({ server: cleared, browser })
    expect(d.kind === "merge" && forVice(d.record, null).reports).toEqual([])
  })
})

describe("what gets sent", () => {
  const rows = recordOf([
    report({ id: "old", updatedAt: "2026-05-01T10:00:00.000Z" }),
    report({ id: "new", updatedAt: "2026-05-03T10:00:00.000Z" }),
  ])

  it("sends everything when nothing has ever been sent", () => {
    expect(pendingSince(rows, null).count).toBe(2)
  })

  it("sends only what changed since the last acknowledgement", () => {
    const p = pendingSince(rows, "2026-05-02T00:00:00.000Z")
    expect(p.reports.map((r) => r.id)).toEqual(["new"])
  })

  it("does not resend a row stamped exactly at the watermark", () => {
    // `>` not `>=`. With `>=` a quiet page resends its newest row on every
    // single sync, forever.
    expect(pendingSince(rows, "2026-05-03T10:00:00.000Z").count).toBe(0)
  })

  it("moves the watermark to the newest thing sent", () => {
    expect(watermark(pendingSince(rows, null), null)).toBe("2026-05-03T10:00:00.000Z")
  })

  it("leaves the watermark alone when there was nothing to send", () => {
    const held = "2026-05-03T10:00:00.000Z"
    expect(watermark(pendingSince(rows, held), held)).toBe(held)
  })
})

describe("what the person is told", () => {
  it("says something true in every state", () => {
    expect(syncNotice("synced", 0)).toContain("Saved")
    expect(syncNotice("syncing", 0)).toContain("Saving")
    expect(syncNotice("failed", 0)).toContain("still here on this device")
    expect(syncNotice("unknown", 0)).toBe("")
  })

  it("counts what is waiting when offline", () => {
    expect(syncNotice("offline", 1)).toContain("1 change is waiting")
    expect(syncNotice("offline", 3)).toContain("3 changes are waiting")
  })

  it("never tells somebody their work is gone, in any state", () => {
    // The rule is about the CLAIM, not the word: "nothing has been lost" is
    // reassurance and must be allowed, "your changes were lost" must not. An
    // earlier version of this test banned the word and failed on the
    // reassurance, which would have pushed the copy towards vagueness.
    const claims = /(work|changes?|record|it) (was|were|is|are|has been|have been) (lost|gone|deleted|discarded)/i
    for (const state of ["unknown", "synced", "syncing", "failed", "offline", "local"] as const) {
      for (const n of [0, 1, 3]) {
        expect(syncNotice(state, n), `${state}/${n}`).not.toMatch(claims)
      }
    }
    expect(syncNotice("offline", 1)).toContain("nothing has been lost")
  })
})
