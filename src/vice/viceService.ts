/**
 * All the logic behind the quit-a-vice flows.
 *
 * Pure functions over one immutable state object. The components hold no
 * derived state and do no arithmetic, so everything worth being wrong about —
 * the ruler follow-ups, the payoff gap, the danger window, whether an if-then
 * plan is phrased in a way that backfires — is testable without a browser.
 */

import type {
  DangerWindow,
  FlowProgress,
  HelpLocale,
  IfThenPlan,
  PayoffSummary,
  UrgeSummary,
  ViceCriterionAnswer,
  ViceEpisode,
  ViceFlow,
  ViceFlowId,
  ViceState,
  ViceStep,
  ViceUsage,
} from "./types"
import { VICE_MAP } from "./data/vices"
import { FLOW_MAP, MISSIONS } from "./data/flows"
import { CONFIDENCE_RULER, IMPORTANCE_RULER, REFUSAL } from "./data/copy"
import { COUNT_BANDS, criteriaFor, type CountBand } from "./data/awareness"
import { HORIZONS, beliefsFor, type ViceBelief } from "./data/gives"

export const VICE_STORAGE_KEY = "quit-vice-v1"

// ---------------------------------------------------------------- empty

export function emptyViceState(): ViceState {
  return {
    version: 1,
    viceId: null,
    viceLabel: "",
    viceUnit: "a time",
    shape: null,
    medicalRisk: false,
    flowId: null,
    createdAt: null,
    updatedAt: null,
    safety: { asked: false, withdrawal: false, acknowledged: false },
    experiment: { days: null, startDate: null, hypothesis: "", offered: [] },
    voice: { name: "", says: [], back: [] },
    card: { reasons: [], line: "" },
    awareness: {
      criteria: {},
      guess: null,
      usage: { daysPerWeek: null, perDay: null, cost: null, minutes: null },
    },
    helpLocale: null,
    answers: {},
    scales: {},
    lists: {},
    stepDone: {},
    episodes: [],
    plans: [],
    missionsDone: {},
  }
}

/** True when nothing has been written, so an untouched visit stores nothing. */
export function viceStateIsUntouched(state: ViceState): boolean {
  return (
    state.viceId === null &&
    state.episodes.length === 0 &&
    state.plans.length === 0 &&
    Object.keys(state.answers).length === 0 &&
    Object.keys(state.scales).length === 0 &&
    Object.keys(state.lists).length === 0 &&
    !state.card.line &&
    state.card.reasons.length === 0 &&
    !state.voice.name &&
    // Without these the awareness flow silently fails to save: somebody can
    // answer all eleven, close the tab, and come back to nothing.
    Object.keys(state.awareness.criteria).length === 0 &&
    state.awareness.guess === null &&
    usageIsEmpty(state.awareness.usage) &&
    // Marking a step read is the first thing many people do. Leaving it out
    // meant that write was dropped on a fresh state and the tick came back
    // ungreyed on reload.
    Object.keys(state.stepDone).length === 0
  )
}

/** True when not one of the four week numbers has been filled in. */
export function usageIsEmpty(usage: ViceUsage): boolean {
  return usage.daysPerWeek === null && usage.perDay === null && usage.cost === null && usage.minutes === null
}

// ---------------------------------------------------------------- dates

/** Today, on the client, as an ISO date. Never call this during render. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** The date half of an episode's timestamp, in the timestamp's own zone. */
export function episodeDate(episode: ViceEpisode): string {
  return episode.at.slice(0, 10)
}

/** The local hour an episode happened in, 0–23. */
export function episodeHour(episode: ViceEpisode): number {
  const hour = Number(episode.at.slice(11, 13))
  return Number.isFinite(hour) ? hour : 0
}

/** An ISO date split into numbers, or null when it is not one. */
function parts(iso: string): [number, number, number] | null {
  const bits = iso.split("-").map(Number)
  if (bits.length !== 3 || bits.some((b) => !Number.isFinite(b))) return null
  return [bits[0], bits[1], bits[2]]
}

/**
 * Whole days from `from` up to and including `to`. Day one is the start day.
 *
 * Compared in UTC deliberately. Doing this in local time means that in the week
 * the clocks go back one of the differences is 25 hours, the floor lands a day
 * short, and somebody's day 8 silently becomes day 7 once a year.
 */
export function dayNumber(from: string, to: string): number {
  const a = parts(from)
  const b = parts(to)
  if (!a || !b) return 1
  const start = Date.UTC(a[0], a[1] - 1, a[2])
  const end = Date.UTC(b[0], b[1] - 1, b[2])
  return Math.round((end - start) / 86_400_000) + 1
}

/**
 * The ISO date `days` after `from`.
 *
 * Via `setDate` rather than by adding milliseconds, for the same reason: adding
 * 24 hours to a local midnight lands on 23:00 of the same day when the clocks
 * go back, and the date comes out one short. `setDate` rolls months and years
 * over correctly too.
 */
