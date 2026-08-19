/**
 * Everything in the quit-a-vice module that can be wrong without a browser.
 *
 * The tests that matter most are the ones guarding a design decision that
 * somebody could reasonably "fix" later and break: the ruler only ever
 * comparing downwards, the if-then builder rejecting negations, the counter
 * being monotonic, and unlogged days never being scored either way.
 */

import { describe, it, expect } from "vitest"
import {
  acknowledgeSafety,
  addDays,
  addEpisode,
  addPlan,
  availableMissions,
  dangerWindow,
  dateIsBlocked,
  dayNumber,
  dayOutcomes,
  daysHeld,
  emptyEpisode,
  emptyViceState,
  episodeHour,
  experimentDay,
  experimentEnd,
  firstOfNextMonth,
  flowOf,
  flowProgress,
  loadViceState,
  nextMonday,
  payoffSummary,
  planProblem,
  rulerFollowUp,
  rulerNudge,
  serializeViceState,
  setAnswer,
  setExperiment,
  setList,
  setSafety,
  setScale,
  setVice,
  beliefTally,
  criteriaBand,
  HAZARD_DAYS,
  inHazardWindow,
  plansOfKind,
  refusalLadder,
  criteriaTally,
  cueForUrge,
  futureCues,
  liveBeliefs,
  topValues,
  flaggedWithdrawal,
  guessGap,
  setCriterion,
  setGuess,
  setUsage,
  usageIsEmpty,
  usageTotals,
  startDateOptions,
  stepIsDone,
  toggleListItem,
  toggleMission,
  updateEpisode,
  urgeSummary,
  viceAsText,
  viceStateIsUntouched,
  votesCast,
  wordCount,
  WINDOW_MIN_EPISODES,
} from "@/src/vice/viceService"
import type { ViceEpisode, ViceState } from "@/src/vice/types"
import { VICE_FLOWS } from "@/src/vice/data/flows"

const NOW = "2026-08-14"

/** An episode with the fields a given test cares about, rest empty. */
function episode(id: string, at: string, patch: Partial<ViceEpisode> = {}): ViceEpisode {
  return { ...emptyEpisode(id, at), ...patch }
}

function withEpisodes(...episodes: ViceEpisode[]): ViceState {
  return episodes.reduce((state, e) => addEpisode(state, e, NOW), emptyViceState())
}

// ---------------------------------------------------------------- rulers

describe("rulers — the follow-up only ever compares downwards", () => {
  it("never produces a comparison number above the one picked", () => {
    // Arrange / Act: every answer the slider can produce.
    const results = Array.from({ length: 11 }, (_, n) => ({ n, ...rulerFollowUp("importance", n) }))

    // Assert: this is the whole point of the tool. Comparing upwards invites
    // the case against changing, which is the half that predicts nothing
    // happening, so there must be no input that produces one.
    for (const { n, lower } of results) {
      if (lower !== null) expect(lower, `answer ${n}`).toBeLessThan(n)
    }
  })

  it("falls back to a different question at zero, where there is no lower number", () => {
    const { lower, text } = rulerFollowUp("importance", 0)
    expect(lower).toBeNull()
    expect(text).toContain("matter even a little")
  })

  it("substitutes both numbers into the question", () => {
    expect(rulerFollowUp("importance", 6)).toEqual({ lower: 3, text: "How are you at a 6 instead of a 3?" })
    expect(rulerFollowUp("confidence", 2)).toEqual({ lower: 0, text: "How are you at a 2 instead of a 0?" })
  })

  it("never suggests a jump of more than one, and stops at ten", () => {
    for (let n = 0; n < 10; n += 1) expect(rulerNudge("importance", n).up).toBe(n + 1)
    expect(rulerNudge("importance", 10).up).toBeNull()
    expect(rulerNudge("importance", 10).text).toContain("keeps it at a ten")
  })
})

// ---------------------------------------------------------------- plans

describe("if-then plans — negations are refused, not discouraged", () => {
  it("rejects a plan that names what you will not do", () => {
    // A plan phrased as an omission measurably backfires, worst in the people
    // whose habit is strongest, so this has to be a refusal rather than a hint.
    expect(planProblem({ when: "someone offers me one", then: "not take it" })).toBe("negation")
    expect(planProblem({ when: "it gets to six", then: "avoid the kitchen" })).toBe("negation")
    expect(planProblem({ when: "friday", then: "resist it" })).toBe("negation")
    expect(planProblem({ when: "friday", then: "I won't go" })).toBe("negation")
  })

  it("accepts a plan that names an action", () => {
    expect(planProblem({ when: "it gets to six", then: "put the kettle on before I take my coat off" })).toBeNull()
  })

  it("does not fire on words that merely contain a negation", () => {
    // "notice" contains "not", "stopping" is a real action. A validator that
    // cries wolf gets ignored, which costs more than the rule earns.
    expect(planProblem({ when: "I get in", then: "notice where my hands are and start cooking" })).toBeNull()
    expect(planProblem({ when: "the walk home", then: "stop at the shop for something to drink" })).toBeNull()
  })

  it("rejects a cue you could not photograph", () => {
    expect(planProblem({ when: "when I feel like it", then: "go for a walk" })).toBe("vague")
  })

  it("names the empty field rather than failing silently", () => {
    expect(planProblem({ when: "", then: "walk" })).toContain("when")
    expect(planProblem({ when: "six o'clock", then: "" })).toContain("then")
  })

  it("refuses to store an invalid plan", () => {
    const state = addPlan(emptyViceState(), "someone offers", "not take it", NOW)
    expect(state.plans).toHaveLength(0)
  })

  it("stores a valid one, trimmed", () => {
    const state = addPlan(emptyViceState(), "  six o'clock  ", "  start the kettle ", NOW)
    expect(state.plans).toEqual([{ id: expect.any(String), when: "six o'clock", then: "start the kettle", kind: "urge" }])
  })
})

