// @vitest-environment jsdom
/**
 * THE PC MANUAL BAR: A TIME BOX SELECTS WHAT IT HOLDS, AND THE BAR SHOWS THE LENGTH.
 *
 * Found 2026-11-05 by a findability check (Plans/toggl-parity.md, Phase 5): a new
 * user clicked the start box (it said 08:50) and typed "9:00", and got
 * "089:00:50", because the click left the cursor in the middle of the old time.
 * And nothing on the bar said how long the entry would be before "+", so there
 * was no way to check 9:00 → 9:45 was 45 minutes. A click on a time now selects
 * it, as the list's time boxes already do, and the length shows beside the end.
 */

import { StrictMode, useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)
afterEach(cleanup)

const blankDraft: EntryDraft = { description: "", projectId: null, taskId: null, tagIds: [], billable: false }

function Harness() {
  const [state, setState] = useState<TimetrackState>(baseState({ entries: [] }))
  const [draft, setDraft] = useState<EntryDraft>(blankDraft)
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState((c) => updater(c)), [])
  return (
    <TimerBar
      state={state}
      setState={update}
      draft={draft}
      setDraft={setDraft}
      mode="manual"
      setMode={() => {}}
      running={null}
      runningSeconds={0}
      nowSec={NOW_SEC}
      onStart={() => {}}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={() => {}}
    />
  )
}

describe("the manual bar", () => {
  test("a click on the start box selects the time it holds", () => {
    render(<StrictMode><Harness /></StrictMode>)
    const start = screen.getByLabelText("Start time") as HTMLInputElement
    fireEvent.focus(start)
    expect(start.selectionStart).toBe(0)
    expect(start.selectionEnd).toBe(start.value.length)
  })

  test("a click on the end box selects it too", () => {
    render(<StrictMode><Harness /></StrictMode>)
    const end = screen.getByLabelText("End time") as HTMLInputElement
    fireEvent.focus(end)
    expect(end.selectionStart).toBe(0)
    expect(end.selectionEnd).toBe(end.value.length)
  })

  test("shows how long the entry will be", () => {
    render(<StrictMode><Harness /></StrictMode>)
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "9:00" } })
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "9:45" } })
    expect(screen.getByLabelText("Length").textContent).toBe("0:45")
  })
})