export function addDays(from: string, days: number): string {
  const a = parts(from)
  if (!a) return from
  const date = new Date(a[0], a[1] - 1, a[2])
  date.setDate(date.getDate() + days)
  return todayISO(date)
}

/**
 * The start dates on offer.
 *
 * A date that reads as the start of something — a Monday, the first of a month
 * — makes the period before it belong to a different chapter, and that is worth
 * a measurable amount on its own. But "today" is offered first and with the
 * same weight as the rest, because attempts started on the spur of the moment
 * do better than planned ones rather than worse, and a picker that quietly
 * pushes everything to next week is throwing that away.
 */
export function startDateOptions(today: string): Array<{ id: string; label: string; date: string }> {
  const options: Array<{ id: string; label: string; date: string }> = [
    { id: "today", label: "Today", date: today },
    { id: "tomorrow", label: "Tomorrow", date: addDays(today, 1) },
  ]
  const monday = nextMonday(today)
  if (monday !== options[1].date) options.push({ id: "monday", label: "Monday", date: monday })
  const first = firstOfNextMonth(today)
  // Capped at a fortnight out. A start date further away than that is mostly a
  // way of not starting, and it is the commonest way one of these dies quietly.
  if (dayNumber(today, first) <= 15) options.push({ id: "first", label: "The 1st", date: first })
  return options
}

/** The next Monday strictly after `today`. */
export function nextMonday(today: string): string {
  const a = parts(today)
  if (!a) return today
  const day = new Date(a[0], a[1] - 1, a[2]).getDay()
  // getDay is 0 for Sunday, so Sunday is one day away and Monday is seven.
  const ahead = day === 0 ? 1 : 8 - day
  return addDays(today, ahead)
}

/** The first of next month. */
export function firstOfNextMonth(today: string): string {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  if (!Number.isFinite(year) || !Number.isFinite(month)) return today
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
}

// ------------------------------------------------------------ persistence

export function serializeViceState(state: ViceState): string {
  return JSON.stringify(state)
}

/**
 * Read a saved state back.
 *
 * Returns null rather than throwing on anything unreadable, because a corrupt
 * key must not be able to make the page a blank screen. Every field is filled
 * from the empty state first, so a saved copy written by an older build cannot
 * produce an undefined where the components expect an array.
 */
export function loadViceState(raw: string | null): ViceState | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const saved = parsed as Partial<ViceState>
  const base = emptyViceState()
  return {
    ...base,
    ...saved,
    version: 1,
    safety: { ...base.safety, ...(saved.safety ?? {}) },
    experiment: { ...base.experiment, ...(saved.experiment ?? {}) },
    voice: {
      ...base.voice,
      ...(saved.voice ?? {}),
      says: Array.isArray(saved.voice?.says) ? saved.voice.says : [],
      back: Array.isArray(saved.voice?.back) ? saved.voice.back : [],
    },
    card: {
      ...base.card,
      ...(saved.card ?? {}),
      reasons: Array.isArray(saved.card?.reasons) ? saved.card.reasons : [],
    },
    awareness: {
      ...base.awareness,
      ...(saved.awareness ?? {}),
      criteria: saved.awareness?.criteria ?? {},
      usage: { ...base.awareness.usage, ...(saved.awareness?.usage ?? {}) },
    },
    answers: saved.answers ?? {},
    scales: saved.scales ?? {},
    lists: saved.lists ?? {},
    stepDone: saved.stepDone ?? {},
    episodes: Array.isArray(saved.episodes) ? saved.episodes : [],
    plans: Array.isArray(saved.plans) ? saved.plans : [],
    missionsDone: saved.missionsDone ?? {},
  }
}

/** Every write goes through here, so `updatedAt` cannot be forgotten. */
function touch(state: ViceState, now: string): ViceState {
  return { ...state, updatedAt: now, createdAt: state.createdAt ?? now }
}

// ---------------------------------------------------------------- setters

export function setVice(state: ViceState, viceId: string, label: string, now: string): ViceState {
  const option = VICE_MAP.get(viceId)
  return touch(
    {
      ...state,
      viceId,
      viceLabel: label.trim() || option?.label || "",
      viceUnit: option?.unit ?? state.viceUnit,
      shape: option?.shape ?? state.shape,
      medicalRisk: option?.medicalRisk ?? false,
      // A different vice makes the old safety answer meaningless, and a stale
      // "none of these" on a newly-picked alcohol is exactly the failure this
      // whole gate exists to prevent.
      safety: option?.id === state.viceId ? state.safety : { asked: false, withdrawal: false, acknowledged: false },
    },
    now,
  )
}

export function setFlow(state: ViceState, flowId: ViceFlowId, now: string): ViceState {
  return touch({ ...state, flowId }, now)
}

