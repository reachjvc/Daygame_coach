import { addDays, daysBetween } from "../shared/logic"

export interface ClockData {
  id: string
  name: string
  /** Day key the clock started. */
  start: string
  color: string
}

/** Example clocks for "my clocks" and for the partner's shared ones. */
export function seedClocks(today: string): ClockData[] {
  return [
    { id: "c1", name: "Alcohol free", start: addDays(today, -52), color: "#0ea5e9" },
    { id: "c2", name: "No doomscrolling", start: addDays(today, -23), color: "#a855f7" },
    { id: "c3", name: "Vape free", start: addDays(today, -11), color: "#22c55e" },
    { id: "c4", name: "Less sugar", start: addDays(today, -4), color: "#f97316" },
  ]
}

export function seedPartnerClocks(today: string): ClockData[] {
  return [
    { id: "p1", name: "Alcohol free", start: addDays(today, -140), color: "#0ea5e9" },
    { id: "p2", name: "Shopping free", start: addDays(today, -60), color: "#0ea5e9" },
  ]
}

export const clockDayCount = (c: ClockData, today: string) => daysBetween(c.start, today)

/** Where the small dot sits on the ring edge: the share of the current day that has passed, 0 to 1. */
export const dayShare = (nowMs: number) => {
  const d = new Date(nowMs)
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400
}

/** Milestone tokens, in days. */
export const TOKEN_DAYS = [1, 3, 7, 30, 180, 365] as const

/** A token is earned when the clock has run at least that many whole days. */
export const tokenEarned = (days: number, tokenDays: number) => days >= tokenDays

/** Day key on which a token is earned. */
export const tokenDate = (start: string, tokenDays: number) => addDays(start, tokenDays)

/** Streak figures for the stats card: current run is the days since the last reset; resets counted by the user. */
export function clockStats(start: string, today: string, resets: number) {
  return { current: daysBetween(start, today), resets }
}

/** Time label for a chat bubble, e.g. "8:05 AM". */
export function timeLabel(ms: number): string {
  const d = new Date(ms)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, "0")
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "AM" : "PM"}`
}

export interface Msg {
  id: string
  mine: boolean
  text: string
  at: number
  photo?: boolean
}

export function seedMessages(now: number): Msg[] {
  const m = (id: string, mine: boolean, text: string, minAgo: number): Msg => ({ id, mine, text, at: now - minAgo * 60_000 })
  return [
    m("m1", false, "Great to see your clock keep going. How are you feeling?", 40),
    m("m2", true, "Calmer than I thought I would be. The mornings help.", 33),
    m("m3", false, "Glad to hear it. Check in with me tomorrow?", 20),
    m("m4", true, "Yes, after breakfast.", 12),
  ]
}
