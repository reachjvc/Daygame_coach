/**
 * The teaching spine.
 *
 * Everything in this module before now was a toolbox: reactive tools you open
 * when something is happening, two assessment flows, a checklist and a
 * library. All of it useful, none of it *teaching* anything. There was no
 * sequence, nothing that said what a person would understand afterwards, and
 * the strongest findings in the corpus were buried inside `Why` disclosures on
 * screens people only reach in a crisis.
 *
 * So: nine modules. Each is one idea, one exercise and real accounts of it —
 * in that order, because the idea is what makes the exercise worth doing and
 * the accounts are what make the idea believable.
 *
 * ## The rules that shape them
 *
 * - **Ordered by what generates awareness, not by what a programme would do
 *   first.** The count comes before any technique, because ~95% of people who
 *   met criteria and got no help said they did not think they needed any.
 *   Nothing here asks for a decision until module 6.
 * - **Every module reuses an exercise that already exists.** A module is a
 *   frame around a tool, never a new place to put the same work.
 * - **No module is a prerequisite for another.** People arrive mid-arc and
 *   the corpus is explicit that readiness-gating is contradicted — two durable
 *   quits in it began with no desire to stop at all.
 * - **`takeaway` is the honest one-line summary**, and it is written so that
 *   somebody who reads only that line has still got the useful part.
 */

import type { ViceToolId } from "../types"
import type { TestimonialStage } from "./testimonials"

export interface ViceModule {
  id: string
  /** Short enough to scan in a list of nine. */
  title: string
  /** What this one is about, in a sentence. */
  premise: string
  /** The single thing worth keeping if they read nothing else. */
  takeaway: string
  /** The evidence, folded away. Named sources, no hand-waving. */
  evidence: string
  /** What to actually do, and where. */
  exercise: { label: string; tool?: ViceToolId; flow?: string; href?: string }
  /** Which accounts to show under it. */
  accounts: TestimonialStage
  /** Rough honest minutes for the exercise, not for the reading. */
  minutes: number
}

