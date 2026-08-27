/**
 * EVERY ROW MUST BE ABLE TO KEEP THE PROMISE ITS OWN WORDS MAKE.
 *
 * Reported from the page: *"we still have multiple things that lead nowhere…
 * reading my driving force… or journal, that doesnt lead anywhere"*, and then
 * the general form of it: *"I am interested in making sure we dont have fields
 * that users want to input into, where it is not possible… develop the system
 * more fully so NO mistakes are there, for ALL boxes."*
 *
 * Both reports were one bug wearing two hats. A routine step's title is a
 * promise — "Read your driving force" promises a document, "Write three
 * gratitudes" promises somewhere to write three gratitudes — and the row could
 * only ever offer a checkbox. Fixing the two named rows would have left the
 * other nineteen, so the rule is enforced over the whole library instead:
 *
 *   - a step whose words say READ must name a destination that resolves;
 *   - a step whose words say WRITE must carry the question it asks;
 *   - and neither may point at something that does not exist.
 *
 * This is deliberately a test about MEANING and not about shape. "Has a
 * non-empty `goesTo`" would pass on a step pointing at a deleted goal, and
 * "`asks` is a string" would pass on the string "asks". So the read half is
 * checked by resolving the destination against a filled-in plan, and the write
 * half by round-tripping an answer through the store and reading it back.
 */

import { describe, it, expect } from "vitest"
import { ROUTINE_BLUEPRINTS, JOURNAL_SETS, JOURNAL_PROMPTS, NS_PLAN_VERSION } from "@/src/goals/data/northStar"
import {
  addPractice,
  addRoutine,
  emptyNsPlan,
  loadNsPlan,
  serializeNsPlan,
  updateStep,
  journalEntry,
  setAnswer,
  setJournalEntry,
  setNorthStar,
  setValues,
  addGoal,
  answerOf,
  seasonFocus,
  setSeasonFocus,
  updateGoal,
} from "@/src/goals/northStarService"
import { destination, destinations, journalArchive, journalQuestions } from "@/src/goals/northStarTrackService"
import type { NsPlan, RoutineBlueprintStep } from "@/src/goals/types"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import { SEASON_FOCUS_COPY } from "@/src/goals/data/northStar"

/**
 * A plan with something written in every readable part of it.
 *
 * The destinations have to be resolved against a plan that HAS a north star, a
 * why, an identity, standards, values and a goal, because `readSources` only
 * offers what has been written — resolving them against an empty plan would
 * report every row as broken and prove nothing.
 */
function filledPlan(): NsPlan {
  let plan = emptyNsPlan()
  plan = setNorthStar(plan, "I wake up near the water with my family and my days are my own.")
  plan = setAnswer(plan, "star_why", "Because I have seen what the other version of this costs.")
  plan = setAnswer(plan, "identity_total", "I am a disciplined man who finishes things.")
  plan = setAnswer(plan, "conduct", "To be on time. To be kind when it is expensive.")
  plan = setAnswer(plan, "affirmations", "I do what I said I would do.")
  plan = setValues(plan, ["Health", "Freedom", "Family"])
  const area = plan.areas[0]
  plan = addGoal(plan, area.id, "Bench 100 kg")
  const goal = plan.goals[plan.goals.length - 1]
  plan = updateGoal(plan, goal.id, { why: "Because I want to be strong at fifty." })
  return plan
}

/** Every library step of every blueprint, tagged with where it came from. */
const LIBRARY: Array<{ blueprintId: string; step: RoutineBlueprintStep }> = ROUTINE_BLUEPRINTS.flatMap((bp) =>
  bp.library.map((step) => ({ blueprintId: bp.id, step }))
)

/**
 * WHAT A TITLE PROMISES, read the way a person reads it.
 *
 * Kept here rather than imported from the source it is checking: a test that
 * asks the code what the code meant cannot catch the code being wrong about it.
 * These are the verbs, and they are the ones that appeared in the report.
 */
