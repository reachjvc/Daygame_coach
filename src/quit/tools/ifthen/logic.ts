import { isDay, isObj, pickInt, pickOne, pickStrings } from "../common"

export const MAX_OWN_MOMENT = 80
export const MAX_THEN = 160
export const MAX_PRE_TICKS = 3

export type From = "card" | "idea" | "own"
const FROMS = ["card", "idea", "own"] as const

/** One plan line: a moment and the one thing he will do there. */
export interface Line {
  id: string
  /** The data file's moment id, or null for a moment he typed. */
  momentId: string | null
  /** His words for a typed moment; for a list moment, its label as last shown (kept so the line never goes nameless). */
  ownMoment: string
  then: string
  from: From
}

export interface Choice {
  then: string
  from: From
}

export interface Draft {
  /** Moment ids, or `own:<text>` for a moment he typed. */
  ticked: string[]
  choices: Record<string, Choice>
  /** True when the first ticks came from his Black Box saves (the banner shows while it holds). */
  pre: boolean
  /** The furthest screen he has been on (screen 1 until he taps Continue); a reload lands there. */
  reached: number
}

export interface IfthenState {
  lines: Line[]
  draft: Draft | null
  /** ISO day the plan asks "did these work?", or "". */
  checkin: string
  reviews: Record<string, "kept" | "change">
}

export const EMPTY_IFTHEN: IfthenState = { lines: [], draft: null, checkin: "", reviews: {} }

const OWN = "own:"
export const ownKey = (text: string): string => `${OWN}${text.trim()}`
export const lineKey = (l: Pick<Line, "momentId" | "ownMoment">): string => (l.momentId ? l.momentId : ownKey(l.ownMoment))
/** Adds a typed moment key unless the same words are ticked already (case ignored). */
export function addOwn(ticked: string[], text: string): string[] {
  const t = text.trim().slice(0, MAX_OWN_MOMENT)
  if (t === "" || ticked.some((k) => k.toLowerCase() === ownKey(t).toLowerCase())) return ticked
  return [...ticked, ownKey(t)]
}

export const newLineId = (): string => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

function parseLine(x: unknown): Line | null {
  if (!isObj(x) || typeof x.id !== "string" || x.id === "" || typeof x.then !== "string") return null
  const momentId = typeof x.momentId === "string" && x.momentId !== "" ? x.momentId : null
  const ownMoment = typeof x.ownMoment === "string" ? x.ownMoment.trim().slice(0, MAX_OWN_MOMENT) : ""
  const then = x.then.slice(0, MAX_THEN)
  if (then.trim() === "" || (momentId === null && ownMoment === "")) return null
  return { id: x.id, momentId, ownMoment, then, from: pickOne(x.from, FROMS, "own") }
}

function parseDraft(x: unknown): Draft | null {
  if (!isObj(x)) return null
  const ticked: string[] = []
  for (const k of pickStrings(x.ticked, [] as string[])) {
    const key = k.startsWith(OWN) ? `${OWN}${k.slice(OWN.length).trim().slice(0, MAX_OWN_MOMENT)}` : k
    if (key !== "" && key !== OWN && !ticked.includes(key)) ticked.push(key)
  }
  const choices: Record<string, Choice> = {}
  if (isObj(x.choices)) {
    for (const [k, v] of Object.entries(x.choices)) {
      if (isObj(v) && typeof v.then === "string") choices[k] = { then: v.then.slice(0, MAX_THEN), from: pickOne(v.from, FROMS, "own") }
    }
  }
  return { ticked, choices, pre: x.pre === true, reached: pickInt(x.reached, 1, 100, 1) }
}

/** A draft that shows the plan again: every line's moment ticked with its "then". */
export function draftFromLines(lines: Line[], reached: "plan" | "pick" = "plan"): Draft {
  const ticked: string[] = []
  const choices: Record<string, Choice> = {}
  for (const l of lines) {
    const k = lineKey(l)
    if (ticked.includes(k)) continue
    ticked.push(k)
    choices[k] = { then: l.then, from: l.from }
  }
  return { ticked, choices, pre: false, reached: reached === "plan" ? ticked.length + 2 : 1 }
}

