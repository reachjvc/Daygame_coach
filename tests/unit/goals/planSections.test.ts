// @vitest-environment node
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { ALL_SECTION_IDS, AREA_SECTIONS, GOAL_SECTIONS, STEP_SECTIONS, SPLIT_STEPS, ANCHOR_SECTION, stepOfSection, showSection, sectionOfAnchor } from "@/src/goals/planSteps/planSections"
import { SECTION_TITLES } from "@/src/goals/planSteps/sectionTitles"
import { SEQUENCES, screenById, screenForSection, screensForStep, sequenceById } from "@/src/goals/planSteps/planSequences"
import { STAR_PROMPTS, STAR_WHY_ID, REVIEW_PROMPTS, TAB_ORDER, STAR_ANCHOR, RECAP_DRIVING_ANCHOR, RECAP_COMMIT_ANCHOR } from "@/src/goals/data/northStar"
import { ROW_BUCKETS, SCOPE, expandRows } from "./fixtures/splitRows"

describe("planSections", () => {
  it("has unique, kebab-case ids that carry their group's prefix", () => {
    expect(new Set(ALL_SECTION_IDS).size).toBe(ALL_SECTION_IDS.length)
    for (const id of ALL_SECTION_IDS) expect(id).toMatch(/^[a-z]+\.[a-z]+(-[a-z]+)*$/)
    for (const [step, ids] of Object.entries(STEP_SECTIONS)) for (const id of ids) expect(stepOfSection(id)).toBe(step)
    for (const id of AREA_SECTIONS) expect(id.startsWith("area.")).toBe(true)
    for (const id of GOAL_SECTIONS) expect(id.startsWith("goal.")).toBe(true)
  })

  it("names every section in the real tool's words (a title for each)", () => {
    for (const id of ALL_SECTION_IDS) expect(SECTION_TITLES[id].trim().length).toBeGreaterThan(3)
  })

  it("every split step is a real step, and every section of it appears exactly once per sequence", () => {
    for (const seq of SEQUENCES) {
      for (const step of SPLIT_STEPS) {
        expect(TAB_ORDER).toContain(step)
        // The Old version draws each split step as one whole page instead.
        if (seq.whole) {
          expect(screensForStep(seq, step).map((s) => s.section)).toEqual([""])
          continue
        }
        const ids = screensForStep(seq, step).map((s) => s.section)
        expect([...ids].sort()).toEqual([...STEP_SECTIONS[step]].sort())
        expect(new Set(ids).size).toBe(ids.length)
      }
      // No screen names a section that does not exist, and no section sits on two screens.
      const used = seq.screens.map((s) => s.section).filter(Boolean) as string[]
      for (const id of used) expect(ALL_SECTION_IDS).toContain(id)
      expect(new Set(used).size).toBe(used.length)
    }
  })

  it("V1 keeps every step in the real order, and a section's screen has the section as its address", () => {
    const v1 = sequenceById("v1")
    const steps = v1.screens.map((s) => s.step).filter((s, i, a) => a.indexOf(s) === i)
    expect(steps).toEqual(TAB_ORDER)
    for (const s of v1.screens.filter((x) => x.section)) expect(s.id).toBe(s.section)
    expect(screenForSection(v1, "season.why")?.step).toBe("focus")
  })

  it("an old step address falls back to the step's first screen", () => {
    const v1 = sequenceById("v1")
    expect(screenById(v1, "star")?.id).toBe("star.vision")
    expect(screenById(v1, "focus")?.id).toBe("season.one-thing")
    expect(screenById(v1, "values")?.id).toBe("values.so-far")
    expect(screenById(v1, "recap")?.id).toBe("everything.driving-force")
    expect(screenById(v1, "review")?.id).toBe("review.open")
    expect(screenById(v1, "now")?.id).toBe("now")
    expect(screenById(v1, "star.nope")).toBeNull()
  })

  it("a link that names a place in a split step lands on the screen that holds it", () => {
    expect(ANCHOR_SECTION[STAR_ANCHOR]).toBe("star.vision")
    expect(ANCHOR_SECTION[RECAP_DRIVING_ANCHOR]).toBe("everything.driving-force")
    expect(ANCHOR_SECTION[RECAP_COMMIT_ANCHOR]).toBe("everything.commit")
  })

  it("every anchor the real code emits lands on the section that draws it", () => {
    const star = STAR_PROMPTS.map((p) => p.id)
    const review = REVIEW_PROMPTS.map((p) => p.id)
    const of = (a: string) => sectionOfAnchor(a, star, STAR_WHY_ID, review)
    for (const p of STAR_PROMPTS) expect(of(`star-${p.id}`), p.id).toBe(p.id === STAR_WHY_ID ? "star.vision" : "star.self")
    for (const id of review) expect(of(`prompt-${id}`), id).toBe("everything.commit")
    expect(of(STAR_ANCHOR)).toBe("star.vision")
    expect(of("star-nope")).toBeUndefined()
    expect(of("journal-set-x")).toBeUndefined()
    // and the emitter in the track service uses exactly these two shapes
    const src = readFileSync("src/goals/northStarTrackService.ts", "utf8")
    expect(src).toContain("`star-${prompt.id}`")
    expect(src).toContain("`prompt-${prompt.id}`")
  })

  it("showSection draws everything without a section and only its own with one", () => {
    expect(showSection(undefined, "star.vision")).toBe(true)
    expect(showSection("", "star.vision")).toBe(true)
    expect(showSection("star.self", "star.vision")).toBe(false)
    expect(showSection("star.self", "star.self")).toBe(true)
  })
})

describe("every checklist row of the split parts has one home", () => {
  const scope = new Set(SCOPE.flatMap(expandRows))
  const placed = Object.entries(ROW_BUCKETS).flatMap(([bucket, specs]) => specs.flatMap(expandRows).map((id) => [id, bucket] as const))

  it("places each row of the scope exactly once, and nothing outside it", () => {
    const seen = new Map<string, string>()
    for (const [id, bucket] of placed) {
      expect(seen.has(id), `${id} is in both ${seen.get(id)} and ${bucket}`).toBe(false)
      seen.set(id, bucket)
    }
    expect([...seen.keys()].filter((id) => !scope.has(id))).toEqual([])
    expect([...scope].filter((id) => !seen.has(id))).toEqual([])
    expect(scope.size).toBe(383)
  })

  it("every bucket that is a section names a real section, and every section has rows", () => {
    const notScreens = new Set(["frame", "rule", "outside", "new-only", "n/a", "sheet-wide", "card-row"])
    for (const bucket of Object.keys(ROW_BUCKETS)) if (!notScreens.has(bucket)) expect(ALL_SECTION_IDS).toContain(bucket as never)
    for (const id of ALL_SECTION_IDS) expect(ROW_BUCKETS[id]?.length ?? 0, id).toBeGreaterThan(0)
  })
})
