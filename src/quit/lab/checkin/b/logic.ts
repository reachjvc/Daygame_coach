import { addDays, pseudo, streakEnding } from "../shared/logic"

export interface Inventory {
  /** Expected difficulty, 0 easy to 100 hard, from the morning. */
  morning?: number
  /** How hard the day was, 0 easy to 100 hard, from the evening. */
  evening?: number
  morningNote?: string
  eveningNote?: string
}

export interface Entry {
  id: string
  date: string
  title: string
  body: string
}

export type InvLog = Record<string, Inventory>

/** The clock in the example data runs 187 days. */
export const SEED_CLOCK_DAYS = 187

export const clockDays = (startKey: string, today: string): number => {
  let n = 0
  let k = startKey
  while (k < today) {
    k = addDays(k, 1)
    n++
  }
  return n
}

/** Example data: the last 14 days with a forecast and a result each, check-ins on all but two. */
export function seedInventory(today: string): InvLog {
  const out: InvLog = {}
  for (let i = 1; i <= 14; i++) {
    const exp = Math.round(15 + pseudo(i) * 60)
    out[addDays(today, -i)] = { morning: exp, evening: Math.max(0, Math.min(100, exp + Math.round((pseudo(i + 40) - 0.5) * 40))) }
  }
  return out
}

export function seedCheckins(today: string): string[] {
  return Array.from({ length: 14 }, (_, i) => addDays(today, -(i + 1))).filter((_, i) => i !== 4 && i !== 9)
}

export const checkinStreak = (list: string[], today: string) => streakEnding(new Set(list), today)

/** Fill of the hold button after `elapsed` ms of holding, 0 to 1. */
export const holdFill = (elapsedMs: number, holdMs: number) => Math.max(0, Math.min(1, elapsedMs / holdMs))

/** Slider value from a pointer position: the bottom of the track is 0, the top is 100. */
export function valueFromY(y: number, top: number, height: number): number {
  if (height <= 0) return 0
  return Math.round(Math.max(0, Math.min(1, 1 - (y - top) / height)) * 100)
}

/** Difference between forecast and result, or null while one is missing. */
export function gap(inv: Inventory | undefined): number | null {
  return inv && inv.morning !== undefined && inv.evening !== undefined ? inv.evening - inv.morning : null
}

export function seedJournal(today: string): Entry[] {
  return [
    { id: "j1", date: addDays(today, -1), title: "Rough evening, got through it", body: "Around six the pull was strong. I walked it off and called a friend instead, and by the time we hung up the evening felt ordinary again, which was all I wanted from it." },
    { id: "j2", date: addDays(today, -4), title: "Grateful", body: "Slept well, cooked a real dinner, and sat on the balcony afterwards with no noise in my head at all. A plain evening, and I am grateful for plain evenings." },
    { id: "j3", date: addDays(today, -9), title: "A milestone week", body: "Seven days in a row of marking each day. It feels plain, in a good way, like brushing my teeth. Nobody noticed but I did, and that is enough for now." },
    { id: "j4", date: addDays(today, -20), title: "What changed", body: "Mornings are mine now. I use them to train before work, and the day starts with something I chose instead of something I regret." },
    { id: "j5", date: addDays(today, -33), title: "Start", body: "Wrote down why I am doing this and put the page by my bed, where I will see it first thing and last thing, every single day from now on." },
  ]
}
