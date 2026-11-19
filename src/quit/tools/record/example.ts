import type { BlackBoxRecord, ViceAttempt, ViceReport } from "@/src/vice/types"
import { addDays, type RecordUnit } from "../../record"
import type { Spend, Target } from "./logic"

/**
 * The example shown from "See an example": made in memory, relative to today, every time. It is never written to
 * the store or to the Black Box.
 */
export interface ExampleData {
  box: BlackBoxRecord
  unit: RecordUnit
  spends: Spend[]
  targets: Target[]
}

const STAMP = "2026-01-01T00:00:00.000Z"

export function exampleFor(today: string, viceId: string): ExampleData {
  const attempt = (id: string, start: string, end: string | null, by: string | null): ViceAttempt => ({
    id,
    viceId,
    label: "Example",
    startedOn: start,
    startedBy: "",
    structure: [],
    endedOn: end,
    endedByReportId: by,
    updatedAt: STAMP,
    deletedAt: null,
  })
  const report = (id: string, attemptId: string, day: string, wentThrough: boolean, thought: string): ViceReport => ({
    id,
    attemptId,
    at: `${day}T12:00:00`,
    wentThrough,
    thought,
    ending: "other",
    closeness: null,
    withWhom: "",
    where: "",
    factors: [],
    didInstead: "",
    updatedAt: STAMP,
    deletedAt: null,
  })
  const slipDay = addDays(today, -37)
  const box: BlackBoxRecord = {
    version: 1,
    attempts: [attempt("ex-run-1", addDays(today, -45), slipDay, "ex-slip"), attempt("ex-run-2", addDays(slipDay, 1), null, null)],
    reports: [
      report("ex-close-1", "ex-run-1", addDays(today, -41), false, "Just one with the guys"),
      report("ex-slip", "ex-run-1", slipDay, true, "One will not matter"),
      report("ex-close-2", "ex-run-2", addDays(today, -20), false, "I deserve a break after this week"),
      report("ex-close-3", "ex-run-2", addDays(today, -8), false, "I can stop again tomorrow"),
    ],
  }
  return {
    box,
    unit: { id: "cigarettes", perDay: 10, priceUsd: 0.52, priceBasis: "default" },
    spends: [],
    targets: [{ id: "ex-target", name: "New headphones", price: 150 }],
  }
}
