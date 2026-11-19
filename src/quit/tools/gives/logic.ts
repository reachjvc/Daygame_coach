import { addDays } from "../../record"
import { NEED_IDS, type QuitNeed, type QuitSwap } from "../../types"
import { isDay, isObj, pickInt, pickRecord, pickStrings } from "../common"

export const MAX_NEEDS = 3
/** The id in `picked` for "Something else". */
export const OWN = "own"
export const MAX_TEXT = 60
export const MAX_OWN_PER_NEED = 5

export interface OwnSwap {
  id: string
  text: string
  /** YYYY-MM-DD */
  addedOn: string
}

export interface GivesState {
  /** Screens already passed with Continue or Next. */
  done: number
  /** Null until the reader has chosen; then the picked need ids. */
  picked: string[] | null
  /** What "Something else" stands for, in his words (max 60). */
  ownNeed: string | null
  /** needId (or "own") -> swaps he wrote himself, at most 5 each. */
  own: Record<string, OwnSwap[]>
  /** swapId -> day he said he would try it (YYYY-MM-DD) */
  tried: Record<string, { swapId: string; triedOn: string }>
  /** swapId -> 0..100: how much of the need it gave */
  rated: Record<string, number>
}

export const EMPTY_GIVES: GivesState = { done: 0, picked: null, ownNeed: null, own: {}, tried: {}, rated: {} }

/** Saved state, checked. */
export function parseGives(x: unknown): GivesState {
  const o = isObj(x) ? x : {}
  const tried: GivesState["tried"] = {}
  if (isObj(o.tried)) {
    for (const [k, v] of Object.entries(o.tried)) {
      if (isObj(v) && typeof v.swapId === "string" && isDay(v.triedOn)) tried[k] = { swapId: v.swapId, triedOn: v.triedOn }
    }
  }
  const own: GivesState["own"] = {}
  const seen = new Set<string>()
  if (isObj(o.own)) {
    for (const [need, list] of Object.entries(o.own)) {
      if (!Array.isArray(list)) continue
      const clean: OwnSwap[] = []
      for (const v of list) {
        if (!isObj(v) || typeof v.id !== "string" || typeof v.text !== "string" || !isDay(v.addedOn) || seen.has(v.id)) continue
        const text = tidy(v.text)
        if (text) {
          seen.add(v.id)
          clean.push({ id: v.id, text, addedOn: v.addedOn })
        }
      }
      if (clean.length > 0) own[need] = clean.slice(0, MAX_OWN_PER_NEED)
    }
  }
  const ownNeed = typeof o.ownNeed === "string" && tidy(o.ownNeed) ? tidy(o.ownNeed) : null
  return {
    done: pickInt(o.done, 0, 20, 0),
    picked: pickStrings(o.picked, null),
    ownNeed,
    own,
    tried,
    rated: pickRecord(o.rated, (v): v is number => typeof v === "number" && v >= 0 && v <= 100),
  }
}

/** Trimmed, spaces collapsed, at most 60 characters. */
export function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT).trim()
}