const READS = ["read your", "read my", "re-read", "look at your", "see one scene", "feel it as though"]
const WRITES = ["write ", "journal", "two lines", "note down", "jot down", "write down"]
/**
 * Titles that hold a writing word and are not asking you to write.
 *
 * "Read ten pages" and "Read in bed" are reading; "Write two hundred words
 * about anything" is the one growth step that genuinely asks for words. Listed
 * by id, so adding a step to the library and forgetting about it fails the test
 * rather than being quietly swept into an exception.
 */
const NOT_A_QUESTION = new Set<string>([])

describe("every routine step can keep the promise its title makes", () => {
  it("has a library to check at all", () => {
    // The whole suite is a loop over this list; an empty one would pass
    // silently and report nothing, which is the failure mode these tests exist
    // to stop.
    expect(LIBRARY.length).toBeGreaterThan(70)
  })

  it("sends every row whose words say READ to something that actually resolves", () => {
    const plan = filledPlan()
    const broken: string[] = []
    for (const { blueprintId, step } of LIBRARY) {
      const title = step.title.toLowerCase()
      if (!READS.some((phrase) => title.includes(phrase))) continue
      // `visual-board` is the one honest exception and it is named, not
      // silently skipped: "Look at your pictures of it" names a thing this app
      // has no store for, and inventing a destination for it would be the row
      // lying differently.
      if (step.id === "visual-board") continue
      const withStep = addPractice(plan, blueprintId, step.id)
      const planted = withStep.routines.flatMap((r) => r.steps).find((s) => s.id === step.id)
      if (!planted) {
        broken.push(`${blueprintId}/${step.id}: never landed in the plan`)
        continue
      }
      if (!planted.goesTo) {
        broken.push(`${blueprintId}/${step.id} ("${step.title}"): says read, points nowhere`)
        continue
      }
      if (!destination(withStep, planted.goesTo)) {
        broken.push(`${blueprintId}/${step.id}: points at "${planted.goesTo}", which does not exist`)
      }
    }
    expect(broken).toEqual([])
  })

  it("gives every row whose words say WRITE a question and a box that keeps the answer", () => {
    const plan = filledPlan()
    const broken: string[] = []
    for (const { blueprintId, step } of LIBRARY) {
      const title = step.title.toLowerCase()
      if (!WRITES.some((phrase) => title.includes(phrase))) continue
      if (NOT_A_QUESTION.has(step.id)) continue
      const withStep = addPractice(plan, blueprintId, step.id)
      const planted = withStep.routines.flatMap((r) => r.steps).find((s) => s.id === step.id)
      if (!planted?.asks?.trim()) {
        broken.push(`${blueprintId}/${step.id} ("${step.title}"): asks for words, offers only a tick`)
        continue
      }
      // The box is only real if what goes into it comes back out. A step whose
      // id the journal refuses would render a textarea that forgets on blur,
      // which looks exactly like a working box until somebody reloads.
      const written = setJournalEntry(withStep, "2026-08-25", step.id, "Something I wrote.")
      if (journalEntry(written, "2026-08-25", step.id) !== "Something I wrote.") {
        broken.push(`${blueprintId}/${step.id}: has a question, and the answer does not save`)
      }
    }
    expect(broken).toEqual([])
  })

  it("never points a row at a destination that is not on offer", () => {
    // The picker and the arrow read one list. A step arriving with an id that
    // is not in it would draw "what this points at is empty" on a canon row.
    const plan = filledPlan()
    const ids = new Set(destinations(plan).map((d) => d.id))
    const wrong: string[] = []
    for (const { blueprintId, step } of LIBRARY) {
      if (!step.goesTo) continue
      if (!ids.has(step.goesTo)) wrong.push(`${blueprintId}/${step.id} → ${step.goesTo}`)
    }
    expect(wrong).toEqual([])
  })

  /**
   * A row may do both, and "Journal" is the row that must.
   *
   * The box on the row is where you write today; the page is where the standard
   * questions and every previous answer live, which is the half the report
   * asked for by name. So the rule is not "one or the other" — it is that a row
   * with a door into the journal must also be able to take today's words where
   * it stands, rather than making somebody leave the morning stack to write one
   * line.
   */
  it("lets a row into the journal write today's words where it stands", () => {
    for (const { blueprintId, step } of LIBRARY) {
      if (step.goesTo !== "journal:all") continue
      expect(step.asks?.trim(), `${blueprintId}/${step.id}`).toBeTruthy()
    }
    // And the one the report named is wired both ways.
    const journal = LIBRARY.find((l) => l.step.id === "journal")!.step
    expect(journal.goesTo).toBe("journal:all")
    expect(journal.asks).toBeTruthy()
  })
})

