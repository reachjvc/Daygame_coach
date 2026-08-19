/**
 * The flow about what it gives you, and what that turns out to be worth.
 *
 * The trap this flow is built to avoid: it looks exactly like a pros-and-cons
 * list, and a pros-and-cons list is contraindicated. Weighing the good against
 * the bad in an ambivalent person produces the case for keeping it, out loud,
 * in their own voice, and saying the case for keeping it predicts keeping it.
 * The module already dropped that exercise once, on purpose.
 *
 * So the good half and the costly half are here, and they are never on the same
 * screen and never scored against each other. The sequence is:
 *
 *   1. Say what it gives you. Generously, with no argument from the page.
 *   2. Check each one against your own record. Not against an opinion.
 *   3. Say what you are actually for, separately, in your own words.
 *   4. Picture two futures, specifically enough to use later.
 *   5. Write to it, or let it write to you.
 *
 * Steps 1 and 2 are an expectancy check, which works and then fades — the
 * college trials lose their effect past about four weeks — except that here the
 * evidence is the person's own logged numbers rather than a lecture, and their
 * own numbers keep arriving. Step 3 is discrepancy, evoked rather than pointed
 * out. Step 4 is the one with the best evidence in the whole flow, and it is
 * built to be re-read at the moment of decision rather than admired once.
 */

import type { ViceShape } from "../types"

// ---------------------------------------------------------------- beliefs

export interface ViceBelief {
  id: string
  /** What it promises, in the first person, said the way people say it. */
  claim: string
  /**
   * Where to look to find out whether it is true. Specific to the belief, and
   * pointing at the person's own record rather than at a study.
   */
  check: string
}

/**
 * What drink and drugs are believed to do.
 *
 * The spread follows the factor structure the expectancy questionnaires
 * settled on — being easier company, taking the edge off, being braver, sex —
 * plus the three that come up constantly outside the instruments: sleep,
 * having earned it, and filling an empty evening. Written in our own words;
 * the published items are copyright and this module rebuilds rather than
 * reprints.
 */
export const SUBSTANCE_BELIEFS: ViceBelief[] = [
  {
    id: "social",
    claim: "It makes me easier company.",
    check: "Think of the last three times. Did the people there seem to be enjoying it, or were you the one enjoying it?",
  },
  {
    id: "edge",
    claim: "It takes the edge off.",
    check: "Your own before-and-after numbers, if you have logged any. Then the half-hour-later one, which is usually the honest one.",
  },
  {
    id: "brave",
    claim: "I am braver with it. I say the thing I would not say.",
    check: "Name one thing it let you say that you were glad about the next morning.",
  },
  {
    id: "sex",
    claim: "Sex is better.",
    check: "Better at the time, or better in the telling? Those come apart more than people expect.",
  },
  {
    id: "sleep",
    claim: "It helps me sleep.",
    check: "Look at how you were at four in the morning and at eight, not at how you were at eleven at night.",
  },
  {
    id: "earned",
    claim: "It is the reward. I have earned it.",
    check: "Was the last one a reward, or was it a Tuesday?",
  },
  {
    id: "empty",
    claim: "It makes an empty evening bearable.",
    check: "What did you do on the last evening you did not? Not the worst one — the last one.",
  },
  {
    id: "me",
    claim: "It is part of who I am, and of who my people are.",
    check: "Who exactly would notice if you stopped, and what would they actually say?",
  },
]

/** The same job for screens and behaviours, where the promises differ. */
export const IMPACT_BELIEFS: ViceBelief[] = [
  {
    id: "off",
    claim: "It switches my head off.",
    check: "Was your head quieter afterwards, or only busier with something else?",
  },
  {
    id: "edge",
    claim: "It takes the edge off a bad mood.",
    check: "Your own before-and-after numbers. Then how you felt an hour later, which is the one that counts.",
  },
  {
    id: "empty",
    claim: "It fills a gap when there is nothing else on.",
    check: "Was there nothing else on, or was it just the nearest thing?",
  },
  {
    id: "earned",
    claim: "I have earned it.",
    check: "Was the last one earned, or was it just available?",
  },
  {
    id: "mine",
    claim: "It is the only part of the day nobody is asking me for anything.",
    check: "A real point, and worth keeping. The question is whether this is the only thing that does it.",
  },
  {
    id: "keep-up",
    claim: "It is how I keep up with people.",
    check: "How many of the last ten involved another person at all?",
  },
  {
    id: "sleep",
    claim: "It helps me wind down for bed.",
    check: "What time did you actually get to sleep on the last three?",
  },
  {
    id: "gone",
    claim: "It makes the bad feeling go away.",
    check: "For how long? And where was the feeling when it came back?",
  },
]

export function beliefsFor(shape: ViceShape | null): ViceBelief[] {
  return shape === "substance" ? SUBSTANCE_BELIEFS : IMPACT_BELIEFS
}

