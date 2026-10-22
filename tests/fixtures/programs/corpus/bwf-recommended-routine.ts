/**
 * The r/bodyweightfitness Recommended Routine (the Summer 2018 rewrite, as
 * the subreddit's wiki has it), read on 2026-10-22 through the Wayback
 * Machine's copies of the wiki pages (reddit itself is blocked here):
 * kb/recommended_routine and the progression pages exercises/pullup, squat,
 * dip, hinge, row, pushup and core.
 *
 * Three times a week, one full-body workout: a warm-up, three pairs done as
 * supersets (90 s between exercises) and a core triplet (60 s). Each pair
 * exercise is a progression — a list of harder and harder variations. "Perform
 * 3 sets of 5 reps of that progression on your first session. In subsequent
 * sessions you should try to add one rep per set until you are performing 3
 * sets of 8 reps with good form. From here you should move on to the next
 * progression, but again at 3 sets of 5 reps." Holds (support hold, plank) are
 * done for time: 10–30 s, moving on at 30 s on all 3 sets (the support hold
 * at 3 × 60 s). So each progression is a `ladder` of its main-path variations
 * with 3 × 5–8 (core 3 × 8–12), moving up at 8 (12).
 *
 * The routine names its alternative paths and timed rungs, and some warm-up
 * items join only from a given rung; those are notes here and gaps below.
 */

import type { ProgramFixture } from "../fixture"
import type { LiftRef, NumberOrRange, SetReps, SlotSpec } from "@/src/programs/spec/types"

const r = (min: number, max: number) => ({ min, max })
const bw = { from: "bodyweight" } as const
/** A bodyweight variation the library does not have under that name. */
const b = (name: string): LiftRef => ({ name, loadStyle: "bodyweight" })

/** One progression: 3 sets of `reps` on the current rung, the next rung once every set reaches `advance`. */
const progression = (
  id: string,
  name: string,
  group: string,
  rungs: LiftRef[],
  note: string,
  reps: NumberOrRange = r(5, 8),
  restSec = 90
): SlotSpec => ({
  id,
  lift: b(name),
  group,
  restSec,
  note,
  sets: [{ id: "work", kind: "working", count: 3, reps, load: bw }],
  progression: { kind: "ladder", lifts: rungs, advanceAt: { reps: typeof reps === "number" ? reps : reps.max } },
})

/** One warm-up item: a single set as the warm-up table writes it. */
const warmup = (id: string, lift: LiftRef, reps: SetReps, note?: string): SlotSpec => ({
  id,
  lift,
  sets: [{ id: "warm", kind: "warmup", count: 1, reps, load: bw }],
  ...(note ? { note } : {}),
  progression: { kind: "hold" },
})

