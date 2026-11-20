// @vitest-environment node
import { describe, it, expect } from "vitest"
import { SEQUENCES, allScreens, navLabel, stepOrder, walkPartsOf, isDeepen, nextScreen, onPath, prevScreen, screenById, screenForSection, screenForStep, sequenceById, sequenceOfPlan, type Sequence } from "@/src/goals/planSteps/planSequences"
import { ALL_SECTION_IDS, AREA_SECTIONS, GOAL_SECTIONS } from "@/src/goals/planSteps/planSections"
import { SEQUENCE_KEY, SORTER_KEY, deeperKey } from "@/src/goals/planSteps/planFacts"
import { accountOf, buildStepsOf, deepenItems, nextUp } from "@/src/goals/planSteps/planHome"
import { planNumbers } from "@/src/goals/planSteps/planNumbers"
import { DEFAULT_SORTER, addLineOn, homeOfLine, moveLineTo, sortLines, sorterOfPlan, withSorter } from "@/src/goals/planSteps/planSorter"
import * as ns from "@/src/goals/northStarService"
import { fullPlan } from "@/tests/support/fullLifePlan"

const V1 = sequenceById("v1")

describe("every version keeps every part (Phase 7: nothing removed)", () => {
  it("has V1, V2 and V3, in that order", () => {
    expect(SEQUENCES.map((s) => s.id)).toEqual(["v1", "v2", "v3"])
  })

  for (const seq of SEQUENCES) {
    it(`${seq.id}: every screen of V1 is on the path or on the Deepen list, exactly once`, () => {
      const here = [...seq.screens, ...(seq.deepen ?? [])].map((s) => s.id)
      expect(new Set(here).size).toBe(here.length)
      expect([...here].sort()).toEqual(V1.screens.map((s) => s.id).sort())
      for (const s of V1.screens) {
        const found = allScreens(seq).filter((x) => x.id === s.id)
        expect(found).toHaveLength(1)
        // The screen is the same one: same step, same section, same kind.
        expect(found[0]).toEqual(s)
        expect(screenById(seq, s.id)).toBe(found[0])
        expect(isDeepen(seq, s) !== seq.screens.some((x) => x.id === s.id)).toBe(true)
      }
    })

    it(`${seq.id}: every section id of V1 is reachable (a screen, or inside the sheet or card that holds it)`, () => {
      for (const id of ALL_SECTION_IDS) {
        if ((AREA_SECTIONS as readonly string[]).includes(id)) {
          // Inside an area sheet: Your 10s (now) and Everything open it.
          expect(screenForStep(seq, "now")).not.toBeNull()
        } else if ((GOAL_SECTIONS as readonly string[]).includes(id)) {
          // Inside a goal card: Experiences, Systems and the season's requirements open it.
          for (const step of ["milestones", "systems"] as const) expect(screenForStep(seq, step)).not.toBeNull()
          expect(screenForSection(seq, "season.one-thing")).not.toBeNull()
        } else {
          expect(screenForSection(seq, id)).not.toBeNull()
        }
      }
    })

    it(`${seq.id}: Back and Next walk the path in order, and a Deepen screen walks the Deepen list`, () => {
      const path = seq.screens
      for (let i = 0; i < path.length; i++) {
        expect(nextScreen(seq, path[i])?.id).toBe(path[i + 1]?.id)
        expect(prevScreen(seq, path[i])?.id).toBe(path[i - 1]?.id)
      }
      const deepen = seq.deepen ?? []
      for (let i = 0; i < deepen.length; i++) {
        expect(nextScreen(seq, deepen[i])?.id).toBe(deepen[i + 1]?.id)
        expect(prevScreen(seq, deepen[i])?.id).toBe(deepen[i - 1]?.id)
      }
    })
  }

  it("V2 and V3 share one path and one Deepen list; only V3 turns the go-deeper cards on", () => {
    const [, v2, v3] = SEQUENCES
    expect(v3.screens).toEqual(v2.screens)
    expect(v3.deepen).toEqual(v2.deepen)
    expect(v2.prompts).toBeFalsy()
    expect(v3.prompts).toBe(true)
    expect(V1.deepen).toBeUndefined()
  })

  it("V2 opens on the north star, then the wheel, this season, how to start, goals, systems; Today works after that", () => {
    const v2 = sequenceById("v2")
    expect(v2.screens.map((s) => s.id).slice(0, 6)).toEqual(["star.vision", "now", "season.areas", "pick", "season.one-thing", "systems"])
    expect(v2.screens.map((s) => s.id)).toContain("today")
    expect(onPath(v2, "systems")).toBe(true)
    expect(onPath(v2, "star.self")).toBe(false)
    expect(onPath(v2, "milestones")).toBe(false)
  })

  it("the Deepen list names the rest: the 10s, the rest of the north star, experiences, values, Everything", () => {
    const v2 = sequenceById("v2")
    const titles = deepenItems(v2).map((d) => d.id)
    for (const id of ["star.self", "tens", "milestones", "values.so-far", "values.lists", "values.order", "everything.driving-force", "everything.commit"]) expect(titles).toContain(id)
    expect(deepenItems(V1)).toEqual([])
    // Every item links to an address that exists.
    for (const item of deepenItems(v2)) expect(item.href.startsWith("/plan/new/")).toBe(true)
  })

  it("an address or a jump to a Deepen screen still finds it, and the build steps on the home are the path's", () => {
    const v2 = sequenceById("v2")
    expect(screenById(v2, "values.order")?.step).toBe("values")
    expect(screenForStep(v2, "values")?.id).toBe("values.so-far")
    expect(screenForSection(v2, "season.why")?.id).toBe("season.why")
    expect(buildStepsOf(v2)).toEqual(["star", "now", "focus", "pick", "systems"])
  })

  it("the version is a plan answer; none or an unknown one is V1", () => {
    expect(sequenceOfPlan({ answers: {} }).id).toBe("v1")
    expect(sequenceOfPlan({ answers: { [SEQUENCE_KEY]: "v2" } }).id).toBe("v2")
    expect(sequenceOfPlan({ answers: { [SEQUENCE_KEY]: "v3" } }).id).toBe("v3")
    expect(sequenceOfPlan({ answers: { [SEQUENCE_KEY]: "x" } }).id).toBe("v1")
  })
})

