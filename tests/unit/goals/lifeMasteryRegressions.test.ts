/**
 * EVERY FAILURE FROM THE REBUILD, ENCODED.
 *
 * The owner's verdict was that this kept "ending here" — a fix, then the next
 * seam. Each block below is a real defect that shipped or nearly shipped. They
 * are grouped by FAILURE CLASS rather than by feature, because the recurring
 * problem was never one bug: it was the same mistake in a new place.
 *
 * Rule for anyone adding here: a fix without a test in this file is not a fix.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import {
  classifyGoalInput, createAreaGoal, parseVisionPlanState, loadVisionPlanState,
  setAreaPriority, deriveAreaRank, areaTier, nextLevelTarget,
  removeGoal, addGoalEdge, guideProgress, GUIDE_SESSIONS, pendingActions,
  parseGoalList, headingToArea, readCadence, goalNeedsAction, shrunkTarget,
  buildSmartSentence, ladderSteps, goalNeedsWhy,
  goalIsPlanned, goalGaps, planConformance,
} from "@/src/goals/visionPlanService"
import { goalFeedsArea, blueprintCoverage, LIFE_MASTERY_AREAS } from "@/src/goals/data/lifeMasteryAreas"

/** A minimal valid goal — every creating path stamps an explicit area (v24). */
const makeTestGoal = (over: Record<string, unknown> = {}) => ({
  id: "g1", title: "G", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e",
  objectiveId: null, objectiveLabel: null, type: "habit_ramp" as const, why: "", sourceIntentIds: [],
  habits: [{ id: "g1-h0", title: "h", daysPerWeek: 3 }], tasks: [], measure: null,
  rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }], areaId: "lm_health",
  ...over,
})

const LAB = readFileSync(join(process.cwd(), "src/goals/components/vision-plan/VisionPlanLab.tsx"), "utf8")
const SERVICE = readFileSync(join(process.cwd(), "src/goals/visionPlanService.ts"), "utf8")
const AUDIT = readFileSync(join(process.cwd(), "scripts/vision-plan-flow-audit.mjs"), "utf8")

/** Strip comments so source lints only see code and rendered strings. */
const codeOnly = (src: string) =>
  src.split("\n").filter((l) => {
    const t = l.trim()
    return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*")
  }).join("\n")

