import { isObj, pickBool, pickInt, pickOne, pickStr } from "../common"
import { isIsoDay, QUIT_GOALS, type QuitGoal } from "../../record"
import { BREAK_LENS, breakEnd, dateAllowed, type BreakLen } from "./logic"

/** What the reader has answered so far on the way to the result. The shared record is written from it at the end. */
export interface DateState {
  goal: QuitGoal | null
  start: string | null
  len: BreakLen | null
  setEnd: string
  /** After a finished break: "Another break" counts its length from today, not from the old start. */
  another: boolean
  unitId: string | null
  perDay: string
  price: string
  priceTouched: boolean
  /** How many question screens on the path were passed with Continue (answering alone moves nothing). */
  done: number
  /** "Change my date" is open: the next date goes straight to the result. */
  editing: boolean
  /** The break end whose "what now?" choices were set aside with "Not now". */
  ackEnd: string | null
}

export const EMPTY_DATE: DateState = {
  goal: null,
  start: null,
  len: null,
  setEnd: "",
  another: false,
  unitId: null,
  perDay: "",
  price: "",
  priceTouched: false,
  done: 0,
  editing: false,
  ackEnd: null,
}

export function parseDateState(raw: unknown): DateState {
  if (!isObj(raw)) return EMPTY_DATE
  const goal = pickOne<QuitGoal, null>(raw.goal, QUIT_GOALS, null)
  const day = (x: unknown) => (typeof x === "string" && isIsoDay(x) ? x : null)
  return {
    goal,
    start: day(raw.start),
    len: pickOne<BreakLen, null>(raw.len, BREAK_LENS, null),
    setEnd: day(raw.setEnd) ?? "",
    another: pickBool(raw.another, false),
    unitId: pickStr(raw.unitId, null),
    perDay: pickStr(raw.perDay, "").slice(0, 12),
    price: pickStr(raw.price, "").slice(0, 12),
    priceTouched: pickBool(raw.priceTouched, false),
    done: pickInt(raw.done, 0, 6, 0),
    editing: pickBool(raw.editing, false),
    ackEnd: day(raw.ackEnd),
  }
}

export type ScreenId = "goal" | "date" | "length" | "use" | "plan"

/** The question screens on the reader's path; the result is the screen after the last one. */
export function screensFor(goal: QuitGoal | null, another = false): ScreenId[] {
  if (goal === "break") return another ? ["goal", "date", "length"] : ["goal", "date", "length", "use", "plan"]
  if (goal === "stop") return ["goal", "date", "use", "plan"]
  return ["goal"]
}

/** The day a break is counted from: its start, or today after a finished break. */
export const breakBase = (s: DateState, today: string): string | null => (s.another ? today : s.start)

/** An answer that no longer holds (a date now out of range) sends the reader back to it. */
export function holds(s: DateState, id: ScreenId, today: string): boolean {
  switch (id) {
    case "date":
      return s.another || dateAllowed(s.start, today)
    case "length": {
      const base = breakBase(s, today)
      return s.len !== null && base !== null && breakEnd(base, s.len, s.setEnd || null) !== null
    }
    default:
      return true
  }
}

/** Number (1-based) of the first screen not passed; the result when all are. */
export function firstUnanswered(s: DateState, today: string): number {
  const list = screensFor(s.goal, s.another)
  const i = list.findIndex((id, k) => k >= s.done || !holds(s, id, today))
  return i === -1 ? list.length + 1 : i + 1
}
