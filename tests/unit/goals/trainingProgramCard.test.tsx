// @vitest-environment jsdom

/**
 * THE TEMPLATES STEP SAYS WHICH PROGRAM YOU ARE ON, AND NOTHING ELSE.
 *
 * What it replaced was a 628-line second copy of the training feature inside a
 * step measuring 12,661 px: a discipline row that hard-coded six of the
 * catalogue's thirteen (so Half Ironman could not be reached from here at all),
 * a program grid, a SECOND "Level" row under the one the board already has, a
 * kg/lb switch, the whole program editor, a "build your own" mode and a
 * "RUNNING NOW" band.
 *
 * The card holds no hook and no `fetch(`. Everything arrives as props, which is
 * the only reason every one of its states is drawable here without a network —
 * and the states are the point: a read that FAILED must never render as "No
 * program yet", which is a claim about somebody's training made on no evidence.
 */

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TrainingProgramCard } from "@/src/goals/components/north-star/WorkoutPrograms"
import { seedEnrollment } from "@/src/programs/programsService"
import { requireProgram } from "@/src/programs/data/catalog"
import type { ProgramEnrollment } from "@/src/programs/types"

const ZONE = "Europe/Copenhagen"
const NOW = new Date("2026-09-23T12:00:00.000Z")

function enrollment(over: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  const program = requireProgram("stronglifts-5x5")
  const level = program.levels[0].id
  const { exerciseState, cursor } = seedEnrollment(program, level, "kg")
  return {
    id: "enr-1",
    user_id: "u1",
    program_id: "stronglifts-5x5",
    level,
    unitSystem: "kg",
    exerciseState,
    cursor,
    is_active: true,
    started_at: "2026-09-20T08:00:00.000Z",
    customSchedule: null,
    ...over,
  }
}

function card(over: Partial<Parameters<typeof TrainingProgramCard>[0]> = {}) {
  const onRetry = vi.fn()
  render(
    <TrainingProgramCard
      read={{ enrollments: [], loading: false, error: null }}
      timezone={ZONE}
      now={NOW}
      onRetry={onRetry}
      {...over}
    />
  )
  return { onRetry }
}

afterEach(cleanup)

describe("while the read is in flight", () => {
  it("shows a placeholder the height of the card, and no claim about anything", () => {
    card({ read: { enrollments: [], loading: true, error: null } })
    expect(screen.getByTestId("lm-training-program-loading")).toBeTruthy()
    expect(screen.queryByText(/No program yet/i)).toBeNull()
  })
})

describe("when the read failed", () => {
  const failed = {
    enrollments: [],
    loading: false,
    error: "Your programs could not be loaded.",
  }

  it("says so in amber, and never 'No program yet'", () => {
    /**
     * `useActiveEnrollments` keeps the last-known list and sets `error`, so a
     * first failed request IS an empty list. Rendering that as "No program yet"
     * is the app telling somebody something about their own training that it
     * has no grounds for.
     */
    card({ read: failed })
    expect(screen.getByTestId("lm-training-unavailable").textContent).toContain(
      "Could not check which program you are on"
    )
    expect(screen.queryByText(/No program yet/i)).toBeNull()
  })

  it("is not a dead end: Try again and a way to pick one are both there", () => {
    const { onRetry } = card({ read: failed })
    screen.getByRole("button", { name: /Try again/i }).click()
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("link", { name: /Pick a program/i })).toBeTruthy()
  })

  it("names a retired catalogue id rather than taking the page down", () => {
    /**
     * `describeProgramWeek` throws `Unknown program: <id>` rather than falling
     * back to a week belonging to no program. The card catches it, names the
     * id, and the rest of Life Mastery keeps rendering.
     */
    card({
      read: {
        enrollments: [enrollment({ program_id: "retired-in-2025" })],
        loading: false,
        error: null,
      },
    })
    expect(screen.getByTestId("lm-training-unavailable").textContent).toContain("retired-in-2025")
  })
})

