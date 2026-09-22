// @vitest-environment jsdom

/**
 * THE CHART HAS TO SAY WHAT THE RECORD SAYS.
 *
 * Every test here was bought by a defect found by rendering the real page and
 * measuring it, not by reading the code. They are all the same class: a screen
 * that states something about your own history which your own history does not
 * support. That is the one failure this module cannot survive, because the
 * whole product is "your own record answers you" — a record that embellishes is
 * worth less than no record.
 *
 *   1. Close-call dots were spread evenly across the bar's last half from a
 *      COUNT. Five close calls in week one of a 301-day run were drawn at 53%,
 *      62%, 70%, 78% and 87% — measured in a browser. The chart's own promised
 *      reading is "dense ticks before an ending means you saw it coming", so it
 *      manufactured that reading for every run that had any close calls, and
 *      told the opposite of the truth to the person whose record it was.
 *   2. The caption and the key said "smoking" for all nine vices on offer, four
 *      lines under a header that said "Betting".
 *   3. A remembered run on an empty record was filed as nicotine, because the
 *      caller handed the form a default for something nobody had supplied.
 *   4. "You have had this thought 1 times", one line above a correctly
 *      pluralised sentence — in the module that has a `days()` helper precisely
 *      because three copies of a plural rule is how two of them go wrong.
 *   5. An `ending` the app does not know got through import, rendered as
 *      "something else" on every bar, and vanished from the cost ranking while
 *      its days stayed in the headline total.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { BlackBoxRecord, ViceAttempt, ViceReport } from "@/src/vice/types"
import { chartSpan, laneGeometry, runLanes, stats, thoughtCosts, viceLabelOf } from "@/src/vice/blackboxService"
import { importRecord, recordPastRun, riskGateBlocks, startAttempt } from "@/src/vice/blackbox/blackboxStore"
import { Lanes } from "@/src/vice/components/blackbox/Lanes"
import { VICES } from "@/src/vice/data/vices"

afterEach(cleanup)

const TODAY = "2026-09-22"

function attempt(over: Partial<ViceAttempt> = {}): ViceAttempt {
  return {
    id: "a1",
    viceId: "nicotine",
    label: "Smoking or vaping",
    startedOn: "2025-01-01",
    startedBy: "New year",
    structure: [],
    endedOn: "2025-10-28",
    endedByReportId: "end",
    ...over,
  }
}

function report(over: Partial<ViceReport> = {}): ViceReport {
  return {
    id: "r1",
    attemptId: "a1",
    at: "2025-01-02T21:00:00",
    wentThrough: false,
    thought: "early wobble",
    ending: "fine",
    closeness: 6,
    withWhom: "",
    where: "",
    factors: [],
    didInstead: "",
    ...over,
  }
}

/** One 301-day run. Every close call in the first week; the ending in October. */
function earlyWobbles(): BlackBoxRecord {
  return {
    version: 1,
    attempts: [attempt()],
    reports: [
      ...[1, 2, 3, 4, 5].map((d) =>
        report({ id: `c${d}`, at: `2025-01-0${d}T21:00:00` }),
      ),
      report({ id: "end", at: "2025-10-28T12:00:00", wentThrough: true, thought: "I can handle it now" }),
    ],
  }
}

