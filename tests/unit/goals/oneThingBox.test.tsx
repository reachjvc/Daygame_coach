/**
 * THE BOX — the four things it must not do again.
 *
 * Every test here is a defect that shipped or was one review away from
 * shipping. They are written against the rendered component rather than
 * against a function because all four were failures of what the screen offered
 * a person: a control that looked editable and was not, a dead end that could
 * only be escaped by a refusal from the server, and a failed read wearing the
 * face of an empty answer.
 */

import { useState } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { OneThingBox } from "@/src/goals/components/north-star/OneThingBox"
import { OneThingTab, type OneThingTabHandlers } from "@/src/goals/components/north-star/OneThingTab"
import type { GoalHandlers } from "@/src/goals/components/north-star/GoalCard"
import { addOneThingRequirement, emptyNsPlan } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"
import type { OneThingAccount } from "@/src/goals/components/north-star/useOneThing"
import type { OneThing } from "@/src/goals/oneThingService"

const one = (over: Partial<OneThing> = {}): OneThing => ({
  id: "r1",
  chapterId: "ch-1",
  body: "Quit weed for 100 days",
  answeredAt: "2026-08-01T09:00:00Z",
  startedOn: "2026-08-01",
  dueOn: "2026-12-08",
  daysLeft: 97,
  lapsed: false,
  wordings: 1,
  extended: false,
  supports: { one_why: "", one_cost: "", one_identity: "", one_values: "" },
  ...over,
})

/**
 * Every `GoalCard` handler as a spy.
 *
 * The requirements are edited with the flow's real goal card now, so the step
 * cannot render without them. Built from the interface's own keys via a Proxy
 * rather than listed by hand: a handler added to `GoalHandlers` later would
 * otherwise fail this file at runtime with "not a function", months after the
 * change that caused it.
 */
const goalHandlers = (): GoalHandlers =>
  new Proxy({} as GoalHandlers, {
    get: () => vi.fn(),
  })

const account = (over: Partial<OneThingAccount> = {}): OneThingAccount => ({
  current: one(),
  past: [],
  loaded: true,
  signedOut: false,
  error: null,
  reload: vi.fn(),
  ...over,
})

/**
 * The box is controlled by the page now, so the tests drive it the way the page
 * does: unsaved text is state one level up, and typing goes through it.
 */
function Box({ account: a }: { account: OneThingAccount }) {
  const [typed, setTyped] = useState<string | null>(null)
  return <OneThingBox account={a} typed={typed} onTyped={setTyped} />
}

const save = () => screen.getByTestId("one-thing-save")
const dueInput = () => screen.getByTestId("one-thing-due") as HTMLInputElement

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("the deadline is editable on its own", () => {
  /**
   * THE BUG IN THE SCREENSHOT: "Quit weed for 100 days", 120 days left, and no
   * way to make it 100. The button compared the sentence alone and stayed grey.
   */
  it("turns the save on when only the date moves, and says that is what it will do", () => {
    render(<Box account={account()} />)
    expect(save()).toBeDisabled()

    fireEvent.change(dueInput(), { target: { value: "2026-12-20" } })
    expect(save()).toBeEnabled()
    expect(save()).toHaveTextContent("Move the deadline")
  })

  /**
   * BOTH AT ONCE. Found in review: changing the sentence AND the deadline sent
   * an amend, which has no way to carry a date, so the new deadline was thrown
   * away in silence and the picker snapped back — the original bug in a new hat.
   */
  it("moves the deadline even when the words changed too", async () => {
    const posted: unknown[] = []
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, json: async () => ({}) } as unknown as Response
    })
    render(<Box account={account()} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Quit vaping" } })
    fireEvent.change(dueInput(), { target: { value: "2027-03-01" } })
    fireEvent.click(save())
    await screen.findByTestId("one-thing-save")
    expect(posted[0]).toMatchObject({ act: "extend", body: "Quit vaping", dueOn: "2027-03-01" })
    vi.unstubAllGlobals()
  })

  it("still offers to replace the sentence when the words change", () => {
    render(<Box account={account()} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Quit vaping" } })
    expect(save()).toBeEnabled()
    expect(save()).toHaveTextContent("Save this wording")
  })

  it("refuses a date that is not on the calendar, in words, rather than at the server", () => {
    render(<Box account={account()} />)
    fireEvent.change(dueInput(), { target: { value: "" } })
    expect(save()).toBeDisabled()
    expect(screen.getByText(/not a date on the calendar/)).toBeInTheDocument()
  })
})

