/**
 * WHAT THE FINISH SHEET IS ALLOWED TO INVENT: nothing.
 *
 * Three numbers used to appear without anybody typing them. The end time
 * defaulted to now even for a session written up two days later; the duration
 * was computed on the device and CLAMPED by the server, so a mistyped end
 * became a silent ten-hour workout; and a run finished as a gym session with
 * no distance, so it counted towards no running total anywhere.
 *
 * The device's own clock is the other half of it. Every time here is read and
 * written in the ACCOUNT's zone — the tests run with the process in Auckland
 * and the account in Copenhagen, twelve hours and often a different DAY apart,
 * so a sheet that quietly used `new Date()` cannot pass by coincidence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FinishSheet } from "@/src/programs/components/live/FinishSheet"
import type { LiveWorkout } from "@/src/programs/types"

/** The device is in Auckland. The account is not. */
const DEVICE_TZ = "Pacific/Auckland"
const ACCOUNT_TZ = "Europe/Copenhagen"

let realTZ: string | undefined

beforeEach(() => {
  realTZ = process.env.TZ
  process.env.TZ = DEVICE_TZ
})

afterEach(() => {
  process.env.TZ = realTZ
  vi.restoreAllMocks()
})

/** 2026-09-15T16:00Z is 18:00 in Copenhagen and 04:00 the NEXT day in Auckland. */
const STARTED = "2026-09-15T16:00:00.000Z"
/**
 * A LIVE sheet defaults Ended to now, so a fixed start in the past would make
 * every one of these a ten-hour workout and disable Save — which is the sheet
 * behaving correctly, and not what these tests are about.
 */
const recent = () => new Date(Date.now() - 30 * 60_000).toISOString()

function workoutOf(over: Partial<LiveWorkout> = {}): LiveWorkout {
  return {
    id: "w1",
    startedAt: STARTED,
    enrollmentId: "e1",
    dayId: "A",
    cycle: 1,
    week: 1,
    adjustments: {},
    notes: null,
    rpe: null,
    unit: "kg",
    sets: [],
    ...over,
  } as LiveWorkout
}

type Sent = Record<string, unknown>

type SheetProps = Omit<Partial<React.ComponentProps<typeof FinishSheet>>, "workout"> & {
  /** A partial: `workoutOf` fills in everything the sheet does not care about. */
  workout?: Partial<LiveWorkout>
}

function sheet(props: SheetProps = {}): { sent: Sent[] } {
  const sent: Sent[] = []
  // `workout` is spread LAST on purpose: a caller passes a PARTIAL workout and
  // `workoutOf` fills the rest, so it must not be overwritten by `...props`.
  render(
    <FinishSheet
      unfinished={[]}
      untouchedAdded={[]}
      unsaved={0}
      saving={0}
      busy={false}
      error={null}
      onSkipLift={vi.fn()}
      onCancel={vi.fn()}
      timezone={ACCOUNT_TZ}
      {...props}
      workout={workoutOf(props.workout)}
      onFinish={async (payload) => {
        sent.push(payload as Sent)
        return null
      }}
    />
  )
  return { sent }
}

const saveButton = () =>
  screen
    .getAllByRole("button")
    .find((b) => /save this workout|say when|say what kind|saving your last set/i.test(b.textContent ?? ""))!

