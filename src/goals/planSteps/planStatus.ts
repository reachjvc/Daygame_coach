/**
 * THE ONE STATUS RULE: `planStatus(input)`.
 *
 * Pure, no I/O. For each core module: Not started, Done, or Needs a look (with
 * the reasons, each one tap from the screen that fixes it), and the one thing
 * the plan suggests doing next. Built exactly from the job spec's module
 * tables; nothing else in the new version decides what is missing.
 *
 * Extra modules are not computed yet (a later phase): the Next up order below
 * runs rules 1 to 4 and 7 of the spec's algorithm, and rules 5 and 6 (extra
 * modules) wait for them.
 */

import type { NsPlan } from "@/src/goals/types"
import { isoWeekday } from "@/src/goals/dueNowService"
import { addDays } from "@/src/goals/oneThingService"
import { periodOf } from "@/src/goals/reviewService"
import {
  activeAreas, activeSeasonGoals, protectedId, carriesOldDescription, checkinSettings, goalsOfTier, hiddenAreaIds, isActive, isUnfiled,
  itemsServingSeason, numbersComplete, weeklyItems, AREAS_DESCRIBED_KEY, type RemindersRow,
} from "./planFacts"
import { CORE_IDS, screenHref, type CoreId } from "./planRoutes"
import { areasCopy } from "./copy/areas"
import { directionCopy } from "./copy/direction"
import { seasonCopy } from "./copy/season"
import { goalsCopy } from "./copy/goals"
import { actionsCopy } from "./copy/actions"
import { reviewCopy } from "./copy/review"
import { homeCopy } from "./copy/home"

export type ModuleState = "not-started" | "done" | "needs-a-look"

export interface PlanReason {
  /** `areas.few`, `season.ended`, … the spec's ids. */
  id: string
  module: CoreId
  kind: "missing" | "check"
  itemId?: string
  /** The route of the one screen that fixes it, without the base: `areas/pick`. */
  target: string
  text: string
  href: string
}

export interface ModuleStatus {
  state: ModuleState
  started: boolean
  reasons: PlanReason[]
  /** The earlier core module that must be finished first, or null. */
  lockedBy: CoreId | null
}

export interface NextUp {
  module: CoreId
  target: string
  href: string
  /** Which rule of the spec picked it. */
  rule: "build" | "review-due" | "season-ended" | "check"
  reasonId: string | null
  /** The lower-case job line, ready for "Next: {job}". */
  job: string
}

export interface PlanStatus {
  modules: Record<CoreId, ModuleStatus>
  nextUp: NextUp | null
}

export interface PlanStatusInput {
  plan: NsPlan
  /** The person's local date, `YYYY-MM-DD`. */
  today: string
  /** The person's local hour, 0 to 23. */
  hour: number
  /** The reminders row, when one can be read. The copy space has none and keeps the check-in day in the plan. */
  reminders?: RemindersRow | null
}

const key = (id: string) => id.replace(/-/g, "_")

function reason(module: CoreId, texts: Record<string, string>, id: string, kind: "missing" | "check", target: string, itemId?: string): PlanReason {
  const short = id.split(".")[1]
  return { id, module, kind, target, ...(itemId ? { itemId } : {}), text: texts[key(short)] ?? id, href: screenHref(target) }
}

// ---------------------------------------------------------------- the modules

function areasModule(plan: NsPlan): { started: boolean; reasons: PlanReason[] } {
  const active = activeAreas(plan)
  const reasons: PlanReason[] = []
  const r = (id: string, kind: "missing" | "check") => reasons.push(reason("areas", areasCopy.reasons, id, kind, id === "areas.old-desc" ? "areas/describe" : "areas/pick"))
  if (active.length < 2) r("areas.few", "missing")
  if (active.some((a) => !a.label.trim())) r("areas.blank", "missing")
  if (plan.answers[AREAS_DESCRIBED_KEY] !== "1" && active.some((a) => carriesOldDescription(plan, a))) r("areas.old-desc", "check")
  return { started: active.length > 0, reasons }
}

