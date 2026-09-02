/**
 * Guards the bug class that has now bitten three times in this slice:
 * composing two state updates in one handler, each computed from the same
 * (stale) render snapshot, so the second silently overwrites the first.
 *
 * These render in <StrictMode>, which double-invokes state updaters — the same
 * condition that turned a side effect inside an updater into duplicate toasts.
 */

import { StrictMode, useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody, EntryList } from "@/src/timetrack/components/EntryList"
import { TagPicker } from "@/src/timetrack/components/pickers"
import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { emptyDraft, runningEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState, entry } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)

afterEach(cleanup)

/** A workspace with one entry of your own and nothing else — the real first-run case */
function freshState(overrides: Partial<TimetrackState> = {}): TimetrackState {
  return baseState({
    projects: [],
    tasks: [],
    tags: [],
    clients: [],
    entries: [entry(1, "2026-08-10", "09:00", "10:00", { projectId: null, tagIds: [] })],
    ...overrides,
  })
}

function EntryListHarness({
  initial,
  latest,
  pushToast,
}: {
  initial: TimetrackState
  latest: { current: TimetrackState }
  pushToast: (text: string, tone?: "info" | "error") => void
}) {
  const [state, setState] = useState(initial)
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
    setState((current) => updater(current))
  }, [])

  return (
    <EntryList state={state} setState={update} nowSec={NOW_SEC} pushToast={pushToast} onEditEntry={() => {}} />
  )
}

function TimerBarHarness({ initial, latest }: { initial: TimetrackState; latest: { current: TimetrackState } }) {
  const [state, setState] = useState(initial)
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft)
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
    setState((current) => updater(current))
  }, [])

  return (
    <TimerBar
      state={state}
      setState={update}
      draft={draft}
      setDraft={setDraft}
      mode="timer"
      setMode={() => {}}
      running={runningEntry(state)}
      runningSeconds={0}
      nowSec={NOW_SEC}
      onStart={() => {}}
      onStop={() => {}}
      pushToast={() => {}}
    />
  )
}

/** Both the phone and pointer layouts render in jsdom, so take the first match */
const firstButton = (name: RegExp | string) => screen.getAllByRole("button", { name })[0]

/**
 * The pointer-device row, which carries the pickers. Scoping matters once a tag
 * exists: its name then also matches the phone row's tap area.
 */
const pointerRow = () => document.querySelector<HTMLElement>("ul.divide-y > li div.hidden")!

async function createFromPicker(trigger: HTMLElement, placeholder: RegExp, value: string) {
  fireEvent.click(trigger)
  const search = await screen.findByPlaceholderText(placeholder)
  fireEvent.change(search, { target: { value } })
  fireEvent.click(await screen.findByRole("button", { name: /Create/ }))
}

describe("creating an entity from an entry row keeps it and the link", () => {
  test("a new tag is saved, not just referenced", async () => {
    const latest = { current: freshState() }
    render(
      <StrictMode>
        <EntryListHarness initial={latest.current} latest={latest} pushToast={() => {}} />
      </StrictMode>,
    )

    await createFromPicker(firstButton("Tags"), /Search or add a tag/, "focus")

    await waitFor(() => expect(latest.current.tags).toHaveLength(1))
    const tag = latest.current.tags[0]
    expect(tag.name).toBe("focus")
    // the entry must point at a tag that actually exists
    expect(latest.current.entries[0].tagIds).toEqual([tag.id])
  })

  test("a new project is saved, not just referenced", async () => {
    const latest = { current: freshState() }
    render(
      <StrictMode>
        <EntryListHarness initial={latest.current} latest={latest} pushToast={() => {}} />
      </StrictMode>,
    )

    await createFromPicker(firstButton("Project"), /Search or add a project/, "Book")

    await waitFor(() => expect(latest.current.projects).toHaveLength(1))
    const project = latest.current.projects[0]
    expect(project.name).toBe("Book")
    expect(latest.current.entries[0].projectId).toBe(project.id)
  })

  test("creating twice keeps both, rather than the second replacing the first", async () => {
    const latest = { current: freshState() }
    render(
      <StrictMode>
        <EntryListHarness initial={latest.current} latest={latest} pushToast={() => {}} />
      </StrictMode>,
    )

    await createFromPicker(firstButton("Tags"), /Search or add a tag/, "focus")
    await waitFor(() => expect(latest.current.tags).toHaveLength(1))
    await createFromPicker(
      within(pointerRow()).getByRole("button", { name: /focus/ }),
      /Search or add a tag/,
      "deep work",
    )

    await waitFor(() => expect(latest.current.tags).toHaveLength(2))
    expect(latest.current.tags.map((t) => t.name).sort()).toEqual(["deep work", "focus"])
    expect(latest.current.entries[0].tagIds).toHaveLength(2)
    for (const id of latest.current.entries[0].tagIds) {
      expect(latest.current.tags.some((t) => t.id === id)).toBe(true)
    }
  })
})

describe("creating an entity from the timer bar keeps it", () => {
  test("the tag is saved and selected on the draft", async () => {
    const latest = { current: freshState() }
    render(
      <StrictMode>
        <TimerBarHarness initial={latest.current} latest={latest} />
      </StrictMode>,
    )

    await createFromPicker(firstButton("Tags"), /Search or add a tag/, "admin")

    await waitFor(() => expect(latest.current.tags).toHaveLength(1))
    expect(latest.current.tags[0].name).toBe("admin")
    // the draft shows it, so starting the timer would carry it
    await waitFor(() => expect(screen.getAllByText(/admin/)[0]).toBeTruthy())
  })
})

