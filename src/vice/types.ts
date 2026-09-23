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

/** Every dialog either shell can open. One list, so the hub and the flow
 *  shell cannot drift apart in what they make reachable. */
export type ViceToolId = "urge" | "lapse" | "card" | "help" | "voices" | "tripwire" | "again"

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
  /**
   * Hand off to another tool.
   *
   * Until this existed the only link between any two tools was urge → lapse,
   * and everything else was an isolated dialog that dead-ended at "close".
   * That is most of why the module read as a menu rather than a path: you
   * finished the lapse debrief and the page had nothing to say about what
   * follows, even though the research is specific about what does.
   */
  openTool: (tool: ViceToolId) => void
  /** Jump to another step in the current flow. */
  goToStep: (stepId: string) => void
  /** Move to the next step. Supplied by the flow shell. */
  nextStep: () => void
}

// ================================================================ black box

/**
 * THE BLACK BOX — every run you have had, and every night you nearly went.
 *
 * This is a separate record from `ViceState` above, under its own storage key,
 * and it is deliberately shaped like database rows rather than like a screen:
 * two flat, append-only lists with stable ids and ISO dates, nothing derived
 * ever stored. The platform move (leaving Supabase, decided 2026-09-17) turns
 * `blackboxStore` into a repo and changes nothing else. Data born in a shape
 * that cannot move is the thing that kills a record you intend to keep for
 * years, and this record is worthless unless it survives years.
 */

/**
 * How a run ended.
 *
 * The ids come from the corpus taxonomy already used by `data/again.ts`, so the
 * two surfaces cannot disagree about what the endings are. `fine` is the one
 * the whole module is built around — across eight sources the hazard is the good
 * stretch rather than the bad night — and it is the only family the chart gives
 * an accent colour to.
 */
export type ViceEndingId = "fine" | "justone" | "drink" | "stress" | "faded" | "other"

/**
 * One period of not doing it.
 *
 * `startedBy` and `structure` exist because the owner asked for what got a run
 * going and what kept it underway, not only what ended it — the accounts are
 * consistent that what separates a durable attempt from a fragile one is
 * structural, and structure is only visible if somebody wrote it down at the
 * start.
 */
export interface ViceAttempt {
  id: string
  /** Catalogue id or `custom`. Carried from day one so a second vice is not a migration. */
  viceId: string
  /** What the person calls it. */
  label: string
  /** YYYY-MM-DD in the person's own calendar, never a server day. */
  startedOn: string
  /** What got it going this time. */
  startedBy: string
  /** What they put in place to keep it going. */
  structure: string[]
  /** YYYY-MM-DD, or null while the run is still alive. */
  endedOn: string | null
  /** The report that ended it, or null while it is still alive. */
  endedByReportId: string | null
  /** When this row last changed. See `SyncStamps` below. */
  updatedAt: string
  /** When it was removed, or null. A removal is a row, never a gap. */
  deletedAt: string | null
}

/**
 * THE TWO BOOKKEEPING FIELDS, AND WHY THEY ARE UTC WHEN NOTHING ELSE HERE IS.
 *
 * Every other moment in this record is the person's own wall clock with no
 * timezone on it, deliberately: `at` on a report answers "which night was this",
 * and a report filed at 23:30 in Berlin must not become tomorrow. That is right
 * for a day and wrong for these two.
 *
 * `updatedAt` and `deletedAt` are not days. They exist to answer "which of these
 * two versions of the same row is newer", asked across devices that may be in
 * different places. Local wall-clock text sorts correctly within ONE person's
 * own browser and stops being comparable the moment a second device is in a
 * different zone — a phone in Berlin would appear an hour ahead of a laptop in
 * London for every row, forever. So these two are true UTC instants, ending in
 * `Z`, and `nowUtc()` in the store is the only thing that makes them.
 */
export interface SyncStamps {
  updatedAt: string
  deletedAt: string | null
}

