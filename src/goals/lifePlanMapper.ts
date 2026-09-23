/**
 * THE PLAN, BOTH WAYS: `NsPlan` <-> rows.
 *
 * Pure. No clock, no database, no React, no ids minted here — `idFor` is handed
 * in, because a mapper that mints its own UUIDs cannot be tested for the one
 * property that matters: that a plan which goes out and comes back is the same
 * plan. `tests/unit/goals/lifePlanMapper.test.ts` round-trips a real plan.
 *
 * ----------------------------------------------------------------------------
 * A NODE KEEPS ITS UUID FOR AS LONG AS ITS LOCAL ID EXISTS.
 *
 * `idFor(localId)` is expected to return the UUID that local id already has, and
 * only mint one when it is genuinely new. That is not tidiness: the day tables
 * point at node UUIDs and cascade, so a mapper that re-minted on every save
 * would delete every tick and journal entry the person has ever written, on an
 * ordinary edit, silently. The repo reads the existing nodes first and closes
 * over them.
 *
 * ----------------------------------------------------------------------------
 * THE DAY HALF OF `NsPlan` IS NOT MAPPED HERE, and this is Phase 1's one
 * deliberate gap: `daily`, `logged`, `notes` and `journal` have tables but no
 * route until Phase 2. `rowsToPlan` therefore leaves them EMPTY and the caller
 * merges them from the browser copy, which is why `mergeDayRecord` exists below
 * and why the loader must use it. Dropping them instead would lose a year of
 * somebody's journal at the moment they first sign in on a second device.
 */

import type {
  NsArea,
  NsAreaReview,
  NsBelief,
  NsCheckpoint,
  NsDailyField,
  NsExperience,
  NsGoal,
  NsObstacle,
  NsPlan,
  NsRoutine,
  NsRoutineStep,
  NsSplitDay,
  NsSubStep,
} from "./types"
import type {
  AnswerRow,
  AreaRow,
  BeliefRow,
  CheckpointRow,
  ExperienceRow,
  FieldRow,
  GoalFeedRow,
  GoalRow,
  GoalServeRow,
  HabitRow,
  LifePlanNodeKind,
  NodeRow,
  NorthStarRow,
  ObstacleRow,
  PlanRows,
  RoutineRow,
  RoutineServeRow,
  SplitDayRow,
  StepRow,
  StepServeRow,
  SubStepRow,
  ValueRow,
} from "@/src/db/lifePlanTypes"
import { normalizeNsPlan } from "./northStarService"

/**
 * The north star's local id.
 *
 * A fixed name rather than a counter value, because there is exactly one and
 * the read-source registry addresses it by the bare constant "star". No
 * counter-minted id can collide with it: those are `<prefix><number>`.
 */
export const NORTH_STAR_LOCAL_ID = "north_star"

export interface MapContext {
  planId: string
  userId: string
  /** The UUID this local id already has, or a fresh one if it is new. */
  idFor: (localId: string, kind: LifePlanNodeKind) => string
}

/** Everything the mapper needs to put a node in the node table. */
interface Minted {
  id: string
  localId: string
  kind: LifePlanNodeKind
}

// ---------------------------------------------------------------- plan -> rows