describe("a session written up afterwards", () => {
  it("opens both times, leaves Ended empty, and says on the button why it cannot save", () => {
    sheet({ past: true })

    expect((screen.getByLabelText(/when the workout started/i) as HTMLInputElement).value).toBe(
      // 18:00 Copenhagen, not 04:00 Auckland and not 16:00 UTC.
      "2026-09-15T18:00"
    )
    expect((screen.getByLabelText(/when the workout ended/i) as HTMLInputElement).value).toBe("")

    const save = saveButton()
    expect(save.textContent).toContain("Say when it ended")
    expect((save as HTMLButtonElement).disabled).toBe(true)
  })

  it("reads 45 min from the two typed times and sends them as the account's instants", async () => {
    const user = userEvent.setup()
    const { sent } = sheet({ past: true })

    await user.type(screen.getByLabelText(/when the workout ended/i), "2026-09-15T18:45")

    expect(screen.getByText("45 min")).toBeTruthy()

    await user.click(saveButton())
    expect(sent).toHaveLength(1)
    // 18:45 in Copenhagen is 16:45Z. In Auckland it would be 06:45Z on the 15th.
    expect(sent[0].endedAt).toBe("2026-09-15T16:45:00.000Z")
    // The start was not touched, so it is not sent.
    expect("startedAt" in sent[0]).toBe(false)
  })

  it("sends a changed start, and never a durationMin", async () => {
    const user = userEvent.setup()
    const { sent } = sheet({ past: true })

    const started = screen.getByLabelText(/when the workout started/i)
    await user.clear(started)
    await user.type(started, "2026-09-15T17:00")
    await user.type(screen.getByLabelText(/when the workout ended/i), "2026-09-15T18:00")
    await user.click(saveButton())

    expect(sent[0].startedAt).toBe("2026-09-15T15:00:00.000Z")
    // The server derives the minutes. A third number is what got clamped.
    expect("durationMin" in sent[0]).toBe(false)
  })

  it("refuses a ten-hour span on the screen, not as a 400 afterwards", async () => {
    const user = userEvent.setup()
    sheet({ past: true })

    await user.type(screen.getByLabelText(/when the workout ended/i), "2026-09-16T04:30")

    expect((saveButton() as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/longer than this can record/i)).toBeTruthy()
  })
})

describe("how far you went", () => {
  it("an endurance day asks in km for a kilo lifter and sends kilometres", async () => {
    const user = userEvent.setup()
    const { sent } = sheet({ endurance: true, workout: { startedAt: recent() } })

    await user.type(screen.getByLabelText(/how far, in km/i), "5.2")
    await user.click(saveButton())

    expect(sent[0].distanceKm).toBeCloseTo(5.2)
  })

  it("a pounds lifter is asked in miles and it is still stored in kilometres", async () => {
    const user = userEvent.setup()
    const { sent } = sheet({ endurance: true, workout: { unit: "lb", startedAt: recent() } })

    await user.type(screen.getByLabelText(/how far, in miles/i), "3")
    await user.click(saveButton())

    // Three miles is 4.83 km. Storing "3" would have made a run 60% shorter.
    expect(sent[0].distanceKm as number).toBeCloseTo(4.83, 1)
  })

  it("is not asked at all on an ordinary gym day", () => {
    sheet({})
    expect(screen.queryByLabelText(/how far/i)).toBeNull()
  })
})

describe("a workout with no program behind it", () => {
  it("asks what it was, and will not save until told", async () => {
    const user = userEvent.setup()
    const { sent } = sheet({ loose: true, workout: { enrollmentId: null, startedAt: recent() } })

    const save = saveButton()
    expect(save.textContent).toContain("Say what kind of session it was")
    expect((save as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole("button", { name: "running" }))
    await user.click(saveButton())

    expect(sent[0].sessionType).toBe("running")
  })

  it("preselects weights when a set was actually ticked", () => {
    sheet({
      loose: true,
      workout: {
        enrollmentId: null,
        startedAt: recent(),
        sets: [
          {
            id: "s1",
            exerciseId: "squat",
            exercise: "Squat",
            weight: 100,
            weightKg: 100,
            reps: 5,
            prescribedIndex: 0,
            rpe: null,
            setNumber: 1,
            kind: "working",
            side: null,
            completedAt: recent(),
          },
        ],
      },
    })

    expect(screen.getByRole("button", { name: "weights" }).getAttribute("aria-pressed")).toBe("true")
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it("choosing running reveals the distance box on a loose workout too", async () => {
    const user = userEvent.setup()
    sheet({ loose: true, workout: { enrollmentId: null } })

    expect(screen.queryByLabelText(/how far/i)).toBeNull()
    await user.click(screen.getByRole("button", { name: "running" }))
    expect(screen.getByLabelText(/how far, in km/i)).toBeTruthy()
  })

  it("a program workout is never asked what kind it was", () => {
    sheet({})
    expect(screen.queryByTestId("finish-kind")).toBeNull()
  })
})
