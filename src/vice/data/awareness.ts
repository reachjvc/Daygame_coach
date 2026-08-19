/**
 * The awareness flow's content: the count, the arithmetic, the feedback and the
 * three doors.
 *
 * Why this flow exists at all, in one number. Across three separate waves of the
 * US national household survey, around ninety-five percent of the people who met
 * the clinical criteria for a substance use disorder and did not get any help
 * gave the same reason: they did not think they needed any. Not cost, not
 * waiting lists, not shame — perception. The largest single barrier in the
 * qualitative literature is the flat statement "I do not think I have a
 * problem", at roughly forty-three percent.
 *
 * Every other flow in this module starts after that point. They all assume the
 * person has already worked out what they have got. For the population the
 * numbers above describe, that assumption is the whole failure.
 *
 * Content policy, on top of the rules in copy.ts:
 *
 *  - **The criteria are rebuilt, not reproduced.** The eleven diagnostic
 *    criteria for a substance use disorder are APA text and are copyright. The
 *    underlying constructs are not, and neither is arithmetic. Same call the
 *    module already made for SMART Recovery and Therapist Aid. The AUDIT is
 *    WHO-copyright and free for non-commercial use only, which this is not, so
 *    it is not here either.
 *  - **The count is never a label.** It produces a number and the association
 *    that goes with the number. It does not produce a noun for a person. There
 *    is no screen in this flow that tells anybody what they are.
 *  - **The dependence set only runs on substances.** See IMPACT_CRITERIA.
 */

import type { ViceShape } from "../types"

// ---------------------------------------------------------------- the count

export interface ViceCriterion {
  id: string
  /** Asked in the second person, about the last twelve months. */
  text: string
  /** Shown under it when the item is one people routinely misread. */
  help?: string
}

/**
 * The eleven, for substances.
 *
 * These map one-to-one onto the constructs a clinician counts — impaired
 * control (1–4), social impairment (5–7), risky use (8–9), and pharmacological
 * change (10–11) — written as things that either happened or did not, in the
 * plainest words available. A person can answer all eleven without ever
 * encountering a diagnostic term, which is the point: the words are what people
 * flinch from, and the flinch is what keeps the count from being made.
 */
export const SUBSTANCE_CRITERIA: ViceCriterion[] = [
  { id: "more", text: "Ended up having more, or going on longer, than you meant to." },
  { id: "cutdown", text: "Wanted to cut down, or actually tried to, and it did not hold." },
  { id: "time", text: "A lot of your time goes on getting it, doing it, or getting over it." },
  { id: "craving", text: "Wanted it strongly enough that it crowded out thinking about much else." },
  { id: "roles", text: "Missed something, or made a mess of something, because of it. Work, home, studies." },
  { id: "social", text: "Carried on with it while it was causing trouble with people you care about." },
  { id: "gaveup", text: "Dropped things you used to do, or used to enjoy, to make room for it." },
  {
    id: "risky",
    text: "Done it somewhere it could have hurt you. Driving, water, walking home on your own.",
    help: "Once counts. This one is about exposure, not about how it turned out.",
  },
  { id: "harm", text: "Carried on knowing it was making something worse. A health thing, or your head." },
  {
    id: "tolerance",
    text: "Found you get less out of the same amount than you used to.",
    help: "Or that the amount crept up without you deciding it would.",
  },
  {
    id: "withdrawal",
    text: "Felt it physically when it wore off. Shaking, sweating, queasy, restless, or unable to sleep.",
    help: "This is the one that matters medically as well as diagnostically. See the safety note below.",
  },
]

/**
 * The other set, for screens and behaviours.
 *
 * The dependence criteria deliberately do not run here, and this is the most
 * consequential design decision in the flow.
 *
 * Tolerance and withdrawal have no coherent meaning for scrolling. More
 * seriously: a large share of people who describe themselves as having a porn
 * problem turn out on measurement to have a conflict between the behaviour and
 * their values rather than any dependence, and handing that person a
 * dependence score is how a moral conflict gets converted into a diagnosis they
 * do not have. Compulsive sexual behaviour is classified as an impulse-control
 * problem, and there are no validated severity thresholds for "scrolling" at
 * all — so this set produces a count with no bands attached and says so.
 *
 * Eight items, all impairment and control, none of them about shame. A shame
 * item would load precisely on the people the paragraph above is about. The
 * distinction gets asked separately, in INCONGRUENCE, where it can be answered
 * honestly instead of scored.
 */
