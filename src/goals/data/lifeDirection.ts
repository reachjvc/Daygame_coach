/**
 * Content for the Life Direction Intensive: a six-session process that runs
 * from a cold start to a reality-tested plan.
 *
 * Everything user-facing here is written in our own voice. The research that
 * informed the shape of each exercise lives in docs/research/, and stays
 * there: no source is named in copy the user reads.
 *
 * Nothing in this file is an answer. Prompts, scales and labels only — every
 * field the user is asked to fill starts empty and stays empty until they
 * write it themselves.
 */

// ------------------------------------------------------------------ areas

export type LdiDomainId = "health" | "relationships" | "work"

export interface LdiDomainDef {
  id: LdiDomainId
  label: string
}

export const LDI_DOMAINS: readonly LdiDomainDef[] = [
  { id: "health", label: "Health" },
  { id: "relationships", label: "Relationships" },
  { id: "work", label: "Work" },
] as const

export interface LdiAreaDef {
  id: string
  label: string
  sublabel: string
  /** Null for the area that sits outside the wheel and is never scored against a domain. */
  domain: LdiDomainId | null
}

/**
 * Nine areas in three domains, plus one that sits outside the wheel. The
 * tenth is deliberately unranked: it is a check on the other nine rather
 * than a competitor to them.
 */
export const LDI_AREAS: readonly LdiAreaDef[] = [
  { id: "body", label: "Body", sublabel: "Strength, sleep, energy, how you physically feel.", domain: "health" },
  { id: "mind", label: "Mind", sublabel: "Attention, learning, mental steadiness.", domain: "health" },
  { id: "soul", label: "Soul", sublabel: "Meaning, stillness, whatever you answer to.", domain: "health" },
  { id: "romance", label: "Romance", sublabel: "Your partner, or the search for one.", domain: "relationships" },
  { id: "family", label: "Family", sublabel: "The people you did not choose.", domain: "relationships" },
  { id: "friends", label: "Friends", sublabel: "The people you did.", domain: "relationships" },
  { id: "mission", label: "Mission", sublabel: "The work itself, and whether it is worth doing.", domain: "work" },
  { id: "money", label: "Money", sublabel: "What comes in, what it buys you, what it costs.", domain: "work" },
  { id: "growth", label: "Growth", sublabel: "Getting better at the thing you do.", domain: "work" },
  { id: "joy", label: "Joy", sublabel: "Off the wheel on purpose. If this is empty, the other nine are wrong.", domain: null },
] as const

export const LDI_AREA_MAP: Readonly<Record<string, LdiAreaDef>> =
  Object.fromEntries(LDI_AREAS.map((a) => [a.id, a]))

/** The nine that get scored and ranked. Joy is asked about, never ranked. */
export const LDI_WHEEL_AREAS: readonly LdiAreaDef[] = LDI_AREAS.filter((a) => a.domain !== null)

export function areasInDomain(domain: LdiDomainId): LdiAreaDef[] {
  return LDI_AREAS.filter((a) => a.domain === domain)
}

/**
 * The wheel is rated on alignment, not satisfaction. The distinction is the
 * whole point of the exercise, so it ships as the question itself.
 */
export const LDI_WHEEL_QUESTION =
  "How well do your actions right now match where you want this part of your life to go?"

export const LDI_WHEEL_SCALE_MIN = 0
export const LDI_WHEEL_SCALE_MAX = 10

// ------------------------------------------------------------------ sessions

export type LdiSessionId =
  | "baseline"
  | "reflect"
  | "direction"
  | "converge"
  | "goals"
  | "install"

export interface LdiSessionDef {
  id: LdiSessionId
  index: number
  title: string
  /** One line the user reads before starting. */
  blurb: string
  /** Rough length, printed so nobody starts a two-hour session on a coffee break. */
  minutes: number
  steps: readonly string[]
}

