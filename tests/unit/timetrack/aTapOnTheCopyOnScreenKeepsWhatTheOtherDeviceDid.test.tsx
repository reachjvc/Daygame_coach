// @vitest-environment jsdom
/**
 * A TAP ON THE COPY ON SCREEN KEEPS WHAT THE OTHER DEVICE DID MEANWHILE.
 *
 * The same flaw as `aRenameTypedWhileTheOtherDeviceStopsKeepsTheStop`, in every
 * other tap that was worked out on the workspace the page last drew and then
 * written back whole (`setState(() => result.state)`). Waking the phone hands
 * the account's answer over a moment before it is drawn; a tap in that moment
 * put the drawn copy back over it. A project picked in the timer bar started
 * the call again that the PC had stopped; a Continue in the list, or a Start,
 * undid the PC's rename. The sync engine then sent that back up as this
 * device's own edit, so the account lost the other device's change as well.
 *
 * Each case draws one copy and hands the write a newer one, which is exactly
 * where the answer waits. Every tap now writes through `layOnto` (see
 * `tabMergeService`), which lays only what the tap changed onto the newer copy.
 */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { STORAGE_KEY } from "@/src/timetrack/config"
import { useTimetrack } from "@/src/timetrack/hooks/useTimetrack"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { runningEntry, startTimer, stopTimer, updateEntry } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { NOW_ISO, baseState } from "./helpers"

const at = (h: number, m = 0) => new Date(2026, 7, 10, h, m).toISOString()
const NOW_SEC = epochSeconds(NOW_ISO)
const draftOf = (description: string): EntryDraft => ({ description, projectId: null, taskId: null, tagIds: [], billable: false })

/** "Call", running since nine: what the phone drew */
function callRunning(): { state: TimetrackState; id: string } {
  const started = startTimer(baseState({ entries: [] }), draftOf("Call"), at(9))
  return { state: started.state, id: started.entry.id }
}

/** "Call", 09:00–10:00, finished */
function callFinished(): { state: TimetrackState; id: string } {
  const { state, id } = callRunning()
  return { state: stopTimer(state, at(10)).state, id }
}

/** A `setState` whose updater meets `newer`: the answer handed over and not drawn yet */
function writesOnto(newer: TimetrackState) {
  const written = { current: newer }
  const setState = (updater: (current: TimetrackState) => TimetrackState) => {
    written.current = updater(written.current)
  }
  return { written, setState }
}

function timerBarOn(drawn: TimetrackState, setState: (updater: (current: TimetrackState) => TimetrackState) => void) {
  const running = runningEntry(drawn)
  render(
    <TimerBar
      state={drawn}
      setState={setState}
      draft={draftOf(running?.description ?? "")}
      setDraft={() => {}}
      mode="timer"
      setMode={() => {}}
      running={running}
      runningSeconds={0}
      nowSec={NOW_SEC}
      onStart={() => {}}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={() => {}}
    />,
  )
}

beforeEach(() => window.localStorage.clear())

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("the timer bar, picking on a copy the PC has stopped meanwhile", () => {
  test("a billable flip does not start the call again", () => {
    const { state: drawn, id } = callRunning()
    const { written, setState } = writesOnto(stopTimer(drawn, at(11)).state)
    timerBarOn(drawn, setState)

    fireEvent.click(screen.getByRole("button", { name: "Non-billable" }))

    const call = written.current.entries.find((e) => e.id === id)!
    expect(call.stop, "the flip started the call again that the PC had stopped").toBe(at(11))
    expect(call.billable, "the flip itself was lost").toBe(true)
  })

  test("a project picked does not start the call again", async () => {
    const { state: drawn, id } = callRunning()
    const { written, setState } = writesOnto(stopTimer(drawn, at(11)).state)
    timerBarOn(drawn, setState)

    fireEvent.click(screen.getByRole("button", { name: "Project" }))
    fireEvent.click(await screen.findByRole("button", { name: /Alpha/ }))

    await waitFor(() => expect(written.current.entries.find((e) => e.id === id)!.projectId).toBe("30"))
    expect(written.current.entries.find((e) => e.id === id)!.stop, "the pick started the call again").toBe(at(11))
  })

  test("a project created in the picker is kept, and so is the stop", async () => {
    const { state: drawn, id } = callRunning()
    const { written, setState } = writesOnto(stopTimer(drawn, at(11)).state)
    timerBarOn(drawn, setState)

    fireEvent.click(screen.getByRole("button", { name: "Project" }))
    fireEvent.change(await screen.findByPlaceholderText(/Search or add a project/), { target: { value: "Writing" } })
    fireEvent.click(await screen.findByRole("button", { name: /Create/ }))

    await waitFor(() =>
      expect(written.current.projects.map((p) => p.name), "the new project was lost").toContain("Writing"),
    )
    expect(written.current.entries.find((e) => e.id === id)!.stop, "creating a project started the call again").toBe(at(11))
  })
})

describe("the entry list, on a copy the PC has renamed meanwhile", () => {
  test("Continue keeps the PC's rename of the entry it continues", () => {
    const { state: drawn, id } = callFinished()
    const { written, setState } = writesOnto(updateEntry(drawn, id, { description: "Call with Ana" }, NOW_ISO).state)
    render(<EntryList state={drawn} setState={setState} nowSec={NOW_SEC} pushToast={() => {}} onEditEntry={() => {}} />)

    fireEvent.click(screen.getAllByRole("button", { name: "Continue this entry" })[0])

    expect(written.current.entries.some((e) => runningEntry(written.current)?.id === e.id), "nothing was continued").toBe(true)
    expect(written.current.entries.find((e) => e.id === id)!.description, "Continue undid the PC's rename").toBe(
      "Call with Ana",
    )
  })
})

describe("the tracker's own Start, before the account's answer is drawn", () => {
  test("keeps the PC's rename of the timer it ends", async () => {
    const { state: drawn, id } = callRunning()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drawn))
    const hook = renderHook(() => useTimetrack())
    await waitFor(() => expect(hook.result.current.state).not.toBeNull())
    const answer = updateEntry(hook.result.current.state!, id, { description: "Call with Ana" }, NOW_ISO).state

    act(() => {
      // the check's answer is handed over, and the tap lands before it is drawn
      const tracker = hook.result.current
      tracker.actions.replaceState(answer)
      tracker.actions.start(draftOf("Email"))
    })

    const after = hook.result.current.state!
    expect(runningEntry(after)?.description, "the Start was lost").toBe("Email")
    expect(after.entries.find((e) => e.id === id)!.description, "the Start undid the PC's rename").toBe("Call with Ana")
  })
})