export const IMPACT_CRITERIA: ViceCriterion[] = [
  { id: "more", text: "Ended up doing it for longer than you meant to." },
  { id: "cutdown", text: "Tried to cut it back, and it did not hold." },
  { id: "time", text: "It takes time you had meant for something else." },
  {
    id: "automatic",
    text: "You start without really deciding to. The hand moves first.",
    help: "This one is about how it begins, not about how much.",
  },
  { id: "roles", text: "Missed something, or made a mess of something, because of the time it took." },
  { id: "social", text: "It has caused trouble with somebody you care about." },
  { id: "gaveup", text: "You have dropped something you used to enjoy to make room for it." },
  { id: "harm", text: "You have carried on when it was leaving your mood worse rather than better." },
]

export function criteriaFor(shape: ViceShape | null): ViceCriterion[] {
  return shape === "substance" ? SUBSTANCE_CRITERIA : IMPACT_CRITERIA
}

export const COUNT = {
  title: "The count",
  blurb: "In the last twelve months. Each one either happened or it did not, and nobody is marking this.",
  window: "Answer for the last year, not for your worst year.",
  unsureNote:
    "Not sure is a real answer and it stays separate from the count. Some of these genuinely cannot be called from the inside.",
  yes: "Yes",
  no: "No",
  unsure: "Not sure",
  /** Shown above the substance set only. */
  substanceNote:
    "These are the eleven things clinicians actually count, in ordinary words. Answering them is not the same as being diagnosed with anything, and this page cannot do that.",
  /** Shown above the impact set. Different content, different honesty. */
  impactNote:
    "These are about what it costs you and how much control you have over it. They are not a dependence scale — there is no validated one for this, and a page that pretended otherwise would be making it up.",
} as const

/**
 * The two kinds of distress — asked as a trajectory, not a taxonomy.
 *
 * This screen used to ask people to sort themselves into a box: is the bad
 * feeling about what it costs, or about doing it at all? That was built on the
 * moral-incongruence finding, and it got the finding half right.
 *
 * What the accounts actually show is movement, not membership. The dominant
 * pattern is one person travelling: distress about the cost, then adopting the
 * addiction-and-abstinence model to explain it, and then **the model itself
 * becoming the distress**. Somebody bucketed at intake as "it costs me things"
 * may be somewhere else entirely in three months, and the bucket will have
 * handed them the frame that became the problem.
 *
 * Two further reasons the old question could not work:
 *
 *  - **The label hides the type.** Nearly everybody says "addiction" regardless
 *    of which they are, so self-report cannot sort them.
 *  - The incongruence group is under-represented wherever you look for it,
 *    because those people leave these communities. The ones who describe it
 *    came back specially to say so.
 *
 * So: no categories, no scoring, no branch in the product based on the answer.
 * It asks what the feeling is attached to *at the moment*, says plainly that
 * this moves, and names the third possibility — that the framework is doing the
 * damage — which is the one nobody offers.
 */
export const INCONGRUENCE = {
  question: "One more, and it is a different kind of question. What is the bad feeling attached to at the moment?",
  movingNote:
    "At the moment, because this moves. People commonly start with the cost, pick up the language of dependence and powerlessness to explain it, and end up with the language itself as the thing that hurts. Whatever you pick, nothing here branches on it.",
  options: [
    { id: "cost", label: "What it costs me", help: "The time, the money, the things it gets in the way of." },
    { id: "self", label: "That I do it at all", help: "It would bother me even if it cost me nothing." },
    { id: "framing", label: "What I have started calling myself over it", help: "The words more than the behaviour." },
    { id: "both", label: "Honestly, a mix, and it shifts" },
  ] as Array<{ id: string; label: string; help?: string }>,
  notes: {
    cost:
      "The most straightforward of the three, and the one the rest of this module is built for. Worth checking back though — the cost answer is where most people start and few stay.",
    self:
      "Worth separating out. When the distress is about doing it at all rather than about what it costs, the measured amount is often unremarkable, and a quit plan is then aimed at the wrong thing. What is in conflict is the behaviour and a value, and that is a real problem with a different shape — better said out loud to somebody than solved with a tracker.",
    framing:
      "This one is under-described everywhere and it is worth naming. Some people arrive with a manageable cost, adopt a framework that says their brain is broken and they are powerless, and are made considerably worse by the framework. If that is where you are, the useful move may be dropping the vocabulary rather than tightening the plan.",
    both:
      "Usually the case, and the three are worth pulling apart anyway rather than treated as one feeling. The cost half responds to the rest of this module. The other two do not, and it does not require them to.",
  } as Record<string, string>,
} as const

