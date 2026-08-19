/**
 * Quitting a vice — the whole type surface.
 *
 * One state object, one localStorage key, four flows reading and writing it.
 * The flows are different arrangements of the same exercises rather than four
 * separate products, because the thing a person needs on the night they nearly
 * give in is the same thing regardless of which door they came in by. Swapping
 * flow keeps the log, the plans, the card and the voice work.
 */

// ---------------------------------------------------------------- the vice

/** How the vice behaves, which decides which exercises are worth showing. */
export type ViceShape =
  /** A substance with a physical withdrawal. Routes through the safety gate. */
  | "substance"
  /** A screen or a feed. No withdrawal, enormous cue exposure. */
  | "screen"
  /** A behaviour with a strong shame load — porn, gambling, bingeing. */
  | "behaviour"

export interface ViceOption {
  id: string
  /** What it is called on the button. */
  label: string
  /** The unit one instance is counted in — "a drink", "a session", "a scroll". */
  unit: string
  shape: ViceShape
  /**
   * Whether stopping abruptly can be medically dangerous.
   * Alcohol and benzodiazepines are the two where unsupervised cessation can
   * kill; everything else is unpleasant. This flag is the only thing standing
   * between a quit-date screen and that fact, so it is on the vice, not on a
   * question the person has to think to answer.
   */
  medicalRisk: boolean
  /** Triggers offered first for this vice, before the generic list. */
  triggerSeeds: string[]
}

// ---------------------------------------------------------------- the log

/**
 * One entry. Either an urge that happened, or an instance of doing the thing,
 * and often both — an urge you acted on is one episode, not two.
 *
 * The two ratings are the whole mechanism and they are not interchangeable.
 * `expected` is taken BEFORE, `actual` immediately after, `later` half an hour
 * on. The gap between what the brain promised and what it delivered is what
 * updates the reward value; a single rating gives the person nothing back.
 */
export interface ViceEpisode {
  id: string
  /** ISO datetime, written on the client. */
  at: string
  /** Whether the person went on to do the thing. `null` while still open. */
  actedOn: boolean | null
  /** 0–10, taken before. Only meaningful when they went on to do it. */
  expected: number | null
  /** 0–10, taken immediately after. */
  actual: number | null
  /** 0–10, taken roughly half an hour after. */
  later: number | null
  /** 0–10 urge strength at its peak. */
  intensity: number | null
  /** 0–10 again after coping. Cornell's second rating; the delta is the point. */
  after: number | null
  /** Minutes from "this started" to "this passed". Only set when it passed. */
  minutes: number | null
  trigger: string
  where: string
  /** Feeling words, from the bank or typed. */
  feelings: string[]
  /** Where it was felt in the body. */
  body: string[]
  coped: string
  notes: string
}

// ---------------------------------------------------------------- plans

/**
 * One if-then plan. The `when` has to be something you could photograph and the
 * `then` something you could start inside a minute, which is what separates a
 * plan that fires from an intention that does not.
 */
export interface IfThenPlan {
  id: string
  when: string
  then: string
  /**
   * Which moment the plan is for.
   *
   * `urge` is the classic: a bad moment, planned for in advance. `tripwire` is
   * the opposite and is the one the research says is missing everywhere — a
   * rule written while calm and fired by a *good* stretch, because across eight
   * independent sources the relapse trigger is feeling fine rather than
   * craving. Only two people in the entire corpus had set one, and nobody who
   * failed had.
   *
   * Optional so plans saved before this existed still load as urge plans.
   */
  kind?: "urge" | "tripwire"
}

// ---------------------------------------------------------------- state

export type ViceFlowId = "map" | "experiment" | "line" | "week" | "where" | "gives"

/**
 * One answer on the count.
 *
 * "Not sure" is a real answer and is kept separate rather than folded into no.
 * Several of the criteria are things a person genuinely cannot call — whether
 * their tolerance has moved is not obvious from inside — and forcing a binary
 * either inflates the count or hides it. Unsure is reported alongside the
 * count, never added to it.
 */
export type ViceCriterionAnswer = "yes" | "no" | "unsure"

/** Where the help screen looks for actual services. */
export type HelpLocale = "uk" | "us" | "other"

/**
 * What the person put into a typical week, reconstructed rather than estimated.
 *
 * Asked as four small numbers instead of one big one on purpose. A direct
 * "how much do you drink a week" is answered from self-image; days × amount is
 * answered from memory, and the two come out a long way apart.
 */
