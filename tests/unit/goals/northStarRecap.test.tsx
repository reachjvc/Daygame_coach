// @vitest-environment jsdom

/**
 * THE LAST STEP HAS TO SHOW EVERYTHING, WITHOUT BEING ASKED.
 *
 * Twelve steps write this plan and none of them can show it: each holds a
 * quarter of the answer, and the only way to re-read the lot was a plain-text
 * dump folded away at the bottom of the page. The recap is that dump laid out,
 * and the whole point of it is recollection — "what did I say my values were",
 * "what were my affirmations", "why does this matter to me again".
 *
 * So the test is about what is ON THE SCREEN, not about what the component
 * computes. Everything somebody wrote on another step has to be readable here
 * without clicking into an editor, because a page that hides the answer behind
 * an edit button has not reminded anybody of anything.
 *
 * The second half holds the two rules the page must not break: it never asks
 * for anything (no counts of what is missing, no rings), and editing a block
 * puts the writing step's own box on the page rather than a second copy of it.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { RecapTab, type RecapHandlers } from "@/src/goals/components/north-star/RecapTab"
import type { ValuesHandlers } from "@/src/goals/components/north-star/ValuesWork"
import { RECAP_COPY, SCORED_TABS, SEASON_FOCUS_COPY, STAR_WHY_ID, TAB_LABELS, TAB_ORDER } from "@/src/goals/data/northStar"
import { COMMIT_KEY, ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import {
  addExperiences,
  addGoal,
  emptyNsPlan,
  practiceState,
  setAnswer,
  setAreaReview,
  setCurrentValues,
  setNorthStar,
  setSeasonFocus,
  setValues,
  toggleRoutineStep,
  trackPractice,
} from "@/src/goals/northStarService"
import { stepLogged, toggleStepLogged } from "@/src/goals/northStarTrackService"
import type { NsPlan } from "@/src/goals/types"

afterEach(cleanup)

const NOW = "2026-08-17T09:00:00.000Z"
const TODAY = "2026-08-17"

const STAR = "I wake up near the water and my work pays for itself."
const WHY = "Because I do not want to be sixty and still asking permission."
const IDENTITY = "I am a man who finishes what he starts"
const STANDARD = "To be disciplined"
const AFFIRMATION = "I am the kind of person who trains on the bad days"
const BECOME = "More patient, and better at asking for money."
const TEN = "Strong, light, and not out of breath on the stairs"
const PURPOSE = "Because everything else gets harder when this one slips"
const ONE_THING = "Get my training consistent"

/** A plan with something written on every step the recap reads back. */
function fullPlan(): NsPlan {
  let plan = setNorthStar(emptyNsPlan(), STAR, NOW)
  plan = setAnswer(plan, STAR_WHY_ID, WHY, NOW)
  plan = setAnswer(plan, "identity_total", IDENTITY, NOW)
  plan = setAnswer(plan, "conduct", STANDARD, NOW)
  plan = setAnswer(plan, "affirmations", AFFIRMATION, NOW)
  plan = setAnswer(plan, "become", BECOME, NOW)
  plan = setAnswer(plan, COMMIT_KEY, "I am doing this until June", NOW)
  plan = setAreaReview(plan, "lm_health", { ten: TEN, purpose: PURPOSE, fortnight: 4, values: ["Vitality"] }, NOW)
  plan = setCurrentValues(plan, ["Comfort", "Freedom"], NOW)
  plan = setValues(plan, ["Freedom", "Health", "Mastery"], NOW)
  plan = addExperiences(plan, "See the northern lights", null, NOW)
  return plan
}

const NO_VALUES_HANDLERS = new Proxy({}, { get: () => () => {} }) as ValuesHandlers

function handlers(over: Partial<RecapHandlers> = {}): RecapHandlers {
  return {
    onStar: vi.fn(),
    onHorizon: vi.fn(),
    onAnswer: vi.fn(),
    onAreaReview: vi.fn(),
    onAddExperiences: vi.fn(),
    onToggleExperience: vi.fn(),
    onRemoveExperience: vi.fn(),
    onTickPractice: vi.fn(),
    onTrackPractice: vi.fn(),
    ...over,
  }
}

