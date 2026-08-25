/**
 * "I have tried before."
 *
 * The biggest hole in the module, and the corpus answers it better than it
 * answers almost anything else. The nicotine file put it under the heading
 * *"What was different on the attempt that finally worked"* and called it the
 * highest-value question asked; the same five themes recur across the other
 * substances.
 *
 * The reason this needs its own surface is that a previous attempt is
 * **evidence about a method**, not a verdict on a person — and the corpus is
 * specific that the useful difference is learned from the particular way the
 * last one ended. "Try harder" is the one answer the accounts never give.
 *
 * What is conspicuously absent from the "this time" accounts: increased
 * motivation, more information about health harms, and stronger reasons.
 * People who relapsed generally had all three already. Every difference they
 * name is structural.
 *
 * The counter-evidence is kept deliberately. Not every durable quit has a
 * "this time was different" story — one man succeeded at the most stressful
 * point of his life while describing himself as having the weakest will of
 * anyone, and another with no desire to quit at all. Some are constraint plus
 * time, and a screen that insists on a narrative would be lying to them.
 */

export interface AttemptEnding {
  id: string
  /** How the last attempt ended, in the words people use. */
  label: string
  /** What the corpus says tends to be the useful change after that ending. */
  answer: string
}

/**
 * How it ended last time, and what that specifically suggests.
 *
 * Deliberately keyed to the ending rather than offered as a generic list —
 * theme (b) in the corpus is that the absolutism which finally worked was
 * learned from the *specific* prior failure, not adopted in general.
 */
export const ENDINGS: AttemptEnding[] = [
  {
    id: "justone",
    label: "I had just one, and that was that",
    answer:
      "This is the commonest ending by a distance, and the accounts that finally held are blunt about it: the rule stopped being negotiable. One person had failed three times to exactly this and described the difference as knowing, flatly, that one was not available. The change is not more resolve, it is removing the decision from the table.",
  },
  {
    id: "drink",
    label: "I was drinking, and it went from there",
    answer:
      "Several accounts treat the second substance as the actual failure point of every previous attempt — people stopped drinking first, or stopped at day seven, and only then did the main quit hold. Worth asking whether your last few attempts all ended in the same company or the same state.",
  },
  {
    id: "stress",
    label: "Something went badly wrong in my life",
    answer:
      "Common, and worth separating from the pattern that turns up more often — most relapse in the corpus arrives during a *good* stretch rather than a crisis. If yours genuinely came from a crisis, the useful preparation is a named person and a rule for that week, not more motivation.",
  },
  {
    id: "fine",
    label: "I felt fine, and thought I could handle it",
    answer:
      "The single most-reported pattern in the whole corpus, across eight sources and five substances. It is not a lapse of willpower, it is a conclusion — that feeling better proved the problem was solved. The counter to it is a rule written down while calm, which is what the tripwire is for.",
  },
  {
    id: "faded",
    label: "It just quietly faded out",
    answer:
      "Rarely written about, because people who drift back stop posting — which is also why every collection like this one is tilted. What the durable accounts have that the faded ones lack is usually something external: a person who knew, a standing arrangement, a physical barrier. Not a stronger intention.",
  },
  {
    id: "never",
    label: "This is my first real go",
    answer:
      "Then the most useful thing here is the last question rather than the first. Roughly half of the attempts that work were not planned in advance, so starting today is not a worse plan than starting Monday.",
  },
]

/**
 * The five differences, from the corpus, offered as things that might be
 * available this time. Phrased as availability rather than advice: the
 * evidence is that these are structural changes, and you either have one or
 * you go and get one.
 */
export const DIFFERENCES = [
  {
    id: "settled",
    label: "The argument is over",
    help: "You are not talking yourself into it any more. Less need for willpower, rather than more of it.",
  },
  {
    id: "absolute",
    label: "One is not on the menu",
    help: "A flat rule about the first one, learned from how the last attempt actually ended.",
  },
  {
    id: "drug",
    label: "There is medication involved",
    help: "For drinking, opioids and nicotine there are real options. One account failed dozens of times, then succeeded first try on medication.",
  },
  {
    id: "second",
    label: "The other thing is gone too",
    help: "The drinking, or whatever was reliably in the room when the last attempt ended.",
  },
  {
    id: "room",
    label: "Something about the days has changed",
    help: "A route, a job, a house, a set of people. The cue set is different from last time.",
  },
]

export const AGAIN = {
  title: "You have been here before",
  blurb: "Most people who get there have several behind them. The useful question is what was different, and it is answerable.",
  /** Said first, because it is the frame the whole screen depends on. */
  frame:
    "A previous attempt that ended is evidence about a method, not a verdict on you. The accounts are consistent that the difference on the attempt that held was structural — a rule, a drug, a person, a changed room. What is missing from them is just as informative: more motivation, more facts about harm, and better reasons almost never appear, because the people who relapsed already had those.",
  countLabel: "How many real attempts, roughly?",
  countNote: "No wrong number. It is context, not a score, and it is not stored as one.",
  endingLabel: "How did the last one end?",
  endingNote: "The specific ending matters more than the total. The rule that finally works is usually learned from it.",
  differencesLabel: "Which of these is actually available this time?",
  differencesNote: "Tick what is true now, not what you intend. Empty is a real answer and a useful one.",
  noneYet:
    "Nothing ticked. That is worth knowing rather than glossing: the accounts suggest the odds turn on getting one of these in place, so this may be the thing to go and do rather than the thing to feel bad about.",
  writeLabel: "In one line, what is different this time?",
  writePlaceholder: "the drink is gone as well, and Sam knows",
  /** Kept, because insisting on a narrative would be dishonest. */
  counter:
    "Some durable quits have no story like this at all. One man in the corpus succeeded at the worst moment of his life while describing himself as having the weakest will of anyone he knew; another had no wish to stop and stopped anyway because he could not afford it. If nothing here fits, that is not a bad sign.",
  /** The metric users themselves proposed, instead of a streak. */
  metric:
    "One thing worth taking from the people who kept going: they stopped counting time since, and started noticing how fast they came back. That number goes the right way after a bad night, which is the only time you look at it.",
} as const