export interface ViceUsage {
  /** Days in a typical week it happens at all, 0–7. */
  daysPerWeek: number | null
  /** How many units on one of those days. */
  perDay: number | null
  /** What one unit costs, in whole currency units. */
  cost: number | null
  /** Minutes it takes on one of those days, including getting over it. */
  minutes: number | null
}

/**
 * The awareness flow's state.
 *
 * `guess` is taken before any total is shown and kept afterwards. The gap
 * between what somebody predicted and what the arithmetic returned is the part
 * that does the work — showing a number to a person who already guessed it is
 * an arithmetic lesson, not a finding.
 */
export interface ViceAwareness {
  /** Criterion id → answer. */
  criteria: Record<string, ViceCriterionAnswer>
  /** Their own guess at the yearly cost, taken before the total is revealed. */
  guess: number | null
  usage: ViceUsage
}

/** The withdrawal interlock. Three states, and they must not be muddled. */
export interface ViceSafety {
  /** Whether the question has been put at all. */
  asked: boolean
  /** Whether they said yes to any withdrawal sign. */
  withdrawal: boolean
  /** Whether they have read the consequence and chosen to carry on anyway. */
  acknowledged: boolean
}

export interface ViceExperiment {
  /** What they finally agreed to, in days. */
  days: number | null
  /** ISO date, client-side. */
  startDate: string | null
  /** What they want to find out. The experiment's hypothesis. */
  hypothesis: string
  /** Every length the app offered, in order, so the counter-offer is visible. */
  offered: number[]
}

export interface ViceVoice {
  /** What they called it. */
  name: string
  /** The lines it uses on them. */
  says: string[]
  /** What they say back. */
  back: string[]
}

export interface ViceCard {
  /** Top three reasons, short. */
  reasons: string[]
  /** The one line they wrote for themselves. */
  line: string
}

export interface ViceState {
  version: 1
  /** Catalogue id, or `custom`. */
  viceId: string | null
  /** What they call it, which may not be what the catalogue calls it. */
  viceLabel: string
  /** Their own unit — "a drink", "a session". Seeded from the catalogue. */
  viceUnit: string
  shape: ViceShape | null
  medicalRisk: boolean
  /** Which flow they last opened. Flows share everything else. */
  flowId: ViceFlowId | null
  /** ISO datetimes, client-side. */
  createdAt: string | null
  updatedAt: string | null

  safety: ViceSafety
  experiment: ViceExperiment
  voice: ViceVoice
  card: ViceCard
  awareness: ViceAwareness
  /** Which country's services the help screen shows. Null until they pick. */
  helpLocale: HelpLocale | null

  /** Free text, keyed by field id. */
  answers: Record<string, string>
  /** 0–10 sliders, keyed by field id. */
  scales: Record<string, number>
  /** Repeatable lines and chip selections, keyed by field id. */
  lists: Record<string, string[]>
  /** Which steps have been marked done, keyed by step id. */
  stepDone: Record<string, boolean>

  episodes: ViceEpisode[]
  plans: IfThenPlan[]
  /** Mission day number → the ISO date it was marked done. */
  missionsDone: Record<number, string>
}

// ---------------------------------------------------------------- flows

/**
 * Every kind of screen a flow can be made of.
 *
 * A flow is a list of steps, and a step names one of these. Adding a flow costs
 * a data entry; adding a kind costs a component. That ratio is deliberate — the
 * four flows disagree about order, framing and emphasis, not about what an urge
 * log looks like.
 */
export type ViceStepKind =
  | "intro"
  | "pickVice"
  | "safety"
  | "ruler"
  | "text"
  | "chips"
  | "negotiate"
  | "log"
  | "ifthen"
  | "voice"
  | "card"
  | "tape"
  | "refusal"
  | "binding"
  | "window"
  | "missions"
  | "review"
  /** The criteria count. Branches on shape — see data/awareness.ts. */
  | "count"
  /** Days, amount, money and time, multiplied out. */
  | "usage"
  /** The count and the arithmetic read back, elicit–provide–elicit. */
  | "feedback"
  /** When it started, what it was for then, and which way it is moving. */
  | "trajectory"
  /** The three doors out of the awareness flow, weighted equally. */
  | "doors"
  /** What it gives you, rated. Never scored against anything. */
  | "beliefs"
  /** Each rated belief checked against the person's own record. */
  | "beliefTest"
  /** The card sort, and the two directions asked separately. */
  | "values"
  /** Two futures per horizon, written as re-readable cues. */
  | "futures"
  /** A letter from it, or to it. */
  | "letter"

