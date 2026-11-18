/**
 * THE CHANGES THE NEW SCREENS MAKE, as pure functions over `NsPlan`.
 *
 * Where the plan service already makes a change (adding an area, a goal, an
 * action, a north star) this calls it; what is new is only the filing the new
 * version adds (a goal's level, a hidden area, the check-in day), kept as the
 * `start:` answers `planFacts.ts` reads. Nothing here deletes a person's text.
 */

import type { NsCheckpoint, NsGoal, NsPlan, NsSeason } from "@/src/goals/types"
import {
  addAction, addArea, addGoal, addSubStep, linkStepToGoal, removeAction, removeSubStep, setNorthStar, startNewNorthStar, updateAction, updateArea, updateGoal, updateStep,
} from "@/src/goals/northStarService"
import { COMMIT_DATE_KEY, COMMIT_KEY, ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import { SEASON_ANSWER_KEYS } from "@/src/goals/seasonAnswers"
import { addDays } from "@/src/goals/oneThingService"
import { periodOf, reviewIdFor } from "@/src/goals/reviewService"
import {
  AREAS_DESCRIBED_KEY, PROTECTED_KEY, CHECKIN_DAY_KEY, CHECKIN_HOUR_KEY, CHECKIN_PHONE_KEY, HIDDEN_AREAS_KEY, activeAreas, hiddenAreaIds, seasonTakeKey, tierKey, unfiledKey, type GoalTier,
} from "./planFacts"

export { setNorthStar, startNewNorthStar, removeAction, updateAction, addAction, addSubStep, removeSubStep, linkStepToGoal, updateStep }

const withAnswers = (plan: NsPlan, set: Record<string, string | null>): NsPlan => {
  const answers = { ...plan.answers }
  for (const [k, v] of Object.entries(set)) {
    if (v === null || v === "") delete answers[k]
    else answers[k] = v
  }
  return { ...plan, answers, updatedAt: new Date().toISOString() }
}

export const setAnswer = (plan: NsPlan, key: string, value: string): NsPlan => (plan.answers[key] === value ? plan : withAnswers(plan, { [key]: value }))

// ------------------------------------------------------------------- areas

export function addOwnArea(plan: NsPlan, label: string): NsPlan {
  return addArea(plan, label)
}

export function renameArea(plan: NsPlan, id: string, label: string): NsPlan {
  return updateArea(plan, id, { label })
}

export function describeArea(plan: NsPlan, id: string, sublabel: string): NsPlan {
  return updateArea(plan, id, { sublabel })
}

export function setAreaHidden(plan: NsPlan, id: string, hidden: boolean): NsPlan {
  const set = hiddenAreaIds(plan)
  if (hidden) set.add(id)
  else set.delete(id)
  return withAnswers(plan, { [HIDDEN_AREAS_KEY]: [...set].join(",") })
}

export const markAreasDescribed = (plan: NsPlan): NsPlan => setAnswer(plan, AREAS_DESCRIBED_KEY, "1")

/** Put the given areas first, in order; every other area keeps its order after them. */
export function orderAreas(plan: NsPlan, ids: string[]): NsPlan {
  const first = ids.map((id) => plan.areas.find((a) => a.id === id)).filter((a): a is NonNullable<typeof a> => Boolean(a))
  const rest = plan.areas.filter((a) => !ids.includes(a.id))
  return { ...plan, areas: [...first, ...rest], updatedAt: new Date().toISOString() }
}

// ---------------------------------------------------------------- direction

export function setStarWhy(plan: NsPlan, text: string): NsPlan {
  return setAnswer(plan, "star_why", text)
}

export function setPicture(plan: NsPlan, text: string, today: string): NsPlan {
  const next = setNorthStar(plan, text)
  return next.northStarStartedOn || !text.trim() ? next : { ...next, northStarStartedOn: today }
}

function createGoal(plan: NsPlan, areaId: string, title: string, tier: GoalTier, patch: Partial<NsGoal> = {}): { plan: NsPlan; id: string } | null {
  const before = new Set(plan.goals.map((g) => g.id))
  let next = addGoal(plan, areaId, title, "achievement")
  const made = next.goals.find((g) => !before.has(g.id))
  if (!made) return null
  // A new goal carries no date until the person gives one: `addGoal` dates it a year out.
  next = updateGoal(next, made.id, { targetDate: null, ...patch })
  next = withAnswers(next, { [tierKey(made.id)]: tier })
  return { plan: next, id: made.id }
}

/** A big goal, filed under the first area until the person files it (`unfiledKey`). */
export function addBigGoal(plan: NsPlan, title: string): NsPlan {
  const area = activeAreas(plan)[0]
  if (!area) return plan
  const made = createGoal(plan, area.id, title, "life")
  return made ? withAnswers(made.plan, { [unfiledKey(made.id)]: "1" }) : plan
}

export function renameGoal(plan: NsPlan, id: string, title: string): NsPlan {
  return updateGoal(plan, id, { title })
}

/** Taking a goal off the list keeps it, as dropped, in the person's history. */
export function dropGoal(plan: NsPlan, id: string, today: string): NsPlan {
  return updateGoal(plan, id, { status: "dropped", statusOn: today, servesOneThing: false })
}

export function fileBigGoal(plan: NsPlan, id: string, areaId: string | null, year: number | null): NsPlan {
  let next = plan
  if (areaId) {
    next = updateGoal(next, id, { areaId })
    next = withAnswers(next, { [unfiledKey(id)]: null })
  }
  return updateGoal(next, id, { targetDate: year ? `${year}-12-31` : null })
}

export function addGrowthGoal(plan: NsPlan, title: string, bigId: string): NsPlan {
  const big = plan.goals.find((g) => g.id === bigId)
  if (!big) return plan
  const made = createGoal(plan, big.areaId, title, "become", { feedsGoalIds: [bigId] })
  return made ? made.plan : plan
}

export const setGoalWhy = (plan: NsPlan, id: string, why: string): NsPlan => updateGoal(plan, id, { why })

// ------------------------------------------------------------------- season

export function nextSeasonId(plan: NsPlan): string {
  const used = new Set([plan.season?.id, ...plan.pastSeasons.map((p) => p.id)])
  let n = plan.pastSeasons.length + 1
  while (used.has(`s${n}`)) n += 1
  return `s${n}`
}

export function setSeasonFocusSentence(plan: NsPlan, sentence: string, today: string): NsPlan {
  const s = plan.season
  const season: NsSeason = s ? { ...s, sentence, startedOn: s.startedOn ?? today } : { id: nextSeasonId(plan), startedOn: today, endsOn: null, sentence }
  return { ...plan, season, updatedAt: new Date().toISOString() }
}

export function setSeasonEnd(plan: NsPlan, endsOn: string, today: string): NsPlan {
  const s = plan.season ?? { id: nextSeasonId(plan), startedOn: today, endsOn: null, sentence: "" }
  return { ...plan, season: { ...s, endsOn }, updatedAt: new Date().toISOString() }
}

export const setSeasonWhy = (plan: NsPlan, why: string): NsPlan => setAnswer(plan, ONE_ANSWERS.why, why)

/** Which big goals this season moves: they, and only they among the big goals, serve it. */
export function setSeasonBigGoals(plan: NsPlan, ids: string[], isBig: (g: NsGoal) => boolean): NsPlan {
  return { ...plan, goals: plan.goals.map((g) => (isBig(g) ? (g.servesOneThing === ids.includes(g.id) ? g : { ...g, servesOneThing: ids.includes(g.id) }) : g)), updatedAt: new Date().toISOString() }
}

export function setSeasonAreas(plan: NsPlan, ids: string[]): NsPlan {
  return { ...plan, seasonAreaIds: ids.filter((id) => plan.areas.some((a) => a.id === id)), updatedAt: new Date().toISOString() }
}

export function sayYes(plan: NsPlan, words: string, today: string): NsPlan {
  return withAnswers(plan, { [COMMIT_KEY]: words, [COMMIT_DATE_KEY]: today })
}

/** Taking the yes back clears its date and keeps the words. */
export function takeYesBack(plan: NsPlan): NsPlan {
  return withAnswers(plan, { [COMMIT_DATE_KEY]: null })
}

export type CloseChoice = "carry" | "achieved" | "paused" | "dropped"

/** Close the current season and start the next, empty one. Choices are per active season goal. */
export function closeSeason(plan: NsPlan, today: string, take: string, choices: Record<string, CloseChoice>): NsPlan {
  const s = plan.season
  if (!s) return plan
  const startedOn = s.startedOn && s.startedOn <= today ? s.startedOn : today
  const past = {
    id: s.id,
    startedOn,
    endsOn: s.endsOn && s.endsOn >= startedOn ? s.endsOn : null,
    endedOn: today,
    sentence: s.sentence,
    answers: Object.fromEntries(SEASON_ANSWER_KEYS.filter((k) => (plan.answers[k] ?? "").trim()).map((k) => [k, plan.answers[k]])),
    areaIds: [...plan.seasonAreaIds],
    goalIds: plan.goals.filter((g) => g.servesOneThing).map((g) => g.id),
    focusId: plan.seasonFocusId,
  }
  const newId = nextSeasonId(plan)
  const cleared = Object.fromEntries(SEASON_ANSWER_KEYS.map((k) => [k, ""]))
  const goals = plan.goals.map((g) => {
    if (!g.servesOneThing) return g
    const c = choices[g.id]
    if (c === "carry") return g
    if (c === "achieved") return { ...g, servesOneThing: false, status: "achieved" as const, statusOn: today }
    if (c === "paused") return { ...g, servesOneThing: false, status: "paused" as const, statusOn: today }
    if (c === "dropped") return { ...g, servesOneThing: false, status: "dropped" as const, statusOn: today }
    return { ...g, servesOneThing: false }
  })
  const answers = { ...plan.answers, ...cleared }
  delete answers[PROTECTED_KEY]
  if (take.trim()) answers[seasonTakeKey(s.id)] = take.trim()
  return {
    ...plan,
    pastSeasons: [...plan.pastSeasons, past],
    season: { id: newId, startedOn: today, endsOn: null, sentence: "" },
    answers,
    seasonAreaIds: [],
    seasonFocusId: null,
    goals,
    updatedAt: new Date().toISOString(),
  }
}

// -------------------------------------------------------------------- goals

export function addSeasonGoal(plan: NsPlan, areaId: string, title: string): { plan: NsPlan; id: string } | null {
  const made = createGoal(plan, areaId, title, "season", { servesOneThing: true })
  return made
}

export function setGoalKind(plan: NsPlan, id: string, type: NsGoal["type"]): NsPlan {
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal || goal.type === type) return plan
  let next = updateGoal(plan, id, { type })
  if (type === "milestone_ladder" && !goal.ladder) {
    next = updateGoal(next, id, { ladder: { start: 0, target: 0, steps: 6, curveTension: 0, controlPoints: [], pins: [] } })
  }
  return next
}

