/**
 * WHICH LINES MEAN "NEVER DO THIS".
 *
 * THE DEFECT THESE PIN. The reader used to treat any line STARTING with a
 * stop-verb as a prohibition, whatever followed it. Measured across forty
 * realistic titles it fired on twenty-seven, and eighteen of those were wrong:
 *
 *   "Drop 15 kg"            became a daily yes/no with the number discarded
 *   "Stop weighing 95 kg"   the same
 *   "Quit my job"           a thing to do once, filed as a daily practice
 *   "Kick my first football" likewise
 *   "Drop a mixtape", "Cut out the middleman", "Give up the flat in town"
 *
 * Two further faults, both found while fixing it:
 *
 *   `\b` after a Danish vowel never matches in JavaScript, because `å` is not
 *   a word character. `/undgå\b/` therefore could not match "Undgå slik" —
 *   one of the two Danish stop-verbs had been dead since it was written, in a
 *   product whose owner writes Danish.
 *
 *   There were TWO word lists for one question. The bare "no X" form used an
 *   English-only one, so "Ingen alkohol", "Ingen rygning", "Intet sukker" and
 *   "Ingen porno" all failed while "Ingen hash" worked — hash being a word
 *   both languages share. They are one list now.
 *
 * WHY THIS MATTERS MORE THAN IT USED TO. The reading is now STORED on the goal
 * rather than taken from the title on every load, so a wrong guess no longer
 * corrects itself when the title is edited. A sticky guess has to be a good
 * one, and the shape buttons have to be able to overrule it — which is what
 * the last block here checks.
 */

import { describe, it, expect } from "vitest"
import {
  addGoal,
  emptyNsPlan,
  loadNsPlan,
  readsAsAbstinence,
  serializeNsPlan,
  setGoalType,
  updateGoal,
} from "@/src/goals/northStarService"

/** Lines that genuinely mean "never do this". */
const PROHIBITIONS = [
  "No weed",
  "Quit porn",
  "Stop drinking",
  "No more doomscrolling",
  "Cut out sugar",
  "Give up energy drinks",
  "No social media",
  "Stop vaping",
  "Stop procrastinating on the business plan",
  "Stop overthinking approaches",
  "Stop apologising",
  // A date or a time is not a quantity — these are still prohibitions.
  "Stop smoking in 2027",
  "Stop scrolling after 22:00",
  // Danish, which the owner writes.
  "Kvit smøger",
  "Undgå slik",
  "Undgå sukker",
  "Kvit alkohol",
  "Hold op med at ryge",
  "Stop med sodavand",
  "Ingen alkohol",
  "Ingen rygning",
  "Intet sukker",
  "Ingen sodavand",
  "Ingen porno",
  "Ingen hash",
  "Intet slik",
]

/** Lines that are NOT prohibitions, however they start. */
const NOT_PROHIBITIONS = [
  // A number means it is a target, whatever verb it opens with.
  "Drop 15 kg",
  "Stop weighing 95 kg",
  "Cut down to 10 cigarettes",
  // A stop-verb with no habit after it.
  "Quit my job",
  "Stop being late",
  "Cut down on meetings",
  "No more excuses",
  "Stop caring what people think",
  "Give up the flat in town",
  "Kick my first football",
  "Drop into the splits",
  "Drop a mixtape",
  "Stop the car at 100 km/h",
  "Stop losing money",
  "Quit making the same mistake",
  "Cut out the middleman",
  // The bare "no X" form where X is not something you do.
  "No pain in my back",
  "No fear approaching",
  "No debt",
  "No plan B",
  // Words that merely begin with a stop-verb.
  "Undgåelse af konflikt",
  "Dropbox opsætning",
  // Ordinary goals.
  "Bench press 100 kg",
  "Approach 25 a week",
  "Read 12 books",
  "Save 50000 DKK",
  "Get a girlfriend",
  "Run a marathon",
  "Wake up at 6",
  "Meditate daily",
  "Hold op med at være bange",
]

describe("readsAsAbstinence", () => {
  it("recognises every line that means never", () => {
    const missed = PROHIBITIONS.filter((t) => !readsAsAbstinence(t))
    expect(missed, `not recognised as prohibitions:\n${missed.join("\n")}`).toEqual([])
  })

  it("recognises none of the lines that do not", () => {
    const wrong = NOT_PROHIBITIONS.filter(readsAsAbstinence)
    expect(wrong, `wrongly read as prohibitions:\n${wrong.join("\n")}`).toEqual([])
  })

  it("a quantity settles it, because nobody counts what they will never do", () => {
    // The quantity has to carry a unit or a "to". A bare number is left alone
    // so that "Stop smoking in 2027" and "Stop scrolling after 22:00" survive.
    expect(readsAsAbstinence("Cut out sugar")).toBe(true)
    expect(readsAsAbstinence("Cut sugar to 20 g")).toBe(false)
    expect(readsAsAbstinence("Stop drinking")).toBe(true)
    expect(readsAsAbstinence("Cut down to 2 beers")).toBe(false)
  })

  it("a Danish stop-verb works at all, which it did not", () => {
    // `/undgå\b/` never matched anything: `å` is not a word character, so
    // there is no boundary between it and the space after it.
    expect(readsAsAbstinence("Undgå sukker")).toBe(true)
  })

  it("both forms consult the same list", () => {
    // Danish reached one list and not the other for as long as there were two.
    for (const habit of ["alkohol", "rygning", "sukker", "porno", "hash", "slik"]) {
      expect(readsAsAbstinence(`Ingen ${habit}`), `Ingen ${habit}`).toBe(true)
      expect(readsAsAbstinence(`Kvit ${habit}`), `Kvit ${habit}`).toBe(true)
    }
  })
})

