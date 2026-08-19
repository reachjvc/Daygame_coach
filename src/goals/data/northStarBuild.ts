/**
 * The build board's content: what each area offers, and what a goal drags in
 * behind it.
 *
 * Tab 3 could already add goals — one area at a time, inside a dialog, behind
 * two collapsed fades. What it could not do is show a person the whole spread
 * of what is on offer, and it could not connect the three things that are
 * obviously one thing:
 *
 *   a goal you pick  →  the action you take on a Tuesday  →  the routine that
 *   action actually lives in.
 *
 * Nothing here is new material. The goals come from the framework catalogue
 * (`newGoalFramework.ts`, 23 objectives and ~166 targets) and the practices come
 * from the routine blueprints (`northStar.ts`, eight routines with their own
 * step libraries). This file is the wiring between them, plus the one thing
 * neither of them has: which objectives actually belong to which of the twelve
 * areas.
 */

import { ROUTINE_BLUEPRINT_MAP } from "@/src/goals/data/northStar"

// ---------------------------------------------------------------- what a goal needs

/**
 * A routine a goal cannot really be kept without.
 *
 * "Bench 100 kg" is not a thing you do; it is a thing that happens because a
 * training week runs. Before this, picking the strength template gave you nine
 * goals and left the training week exactly as it shipped, so the plan named an
 * outcome and nothing that produces it. Naming the need lets the board offer the
 * routine at the moment the goal is chosen, which is the only moment the
 * connection is obvious.
 *
 * `presetId` replaces the routine's stack outright (a preset is an order, so it
 * is only offered for a routine that is not in the plan yet). `stepIds` toggles
 * individual steps into whatever is already there, which is what an existing
 * routine gets.
 */
export interface RoutineNeed {
  blueprintId: string
  /** Applied only when the routine is being added fresh. */
  presetId?: string
  /** Steps switched on either way. */
  stepIds: string[]
  /** Split applied when the routine is added fresh and offers one. */
  splitId?: string
  /** One line, in the second person, on why this goal needs it. */
  why: string
}

/**
 * Objective → the routines its goals run on.
 *
 * Keyed by objective rather than by template so a single target picked on its
 * own drags in the same routine its template would. Every objective in the
 * catalogue is listed; the ones whose work is genuinely not routine-shaped
 * (a body-fat number, a net-worth number) point at the routine that moves them
 * rather than at nothing.
 */