describe("the journal holds everything that was written into it", () => {
  it("asks a step's question and one you added in the same list", () => {
    let plan = addPractice(filledPlan(), "morning", "gratitude")
    const routine = plan.routines[0]
    expect(routine).toBeDefined()
    plan = { ...plan, fields: [...plan.fields, { id: "f99", label: "One key learning", targetId: null, kind: "write", readSourceId: null }] }

    const questions = journalQuestions(plan, "2026-08-25")
    expect(questions.map((q) => q.question)).toContain("Three things you are grateful for")
    expect(questions.map((q) => q.question)).toContain("One key learning")
    // Where it came from is on the row, because an answer read back in
    // December has to be placeable.
    expect(questions.find((q) => q.id === "gratitude")!.from).toContain("Morning")
    expect(questions.find((q) => q.id === "f99")!.from).toBe("your own question")
  })

  /**
   * The archive's one rule that is not obvious: it reads the STORE, not the
   * questions. Somebody who stops asking "one key learning" after four months
   * has four months of answers, and a join that dropped them to keep the list
   * tidy would be deleting a diary to make the code simpler.
   */
  it("keeps what was written under a question that is no longer asked", () => {
    let plan = addPractice(filledPlan(), "morning", "gratitude")
    plan = setJournalEntry(plan, "2026-08-20", "gratitude", "Coffee, the sea, my brother.")
    // The step goes; the writing stays.
    plan = { ...plan, routines: plan.routines.map((r) => ({ ...r, steps: r.steps.filter((s) => s.id !== "gratitude") })) }

    const archive = journalArchive(plan, "2026-08-25")
    const day = archive.find((d) => d.date === "2026-08-20")
    expect(day?.entries[0].text).toBe("Coffee, the sea, my brother.")
    // And it says what it can honestly say about it, rather than showing an
    // orphaned paragraph under a blank label.
    expect(day?.entries[0].missing).toBe(true)
  })

  it("puts the newest day first and leaves out the days nothing was written on", () => {
    let plan = addPractice(filledPlan(), "morning", "journal")
    plan = setJournalEntry(plan, "2026-08-18", "journal", "Older.")
    plan = setJournalEntry(plan, "2026-08-24", "journal", "Newer.")
    const archive = journalArchive(plan, "2026-08-25")
    expect(archive.map((d) => d.date)).toEqual(["2026-08-24", "2026-08-18"])
  })

  it("does not draw a box for a step that is not being asked of you today", () => {
    // A step placed on Thursday asks you nothing on a Monday, and a box under
    // "Today" for it would be the page inventing a practice.
    let plan = addRoutine(emptyNsPlan(), "work")
    const routine = plan.routines.find((r) => r.blueprintId === "work")!
    plan = addPractice(plan, "work", "mit")
    plan = {
      ...plan,
      routines: plan.routines.map((r) =>
        r.id === routine.id ? { ...r, steps: r.steps.map((s) => (s.id === "mit" ? { ...s, days: [3], daysPerWeek: 1 } : s)) } : r
      ),
    }
    // 2026-08-24 is a Monday; the step is placed on Thursday.
    const monday = journalQuestions(plan, "2026-08-24").find((q) => q.id === "mit")
    expect(monday?.today).toBe(false)
    const thursday = journalQuestions(plan, "2026-08-27").find((q) => q.id === "mit")
    expect(thursday?.today).toBe(true)
  })
})