export function planToRows(plan: NsPlan, ctx: MapContext): PlanRows {
  const { planId, userId } = ctx
  const nodes: NodeRow[] = []
  const seen = new Set<string>()

  /**
   * Register a part and hand back its UUID.
   *
   * A local id used twice in one plan is refused HERE rather than by the
   * database, because the database's message names a constraint and this one
   * names the plan. Phase 0 made this unreachable from the flow; it stays
   * because an imported browser copy predates Phase 0.
   */
  const node = (localId: string, kind: LifePlanNodeKind): Minted => {
    if (seen.has(localId)) {
      throw new Error(
        `Two parts of this plan share the id "${localId}". One of them has to be renamed before it can be saved.`,
      )
    }
    seen.add(localId)
    const id = ctx.idFor(localId, kind)
    nodes.push({ id, plan_id: planId, user_id: userId, kind, local_id: localId })
    return { id, localId, kind }
  }

  // ---------------------------------------------------------------- the star
  const star = node(NORTH_STAR_LOCAL_ID, "north_star")
  const north_stars: NorthStarRow[] = [{
    id: star.id,
    user_id: userId,
    plan_id: planId,
    node_kind: "north_star",
    text: plan.northStar ?? "",
    horizon_years: horizonOf(plan.horizonYears),
  }]

  // --------------------------------------------------------------- the areas
  const areaId = new Map<string, string>()
  const areas: AreaRow[] = plan.areas.map((area, i) => {
    const n = node(area.id, "area")
    areaId.set(area.id, n.id)
    const review = plan.review?.[area.id]
    const rank = plan.seasonAreaIds?.indexOf(area.id) ?? -1
    return {
      id: n.id,
      user_id: userId,
      plan_id: planId,
      node_kind: "area" as const,
      position: i,
      label: area.label ?? "",
      sublabel: area.sublabel ?? "",
      color: area.color ?? "",
      custom: Boolean(area.custom),
      review_ten: review?.ten ?? "",
      review_purpose: review?.purpose ?? "",
      review_snapshot: review?.snapshot ?? "",
      review_blockers: review?.blockers ?? "",
      review_identity: review?.identity ?? "",
      review_fortnight: review?.fortnight ?? null,
      review_goals_aim: review?.goalsAim ?? null,
      season_rank: rank >= 0 ? rank : null,
    }
  })

  // --------------------------------------------------------------- the goals
  // TWO ORDERS, BOTH REAL. `position` is the goals list's own order, which is
  // what eight live screens render by reading `plan.goals` directly.
  // `priority_rank` is the index in `priorityIds`, a separate list that
  // `addGoal` maintains alongside. Storing only one silently reorders every
  // goal screen the first time a plan is loaded from the server.
  const rank = new Map(orderGoals(plan).map((g, i) => [g.id, i]))
  const goalId = new Map<string, string>()
  const goals: GoalRow[] = []
  const checkpoints: CheckpointRow[] = []
  const obstacles: ObstacleRow[] = []
  const beliefs: BeliefRow[] = []
  const habits: HabitRow[] = []
  const values: ValueRow[] = []

  plan.goals.forEach((goal, i) => {
    const n = node(goal.id, "goal")
    goalId.set(goal.id, n.id)
    goals.push({
      id: n.id,
      user_id: userId,
      plan_id: planId,
      node_kind: "goal",
      position: i,
      priority_rank: rank.get(goal.id) ?? i,
      area_id: areaId.get(goal.areaId) ?? null,
      title: goal.title ?? "",
      goal_type: goal.type ?? "achievement",
      why: goal.why ?? "",
      pain_why: goal.painWhy ?? "",
      sentence: goal.sentence ?? "",
      feeling: goal.feeling ?? "",
      reward: goal.reward ?? "",
      stake: goal.stake ?? "",
      unit: goal.unit ?? "",
      target_date: goal.targetDate ?? null,
      belief_level: goal.beliefLevel ?? null,
      desire_level: goal.desireLevel ?? null,
      days_per_week: clamp(goal.daysPerWeek ?? 0, 0, 7),
      per_week: goal.perWeek ?? null,
      is_abstinence: Boolean(goal.isAbstinence),
      serves_one_thing: Boolean(goal.servesOneThing),
      metric: goal.metric ?? null,
      ladder: goal.ladder ?? null,
      ramp_steps: goal.rampSteps ?? null,
      reasons_list: goal.reasonsList ?? [],
      asked: goal.asked ?? [],
    })

    ;(goal.checkpoints ?? []).forEach((c, j) => {
      const cn = node(c.id, "checkpoint")
      checkpoints.push({
        id: cn.id, user_id: userId, goal_id: n.id, node_kind: "checkpoint",
        position: j, title: c.title ?? "", done: Boolean(c.done),
        celebration: c.celebration ?? "",
      })
    })
    ;(goal.obstacles ?? []).forEach((o, j) => {
      const on = node(o.id, "obstacle")
      obstacles.push({
        id: on.id, user_id: userId, goal_id: n.id, node_kind: "obstacle",
        position: j, what: o.what ?? "", counter: o.counter ?? "",
      })
    })
    ;(goal.beliefs ?? []).forEach((b, j) => {
      const bn = node(b.id, "belief")
      beliefs.push({
        id: bn.id, user_id: userId, goal_id: n.id, node_kind: "belief",
        position: j, old: b.old ?? "", useful: b.useful ?? null,
        evidence: b.evidence ?? "", replacement: b.replacement ?? "",
      })
    })
    ;(goal.habits ?? []).forEach((h, j) => {
      const hn = node(h.id, "habit")
      habits.push({
        id: hn.id, user_id: userId, goal_id: n.id, node_kind: "habit",
        position: j, title: h.title ?? "",
        days_per_week: clamp(h.daysPerWeek ?? 0, 0, 7),
        placeholder: Boolean(h.placeholder),
        routine_days: (h.routine?.days ?? []).map((d) => ({ id: d.id, name: d.name })),
        source_target_id: h.sourceTargetId ?? null,
      })
    })
    ;(goal.values ?? []).forEach((v, j) => {
      if (!v.trim()) return
      values.push({
        id: ctx.idFor(`value:goal:${goal.id}:${j}`, "goal"),
        user_id: userId, plan_id: planId, scope: "goal",
        value: v, position: j, area_id: null, goal_id: n.id,
      })
    })
  })

  // Written after every goal has an id, so a link to a goal defined later in
  // the list still resolves. A feed pointing at a goal that is no longer in the
  // plan is dropped rather than carried as a dangling id.
  const goal_feeds: GoalFeedRow[] = []
  const goal_serves: GoalServeRow[] = []
  plan.goals.forEach((goal) => {
    const from = goalId.get(goal.id)
    if (!from) return
    ;(goal.feedsGoalIds ?? []).forEach((target, j) => {
      const to = goalId.get(target)
      if (!to || to === from) return
      goal_feeds.push({ user_id: userId, goal_id: from, feeds_goal_id: to, position: j })
    })
    ;(goal.serves ?? []).forEach((area, j) => {
      const to = areaId.get(area)
      if (!to) return
      goal_serves.push({ user_id: userId, goal_id: from, area_id: to, position: j })
    })
  })

  // ------------------------------------------------------------ the routines
  const routines: RoutineRow[] = []
  const routine_serves: RoutineServeRow[] = []
  const steps: StepRow[] = []
  const split_days: SplitDayRow[] = []
  const step_serves: StepServeRow[] = []
  const stepId = new Map<string, string>()

  plan.routines.forEach((routine, i) => {
    const n = node(routine.id, "routine")
    const enrollment = routine.program?.enrollmentId ?? null
    routines.push({
      id: n.id, user_id: userId, plan_id: planId, node_kind: "routine",
      position: i, label: routine.label ?? "", blueprint_id: routine.blueprintId ?? "",
      kind: routine.kind === "weekly" ? "weekly" : "sequence",
      area_id: routine.areaId ? areaId.get(routine.areaId) ?? null : null,
      days_per_week: clamp(routine.daysPerWeek ?? 0, 0, 7),
      enrollment_id: enrollment,
    })
    ;(routine.serves ?? []).forEach((area, j) => {
      const to = areaId.get(area)
      if (!to) return
      routine_serves.push({ user_id: userId, routine_id: n.id, area_id: to, position: j })
    })
    ;(routine.steps ?? []).forEach((step, j) => {
      const sn = node(step.id, "routine_step")
      stepId.set(step.id, sn.id)
      steps.push({
        id: sn.id, user_id: userId, routine_id: n.id, node_kind: "routine_step",
        position: j,
        library_step_id: step.libraryStepId ?? null,
        title: step.title ?? "",
        minutes: clamp(step.minutes ?? 0, 0, 1440),
        days_per_week: clamp(step.daysPerWeek ?? 0, 0, 7),
        dimension: step.dimension ?? null,
        days: step.days ?? [],
        start_min: step.startMin ?? null,
        // ABSENT IS NOT NULL. A step that has never had a destination has no
        // key at all and the loader infers one; `null` is one somebody cleared.
        // One nullable column cannot hold three states, so the flag carries the
        // third.
        goes_to: step.goesTo ?? null,
        goes_to_set: "goesTo" in step,
        asks: step.asks ?? null,
        asks_set: "asks" in step,
      })
    })
    // A ROUTINE TRACKED BY A PROGRAM HAS NO SPLIT-DAY ROWS. Its days are
    // derived from the enrollment's own schedule, so a swapped lift is named
    // correctly. Writing them here too would be two answers to one question,
    // and a CHECK cannot span two tables.
    if (!enrollment) {
      ;(routine.splitDays ?? []).forEach((day, j) => {
        const dn = node(day.id, "split_day")
        split_days.push({
          id: dn.id, user_id: userId, routine_id: n.id, node_kind: "split_day",
          position: j, name: day.name ?? "",
        })
      })
    }
  })

  // After every goal AND every step exists.
  plan.routines.forEach((routine) => {
    ;(routine.steps ?? []).forEach((step) => {
      const from = stepId.get(step.id)
      if (!from) return
      ;(step.servesGoalIds ?? []).forEach((target, j) => {
        const to = goalId.get(target)
        if (!to) return
        step_serves.push({ user_id: userId, step_id: from, goal_id: to, position: j })
      })
    })
  })

  // --------------------------------------------------------- the rest of it
  const experiences: ExperienceRow[] = (plan.experiences ?? []).map((x, i) => {
    const n = node(x.id, "experience")
    return {
      id: n.id, user_id: userId, plan_id: planId, node_kind: "experience" as const,
      position: i, title: x.title ?? "",
      area_id: x.areaId ? areaId.get(x.areaId) ?? null : null,
      goal_id: x.goalId ? goalId.get(x.goalId) ?? null : null,
      done: Boolean(x.done),
      // A date on something not done is one field written without the other,
      // and the database refuses the pair.
      done_on: x.done ? x.doneOn ?? null : null,
    }
  })

  const fields: FieldRow[] = (plan.fields ?? []).map((f, i) => {
    const n = node(f.id, "field")
    return {
      id: n.id, user_id: userId, plan_id: planId, node_kind: "field" as const,
      position: i, label: f.label ?? "",
      kind: f.kind ?? "write",
      target_id: f.targetId ? localToUuid(f.targetId, goalId, stepId, nodes) : null,
      read_source_id: f.readSourceId ?? null,
    }
  })

  const sub_steps: SubStepRow[] = []
  ;(plan.subSteps ?? []).forEach((s, i) => {
    const target = localToUuid(s.targetId, goalId, stepId, nodes)
    // A sub-step with no parent left in the plan has nothing to be a sub-step
    // OF, and the column is NOT NULL. Dropped rather than saved pointing at
    // nothing — the same thing the flow does today.
    if (!target) return
    const n = node(s.id, "sub_step")
    sub_steps.push({
      id: n.id, user_id: userId, plan_id: planId, node_kind: "sub_step",
      position: i, target_id: target, title: s.title ?? "",
    })
  })

  ;(plan.currentValues ?? []).forEach((v, i) => {
    if (!v.trim()) return
    values.push({
      id: ctx.idFor(`value:past:${i}`, "goal"), user_id: userId, plan_id: planId,
      scope: "past", value: v, position: i, area_id: null, goal_id: null,
    })
  })
  ;(plan.values ?? []).forEach((v, i) => {
    if (!v.trim()) return
    values.push({
      id: ctx.idFor(`value:chosen:${i}`, "goal"), user_id: userId, plan_id: planId,
      scope: "chosen", value: v, position: i, area_id: null, goal_id: null,
    })
  })
  Object.entries(plan.review ?? {}).forEach(([area, review]) => {
    const to = areaId.get(area)
    if (!to) return
    ;(review.values ?? []).forEach((v, i) => {
      if (!v.trim()) return
      values.push({
        id: ctx.idFor(`value:area:${area}:${i}`, "goal"), user_id: userId, plan_id: planId,
        scope: "area", value: v, position: i, area_id: to, goal_id: null,
      })
    })
  })

  const answers: AnswerRow[] = [
    ...entries(plan.rungs).map(([prompt_id, body]) => ({
      id: ctx.idFor(`answer:rung:${prompt_id}`, "goal"),
      user_id: userId, plan_id: planId, kind: "rung" as const, prompt_id, body,
    })),
    ...entries(plan.answers).map(([prompt_id, body]) => ({
      id: ctx.idFor(`answer:answer:${prompt_id}`, "goal"),
      user_id: userId, plan_id: planId, kind: "answer" as const, prompt_id, body,
    })),
  ]

  return {
    plan_id: planId,
    user_id: userId,
    version: plan.version ?? 1,
    seq: plan.seq ?? 0,
    season_focus_id: plan.seasonFocusId ? areaId.get(plan.seasonFocusId) ?? null : null,
    nodes,
    north_stars,
    areas,
    goals,
    checkpoints,
    obstacles,
    beliefs,
    habits,
    goal_feeds,
    goal_serves,
    routines,
    routine_serves,
    steps,
    split_days,
    step_serves,
    experiences,
    fields,
    sub_steps,
    values,
    answers,
  }
}

