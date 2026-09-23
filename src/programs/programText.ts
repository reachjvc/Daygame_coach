/**
 * Writing a training program out, the way you would write it on paper.
 *
 * WHAT THIS REPLACES. The builder made you click "add a lift", type into a
 * search box, and click a chip — per lift, per day. Nobody plans five training
 * days that way. They write:
 *
 *     Push
 *     Bench Press 3x8 @60
 *     Overhead Press 3x8 @40
 *     + Lateral Raise 3x12-20 @6
 *
 *     Pull
 *     Deadlift 1x5 @100
 *     Barbell Row 3x8 @60
 *
 * …and that is the whole program. So that is the input, and the structured
 * editor becomes the place you go to adjust something afterwards rather than
 * the only way in.
 *
 * THE RULES, kept few enough to hold in your head:
 *   · a blank line starts a new day
 *   · a line with no sets×reps in it is a day's NAME
 *   · `3x8` is sets by reps; `3x8-12` is a rep range
 *   · `@60` is the weight you start at; `@bw` is bodyweight
 *   · a line starting with `+` is supersetted with the line above it
 *
 * NOTHING IS SILENTLY DROPPED. A line that cannot be read comes back in
 * `problems` with its number and the reason, and the caller shows it. The
 * failure mode this avoids is the one where you paste a program, the app keeps
 * four lines out of five, and you find out in the gym.
 *
 * UNKNOWN LIFTS ARE KEPT, not rejected. If you write "Zercher Squat" and the
 * library has never heard of it, it is still your program — the lift is created
 * with the name you gave it. Only the *suggested* defaults come from the
 * library when it does recognise something.
 */

import type { DayTemplate, LoadExercise, ProgramSchedule } from "./types"
import { EXERCISE_LIBRARY, freeLiftEntry, patternForName, customLiftId } from "./data/exerciseLibrary"
import { freshId } from "./customize"
import { buildExercise } from "./builder"

export interface ParsedProblem {
  /** 1-based line number in the text the user typed. */
  line: number
  text: string
  reason: string
}

export interface ParsedProgram {
  schedule: ProgramSchedule
  /** Starting weights keyed by the generated exercise id, as typed. */
  weights: Record<string, string>
  problems: ParsedProblem[]
}

/**
 * Sets and reps: `3x8`, `3 x 8`, `3×8`, `4x6-10`.
 *
 * The separator has to be an `x` or a `×` with digits either side, which is
 * what stops "Face Pull" being read as a set count.
 */