/**
 * THE PLAN SOMEBODY ALREADY HAS, which is the only plan that matters here.
 *
 * Reported after the first build of all of the above: *"when i click journal, i
 * still dont go anywhere."* Every check above passed, and every one of them ran
 * against a plan built AFTER the change — the new-plan path. On the plan
 * somebody actually had, "Journal" and "Read your driving force" were stored
 * with `goesTo: null`, because that is what creation wrote when inference found
 * nothing, and the loader read that null as a decision it was forbidden to
 * overrule. Both headline fixes were invisible to every existing user.
 *
 * So these run the migration, not the constructor.
 */
describe("a plan saved before any of this adopts what the library now says", () => {
  /** A v1 save: `goesTo` present and null, no `asks` key, version 1. */
  function oldSave(stepIds: string[]): string {
    let plan = addRoutine(emptyNsPlan(), "morning")
    for (const id of stepIds) plan = addPractice(plan, "morning", id)
    const raw = JSON.parse(serializeNsPlan(plan))
    raw.version = 1
    for (const r of raw.routines) {
      for (const s of r.steps) {
        // What v1 stored: null wherever the library had nothing to say yet.
        if (!["star", "read-star"].includes(s.id)) s.goesTo = null
        delete s.asks
      }
    }
    return JSON.stringify(raw)
  }

  const stepOf = (plan: NsPlan, id: string) => plan.routines.flatMap((r) => r.steps).find((s) => s.id === id)!

  it("gives the journal row its door and the driving force row its document", () => {
    const plan = loadNsPlan(oldSave(["journal", "driving-force"]))!
    expect(stepOf(plan, "journal").goesTo).toBe("journal:all")
    expect(stepOf(plan, "driving-force").goesTo).toBe("driving")
  })

  it("gives a writing row the library's question rather than its own title", () => {
    // "Write three gratitudes" is an instruction; "Three things you are
    // grateful for" is a question, and the question is what goes above a box.
    const plan = loadNsPlan(oldSave(["gratitude"]))!
    expect(stepOf(plan, "gratitude").asks).toBe("Three things you are grateful for")
  })

  it("leaves a row somebody has made their own alone", () => {
    const raw = JSON.parse(oldSave(["journal"]))
    raw.routines[0].steps.find((s: { id: string }) => s.id === "journal").title = "Morning pages, longhand"
    const plan = loadNsPlan(JSON.stringify(raw))!
    // Retitled: theirs now. The library does not get to say where it goes.
    expect(stepOf(plan, "journal").goesTo).toBeNull()
  })

  it("re-stamps the plan, so a clearing made from here on is permanent", () => {
    const migrated = loadNsPlan(oldSave(["journal"]))!
    expect(migrated.version).toBe(NS_PLAN_VERSION)
    // Cleared on a v2 plan, and it stays cleared through a save and a reload —
    // the rule the null was always documented as meaning.
    const cleared = updateStep(migrated, migrated.routines[0].id, "journal", { goesTo: null })
    expect(stepOf(loadNsPlan(serializeNsPlan(cleared))!, "journal").goesTo).toBeNull()
  })

  it("still infers for a save so old it has no key at all", () => {
    const raw = JSON.parse(oldSave(["star"]))
    for (const r of raw.routines) for (const s of r.steps) delete s.goesTo
    expect(stepOf(loadNsPlan(JSON.stringify(raw))!, "star").goesTo).toBe("star")
  })
})