export function setAnswer(state: ViceState, id: string, text: string, now: string): ViceState {
  return touch({ ...state, answers: { ...state.answers, [id]: text } }, now)
}

export function setScale(state: ViceState, id: string, value: number, now: string): ViceState {
  const clamped = Math.max(0, Math.min(10, Math.round(value)))
  return touch({ ...state, scales: { ...state.scales, [id]: clamped } }, now)
}

export function setList(state: ViceState, id: string, items: string[], now: string): ViceState {
  return touch({ ...state, lists: { ...state.lists, [id]: items } }, now)
}

/** Add if absent, remove if present. Blank entries never go in. */
export function toggleListItem(state: ViceState, id: string, item: string, now: string): ViceState {
  const trimmed = item.trim()
  if (!trimmed) return state
  const current = state.lists[id] ?? []
  const next = current.includes(trimmed) ? current.filter((i) => i !== trimmed) : [...current, trimmed]
  return setList(state, id, next, now)
}

export function setStepDone(state: ViceState, stepId: string, done: boolean, now: string): ViceState {
  return touch({ ...state, stepDone: { ...state.stepDone, [stepId]: done } }, now)
}

export function setSafety(state: ViceState, withdrawal: boolean, now: string): ViceState {
  return touch(
    {
      ...state,
      // Answering again after a yes clears the acknowledgement, so somebody who
      // corrects a mistaken tick is not left carrying a warning they never read.
      safety: { asked: true, withdrawal, acknowledged: withdrawal ? state.safety.acknowledged : false },
    },
    now,
  )
}

export function acknowledgeSafety(state: ViceState, now: string): ViceState {
  return touch({ ...state, safety: { ...state.safety, acknowledged: true } }, now)
}

/**
 * Whether a date is allowed to be set yet.
 *
 * The gate is: a vice that carries a medical risk, with withdrawal signs
 * reported, and no acknowledgement of what that means. Everything else is open.
 */
export function dateIsBlocked(state: ViceState): boolean {
  return state.medicalRisk && state.safety.asked && state.safety.withdrawal && !state.safety.acknowledged
}

// ------------------------------------------------------------ experiment

export function offerLength(state: ViceState, days: number, now: string): ViceState {
  const offered = state.experiment.offered.includes(days) ? state.experiment.offered : [...state.experiment.offered, days]
  return touch({ ...state, experiment: { ...state.experiment, offered } }, now)
}

export function setExperiment(state: ViceState, days: number, startDate: string, now: string): ViceState {
  if (dateIsBlocked(state)) return state
  const offered = state.experiment.offered.includes(days) ? state.experiment.offered : [...state.experiment.offered, days]
  return touch({ ...state, experiment: { ...state.experiment, days, startDate, offered } }, now)
}

export function setHypothesis(state: ViceState, text: string, now: string): ViceState {
  return touch({ ...state, experiment: { ...state.experiment, hypothesis: text } }, now)
}

/** Which day of the period today is, or null when nothing is running. */
export function experimentDay(state: ViceState, today: string): number | null {
  if (!state.experiment.startDate || !state.experiment.days) return null
  const day = dayNumber(state.experiment.startDate, today)
  return day >= 1 ? day : null
}

/** The last day of the period, inclusive. */
export function experimentEnd(state: ViceState): string | null {
  if (!state.experiment.startDate || !state.experiment.days) return null
  return addDays(state.experiment.startDate, state.experiment.days - 1)
}

/**
 * The missions visible today.
 *
 * Everything up to today's day number is available, and nothing beyond it. A
 * missed one stays available rather than expiring — the sequence has no reset
 * in it, and a person who does day 3 on day 9 has done day 3.
 */
export function availableMissions(state: ViceState, today: string): typeof MISSIONS {
  const day = experimentDay(state, today)
  if (day === null) return MISSIONS.slice(0, 1)
  return MISSIONS.filter((m) => m.day <= Math.min(day, MISSIONS.length))
}

export function toggleMission(state: ViceState, day: number, today: string): ViceState {
  const next = { ...state.missionsDone }
  if (next[day]) delete next[day]
  else next[day] = today
  return touch({ ...state, missionsDone: next }, today)
}

// ---------------------------------------------------------------- rulers

const RULERS = { importance: IMPORTANCE_RULER, confidence: CONFIDENCE_RULER } as const

/**
 * The follow-up question for a ruler answer.
 *
 * The comparison number is always *below* the one they picked. Asking somebody
 * how they are at a six rather than a three invites them to make the case for
 * changing; asking rather than a nine invites the case against, and the case
 * against is the half that predicts it not happening. There is deliberately no
 * way to make this function generate a higher number.
 */
export function rulerFollowUp(rulerId: "importance" | "confidence", n: number): { lower: number | null; text: string } {
  const ruler = RULERS[rulerId]
  if (n <= 0) return { lower: null, text: ruler.zeroFallback }
  const lower = n >= 4 ? n - 3 : n >= 2 ? n - 2 : 0
  return { lower, text: ruler.whyNotLower.replace("{n}", String(n)).replace("{lower}", String(lower)) }
}