export const OBJECTIVE_ROUTINE_NEEDS: Record<string, RoutineNeed[]> = {
  // Health ------------------------------------------------------------------
  obj_strong: [
    { blueprintId: "workout", presetId: "four", stepIds: ["strength", "protein"], splitId: "upper-lower", why: "A 1RM moves because a training week runs. Name the days and the lifting stops being a decision." },
  ],
  obj_muscle: [
    { blueprintId: "workout", presetId: "four", stepIds: ["strength", "protein"], splitId: "ppl", why: "Size comes off sessions and food. Both live in the training week." },
  ],
  obj_body: [
    { blueprintId: "workout", presetId: "four", stepIds: ["strength", "steps", "protein", "weigh"], splitId: "fullbody", why: "Composition moves on the boring things: sessions, steps, protein, one weigh-in." },
  ],
  obj_endurance: [
    { blueprintId: "workout", presetId: "three", stepIds: ["cardio", "steps"], splitId: "fullbody", why: "Cardio capacity is built by cardio sessions that are already in the week." },
  ],
  obj_triathlon: [
    { blueprintId: "workout", presetId: "six", stepIds: ["cardio", "strength", "mobility"], splitId: "custom", why: "Three sports need named days or two of them quietly disappear." },
  ],
  obj_calisthenics: [
    { blueprintId: "workout", presetId: "four", stepIds: ["strength", "mobility"], splitId: "fullbody", why: "Skill work is frequency work. It wants days, not motivation." },
  ],
  obj_mobility: [
    { blueprintId: "workout", stepIds: ["mobility"], why: "Ten minutes, most days, is the whole method." },
    { blueprintId: "night", stepIds: ["stretch"], why: "The easiest place to put stretching is the wind-down you already do." },
  ],
  obj_active: [
    { blueprintId: "workout", presetId: "three", stepIds: ["steps"], splitId: "fullbody", why: "An active life is steps and daily movement, not a gym membership." },
    { blueprintId: "morning", stepIds: ["move", "sun"], why: "Movement early is movement that survives the day." },
  ],
  obj_recovery: [
    { blueprintId: "night", presetId: "60", stepIds: ["screens", "bedtime", "cleanup"], why: "Sleep is won in the ninety minutes before bed, not in bed." },
  ],
  // Relations ---------------------------------------------------------------
  obj_girlfriend: [
    { blueprintId: "social", presetId: "full", stepIds: ["stranger", "date", "plan-social"], why: "Approaches and dates only happen if the week has room for them." },
  ],
  obj_abundance: [
    { blueprintId: "social", presetId: "full", stepIds: ["stranger", "date", "voice-note"], why: "Volume is a weekly habit before it is a result." },
  ],
  obj_inner: [
    { blueprintId: "morning", presetId: "30", stepIds: ["meditate", "journal", "gratitude"], why: "Inner game is a morning practice. It is built when nothing is happening." },
    { blueprintId: "mind", stepIds: ["breath-long"], why: "One long sit a week does what ten rushed ones do not." },
  ],
  // Wealth ------------------------------------------------------------------
  obj_income: [
    { blueprintId: "work", presetId: "standard", stepIds: ["mit", "deep", "weekly-review"], why: "Income follows protected hours. The week has to hold them before the number moves." },
  ],
  obj_business: [
    { blueprintId: "work", presetId: "deep", stepIds: ["mit", "deep", "ship", "money-day"], why: "A business is built in blocks that are defended, and shipped things that are visible." },
  ],
  obj_freedom: [
    { blueprintId: "work", stepIds: ["money-day"], why: "Thirty minutes with your numbers, the same day each week, is the entire habit." },
  ],
  // Meaning -----------------------------------------------------------------
  obj_practice: [
    { blueprintId: "morning", presetId: "30", stepIds: ["meditate", "journal", "read"], why: "A daily practice is a morning routine wearing a different name." },
  ],
  obj_growth: [
    { blueprintId: "mind", presetId: "standard", stepIds: ["reading", "learn"], why: "Learning is a slot in the week or it is an intention." },
  ],
  obj_purpose: [
    { blueprintId: "manifestation", presetId: "30", stepIds: ["read-star", "act-as-if"], why: "Direction fades unless something puts it back in front of you." },
  ],
  // Vices — the routine made of things you stop ------------------------------
  obj_nofap: [
    { blueprintId: "vices", presetId: "hard", stepIds: ["no-porn", "no-phone-bed"], why: "A quit is held day by day. The vices routine is where the days are counted." },
  ],
  obj_sober: [
    { blueprintId: "vices", presetId: "substances", stepIds: ["no-drink-week"], why: "Name the line and the week stops re-litigating it every evening." },
  ],
  obj_drinkless: [
    { blueprintId: "vices", presetId: "substances", stepIds: ["no-drink-week"], why: "Moderation needs a rule with days in it, not a feeling about it." },
  ],
  obj_screen: [
    { blueprintId: "vices", presetId: "screens", stepIds: ["no-scroll-am", "no-social-noon", "no-phone-bed"], why: "Attention comes back by subtraction. These are the three that do most of it." },
  ],
  obj_clean_diet: [
    { blueprintId: "vices", presetId: "substances", stepIds: ["no-junk", "no-smoke"], why: "Food and smoke are held the same way: named, and counted by the day." },
  ],
}

// ---------------------------------------------------------------- Tuesday

/**
 * The action a goal is kept by, per objective.
 *
 * A framework target that names a number — bench 1RM, body fat, monthly income
 * — arrives with a shape, a date and nothing you can do on a Tuesday, which is
 * the commonest way a plan dies quietly. The catalogue already knows what the
 * doing is: every objective has driver targets (Gym Sessions, Deep Work Hours,
 * Approaches) sitting beside its metrics. This is that driver, written as an
 * action.
 *
 * Applied only to goals that would otherwise be flagged as action-less, so a
 * practice goal (which IS its own action) and a finish line with steps in it are
 * both left alone. Sibling goals in one objective end up sharing the same
 * action, which is true — one training week moves all three lifts — and the
 * weekly load counts distinct actions for exactly that reason.
 */