export const BELIEFS = {
  title: "What it gives you",
  blurb: "The honest half, and it goes first. A page that only lets you write the bad things is a page you will stop believing.",
  instruction: "Slide the ones that are true for you. Skip the rest.",
  scaleLow: "Not really",
  scaleHigh: "Completely true",
  /**
   * The mechanism, said plainly, because it is genuinely interesting and it is
   * the reason the next screen is worth doing.
   *
   * The balanced-placebo experiments handed people drinks and lied about what
   * was in them, in both directions. A good deal of what everyone assumes is
   * pharmacology turned out to track what the person believed they had been
   * given rather than what they had actually been given.
   */
  why:
    "There is a set of experiments where people were given drinks and told the truth or lied to about what was in them, in both directions. Plenty of what everybody assumes the drink is doing tracked what the person thought they had been handed rather than what was actually in the glass. Which is worth knowing, because a belief is a thing you can check, and a chemical is not.",
  empty: "Nothing rated yet. There is no wrong answer on this screen and nothing here is going to argue with you.",
} as const

// ------------------------------------------------------------- the check

export const BELIEF_TEST = {
  title: "Now check them",
  blurb: "One at a time, against your own record. Not against anybody's opinion, and not against mine.",
  intro:
    "Only the ones you rated four or higher show up here. For each, there is a place to look. Look properly, then say what you found — the answer is allowed to be that it holds up.",
  verdicts: [
    { id: "held", label: "Held up", help: "The record agrees with it." },
    { id: "mixed", label: "Sometimes", help: "True in some situations and not in others. Worth knowing which." },
    { id: "no", label: "Did not hold", help: "The record disagrees." },
  ],
  findingLabel: "What did you find?",
  /** Rendered when they have their own logged numbers to compare against. */
  fromLog: "From your log: expected {expected}, actually got {actual}, over {n}.",
  noLog:
    "Nothing logged yet to check against, so this runs on memory. Memory is worse at this than a log is, which is what the log is for.",
  /** Said once, at the bottom, and honestly. */
  decay:
    "Fair warning about this exercise. Where it has been tested, arguing somebody out of their beliefs about a drink works for about a month and then wears off. What does not wear off is your own record, because it keeps arriving. That is the difference between this screen and a lecture, and it only holds if you keep logging.",
  summaryHeld: "still standing",
  summaryFell: "did not survive your own record",
} as const

// ---------------------------------------------------------------- values

/**
 * What the person is actually for.
 *
 * A card sort, in the motivational-interviewing sense. The discrepancy between
 * how somebody wants to live and what they are doing is the engine here, but it
 * only works when they find it. The page never points at it, never says "look,
 * a contradiction", and never puts a value next to the vice on the same line.
 * It asks two questions in both directions and then gets out of the way.
 */
export const VALUES = [
  "Being there for my family", "Being someone people can rely on", "Doing work I respect",
  "Being healthy", "Being honest", "Having my own money in order", "Being a good friend",
  "Being present with my kids", "Learning things", "Being fit", "Being calm",
  "Being brave", "Making things", "Being generous", "Keeping my word",
  "Being good at something", "Having a home I like being in", "Being free of debt",
  "Faith", "Being kind", "Doing my share", "Being interesting to talk to",
  "Getting good sleep", "Being someone my partner is glad about", "Having time that is mine",
  "Not wasting the day", "Being outdoors", "Being useful", "Growing older well",
]

export const VALUES_STEP = {
  title: "What you are for",
  blurb: "Nothing to do with the vice yet. This is about how you would like the next few years to go.",
  pickLabel: "Pick the ones that are actually yours",
  pickHelp: "Six or so. Not the ones that sound good — the ones you would be annoyed to lose.",
  topLabel: "Now put three at the top",
  topHelp: "Drag is not needed. Tap three of the ones you picked.",
  livingLabel: "For the top one: what does a week look like when you are living it?",
  livingHelp: "Concrete. A thing somebody watching would see you do.",
  /** Both directions, deliberately, and the helpful half is asked first. */
  servesLabel: "Which of these does it help with?",
  servesHelp: "Genuinely. If the answer is one of them, say so — a flow that will not let you write that is one you will stop trusting.",
  costsLabel: "And which does it get in the way of?",
  costsHelp: "Same honesty in the other direction.",
  closing:
    "No scoring on this screen and no total at the bottom. Two lists, in your handwriting, and what you make of the gap between them is yours.",
} as const

// --------------------------------------------------------------- futures

export interface FutureHorizon {
  id: string
  /** How far out, said the way a person would say it. */
  label: string
  /** A nudge toward something concrete at that distance. */
  hint: string
}

/**
 * The two futures, built as cues rather than as an essay.
 *
 * This is the best-evidenced thing in the flow and the design follows the
 * evidence closely. Imagining a specific personal future event shortens the
 * gap between now and later, and in trials that reliably makes the immediate
 * thing less compelling — it has been run on people with alcohol use disorder
 * and it moved real drinking. What matters is the cue: vivid, specific, first
 * person, one event rather than a summary, and short enough to re-read in the
 * ten seconds before a decision.
 *
 * Which is why these end up on the card and inside the urge tool instead of
 * sitting in a flow somebody finished once in March.
 */