export const LDI_SESSIONS: readonly LdiSessionDef[] = [
  {
    id: "baseline",
    index: 0,
    title: "Baseline",
    blurb: "Where you actually are, before you decide where you are going.",
    minutes: 45,
    // The assessment is split one dimension per screen. Twenty statements on
    // a single page is the fastest way to lose somebody on their first screen.
    steps: [
      "intro",
      "intake-vision",
      "intake-prioritisation",
      "intake-systems",
      "intake-presence",
      "wheel",
      "energy",
      "constraints",
    ],
  },
  {
    id: "reflect",
    index: 1,
    title: "Reflect",
    blurb: "Walk back through the year before you try to plan the next one.",
    minutes: 75,
    steps: ["intro", "prompts", "focus"],
  },
  {
    id: "direction",
    index: 2,
    title: "Direction",
    blurb: "The long session. What you want, tested from several angles.",
    minutes: 150,
    // One future per screen, then a screen that does nothing but compare them.
    // Writing three lives and scoring them on the same page invites scoring
    // the third against a memory of the first.
    steps: [
      "intro",
      "northstar",
      "legacy",
      "eulogy",
      "odyssey-current",
      "odyssey-alternative",
      "odyssey-unconstrained",
      "odyssey-compare",
      "values",
      "fear",
    ],
  },
  {
    id: "converge",
    index: 3,
    title: "Converge",
    blurb: "Everything you wrote, narrowed to what you will actually carry.",
    minutes: 105,
    // Choose what you are carrying BEFORE writing what you want to celebrate.
    // The other order produces celebrations for areas that never get a goal.
    steps: ["intro", "dreams", "horizons", "portfolio", "celebrate", "budget"],
  },
  {
    id: "goals",
    index: 4,
    title: "Goal formation",
    blurb: "Turn each one into something specific enough to fail at.",
    minutes: 120,
    steps: ["intro", "build", "review"],
  },
  {
    id: "install",
    index: 5,
    title: "Install",
    blurb: "Put it in a week, and cut whatever does not fit.",
    minutes: 90,
    steps: ["intro", "idealweek", "fit", "cadence", "accountability", "prototype"],
  },
] as const

export const LDI_SESSION_MAP: Readonly<Record<LdiSessionId, LdiSessionDef>> =
  Object.fromEntries(LDI_SESSIONS.map((s) => [s.id, s])) as Record<LdiSessionId, LdiSessionDef>

export const LDI_TOTAL_MINUTES = LDI_SESSIONS.reduce((n, s) => n + s.minutes, 0)

// ------------------------------------------------------------------ session 0

export type LdiIntakeDimension = "vision" | "prioritisation" | "systems" | "presence"

export interface LdiIntakeItem {
  id: string
  dimension: LdiIntakeDimension
  text: string
}

export const LDI_INTAKE_DIMENSIONS: Readonly<Record<LdiIntakeDimension, string>> = {
  vision: "Vision",
  prioritisation: "Prioritisation",
  systems: "Systems",
  presence: "Presence",
}

/** Answered on a five-point frequency scale. Higher is stronger. */
export const LDI_INTAKE_SCALE: readonly string[] = [
  "Never",
  "Rarely",
  "Sometimes",
  "Often",
  "Almost always",
] as const

export const LDI_INTAKE_MAX = LDI_INTAKE_SCALE.length - 1

export const LDI_INTAKE_ITEMS: readonly LdiIntakeItem[] = [
  { id: "v1", dimension: "vision", text: "I could describe what I want my life to look like in five years." },
  { id: "v2", dimension: "vision", text: "The way I spend a normal week matches what I say matters to me." },
  { id: "v3", dimension: "vision", text: "I know which parts of my life I am currently neglecting." },
  { id: "v4", dimension: "vision", text: "When a big opportunity appears, I can tell quickly whether it fits." },
  { id: "v5", dimension: "vision", text: "I have written any of this down in the last year." },
  { id: "p1", dimension: "prioritisation", text: "I can name the single most important thing I am working on." },
  { id: "p2", dimension: "prioritisation", text: "I say no to things that do not fit, even when they are good." },
  { id: "p3", dimension: "prioritisation", text: "I finish what I start before adding something new." },
  { id: "p4", dimension: "prioritisation", text: "My week has fewer than five active priorities in it." },
  { id: "p5", dimension: "prioritisation", text: "When everything is urgent, I still know what to drop." },
  { id: "s1", dimension: "systems", text: "The things that matter recur automatically rather than needing a decision." },
  { id: "s2", dimension: "systems", text: "I review my own progress on a fixed schedule." },
  { id: "s3", dimension: "systems", text: "What I intend to do is written somewhere other than my head." },
  { id: "s4", dimension: "systems", text: "When I fall off something, I have a way back that I actually use." },
  { id: "s5", dimension: "systems", text: "Someone other than me knows what I am trying to do." },
  { id: "r1", dimension: "presence", text: "I finish most days without a background sense of being behind." },
  { id: "r2", dimension: "presence", text: "I can stop working and be fully somewhere else." },
  { id: "r3", dimension: "presence", text: "I get enough rest to think clearly." },
  { id: "r4", dimension: "presence", text: "I enjoy the process of what I am working on, not only the result." },
  { id: "r5", dimension: "presence", text: "I am not waiting for some future point at which life starts." },
] as const