// ---------------------------------------------------------------- payoff

describe("payoff summary", () => {
  it("averages only the episodes that have both numbers", () => {
    const state = withEpisodes(
      episode("a", `${NOW}T18:00:00.000Z`, { expected: 8, actual: 4 }),
      episode("b", `${NOW}T19:00:00.000Z`, { expected: 6, actual: 2 }),
      episode("c", `${NOW}T20:00:00.000Z`, { expected: 9 }),
    )
    const summary = payoffSummary(state)
    expect(summary.n).toBe(2)
    expect(summary.avgExpected).toBe(7)
    expect(summary.avgActual).toBe(3)
    expect(summary.gap).toBe(4)
  })

  it("reports no later average when nobody rated half an hour on", () => {
    const state = withEpisodes(episode("a", `${NOW}T18:00:00.000Z`, { expected: 8, actual: 4 }))
    expect(payoffSummary(state).avgLater).toBeNull()
  })

  it("is empty rather than NaN with nothing logged", () => {
    const summary = payoffSummary(emptyViceState())
    expect(summary).toEqual({ n: 0, avgExpected: 0, avgActual: 0, avgLater: null, gap: 0 })
  })
})

// ---------------------------------------------------------------- urges

describe("urge summary — only the person's own durations", () => {
  it("takes the median of odd and even counts", () => {
    const odd = withEpisodes(
      episode("a", `${NOW}T10:00:00.000Z`, { actedOn: false, minutes: 3 }),
      episode("b", `${NOW}T11:00:00.000Z`, { actedOn: false, minutes: 11 }),
      episode("c", `${NOW}T12:00:00.000Z`, { actedOn: false, minutes: 7 }),
    )
    expect(urgeSummary(odd)).toEqual({ n: 3, medianMinutes: 7, maxMinutes: 11 })

    const even = addEpisode(odd, episode("d", `${NOW}T13:00:00.000Z`, { actedOn: false, minutes: 5 }), NOW)
    expect(urgeSummary(even).medianMinutes).toBe(6)
  })

  it("ignores urges that were acted on — those durations mean something else", () => {
    const state = withEpisodes(
      episode("a", `${NOW}T10:00:00.000Z`, { actedOn: false, minutes: 4 }),
      episode("b", `${NOW}T11:00:00.000Z`, { actedOn: true, minutes: 90 }),
    )
    expect(urgeSummary(state)).toEqual({ n: 1, medianMinutes: 4, maxMinutes: 4 })
  })

  it("returns zeroes rather than guessing when nothing has been timed", () => {
    expect(urgeSummary(emptyViceState())).toEqual({ n: 0, medianMinutes: 0, maxMinutes: 0 })
  })
})

// ---------------------------------------------------------------- window

describe("danger window", () => {
  it("withholds a peak until there is enough to draw one", () => {
    const few = withEpisodes(
      episode("a", `${NOW}T18:30:00.000Z`),
      episode("b", `${NOW}T18:45:00.000Z`),
    )
    expect(few.episodes.length).toBeLessThan(WINDOW_MIN_EPISODES)
    expect(dangerWindow(few).peakHour).toBeNull()
  })

  it("finds the busiest hour once there is", () => {
    const state = withEpisodes(
      episode("a", `${NOW}T18:05:00.000Z`),
      episode("b", `${NOW}T18:30:00.000Z`),
      episode("c", `${NOW}T18:55:00.000Z`),
      episode("d", `${NOW}T09:00:00.000Z`),
    )
    const window = dangerWindow(state)
    expect(window.peakHour).toBe(18)
    expect(window.bars[18].count).toBe(3)
    expect(window.bars).toHaveLength(24)
  })

  it("reads the hour out of the timestamp", () => {
    expect(episodeHour(episode("a", "2026-08-14T07:12:00.000Z"))).toBe(7)
  })
})

// ------------------------------------------------------------- outcomes