export const HORIZONS: FutureHorizon[] = [
  { id: "1m", label: "This time next month", hint: "An ordinary evening. Where are you, what is in your hand?" },
  { id: "6m", label: "Six months", hint: "Something already in the diary. A birthday, a trip, a Christmas." },
  { id: "2y", label: "Two years", hint: "Far enough that something has changed. Near enough to picture the room." },
  { id: "5y", label: "Five years", hint: "Who is with you, and how old are they by then?" },
]

export const FUTURES = {
  title: "Two versions of later",
  blurb: "Same four dates, twice. Once where nothing changed, once where something did.",
  rules: [
    "One moment, not a summary. A Tuesday evening, not \"my health\".",
    "Present tense, as though you are stood in it.",
    "Somewhere real, with someone real in it.",
    "Short. You are going to read these again at a bad moment, and nobody reads a paragraph at a bad moment.",
  ],
  unchangedLabel: "Nothing changed",
  changedLabel: "Something changed",
  unchangedHelp: "Not a disaster film. Just the same, carried forward.",
  changedHelp: "Not perfect either. Just this one thing different, and what follows from it.",
  /** Deliberately last, so the change version is the one left on screen. */
  order: "The changed one goes second on every row on purpose. It is the one worth having in your head when you close the page.",
  why:
    "Picturing a specific evening you can actually see does something a general intention does not: it shortens the distance between now and then, and the thing in front of you loses a bit of its pull. It has been tested on people who were drinking heavily and it moved what they drank. The catch is that it works at the moment of the decision, so these get carried into the urge tool and onto your card rather than staying here.",
  useNote: "These now show up on your card, and one appears during the ninety seconds in the urge tool.",
} as const

// ---------------------------------------------------------------- letter

/**
 * The letter, in two directions.
 *
 * A goodbye letter is standard issue in treatment and has almost no evidence
 * behind it as such. What does have support is the move underneath — putting
 * the thing outside yourself and addressing it as separate, which is the same
 * mechanism as naming the voice two flows over. So the letter is offered, and
 * the honest note about its provenance is on the screen rather than buried.
 *
 * Order matters. The letter *from* it is offered first and is the default,
 * because a goodbye presumes a decision that this flow has not asked anybody to
 * make. Writing farewell to something you have not decided to leave is an
 * exercise in bad faith, and people can tell.
 */
export const LETTER = {
  title: "The letter",
  blurb: "One of two. They do different jobs, and the first one asks less of you.",
  options: [
    {
      id: "from",
      label: "A letter from it, to you",
      help: "In its voice. Honest about the deal — what it hands over, and what it takes in exchange. Easier than it sounds, and people usually find it comes out fast.",
      prompt: "Write as it. Start with what it would say it does for you, and let it get to the terms.",
      seeds: [
        "I have been here since you were nineteen and I have never once let you down on a bad night.",
        "You know what I want. I want first refusal on every evening you have got left.",
        "I am not the problem. I am the thing that makes the problem bearable, which is different.",
      ],
    },
    {
      id: "to",
      label: "A letter to it, from you",
      help: "The goodbye one. Worth doing when you have already decided, and not much use before that.",
      prompt: "Write to it. What it was for, what it cost, and what you are doing now.",
      seeds: [
        "You were useful once and I am not going to pretend otherwise.",
        "Here is what you actually charged me for it.",
        "I know what you will say when this gets hard.",
      ],
    },
  ],
  /** Shown against the goodbye option before a line has been drawn. */
  earlyNote:
    "You have not drawn a line yet, and a goodbye to something you are still deciding about tends to come out hollow. It is here if you want it. The other one is the better use of twenty minutes today.",
  provenance:
    "Straight about this one: the goodbye letter is everywhere in treatment and has very little research behind it. What does have support is what it is doing underneath — putting the thing outside yourself and talking to it as separate, the same move as giving the voice a name. That is why it is offered rather than required, and why it is last.",
  savedNote: "Kept with everything else, and it goes into the copy-out.",
} as const

// ----------------------------------------------------------------- intro

export const GIVES_INTRO = {
  body: [
    "Everything else in here is about what it costs. This one starts at the other end, because a page that will only let you write the bad things is a page you stop believing around the second screen, and because the good things are real. If it did nothing for you, you would have stopped years ago and none of this would be difficult.",
    "So: what it gives you, in your own words, with no argument. Then a check of each one against your own record rather than against anybody's opinion. Some will hold up. The ones that do are the useful finding, because whatever goes in its place gets judged on whether it covers them.",
    "Then what you are for, separately. Then two versions of later, written so you can actually use them. There is no scoring anywhere in this flow and nothing at the end adds your good things up against your bad ones — that particular exercise makes people more likely to carry on, which is the opposite of the point.",
  ],
  caution: "Nothing here asks you to decide anything, and nothing here is weighed against anything else.",
} as const