describe("the three shape buttons overrule the guess", () => {
  /**
   * They used to be a lie: `normalizeNsPlan` repairs an abstinence goal's type
   * back to a practice on load, so choosing Target or Finish line lasted only
   * until the page was reopened.
   *
   * As the owner meets it: he writes the line, the flow repairs it to a
   * Practice on the next load, and he then presses one of the three buttons.
   */
  const noWeed = () => {
    const typed = addGoal(emptyNsPlan(), "lm_health", "No weed", "achievement")
    const plan = loadNsPlan(serializeNsPlan(typed))!
    return { plan, id: plan.goals[0].id }
  }

  it("the guess still applies when nobody has said otherwise", () => {
    const { plan } = noWeed()
    expect(plan.goals[0].isAbstinence).toBe(true)
    expect(plan.goals[0].type).toBe("habit_ramp")
  })

  it("choosing Finish line says it is not a prohibition, and it sticks", () => {
    const { plan, id } = noWeed()
    const chosen = setGoalType(plan, id, "achievement")
    expect(chosen.goals[0].isAbstinence).toBe(false)

    const reloaded = loadNsPlan(serializeNsPlan(chosen))!
    expect(reloaded.goals[0].isAbstinence).toBe(false)
    expect(reloaded.goals[0].type).toBe("achievement")
  })

  it("choosing Target does the same", () => {
    const { plan, id } = noWeed()
    const reloaded = loadNsPlan(serializeNsPlan(setGoalType(plan, id, "milestone_ladder")))!
    expect(reloaded.goals[0].isAbstinence).toBe(false)
    expect(reloaded.goals[0].type).toBe("milestone_ladder")
  })

  it("choosing Practice leaves it alone, because that is what a prohibition is", () => {
    const { plan, id } = noWeed()
    const chosen = setGoalType(plan, id, "habit_ramp")
    expect(chosen.goals[0].isAbstinence).toBe(true)
  })
})

describe("a climb is not a prohibition, and that beats the reading", () => {
  /**
   * THE DEFECT THIS PINS. "Quit sugar" with a ladder from 90 to 80 lost the
   * ladder on the SECOND page load, silently. The first load flipped the type
   * to a practice on the strength of the title; the second load then dropped
   * the ladder, because a practice has no business carrying one. Two numbers
   * the person typed, gone, with nothing on screen to say so.
   *
   * A ladder is explicit — somebody entered a start and a target. The title
   * reading is a guess, and an explicit number always wins over a guess.
   */
  const withLadder = (title: string) => {
    const seed = addGoal(emptyNsPlan(), "lm_health", title, "milestone_ladder")
    return updateGoal(seed, seed.goals[0].id, {
      ladder: { start: 90, target: 80, steps: 5, curveTension: 0, controlPoints: [], pins: [] },
      unit: "kg",
    })
  }

  it("the ladder survives four loads, where it used to die on the second", () => {
    let plan = withLadder("Quit sugar")
    for (let i = 0; i < 4; i += 1) plan = loadNsPlan(serializeNsPlan(plan))!

    expect(plan.goals[0].ladder).toMatchObject({ start: 90, target: 80 })
    expect(plan.goals[0].type).toBe("milestone_ladder")
    expect(plan.goals[0].isAbstinence).toBe(false)
  })

  it("whatever the line says", () => {
    for (const title of ["Cut out alcohol", "No weed", "Stop drinking"]) {
      let plan = withLadder(title)
      for (let i = 0; i < 3; i += 1) plan = loadNsPlan(serializeNsPlan(plan))!
      expect(plan.goals[0].ladder, title).toMatchObject({ start: 90, target: 80 })
      expect(plan.goals[0].isAbstinence, title).toBe(false)
    }
  })

  it("and a prohibition with no numbers in it is still a prohibition", () => {
    let plan = addGoal(emptyNsPlan(), "lm_health", "No weed", "achievement")
    for (let i = 0; i < 3; i += 1) plan = loadNsPlan(serializeNsPlan(plan))!

    expect(plan.goals[0].isAbstinence).toBe(true)
    expect(plan.goals[0].type).toBe("habit_ramp")
    expect(plan.goals[0].daysPerWeek).toBe(7)
  })
})