// ---------------------------------------------------------------- rows -> plan

/**
 * Back into the shape the flow works in.
 *
 * Hands off to `normalizeNsPlan` at the end rather than repeating its repairs,
 * so there is one implementation of what a valid plan is. The day half comes
 * back EMPTY — see the file header; the caller merges it.
 */
export function rowsToPlan(rows: PlanRows): NsPlan | null {
  const local = new Map(rows.nodes.map((n) => [n.id, n.local_id]))
  const id = (uuid: string | null | undefined): string => (uuid ? local.get(uuid) ?? "" : "")

  const byGoal = <T extends { goal_id: string; position: number }>(list: T[], goal: string): T[] =>
    list.filter((r) => r.goal_id === goal).sort((a, b) => a.position - b.position)

  const areaRows = [...rows.areas].sort((a, b) => a.position - b.position)
  const goalRows = [...rows.goals].sort((a, b) => a.position - b.position)
  const routineRows = [...rows.routines].sort((a, b) => a.position - b.position)

  // ONLY AREAS SOMEBODY ACTUALLY ANSWERED. The review lives as columns on the
  // area row, so every area technically has one; emitting all twelve would put
  // a dozen empty objects into every plan that had none, which is not what the
  // flow stores and shows up as "you have started this" on screens that test
  // the key's presence.
  const review: Record<string, NsAreaReview> = {}
  for (const a of areaRows) {
    const values = rows.values
      .filter((v) => v.scope === "area" && v.area_id === a.id)
      .sort((x, y) => x.position - y.position)
      .map((v) => v.value)
    const answered =
      Boolean(a.review_ten || a.review_purpose || a.review_snapshot || a.review_blockers ||
        a.review_identity || values.length) ||
      a.review_fortnight !== null || a.review_goals_aim !== null
    if (!answered) continue
    review[id(a.id)] = {
      ten: a.review_ten,
      purpose: a.review_purpose,
      snapshot: a.review_snapshot,
      fortnight: a.review_fortnight,
      goalsAim: a.review_goals_aim,
      blockers: a.review_blockers,
      identity: a.review_identity,
      values,
    }
  }

  const areas: NsArea[] = areaRows.map((a) => ({
    id: id(a.id),
    label: a.label,
    sublabel: a.sublabel,
    color: a.color,
    custom: a.custom,
  }))

  const goals: NsGoal[] = goalRows.map((g) => ({
    id: id(g.id),
    areaId: id(g.area_id),
    title: g.title,
    type: g.goal_type as NsGoal["type"],
    why: g.why,
    painWhy: g.pain_why,
    sentence: g.sentence,
    targetDate: g.target_date,
    beliefLevel: g.belief_level,
    desireLevel: g.desire_level,
    unit: g.unit,
    ladder: (g.ladder ?? null) as NsGoal["ladder"],
    daysPerWeek: g.days_per_week,
    perWeek: g.per_week,
    rampSteps: (g.ramp_steps ?? null) as NsGoal["rampSteps"],
    habits: byGoal(rows.habits, g.id).map((h) => ({
      id: id(h.id),
      title: h.title,
      daysPerWeek: h.days_per_week,
      sourceTargetId: h.source_target_id,
      placeholder: h.placeholder,
      routine: h.routine_days.length ? { days: h.routine_days.map((d) => ({ id: d.id, name: d.name })) } : null,
    })),
    reasonsList: g.reasons_list,
    feeling: g.feeling,
    checkpoints: byGoal(rows.checkpoints, g.id).map((c): NsCheckpoint => ({
      id: id(c.id), title: c.title, done: c.done, celebration: c.celebration,
    })),
    feedsGoalIds: rows.goal_feeds
      .filter((f) => f.goal_id === g.id)
      .sort((a, b) => a.position - b.position)
      .map((f) => id(f.feeds_goal_id)),
    servesOneThing: g.serves_one_thing,
    reward: g.reward,
    stake: g.stake,
    obstacles: byGoal(rows.obstacles, g.id).map((o): NsObstacle => ({
      id: id(o.id), what: o.what, counter: o.counter,
    })),
    beliefs: byGoal(rows.beliefs, g.id).map((b): NsBelief => ({
      id: id(b.id), old: b.old, useful: b.useful, evidence: b.evidence, replacement: b.replacement,
    })),
    values: rows.values
      .filter((v) => v.scope === "goal" && v.goal_id === g.id)
      .sort((a, b) => a.position - b.position)
      .map((v) => v.value),
    metric: g.metric,
    serves: rows.goal_serves
      .filter((s) => s.goal_id === g.id)
      .sort((a, b) => a.position - b.position)
      .map((s) => id(s.area_id)),
    asked: g.asked,
    isAbstinence: g.is_abstinence,
  }))

  const routines: NsRoutine[] = routineRows.map((r) => ({
    id: id(r.id),
    label: r.label,
    blueprintId: r.blueprint_id,
    kind: r.kind,
    areaId: r.area_id ? id(r.area_id) : null,
    serves: rows.routine_serves
      .filter((s) => s.routine_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map((s) => id(s.area_id)),
    steps: rows.steps
      .filter((s) => s.routine_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map((s): NsRoutineStep => {
        const step: NsRoutineStep = {
          id: id(s.id),
          libraryStepId: s.library_step_id,
          title: s.title,
          minutes: s.minutes,
          daysPerWeek: s.days_per_week,
          dimension: s.dimension,
          servesGoalIds: rows.step_serves
            .filter((x) => x.step_id === s.id)
            .sort((a, b) => a.position - b.position)
            .map((x) => id(x.goal_id)),
          days: s.days,
          startMin: s.start_min,
          goesTo: s.goes_to,
          asks: s.asks,
        }
        // The third state, restored: a step that never had one gets the key
        // DELETED rather than set to null, so the loader's inference still runs
        // and does not read a deliberate clearing where there was none.
        if (!s.goes_to_set) delete (step as Partial<NsRoutineStep>).goesTo
        if (!s.asks_set) delete (step as Partial<NsRoutineStep>).asks
        return step
      }),
    daysPerWeek: r.days_per_week,
    splitDays: rows.split_days
      .filter((d) => d.routine_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map((d): NsSplitDay => ({ id: id(d.id), name: d.name })),
    program: r.enrollment_id ? { enrollmentId: r.enrollment_id } : null,
  }))

  const star = rows.north_stars[0]

  const draft = {
    version: rows.version,
    horizonYears: star?.horizon_years ?? 10,
    northStar: star?.text ?? "",
    rungs: fromAnswers(rows.answers, "rung"),
    areas,
    routines,
    goals,
    review,
    answers: fromAnswers(rows.answers, "answer"),
    currentValues: scoped(rows.values, "past"),
    values: scoped(rows.values, "chosen"),
    priorityIds: [...rows.goals]
      .sort((a, b) => a.priority_rank - b.priority_rank)
      .map((g) => id(g.id)),
    seasonFocusId: rows.season_focus_id ? id(rows.season_focus_id) : null,
    seasonAreaIds: areaRows
      .filter((a) => a.season_rank !== null)
      .sort((a, b) => (a.season_rank ?? 0) - (b.season_rank ?? 0))
      .map((a) => id(a.id)),
    experiences: [...rows.experiences]
      .sort((a, b) => a.position - b.position)
      .map((x): NsExperience => ({
        id: id(x.id),
        title: x.title,
        areaId: x.area_id ? id(x.area_id) : null,
        done: x.done,
        doneOn: x.done_on,
        goalId: x.goal_id ? id(x.goal_id) : null,
      })),
    fields: [...rows.fields]
      .sort((a, b) => a.position - b.position)
      .map((f): NsDailyField => ({
        id: id(f.id),
        label: f.label,
        targetId: f.target_id ? id(f.target_id) : null,
        kind: f.kind,
        readSourceId: f.read_source_id,
      })),
    subSteps: [...rows.sub_steps]
      .sort((a, b) => a.position - b.position)
      .map((s): NsSubStep => ({ id: id(s.id), targetId: id(s.target_id), title: s.title })),
    seq: rows.seq,
    updatedAt: null,
    // Phase 2's, and empty until then. `mergeDayRecord` puts the browser's copy
    // back so the first sign-in on a second device does not read as a wipe.
    daily: {},
    logged: {},
    notes: {},
    journal: {},
  }

  return normalizeNsPlan(draft)
}

/**
 * Put the day half back from whatever the browser still holds.
 *
 * PHASE 1 DOES NOT SAVE DAYS. Without this the server's copy would come back
 * with four empty maps and the flow would write that over a year of ticks,
 * notes and journal the moment somebody signed in somewhere new. Phase 2
 * replaces the body of this function with a read; the call site does not move.
 */
export function mergeDayRecord(server: NsPlan, browser: NsPlan | null): NsPlan {
  if (!browser) return server
  return {
    ...server,
    daily: nonEmpty(server.daily) ? server.daily : browser.daily ?? {},
    logged: nonEmpty(server.logged) ? server.logged : browser.logged ?? {},
    notes: nonEmpty(server.notes) ? server.notes : browser.notes ?? {},
    journal: nonEmpty(server.journal) ? server.journal : browser.journal ?? {},
  }
}

// ---------------------------------------------------------------------- bits

function nonEmpty(v: Record<string, unknown> | undefined): boolean {
  return Boolean(v && Object.keys(v).length > 0)
}

function entries(record: Record<string, string> | undefined): [string, string][] {
  return Object.entries(record ?? {}).filter(([k]) => k.trim().length > 0)
}

function scoped(values: ValueRow[], scope: "past" | "chosen"): string[] {
  return values
    .filter((v) => v.scope === scope)
    .sort((a, b) => a.position - b.position)
    .map((v) => v.value)
}

function fromAnswers(answers: AnswerRow[], kind: "rung" | "answer"): Record<string, string> {
  const out: Record<string, string> = {}
  for (const a of answers) if (a.kind === kind) out[a.prompt_id] = a.body
  return out
}

/**
 * The goals, in the order their positions mean.
 *
 * A goal's rank IS its index in `priorityIds` — `orderedGoals` renders from
 * that list — so the rows are written in that order and `position` carries it.
 *
 * ANYTHING `priorityIds` FORGOT GOES ON THE END rather than being dropped.
 * A goal missing from the list would otherwise get no row at all and disappear
 * from every ordered view; Phase 0 hit exactly this when renaming a duplicate
 * dropped it from the list. An id in the list with no goal behind it is
 * skipped, which is the same repair the flow already makes.
 */
function orderGoals(plan: NsPlan): NsGoal[] {
  const byId = new Map(plan.goals.map((g) => [g.id, g]))
  const out: NsGoal[] = []
  const placed = new Set<string>()
  for (const id of plan.priorityIds ?? []) {
    const goal = byId.get(id)
    if (!goal || placed.has(id)) continue
    placed.add(id)
    out.push(goal)
  }
  for (const goal of plan.goals) {
    if (!placed.has(goal.id)) out.push(goal)
  }
  return out
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

/** 5, 10 or 20 — the column refuses anything else, so it is decided here. */
function horizonOf(years: number | undefined): number {
  return years === 5 || years === 20 ? years : 10
}

/**
 * A polymorphic pointer's UUID.
 *
 * Goals and steps are looked up directly; anything else is found in the nodes
 * already minted, which covers experiences and sub-steps. Returns null when the
 * target is no longer in the plan, which the caller then handles — a field
 * re-homes to the day, a sub-step is dropped.
 */
function localToUuid(
  localId: string,
  goalId: Map<string, string>,
  stepId: Map<string, string>,
  nodes: NodeRow[],
): string | null {
  return (
    goalId.get(localId) ??
    stepId.get(localId) ??
    nodes.find((n) => n.local_id === localId)?.id ??
    null
  )
}
