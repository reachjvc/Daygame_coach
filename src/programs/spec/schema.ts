/**
 * THE FORMAT'S RULES — what a program may contain, checked in full.
 *
 * A program somebody wrote is data from a stranger, and the engine multiplies
 * its numbers, so every field is bounded and every key is known: an unknown
 * key is an ERROR, never silently dropped (zod's default), because a typo'd
 * field that disappears is a rule the person thinks they set and did not.
 *
 * Two passes. The shape (`ProgramSpecSchema`, zod, strict) and then the
 * references between parts (`referenceProblems`): a week change naming a set
 * group the lift does not have, a back-off pointing at a set that comes after
 * it, a weekday program with a day on no weekday. Both pass the same way —
 * as sentences a person can act on (`checkSpec`), not as zod paths.
 *
 * The bounds are generous and exist to keep the arithmetic finite and the
 * output loggable, not to referee anyone's training. Every bound the old
 * format had is at least as loose here, so every week that validated before
 * converts and validates now (`fromLegacy.ts`).
 */

import { z } from "zod"
import { MAX_WEEKS, parseWeekSet } from "./weeks"
import type { LoadSpec, ProgramSpec, SetGroup, SetReps, SlotSpec } from "./types"
import { SPEC_VERSION } from "./types"

/** Plans/program-builder.md, Phase 1.1. */
export const SPEC_LIMITS = {
  days: 14,
  slotsPerDay: 30,
  weeks: MAX_WEEKS,
  bytes: 64 * 1024,
  setGroupsPerSlot: 10,
  setsPerGroup: 30,
  weekOverridesPerSlot: 60,
  choices: 20,
  maxes: 60,
  phases: 12,
} as const

const id = z.string().regex(/^[A-Za-z0-9_.~-]{1,100}$/, "use letters, digits, - _ . ~ only (up to 100)")
const text = (max: number) => z.string().trim().min(1).max(max)
const int = (min: number, max: number) => z.number().int().min(min).max(max)

/** A range that runs forwards. */
const range = (min: number, max: number, whole = true) =>
  z
    .object({
      min: whole ? int(min, max) : z.number().min(min).max(max),
      max: whole ? int(min, max) : z.number().min(min).max(max),
    })
    .strict()
    .refine((r) => r.max >= r.min, { message: "the range runs backwards (top below bottom)" })

const numberOrRange = (min: number, max: number, whole = true) =>
  z.union([whole ? int(min, max) : z.number().min(min).max(max), range(min, max, whole)])

/** RPE and RIR move in half steps: 8, 8.5, 9. */
const halfSteps = (min: number, max: number) =>
  z
    .number()
    .min(min)
    .max(max)
    .refine((n) => Number.isInteger(n * 2), { message: "use whole or half steps, like 8 or 8.5" })
const halfStepOrRange = (min: number, max: number) =>
  z.union([
    halfSteps(min, max),
    z
      .object({ min: halfSteps(min, max), max: halfSteps(min, max) })
      .strict()
      .refine((r) => r.max >= r.min, { message: "the range runs backwards (top below bottom)" }),
  ])

/** A share of something, as a fraction: 0.7 is 70%. Up to 200%, for the odd overload set. */
const pct = z.number().gt(0).max(2)
const pctOrRange = z.union([
  pct,
  z
    .object({ min: pct, max: pct })
    .strict()
    .refine((r) => r.max >= r.min, { message: "the range runs backwards (top below bottom)" }),
])

const increment = z.object({ kg: z.number().min(0).max(50), lb: z.number().min(0).max(100) }).strict()
const weekSet = z.string().superRefine((s, ctx) => {
  const parsed = parseWeekSet(s)
  if ("error" in parsed) ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error })
})

const loadStyle = z.enum(["barbell", "free", "bodyweight"])
export const LiftRefSchema = z.union([
  z.object({ lib: id, name: text(120).optional() }).strict(),
  z.object({ name: text(120), loadStyle: loadStyle.optional() }).strict(),
])

const setReps: z.ZodType<SetReps> = z.union([
  int(1, 100),
  range(1, 100),
  z.object({ atLeast: int(1, 100) }).strict(),
  z.object({ seconds: numberOrRange(1, 3600) }).strict(),
  z.object({ total: int(1, 1000) }).strict(),
])

