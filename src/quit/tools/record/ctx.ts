import type { Dispatch, SetStateAction } from "react"
import type { QuitRecord, RecordUnit } from "../../record"
import type { QuitUnit } from "../../types"
import type { PeriodId, RecordView, Spend, Target } from "./logic"
import type { RecordTab } from "./tabs"

/** A removed row that can still be taken back while the page is open. */
export interface Gone<T> {
  item: T
  index: number
}

/** Screen state that must survive a change of tab (the tabs unmount their screens). */
export interface RecordUi {
  period: PeriodId
  setPeriod: (p: PeriodId) => void
  editing: boolean
  setEditing: (on: boolean) => void
  saved: boolean
  setSaved: (on: boolean) => void
  spendOpen: boolean
  setSpendOpen: (on: boolean) => void
  targetOpen: boolean
  setTargetOpen: (on: boolean) => void
  goneSpends: Gone<Spend>[]
  setGoneSpends: Dispatch<SetStateAction<Gone<Spend>[]>>
  goneTargets: Gone<Target>[]
  setGoneTargets: Dispatch<SetStateAction<Gone<Target>[]>>
  /** Runs `fn` unless the same action (`key`) ran in the last 400 ms: a double tap acts once. */
  tap: (key: string, fn: () => void) => void
}

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
  /** Opens the Money tab with the Change form open. */
  openChange: () => void
  ui: RecordUi
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
