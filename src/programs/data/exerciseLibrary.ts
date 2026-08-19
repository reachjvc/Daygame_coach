/**
 * The pool of movements you can put into a program you are editing.
 *
 * A catalog program's exercises are fixed because the source prescribes them.
 * The moment somebody edits their own copy, they need lifts the catalog never
 * listed — a rack that has no barbell, a shoulder that will not overhead press,
 * a pull-up they cannot do yet. This is that pool.
 *
 * Grouped by MOVEMENT PATTERN rather than by muscle, because the question the
 * editor actually asks is "what else could go in this slot", and the honest
 * answer is "another lift that does the same job". Swapping Bench Press offers
 * the other horizontal pushes first.
 *
 * `suggestedKg` is per level and is a STARTING POINT SHOWN TO THE USER, never a
 * silent default: `seedEnrollment` throws without a working weight for every
 * exercise, and the editor makes the number visible and editable before enroll.
 * Bodyweight movements carry 0 and are logged as bodyweight.
 */

import type { LibraryExercise, MovementPattern } from "../types"

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  horizontal_push: "Horizontal push",
  vertical_push: "Vertical push",
  horizontal_pull: "Horizontal pull",
  vertical_pull: "Vertical pull",
  lunge: "Single leg",
  arms: "Arms",
  shoulders: "Shoulders",
  core: "Core",
  calves: "Calves",
}

/** Order the patterns are offered in — legs, push, pull, then the small stuff. */
export const PATTERN_ORDER: MovementPattern[] = [
  "squat",
  "hinge",
  "lunge",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "shoulders",
  "arms",
  "core",
  "calves",
]

/**
 * `bar` and `free` instead of one factory with a boolean, because which lifts
 * are floored at the bar is the kind of thing that gets read wrong at a glance
 * in a column of trues and falses — and reading it wrong prescribes a 20 kg
 * lateral raise.
 */
const make = (barbell: boolean) => (
  id: string,
  name: string,
  pattern: MovementPattern,
  compound: boolean,
  sets: number,
  repMin: number,
  repMax: number,
  beginner: number,
  intermediate: number,
  advanced: number
): LibraryExercise => ({
  id: `lib_${id}`,
  name,
  pattern,
  compound,
  barbell,
  defaultSets: sets,
  defaultRepMin: repMin,
  defaultRepMax: repMax,
  suggestedKg: { beginner, intermediate, advanced },
})