const SETS_REPS = /(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i

/** `@60`, `@ 60kg`, `@60 lb`, `@bw`. */
const WEIGHT = /@\s*(bw|bodyweight|\d+(?:\.\d+)?)\s*(kg|lb|lbs)?/i

/** A leading `+`, `&` or `A2)`-style marker meaning "with the one above". */
const SUPERSET_PREFIX = /^\s*[+&]\s*/

/**
 * `+2 drops`, `+1 drop`, anywhere after the name.
 *
 * Written out by `formatProgramText`, so it has to be read back here or the
 * round trip destroys it: the parser's last rule is "whatever is left is the
 * name", and an unrecognised suffix becomes part of the lift — a program
 * re-applied once would hold a lift called "Bench Press +2 drops", which
 * matches nothing in the library and nothing in `workout_sets`.
 *
 * Unambiguous against the superset `+` because that one is anchored to the
 * start of the line and this one never is.
 */
const DROPS = /\s*\+\s*(\d)\s*drops?\b/i

const norm = (s: string) => s.trim().toLowerCase()

/** The library entry a written name refers to, if any. Exact name, then alias. */
function libraryMatch(name: string) {
  const n = norm(name)
  const exact = EXERCISE_LIBRARY.find((e) => norm(e.name) === n)
  if (exact) return exact
  // `patternForName` knows the catalog's aliases ("Squat" → Back Squat), so a
  // name it resolves gets that pattern's canonical entry.
  const pattern = patternForName(name)
  if (!pattern) return undefined
  return EXERCISE_LIBRARY.find((e) => e.pattern === pattern && norm(e.name).includes(n))
}

/** Turn one written line into a lift. */
function parseLift(
  raw: string,
  id: string
):
  | { exercise: LoadExercise; weight: string | null; superset: boolean; libraryId: string | null }
  | { error: string } {
  const superset = SUPERSET_PREFIX.test(raw)
  let rest = raw.replace(SUPERSET_PREFIX, "").trim()

  const d = rest.match(DROPS)
  const dropSets = d ? Number(d[1]) : null
  if (d) rest = rest.replace(DROPS, " ").trim()

  let weight: string | null = null
  const w = rest.match(WEIGHT)
  if (w) {
    rest = rest.replace(WEIGHT, "").trim()
    weight = /^(bw|bodyweight)$/i.test(w[1]) ? "0" : w[1]
  }

  const sr = rest.match(SETS_REPS)
  let sets: number | null = null
  let repMin: number | null = null
  let repMax: number | null = null
  if (sr) {
    rest = rest.replace(SETS_REPS, "").trim()
    sets = Number(sr[1])
    repMin = Number(sr[2])
    repMax = sr[3] ? Number(sr[3]) : null
  }

  // Whatever is left, minus stray punctuation, is the name.
  const name = rest.replace(/[,;:–-]+\s*$/, "").replace(/^[,;:–-]+\s*/, "").trim()
  if (!name) return { error: "there is no exercise name on this line" }
  if (sets !== null && (sets < 1 || sets > 20)) return { error: `${sets} sets is not a number of sets` }
  if (repMin !== null && (repMin < 1 || repMin > 100)) return { error: `${repMin} reps is not a number of reps` }
  if (repMax !== null && repMax < (repMin ?? 1)) {
    return { error: "the top of the rep range is below the bottom" }
  }

  const entry = libraryMatch(name)
  /**
   * A recognised lift brings its own sensible defaults and its bar/no-bar
   * rounding; an unrecognised one is still kept, under the name as written.
   *
   * THE UNRECOGNISED SHAPE USED TO BE WRITTEN OUT HERE, and it is now
   * `freeLiftEntry` — the same entry the program editor's swap builds from, so
   * a lift typed into a written week and the same lift picked in the editor
   * cannot end up on two different progression rules. The fields are identical:
   * `barbell: false` gives `loadStyle: "free"`, `compound: false` gives double
   * progression at 2.5 kg / 5 lb, and the 3 × 8 defaults are overwritten a few
   * lines below by whatever was actually written.
   */
  const fallback = freeLiftEntry(name)
  if (!fallback) return { error: "that line names no lift" }
  const exercise: LoadExercise = buildExercise(entry ?? fallback, id, {
    schemeKind: repMax !== null ? "rep_range" : "linear",
  })

  // Keep the name exactly as written when the library did not recognise it, and
  // use the library's canonical spelling when it did — so "bench press" becomes
  // "Bench Press" and matches what the workout_sets bridge writes.
  if (entry) exercise.name = entry.name

  if (dropSets && dropSets > 0) exercise.dropSets = Math.min(4, dropSets)

  // Explicit numbers always win over the defaults.
  if (sets !== null || repMin !== null || repMax !== null) {
    exercise.scheme =
      repMax !== null
        ? {
            kind: "rep_range",
            sets: sets ?? (exercise.scheme.kind !== "percentage_tm" ? exercise.scheme.sets : 3),
            repMin: repMin ?? 8,
            repMax,
          }
        : {
            kind: "linear",
            sets: sets ?? (exercise.scheme.kind !== "percentage_tm" ? exercise.scheme.sets : 3),
            reps: repMin ?? 8,
          }
  }

  return { exercise, weight, superset, libraryId: entry ? entry.id : null }
}

/**
 * Read a whole written program.
 *
 * Ids are positional (`d1_e2`) and therefore stable for the same text, which
 * matters because the weights map is keyed by them: retyping a line does not
 * scramble the numbers beside the other lifts.
 */
export function parseProgramText(text: string): ParsedProgram {
  const problems: ParsedProblem[] = []
  const days: Array<{ id: string; label: string; exercises: LoadExercise[] }> = []
  const weights: Record<string, string> = {}

  const lines = text.split("\n")
  let current: (typeof days)[number] | null = null
  let groupLetter = 0

  const startDay = (label: string) => {
    current = { id: `d${days.length + 1}`, label, exercises: [] }
    days.push(current)
    groupLetter = 0
  }

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim()
    if (!line) {
      // A blank line ends the current day. The next content starts a new one.
      current = null
      return
    }

    const looksLikeLift = SETS_REPS.test(line) || WEIGHT.test(line) || SUPERSET_PREFIX.test(line)

    if (!current && !looksLikeLift) {
      startDay(line)
      return
    }
    if (!current) {
      // Lifts before any day was named — give them somewhere to live rather
      // than throwing the work away.
      startDay(`Day ${days.length + 1}`)
    }
    // A bare name inside a day is a lift with default sets and reps, not a new
    // day: a new day needs a blank line before it, which is the one rule that
    // makes "Pull" readable as a heading and "Face Pull" readable as a lift.

    const day = current!
    /**
     * THE SAME LIFT ON TWO DAYS IS ONE LIFT — in text too.
     *
     * The id used to be minted from the POSITION before the name was even
     * read: `d1_e1`, `d2_e1`. So "Bench Press" on Push A and on Push B were two
     * different lifts, with two working weights that drifted apart. The
     * click-to-add path had already decided the opposite (`addExercise`, "your
     * bench is your bench") — the two doors into the same editor disagreed.
     *
     * So the name is resolved first and the id follows from it, exactly as
     * `addExercise` does it: the library's own id where the lift is recognised,
     * `customLiftId` where it is not, and the positional suffix kept only for
     * the case it was written for — the same lift twice in ONE day, a top set
     * and a back-off, which have to be told apart.
     */
    const parsed = parseLift(line, `${day.id}_e${day.exercises.length + 1}`)
    if ("error" in parsed) {
      problems.push({ line: i + 1, text: line, reason: parsed.error })
      return
    }

    const wanted = parsed.libraryId ?? customLiftId(parsed.exercise.name)
    let id = parsed.exercise.id
    if (wanted) {
      const idsInThisDay = new Set(day.exercises.map((e) => e.id))
      const taken = new Set(days.flatMap((d) => d.exercises.map((e) => e.id)))
      // Already on another day → share it. Already on THIS day → a second slot.
      id = idsInThisDay.has(wanted) ? freshId(wanted, taken) : wanted
      parsed.exercise.id = id
    }

    if (parsed.superset) {
      if (day.exercises.length === 0) {
        problems.push({
          line: i + 1,
          text: line,
          reason: "there is no lift above this one to superset it with",
        })
        return
      }
      const previous = day.exercises[day.exercises.length - 1]
      if (previous.supersetGroup) {
        parsed.exercise.supersetGroup = previous.supersetGroup
      } else {
        const group = String.fromCharCode(65 + groupLetter++)
        previous.supersetGroup = group
        parsed.exercise.supersetGroup = group
      }
    }

    day.exercises.push(parsed.exercise)
    if (parsed.weight !== null) weights[id] = parsed.weight
  })

  return {
    schedule: { kind: "linear_rotation", days },
    weights,
    problems,
  }
}