describe("a close call is drawn on the day it happened", () => {
  it("puts five wobbles from week one in the first tenth of the bar, not the last half", () => {
    const record = earlyWobbles()
    const span = chartSpan(record, TODAY)!
    const [geo] = laneGeometry(runLanes(record, TODAY), span, TODAY)

    // Where along the bar each dot sits, 0 = the day the run started.
    const along = geo.dots.map((d) => ((d - geo.left) / geo.width) * 100)

    expect(along).toHaveLength(5)
    // Every one inside the first tenth. The index-based version produced
    // 53/62/70/78/87, so this is the assertion that fails if it comes back.
    for (const at of along) expect(at).toBeLessThan(10)
  })

  it("separates a wobble at the start of a run from one at the end", () => {
    const record: BlackBoxRecord = {
      version: 1,
      attempts: [attempt()],
      reports: [
        report({ id: "early", at: "2025-01-02T21:00:00" }),
        report({ id: "late", at: "2025-10-20T21:00:00" }),
        report({ id: "end", at: "2025-10-28T12:00:00", wentThrough: true }),
      ],
    }
    const span = chartSpan(record, TODAY)!
    const [geo] = laneGeometry(runLanes(record, TODAY), span, TODAY)
    const [early, late] = geo.dots

    // Spread by index these two would be a fixed distance apart whatever their
    // dates. On a 301-day run nine months apart, they are most of the bar apart.
    expect(late - early).toBeGreaterThan(geo.width * 0.8)
  })

  it("keeps a dot on its own bar rather than dropping it, when the date is outside the run", () => {
    const record: BlackBoxRecord = {
      version: 1,
      attempts: [attempt()],
      reports: [report({ id: "stray", at: "2024-03-03T21:00:00" })],
    }
    const span = chartSpan(record, TODAY)!
    const [geo] = laneGeometry(runLanes(record, TODAY), span, TODAY)

    expect(geo.dots).toHaveLength(1)
    expect(geo.dots[0]).toBeGreaterThanOrEqual(geo.left)
    expect(geo.dots[0]).toBeLessThanOrEqual(geo.left + geo.width)
  })

  it("draws every close call, rather than silently stopping at twelve", () => {
    const record: BlackBoxRecord = {
      version: 1,
      attempts: [attempt()],
      reports: Array.from({ length: 20 }, (_, i) =>
        report({ id: `c${i}`, at: `2025-0${1 + (i % 9)}-1${i % 10}T21:00:00` }),
      ),
    }
    const span = chartSpan(record, TODAY)!
    const [geo] = laneGeometry(runLanes(record, TODAY), span, TODAY)
    expect(geo.dots).toHaveLength(20)
  })
})

describe("the chart names the vice the record is actually about", () => {
  it("takes its words from the run, not from a constant", () => {
    const record: BlackBoxRecord = {
      version: 1,
      attempts: [attempt({ viceId: "gambling", label: "Betting" })],
      reports: [report({ id: "end", at: "2025-10-28T12:00:00", wentThrough: true })],
    }
    render(<Lanes record={record} today={TODAY} viceLabel={viceLabelOf(record)} selectedId={null} onSelect={() => {}} />)

    expect(screen.getByText(/Lit is time without betting/i)).toBeTruthy()
    // The key, exactly — the caption above it also contains "without betting".
    expect(screen.getByText("Without betting")).toBeTruthy()
    expect(screen.queryByText(/smoking/i)).toBeNull()
  })

  it("names the most recent run even when nothing is live", () => {
    const record: BlackBoxRecord = {
      version: 1,
      attempts: [
        attempt({ id: "old", viceId: "nicotine", label: "Smoking or vaping", startedOn: "2024-01-01", endedOn: "2024-02-01" }),
        attempt({ id: "new", viceId: "gambling", label: "Betting", startedOn: "2025-01-01", endedOn: "2025-10-28" }),
      ],
      reports: [],
    }
    // Both ended. The header used to read the LIVE run only and so named nothing.
    expect(viceLabelOf(record)).toBe("Betting")
  })

  it("still forms a sentence when the record names no vice at all", () => {
    const record: BlackBoxRecord = { version: 1, attempts: [attempt()], reports: [] }
    render(<Lanes record={record} today={TODAY} viceLabel={null} selectedId={null} onSelect={() => {}} />)
    expect(screen.getByText(/Lit is time without it\. Dark is time with it\./i)).toBeTruthy()
  })
})

describe("an ending the app does not know never gets in", () => {
  it("refuses a file whose ending is not one of the families", () => {
    const record = earlyWobbles()
    const bad = JSON.parse(JSON.stringify(record)) as BlackBoxRecord
    bad.reports[0] = { ...bad.reports[0], ending: "felt-fine" as never }

    // It used to pass, because the check was `typeof ending === "string"`.
    expect(importRecord(JSON.stringify(bad))).toBeNull()
    // And the good one still loads, so the check is not simply refusing everything.
    expect(importRecord(JSON.stringify(record))).not.toBeNull()
  })

  it("is what keeps the cost ranking and the headline total telling the same story", () => {
    const record = earlyWobbles()
    const rows = thoughtCosts(record, TODAY)
    const rankedDays = rows.reduce((sum, r) => sum + r.daysEnded, 0)
    const lanes = runLanes(record, TODAY)
    const endedDays = lanes.filter((l) => l.ending !== null).reduce((sum, l) => sum + l.days, 0)

    // Every ended run is accounted for in the panel that ranks what each
    // thought cost. An unrecognised ending used to drop out of this sum while
    // staying in "Across every run".
    expect(rankedDays).toBe(endedDays)
  })
})