/** First letter upper case, for his own words shown as a heading (stored as typed). */
export function cap(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

/** Would `addOwn` refuse this text because the same swap is already there? */
export function isDuplicateOwn(list: { text: string }[], text: string): boolean {
  const t = tidy(text).toLowerCase()
  return t !== "" && list.some((x) => x.text.toLowerCase() === t)
}

/** Keeps known need ids ("own" too), once each, at most 3. */
export function cleanNeeds(ids: string[], known: readonly string[] = NEED_IDS): string[] {
  const out: string[] = []
  for (const id of ids) if ((known.includes(id) || id === OWN) && !out.includes(id)) out.push(id)
  return out.slice(0, MAX_NEEDS)
}

/** `?need=` wins; else the needs of the top beliefs (in order); unknown ids are ignored. */
export function preselectNeeds(queryNeed: string | null, topBeliefNeeds: string[], known: readonly string[] = NEED_IDS): string[] {
  const fromQuery = queryNeed ? cleanNeeds(queryNeed.split(",").filter((x) => x !== OWN), known) : []
  return fromQuery.length > 0 ? fromQuery : cleanNeeds(topBeliefNeeds.filter((x) => x !== OWN), known)
}

/**
 * Swaps in the order he should see them: rated 60 or more first (highest
 * first), then unrated in data order, then 30 to 59, then under 30.
 */
export function orderSwaps(swaps: QuitSwap[], rated: Record<string, number>): QuitSwap[] {
  const pct = (s: QuitSwap): number | null => {
    const r = rated[s.id]
    return typeof r === "number" && r >= 0 && r <= 100 ? r : null
  }
  const withOrder = swaps.map((s, order) => ({ s, order, p: pct(s) }))
  const rank = (p: number | null): number => (p === null ? 1 : p >= 60 ? 0 : p >= 30 ? 2 : 3)
  return withOrder
    .sort((a, b) => {
      const ra = rank(a.p)
      const rb = rank(b.p)
      if (ra !== rb) return ra - rb
      if (ra === 0) return (b.p ?? 0) - (a.p ?? 0) || a.order - b.order
      return a.order - b.order
    })
    .map((x) => x.s)
}

/* ---------- own swaps ---------- */

/** Adds a swap he wrote. Empty text, a repeat, or a sixth for the same need changes nothing. */
export function addOwn(state: GivesState, need: string, text: string, today: string, stamp: number): GivesState {
  const t = tidy(text)
  const list = state.own[need] ?? []
  if (!t || list.length >= MAX_OWN_PER_NEED) return state
  if (list.some((x) => x.text.toLowerCase() === t.toLowerCase())) return state
  const id = `own-${need}-${stamp.toString(36)}-${list.length}`
  return { ...state, own: { ...state.own, [need]: [...list, { id, text: t, addedOn: today }] } }
}

/** Takes one of his own swaps off, with its rating. */
export function removeOwn(state: GivesState, need: string, id: string): GivesState {
  const rated = { ...state.rated }
  delete rated[id]
  return { ...state, own: { ...state.own, [need]: (state.own[need] ?? []).filter((x) => x.id !== id) }, rated }
}

/** Puts a data swap on his list (the wave-1 shape, which Tool 4 reads). */
export function addTried(state: GivesState, swapId: string, today: string): GivesState {
  if (state.tried[swapId]) return state
  return { ...state, tried: { ...state.tried, [swapId]: { swapId, triedOn: today } } }
}

/** Takes a data swap off his list, with its rating. */
export function removeTried(state: GivesState, swapId: string): GivesState {
  const tried = { ...state.tried }
  const rated = { ...state.rated }
  delete tried[swapId]
  delete rated[swapId]
  return { ...state, tried, rated }
}

/* ---------- rating ---------- */

export const RATINGS = [
  { value: 0, label: "None" },
  { value: 25, label: "A little" },
  { value: 50, label: "Half" },
  { value: 80, label: "Most" },
  { value: 100, label: "All" },
] as const

/** The button a stored number belongs to: under 13 None, 13-37 A little, 38-59 About half, 60-89 Most of it, 90 or more All of it. */
export function ratingIndex(pct: number | undefined): number | null {
  if (typeof pct !== "number") return null
  return pct < 13 ? 0 : pct < 38 ? 1 : pct < 60 ? 2 : pct < 90 ? 3 : 4
}

/** Tapping a button sets it; tapping the chosen one again clears it. */
export function rate(rated: Record<string, number>, swapId: string, value: number): Record<string, number> {
  const next = { ...rated }
  if (next[swapId] === value) delete next[swapId]
  else next[swapId] = value
  return next
}

/** True when the rating shows on the "Most of it" or "All of it" button (60 or more, the same line orderSwaps uses). */
export const isEightyPercent = (pct: number | undefined): boolean => (ratingIndex(pct) ?? 0) >= 3

/* ---------- the lies test ---------- */

/** Lines he tells himself for one need: only beliefs he rated 3 or more; with no test taken, all of them (`people`). */
export function quotesFor<B extends { id: string; need: unknown; limiting: string }>(
  beliefs: B[],
  needId: string,
  ratings: Record<string, number>,
): { lines: string[]; people: boolean } {
  const taken = Object.keys(ratings).length > 0
  const mine = beliefs.filter((b) => b.need === needId)
  if (!taken) return { lines: mine.map((b) => b.limiting), people: true }
  return { lines: mine.filter((b) => (ratings[b.id] ?? 0) >= 3).map((b) => b.limiting), people: false }
}

/**
 * The first screen without an answer (the furthest he may open): a saved list or a walk to the last need
 * shows the result; otherwise the screen after the last one passed, never before the first need.
 */
export function firstScreen(state: GivesState, picked: string[]): number {
  if (state.done === 0 || picked.length === 0) return 1
  const hasList = picked.some((id) => (state.own[id] ?? []).length > 0) || Object.keys(state.tried).length > 0
  if (hasList || state.done > picked.length) return picked.length + 2
  return Math.max(2, state.done + 1)
}

/* ---------- reminder ---------- */

export const REMIND_DAYS = 7
export const REMIND_TITLE = "Rate your swaps"

const compact = (d: string) => d.replace(/-/g, "")
const ics = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

/** The day of the reminder: 7 days after `today`. */
export const remindDay = (today: string): string => addDays(today, REMIND_DAYS)

export function remindText(url: string): string {
  return `Tell the tool how much of it each swap gave you: ${url}`
}

/** RFC 5545: a line is at most 75 octets; a longer one continues on the next line after CRLF and one space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder()
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ""
  let size = 0
  let limit = 75
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (size + n > limit) {
      parts.push(cur)
      cur = ""
      size = 0
      limit = 74
    }
    cur += ch
    size += n
  }
  parts.push(cur)
  return parts.join("\r\n ")
}

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

/** A 30-minute event at 19:00 local time, 7 days from today, with one alarm at the start. DTSTAMP is the time it was made. */
export function ratingIcs(today: string, now: Date, url: string): string {
  const d = compact(remindDay(today))
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Quit swaps//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:swaps-${d}-${now.getTime()}@quit-swaps`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${d}T190000`,
    `DTEND:${d}T193000`,
    `SUMMARY:${ics(REMIND_TITLE)}`,
    `DESCRIPTION:${ics(remindText(url))}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${ics(REMIND_TITLE)}`,
    "TRIGGER:PT0S",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ]
    .map(foldLine)
    .join("\r\n")
}