export type RungShape = "easy" | "even" | "hard"
const SHAPE_POWER: Record<RungShape, number> = { easy: 1.6, even: 1, hard: 0.65 }
const SHAPE_TENSION: Record<RungShape, number> = { easy: 0.5, even: 0, hard: -0.5 }

export function shapeOf(tension: number): RungShape {
  return tension > 0.1 ? "easy" : tension < -0.1 ? "hard" : "even"
}

/** The rungs of a climb, from the number you are at to the target. The last rung is the target exactly. */
export function rungValues(from: number, to: number, count: number, shape: RungShape): number[] {
  const n = Math.max(1, Math.min(12, Math.round(count)))
  if (from === to) return [to]
  const span = to - from
  const decimals = Math.abs(span) / n < 1 ? 1 : 0
  const out: number[] = []
  for (let i = 1; i <= n; i += 1) {
    const raw = i === n ? to : from + span * Math.pow(i / n, SHAPE_POWER[shape])
    const v = i === n ? to : Number(raw.toFixed(decimals))
    if (v === out[out.length - 1] || (span > 0 ? v <= from : v >= from)) continue
    out.push(v)
  }
  if (out[out.length - 1] !== to) out.push(to)
  return out
}

export interface TargetNumbers {
  unit: string
  from: number
  to: number
  count: number
  shape: RungShape
  by: string | null
  /** Typed rung values, by position; a typed value replaces the generated one. */
  pins?: Record<number, number>
}