/** The "what would move it" question. One step up, never more. */
export function rulerNudge(rulerId: "importance" | "confidence", n: number): { up: number | null; text: string } {
  const ruler = RULERS[rulerId]
  if (n >= 10) return { up: null, text: ruler.tenFallback }
  const up = n + 1
  return { up, text: ruler.whatWouldMove.replace("{n}", String(n)).replace("{up}", String(up)) }
}

// ---------------------------------------------------------------- plans

/**
 * Why a plan will not work, or null when it is fine.
 *
 * The negation rule is the one piece of validation here with a hard
 * experimental result behind it: a plan phrased as what you will *not* do
 * measurably backfires, and it backfires hardest in the people whose habit is
 * strongest — which is everybody using this. So it is rejected rather than
 * discouraged.
 *
 * The word list is deliberately short. `stop` is not on it because "stop at the
 * shop" is a perfectly good plan, and a validator that cries wolf gets ignored.
 */
const NEGATION = /\b(not|don't|dont|do not|won't|wont|never|avoid|avoiding|resist|resisting|refuse|refusing|abstain|abstaining|no more)\b/i
const VAGUE_CUE = /\b(feel like|feel the urge|whenever i want|if i want to|when i want to|i feel like it)\b/i

export function planProblem(plan: { when: string; then: string }): string | null {
  const when = plan.when.trim()
  const then = plan.then.trim()
  if (!when) return "The \"when\" is empty."
  if (!then) return "The \"then\" is empty."
  if (NEGATION.test(then)) return "negation"
  if (VAGUE_CUE.test(when)) return "vague"
  return null
}

export function addPlan(
  state: ViceState,
  when: string,
  then: string,
  now: string,
  kind: "urge" | "tripwire" = "urge",
): ViceState {
  if (planProblem({ when, then })) return state
  return touch(
    { ...state, plans: [...state.plans, { id: `plan-${state.plans.length}-${state.episodes.length}`, when: when.trim(), then: then.trim(), kind }] },
    now,
  )
}

/** Plans of one kind. Anything saved before kinds existed counts as an urge plan. */
export function plansOfKind(state: ViceState, kind: "urge" | "tripwire"): IfThenPlan[] {
  return state.plans.filter((p) => (p.kind ?? "urge") === kind)
}

/**
 * Whether now is a moment to raise the tripwire question.
 *
 * The hazard windows people actually report, gathered across eight sources and
 * five substances: day 4 when the symptoms lift, ~10 days and ~2 months for
 * cannabis, 6 months and a year for nicotine, and the one-year mark generally.
 * The common factor is not the number — it is that things have started going
 * well, and going well is when the reasoning starts.
 *
 * Deliberately based on days *held* rather than a streak. It never resets and
 * it is never displayed as a score; it only decides whether to ask a question.
 */
export const HAZARD_DAYS = [4, 10, 30, 60, 180, 365]

export function inHazardWindow(state: ViceState): number | null {
  const held = daysHeld(state)
  return HAZARD_DAYS.find((d) => held >= d && held <= d + 2) ?? null
}

export function removePlan(state: ViceState, id: string, now: string): ViceState {
  return touch({ ...state, plans: state.plans.filter((p) => p.id !== id) }, now)
}

// ---------------------------------------------------------------- episodes

export function emptyEpisode(id: string, at: string): ViceEpisode {
  return {
    id,
    at,
    actedOn: null,
    expected: null,
    actual: null,
    later: null,
    intensity: null,
    after: null,
    minutes: null,
    trigger: "",
    where: "",
    feelings: [],
    body: [],
    coped: "",
    notes: "",
  }
}

export function addEpisode(state: ViceState, episode: ViceEpisode, now: string): ViceState {
  return touch({ ...state, episodes: [episode, ...state.episodes] }, now)
}

export function updateEpisode(state: ViceState, id: string, patch: Partial<ViceEpisode>, now: string): ViceState {
  return touch(
    { ...state, episodes: state.episodes.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)) },
    now,
  )
}

export function removeEpisode(state: ViceState, id: string, now: string): ViceState {
  return touch({ ...state, episodes: state.episodes.filter((e) => e.id !== id) }, now)
}

// ---------------------------------------------------------------- derived

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ---------------------------------------------------------------- awareness

export function setCriterion(state: ViceState, id: string, answer: ViceCriterionAnswer, now: string): ViceState {
  return touch(
    { ...state, awareness: { ...state.awareness, criteria: { ...state.awareness.criteria, [id]: answer } } },
    now,
  )
}

export function setUsage(state: ViceState, patch: Partial<ViceUsage>, now: string): ViceState {
  return touch({ ...state, awareness: { ...state.awareness, usage: { ...state.awareness.usage, ...patch } } }, now)
}