const setKind = z.enum(["warmup", "working", "amrap", "backoff", "drop", "top", "restpause"])

const loadSpec: z.ZodType<LoadSpec> = z.discriminatedUnion("from", [
  z.object({ from: z.literal("working"), pct: pctOrRange.optional(), of: id.optional(), plus: increment.optional() }).strict(),
  z
    .object({
      from: z.literal("max"),
      max: z.enum(["1rm", "tm", "rm"]),
      pct: pctOrRange,
      of: id.optional(),
      plus: increment.optional(),
    })
    .strict(),
  z.object({ from: z.literal("set"), group: id, slot: id.optional(), pct: pctOrRange }).strict(),
  z.object({ from: z.literal("effort") }).strict(),
  z.object({ from: z.literal("bodyweight"), plusKg: z.number().min(-200).max(500).optional() }).strict(),
  z.object({ from: z.literal("choose") }).strict(),
])

const effort = z
  .object({
    rpe: halfStepOrRange(1, 10).optional(),
    rir: halfStepOrRange(0, 10).optional(),
    lastSetOnly: z.boolean().optional(),
    cap: z.boolean().optional(),
  })
  .strict()
  .refine((e) => e.rpe == null || e.rir == null, { message: "give RPE or RIR, not both" })
  .refine((e) => e.rpe != null || e.rir != null, { message: "an effort target needs an RPE or an RIR" })

const restSec = int(15, 600)
const note = text(500)
const options = z
  .array(z.object({ count: int(1, SPEC_LIMITS.setsPerGroup), reps: int(1, 100) }).strict())
  .min(2)
  .max(10)

const perSet = z
  .array(z.object({ reps: setReps.optional(), pct: pct.optional(), restSec: restSec.optional() }).strict())
  .min(1)
  .max(SPEC_LIMITS.setsPerGroup)

export const SetGroupSchema: z.ZodType<SetGroup> = z
  .object({
    id,
    kind: setKind,
    count: numberOrRange(1, SPEC_LIMITS.setsPerGroup),
    reps: setReps,
    options: options.optional(),
    load: loadSpec,
    effort: effort.optional(),
    perSet: perSet.optional(),
    restSec: restSec.optional(),
    note: note.optional(),
  })
  .strict()
  .refine((g) => g.perSet == null || (typeof g.count === "number" && g.perSet.length === g.count), {
    message: "a set-by-set list needs a fixed number of sets, one entry per set",
  })

const setGroups = z.array(SetGroupSchema).min(1).max(SPEC_LIMITS.setGroupsPerSlot)

const weekOverride = z
  .object({
    weeks: weekSet,
    set: id,
    count: numberOrRange(1, SPEC_LIMITS.setsPerGroup).optional(),
    reps: setReps.optional(),
    options: options.optional(),
    load: loadSpec.optional(),
    effort: effort.optional(),
    perSet: perSet.optional(),
    restSec: restSec.optional(),
    note: note.optional(),
    skip: z.boolean().optional(),
  })
  .strict()

const fails = int(1, 20)
const dropPct = z.number().min(0).max(0.9)
const groupRef = id

