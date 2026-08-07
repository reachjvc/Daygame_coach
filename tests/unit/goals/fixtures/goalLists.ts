/**
 * Ten written goal lists, from ten people who are not us.
 *
 * These exist to answer one question: does intake hold up for arbitrary users,
 * or only for the lists its author happened to test against? They were written
 * BEFORE the parser work they gate, so the expectations describe what SHOULD
 * happen, not what the code happened to do.
 *
 * Each line declares only the fields it is there to prove. The global
 * invariants in `goalIntakeShapes.test.ts` apply to every line in every list.
 *
 * Deliberately NOT included: this repo owner's own goal list. It drove the
 * investigation; using it as the gate would prove only that we fixed his lines.
 */

import type { VisionGoalType, GoalRoute } from "@/src/goals/types"

export interface FixtureLine {
  text: string
  /** Expected shape. Omit a field to assert nothing about it. */
  type?: VisionGoalType
  daysPerWeek?: number
  unit?: string
  start?: number
  target?: number
  protocol?: string
  route?: GoalRoute
  monthly?: boolean
  /** Why this line is in the corpus — the rule it exercises. */
  proves?: string
}

export interface FixtureList {
  id: string
  /** The archetype, so a failure says who it breaks for. */
  who: string
  /** Heading the user wrote above this block, as it would be pasted. */
  heading: string
  areaId: string
  lines: FixtureLine[]
}