/**
 * `oneThing` is a PROP, not something read off the plan.
 *
 * The sentence lives on the account. The recap used to read a copy of it out of
 * `plan.answers` and offer a textarea that wrote back to that copy — so editing
 * your one thing here changed something nothing else reads, and the tracking
 * page went on showing the old words. The flow reads the account once and hands
 * it down; these tests hand it down the same way.
 */
function show(plan: NsPlan, over: Partial<RecapHandlers> = {}, oneThing: string | null = null) {
  const h = handlers(over)
  render(
    <RecapTab
      plan={plan}
      today={TODAY}
      handlers={h}
      valuesHandlers={NO_VALUES_HANDLERS}
      onOpenArea={vi.fn()}
      onOpenRoutine={vi.fn()}
      onGoToTab={vi.fn()}
      oneThing={oneThing}
    />
  )
  return h
}

/** Open a folded block by its heading, so its body is on the screen. */
function open(title: string) {
  fireEvent.click(screen.getByText(title))
}

describe("the recap reads the whole plan back", () => {
  it("shows the star, the reason, the identity and the affirmations on arrival", () => {
    show(fullPlan(), {}, ONE_THING)
    // No clicking: these are what somebody came here to be reminded of, so
    // they are open when the page opens.
    expect(screen.getByText(STAR)).toBeTruthy()
    expect(screen.getByText(WHY)).toBeTruthy()
    expect(screen.getByText(IDENTITY)).toBeTruthy()
    expect(screen.getByText(STANDARD)).toBeTruthy()
    expect(screen.getByText(AFFIRMATION)).toBeTruthy()
    expect(screen.getByText(BECOME)).toBeTruthy()
    expect(screen.getByText(ONE_THING)).toBeTruthy()
  })

  it("shows the values in the order they were ranked, and what they replaced", () => {
    show(fullPlan())
    const list = screen.getByText("Freedom").closest("ol")
    expect(list).toBeTruthy()
    const ranked = Array.from(list!.querySelectorAll("li")).map((li) => li.textContent)
    expect(ranked).toEqual(["1Freedom", "2Health", "3Mastery"])
    // The diagnosis under the list: what was driving things before, and what
    // changed. Reading the new list without the old one loses the point of the
    // exercise.
    expect(screen.getByText(new RegExp(RECAP_COPY.valuesPast))).toBeTruthy()
    expect(screen.getByText(new RegExp(RECAP_COPY.valuesDropped))).toBeTruthy()
  })

  it("shows what somebody wrote in an area, and every area's name", () => {
    const plan = fullPlan()
    show(plan)
    open(RECAP_COPY.areasTitle)
    expect(screen.getByText(TEN)).toBeTruthy()
    expect(screen.getByText(PURPOSE)).toBeTruthy()
    expect(screen.getByText("Vitality")).toBeTruthy()
    // Every area, not only the ones with writing in them: the shape of the
    // whole wheel is the thing being recollected.
    for (const area of plan.areas) expect(screen.getAllByText(area.label).length).toBeGreaterThan(0)
  })

  it("shows the list of things to have done, and takes a new one", () => {
    const onAddExperiences = vi.fn()
    show(fullPlan(), { onAddExperiences })
    open(RECAP_COPY.experiencesTitle)
    expect(screen.getByText("See the northern lights")).toBeTruthy()

    const box = screen.getByLabelText(RECAP_COPY.experiencesAdd)
    fireEvent.change(box, { target: { value: "Learn to surf" } })
    fireEvent.click(screen.getByText("Add"))
    expect(onAddExperiences).toHaveBeenCalledWith("Learn to surf")
  })

  it("says nothing at all to a plan nobody has written", () => {
    show(emptyNsPlan())
    expect(screen.getByText(RECAP_COPY.empty)).toBeTruthy()
    // And it does not pretend to read back a plan that does not exist.
    expect(screen.queryByText(RECAP_COPY.valuesTitle)).toBeNull()
  })
})

