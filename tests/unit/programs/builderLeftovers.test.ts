// @vitest-environment node
/**
 * THE BUILDER GLUED ANYTHING IT COULD NOT READ ONTO THE LIFT'S NAME.
 *
 * `parseLift` stripped the drop-set marker, then the weight, then the
 * sets×reps, and called whatever was left the name. The leftovers closed up
 * around the hole and went in with it:
 *
 *   Plank 3x30s                -> a lift called "Plank s"
 *   Plank 3x30 sec             -> "Plank sec"
 *   Farmer Carry 3x40m         -> "Farmer Carry m"
 *   Bench Press 3x8 to failure -> "Bench Press to failure"
 *   Back Squat 5x5 @-60        -> "Back Squat @-60"
 *
 * All five parsed with no problem reported and an enabled Start. Saved, the
 * draft holds `{"id":"custom_planks","name":"Plank s","progression":
 * {"kind":"double_progression","incrementKg":2.5}}` — double progression at
 * +2.5 kg a session, on a plank — and "Bench Press to failure" is not the
 * library's Bench Press, so it joins with nothing in History, Progress or
 * "your bests", because `workout_sets.exercise` stores the name.
 *
 * `programText.ts`'s own header promises "NOTHING IS SILENTLY DROPPED …
 * the failure mode this avoids is the one where you paste a program, the app
 * keeps four lines out of five, and you find out in the gym". Gluing the
 * leftovers to the name is worse than dropping them: it is silent AND it
 * makes a lift that looks real.
 *
 * The `DROPS` pattern was added for one instance of this and says so in its
 * comment. This is the rule that instance belonged to.
 */

import { describe, expect, test } from "vitest"
import { parseProgramText } from "@/src/programs/programText"

const lifts = (text: string) => {
  const parsed = parseProgramText(text)
  const days = parsed.schedule.kind === "endurance_weeks" ? [] : parsed.schedule.days
  return days.flatMap((d) => d.exercises.map((e) => e.name))
}

describe("a line with something on it nobody could read", () => {
  for (const [typed, leftover] of [
    ["Plank 3x30s", "s"],
    ["Plank 3x30 sec", "sec"],
    ["Farmer Carry 3x40m", "m"],
    ["Bench Press 3x8 to failure", "to failure"],
    ["Back Squat 5x5 @-60", "@-60"],
  ] as [string, string][]) {
    test(`says so for "${typed}" instead of inventing a lift`, () => {
      const parsed = parseProgramText(`Monday\n${typed}`)
      // `problems` is `{ line, text, reason }[]` — joining the objects gives
      // "[object Object]", which is what the first version of this asserted
      // against and why all five failed for the wrong reason.
      expect(
        parsed.problems.map((p) => p.reason).join(" "),
        `"${leftover}" must be named in the reason`
      ).toContain(leftover)
      expect(parsed.problems[0]?.line, "and the line it is on").toBe(2)
      expect(lifts(`Monday\n${typed}`), "and no lift is created from it").toEqual([])
    })
  }
})

describe("everything the hint advertises still parses", () => {
  // The four syntaxes in `programText.ts`'s header. A parser made stricter
  // has to be checked against what it is meant to accept, not only against
  // what it is meant to reject.
  test("sets by reps", () => {
    expect(lifts("Monday\nBench Press 3x8")).toEqual(["Bench Press"])
  })

  test("a rep range", () => {
    expect(lifts("Monday\nBench Press 3x8-12")).toEqual(["Bench Press"])
  })

  test("a weight, and bodyweight", () => {
    expect(lifts("Monday\nBench Press 3x8 @60")).toEqual(["Bench Press"])
    expect(lifts("Monday\nPush-up 3x10 @bw")).toEqual(["Push-up"])
  })

  test("a superset", () => {
    expect(lifts("Monday\nBench Press 3x8 @40\n+ Chin-up 3x8 @bw")).toHaveLength(2)
  })

  test("drop sets, which is the one instance this rule was already fixed for", () => {
    expect(lifts("Monday\nBench Press 3x8 @60 + 2 drops")).toEqual(["Bench Press"])
  })

  test("a day name, which has no sets and reps and so has no leftovers", () => {
    const parsed = parseProgramText("Push day\nBench Press 3x8")
    const days = parsed.schedule.kind === "endurance_weeks" ? [] : parsed.schedule.days
    expect(days[0].label).toBe("Push day")
    expect(parsed.problems).toEqual([])
  })

  test("a lift the library has never heard of is still kept, under its own name", () => {
    // The point is leftovers, not unknown lifts. Those are deliberately kept.
    expect(lifts("Monday\nZercher Squat 3x8 @60")).toEqual(["Zercher Squat"])
  })
})