describe("the detail panel counts close calls from the same list the chart draws", () => {
  it("reports one per filed close call", () => {
    const record = earlyWobbles()
    const [lane] = runLanes(record, TODAY)
    expect(lane.closeCallDays).toHaveLength(5)
    expect(lane.closeCallDays).toEqual([...lane.closeCallDays].sort())
  })
})

describe("two runs never cover the same day", () => {
  it("refuses a remembered run that sits inside the live one", () => {
    const live: BlackBoxRecord = {
      version: 1,
      attempts: [attempt({ id: "L", startedOn: "2026-08-23", endedOn: null, endedByReportId: null })],
      reports: [],
    }
    const after = recordPastRun(live, {
      viceId: "nicotine",
      label: "Smoking or vaping",
      startedOn: "2026-09-02",
      endedOn: "2026-09-17",
      startedBy: "",
      structure: [],
      ending: "fine",
      thought: "",
    })

    // Measured in the browser before the guard: "Across every run" read 47 days
    // for a stretch in which 31 days had passed.
    expect(after.attempts).toHaveLength(1)
    expect(stats(after, TODAY).totalCleanDays).toBe(stats(live, TODAY).totalCleanDays)
  })

  it("still accepts a run that ends the day before another starts", () => {
    const had: BlackBoxRecord = {
      version: 1,
      attempts: [attempt({ id: "A", startedOn: "2025-06-01", endedOn: "2025-06-30" })],
      reports: [],
    }
    const after = recordPastRun(had, {
      viceId: "nicotine",
      label: "Smoking or vaping",
      startedOn: "2025-04-01",
      endedOn: "2025-05-31",
      startedBy: "",
      structure: [],
      ending: "fine",
      thought: "",
    })
    expect(after.attempts).toHaveLength(2)
  })

  it("refuses one that shares a single day at the join", () => {
    const had: BlackBoxRecord = {
      version: 1,
      attempts: [attempt({ id: "A", startedOn: "2025-06-01", endedOn: "2025-06-30" })],
      reports: [],
    }
    // Both runs count 2025-06-01, because run length is inclusive at both ends.
    const after = recordPastRun(had, {
      viceId: "nicotine",
      label: "Smoking or vaping",
      startedOn: "2025-04-01",
      endedOn: "2025-06-01",
      startedBy: "",
      structure: [],
      ending: "fine",
      thought: "",
    })
    expect(after.attempts).toHaveLength(1)
  })
})

describe("the withdrawal gate, which is the one thing here that can hurt somebody", () => {
  const start = (viceId: string, acknowledgedRisk: boolean) =>
    startAttempt(
      { version: 1, attempts: [], reports: [] },
      { viceId, label: "x", startedOn: "2026-09-01", startedBy: "", structure: [], acknowledgedRisk },
    )

  it("refuses to start a run off alcohol until the note is acknowledged", () => {
    // Alcohol and benzodiazepine withdrawal can kill. The old module gates
    // this in viceService AND on the button; the Black Box shipped with the
    // button half only, and a component-only gate is one refactor from gone.
    expect(start("alcohol", false).attempts).toHaveLength(0)
    expect(start("alcohol", true).attempts).toHaveLength(1)
  })

  it("does not stand in the way of a vice that carries no such risk", () => {
    expect(start("nicotine", false).attempts).toHaveLength(1)
    expect(start("scrolling", false).attempts).toHaveLength(1)
  })

  it("asks the catalogue rather than keeping its own list of what is risky", () => {
    // If a vice is added with medicalRisk, the gate covers it with no edit here.
    for (const v of VICES.filter((x) => x.medicalRisk)) {
      expect(riskGateBlocks(v.id, false), `${v.id} must be gated`).toBe(true)
      expect(riskGateBlocks(v.id, true)).toBe(false)
    }
    expect(VICES.some((v) => v.medicalRisk)).toBe(true)
  })

  it("treats a vice it does not recognise as unrisky rather than guessing", () => {
    // An id off the catalogue cannot be looked up; refusing it here would
    // block every imported record instead of protecting anybody.
    expect(riskGateBlocks("not-a-vice", false)).toBe(false)
  })
})

describe("the chart is still one tap into a run", () => {
  it("hands back the run you pressed", () => {
    const record = earlyWobbles()
    const picked: string[] = []
    const { container } = render(
      <Lanes record={record} today={TODAY} viceLabel={viceLabelOf(record)} selectedId={null} onSelect={(id) => picked.push(id)} />,
    )
    const bar = within(container).getAllByRole("button")[0]
    fireEvent.click(bar)
    expect(picked).toEqual(["a1"])
  })
})