describe("the two rules the recap must not break", () => {
  it("asks for nothing: no counts of what is missing anywhere on the page", () => {
    // The outstanding work has a home under every tab. A page whose job is
    // being somewhere worth returning to must not open by listing what you owe
    // it, so nothing here may say "of" in the "3 of 5 answered" sense.
    show(fullPlan())
    expect(document.body.textContent).not.toMatch(/\d+ of \d+/)
    expect(document.body.textContent).not.toMatch(/still to fill in/i)
  })

  it("puts the writing step's own box on the page when a block is edited", () => {
    const onStar = vi.fn()
    show(fullPlan(), { onStar })
    // Reading it back is when somebody notices what is wrong with it, and
    // sending them four steps back is how it stays wrong.
    const block = screen.getByText(RECAP_COPY.starTitle).closest("section")!
    fireEvent.click(within(block).getByText(RECAP_COPY.edit))

    const box = screen.getByLabelText(RECAP_COPY.starTitle)
    fireEvent.change(box, { target: { value: "Something else entirely" } })
    expect(onStar).toHaveBeenCalledWith("Something else entirely")
  })

  it("is a step in the rail that is never scored", () => {
    // A ring would fill itself off work already scored on the step that did it.
    expect(TAB_ORDER).toContain("recap")
    expect(SCORED_TABS).not.toContain("recap")
    expect(TAB_LABELS.recap.length).toBeGreaterThan(0)
  })
})

/**
 * THE ONE THING IS THE SENTENCE, NOT THE TICKED GOAL.
 *
 * Reported from the page: "it takes flat bench as my one thing, even though i
 * input 100 days of no weed." Two fields with almost the same name —
 * `seasonFocusId`, the goal you would keep if you dropped everything else,
 * ticked on a goal card weeks ago — and the sentence written on step 3, which
 * is what every other surface in the flow shows. The recap read the first and
 * called it the answer to the second.
 */
describe("the one thing", () => {
  function planWithBoth(): NsPlan {
    const plan = addGoal(emptyNsPlan(), "lm_fitness", "Flat bench 100 kg", "milestone_ladder", NOW)
    return setSeasonFocus(plan, plan.goals[plan.goals.length - 1].id, NOW)
  }

  it("shows what somebody wrote, not the goal they ticked", () => {
    show(planWithBoth(), {}, "100 days of no weed")
    expect(screen.getByText("100 days of no weed")).toBeTruthy()
  })

  /**
   * AND IT IS THE ACCOUNT'S SENTENCE, not anything left in the plan.
   *
   * A plan carrying an old copy of the sentence must not be able to put it on
   * the screen — that copy is what made the two disagree in the first place.
   */
  it("ignores a stale sentence left behind in the plan", () => {
    const stale = setAnswer(planWithBoth(), ONE_ANSWERS.oneThing, "an old sentence nobody saved", NOW)
    show(stale, {}, "100 days of no weed")
    expect(screen.getByText("100 days of no weed")).toBeTruthy()
    expect(screen.queryByText("an old sentence nobody saved")).toBeNull()
  })

  it("still shows the ticked goal, named for what it is", () => {
    show(planWithBoth(), {}, "100 days of no weed")
    // Not dropped — it is real, it is just a different question. Naming it is
    // what stops the two reading as one contradictory answer.
    expect(screen.getByText(SEASON_FOCUS_COPY.banner("Flat bench 100 kg"))).toBeTruthy()
  })
})

/**
 * THE TICK, WHERE THE READING HAPPENS.
 *
 * Reading the north star is a step in the morning stack. Before this the only
 * place to tick it was the Today step, so somebody who had just read the
 * paragraph on this page had to leave it, open Today, unfold the stack and find
 * the line whose entire content they had just done.
 */
