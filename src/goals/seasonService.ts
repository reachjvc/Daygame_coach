/**
 * THE SEASON: THE ONE THING, ITS DATES, AND WHAT IT HOLDS, IN THE PLAN.
 *
 * The one thing used to live in its own tables behind its own route
 * (`life_chapters`, `life_answers`), apart from the focus areas, the focus and
 * the goals that served it, which lived in the plan. Now it is the plan's
 * current season (Plans/life-plan-rebuild.md, Phase 3), saved with the plan.
 *
 * The one-thing box still speaks in `OneThing`s, so the season is shown as one
 * here, and its three acts (reword, move the deadline, start the next) are
 * applied to the plan.
 */

import type { NsPastSeason, NsPlan } from "./types"
import { SEASON_ANSWER_KEYS } from "./seasonAnswers"
import { DEFAULT_HORIZON_DAYS, MAX_BODY_LENGTH, addDays, daysBetween, dueOnProblem, type OneThing, type OneThingAct } from "./oneThingService"

export { SEASON_ANSWER_KEYS }

function asOneThing(id: string, sentence: string, startedOn: string, endsOn: string, today: string): OneThing {
  const daysLeft = daysBetween(today, endsOn)
  return {
    id,
    chapterId: id,
    body: sentence,
    answeredAt: startedOn,
    startedOn,
    dueOn: endsOn,
    daysLeft,
    lapsed: daysLeft < 0,
    wordings: 1,
    extended: false,
  }
}

/** The season in force as a one thing, or null when it has no sentence yet. */
export function currentSeasonOneThing(plan: NsPlan, today: string): OneThing | null {
  const s = plan.season
  if (!s || !s.sentence.trim()) return null
  const startedOn = s.startedOn ?? today
  return asOneThing(s.id, s.sentence, startedOn, s.endsOn ?? addDays(startedOn, DEFAULT_HORIZON_DAYS), today)
}

/** The seasons before it, newest first, as the box lists them. */
export function pastSeasonOneThings(plan: NsPlan, today: string): OneThing[] {
  return [...plan.pastSeasons]
    .filter((p) => p.sentence.trim())
    .reverse()
    .map((p) => asOneThing(p.id, p.sentence, p.startedOn, p.endsOn ?? p.endedOn, today))
}

function nextSeasonId(plan: NsPlan): string {
  const used = new Set([plan.season?.id, ...plan.pastSeasons.map((p) => p.id)])
  let n = plan.pastSeasons.length + 1
  while (used.has(`s${n}`)) n += 1
  return `s${n}`
}

/** The current season as a past one, ended today, with everything it holds. */
function ended(plan: NsPlan, today: string): NsPastSeason | null {
  const s = plan.season
  if (!s) return null
  const startedOn = s.startedOn && s.startedOn <= today ? s.startedOn : today
  return {
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
}

export type SeasonWrite = { ok: true; plan: NsPlan } | { ok: false; reason: string }

/**
 * Reword the one thing, move its deadline, or start the next season.
 *
 * `dueOn` undefined means "you work it out": the season keeps its own, or a
 * new one gets `defaultDue` (the account's today plus the usual season).
 *
 * STARTING ANEW ENDS THE CURRENT SEASON AND KEEPS IT, with its why, cost,
 * identity, values, areas, focus and goals, and opens an empty one: a new one
 * thing must not open carrying the old one's start date and reasons.
 */
export function writeSeasonOneThing(
  plan: NsPlan,
  act: OneThingAct,
  body: string,
  dueOn: string | undefined,
  today: string,
  defaultDue: string,
  now = new Date().toISOString(),
): SeasonWrite {
  const sentence = body.trim()
  if (!sentence) return { ok: false, reason: "Write the sentence first." }
  if (sentence.length > MAX_BODY_LENGTH) return { ok: false, reason: `Keep it under ${MAX_BODY_LENGTH} characters.` }
  if (dueOn !== undefined) {
    const problem = dueOnProblem(dueOn, today)
    if (problem) return { ok: false, reason: problem }
  }

  const current = plan.season
  // A season with no sentence yet (one implied by focus areas, a focus, goals
  // or answers written first) has not started: its first sentence starts it
  // today, with a deadline, as a first one thing always has.
  if (current && !current.sentence.trim()) {
    return {
      ok: true,
      plan: { ...plan, season: { ...current, startedOn: today, endsOn: dueOn ?? defaultDue, sentence }, updatedAt: now },
    }
  }
  if (current && act !== "start") {
    const endsOn = act === "extend" && dueOn ? dueOn : dueOn ?? current.endsOn
    if (current.sentence === sentence && current.endsOn === endsOn) return { ok: true, plan }
    return { ok: true, plan: { ...plan, season: { ...current, sentence, endsOn }, updatedAt: now } }
  }

  // No season yet: this is the first, and what is already written is its own.
  if (!current) {
    return {
      ok: true,
      plan: { ...plan, season: { id: nextSeasonId(plan), startedOn: today, endsOn: dueOn ?? defaultDue, sentence }, updatedAt: now },
    }
  }

  const past = ended(plan, today)!
  const cleared = Object.fromEntries(SEASON_ANSWER_KEYS.map((k) => [k, ""]))
  return {
    ok: true,
    plan: {
      ...plan,
      pastSeasons: [...plan.pastSeasons, past],
      season: { id: nextSeasonId(plan), startedOn: today, endsOn: dueOn ?? defaultDue, sentence },
      answers: { ...plan.answers, ...cleared },
      seasonAreaIds: [],
      seasonFocusId: null,
      goals: plan.goals.map((g) => (g.servesOneThing ? { ...g, servesOneThing: false } : g)),
      updatedAt: now,
    },
  }
}

/** Delete a past season, as the box's "delete" on an old one thing does. */
export function removePastSeason(plan: NsPlan, id: string, now = new Date().toISOString()): NsPlan {
  if (!plan.pastSeasons.some((p) => p.id === id)) return plan
  return { ...plan, pastSeasons: plan.pastSeasons.filter((p) => p.id !== id), updatedAt: now }
}
