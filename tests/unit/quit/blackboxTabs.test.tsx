// @vitest-environment jsdom
/**
 * TWO TABS ON ONE BLACK BOX. Each "tab" is its own hook instance with its own in-memory record; they share one
 * localStorage, and neither hears the other's `storage` event (jsdom sends none inside one window), so each is
 * exactly a tab that is behind.
 */
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useLocalQuitBlackBox } from "@/src/quit/blackbox"
import { BLACKBOX_KEY, living, loadRecord, resetStampClock } from "@/src/vice/blackbox/blackboxStore"

const SLIP = { at: "2026-11-18T21:00:00", thought: "", ending: "fine" as const }
const stored = () => loadRecord(window.localStorage)
const runs = () => living(stored().attempts).filter((a) => a.viceId === "nicotine" && a.endedOn === null)

beforeEach(() => {
  window.localStorage.removeItem(BLACKBOX_KEY)
  resetStampClock()
})

describe("a stale tab", () => {
  it("two tabs that both start a run leave one run", () => {
    const a = renderHook(() => useLocalQuitBlackBox("nicotine"))
    const b = renderHook(() => useLocalQuitBlackBox("nicotine"))
    act(() => void a.result.current.startRun("2026-11-01"))
    // tab B has not heard: its own copy still has no run
    expect(b.result.current.run).toBeNull()
    act(() => void b.result.current.startRun("2026-11-01"))
    expect(runs()).toHaveLength(1)
  })

  it("amending a slip another tab took out does not bring it back", () => {
    const a = renderHook(() => useLocalQuitBlackBox("nicotine"))
    act(() => void a.result.current.startRun("2026-11-01"))
    const b = renderHook(() => useLocalQuitBlackBox("nicotine"))
    let id: string | null = null
    act(() => {
      id = a.result.current.fileSlip(SLIP)
    })
    expect(id).not.toBeNull()
    // tab B loads now, so it holds the slip; then tab A takes the slip back out
    const b2 = renderHook(() => useLocalQuitBlackBox("nicotine"))
    expect(b2.result.current.reports).toHaveLength(1)
    act(() => void a.result.current.undo(id as unknown as string))
    expect(living(stored().reports)).toHaveLength(0)
    // tab B is behind: it still shows the slip. Amending it must not make it live again.
    act(() => void b2.result.current.amend(id as unknown as string, { where: "coffee" }))
    expect(living(stored().reports)).toHaveLength(0)
    expect(runs()).toHaveLength(1)
    b.unmount()
  })

  it("two tabs that both take the same slip out leave the run alive once, not twice", () => {
    const a = renderHook(() => useLocalQuitBlackBox("nicotine"))
    act(() => void a.result.current.startRun("2026-11-01"))
    let id = ""
    act(() => {
      id = a.result.current.fileSlip(SLIP) as string
    })
    const b = renderHook(() => useLocalQuitBlackBox("nicotine"))
    act(() => void a.result.current.undo(id))
    act(() => void b.result.current.undo(id))
    expect(runs()).toHaveLength(1)
    expect(living(stored().reports)).toHaveLength(0)
  })

  it("a filing keeps the id its caller was given", () => {
    const a = renderHook(() => useLocalQuitBlackBox("nicotine"))
    act(() => void a.result.current.startRun("2026-11-01"))
    let id = ""
    act(() => {
      id = a.result.current.fileCloseCall({ ...SLIP, didInstead: "" }) as string
    })
    expect(stored().reports.map((r) => r.id)).toEqual([id])
  })
})
