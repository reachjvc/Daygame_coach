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

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { OneThingBox } from "@/src/goals/components/north-star/OneThingBox"
import { OneThingTab } from "@/src/goals/components/north-star/OneThingTab"
import { emptyNsPlan } from "@/src/goals/northStarService"
import type { OneThingAccount } from "@/src/goals/components/north-star/useOneThing"
import type { OneThing } from "@/src/goals/oneThingService"

const one = (over: Partial<OneThing> = {}): OneThing => ({
  id: "r1",
  body: "Quit weed for 100 days",
  answeredAt: "2026-08-01T09:00:00Z",
  dueOn: "2026-12-08",
  daysLeft: 97,
  lapsed: false,
  ...over,
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
    render(<OneThingBox account={account()} />)
    expect(save()).toBeDisabled()

    fireEvent.change(dueInput(), { target: { value: "2026-12-20" } })
    expect(save()).toBeEnabled()
    expect(save()).toHaveTextContent("Move the deadline")
  })

  it("still offers to replace the sentence when the words change", () => {
    render(<OneThingBox account={account()} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Quit vaping" } })
    expect(save()).toBeEnabled()
    expect(save()).toHaveTextContent("Save as my new one thing")
  })

  it("refuses a date that is not on the calendar, in words, rather than at the server", () => {
    render(<OneThingBox account={account()} />)
    fireEvent.change(dueInput(), { target: { value: "" } })
    expect(save()).toBeDisabled()
    expect(screen.getByText(/not a date on the calendar/)).toBeInTheDocument()
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
    render(<OneThingBox account={account({ current: lapsed })} />)
    expect(dueInput().value).not.toBe("2026-01-01")
    // Whatever it offers must be a day that can actually be saved.
    expect(new Date(dueInput().value + "T00:00:00Z").getTime()).toBeGreaterThan(Date.now())
  })

  it("keeps the saved deadline while there is road left", () => {
    render(<OneThingBox account={account()} />)
    expect(dueInput().value).toBe("2026-12-08")
  })

  it("asks for the next one once it has run out", () => {
    const lapsed = one({ dueOn: "2026-01-01", daysLeft: -244, lapsed: true })
    render(<OneThingBox account={account({ current: lapsed })} />)
    expect(screen.getByTestId("one-thing-prompt")).toHaveTextContent(/Write the one thing for the next one/)
  })

  it("says nothing while the deadline is far off", () => {
    render(<OneThingBox account={account()} />)
    expect(screen.queryByTestId("one-thing-prompt")).toBeNull()
  })
})

describe("a read that failed is not an empty answer", () => {
  /**
   * Found in review. A dropped request drew a blank box, no countdown and no
   * history — pixel for pixel identical to somebody who has never written one,
   * over the top of an answer still sitting on the account.
   */
  it("says the read failed rather than showing a blank as though nothing were saved", () => {
    render(<OneThingBox account={account({ current: null, error: "Could not read your one thing" })} />)
    expect(screen.getByTestId("one-thing-read-error")).toHaveTextContent(/not your one thing being gone/)
  })

  it("says nothing of the sort when the read worked and there is simply nothing yet", () => {
    render(<OneThingBox account={account({ current: null })} />)
    expect(screen.queryByTestId("one-thing-read-error")).toBeNull()
    expect(save()).toHaveTextContent("Save this to my account")
  })
})

describe("the countdown carries the day, not just the number of sleeps", () => {
  it("shows the date the person typed on the form", () => {
    render(<OneThingBox account={account()} />)
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
  const tab = (over: Partial<OneThingAccount>) =>
    render(
      <OneThingTab
        plan={emptyNsPlan()}
        account={account({ current: null, ...over })}
        handlers={{
          onAnswer: vi.fn(),
          onAddRequirement: vi.fn(),
          onMarkServes: vi.fn(),
          onRemoveGoal: vi.fn(),
          onGoToTab: vi.fn(),
          onToggleOneThingArea: vi.fn(),
        }}
      />,
    )

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
})
