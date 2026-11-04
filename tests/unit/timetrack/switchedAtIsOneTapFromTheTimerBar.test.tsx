// @vitest-environment jsdom
/**
 * SWITCHED AT… IS ON THE TIMER BAR, WHERE THE FORGOTTEN TIMER IS (Phase 4, item 1).
 *
 * The bar's own description box belongs to the entry that is running: typing
 * in it renames that entry (`editsReachTheRunningEntry`). So the next thing is
 * typed in a box of its own under it, and the moment it holds a word, Switched
 * at… appears beside it. The ⋮ menu offers the same picker with nothing typed.
 * With nothing running, the bar's description IS the next thing, and the same
 * picker is offered as Started at…, with the chip that fills the gap.
 *
 * The story is the plan's own "What a day looks like": Deep work from 09:00,
 * Email from 11:55, noticed at 14:30.
 */

import { useCallback, useState } from "react"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { TimerBar } from "@/src/timetrack/components/TimerBar"
import { epochSeconds } from "@/src/timetrack/timetrackFormatService"
import { draftOf, emptyDraft, liveEntries, runningEntry, startTimer } from "@/src/timetrack/timetrackService"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

const at = (day: number, h: number, m = 0, s = 0) => new Date(2026, 10, day, h, m, s, 0).toISOString()
const NOW = at(4, 14, 30)

type Latest = { current: TimetrackState }

function Bar({ initial, latest, pushToast, initialDraft }: { initial: TimetrackState; latest: Latest; pushToast: () => void; initialDraft?: EntryDraft }) {
  const [state, setState] = useState(initial)
  latest.current = state
  const running = runningEntry(state)
  const [draft, setDraft] = useState<EntryDraft>(initialDraft ?? (running ? draftOf(running) : emptyDraft))
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState((current) => updater(current)), [])
  const nowSec = epochSeconds(NOW)
  return (
    <TimerBar
      state={state}
      setState={update}
      draft={draft}
      setDraft={setDraft}
      mode="timer"
      setMode={() => {}}
      running={running}
      runningSeconds={running ? nowSec - epochSeconds(running.start) : 0}
      nowSec={nowSec}
      onStart={() => {}}
      onStop={() => {}}
      onEditEntry={() => {}}
      pushToast={pushToast}
    />
  )
}

function deepWorkSinceNine(): TimetrackState {
  return startTimer(baseState(), { ...emptyDraft, description: "Deep work" }, at(4, 9, 0)).state
}

function open(initial: TimetrackState, initialDraft?: EntryDraft) {
  const latest: Latest = { current: initial }
  const pushToast = vi.fn()
  render(<Bar initial={initial} latest={latest} pushToast={pushToast} initialDraft={initialDraft} />)
  return { latest, pushToast }
}

const dialog = (name: string) => within(screen.getByRole("dialog", { name }))

