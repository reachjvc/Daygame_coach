// @vitest-environment jsdom

/**
 * THE EDITOR ON A PHONE, which is where people plan their training.
 *
 * What it looked like before: a day row was a text input committing a rename
 * per keystroke, beside four 44-px icon buttons. At 390 px the name got about
 * 96 px of that row, so "Workout A" read as "Wor…" — the one thing the row
 * exists to say was the thing that got clipped. The four icons were also four
 * decisions on a row whose job is to name a day.
 *
 * TWO OF THE STEP'S SIX TESTS ARE NOT HERE, ON PURPOSE. "Every input is a
 * shadcn Input" and "no class matches /zinc-|sky-|emerald-|text-\[10/" are
 * facts about the FILE, and `tests/unit/architecture.test.ts` already owns both
 * ("no NEW training file speaks a second visual language", "no training input
 * under 16 px on a phone"). Writing them again here would be a second copy of
 * one rule, and the copies drift. What was done instead is the thing that makes
 * the architecture test enforce them: `ProgramEditor.tsx` is off
 * `TRAINING_STYLE_DEBT` and off `UNREADABLE_TEXT_ALLOWED`, and both lists carry
 * a companion assertion that fails if a name on them is already clean — so the
 * removal is not optional and cannot be quietly undone.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ProgramEditor } from "@/src/programs/components/ProgramEditor"
import { ProgramDetail } from "@/src/programs/components/ProgramDetail"
import { materializeSchedule } from "@/src/programs/customize"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramDefinition, ProgramSchedule } from "@/src/programs/types"

// ProgramDetail's own `Card` and the editor's dialog both measure themselves;
// the router is never reached from this screen but Next's hook is imported.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/programs",
  useSearchParams: () => new URLSearchParams(),
}))

function editor(program: ProgramDefinition, over: { schedule?: ProgramSchedule } = {}) {
  const onChange = vi.fn()
  render(
    <ProgramEditor
      program={program}
      schedule={over.schedule ?? materializeSchedule(program)}
      level={program.levels[0].id}
      unit="kg"
      onChange={onChange}
      workingWeights={{}}
      onWorkingWeight={vi.fn()}
      onReset={vi.fn()}
    />
  )
  return { onChange }
}

beforeEach(() => {
  // Radix's dialog measures itself.
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("a day row", () => {
  it("shows its full name and exactly one options button", () => {
    const program = requireProgram("stronglifts-5x5")
    editor(program)
    const days = materializeSchedule(program)
    const first = days.kind === "linear_rotation" ? days.days[0] : null
    if (!first) throw new Error("fixture assumes a rotation")

    // The name in full, not clipped and not inside an input.
    expect(screen.getByText(first.label)).toBeTruthy()
    expect(screen.queryByLabelText(/Name of training day/i)).toBeNull()

    // One options button per day, where there were four icon buttons.
    expect(screen.getAllByLabelText(`Options for ${first.label}`)).toHaveLength(1)
  })

  it("has no control under 44px", () => {
    const program = requireProgram("stronglifts-5x5")
    editor(program)

    // The floor every other control in the app is held to. `min-h-11` is 44px;
    // the Button's own `size="icon"` is 44px on a phone.
    for (const button of screen.getAllByRole("button")) {
      const classes = button.className
      expect(classes, `a control that misses the 44px floor: ${classes}`).not.toMatch(
        /(?:^|\s)(?:min-h-(?:7|8|9|10)|h-(?:7|8|9|10))(?:\s|$)/
      )
    }
  })
})

describe("renaming a day", () => {
  it("keeps the space in a two-word name", async () => {
    const user = userEvent.setup()
    const program = requireProgram("stronglifts-5x5")
    const { onChange } = editor(program)
    const schedule = materializeSchedule(program)
    const first = schedule.kind === "linear_rotation" ? schedule.days[0] : null
    if (!first) throw new Error("fixture assumes a rotation")

    await user.click(screen.getByLabelText(`Options for ${first.label}`))
    await user.click(screen.getByTestId("editor-day-rename"))

    const box = screen.getByLabelText("Name")
    await user.clear(box)
    await user.type(box, "Upper Body")
    // The space used to be deleted as it was typed: every keystroke went
    // through a function that trims.
    expect(box).toHaveValue("Upper Body")

    await user.click(screen.getByTestId("editor-name-save"))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0][0] as ProgramSchedule
    const renamed = next.kind === "linear_rotation" ? next.days[0].label : null
    expect(renamed).toBe("Upper Body")
  })

  it("refuses a blank name with something to read, and changes nothing", async () => {
    const user = userEvent.setup()
    const program = requireProgram("stronglifts-5x5")
    const { onChange } = editor(program)
    const schedule = materializeSchedule(program)
    const first = schedule.kind === "linear_rotation" ? schedule.days[0] : null
    if (!first) throw new Error("fixture assumes a rotation")

    await user.click(screen.getByLabelText(`Options for ${first.label}`))
    await user.click(screen.getByTestId("editor-day-rename"))
    await user.clear(screen.getByLabelText("Name"))
    await user.click(screen.getByTestId("editor-name-save"))

    /**
     * `renameDay` throws on a blank name and that throw stays underneath as the
     * last line of defence. It is not how the refusal reaches anybody: the
     * dialog says it, and nothing is attempted — which is why `onChange` is the
     * assertion rather than a spy on the schedule function.
     */
    expect(screen.getByRole("alert").textContent).toContain("A training day needs a name")
    expect(onChange).not.toHaveBeenCalled()
    // Still open, so the name can be typed rather than started again.
    expect(screen.getByTestId("editor-name-dialog")).toBeTruthy()
  })
})