/** Loaded on a barbell — cannot go below the bar. */
const bar = make(true)
/** Dumbbell, cable, machine or bodyweight — no floor. */
const free = make(false)

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ---- squat ----
  bar("back_squat", "Back Squat", "squat", true, 3, 5, 8, 40, 90, 140),
  bar("front_squat", "Front Squat", "squat", true, 3, 5, 8, 30, 70, 110),
  free("goblet_squat", "Goblet Squat", "squat", false, 3, 8, 12, 12, 24, 40),
  free("hack_squat", "Hack Squat", "squat", false, 3, 8, 12, 40, 90, 150),
  free("leg_press", "Leg Press", "squat", false, 3, 10, 15, 80, 140, 220),
  free("leg_extension", "Leg Extension", "squat", false, 3, 12, 15, 25, 45, 70),
  bar("box_squat", "Box Squat", "squat", true, 3, 3, 6, 40, 90, 140),
  bar("pause_squat", "Pause Squat", "squat", true, 3, 3, 5, 35, 75, 120),
  bar("safety_bar_squat", "Safety Bar Squat", "squat", true, 3, 5, 8, 40, 85, 130),
  bar("zercher_squat", "Zercher Squat", "squat", true, 3, 5, 8, 30, 60, 100),
  bar("smith_squat", "Smith Machine Squat", "squat", true, 3, 8, 12, 40, 80, 130),
  free("belt_squat", "Belt Squat", "squat", false, 3, 8, 12, 40, 80, 130),
  free("pendulum_squat", "Pendulum Squat", "squat", false, 3, 8, 12, 30, 60, 100),
  free("v_squat", "V-Squat", "squat", false, 3, 8, 12, 40, 80, 130),
  free("sissy_squat", "Sissy Squat", "squat", false, 3, 10, 15, 0, 0, 10),
  free("landmine_squat", "Landmine Squat", "squat", false, 3, 8, 12, 20, 40, 60),

  // ---- hinge ----
  bar("deadlift", "Deadlift", "hinge", true, 1, 5, 5, 60, 120, 180),
  bar("sumo_deadlift", "Sumo Deadlift", "hinge", true, 1, 5, 5, 60, 120, 180),
  bar("rdl", "Romanian Deadlift", "hinge", true, 3, 6, 10, 40, 80, 120),
  bar("trap_bar_deadlift", "Trap Bar Deadlift", "hinge", true, 3, 5, 8, 60, 120, 180),
  bar("hip_thrust", "Hip Thrust", "hinge", false, 3, 8, 12, 50, 100, 160),
  free("back_extension", "Back Extension", "hinge", false, 3, 10, 15, 0, 10, 20),
  free("leg_curl", "Leg Curl", "hinge", false, 3, 10, 15, 25, 40, 60),
  bar("good_morning", "Good Morning", "hinge", true, 3, 8, 12, 30, 55, 85),
  bar("stiff_leg_deadlift", "Stiff-Leg Deadlift", "hinge", true, 3, 6, 10, 40, 80, 120),
  bar("deficit_deadlift", "Deficit Deadlift", "hinge", true, 3, 3, 5, 50, 100, 150),
  bar("rack_pull", "Rack Pull", "hinge", true, 3, 3, 6, 70, 140, 210),
  bar("block_pull", "Block Pull", "hinge", true, 3, 3, 6, 70, 140, 210),
  free("kettlebell_swing", "Kettlebell Swing", "hinge", false, 4, 10, 20, 12, 24, 32),
  free("cable_pull_through", "Cable Pull-Through", "hinge", false, 3, 12, 15, 20, 35, 55),
  free("nordic_curl", "Nordic Hamstring Curl", "hinge", false, 3, 5, 10, 0, 0, 0),
  free("glute_ham_raise", "Glute-Ham Raise", "hinge", false, 3, 8, 12, 0, 0, 15),
  free("seated_leg_curl", "Seated Leg Curl", "hinge", false, 3, 10, 15, 25, 40, 60),
  free("single_leg_rdl", "Single-Leg Romanian Deadlift", "hinge", false, 3, 8, 12, 8, 20, 32),
  free("reverse_hyper", "Reverse Hyperextension", "hinge", false, 3, 12, 20, 10, 25, 45),
  free("glute_kickback", "Cable Glute Kickback", "hinge", false, 3, 12, 15, 10, 20, 32),

  // ---- single leg ----
  free("bulgarian_split_squat", "Bulgarian Split Squat", "lunge", false, 3, 8, 12, 10, 24, 40),
  free("walking_lunge", "Walking Lunge", "lunge", false, 3, 10, 12, 10, 20, 32),
  free("step_up", "Step-up", "lunge", false, 3, 8, 12, 8, 20, 32),
  free("reverse_lunge", "Reverse Lunge", "lunge", false, 3, 8, 12, 10, 20, 32),
  free("forward_lunge", "Forward Lunge", "lunge", false, 3, 8, 12, 10, 20, 32),
  free("lateral_lunge", "Lateral Lunge", "lunge", false, 3, 8, 12, 8, 16, 26),
  free("curtsy_lunge", "Curtsy Lunge", "lunge", false, 3, 10, 12, 8, 16, 26),
  free("split_squat", "Split Squat", "lunge", false, 3, 8, 12, 10, 22, 36),
  free("pistol_squat", "Pistol Squat", "lunge", false, 3, 3, 8, 0, 0, 8),
  free("sled_push", "Sled Push", "lunge", false, 4, 1, 1, 20, 60, 100),

  // ---- horizontal push ----
  bar("bench_press", "Bench Press", "horizontal_push", true, 3, 5, 8, 40, 70, 100),
  bar("incline_bench", "Incline Bench Press", "horizontal_push", true, 3, 6, 10, 30, 55, 85),
  bar("close_grip_bench", "Close-Grip Bench Press", "horizontal_push", true, 3, 6, 10, 35, 60, 90),
  free("db_bench", "Dumbbell Bench Press", "horizontal_push", false, 3, 8, 12, 14, 28, 44),
  free("machine_chest_press", "Machine Chest Press", "horizontal_push", false, 3, 8, 12, 30, 55, 85),
  free("dip", "Dip", "horizontal_push", true, 3, 6, 12, 0, 10, 25),
  free("push_up", "Push-up", "horizontal_push", false, 3, 10, 20, 0, 0, 0),
  free("cable_fly", "Cable Fly", "horizontal_push", false, 3, 12, 15, 10, 20, 32),
  bar("decline_bench", "Decline Bench Press", "horizontal_push", true, 3, 6, 10, 35, 65, 95),
  bar("floor_press", "Floor Press", "horizontal_push", true, 3, 5, 8, 35, 65, 95),
  bar("spoto_press", "Spoto Press", "horizontal_push", true, 3, 5, 8, 30, 60, 90),
  bar("pause_bench", "Pause Bench Press", "horizontal_push", true, 3, 3, 6, 35, 65, 95),
  bar("smith_bench", "Smith Machine Bench Press", "horizontal_push", true, 3, 8, 12, 30, 60, 90),
  free("incline_db_press", "Incline Dumbbell Press", "horizontal_push", false, 3, 8, 12, 12, 24, 40),
  free("decline_db_press", "Decline Dumbbell Press", "horizontal_push", false, 3, 8, 12, 14, 28, 44),
  free("pec_deck", "Pec Deck", "horizontal_push", false, 3, 12, 15, 20, 40, 65),
  free("db_fly", "Dumbbell Fly", "horizontal_push", false, 3, 12, 15, 8, 16, 26),
  free("weighted_push_up", "Weighted Push-up", "horizontal_push", false, 3, 8, 15, 0, 10, 25),
  free("ring_push_up", "Ring Push-up", "horizontal_push", false, 3, 8, 15, 0, 0, 0),
  free("incline_push_up", "Incline Push-up", "horizontal_push", false, 3, 10, 20, 0, 0, 0),
  free("machine_dip", "Machine Dip", "horizontal_push", false, 3, 8, 12, 30, 55, 85),

  // ---- vertical push ----
  bar("ohp", "Overhead Press", "vertical_push", true, 3, 5, 8, 25, 45, 65),
  bar("push_press", "Push Press", "vertical_push", true, 3, 3, 6, 30, 55, 85),
  free("db_shoulder_press", "Dumbbell Shoulder Press", "vertical_push", false, 3, 8, 12, 10, 22, 34),
  free("machine_shoulder_press", "Machine Shoulder Press", "vertical_push", false, 3, 8, 12, 25, 45, 70),
  bar("z_press", "Z Press", "vertical_push", true, 3, 5, 8, 20, 35, 55),
  bar("behind_neck_press", "Behind-the-Neck Press", "vertical_push", true, 3, 6, 10, 20, 35, 55),
  free("seated_db_press", "Seated Dumbbell Press", "vertical_push", false, 3, 8, 12, 10, 22, 34),
  free("arnold_press", "Arnold Press", "vertical_push", false, 3, 8, 12, 8, 18, 30),
  free("landmine_press", "Landmine Press", "vertical_push", false, 3, 8, 12, 15, 30, 50),
  free("single_arm_db_press", "Single-Arm Dumbbell Press", "vertical_push", false, 3, 8, 12, 8, 18, 30),
  free("pike_push_up", "Pike Push-up", "vertical_push", false, 3, 8, 15, 0, 0, 0),
  free("handstand_push_up", "Handstand Push-up", "vertical_push", false, 3, 3, 8, 0, 0, 0),

  // ---- horizontal pull ----
  bar("barbell_row", "Barbell Row", "horizontal_pull", true, 3, 5, 8, 40, 65, 95),
  bar("pendlay_row", "Pendlay Row", "horizontal_pull", true, 3, 5, 8, 40, 65, 95),
  free("db_row", "Dumbbell Row", "horizontal_pull", false, 3, 8, 12, 16, 32, 48),
  free("cable_row", "Seated Cable Row", "horizontal_pull", false, 3, 8, 12, 35, 60, 90),
  free("chest_supported_row", "Chest-Supported Row", "horizontal_pull", false, 3, 8, 12, 30, 55, 80),
  free("face_pull", "Face Pull", "horizontal_pull", false, 3, 12, 20, 15, 25, 40),
  bar("t_bar_row", "T-Bar Row", "horizontal_pull", true, 3, 8, 12, 30, 60, 90),
  bar("meadows_row", "Meadows Row", "horizontal_pull", false, 3, 8, 12, 15, 30, 50),
  bar("seal_row", "Seal Row", "horizontal_pull", true, 3, 8, 12, 30, 55, 80),
  free("inverted_row", "Inverted Row", "horizontal_pull", true, 3, 8, 15, 0, 0, 10),
  free("machine_row", "Machine Row", "horizontal_pull", false, 3, 8, 12, 30, 55, 85),
  free("single_arm_cable_row", "Single-Arm Cable Row", "horizontal_pull", false, 3, 10, 15, 15, 30, 45),
  free("kroc_row", "Kroc Row", "horizontal_pull", false, 2, 15, 20, 20, 40, 60),
  free("rear_delt_row", "Rear Delt Row", "horizontal_pull", false, 3, 12, 15, 15, 28, 45),

  // ---- vertical pull ----
  free("pull_up", "Pull-up", "vertical_pull", true, 3, 5, 10, 0, 5, 20),
  free("chin_up", "Chin-up", "vertical_pull", true, 3, 5, 10, 0, 5, 20),
  free("lat_pulldown", "Lat Pulldown", "vertical_pull", false, 3, 8, 12, 35, 55, 80),
  free("assisted_pull_up", "Assisted Pull-up", "vertical_pull", false, 3, 6, 10, 25, 40, 55),
  free("weighted_pull_up", "Weighted Pull-up", "vertical_pull", true, 3, 5, 8, 0, 10, 30),
  free("neutral_grip_pull_up", "Neutral-Grip Pull-up", "vertical_pull", true, 3, 5, 10, 0, 5, 20),
  free("wide_grip_pull_up", "Wide-Grip Pull-up", "vertical_pull", true, 3, 5, 10, 0, 5, 20),
  free("band_assisted_pull_up", "Band-Assisted Pull-up", "vertical_pull", true, 3, 6, 12, 0, 0, 0),
  free("negative_pull_up", "Negative Pull-up", "vertical_pull", true, 3, 3, 6, 0, 0, 0),
  free("close_grip_pulldown", "Close-Grip Lat Pulldown", "vertical_pull", false, 3, 8, 12, 30, 50, 75),
  free("single_arm_pulldown", "Single-Arm Lat Pulldown", "vertical_pull", false, 3, 10, 15, 15, 28, 45),
  free("straight_arm_pulldown", "Straight-Arm Pulldown", "vertical_pull", false, 3, 12, 15, 15, 30, 45),

  // ---- shoulders ----
  free("lateral_raise", "Lateral Raise", "shoulders", false, 3, 12, 20, 6, 12, 18),
  free("rear_delt_fly", "Rear Delt Fly", "shoulders", false, 3, 12, 20, 6, 12, 18),
  bar("shrug", "Barbell Shrug", "shoulders", false, 3, 10, 15, 40, 80, 120),
  free("cable_lateral_raise", "Cable Lateral Raise", "shoulders", false, 3, 12, 20, 5, 10, 16),
  free("machine_lateral_raise", "Machine Lateral Raise", "shoulders", false, 3, 12, 20, 15, 30, 45),
  free("reverse_pec_deck", "Reverse Pec Deck", "shoulders", false, 3, 12, 20, 15, 30, 45),
  free("front_raise", "Front Raise", "shoulders", false, 3, 10, 15, 5, 10, 16),
  free("y_raise", "Y-Raise", "shoulders", false, 3, 12, 20, 4, 8, 12),
  bar("upright_row", "Upright Row", "shoulders", false, 3, 10, 15, 20, 35, 50),
  free("db_shrug", "Dumbbell Shrug", "shoulders", false, 3, 10, 15, 20, 36, 56),

  // ---- arms ----
  bar("barbell_curl", "Barbell Curl", "arms", false, 3, 8, 12, 20, 32, 45),
  free("db_curl", "Dumbbell Curl", "arms", false, 3, 10, 15, 8, 16, 24),
  free("hammer_curl", "Hammer Curl", "arms", false, 3, 10, 15, 8, 16, 24),
  free("triceps_pushdown", "Triceps Pushdown", "arms", false, 3, 10, 15, 20, 35, 50),
  bar("skullcrusher", "Skullcrusher", "arms", false, 3, 8, 12, 20, 32, 45),
  free("overhead_triceps", "Overhead Triceps Extension", "arms", false, 3, 10, 15, 15, 28, 40),
  bar("ez_bar_curl", "EZ-Bar Curl", "arms", false, 3, 8, 12, 15, 28, 40),
  bar("reverse_curl", "Reverse Curl", "arms", false, 3, 10, 15, 12, 22, 32),
  free("preacher_curl", "Preacher Curl", "arms", false, 3, 8, 12, 12, 22, 34),
  free("incline_db_curl", "Incline Dumbbell Curl", "arms", false, 3, 10, 15, 6, 12, 20),
  free("cable_curl", "Cable Curl", "arms", false, 3, 10, 15, 15, 28, 42),
  free("concentration_curl", "Concentration Curl", "arms", false, 3, 10, 15, 6, 12, 18),
  free("spider_curl", "Spider Curl", "arms", false, 3, 10, 15, 6, 12, 20),
  free("rope_pushdown", "Rope Pushdown", "arms", false, 3, 12, 15, 15, 30, 45),
  free("bench_dip", "Bench Dip", "arms", false, 3, 10, 20, 0, 0, 15),
  bar("jm_press", "JM Press", "arms", false, 3, 6, 10, 25, 45, 65),
  free("triceps_kickback", "Triceps Kickback", "arms", false, 3, 12, 15, 5, 10, 15),
  free("wrist_curl", "Wrist Curl", "arms", false, 3, 12, 20, 10, 20, 30),
  free("reverse_wrist_curl", "Reverse Wrist Curl", "arms", false, 3, 12, 20, 5, 10, 16),

  // ---- core ----
  free("hanging_leg_raise", "Hanging Leg Raise", "core", false, 3, 8, 15, 0, 0, 10),
  free("cable_crunch", "Cable Crunch", "core", false, 3, 10, 15, 20, 35, 55),
  free("ab_wheel", "Ab Wheel Rollout", "core", false, 3, 8, 15, 0, 0, 0),
  free("plank", "Plank", "core", false, 3, 1, 1, 0, 0, 0),
  free("side_plank", "Side Plank", "core", false, 3, 1, 1, 0, 0, 0),
  free("dead_bug", "Dead Bug", "core", false, 3, 8, 12, 0, 0, 0),
  free("pallof_press", "Pallof Press", "core", false, 3, 10, 15, 10, 20, 32),
  free("russian_twist", "Russian Twist", "core", false, 3, 12, 20, 5, 10, 20),
  free("decline_sit_up", "Decline Sit-up", "core", false, 3, 10, 20, 0, 5, 15),
  free("weighted_crunch", "Weighted Crunch", "core", false, 3, 12, 20, 5, 12, 20),
  free("toes_to_bar", "Toes-to-Bar", "core", false, 3, 5, 12, 0, 0, 0),
  free("dragon_flag", "Dragon Flag", "core", false, 3, 3, 8, 0, 0, 0),
  free("wood_chop", "Cable Wood Chop", "core", false, 3, 10, 15, 10, 20, 32),
  free("farmer_carry", "Farmer's Carry", "core", false, 3, 1, 1, 16, 32, 50),

  // ---- calves ----
  free("standing_calf_raise", "Standing Calf Raise", "calves", false, 4, 10, 20, 40, 70, 100),
  free("seated_calf_raise", "Seated Calf Raise", "calves", false, 4, 12, 20, 25, 45, 70),
  free("donkey_calf_raise", "Donkey Calf Raise", "calves", false, 4, 10, 20, 30, 55, 85),
  free("single_leg_calf_raise", "Single-Leg Calf Raise", "calves", false, 4, 10, 20, 0, 10, 24),
  free("leg_press_calf_raise", "Leg Press Calf Raise", "calves", false, 4, 12, 20, 50, 90, 140),
]