/**
 * TWO FIELDS IN THIS PLAN ARE CALLED THE ONE THING, and only one of them is.
 *
 * Reported from the page (2026-08-25): *"the one thing on the tracking page, is
 * still not linked correctly to what is actually my one thing."*
 *
 * Step 3 asks for a sentence and keeps it in `answers[ONE_ANSWERS.oneThing]`,
 * with the why, the cost, the identity and the requirements hung off it. Step 8
 * asks which goal or area the season is for and keeps it in `seasonFocusId` —
 * and its own copy also calls itself "your one thing this season", which is how
 * the dashboard band came to print a picked goal's TITLE under the heading "The
 * one thing".
 *
 * A component test would be the direct check, and the two fields being distinct
 * is the fact that actually matters: nothing may quietly read one for the other
 * again.
 */
describe("the one thing is the sentence somebody wrote", () => {
  it("keeps the season's focus in a different field from the one thing", () => {
    let plan = emptyNsPlan()
    plan = setAnswer(plan, ONE_ANSWERS.oneThing, "Stop drinking on weeknights.")
    plan = addGoal(plan, plan.areas[0].id, "Bench 100 kg")
    plan = setSeasonFocus(plan, plan.goals[plan.goals.length - 1].id)

    // What the band must print.
    expect(answerOf(plan, ONE_ANSWERS.oneThing)).toBe("Stop drinking on weeknights.")
    // What it was printing instead. Both are real; they are not each other.
    expect(seasonFocus(plan)!.label).toBe("Bench 100 kg")
    expect(seasonFocus(plan)!.label).not.toBe(answerOf(plan, ONE_ANSWERS.oneThing))
  })

  /**
   * The lint that stops it happening a fourth time.
   *
   * The season focus has been renamed once already and the name crept back
   * through inline strings in three components — `{isFocus ? "my one thing this
   * season" : ...}` — which no copy review would ever have looked at. So the
   * rule is on the copy object: nothing that describes `seasonFocusId` may call
   * itself the one thing, because a control that does is an invitation to
   * answer the same question in two places and get two answers.
   */
  it("never lets the season focus call itself the one thing", () => {
    const said = [SEASON_FOCUS_COPY.title, SEASON_FOCUS_COPY.pick, SEASON_FOCUS_COPY.picked, SEASON_FOCUS_COPY.banner("X")]
    for (const line of said) expect(line.toLowerCase(), line).not.toContain("one thing")
    // The help may say the words, and has to: naming what it is NOT is the
    // fastest way to settle which of the two somebody is looking at.
    expect(SEASON_FOCUS_COPY.help.toLowerCase()).toContain("not your one thing")
  })

  it("has a one thing to show before any season focus is picked at all", () => {
    // The commonest state: step 3 done, step 8 not reached. The band showed
    // "Nothing named yet" to somebody who had named it.
    let plan = setAnswer(emptyNsPlan(), ONE_ANSWERS.oneThing, "Stop drinking on weeknights.")
    expect(seasonFocus(plan)).toBeNull()
    expect(answerOf(plan, ONE_ANSWERS.oneThing).trim()).toBeTruthy()
  })
})

describe("the standard questions are questions", () => {
  it("offers every set as several questions and not as one box", () => {
    for (const set of JOURNAL_SETS) {
      expect(set.questions.length, set.id).toBeGreaterThan(0)
      for (const q of set.questions) expect(q.trim().length, `${set.id}: ${q}`).toBeGreaterThan(10)
    }
    // The weekly review is the one the report named, and one box is exactly how
    // it stops getting done.
    expect(JOURNAL_SETS.find((s) => s.id === "weekly-review")!.questions.length).toBeGreaterThanOrEqual(3)
  })

  it("has no two prompts that are the same question", () => {
    const all = [...JOURNAL_PROMPTS.map((p) => p.question), ...JOURNAL_SETS.flatMap((s) => s.questions)]
    const seen = new Set(all.map((q) => q.trim().toLowerCase()))
    expect(seen.size).toBe(all.length)
  })
})