export function ratingGoogleUrl(today: string, url: string): string {
  const d = compact(remindDay(today))
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(REMIND_TITLE)}&dates=${d}T190000/${d}T193000&details=${encodeURIComponent(remindText(url))}`
}

/* ---------- the list on the result ---------- */

export const ALSO = "also"

export interface ListItem {
  id: string
  text: string
  /** YYYY-MM-DD he put it on the list */
  since: string
  kind: "own" | "swap"
  /** The need it belongs to ("own" for Something else). */
  need: string
}

export interface ListGroup {
  /** A picked need id, "own", or ALSO for swaps of needs that are no longer picked. */
  id: string
  items: ListItem[]
}

/** His list by picked need (own swaps first, then data swaps in `orderSwaps` order), then what is on it for needs he no longer picks. */
export function listGroups(state: GivesState, picked: string[], needs: QuitNeed[]): ListGroup[] {
  const own = (need: string): ListItem[] => (state.own[need] ?? []).map((o) => ({ id: o.id, text: o.text, since: o.addedOn, kind: "own", need }))
  const data = (n: QuitNeed): ListItem[] =>
    orderSwaps(n.swaps.filter((s) => state.tried[s.id]), state.rated).map((s) => ({ id: s.id, text: s.text, since: state.tried[s.id].triedOn, kind: "swap", need: n.id }))
  const groups: ListGroup[] = picked.map((id) => ({ id, items: [...own(id), ...(id === OWN ? [] : data(needs.find((n) => n.id === id) ?? { id, name: id, swaps: [] } as unknown as QuitNeed))] }))
  const also: ListItem[] = []
  for (const n of needs) if (!picked.includes(n.id)) also.push(...own(n.id), ...data(n))
  if (!picked.includes(OWN)) also.push(...own(OWN))
  return [...groups, { id: ALSO, items: also }]
}