/**
 * Write a design back out as text, so the box always shows the real design.
 *
 * Without this the text and the structured editor would be two sources of truth
 * that drift the moment somebody reorders a day with the arrows — you would
 * come back to the box and find your old typing.
 */
export function formatProgramText(
  schedule: ProgramSchedule,
  weights: Record<string, string> = {}
): string {
  if (schedule.kind === "endurance_weeks") return ""
  const blocks = schedule.days.map((day) => {
    const lines = [day.label]
    day.exercises.forEach((ex, i) => {
      const e = ex as LoadExercise
      const previous = day.exercises[i - 1] as LoadExercise | undefined
      const paired = Boolean(e.supersetGroup && previous?.supersetGroup === e.supersetGroup)
      const scheme =
        e.scheme.kind === "linear"
          ? `${e.scheme.sets}x${e.scheme.reps}`
          : e.scheme.kind === "rep_range"
            ? `${e.scheme.sets}x${e.scheme.repMin}-${e.scheme.repMax}`
            : "" // a percentage wave has no one-line form; the editor owns it
      const w = weights[e.id]
      const weight = w != null && w !== "" ? ` @${Number(w) === 0 ? "bw" : w}` : ""
      // Written out so the text box shows the whole prescription. Not parsed
      // back — `carried` restores it, the same as the note and the weight step.
      const drops = e.dropSets ? ` +${e.dropSets} drop${e.dropSets === 1 ? "" : "s"}` : ""
      lines.push(`${paired ? "+ " : ""}${e.name}${scheme ? ` ${scheme}` : ""}${weight}${drops}`)
    })
    return lines.join("\n")
  })
  return blocks.join("\n\n")
}