describe("ticking a practice off from the page you read it on", () => {
  /** A plan whose morning stack already runs "read your north star out loud". */
  function planTracking(): NsPlan {
    const plan = fullPlan()
    const morning = plan.routines.find((r) => r.blueprintId === "morning")!
    return toggleRoutineStep(plan, morning.id, "star", NOW)
  }

  it("offers to start tracking when nothing in the plan runs it", () => {
    const { running, offer } = practiceState(fullPlan(), "star", TODAY)
    expect(running).toEqual([])
    // The morning stack is one of the four every plan starts with, so this is
    // one step turned on rather than a new routine imposed on somebody.
    expect(offer).toMatchObject({ blueprintId: "morning", stepId: "star", addsRoutine: false })
  })

  it("never offers a second copy of something already running", () => {
    const { running, offer } = practiceState(planTracking(), "star", TODAY)
    expect(running.map((p) => p.stepId)).toEqual(["star"])
    expect(offer).toBeNull()
  })

  it("counts a step somebody wrote in their own words", () => {
    // No library id on it. Offering to add "Read your north star out loud"
    // underneath it would be the page failing to see its own plan.
    const plan = fullPlan()
    const night = plan.routines.find((r) => r.blueprintId === "night")!
    const withOwn = {
      ...plan,
      routines: plan.routines.map((r) =>
        r.id === night.id
          ? { ...r, steps: [...r.steps, { id: "s99", title: "Read my north star before bed", minutes: 2, daysPerWeek: 7, dimension: null, servesGoalIds: [], days: [], startMin: null, goesTo: "star", asks: null }] }
          : r
      ),
    }
    const { running, offer } = practiceState(withOwn, "star", TODAY)
    expect(running.map((p) => p.title)).toEqual(["Read my north star before bed"])
    expect(offer).toBeNull()
  })

  it("ticks into the same day's log the Today step writes to", () => {
    // One event, not two tallies. If these ever became separate stores, a plan
    // would say it was read here and not read there.
    const plan = planTracking()
    expect(stepLogged(plan, TODAY, "star")).toBe(false)
    const ticked = toggleStepLogged(plan, TODAY, "star")
    expect(stepLogged(ticked, TODAY, "star")).toBe(true)
    expect(practiceState(ticked, "star", TODAY).running[0].doneToday).toBe(true)
  })

  it("renders the tick under the north star, and presses it", () => {
    const onTickPractice = vi.fn()
    show(planTracking(), { onTickPractice })
    const block = screen.getByText(RECAP_COPY.starTitle).closest("section")!
    fireEvent.click(within(block).getByText(RECAP_COPY.practiceTick))
    expect(onTickPractice).toHaveBeenCalledWith("star")
  })

  it("presses the offer when nothing runs it yet", () => {
    const onTrackPractice = vi.fn()
    show(fullPlan(), { onTrackPractice })
    const block = screen.getByText(RECAP_COPY.starTitle).closest("section")!
    fireEvent.click(within(block).getByText(RECAP_COPY.practiceStart))
    expect(onTrackPractice).toHaveBeenCalledWith("morning", "star")
  })

  it("turns the step on without duplicating it, and adds the routine only if it has to", () => {
    const plan = fullPlan()
    const started = trackPractice(plan, "morning", "star", NOW)
    const morning = started.routines.find((r) => r.blueprintId === "morning")!
    expect(morning.steps.filter((s) => s.id === "star")).toHaveLength(1)
    expect(started.routines).toHaveLength(plan.routines.length)

    // Pressing it twice must not stack two identical lines in the routine.
    const again = trackPractice(started, "morning", "star", NOW)
    expect(again.routines.find((r) => r.blueprintId === "morning")!.steps.filter((s) => s.id === "star")).toHaveLength(1)

    // The identity lines live only in the manifestation stack, which no plan
    // starts with, so that one really does have to create a routine.
    const identity = practiceState(plan, "identity", TODAY).offer!
    expect(identity).toMatchObject({ blueprintId: "manifestation", addsRoutine: true })
    const withStack = trackPractice(plan, identity.blueprintId, identity.stepId, NOW)
    expect(withStack.routines).toHaveLength(plan.routines.length + 1)
    expect(practiceState(withStack, "identity", TODAY).running).toHaveLength(1)
  })
})
