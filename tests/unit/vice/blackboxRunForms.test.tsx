// @vitest-environment jsdom
/**
 * THE BLACK BOX'S TWO FORMS: A BUTTON THAT WILL NOT GO MUST SAY WHY.
 *
 * Moved here from `tests/e2e/blackbox.spec.ts`, where each of these opened the
 * whole page in a browser, seeded the account, waited for two syncs and then
 * asserted on a sentence. The sentence and the disabled button are decided
 * entirely inside `PastRun` and `ReportForm` from their props and what is typed
 * into them — no request, no storage, no account. So they are rendered here as
 * the page renders them, with the props `BlackBoxPage` passes (the current vice
 * pre-selected, or none on an empty record; the live run's first day), and
 * driven through the same controls a person uses.
 *
 * What stays in the browser: that the page opens these forms at all, and that
 * a run entered through one reaches the chart and the account — `blackbox.spec`
 * still walks both.
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import { PastRun } from "@/src/vice/components/blackbox/PastRun"
import { ReportForm } from "@/src/vice/components/blackbox/ReportForm"
import type { BlackBoxRecord } from "@/src/vice/types"

afterEach(cleanup)

const TODAY = "2026-10-13"
const EMPTY: BlackBoxRecord = { version: 1, attempts: [], reports: [] }

/** One finished smoking run, 1 January to 1 March — the record the overlap test seeds. */
const ONE_SMOKING_RUN: BlackBoxRecord = {
  version: 1,
  attempts: [
    {
      id: "attempt-1", viceId: "nicotine", label: "Smoking or vaping", startedOn: "2026-01-01",
      startedBy: "", structure: [], endedOn: "2026-03-01", endedByReportId: "report-1",
      updatedAt: "2026-03-01T12:00:00.000Z", deletedAt: null,
    },
  ],
  reports: [
    {
      id: "report-1", attemptId: "attempt-1", at: "2026-03-01T12:00:00", wentThrough: true,
      thought: "", ending: "fine", closeness: null, withWhom: "", where: "", factors: [], didInstead: "",
      updatedAt: "2026-03-01T12:00:00.000Z", deletedAt: null,
    },
  ],
}

function pastRun(record: BlackBoxRecord, viceId: string | null, label: string | null) {
  const onAdd = vi.fn()
  render(<PastRun today={TODAY} record={record} viceId={viceId} label={label} onAdd={onAdd} onClose={() => {}} />)
  return onAdd
}

/** A date box takes its value the way a picker sets it: one change event. */
function setDate(id: string, value: string) {
  const box = document.getElementById(id) as HTMLInputElement | null
  if (!box) throw new Error(`no #${id} on the form`)
  fireEvent.change(box, { target: { value } })
}

const addIt = () => screen.getByRole("button", { name: "Add it" })

describe("adding a run you already had", () => {
  it("a form that cannot be submitted always says why", () => {
    // A first user filled in both dates, read "that is 89 days", chose an
    // ending, and met a dead button with nothing on screen explaining it — the
    // required vice had no default and no hint. On an empty record the page
    // passes no vice, so this is the form that person met.
    const onAdd = pastRun(EMPTY, null, null)

    expect(addIt()).toBeDisabled()
    expect(screen.getByText(/Pick what you were stopping/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Smoking or vaping" }))
    expect(addIt()).toBeDisabled()
    expect(screen.getByText(/Both dates are needed/i)).toBeInTheDocument()

    setDate("pr-from", "2025-02-10")
    setDate("pr-to", "2025-05-09")
    expect(addIt()).toBeEnabled()
    expect(screen.queryByText(/Pick what you were stopping|Both dates are needed/i)).toBeNull()

    // And enabled means it really goes: the run handed back is the one typed.
    fireEvent.click(addIt())
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ viceId: "nicotine", startedOn: "2025-02-10", endedOn: "2025-05-09" }),
    )
  })

  it("a run that ends before it starts is refused", () => {
    pastRun(EMPTY, null, null)
    fireEvent.click(screen.getByRole("button", { name: "Smoking or vaping" }))
    setDate("pr-from", "2025-05-09")
    setDate("pr-to", "2025-02-10")

    expect(screen.getByText(/ends before it starts/i)).toBeInTheDocument()
    expect(addIt()).toBeDisabled()
  })

  it("the same days twice off one thing is still refused, and says so", () => {
    // The page pre-selects the vice it is showing, so nothing is clicked here —
    // exactly as the browser test did it.
    pastRun(ONE_SMOKING_RUN, "nicotine", "Smoking or vaping")
    setDate("pr-from", "2026-02-01")
    setDate("pr-to", "2026-02-10")

    expect(screen.getByText(/overlap a run off smoking or vaping/i)).toBeInTheDocument()
    expect(addIt()).toBeDisabled()
  })
})

describe("filing a report against a live run", () => {
  it("a report cannot be dated before the run it is filed against", () => {
    const onFile = vi.fn()
    // A run a fortnight old with nothing filed on it yet: `BlackBoxPage` hands
    // the run's first day as both bounds.
    render(
      <ReportForm
        initial={{ wentThrough: false, ending: "fine" }}
        today={TODAY}
        runStartedOn="2026-09-29"
        lastFiledOn="2026-09-29"
        onFile={onFile}
        onClose={() => {}}
      />,
    )
    const fileIt = screen.getByRole("button", { name: "File it" })
    expect(fileIt, "today, inside the run, is fileable").toBeEnabled()

    setDate("rf-on", "2020-01-01")

    expect(screen.getByText(/nothing in it can be older than that/i)).toBeInTheDocument()
    expect(fileIt).toBeDisabled()
    fireEvent.click(fileIt)
    expect(onFile).not.toHaveBeenCalled()
  })
})