describe("the day sheet's move rows", () => {
  it("disables Move up on the first day and Move down on the last", async () => {
    const user = userEvent.setup()
    const program = requireProgram("stronglifts-5x5")
    editor(program)
    const schedule = materializeSchedule(program)
    if (schedule.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
    const [first, ...rest] = schedule.days
    const last = rest[rest.length - 1] ?? first

    await user.click(screen.getByLabelText(`Options for ${first.label}`))
    expect(screen.getByTestId("editor-day-up")).toBeDisabled()
    expect(screen.getByTestId("editor-day-down")).not.toBeDisabled()

    // Off and VISIBLE, rather than hidden: a sheet whose rows move around
    // between openings is a sheet nobody can learn.
    await user.keyboard("{Escape}")
    await user.click(screen.getByLabelText(`Options for ${last.label}`))
    expect(screen.getByTestId("editor-day-down")).toBeDisabled()
  })
})

describe("a 5/3/1 main lift", () => {
  it("shows the wave as a badge and offers no sets box", async () => {
    const user = userEvent.setup()
    const program = requireProgram("wendler-531")
    editor(program)
    const schedule = materializeSchedule(program)
    if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") {
      throw new Error("fixture assumes a load program")
    }
    const day = schedule.days[0]
    const waved = day.exercises.find(
      (e) => e.metricType === "load" && e.scheme.kind === "percentage_tm"
    )
    if (!waved) throw new Error("fixture assumes a percentage-wave lift")

    await user.click(screen.getByTestId(`editor-day-${day.id}`))
    await user.click(screen.getByLabelText(`Options for ${waved.name}`))

    // The 65/75/85 wave IS the program. A sets box cannot express a per-week
    // table, and letting one overwrite it turns 5/3/1 into something else
    // wearing its name.
    // Scoped to the sheet: the row behind it says the same thing, which is the
    // point — you can see a lift is on the wave without opening it.
    const sheet = within(screen.getByTestId("editor-lift-sheet"))
    expect(sheet.getByText(/The program's wave/i)).toBeTruthy()
    expect(sheet.queryByLabelText("Sets")).toBeNull()
    expect(sheet.queryByLabelText("Reps")).toBeNull()
    // Swapping it for something else is still allowed — that is a different
    // decision from silently rewriting the wave.
    expect(sheet.getByTestId("editor-lift-swap")).toBeTruthy()
  })
})

describe("an endurance plan", () => {
  it("says why it cannot be edited, instead of showing controls that would break it", () => {
    const program = requireProgram("couch-to-5k")
    // `materializeSchedule` REFUSES an endurance plan, which is the same rule
    // this screen renders — so the fixture hands over the plan's own schedule.
    editor(program, { schedule: program.schedule })

    expect(screen.getByTestId("editor-fixed-plan")).toBeTruthy()
    expect(screen.getByText(/Week by week/i)).toBeTruthy()
    // No day rows at all: week six only means something because weeks one to
    // five happened.
    expect(screen.queryByTestId("editor-add-day")).toBeNull()
  })
})

/**
 * THE EDITOR'S TWO HOMES ON /programs.
 *
 * Before this, the week could only be changed AFTER it had been started: the
 * screen that let you shape a program before committing to it was inside Life
 * Mastery, which is being deleted, and this one offered the weights and nothing
 * else. So the last surface that could rename a day or drop a lift you cannot do
 * was the one you reach by committing first.
 */
describe("ProgramDetail", () => {
  /** Every request the screen made, with its parsed body. */
  let posts: Array<Record<string, unknown>>

  function installFetch() {
    posts = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString()
      if ((init?.method ?? "GET") === "POST" && url.startsWith("/api/programs/enrollments")) {
        posts.push(JSON.parse(String(init?.body ?? "{}")))
        return new Response(JSON.stringify({ enrollment: { id: "e1" } }), { status: 201 })
      }
      // `refreshEnrollments` runs after a successful start.
      return new Response(JSON.stringify([]), { status: 200 })
    }))
  }

  function detail() {
    render(<ProgramDetail programId="stronglifts-5x5" onBack={vi.fn()} onEnrolled={vi.fn()} />)
  }

  beforeEach(installFetch)

  it("sends no customSchedule for a week nobody changed", async () => {
    const user = userEvent.setup()
    detail()
    await user.click(screen.getByTestId("start-program"))

    expect(posts).toHaveLength(1)
    /**
     * An untouched snapshot would give the enrollment a copy-on-write schedule
     * it never asked for, and a copy stops picking up catalogue corrections for
     * ever — the reason `customSchedule` is null until the first real edit.
     */
    expect(posts[0].customSchedule).toBeUndefined()
  })

  it("sends the edited week once a day has been renamed", async () => {
    const user = userEvent.setup()
    detail()
    const schedule = materializeSchedule(requireProgram("stronglifts-5x5"))
    if (schedule.kind !== "linear_rotation") throw new Error("fixture assumes a rotation")
    const first = schedule.days[0]

    await user.click(screen.getByLabelText(`Options for ${first.label}`))
    await user.click(screen.getByTestId("editor-day-rename"))
    await user.clear(screen.getByLabelText("Name"))
    await user.type(screen.getByLabelText("Name"), "Heavy Day")
    await user.click(screen.getByTestId("editor-name-save"))

    await user.click(screen.getByTestId("start-program"))
    expect(posts).toHaveLength(1)
    const sent = posts[0].customSchedule as { kind: string; days: { label: string }[] }
    expect(sent.days[0].label).toBe("Heavy Day")
  })

  it("converts a typed weight when the unit changes, rather than keeping the number", async () => {
    const user = userEvent.setup()
    detail()

    const squat = screen.getByLabelText(/Starting weight for Squat in kg/i)
    await user.clear(squat)
    await user.type(squat, "60")
    await user.click(screen.getByRole("button", { name: "lb" }))

    /**
     * 60 kg is 132 lb, not 60 lb and not blank.
     *
     * The boxes used to keep their numbers while the unit label changed
     * underneath them, so a 60 typed as kilograms silently became 60 pounds — a
     * 27 kg squat for somebody who had said 60. (Life Mastery's version cleared
     * the boxes instead, which loses the answer but does not lie about it.)
     *
     * 132 rather than the 132.5 the step named: `roundToLoadable`'s barbell path
     * floors at the bar and snaps to a plate pair, which gives 130 and drags a
     * 6 kg lateral raise up to the 45 lb bar. A number somebody typed is not a
     * prescription, so it is rounded on the "free" precision of 1 lb.
     */
    expect(screen.getByLabelText(/Starting weight for Squat in lb/i)).toHaveValue(132)
  })

  it("has exactly one solid orange control", () => {
    detail()
    /**
     * Level and units were `Button variant="default"` — the app's one loud
     * button — so "Beginner", "kg" and "Start StrongLifts 5×5" shouted equally
     * and only the third does anything irreversible.
     *
     * `bg-primary/10` (the tinted chip) is deliberately NOT a match: the slash
     * is what tells a tint from the solid fill.
     */
    const solid = screen
      .getAllByRole("button")
      .filter((b) => /(?:^|\s)bg-primary(?:\s|$)/.test(b.className))
    expect(solid.map((b) => b.textContent)).toEqual([expect.stringContaining("Start")])
  })
})