/** Write the numbers of a Target: the climb, and one rung (a checkpoint) per stop. Rungs reached so far stay reached. */
export function setTargetNumbers(plan: NsPlan, id: string, n: TargetNumbers): NsPlan {
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal) return plan
  const values = rungValues(n.from, n.to, n.count, n.shape).map((v, i) => n.pins?.[i] ?? v)
  const unit = n.unit.trim()
  const label = (v: number) => `${v}${unit ? ` ${unit}` : ""}`
  const kept = goal.checkpoints.filter((c) => !c.id.startsWith("m"))
  const old = goal.checkpoints.filter((c) => c.id.startsWith("m"))
  let next = plan
  const made: NsCheckpoint[] = values.map((v, i) => {
    const prior = old[i]
    if (prior) return { ...prior, title: label(v) }
    const seq = next.seq + 1
    next = { ...next, seq }
    return { id: `m${seq}`, title: label(v), done: false, celebration: "" }
  })
  return updateGoal(next, id, {
    unit,
    targetDate: n.by,
    ladder: { start: n.from, target: n.to, steps: values.length, curveTension: SHAPE_TENSION[n.shape], controlPoints: [], pins: [] },
    checkpoints: [...made, ...kept],
  })
}

export function setPracticeNumbers(plan: NsPlan, id: string, o: { unit: "times" | "days"; perWeek: number; ease: { frequencyPerWeek: number; durationWeeks: number }[] | null }): NsPlan {
  const per = Math.max(1, Math.min(o.unit === "days" ? 7 : 99, Math.round(o.perWeek)))
  return updateGoal(plan, id, {
    daysPerWeek: Math.min(7, per),
    perWeek: o.unit === "days" ? null : per,
    rampSteps: o.ease && o.ease.length ? o.ease : null,
  })
}

