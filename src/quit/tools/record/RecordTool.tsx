"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { CalendarDays, Flag, House, Wallet } from "lucide-react"
import { useSignedIn } from "../../blackbox"
import { isLiveTool } from "../../menu"
import { todayIso, useQuitRecord, type QuitRecord, type RecordUnit } from "../../record"
import type { QuitUnit, ToolProps } from "../../types"
import { usable } from "../common"
import { useCarry, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { LocalBox, SignedBox, type RecordBox } from "./box"
import { CalendarTab } from "./CalendarTab"
import type { Gone, RecordCtx, RecordUi } from "./ctx"
import { exampleFor } from "./example"
import { fmtDay } from "./fmt"
import { HomeTab } from "./HomeTab"
import { daysBetween, runToStart, viewOf, type PeriodId, type Spend, type Target } from "./logic"
import { MilestonesTab } from "./MilestonesTab"
import { MoneyTab } from "./MoneyTab"
import { EMPTY_RECORD_TOOL, parseRecordTool, type RecordToolState } from "./state"
import { RECORD_TABS, parseTab, type RecordTab } from "./tabs"
import { recordText as t } from "./text"

const TAB_ICON = { home: House, money: Wallet, milestones: Flag, calendar: CalendarDays } as const

/** Now in ms, refreshed every second (the counter and the money tick with it). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 1000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return now
}

/** Your record: clean days, money kept, milestones and a calendar, read from the Black Box and the shared quit record. */
export function RecordTool({ addiction, data }: ToolProps) {
  const units = usable<QuitUnit[]>(data.units)
  if (!units || units.length === 0) return <NotReady />
  return <Inner addiction={addiction} units={units} />
}

function Inner({ addiction, units }: { addiction: string; units: QuitUnit[] }) {
  const signedIn = useSignedIn(false, true)
  const [box, setBox] = useState<RecordBox | null>(null)
  const onBox = useCallback((b: RecordBox | null) => setBox(b), [])
  // One Black Box sync for the whole page: the bridge is mounted once, at a fixed place.
  return (
    <div className="w-full">
      {signedIn === true ? <SignedBox key="in" viceId={addiction} onBox={onBox} /> : null}
      {signedIn === false ? <LocalBox key="out" viceId={addiction} onBox={onBox} /> : null}
      <Screens addiction={addiction} units={units} box={box} />
    </div>
  )
}

function Screens({ addiction, units, box }: { addiction: string; units: QuitUnit[]; box: RecordBox | null }) {
  const carry = useCarry()
  const pathname = usePathname()
  const sp = useSearchParams()
  const rec = useQuitRecord(addiction)
  const tool = useToolState<RecordToolState>(addiction, "record-tool", EMPTY_RECORD_TOOL, parseRecordTool)
  const nowMs = useNow()
  const today = todayIso(new Date(nowMs))
  const [refused, setRefused] = useState(false)
  const tried = useRef<string | null>(null)
  // Screen state kept here so it survives a change of tab (the tabs unmount their screens).
  const [period, setPeriod] = useState<PeriodId>("total")
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [spendOpen, setSpendOpen] = useState(false)
  const [targetOpen, setTargetOpen] = useState(false)
  const [goneSpends, setGoneSpends] = useState<Gone<Spend>[]>([])
  const [goneTargets, setGoneTargets] = useState<Gone<Target>[]>([])
  const lastTap = useRef<Map<string, number>>(new Map())
  const tap = useCallback((key: string, fn: () => void) => {
    const now = Date.now()
    const last = lastTap.current.get(key)
    if (last !== undefined && now - last < 400) return
    lastTap.current.set(key, now)
    fn()
  }, [])
  const ui: RecordUi = { period, setPeriod, editing, setEditing, saved, setSaved, spendOpen, setSpendOpen, targetOpen, setTargetOpen, goneSpends, setGoneSpends, goneTargets, setGoneTargets, tap }
  const openChange = () => {
    setSaved(false)
    setEditing(true)
    openTab("money")
  }

  const view = useMemo(() => (box ? viewOf(box.record, addiction, today) : null), [box, addiction, today])
  const start = view && rec.ready ? runToStart(rec.record.quitDate, rec.record.goal, today, view) : null

  // The first visit on or after the date starts the run (a past date backdates it), only when the Black Box holds none from that date on.
  useEffect(() => {
    if (!box || !box.settled || !start || tried.current === start) return
    tried.current = start
    // `today` ticks, so a page left open past midnight starts the run on the day it arrives.
    if (!box.startRun(start, today)) setRefused(true)
  }, [box, start, today])

  const hrefFor = useCallback(
    (change: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString())
      change(p)
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [sp, pathname],
  )
  const tab = parseTab(sp.get("tab"))
  const openTab = useCallback(
    (next: RecordTab) =>
      window.history.pushState(
        null,
        "",
        hrefFor((p) => {
          if (next === "home") p.delete("tab")
          else p.set("tab", next)
        }),
      ),
    [hrefFor],
  )
  const exampleOn = sp.get("example") === "1"
  const setExample = (on: boolean) =>
    window.history.pushState(
      null,
      "",
      hrefFor((p) => {
        p.delete("tab")
        if (on) p.set("example", "1")
        else p.delete("example")
      }),
    )

  const toolState = tool.state
  const update = tool.update
  const actions: RecordCtx["actions"] = useMemo(
    () => ({
      saveUnit: (u: RecordUnit) => rec.setUnit(u),
      addSpend: (s: Spend) => update((st) => ({ ...st, spends: [...st.spends, s] })),
      removeSpend: (id: string) => update((st) => ({ ...st, spends: st.spends.filter((s) => s.id !== id) })),
      restoreSpend: (s: Spend, index: number) =>
        update((st) => {
          if (st.spends.some((x) => x.id === s.id)) return st
          const next = [...st.spends]
          next.splice(Math.min(index, next.length), 0, s)
          return { ...st, spends: next }
        }),
      addTarget: (x: Target) => update((st) => ({ ...st, targets: [...st.targets, x] })),
      removeTarget: (id: string) => update((st) => ({ ...st, targets: st.targets.filter((x) => x.id !== id) })),
      restoreTarget: (x: Target, index: number) =>
        update((st) => {
          if (st.targets.some((y) => y.id === x.id)) return st
          const next = [...st.targets]
          next.splice(Math.min(index, next.length), 0, x)
          return { ...st, targets: next }
        }),
    }),
    // `rec.setUnit` is a fresh closure each render but only reads stable store handles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update, rec.setUnit],
  )
  const noActions: RecordCtx["actions"] = useMemo(() => {
    const none = () => {}
    return { saveUnit: none, addSpend: none, removeSpend: none, restoreSpend: none, addTarget: none, removeTarget: none, restoreTarget: none }
  }, [])

  if (!rec.ready || !toolState || !box || !box.ready || !view) return null

  const unitOf = (u: RecordUnit | null) => (u ? (units.find((x) => x.id === u.id) ?? null) : null)
  const real = view.runs.length > 0

  if (real) {
    const ctx: RecordCtx = { addiction, today, nowMs, view, record: rec.record, unit: rec.record.unit, unitData: unitOf(rec.record.unit), units, spends: toolState.spends, targets: toolState.targets, readOnly: false, carry, openTab, openChange, ui, actions }
    return <Tabs tab={tab} ctx={ctx} onTab={openTab} />
  }
  // A run is about to start (the date is today or past): show nothing rather than the empty state for a moment.
  if (start && !refused) return null

  if (exampleOn) {
    const ex = exampleFor(today, addiction)
    const exView = viewOf(ex.box, addiction, today)
    const record: QuitRecord = { quitDate: exView.runs[0]?.start ?? null, goal: "stop", breakEnd: null, unit: ex.unit }
    const ctx: RecordCtx = { addiction, today, nowMs, view: exView, record, unit: ex.unit, unitData: unitOf(ex.unit), units, spends: ex.spends, targets: ex.targets, readOnly: true, carry, openTab, openChange, ui, actions: noActions }
    return (
      <div className="flex flex-col gap-4">
        <div data-testid="example-bar" className="flex flex-col gap-1 rounded-lg border border-dashed border-foreground p-3">
          <p className="font-medium">{t.exampleBar}</p>
          <button type="button" data-testid="leave-example" onClick={() => setExample(false)} className="inline-flex min-h-11 items-center self-start text-primary underline">
            {t.leaveExample}
          </button>
        </div>
        <Tabs tab={tab} ctx={ctx} onTab={openTab} />
      </div>
    )
  }

  const future = rec.record.quitDate !== null && rec.record.quitDate > today
  const dateLive = isLiveTool("date")
  return (
    <section data-testid="record-empty" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      {future && rec.record.quitDate ? (
        <>
          <h2 data-testid="future-title" className="text-xl font-semibold">
            <span className="mr-2 text-5xl tabular-nums">{daysBetween(today, rec.record.quitDate)}</span>
            {" "}
            {t.futureDays(daysBetween(today, rec.record.quitDate))}
          </h2>
          <p data-testid="future-line">{t.futureLine(fmtDay(rec.record.quitDate, today))}</p>
        </>
      ) : (
        <>
          <h2 data-testid="empty-title" className="text-xl font-semibold">
            {t.emptyTitle}
          </h2>
          <p className="text-muted-foreground">{t.emptyLine}</p>
        </>
      )}
      {refused && (
        <p data-testid="run-refused" className="text-sm text-muted-foreground">
          {t.refuse}
        </p>
      )}
      {dateLive ? (
        <Link href={carry(`/quit/${addiction}/date`)} data-testid="to-date" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
          {rec.record.quitDate ? t.changeDate : t.toDate}
        </Link>
      ) : (
        <p data-testid="to-date-plain" className="text-sm text-muted-foreground">
          {t.toDatePlain}
        </p>
      )}
      <button type="button" data-testid="see-example" onClick={() => setExample(true)} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border px-4 font-medium">
        {t.seeExample}
      </button>
    </section>
  )
}

function Tabs({ tab, ctx, onTab }: { tab: RecordTab; ctx: RecordCtx; onTab: (t: RecordTab) => void }) {
  return (
    <div data-testid="record" className="flex flex-col gap-4">
      <p data-testid="top-line" className="text-base text-muted-foreground">
        {t.topLine}
      </p>
      <div role="tablist" aria-label={t.tabsLabel} className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
        {RECORD_TABS.map((id) => {
          const Icon = TAB_ICON[id]
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls="record-panel"
              data-testid={`tab-${id}`}
              onClick={() => onTab(id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-sm ${tab === id ? "bg-card font-semibold shadow-sm" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" aria-hidden />
              {t.tabs[id]}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id="record-panel" aria-labelledby={`tab-${tab}`} data-testid={`panel-${tab}`}>
        {tab === "home" && <HomeTab ctx={ctx} />}
        {tab === "money" && <MoneyTab ctx={ctx} />}
        {tab === "milestones" && <MilestonesTab ctx={ctx} />}
        {tab === "calendar" && <CalendarTab ctx={ctx} />}
      </div>
    </div>
  )
}
