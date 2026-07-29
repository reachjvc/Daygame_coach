/**
 * Routine library for the vision-plan lab (M10) — the most common high-leverage
 * habits, grouped by activity category, that a user's vision text often DOESN'T
 * mention (meditation, nightly cleanup, one important work task, …). Shown as
 * clickable options under the drafted goals; each pick folds into one goal per
 * category, owned by the category's primary life area.
 */

import type { RoutineCategory, VisionRitualItem, VisionWeeklyRitual } from "../types"

/**
 * Morning-ritual step library (PLM layer) — ordered checklist steps with rough
 * durations. Distinct from ROUTINE_CATEGORIES: these are steps of ONE daily
 * ritual sequence, never goal habits, and never enter the balancer.
 */
export const RITUAL_LIBRARY: VisionRitualItem[] = [
  { id: "rit-water", title: "Big glass of water", minutes: 1 },
  { id: "rit-bed", title: "Make your bed", minutes: 2 },
  { id: "rit-vision", title: "Read your vision out loud", minutes: 2 },
  { id: "rit-questions", title: "Ask your 8 empowering questions", minutes: 5 },
  { id: "rit-incantations", title: "Speak your incantations — out loud, full body", minutes: 5 },
  { id: "rit-gratitude", title: "Write three gratitudes", minutes: 3 },
  { id: "rit-breath", title: "Breathwork / priming", minutes: 5 },
  { id: "rit-meditate", title: "Meditate", minutes: 10 },
  { id: "rit-move", title: "Move — stretch, walk or quick workout", minutes: 10 },
  { id: "rit-read", title: "Read 10 pages", minutes: 15 },
  { id: "rit-journal", title: "Journal", minutes: 5 },
  { id: "rit-plan", title: "Plan your day — pick 3-5 must items", minutes: 5 },
  { id: "rit-cold", title: "Cold shower finish", minutes: 3 },
  { id: "rit-sunlight", title: "Daylight on your face", minutes: 10 },
]

/** v10 — mind/body/spirit dimension per library step (his coverage rule: a
 * morning ritual touches all three at minimum). Custom steps are unclassified
 * and don't count toward coverage. */
export const RITUAL_DIMENSIONS: Record<string, "mind" | "body" | "spirit"> = {
  "rit-water": "body",
  "rit-bed": "body",
  "rit-vision": "spirit",
  "rit-questions": "mind",
  "rit-incantations": "spirit",
  "rit-gratitude": "spirit",
  "rit-breath": "body",
  "rit-meditate": "spirit",
  "rit-move": "body",
  "rit-read": "mind",
  "rit-journal": "mind",
  "rit-plan": "mind",
  "rit-cold": "body",
  "rit-sunlight": "body",
}

/** v10 — the weekly ritual matrix library: per-area cadence rituals beyond the
 * morning (his examples: Money Tuesday, biweekly relationship journal,
 * magic-moment jar). Weekday 0=Mon … 6=Sun. */
export const WEEKLY_RITUAL_LIBRARY: VisionWeeklyRitual[] = [
  { id: "writ-money", title: "Money Tuesday — 30 min with your numbers", areaId: "lm_money", weekday: 1 },
  { id: "writ-relationship", title: "Relationship journal — six needs rated 0-10, one appreciation, love-language check (bi-weekly)", areaId: "lm_relationship", weekday: 3, everyOtherWeek: true },
  { id: "writ-family", title: "Call home — no agenda, just presence", areaId: "lm_family", weekday: 6 },
  { id: "writ-adventure", title: "Plan one small adventure for the weekend", areaId: "lm_fun", weekday: 3 },
  { id: "writ-friends", title: "Reach out to one friend you haven't heard from", areaId: "lm_friends", weekday: 4 },
  // Monthly slots (his documented monthly cadences; quarterly/yearly still tracked as a gap)
  { id: "writ-pl", title: "Monthly money review — go through the month's profit & loss", areaId: "lm_money", weekday: 0, monthlyDay: 1 },
  { id: "writ-romance", title: "Plan one romantic experience this month — create magical moments", areaId: "lm_relationship", weekday: 0, monthlyDay: 3 },
  { id: "writ-jar-open", title: "Open the magic-moment jar — pull a few notes, reminisce", areaId: null, weekday: 0, monthlyDay: 28 },
]

/** Preset compositions summing to ~15/30/60 minutes — ORDER IS THE RITUAL. */
export const RITUAL_PRESETS: Record<15 | 30 | 60, string[]> = {
  15: ["rit-water", "rit-bed", "rit-vision", "rit-gratitude", "rit-breath", "rit-plan"],
  30: ["rit-water", "rit-bed", "rit-vision", "rit-gratitude", "rit-meditate", "rit-journal", "rit-plan"],
  60: ["rit-water", "rit-bed", "rit-vision", "rit-gratitude", "rit-meditate", "rit-move", "rit-read", "rit-journal", "rit-plan"],
}