/**
 * SEARCH HAD TO IGNORE PUNCTUATION, and did not.
 *
 * Reported as "we have assisted pull up, but not an actual pull up". Both are
 * in the library; neither could be found. The names carry hyphens — "Pull-up",
 * "Chin-up", "Push-up", "T-Bar Row" — and nobody types the hyphen. A plain
 * `includes` on the raw string therefore matched none of them for "pull up" or
 * "pullup", and the picker answered "nothing called that" about a lift it was
 * holding. Squashing everything that is not a letter or a digit fixes all three
 * spellings at once.
 */
function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

/**
 * Other words for the same lift, so the search finds it under the name the
 * person actually uses. Only where the alias is not already a substring of the
 * canonical name once punctuation is gone — "pullup" already matches "Pull-up"
 * and needs no entry.
 */
const SEARCH_ALIASES: Record<string, string[]> = {
  lib_push_up: ["press up", "pressup"],
  lib_ohp: ["shoulder press", "military press", "strict press"],
  lib_rdl: ["romanian", "stiff leg"],
  lib_lat_pulldown: ["pulldown"],
  lib_bulgarian_split_squat: ["rear foot elevated", "rfess"],
  lib_hip_thrust: ["glute bridge"],
  lib_leg_curl: ["hamstring curl", "lying leg curl"],
  lib_triceps_pushdown: ["tricep pushdown", "cable pushdown"],
  lib_skullcrusher: ["lying triceps extension", "skull crusher"],
  lib_back_squat: ["squat"],
  lib_barbell_row: ["bent over row", "bent-over row"],
  lib_standing_calf_raise: ["calf raise"],
  lib_hanging_leg_raise: ["leg raise"],
  lib_ab_wheel: ["rollout"],
  lib_farmer_carry: ["loaded carry", "farmers walk"],
}

