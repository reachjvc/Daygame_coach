/**
 * The worked example plan — the pace-setter. Audience research showed the
 * single thing that makes people do their own plan is seeing a real filled-in
 * one ("I do mine right after watching yours"). Loaded on demand into the
 * sandbox; clearly labeled; Reset clears it like anything else.
 *
 * Pure builder — `today` is passed in so tests stay deterministic.
 */

import type { VisionPlanState } from "../types"

export const EXAMPLE_VISION =
  "I want to wake up strong and clear-headed, run a business that pays for my life, and be surrounded by people I love"

function shift(today: string, days: number): string {
  const [y, m, d] = today.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function buildExamplePlan(today: string): VisionPlanState {
  const start = shift(today, -15)
  const far = shift(today, 300)
  return {
    vision: EXAMPLE_VISION,
    intents: [
      { id: "intent-0", text: "wake up strong and clear-headed", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e", objectiveId: null, objectiveLabel: null, confidence: 0.55, spans: [{ text: "wake up strong and clear-headed", start: 10, end: 41 }] },
      { id: "intent-1", text: "run a business that pays for my life", pillarId: "wealth", pillarLabel: "Wealth", pillarColor: "#a855f7", objectiveId: null, objectiveLabel: null, confidence: 0.6, spans: [{ text: "run a business that pays for my life", start: 43, end: 79 }] },
      { id: "intent-2", text: "be surrounded by people I love", pillarId: "relations", pillarLabel: "Relations", pillarColor: "#f43f5e", objectiveId: null, objectiveLabel: null, confidence: 0.5, spans: [{ text: "be surrounded by people I love", start: 85, end: 115 }] },
    ],
    goals: [
      {
        id: "ex-g1", title: "Train until it's who I am", pillarId: "health", pillarLabel: "Health", pillarColor: "#22c55e",
        objectiveId: null, objectiveLabel: null, type: "habit_ramp",
        why: "Everything I want runs on this body. Energy first, everything else second.",
        painWhy: "Another year of coffee-powered afternoons and a back that complains when I tie my shoes.",
        sourceIntentIds: ["intent-0"],
        habits: [{ id: "ex-g1-h0", title: "Strength session", daysPerWeek: 3, sourceTargetId: null }],
        tasks: [], measure: null, rampSteps: [{ frequencyPerWeek: 2, durationWeeks: 2 }, { frequencyPerWeek: 3, durationWeeks: 4 }],
        targetDate: null, beliefLevel: 9, desireLevel: 9, smartSentence: null, areaId: null,
      },
      {
        id: "ex-g2", title: "First $3k month from my own work", pillarId: "wealth", pillarLabel: "Wealth", pillarColor: "#a855f7",
        objectiveId: null, objectiveLabel: null, type: "milestone_ladder",
        why: "Every dollar from my own work is a vote for the life I said I want.",
        painWhy: "Ten more years of building someone else's dream on rented time.",
        sourceIntentIds: ["intent-1"],
        habits: [{ id: "ex-g2-h0", title: "Deep work 90 min before email", daysPerWeek: 5, sourceTargetId: null }],
        tasks: [{ id: "ex-g2-t0", title: "Ship the one-page offer", dueOffsetDays: 7 }],
        measure: { unit: "$/month", start: 0, target: 3000, steps: 5 }, rampSteps: null,
        targetDate: far, beliefLevel: 7, desireLevel: 10,
        smartSentence: `I will easily reach at least 3000 $/month from my own work — to buy back my time — by ${far}.`,
        areaId: null,
        reward: "Weekend cabin trip, phone off, the day the first $3k month closes.",
        stake: "Miss the quarter milestone → no streaming subscriptions until it's hit.",
        obstacles: "Client work eating mornings → deep-work block is BEFORE email, non-negotiable. Doubt spiral → re-read the 100 reasons.",
        reasonsList: [
          "Because rented time never compounds",
          "Because I want to choose my Mondays",
          "Because my kids should see it's possible",
        ],
      },
      {
        id: "lp-lm_family-g0", title: "Sunday call home, every week", pillarId: "relations", pillarLabel: "Relations", pillarColor: "#f43f5e",
        objectiveId: null, objectiveLabel: null, type: "habit_ramp",
        why: "They won't be here forever, and neither will I.",
        sourceIntentIds: [],
        habits: [{ id: "lp-lm_family-g0-h0", title: "Call home", daysPerWeek: 1, sourceTargetId: null }],
        tasks: [], measure: null, rampSteps: [{ frequencyPerWeek: 1, durationWeeks: 4 }],
        targetDate: null, beliefLevel: 10, desireLevel: 8, smartSentence: null, painWhy: null, areaId: "lm_family",
      },
    ],
    priorityIds: ["ex-g1", "ex-g2", "lp-lm_family-g0"],
    dailyBudget: 4,
    confirmed: true,
    areaOrder: ["health", "wealth", "relations"],
    deselectedAreas: [],
    committedAt: start,
    manifestoName: "Sam",
    // Authored credo: two lines in Sam's own voice + one adopted from Stefan's
    // worked example — the pattern the gate teaches (write yours, adopt sparingly).
    manifestoLines: [
      "I show up on the days I don't feel like it — those are the ones that count.",
      "I finish what I start or I consciously drop it — never silently.",
      "I do what I say and I keep my word.",
    ],
    values: ["Freedom", "Health", "Family", "Growth", "Integrity"],
    awayValues: ["Being controlled", "Stagnation", "Regret"],
    valueRules: [
      "I feel freedom anytime I choose my next hour on purpose.",
      "I feel healthy anytime I do anything that increases my energy — a walk, water, a real meal.",
      "I experience regret only if I were to consistently see the lesson and refuse to use it.",
    ],
    drivingForce: {
      purpose: "To grow every single day and give more than I take — so the people around me rise too.",
      reasons: ["freedom", "growth", "family", "peace"],
      identity: ["I am disciplined", "I am a builder", "I am someone who keeps their word"],
      mission: "I, Sam, see, know, hear and feel that the purpose of my life is to be fully alive and growing, and to build things that make the people around me stronger.",
      conduct: ["To be playful", "To be honest even when it costs", "To finish what I start", "To be grateful out loud"],
      primaryQuestion: "How can I make this the day future-me brags about?",
    },
    yourTens: {
      lm_health: "Wake up before the alarm with energy to spare. Train pain-free. 15% body fat.",
      lm_money: "$3k/month from my own work, 3 months of runway, zero card debt.",
      lm_family: "They hear from me weekly — and it's never a duty call.",
      lm_fun: "One small adventure a month that ends up as a story.",
    },
    areaPlans: {
      lm_health: { name: "The Engine", purpose: "Everything runs on this body.", identity: "I am an athlete in training" },
      lm_money: { name: "The Freedom Fund", purpose: "Money buys back my hours." },
    },
    focusAreaIds: ["lm_health", "lm_money"],
    incantations: ["Deep work before email — that's who I am now.", "I have already survived every hard day so far."],
    ritual: {
      items: [
        { id: "rit-water", title: "Big glass of water", minutes: 1 },
        { id: "rit-vision", title: "Read your vision out loud", minutes: 2 },
        { id: "rit-questions", title: "Ask your 8 empowering questions", minutes: 5 },
        { id: "rit-incantations", title: "Speak your incantations — out loud, full body", minutes: 5 },
        { id: "rit-plan", title: "Plan your day — pick 3-5 must items", minutes: 5 },
      ],
      preset: null,
      builtAt: start,
      weekly: [
        { id: "writ-money", title: "Money Tuesday — 30 min with your numbers", areaId: "lm_money", weekday: 1 },
      ],
    },
    progress: {
      startDate: start,
      completions: {
        "ex-g1-h0": [shift(today, -14), shift(today, -12), shift(today, -7), shift(today, -5), shift(today, -2)],
        "ex-g2-h0": [shift(today, -8), shift(today, -6), shift(today, -5), shift(today, -2), shift(today, -1)],
        "lp-lm_family-g0-h0": [shift(today, -9), shift(today, -2)],
      },
      tasksDone: ["ex-g2-t0"],
      visionReviews: [shift(today, -4), shift(today, -3), shift(today, -2), shift(today, -1)],
      ritualCompletions: {
        [shift(today, -2)]: ["rit-water", "rit-vision", "rit-questions", "rit-plan"],
        [shift(today, -1)]: ["rit-water", "rit-vision", "rit-questions", "rit-plan"],
      },
      dayPlans: { [shift(today, -1)]: { mustIds: ["ex-g2-h0"], adhoc: [{ id: `adhoc-${shift(today, -1)}-0`, title: "Email the accountant", done: false }], blockReasons: { wealth: "The offer page is one deep-work block from done — ship week." } } },
      measureLogs: { "ex-g2": [{ date: shift(today, -10), value: 400 }, { date: shift(today, -3), value: 950 }] },
      eveningReflections: { [shift(today, -1)]: { amazing: "Deep work before sunrise. Felt like stealing time back.", better: "Phone out of the bedroom.", dayScore: 8, magicMoment: "Kid fell asleep mid-sentence telling me about dinosaurs." } },
      weeklyReviews: [
        {
          weekStart: start,
          areaRatings: { lm_health: 4, lm_fitness: 4, lm_mindset: 6, lm_emotions: 6, lm_relationship: 5, lm_mission: 5, lm_money: 3, lm_family: 6, lm_friends: 5, lm_fun: 3, lm_contribution: 3, lm_spirituality: 4 },
          note: "Honest baseline. Money and fun are the weak rooms.",
          focusPillarId: "lm_money", lesson: "I plan well and protect the plan badly.",
          magicMoment: "First strength session in a year.", accomplishment: "Wrote the whole life plan.",
          outcomes: [{ areaId: "lm_money", outcome: "Ship the one-page offer", why: "no offer, no income" }],
        },
        {
          weekStart: shift(today, -8),
          areaRatings: { lm_health: 5, lm_fitness: 5, lm_mindset: 6, lm_emotions: 7, lm_relationship: 5, lm_mission: 6, lm_money: 4, lm_family: 7, lm_friends: 5, lm_fun: 3, lm_contribution: 3, lm_spirituality: 4 },
          note: "Health +1, money +1. The +1 rule works.",
          focusPillarId: "lm_money", lesson: "Deep work before email or it doesn't happen.",
          magicMoment: "Dad stayed on the call an extra half hour.", accomplishment: "5 deep-work mornings.",
          outcomes: [{ areaId: "lm_money", outcome: "First outreach to 10 prospects", why: "offers don't sell themselves" }, { areaId: "lm_fun", outcome: "Book the climbing day", why: "fun is a 3 — bring it to a 4" }],
        },
      ],
      reportVerdicts: {},
    },
  }
}
