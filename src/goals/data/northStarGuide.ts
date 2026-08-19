/**
 * The guide: what to ask about a goal somebody has already written.
 *
 * The board this replaces assumed the work was CHOOSING, and it is not. A real
 * list of goals looks like this:
 *
 *   No pain in my back, hip or shoulder
 *   Bench 28 kg, 3×6-8
 *   10 pull-ups, up from 7
 *   Publish my book
 *   Internationally bestselling author
 *   Masters in League of Legends
 *
 * Six goals, and a catalogue of 166 curated targets contains approximately none
 * of them. What that person needs is not a bigger catalogue. It is:
 *
 *   "No pain in my back" — that is a state, not something you do. How would you
 *   get there? (stretch, water, walk differently, see a video)
 *   "Bench 28 kg" — where are you now? Is that realistic? What are the rungs?
 *   "Internationally bestselling author" — you do not control that. Is it a goal
 *   or is it the north star, and what DO you control that points at it?
 *
 * So: they write their goals in their own words, and the guide asks one
 * question at a time until each one is real. Every question is skippable and a
 * skip is remembered, because a guide that asks again is nagging.
 */

/** The questions, in the order they are asked. */
export type GuideQuestionId = "control" | "start" | "actions" | "date" | "why" | "cost"

/**
 * The order, and the order is an argument.
 *
 * Where you are comes before what you will do, which comes before when, and the
 * two whys come last, when the goal is real enough to have a reason.
 *
 * CONTROL COMES AFTER ACTIONS, not first. Asked first, the very first thing the
 * guide ever says to somebody is "is this one yours to decide?" about "no pain
 * in my back" — a goal that is obviously theirs, where the useful question is
 * how it becomes something you can do. Asked after, it lands where it is
 * actually earned: you have just tried to name what you would do about
 * "internationally bestselling author" and found there is nothing.
 */
export const GUIDE_QUESTION_ORDER: GuideQuestionId[] = ["start", "actions", "control", "date", "why", "cost"]

export interface GuideQuestion {
  id: GuideQuestionId
  /** The question, asked of this goal by name where it helps. */
  ask: (title: string) => string
  /** One line under it, on why it is being asked. */
  note: string
  /** What the input is. */
  kind: "number" | "actions" | "date" | "text" | "choice"
  placeholder?: string
}

export const GUIDE_QUESTIONS: Record<GuideQuestionId, GuideQuestion> = {
  control: {
    id: "control",
    ask: () => "Is this one yours to decide?",
    note: "Some of the best things on a list are not goals. \"Internationally bestselling author\" is not something you can go and do — other people decide it. That does not mean drop it; it means it belongs above your goals as the thing they point at, with something you DO control underneath it.",
    kind: "choice",
  },
  start: {
    id: "start",
    ask: (title) => `${title} — where are you today?`,
    note: "The number you can hit right now, honestly. It decides whether this is a stretch or a fantasy, and it is what the rungs get spaced between.",
    kind: "number",
    placeholder: "today's number",
  },
  actions: {
    id: "actions",
    ask: () => "What will you actually do about it?",
    note: "This one names where you want to end up and nothing you can do on a Tuesday. Pick from what already runs in this area, or write your own. One is enough to start.",
    kind: "actions",
  },
  date: {
    id: "date",
    ask: () => "By when?",
    note: "Everything arrives dated a year out, which is nobody's real answer. A date you picked is a date you can miss, and one you can miss is one you can hit.",
    kind: "date",
  },
  why: {
    id: "why",
    ask: () => "Why does this one matter to you?",
    note: "The part you re-read in March on a day you do not feel like it. Not the tidy reason — the real one.",
    kind: "text",
    placeholder: "Because…",
  },
  cost: {
    id: "cost",
    ask: () => "And what does it cost you if you never do it?",
    note: "Moving towards something and moving away from something else pull differently, and most people only ever write down the first one.",
    kind: "text",
    placeholder: "If nothing changes, then…",
  },
}