/** Trusts nothing: bad pieces are dropped, not repaired. */
export function parseIfthen(raw: unknown): IfthenState {
  if (!isObj(raw)) return EMPTY_IFTHEN
  const lines: Line[] = []
  if (Array.isArray(raw.lines)) {
    for (const x of raw.lines) {
      const l = parseLine(x)
      if (l && !lines.some((q) => q.id === l.id || lineKey(q) === lineKey(l))) lines.push(l)
    }
  }
  const reviews: IfthenState["reviews"] = {}
  if (isObj(raw.reviews)) for (const [k, v] of Object.entries(raw.reviews)) if (v === "kept" || v === "change") reviews[k] = v
  const draft = parseDraft(raw.draft) ?? (lines.length > 0 ? draftFromLines(lines) : null)
  return { lines, draft, checkin: isDay(raw.checkin) ? raw.checkin : "", reviews }
}

/** His close calls and slips as ticks: the list moments named in `where`, most often first, at most three. */
export function preTicks(reports: { where: string }[], moments: { id: string }[]): { id: string; count: number }[] {
  const counts = moments.map((m) => ({ id: m.id, count: reports.filter((r) => r.where === m.id).length }))
  return counts
    .map((c, i) => ({ ...c, i }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.i - b.i)
    .slice(0, MAX_PRE_TICKS)
    .map(({ id, count }) => ({ id, count }))
}

/** Adds a typed moment to the draft's ticks. */
export const withOwn = (d: Draft | null, text: string): Draft => {
  const cur = d ?? { ticked: [], choices: {}, pre: false, reached: 1 }
  return { ...cur, ticked: addOwn(cur.ticked, text) }
}

/** Toggles one moment key in a draft; a key that was ticked loses its answer. */
export function toggleTick(d: Draft | null, key: string): Draft {
  const cur = d ?? { ticked: [], choices: {}, pre: false, reached: 1 }
  if (cur.ticked.includes(key)) return { ...cur, ticked: cur.ticked.filter((k) => k !== key) }
  return { ...cur, ticked: [...cur.ticked, key] }
}

/** Typed negations the nudge looks for. Plain "stop" is left out ("stop at the shop" is a plan). */
const NEGATION = /(^|[^\p{L}])(won['’]?t|will\s+not|do\s+not|don['’]?t|not|never)(?![\p{L}])/iu
export const hasNegation = (text: string): boolean => NEGATION.test(text)

/** The text of a card part for display: one full stop at the end, never two. */
export function withStop(text: string): string {
  const s = text.trim()
  if (s === "") return ""
  return /[.!?…]$/.test(s) ? s : `${s}.`
}

/** The "If" part of a card: a leading "When" is dropped and the first letter is lower case ("If after a meal", "If I’m stressed"). */
export function ifText(label: string): string {
  const s = label.trim()
  const rest = s.replace(/^when\s+/i, "")
  const t = rest === "" ? s : rest
  return /^I(\s|['’]|$)/.test(t) ? t : t[0].toLowerCase() + t.slice(1)
}

/** Quick ideas that cannot or must not be done at a moment are not offered there. */
export const IDEA_EXCLUDE: Record<string, string[]> = {
  driving: ["move5", "leave", "text", "puzzle", "teeth"],
  drinks: ["move5", "teeth"],
  waking: ["leave"],
  "after-food": ["teeth"],
}

/** The quick ideas offered at one moment (a moment he typed gets them all). */
export function ideasFor<T extends { id: string }>(momentId: string | null, ideas: T[]): T[] {
  const no = momentId ? (IDEA_EXCLUDE[momentId] ?? []) : []
  return ideas.filter((x) => !no.includes(x.id))
}

/** Is a "then" something he can keep (not empty or spaces)? */
export const thenOk = (c: Choice | undefined): c is Choice => !!c && c.then.trim() !== ""

/** How many moments from the first have an answer, in a row. */
export function answeredRun(d: Draft): number {
  let n = 0
  for (const k of d.ticked) {
    if (!thenOk(d.choices[k])) break
    n++
  }
  return n
}

/** The furthest screen he may be on: screen 1 is the moments, then one per ticked moment, then the plan. */
export function firstUnanswered(d: Draft | null): number {
  if (!d || d.ticked.length === 0) return 1
  return Math.max(1, Math.min(d.reached, 2 + answeredRun(d)))
}

/** The draft after he reached `screen` (never moves back). */
export const reachedTo = (d: Draft, screen: number): Draft => (screen > d.reached ? { ...d, reached: screen } : d)

export const totalScreens = (d: Draft | null): number => 1 + (d?.ticked.length ?? 0)

/** The step count the progress bar shows: the moments screen, one per ticked moment, and the plan (at least 2). */
export const shownTotal = (d: Draft | null): number => Math.max(2, (d?.ticked.length ?? 0) + 2)

/** The index of the first ticked moment with no answer, or -1 when every ticked moment has one. */
export function firstOpenMoment(d: Draft): number {
  return d.ticked.findIndex((k) => !thenOk(d.choices[k]))
}

/** First capital letter, for display only ("go to the gym" reads "Go to the gym"). */
export const capFirst = (s: string): string => (s === "" ? s : s[0].toUpperCase() + s.slice(1))

/** A "then" as a card shows it: capital first letter, one full stop. */
export const showThen = (text: string): string => withStop(capFirst(text.trim()))

const plain = (s: string): string => s.replace(/[’‘`]/g, "'").trim().replace(/\s+/g, " ").toLowerCase()

/** The list moment whose label he typed (case and apostrophe style ignored), or null. */
export function matchMoment<M extends { id: string; label: string }>(text: string, moments: M[]): M | null {
  const t = plain(text)
  return t === "" ? null : (moments.find((m) => plain(m.label) === t) ?? null)
}

/** Drops lines and ticks of a list moment that the data file no longer has (corrupt or old storage). */
/** The name a line takes when its list moment is gone from the data file. */
export const OTHER_MOMENT = "Other moment"

/**
 * Keeps the state in step with the data file without losing anything he entered. A list line stores its moment's
 * current label. A line whose moment the data file no longer has becomes a line of a typed moment, under its stored
 * label (or "Other moment", numbered when taken), so it stays on the plan with Change and Remove. A tick of a missing
 * moment with an answer moves the same way; a bare tick of a missing moment is dropped (nothing he wrote is in it).
 * Returns the same object when nothing changes.
 */
export function cleanState(s: IfthenState, moments: { id: string; label: string }[]): IfthenState {
  const labelOf = new Map(moments.map((m) => [m.id, m.label]))
  const taken = new Set(s.lines.filter((l) => l.momentId === null).map((l) => l.ownMoment.toLowerCase()))
  for (const k of s.draft?.ticked ?? []) if (k.startsWith(OWN)) taken.add(k.slice(OWN.length).toLowerCase())
  const moved = new Map<string, string>()
  const freeName = (want: string): string => {
    const base = (want.trim() || OTHER_MOMENT).slice(0, MAX_OWN_MOMENT - 3)
    let name = base
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} ${n}`
    taken.add(name.toLowerCase())
    return name
  }
  let changed = false
  const lines = s.lines.map((l) => {
    if (l.momentId === null) return l
    const label = labelOf.get(l.momentId)
    if (label !== undefined) {
      if (l.ownMoment === label) return l
      changed = true
      return { ...l, ownMoment: label }
    }
    changed = true
    const name = moved.get(l.momentId) ?? freeName(l.ownMoment)
    moved.set(l.momentId, name)
    return { ...l, momentId: null, ownMoment: name }
  })
  let draft = s.draft
  if (draft && draft.ticked.some((k) => !k.startsWith(OWN) && !labelOf.has(k))) {
    changed = true
    const ticked: string[] = []
    const choices: Record<string, Choice> = { ...draft.choices }
    for (const k of draft.ticked) {
      if (k.startsWith(OWN) || labelOf.has(k)) {
        ticked.push(k)
        continue
      }
      const c = choices[k]
      delete choices[k]
      const name = moved.get(k) ?? (thenOk(c) ? freeName("") : null)
      if (name === null) continue
      const nk = ownKey(name)
      if (!ticked.includes(nk)) ticked.push(nk)
      if (thenOk(c) && !thenOk(choices[nk])) choices[nk] = c
    }
    draft = { ...draft, ticked, choices }
  }
  return changed ? { ...s, lines, draft } : s
}

export interface Removed {
  line: Line
  index: number
}

/**
 * The plan after "See my plan": lines of still-ticked moments stay (their "then" follows the draft's choice),
 * new moments are added at the end, unticked ones are taken out. `removed` says what went and where it stood.
 */
export function applyDraft(lines: Line[], d: Draft, makeId: () => string = newLineId): { lines: Line[]; removed: Removed[] } {
  const keep = new Set(d.ticked)
  const removed: Removed[] = []
  const next: Line[] = []
  lines.forEach((l, index) => {
    if (keep.has(lineKey(l))) {
      const c = d.choices[lineKey(l)]
      next.push(thenOk(c) ? { ...l, then: c.then.trim(), from: c.from } : l)
    } else removed.push({ line: l, index })
  })
  for (const k of d.ticked) {
    if (next.some((l) => lineKey(l) === k)) continue
    const c = d.choices[k]
    if (!thenOk(c)) continue
    const own = k.startsWith(OWN)
    next.push({ id: makeId(), momentId: own ? null : k, ownMoment: own ? k.slice(OWN.length) : "", then: c.then.trim(), from: c.from })
  }
  return { lines: next, removed }
}

/** Adds one removal to the list; `index` is where the line stood in the plan before any of these removals. */
export function addRemoved(removed: Removed[], line: Line, index: number): Removed[] {
  let at = index
  for (const r of [...removed].sort((a, b) => a.index - b.index)) if (r.index <= at) at++
  return [...removed, { line, index: at }]
}

/** Puts a line back where it stood (lowest index first), as "Undo" does. */
export function restore(lines: Line[], removed: Removed[]): Line[] {
  const out = [...lines]
  for (const r of [...removed].sort((a, b) => a.index - b.index)) out.splice(Math.min(r.index, out.length), 0, r.line)
  return out
}

/** Move one line up (-1) or down (+1); out-of-range changes nothing. */
export function moveLine(lines: Line[], id: string, dir: -1 | 1): Line[] {
  const i = lines.findIndex((l) => l.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= lines.length) return lines
  const next = [...lines]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** True on or after the check-back day. */
export const isDue = (checkin: string, today: string): boolean => checkin !== "" && today !== "" && checkin <= today

/** Kept and change answers, and how many lines are still open. */
export function reviewCounts(lines: Line[], reviews: IfthenState["reviews"]): { kept: number; change: number; open: number } {
  let kept = 0
  let change = 0
  for (const l of lines) {
    if (reviews[l.id] === "kept") kept++
    else if (reviews[l.id] === "change") change++
  }
  return { kept, change, open: lines.length - kept - change }
}

/** The "then" he wrote for a moment, for Craving now? (first line of that moment). */
export const lineForMoment = (lines: Line[], momentId: string): Line | null => lines.find((l) => l.momentId === momentId) ?? null

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** `2026-12-03` as "Thu 3 Dec". */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${WEEKDAYS[wd]} ${d} ${MONTHS[m - 1]}`
}