/**
 * The lifts matching what somebody typed, best-first.
 *
 * A name that STARTS with the query comes before one that merely contains it,
 * so "row" leads with Barbell Row rather than with Rear Delt Row. Matches on an
 * alias sort last: they are the right lift under a different word, and putting
 * them above a direct name match reads as the search ignoring what was typed.
 */
export function searchLibrary(query: string, limit = 14): LibraryExercise[] {
  const q = norm(query)
  if (!q) return []
  const scored: Array<{ entry: LibraryExercise; rank: number }> = []
  for (const entry of EXERCISE_LIBRARY) {
    const name = norm(entry.name)
    if (name.startsWith(q)) scored.push({ entry, rank: 0 })
    else if (name.includes(q)) scored.push({ entry, rank: 1 })
    else if ((SEARCH_ALIASES[entry.id] ?? []).some((a) => norm(a).includes(q))) scored.push({ entry, rank: 2 })
  }
  return scored.sort((a, b) => a.rank - b.rank).slice(0, limit).map((s) => s.entry)
}

/**
 * A lift the user typed themselves, shaped like a library entry.
 *
 * WHY IT IS NOT SAVED TO THE LIBRARY. The library is the pool everyone's editor
 * offers and every catalog program is checked against; growing it from user
 * input would make one person's "Cable Thing" everybody's, and make
 * `patternForName` answer differently depending on who was asking. A custom
 * lift is a one-off entry that goes straight into the day being edited and
 * lives in that program, which is where it belongs.
 *
 * **Free-loaded, not barbell.** A lift somebody adds by hand is far more often
 * an accessory than a bar lift, and guessing barbell floors a 6 kg movement at
 * 20 — the same reasoning `loadStyle` already carries. Somebody putting in a
 * barbell lift can set the weight; nobody has to undo a wrong floor.
 *
 * Weights start at zero on every level: we have no idea what they lift, and a
 * made-up suggestion under a made-up lift is a number pretending to be advice.
 */
