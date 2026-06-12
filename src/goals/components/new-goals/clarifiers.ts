/**
 * Tier-2 authored clarifiers for the new-goals question tree.
 *
 * The WHICH (which objectives are offered) and WHEN (only unpicked, in-contention areas) stay
 * data-driven from the matcher's per-objective scores. This file only supplies nicer human COPY
 * on top: a per-area question prompt, and optional per-objective label/subtitle overrides where
 * an authored phrasing reads better than the raw taxonomy label/description. Everything here is
 * static + deterministic ($0 at runtime) — it scales with authoring effort, not model calls.
 *
 * Keys are pillar ids; option keys are objective ids (see newGoalFramework.ts). Anything not
 * overridden falls back to the objective's own label/description, and any pillar without an
 * entry falls back to the generic prompt.
 */

export interface ClarifierOption {
  /** Replaces the objective's label as the choice headline. */
  label?: string
  /** Replaces the objective's description as the choice subtitle. */
  sub?: string
}

export interface AuthoredClarifier {
  /** The question headline shown above the options for this area. */
  prompt: string
  /** Per-objective copy overrides (objective id → option copy). */
  options?: Record<string, ClarifierOption>
}

export const AUTHORED_CLARIFIERS: Record<string, AuthoredClarifier> = {
  health: {
    prompt: "What kind of healthy do you want to feel?",
    options: {
      obj_active: { label: "Just feel good day-to-day", sub: "Move more, more energy — no gym required" },
      obj_recovery: { label: "Fix my sleep & energy", sub: "Rest well, wake up actually refreshed" },
      obj_strong: { label: "Get genuinely strong", sub: "Lift heavy — squat, bench, deadlift" },
      obj_body: { label: "Change how my body looks", sub: "Lean out, drop fat, build a physique" },
    },
  },
  relations: {
    prompt: "When it comes to women — what are you actually after?",
    options: {
      obj_girlfriend: { label: "One real relationship", sub: "Find a partner and settle down" },
      obj_abundance: { label: "An abundant dating life", sub: "Options, lots of dates, no rush" },
      obj_inner: { label: "Confidence first", sub: "Beat the anxiety before chasing anyone" },
    },
  },
  wealth: {
    prompt: "How do you want to build money?",
    options: {
      obj_income: { label: "Earn more from my work", sub: "Skills + a job/freelance → bigger income" },
      obj_business: { label: "Build my own thing", sub: "Idea → first sale → a profitable business" },
      obj_freedom: { label: "Lasting financial security", sub: "Save, invest, get out of debt" },
    },
  },
  meaning: {
    prompt: "What would make life feel like it's yours?",
    options: {
      obj_purpose: { label: "A direction to wake up for", sub: "Clarity, a vision that pulls you forward" },
      obj_practice: { label: "Grounding daily rituals", sub: "Meditation, journaling, inner calm" },
      obj_growth: { label: "Always be growing", sub: "Learn, build skills, level yourself up" },
    },
  },
  vices: {
    prompt: "What do you most want to cut out?",
  },
}

const GENERIC_PROMPT = (areaLabel: string) => `Which part of ${areaLabel} matters most right now?`

/** The question headline for an area — authored if available, else a generic fallback. */
export function clarifierPrompt(pillarId: string, areaLabel: string): string {
  return AUTHORED_CLARIFIERS[pillarId]?.prompt ?? GENERIC_PROMPT(areaLabel)
}

/** Authored copy override for one objective option, or undefined to use the objective's own. */
export function clarifierOption(pillarId: string, objectiveId: string): ClarifierOption | undefined {
  return AUTHORED_CLARIFIERS[pillarId]?.options?.[objectiveId]
}