// ---------------------------------------------------------------- the bands

export interface CountBand {
  min: number
  label: string
  /** What the count is associated with, said without attaching it to a person. */
  meaning: string
}

/**
 * What a count is associated with. Substances only.
 *
 * The thresholds are the conventional ones: two is where a clinician starts
 * looking, four to five is described as moderate, six and above as severe.
 * `label` describes the count. It is never rendered next to the word "you".
 */
export const COUNT_BANDS: CountBand[] = [
  {
    min: 6,
    label: "six or more",
    meaning:
      "A count in this range is the one described as severe. It is also the range where going it alone has the poorest record, and where most of what does work comes from another person rather than from a page.",
  },
  {
    min: 4,
    label: "four or five",
    meaning:
      "A count in this range is the one described as moderate. It is well past where a clinician would want a conversation, and comfortably inside the range where people resolve it, with help and without.",
  },
  {
    min: 2,
    label: "two or three",
    meaning:
      "Two is where clinicians start paying attention. A count here is the mild range, which is also the range this kind of page is most use for.",
  },
  {
    min: 0,
    label: "under two",
    meaning:
      "Below where a clinician would call it anything. That does not make it nothing — a habit can cost you plenty without meeting a single one of these — and the arithmetic on the next screen may still be worth looking at.",
  },
]

export const FEEDBACK = {
  title: "What that adds up to",
  blurb: "Your numbers, the association that goes with them, and no opinion about you.",
  /** Asked BEFORE anything is shown. Reversing this turns feedback into a row. */
  elicitFirst: "Before this shows you anything: what do you expect it to say?",
  elicitAfter: "And now that you have seen it?",
  countLabel: "things counted",
  unsureLabel: "you were not sure about",
  /** The single most important sentence on the screen. */
  notADiagnosis:
    "This is a count of things you told a web page, which is not a diagnosis and cannot become one. What it is good for is deciding whether the conversation is worth having with somebody who can.",
  /**
   * The counterweight, and it is not optional.
   *
   * Roughly nine percent of US adults report having resolved a significant
   * alcohol or drug problem — around 22 million people — and about 46% of them
   * did it with no formal help of any kind. Only 46% describe themselves as
   * being in recovery. A screen that produces a high number and no context is
   * just a scare, and a scared person closes the tab.
   */
  resolvable:
    "The other number worth having next to it: of everybody who has resolved one of these, a little under half did it without any formal help at all, and only about half of them describe themselves as being in recovery. A high count says the thing is real. It does not say you are stuck with it, it does not say there is only one door, and it does not oblige you to take on a word for yourself.",
  /** Shown when the withdrawal item came back yes. Routes to the interlock. */
  withdrawalFlag:
    "You marked the physical one. With drinking and with benzodiazepines that is the item that matters medically as well as diagnostically, and stopping abruptly on your own can be dangerous. Worth a conversation with a doctor before any date goes in the diary.",
  impactNote:
    "No bands on this one, because there is no honest set to use. What you have is a count of costs, and the costs are the part worth looking at.",
} as const

// ---------------------------------------------------------------- arithmetic