/** Spread tasks (finish-line checkpoints) evenly between today and the date. */
export function spreadTasks(plan: NsPlan, id: string, today: string, by: string): NsPlan {
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal || goal.checkpoints.length === 0) return plan
  const total = Math.max(1, Math.round((Date.parse(by) - Date.parse(today)) / 86_400_000))
  const n = goal.checkpoints.length
  return updateGoal(plan, id, {
    checkpoints: goal.checkpoints.map((c, i) => ({ ...c, dueOn: addDays(today, Math.max(1, Math.round((total * (i + 1)) / n))) })),
  })
}

export function setFinishTasks(plan: NsPlan, id: string, titles: string[], by: string | null): NsPlan {
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal) return plan
  let next = plan
  const checkpoints: NsCheckpoint[] = titles.map((t, i) => {
    const prior = goal.checkpoints[i]
    if (prior) return { ...prior, title: t }
    const seq = next.seq + 1
    next = { ...next, seq }
    return { id: `m${seq}`, title: t, done: false, celebration: "" }
  })
  return updateGoal(next, id, { checkpoints, targetDate: by })
}

/** Lower the first step: Practice goes down one a week (never below 1); a Target's first rung moves halfway to where you are. */
export function lowerFirstStep(plan: NsPlan, id: string): NsPlan {
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal) return plan
  if (goal.type === "habit_ramp") {
    const ramp = goal.rampSteps?.length ? goal.rampSteps.map((s) => ({ ...s })) : null
    if (ramp) {
      ramp[0] = { ...ramp[0], frequencyPerWeek: Math.max(1, ramp[0].frequencyPerWeek - 1) }
      return updateGoal(plan, id, { rampSteps: ramp })
    }
    const full = goal.perWeek ?? goal.daysPerWeek
    return updateGoal(plan, id, { rampSteps: [{ frequencyPerWeek: Math.max(1, Math.floor(full / 2)), durationWeeks: 2 }] })
  }
  if (goal.type === "milestone_ladder" && goal.ladder) {
    const first = goal.checkpoints.find((c) => c.id.startsWith("m"))
    const l = goal.ladder
    if (!first) return plan
    const current = Number.parseFloat(first.title)
    if (!Number.isFinite(current)) return plan
    const lowered = Number((l.start + (current - l.start) / 2).toFixed(1))
    return updateGoal(plan, id, { checkpoints: goal.checkpoints.map((c) => (c === first ? { ...c, title: `${lowered}${goal.unit ? ` ${goal.unit}` : ""}` } : c)) })
  }
  return plan
}

export function setFeeds(plan: NsPlan, id: string, ids: string[]): NsPlan {
  return updateGoal(plan, id, { feedsGoalIds: ids.filter((x) => x !== id) })
}

export function setGoalReward(plan: NsPlan, id: string, reward: string, rungRewards: Record<string, string>): NsPlan {
  const goal = plan.goals.find((g) => g.id === id)
  if (!goal) return plan
  return updateGoal(plan, id, {
    reward,
    checkpoints: goal.checkpoints.map((c) => (c.id in rungRewards ? { ...c, celebration: rungRewards[c.id] } : c)),
  })
}

export function setReasons(plan: NsPlan, id: string, reasons: string[]): NsPlan {
  return updateGoal(plan, id, { reasonsList: reasons })
}

export function setGoalStatus(plan: NsPlan, id: string, status: "active" | "achieved" | "paused" | "dropped", today: string, newDate?: string | null): NsPlan {
  const g = plan.goals.find((x) => x.id === id)
  if (!g) return plan
  if (status === "active") return updateGoal(plan, id, { status, statusOn: null, targetDate: newDate === undefined ? g.targetDate : newDate })
  return updateGoal(plan, id, { status, statusOn: today, servesOneThing: status === "achieved" ? g.servesOneThing : false })
}