export function setGuess(state: ViceState, guess: number | null, now: string): ViceState {
  return touch({ ...state, awareness: { ...state.awareness, guess } }, now)
}

export function setHelpLocale(state: ViceState, helpLocale: HelpLocale, now: string): ViceState {
  return touch({ ...state, helpLocale }, now)
}

export interface CriteriaTally {
  /** How many came back yes. This is the count, and nothing else is. */
  yes: number
  /** Reported next to the count, never folded into it. */
  unsure: number
  no: number
  /** How many of the applicable set have been answered at all. */
  answered: number
  total: number
}

/**
 * Tally the count.
 *
 * Only the criteria belonging to this vice's own set are counted. Somebody who
 * answers the eleven for drinking and then switches the flow to scrolling has
 * stale answer keys sitting in state, and adding those to the new count would
 * invent a score out of nothing.
 */
export function criteriaTally(state: ViceState): CriteriaTally {
  const set = criteriaFor(state.shape)
  const tally: CriteriaTally = { yes: 0, unsure: 0, no: 0, answered: 0, total: set.length }
  for (const criterion of set) {
    const answer = state.awareness.criteria[criterion.id]
    if (!answer) continue
    tally.answered += 1
    if (answer === "yes") tally.yes += 1
    else if (answer === "unsure") tally.unsure += 1
    else tally.no += 1
  }
  return tally
}

/**
 * The band a count falls in — substances only.
 *
 * Returns null for screens and behaviours, and that is a content decision
 * rather than a gap. There are no validated severity thresholds for those, so
 * there is no honest band to return, and inventing one is the specific harm
 * data/awareness.ts is written to avoid.
 */
export function criteriaBand(state: ViceState): CountBand | null {
  if (state.shape !== "substance") return null
  const { yes } = criteriaTally(state)
  return COUNT_BANDS.find((band) => yes >= band.min) ?? null
}

/** True when they marked the physical item, which is the medically loaded one. */
export function flaggedWithdrawal(state: ViceState): boolean {
  return state.shape === "substance" && state.awareness.criteria.withdrawal === "yes"
}

export interface UsageTotals {
  /** Null when the two count fields are not both filled in. */
  unitsPerWeek: number | null
  costPerWeek: number | null
  costPerYear: number | null
  hoursPerWeek: number | null
  hoursPerYear: number | null
  /** Waking days a year, at sixteen hours to the day. */
  wakingDaysPerYear: number | null
}

/**
 * Multiply the week out.
 *
 * Deliberately arithmetic and nothing else — no rounding up for effect, no
 * "that is the same as a holiday" comparisons. The number is startling enough
 * unassisted, and a number that has been dressed up is one the reader is right
 * to discount.
 *
 * Waking days uses a sixteen-hour day rather than twenty-four. Dividing by
 * twenty-four counts sleep as time available to spend, which understates it.
 */
export function usageTotals(usage: ViceUsage): UsageTotals {
  const { daysPerWeek, perDay, cost, minutes } = usage
  const unitsPerWeek = daysPerWeek !== null && perDay !== null ? daysPerWeek * perDay : null
  const costPerWeek = unitsPerWeek !== null && cost !== null ? unitsPerWeek * cost : null
  const hoursPerWeek = daysPerWeek !== null && minutes !== null ? (daysPerWeek * minutes) / 60 : null
  const hoursPerYear = hoursPerWeek !== null ? hoursPerWeek * 52 : null
  return {
    unitsPerWeek,
    costPerWeek,
    costPerYear: costPerWeek !== null ? costPerWeek * 52 : null,
    hoursPerWeek: hoursPerWeek !== null ? round1(hoursPerWeek) : null,
    hoursPerYear: hoursPerYear !== null ? Math.round(hoursPerYear) : null,
    wakingDaysPerYear: hoursPerYear !== null ? round1(hoursPerYear / 16) : null,
  }
}

/**
 * How far out their guess was, as a multiple.
 *
 * Returns null when there is nothing to compare, and when the guess is zero —
 * dividing by it produces an infinity that renders as "Infinity× out", which is
 * both wrong and the sort of thing that makes a person stop believing the page.
 */
export function guessGap(state: ViceState): { guess: number; actual: number; factor: number } | null {
  const { guess } = state.awareness
  const actual = usageTotals(state.awareness.usage).costPerYear
  if (guess === null || guess <= 0 || actual === null || actual <= 0) return null
  return { guess, actual, factor: round1(actual / guess) }
}

/**
 * The refusal ladder for this person's vice.
 *
 * Two universal rungs plus one that names the thing. Falls back to the generic
 * third rung rather than to the alcohol one, which is what used to happen and
 * meant somebody quitting betting read a line about drinking on their card.
 */
export function refusalLadder(state: ViceState): string[] {
  const third = REFUSAL.ladderThird[state.viceId ?? "custom"] ?? REFUSAL.ladderThird.custom
  return [...REFUSAL.ladder, third]
}