export const USAGE = {
  title: "What a week actually holds",
  blurb: "Four small numbers. Built up rather than estimated, because the estimate and the arithmetic rarely match.",
  why:
    "Asked this way on purpose. A straight question about your weekly total gets answered from your sense of yourself; days times amount gets answered from memory, and the two come out a long way apart.",
  days: { label: "Days in a normal week it happens at all", placeholder: "4" },
  perDay: { label: "How many on one of those days", placeholder: "5" },
  cost: { label: "Roughly what one costs you", placeholder: "6" },
  minutes: { label: "Minutes it takes on one of those days", help: "Including getting ready for it and getting over it.", placeholder: "180" },
  /** Their guess, taken before the total appears. */
  guess: { label: "Before the arithmetic: what would you have said a year of this costs?", placeholder: "1200" },
  reveal: "The arithmetic",
  perWeek: "a week",
  perYear: "a year",
  daysOfYear: "days of the year, awake, spent on it",
  guessGap: "You said {guess}. The arithmetic says {actual}.",
  guessClose: "Close to what you guessed, which is worth knowing too — a lot of people are out by a factor of two or three.",
  noCurrencyNote: "Money is optional. Leave it blank if it does not cost anything and the hours will still add up.",
} as const

// ---------------------------------------------------------------- trajectory

/**
 * The timeline, and the reason it is the last question rather than the first.
 *
 * A count and a weekly total are both single points. Direction of travel is the
 * thing neither of them can see, and it is frequently the more informative of
 * the two — a moderate count that has doubled in two years is a different
 * situation from a high one that has been flat for ten, and no screening
 * instrument in use can tell them apart.
 */
export const TRAJECTORY = {
  title: "Which way it is going",
  blurb: "The count is a snapshot. This is the part a snapshot cannot show, and it is often the more useful half.",
  fields: [
    { id: "where.started", label: "When did it start, roughly, and what was going on then?", rows: 2, minWords: 4 },
    { id: "where.for-then", label: "What was it for, back then?", help: "There was a reason. There usually was a good one.", rows: 2, minWords: 3 },
    { id: "where.for-now", label: "And what is it for now?", help: "If the answer is different from the one above, that difference is the finding.", rows: 2, minWords: 3 },
    { id: "where.stepped", label: "When did it last go up a level?", help: "More often, more at a time, earlier in the day, or somewhere it did not used to happen.", rows: 2 },
    { id: "where.five", label: "Same rate of change, five years on. What does that look like?", rows: 3, minWords: 5 },
  ],
  closing:
    "Nothing on this screen is a prediction. Rates of change do not hold, and plenty of people's have turned round. It is here because the direction is the part you can only see by looking back on purpose.",
} as const

// ---------------------------------------------------------------- the doors

/**
 * The three ways out, presented flat.
 *
 * Deliberately not a recommendation, and deliberately not ordered by severity.
 * A flow that spends fifteen minutes establishing that somebody is the
 * authority on their own situation and then tells them what to do about it has
 * undone itself on the last screen.
 */
export const DOORS = {
  title: "So what now",
  blurb: "Three of them. This page does not have a view about which, and it is not going to pretend otherwise.",
  reflect: { id: "where.made-of-it", label: "Before you pick: what do you make of all that?", rows: 3 },
  options: [
    {
      id: "watch",
      label: "Keep watching it",
      help: "No change to anything. Log the next couple of weeks and let the numbers accumulate.",
      to: "map" as const,
    },
    {
      id: "change",
      label: "Change something",
      help: "An experiment, a line, or a rearranged week. Three ways, described honestly.",
      to: "hub" as const,
    },
    {
      id: "help",
      label: "This is past what a page can do",
      help: "What treatment actually is, what it costs, and who to ring. Including if the answer is right now.",
      to: "help" as const,
    },
  ],
} as const

// ---------------------------------------------------------------- the intro

export const WHERE_INTRO = {
  body: [
    "You are the worst-placed person to judge this, and that is not a remark about you. It is the one reliable finding in the area.",
    "Across three waves of the national household survey, about ninety-five percent of the people who turned out to meet the clinical criteria, and who got no help, gave the same reason for not getting any: they did not think they needed it. Not cost. Not waiting lists. Not shame. They looked, and it did not look bad.",
    "So the instrument nearly everybody uses — asking yourself whether it is bad — is the one instrument that is known not to work on this. Which is annoying, and also fixable, because counting is not the same as judging.",
    "This flow asks what happened, counts it, does some arithmetic, and shows you the result. There is no label at the end. Nothing on it can be failed, nothing is sent anywhere, and there is no decision waiting at the bottom.",
  ],
  caution: "No screen in this flow diagnoses anything, because no web page can. A count is a count.",
} as const