export const bwfRecommendedRoutine: ProgramFixture = {
  id: "bwf-recommended-routine",
  title: "r/bodyweightfitness Recommended Routine",
  source: {
    url: "https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/",
    author: "r/bodyweightfitness moderators and community",
    terms: "free",
    checked: "2026-10-22",
    notes:
      "Free: the subreddit's public wiki ('If you are being charged for any Recommended Routine app don't use it'). Read via web.archive.org copies: kb/recommended_routine 20241222133922, exercises/pullup 20241222133819, squat 20241222133747, dip 20241222133802, hinge 20241222133933, pushup 20250113084525, core 20241209171330, row 20240125002410.",
  },
  coverage: "close",
  gaps: [
    "A rung cannot carry its own set target: the Parallel Bar Support Hold (3 holds working up to 60 s) and the Plank (up to 30 s) are timed rungs inside ladders whose other rungs are 3 × 5–8 / 3 × 8–12 reps, and they move on at 60 s / 30 s, not at a rep count; here they share their ladder's reps, with a note.",
    "The rep target climbs one rep per set each session (3×5, 3×6, 3×7, 3×8) and a new rung starts again at 3×5; the format gives the range 5–8 and moves up at 8, not a target that rises session by session.",
    "The last rungs (weighted pull-ups, weighted shrimp squats, weighted dips, weighted inverted rows) add weight, but a ladder's sets are bodyweight; the routine gives no amount.",
    "Four warm-up items join only once a progression reaches a rung (arch hangs at pull-up negatives, support hold at negative dips, an easier squat at Bulgarian split squats, an easier hinge at banded Nordic curls); the format has no condition on another lift's rung, so they are always listed, with a note.",
    "Each progression has alternative paths that branch off at a rung (L-sit or archer pull-ups after 3×8 pull-ups, step-ups or pistols after Bulgarian split squats, ring dips, tuck front lever rows…); a ladder is one path, so the alternatives are notes.",
    "The starting rung is the hardest one the lifter can do for 3×5; the format starts every ladder on its first rung.",
    "Single-leg rungs (split squats onward, single-legged deadlifts) are 5–8 reps per leg; `perSide` belongs to the whole slot, not to a rung.",
  ],
  spec: {
    specVersion: 2,
    name: "BWF Recommended Routine",
    blurb:
      "Three full-body workouts a week, with a rest day between. Warm up, then three pairs (pull-up + squat, dip + hinge, row + push-up) and a core triplet, each a progression of harder variations: 3 sets of 5–8, a rep more each session, the next variation at 3×8. Tempo 10X0, one rep short of failure.",
    credit: "by the r/bodyweightfitness community",
    unit: "kg",
    calendar: { days: "in-order", weekCounting: "completed", lengthWeeks: null, atEnd: "repeat" },
    rounding: { stepKg: 2.5, stepLb: 5, mode: "nearest" },
    days: [
      {
        id: "rr",
        label: "Full-body workout",
        slots: [
          warmup("wu_band", b("Yuri's Shoulder Band Warmup"), r(5, 10), "Or stick dislocates."),
          warmup("wu_sky", b("Squat Sky Reaches"), r(5, 10), "Assisted if you need to."),
          warmup("wu_wrist", b("GMB Wrist Prep"), { atLeast: 10 }, "As many reps as you want."),
          warmup("wu_deadbug", { lib: "lib_dead_bug", name: "Deadbugs" }, { seconds: 30 }),
          warmup("wu_arch", b("Arch Hangs"), 10, "Add these once you reach Pull-up Negatives."),
          warmup("wu_support", b("Support Hold"), { seconds: 30 }, "Add these once you reach Negative Dips."),
          warmup("wu_squat", b("Easier squat variation"), 10, "Add these once you reach Bulgarian Split Squats: a variation below your current one."),
          warmup("wu_hinge", b("Easier hinge variation"), 10, "Add these once you reach Banded Nordic Curls: a variation below your current one."),

          progression(
            "pullup",
            "Pull-up progression",
            "A",
            [b("Scapular Pulls"), b("Arch Hangs"), { lib: "lib_negative_pull_up", name: "Pull-up Negatives" }, { lib: "lib_pull_up", name: "Pull-ups" }, { lib: "lib_weighted_pull_up", name: "Weighted Pull-ups" }],
            "Scapular pulls: hold the top 3–5 s. Arch hangs: hold for time or reps. Negatives: build up to 10 s lowering. After 3×8 pull-ups, instead of weighted: L-sit, arch-body, or typewriter → archer pull-ups."
          ),
          progression(
            "squat",
            "Squat progression",
            "A",
            [
              b("Assisted Squat"),
              b("Bodyweight Squat"),
              b("Split Squat"),
              b("Bulgarian Split Squat"),
              b("Beginner Shrimp Squat"),
              b("Intermediate Shrimp Squat"),
              b("Advanced Shrimp Squat"),
              b("Weighted Shrimp Squat"),
            ],
            "From split squats on: 5–8 reps each leg. After 3×8 Bulgarian split squats, instead of shrimp squats: step-ups → deep step-ups, or partial pistols → pistol squats. With a barbell and rack, back squats 3×5 can replace this."
          ),
          progression(
            "dip",
            "Dip progression",
            "B",
            [b("Parallel Bar Support Hold"), b("Negative Dips"), { lib: "lib_dip", name: "Parallel Bar Dips" }, b("Weighted Dips")],
            "The support hold is a hold: 3 holds working up to 60 s, then move on. Negative dips: work up to 10 s descents. After 3×8 dips, instead of weighted: ring dips → RTO ring dips."
          ),
          progression(
            "hinge",
            "Hinge progression",
            "B",
            [b("Bodyweight Romanian Deadlift"), b("Single Legged Deadlift"), b("Banded Nordic Curl Negatives"), b("Banded Nordic Curl"), { lib: "lib_nordic_curl", name: "Nordic Curls" }],
            "Single-legged deadlifts: 5–8 each leg. Repeat the banded Nordic rungs with weaker bands until you can move on. After single-legged deadlifts, instead: hamstring slides, Harop curls, or glute-ham raises."
          ),
          progression(
            "row",
            "Row progression",
            "C",
            [b("Vertical Rows"), b("Incline Rows"), { lib: "lib_inverted_row", name: "Horizontal Rows" }, b("Wide Rows"), b("Weighted Inverted Rows")],
            "After 3×8 wide rows, instead of weighted: tuck front lever (3 × 10–30 s) → tuck front lever pulls, or archer rows → one-arm rows."
          ),
          progression(
            "pushup",
            "Push-up progression",
            "C",
            [b("Vertical Pushup"), { lib: "lib_incline_push_up", name: "Incline Pushup" }, { lib: "lib_push_up", name: "Full Pushup" }, b("Diamond Pushup"), b("Pseudo Planche Pushups")],
            "After 3×8 diamond push-ups, instead of pseudo planche: ring push-ups → RTO push-ups → RTO pseudo planche push-ups."
          ),

          progression(
            "core_antiext",
            "Anti-extension progression",
            "D",
            [{ lib: "lib_plank", name: "Plank" }, b("Ring Ab Rollouts")],
            "The plank is a hold: work up to 30 s, then move on to ring ab rollouts. Instead: ab wheel rollouts, hanging leg raises, or pike compressions.",
            r(8, 12),
            60
          ),
          {
            id: "core_antirot",
            lift: { lib: "lib_pallof_press", name: "Banded Pallof Press" },
            group: "D",
            restSec: 60,
            note: "Pause with the arms fully extended. Instead: the Copenhagen plank progression or the ring Pallof press.",
            sets: [{ id: "work", kind: "working", count: 3, reps: r(8, 12), load: bw }],
            progression: { kind: "hold" },
          },
          {
            id: "core_ext",
            lift: b("Reverse Hyperextension"),
            group: "D",
            restSec: 60,
            note: "Keep your butt tucked. Instead: arch raises → arch body hold → arch body rocks, or hyperextensions.",
            sets: [{ id: "work", kind: "working", count: 3, reps: r(8, 12), load: bw }],
            progression: { kind: "hold" },
          },
        ],
      },
    ],
  },
  start: {},
  expect: [
    {
      session: 1,
      slot: "pullup",
      sets: "3x5-8@bw",
      source: "kb/recommended_routine › Strength work › First Pair: '3x5-8 Pull-up progression' (first session: 3 sets of 5)",
    },
    {
      session: 1,
      slot: "pushup",
      sets: "3x5-8@bw",
      source: "kb/recommended_routine › Third Pair: '3x5-8 Push-up progression'",
    },
    {
      session: 1,
      slot: "core_antirot",
      sets: "3x8-12@bw",
      source: "kb/recommended_routine › Core Triplet: '3x8-12 Anti-Rotation progression' (Banded Pallof Press)",
    },
    {
      session: 1,
      slot: "wu_deadbug",
      sets: "1x30s@bw",
      source: "kb/recommended_routine › Warm-up table: '30s Deadbugs'",
    },
    {
      session: 2,
      slot: "pullup",
      sets: "3x5-8@bw",
      source: "kb/recommended_routine › First Pair: every session is '3x5-8 Pull-up progression' (the source's own aim for session 2 is one more rep per set, 3×6 — a gap)",
    },
    {
      session: 3,
      slot: "squat",
      sets: "3x5-8@bw",
      source: "kb/recommended_routine › First Pair: '3x5-8 Squat Progression'",
    },
  ],
}
