import { isIsoDay } from "../../record"
import { isObj } from "../common"
import { MAX_NOTE, MAX_SPEND, MAX_TARGET, type Spend, type Target } from "./logic"

/** The tool's own saved data, under the tool key `record-tool` in the `quit-v1` store. */
export interface RecordToolState {
  spends: Spend[]
  targets: Target[]
}

export const EMPTY_RECORD_TOOL: RecordToolState = { spends: [], targets: [] }

const money = (x: unknown, max: number): x is number => typeof x === "number" && Number.isFinite(x) && x > 0 && x <= max

export function parseRecordTool(raw: unknown): RecordToolState {
  if (!isObj(raw)) return EMPTY_RECORD_TOOL
  const spends: Spend[] = []
  if (Array.isArray(raw.spends)) {
    for (const s of raw.spends) {
      if (!isObj(s) || typeof s.id !== "string" || !isIsoDay(s.day) || !money(s.amount, MAX_SPEND)) continue
      spends.push({ id: s.id, day: s.day, amount: s.amount, note: typeof s.note === "string" ? s.note.slice(0, MAX_NOTE) : "" })
    }
  }
  const targets: Target[] = []
  if (Array.isArray(raw.targets)) {
    for (const t of raw.targets) {
      if (!isObj(t) || typeof t.id !== "string" || typeof t.name !== "string" || !money(t.price, MAX_TARGET)) continue
      targets.push({ id: t.id, name: t.name.slice(0, MAX_NOTE), price: t.price })
    }
  }
  return { spends, targets }
}

let counter = 0
/** A new id for a spend or a target. */
export function newId(): string {
  counter += 1
  return `${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