export const GOAL_LIST_FIXTURES: FixtureList[] = [
  {
    id: "lifter",
    who: "Trains seriously; most of the list is loaded barbell work",
    heading: "Training",
    areaId: "lm_fitness",
    lines: [
      { text: "Bench 80 kg, 3x6-8", type: "milestone_ladder", unit: "kg", target: 80, protocol: "3×6-8", proves: "weight is the measure, sets×reps is protocol, neither is the unit" },
      { text: "Squat 120 kg, 5x5", type: "milestone_ladder", unit: "kg", target: 120, protocol: "5×5" },
      { text: "Deadlift 140 kg", type: "milestone_ladder", unit: "kg", target: 140 },
      { text: "Skullcrushers, 30 kg, 2x8-10", type: "milestone_ladder", unit: "kg", target: 30, protocol: "2×8-10", proves: "punctuation must not defeat unit detection" },
      { text: "10 pull-ups, from 6", type: "milestone_ladder", start: 6, target: 10, proves: "baseline survives" },
      { text: "1 muscle up", type: "achievement", proves: "a named achievement beats a leading count" },
      { text: "Gym 4 days a week", type: "habit_ramp", daysPerWeek: 4 },
      { text: "Protein every day", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Body fat from 22% to 14%", type: "milestone_ladder", unit: "%", start: 22, target: 14, proves: "descending ladder" },
      { text: "Sleep 8 hours every night", type: "habit_ramp", daysPerWeek: 7, proves: "'every night' is a daily rhythm, not an 8-hour target" },
      { text: "Stretch 3 times a week", type: "habit_ramp", daysPerWeek: 3 },
      { text: "Compete in one powerlifting meet", type: "achievement" },
      { text: "I am an athlete, not someone who goes to the gym", route: "identity" },
      { text: "Remember: the point is still lifting at 60", route: "rule" },
    ],
  },
  {
    id: "founder",
    who: "Solo software founder, first year",
    heading: "Business",
    areaId: "lm_mission",
    lines: [
      { text: "Reach $10,000 monthly recurring revenue", type: "milestone_ladder", unit: "$", target: 10000 },
      { text: "Ship the MVP", type: "achievement" },
      { text: "Get 100 paying users", type: "milestone_ladder", target: 100 },
      { text: "Publish 2 blog posts per week", type: "habit_ramp", daysPerWeek: 2, proves: "'per week' is a rhythm — the bug that started this" },
      { text: "Send 20 cold emails a week", type: "habit_ramp", daysPerWeek: 7, proves: "a weekly volume above 7 floors at daily; the count stays in the title" },
      { text: "Hire my first contractor", type: "achievement" },
      { text: "Talk to 5 customers every week", type: "habit_ramp", daysPerWeek: 5 },
      { text: "Cut churn from 8% to 3%", type: "milestone_ladder", unit: "%", start: 8, target: 3 },
      { text: "Review the numbers weekly", type: "habit_ramp", daysPerWeek: 1, proves: "bare 'weekly'" },
      { text: "Get the company registered", type: "achievement" },
      { text: "Write the terms of service", type: "achievement" },
      { text: "Be the #1 tool in my category", route: "horizon-want", proves: "a verdict other people deliver is not a one-year goal" },
      { text: "I am a founder who ships", route: "identity" },
    ],
  },
  {
    id: "student",
    who: "Final-year undergraduate applying to graduate school",
    heading: "School",
    areaId: "lm_mission",
    lines: [
      { text: "Finish my thesis", type: "achievement" },
      { text: "Read 30 pages every day", type: "habit_ramp", daysPerWeek: 7 },
      { text: "GPA from 3.1 to 3.6", type: "milestone_ladder", start: 3.1, target: 3.6, proves: "decimal baselines" },
      { text: "Pass the statistics exam", type: "achievement" },
      { text: "Learn 500 Spanish words", type: "milestone_ladder", target: 500 },
      { text: "Study 5 days a week", type: "habit_ramp", daysPerWeek: 5 },
      { text: "Apply to 10 grad programmes", type: "milestone_ladder", target: 10 },
      { text: "Cut screen time from 5 hours to 2", type: "milestone_ladder", start: 5, target: 2 },
      { text: "Go to office hours twice a month", monthly: true, proves: "monthly is flagged, not rounded to weekly" },
      { text: "Present at one conference", type: "achievement" },
      { text: "Get better at academic writing", type: "habit_ramp", proves: "a gradable comparative stays a practice" },
      { text: "I am a serious researcher", route: "identity" },
      { text: "Never start an essay the night before", route: "rule" },
    ],
  },
  {
    id: "new-parent",
    who: "First child, four months old",
    heading: "Family",
    areaId: "lm_family",
    lines: [
      { text: "Sleep 7 hours a night", type: "habit_ramp", daysPerWeek: 7 },
      { text: "One date night a month", monthly: true },
      { text: "Walk with the baby every day", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Cook 4 dinners a week", type: "habit_ramp", daysPerWeek: 4 },
      { text: "Save $5,000 emergency fund", type: "milestone_ladder", unit: "$", target: 5000, proves: "thousands separators" },
      { text: "Read to her every night", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Take a proper holiday", type: "achievement" },
      { text: "Call my mum weekly", type: "habit_ramp", daysPerWeek: 1 },
      { text: "Lose 10 kg", type: "milestone_ladder", unit: "kg", target: 10 },
      { text: "Get back to the gym 2 times a week", type: "habit_ramp", daysPerWeek: 2, proves: "a cadence beats the achievement verb that precedes it" },
      { text: "Be a patient father", route: "identity" },
      { text: "Remember she is only this age once", route: "rule" },
    ],
  },
  {
    id: "rehab",
    who: "Nine months after a knee reconstruction",
    heading: "Health",
    areaId: "lm_health",
    lines: [
      { text: "No pain in my left knee", type: "achievement", proves: "a state with no action in it — M8 must ask how" },
      { text: "Full range of motion in the knee", type: "achievement", proves: "same shape, different words" },
      { text: "Physio 3 times a week", type: "habit_ramp", daysPerWeek: 3 },
      { text: "Walk 8,000 steps every day", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Get back to squatting bodyweight", type: "achievement" },
      { text: "Stretch every morning", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Swim once a week", type: "habit_ramp", daysPerWeek: 1, proves: "word numerals" },
      { text: "Cut painkillers from 4 a day to 0", type: "milestone_ladder", start: 4, target: 0, proves: "descending to zero" },
      { text: "See the physio every month", monthly: true },
      { text: "Walk after every meal", type: "habit_ramp", daysPerWeek: 3, proves: "'every meal' is NOT a cadence — negative case" },
      { text: "I am someone who rehabs properly rather than rushing back", route: "identity" },
      { text: "Remember that pain is information", route: "rule" },
    ],
  },
  {
    id: "switcher",
    who: "Leaving accounting for software, self-taught",
    heading: "Career",
    areaId: "lm_mission",
    lines: [
      { text: "Land a junior developer job", type: "achievement" },
      { text: "Build 3 portfolio projects", type: "milestone_ladder", target: 3 },
      { text: "Solve 5 LeetCode problems a week", type: "habit_ramp", daysPerWeek: 5 },
      { text: "Send 100 applications", type: "milestone_ladder", target: 100 },
      { text: "Coffee chat with 2 people a month", monthly: true },
      { text: "Learn TypeScript", type: "habit_ramp", proves: "'learn X' with no number is a practice" },
      { text: "Get better at system design", type: "habit_ramp" },
      { text: "Finish the CS50 course", type: "achievement" },
      { text: "Rewrite my CV", type: "achievement" },
      { text: "Contribute to one open source project", type: "achievement", proves: "a count of one is a checkbox, not a five-rung ladder to 1" },
      { text: "Save 6 months of runway", type: "milestone_ladder", target: 6 },
      { text: "I am a developer who happens to be new", route: "identity" },
    ],
  },
  {
    id: "single",
    who: "Single, wants a relationship, starting from very little practice",
    heading: "Dating",
    areaId: "lm_relationship",
    lines: [
      { text: "Go on 12 dates", type: "milestone_ladder", target: 12 },
      { text: "Approach 5 women a week", type: "habit_ramp", daysPerWeek: 5 },
      { text: "Get a girlfriend", type: "achievement", proves: "an outcome needing someone else's yes is binary, never a ladder" },
      { text: "One social event every week", type: "habit_ramp", daysPerWeek: 1 },
      { text: "Take a dance class", type: "achievement" },
      { text: "Reply to messages the same day", type: "habit_ramp", proves: "'the same day' is not a daily cadence" },
      { text: "Text her back within a day", type: "habit_ramp", proves: "'within a day' is NOT daily — negative case" },
      { text: "Ask for the number every time it goes well", type: "habit_ramp", proves: "'every time' is NOT a cadence — negative case" },
      { text: "Improve my photos", type: "habit_ramp" },
      { text: "Be relaxed around women I find attractive", route: "identity" },
      { text: "Be the kind of man women feel safe around", route: "identity" },
      { text: "Remember rejection is information, not a verdict", route: "rule" },
    ],
  },
  {
    id: "debt",
    who: "Paying down consumer debt on a normal salary",
    heading: "Money",
    areaId: "lm_money",
    lines: [
      { text: "Pay off $18,000 of debt", type: "milestone_ladder", unit: "$", target: 18000 },
      { text: "Cut the credit card from $4,200 to $0", type: "milestone_ladder", unit: "$", start: 4200, target: 0, proves: "descending, with currency on both ends" },
      { text: "Credit score from 610 to 750", type: "milestone_ladder", start: 610, target: 750 },
      { text: "Build a $2,000 emergency fund", type: "milestone_ladder", unit: "$", target: 2000 },
      { text: "Earn my first $500 online", type: "milestone_ladder", unit: "$", target: 500 },
      { text: "Track every expense weekly", type: "habit_ramp", daysPerWeek: 1 },
      { text: "Review the budget every Sunday", type: "habit_ramp", daysPerWeek: 1, proves: "a named weekday is a weekly rhythm" },
      { text: "Cancel 3 subscriptions", type: "milestone_ladder", target: 3 },
      { text: "Become debt free", type: "achievement" },
      { text: "No takeaway food", type: "achievement", proves: "'no X' is a state, never a rule — cueing rules on 'no' would swallow 'No pain in my knee'" },
      { text: "Save 20% of every paycheque", type: "milestone_ladder", unit: "%", target: 20 },
      { text: "I am someone who is good with money", route: "identity" },
      { text: "Remember why I started this", route: "rule" },
    ],
  },
  {
    id: "musician",
    who: "Writes and plays; wants it to be more than a hobby",
    heading: "Music",
    areaId: "lm_fun",
    lines: [
      { text: "Release my first album", type: "achievement", proves: "an ordinal is not a measure" },
      { text: "Write 50 songs", type: "milestone_ladder", target: 50 },
      { text: "Practise guitar every day", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Play 10 open mics", type: "milestone_ladder", target: 10 },
      { text: "Reach 1,000 monthly listeners", type: "milestone_ladder", target: 1000 },
      { text: "Record one demo a month", monthly: true },
      { text: "Learn 20 covers", type: "milestone_ladder", target: 20 },
      { text: "Get better at singing", type: "habit_ramp" },
      { text: "Land a festival slot", type: "achievement" },
      { text: "Post a clip 3 times a week", type: "habit_ramp", daysPerWeek: 3 },
      { text: "Be the biggest band in this city", route: "horizon-want" },
      { text: "Never turn down a gig in the first year", route: "rule" },
    ],
  },
  {
    id: "condition",
    who: "Type 2 diabetes, newly diagnosed",
    heading: "Health",
    areaId: "lm_health",
    lines: [
      { text: "A1c from 7.2 to 6.0", type: "milestone_ladder", start: 7.2, target: 6.0, proves: "descending decimals" },
      { text: "Take my medication every morning", type: "habit_ramp", daysPerWeek: 7 },
      { text: "Lose 10 kg", type: "milestone_ladder", unit: "kg", target: 10 },
      { text: "Blood sugar under 8 before bed", type: "achievement", proves: "descending with no baseline stays binary — we never invent a start" },
      { text: "Cook at home 5 days a week", type: "habit_ramp", daysPerWeek: 5 },
      { text: "30 minutes of movement every day", type: "habit_ramp", daysPerWeek: 7 },
      { text: "See the endocrinologist every month", monthly: true },
      { text: "Get my blood pressure into the normal range", type: "achievement" },
      { text: "Read one book about diabetes", type: "achievement" },
      { text: "Walk after every meal", type: "habit_ramp", proves: "negative case, second list — the rule must not be list-specific" },
      { text: "I am someone managing a condition, not a patient", route: "identity" },
      { text: "Remember this is a marathon, not a sprint", route: "rule" },
    ],
  },
]

/** Every line across every list — the corpus the invariants run over. */
export const ALL_FIXTURE_LINES: Array<FixtureLine & { listId: string; areaId: string }> =
  GOAL_LIST_FIXTURES.flatMap((l) => l.lines.map((ln) => ({ ...ln, listId: l.id, areaId: l.areaId })))

/** The lists rendered back as pasteable text, headings included — the actual
 * input a user gives `parseGoalList`. */
export function fixtureAsPastedText(list: FixtureList): string {
  return [list.heading, ...list.lines.map((l) => l.text)].join("\n")
}