const progression = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hold") }).strict(),
  z
    .object({
      kind: z.literal("add-on-success"),
      inc: increment,
      failsBeforeDrop: fails,
      dropPct,
      afterStallInc: increment.optional(),
      direction: z.enum(["up", "down"]).optional(),
      group: groupRef.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("double"),
      inc: increment,
      dropAfterFails: fails.optional(),
      dropPct: dropPct.optional(),
      group: groupRef.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("amrap-table"),
      group: groupRef,
      table: z.array(z.object({ minReps: int(0, 100), inc: increment }).strict()).min(1).max(10),
      target: z.enum(["working", "max"]),
      failsBeforeDrop: fails.optional(),
      dropPct: dropPct.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("per-extra-rep"),
      group: groupRef,
      standard: int(0, 100),
      perRep: increment.optional(),
      pct: z.number().gt(0).max(0.2).optional(),
      capReps: int(1, 100).optional(),
      target: z.enum(["working", "max"]),
    })
    // "Weight or percentage, not both" is checked in `referenceProblems`: a
    // refinement here would stop zod treating this union as discriminated.
    .strict(),
  z
    .object({
      kind: z.literal("stages"),
      stages: z.array(setGroups).min(2).max(6),
      inc: increment,
      onFailLast: z
        .object({ retest: z.boolean().optional(), resetPct: pct.optional(), resetInc: increment.optional() })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("cycle-bump"),
      inc: increment,
      onlyIfAllDone: z.boolean().optional(),
      missDropPct: dropPct.optional(),
      group: groupRef.optional(),
      roundMax: z.boolean().optional(),
    })
    .strict(),
  z.object({ kind: z.literal("by-effort"), group: groupRef.optional() }).strict(),
  z.object({ kind: z.literal("add-set-per-week"), maxSets: int(1, SPEC_LIMITS.setsPerGroup), group: groupRef.optional() }).strict(),
  z
    .object({
      kind: z.literal("ladder"),
      // One rung is a ladder already at its top; the old format allowed it.
      lifts: z.array(LiftRefSchema).min(1).max(20),
      advanceAt: z
        .object({ reps: int(1, 100).optional(), seconds: int(1, 3600).optional() })
        .strict()
        .refine((a) => (a.reps == null) !== (a.seconds == null), { message: "advance on reps or on seconds" }),
    })
    .strict(),
])

const slot = z
  .object({
    id,
    lift: LiftRefSchema,
    choices: z.array(LiftRefSchema).min(2).max(SPEC_LIMITS.choices).optional(),
    group: z.string().regex(/^[A-Za-z0-9_-]{1,8}$/, "a superset tag is up to 8 letters or digits").optional(),
    note: note.optional(),
    restSec: restSec.optional(),
    perSide: z.boolean().optional(),
    dropSets: int(1, 4).optional(),
    sets: setGroups,
    weeks: z.array(weekOverride).max(SPEC_LIMITS.weekOverridesPerSlot).optional(),
    progression,
    stateKey: id.optional(),
  })
  .strict()

/**
 * A day needs a lift — except in a DRAFT. Building a program over two sittings
 * is ordinary, and refusing to save a half-built one is how a builder loses
 * work; starting one checks it again without the exception (the old format's
 * `DraftScheduleSchema` rule, kept).
 */
const daySpec = (minSlots: 0 | 1) =>
  z
    .object({
      id,
      label: text(120),
      weekday: int(1, 7).optional(),
      slots: z.array(slot).min(minSlots).max(SPEC_LIMITS.slotsPerDay),
    })
    .strict()

const calendar = z
  .object({
    days: z.enum(["weekdays", "in-order"]),
    weekCounting: z.enum(["calendar", "completed"]),
    lengthWeeks: int(1, SPEC_LIMITS.weeks).nullable(),
    atEnd: z.enum(["finish", "repeat"]),
    phases: z.array(z.object({ label: text(40), weeks: weekSet }).strict()).max(SPEC_LIMITS.phases).optional(),
    deloadWeeks: weekSet.optional(),
    testWeeks: weekSet.optional(),
  })
  .strict()

const maxSpec = z
  .object({
    lift: id,
    kind: z.enum(["1rm", "tm", "rm"]),
    reps: int(2, 20).optional(),
    tmPct: z.number().min(0.5).max(1).optional(),
    derivedFrom: z.object({ lift: id, pct }).strict().optional(),
  })
  .strict()
  .refine((m) => (m.kind === "rm") === (m.reps != null), { message: "a rep max names its reps, and only a rep max does" })
  .refine((m) => m.kind === "tm" || m.tmPct == null, { message: "only a training max is taken at a percentage" })

const programSpecSchema = (minSlots: 0 | 1): z.ZodType<ProgramSpec> =>
  z
    .object({
      specVersion: z.literal(SPEC_VERSION),
      name: text(80),
      blurb: text(600).optional(),
      credit: text(160).optional(),
      unit: z.enum(["kg", "lb"]),
      calendar,
      maxes: z.array(maxSpec).max(SPEC_LIMITS.maxes).optional(),
      rounding: z
        .object({
          stepKg: z.number().min(0.25).max(25).optional(),
          stepLb: z.number().min(0.5).max(50).optional(),
          mode: z.enum(["nearest", "down"]).optional(),
        })
        .strict()
        .optional(),
      days: z.array(daySpec(minSlots)).min(1).max(SPEC_LIMITS.days),
    })
    .strict()