describe("day outcomes — a quiet day is never scored", () => {
  it("leaves days with nothing logged out entirely", () => {
    const state = withEpisodes(episode("a", "2026-08-14T18:00:00.000Z", { actedOn: false }))
    const outcomes = dayOutcomes(state)
    // Not "held", not "did" — absent. An app that assumes a silent day went
    // well congratulates somebody who is holding a drink, and is never
    // believed again.
    expect(outcomes.has("2026-08-13")).toBe(false)
    expect(outcomes.get("2026-08-14")).toBe("held")
  })

  it("lets a day that was acted on outrank one that was held", () => {
    const state = withEpisodes(
      episode("a", "2026-08-14T10:00:00.000Z", { actedOn: false }),
      episode("b", "2026-08-14T22:00:00.000Z", { actedOn: true }),
      episode("c", "2026-08-14T23:00:00.000Z", { actedOn: false }),
    )
    expect(dayOutcomes(state).get("2026-08-14")).toBe("did")
    expect(daysHeld(state)).toBe(0)
  })
})

describe("the running total is monotonic by construction", () => {
  it("counts every urge that passed, and a later lapse takes none of them away", () => {
    let state = withEpisodes(
      episode("a", "2026-08-12T18:00:00.000Z", { actedOn: false }),
      episode("b", "2026-08-13T18:00:00.000Z", { actedOn: false }),
    )
    expect(votesCast(state)).toBe(2)

    // The whole design rests on this: nothing that happens afterwards can make
    // the number go down, because a counter that zeroes itself hands somebody
    // both halves of the thing that turns one lapse into abandoning the attempt.
    state = addEpisode(state, episode("c", "2026-08-14T22:00:00.000Z", { actedOn: true }), NOW)
    expect(votesCast(state)).toBe(2)

    state = addEpisode(state, episode("d", "2026-08-15T18:00:00.000Z", { actedOn: false }), NOW)
    expect(votesCast(state)).toBe(3)
  })
})

// ---------------------------------------------------------------- safety

describe("the withdrawal gate", () => {
  it("blocks a date only for a vice that carries a medical risk", () => {
    const drinking = setSafety(setVice(emptyViceState(), "alcohol", "Drinking", NOW), true, NOW)
    expect(dateIsBlocked(drinking)).toBe(true)

    const scrolling = setSafety(setVice(emptyViceState(), "scrolling", "Scrolling", NOW), true, NOW)
    expect(dateIsBlocked(scrolling)).toBe(false)
  })

  it("opens again once the warning has been read", () => {
    let state = setSafety(setVice(emptyViceState(), "alcohol", "Drinking", NOW), true, NOW)
    state = acknowledgeSafety(state, NOW)
    expect(dateIsBlocked(state)).toBe(false)
  })

  it("refuses to store a start date while it is blocked", () => {
    const state = setSafety(setVice(emptyViceState(), "alcohol", "Drinking", NOW), true, NOW)
    expect(setExperiment(state, 14, NOW, NOW).experiment.days).toBeNull()
  })

  it("clears a stale answer when the vice changes", () => {
    // Saying "none of these" about scrolling must not carry over to drinking.
    let state = setSafety(setVice(emptyViceState(), "scrolling", "Scrolling", NOW), false, NOW)
    expect(state.safety.asked).toBe(true)
    state = setVice(state, "alcohol", "Drinking", NOW)
    expect(state.safety).toEqual({ asked: false, withdrawal: false, acknowledged: false })
  })

  it("drops an acknowledgement if the answer is corrected back to none", () => {
    let state = setSafety(setVice(emptyViceState(), "alcohol", "Drinking", NOW), true, NOW)
    state = acknowledgeSafety(state, NOW)
    state = setSafety(state, false, NOW)
    expect(state.safety.acknowledged).toBe(false)
  })
})

// ---------------------------------------------------------------- dates

describe("dates", () => {
  it("counts the start day as day one", () => {
    expect(dayNumber("2026-08-14", "2026-08-14")).toBe(1)
    expect(dayNumber("2026-08-14", "2026-08-20")).toBe(7)
  })

  it("survives the weeks the clocks change", () => {
    // Both directions, in the weeks the UK and the US shift. Done in local
    // milliseconds these come out one short.
    expect(dayNumber("2026-10-24", "2026-10-26")).toBe(3)
    expect(dayNumber("2026-03-28", "2026-03-30")).toBe(3)
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26")
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30")
  })

  it("rolls over months and years", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(firstOfNextMonth("2026-12-14")).toBe("2027-01-01")
    expect(firstOfNextMonth("2026-08-14")).toBe("2026-09-01")
  })

  it("finds a Monday that is strictly ahead", () => {
    for (const day of ["2026-08-14", "2026-08-15", "2026-08-16", "2026-08-17"]) {
      const monday = nextMonday(day)
      const [y, m, d] = monday.split("-").map(Number)
      expect(new Date(y, m - 1, d).getDay(), `${day} → ${monday}`).toBe(1)
      expect(dayNumber(day, monday)).toBeGreaterThan(1)
      expect(dayNumber(day, monday)).toBeLessThanOrEqual(8)
    }
  })

  it("offers today first and never a start more than a fortnight out", () => {
    const options = startDateOptions("2026-08-14")
    expect(options[0]).toEqual({ id: "today", label: "Today", date: "2026-08-14" })
    for (const option of options) expect(dayNumber("2026-08-14", option.date)).toBeLessThanOrEqual(15)
  })
})