describe("amending, extending and starting are three different acts", () => {
  /**
   * The distinction the user asked for in their own words: "when I change
   * something, I would still want it to be the tracking from the initial first
   * date." Editing the box amends. Ending a season is a separate control that
   * says what it costs, because it is the one that restarts the clock.
   */
  it("offers to start a new one only once there is something to replace", () => {
    render(<Box account={account({ current: null })} />)
    expect(screen.queryByTestId("one-thing-new")).toBeNull()
    cleanup()
    render(<Box account={account()} />)
    expect(screen.getByTestId("one-thing-new")).toBeInTheDocument()
  })

  /**
   * A FRESH SEASON GETS A FRESH LENGTH. Found in review: the picker follows the
   * CURRENT one thing until touched, so starting a new one three days before the
   * old deadline began a three-day season — under a confirmation that promised
   * the clock restarts today.
   */
  it("does not hand a new one thing the deadline of the one it replaces", async () => {
    const posted: Array<Record<string, unknown>> = []
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, json: async () => ({}) } as unknown as Response
    })
    // Three days left on the current one, and the picker untouched.
    render(<Box account={account({ current: one({ dueOn: "2026-12-08", daysLeft: 3 }) })} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bench 100 kg" } })
    fireEvent.click(screen.getByTestId("one-thing-new"))
    fireEvent.click(screen.getByTestId("one-thing-start-new"))
    await screen.findByTestId("one-thing-new")
    expect(posted[0].act).toBe("start")
    expect(posted[0].dueOn).not.toBe("2026-12-08")
    vi.unstubAllGlobals()
  })

  it("asks before starting a new one, and says the clock restarts", () => {
    render(<Box account={account()} />)
    fireEvent.click(screen.getByTestId("one-thing-new"))
    expect(screen.getByText(/the clock starts again from today/i)).toBeInTheDocument()
    expect(screen.getByTestId("one-thing-start-new")).toBeInTheDocument()
  })

  it("lets you back out of starting a new one", () => {
    render(<Box account={account()} />)
    fireEvent.click(screen.getByTestId("one-thing-new"))
    fireEvent.click(screen.getByText(/No, I am editing this one/i))
    expect(screen.queryByTestId("one-thing-start-new")).toBeNull()
  })

  /**
   * PROOF ON THE PAGE THAT A REWORD DID NOT RESTART ANYTHING. Silent until
   * something has actually been amended, so it is not noise on day one.
   */
  it("says how long this has been running once it has been reworded", () => {
    render(<Box account={account({ current: one({ wordings: 3, startedOn: "2026-08-01" }) })} />)
    const since = screen.getByTestId("one-thing-since")
    expect(since).toHaveTextContent(/Running since 1 Aug 2026/)
    expect(since).toHaveTextContent(/reworded 2 times/)
  })

  it("says nothing of the sort on one nobody has touched", () => {
    render(<Box account={account()} />)
    expect(screen.queryByTestId("one-thing-since")).toBeNull()
  })
})

