// @vitest-environment jsdom

/**
 * WHAT A HISTORY ROW SAYS ABOUT A SESSION THAT HAS NO LIFTS IN IT.
 *
 * A run, a yoga class and a mobility session all have nothing in `workout_sets`,
 * and History describes a workout by its top sets. So the row for a finished
 * 5 km read "No sets recorded" — which is the app telling somebody that
 * something went wrong with a session that went perfectly well.
 *
 * It was fixed once, in the expandable detail, and came straight back when the
 * list was rebuilt as rows that link to a receipt: the fix lived in the half of
 * the component that was replaced. The browser walk caught it, after a
 * fourteen-minute run; this catches it in `npm test`, which is what runs before
 * every commit.
 *
 * The other half of the row is the numbers column, and it printed
 * `{log.duration_min} min` into a nullable column — a workout whose instants the
 * server could not subtract rendered a bare " min". A number that is not there
 * is not zero, and it is not an empty string in front of a unit either.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HistoryTab } from "@/src/programs/components/HistoryTab"

// The tab mounts the past-workout dialog, which reaches for the router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/programs",
  useSearchParams: () => new URLSearchParams(),
}))

const ZONE = "Europe/Copenhagen"

/** One finished workout, as `/api/workouts/history` hands it over. */
function log(over: Record<string, unknown>) {
  return {
    id: "w1",
    user_id: "u1",
    logged_at: "2026-09-23T09:00:00.000Z",
    started_at: "2026-09-23T09:00:00.000Z",
    ended_at: "2026-09-23T09:31:00.000Z",
    session_type: "weights",
    duration_min: 31,
    distance_km: null,
    enrollment_id: null,
    sets: [],
    ...over,
  }
}

function serve(logs: ReturnType<typeof log>[]) {
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(
      JSON.stringify({
        months: [{ monthKey: "2026-09", monthStart: "2026-09-01", logs }],
        timezone: ZONE,
        lift: "",
        nextBefore: null,
      }),
      { status: 200 }
    )
  ))
}

/** The row's whole text, which is what a reader actually sees. */
async function rowText(): Promise<string> {
  const row = await screen.findByTestId("history-row-w1")
  return row.textContent ?? ""
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a session with no sets in it", () => {
  it("names a run rather than reporting an absence", async () => {
    serve([log({ session_type: "running" })])
    render(<HistoryTab unit="kg" timezone={ZONE} />)

    const text = await rowText()
    expect(text).toContain("Run")
    // The raw column value, lower-cased and on its own, was what it printed
    // before `describeSessionRow` existed.
    expect(text).not.toContain("running")
    expect(text).not.toContain("No sets recorded")
  })

  it("does not print the minutes twice", async () => {
    serve([log({ session_type: "running" })])
    render(<HistoryTab unit="kg" timezone={ZONE} />)

    // The numbers column already carries them; the sentence beside it carried
    // them too, so the row read "Run · 31 min    31 min".
    const text = await rowText()
    expect(text.match(/31 min/g) ?? []).toHaveLength(1)
  })

  it("keeps the distance, which the numbers column has nowhere for", async () => {
    serve([log({ session_type: "running", distance_km: 5 })])
    render(<HistoryTab unit="kg" timezone={ZONE} />)

    expect(await rowText()).toContain("5 km")
  })

  it("still says so for a WEIGHTS session with nothing logged", async () => {
    // That one really is an absence: a lifting session with no sets in it is
    // a workout somebody opened and did not log.
    serve([log({ session_type: "weights" })])
    render(<HistoryTab unit="kg" timezone={ZONE} />)

    expect(await rowText()).toContain("No sets recorded")
  })
})

describe("the numbers column", () => {
  it("leaves out a duration the server could not work out", async () => {
    serve([log({ session_type: "weights", duration_min: null })])
    render(<HistoryTab unit="kg" timezone={ZONE} />)

    const text = await rowText()
    expect(text, "a bare unit with no number in front of it").not.toMatch(/(^|[^\d])\s*min/)
  })
})