export function addToSeason(plan: NsPlan, id: string): NsPlan {
  return updateGoal(plan, id, { servesOneThing: true })
}

// ------------------------------------------------------------------ actions

export function setProtected(plan: NsPlan, id: string | null): NsPlan {
  const isGoal = id != null && plan.goals.some((g) => g.id === id)
  const next = { ...plan, seasonFocusId: isGoal ? id : null, updatedAt: new Date().toISOString() }
  return withAnswers(next, { [PROTECTED_KEY]: id && !isGoal ? id : null })
}

export function setStepDays(plan: NsPlan, stepId: string, days: number[], startMin: number | null): NsPlan {
  for (const r of plan.routines) {
    const s = r.steps.find((x) => x.id === stepId)
    if (!s) continue
    const clean = [...new Set(days)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
    return updateStep(plan, r.id, stepId, { days: clean, startMin, ...(clean.length ? { daysPerWeek: clean.length } : {}) })
  }
  return plan
}

export function setPracticeLoad(plan: NsPlan, goalId: string, perWeek: number): NsPlan {
  const g = plan.goals.find((x) => x.id === goalId)
  if (!g) return plan
  const n = Math.max(1, Math.round(perWeek))
  return updateGoal(plan, goalId, { daysPerWeek: Math.min(7, n), perWeek: g.perWeek != null ? n : null })
}

// ------------------------------------------------------------------- review

export function setCheckin(plan: NsPlan, p: { day?: number; hour?: number; phone?: boolean }): NsPlan {
  const set: Record<string, string | null> = {}
  if (p.day != null) set[CHECKIN_DAY_KEY] = String(p.day)
  if (p.hour != null) set[CHECKIN_HOUR_KEY] = String(p.hour)
  if (p.phone != null) set[CHECKIN_PHONE_KEY] = p.phone ? "1" : "0"
  return withAnswers(plan, set)
}

// ------------------------------------------------------- the weekly check-in


/** The week's check-in row, made on the first change and kept even when nothing is written in it. */
export function writeWeek(plan: NsPlan, monday: string, today: string, patch: { lessons?: string; nextOutcomes?: string }): NsPlan {
  const period = periodOf("week", monday)
  const id = reviewIdFor(period)
  const existing = plan.reviews.find((r) => r.id === id)
  const base = existing ?? {
    id, cadence: "week" as const, periodStart: period.start, periodEnd: period.end, writtenOn: today,
    scores: {}, magicMoments: "", lessons: "", nextOutcomes: "",
  }
  const review = { ...base, ...patch }
  const others = plan.reviews.filter((r) => r.id !== id)
  return { ...plan, reviews: [...others, review].sort((a, b) => (a.periodEnd < b.periodEnd ? -1 : 1)), updatedAt: new Date().toISOString() }
}

export function setRungReward(plan: NsPlan, goalId: string, checkpointId: string | null, reward: string): NsPlan {
  const g = plan.goals.find((x) => x.id === goalId)
  if (!g) return plan
  if (!checkpointId) return updateGoal(plan, goalId, { reward })
  return updateGoal(plan, goalId, { checkpoints: g.checkpoints.map((c) => (c.id === checkpointId ? { ...c, celebration: reward } : c)) })
}

/** Raise (+1) or lower (-1) how often a weekly item happens, between 1 and 7. Returns the plan and what it was and became. */
export function nudgeWeekly(plan: NsPlan, item: { kind: "step" | "goal"; id: string }, by: 1 | -1): { plan: NsPlan; from: number; to: number } {
  if (item.kind === "goal") {
    const g = plan.goals.find((x) => x.id === item.id)
    if (!g) return { plan, from: 0, to: 0 }
    const from = g.perWeek ?? g.daysPerWeek
    const to = Math.max(1, Math.min(g.perWeek != null ? 99 : 7, from + by))
    return { plan: updateGoal(plan, g.id, { daysPerWeek: Math.min(7, to), perWeek: g.perWeek != null ? to : null }), from, to }
  }
  for (const r of plan.routines) {
    const s = r.steps.find((x) => x.id === item.id)
    if (!s) continue
    const to = Math.max(1, Math.min(7, s.daysPerWeek + by))
    return { plan: updateStep(plan, r.id, s.id, { daysPerWeek: to }), from: s.daysPerWeek, to }
  }
  return { plan, from: 0, to: 0 }
}