describe("a run-out one thing does not trap the next one", () => {
  /**
   * Found in review. The picker followed the saved deadline, which is right
   * until it goes past: the prompt says "write the next one", the form posts a
   * date that has already been, the server refuses it — and the only way out
   * was to notice the date box and fix it yourself.
   */
  it("offers a fresh deadline once the saved one has run out", () => {
    const lapsed = one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true })
    render(<Box account={account({ current: lapsed })} />)
    expect(dueInput().value).not.toBe("2026-01-01")
    // Whatever it offers must be a day that can actually be saved.
    expect(new Date(dueInput().value + "T00:00:00Z").getTime()).toBeGreaterThan(Date.now())
  })

  it("keeps the saved deadline while there is road left", () => {
    render(<Box account={account()} />)
    expect(dueInput().value).toBe("2026-12-08")
  })

  it("asks for the next one once it has run out", () => {
    const lapsed = one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true })
    render(<Box account={account({ current: lapsed })} />)
    expect(screen.getByTestId("one-thing-prompt")).toHaveTextContent(/Write the one thing for the next one/)
  })

  it("says nothing while the deadline is far off", () => {
    render(<Box account={account()} />)
    expect(screen.queryByTestId("one-thing-prompt")).toBeNull()
  })

  /**
   * THE ONE THE OTHER LAPSED TESTS COULD NOT SEE: what the button POSTS.
   *
   * Both tests above check what the picker shows. Neither presses save, and the
   * defect was entirely in the pressing. Offering a fresh deadline made the box
   * think the DATE had been changed — by itself, before the person touched
   * anything — so writing the next season's sentence sent `extend`. The server
   * reads an extension as "same commitment, longer": it opened the new chapter
   * with the OLD start date, marked it a continuation, and copied last season's
   * why, cost, identity and values underneath the new sentence. Somebody's
   * brand-new commitment came up saying "Running since <last season>".
   */
  it("starts the next one when the season has run out, rather than extending the old one", async () => {
    const posted: unknown[] = []
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, json: async () => ({}) } as unknown as Response
    })
    const lapsed = one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true })
    render(<Box account={account({ current: lapsed })} />)

    // Nothing has been typed, so there is nothing to save — the picker moving
    // itself is not a change the person made.
    expect(save()).toBeDisabled()

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Run a half marathon" } })
    expect(save()).toHaveTextContent("Start the next one")
    fireEvent.click(save())
    await screen.findByTestId("one-thing-save")

    expect(posted[0]).toMatchObject({ act: "start", body: "Run a half marathon" })
    vi.unstubAllGlobals()
  })

  /**
   * And the other half: keeping the same words on a run-out season and moving
   * only the date IS an extension, and must still carry the start across —
   * "when I change something, I would still want it to be the tracking from the
   * initial first date."
   */
  it("still extends when the words are unchanged and only the date moves", async () => {
    const posted: unknown[] = []
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, json: async () => ({}) } as unknown as Response
    })
    const lapsed = one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true })
    render(<Box account={account({ current: lapsed })} />)
    fireEvent.change(dueInput(), { target: { value: "2027-03-01" } })
    fireEvent.click(save())
    await screen.findByTestId("one-thing-save")

    expect(posted[0]).toMatchObject({ act: "extend", dueOn: "2027-03-01", body: "Quit weed for 100 days" })
    vi.unstubAllGlobals()
  })

  /**
   * WHOSE CLOCK. An untouched picker must not send its value: the date it opens
   * on comes from the device, and `defaultDueOn(timezone)` on the server is
   * computed in the ACCOUNT's timezone. A phone a day ahead of its owner's
   * calendar was quietly saving an 89-day season.
   */
  it("lets the server pick the first deadline rather than sending the device's idea of it", async () => {
    const posted: Record<string, unknown>[] = []
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, json: async () => ({}) } as unknown as Response
    })
    render(<Box account={account({ current: null })} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Quit weed" } })
    fireEvent.click(save())
    await screen.findByTestId("one-thing-save")

    expect(posted[0].dueOn).toBeUndefined()
    vi.unstubAllGlobals()
  })
})

describe("a read that failed is not an empty answer", () => {
  /**
   * Found in review. A dropped request drew a blank box, no countdown and no
   * history — pixel for pixel identical to somebody who has never written one,
   * over the top of an answer still sitting on the account.
   */
  it("says the read failed rather than showing a blank as though nothing were saved", () => {
    render(<Box account={account({ current: null, error: "Could not read your one thing" })} />)
    expect(screen.getByTestId("one-thing-read-error")).toHaveTextContent(/not your one thing being gone/)
  })

  it("says nothing of the sort when the read worked and there is simply nothing yet", () => {
    render(<Box account={account({ current: null })} />)
    expect(screen.queryByTestId("one-thing-read-error")).toBeNull()
    expect(save()).toHaveTextContent("Save this to my account")
  })
})

describe("the countdown carries the day, not just the number of sleeps", () => {
  it("shows the date the person typed on the form", () => {
    render(<Box account={account()} />)
    expect(screen.getByTestId("one-thing-countdown")).toHaveTextContent(/97 days left, until 8 Dec 2026/)
  })
})