// ------------------------------------------------------------------ gives

/**
 * Which beliefs are live enough to be worth checking.
 *
 * Four and above. Below that the person has already told you it is not really
 * one of theirs, and marching them through a check of something they rated a
 * two is how a twenty-minute flow becomes a forty-minute one nobody finishes.
 */
export const BELIEF_LIVE_AT = 4

export function liveBeliefs(state: ViceState): ViceBelief[] {
  return beliefsFor(state.shape).filter((b) => (state.scales[`belief.${b.id}`] ?? 0) >= BELIEF_LIVE_AT)
}

export interface BeliefTally {
  live: number
  held: number
  mixed: number
  fell: number
  judged: number
}

/** Counts only beliefs in the current vice's own bank, for the same reason
 *  criteriaTally does: a switched vice leaves stale keys behind. */
export function beliefTally(state: ViceState): BeliefTally {
  const tally: BeliefTally = { live: 0, held: 0, mixed: 0, fell: 0, judged: 0 }
  for (const belief of liveBeliefs(state)) {
    tally.live += 1
    const verdict = state.answers[`verdict.${belief.id}`]
    if (!verdict) continue
    tally.judged += 1
    if (verdict === "held") tally.held += 1
    else if (verdict === "mixed") tally.mixed += 1
    else if (verdict === "no") tally.fell += 1
  }
  return tally
}

export interface FutureCue {
  horizonId: string
  label: string
  changed: string
  unchanged: string
}

/**
 * The future cues, in the shape the rest of the app consumes them.
 *
 * Only rows where the changed half has been written come back. The changed one
 * is the half that does the work at the moment of a decision, and a cue card
 * showing only the grim version is a different intervention from the one the
 * trials ran.
 */
export function futureCues(state: ViceState): FutureCue[] {
  return HORIZONS.map((h) => ({
    horizonId: h.id,
    label: h.label,
    changed: (state.answers[`future.changed.${h.id}`] ?? "").trim(),
    unchanged: (state.answers[`future.unchanged.${h.id}`] ?? "").trim(),
  })).filter((cue) => cue.changed.length > 0)
}

/**
 * One cue to show during the ninety seconds.
 *
 * Rotates by episode count rather than at random: `Math.random()` in a render
 * gives a different cue on every keystroke, and this has to sit still while
 * somebody reads it. Rotating also stops one sentence going stale by March.
 */
export function cueForUrge(state: ViceState): FutureCue | null {
  const cues = futureCues(state)
  if (cues.length === 0) return null
  return cues[state.episodes.length % cues.length]
}

