"use client"

import { Moon, Sun } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { BlackBoxBridge } from "../../components/BlackBoxBridge"
import { LocalBlackBoxBridge } from "../../components/LocalBlackBoxBridge"
import { OneQuestion, PrimaryButton } from "../../components/kit"
import { nowInBrowser, useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { endingForBelief, reportAt } from "../../blackboxLogic"
import { isLiveTool } from "../../menu"
import { isIsoDay, todayIso, useQuitRecord } from "../../record"
import { ROUTES, isPublicPage } from "@/src/shared/routes"
import { tooltext as tt } from "../../tooltext"
import { useVerb } from "../../wording"
import type { ToolProps } from "../../types"
import { useCarry, useDoneCount, useStartCount, useToolState } from "../hooks"
import {
  EMPTY_CHECKIN,
  PLEDGE_MAX,
  NOTE_MAX,
  canFill,
  dayLabel,
  hasOutcome,
  lookBack,
  mergeSlips,
  monthCounts,
  monthName,
  monthOf,
  parseCheckin,
  seedExample,
  shiftMonth,
  showsLastMonth,
  slipDays,
  DEFAULT_REMINDERS,
  type CheckinState,
  type Day,
  type Days,
  type Draft,
  type FlowKind,
  type Reminders,
} from "./logic"
import { checkinText as t, FEELINGS, SCALE, pastPhrase } from "./text"
import { Card, DaySummary, MonthView, PatternView, RemindersView, TAB_IDS, TabRow, type TabId } from "./Views"

/** Daily check-in: a morning pledge and forecast, an evening result, his month, a forecast pattern, reminders. Nicotine only. */
export function CheckinTool({ addiction }: ToolProps) {
  return <Inner addiction={addiction} />
}

function Inner({ addiction }: { addiction: string }) {
  const signedIn = useSignedIn(true, true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  // Signed in the Black Box syncs to the account; otherwise it is the copy in this browser.
  return (
    <>
      {signedIn ? <BlackBoxBridge viceId={addiction} onApi={onApi} /> : <LocalBlackBoxBridge viceId={addiction} onApi={onApi} />}
      <Screens addiction={addiction} signedIn={signedIn} bb={bb} />
    </>
  )
}

/** Today as an ISO day, refreshed so a tab left open over midnight changes day. */
function useToday(): string {
  const [today, setToday] = useState(() => todayIso())
  useEffect(() => {
    const tick = () => setToday(todayIso())
    const id = setInterval(tick, 30_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return today
}

const STEPS: Record<FlowKind, readonly string[]> = { morning: ["pledge", "forecast"], evening: ["outcome", "hard", "urges", "feelings", "note"] }

/** The answers of a day that a flow edits (the slip answer is saved at once, so it is not one of them). */
function answersOf(kind: FlowKind, d: Day | undefined): Day {
  if (!d) return {}
  return kind === "morning" ? { pledge: d.pledge, forecast: d.forecast } : { hard: d.hard, urges: d.urges, feelings: d.feelings, note: d.note }
}

const clean = (d: Day): Day => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0) && !(typeof v === "string" && v.trim() === ""))) as Day

type View =
  | { kind: "tab"; tab: TabId }
  | { kind: "flow"; flow: FlowKind; date: string; step: number }
  | { kind: "done"; date: string }

interface Want {
  date: string
  at: string
}

function Screens({ addiction, signedIn, bb }: { addiction: string; signedIn: boolean | null; bb: QuitBlackBoxApi | null }) {
  const carry = useCarry()
  const pathname = usePathname()
  const sp = useSearchParams()
  const today = useToday()
  const rec = useQuitRecord(addiction)
  const { state, update } = useToolState<CheckinState>(addiction, "checkin", EMPTY_CHECKIN, parseCheckin)
  const started = useStartCount(addiction, "checkin")
  const [ex, setEx] = useState<{ days: Days; reminders: Reminders } | null>(null)
  const [want, setWant] = useState<Want | null>(null)
  const [blocked, setBlocked] = useState<string | null>(null)
  const filing = useRef<Set<string>>(new Set())
  const lock = useRef<string | null>(null)

  /* ----- the address: the tab or the flow screen is in the URL, so Back and reload work ----- */
  const key = sp.toString()
  const hrefFor = useCallback(
    (params: Record<string, string>) => {
      const p = new URLSearchParams()
      for (const k of ["preview", "present"]) if (sp.getAll(k).includes("1")) p.set(k, "1")
      for (const [k, v] of Object.entries(params)) p.set(k, v)
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [sp, pathname],
  )
  const keyOf = useCallback((params: Record<string, string>) => hrefFor(params).split("?")[1] ?? "", [hrefFor])

  // The history entries made in this visit, so an in-page Back steps back when the previous entry is the wanted screen.
  const trail = useRef<{ stack: string[]; idx: number } | null>(null)
  const ready = state !== null && rec.ready
  useEffect(() => {
    lock.current = null
    if (!ready) return
    const tr = trail.current
    if (!tr) {
      trail.current = { stack: [key], idx: 0 }
      return
    }
    if (tr.stack[tr.idx] === key) return
    if (tr.stack[tr.idx - 1] === key) tr.idx -= 1
    else if (tr.stack[tr.idx + 1] === key) tr.idx += 1
    else {
      tr.stack = [...tr.stack.slice(0, tr.idx + 1), key]
      tr.idx += 1
    }
  }, [key, ready])

  const go = (params: Record<string, string>) => window.history.pushState(null, "", hrefFor(params))
  const swap = (params: Record<string, string>) => window.history.replaceState(null, "", hrefFor(params))
  /** Back: a step back in history when the previous entry is the wanted screen (or any, with `any`), else a rewrite of this one. */
  const back = (params: Record<string, string>, any = false) => {
    const tr = trail.current
    if (tr && tr.idx > 0 && (any || tr.stack[tr.idx - 1] === keyOf(params))) window.history.back()
    else swap(params)
  }
  /** A double tap on one screen moves once: the second tap finds this screen locked until the address changes. */
  const move = (fn: () => void) => {
    if (lock.current === key) return
    lock.current = key
    fn()
  }

  /* ----- what the address says ----- */
  const view: View = (() => {
    const tab = sp.get("tab")
    const flow = sp.get("flow")
    const d = sp.get("d")
    const done = sp.get("done")
    if (ex === null && (flow === "morning" || flow === "evening") && d !== null && canFill(d, today)) {
      const total = STEPS[flow].length
      const raw = Number(sp.get("s"))
      const step = Number.isInteger(raw) && raw >= 1 && raw <= total ? raw : (state?.draft?.kind === flow && state.draft.date === d ? state.draft.step : 1)
      return { kind: "flow", flow, date: d, step }
    }
    if (ex === null && done !== null && isIsoDay(done)) return { kind: "done", date: done }
    return { kind: "tab", tab: TAB_IDS.includes(tab as TabId) ? (tab as TabId) : "today" }
  })()
  useDoneCount(addiction, "checkin", view.kind === "done")

  const slips = slipDays(bb?.reports ?? [])
  const stored = state?.days ?? {}
  const days: Days = ex ? ex.days : mergeSlips(stored, slips)
  const verb = useVerb(rec.record.unit)
  const past = pastPhrase(verb)

  // The filing waits for the Black Box to be read; the answer on screen never waits.
  useEffect(() => {
    if (!want || !bb || !bb.ready || !bb.settled || !state) return
    const { date, at } = want
    setWant(null)
    const run = bb.run
    // The Black Box would move a slip before the run's start or before its latest report: here that is "no run that day".
    const latest = run ? bb.reports.filter((r) => r.attemptId === run.id).reduce((m, r) => (r.at.slice(0, 10) > m ? r.at.slice(0, 10) : m), run.startedOn) : ""
    const id = run && date >= latest ? bb.fileSlip({ at, thought: "", ending: endingForBelief(null, []) }) : null
    if (id) update((s) => ({ ...s, days: { ...s.days, [date]: { ...s.days[date], slipped: true, slipReportId: id } } }))
  }, [want, bb, state, update])

  if (!state || !rec.ready) return null

  /* ----- the slip answer ----- */
  const setOutcome = (date: string, slipped: boolean) => {
    const day = state.days[date]
    if (slipped) {
      if (day?.slipped === true && (day.slipReportId ? bb?.has(day.slipReportId) : filing.current.has(date))) return
      filing.current.add(date)
      setBlocked(null)
      update((s) => ({ ...s, days: { ...s.days, [date]: { ...s.days[date], slipped: true, slipReportId: undefined } } }))
      setWant({ date, at: reportAt(date, today, nowInBrowser()) })
      return
    }
    if (day?.slipReportId && bb?.has(day.slipReportId) && !bb.undo(day.slipReportId)) {
      setBlocked(date)
      return
    }
    filing.current.delete(date)
    setBlocked(null)
    setWant((w) => (w?.date === date ? null : w))
    update((s) => ({ ...s, days: { ...s.days, [date]: { ...s.days[date], slipped: false, slipReportId: undefined } } }))
  }
  const undoSlip = (date: string) => {
    const id = state.days[date]?.slipReportId
    if (!id || !bb) return
    if (!bb.undo(id)) {
      setBlocked(date)
      return
    }
    filing.current.delete(date)
    setBlocked(null)
    update((s) => ({ ...s, days: { ...s.days, [date]: { ...s.days[date], slipped: undefined, slipReportId: undefined } } }))
  }

  /* ----- flows ----- */
  const draftFor = (s: CheckinState, kind: FlowKind, date: string): Draft =>
    s.draft?.kind === kind && s.draft.date === date ? s.draft : { kind, date, step: 1, answers: answersOf(kind, s.days[date]) }
  const startFlow = (kind: FlowKind, date: string) =>
    move(() => {
      started()
      const step = state.draft?.kind === kind && state.draft.date === date ? state.draft.step : 1
      update((s) => ({ ...s, draft: draftFor(s, kind, date) }))
      go({ flow: kind, d: date, s: String(step) })
    })
  const setAnswer = (kind: FlowKind, date: string, step: number, patch: Day) =>
    update((s) => {
      const d = draftFor(s, kind, date)
      return { ...s, draft: { ...d, step, answers: { ...d.answers, ...patch } } }
    })
  const toStep = (kind: FlowKind, date: string, n: number) =>
    move(() => {
      update((s) => ({ ...s, draft: { ...draftFor(s, kind, date), step: n } }))
      go({ flow: kind, d: date, s: String(n) })
    })
  const finish = (kind: FlowKind, date: string) =>
    move(() => {
      update((s) => {
        const a = draftFor(s, kind, date).answers
        const prev = s.days[date] ?? {}
        const next = clean(kind === "morning" ? { ...prev, pledge: a.pledge?.trim() || undefined, forecast: a.forecast } : { ...prev, hard: a.hard, urges: a.urges, feelings: a.feelings, note: a.note?.trim() || undefined })
        return { ...s, days: { ...s.days, [date]: next }, draft: null }
      })
      swap({ done: date })
    })

  const slipLive = isLiveTool("slip")
  const thatOf = (date: string) => date !== today

  /* ----- one flow screen ----- */
  function renderFlow(kind: FlowKind, date: string, step: number) {
    if (!state) return null
    const steps = STEPS[kind]
    const day = state.days[date]
    const ans = draftFor(state, kind, date).answers
    const id = steps[step - 1]
    const that = thatOf(date)
    const foreign = bb ? bb.reports.some((r) => r.wentThrough && r.at.slice(0, 10) === date && r.id !== day?.slipReportId) : false
    // A slip day or an unanswered question one cannot skip: a reload on a later screen without the answer lands on the first.
    if (kind === "evening" && step > 1 && !foreign && day?.slipped === undefined) {
      return renderFlow(kind, date, 1)
    }
    const last = step === steps.length
    const set = (patch: Day) => setAnswer(kind, date, step, patch)
    const slipOk = foreign || hasOutcome(day)
    const filedHere = !!day?.slipReportId && !!bb?.has(day.slipReportId)
    const status = (() => {
      if (!day?.slipReportId || !bb) return signedIn === false ? tt.sos.savedLocal : tt.blackbox.saving
      const s = bb.status(day.slipReportId)
      if (signedIn === true) return s === "saved" ? tt.sos.savedAccount : s === "local" ? tt.blackbox.localOnly : tt.blackbox.saving
      return signedIn === false ? tt.sos.savedLocal : tt.blackbox.saving
    })()

    const title =
      id === "pledge" ? t.pledgeTitle
      : id === "forecast" ? t.forecastTitle
      : id === "outcome" ? (foreign ? t.slipInRecord(dayLabel(date)) : t.outcomeTitle(verb, that))
      : id === "hard" ? t.hardTitle(that)
      : id === "urges" ? t.urgesTitle(that)
      : id === "feelings" ? t.feelingsTitle(that)
      : t.noteTitle(that)

    const scale = (value: number | undefined, onPick: (n: number) => void, testId: string) => (
      <div role="radiogroup" aria-label={title} data-testid={testId} className="flex flex-col gap-2">
        {SCALE.map((word, i) => {
          const n = i + 1
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              data-testid={`${testId}-${n}`}
              onClick={() => onPick(n)}
              className={`flex min-h-12 items-center gap-3 rounded-md border px-3 text-left ${value === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              <span className="w-5 text-center font-semibold tabular-nums">{n}</span>
              <span>{word}</span>
            </button>
          )
        })}
      </div>
    )

    const nextDisabled = (id === "outcome" && !slipOk) || (kind === "morning" && last && ans.forecast === undefined && !ans.pledge?.trim())
    return (
      <OneQuestion step={step} total={steps.length} onBack={step === 1 ? () => back({}, true) : () => back({ flow: kind, d: date, s: String(step - 1) })}>
        <p className="text-sm text-muted-foreground">{dayLabel(date)}</p>
        <h2 data-testid={`step-${id}`} className="text-xl font-semibold leading-snug">
          {title}
        </h2>

        {id === "pledge" && (
          <>
            <p className="text-sm text-muted-foreground">{t.pledgeHelp}</p>
            <input
              data-testid="pledge-input"
              aria-label={t.pledgeTitle}
              placeholder={t.pledgePlaceholder}
              maxLength={PLEDGE_MAX}
              value={ans.pledge ?? ""}
              onChange={(e) => set({ pledge: e.target.value })}
              className="min-h-12 w-full min-w-0 rounded-md border border-border bg-background px-3 text-base"
            />
          </>
        )}
        {id === "forecast" && scale(ans.forecast, (n) => set({ forecast: n }), "forecast")}

        {id === "outcome" && (
          <>
            {foreign ? (
              <Card testId="slip-in-record">
                <p className="text-sm text-muted-foreground">{t.slipHeld}</p>
              </Card>
            ) : (
              <>
                <div role="radiogroup" aria-label={title} className="flex flex-col gap-2">
                  {[false, true].map((s) => (
                    <button
                      key={String(s)}
                      type="button"
                      role="radio"
                      aria-checked={day?.slipped === s}
                      data-testid={s ? "outcome-slip" : "outcome-clear"}
                      onClick={() => setOutcome(date, s)}
                      className={`min-h-12 rounded-md border px-3 text-left ${day?.slipped === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                    >
                      {s ? t.outcomeSlip(past) : t.outcomeClear}
                    </button>
                  ))}
                </div>
                {day?.slipped === true && (
                  <div data-testid="slip-block" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
                    <p className="font-medium">{t.slipHeld}</p>
                    {filedHere && (
                      <>
                        <p data-testid="slip-status">{status}</p>
                        <button type="button" data-testid="slip-undo" onClick={() => undoSlip(date)} className="inline-flex min-h-11 items-center self-start text-primary underline">
                          {tt.blackbox.undo}
                        </button>
                        {slipLive ? (
                          <Link href={carry(`/quit/${addiction}/slip`)} data-testid="slip-link" className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
                            {tt.sos.slipLink}
                          </Link>
                        ) : (
                          <p data-testid="slip-step">{tt.sos.yesStep}</p>
                        )}
                      </>
                    )}
                    {!day.slipReportId && want?.date !== date && bb?.settled && <p data-testid="slip-none">{t.noRun}</p>}
                    {blocked === date && (
                      <p data-testid="slip-blocked">
                        {t.slipBlocked}{" "}
                        {isPublicPage(ROUTES.quitVice) && (
                          <Link href={ROUTES.quitVice} className="text-primary underline">
                            {t.slipBlockedLink}
                          </Link>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {id === "hard" && (
          <>
            {day?.forecast !== undefined && (
              <p data-testid="hard-forecast" className="text-sm text-muted-foreground">
                {t.expectedThen(that, day.forecast)}
              </p>
            )}
            {scale(ans.hard, (n) => set({ hard: n }), "hard")}
          </>
        )}
        {id === "urges" && scale(ans.urges, (n) => set({ urges: n }), "urges")}

        {id === "feelings" && (
          <>
            <p className="text-sm text-muted-foreground">{t.feelingsHelp}</p>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((f) => {
                const on = ans.feelings?.includes(f.id) ?? false
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={on}
                    data-testid={`feeling-${f.id}`}
                    onClick={() => set({ feelings: on ? (ans.feelings ?? []).filter((x) => x !== f.id) : [...(ans.feelings ?? []), f.id] })}
                    className={`inline-flex min-h-11 items-center rounded-full border px-4 text-base ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
        {id === "note" && (
          <textarea
            data-testid="note-input"
            aria-label={title}
            placeholder={t.notePlaceholder}
            rows={5}
            maxLength={NOTE_MAX}
            value={ans.note ?? ""}
            onChange={(e) => set({ note: e.target.value })}
            className="w-full min-w-0 rounded-md border border-border bg-background p-3 text-base [overflow-wrap:anywhere]"
          />
        )}

        <div className="flex flex-col gap-2">
          {kind === "morning" && last ? (
            <PrimaryButton testId="flow-save" disabled={nextDisabled} onClick={() => finish(kind, date)}>
              {t.save}
            </PrimaryButton>
          ) : last ? (
            <PrimaryButton testId="flow-done" onClick={() => finish(kind, date)}>
              {that ? t.doneThat : t.doneToday}
            </PrimaryButton>
          ) : (
            <PrimaryButton testId="flow-next" disabled={nextDisabled} onClick={() => toStep(kind, date, step + 1)}>
              {t.next}
            </PrimaryButton>
          )}
          {kind === "evening" && step >= 2 && !last && (
            <button type="button" data-testid="flow-done" onClick={() => finish(kind, date)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-4 text-base">
              {that ? t.doneThat : t.doneToday}
            </button>
          )}
        </div>
      </OneQuestion>
    )
  }

  /* ----- the screens ----- */
  if (view.kind === "flow") return <div data-testid="checkin">{renderFlow(view.flow, view.date, view.step)}</div>

  if (view.kind === "done") {
    return (
      <section data-testid="done-screen" className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">{t.savedFor(dayLabel(view.date))}</h2>
        <DaySummary date={view.date} day={days[view.date]} verb={verb} testId="done-summary" />
        <PrimaryButton testId="done-back" onClick={() => swap({})}>
          {t.backToToday}
        </PrimaryButton>
      </section>
    )
  }

  const tab = view.tab
  const times = ex ? ex.reminders : state.reminders
  const onFill = ex ? null : (date: string) => startFlow("evening", date)
  const hasEntries = Object.keys(stored).length > 0
  const missed = ex ? null : lookBack(days, today)
  const counts = monthCounts(days, monthOf(today))
  const prev = shiftMonth(monthOf(today), -1)
  const prevCounts = monthCounts(days, prev)
  const day = days[today]
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/quit/${addiction}/checkin`
  const btn = "inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm"

  return (
    <div data-testid="checkin" className="flex w-full flex-col gap-4">
      {ex && (
        <div data-testid="example-bar" role="status" className="flex flex-wrap items-center justify-between gap-x-3 rounded-md border border-dashed border-primary px-3 py-1 text-sm">
          <span>{t.exampleBar}</span>
          <button type="button" data-testid="example-leave" onClick={() => setEx(null)} className="inline-flex min-h-11 items-center text-primary underline">
            {t.leaveExample}
          </button>
        </div>
      )}
      <TabRow value={tab} onChange={(id) => id !== tab && go(id === "today" ? {} : { tab: id })} />

      {tab === "today" && (
        <div data-testid="tab-today-panel" className="flex flex-col gap-3">
          <p data-testid="today-date" className="text-base font-medium">
            {dayLabel(today)}
          </p>
          <Card testId="morning-card">
            <h2 className="flex items-center gap-2 font-medium">
              <Sun className="size-5 text-primary" aria-hidden />
              {t.morningTitle}
            </h2>
            {day?.pledge?.trim() || day?.forecast !== undefined ? (
              <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                {day?.pledge?.trim() ? <p data-testid="morning-pledge" className="[overflow-wrap:anywhere]">{t.pledgeLine(day.pledge.trim())}</p> : null}
                {day?.forecast !== undefined ? <p data-testid="morning-forecast">{t.expectedLine(day.forecast)}</p> : null}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t.notYet}</p>
            )}
            {!ex && (
              <button type="button" data-testid="morning-start" onClick={() => startFlow("morning", today)} className={`mt-2 ${btn}`}>
                {day?.pledge?.trim() || day?.forecast !== undefined ? t.change : t.start}
              </button>
            )}
          </Card>
          <Card testId="evening-card">
            <h2 className="flex items-center gap-2 font-medium">
              <Moon className="size-5 text-primary" aria-hidden />
              {t.eveningTitle}
            </h2>
            {day?.slipped !== undefined || day?.hard !== undefined ? (
              <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
                {day?.slipped !== undefined && <p data-testid="evening-result">{day.slipped ? t.slipResult(past) : t.clearResult}</p>}
                {day?.hard !== undefined && <p data-testid="evening-hard">{t.hardLine(day.hard)}</p>}
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t.notYet}</p>
            )}
            {!ex && (
              <button type="button" data-testid="evening-start" onClick={() => startFlow("evening", today)} className={`mt-2 ${btn}`}>
                {day?.slipped !== undefined || day?.hard !== undefined ? t.change : t.start}
              </button>
            )}
          </Card>
          {missed && (
            <button type="button" data-testid="lookback-start" onClick={() => startFlow("evening", missed)} className="inline-flex min-h-11 items-center rounded-md border border-dashed border-border px-4 text-left text-sm">
              {t.fillYesterday(dayLabel(missed))}
            </button>
          )}
          <Card testId="month-counts">
            <h2 className="font-medium">{t.monthTitle}</h2>
            <p data-testid="count-checked" data-n={counts.checkedIn} className="mt-1 text-sm">
              {t.checkedIn(counts.checkedIn)}
            </p>
            <p data-testid="count-clear" data-n={counts.clear} className="text-sm">
              {t.clearDays(counts.clear)}
            </p>
            {showsLastMonth(today) && (
              <div data-testid="last-month" className="mt-2 border-t border-border pt-2">
                <p className="text-sm font-medium">{t.lastMonthTitle(monthName(prev))}</p>
                <p data-testid="last-checked" data-n={prevCounts.checkedIn} className="text-sm">
                  {t.checkedIn(prevCounts.checkedIn)}
                </p>
                <p data-testid="last-clear" data-n={prevCounts.clear} className="text-sm">
                  {t.clearDays(prevCounts.clear)}
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{t.neverResets}</p>
          </Card>
          {!hasEntries && !ex && (
            <button type="button" data-testid="see-example" onClick={() => setEx({ days: seedExample(today), reminders: DEFAULT_REMINDERS })} className="inline-flex min-h-12 items-center justify-center rounded-md border border-primary px-4 text-primary">
              {t.seeExample}
            </button>
          )}
          <p className="text-xs text-muted-foreground">{t.keptHere}</p>
        </div>
      )}
      {tab === "month" && <MonthView days={days} today={today} verb={verb} onFill={onFill} />}
      {tab === "pattern" && <PatternView days={days} />}
      {tab === "reminders" && (
        <RemindersView
          times={times}
          today={today}
          link={link}
          onChange={(r) => (ex ? setEx({ ...ex, reminders: r }) : update((s) => ({ ...s, reminders: r })))}
        />
      )}
    </div>
  )
}