function directionModule(plan: NsPlan): { started: boolean; reasons: PlanReason[] } {
  const big = goalsOfTier(plan, "life")
  const become = goalsOfTier(plan, "become")
  const reasons: PlanReason[] = []
  const add = (id: string, kind: "missing" | "check", target: string, itemId?: string) => reasons.push(reason("direction", directionCopy.reasons, id, kind, target, itemId))
  if (!plan.northStar.trim()) add("direction.picture", "missing", "direction/picture")
  if (big.length === 0) add("direction.big", "missing", "direction/big")
  for (const g of big) {
    if (isUnfiled(plan, g.id) || !plan.areas.some((a) => a.id === g.areaId)) add("direction.big-area", "check", `direction/big/${g.id}/file`, g.id)
  }
  const seasonAreas = new Set(plan.seasonAreaIds)
  const seasonGoals = activeSeasonGoals(plan)
  for (const g of big) {
    if (!seasonAreas.has(g.areaId) || isUnfiled(plan, g.id)) continue
    const moved = seasonGoals.some(
      (s) => s.feedsGoalIds.includes(g.id) || s.feedsGoalIds.some((b) => become.some((x) => x.id === b && x.feedsGoalIds.includes(g.id))),
    )
    if (!moved) add("direction.unmoved", "check", `goals/new/what?feeds=${g.id}`, g.id)
  }
  return { started: Boolean(plan.northStar.trim()) || big.length > 0 || become.length > 0, reasons }
}

function seasonModule(plan: NsPlan, today: string): { started: boolean; reasons: PlanReason[] } {
  const s = plan.season
  const reasons: PlanReason[] = []
  const add = (id: string, kind: "missing" | "check", target: string) => reasons.push(reason("season", seasonCopy.reasons, id, kind, target))
  if (!s) {
    add("season.none", "missing", "season/focus")
    return { started: false, reasons }
  }
  if (!s.sentence.trim()) add("season.focus", "missing", "season/focus")
  if (!s.endsOn) add("season.end", "missing", "season/end")
  if (plan.seasonAreaIds.length === 0) add("season.areas", "missing", "season/areas")
  if (s.endsOn && s.endsOn < today) add("season.ended", "check", "season/close/brought")
  const hidden = hiddenAreaIds(plan)
  if (plan.seasonAreaIds.some((id) => hidden.has(id))) add("season.area-hidden", "check", "season/areas")
  return { started: true, reasons }
}

function goalsModule(plan: NsPlan, today: string): { started: boolean; reasons: PlanReason[] } {
  const season = activeSeasonGoals(plan)
  const reasons: PlanReason[] = []
  const add = (id: string, kind: "missing" | "check", target: string, itemId?: string) => reasons.push(reason("goals", goalsCopy.reasons, id, kind, target, itemId))
  if (!season.some(numbersComplete)) add("goals.none", "missing", "goals/new/what")
  for (const g of season) if (!numbersComplete(g)) add("goals.numbers", "check", `goals/${g.id}/numbers`, g.id)
  for (const g of plan.goals) {
    if (isActive(g) && g.targetDate && g.targetDate < today) add("goals.past-date", "check", `goals/${g.id}/status`, g.id)
  }
  const covered = new Set(season.map((g) => g.areaId))
  for (const areaId of plan.seasonAreaIds) {
    if (plan.areas.some((a) => a.id === areaId) && !covered.has(areaId)) add("goals.area-empty", "check", `goals/new/what?area=${areaId}`, areaId)
  }
  return { started: season.length > 0, reasons }
}