// ------------------------------------------------------------ experiment

describe("the experiment", () => {
  it("reports the day and the end date", () => {
    const state = setExperiment(emptyViceState(), 14, "2026-08-14", NOW)
    expect(experimentDay(state, "2026-08-14")).toBe(1)
    expect(experimentDay(state, "2026-08-20")).toBe(7)
    expect(experimentEnd(state)).toBe("2026-08-27")
  })

  it("keeps every length it offered, so the counter-offer is visible", () => {
    let state = emptyViceState()
    state = setExperiment(state, 30, "2026-08-14", NOW)
    state = setExperiment(state, 7, "2026-08-14", NOW)
    expect(state.experiment.offered).toEqual([30, 7])
    expect(state.experiment.days).toBe(7)
  })

  it("shows only day one before a period is set", () => {
    expect(availableMissions(emptyViceState(), NOW)).toHaveLength(1)
  })

  it("releases one mission a day and never expires a missed one", () => {
    const state = setExperiment(emptyViceState(), 30, "2026-08-14", NOW)
    expect(availableMissions(state, "2026-08-14")).toHaveLength(1)
    expect(availableMissions(state, "2026-08-18").map((m) => m.day)).toEqual([1, 2, 3, 4, 5])
    // Day 3 is still there on day 5, because a sequence that expires things is
    // a sequence that resets, and this one does not.
    expect(availableMissions(state, "2026-08-18").some((m) => m.day === 3)).toBe(true)
  })

  it("does not run past the end of the written sequence", () => {
    const state = setExperiment(emptyViceState(), 30, "2026-01-01", NOW)
    expect(availableMissions(state, "2027-01-01").length).toBeLessThanOrEqual(30)
  })

  it("toggles a mission on and back off", () => {
    let state = setExperiment(emptyViceState(), 7, NOW, NOW)
    state = toggleMission(state, 1, NOW)
    expect(state.missionsDone[1]).toBe(NOW)
    state = toggleMission(state, 1, NOW)
    expect(state.missionsDone[1]).toBeUndefined()
  })
})

// ------------------------------------------------------------ persistence

describe("loading a saved state", () => {
  it("round-trips", () => {
    const state = setAnswer(setVice(emptyViceState(), "weed", "Weed", NOW), "x", "hello", NOW)
    expect(loadViceState(serializeViceState(state))).toEqual(state)
  })

  it("returns null on nothing and on rubbish rather than throwing", () => {
    expect(loadViceState(null)).toBeNull()
    expect(loadViceState("")).toBeNull()
    expect(loadViceState("{{{")).toBeNull()
    expect(loadViceState("42")).toBeNull()
  })

  it("fills in fields a copy written by an older build would not have", () => {
    // The failure this prevents is a blank screen: a saved shape missing
    // `episodes` reaches a `.map` and takes the whole page down.
    const loaded = loadViceState(JSON.stringify({ version: 1, viceLabel: "Drinking" }))
    expect(loaded?.episodes).toEqual([])
    expect(loaded?.plans).toEqual([])
    expect(loaded?.voice.says).toEqual([])
    expect(loaded?.card.reasons).toEqual([])
    expect(loaded?.safety).toEqual({ asked: false, withdrawal: false, acknowledged: false })
    expect(loaded?.viceLabel).toBe("Drinking")
  })

  it("repairs a corrupt array rather than trusting it", () => {
    const loaded = loadViceState(JSON.stringify({ version: 1, episodes: "not an array", plans: null }))
    expect(loaded?.episodes).toEqual([])
    expect(loaded?.plans).toEqual([])
  })

  it("knows an untouched state, so an idle visit writes nothing", () => {
    expect(viceStateIsUntouched(emptyViceState())).toBe(true)
    expect(viceStateIsUntouched(setVice(emptyViceState(), "weed", "Weed", NOW))).toBe(false)
  })
})

// ---------------------------------------------------------------- edits

describe("editing", () => {
  it("clamps a slider to the range and rounds it", () => {
    expect(setScale(emptyViceState(), "x", 99, NOW).scales.x).toBe(10)
    expect(setScale(emptyViceState(), "x", -4, NOW).scales.x).toBe(0)
    expect(setScale(emptyViceState(), "x", 6.6, NOW).scales.x).toBe(7)
  })

  it("toggles a list item and refuses a blank one", () => {
    let state = toggleListItem(emptyViceState(), "l", "Bored", NOW)
    expect(state.lists.l).toEqual(["Bored"])
    state = toggleListItem(state, "l", "Bored", NOW)
    expect(state.lists.l).toEqual([])
    state = toggleListItem(state, "l", "   ", NOW)
    expect(state.lists.l).toEqual([])
  })

  it("cannot have an episode's id overwritten by a patch", () => {
    const state = withEpisodes(episode("a", `${NOW}T10:00:00.000Z`))
    const patched = updateEpisode(state, "a", { id: "b", actual: 3 } as Partial<ViceEpisode>, NOW)
    expect(patched.episodes[0].id).toBe("a")
    expect(patched.episodes[0].actual).toBe(3)
  })

  it("stamps createdAt once and updatedAt every time", () => {
    const first = setAnswer(emptyViceState(), "a", "x", "2026-08-14")
    const second = setAnswer(first, "b", "y", "2026-08-15")
    expect(second.createdAt).toBe("2026-08-14")
    expect(second.updatedAt).toBe("2026-08-15")
  })

  it("counts words the way the fields do", () => {
    expect(wordCount("")).toBe(0)
    expect(wordCount("   ")).toBe(0)
    expect(wordCount("one  two\nthree")).toBe(3)
  })
})

