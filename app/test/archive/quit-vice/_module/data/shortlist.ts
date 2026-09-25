/**
 * The short version — what the evidence actually recommends, as a checklist.
 *
 * The four change-flows predate the research corpus. They are each built on a
 * genuine position the literature takes, and they disagree with each other on
 * purpose, which is defensible. What none of them is, is **the thing the
 * evidence ranks highest** — and the longest of them asks for twenty-five
 * minutes across twelve screens before a person has changed anything in the
 * actual room they drink in.
 *
 * So this is the fifth path and the shortest: the Tier-1 and Tier-2 techniques
 * from `SYNTHESIS.md`, in the order their cross-source recurrence puts them,
 * as things to go and do.
 *
 * Three findings shape it more than the ranking does:
 *
 *  - **Environment beats disposition.** The strongest single mechanism claim
 *    the corpus supports, across five studies. Robins' Vietnam cohort is the
 *    extreme case: same men, same drug, changed setting, 20% withdrawal-
 *    symptomatic in country versus under 1% re-addicted at home.
 *  - **A constraint you can revoke alone is not a constraint.** Gambling
 *    blockers get beaten by offshore sites and app-offloading; porn blockers
 *    "work only when somebody else holds the key". Every item here is marked
 *    for whether it needs another person, because that is what separated the
 *    ones that held.
 *  - **Most of this does not happen on a screen.** Engagement volume predicts
 *    nothing good across three independent designs, and the community with
 *    genuinely good outcomes reports one to three hours a week. The app's job
 *    here is to be a list, not a destination.
 *
 * `recurrence` is the number of distinct source files naming that family —
 * independent agreement rather than repetition inside one forum. It is shown
 * on screen so a reader can discount a thin one on sight.
 */

export interface ShortlistItem {
  id: string
  /** What to do, as an instruction to a person, not a category. */
  label: string
  /** Concretely, in the corpus's own terms. */
  does: string
  /** Distinct source files naming this family. */
  recurrence: number
  /** Whether it only holds when somebody else controls it. */
  needsPerson: boolean
  /** Whether it happens away from this page. Most of them do. */
  offScreen: boolean
}

export const SHORTLIST: ShortlistItem[] = [
  {
    id: "supply",
    label: "Get it out of the house, including the routes back",
    does: "The bottle, the stash, the saved card, the dealer's number, the app you can re-install. People who did this name the residue routes they forgot the first time.",
    recurrence: 8,
    needsPerson: false,
    offScreen: true,
  },
  {
    id: "context",
    label: "Change one route, one room, or one shop",
    does: "Drive the other way home. Do not enter the aisle. Move the chair before you stop rather than after — one account warns the new arrangement just becomes the new drinking spot otherwise.",
    recurrence: 7,
    needsPerson: false,
    offScreen: true,
  },
  {
    id: "key",
    label: "Give somebody else the key",
    does: "The money, the card, the password, the lock box code. The single clearest cross-behaviour finding: a constraint you can undo on your own is not a constraint.",
    recurrence: 7,
    needsPerson: true,
    offScreen: true,
  },
  {
    id: "person",
    label: "Tell exactly one person, and give them a script",
    does: "One, not everybody. A public declaration has a documented failure — one man told his boss, HR and his parents in a morning and relapsed at day thirty. Telling people underperforms giving one person a rule.",
    recurrence: 6,
    needsPerson: true,
    offScreen: true,
  },
  {
    id: "replacement",
    label: "Buy the replacement before you need it",
    does: "A named thing you actually like, in the house, for the specific hour. Not a category — the accounts name a brand and a time.",
    recurrence: 9,
    needsPerson: false,
    offScreen: true,
  },
  {
    id: "move",
    label: "Decide what you do with your body instead",
    does: "The low-barrier version people actually do is a long walk with a podcast, not the gym.",
    recurrence: 6,
    needsPerson: false,
    offScreen: true,
  },
  {
    id: "refusal",
    label: "Have one line ready, with no reason attached",
    does: "A reason is something to argue with. Say it once and change the subject.",
    recurrence: 3,
    needsPerson: false,
    offScreen: false,
  },
  {
    id: "tripwire",
    label: "Write the rule for the week it goes well",
    does: "The moment the accounts actually describe going wrong. Only two people in the whole corpus had written one in advance, and nobody who failed had.",
    recurrence: 4,
    needsPerson: false,
    offScreen: false,
  },
  {
    id: "tape",
    label: "Write one specific later evening you can picture",
    does: "Not a summary. One moment, present tense, somewhere real, short enough to re-read in ten seconds at a bad one.",
    recurrence: 4,
    needsPerson: false,
    offScreen: false,
  },
  {
    id: "service",
    label: "Do something for somebody worse off than you",
    does: "Four studies, and the single most cross-organisational practice in mutual aid. Giving support beats receiving it, and it works while you are still unstable.",
    recurrence: 4,
    needsPerson: true,
    offScreen: true,
  },
]

export const SHORTLIST_COPY = {
  title: "The short version",
  blurb: "Ten things, in the order the evidence puts them. Most happen away from this page.",
  /** The number that matters, and why it is not a score. */
  countLabel: "in place",
  countNote:
    "Not a score and not a streak. It is a count of things that are true right now, and the only reason it is here is that the accounts which held rested on structure rather than on how the person felt about it.",
  offScreenBadge: "away from here",
  personBadge: "needs somebody else",
  /** Said once, at the top, because it is the honest framing. */
  frame:
    "None of this is motivational, and that is deliberate. Across the accounts of people who had failed several times, what was different on the attempt that held was structural — a rule, a drug, a person, a changed room. More motivation and more facts about harm are conspicuously absent from every one of those stories.",
  eject:
    "Six of these ten are done somewhere other than a screen. This page is a list, not the work, and a tool that kept you here longer would be optimising the wrong thing.",
  empty: "Nothing ticked yet. The order is the evidence's, so the top of the list is the place to start.",
  allDone:
    "That is the lot. Worth coming back when something changes rather than daily — a high proportion of time spent in recovery material is associated with worse outcomes, not better.",
} as const