describe("Next up on a version with a Deepen list", () => {
  const today = "2026-11-20"
  const seq = (id: string): Sequence => sequenceById(id)

  it("never sends to a Deepen screen, and treats the wheel's score as optional once started", () => {
    let plan = ns.emptyNsPlan()
    plan = ns.setNorthStar(plan, "A life I am proud of")
    plan = ns.setAnswer(plan, "star_why", "Because")
    const numbers = planNumbers(plan, accountOf(plan), today)
    // V1: the north star step still has the questions under the paragraph open, so it is the next step.
    const v1 = nextUp(seq("v1"), plan, numbers, today)
    expect(v1.kind === "build" && v1.step).toBe("star")
    // V2: those questions are on the Deepen list, so the north star is done for the quick start; the wheel is next.
    const v2 = nextUp(seq("v2"), plan, numbers, today)
    expect(v2.kind === "build" && v2.step).toBe("now")
    expect(v2.kind === "build" && v2.screen.id).toBe("now")
  })

  it("a started wheel no longer holds Next up in V2", () => {
    let plan = ns.emptyNsPlan()
    plan = ns.setNorthStar(plan, "A life I am proud of")
    plan = ns.setAnswer(plan, "star_why", "Because")
    const area = plan.areas[0]
    plan = ns.setAreaReview(plan, area.id, { ten: "A clear picture" })
    const numbers = planNumbers(plan, accountOf(plan), today)
    const v2 = nextUp(seq("v2"), plan, numbers, today)
    expect(v2.kind === "build" ? v2.step : "").not.toBe("now")
    for (const id of ["v2", "v3"]) {
      const n = nextUp(seq(id), plan, numbers, today)
      if (n.kind === "build") expect(isDeepen(seq(id), n.screen)).toBe(false)
    }
  })
})