// ---------------------------------------------------------------- flows

describe("flows", () => {
  it("every step kind in every flow has a renderer branch and a done rule", () => {
    // The failure this catches is a step that renders as an empty screen
    // because a kind was added to the data and not to the switch.
    const kinds = new Set(VICE_FLOWS.flatMap((f) => f.steps.map((s) => s.kind)))
    for (const flow of VICE_FLOWS) {
      for (const step of flow.steps) {
        expect(() => stepIsDone(emptyViceState(), step), `${flow.id}/${step.id}`).not.toThrow()
      }
    }
    expect(kinds.size).toBeGreaterThan(0)
  })

  it("has unique step ids inside each flow", () => {
    for (const flow of VICE_FLOWS) {
      const ids = flow.steps.map((s) => s.id)
      expect(new Set(ids).size, `${flow.id} has a duplicate step id`).toBe(ids.length)
    }
  })

  it("starts every flow with something to read and a vice to pick", () => {
    for (const flow of VICE_FLOWS) {
      expect(flow.steps[0].kind, flow.id).toBe("intro")
      expect(flow.steps.some((s) => s.kind === "pickVice"), flow.id).toBe(true)
    }
  })

  it("puts the safety gate before anything that sets a date", () => {
    for (const flow of VICE_FLOWS) {
      const safety = flow.steps.findIndex((s) => s.kind === "safety")
      const negotiate = flow.steps.findIndex((s) => s.kind === "negotiate")
      if (negotiate >= 0) {
        expect(safety, `${flow.id} sets a date without asking first`).toBeGreaterThanOrEqual(0)
        expect(safety).toBeLessThan(negotiate)
      }
    }
  })

  it("counts progress over the steps that can actually be finished", () => {
    const flow = flowOf("experiment")
    const empty = flowProgress(emptyViceState(), flow)
    expect(empty.done).toBe(0)
    expect(empty.total).toBeGreaterThan(0)

    const picked = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    expect(flowProgress(picked, flow).done).toBe(1)
  })

  it("throws loudly on an unknown flow rather than rendering nothing", () => {
    // @ts-expect-error — deliberately wrong, to prove it fails rather than blanks.
    expect(() => flowOf("nope")).toThrow(/Unknown vice flow/)
  })
})

// ---------------------------------------------------------------- text

describe("the plain-text read back", () => {
  it("includes what was written and never invents a number", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = addPlan(state, "it gets to six", "start the kettle", NOW)
    state = addEpisode(state, episode("a", `${NOW}T18:00:00.000Z`, { expected: 8, actual: 3 }), NOW)
    const text = viceAsText(state, NOW)

    expect(text).toContain("Quitting: Drinking")
    expect(text).toContain("When it gets to six, then I start the kettle")
    expect(text).toContain("Expected 8, got 3")
  })

  it("says nothing about a log that is empty", () => {
    const text = viceAsText(emptyViceState(), NOW)
    expect(text).not.toContain("WHAT THE LOG SAYS")
  })
})

// ------------------------------------------------------------- awareness

/**
 * The awareness flow's arithmetic and, more importantly, the three places it
 * could quietly start lying: counting criteria that belong to a different
 * vice's set, inventing a severity band for something that has none, and
 * dividing by a guess of zero.
 */
