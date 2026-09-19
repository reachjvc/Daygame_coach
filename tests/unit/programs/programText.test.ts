/**
 * Writing a program out in text.
 *
 * The rule that matters most: NOTHING IS SILENTLY DROPPED. A line the parser
 * cannot read comes back as a problem with its line number — the failure this
 * exists to prevent is pasting five days, keeping four, and finding out in the
 * gym.
 */

import { describe, test, expect } from "vitest"
import {
  PROGRAM_TEXT_PLACEHOLDER,
  carryAuthoredSettings,
  formatProgramText,
  parseProgramText,
} from "@/src/programs/programText"
import { scheduleDays } from "@/src/programs/customize"
import { customLibraryEntry, customLiftId } from "@/src/programs/data/exerciseLibrary"
import { designProblems } from "@/src/programs/builder"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import type { DayTemplate, LoadExercise, ProgramSchedule } from "@/src/programs/types"

const lifts = (s: ProgramSchedule, i: number) => scheduleDays(s)[i].exercises as LoadExercise[]

// ---------------------------------------------------------------------------

describe("days", () => {
  test("a blank line starts a new day, and the first line names it", () => {
    const { schedule, problems } = parseProgramText(`Push
Bench Press 3x8

Pull
Barbell Row 3x8

Legs
Back Squat 5x5`)
    expect(problems).toEqual([])
    expect(scheduleDays(schedule).map((d) => d.label)).toEqual(["Push", "Pull", "Legs"])
    expect(lifts(schedule, 0).map((e) => e.name)).toEqual(["Bench Press"])
  })

  test("five days, which is the thing that was unbearable to click", () => {
    const { schedule, problems } = parseProgramText(`Mon
Back Squat 5x5

Tue
Bench Press 5x5

Wed
Deadlift 1x5

Thu
Overhead Press 5x5

Fri
Barbell Row 5x5`)
    expect(problems).toEqual([])
    expect(scheduleDays(schedule)).toHaveLength(5)
    expect(designProblems(schedule)).toEqual([])
  })

  test("extra blank lines between days are not empty days", () => {
    const { schedule } = parseProgramText("Push\nBench Press 3x8\n\n\n\nPull\nBarbell Row 3x8")
    expect(scheduleDays(schedule)).toHaveLength(2)
    expect(designProblems(schedule)).toEqual([])
  })

  test("lifts written before any day name still get a home", () => {
    const { schedule, problems } = parseProgramText("Bench Press 3x8\nBarbell Row 3x8")
    expect(problems).toEqual([])
    expect(scheduleDays(schedule)).toHaveLength(1)
    expect(scheduleDays(schedule)[0].label).toBe("Day 1")
    expect(lifts(schedule, 0)).toHaveLength(2)
  })

  test('"Face Pull" inside a day is a lift, not a new day', () => {
    const { schedule } = parseProgramText("Pull\nBarbell Row 3x8\nFace Pull")
    expect(scheduleDays(schedule)).toHaveLength(1)
    expect(lifts(schedule, 0).map((e) => e.name)).toEqual(["Barbell Row", "Face Pull"])
  })

  test("trailing whitespace and blank input are handled", () => {
    expect(scheduleDays(parseProgramText("").schedule)).toEqual([])
    expect(scheduleDays(parseProgramText("   \n\n  ").schedule)).toEqual([])
  })
})

// ---------------------------------------------------------------------------

describe("sets and reps", () => {
  test("3x8 is three sets of eight", () => {
    const { schedule } = parseProgramText("Push\nBench Press 3x8")
    expect(lifts(schedule, 0)[0].scheme).toMatchObject({ kind: "linear", sets: 3, reps: 8 })
  })

  test("a rep range becomes a rep range", () => {
    const { schedule } = parseProgramText("Push\nLateral Raise 3x12-20")
    expect(lifts(schedule, 0)[0].scheme).toMatchObject({
      kind: "rep_range",
      sets: 3,
      repMin: 12,
      repMax: 20,
    })
  })

  test("spaces and a multiplication sign are both fine", () => {
    for (const written of ["Bench Press 3 x 8", "Bench Press 3×8", "Bench Press 3X8"]) {
      const { schedule } = parseProgramText(`Push\n${written}`)
      expect(lifts(schedule, 0)[0].scheme, written).toMatchObject({ sets: 3, reps: 8 })
    }
  })

  test("a bare name gets the library's own sensible defaults", () => {
    const { schedule, problems } = parseProgramText("Push\nBench Press")
    expect(problems).toEqual([])
    const scheme = lifts(schedule, 0)[0].scheme as { sets: number }
    expect(scheme.sets).toBeGreaterThan(0)
  })

  test("nonsense numbers are reported, not accepted", () => {
    const a = parseProgramText("Push\nBench Press 0x8")
    expect(a.problems[0].reason).toMatch(/not a number of sets/)
    const b = parseProgramText("Push\nBench Press 3x8-4")
    expect(b.problems[0].reason).toMatch(/top of the rep range/)
  })
})