describe("the rest of the step is hidden only when we know there is nothing", () => {
  /**
   * Found in review. "Nothing is written yet" is an assertion about the
   * ACCOUNT, and this page was making it whenever the account had not answered
   * — while the read was in flight, when it failed, and when nobody was signed
   * in. On the anonymous `/test/life-mastery` surface that was permanent: the
   * sentence cannot be saved without an account, so the gate could never open,
   * and the why, the cost, the identity and the values already in the plan
   * became unreachable.
   */
  function Tab({ account: a, onAdd }: { account: OneThingAccount; onAdd?: OneThingTabHandlers["onAddRequirement"] }) {
    const [typed, setTyped] = useState<string | null>(null)
    return (
      <OneThingTab
        plan={emptyNsPlan()}
        account={a}
        typed={typed}
        onTyped={setTyped}
        today="2026-09-03"
        goalHandlers={goalHandlers()}
        handlers={{
          onAnswer: vi.fn(),
          onAddRequirement: onAdd ?? vi.fn(),
          onMarkServes: vi.fn(),
          onRemoveGoal: vi.fn(),
          onGoToTab: vi.fn(),
          onToggleOneThingArea: vi.fn(),
        }}
      />
    )
  }

  /** Same step, but opened on a plan that already holds requirements. */
  function TabWithPlan({ plan, account: a }: { plan: NsPlan; account: OneThingAccount }) {
    const [typed, setTyped] = useState<string | null>(null)
    return (
      <OneThingTab
        plan={plan}
        account={a}
        typed={typed}
        onTyped={setTyped}
        today="2026-09-03"
        goalHandlers={goalHandlers()}
        handlers={{
          onAnswer: vi.fn(),
          onAddRequirement: vi.fn(),
          onMarkServes: vi.fn(),
          onRemoveGoal: vi.fn(),
          onGoToTab: vi.fn(),
          onToggleOneThingArea: vi.fn(),
        }}
      />
    )
  }

  const tab = (over: Partial<OneThingAccount>, onAdd?: OneThingTabHandlers["onAddRequirement"]) =>
    render(<Tab account={account({ current: null, ...over })} onAdd={onAdd} />)

  const whyBox = () => screen.queryByLabelText(/Why does it matter/i)

  it("hides it when the account has answered and there is genuinely nothing", () => {
    tab({})
    expect(whyBox()).toBeNull()
  })

  it("shows it while the read is still in flight", () => {
    tab({ loaded: false })
    expect(whyBox()).toBeInTheDocument()
  })

  it("shows it when the read failed", () => {
    tab({ error: "Could not read your one thing" })
    expect(whyBox()).toBeInTheDocument()
  })

  it("shows it when nobody is signed in, where the gate could never open", () => {
    tab({ signedOut: true })
    expect(whyBox()).toBeInTheDocument()
  })

  it("shows it once something is saved", () => {
    tab({ current: one() })
    expect(whyBox()).toBeInTheDocument()
  })

  /**
   * AND IT OPENS ON THE SENTENCE BEING TYPED, not on it being saved.
   *
   * Requiring a save press was the wrong trade: somebody types the most
   * important sentence in the flow, the page does not move, and the reason is
   * invisible. The gate exists to stop the page asking why something matters
   * before it exists — once it is on the screen, it exists.
   */
  it("opens as soon as a sentence is typed, before any save", () => {
    tab({})
    expect(whyBox()).toBeNull()
    fireEvent.change(screen.getByRole("textbox", { name: /Say it in your own words/i }), {
      target: { value: "Quit weed for 100 days" },
    })
    expect(whyBox()).toBeInTheDocument()
  })

  it("closes again if the sentence is cleared without saving", () => {
    tab({})
    const box = screen.getByRole("textbox", { name: /Say it in your own words/i })
    fireEvent.change(box, { target: { value: "Quit weed" } })
    expect(whyBox()).toBeInTheDocument()
    fireEvent.change(box, { target: { value: "   " } })
    expect(whyBox()).toBeNull()
  })

  /**
   * WHAT NEEDS TO HAPPEN COMES FIRST, directly under the sentence.
   *
   * It used to be last, below the why, the cost, the identity, the values and
   * the areas: six boxes of reflection before the step asked for one thing you
   * would actually DO. Asserted on document order rather than on the section
   * existing, because "it is on the page somewhere" is what was already true
   * and was the complaint.
   */
  it("puts the goals list directly under the sentence, above the why", () => {
    tab({ current: one() })
    const headings = screen
      .getAllByRole("heading")
      .map((h) => h.textContent ?? "")
    const needs = headings.findIndex((t) => /What needs to happen/i.test(t))
    const why = headings.findIndex((t) => /Why does it matter/i.test(t))
    expect(needs).toBeGreaterThanOrEqual(0)
    expect(why).toBeGreaterThanOrEqual(0)
    expect(needs).toBeLessThan(why)
  })

  /**
   * AND IT DOES NOT CLAIM THEY ARE ALREADY ON THE GOALS PAGE.
   *
   * The help text said they "are waiting for you on the goals page". They are
   * not: a line written here becomes a goal in this plan, in this browser, and
   * reaches the account only when the Track step pushes it. Somebody wrote
   * three, opened the tracking page, found nothing, and reasonably concluded
   * the feature was broken.
   */
  /**
   * THE SHAPE IS ASKED FOR, IN WORDS, BEFORE THE LINE IS WRITTEN.
   *
   * It was read out of the words by `shapeFromTitle`, and the three real lines
   * that broke it are in `addOneThingRequirement`'s comment. The complaint that
   * produced this was not "the guess is wrong sometimes" — it was that there
   * was no control anywhere on the step to correct it.
   */
  it("offers the three shapes by name, with what each one means", () => {
    tab({ current: one() })
    for (const label of ["Target", "Practice", "Finish line"]) {
      expect(screen.getByRole("button", { name: `Add the next one as a ${label}` })).toBeInTheDocument()
      // The word itself is on screen, not only in the accessible name.
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    // The meaning of the selected one is ON the page, not in a hover title.
    expect(screen.getByText(/ongoing weekly practice/i)).toBeInTheDocument()
  })

  /**
   * THE ADD ROW AND THE CARDS MUST NOT SHARE A NAME.
   *
   * Every requirement above the add row is a `GoalCard` with its own shape
   * toggle, and those buttons are labelled with the bare shape names. Found by
   * driving the real page: a click meant for "add the next one as a Target"
   * landed on the first card's toggle and silently changed the shape of a goal
   * that was already written.
   */
  it("names the add row's shape buttons apart from the ones on each goal", () => {
    tab({ current: one() })
    for (const label of ["Target", "Practice", "Finish line"]) {
      expect(screen.getAllByRole("button", { name: `Add the next one as a ${label}` })).toHaveLength(1)
      // The bare shape name belongs to the cards, and there are none here.
      expect(screen.queryByRole("button", { name: label })).toBeNull()
    }
  })

  it("passes the shape that was picked, not one read off the words", () => {
    const onAdd = vi.fn()
    tab({ current: one() }, onAdd)

    // "Flat bench 100 kg" is exactly what the old guesser would have called a
    // climb. Picked as a finish line, a finish line is what must be created.
    fireEvent.click(screen.getByRole("button", { name: "Add the next one as a Finish line" }))
    fireEvent.change(screen.getByLabelText(/What needs to happen for it to work/i), {
      target: { value: "Flat bench 100 kg" },
    })
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }))

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd.mock.calls[0][0]).toBe("Flat bench 100 kg")
    expect(onAdd.mock.calls[0][2]).toBe("achievement")
  })

  /**
   * The area chips used to render only once something had been typed, so the
   * one control that corrects a bad area guess was invisible while somebody was
   * deciding what to type, and gone again the moment they pressed Add.
   */
  it("shows where it will be filed before anything is typed", () => {
    tab({ current: one() })
    expect(screen.getByText(/Files under/i)).toBeInTheDocument()
  })

  /**
   * A CLIMB WITH NO NUMBER IS NOT A DEAD END.
   *
   * Found by review, and it was mine: refusing to invent a target of 100 left
   * every ladder control in `GoalCard` gated off, so the card asked for a
   * number and offered nowhere to type one. The only escape was the invented
   * default this change exists to remove.
   */
  it("asks for the number on a climb that has not got one", () => {
    const withTarget = addOneThingRequirement(emptyNsPlan(), "Ring my mother", "lm_family", "milestone_ladder", "2026-09-03T10:00:00.000Z")
    expect(withTarget.goals[0].ladder).toBeNull()
    render(
      <TabWithPlan plan={withTarget} account={account({ current: one() })} />
    )
    expect(
      screen.getByLabelText(/What number are you climbing to for Ring my mother/i)
    ).toBeInTheDocument()
  })

  it("says where the goals actually are — the plan, until the Track step", () => {
    tab({ current: one() })
    const help = screen.getByText(/each becomes a real goal/i).textContent ?? ""
    expect(help).not.toMatch(/waiting for you on the goals page/i)
    expect(help).toMatch(/Track step/i)
  })
})