export const OBJECTIVE_ACTION: Record<string, { title: string; daysPerWeek: number }> = {
  obj_strong: { title: "Strength session", daysPerWeek: 4 },
  obj_muscle: { title: "Strength session, eating in a surplus", daysPerWeek: 4 },
  obj_body: { title: "Train, and hit your protein", daysPerWeek: 4 },
  obj_endurance: { title: "Cardio. Run, bike or swim", daysPerWeek: 3 },
  obj_triathlon: { title: "Swim, bike or run session", daysPerWeek: 5 },
  obj_calisthenics: { title: "Calisthenics session", daysPerWeek: 4 },
  obj_mobility: { title: "Ten minutes of mobility", daysPerWeek: 5 },
  obj_active: { title: "Get your steps in", daysPerWeek: 6 },
  obj_recovery: { title: "Screens off, same bedtime", daysPerWeek: 7 },
  obj_girlfriend: { title: "Go out and start conversations", daysPerWeek: 3 },
  obj_abundance: { title: "Go out and start conversations", daysPerWeek: 3 },
  obj_inner: { title: "Sit, then write a page", daysPerWeek: 6 },
  obj_income: { title: "Ninety minutes of deep work", daysPerWeek: 5 },
  obj_business: { title: "Build, then talk to one customer", daysPerWeek: 5 },
  obj_freedom: { title: "Thirty minutes with your numbers", daysPerWeek: 1 },
  obj_practice: { title: "Meditate, then journal", daysPerWeek: 6 },
  obj_growth: { title: "Half an hour on the skill", daysPerWeek: 4 },
  obj_purpose: { title: "Read your north star, then do one thing it asks", daysPerWeek: 7 },
  obj_nofap: { title: "Check in, and log the day", daysPerWeek: 7 },
  obj_sober: { title: "Hold the line, and log the day", daysPerWeek: 7 },
  obj_drinkless: { title: "Hold the line, and log the day", daysPerWeek: 7 },
  obj_screen: { title: "Phone away for the first hour", daysPerWeek: 7 },
  obj_clean_diet: { title: "Cook it yourself", daysPerWeek: 5 },
}

// ---------------------------------------------------------------- per area

/**
 * What one area actually offers, as opposed to what its pillar happens to hold.
 *
 * `AREA_LIBRARY_PILLAR` maps each area to one of five pillars by taking the
 * first entry of its `pillarIds`, and five pillars do not divide into twelve
 * areas. Five areas landed on `meaning` and three on `relations`, so opening
 * Family and opening Relationship offered the same three objectives — Get a
 * Girlfriend, Date Abundantly, Build Inner Game — and Fun, Contribution and
 * Spirituality were each offered Daily Practice, Continuous Growth and Find
 * Your Purpose. One area at a time behind a fade that was survivable. On a
 * board, where every area is on screen at once, it reads as four copies of the
 * same card.
 *
 * So the objectives are assigned to the area they belong to, by hand, and the
 * areas the catalogue genuinely has nothing for get practices instead: real
 * steps out of the routine blueprints that already list that area in their
 * `servesAreaIds`. A practice toggles the step into its routine, adding the
 * routine to the stack if it is not there yet, which is the cascade running in
 * the other direction.
 */
export interface AreaOffer {
  /** Framework objectives that belong to this area. May be empty. */
  objectiveIds: string[]
  /** Routine steps offered as practices, in the order they should be shown. */
  practices: Array<{ blueprintId: string; stepId: string }>
  /** Said above the row when the catalogue has no goals for this area. */
  note?: string
}