/** Energy audit: how a recurring commitment leaves you. */
export type LdiEnergyMark = "drains-hard" | "drains" | "gives" | "gives-hard"

export const LDI_ENERGY_MARKS: readonly { id: LdiEnergyMark; label: string; weight: number }[] = [
  { id: "drains-hard", label: "Takes a lot", weight: -2 },
  { id: "drains", label: "Takes a little", weight: -1 },
  { id: "gives", label: "Gives a little", weight: 1 },
  { id: "gives-hard", label: "Gives a lot", weight: 2 },
] as const

export const LDI_ENERGY_PROMPT =
  "Go through the last two weeks of your calendar and list what actually took up your time. Mark each one."

/**
 * The constraints layer. Declared once, then enforced everywhere downstream:
 * this is what makes the plan refuse an impossible week later on.
 */
export const LDI_CONSTRAINT_PROMPTS = {
  weeklyHours: "Realistically, how many hours a week can you give to deliberate work on your life outside your existing obligations?",
  money: "What can you spend on this over the next year, if anything?",
  dependants: "Who depends on you, and what does that fix in place?",
  health: "Is there anything about your health or energy that limits what you can commit to?",
  nonNegotiables: "What are you not willing to trade, whatever the goal?",
} as const

// ------------------------------------------------------------------ session 1

export interface LdiPrompt {
  id: string
  title: string
  body: string
  /** Suggested minutes, shown as a hint, never enforced. */
  minutes: number
}

export const LDI_REFLECT_PROMPTS: readonly LdiPrompt[] = [
  { id: "events", title: "Key events", body: "Walk your calendar month by month and write down what actually happened. Do this first, because everything after it depends on remembering accurately.", minutes: 15 },
  { id: "milestones", title: "Major milestones", body: "Pick out three to five things you genuinely completed or changed.", minutes: 8 },
  { id: "gratitude", title: "Gratitude", body: "What are you most grateful for from the last year? People, chances, things that went right.", minutes: 6 },
  { id: "challenges", title: "Challenges overcome", body: "What was hard, and what did you do about it?", minutes: 8 },
  { id: "unfulfilled", title: "Unfulfilled aspirations", body: "What did you say you would do and not do? Write it plainly, without the excuse attached.", minutes: 8 },
  { id: "relationships", title: "Relationships and connections", body: "Which relationships grew, which faded, and which did you neglect?", minutes: 8 },
  { id: "growth", title: "Growth", body: "What are you measurably better at than you were a year ago?", minutes: 6 },
  { id: "forward", title: "Looking forward", body: "Having written all of that, what is the first thing you want to be different?", minutes: 6 },
] as const

export const LDI_FOCUS_INSTRUCTION =
  "Pick one area from each domain to work on. Not necessarily the lowest score. The lowest one you actually care about."

// ------------------------------------------------------------------ session 2

export const LDI_NORTH_STAR_PROMPTS: readonly LdiPrompt[] = [
  { id: "ideal-tuesday", title: "An ideal ordinary Tuesday", body: "Not a holiday, not a highlight. Describe an ordinary Tuesday in a life you would be glad to have, hour by hour.", minutes: 20 },
  { id: "fearless", title: "If you could not fail", body: "What would you go after if success were guaranteed?", minutes: 10 },
  { id: "failproof", title: "If you knew you would fail", body: "What would you still want to spend your life on, even knowing it would not work out? This one tends to be the more honest answer.", minutes: 12 },
  { id: "ted", title: "The talk you give in twenty years", body: "You are on stage in twenty years. What is the talk about, and what did you have to do to be the one giving it?", minutes: 12 },
  { id: "obituary", title: "Your obituary", body: "Write the short version of your own obituary as you would want it to read.", minutes: 20 },
] as const