function typeTime(scope: ReturnType<typeof dialog>, text: string) {
  const box = scope.getByLabelText("Time") as HTMLInputElement
  fireEvent.focus(box)
  fireEvent.change(box, { target: { value: text } })
  fireEvent.blur(box)
  return box
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("with a timer running", () => {
  test("typing the next thing shows Switched at…, and does not rename the running entry", () => {
    const { latest } = open(deepWorkSinceNine())
    expect(screen.queryByRole("button", { name: "Switched at…" })).toBeNull()

    fireEvent.change(screen.getByLabelText("Next entry"), { target: { value: "Email" } })

    expect(screen.getByRole("button", { name: "Switched at…" })).toBeInTheDocument()
    expect(runningEntry(latest.current)?.description).toBe("Deep work")
  })

  test("the day's story: at 14:30, Email, Switched at… 11:55 — Deep work ends 11:55 and Email runs from 11:55", () => {
    const { latest, pushToast } = open(deepWorkSinceNine())
    fireEvent.change(screen.getByLabelText("Next entry"), { target: { value: "Email" } })
    fireEvent.click(screen.getByRole("button", { name: "Switched at…" }))

    const picker = dialog("Switched at…")
    expect((picker.getByLabelText("Time") as HTMLInputElement).value, "the picker opens at now").toBe("14:30")
    expect((picker.getByLabelText("Switched to") as HTMLInputElement).value).toBe("Email")
    expect(typeTime(picker, "1155").value).toBe("11:55")
    fireEvent.click(picker.getByRole("button", { name: "Switch at 11:55" }))

    const deep = latest.current.entries.find((e) => e.description === "Deep work")!
    const email = runningEntry(latest.current)!
    expect(deep.stop).toBe(at(4, 11, 55))
    expect(email.description).toBe("Email")
    expect(email.start).toBe(at(4, 11, 55))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(pushToast).toHaveBeenCalledWith("“Deep work” ended at 11:55 and “Email” started then", "info", expect.any(Function))

    // one Undo for the one change
    const undo = pushToast.mock.calls.at(-1)![2] as () => void
    act(() => undo())
    expect(liveEntries(latest.current)).toHaveLength(1)
    expect(runningEntry(latest.current)?.description).toBe("Deep work")
  })

  test("−5 three times is 14:15, and +1 makes it 14:16", () => {
    const { latest } = open(deepWorkSinceNine())
    fireEvent.change(screen.getByLabelText("Next entry"), { target: { value: "Email" } })
    fireEvent.click(screen.getByRole("button", { name: "Switched at…" }))
    const picker = dialog("Switched at…")

    for (let i = 0; i < 3; i++) fireEvent.click(picker.getByRole("button", { name: "5 minutes earlier" }))
    expect((picker.getByLabelText("Time") as HTMLInputElement).value).toBe("14:15")
    fireEvent.click(picker.getByRole("button", { name: "1 minute later" }))
    fireEvent.click(picker.getByRole("button", { name: "Switch at 14:16" }))

    expect(runningEntry(latest.current)!.start).toBe(at(4, 14, 16))
  })

  test("a chip sets the moment: 1 h ago is 13:30", () => {
    open(deepWorkSinceNine())
    fireEvent.change(screen.getByLabelText("Next entry"), { target: { value: "Email" } })
    fireEvent.click(screen.getByRole("button", { name: "Switched at…" }))
    const picker = dialog("Switched at…")

    fireEvent.click(picker.getByRole("button", { name: "1 h ago" }))

    expect((picker.getByLabelText("Time") as HTMLInputElement).value).toBe("13:30")
    expect(picker.getByRole("button", { name: "Switch at 13:30" })).toBeInTheDocument()
  })

  test("a moment before the start is refused in the picker, and the button waits", () => {
    const { latest } = open(deepWorkSinceNine())
    fireEvent.change(screen.getByLabelText("Next entry"), { target: { value: "Email" } })
    fireEvent.click(screen.getByRole("button", { name: "Switched at…" }))
    const picker = dialog("Switched at…")

    typeTime(picker, "0800")

    expect(picker.getByText("That is before “Deep work” started at 09:00")).toBeInTheDocument()
    expect(picker.getByRole("button", { name: "Switch at 08:00" })).toBeDisabled()
    expect(runningEntry(latest.current)?.description).toBe("Deep work")
  })

  test("the ⋮ menu opens it with nothing typed, and the picker asks what you switched to", () => {
    const { latest } = open(deepWorkSinceNine())

    fireEvent.click(screen.getByRole("button", { name: "More timer actions" }))
    fireEvent.click(screen.getByRole("button", { name: "Switched at…" }))
    const picker = dialog("Switched at…")
    expect((picker.getByLabelText("Switched to") as HTMLInputElement).value).toBe("")
    fireEvent.change(picker.getByLabelText("Switched to"), { target: { value: "Email" } })
    typeTime(picker, "1155")
    fireEvent.click(picker.getByRole("button", { name: "Switch at 11:55" }))

    expect(runningEntry(latest.current)?.description).toBe("Email")
    expect(runningEntry(latest.current)?.start).toBe(at(4, 11, 55))
  })
})

describe("with nothing running", () => {
  test("a typed description offers Started at…, and its gap chip starts it where the last entry ended", () => {
    const finished = { ...entry("deep", "2026-11-04", "09:00", "11:55", { description: "Deep work" }), stop: at(4, 11, 55, 40) }
    const { latest, pushToast } = open(baseState({ entries: [finished] }), { ...emptyDraft, description: "Email" })

    fireEvent.click(screen.getByRole("button", { name: "Started at…" }))
    const picker = dialog("Started at…")
    fireEvent.click(picker.getByRole("button", { name: "When the last entry ended" }))
    fireEvent.click(picker.getByRole("button", { name: "Start at 11:55" }))

    const email = runningEntry(latest.current)!
    expect(email.description).toBe("Email")
    expect(email.start, "a typed 11:55 would have left a 40-second overlap").toBe(at(4, 11, 55, 40))
    expect(pushToast).toHaveBeenCalledWith("Started “Email” at 11:55", "info", expect.any(Function))
  })

  test("with nothing typed, Started at… is not offered", () => {
    open(baseState())
    expect(screen.queryByRole("button", { name: "Started at…" })).toBeNull()
  })
})