// ---------------------------------------------------------------------------

describe("weights", () => {
  test("@60 is the starting weight", () => {
    const { schedule, weights } = parseProgramText("Push\nBench Press 3x8 @60")
    expect(weights[lifts(schedule, 0)[0].id]).toBe("60")
  })

  test("units after the number are tolerated", () => {
    for (const written of ["@60kg", "@ 60 kg", "@60lb"]) {
      const { schedule, weights } = parseProgramText(`Push\nBench Press 3x8 ${written}`)
      expect(weights[lifts(schedule, 0)[0].id], written).toBe("60")
    }
  })

  test("bodyweight is zero, not a missing number", () => {
    const { schedule, weights } = parseProgramText("Push\nPush-up 3x20 @bw")
    expect(weights[lifts(schedule, 0)[0].id]).toBe("0")
  })

  test("a decimal weight survives", () => {
    const { schedule, weights } = parseProgramText("Push\nBench Press 3x8 @62.5")
    expect(weights[lifts(schedule, 0)[0].id]).toBe("62.5")
  })

  test("no weight is simply absent, and the design says so", () => {
    const { schedule, weights } = parseProgramText("Push\nBench Press 3x8")
    expect(weights[lifts(schedule, 0)[0].id]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------

describe("supersets", () => {
  test("a leading + pairs with the line above", () => {
    const { schedule } = parseProgramText("Push\nBench Press 3x8\n+ Lateral Raise 3x15")
    const [a, b] = lifts(schedule, 0)
    expect(a.supersetGroup).toBe("A")
    expect(b.supersetGroup).toBe("A")
  })

  test("& works too, because people write both", () => {
    const { schedule } = parseProgramText("Push\nBench Press 3x8\n& Lateral Raise 3x15")
    expect(lifts(schedule, 0)[1].supersetGroup).toBe("A")
  })

  test("a third + extends the same group rather than starting a new one", () => {
    const { schedule } = parseProgramText("Push\nBench 3x8\n+ Fly 3x12\n+ Push-up 3x20")
    expect(lifts(schedule, 0).map((e) => e.supersetGroup)).toEqual(["A", "A", "A"])
  })

  test("a separate pair later in the day gets its own letter", () => {
    const { schedule } = parseProgramText(
      "Push\nBench 3x8\n+ Fly 3x12\nOverhead Press 3x8\n+ Lateral Raise 3x15"
    )
    expect(lifts(schedule, 0).map((e) => e.supersetGroup)).toEqual(["A", "A", "B", "B"])
  })

  test("groups restart each day", () => {
    const { schedule } = parseProgramText("Push\nBench 3x8\n+ Fly 3x12\n\nPull\nRow 3x8\n+ Curl 3x12")
    expect(lifts(schedule, 1).map((e) => e.supersetGroup)).toEqual(["A", "A"])
  })

  test("a + with nothing above it is reported", () => {
    const { problems } = parseProgramText("Push\n+ Lateral Raise 3x15")
    expect(problems[0].reason).toMatch(/no lift above/)
    expect(problems[0].line).toBe(2)
  })
})

// ---------------------------------------------------------------------------

describe("names", () => {
  test("a recognised lift is given its canonical spelling", () => {
    const { schedule } = parseProgramText("Push\nbench press 3x8")
    expect(lifts(schedule, 0)[0].name).toBe("Bench Press")
  })

  test("a catalog alias resolves — Squat is the back squat", () => {
    const { schedule } = parseProgramText("Legs\nSquat 5x5")
    expect(lifts(schedule, 0)[0].name).toBe("Back Squat")
  })

  test("an unknown lift is KEPT under the name you wrote", () => {
    const { schedule, problems } = parseProgramText("Legs\nZercher Squat 3x8 @60")
    expect(problems).toEqual([])
    expect(lifts(schedule, 0)[0].name).toBe("Zercher Squat")
  })

  test("an unknown lift is not floored at the barbell", () => {
    const { schedule } = parseProgramText("Arms\nCable Kickback 3x15 @5")
    expect(lifts(schedule, 0)[0].loadStyle).toBe("free")
  })

  test("a recognised barbell lift keeps barbell rounding", () => {
    const { schedule } = parseProgramText("Legs\nBack Squat 5x5 @100")
    expect(lifts(schedule, 0)[0].loadStyle).toBe("barbell")
  })

  test("a line with numbers but no name is reported", () => {
    const { problems } = parseProgramText("Push\n3x8 @60")
    expect(problems[0].reason).toMatch(/no exercise name/)
  })
})

// ---------------------------------------------------------------------------

describe("problems are reported with enough to find them", () => {
  test("the line number is the one the user is looking at", () => {
    const { problems } = parseProgramText(`Push
Bench Press 3x8
3x8 @60
Barbell Row 3x8`)
    expect(problems).toHaveLength(1)
    expect(problems[0].line).toBe(3)
    expect(problems[0].text).toBe("3x8 @60")
  })

  test("a bad line does not take the good ones with it", () => {
    const { schedule, problems } = parseProgramText(`Push
Bench Press 3x8
0x8 Barbell Row
Overhead Press 3x8`)
    expect(problems).toHaveLength(1)
    expect(lifts(schedule, 0).map((e) => e.name)).toEqual(["Bench Press", "Overhead Press"])
  })
})

// ---------------------------------------------------------------------------

describe("re-applying text keeps what the text cannot say", () => {
  test("progression and notes survive when the lift is unchanged", () => {
    const first = parseProgramText("Push\nBench Press 3x8 @60\nOverhead Press 3x8 @40")
    // Set in the editor underneath, where these live.
    const edited = structuredClone(first.schedule) as { days: Array<{ exercises: LoadExercise[] }> }
    edited.days[0].exercises[0].progression = { kind: "none" }
    edited.days[0].exercises[0].note = "pause on the chest"

    // Fix a typo elsewhere and re-apply.
    const second = parseProgramText("Push\nBench Press 3x8 @62.5\nOverhead Press 3x8 @40")
    const merged = carryAuthoredSettings(edited as unknown as ProgramSchedule, second.schedule)
    const bench = (scheduleDays(merged)[0].exercises as LoadExercise[])[0]
    expect(bench.progression.kind).toBe("none")
    expect(bench.note).toBe("pause on the chest")
  })

  test("a lift replaced in that slot does NOT inherit the old one's settings", () => {
    const first = parseProgramText("Push\nBench Press 3x8 @60")
    const edited = structuredClone(first.schedule) as { days: Array<{ exercises: LoadExercise[] }> }
    edited.days[0].exercises[0].progression = { kind: "none" }
    edited.days[0].exercises[0].note = "pause on the chest"

    const second = parseProgramText("Push\nOverhead Press 3x8 @40")
    const merged = carryAuthoredSettings(edited as unknown as ProgramSchedule, second.schedule)
    const lift = (scheduleDays(merged)[0].exercises as LoadExercise[])[0]
    expect(lift.name).toBe("Overhead Press")
    expect(lift.progression.kind).not.toBe("none")
    expect(lift.note).toBeUndefined()
  })

  test("a newly added lift is untouched", () => {
    const first = parseProgramText("Push\nBench Press 3x8 @60")
    const second = parseProgramText("Push\nBench Press 3x8 @60\nFly 3x12 @10")
    const merged = carryAuthoredSettings(first.schedule, second.schedule)
    expect(scheduleDays(merged)[0].exercises).toHaveLength(2)
  })
})

describe("round trip", () => {
  test("the shipped example parses cleanly", () => {
    const { schedule, problems, weights } = parseProgramText(PROGRAM_TEXT_PLACEHOLDER)
    expect(problems).toEqual([])
    expect(scheduleDays(schedule)).toHaveLength(3)
    expect(designProblems(schedule)).toEqual([])
    expect(Object.keys(weights).length).toBeGreaterThan(0)
    expect(CustomScheduleSchema.safeParse(schedule).success).toBe(true)
  })

  test("formatting then reparsing gives the same program", () => {
    const first = parseProgramText(PROGRAM_TEXT_PLACEHOLDER)
    const text = formatProgramText(first.schedule, first.weights)
    const second = parseProgramText(text)
    expect(second.problems).toEqual([])
    expect(second.schedule).toEqual(first.schedule)
    expect(second.weights).toEqual(first.weights)
  })

  test("supersets and bodyweight survive the round trip", () => {
    const first = parseProgramText("Push\nBench Press 3x8 @60\n+ Push-up 3x20 @bw")
    const text = formatProgramText(first.schedule, first.weights)
    expect(text).toContain("+ Push-up")
    expect(text).toContain("@bw")
    const second = parseProgramText(text)
    expect(second.schedule).toEqual(first.schedule)
  })

  test("a written program is startable — it validates on the wire", () => {
    const { schedule } = parseProgramText(`Upper
Bench Press 3x8 @60
Barbell Row 3x8 @55

Lower
Back Squat 5x5 @80
Romanian Deadlift 3x8 @60`)
    const parsed = CustomScheduleSchema.safeParse(schedule)
    expect(parsed.success, parsed.error?.issues[0]?.message).toBe(true)
  })
})

/**
 * ONE LIFT, ONE ID — the rule the click-to-add path already had.
 *
 * The parser minted the id from the POSITION before it had read the name, so
 * "Bench Press" on Push A was `d1_e1` and on Push B was `d2_e1`. Two ids means
 * two entries in `exerciseState`, which means two working weights for one bar,
 * drifting apart from the first session. `addExercise` had decided the opposite
 * years earlier and said so in a comment — the two doors into the same editor
 * disagreed.
 */
describe("the id a typed lift gets", () => {
  const idsOf = (schedule: ProgramSchedule) =>
    scheduleDays(schedule).map((d) => d.exercises.map((e) => e.id))

  test("the same lift on two days gets one id and one starting weight", () => {
    const { schedule, weights } = parseProgramText(
      ["Push A", "Bench Press 5x5 @60", "", "Push B", "Bench Press 5x5 @60"].join("\n")
    )
    const [dayA, dayB] = idsOf(schedule)
    expect(dayA[0]).toBe(dayB[0])
    // And therefore ONE weight, not two that drift.
    expect(Object.keys(weights)).toHaveLength(1)
    expect(weights[dayA[0]]).toBe("60")
  })

  test("the same lift twice in one day is two slots", () => {
    // A top set and a back-off. These have to be distinguishable or the log
    // cannot say which one it is talking about — the case the suffix exists for.
    const { schedule } = parseProgramText(["Push", "Bench Press 1x5 @100", "Bench Press 3x8 @80"].join("\n"))
    const [day] = idsOf(schedule)
    expect(day[0]).not.toBe(day[1])
    expect(day[1]).toMatch(/_2$/)
  })

  test("a typed unknown lift and a palette-added one share an id", () => {
    // Deliberately not in the library — Zercher Squat is, which is why the
    // first draft of this test passed for the wrong reason.
    const ODD = "Wobble Board Overhead Hold"
    const { schedule } = parseProgramText(["Legs", `${ODD} 3x8 @40`].join("\n"))
    const typed = idsOf(schedule)[0][0]

    // Guard the premise: if the library ever learns this lift, say so here
    // rather than silently testing the library path again.
    expect(typed, "premise: the library must not know this lift").toMatch(/^custom_/)
    // The palette mints its id through customLibraryEntry; both go through the
    // same slug rule now, so a typed lift and a clicked one are one lift.
    expect(typed).toBe(customLibraryEntry(ODD, "quads")!.id)
    expect(typed).toBe(customLiftId(ODD))
  })

  test("a recognised lift uses the library's own id, not a positional one", () => {
    const { schedule } = parseProgramText(["Push", "bench press 5x5"].join("\n"))
    expect(idsOf(schedule)[0][0]).toBe("lib_bench_press")
  })
})

/**
 * RE-APPLYING THE TEXT KEEPS WHAT THE TEXT CANNOT SAY.
 *
 * A weekday pin, "leave it to me", a custom weight step and a note are all
 * things the text box has no syntax for. The rebuild dropped `weekday`
 * entirely, so typing one character into a week pinned Monday/Thursday
 * unpinned it — the week stopped running by the calendar and started running
 * in order, silently.
 */
/** A parsed week is always load days; `scheduleDays` cannot know that. */
const loadDays = (schedule: ProgramSchedule): DayTemplate[] =>
  scheduleDays(schedule) as DayTemplate[]

describe("what survives re-applying the text", () => {
  const pinned = (): ProgramSchedule => {
    const { schedule } = parseProgramText(["Upper", "Bench Press 5x5 @60", "", "Lower", "Squat 5x5 @80"].join("\n"))
    // `scheduleDays` answers AnyDay[]; a parsed week is always load days.
    const days = loadDays(schedule).map((d, i): DayTemplate => ({ ...d, weekday: i === 0 ? 1 : 4 }))
    const withSettings: DayTemplate[] = days.map((d, i) =>
      i === 0
        ? {
            ...d,
            exercises: (d.exercises as LoadExercise[]).map((e) => ({
              ...e,
              progression: { kind: "none" as const },
              note: "elbows in",
              dropSets: 2,
            })),
          }
        : d
    )
    return { kind: "linear_rotation", days: withSettings }
  }

  test("keeps a Monday pin, 'leave it to me', the weight step and the note", () => {
    const before = pinned()
    const { schedule: reparsed } = parseProgramText(formatProgramText(before, { lib_bench_press: "60", lib_squat: "80" }))
    const after = carryAuthoredSettings(before, reparsed)

    const [upper, lower] = loadDays(after)
    expect(upper.weekday).toBe(1)
    expect(lower.weekday).toBe(4)
    const bench = upper.exercises[0] as LoadExercise
    expect(bench.progression.kind).toBe("none")
    expect(bench.note).toBe("elbows in")
    expect(bench.dropSets).toBe(2)
  })

  test("renaming one day keeps its pin, because the count has not changed", () => {
    const before = pinned()
    const { schedule: reparsed } = parseProgramText(["Upper Body", "Bench Press 5x5 @60", "", "Lower", "Squat 5x5 @80"].join("\n"))
    const after = carryAuthoredSettings(before, reparsed)

    // Matched by position, since the label no longer matches.
    expect(loadDays(after)[0].weekday).toBe(1)
    expect(loadDays(after)[1].weekday).toBe(4)
  })

  test("reordering the days moves each pin with its day, by name", () => {
    const before = pinned()
    const { schedule: reparsed } = parseProgramText(["Lower", "Squat 5x5 @80", "", "Upper", "Bench Press 5x5 @60"].join("\n"))
    const after = carryAuthoredSettings(before, reparsed)

    // Lower is Thursday's wherever it sits in the list.
    expect(loadDays(after)[0].label).toBe("Lower")
    expect(loadDays(after)[0].weekday).toBe(4)
    expect(loadDays(after)[1].weekday).toBe(1)
  })

  test("a lift whose id changed but whose name did not keeps its settings", () => {
    // A week saved before the id rule above: positional ids, real names.
    const legacy: ProgramSchedule = {
      kind: "linear_rotation",
      days: [
        {
          id: "d1",
          label: "Upper",
          weekday: 1,
          exercises: [
            {
              id: "d1_e1",
              name: "Bench Press",
              metricType: "load",
              scheme: { kind: "linear", sets: 5, reps: 5 },
              progression: { kind: "none" },
              note: "paused",
            } as LoadExercise,
          ],
        },
      ],
    }
    const { schedule: reparsed } = parseProgramText(["Upper", "Bench Press 5x5 @60"].join("\n"))
    const after = carryAuthoredSettings(legacy, reparsed)

    const bench = loadDays(after)[0].exercises[0] as LoadExercise
    expect(bench.id).toBe("lib_bench_press")
    expect(bench.progression.kind).toBe("none")
    expect(bench.note).toBe("paused")
  })

  test("adding a day carries nothing rather than guessing which is which", () => {
    const before = pinned()
    const { schedule: reparsed } = parseProgramText(
      ["Arms", "Curl 3x10 @20", "", "Upper", "Bench Press 5x5 @60", "", "Lower", "Squat 5x5 @80"].join("\n")
    )
    const after = carryAuthoredSettings(before, reparsed)

    const days = loadDays(after)
    // Upper and Lower still match by name. Arms is new and has no pin invented
    // for it from whichever day happened to sit at index 0.
    expect(days[0].label).toBe("Arms")
    expect(days[0].weekday).toBeUndefined()
    expect(days[1].weekday).toBe(1)
    expect(days[2].weekday).toBe(4)
  })
})