export const LDI_LEGACY_PROMPTS: readonly LdiPrompt[] = [
  { id: "gravestone", title: "Three things", body: "You get three words or short phrases on your gravestone. What are they?", minutes: 10 },
  { id: "speakers", title: "Four speakers", body: "Four people speak at your funeral: someone from your family, a friend, someone you worked with, and one person whose life your work changed. What does each one say? Then ask yourself how far you are currently living in a way that would earn it.", minutes: 25 },
  { id: "wikipedia", title: "The achievements section", body: "If you had a page about you, what is in the achievements section? Notice whether it looks anything like the funeral answers.", minutes: 10 },
] as const

/**
 * Sentence stems for the eulogy work. Stems rather than a blank box, because
 * the blank box is where people write nothing.
 */
export const LDI_EULOGY_STEMS: readonly string[] = [
  "The thing everyone knew about them was",
  "They spent their life",
  "They were at their best when",
  "What they gave the people around them was",
  "They never",
  "They were braver than people realised about",
  "The work they were proudest of was",
  "If you needed someone to",
  "They changed after",
  "What they would want you to do now is",
] as const

export type LdiOdysseyKind = "current" | "alternative" | "unconstrained"

export const LDI_ODYSSEY_KINDS: readonly { id: LdiOdysseyKind; title: string; body: string }[] = [
  { id: "current", title: "The path you are on", body: "Five years of your current trajectory, followed honestly to its end. Not the worst case, the likely one." },
  { id: "alternative", title: "The other path", body: "Five years of what you would do if the current path vanished tomorrow and could not be resumed." },
  { id: "unconstrained", title: "The one you do not admit to", body: "Five years assuming money is handled, nobody is disappointed in you, and no one finds out what you chose." },
] as const

/**
 * The scoring dashboard. Writing three futures and not comparing them is
 * where this exercise usually stops being useful, so the comparison ships
 * as a required part of it.
 */
export const LDI_ODYSSEY_SCORES: readonly { id: string; label: string; question: string }[] = [
  { id: "resources", label: "Resources", question: "Do you have the time, money, skill and contacts to actually do this?" },
  { id: "likability", label: "Likability", question: "How much do you like this life, as opposed to approving of it?" },
  { id: "confidence", label: "Confidence", question: "How confident are you that you could pull it off?" },
  { id: "coherence", label: "Coherence", question: "Does this hang together with who you think you are?" },
] as const

export const LDI_ODYSSEY_SCORE_MAX = 5

export const LDI_ODYSSEY_TEST =
  "For each one, ask the question that matters more than the plan itself: does the process of getting there appeal to you, or only the arrival?"

export const LDI_FEAR_PROMPTS = {
  option: "Which of the three futures scares you most while still being one you want?",
  worst: "Write out the worst realistic outcome of trying it. All of it, in detail.",
  prevent: "For each part of that, what could you do to make it less likely?",
  repair: "If it happened anyway, how would you get back to where you are now?",
  benefits: "What are the likely benefits of a partial success, even if it does not fully work?",
  costInaction: "What does six months, a year and three years of not trying cost you? This is the number people leave out.",
} as const

// ------------------------------------------------------------------ session 3

export const LDI_DREAM_PROMPT = "At some point in the next ten years, I want to…"

export const LDI_DREAM_CATEGORIES: readonly { id: string; label: string }[] = [
  { id: "learn", label: "learn" },
  { id: "see", label: "see" },
  { id: "have", label: "have" },
  { id: "be", label: "be" },
  { id: "try", label: "try" },
  { id: "do", label: "do" },
  { id: "go", label: "go" },
  { id: "create", label: "create" },
  { id: "contribute", label: "contribute" },
  { id: "overcome", label: "overcome" },
] as const

/** Ten minutes on a timer. The point is volume, not quality. */
export const LDI_DREAM_MINUTES = 10

export const LDI_HORIZONS: readonly number[] = [1, 3, 5, 10] as const

export const LDI_CELEBRATION_PROMPT =
  "Twelve months from now, what would you like to be celebrating in this part of your life?"

/**
 * The active load cap. More than a handful of live pursuits is how a plan
 * quietly becomes a list of things you feel guilty about.
 */
export const LDI_PORTFOLIO_MIN = 3
export const LDI_PORTFOLIO_MAX = 5

export const LDI_BUDGET_PROMPT =
  "Spread the hours you said you have across the areas you chose. You cannot spend more than you have, which is the point."