function actionsModule(plan: NsPlan): { started: boolean; reasons: PlanReason[] } {
  const items = weeklyItems(plan)
  const serving = itemsServingSeason(plan)
  const season = activeSeasonGoals(plan)
  const reasons: PlanReason[] = []
  const add = (id: string, kind: "missing" | "check", target: string, itemId?: string) => reasons.push(reason("actions", actionsCopy.reasons, id, kind, target, itemId))
  if (serving.length === 0) add("actions.none", "missing", season[0] ? `actions/goal/${season[0].id}` : "goals/new/what")
  for (const g of season) {
    if (g.type === "habit_ramp") continue
    if (!items.some((i) => i.kind === "step" && i.serves.includes(g.id))) add("actions.goal-bare", "check", `actions/goal/${g.id}`, g.id)
  }
  if (plan.season) {
    const f = protectedId(plan)
    const exists = f != null && items.some((i) => i.id === f)
    if (!exists) add("actions.protect", "check", "actions/protect")
  }
  return { started: items.length > 0, reasons }
}

/** The week a check-in moment covers, and the Monday that names it. */
export function dueCheckinWeek(today: string, hour: number, reviewDay: number, reviewHour: number): string {
  // The latest moment (review day at review hour) that is not in the future.
  const since = (isoWeekday(today) - reviewDay + 7) % 7
  let moment = addDays(today, -since)
  if (since === 0 && hour < reviewHour) moment = addDays(moment, -7)
  // Friday to Sunday looks back at the week the moment is in; Monday to Thursday at the week before.
  const monday = periodOf("week", moment).start
  return reviewDay >= 5 ? monday : addDays(monday, -7)
}

function hasActivityIn(plan: NsPlan, monday: string): boolean {
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    if ((plan.logged[d]?.length ?? 0) > 0 || Object.keys(plan.numbers[d] ?? {}).length > 0) return true
  }
  return false
}

function reviewModule(plan: NsPlan, today: string, hour: number, reminders: RemindersRow | null | undefined): { started: boolean; reasons: PlanReason[] } {
  const settings = checkinSettings(plan, reminders ?? null)
  const weeks = plan.reviews.filter((r) => r.cadence === "week")
  const reasons: PlanReason[] = []
  const add = (id: string, kind: "missing" | "check", target: string) => reasons.push(reason("review", reviewCopy.reasons, id, kind, target))
  if (!settings) add("review.setup", "missing", "review/day")
  else {
    const monday = dueCheckinWeek(today, hour, settings.reviewDay, settings.reviewHour)
    const written = weeks.some((r) => r.periodStart === monday)
    const earlier = weeks.some((r) => r.periodStart < monday)
    if (!written && (hasActivityIn(plan, monday) || earlier)) add("review.due", "check", "review/run/week")
  }
  return { started: settings != null || weeks.length > 0, reasons }
}

// ------------------------------------------------------------------ the whole

const FIRST_SCREEN: Record<CoreId, (plan: NsPlan) => string> = {
  areas: () => "areas/pick",
  direction: () => "direction/picture",
  season: () => "season/focus",
  goals: () => "goals/new/what",
  actions: (plan) => {
    const g = activeSeasonGoals(plan)[0]
    return g ? `actions/goal/${g.id}` : "goals/new/what"
  },
  review: () => "review/day",
}

/** The first screen of a core module, for a row that has not been started. */
export const firstTarget = (id: CoreId, plan: NsPlan): string => FIRST_SCREEN[id](plan)

