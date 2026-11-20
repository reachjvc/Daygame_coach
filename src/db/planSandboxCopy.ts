/**
 * COPY SPACE: copy the owner's plan in, or empty it.
 *
 * The owner's rows are read with the OWNER's own client and the copy is written
 * with the HIDDEN account's client (`resolvePlanTarget`), so row security keeps
 * each side to its own rows. Nothing here can write the owner's plan: the only
 * client that writes is the one `target` resolved to, and `copyIntoSandbox`
 * refuses to run unless that is the hidden account.
 *
 * The role-model council (picks, the week's value and settings, the week's
 * marks) copies the same way. Its rows hold no ids of their own (the key is the
 * account plus the person or day), so nothing is remapped, and the council's
 * reminder is copied OFF. Quit-a-vice records need no copy of their own: they are
 * goals and obstacles inside the plan rows.
 */

import { randomUUID } from "node:crypto"
import { applyLifePlanChanges, deleteLifePlan, ensureLifePlan, readLifePlan } from "./lifePlanRepo"
import { insertDayRows, readDayRows } from "./lifePlanDayRepo"
import { deleteReminder, readReminder, writeReminder } from "./lifePlanRemindersRepo"
import { deleteCouncilRows, insertCouncilRows, readCouncilRows } from "./roleModelsRepo"
import type { ResolvedPlanTarget } from "./planSandbox"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { idMapper, keepCopySpaceAnswers, remapDayRows, remapPlanRows } from "@/src/goals/planSandboxCopy"

/** The copy space only: a "self" target here would write the real account. */
function mustBeSandbox(target: ResolvedPlanTarget): void {
  if (target.target !== "sandbox" || target.userId === target.ownerId) {
    throw new Error("The copy space can only be changed through the copy space")
  }
}

/** Empty the copy space: its plan, every day, its reminder, its council. The next visit is a brand-new account's. */
export async function resetSandbox(sandbox: ResolvedPlanTarget): Promise<void> {
  mustBeSandbox(sandbox)
  await deleteLifePlan(sandbox.userId, sandbox.supabase)
  await deleteReminder(sandbox.userId, sandbox.supabase)
  await deleteCouncilRows(sandbox.userId, sandbox.supabase)
}

/**
 * Replace the copy space's contents with a fresh copy of the owner's plan and
 * days. `owner` is the owner's own session (reads only).
 *
 * Reminders are copied switched OFF: the copy must never ping a phone (D7).
 * Returns false when the owner has no plan yet, so the copy is empty.
 */
export async function copyIntoSandbox(
  owner: { userId: string; supabase: ResolvedPlanTarget["supabase"] },
  sandbox: ResolvedPlanTarget,
  newId: () => string = randomUUID,
): Promise<boolean> {
  mustBeSandbox(sandbox)
  if (owner.userId !== sandbox.ownerId) throw new Error("The owner is not this copy space's owner")

  const stored = await readLifePlan(owner.userId, owner.supabase)
  const days = stored ? await readDayRows(owner.userId, stored.rows.plan_id, owner.supabase) : null
  const reminder = await readReminder(owner.userId, owner.supabase)
  const council = await readCouncilRows(owner.userId, owner.supabase)

  // The copy space's own settings (the version being tried and the like) survive a fresh copy of the real plan.
  const before = await readLifePlan(sandbox.userId, sandbox.supabase).catch(() => null)
  await resetSandbox(sandbox)
  await insertCouncilRows(sandbox.userId, council, sandbox.supabase)
  if (!stored || !days) return false

  const made = await ensureLifePlan(sandbox.userId, sandbox.supabase)
  const mapId = idMapper(newId)
  const copiedRows = remapPlanRows(stored.rows, mapId, sandbox.userId, made.id)
  const plan = before ? { ...copiedRows, answers: keepCopySpaceAnswers(copiedRows.answers, before.rows.answers, { userId: sandbox.userId, planId: made.id }, newId) } : copiedRows
  const changes = diffPlanRows(null, plan)
  await applyLifePlanChanges(changes, made.revision, sandbox.userId, sandbox.supabase)
  await insertDayRows(remapDayRows(days, stored.rows.plan_id, mapId, sandbox.userId, made.id), sandbox.supabase)
  await writeReminder(sandbox.userId, { pushOn: false, reviewDay: reminder.reviewDay, reviewHour: reminder.reviewHour }, sandbox.supabase)
  return true
}