export const AREA_OFFERS: Record<string, AreaOffer> = {
  lm_health: {
    objectiveIds: ["obj_recovery", "obj_active", "obj_mobility"],
    practices: [
      { blueprintId: "morning", stepId: "water" },
      { blueprintId: "morning", stepId: "sun" },
      { blueprintId: "night", stepId: "bedtime" },
      { blueprintId: "workout", stepId: "steps" },
    ],
  },
  lm_fitness: {
    objectiveIds: ["obj_strong", "obj_muscle", "obj_body", "obj_endurance", "obj_calisthenics", "obj_triathlon"],
    practices: [
      { blueprintId: "workout", stepId: "strength" },
      { blueprintId: "workout", stepId: "cardio" },
      { blueprintId: "workout", stepId: "mobility" },
      { blueprintId: "workout", stepId: "protein" },
    ],
  },
  lm_mindset: {
    objectiveIds: ["obj_inner", "obj_screen", "obj_nofap", "obj_growth"],
    practices: [
      { blueprintId: "morning", stepId: "journal" },
      { blueprintId: "mind", stepId: "reading" },
      { blueprintId: "vices", stepId: "no-scroll-am" },
      { blueprintId: "night", stepId: "reflect" },
    ],
  },
  lm_emotions: {
    // Not obj_practice, which Spirituality owns. Both areas holding the daily
    // practice meant both were offered the same two sets, which is the
    // duplication this map exists to stop.
    objectiveIds: ["obj_inner"],
    practices: [
      { blueprintId: "morning", stepId: "gratitude" },
      { blueprintId: "morning", stepId: "breath" },
      { blueprintId: "mind", stepId: "nature" },
      { blueprintId: "night", stepId: "good-thing" },
    ],
  },
  lm_relationship: {
    objectiveIds: ["obj_girlfriend", "obj_abundance"],
    practices: [
      { blueprintId: "social", stepId: "date" },
      { blueprintId: "social", stepId: "stranger" },
      { blueprintId: "social", stepId: "voice-note" },
    ],
  },
  lm_mission: {
    objectiveIds: ["obj_business", "obj_income", "obj_purpose"],
    practices: [
      { blueprintId: "work", stepId: "mit" },
      { blueprintId: "work", stepId: "deep" },
      { blueprintId: "work", stepId: "ship" },
      { blueprintId: "work", stepId: "weekly-review" },
    ],
  },
  lm_money: {
    objectiveIds: ["obj_freedom", "obj_income"],
    practices: [
      { blueprintId: "work", stepId: "money-day" },
      { blueprintId: "vices", stepId: "no-spend" },
    ],
  },
  lm_family: {
    // Nothing in the catalogue is about family. Saying so beats offering
    // "Get a Girlfriend" because both happen to sit under the relations pillar.
    objectiveIds: [],
    practices: [
      { blueprintId: "social", stepId: "family-call" },
      { blueprintId: "social", stepId: "host" },
      { blueprintId: "social", stepId: "voice-note" },
    ],
    note: "The goal catalogue has nothing for family. These are the practices that carry it, and a goal you write yourself will beat anything we could have listed.",
  },
  lm_friends: {
    objectiveIds: [],
    practices: [
      { blueprintId: "social", stepId: "reach-out" },
      { blueprintId: "social", stepId: "plan-social" },
      { blueprintId: "social", stepId: "host" },
      { blueprintId: "social", stepId: "compliment" },
    ],
    note: "Friendships compound on small deposits rather than on targets, so this area offers practices and leaves the goals to you.",
  },
  lm_fun: {
    objectiveIds: [],
    practices: [
      { blueprintId: "social", stepId: "host" },
      { blueprintId: "mind", stepId: "nature" },
      { blueprintId: "mind", stepId: "low-screen" },
      { blueprintId: "workout", stepId: "sport" },
    ],
    note: "Fun is the one nobody can write a catalogue for. Put something in the diary; that is the whole method.",
  },
  lm_contribution: {
    objectiveIds: [],
    practices: [
      { blueprintId: "social", stepId: "compliment" },
      { blueprintId: "social", stepId: "reach-out" },
      { blueprintId: "night", stepId: "gratitude-night" },
    ],
    note: "Nothing here is curated, because giving is specific to who you are giving to. Write your own, and these three keep the muscle warm meanwhile.",
  },
  lm_spirituality: {
    objectiveIds: ["obj_practice", "obj_purpose"],
    practices: [
      { blueprintId: "manifestation", stepId: "read-star" },
      { blueprintId: "manifestation", stepId: "gratitude-deep" },
      { blueprintId: "morning", stepId: "meditate" },
      { blueprintId: "mind", stepId: "nature" },
    ],
  },
}

/** A practice offer, resolved against the blueprint that owns it. */
export function practiceLabel(blueprintId: string, stepId: string): { title: string; minutes: number; daysPerWeek: number; routine: string } | null {
  const bp = ROUTINE_BLUEPRINT_MAP.get(blueprintId)
  const step = bp?.library.find((s) => s.id === stepId)
  if (!bp || !step) return null
  return { title: step.title, minutes: step.minutes, daysPerWeek: step.daysPerWeek, routine: bp.label }
}