export function customLibraryEntry(name: string, pattern: MovementPattern): LibraryExercise | null {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 120)
  if (!clean) return null
  const slug = norm(clean).slice(0, 40) || "lift"
  return {
    id: `custom_${slug}`,
    name: clean,
    pattern,
    // Double progression, which is the accessory rule and the safe default for
    // something we know nothing about.
    compound: false,
    barbell: false,
    defaultSets: 3,
    defaultRepMin: 8,
    defaultRepMax: 12,
    suggestedKg: { beginner: 0, intermediate: 0, advanced: 0 },
  }
}

export const LIBRARY_BY_ID = new Map(EXERCISE_LIBRARY.map((e) => [e.id, e]))

export function libraryExercise(id: string): LibraryExercise | undefined {
  return LIBRARY_BY_ID.get(id)
}

export function libraryByPattern(pattern: MovementPattern): LibraryExercise[] {
  return EXERCISE_LIBRARY.filter((e) => e.pattern === pattern)
}

/**
 * Catalog lift names that are the same movement under a different word.
 *
 * StrongLifts calls it "Squat" and the library calls it "Back Squat"; both are
 * a barbell back squat. Without this the swap picker falls back to offering the
 * whole library for the most common lift in the catalog, which is not wrong but
 * is markedly less useful than the four other squats.
 *
 * Kept as an explicit table rather than fuzzy matching: "Front Squat" contains
 * "Squat" and is a different lift with a different bar position, and a
 * substring rule would quietly merge them.
 *
 * `tests/unit/programs/customize.test.ts` asserts every LOAD exercise in the
 * catalog resolves, so a new program cannot add an unmatched name unnoticed.
 */
const NAME_ALIASES: Record<string, MovementPattern> = {
  squat: "squat",
  "calf raise": "calves",
  "incline dumbbell press": "horizontal_push",
  "lying leg curl": "hinge",
}

/**
 * The pattern a catalog exercise belongs to, so a swap can offer like for like.
 *
 * Matched on the canonical NAME rather than the id, because every program
 * prefixes its own ids (`ul_bench`, `sl_bench`, `phul_bench`) while the names
 * are already shared across the catalog — they have to be, since
 * `workout_sets.exercise` is written from the name by the health bridge.
 * Returns null for a name the library does not carry, and the editor then
 * offers the whole pool rather than pretending to know better.
 */
export function patternForName(name: string): MovementPattern | null {
  const norm = name.trim().toLowerCase()
  const hit = EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === norm)
  if (hit) return hit.pattern
  return NAME_ALIASES[norm] ?? null
}