/**
 * The portfolio starts from the focus areas chosen in the reflect session,
 * rather than as a second blank choice. Asking somebody to pick their areas
 * twice invites two different answers, and then the celebrations belong to
 * one list while the goals belong to the other.
 */
export const LDI_PORTFOLIO_SEEDED_NOTE =
  "Started from the areas you chose earlier. Add or remove as you like, but decide deliberately rather than by accident."

// ------------------------------------------------------------------ session 4

/**
 * The goal shape. Eleven fields, because the two published versions of this
 * framework each carry something the other leaves out and the union is
 * strictly more useful than either. Every one of them is written by the user.
 */
export interface LdiGoalFieldDef {
  id: string
  group: "goal" | "plan" | "system"
  label: string
  question: string
}

export const LDI_GOAL_FIELDS: readonly LdiGoalFieldDef[] = [
  { id: "facts", group: "goal", label: "Facts", question: "What will be true when this is done? The tangible things that would confirm it." },
  { id: "feelings", group: "goal", label: "Feelings", question: "How will you, and the people around you, feel when it is done?" },
  { id: "function", group: "goal", label: "Function", question: "What does achieving this unlock? Why does it matter to you rather than to somebody else?" },
  { id: "antiGoals", group: "goal", label: "Anti-goals", question: "What do you want to avoid on the way there? What must not get wrecked in the process?" },
  { id: "steps", group: "plan", label: "Steps", question: "What are the three to five major moves?" },
  { id: "schedule", group: "plan", label: "Schedule", question: "Roughly when does each move happen?" },
  { id: "support", group: "plan", label: "Support", question: "Who could you enlist, and for what?" },
  { id: "snags", group: "plan", label: "Snags", question: "What are the three most likely reasons this fails, and what will you do about each one?" },
  { id: "actions", group: "system", label: "Actions", question: "What recurring daily or weekly action moves this? This is the part you can control." },
  { id: "tracking", group: "system", label: "Tracking", question: "How will you know whether it is working, and how often will you look?" },
  { id: "accountability", group: "system", label: "Accountability", question: "Who checks in with you, and when?" },
  { id: "adaptation", group: "system", label: "Adaptation", question: "How will you adjust if it stops going to plan? Decide now, while it is not going wrong yet." },
] as const

export const LDI_GOAL_GROUPS: readonly { id: "goal" | "plan" | "system"; label: string }[] = [
  { id: "goal", label: "Goal" },
  { id: "plan", label: "Plan" },
  { id: "system", label: "System" },
] as const

/**
 * The two realism percentages, and the floor. Below the floor the plan is
 * the problem, not the person, and the flow says so rather than shrugging.
 */
export const LDI_REALISM_FLOOR = 80

export const LDI_REALISM_PROMPTS = {
  theory: "If you followed this plan exactly, how likely is it to produce the result? Percent.",
  practice: "How likely are you to actually follow it, given your real life? Percent.",
} as const

export const LDI_SURPRISE_PROMPT =
  "On a scale of nought to ten, how surprised would you be if you failed at this?"

export const LDI_SURPRISE_MAX = 10

export const LDI_LEAD_INDICATOR_PROMPT =
  "What weekly number tells you whether you are doing the work, regardless of whether the result has arrived yet?"

/** Phrasing checks applied to the goal title. Advisory, never blocking. */
export const LDI_PHRASING_HINTS: readonly { id: string; test: RegExp; hint: string }[] = [
  { id: "learn", test: /^\s*(learn|get better at|understand)\b/i, hint: "This is a skill, not a project. What would you make or do that requires the skill?" },
  { id: "more", test: /\b(more|less|better|improve)\b/i, hint: "More than what, measured how? A goal you cannot fail is a goal you cannot pass." },
  { id: "someone-else", test: /\b(they|them|my (boss|partner|wife|husband|manager))\b/i, hint: "This depends on somebody else. What is the part that is entirely yours?" },
] as const

// ------------------------------------------------------------------ session 5

export interface LdiWeekSlotDef {
  id: string
  label: string
}

export const LDI_WEEK_DAYS: readonly LdiWeekSlotDef[] = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
] as const