// ---------------------------------------------------------------- load

/**
 * When the plan stops being ambitious and starts being a plan nobody keeps.
 *
 * A board that makes eighteen goals one click away needs a number that pushes
 * back, or the "spread out for me" feeling turns into the January feeling. Two
 * ceilings because they fail differently: hours are what the week cannot hold,
 * and separate things to remember are what attention cannot hold. Amber rather
 * than a block — this page never gates — and the season focus is the way out.
 *
 * THIRTY HOURS RATHER THAN FIFTEEN, because the shipped stack already costs
 * twenty. The business routine's two ninety-minute blocks, five days a week, are
 * 975 of those minutes, and they are hours you are at work anyway rather than
 * hours the plan is asking you to find. A ceiling under the untouched default
 * would be amber before anybody had chosen anything, which teaches people to
 * ignore it — the one thing a warning must never do.
 */
export const LOAD_CEILING = { minutesPerWeek: 1800, actionsPerWeek: 25 }

export const BOARD_COPY = {
  title: "Pick what you are taking on",
  help: "Everything on offer, all of it optional, all of it editable after. Toggling a goal set brings its routine with it, because a target nobody has a Tuesday for is a wish.",
  goalsLabel: "Goal sets",
  targetsLabel: "One at a time",
  practicesLabel: "Practices",
  practiceHelp: "These go straight into a routine. Turning one on adds the routine to your stack if it is not there yet.",
  needsLabel: "Comes with",
  needsHelp: "The routine this actually runs on. Toggle it off if you already have your own.",
  /**
   * Said when goals are already in an area and what they run on is not there.
   *
   * THERE ARE TWO OF THESE, because there are two states and one of them was
   * being told the other one's sentence: somebody with an evening routine of
   * their own, missing two of the steps these goals want, was told it "is not
   * in your stack yet" — about a routine they built. A page that tells you you
   * do not have the thing you are looking at is not worth reading twice.
   */
  unmetTitle: (routines: string) => `The goals here run on your ${routines}, and it is not in your stack yet.`,
  partialTitle: (routines: string) => `The goals here run on your ${routines}, and it is missing some of the steps they want.`,
  unmetAdd: (label: string) => `Add ${label}`,
  partialAdd: (label: string) => `Add the missing steps to ${label}`,
  /** Undoing a set, in one click, wherever the set is offered. */
  takeBack: (n: number) => `remove the ${n} ${n === 1 ? "goal" : "goals"} it added`,
  takeBackConfirm: (n: number) => `Remove all ${n}?`,
  /** Named in the confirm, because a set puts steps in a routine as well. */
  takeBackAlso: (steps: number, routines: string) =>
    `and the ${steps} ${steps === 1 ? "step" : "steps"} it put in your ${routines}`,
  takeBackAlsoRoutine: (routines: string) => `and your ${routines}, which is only here for it`,
  takeBackYes: "remove them",
  takeBackNo: "keep them",
  /** The box on every area, for the thing the catalogue just reminded you of. */
  ownTitle: "Or write your own, here",
  ownHelp: "The list above is other people's. Anything it made you think of goes straight into this area — one line, same as on the build steps.",
  ownAdd: "Add",
  empty: "Write a 10 for an area on the previous tab and it turns up here.",
  showAll: "Show every area",
  showPictured: "Only the areas I have pictured",
  addedRoutine: (label: string) => `${label} added to your stack`,
  /** A routine that was already there and only gained the steps it was missing. */
  extendedRoutine: (label: string) => `${label} picked up the steps it was missing`,
  loadTitle: "What this costs a week",
  loadOver: "That is more week than most weeks have. Nothing is stopping you, but pick one area as the season's focus and let the rest hold their floor.",
  loadFine: "That fits in a week.",
}

export const CASCADE_COPY = {
  help: "Each one is made of the one before it. Click any part to go to it.",
  starEmpty: "no north star yet",
}

export const TIMELINE_COPY = {
  title: "The year, as things to hit",
  help: "Every milestone on every goal, spread across the months it lands in. This is what the plan feels like from the inside.",
  empty: "Nothing dated yet. Goals arrive with a date a year out, so this fills in as soon as you add one.",
  focusOnly: "Only my focus",
  all: "Everything",
  overflow: (n: number) => `+${n} more`,
  none: "Nothing this month",
}