describe("the sorter (Q8)", () => {
  it("is S1 unless the plan says otherwise", () => {
    expect(DEFAULT_SORTER).toBe("s1")
    expect(sorterOfPlan({ answers: {} })).toBe("s1")
    expect(sorterOfPlan({ answers: { [SORTER_KEY]: "s2" } })).toBe("s2")
    expect(sorterOfPlan({ answers: { [SORTER_KEY]: "s3" } })).toBe("s3")
    expect(sorterOfPlan({ answers: { [SORTER_KEY]: "nope" } })).toBe("s1")
    expect(sorterOfPlan(withSorter(ns.emptyNsPlan(), "s3"))).toBe("s3")
  })

  it("reads a rate as Systems and a one-off as Experiences", () => {
    expect(homeOfLine("Train 3 times a week")).toBe("systems")
    expect(homeOfLine("See the northern lights")).toBe("experiences")
  })

  it("splits typed lines by where they read as belonging", () => {
    const text = "Train 3 times a week\nSee the northern lights\nMeditate daily"
    expect(sortLines(text, "systems")).toEqual({ stay: ["Train 3 times a week", "Meditate daily"], away: ["See the northern lights"] })
    expect(sortLines(text, "experiences")).toEqual({ stay: ["See the northern lights"], away: ["Train 3 times a week", "Meditate daily"] })
  })

  const area = () => ns.emptyNsPlan().areas[0].id

  it("S1 is the real writer: a one-off typed on Systems is filed on Experiences", () => {
    const plan0 = ns.emptyNsPlan()
    const plan = ns.addGoalsFromDump(plan0, area(), "See the northern lights")
    const goal = plan.goals[0]
    expect(ns.isMilestone(goal)).toBe(true)
    expect(ns.isSystem(goal)).toBe(false)
  })

  it("Undo (S2) puts the line back on the half it was typed on and it stays there", () => {
    const a = area()
    const moved = ns.addGoalsFromDump(ns.emptyNsPlan(), a, "See the northern lights")
    const back = moveLineTo(moved, a, "See the northern lights", "systems")
    expect(back.goals).toHaveLength(1)
    expect(ns.isSystem(back.goals[0])).toBe(true)
    expect(back.goals[0].title).toBe("See the northern lights")
    // Nothing re-sorts it: the kind is stored, a round trip through the plan's own normaliser keeps it.
    expect(ns.isSystem(ns.normalizeNsPlan(JSON.parse(JSON.stringify(back)))!.goals[0])).toBe(true)
    // And it can go the other way: a rate typed on Experiences.
    const rate = ns.addGoalsFromDump(ns.emptyNsPlan(), a, "Train 3 times a week")
    expect(ns.isSystem(rate.goals[0])).toBe(true)
    const undone = moveLineTo(rate, a, "Train 3 times a week", "experiences")
    expect(ns.isMilestone(undone.goals[0])).toBe(true)
    // An unknown line changes nothing.
    expect(moveLineTo(rate, a, "Something else", "experiences")).toBe(rate)
  })

  it("S3 files the line as answered: 'Every week' keeps a Systems line, 'Want it to happen' moves it", () => {
    const a = area()
    const every = addLineOn(ns.emptyNsPlan(), a, "Two dates a month", "systems")
    expect(ns.isSystem(every.goals[0])).toBe(true)
    const want = addLineOn(ns.emptyNsPlan(), a, "Two dates a month", "experiences")
    expect(ns.isMilestone(want.goals[0])).toBe(true)
    // On the half it reads as, it is exactly the real writer's work (numbers parsed from the line).
    const rate = addLineOn(ns.emptyNsPlan(), a, "Train 3 times a week", "systems")
    expect(rate.goals[0].daysPerWeek).toBe(3)
  })

  it("the go-deeper 'Not now' keys are per item, under start:new:", () => {
    expect(deeperKey("star")).toBe("start:new:deeper:star")
    expect(deeperKey("area", "a1")).toBe("start:new:deeper:area:a1")
    expect(deeperKey("goal", "g2")).toBe("start:new:deeper:goal:g2")
    expect(fullPlan().areas.length).toBeGreaterThan(0)
  })
})

describe("step numbers and Back/Next words follow the version", () => {
  it("numbers the steps in the version's own order, build steps first, default unchanged", () => {
    expect(stepOrder(sequenceById("v1"))).toEqual(["star", "now", "pick", "systems", "milestones", "focus", "values", "recap", "track", "today", "journal", "review"])
    expect(stepOrder(sequenceById("v2"))).toEqual(["star", "now", "focus", "pick", "systems", "milestones", "values", "recap", "track", "today", "journal", "review"])
  })

  it("two buttons that lead to different screens of one step never read alike", () => {
    const v2 = sequenceById("v2")
    const pick = screenById(v2, "pick")!
    expect(navLabel(v2, pick, prevScreen(v2, pick)!)).not.toBe(navLabel(v2, pick, nextScreen(v2, pick)!))
    expect(navLabel(v2, pick, nextScreen(v2, pick)!)).toMatch(/^Season: /)
  })

  it("Part N of M counts along the walk the screen is on", () => {
    const v2 = sequenceById("v2")
    expect(walkPartsOf(v2, screenById(v2, "season.areas")!).map((s) => s.id)).toEqual(["season.areas", "season.one-thing"])
    expect(walkPartsOf(v2, screenById(v2, "season.why")!).map((s) => s.id)).toEqual(["season.why", "season.who", "season.order"])
    const first = screenById(v2, "season.areas")!
    expect(navLabel(v2, first, screenById(v2, "season.one-thing")!)).toBe("Part 2 of 2")
  })
})
