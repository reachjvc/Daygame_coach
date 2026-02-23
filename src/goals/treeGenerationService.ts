/**
 * Tree generation service — creates goal inserts from the static goal graph.
 *
 * Pure functions, no DB calls. Takes a template ID, traverses the graph,
 * and returns an ordered array of UserGoalInsert objects ready for batch creation.
 */

import { GOAL_TEMPLATE_MAP, getChildren } from "./data/goalGraph"
import type { GoalTemplate } from "./types"
import type { UserGoalInsert } from "@/src/db/goalTypes"

/** Temporary ID prefix used for parent references before real IDs are assigned */
const TEMP_PREFIX = "__temp_"

/**
 * A goal insert with a temporary ID and optional temporary parent reference.
 * The batch creation endpoint resolves these to real UUIDs.
 */
export interface BatchGoalInsert extends UserGoalInsert {
  _tempId: string
  _tempParentId: string | null
}

/**
 * Generate an ordered array of goal inserts from a template ID.
 *
 * Traverses the goal graph: picked goal → L3 work goals (L2 achievements are standalone).
 * Returns inserts in creation order (L1 first, then L3s) so parent
 * IDs can be resolved sequentially.
 *
 * For L0 picks: creates the L0 goal, one default L1 child, then L3s beneath it.
 * For L1 picks: creates L1, then L3s beneath.
 * For L2 picks: creates standalone L2 (no children — L2s are badges, not hierarchy nodes).
 */
export function generateGoalTreeInserts(templateId: string): BatchGoalInsert[] {
  const root = GOAL_TEMPLATE_MAP[templateId]
  if (!root) return []

  const inserts: BatchGoalInsert[] = []

  if (root.level === 0) {
    // L0: create the dream, then pick first L1 child and build L3s beneath it
    inserts.push(templateToInsert(root, null))
    const l1Children = getChildren(root.id).filter((c) => c.level === 1)
    if (l1Children.length > 0) {
      const l1 = l1Children[0]
      inserts.push(templateToInsert(l1, TEMP_PREFIX + root.id))
      appendL3Direct(inserts, l1, TEMP_PREFIX + l1.id)
    }
  } else if (root.level === 1) {
    // L1: create it, then L3s directly beneath
    inserts.push(templateToInsert(root, null))
    appendL3Direct(inserts, root, TEMP_PREFIX + root.id)
  } else if (root.level === 2) {
    // L2: standalone badge, no children
    inserts.push(templateToInsert(root, null))
  } else {
    // L3: just create it standalone
    inserts.push(templateToInsert(root, null))
  }

  return inserts
}

function appendL3Direct(inserts: BatchGoalInsert[], l1: GoalTemplate, l1TempId: string): void {
  const l3Children = getChildren(l1.id).filter((c) => c.level === 3)
  for (const l3 of l3Children) {
    inserts.push(templateToInsert(l3, l1TempId))
  }
}

function templateToInsert(tmpl: GoalTemplate, tempParentId: string | null): BatchGoalInsert {
  const base: BatchGoalInsert = {
    _tempId: TEMP_PREFIX + tmpl.id,
    _tempParentId: tempParentId,
    title: tmpl.title,
    category: tmpl.lifeArea,
    life_area: tmpl.lifeArea,
    goal_nature: tmpl.nature,
    display_category: tmpl.displayCategory ?? undefined,
    goal_level: tmpl.level,
    template_id: tmpl.id,
    target_value: 1,
    tracking_type: "counter",
    goal_type: "milestone",
    period: "weekly",
  }

  if (tmpl.templateType === "milestone_ladder" && tmpl.defaultMilestoneConfig) {
    base.target_value = tmpl.defaultMilestoneConfig.target
    base.goal_type = "milestone"
    base.milestone_config = tmpl.defaultMilestoneConfig as unknown as Record<string, unknown>
  } else if (tmpl.templateType === "habit_ramp" && tmpl.defaultRampSteps) {
    base.target_value = tmpl.defaultRampSteps[0].frequencyPerWeek
    base.goal_type = "habit_ramp"
    base.period = "weekly"
    base.ramp_steps = tmpl.defaultRampSteps as unknown as Record<string, unknown>[]
  }

  if (tmpl.linkedMetric) {
    base.linked_metric = tmpl.linkedMetric
  }

  return base
}