export const ROUTINE_CATEGORIES: RoutineCategory[] = [
  {
    id: "morning",
    label: "Morning routine",
    pillarIds: ["meaning", "health"],
    why: "How you start the day decides how the day goes — a small morning stack you can win every day.",
    items: [
      { id: "meditate", title: "Meditate 10 minutes", daysPerWeek: 5 },
      { id: "sunlight", title: "Morning walk in daylight", daysPerWeek: 5 },
      { id: "make-bed", title: "Make your bed", daysPerWeek: 7 },
      { id: "journal", title: "Journal three lines", daysPerWeek: 5 },
      { id: "no-phone", title: "No phone for the first 30 minutes", daysPerWeek: 7 },
      { id: "cold-shower", title: "Cold shower finish", daysPerWeek: 4 },
      { id: "hydrate", title: "Big glass of water on waking", daysPerWeek: 7 },
      { id: "affirm-plan", title: "Read your WHYs + today's plan", daysPerWeek: 5 },
    ],
  },
  {
    id: "night",
    label: "Night routine",
    pillarIds: ["health", "vices"],
    why: "Good days are set up the night before — wind down, reset your space, protect your sleep.",
    items: [
      { id: "cleanup", title: "Nightly 10-minute cleanup", daysPerWeek: 5 },
      { id: "screens-off", title: "Screens off 1 hour before bed", daysPerWeek: 5 },
      { id: "bedtime", title: "Consistent bedtime", daysPerWeek: 6 },
      { id: "plan-tomorrow", title: "Write down tomorrow's top task", daysPerWeek: 5 },
      { id: "read", title: "Read 10 pages in bed", daysPerWeek: 4 },
      { id: "lay-out", title: "Lay out clothes / gym bag for tomorrow", daysPerWeek: 5 },
      { id: "stretch-bed", title: "5-minute wind-down stretch", daysPerWeek: 4 },
      { id: "gratitude-night", title: "One good thing about today", daysPerWeek: 7 },
    ],
  },
  {
    id: "work",
    label: "Work routine",
    pillarIds: ["wealth"],
    why: "Compounding output comes from a few protected work habits, not from more hours.",
    items: [
      { id: "mit", title: "One most-important task, done first", daysPerWeek: 5 },
      { id: "deep-work", title: "90-minute deep work block", daysPerWeek: 5 },
      { id: "shutdown", title: "Daily shutdown — clear inbox, plan tomorrow", daysPerWeek: 5 },
      { id: "weekly-review", title: "Weekly review", daysPerWeek: 1 },
      { id: "money-tuesday", title: "Money Tuesday — 30 min with your numbers", daysPerWeek: 1 },
      { id: "no-social-morning", title: "No social media before noon", daysPerWeek: 5 },
      { id: "inbox-zero", title: "Inbox to zero once a day", daysPerWeek: 5 },
      { id: "learn-craft", title: "30 minutes sharpening your craft", daysPerWeek: 3 },
      { id: "ship-something", title: "Ship one visible thing", daysPerWeek: 2 },
    ],
  },
  {
    id: "workout",
    label: "Workouts",
    pillarIds: ["health"],
    why: "A body you're proud of is built from sessions you don't skip.",
    items: [
      { id: "strength", title: "Strength session", daysPerWeek: 3 },
      { id: "cardio", title: "Cardio — run, bike or swim", daysPerWeek: 2 },
      { id: "steps", title: "10k steps", daysPerWeek: 5 },
      { id: "mobility", title: "10-minute stretch / mobility", daysPerWeek: 4 },
      { id: "protein", title: "Hit your protein target", daysPerWeek: 5 },
      { id: "calisthenics", title: "Calisthenics session", daysPerWeek: 3 },
      { id: "sport", title: "Play a sport (climb, spar, ball)", daysPerWeek: 1 },
      { id: "track-weight", title: "Morning weigh-in", daysPerWeek: 7 },
    ],
  },
  {
    id: "social",
    label: "Social & connection",
    pillarIds: ["relations"],
    why: "Relationships compound like money — small consistent deposits.",
    items: [
      { id: "reach-out", title: "Reach out to one friend", daysPerWeek: 3 },
      { id: "conversation", title: "Start one conversation with a stranger", daysPerWeek: 3 },
      { id: "family-call", title: "Call family", daysPerWeek: 1 },
      { id: "plan-social", title: "Plan one social thing this week", daysPerWeek: 1 },
      { id: "date-night", title: "Go on (or plan) a date", daysPerWeek: 1 },
      { id: "compliment", title: "Give one genuine compliment", daysPerWeek: 5 },
      { id: "host", title: "Invite someone over / out", daysPerWeek: 1 },
      { id: "voice-note", title: "Send a voice note instead of a text", daysPerWeek: 3 },
    ],
  },
  {
    id: "mind",
    label: "Mind & growth",
    pillarIds: ["meaning"],
    why: "A calm, growing mind is the base layer under every other goal.",
    items: [
      { id: "gratitude", title: "Write three gratitudes", daysPerWeek: 5 },
      { id: "learn", title: "30 minutes learning a skill", daysPerWeek: 3 },
      { id: "reflect", title: "Weekly reflection", daysPerWeek: 1 },
      { id: "reading", title: "Read non-fiction 20 minutes", daysPerWeek: 4 },
      { id: "low-screen", title: "One low-screen evening", daysPerWeek: 2 },
      { id: "breathwork", title: "5 minutes of breathwork", daysPerWeek: 4 },
      { id: "nature", title: "Time in nature, no headphones", daysPerWeek: 2 },
      { id: "write", title: "Write 200 words (anything)", daysPerWeek: 3 },
    ],
  },
]
