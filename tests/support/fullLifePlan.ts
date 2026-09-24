/**
 * ONE FULL PLAN, USED BY BOTH ROUND TRIPS.
 *
 * `lifePlanMapper.test.ts` sends it through the mapper in memory;
 * `lifePlanRoundTrip.integration.test.ts` sends it through a real Postgres and
 * the real `save_life_plan`. Two fixtures would drift, and the one that drifted
 * would be the one proving less — the in-memory pass would keep going green on
 * a plan the database half had never seen.
 *
 * Deliberately has something in EVERY part: every table, every link table, a
 * priority order that is the reverse of the goals array, and a checkpoint that
 * is done beside one that is not.
 */

import { emptyNsPlan, addGoal, addPractice, normalizeNsPlan, serializeNsPlan } from "@/src/goals/northStarService"
import type { NsPlan } from "@/src/goals/types"

/** A plan with something in every part of it, built through the real service. */
export function fullPlan(): NsPlan {
  let plan = emptyNsPlan()
  plan = { ...plan, northStar: "A house I chose, and the health to enjoy it.", horizonYears: 20 }
  // The seeded routines start EMPTY, so steps are added through the real
  // service rather than assumed. Without this every assertion about a step
  // passes vacuously.
  plan = addPractice(plan, "morning", "smile")
  plan = addPractice(plan, "morning", "stretch")
  plan = addPractice(plan, "night", "tomorrow")

  const health = plan.areas[0].id
  const money = plan.areas[1].id
  plan = addGoal(plan, health, "Run a half marathon")
  plan = addGoal(plan, money, "Six months of runway")
  const [g1, g2] = plan.goals

  plan = {
    ...plan,
    /* REAL KEYS, AND THEY WERE NOT. This said `star_why`/`star_who` for the
       rungs and `one_thing` for the answers, and `normalizeNsPlan` keeps a rung
       only under a `VISION_RUNGS` id and an answer only under a star or review
       prompt id or the `start:` prefix — so all three were dropped before the
       mapper ever saw them, and `life_plan_answers` came back with ZERO rows
       while the fixture's own comment claimed something in every part. The
       round trips were passing over an empty table. */
    rungs: { place: "A small house near the water.", people: "The people who are still here in ten years." },
    answers: { "start:one-thing": "Train four mornings a week.", star_why: "Because I said I would." },
    currentValues: ["Comfort", "Avoidance"],
    values: ["Courage", "Discipline"],
    seasonFocusId: health,
    seasonAreaIds: [health, money],
    // Deliberately the reverse of the goals array, so a round trip that ignored
    // priorityIds would come back in the wrong order and this would catch it.
    priorityIds: [g2.id, g1.id],
    review: {
      [health]: {
        ten: "Running without thinking about it.",
        purpose: "To not be afraid of my own body.",
        snapshot: "Out of breath on one flight of stairs.",
        fortnight: 4,
        goalsAim: "yes",
        blockers: "Evenings disappear.",
        values: ["Vitality", "Consistency"],
        identity: "Someone who trains.",
      },
    },
    goals: [
      {
        ...g1,
        why: "Because I want to finish something hard.",
        painWhy: "Because I have quit every other time.",
        sentence: "I will easily run 21 km by June.",
        targetDate: "2027-06-01",
        beliefLevel: 6,
        desireLevel: 9,
        unit: "km",
        daysPerWeek: 4,
        perWeek: 30,
        feeling: "Light.",
        reward: "A weekend away.",
        stake: "I tell my brother.",
        isAbstinence: false,
        servesOneThing: true,
        serves: [money],
        values: ["Courage"],
        asked: ["why", "when"],
        reasonsList: ["I said I would", "My knees will thank me"],
        checkpoints: [
          { id: "m1", title: "Run 5 km", done: true, celebration: "A coffee out" },
          { id: "m2", title: "Run 10 km", done: false },
        ],
        obstacles: [{ id: "o1", what: "Rain", counter: "A treadmill exists" }],
        beliefs: [{ id: "b1", old: "I am not a runner", useful: false, evidence: "I ran in school", replacement: "I am becoming one" }],
        habits: [{ id: "h1", title: "Morning run", daysPerWeek: 4, placeholder: false }],
        feedsGoalIds: [g2.id],
      },
      { ...g2, why: "So I can leave a job I hate.", values: ["Discipline"] },
    ],
    experiences: [
      { id: "x1", title: "See the northern lights", areaId: health, done: false, doneOn: null, goalId: null },
      { id: "x2", title: "Swim in the sea in winter", areaId: null, done: true, doneOn: "2026-02-01", goalId: g1.id },
    ],
    fields: [
      { id: "f1", label: "How did the day go?", targetId: null, kind: "write", readSourceId: null },
      { id: "f2", label: "Read your north star", targetId: null, kind: "read", readSourceId: "star" },
    ],
    subSteps: [{ id: "s1", targetId: g1.id, title: "Book the race" }],
    seq: 42,
  }

  /* THE LAST TWO TABLES. `split_days` and `step_serves` came back empty, so
     two of the twenty tables were being round-tripped vacuously — the strongest
     possible pass, over nothing. A split day is a named day inside a routine; a
     step serve is "this step is here because of that goal". */
  plan = {
    ...plan,
    routines: plan.routines.map((r, i) =>
      i === 0
        ? {
            ...r,
            splitDays: [{ id: "sd1", name: "Push" }, { id: "sd2", name: "Pull" }],
            steps: r.steps.map((st, j) => (j === 0 ? { ...st, servesGoalIds: [g1.id] } : st)),
          }
        : r,
    ),
  }

  return normalizeNsPlan(JSON.parse(serializeNsPlan(plan)))!
}

/** Everything except the day half, which Phase 1 does not carry. */
export function withoutDays(plan: NsPlan): NsPlan {
  return { ...plan, daily: {}, logged: {}, notes: {}, journal: {}, updatedAt: null }
}