describe("side effects stay out of state updaters", () => {
  test("one validation failure produces exactly one toast", async () => {
    const pushToast = vi.fn()
    const state = freshState()
    state.workspace.requiredFields = { ...state.workspace.requiredFields, description: true }
    const latest = { current: state }

    render(
      <StrictMode>
        <EntryListHarness initial={state} latest={latest} pushToast={pushToast} />
      </StrictMode>,
    )

    const description = screen.getAllByPlaceholderText("(no description)")[0]
    fireEvent.change(description, { target: { value: "" } })
    fireEvent.blur(description)

    await waitFor(() => expect(pushToast).toHaveBeenCalled())
    // StrictMode runs updaters twice: a toast fired from inside one would double
    expect(pushToast).toHaveBeenCalledTimes(1)
    expect(pushToast.mock.calls[0][0]).toMatch(/Description is required/)
  })
})

describe("the picker itself", () => {
  /**
   * The day card clips its own overflow (rounded corners), so a panel rendered
   * inside it was cut off at the card edge — the tag list simply did not appear
   * on the last row of a day. Panels belong to <body>, not to the card.
   */
  test("its panel is not rendered inside the day card, which clips overflow", async () => {
    const latest = { current: freshState() }
    render(
      <StrictMode>
        <EntryListHarness initial={latest.current} latest={latest} pushToast={() => {}} />
      </StrictMode>,
    )

    fireEvent.click(firstButton("Tags"))
    const search = await screen.findByPlaceholderText(/Search or add a tag/)
    const panel = search.closest("[data-dropdown-panel]")
    expect(panel).toBeTruthy()
    expect(panel!.closest("section")).toBeNull()
    expect(panel!.parentElement).toBe(document.body)
  })

  /**
   * A panel is hidden until it has been measured against its trigger. Opening
   * on mount happens before the portal exists, so the measurement has to wait
   * for it — measuring once, finding nothing and never retrying left the panel
   * in the DOM but permanently invisible.
   */
  test("one opened on mount is measured and shown, not left hidden", async () => {
    const state = baseState({ tags: [], projects: [], tasks: [], clients: [], entries: [] })
    render(
      <StrictMode>
        <TagPicker state={state} tagIds={[]} onChange={() => {}} autoOpen />
      </StrictMode>,
    )

    const search = await screen.findByPlaceholderText(/Search or add a tag/)
    const panel = search.closest("[data-dropdown-panel]") as HTMLElement
    expect(panel).toBeTruthy()
    expect(panel.style.opacity).not.toBe("0")
  })

  test("says how to add the first one instead of only offering search", async () => {
    const latest = { current: freshState() }
    render(
      <StrictMode>
        <EntryListHarness initial={latest.current} latest={latest} pushToast={() => {}} />
      </StrictMode>,
    )

    fireEvent.click(firstButton("Tags"))
    const panel = await screen.findByPlaceholderText(/Search or add a tag/)
    expect(within(panel.closest("div")!.parentElement!).getByText(/No tags yet/)).toBeTruthy()
  })
})

/**
 * The detail sheet showed `entry.start.slice(0, 16)` — the *UTC* wall clock —
 * in a datetime-local input, which reads its value as local time. East of
 * Greenwich a 12:00 entry appeared as 10:00, and "Save times" moved it there.
 */
describe("entry detail sheet times", () => {
  function DetailHarness({ initial, latest }: { initial: TimetrackState; latest: { current: TimetrackState } }) {
    const [state, setState] = useState(initial)
    latest.current = state
    const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
      setState((current) => updater(current))
    }, [])
    return (
      <EntryDetailModalBody entry={state.entries[0]} state={state} setState={update} pushToast={() => {}} />
    )
  }

  test("shows the entry at the time the list shows, and saving leaves it there", async () => {
    const initial = freshState({ entries: [entry(1, "2026-08-10", "12:00", "13:30", { projectId: null, tagIds: [] })] })
    const latest = { current: initial }
    render(
      <StrictMode>
        <DetailHarness initial={initial} latest={latest} />
      </StrictMode>,
    )

    const startInput = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[0]
    expect(startInput.value).toBe("2026-08-10T12:00")

    const before = latest.current.entries[0].start
    fireEvent.click(screen.getByRole("button", { name: /Save times/i }))
    await waitFor(() => {
      expect(latest.current.entries[0].start).toBe(before)
    })
  })

  test("an edited time is stored as that local time", async () => {
    const initial = freshState({ entries: [entry(1, "2026-08-10", "12:00", "13:30", { projectId: null, tagIds: [] })] })
    const latest = { current: initial }
    render(
      <StrictMode>
        <DetailHarness initial={initial} latest={latest} />
      </StrictMode>,
    )

    const startInput = document.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]')[0]
    fireEvent.change(startInput, { target: { value: "2026-08-10T09:15" } })
    fireEvent.click(screen.getByRole("button", { name: /Save times/i }))

    await waitFor(() => {
      const saved = new Date(latest.current.entries[0].start)
      expect(saved.getHours()).toBe(9)
      expect(saved.getMinutes()).toBe(15)
    })
  })
})