export const ProgramSpecSchema = programSpecSchema(1)
/** The same program while it is still being written: a day may be empty. */
export const DraftSpecSchema = programSpecSchema(0)

// ---------------------------------------------------------------------------
// References between parts
// ---------------------------------------------------------------------------

/** What a slot's numbers are kept under. */
export const stateKeyOf = (s: Pick<SlotSpec, "id" | "stateKey">) => s.stateKey ?? s.id

/** The lift's display name, for messages. */
export function liftLabel(s: Pick<SlotSpec, "lift">): string {
  return "name" in s.lift && s.lift.name ? s.lift.name : "lib" in s.lift ? s.lift.lib : "this lift"
}

/**
 * The cross-references the shape cannot check, as sentences. `spec` has
 * already passed `ProgramSpecSchema`.
 */
export function referenceProblems(spec: ProgramSpec): string[] {
  const out: string[] = []
  const { calendar } = spec
  const length = calendar.lengthWeeks

  const seenDays = new Set<string>()
  const seenSlots = new Set<string>()
  const keys = new Set<string>()
  for (const day of spec.days) {
    if (seenDays.has(day.id)) out.push(`Two days share the id "${day.id}".`)
    seenDays.add(day.id)
    for (const s of day.slots) {
      if (seenSlots.has(s.id)) out.push(`Two lifts share the id "${s.id}"; every lift needs its own.`)
      seenSlots.add(s.id)
      keys.add(stateKeyOf(s))
    }
  }

  if (calendar.days === "weekdays") {
    const taken = new Map<number, string>()
    for (const day of spec.days) {
      if (day.weekday == null) {
        out.push(`${day.label} has no weekday, and this program runs on weekdays.`)
        continue
      }
      const other = taken.get(day.weekday)
      if (other) out.push(`${other} and ${day.label} are both on the same weekday.`)
      taken.set(day.weekday, day.label)
    }
  }

  const weekBound = (set: string, what: string) => {
    if (length == null) return
    const parsed = parseWeekSet(set)
    if ("weeks" in parsed && parsed.weeks.some((w) => w > length)) {
      out.push(`${what} names week ${Math.max(...parsed.weeks)}, but the program is ${length} weeks long.`)
    }
  }
  for (const p of calendar.phases ?? []) weekBound(p.weeks, `The phase "${p.label}"`)
  if (calendar.deloadWeeks) weekBound(calendar.deloadWeeks, "The deload weeks")
  if (calendar.testWeeks) weekBound(calendar.testWeeks, "The test weeks")

  const maxKeys = new Map((spec.maxes ?? []).map((m) => [m.lift, m]))
  for (const m of spec.maxes ?? []) {
    if (!keys.has(m.lift)) out.push(`A max is given for "${m.lift}", which is no lift in this program.`)
    if (m.derivedFrom && !maxKeys.has(m.derivedFrom.lift)) {
      out.push(`The max for "${m.lift}" is worked out from "${m.derivedFrom.lift}", which has no max.`)
    }
  }

  const slotById = new Map(spec.days.flatMap((d) => d.slots.map((s) => [s.id, { s, day: d }] as const)))

  for (const day of spec.days) {
    day.slots.forEach((s, slotIndex) => {
      const lift = liftLabel(s)
      const where = `${day.label} › ${lift}`
      const groupIds = new Set<string>()
      for (const g of s.sets) {
        if (groupIds.has(g.id)) out.push(`${where}: two set groups are both called "${g.id}".`)
        groupIds.add(g.id)
      }

      const checkLoad = (load: LoadSpec, groupId: string, groupIndex: number, what: string) => {
        if (load.from === "set") {
          if (load.slot && load.slot !== s.id) {
            const ref = slotById.get(load.slot)
            if (!ref) out.push(`${what} is worked out from a lift "${load.slot}" that does not exist.`)
            else if (ref.day.id !== day.id) out.push(`${what} is worked out from a lift on another day; it has to be earlier the same day.`)
            else if (ref.day.slots.indexOf(ref.s) > slotIndex) out.push(`${what} is worked out from ${liftLabel(ref.s)}, which comes after it.`)
            else if (!ref.s.sets.some((g) => g.id === load.group)) {
              out.push(`${what} is worked out from a set group "${load.group}" that ${liftLabel(ref.s)} does not have.`)
            }
          } else {
            const at = s.sets.findIndex((g) => g.id === load.group)
            if (at < 0) out.push(`${what} is worked out from a set group "${load.group}" that ${lift} does not have.`)
            else if (at >= groupIndex && load.group !== groupId) out.push(`${what} is worked out from "${load.group}", which comes after it.`)
            else if (load.group === groupId) out.push(`${what} is worked out from itself.`)
          }
        }
        if (load.from === "max") {
          const key = load.of ?? stateKeyOf(s)
          const m = maxKeys.get(key)
          if (!m) out.push(`${what} is a percentage of the ${load.max.toUpperCase()} of "${key}", and no max is given for it.`)
          else if (m.kind !== load.max) out.push(`${what} uses the ${load.max.toUpperCase()} of "${key}", but its max is a ${m.kind.toUpperCase()}.`)
        }
        if (load.from === "working" && load.of && !keys.has(load.of)) {
          out.push(`${what} is a percentage of "${load.of}", which is no lift in this program.`)
        }
      }

      s.sets.forEach((g, i) => checkLoad(g.load, g.id, i, `${where}, set group "${g.id}"`))

      for (const w of s.weeks ?? []) {
        const label = `${where}: the change for week ${w.weeks}`
        const at = s.sets.findIndex((g) => g.id === w.set)
        if (at < 0) {
          out.push(`Week ${w.weeks} changes a set group "${w.set}" that ${lift} does not have.`)
          continue
        }
        weekBound(w.weeks, label)
        if (w.load) checkLoad(w.load, w.set, at, label)
        const count = w.count ?? s.sets[at].count
        if (w.perSet && !(typeof count === "number" && w.perSet.length === count)) {
          out.push(`${label} lists ${w.perSet.length} sets one by one, which needs exactly that many sets.`)
        }
      }

      const rule = s.progression
      const ruleGroup = "group" in rule ? rule.group : undefined
      if (ruleGroup && !groupIds.has(ruleGroup)) {
        out.push(`${where}: the progression rule follows a set group "${ruleGroup}" that it does not have.`)
      }
      if ((rule.kind === "amrap-table" || rule.kind === "per-extra-rep") && groupIds.has(rule.group)) {
        const g = s.sets.find((x) => x.id === rule.group)!
        const allOut = (r: SetReps | undefined) => r != null && typeof r === "object" && "atLeast" in r
        if (!allOut(g.reps) && !(g.perSet ?? []).some((p) => allOut(p.reps))) {
          out.push(`${where}: the progression rule reads the reps of "${rule.group}", which has no all-out ("+") set.`)
        }
      }
      if (rule.kind === "per-extra-rep" && (rule.perRep == null) === (rule.pct == null)) {
        out.push(`${where}: give either a weight per extra rep or a percentage per extra rep.`)
      }
      if (rule.kind === "cycle-bump" && length == null) {
        out.push(`${where}: a once-a-cycle bump needs a program length in weeks.`)
      }
      if (rule.kind === "ladder" && s.choices) {
        out.push(`${where}: a lift on a ladder cannot also be chosen on the day.`)
      }
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// One answer for callers
// ---------------------------------------------------------------------------

export type SpecCheck = { ok: true; spec: ProgramSpec } | { ok: false; problems: string[] }

/**
 * Check a program from anywhere — a request, a stored row, a fixture — and
 * answer with the program or with every problem in it, in words.
 */
export function checkSpec(input: unknown, opts: { draft?: boolean } = {}): SpecCheck {
  // TextEncoder rather than Buffer: the builder checks programs in the browser too.
  const bytes = new TextEncoder().encode(JSON.stringify(input) ?? "").length
  if (bytes > SPEC_LIMITS.bytes) {
    return { ok: false, problems: [`This program is ${Math.ceil(bytes / 1024)} KB; the most a program can be is 64 KB.`] }
  }
  const parsed = (opts.draft ? DraftSpecSchema : ProgramSpecSchema).safeParse(input)
  if (!parsed.success) return { ok: false, problems: parsed.error.issues.map((i) => explainIssue(i, input)) }
  const problems = referenceProblems(parsed.data)
  return problems.length ? { ok: false, problems } : { ok: true, spec: parsed.data }
}

/** A zod issue as a sentence that says WHERE in the program, by name. */
export function explainIssue(issue: z.ZodIssue, input: unknown): string {
  const where = describePath(issue.path, input)
  const what = (() => {
    switch (issue.code) {
      case z.ZodIssueCode.unrecognized_keys:
        return `${issue.keys.map((k) => `"${k}"`).join(", ")} ${issue.keys.length === 1 ? "is" : "are"} not part of the program format`
      case z.ZodIssueCode.invalid_type:
        return issue.received === "undefined" ? "is missing" : `should be ${article(issue.expected)}, not ${article(issue.received)}`
      case z.ZodIssueCode.too_small:
        return issue.type === "array" ? `needs at least ${issue.minimum}` : issue.type === "string" ? "cannot be empty" : `is below the smallest allowed (${issue.minimum})`
      case z.ZodIssueCode.too_big:
        return issue.type === "array" ? `can hold at most ${issue.maximum}` : issue.type === "string" ? `is longer than ${issue.maximum} characters` : `is above the largest allowed (${issue.maximum})`
      case z.ZodIssueCode.invalid_literal:
        return issue.path.at(-1) === "specVersion" ? `is format ${String(issue.received)}; this app reads format ${SPEC_VERSION}` : `should be ${JSON.stringify(issue.expected)}`
      case z.ZodIssueCode.invalid_enum_value:
        return `should be one of ${issue.options.map((o) => `"${String(o)}"`).join(", ")}`
      case z.ZodIssueCode.invalid_union_discriminator:
        return `should be one of ${issue.options.map((o) => `"${String(o)}"`).join(", ")}`
      case z.ZodIssueCode.invalid_union:
        return "is not in any shape this field can take"
      default:
        return issue.message
    }
  })()
  return where ? `${where}: ${what}.` : `${what[0].toUpperCase()}${what.slice(1)}.`
}

function article(t: string): string {
  return /^[aeiou]/.test(t) ? `an ${t}` : `a ${t}`
}

/** `["days", 2, "slots", 1, "sets", 0, "reps"]` → `Day 3 "Push" › Bench Press › set group "top" › reps`. */
function describePath(path: (string | number)[], input: unknown): string {
  const parts: string[] = []
  let node: unknown = input
  for (let i = 0; i < path.length; i++) {
    const key = path[i]
    const next = node != null && typeof node === "object" ? (node as Record<string | number, unknown>)[key] : undefined
    const prev = path[i - 1]
    if (typeof key === "number") {
      const obj = next as Record<string, unknown> | undefined
      if (prev === "days") parts.push(`Day ${key + 1}${typeof obj?.label === "string" ? ` "${obj.label}"` : ""}`)
      else if (prev === "slots") {
        const lift = obj?.lift as Record<string, unknown> | undefined
        const name = typeof lift?.name === "string" ? lift.name : typeof lift?.lib === "string" ? lift.lib : null
        parts.push(name ?? `lift ${key + 1}`)
      } else if (prev === "sets") parts.push(`set group ${typeof obj?.id === "string" ? `"${obj.id}"` : key + 1}`)
      else if (prev === "weeks") parts.push(`week change ${key + 1}`)
      else if (prev === "stages") parts.push(`stage ${key + 1}`)
      else parts.push(`#${key + 1}`)
    } else if (!["days", "slots", "sets", "weeks", "stages"].includes(key) || typeof path[i + 1] !== "number") {
      // A list's own name is noise before one of its items ("Day 3", not
      // "days › Day 3"), and the subject when the list itself is wrong.
      parts.push(key)
    }
    node = next
  }
  return parts.join(" › ")
}
