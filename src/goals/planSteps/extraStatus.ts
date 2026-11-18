/**
 * THE EXTRA MODULES' STATUS (job spec section 5): for each, whether it is started and which reasons it carries.
 * Pure, no I/O. `planStatus` runs this beside the core modules and uses it for Next up rules 5 and 6.
 */

import type { NsPlan } from "@/src/goals/types"
import { activeObstacles, activeAreas, isExtraRoutine, lineupIds, goalsServingValue, quitGoals, readText, standingLine, topValues, LINEUP_WEEK_OF_KEY, LINEUP_WEEK_VALUE_KEY } from "./planFacts"
import { screenHref, type ExtraId } from "./planRoutes"
import type { PlanReason } from "./planStatus"
import { standingCopy } from "./copy/standing"
import { valuesCopy } from "./copy/values"
import { identityCopy } from "./copy/identity"
import { obstaclesCopy } from "./copy/obstacles"
import { routinesCopy } from "./copy/routines"
import { questionsCopy } from "./copy/questions"
import { rolemodelsCopy } from "./copy/rolemodels"
import { quitCopy } from "./copy/quit"
import { periodOf } from "@/src/goals/reviewService"

export interface ExtraRaw {
  started: boolean
  reasons: PlanReason[]
}

const TEXTS: Partial<Record<ExtraId, Record<string, string>>> = {
  standing: standingCopy.reasons, values: valuesCopy.reasons, identity: identityCopy.reasons, obstacles: obstaclesCopy.reasons,
  routines: routinesCopy.reasons, questions: questionsCopy.reasons, rolemodels: rolemodelsCopy.reasons, quit: quitCopy.reasons,
}

function make(module: ExtraId, id: string, kind: "missing" | "check", target: string, itemId?: string): PlanReason {
  const short = id.split(".")[1].replace(/-/g, "_")
  return { id, module, kind, target, ...(itemId ? { itemId } : {}), text: TEXTS[module]?.[short] ?? id, href: screenHref(target) }
}

const seg = (s: string) => encodeURIComponent(s)

function standing(plan: NsPlan): ExtraRaw {
  const active = activeAreas(plan)
  const missing = active.find((a) => !standingLine(plan, a.id))
  const started = active.some((a) => standingLine(plan, a.id))
  return { started, reasons: missing && started ? [make("standing", "standing.missing", "missing", `standing/${missing.id}`, missing.id)] : [] }
}

function values(plan: NsPlan): ExtraRaw {
  const reasons = topValues(plan)
    .filter((v) => goalsServingValue(plan, v).length === 0)
    .map((v) => make("values", "values.unserved", "check", `values/${seg(v)}/where`, v))
  return { started: plan.values.length > 0, reasons }
}

function identity(plan: NsPlan): ExtraRaw {
  const lines = (plan.answers["affirmations"] ?? "").trim()
  const started = Boolean(lines) || Boolean((plan.answers["identity_total"] ?? "").trim())
  const reasons: PlanReason[] = []
  if (lines) {
    const shownInStep = plan.routines.some((r) => r.steps.some((s) => s.goesTo === "answer:affirmations"))
    const shownAsField = plan.fields.some((f) => f.kind === "read" && f.readSourceId === "answer:affirmations")
    if (!shownInStep && !shownAsField) reasons.push(make("identity", "identity.unseen", "check", "identity/when"))
  }
  return { started, reasons }
}

function experiences(plan: NsPlan): ExtraRaw {
  return { started: plan.experiences.length > 0, reasons: [] }
}

function obstacles(plan: NsPlan): ExtraRaw {
  const all = activeObstacles(plan)
  const reasons = all.filter((o) => !o.obstacle.counter.trim()).map((o) => make("obstacles", "obstacles.no-then", "check", `obstacles/${o.obstacle.id}/then`, o.obstacle.id))
  return { started: all.length > 0, reasons }
}

function routines(plan: NsPlan): ExtraRaw {
  const mine = plan.routines.filter(isExtraRoutine)
  const reasons: PlanReason[] = []
  for (const r of mine) {
    if (r.steps.length === 0) reasons.push(make("routines", "routines.empty", "check", `routines/${r.id}/steps`, r.id))
    else if (r.kind === "sequence" && r.daysPerWeek <= 0 && r.steps.every((s) => s.days.length === 0 && s.daysPerWeek <= 0)) {
      reasons.push(make("routines", "routines.no-days", "check", `routines/${r.id}/when`, r.id))
    }
    if (r.steps.some((s) => s.goesTo && readText(plan, s.goesTo) === null)) reasons.push(make("routines", "routines.dead-link", "check", `routines/${r.id}/steps`, r.id))
  }
  return { started: mine.length > 0, reasons }
}

function questions(plan: NsPlan): ExtraRaw {
  const writes = plan.fields.some((f) => f.kind === "write") || plan.routines.some((r) => r.steps.some((s) => Boolean(s.asks?.trim())))
  const reasons = plan.fields
    .filter((f) => f.kind === "read" && readText(plan, f.readSourceId) === null)
    .map((f) => make("questions", "questions.dead-read", "check", `questions/${f.id}/kind`, f.id))
  return { started: writes, reasons }
}

function rolemodels(plan: NsPlan, today: string): ExtraRaw {
  const ids = lineupIds(plan)
  const reasons: PlanReason[] = []
  const weekOf = plan.answers[LINEUP_WEEK_OF_KEY]
  if (plan.answers[LINEUP_WEEK_VALUE_KEY]?.trim() && weekOf && weekOf < periodOf("week", today).start) reasons.push(make("rolemodels", "rolemodels.week-old", "check", "rolemodels/week"))
  return { started: ids.length > 0, reasons }
}

function quit(plan: NsPlan): ExtraRaw {
  const goals = quitGoals(plan)
  const reasons = goals.filter((g) => g.obstacles.length === 0).map((g) => make("quit", "quit.no-urge-plan", "check", "quit/urge", g.id))
  return { started: goals.length > 0, reasons }
}

function selfratings(plan: NsPlan): ExtraRaw {
  return { started: plan.fields.some((f) => f.kind === "number"), reasons: [] }
}

export function extraModules(plan: NsPlan, today: string): Record<ExtraId, ExtraRaw> {
  return {
    standing: standing(plan), values: values(plan), identity: identity(plan), experiences: experiences(plan), obstacles: obstacles(plan),
    routines: routines(plan), questions: questions(plan), rolemodels: rolemodels(plan, today), quit: quit(plan), selfratings: selfratings(plan),
  }
}

/** Where the first screen of an extra module is, for a row that has not been started. */
export function extraFirstTarget(id: ExtraId, plan: NsPlan): string {
  switch (id) {
    case "standing": return `standing/${(activeAreas(plan)[0] ?? { id: "" }).id}`
    case "values": return "values/found"
    case "identity": return "identity/who"
    case "experiences": return "experiences/list"
    case "obstacles": return "obstacles/what"
    case "routines": return "routines/pick"
    case "questions": return "questions/pick"
    case "rolemodels": return "rolemodels/pick"
    case "quit": return "quit/what"
    case "selfratings": return "selfratings/pick"
  }
}

