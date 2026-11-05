// @vitest-environment jsdom
/**
 * PICKING A PROJECT WITH @ OR A TAG WITH # LEAVES ONLY THE WORDS YOU MEANT.
 *
 * Found 2026-11-05 while capturing the screens for the Toggl comparison
 * (Plans/toggl-parity.md, Phase 0): typing "Call @Gy" and picking Gym set the
 * project but left "@Gy" in the box, and the list stayed open, so Enter picked
 * again and never started the timer; the entry was saved as "Call @Gy #adm".
 *
 * The cause: picking first writes the cleaned words ("Call") and then the
 * project, and both copied the draft as it was at the last render. The second
 * copy still held "Call @Gy" and put it back.
 */

import { StrictMode, useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)

afterEach(cleanup)
// jsdom has no layout; the list scrolls its highlighted row into view
Element.prototype.scrollIntoView = () => {}

const blankDraft: EntryDraft = { description: "", projectId: null, taskId: null, tagIds: [], billable: false }

function Harness({ latest, starts }: { latest: { current: TimetrackState; draft: EntryDraft }; starts: { count: number } }) {
  const [state, setState] = useState(latest.current)
  const [draft, setDraft] = useState<EntryDraft>(latest.draft)
  latest.current = state
  latest.draft = draft
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
      onStart={() => {
        starts.count++
      }}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={() => {}}
    />
  )
}

function type(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value, selectionStart: value.length, selectionEnd: value.length } })
}

describe("@ and # in the description, with nothing running", () => {
  test("Enter on @Al sets Alpha and leaves only the words", async () => {
    const latest = { current: baseState({ entries: [] }), draft: blankDraft }
    const starts = { count: 0 }
    render(
      <StrictMode>
        <Harness latest={latest} starts={starts} />
      </StrictMode>,
    )
    const field = screen.getByPlaceholderText("What are you working on?") as HTMLInputElement
    type(field, "Call @Al")
    fireEvent.keyDown(field, { key: "Enter" })

    await waitFor(() => expect(latest.draft.projectId).toBe("30"))
    expect(latest.draft.description.trim()).toBe("Call")
    expect(field.value.trim()).toBe("Call")
    expect(starts.count).toBe(0)
  })

  test("then # picks a tag, and the next Enter starts the timer", async () => {
    const latest = { current: baseState({ entries: [] }), draft: blankDraft }
    const starts = { count: 0 }
    render(
      <StrictMode>
        <Harness latest={latest} starts={starts} />
      </StrictMode>,
    )
    const field = screen.getByPlaceholderText("What are you working on?") as HTMLInputElement
    type(field, "Call @Al")
    fireEvent.keyDown(field, { key: "Tab" })
    await waitFor(() => expect(latest.draft.projectId).toBe("30"))
    type(field, `${field.value}#dee`)
    fireEvent.keyDown(field, { key: "Enter" })
    await waitFor(() => expect(latest.draft.tagIds).toEqual(["50"]))
    expect(latest.draft.projectId).toBe("30")
    expect(field.value.trim()).toBe("Call")
    expect(screen.queryByText(/^TAGS/i)).toBeNull()

    fireEvent.keyDown(field, { key: "Enter" })
    expect(starts.count).toBe(1)
  })
})

describe("@ while a timer runs", () => {
  test("the running entry gets the project and keeps only the words", async () => {
    const running = startTimer(baseState({ entries: [] }), blankDraft, NOW_ISO).state
    const latest = { current: running, draft: blankDraft }
    render(
      <StrictMode>
        <Harness latest={latest} starts={{ count: 0 }} />
      </StrictMode>,
    )
    const field = screen.getByPlaceholderText("What are you working on?") as HTMLInputElement
    type(field, "Call @Al")
    fireEvent.keyDown(field, { key: "Enter" })
    fireEvent.blur(field)

    await waitFor(() => expect(runningEntry(latest.current)!.projectId).toBe("30"))
    await waitFor(() => expect(runningEntry(latest.current)!.description.trim()).toBe("Call"))
    expect(field.value.trim()).toBe("Call")
  })
})