export const MODULES: ViceModule[] = [
  {
    id: "cannot-see",
    title: "You cannot see this one from inside",
    premise:
      "The instrument nearly everybody uses — asking yourself whether it is bad — is the one instrument known not to work on this.",
    takeaway: "Counting is not the same as judging, and it is the part you can actually do.",
    evidence:
      "Across three waves of the US national household survey, around ninety-five percent of the people who met the clinical criteria and got no help gave the same reason: they did not think they needed any. Not cost, not waiting lists, not shame. The largest single barrier in the qualitative literature is the flat statement 'I do not think I have a problem', at roughly forty-three percent.",
    exercise: { label: "Count it, and do the arithmetic", flow: "where" },
    accounts: "deciding",
    minutes: 15,
  },
  {
    id: "what-it-gives",
    title: "What it actually gives you",
    premise:
      "If it did nothing for you, you would have stopped years ago. The useful question is which of the things it promises survive contact with your own record.",
    takeaway: "Whatever goes in its place gets judged on whether it covers the ones that hold up.",
    evidence:
      "The balanced-placebo experiments handed people drinks and lied about the contents in both directions; a great deal of what everyone attributes to the drug tracked what the person believed they had been given. Expectancy work moves behaviour and then fades: in the college trials the effect is gone by about four weeks — unless the evidence is the person's own log, which keeps arriving.",
    exercise: { label: "Rate them, then check them", flow: "gives" },
    accounts: "deciding",
    minutes: 20,
  },
  {
    id: "environment",
    title: "The room matters more than the resolve",
    premise:
      "The strongest single mechanism in the research is not psychological. It is where you are and what is within reach.",
    takeaway: "Change one route, one room or one shop before you change your mind about anything.",
    evidence:
      "Environment beats disposition across five studies. Robins' Vietnam cohort is the extreme case: the same men, the same drug, a changed setting — twenty percent withdrawal-symptomatic in country, under one percent re-addicted at home. Among untreated resolvers, changing contexts is the top theme at 69.2%.",
    exercise: { label: "Work through the ten, top down", href: "/test/quit-vice/shortlist" },
    accounts: "early",
    minutes: 10,
  },
  {
    id: "someone-else",
    title: "A constraint you can undo alone is not a constraint",
    premise: "The barriers that held in the accounts are the ones somebody else controlled.",
    takeaway: "Give one person the key, and give them a script rather than an announcement.",
    evidence:
      "Gambling blockers are defeated by offshore sites, VPNs and app-offloading, and self-exclusion lists go unenforced — one man's jackpot was voided rather than his entry prevented. Porn blockers 'work only when someone else holds the key'. Money separation to a trusted person outranks every piece of software. Telling one person outperforms telling everybody: one man told his boss, HR and his parents in a single morning and relapsed at day thirty.",
    exercise: { label: "Decide who holds what", href: "/test/quit-vice/shortlist" },
    accounts: "early",
    minutes: 10,
  },
  {
    id: "the-moment",
    title: "What to do when it is actually happening",
    premise:
      "There is more than one right answer, and which one fits depends on the room you are standing in.",
    takeaway: "In a room full of the cue, moving your attention away beats putting it on the urge.",
    evidence:
      "Urge surfing is the standard clinical term and is nearly absent from the largest peer community — four mentions against ten for playing the tape forward, which that community explicitly teaches newcomers. People report observation *extending* the urge, or the urge being too fast to catch at all. A practitioner who uses it says plainly that in a cue-rich room the skilful move is to redirect attention away.",
    exercise: { label: "Run it once now, while nothing is happening", tool: "urge" },
    accounts: "urge",
    minutes: 3,
  },
  {
    id: "good-stretch",
    title: "The dangerous week is the good one",
    premise:
      "Relapse in the accounts rarely arrives in a crisis. It arrives when things have been going well and that gets read as proof the problem is solved.",
    takeaway: "Treat 'I'll be fine' as a red flag rather than a green one, and write the rule while you are calm.",
    evidence:
      "Eight independent sources and five substances: 'now I can finally moderate', arriving at day four when symptoms lift, at ten days and two months for cannabis, at six months and a year for nicotine, and at nine years in one case. An RCT gives it a mechanism — positive affect predicted urge, which predicted intoxication. The signal separating durable from fragile was whether the plan rested on structure or on self-trust: one man failed at day seventy-two because his confidence came back.",
    exercise: { label: "Write the tripwire", tool: "tripwire" },
    accounts: "goodStretch",
    minutes: 5,
  },
  {
    id: "after",
    title: "A lapse is information about a method",
    premise: "Not a verdict about a person, and not a reason to start a counter again.",
    takeaway: "The rule that finally works is learned from the specific way the last attempt ended.",
    evidence:
      "Seven independent sources, from camps that agree on almost nothing, say a resetting counter does damage: two memoirists from opposite theoretical positions, craving-post volume that spikes on exactly the thirty-day and one-year marks, somebody who relapsed on their six-month mark, and a man at 495 days writing that clean time can become its own fixation. Users propose their own replacement — measure how fast you came back, not how long you went.",
    exercise: { label: "Debrief one, at the level of what happened", tool: "lapse" },
    accounts: "lapse",
    minutes: 10,
  },
  {
    id: "tried-before",
    title: "What was different the time it worked",
    premise:
      "Most people who get there have several attempts behind them. The differences they name are structural, every time.",
    takeaway: "Conspicuously absent from every one of those accounts: more motivation, more facts, better reasons.",
    evidence:
      "Five themes recur: the internal argument was over before day one — less need for willpower, not more; absolutism about the first one, learned from the specific prior failure; a pharmacological change rather than a psychological one, with one man failing dozens of times then succeeding first try on medication; removing the second substance; and a changed cue set. Counter-evidence kept: one man succeeded at the worst moment of his life describing himself as having the weakest will of anyone.",
    exercise: { label: "Review the last attempt", tool: "again" },
    accounts: "lapse",
    minutes: 10,
  },
  {
    id: "others",
    title: "Reading other people is itself the technique",
    premise: "Not a break from the work. In the one community with genuinely good outcomes it was the work.",
    takeaway: "Read them at the moment of craving, not only when you are calm and curious.",
    evidence:
      "Reading other people's stories was the most-valued feature at 80.8% in the online quitting community with good measured outcomes; its live chat room was rated least valuable at 19.6%. Independently, 'read other people's accounts at the moment of craving' turns up as a named technique among people recovering from opioid use. And the caution that goes with it: engagement volume predicts nothing good across three designs, and a high proportion of recovery-focused activity carries five times the hazard of a use episode. One to three hours a week is the dose that worked.",
    exercise: { label: "Read a few, and the techniques under them", tool: "voices" },
    accounts: "long",
    minutes: 10,
  },
]

export const MODULES_COPY = {
  title: "Nine things worth understanding",
  blurb: "One idea each, one exercise, and people who have been through it. In this order, but nothing is locked.",
  /** Stated once, at the top, because it changes how the list should be read. */
  frame:
    "Ordered by what tends to generate awareness rather than by what a programme would do first — the count comes before any technique, and nothing here asks you to decide anything until the sixth one. Nothing is a prerequisite. People arrive part-way through, and two of the durable quits in this research began with no wish to stop at all.",
  takeawayLabel: "The short of it",
  evidenceLabel: "where this comes from",
  accountsLabel: "Somebody who was here",
  doneLabel: "read",
  progressNote: "Marks what you have read. It is not a score, and skipping is a normal way to use this.",
  ejectNote:
    "Nine is the whole list. There is deliberately no tenth, no daily module and no reason to be here every day — a high proportion of time spent in recovery material is associated with worse outcomes, not better.",
} as const