/** Blocks are placed in named parts of the day rather than to the minute. */
export const LDI_WEEK_SLOTS: readonly LdiWeekSlotDef[] = [
  { id: "early", label: "Early" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
] as const

export const LDI_IDEAL_WEEK_PROMPT =
  "Build the week you would want, on a blank grid, before looking at the one you have. Then ask what is actually stopping you from having it."

export const LDI_FIT_TEST_STATEMENT =
  "Every goal you kept has to fit in the week you just built. If it does not fit, it does not get cut down. It gets cut."

export type LdiProjectStatus = "on-track" | "off-track-plan" | "off-track-no-plan" | "on-ice"

/**
 * Four states rather than three. The distinction between being behind with a
 * plan and being behind without one is the only part of a status field that
 * ever changes what you do next.
 */
export const LDI_PROJECT_STATUSES: readonly { id: LdiProjectStatus; label: string; hint: string }[] = [
  { id: "on-track", label: "On track", hint: "Going as expected." },
  { id: "off-track-plan", label: "Behind, with a plan", hint: "Slipped, and you know what you are doing about it." },
  { id: "off-track-no-plan", label: "Behind, no plan", hint: "Slipped, and you do not. This is the one that needs attention today." },
  { id: "on-ice", label: "On ice", hint: "Deliberately paused. Not failing, not running." },
] as const

export type LdiCadenceId = "daily" | "weekly" | "quarterly" | "annual"

export interface LdiCadenceDef {
  id: LdiCadenceId
  label: string
  minutes: number
  blurb: string
  questions: readonly string[]
}

/**
 * Four loops, not five. There is no monthly review here: nothing in it that
 * the weekly and quarterly loops do not already cover, and an empty ritual
 * teaches people to skip rituals.
 */
export const LDI_CADENCES: readonly LdiCadenceDef[] = [
  {
    id: "daily",
    label: "Daily",
    minutes: 5,
    blurb: "Read yesterday's intent forward before the day starts choosing for you.",
    questions: [
      "What are this quarter's goals?",
      "What were the three outcomes you wanted this week?",
      "What is the one thing today is for?",
    ],
  },
  {
    id: "weekly",
    label: "Weekly",
    minutes: 25,
    blurb: "The loop that does most of the work. Protect it before you protect the daily one.",
    questions: [
      "What are this year's top goals?",
      "What did you actually accomplish last week?",
      "Where did you not act in line with the person you said you wanted to be?",
      "What are the three outcomes that would make next week good?",
      "Where do those three go in the calendar?",
    ],
  },
  {
    id: "quarterly",
    label: "Quarterly",
    minutes: 60,
    blurb: "Re-pick what you are chasing. One from work, one from the rest of your life.",
    questions: [
      "What did the last ninety days actually produce?",
      "Which goals are finished, which are dead, and which are you pretending about?",
      "What is the one thing for the next ninety days at work?",
      "What is the one thing for the next ninety days outside it?",
    ],
  },
  {
    id: "annual",
    label: "Annual",
    minutes: 180,
    blurb: "Run this whole process again. It gets faster and more honest each time.",
    questions: [
      "What changed in what you want, as opposed to what you achieved?",
      "Which parts of the plan did you never touch, and what does that tell you?",
      "What is worth carrying into next year unchanged?",
    ],
  },
] as const

export const LDI_ACCOUNTABILITY_PROMPTS = {
  who: "Who is going to ask you how this is going, by name?",
  when: "How often, and through what? Put the recurring event in a calendar now.",
  what: "What exactly do you report to them? Make it a number or a yes-or-no, not a feeling.",
} as const

/** The scripted check-in. Unscripted accountability decays into catching up. */
export const LDI_CHECKIN_AGENDA: readonly string[] = [
  "Wins since last time.",
  "What you committed to last time, and whether you did it.",
  "The single priority before the next check-in.",
  "What is in the way, and what you are asking for.",
] as const

export const LDI_CHECKIN_MINUTES = 45

/**
 * The reality test. Everything up to here has been introspection, which is
 * reliably wrong about what a life is actually like from the inside.
 */
export const LDI_PROTOTYPE_PROMPTS = {
  assumption: "What is the biggest thing you are assuming is true, that the whole plan collapses without?",
  test: "What is the cheapest thing you could do in the next two weeks that would tell you whether it holds?",
  signal: "What result would count as it being wrong? Decide before you run it.",
  date: "When will you have done it?",
} as const

// ------------------------------------------------------------------ export

export const LDI_STORAGE_KEY = "ldi-v1"
export const LDI_SCHEMA_VERSION = 1