describe("with nothing running", () => {
  it("says what a program is for, and offers both ways to get one", () => {
    card()
    expect(screen.getByText(/No program yet/i)).toBeTruthy()
    expect(screen.getByText(/what you do on Tuesday/i)).toBeTruthy()

    const pick = screen.getByRole("link", { name: /Pick a program/i })
    const build = screen.getByRole("link", { name: /Build my own/i })
    // Both carry a way back to the step you left, so the Training page is
    // somewhere you go and come back from rather than somewhere you end up.
    expect(pick.getAttribute("href")).toContain("view=programs")
    expect(build.getAttribute("href")).toContain("view=build")
  })

  it("says a finished program is finished, rather than silently forgetting it", () => {
    // The plan had been describing this program, possibly for months.
    card({ ended: { enrollmentId: "enr-old" } })
    // Two lines say it — the heading and the green one — so this asks the card
    // rather than the document.
    expect(screen.getByTestId("lm-training-program").textContent).toContain("That program is finished")
    expect(screen.getByRole("link", { name: /Choose what is next/i })).toBeTruthy()
    expect(screen.queryByText(/No program yet/i)).toBeNull()
  })
})

describe("with one program running", () => {
  const running = { enrollments: [enrollment()], loading: false, error: null }

  it("names it, its level and its days in turn", () => {
    card({ read: running })
    const body = screen.getByTestId("lm-training-program")
    expect(body.textContent).toContain("StrongLifts 5×5")
    // Never a weekly count: A/B alternating is three sessions one week and two
    // the next, and both are correct.
    expect(body.textContent).toContain("in turn")
    expect(body.textContent).not.toMatch(/\d+×\/wk/)
    expect(body.textContent).not.toMatch(/days a week/i)
  })

  it("carries the program id and a way back on Change program", () => {
    card({ read: running })
    const href = screen.getByRole("link", { name: /Change program/i }).getAttribute("href") ?? ""
    expect(href).toContain("view=programs")
    expect(href).toContain("program=enr-1")
    expect(decodeURIComponent(href)).toContain("step=templates")
  })

  it("warns in amber about one started a fortnight ago and never trained", () => {
    card({
      read: {
        enrollments: [enrollment({ started_at: "2026-09-01T08:00:00.000Z" })],
        loading: false,
        error: null,
      },
    })
    const line = screen.getByText(/Never trained/i)
    expect(line.className).toMatch(/amber/)
  })

  it("says once when the week was adopted from another device", () => {
    card({ read: running, adopted: { enrollmentId: "enr-1" } })
    expect(screen.getByTestId("lm-training-adopted").textContent).toContain("StrongLifts 5×5")
  })
})

describe("with more than one running", () => {
  it("names every one of them and offers one way to sort it out", () => {
    const three = [
      enrollment({ id: "a" }),
      enrollment({ id: "b" }),
      enrollment({ id: "c" }),
    ]
    card({ read: { enrollments: three, loading: false, error: null } })

    expect(screen.getByText(/3 programs running/i)).toBeTruthy()
    // Named, because "you have 3 programs" without saying which three is a
    // number nobody can act on.
    for (const id of ["a", "b", "c"]) expect(screen.getByTestId(`lm-program-${id}`)).toBeTruthy()
    expect(screen.getAllByRole("link", { name: /Manage programs/i })).toHaveLength(1)
  })
})

describe("the card's own language", () => {
  it("speaks the app's tokens, at a size people can read, with no orange", () => {
    /**
     * The violet step button is this page's primary and there is exactly one of
     * it. A card that shouts as loudly as the thing you are meant to press next
     * is competing with the page it sits on — which is what the emerald "Start
     * tracking this" did.
     */
    const { container } = render(
      <TrainingProgramCard
        read={{ enrollments: [enrollment()], loading: false, error: null }}
        timezone={ZONE}
        now={NOW}
        onRetry={vi.fn()}
      />
    )
    const classes = [...container.querySelectorAll<HTMLElement>("*")]
      .map((el) => el.className)
      .filter((c): c is string => typeof c === "string")
      .join(" ")

    expect(classes).not.toMatch(/\bzinc-\d|\bsky-\d/)
    expect(classes).not.toMatch(/text-\[(?:9|10|10\.5|11|11\.5)px\]/)
    // `bg-primary` is the app's one loud fill; a tinted `bg-primary/10` chip is
    // not, and the slash is what tells them apart.
    expect(classes).not.toMatch(/(?:^|\s)bg-primary(?:\s|$)/)
    // Green is "finished" and nothing else, so it may not appear on a card
    // about a program that is running.
    expect(classes).not.toMatch(/emerald-/)
  })

  it("keeps green for the one thing on this card that IS finished", () => {
    const { container } = render(
      <TrainingProgramCard
        read={{ enrollments: [], loading: false, error: null }}
        timezone={ZONE}
        now={NOW}
        onRetry={vi.fn()}
        ended={{ enrollmentId: "enr-old" }}
      />
    )
    expect(within(container).getByText(/everything you logged is kept/i).className).toMatch(
      /emerald-/
    )
  })
})
