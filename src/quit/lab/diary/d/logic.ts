import { lastDays, rnd } from "../shared/logic"

export interface LogEntry {
  at: number
  date: string
  mode: "overcame" | "smoked"
  strength: number
  feeling: number
  context: number
  ex?: boolean
}

/** 14 days of example entries ending the day before `now`, one a day. */
export function seedLog(now: number): LogEntry[] {
  return lastDays(now - 86_400_000, 14).map((date, i) => ({
    at: new Date(`${date}T${String(8 + Math.floor(rnd(i + 5) * 12)).padStart(2, "0")}:15:00`).getTime(),
    date,
    mode: i === 5 ? "smoked" : "overcame",
    strength: 3 + Math.floor(rnd(i + 11) * 7),
    feeling: Math.floor(rnd(i + 21) * 8),
    context: Math.floor(rnd(i + 31) * 4),
    ex: true,
  }))
}