/** The job line of a screen, for the Next up card. */
export function jobOf(target: string, plan: NsPlan): string {
  const [mod, a, b, c] = target.split("/")
  const goalTitle = (id: string) => plan.goals.find((g) => g.id === id)?.title ?? ""
  const fill = (s: string, name: string) => s.replace("{goal}", name || "this goal")
  switch (mod) {
    case "areas": return a === "describe" ? areasCopy.describe.job : a === "order" ? areasCopy.order.job : areasCopy.pick.job
    case "direction": {
      if (a === "big" && b && c === "file") return fill(directionCopy.big_file.job, goalTitle(b))
      if (a === "big" && b && c === "why") return fill(directionCopy.big_why.job, goalTitle(b))
      return a === "why" ? directionCopy.why.job : a === "big" ? directionCopy.big.job : a === "become" ? directionCopy.become.job : directionCopy.picture.job
    }
    case "season": {
      if (a === "close") return homeCopy.next_up.job_season_ended
      const map: Record<string, string> = {
        focus: seasonCopy.focus.job, big: seasonCopy.big.job, areas: seasonCopy.areas.job, end: seasonCopy.end.job, why: seasonCopy.why.job, yes: seasonCopy.yes.job,
      }
      return map[a] ?? seasonCopy.focus.job
    }
    case "goals": {
      if (a === "new") return goalsCopy.what.job
      const name = goalTitle(a)
      const map: Record<string, string> = {
        numbers: goalsCopy.numbers.job, status: goalsCopy.status.job, what: goalsCopy.what.job,
      }
      return fill(map[b] ?? goalsCopy.what.job, name)
    }
    case "actions": {
      if (a === "protect") return actionsCopy.protect.job
      if (a === "days") return actionsCopy.days.job
      return fill(actionsCopy.goal.job, goalTitle(b))
    }
    case "review": return a === "run" ? homeCopy.next_up.job_review_due : a === "time" ? reviewCopy.time.job : a === "phone" ? reviewCopy.phone.job : reviewCopy.day.job
  }
  return ""
}

export function planStatus(input: PlanStatusInput): PlanStatus {
  const { plan, today, hour, reminders } = input
  const raw: Record<CoreId, { started: boolean; reasons: PlanReason[] }> = {
    areas: areasModule(plan),
    direction: directionModule(plan),
    season: seasonModule(plan, today),
    goals: goalsModule(plan, today),
    actions: actionsModule(plan),
    review: reviewModule(plan, today, hour, reminders),
  }

  const modules = {} as Record<CoreId, ModuleStatus>
  let firstUnfinished: CoreId | null = null
  for (const id of CORE_IDS) {
    const { started, reasons } = raw[id]
    const state: ModuleState = !started ? "not-started" : reasons.length === 0 ? "done" : "needs-a-look"
    modules[id] = { state, started, reasons, lockedBy: firstUnfinished }
    if (firstUnfinished === null && (!started || reasons.some((r) => r.kind === "missing"))) firstUnfinished = id
  }

  return { modules, nextUp: pickNextUp(modules, plan) }
}

function pickNextUp(modules: Record<CoreId, ModuleStatus>, plan: NsPlan): NextUp | null {
  const make = (module: CoreId, target: string, rule: NextUp["rule"], reasonId: string | null): NextUp => ({
    module, target, href: screenHref(target), rule, reasonId, job: jobOf(target, plan),
  })
  // 1. The first core module that is not started or is missing something.
  for (const id of CORE_IDS) {
    const m = modules[id]
    const missing = m.reasons.find((r) => r.kind === "missing")
    if (!m.started) return make(id, FIRST_SCREEN[id](plan), "build", null)
    if (missing) return make(id, missing.target, "build", missing.id)
  }
  // 2. This week's check-in is due.
  const due = modules.review.reasons.find((r) => r.id === "review.due")
  if (due) return make("review", due.target, "review-due", due.id)
  // 3. The season has ended.
  const ended = modules.season.reasons.find((r) => r.id === "season.ended")
  if (ended) return make("season", ended.target, "season-ended", ended.id)
  // 4. The first core module with something worth a look.
  for (const id of CORE_IDS) {
    const check = modules[id].reasons.find((r) => r.kind === "check")
    if (check) return make(id, check.target, "check", check.id)
  }
  // 7. Nothing.
  return null
}

export function reasonJob(r: PlanReason, plan: NsPlan): string {
  return jobOf(r.target, plan)
}
