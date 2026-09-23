/**
 * "NOT SAVED" ONLY WHEN IT IS TRUE.
 *
 * The row shouted "not saved yet — waiting for signal" the moment the ✓ was
 * tapped, because the only thing it was told was that the set's id started
 * with `pending:` — which it does from the instant the tick lands on screen,
 * before the request has even left. So every set on a perfectly good
 * connection flashed an alarm for one frame (seen in the walkthrough), and the
 * alarm that meant something looked exactly like the one that did not.
 *
 * The other half of the rule, and the more important one: a row that HAS said
 * "not saved" keeps saying it until the server acks. A marker that clears
 * itself on a timer is a marker that lies exactly when it matters.
 */

import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SetRow } from "@/src/programs/components/live/SetRow"
import { saveStateFor, SAVE_GIVEN_UP_MS, SAVE_QUIET_MS } from "@/src/programs/programsService"
import type { LiveWorkoutSet } from "@/src/programs/types"

const NOW = 1_800_000_000_000

const base = {
  setNumber: 1,
  prescribed: { weight: 100, reps: 5 },
  unitLabel: "kg",
  repUnit: "reps" as const,
}

const done = (over: Partial<LiveWorkoutSet> = {}): LiveWorkoutSet => ({
  id: "pending:squat|working|1|",
  exerciseId: "squat",
  exercise: "Squat",
  weight: 100,
  weightKg: 100,
  reps: 5,
  setNumber: 1,
  kind: "working",
  prescribedIndex: 0,
  completedAt: new Date(NOW).toISOString(),
  rpe: null,
  side: null,
  ...over,
})

describe("saveStateFor", () => {
  it("says nothing about a set the server has", () => {
    expect(saveStateFor({ pendingSince: null, queued: false }, NOW)).toBe("saved")
  })

  it("is quiet for the first second and a half, which is what a save looks like", () => {
    expect(saveStateFor({ pendingSince: NOW, queued: false }, NOW)).toBe("pending")
    expect(saveStateFor({ pendingSince: NOW, queued: false }, NOW + SAVE_QUIET_MS - 1)).toBe("pending")
  })

  it("says it is saving once silence starts reading as a tick that did not take", () => {
    expect(saveStateFor({ pendingSince: NOW, queued: false }, NOW + SAVE_QUIET_MS)).toBe("saving")
  })

  it("treats ten seconds with no answer as not saved, not as slow", () => {
    expect(saveStateFor({ pendingSince: NOW, queued: false }, NOW + SAVE_GIVEN_UP_MS)).toBe("queued")
  })

  it("a failed write is not saved from the first moment, however recent", () => {
    expect(saveStateFor({ pendingSince: NOW, queued: true }, NOW + 10)).toBe("queued")
  })

  it("a queued set that the server later acks is saved, not stuck", () => {
    // The order matters: `queued` is cleared by the flush, and the pending id
    // goes with the server's answer.
    expect(saveStateFor({ pendingSince: null, queued: false }, NOW + 60_000)).toBe("saved")
  })
})

describe("the row's marker", () => {
  it("renders nothing at all for a tick that has just happened", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW)
    render(<SetRow {...base} done={done()} pendingSince={NOW} onTick={vi.fn()} />)
    expect(screen.queryByTestId("set-save-state-1")).toBeNull()
    vi.restoreAllMocks()
  })

  it("says Saving… once the write has been out longer than that", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW + SAVE_QUIET_MS)
    render(<SetRow {...base} done={done()} pendingSince={NOW} onTick={vi.fn()} />)
    expect(screen.getByTestId("set-save-state-1").textContent).toBe("Saving…")
    vi.restoreAllMocks()
  })

  it("names a failed write as not saved, and says what happens next", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW + 100)
    render(<SetRow {...base} done={done()} pendingSince={NOW} queued onTick={vi.fn()} />)
    const marker = screen.getByTestId("set-save-state-1")
    expect(marker.textContent).toBe("Not saved — no signal. It will retry.")
    // Amber, because this one is worth looking at. "Saving…" is not.
    expect(marker.className).toContain("text-amber-500")
    vi.restoreAllMocks()
  })

  it("says nothing once the server has the set, whatever it said before", () => {
    render(<SetRow {...base} done={done({ id: "real-uuid" })} pendingSince={null} onTick={vi.fn()} />)
    expect(screen.queryByTestId("set-save-state-1")).toBeNull()
  })
})

describe("three doors to one delete", () => {
  it("a swipe past the threshold reveals Delete, and a shorter one snaps back", async () => {
    const onDelete = vi.fn()
    render(<SetRow {...base} onTick={vi.fn()} onDelete={onDelete} />)
    const row = screen.getByTestId("set-row-1")

    // A drag of 40 px is somebody scrolling, not deleting.
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchMove(row, { touches: [{ clientX: 260 }] })
    expect(screen.queryByTestId("swipe-delete-1")).toBeNull()

    // Past 88 px it offers.
    fireEvent.touchMove(row, { touches: [{ clientX: 200 }] })
    expect(screen.getByTestId("swipe-delete-1")).toBeTruthy()

    // And a release short of the threshold puts the row back where it was.
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchMove(row, { touches: [{ clientX: 280 }] })
    fireEvent.touchEnd(row)
    expect(screen.queryByTestId("swipe-delete-1")).toBeNull()

    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] })
    fireEvent.touchMove(row, { touches: [{ clientX: 180 }] })

    await userEvent.click(screen.getByTestId("swipe-delete-1"))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("offers a button as well, because a swipe is undiscoverable", async () => {
    const onDelete = vi.fn()
    render(<SetRow {...base} onTick={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByTestId("hover-delete-1"))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("offers neither when the row has nowhere to send a delete", () => {
    render(<SetRow {...base} onTick={vi.fn()} />)
    expect(screen.queryByTestId("hover-delete-1")).toBeNull()
  })
})
