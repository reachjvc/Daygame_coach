// @vitest-environment jsdom
/**
 * A BULK DELETE EMPTIES THE SELECTION, AND UNDO BRINGS THE ENTRIES BACK UNTICKED.
 *
 * Found by the heavy-user audit of 2026-11-04 (D9), in a real browser on a PC and a
 * phone: after deleting two ticked entries the "2 selected" bar stayed on screen, and
 * after Undo the two came back already ticked — so the next tap on Delete took them
 * again. The selection kept exactly the entries that had just been removed, because
 * the filter that tidies it after a delete was the wrong way round.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useCallback, useState } from "react"
import { afterEach, describe, expect, test } from "vitest"

import { EntryList } from "@/src/timetrack/components/EntryList"
import type { TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)

const NOW_SEC = Math.floor(new Date(2026, 7, 10, 18, 0, 0).getTime() / 1000)

interface Toast {
  text: string
  undo?: () => void
}

function Harness({ initial, toasts }: { initial: TimetrackState; toasts: Toast[] }) {
  const [state, setState] = useState(initial)
  const update = useCallback((updater: (current: TimetrackState) => TimetrackState) => setState(updater), [])
  return (
    <EntryList
      state={state}
      setState={update}
      nowSec={NOW_SEC}
      pushToast={(text, _tone, undo) => toasts.push({ text, undo })}
      onEditEntry={() => {}}
    />
  )
}

function twoEntries() {
  return baseState({
    entries: [
      entry(1, "2026-08-10", "09:00", "10:00", { description: "first" }),
      entry(2, "2026-08-10", "10:00", "11:00", { description: "second" }),
      entry(3, "2026-08-10", "11:00", "12:00", { description: "third" }),
    ],
  })
}

const boxes = () => screen.getAllByRole("checkbox", { name: "Select time entry" }) as HTMLInputElement[]

describe("a bulk delete", () => {
  test("leaves no bar and nothing ticked, and Undo brings the entries back unticked", () => {
    const toasts: Toast[] = []
    render(<Harness initial={twoEntries()} toasts={toasts} />)

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(boxes()[0])
    fireEvent.click(boxes()[1])
    expect(screen.getByText("2 selected")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(toasts.map((t) => t.text)).toContain("2 time entries deleted")
    expect(screen.queryByText(/\d+ selected/), "the bulk bar stayed after its entries were deleted").toBeNull()

    const undo = toasts.find((t) => t.text === "2 time entries deleted")?.undo
    expect(undo, "the delete toast offered no Undo, so this asserts nothing").toBeTruthy()
    act(() => undo!())
    expect(boxes()).toHaveLength(3)
    expect(
      boxes().filter((box) => box.checked).length,
      "the restored entries came back ticked, so the next Delete takes them again",
    ).toBe(0)
    expect(screen.queryByText(/\d+ selected/)).toBeNull()
  })
})