/** The top three values, in the order they were tapped. */
export function topValues(state: ViceState): string[] {
  return (state.lists["values.top"] ?? []).slice(0, 3)
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/**
 * Expected against actual, over every episode that has both.
 *
 * A positive gap means it delivered less than it promised. This is the only
 * number in the module that is allowed to be presented as an argument, and even
 * then it is presented as arithmetic with no commentary attached, because every
 * data point in it is theirs and there is therefore nothing to argue with.
 */
export function payoffSummary(state: ViceState): PayoffSummary {
  const both = state.episodes.filter((e) => e.expected !== null && e.actual !== null)
  const laters = both.filter((e) => e.later !== null).map((e) => e.later as number)
  const avgExpected = mean(both.map((e) => e.expected as number))
  const avgActual = mean(both.map((e) => e.actual as number))
  return {
    n: both.length,
    avgExpected: round1(avgExpected),
    avgActual: round1(avgActual),
    avgLater: laters.length > 0 ? round1(mean(laters)) : null,
    gap: round1(avgExpected - avgActual),
  }
}

/**
 * How long this person's urges actually last, from the ones they did not act
 * on.
 *
 * Only their own data. The widely repeated claim that an urge lasts twenty
 * minutes has no primary source behind it, and a timer that promises relief it
 * cannot deliver costs more trust than it buys.
 */
export function urgeSummary(state: ViceState): UrgeSummary {
  const minutes = state.episodes
    .filter((e) => e.actedOn === false && typeof e.minutes === "number" && (e.minutes as number) >= 0)
    .map((e) => e.minutes as number)
    .sort((a, b) => a - b)
  if (minutes.length === 0) return { n: 0, medianMinutes: 0, maxMinutes: 0 }
  const mid = Math.floor(minutes.length / 2)
  const median = minutes.length % 2 === 0 ? (minutes[mid - 1] + minutes[mid]) / 2 : minutes[mid]
  return { n: minutes.length, medianMinutes: round1(median), maxMinutes: minutes[minutes.length - 1] }
}

/**
 * When it happens, by hour.
 *
 * Derived rather than asked, because people are reliably wrong about their own
 * worst hour and a histogram of their own entries is not arguable with.
 * `peakHour` stays null under four episodes — a peak drawn from two points is
 * noise wearing a conclusion's clothes.
 */
export const WINDOW_MIN_EPISODES = 4

export function dangerWindow(state: ViceState): DangerWindow {
  const bars = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
  for (const episode of state.episodes) bars[episodeHour(episode)].count += 1
  const n = state.episodes.length
  if (n < WINDOW_MIN_EPISODES) return { bars, peakHour: null, n }
  let peak = bars[0]
  for (const bar of bars) if (bar.count > peak.count) peak = bar
  return { bars, peakHour: peak.count > 0 ? peak.hour : null, n }
}

/**
 * How each logged day went.
 *
 * Three states and not two. A day with nothing logged is *unknown* — it is
 * never coloured green and never coloured red, because an app that assumes
 * success from silence congratulates people who are holding a drink, and one
 * that assumes failure is lying in the other direction.
 */
export function dayOutcomes(state: ViceState): Map<string, "held" | "did"> {
  const out = new Map<string, "held" | "did">()
  for (const episode of state.episodes) {
    const date = episodeDate(episode)
    if (episode.actedOn === true) out.set(date, "did")
    else if (episode.actedOn === false && out.get(date) !== "did") out.set(date, "held")
  }
  return out
}

/**
 * Urges that passed without being acted on, ever, across the whole history.
 *
 * This is the module's only running total and it is monotonic by construction:
 * it counts things that happened, so nothing that happens later can take one
 * away. A counter that resets to nought delivers, at the worst possible moment,
 * both halves of what turns one lapse into abandoning the attempt — a change of
 * identity and a permanent-sounding explanation. So there is not one.
 */
export function votesCast(state: ViceState): number {
  return state.episodes.filter((e) => e.actedOn === false).length
}

export function daysHeld(state: ViceState): number {
  let held = 0
  for (const outcome of dayOutcomes(state).values()) if (outcome === "held") held += 1
  return held
}

// ---------------------------------------------------------------- progress

/**
 * Whether a step counts as finished.
 *
 * Steps are never gates — the shell lets anybody move anywhere — so this only
 * drives the tick in the rail. A step the person explicitly marked done is
 * done; otherwise the answer comes from whether the step's own content has
 * anything in it, which keeps the rail honest without asking for a click.
 */
export function stepIsDone(state: ViceState, step: ViceStep): boolean {
  if (state.stepDone[step.id]) return true
  switch (step.kind) {
    case "intro":
      return false
    case "pickVice":
      return state.viceId !== null
    case "safety":
      return state.safety.asked && (!state.safety.withdrawal || state.safety.acknowledged)
    case "ruler":
      return state.scales.importance !== undefined && state.scales.confidence !== undefined
    case "negotiate":
      return state.experiment.days !== null
    case "log":
      return state.episodes.length > 0
    case "ifthen":
      return state.plans.length > 0
    case "voice":
      return state.voice.name.trim().length > 0 && state.voice.says.length > 0
    case "card":
      return state.card.reasons.length > 0
    case "missions":
      return Object.keys(state.missionsDone).length > 0
    case "text":
      return (step.fields ?? []).some((f) => (state.answers[f.id] ?? "").trim().length > 0)
    case "chips":
      return (step.chips ?? []).some((c) => (state.lists[c.id] ?? []).length > 0)
    case "tape":
      return (state.lists["tape.forward"] ?? []).length > 0
    case "refusal":
      return (state.answers["refusal.reply1"] ?? "").trim().length > 0
    case "binding":
      return (state.lists["binding.physical"] ?? []).length +
        (state.lists["binding.chronological"] ?? []).length +
        (state.lists["binding.categorical"] ?? []).length > 0
    case "window":
      return state.episodes.length >= WINDOW_MIN_EPISODES || (state.answers["window.named"] ?? "").trim().length > 0
    case "count":
      return criteriaTally(state).answered > 0
    case "usage":
      return !usageIsEmpty(state.awareness.usage)
    case "feedback":
      // Done when they committed to a prediction, not when they read the
      // number. Reading it is passive; the prediction is the exercise.
      return (state.answers["where.expect"] ?? "").trim().length > 0
    case "trajectory":
      return (step.fields ?? []).some((f) => (state.answers[f.id] ?? "").trim().length > 0)
    case "beliefs":
      return liveBeliefs(state).length > 0
    case "beliefTest":
      return beliefTally(state).judged > 0
    case "values":
      return (state.lists["values.picked"] ?? []).length > 0
    case "futures":
      // The changed half is the one that gets used later, so it is the one
      // that counts as having done this step.
      return futureCues(state).length > 0
    case "letter":
      return (state.answers["gives.letter"] ?? "").trim().length > 0
    case "review":
    case "doors":
      return false
  }
}

export function flowProgress(state: ViceState, flow: ViceFlow): FlowProgress {
  const skip: ViceStep["kind"][] = ["intro", "review", "doors"]
  const countable = flow.steps.filter((s) => !skip.includes(s.kind))
  return { done: countable.filter((s) => stepIsDone(state, s)).length, total: countable.length }
}

export function flowOf(flowId: ViceFlowId): ViceFlow {
  const flow = FLOW_MAP.get(flowId)
  if (!flow) throw new Error(`Unknown vice flow "${flowId}"`)
  return flow
}

// ---------------------------------------------------------------- read back

/** Word count, used by the few fields that ask for a real answer. */
export function wordCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

/**
 * Everything written, as plain text.
 *
 * Same reasoning as the north star flow: what somebody typed into a page like
 * this belongs to them, and a copy they can take away is the difference between
 * a tool and a trap.
 */
export function viceAsText(state: ViceState, today: string): string {
  const lines: string[] = []
  const push = (text = "") => lines.push(text)

  push(`Quitting: ${state.viceLabel || "not named yet"}`)
  push(today)
  push()

  if (state.card.reasons.length > 0 || state.card.line) {
    push("THE CARD")
    for (const reason of state.card.reasons) push(`  - ${reason}`)
    if (state.card.line) push(`  "${state.card.line}"`)
    push()
  }

  if (state.experiment.days) {
    push("THE EXPERIMENT")
    push(`  ${state.experiment.days} days from ${state.experiment.startDate ?? "no start date"}`)
    if (state.experiment.hypothesis) push(`  Want to find out: ${state.experiment.hypothesis}`)
    push()
  }

  if (state.plans.length > 0) {
    push("PLANS")
    for (const plan of state.plans) push(`  When ${plan.when}, then I ${plan.then}`)
    push()
  }

  if (state.voice.name) {
    push(`THE VOICE — "${state.voice.name}"`)
    for (const says of state.voice.says) push(`  It says: ${says}`)
    for (const back of state.voice.back) push(`  I say: ${back}`)
    push()
  }

  const tally = criteriaTally(state)
  const totals = usageTotals(state.awareness.usage)
  if (tally.answered > 0 || !usageIsEmpty(state.awareness.usage)) {
    push("WHERE IT IS")
    if (tally.answered > 0) {
      push(`  ${tally.yes} of ${tally.total} counted, ${tally.unsure} not sure, ${tally.answered} answered.`)
      const band = criteriaBand(state)
      if (band) push(`  That count is the "${band.label}" range. It is a count, not a diagnosis.`)
    }
    if (totals.costPerYear !== null) push(`  Roughly ${totals.costPerYear} a year.`)
    if (totals.hoursPerYear !== null) {
      push(`  Roughly ${totals.hoursPerYear} hours a year, or ${totals.wakingDaysPerYear} waking days.`)
    }
    push()
  }

  const cues = futureCues(state)
  if (cues.length > 0) {
    push("WHERE THE OTHER WAY GOES")
    for (const cue of cues) push(`  ${cue.label}: ${cue.changed}`)
    push()
  }

  const beliefs = beliefTally(state)
  if (beliefs.judged > 0) {
    push("WHAT IT GIVES YOU, CHECKED")
    for (const belief of liveBeliefs(state)) {
      const verdict = state.answers[`verdict.${belief.id}`]
      if (!verdict) continue
      const finding = (state.answers[`finding.${belief.id}`] ?? "").trim()
      push(`  ${belief.claim} — ${verdict}${finding ? `: ${finding}` : ""}`)
    }
    push()
  }

  const top = topValues(state)
  if (top.length > 0) {
    push("WHAT YOU ARE FOR")
    top.forEach((value, i) => push(`  ${i + 1}. ${value}`))
    push()
  }

  const letter = (state.answers["gives.letter"] ?? "").trim()
  if (letter) {
    push(state.answers["gives.letter-kind"] === "to" ? "YOUR LETTER TO IT" : "ITS LETTER TO YOU")
    push(`  ${letter.replace(/\n/g, "\n  ")}`)
    push()
  }

  const payoff = payoffSummary(state)
  const urges = urgeSummary(state)
  if (payoff.n > 0 || urges.n > 0 || state.episodes.length > 0) {
    push("WHAT THE LOG SAYS")
    if (payoff.n > 0) {
      push(`  Expected ${payoff.avgExpected}, got ${payoff.avgActual}, over ${payoff.n} ${payoff.n === 1 ? "time" : "times"}.`)
    }
    if (urges.n > 0) {
      push(`  Urges you did not act on lasted ${urges.medianMinutes} minutes in the middle, ${urges.maxMinutes} at the longest, over ${urges.n}.`)
    }
    push(`  ${votesCast(state)} urges came and went without you acting on them.`)
    push()
  }

  const answers = Object.entries(state.answers).filter(([, v]) => v.trim())
  if (answers.length > 0) {
    push("WHAT YOU WROTE")
    for (const [id, value] of answers) push(`  ${id}: ${value}`)
    push()
  }

  return lines.join("\n").trimEnd()
}