describe("the count", () => {
  const drinking = () => setVice(emptyViceState(), "alcohol", "Drinking", NOW)

  it("counts yes, and reports unsure separately rather than folding it in", () => {
    let state = drinking()
    state = setCriterion(state, "more", "yes", NOW)
    state = setCriterion(state, "cutdown", "yes", NOW)
    state = setCriterion(state, "tolerance", "unsure", NOW)
    state = setCriterion(state, "risky", "no", NOW)

    const tally = criteriaTally(state)
    expect(tally.yes).toBe(2)
    expect(tally.unsure).toBe(1)
    expect(tally.no).toBe(1)
    expect(tally.answered).toBe(4)
    expect(tally.total).toBe(11)
  })

  it("ignores answers belonging to another vice's set after a switch", () => {
    // The eleven for drinking, then switched to scrolling, which uses eight
    // different ids. Counting the leftovers would invent a score from nothing.
    let state = drinking()
    for (const id of ["risky", "withdrawal", "tolerance"]) state = setCriterion(state, id, "yes", NOW)
    expect(criteriaTally(state).yes).toBe(3)

    state = setVice(state, "scrolling", "Scrolling", NOW)
    const tally = criteriaTally(state)
    expect(tally.total).toBe(8)
    // risky/withdrawal/tolerance are not in the impact set, so none of them count.
    expect(tally.yes).toBe(0)
    expect(tally.answered).toBe(0)
  })

  it("bands a substance count on the conventional thresholds", () => {
    let state = drinking()
    expect(criteriaBand(state)?.label).toBe("under two")

    const ids = ["more", "cutdown", "time", "craving", "roles", "social"]
    const bandAfter = (n: number) => {
      let s = drinking()
      for (const id of ids.slice(0, n)) s = setCriterion(s, id, "yes", NOW)
      return criteriaBand(s)?.label
    }
    expect(bandAfter(1)).toBe("under two")
    expect(bandAfter(2)).toBe("two or three")
    expect(bandAfter(4)).toBe("four or five")
    expect(bandAfter(6)).toBe("six or more")
  })

  it("refuses to band a screen or a behaviour, because no honest band exists", () => {
    let state = setVice(emptyViceState(), "scrolling", "Scrolling", NOW)
    for (const id of ["more", "cutdown", "time", "automatic", "roles", "social"]) {
      state = setCriterion(state, id, "yes", NOW)
    }
    expect(criteriaTally(state).yes).toBe(6)
    expect(criteriaBand(state)).toBeNull()
  })

  it("flags the withdrawal item only for substances", () => {
    let state = drinking()
    expect(flaggedWithdrawal(state)).toBe(false)
    state = setCriterion(state, "withdrawal", "yes", NOW)
    expect(flaggedWithdrawal(state)).toBe(true)

    // "Not sure" is not a flag. It is the reason to ask, not the answer.
    state = setCriterion(state, "withdrawal", "unsure", NOW)
    expect(flaggedWithdrawal(state)).toBe(false)
  })
})

describe("the week, multiplied out", () => {
  it("does the arithmetic and counts waking days rather than whole ones", () => {
    const totals = usageTotals({ daysPerWeek: 4, perDay: 5, cost: 6, minutes: 180 })
    expect(totals.unitsPerWeek).toBe(20)
    expect(totals.costPerWeek).toBe(120)
    expect(totals.costPerYear).toBe(6240)
    expect(totals.hoursPerWeek).toBe(12)
    expect(totals.hoursPerYear).toBe(624)
    // 624 / 16, not / 24. Dividing by 24 counts sleep as spendable time.
    expect(totals.wakingDaysPerYear).toBe(39)
  })

  it("returns nulls rather than zeroes when a field is blank", () => {
    const totals = usageTotals({ daysPerWeek: 4, perDay: null, cost: 6, minutes: null })
    expect(totals.unitsPerWeek).toBeNull()
    expect(totals.costPerYear).toBeNull()
    expect(totals.hoursPerYear).toBeNull()
    expect(usageIsEmpty({ daysPerWeek: null, perDay: null, cost: null, minutes: null })).toBe(true)
    expect(usageIsEmpty({ daysPerWeek: 1, perDay: null, cost: null, minutes: null })).toBe(false)
  })

  it("never divides by a guess of zero", () => {
    let state = setUsage(emptyViceState(), { daysPerWeek: 4, perDay: 5, cost: 6 }, NOW)
    state = setGuess(state, 0, NOW)
    // An Infinity here renders as "Infinity× out", which is both wrong and the
    // sort of thing that makes somebody stop believing the rest of the page.
    expect(guessGap(state)).toBeNull()

    state = setGuess(state, 2000, NOW)
    expect(guessGap(state)).toEqual({ guess: 2000, actual: 6240, factor: 3.1 })
  })
})

describe("awareness state survives a reload", () => {
  it("treats an answered criterion as worth saving", () => {
    expect(viceStateIsUntouched(emptyViceState())).toBe(true)
    // Without this the flow silently saves nothing until a vice is picked.
    expect(viceStateIsUntouched(setCriterion(emptyViceState(), "more", "yes", NOW))).toBe(false)
    expect(viceStateIsUntouched(setUsage(emptyViceState(), { daysPerWeek: 3 }, NOW))).toBe(false)
  })

  it("round-trips, and fills awareness in for a state saved before it existed", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = setCriterion(state, "more", "yes", NOW)
    state = setUsage(state, { daysPerWeek: 4, perDay: 5 }, NOW)
    const back = loadViceState(serializeViceState(state))
    expect(back?.awareness.criteria.more).toBe("yes")
    expect(back?.awareness.usage.daysPerWeek).toBe(4)

    const old = JSON.stringify({ version: 1, viceId: "alcohol", answers: {}, episodes: [] })
    const migrated = loadViceState(old)
    expect(migrated?.awareness.criteria).toEqual({})
    expect(migrated?.awareness.usage).toEqual({ daysPerWeek: null, perDay: null, cost: null, minutes: null })
    expect(migrated?.helpLocale).toBeNull()
  })
})

