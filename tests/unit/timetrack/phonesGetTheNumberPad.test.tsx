// @vitest-environment jsdom
/**
 * EVERY BOX THAT TAKES A TIME OPENS THE NUMBER PAD ON A PHONE (plan D11).
 *
 * The start, end and duration boxes had no `inputMode`, so the phone showed the
 * full letter keyboard for typing "1155". Start and end get the number pad
 * ("1155" is 11:55, "930" is 9:30); a duration gets the decimal pad, because
 * "1.5" is an hour and a half.
 *
 * Checked in every place the boxes are drawn: the timer bar in both modes, the
 * entry list's row, and the detail sheet.
 */

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { EntryDetailModalBody, EntryList } from "@/src/timetrack/components/EntryList"
import { TimerBar, type TimerMode } from "@/src/timetrack/components/TimerBar"
import type { EntryDraft, TimetrackState } from "@/src/timetrack/types"

import { baseState, entry } from "./helpers"

afterEach(cleanup)

const draft: EntryDraft = { description: "", projectId: null, taskId: null, tagIds: [], billable: false }
const withEntry = (): TimetrackState => baseState({ entries: [entry(1, "2026-11-03", "10:00", "11:00")] })

function bar(mode: TimerMode) {
  return render(
    <TimerBar
      state={withEntry()}
      setState={vi.fn()}
      draft={draft}
      setDraft={vi.fn()}
      mode={mode}
      setMode={vi.fn()}
      running={null}
      runningSeconds={0}
      nowSec={0}
      onStart={vi.fn()}
      onStop={vi.fn()}
      onEditEntry={vi.fn()}
      pushToast={vi.fn()}
    />,
  )
}

function keypads(container: HTMLElement) {
  const pad = (label: string) => {
    const box = container.querySelector(`input[aria-label="${label}"]`)
    expect(box, `no "${label}" box here, so this asserts nothing`).toBeTruthy()
    return box!.getAttribute("inputmode")
  }
  return { pad }
}

describe("the number pad", () => {
  test("on the timer bar's duration box", () => {
    expect(keypads(bar("timer").container).pad("Duration")).toBe("decimal")
  })

  test("on manual mode's start and end", () => {
    const { pad } = keypads(bar("manual").container)
    expect(pad("Start time")).toBe("numeric")
    expect(pad("End time")).toBe("numeric")
  })

  test("on the entry list's row", () => {
    const { container } = render(
      <EntryList state={withEntry()} setState={vi.fn()} nowSec={0} pushToast={vi.fn()} onEditEntry={vi.fn()} />,
    )
    const { pad } = keypads(container)
    expect(pad("Start time")).toBe("numeric")
    expect(pad("End time")).toBe("numeric")
    expect(pad("Duration")).toBe("decimal")
  })

  test("on the detail sheet", () => {
    const state = withEntry()
    const { container } = render(
      <EntryDetailModalBody entry={state.entries[0]} state={state} setState={vi.fn()} pushToast={vi.fn()} nowSec={0} />,
    )
    const { pad } = keypads(container)
    expect(pad("Start time")).toBe("numeric")
    expect(pad("End time")).toBe("numeric")
    expect(pad("Duration")).toBe("decimal")
  })

  test("and the sheet says how a duration is read, where there is room for it", () => {
    const state = withEntry()
    const { getByText } = render(
      <EntryDetailModalBody entry={state.entries[0]} state={state} setState={vi.fn()} pushToast={vi.fn()} nowSec={0} />,
    )
    // 1.30 is an hour and a half too, since 2026-11-04 (edits audit B7)
    expect(getByText(/90 = 90 min · 1\.30 = 1 h 30 · 1\.5 = 1 h 30/)).toBeTruthy()
  })
})
