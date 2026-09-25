/**
 * THE BUG THIS SLICE SHIPPED FOR AS LONG AS THE TIMER BAR HAS EXISTED.
 *
 * The bar wrote to the draft — the thing a *future* entry is built from — and
 * nothing ever wrote the draft back onto the entry that was already running. So
 * the natural order of work on a phone (press Start when you begin, say what
 * you are doing once you have begun) was the order in which everything you
 * entered was shown back to you and then discarded. Reproduced in a browser
 * before the fix: description, project, tag and billable all set after Start,
 * all four absent from the saved entry, which read "(no description) · No
 * project".
 *
 * The detail sheet lost work the same way for a different reason: its text
 * fields were staged behind a button called "Save times", so closing the sheet
 * threw the description away without saying so.
 *
 * These tests are the ones that fail when the next control added to either
 * surface forgets. The service-level half pins the rule; the rendered half
 * proves the controls are actually wired to it.
 */

import { StrictMode, useCallback, useState } from "react"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"

import { EntryDetailModalBody } from "@/src/timetrack/components/EntryList"
import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { applyDraftPatch, runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

const NOW_SEC = epochSeconds(NOW_ISO)

afterEach(cleanup)

const blankDraft: EntryDraft = {
  description: "",
  projectId: null,
  taskId: null,
  tagIds: [],
  billable: false,
}

/** A workspace with a timer already running and nothing filled in yet */
function runningState(): TimetrackState {
  return startTimer(baseState({ entries: [] }), blankDraft, NOW_ISO).state
}

// ---------------------------------------------------------------------------
// The rule itself
// ---------------------------------------------------------------------------

describe("applyDraftPatch decides where an edit goes", () => {
  test("with nothing running, it moves the draft and leaves the workspace alone", () => {
    const before = baseState({ entries: [] })
    const result = applyDraftPatch(before, blankDraft, { projectId: "30" }, NOW_ISO)

    expect(result.draft.projectId).toBe("30")
    expect(result.state).toBe(before)
  })

  test("with a timer running, the edit reaches THE ENTRY, not just the draft", () => {
    const before = runningState()
    const result = applyDraftPatch(
      before,
      blankDraft,
      { description: "morning pages", projectId: "30", tagIds: ["50"], billable: true },
      NOW_ISO,
    )

    const entry = runningEntry(result.state)!
    expect(entry.description).toBe("morning pages")
    expect(entry.projectId).toBe("30")
    expect(entry.tagIds).toEqual(["50"])
    expect(entry.billable).toBe(true)
    // and the bar keeps showing the same thing the entry now holds
    expect(result.draft).toMatchObject({ description: "morning pages", projectId: "30", billable: true })
  })

  test("a refused edit moves neither — the bar never shows what was not kept", () => {
    const before = startTimer(
      baseState({
        entries: [],
        workspace: {
          ...baseState().workspace,
          requiredFields: { project: true, task: false, tag: false, description: false },
        },
      }),
      { ...blankDraft, projectId: "30" },
      NOW_ISO,
    ).state

    const result = applyDraftPatch(before, { ...blankDraft, projectId: "30" }, { projectId: null }, NOW_ISO)

    expect(result.violations.length).toBeGreaterThan(0)
    expect(result.state).toBe(before)
    expect(result.draft.projectId).toBe("30")
    expect(runningEntry(result.state)!.projectId).toBe("30")
  })
})

// ---------------------------------------------------------------------------
// The controls are actually wired to it
// ---------------------------------------------------------------------------

function TimerBarHarness({ latest }: { latest: { current: TimetrackState } }) {
  const [state, setState] = useState(latest.current)
  const [draft, setDraft] = useState<EntryDraft>(blankDraft)
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

describe("the timer bar, while a timer is running", () => {
  test("picking a project puts it on the running entry", async () => {
    const latest = { current: runningState() }
    render(
      <StrictMode>
        <TimerBarHarness latest={latest} />
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Project" }))
    fireEvent.click(await screen.findByRole("button", { name: /Alpha/ }))

    await waitFor(() => expect(runningEntry(latest.current)!.projectId).toBe("30"))
  })

  test("typing a description puts it on the running entry once you pause", async () => {
    const latest = { current: runningState() }
    render(
      <StrictMode>
        <TimerBarHarness latest={latest} />
      </StrictMode>,
    )

    fireEvent.change(screen.getByPlaceholderText("What are you working on?"), {
      target: { value: "morning pages" },
    })

    await waitFor(() => expect(runningEntry(latest.current)!.description).toBe("morning pages"))
  })

  test("a description still lands if you leave the field before the pause is up", async () => {
    const latest = { current: runningState() }
    render(
      <StrictMode>
        <TimerBarHarness latest={latest} />
      </StrictMode>,
    )

    const field = screen.getByPlaceholderText("What are you working on?")
    fireEvent.change(field, { target: { value: "half typed" } })
    fireEvent.blur(field)

    await waitFor(() => expect(runningEntry(latest.current)!.description).toBe("half typed"))
  })

  test("the billable toggle reaches the running entry", async () => {
    const latest = { current: runningState() }
    render(
      <StrictMode>
        <TimerBarHarness latest={latest} />
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Non-billable" }))

    await waitFor(() => expect(runningEntry(latest.current)!.billable).toBe(true))
  })
})

describe("a refused edit", () => {
  /**
   * Found by reading the fix back rather than by running it: the create-then-
   * select path hands `edit` a state that already contains the new project, so
   * an early return on violation dropped the project as well as the selection.
   */
  test("keeps a project that was just created, even though the selection is refused", async () => {
    const needsATask = baseState({
      entries: [],
      workspace: {
        ...baseState().workspace,
        requiredFields: { project: false, task: true, tag: false, description: false },
      },
    })
    /**
     * The timer has to be RUNNING and VALID for this path to exist, so it
     * starts on a real task. Picking a different project then clears the task,
     * which is what the workspace refuses — and the refusal is what used to
     * take the new project with it.
     *
     * The first version of this test started the timer with no task at all.
     * `startTimer` validates too, so nothing started, `applyDraftPatch` took
     * its no-timer branch, and the test passed by never reaching the code it
     * was written for — with and without the fix.
     */
    const started = startTimer(needsATask, { ...blankDraft, projectId: "30", taskId: "40" }, NOW_ISO)
    expect(started.violations, "the fixture never started a timer").toEqual([])
    const latest = { current: started.state }
    render(
      <StrictMode>
        <TimerBarHarness latest={latest} />
      </StrictMode>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Project" }))
    fireEvent.change(await screen.findByPlaceholderText(/Search or add a project/), {
      target: { value: "Writing" },
    })
    fireEvent.click(await screen.findByRole("button", { name: /Create/ }))

    await waitFor(() =>
      expect(latest.current.projects.map((p) => p.name), "the new project went with the refusal").toContain("Writing"),
    )
    // the selection itself was refused, so the entry keeps the task it had
    expect(runningEntry(latest.current)!.taskId).toBe("40")
  })
})

// ---------------------------------------------------------------------------
// The detail sheet
// ---------------------------------------------------------------------------

function SheetHarness({ latest, open }: { latest: { current: TimetrackState }; open: boolean }) {
  const [state, setState] = useState(latest.current)
  latest.current = state
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => {
    setState((current) => updater(current))
  }, [])

  if (!open) return null
  return (
    <EntryDetailModalBody
      entry={state.entries[0]}
      state={state}
      setState={update}
      pushToast={() => {}}
    />
  )
}

describe("the entry detail sheet", () => {
  test("has no save button — an edit is saved when it is made", () => {
    const latest = { current: runningState() }
    render(<SheetHarness latest={latest} open />)

    expect(screen.queryByRole("button", { name: /save/i })).toBeNull()
  })

  test("a description typed here survives closing the sheet straight away", async () => {
    const latest = { current: runningState() }
    const { rerender } = render(<SheetHarness latest={latest} open />)

    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "a description I definitely typed" },
    })
    // closed inside the pause: only the unmount flush can save this
    rerender(<SheetHarness latest={latest} open={false} />)

    await waitFor(() =>
      expect(latest.current.entries[0].description).toBe("a description I definitely typed"),
    )
  })
})