describe("the awareness rail", () => {
  const flow = flowOf("where")
  const step = (id: string) => {
    const found = flow.steps.find((s) => s.id === id)
    if (!found) throw new Error(`no step ${id}`)
    return found
  }

  it("ticks the count once anything is answered", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    expect(stepIsDone(state, step("where.count"))).toBe(false)
    state = setCriterion(state, "more", "no", NOW)
    // "No" is an answer. Only an unanswered set is undone.
    expect(stepIsDone(state, step("where.count"))).toBe(true)
  })

  it("ticks feedback on the prediction, not on having read the number", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = setUsage(state, { daysPerWeek: 4, perDay: 5, cost: 6 }, NOW)
    expect(stepIsDone(state, step("where.feedback"))).toBe(false)
    state = setAnswer(state, "where.expect", "probably about a grand", NOW)
    expect(stepIsDone(state, step("where.feedback"))).toBe(true)
  })

  it("leaves the doors out of the progress count", () => {
    const progress = flowProgress(emptyViceState(), flow)
    // intro and doors are not countable; the five working steps are.
    expect(progress.total).toBe(5)
    expect(progress.done).toBe(0)
  })
})

// ----------------------------------------------------------------- gives

describe("what it gives you", () => {
  const drinking = () => setVice(emptyViceState(), "alcohol", "Drinking", NOW)

  it("treats four and above as live and leaves the rest alone", () => {
    let state = drinking()
    state = setScale(state, "belief.sleep", 8, NOW)
    state = setScale(state, "belief.social", 4, NOW)
    state = setScale(state, "belief.sex", 3, NOW)

    // Marching somebody through a check of something they rated a three is how
    // a twenty-minute flow becomes one nobody finishes.
    expect(liveBeliefs(state).map((b) => b.id)).toEqual(["social", "sleep"])
  })

  it("ignores beliefs belonging to another vice's bank after a switch", () => {
    let state = drinking()
    state = setScale(state, "belief.sex", 9, NOW)
    state = setScale(state, "belief.brave", 9, NOW)
    expect(liveBeliefs(state)).toHaveLength(2)

    // "sex" and "brave" are not in the screen bank, so they must not carry over.
    state = setVice(state, "scrolling", "Scrolling", NOW)
    expect(liveBeliefs(state)).toHaveLength(0)
  })

  it("counts verdicts without counting the unjudged", () => {
    let state = drinking()
    for (const id of ["sleep", "social", "earned"]) state = setScale(state, `belief.${id}`, 7, NOW)
    state = setAnswer(state, "verdict.sleep", "no", NOW)
    state = setAnswer(state, "verdict.social", "held", NOW)

    const tally = beliefTally(state)
    expect(tally).toEqual({ live: 3, held: 1, mixed: 0, fell: 1, judged: 2 })
  })
})

describe("the future cues", () => {
  it("returns only rows whose changed half has been written", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = setAnswer(state, "future.unchanged.1m", "same as now, on the sofa", NOW)
    // Unchanged alone is not a cue. A card that only shows the grim version is
    // a different intervention from the one that was trialled.
    expect(futureCues(state)).toHaveLength(0)

    state = setAnswer(state, "future.changed.1m", "out walking with the dog before it gets dark", NOW)
    const cues = futureCues(state)
    expect(cues).toHaveLength(1)
    expect(cues[0]).toMatchObject({ horizonId: "1m", changed: "out walking with the dog before it gets dark" })
  })

  it("rotates the urge cue by episode count and never at random", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = setAnswer(state, "future.changed.1m", "first one", NOW)
    state = setAnswer(state, "future.changed.6m", "second one", NOW)

    // Deterministic: Math.random in a render gives a different cue on every
    // keystroke, and this has to sit still while somebody reads it.
    expect(cueForUrge(state)?.changed).toBe("first one")
    state = addEpisode(state, episode("a", `${NOW}T18:00:00.000Z`), NOW)
    expect(cueForUrge(state)?.changed).toBe("second one")
    state = addEpisode(state, episode("b", `${NOW}T19:00:00.000Z`), NOW)
    expect(cueForUrge(state)?.changed).toBe("first one")
  })

  it("has nothing to show before any are written", () => {
    expect(cueForUrge(emptyViceState())).toBeNull()
  })
})

describe("values", () => {
  it("keeps the top three in the order they were tapped, and caps at three", () => {
    let state = setList(emptyViceState(), "values.top", ["Being fit", "Being honest", "Faith", "Being kind"], NOW)
    expect(topValues(state)).toEqual(["Being fit", "Being honest", "Faith"])
    state = setList(state, "values.top", [], NOW)
    expect(topValues(state)).toEqual([])
  })
})

describe("the gives rail", () => {
  const flow = flowOf("gives")
  const step = (id: string) => {
    const found = flow.steps.find((s) => s.id === id)
    if (!found) throw new Error(`no step ${id}`)
    return found
  }

  it("ticks futures on the changed half only", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = setAnswer(state, "future.unchanged.2y", "the same but worse", NOW)
    expect(stepIsDone(state, step("gives.futures"))).toBe(false)
    state = setAnswer(state, "future.changed.2y", "up early, out on the bike", NOW)
    expect(stepIsDone(state, step("gives.futures"))).toBe(true)
  })

  it("ticks the letter on the text, not on having picked a kind", () => {
    let state = setAnswer(emptyViceState(), "gives.letter-kind", "from", NOW)
    expect(stepIsDone(state, step("gives.letter"))).toBe(false)
    state = setAnswer(state, "gives.letter", "I have been here since you were nineteen.", NOW)
    expect(stepIsDone(state, step("gives.letter"))).toBe(true)
  })
})