export const GUIDE_COPY = {
  // -- step 1
  areasTitle: "What are you working on this season?",
  areasHelp: "Pick two or three. Not because the rest do not matter — because a season spent on nine areas is a season spent on none, and the others hold where they are while you work on these.",
  areasAdd: "None of these? Add your own",
  areasAddPlaceholder: "e.g. Dating, Business, Morning routine",
  areasPicked: (n: number) => (n === 0 ? "Nothing picked yet" : `${n} picked, in order`),
  areasNext: "Now write the goals →",
  areasTooMany: "That is a lot for one season. It will still work; you will just be thinner across all of them.",

  /**
   * No season picked yet.
   *
   * The area picker moved to its own tab, so this is a pointer rather than the
   * old "go back one step" — and it is a pointer rather than twelve areas
   * appearing here, because the whole reason the tab exists is that twelve at
   * once is what overwhelmed people.
   */
  noSeason: "You have not said what this season is about yet, so there is no area to write goals in.",
  noSeasonGo: "Pick your focus areas →",

  // -- step 2
  writeTitle: (area: string) => `Your goals in ${area}`,
  writeHelp: "In your own words, one per line. Write them the way you would say them out loud — this is not a form, and nothing here has to be phrased properly.",
  writePlaceholder: "Bench 28 kg, 3×6-8\n10 pull-ups, up from 7\nNo pain in my back\nStretch every day",
  writeAdd: "Add these",
  writeAdded: (n: number) => `${n} added`,
  writeNumbers: "Anything with a number in it becomes a climb with rungs automatically. Everything else becomes a finish line, and you can change either.",
  otherWays: "Other ways in — paste a list, start from your 10, describe a day, block out a week",
  writeOr: "Or start from ones other people set:",
  /**
   * A set, read before it is accepted.
   *
   * Clicking a set used to write every goal in it into the plan and show only a
   * count on the way past. Somebody ended up with "No Screens Before Bed" in
   * their goals and said, correctly, that they never chose it. Nothing writes
   * several goals into somebody's plan unnamed.
   */
  setPreview: (label: string) => `“${label}” would add these goals:`,
  setAlready: "already yours",
  setCancel: "not this one",
  setAdd: (n: number) => (n === 1 ? "Add this goal" : `Add these ${n} goals`),
  writeNext: "Now let's make them real →",
  writeSkip: "I have written enough",

  // -- step 3
  queueTitle: "Let's make them real",
  queueHelp: "One question at a time, and only where something is missing. Skip anything you do not want to answer.",
  /**
   * "Been through", not "ready".
   *
   * A goal every question was SKIPPED on has been through the guide and is not
   * ready for anything — no action, no why, no date you chose. Calling that
   * ready is the page telling you your plan is finished while the panel at the
   * bottom of the same screen lists what is missing from it.
   */
  queueProgress: (done: number, total: number) => `${done} of ${total} goals been through`,
  queueAnswered: (done: number, total: number) => `${done}/${total} questions answered or skipped`,
  queueLeft: (n: number) => `${n} ${n === 1 ? "question" : "questions"} left`,
  queueDone: "That is every question asked. What you skipped is still listed under \u201cstill to fill in\u201d at the bottom of this page.",
  /** The payoff. What the answers just built, before you scroll anywhere. */
  builtTitle: "Here is what you just built",
  builtGoals: (n: number) => `${n} ${n === 1 ? "goal" : "goals"}`,
  builtMilestones: (n: number) => `${n} ${n === 1 ? "milestone" : "milestones"} dated between now and then`,
  builtLoad: (h: number, a: number) => `${h} h of routines and ${a} actions in an ordinary week`,
  builtNext: "The next three things to hit",
  builtSeeYear: "See the whole year →",
  builtNothing: "Nothing dated yet — answer a couple of \u201cby when\u201d questions and the year fills in.",
  queueEmpty: "No goals yet. Write a few above and the questions start.",
  skip: "skip",
  save: "Save and next",
  savedRungs: (n: number) => `${n} rungs spaced between here and there.`,
  /**
   * What the numbers imply, said as arithmetic rather than as an opinion.
   *
   * The user asked whether 28 kg is realistic. The page had the start, the
   * target and the date and said nothing, which is the difference between a
   * form and a coach. It still refuses to have a view on kilos — it does not
   * know what the unit is — it just says the rate out loud.
   */
  paceRate: (n: string, unit: string, months: number) =>
    `That is about ${n}${unit ? ` ${unit}` : ""} a month for ${months} ${months === 1 ? "month" : "months"}.`,
  paceSlow: "Which is gentle enough that the date is not really doing any work. Pull it in, or aim higher.",
  paceSteady: "That is a real climb and an ordinary one.",
  paceSteep: "That is a quarter of where you are, every month. It can be done, and it is the kind of number that wants the date checked before the goal is.",
  paceDone: "That is where you already are, so there is nothing to climb. Worth raising the target.",

  // -- the control question
  controlMine: "Yes, it is mine to do",
  controlTheirs: "No, other people decide it",
  controlFollowUp: "Then what do you control that points at it?",
  controlFollowUpNote: "That becomes the goal, and the big one becomes what it is aimed at. You keep both.",
  controlFollowUpPlaceholder: "e.g. Publish one article a week",
  controlKept: (big: string) => `Kept as what you are aiming at, above the goals that feed it: ${big}`,

  // -- the rest of the tab
  browseTitle: "Browse everything on offer",
  browseHelp: "Goal sets, single goals and practices for every area, if you would rather pick than write. Nothing in here is required.",
}

/** How many areas is a season, before the guide says something. */
export const SEASON_AREA_LIMIT = 3