/**
 * One filed report — a night you nearly went, or a night you did.
 *
 * ONE FORM FOR BOTH, and `wentThrough` is the only field that differs. This is
 * taken from the Aviation Safety Reporting System, which has collected
 * voluntary close-call reports since 1976 on the premise that the chain behind
 * a near miss is the same chain as behind the accident. Giving near misses a
 * lighter, separate form is how they become second-class and stop being filed,
 * and a log holding only your defeats is the object that makes the next one
 * likelier rather than rarer.
 */
export interface ViceReport {
  id: string
  attemptId: string
  /** ISO datetime, written in the browser. */
  at: string
  /** The one field that separates a close call from a relapse. */
  wentThrough: boolean
  /** The rationalisation, in the person's own words. */
  thought: string
  /** Which family the thought belongs to. Fixed per family, so the chart's accent never moves. */
  ending: ViceEndingId
  /** 0–10, how close it got. Null when they did not say. */
  closeness: number | null
  /**
   * Who they were with.
   *
   * In a study of 791 quitters and 37,002 craving entries, being alone was a
   * top-five predictor of whether a craving became a lapse. `ViceEpisode` above
   * records `where` and has no field for company, and `data/again.ts` asks in
   * prose whether past attempts "ended in the same company" with no way to
   * answer it. This is that field.
   */
  withWhom: string
  where: string
  /**
   * Contributing factors, PLURAL.
   *
   * Never "the reason". A blameless postmortem asks for two to five systemic
   * contributors precisely because a single root cause is always a story told
   * afterwards; "I thought I could moderate" was never the whole chain, and a
   * form that asks for one answer collects one shallow answer.
   */
  factors: string[]
  /** What they did instead. Only meaningful on a close call. */
  didInstead: string
  /** When this row last changed. UTC — see `SyncStamps`. */
  updatedAt: string
  /** When it was removed, or null. A removal is a row, never a gap. */
  deletedAt: string | null
}

/** The whole record. Two flat lists; everything else is derived at read time. */
export interface BlackBoxRecord {
  version: 1
  attempts: ViceAttempt[]
  reports: ViceReport[]
}

// ------------------------------------------------------- derived, never stored

/** One row of the runs chart. */
export interface RunLane {
  attempt: ViceAttempt
  /** Whole days the run has lasted, to today when it is still alive. */
  days: number
  /**
   * The calendar days close calls were filed on, oldest first.
   *
   * The DAYS, not a count. The chart draws a dot per close call and the whole
   * reading the chart promises — "dense ticks before an ending" means one
   * problem, "sparse ticks" means a different one — is a claim about WHEN they
   * happened. A count can only be spread evenly, which manufactures the first
   * reading for every run that has any.
   */
  closeCallDays: string[]
  /** Null while the run is alive. */
  ending: ViceEndingId | null
  /** Whether the run is still going. */
  live: boolean
}

/** One row of "what each thought has cost you". */
export interface ThoughtCost {
  ending: ViceEndingId
  /** The family's plain-English name. */
  label: string
  /** The person's own most recent phrasing of it, when they wrote one. */
  ownWords: string
  /** Runs this family ended. */
  runsEnded: number
  /** Clean days inside the runs it ended — the number the ranking uses. */
  daysEnded: number
  /** Times it was filed and survived. */
  survived: number
}

/** The three numbers at the top. */
export interface BlackBoxStats {
  longestDays: number
  totalCleanDays: number
  /** Null when no run is alive. */
  currentDays: number | null
  runs: number
  closeCallsSurvived: number
}

/** What the "I'm having a thought" door answers with. */
export interface ThoughtAnswer {
  ending: ViceEndingId
  label: string
  /** Every previous time this family was filed, newest first. */
  history: ViceReport[]
  /** Runs it ended, and the clean days they held. */
  runsEnded: number
  daysEnded: number
  /** Times it was filed and did NOT win. */
  survived: number
  /** True when there is nothing to say yet, so the screen says so instead of inventing a pattern. */
  empty: boolean
}
