/**
 * "FROM YOUR EARLIER PLAN": his own old text that no new screen asks for.
 *
 * Read only, never written back and never deleted. Only text a person typed:
 * what the old app wrote for them (a sentence built from the goal's own title
 * and date) is rebuilt by the app's own function and left out when it matches.
 * Picks and scores are stored but not shown.
 */

import { suggestSentence } from "@/src/goals/lifeMasteryService"
import { ONE_ANSWERS } from "@/src/goals/data/northStarStart"
import type { NsGoal, NsPlan } from "@/src/goals/types"

export interface EarlierNote {
  /** The key of the topic label in the module's `earlier_notes` words. */
  topic: string
  text: string
}

/** True when a goal's stored sentence is the one the old app generated from its title (with or without a date). */
export function isGeneratedSentence(goal: Pick<NsGoal, "title" | "targetDate" | "sentence">): boolean {
  const s = goal.sentence.trim()
  if (!s) return false
  if (s === suggestSentence({ title: goal.title, targetDate: goal.targetDate }).trim()) return true
  const base = suggestSentence({ title: goal.title, targetDate: null }).trim()
  if (!base) return false
  const stem = base.endsWith(".") ? base.slice(0, -1) : base
  return s === base || (s.startsWith(`${stem} by `) && s.endsWith("."))
}

const clean = (t: string | undefined | null) => (t ?? "").trim()

export function directionNotes(plan: NsPlan): EarlierNote[] {
  const out: EarlierNote[] = []
  for (const v of Object.values(plan.rungs)) if (clean(v)) out.push({ topic: "rung_answers", text: clean(v) })
  const a = plan.answers
  if (clean(a.identity_total)) out.push({ topic: "identity", text: clean(a.identity_total) })
  if (clean(a.become)) out.push({ topic: "become", text: clean(a.become) })
  if (clean(a.conduct)) out.push({ topic: "conduct", text: clean(a.conduct) })
  return out
}

export function seasonNotes(plan: NsPlan): EarlierNote[] {
  const a = plan.answers
  const out: EarlierNote[] = []
  if (clean(a[ONE_ANSWERS.areas])) out.push({ topic: "areas_note", text: clean(a[ONE_ANSWERS.areas]) })
  if (clean(a[ONE_ANSWERS.values])) out.push({ topic: "values_note", text: clean(a[ONE_ANSWERS.values]) })
  if (clean(a[ONE_ANSWERS.cost])) out.push({ topic: "cost", text: clean(a[ONE_ANSWERS.cost]) })
  if (clean(a[ONE_ANSWERS.identity])) out.push({ topic: "identity", text: clean(a[ONE_ANSWERS.identity]) })
  return out
}

export function goalNotes(goal: NsGoal): EarlierNote[] {
  const out: EarlierNote[] = []
  if (clean(goal.painWhy)) out.push({ topic: "reasons", text: clean(goal.painWhy) })
  if (clean(goal.feeling)) out.push({ topic: "reasons", text: clean(goal.feeling) })
  if (clean(goal.sentence) && !isGeneratedSentence(goal)) out.push({ topic: "wording", text: clean(goal.sentence) })
  if (clean(goal.stake)) out.push({ topic: "other", text: clean(goal.stake) })
  for (const b of goal.beliefs) {
    const t = [b.old, b.evidence, b.replacement].map(clean).filter(Boolean).join(" · ")
    if (t) out.push({ topic: "other", text: t })
  }
  return out
}