// ===========================================================================
// CLASS 1 — READING STATE ACROSS AN UPDATE BOUNDARY.
// Three separate shipped bugs shared this shape: a callback computed a new
// value from a variable captured in an older render. Unit tests never caught
// any of them; only firing events synchronously in a browser did.
// ===========================================================================
describe("class 1 — no state read across an update boundary", () => {
  it("list panels take an UPDATER, never a computed array", () => {
    // Numbering five brainstorm lines in a burst lost four of them, because
    // each click mapped over the same render's copy.
    for (const panel of ["BrainstormPanel", "BeliefWorkPanel"]) {
      const i = LAB.indexOf(`function ${panel}(`)
      expect(i, `${panel} missing`).toBeGreaterThan(-1)
      const sig = LAB.slice(i, LAB.indexOf("{", LAB.indexOf(") {", i)))
      expect(sig, `${panel} must take an updater`).toMatch(/onChange:\s*\(updater:/)
    }
  })

  it("no setState nested inside another setState's updater", () => {
    // This double-added every accepted suggestion: React re-invokes updaters, so
    // a setter called inside one runs twice. Brace-matched rather than regexed —
    // a loose pattern reads sibling calls on the next line as nested ones.
    const code = codeOnly(LAB)
    const nested: string[] = []
    const open = /set[A-Z]\w*\(\((?:prev|p)\w*\)\s*=>\s*\{/g
    for (const m of code.matchAll(open)) {
      let depth = 1
      let i = m.index! + m[0].length
      while (i < code.length && depth > 0) {
        if (code[i] === "{") depth++
        else if (code[i] === "}") depth--
        i++
      }
      const body = code.slice(m.index! + m[0].length, i - 1)
      if (/\bset[A-Z]\w*\(/.test(body)) {
        nested.push(`${code.slice(0, m.index).split("\n").length}: ${m[0]}`)
      }
    }
    expect(nested, `a setter inside an updater runs twice:\n${nested.join("\n")}`).toEqual([])
  })

  it("the debounced suggestion path takes the fresh text as an argument", () => {
    // Re-reading yourTens from the closure fired with the value from BEFORE
    // the blur that armed the timer — a silent no-op that looked like a broken AI.
    expect(LAB).toMatch(/proposeRoomGoals\(areaId,\s*t\)/)
    expect(SERVICE + LAB).toMatch(/dreamOverride/)
  })
})

// ===========================================================================
// CLASS 2 — TRUSTING A DERIVED ARTIFACT OVER THE SOURCE.
// "Not in the curated corpus" was treated as "he never said it"; a doc's stale
// claim re-introduced a field the corpus had disproved.
// ===========================================================================
describe("class 2 — derived artifacts are not the source", () => {
  /**
   * INVERTED 2026-08-03. This guard used to assert `yourZeros` stayed deleted,
   * on the claim that "the corpus disproved it". The corpus never disproved it.
   * A plain `grep` did, against hard-wrapped transcripts, so a phrase split
   * across a newline read as absent. Verified a third time with a
   * whitespace-insensitive search: two hits in wqJ-2N5KVOU, both pairing the 0
   * with the 10.
   *
   * The lesson the original test was reaching for still stands, so it is kept
   * below in its correct form: a "he never said X" claim has to be checked
   * whitespace-insensitively before anything is deleted on the strength of it.
   */
  it("yourZeros exists — the source teaches the 0 in the same breath as the 10", () => {
    expect(readFileSync(join(process.cwd(), "src/goals/types.ts"), "utf8")).toMatch(/yourZeros/)
    expect(SERVICE).toMatch(/yourZeros/)
  })

  it("the canon records the resolution, not the falsified claim", () => {
    const canon = readFileSync(join(process.cwd(), "docs/plans/life-mastery-canon.md"), "utf8")
    // The retraction-of-the-retraction must be present and dated.
    expect(canon, "the canon must record that the deletion rested on a bad grep").toMatch(/RESOLVED 2026-08-03/)
    expect(canon).toMatch(/whitespace-insensitive/)
    // The old instruction must be gone, or it re-seeds the deletion.
    expect(canon).not.toMatch(/It is deliberately NOT re-added here/)
  })

  it("the grep-across-a-line-break lesson is still recorded", () => {
    const canon = readFileSync(join(process.cwd(), "docs/plans/life-mastery-canon.md"), "utf8")
    expect(canon).toMatch(/grep-across-a-line-break/)
    expect(canon).toMatch(/never a plain `grep`/)
  })
})

// ===========================================================================
// CLASS 3 — A GUARD WITH A HOLE WHERE THE NEW WORK WENT.
// The voice lint was correct but only linted files it imported. The flow audit
// could prove existence but not visibility. Both let a whole mode through.
// ===========================================================================
describe("class 3 — the guards cover the new surfaces", () => {
  it("the flow audit can assert VISIBILITY, not just presence", () => {
    expect(AUDIT).toMatch(/visibleCheck/)
    expect(AUDIT).toMatch(/on screen without scrolling/)
  })

  it("audit screenshots default to viewport — fullPage hides the fold by construction", () => {
    expect(AUDIT).toMatch(/const shot = \(n\) => page\.screenshot\(\{ path: `\$\{DIR\}\/\$\{n\}\.png` \}\)/)
    expect(AUDIT).toMatch(/shotFull/)
  })

  it("the audit asserts the first screen's actual geometry", () => {
    expect(AUDIT).toMatch(/the whole wheel fits the first viewport/)
    expect(AUDIT).toMatch(/clicking a room reveals its panel/)
  })
})

// ===========================================================================
// CLASS 4 — FIXING THE INSTANCE INSTEAD OF THE CLASS.
// The "push every area toward 8-9-10" line was replaced in the weekly review
// and left standing in the wheel legend, which is the more-seen spot.
// ===========================================================================
describe("class 4 — contradictions are gone everywhere, not just where I looked", () => {
  it("nothing tells the user to push every area to 8-9-10", () => {
    const hits = codeOnly(LAB).split("\n")
      .map((l, i) => ({ l, i: i + 1 }))
      .filter(({ l }) => /8-9-10|push every area/.test(l))
    expect(hits.map((h) => `${h.i}: ${h.l.trim().slice(0, 90)}`), "contradicts the +1 rule").toEqual([])
  })

  it("the +1 rule is what the product actually says", () => {
    expect(nextLevelTarget(4)).toBe(5)
    expect(nextLevelTarget(10)).toBeNull()
    expect(LAB).toMatch(/one level up/i)
  })
})

// ===========================================================================
// CLASS 5 — AN INVARIANT DOCUMENTED AS ENFORCED, BYPASSED AT THE CALL SITE.
// setAreaPriority was "the ONLY writer" of rank+focus; two pickers wrote
// focusAreaIds directly. The service test passed the whole time.
// ===========================================================================
describe("class 5 — the focus invariant holds at every call site", () => {
  it("the focus projection is called from applyPriority and nowhere else", () => {
    // Hydrate/reset/load-example legitimately bulk-set state; the invariant is
    // that no USER CONTROL edits focus without going through setAreaPriority.
    const code = codeOnly(LAB)
    const callers = [...code.matchAll(/applyFocusProjection\(/g)]
    // one definition + one call (inside applyPriority) + one dep-array mention
    expect(callers.length, "applyFocusProjection must have exactly one call site").toBeLessThanOrEqual(3)
    const applyPriority = code.slice(code.indexOf("const applyPriority"), code.indexOf("const applyPriority") + 700)
    expect(applyPriority, "applyPriority must route through setAreaPriority").toMatch(/setAreaPriority\(/)
    expect(applyPriority, "and then project the focus set").toMatch(/applyFocusProjection\(/)
  })

  it("there is exactly ONE focus-picking control", () => {
    const code = codeOnly(LAB)
    // One definition, one render. ("Domino areas" survives as a GLOSSARY entry,
    // which is a definition of the term, not a control.)
    expect((code.match(/function SeasonPriority\(/g) ?? []).length).toBe(1)
    expect((code.match(/<SeasonPriority/g) ?? []).length, "rendered in exactly one place").toBe(1)
  })

  it("the service still refuses an impossible ranking", () => {
    const known = LIFE_MASTERY_AREAS.map((a) => a.id)
    expect(() => setAreaPriority(["lm_fitness", "lm_fitness"], 1, known)).toThrow()
    expect(() => setAreaPriority(["nope"], 1, known)).toThrow()
    const out = setAreaPriority(["lm_fitness", "lm_money", "lm_fun"], 2, known)
    expect(out.focusAreaIds).toEqual(out.areaRank.slice(0, 2))
  })
})

// ===========================================================================
// CLASS 6 — RENDERING AN INPUT THAT GOES NOWHERE.
// Five inputs shipped with no value and no onChange.
// ===========================================================================
describe("class 6 — every rendered input is controlled", () => {
  it("no <input> or <textarea> without value/checked and onChange", () => {
    const uncontrolled: string[] = []
    const src = codeOnly(LAB)
    const tagRe = /<(input|textarea)\b([\s\S]*?)\/?>/g
    for (const m of src.matchAll(tagRe)) {
      const attrs = m[2]
      if (/\btype=("|')(button|submit|hidden)/.test(attrs)) continue
      const hasValue = /\b(value|checked|defaultValue)=/.test(attrs)
      const hasHandler = /\bon(Change|Input)=/.test(attrs)
      if (!hasValue || !hasHandler) {
        const label = (attrs.match(/aria-label=\{?["`]([^"`]{0,60})/) ?? [])[1] ?? attrs.slice(0, 60)
        uncontrolled.push(label.replace(/\s+/g, " "))
      }
    }
    expect(uncontrolled, `inputs that lose what the user types:\n${uncontrolled.join("\n")}`).toEqual([])
  })
})

// ===========================================================================
// CLASS 6b — CONTROLLED IS NOT THE SAME AS PERSISTED.
// A field can be controlled and still lose the work on navigation, because it
// writes only to component state. Two long forms did exactly that.
// ===========================================================================
describe("class 6b — long forms survive leaving the page", () => {
  it("an approach session log persists", () => {
    const g = makeTestGoal()
    const state = {
      vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: false,
      sessionJournals: [{ id: "s1", date: "2026-07-30", reps: "6", body: "hands still", felt: "fine after two", her: "smiled", next: "slow down" }],
    }
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })

  it("a half-finished weekly review is kept as a draft", () => {
    const g = makeTestGoal()
    const state = {
      vision: "v", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: true,
      progress: {
        startDate: "2026-07-01", completions: {}, tasksDone: [],
        weeklyDraft: { weekStart: "2026-07-27", areaRatings: { lm_health: 5 }, note: "partway", savedAt: "2026-07-30" },
      },
    }
    // 12 sliders and four text fields is not a one-sitting form; losing it
    // halfway is how a weekly ritual stops being weekly.
    expect(parseVisionPlanState(JSON.stringify(state))).toEqual(state)
  })

  it("saving a review clears its draft so it can't resurrect", () => {
    // name-agnostic: the draft key must be destructured away on save
    expect(LAB).toMatch(/weeklyDraft:\s*_\w+,\s*\.\.\.rest\s*\}\s*=\s*saveWeeklyReview/)
  })
})

// ===========================================================================
// CLASS 7 — A CONTROL SHOWING A VALUE THE APP CALLS UNSET.
// value={x ?? 5} beside a "–/10" readout: the thumb sits on 5, and because a
// range fires no event when dragged to its current position, 5 was unreachable.
// ===========================================================================
describe("class 7 — no phantom slider defaults", () => {
  it("a slider with a fallback value must LOOK unset until it's set", () => {
    // The defect isn't the `?? 5` fallback — a range needs a numeric value. It's
    // showing 5 as though chosen while the readout says "–/10", with no way to
    // choose 5 (dragging to the current position fires no event). The fix is a
    // visible unset state plus a tap-to-confirm, which the weekly review does.
    const bad: string[] = []
    for (const m of codeOnly(LAB).matchAll(/<input[\s\S]{0,500}?type="range"[\s\S]{0,500}?\/>/g)) {
      const tag = m[0]
      if (!/value=\{[^}]*\?\?\s*\d/.test(tag)) continue
      const looksUnset = /opacity-\d+|accentColor:\s*[^,}]*==\s*null|null \?/.test(tag)
      if (!looksUnset) {
        bad.push(((tag.match(/aria-label=\{?[`"]([^`"]{0,60})/) ?? [])[1] ?? tag.slice(0, 70)).replace(/\s+/g, " "))
      }
    }
    expect(bad, `sliders showing a value the app calls unset, with no unset styling:\n${bad.join("\n")}`).toEqual([])
  })
})

// ===========================================================================
// CLASS 8 — THREE TAXONOMIES, AND COVERAGE COUNTED THROUGH THE WRONG ONE.
// One goal on the "meaning" pillar counted as feeding SIX of twelve areas, so
// every "N of 12" number in the product was inflated.
// ===========================================================================
describe("class 8 — one area taxonomy, no pillar fan-out", () => {
  it("a goal feeds only the area it is actually assigned to", () => {
    const g = { pillarId: "meaning", areaId: "lm_fun" }
    expect(goalFeedsArea(g, "lm_fun")).toBe(true)
    for (const other of ["lm_mindset", "lm_emotions", "lm_mission", "lm_contribution", "lm_spirituality"]) {
      expect(goalFeedsArea(g, other), `must NOT fan out to ${other}`).toBe(false)
    }
  })

  it("a goal with no area feeds exactly ONE area — never six", () => {
    // The defect was fan-out: one "meaning" goal counted as feeding six of the
    // twelve rooms. An unassigned goal now resolves to its pillar's single
    // primary area, so legacy plans keep their coverage without inflating it.
    for (const pillarId of ["health", "wealth", "relations", "meaning", "vices"]) {
      const fed = LIFE_MASTERY_AREAS.filter((a) => goalFeedsArea({ pillarId }, a.id))
      expect(fed.length, `pillar ${pillarId} must resolve to one area, got ${fed.length}`).toBe(1)
    }
  })

  it("blueprint coverage counts one area per single-area goal", () => {
    expect(blueprintCoverage([{ pillarId: "meaning", areaId: "lm_fun" }]).size).toBe(1)
  })

  it("createAreaGoal always stamps an explicit area", () => {
    const g = createAreaGoal({ areaId: "lm_fun", title: "Ski", type: "habit_ramp", why: "" }, [])
    expect(g.areaId).toBe("lm_fun")
  })
})

// ===========================================================================
// CLASS 8b — THE NAG MUST RESPECT THE SEASON.
// pendingActions was a completionist engine ("Set a goal in every area — 8 have
// none") sitting in the header on every screen, nagging about the very areas
// the user had deliberately deprioritised.
// ===========================================================================
describe("class 8b — the guided path respects deliberate imbalance", () => {
  const base = {
    committedAt: "2026-07-01", values: ["Freedom"], awayValues: [],
    drivingForce: { purpose: "p", reasons: ["r"], identity: ["I am"] },
    yourTens: {}, areaPlans: {}, ritual: null, goals: [], progress: null,
    confirmed: false, today: "2026-07-30",
  }

  it("with a season chosen, it never demands a goal in every area", () => {
    const withSeason = pendingActions({
      ...base,
      areaRank: ["lm_fitness", "lm_money", "lm_health"], focusAreaIds: ["lm_fitness"], focusCount: 1,
    } as never)
    const labels = withSeason.map((a) => a.label).join(" | ")
    expect(labels, "must not nag about deprioritised areas").not.toMatch(/every area|every room/i)
  })

  it("a maintenance area is asked for a floor, not a goal", () => {
    // The guided path surfaces the NEXT thing, so upstream steps must be
    // satisfied before the maintenance-tier ask can appear at all.
    const out = pendingActions({
      ...base,
      values: ["Freedom", "Health", "Family", "Growth", "Integrity"],
      yourTens: { lm_fitness: "lean and strong" },
      areaPlans: { lm_fitness: { purpose: "everything runs on it" } },
      goals: [makeTestGoal({ areaId: "lm_fitness", pillarId: "health" })],
      ritual: { items: [{ id: "rit-water", title: "Water", minutes: 1 }], preset: null },
      areaRank: ["lm_fitness", ...LIFE_MASTERY_AREAS.map((a) => a.id).filter((id) => id !== "lm_fitness")],
      focusAreaIds: ["lm_fitness"], focusCount: 1,
    } as never)
    const labels = out.map((a) => a.label).join(" | ")
    // whatever else it asks, it must never demand goals in deprioritised areas
    expect(labels).not.toMatch(/every area|every room/i)
    // and the maintenance ask, when it comes, is a floor
    const floor = out.find((a) => a.id === "floors")
    if (floor) expect(floor.label).toMatch(/floor/i)
  })
})

// ===========================================================================
// CLASS 9 — WORK DONE IN ONE MODE INVISIBLE TO ANOTHER.
// The Guide reported "0 of 10 done" against a signed plan with a vision,
// goals, values, identity and a manifesto.
// ===========================================================================
describe("class 9 — the Guide sees work done elsewhere", () => {
  it("progress is DERIVED from plan state, not a manual checklist", () => {
    const full = {
      vision: "I am strong", yearDebrief: { good: ["a"], challenges: [], lessons: [] },
      drivingForce: { purpose: "p", reasons: [], identity: ["I am"] },
      areaPlans: { lm_health: { name: "The Engine" } },
      rawWants: [{ id: "w", text: "x", years: 1 as const, circled: true }],
      goals: [{ beliefLevel: 8, desireLevel: 8 }],
      ritual: { items: [{ id: "r", title: "t", minutes: 1 }], preset: null },
      committedAt: "2026-07-01",
    }
    const p = guideProgress([], full as never)
    expect(p.doneCount, "a signed plan cannot read as 0 of 10").toBeGreaterThanOrEqual(6)
    expect(guideProgress([], {} as never).doneCount).toBe(0)
  })

  it("every session has a completion predicate — none is manual-only", () => {
    const p = guideProgress([], {} as never)
    expect(p.total).toBe(GUIDE_SESSIONS.length)
  })
})

// ===========================================================================
// CLASS 10 — PROMISING SOMETHING THE CODE DOESN'T DO.
// The room panel said the fuel field "feeds your driving force" and identity
// "joins your daily card". Both wrote areaPlans; the card read drivingForce.
// ===========================================================================
describe("class 10 — the product does not promise what it doesn't do", () => {
  it("no claim that a per-area field feeds the driving force or daily card", () => {
    const claims = codeOnly(LAB).split("\n")
      .map((l, i) => ({ l: l.trim(), i: i + 1 }))
      .filter(({ l }) => /feeds your driving force|joins your incantations and daily card/i.test(l))
    expect(claims.map((c) => `${c.i}: ${c.l.slice(0, 90)}`), "false destination promise").toEqual([])
  })
})

// ===========================================================================
// CLASS 11 — LOSING A DAY-ONE RATING FOR A WEEK.
// baselineRatings fed the Plan wheel only; Track read weekly reviews, so the
// Track wheel was empty for seven days and week one could not show progress.
// ===========================================================================
describe("class 11 — day-one ratings reach the tracking view", () => {
  it("the Track wheel falls back to the baseline before any review exists", () => {
    expect(LAB).toMatch(/baselineRatings/)
    // the LifeMasteryWheel call must not read reviews alone
    const call = LAB.slice(LAB.indexOf("<LifeMasteryWheel"), LAB.indexOf("<LifeMasteryWheel") + 320)
    expect(call, "Track's wheel must fall back to the day-one baseline").toMatch(/baseline/i)
  })
})

// ===========================================================================
// CLASS 12 — VOICE: THIRD PERSON ABOUT THE SOURCE COACH.
// A user decision ("the vibe should shift into it being ours") violated across
// a whole mode, because the lint only saw the files it imported.
// ===========================================================================
describe("class 12 — the product speaks in our voice", () => {
  it("no third-person narration about the source coach in rendered JSX", () => {
    const bad: string[] = []
    for (const [i, line] of codeOnly(LAB).split("\n").entries()) {
      for (const m of line.matchAll(/>([^<>{}]{12,})</g)) {
        const t = m[1].trim()
        if (/\b([Hh]e|[Hh]is|[Hh]im)\b(?![a-z])/.test(t)) bad.push(`${i + 1}: ${t.slice(0, 80)}`)
      }
    }
    expect(bad, `voice policy v2 — our voice, no guru narration:\n${bad.join("\n")}`).toEqual([])
  })

  it("session copy in the service is in our voice too", () => {
    const bad: string[] = []
    for (const m of codeOnly(SERVICE).matchAll(/(?:ask|why|question|lostItAdvice|title):\s*"([^"]{12,})"/g)) {
      if (/\b([Hh]e|[Hh]is|[Hh]im)\b(?![a-z])/.test(m[1])) bad.push(m[1].slice(0, 80))
    }
    expect(bad, `guide session copy must not narrate about him:\n${bad.join("\n")}`).toEqual([])
  })

  it("era labels don't attribute the plan to a person in the UI", () => {
    const ex = readFileSync(join(process.cwd(), "src/goals/data/lifeMasteryExemplar.ts"), "utf8")
    const block = ex.slice(ex.indexOf("EXEMPLAR_ERA_LABEL"), ex.indexOf("}", ex.indexOf("EXEMPLAR_ERA_LABEL")))
    expect(block).not.toMatch(/\bhis\b/)
  })
})

// ===========================================================================
// CLASS 13 — EXPOSED MACHINERY AND CHANGELOG LEAKING INTO THE UI.
// ===========================================================================
describe("class 13 — no machinery or changelog in user copy", () => {
  it("the UI never talks about AI drafts", () => {
    const bad = codeOnly(LAB).split("\n")
      .map((l, i) => ({ l: l.trim(), i: i + 1 }))
      .filter(({ l }) => /\bAI (drafts?|suggestions?)\b|Redraw AI/i.test(l))
    expect(bad.map((b) => `${b.i}: ${b.l.slice(0, 80)}`)).toEqual([])
  })

  it("no 'now' changelog notes", () => {
    expect(codeOnly(LAB)).not.toMatch(/live in the rooms now/)
  })
})

// ===========================================================================
// REGRESSIONS ALREADY FIXED — kept so they can't come back.
// ===========================================================================
describe("previously fixed, still fixed", () => {
  it("'muscle up' is a finish line, not a weekly habit", () => {
    expect(classifyGoalInput("muscle up", "2026-07-28").type).toBe("achievement")
  })
  it("'run 10k' is 10 km, not 10,000", () => {
    expect(classifyGoalInput("run 10k", "2026-07-28").measure).toMatchObject({ unit: "km", target: 10 })
  })
  it("'get a girlfriend' reads as a relationship goal, not a friendship one", async () => {
    const { readGoalVehicle } = await import("@/src/goals/visionPlanService")
    expect(readGoalVehicle("Get a girlfriend")?.label).toBe("Relationship")
  })
  it("deleting a goal strips inbound links", () => {
    const a = { ...({} as never), id: "a", title: "A", pillarId: "health", pillarLabel: "H", pillarColor: "#0f0", objectiveId: null, objectiveLabel: null, type: "habit_ramp" as const, why: "", sourceIntentIds: [], habits: [{ id: "a-h", title: "h", daysPerWeek: 3 }], tasks: [], measure: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }] }
    const b = { ...a, id: "b", title: "B" }
    const linked = addGoalEdge([a, b], "a", "b")
    expect(removeGoal(linked, "b").flatMap((g) => g.feedsGoalIds ?? [])).not.toContain("b")
  })
  it("a dangling edge repairs and reports instead of nuking the plan", () => {
    const g = { id: "a", title: "A", pillarId: "health", pillarLabel: "H", pillarColor: "#0f0", objectiveId: null, objectiveLabel: null, type: "habit_ramp", why: "", sourceIntentIds: [], habits: [{ id: "a-h", title: "h", daysPerWeek: 3 }], tasks: [], measure: null, rampSteps: [{ frequencyPerWeek: 3, durationWeeks: 4 }], feedsGoalIds: ["ghost"], areaId: "lm_health" }
    const loaded = loadVisionPlanState(JSON.stringify({ vision: "v", intents: [], goals: [g], priorityIds: ["a"], dailyBudget: 4, confirmed: false }))
    expect(loaded).not.toBeNull()
    expect(loaded!.repairs[0]).toMatchObject({ kind: "dangling-edge" })
  })
  it("the values exercise is not gated behind the signature", () => {
    // Commit moved last; gating values on committedAt made them unreachable.
    const i = LAB.indexOf('if (part === "values")')
    expect(LAB.slice(i, i + 200)).not.toMatch(/if \(!committedAt\) return null/)
  })
  it("area migration keeps every area and never duplicates", () => {
    const rank = deriveAreaRank({ focusAreaIds: ["lm_money"], areaScope: { lm_fun: "deep" } })
    expect(new Set(rank).size).toBe(rank.length)
    expect(rank).toHaveLength(LIFE_MASTERY_AREAS.length)
    expect(areaTier(rank, 1, rank[0])).toBe("focus")
  })
})

describe("class 14 — a matcher that scans for any token will match prose", () => {
  // The heading matcher resolved a line if ANY word in it named an area. So
  // "Build the company" (3 words, contains the Mission alias "company") was
  // taken for a heading: the goal vanished from the list AND every line under
  // it was silently re-filed into Mission. Same shape as the \bfriend bug —
  // a substring/token match standing in for "this line IS that thing".
  it("prose that merely contains an area word is not a heading", () => {
    for (const line of ["Build the company", "Become debt free", "Learn to love running", "Save the money"]) {
      const { rows } = parseGoalList(`Business\n  ${line}\n  Ship the MVP`, "2026-07-30")
      expect(rows.map((r) => r.raw), line).toContain(line)
      expect(rows, line).toHaveLength(2)
    }
  })

  it("a real multi-word heading still resolves", () => {
    expect(headingToArea("Health & Fitness")).toBe("lm_health")
    expect(headingToArea("Money and finances")).toBe("lm_money")
  })

  it("a rhythm phrase never eats the quantity out of the title", () => {
    // "Send 20 cold emails a week" cut the whole matched span and left the
    // goal titled "Send". Only the period belongs to the rhythm.
    expect(readCadence("Send 20 cold emails a week")?.title).toBe("Send 20 cold emails")
    expect(readCadence("Cook 4 dinners a week")?.title).toBe("Cook 4 dinners")
    // ...but a pure frequency phrase is all rhythm and all of it goes.
    expect(readCadence("Physio 3 times a week")?.title).toBe("Physio")
    expect(readCadence("Study 5 days a week")?.title).toBe("Study")
  })
})

describe("class 15 — a placeholder must not read as a plan", () => {
  // Every goal is created with one habit so it has something on the calendar.
  // For a finish line that habit is auto-titled "Work toward: <goal>", which
  // names no action — so "no pain in my left knee" went on the calendar three
  // times a week and looked planned.
  it("the auto habit is marked as a placeholder, and a real one is not", () => {
    const finish = createAreaGoal({ areaId: "lm_health", title: "No pain in my knee", type: "achievement", why: "", daysPerWeek: 3, measure: null, targetDate: "2027-01-01" }, [])
    const practice = createAreaGoal({ areaId: "lm_health", title: "Stretch", type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    expect(finish.habits[0].placeholder).toBe(true)
    expect(practice.habits[0].placeholder).toBeUndefined()
    expect(goalNeedsAction(finish)).toBe(true)
    expect(goalNeedsAction(practice)).toBe(false)
  })
})

describe("class 16 — measure math must not assume it goes up", () => {
  it("the shrink hint and the affirmation both respect direction", () => {
    expect(shrunkTarget({ start: 22, target: 14 })).toBe(18)
    expect(buildSmartSentence({ title: "BF", type: "milestone_ladder", targetDate: null, habits: [], measure: { unit: "%", start: 22, target: 14, steps: 5 } }))
      .not.toContain("at least")
  })
  it("a ladder never gets more rungs than its integer range", () => {
    expect(ladderSteps(0, 1)).toBeLessThanOrEqual(2)
    expect(ladderSteps(0, 3)).toBe(3)
  })
})

describe("class 17 — a goal that renders must be a goal that saves", () => {
  // The save gate read `goals.length > 0 && !!result`, so anyone who skipped
  // the vision prose and went straight to a room saved NOTHING: the goal
  // appeared, the room looked right, and it was gone on the next load. Found
  // by reloading the page, which ~40 prior verification runs never did.
  it("persistence does not require the vision analysis to exist", () => {
    const i = LAB.indexOf("const hasPlan =")
    expect(i, "the save gate moved — re-point this test").toBeGreaterThan(-1)
    expect(LAB.slice(i, i + 120)).not.toMatch(/!!\s*result/)
  })

  it("a plan with goals and no vision is still valid state", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "Bench 100 kg", type: "milestone_ladder", why: "", daysPerWeek: 3, measure: { unit: "kg", start: 60, target: 100, steps: 5 }, targetDate: "2027-01-01" }, [])
    const loaded = loadVisionPlanState(JSON.stringify({
      vision: "", intents: [], goals: [g], priorityIds: [g.id], dailyBudget: 4, confirmed: false,
    }))
    expect(loaded).not.toBeNull()
    expect(loaded!.state.goals).toHaveLength(1)
  })
})

describe("class 18 — a default that reads as an answer suppresses the question", () => {
  // Three shipped instances of one mistake, found one at a time by the owner
  // rather than by us: a fabricated `why` ("Because fitness is part of the life
  // I said I want"), a fabricated habit ("Work toward: <goal>"), and a
  // fabricated deadline (today + 365) printed in the SMART sentence. Each read
  // as answered, so nothing could ever ask for the real one.
  it("intake invents no why, no deadline, and marks its stand-in habit", () => {
    for (const line of ["bench 100 kg", "muscle up", "body fat from 22% to 14%", "gym 4x/week"]) {
      const r = classifyGoalInput(line, "2026-07-30")
      expect(r.targetDate, `${line} got a deadline nobody chose`).toBeNull()
      expect(r.why, `${line} got a reason nobody wrote`).toBe("")
    }
    const g = createAreaGoal({ areaId: "lm_fitness", title: "No pain", type: "achievement", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    expect(g.habits[0].placeholder, "the stand-in habit must admit it is one").toBe(true)
  })

  it("the fabrication is gone from the CLASS, not just the branch I was looking at", () => {
    // It survived in the from→to branch after being removed from the other two,
    // which is exactly the shape of class 4.
    const i = SERVICE.indexOf("export function classifyGoalInput")
    const j = SERVICE.indexOf("export function readCadence")
    expect(SERVICE.slice(i, j)).not.toMatch(/targetDate:\s*addDays\(/)
  })

  it("a captured line says it is captured, and says what it still needs", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "Bench 100 kg", type: "milestone_ladder", why: "", daysPerWeek: 3, measure: { unit: "kg", start: 60, target: 100, steps: 5 }, targetDate: null }, [])
    expect(goalIsPlanned(g)).toBe(false)
    expect(goalGaps(g)).toEqual(["a reason", "belief & desire", "a date", "the cost of not"])
    const planned = { ...g, why: "because I am tired of being weak", beliefLevel: 8, desireLevel: 9, targetDate: "2027-01-01", painWhy: "another year of this" }
    expect(goalIsPlanned(planned)).toBe(true)
    expect(goalGaps(planned)).toEqual([])
    expect(LAB, "the row must say so, not just the header badge").toMatch(/not a goal yet/)
  })

  it("conformance measures the plan against the method, not against our features", () => {
    const g = createAreaGoal({ areaId: "lm_fitness", title: "Bench", type: "habit_ramp", why: "", daysPerWeek: 3, measure: null, targetDate: null }, [])
    const empty = planConformance({ goals: [g] })
    expect(empty.stepsTotal).toBe(10)
    expect(empty.stepsDone, "a pasted list is one step of ten").toBe(1)
    expect(empty.goalsTotal).toBe(1)
    expect(empty.goalsPlanned).toBe(0)
    expect(empty.captured[0].gaps).toContain("a reason")
    // Every step carries the reason it exists, so the readout teaches.
    expect(empty.steps.every((s) => s.note.trim().length > 20)).toBe(true)
  })
})

describe("class 19 — the vision is optional, and three gates forgot it", () => {
  // `result` is the analysed-vision object, set only by the prose path. Three
  // separate things treated it as "does this user have a plan":
  //   1. the save gate  -> a room-typed goal was never persisted at all
  //   2. screen 2       -> rendered blank, then CRASHED on result.unmatched
  //   3. areaGroups     -> "0 life areas in your plan" while holding a dozen
  // Each was found one at a time. The class is: a plan is goals, not prose.
  it("nothing gates the plan on the vision having been analysed", () => {
    const gates = [
      /const hasPlan =[^\n]*!!\s*result/,
      /stage === "lifewide" && result &&/,
      /if \(!result\) return \[\]/,
    ]
    for (const g of gates) expect(LAB, `still gated on result: ${g}`).not.toMatch(g)
  })

  it("the deref that actually crashed screen 2 is guarded", () => {
    // `result.unmatched` threw "Cannot read properties of null" for every user
    // who reached screen 2 without typing vision prose. Asserted specifically
    // rather than by sweeping for `result.` — a sweep flags eleven correctly
    // guarded uses and teaches people to ignore this file.
    for (const line of codeOnly(LAB).split("\n")) {
      if (!/result\.unmatched/.test(line)) continue
      expect(line, `unguarded: ${line.trim().slice(0, 80)}`).toMatch(/result\?\.|result &&/)
    }
  })

  it("advancing to screen 2 never required vision prose", () => {
    // This one was already right, and is pinned so it stays right.
    const i = LAB.indexOf("const lifewideReady =")
    expect(LAB.slice(i, i + 140)).toMatch(/goals\.length > 0/)
  })
})

// ===========================================================================
// CLASS 4 — A BROKEN PAGE WITH A GREEN SUITE.
// A bulk copy edit ate a backtick inside a className template literal. The
// whole Life Mastery page failed to parse and every one of the 2,204 tests
// still passed, because no test ever compiles this component. Parse the files
// that no other test would notice were broken.
// ===========================================================================
describe("class 4 — the big components are at least parseable", () => {
  it("has no syntax errors in the Life Mastery surfaces", async () => {
    const ts = await import("typescript")
    const files = [
      "src/goals/components/vision-plan/VisionPlanLab.tsx",
      "src/goals/components/vision-plan/GoalListReview.tsx",
      "src/goals/visionPlanService.ts",
      "src/goals/data/lifeMasteryIntake.ts",
      "src/goals/data/lifeMasteryPrinciples.ts",
    ]
    const broken: string[] = []
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf8")
      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX)
      // `parseDiagnostics` is internal but is the only way to see syntax-only
      // errors without a full program. A type error is not what this guards.
      const diags = (sf as unknown as { parseDiagnostics?: Array<{ messageText: unknown; start?: number }> }).parseDiagnostics ?? []
      for (const d of diags) {
        const line = d.start != null ? src.slice(0, d.start).split("\n").length : 0
        broken.push(`${f}:${line} ${ts.flattenDiagnosticMessageText(d.messageText as never, " ")}`)
      }
    }
    expect(broken, broken.join("\n")).toEqual([])
  })

  it("no template literal in the lab has an unterminated backtick", () => {
    const src = readFileSync(join(process.cwd(), "src/goals/components/vision-plan/VisionPlanLab.tsx"), "utf8")
    // A className that lost its opening backtick still contains `${…}` but the
    // brace opens with a bare identifier. That is the exact shape of the bug.
    const bad = [...src.matchAll(/className=\{(?!`)[A-Za-z_$][^`\n]*\$\{/g)].map((m) => m[0].slice(0, 60))
    expect(bad, `className template lost its backtick:\n${bad.join("\n")}`).toEqual([])
  })
})

// ===========================================================================
// CLASS 5 — A QUESTION WITH NO WAY TO ANSWER IT.
// The intake's very first question, "Are you committing to this?", rendered its
// heading, its why, its worked answer and nothing else, because the renderer
// returned null for `kind: "custom"`. The only control on the page was the
// skip link. The browser check walked straight past it by clicking that link,
// so the verification stepped around the bug instead of finding it.
// ===========================================================================
describe("class 5 — every revealed question has an input", () => {
  /** The pages whose questions are drawn by the generic renderer alone. Pages
   * "areas" and "doing" render the area and goal editors underneath, so a
   * custom question there is backed by real UI either way. */
  const GENERIC_PAGES = new Set(["back", "matters", "going"])

  it("renderIntakeInput handles every question on a generic-renderer page", async () => {
    const { INTAKE_QUESTIONS } = await import("@/src/goals/data/lifeMasteryIntake")
    const body = LAB.slice(LAB.indexOf("const renderIntakeInput"))
    const handled = new Set([...body.slice(0, body.indexOf("}, [yearDebrief")).matchAll(/case "([a-z_]+)":/g)].map((m) => m[1]))
    const unhandled = INTAKE_QUESTIONS
      .filter((q) => GENERIC_PAGES.has(q.page) && !handled.has(q.id))
      .map((q) => `${q.id} (page ${q.page}) — "${q.question.slice(0, 50)}…"`)
    expect(
      unhandled,
      `These questions render a heading and no way to answer it:\n${unhandled.join("\n")}`,
    ).toEqual([])
  })

  it("the commit question is wired to the commitment date, not to the skip link", () => {
    expect(LAB).toMatch(/case "commit":/)
    expect(LAB).toMatch(/<IntakeCommit/)
    expect(LAB, "committing must set the date").toMatch(/onCommit=\{\(\) => setCommittedAt\(today\)\}/)
  })
})