/**
 * Carry per-lift settings across a re-apply of the text.
 *
 * The text says what the days and lifts ARE. Progression rule, weight step and
 * note are set in the editor underneath and have no one-line written form, so
 * re-applying the text would otherwise silently reset them — somebody fixes a
 * typo in a day name and loses the four lifts they had set to "leave it to me".
 *
 * Matched on id AND name, both of which are deterministic: parser ids are
 * positional, so a lift that is still the same lift in the same slot keeps its
 * settings, and one that has been replaced does not inherit the settings of
 * whatever used to be there. No fuzzy matching, so it is never a guess.
 */
export function carryAuthoredSettings(
  previous: ProgramSchedule,
  next: ProgramSchedule
): ProgramSchedule {
  if (previous.kind === "endurance_weeks" || next.kind === "endurance_weeks") return next

  /**
   * MATCH DAYS BY NAME FIRST, THEN BY POSITION — never by guessing.
   *
   * The rebuilt day was `{id, label, exercises}` and nothing else, so
   * `weekday` was dropped on the floor. Type one character into the text box of
   * a week pinned Monday/Thursday and both pins were gone: the week silently
   * stopped running by the calendar and started running in order, with nothing
   * on screen saying so.
   *
   * By label (trimmed, case-insensitive) because renaming a day is rarer than
   * reordering one; by index only when the day count is unchanged, where the
   * correspondence is not a guess. A changed count means days were added or
   * removed and there is no honest answer, so nothing is carried.
   */
  const byLabel = new Map<string, DayTemplate>()
  for (const d of previous.days) byLabel.set(d.label.trim().toLowerCase(), d as DayTemplate)
  const sameCount = previous.days.length === next.days.length

  const days: DayTemplate[] = next.days.map((d, i) => {
    const oldDay = byLabel.get(d.label.trim().toLowerCase()) ?? (sameCount ? (previous.days[i] as DayTemplate) : undefined)

    /**
     * Within a matched day, by id first and by NAME second. After the id rule
     * above a library lift keeps its id across a re-parse — but a week loaded
     * from an account saved before that rule still holds positional ids, and
     * matching only on id would silently reset its weight step and its note.
     */
    const oldById = new Map<string, LoadExercise>()
    const oldByName = new Map<string, LoadExercise>()
    for (const e of (oldDay?.exercises ?? []) as LoadExercise[]) {
      oldById.set(e.id, e)
      oldByName.set(e.name.trim().toLowerCase(), e)
    }

    const day: DayTemplate = {
      id: d.id,
      label: d.label,
      exercises: (d.exercises as LoadExercise[]).map((e): LoadExercise => {
        const old = oldById.get(e.id) ?? oldByName.get(e.name.trim().toLowerCase())
        if (!old) return e
        // `progression` is where the weight step lives (incrementKg/Lb) and
        // where "leave it to me" is recorded as `kind: "none"`.
        const carried: LoadExercise = { ...e, progression: old.progression }
        if (old.note) carried.note = old.note
        if (old.dropSets) carried.dropSets = old.dropSets
        return carried
      }),
    }
    if (oldDay?.weekday != null) day.weekday = oldDay.weekday
    return day
  })
  return { kind: "linear_rotation", days }
}

/** The example shown in the empty box — the format, taught by showing it. */
export const PROGRAM_TEXT_PLACEHOLDER = `Push
Bench Press 3x8 @60
Overhead Press 3x8 @40
+ Lateral Raise 3x12-20 @6

Pull
Deadlift 1x5 @100
Barbell Row 3x8 @60
+ Barbell Curl 3x10 @25

Legs
Back Squat 5x5 @80
Romanian Deadlift 3x8 @60`