/** A 0–10 slider with the follow-up questions that make it work. */
export interface RulerSpec {
  id: string
  question: string
  lowAnchor: string
  highAnchor: string
  /** Asked about a LOWER number, always. A higher one evokes sustain talk. */
  whyNotLower: string
  /** What would move it up one. Never more than one. */
  whatWouldMove: string
  /** Used when the answer is 0, where "why not lower" has no meaning. */
  zeroFallback: string
}

/** One free-text question on a `text` step. */
export interface TextField {
  id: string
  label: string
  help?: string
  placeholder?: string
  rows?: number
  /** Words required before the step counts as done. 0 means it never blocks. */
  minWords?: number
}

/** A bank of one-tap options plus a free-text escape. */
export interface ChipField {
  id: string
  label: string
  help?: string
  options: string[]
  /** Whether the person can type their own. Always true in practice. */
  allowCustom: boolean
}

export interface ViceStep {
  id: string
  kind: ViceStepKind
  /** The heading on the screen. */
  title: string
  /** One or two sentences under it. */
  blurb: string
  /** Longer prose, for `intro` steps. */
  body?: string[]
  /** A pull-quote or a warning that has to sit above the first field. */
  caution?: string
  rulers?: RulerSpec[]
  fields?: TextField[]
  chips?: ChipField[]
  /** Where the content came from, shown in the provenance strip. */
  source?: string
}

export interface ViceFlow {
  id: ViceFlowId
  label: string
  /** The one-line pitch on the hub. */
  pitch: string
  /** Who it is for, plainly. */
  forWho: string
  /** What it asks of you up front, so nobody starts the wrong one. */
  asks: string
  /** The theory underneath, named honestly. */
  basis: string
  /** How long the whole thing takes. */
  minutes: number
  steps: ViceStep[]
}

// ---------------------------------------------------------------- derived

/** What the expected/actual log adds up to. */
export interface PayoffSummary {
  /** Episodes with both numbers. */
  n: number
  avgExpected: number
  avgActual: number
  avgLater: number | null
  /** expected − actual. Positive means it delivered less than promised. */
  gap: number
}

/** What the urges that passed add up to. */
export interface UrgeSummary {
  /** Urges logged with a duration and not acted on. */
  n: number
  medianMinutes: number
  maxMinutes: number
}

/** One bar of the hour-of-day histogram. */
export interface WindowBar {
  hour: number
  count: number
}

export interface DangerWindow {
  bars: WindowBar[]
  /** The busiest hour, or null when there is not enough to say. */
  peakHour: number | null
  /** Episodes counted. */
  n: number
}

export interface FlowProgress {
  done: number
  total: number
}

// ---------------------------------------------------------------- handlers

/**
 * Every way a step can change the state, in one bag.
 *
 * One object rather than thirty props, because a step component that needs one
 * setter today needs three tomorrow and threading them individually turns every
 * addition into a change to four files. The shell owns the state; nothing below
 * it holds any.
 */
export interface ViceHandlers {
  setVice: (viceId: string, label: string) => void
  setAnswer: (id: string, text: string) => void
  setScale: (id: string, value: number) => void
  setList: (id: string, items: string[]) => void
  toggleListItem: (id: string, item: string) => void
  setStepDone: (stepId: string, done: boolean) => void
  setSafety: (withdrawal: boolean) => void
  acknowledgeSafety: () => void
  offerLength: (days: number) => void
  setExperiment: (days: number, startDate: string) => void
  setHypothesis: (text: string) => void
  addPlan: (when: string, then: string, kind?: "urge" | "tripwire") => void
  removePlan: (id: string) => void
  addEpisode: (episode: ViceEpisode) => void
  updateEpisode: (id: string, patch: Partial<ViceEpisode>) => void
  removeEpisode: (id: string) => void
  toggleMission: (day: number) => void
  setVoice: (patch: Partial<ViceVoice>) => void
  setCard: (patch: Partial<ViceCard>) => void
  setCriterion: (id: string, answer: ViceCriterionAnswer) => void
  setUsage: (patch: Partial<ViceUsage>) => void
  setGuess: (guess: number | null) => void
  setHelpLocale: (locale: HelpLocale) => void
  /** Open the help screen from inside a step or a tool. */
  openHelp: () => void
  /** Open the always-available urge tool from inside a step. */
  openUrge: () => void
  /** Jump to another step in the current flow. */
  goToStep: (stepId: string) => void
  /** Move to the next step. Supplied by the flow shell. */
  nextStep: () => void
}