describe("the read back carries the gives work", () => {
  it("includes the cues, the verdicts and the letter", () => {
    let state = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    state = setAnswer(state, "future.changed.6m", "Christmas, and I remember it", NOW)
    state = setScale(state, "belief.sleep", 8, NOW)
    state = setAnswer(state, "verdict.sleep", "no", NOW)
    state = setAnswer(state, "finding.sleep", "awake at four every time", NOW)
    state = setList(state, "values.top", ["Being present with my kids"], NOW)
    state = setAnswer(state, "gives.letter-kind", "from", NOW)
    state = setAnswer(state, "gives.letter", "You know what I want.", NOW)

    const text = viceAsText(state, NOW)
    expect(text).toContain("Christmas, and I remember it")
    expect(text).toContain("awake at four every time")
    expect(text).toContain("Being present with my kids")
    expect(text).toContain("ITS LETTER TO YOU")
  })
})

// ------------------------------------------------------- the good stretch

/**
 * The tripwire, and the refusal line that used to be wrong for most vices.
 *
 * The tripwire exists because of the loudest finding in the research corpus:
 * across eight independent sources the relapse trigger people describe is
 * feeling *fine*, not craving. Only two people in the whole corpus had written
 * a rule for that moment in advance, and nobody who failed had.
 */
describe("tripwires — plans aimed at a good week rather than a bad night", () => {
  it("keeps urge plans and tripwires apart", () => {
    let state = addPlan(emptyViceState(), "it gets to six", "start the kettle", NOW)
    state = addPlan(state, "I think I can moderate now", "text Sam before I do anything", NOW, "tripwire")

    expect(plansOfKind(state, "urge")).toHaveLength(1)
    expect(plansOfKind(state, "tripwire")).toHaveLength(1)
    expect(plansOfKind(state, "tripwire")[0].when).toContain("moderate")
  })

  it("treats a plan saved before kinds existed as an urge plan", () => {
    // Migration: nobody's existing plans should vanish from the urge list.
    const legacy = { ...emptyViceState(), plans: [{ id: "old", when: "six", then: "kettle" }] }
    expect(plansOfKind(legacy, "urge")).toHaveLength(1)
    expect(plansOfKind(legacy, "tripwire")).toHaveLength(0)
  })

  it("applies the same negation rule to a tripwire as to any other plan", () => {
    // "then I will not test it" backfires for exactly the same reason.
    const state = addPlan(emptyViceState(), "I think I can moderate", "not test it", NOW, "tripwire")
    expect(state.plans).toHaveLength(0)
  })

  it("opens a hazard window on the days people actually report, and closes it after", () => {
    const held = (n: number): ViceState => {
      // n consecutive days each with an urge that passed.
      let s = emptyViceState()
      for (let i = 0; i < n; i += 1) {
        const day = addDays("2026-01-01", i)
        s = addEpisode(s, episode(`e${i}`, `${day}T18:00:00.000Z`, { actedOn: false, minutes: 5 }), day)
      }
      return s
    }
    // Not a streak and never shown as a score — it only decides whether to ask.
    expect(inHazardWindow(held(2))).toBeNull()
    expect(inHazardWindow(held(4))).toBe(4)
    expect(inHazardWindow(held(5))).toBe(4)
    expect(inHazardWindow(held(8))).toBeNull()
    expect(inHazardWindow(held(10))).toBe(10)
  })

  it("uses hazard days drawn from the reported windows rather than round numbers", () => {
    // day 4 (symptoms lift), ~10 days and ~2 months (cannabis), 6 months and a
    // year (nicotine). If someone "tidies" these to 7/30/90 the point is lost.
    expect(HAZARD_DAYS).toContain(4)
    expect(HAZARD_DAYS).toContain(10)
    expect(HAZARD_DAYS).toContain(365)
  })
})

describe("the refusal ladder names the actual vice", () => {
  it("gives a gambling user a line about betting, not about drinking", () => {
    const gambling = setVice(emptyViceState(), "gambling", "Betting", NOW)
    const ladder = refusalLadder(gambling)
    expect(ladder.join(" ")).not.toMatch(/drinking/i)
    expect(ladder[2]).toMatch(/putting anything on|watch/i)
  })

  it("still gives a drinker the NIAAA line", () => {
    const alcohol = setVice(emptyViceState(), "alcohol", "Drinking", NOW)
    expect(refusalLadder(alcohol)[2]).toMatch(/not drinking at the moment/i)
  })

  it("falls back to the generic third rung, never to the alcohol one", () => {
    // The old bug: everybody got the alcohol line, including five vices where
    // it is simply wrong and visible on the card.
    expect(refusalLadder(emptyViceState())[2]).not.toMatch(/drinking/i)
    expect(refusalLadder(emptyViceState())).toHaveLength(3)
  })
})
