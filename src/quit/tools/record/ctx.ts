import type { QuitRecord, RecordUnit } from "../../record"
import type { QuitUnit } from "../../types"
import type { RecordView, Spend, Target } from "./logic"
import type { RecordTab } from "./tabs"

/** What every screen of the record reads. One value per second, so every number on a screen agrees. */
export interface RecordCtx {
  addiction: string
  today: string
  nowMs: number
  view: RecordView
  record: QuitRecord
  unit: RecordUnit | null
  unitData: QuitUnit | null
  units: QuitUnit[]
  spends: Spend[]
  targets: Target[]
  /** The example: nothing can be changed. */
  readOnly: boolean
  carry: (path: string) => string
  openTab: (tab: RecordTab) => void
  actions: {
    saveUnit: (u: RecordUnit) => void
    addSpend: (s: Spend) => void
    removeSpend: (id: string) => void
    /** Puts a removed spend back where it was. */
    restoreSpend: (s: Spend, index: number) => void
    addTarget: (x: Target) => void
    removeTarget: (id: string) => void
    restoreTarget: (x: Target, index: number) => void
  }
}
