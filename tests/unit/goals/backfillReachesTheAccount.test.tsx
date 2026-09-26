/**
 * THE WIRING, WHICH IS THE HALF THAT KEEPS BEING WRONG.
 *
 * `backfillGoalLinks.test.ts` proves the rule: which links the tag can prove and
 * the account has not recorded. A rule nothing calls is worth nothing, and this
 * slice has produced two of those in one day — a required prop the only real
 * caller forgot, and a callback frozen at mount by a `[]`-dep handler bundle.
 * Both looked built and did nothing.
 *
 * So this renders the real `TrackTab`, lets it read the account, and asks
 * whether the request actually went out.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { TrackTab } from "@/src/goals/components/north-star/TrackTab"
import { addGoal, emptyNsPlan, updateGoal } from "@/src/goals/northStarService"
import { trackTemplateId } from "@/src/goals/northStarTrackService"
import { NO_TRAINING_TICKS } from "@/src/goals/dayTicks"
import type { NsPlan } from "@/src/goals/types"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/life-mastery",
  useSearchParams: () => new URLSearchParams(),
}))

/* The hub is its own screen with its own data; this file is about one request. */
vi.mock("@/src/goals/components/GoalsHubContent", () => ({ GoalsHubContent: () => null }))

const RUN = "run-of-this-browser"
const COUNTED = "11111111-1111-1111-1111-111111111111"
let sent: Array<{ url: string; body: unknown }> = []

function planWithADriver(): { plan: NsPlan; driverId: string } {
  const added = addGoal(emptyNsPlan(), "lm_relationship", "Twenty approaches", "habit_ramp")
  const driver = added.goals[added.goals.length - 1]
  return { plan: updateGoal(added, driver.id, { perWeek: 20, unit: "approaches" }), driverId: driver.id }
}

/** Signed in, with one `ns:`-tagged counted goal already on the account. */
function installFetch(driverId: string) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString()
    if (init?.method && init.method !== "GET") {
      sent.push({ url, body: init.body ? JSON.parse(String(init.body)) : null })
      return new Response("{}", { status: 200 })
    }
    if (url === "/api/goals") {
      /* Pushed, and tagged with THIS browser's run — the state anybody who
         pushed before the link column existed is in. */
      return new Response(
        JSON.stringify([{ id: COUNTED, template_id: trackTemplateId(RUN, driverId), current_value: 3, target_value: 20 }]),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } })
  }))
}

const linkCalls = () => sent.filter((s) => s.url === "/api/life-plan/goal-link")

beforeEach(() => {
  sent = []
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => vi.unstubAllGlobals())

describe("the browser that pushed writes the links down", () => {
  it("records what the tag proves and the account has not", async () => {
    const { plan, driverId } = planWithADriver()
    installFetch(driverId)

    render(
      <TrackTab plan={plan} runId={RUN} today="2026-09-26" goalLinks={{}} ticks={NO_TRAINING_TICKS} onToggleStep={vi.fn()} />,
    )
    await waitFor(() => expect(screen.queryByText(/Checking your goals/i)).toBeNull())

    await waitFor(() => expect(linkCalls()).toHaveLength(1))
    expect(linkCalls()[0].body, "the plan goal's own id, pointing at the counted row").toEqual({
      links: { [driverId]: COUNTED },
    })
  })

  it("sends nothing when the account already has the link", async () => {
    const { plan, driverId } = planWithADriver()
    installFetch(driverId)

    render(
      <TrackTab
        plan={plan}
        runId={RUN}
        today="2026-09-26"
        goalLinks={{ [driverId]: COUNTED }}
        ticks={NO_TRAINING_TICKS}
        onToggleStep={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.queryByText(/Checking your goals/i)).toBeNull())

    /* Give the effect the same room the passing case needed, or this asserts
       nothing more than "it had not happened yet". */
    await new Promise((r) => setTimeout(r, 50))
    expect(linkCalls(), "a load that writes on every visit is its own defect").toEqual([])
  })

  /**
   * AND NOT FROM A DEVICE THAT CANNOT READ THE TAG. The run is the only proof
   * the row came from this plan; a phone that never pushed must not point the
   * account at rows it has not identified.
   */
  it("sends nothing from a device that did not do the pushing", async () => {
    const { plan, driverId } = planWithADriver()
    installFetch(driverId)

    render(
      <TrackTab
        plan={plan}
        runId="run-of-another-browser"
        today="2026-09-26"
        goalLinks={{}}
        ticks={NO_TRAINING_TICKS}
        onToggleStep={vi.fn()}
      />,
    )
    await waitFor(() => expect(screen.queryByText(/Checking your goals/i)).toBeNull())
    await new Promise((r) => setTimeout(r, 50))

    expect(linkCalls()).toEqual([])
  })
})
