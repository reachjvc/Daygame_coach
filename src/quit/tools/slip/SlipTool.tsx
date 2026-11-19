"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { BlackBoxBridge } from "../../components/BlackBoxBridge"
import { LocalBlackBoxBridge } from "../../components/LocalBlackBoxBridge"
import { Chips, OneQuestion, PrimaryButton } from "../../components/kit"
import { nowInBrowser, useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { endingForBelief, reportAt, slipThought } from "../../blackboxLogic"
import { useQuitRecord, todayIso } from "../../record"
import { useQuitStore } from "../../store"
import { fill, tooltext } from "../../tooltext"
import type { QuitBelief, QuitMomentSwap, QuitNeed, QuitOption, ToolProps } from "../../types"
import { usable } from "../common"
import { parseBeliefs, topBeliefs } from "../beliefs/logic"
import { parseGives } from "../gives/logic"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import {
  EMPTY_SLIP,
  ELSE,
  MAX_OWN,
  OTHER,
  SKIP,
  dayAllowed,
  day1Day,
  day1Options,
  defaultDay1,
  daysCard,
  decide,
  dayWords,
  firstUnanswered,
  keepsState,
  lieOf,
  parseSlip,
  placeOf,
  whenChoices,
  type Day1,
  type SlipState,
} from "./logic"
import { Result } from "./Result"

const t = tooltext.slip

/** Slipped? Restart today: the slip goes into the Black Box, the days stay, and a new day 1 is picked. */
export function SlipTool({ addiction, data }: ToolProps) {
  const beliefs = usable<QuitBelief[]>(data.beliefs)
  const moments = usable<QuitOption[]>(data.riskyMoments)
  const swaps = usable<QuitMomentSwap[]>(data.momentSwaps)
  const needs = usable<QuitNeed[]>(data.needs)
  if (!beliefs || !moments || !swaps || !needs) return <NotReady />
  return <Inner addiction={addiction} beliefs={beliefs} moments={moments} swaps={swaps} needs={needs} />
}

interface InnerProps {
  addiction: string
  beliefs: QuitBelief[]
  moments: QuitOption[]
  swaps: QuitMomentSwap[]
  needs: QuitNeed[]
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn(true, true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  // Signed in the Black Box syncs to the account, signed out it is the copy in this browser. Nothing mounts while that is unknown.
  return (
    <div data-testid="slip" className="flex w-full flex-col gap-4">
      {signedIn === true ? <BlackBoxBridge key="in" viceId={props.addiction} onApi={onApi} /> : null}
      {signedIn === false ? <LocalBlackBoxBridge key="out" viceId={props.addiction} onApi={onApi} /> : null}
      <Screens {...props} signedIn={signedIn} bb={bb} />
    </div>
  )
}

function Screens({ addiction, beliefs, moments, swaps, needs, signedIn, bb }: InnerProps & { signedIn: boolean | null; bb: QuitBlackBoxApi | null }) {
  const carry = useCarry()
  const store = useQuitStore()
  const rec = useQuitRecord(addiction)
  const { state, update: save } = useToolState<SlipState>(addiction, "slip", EMPTY_SLIP, parseSlip)
  const [prepared, setPrepared] = useState(false)
  const [undone, setUndone] = useState(false)
  const [refused, setRefused] = useState(false)
  const [switchRefused, setSwitchRefused] = useState(false)
  const [startRefused, setStartRefused] = useState(false)
  const [redateRefused, setRedateRefused] = useState(false)
  const prep = useRef(false)
  // A double tap moves one screen at most and files one slip.
  const lastMove = useRef(0)
  const started = useStartCount(addiction, "slip")

  const update = useCallback((fn: (s: SlipState) => SlipState) => save((s) => ({ ...fn(s), touched: Date.now() })), [save])

  // Set the visit up once the Black Box is settled: start a run that is due, read the case, keep or drop last visit's answers.
  useEffect(() => {
    if (prep.current || !state || !rec.ready || !bb || !bb.settled) return
    prep.current = true
    const today = todayIso()
    const input = { runs: bb.runs, reports: bb.reports, quitDate: rec.record.quitDate, today }
    let plan = decide(input)
    if (plan.startOn && !bb.startRun(plan.startOn)) plan = decide({ ...input, quitDate: null })
    let now = state
    if (!keepsState(state, plan, bb.runs, bb.reports, Date.now())) {
      now = { ...EMPTY_SLIP, kase: plan.kase, steps: plan.steps, min: plan.min, slipId: plan.slipId, touched: Date.now() }
      save(() => now)
    }
    // Every history entry of the visit names its screen, so Back can always reach screen 1.
    try {
      const u = new URL(window.location.href)
      if (!u.searchParams.get("s")) {
        u.searchParams.set("s", String(firstUnanswered(now)))
        window.history.replaceState(null, "", u.pathname + u.search + u.hash)
      }
    } catch {
      // no history to rewrite
    }
    setPrepared(true)
  }, [state, rec.ready, rec.record.quitDate, bb, save])

  const first = state ? firstUnanswered(state) : 1
  const total = state?.steps.length ?? 0
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, total, state !== null && prepared)
  useDoneCount(addiction, "slip", state !== null && prepared && isResult)

  /** Takes a new day 1 for the slip that is in the record: Today starts the run now, Tomorrow only sets the quit date. */
  const applyDay1 = (d: "today" | "tomorrow"): boolean => {
    if (!bb || !state) return false
    const on = day1Day(d, todayIso())
    if (d === "today" && !bb.startRun(on)) {
      setStartRefused(true)
      return false
    }
    const before = { date: rec.record.quitDate }
    rec.setQuitDate(on)
    update((s) => ({ ...s, day1: d, day1On: on, ownDate: on, quitBefore: s.quitBefore ?? before }))
    return true
  }
  const applyRef = useRef(applyDay1)
  applyRef.current = applyDay1
  const autoFor = useRef<string | null>(null)
  // Once the result shows for a slip in the record (cases A and B) the new day 1 is already chosen; the reader can change it.
  useEffect(() => {
    if (!state || !prepared || !bb || !isResult || undone || state.kase === null || state.kase === "C" || !state.slipId || state.day1 !== null) return
    const report = bb.reports.find((r) => r.id === state.slipId)
    if (!report || autoFor.current === state.slipId) return
    autoFor.current = state.slipId
    const d = defaultDay1(report.at.slice(0, 10), todayIso(), rec.record.quitDate, state.ownDate)
    if (d) applyRef.current(d)
  }, [state, prepared, bb, isResult, undone, rec.record.quitDate])
  // Case C with a quit date already planned ahead: the plan is kept until Today or Tomorrow is tapped.
  useEffect(() => {
    if (!state || !prepared || !isResult || undone || state.kase !== "C" || state.day1 !== null) return
    const planned = rec.record.quitDate
    if (planned && planned > todayIso()) update((s) => ({ ...s, day1: "keep", day1On: planned }))
  }, [state, prepared, isResult, undone, rec.record.quitDate, update])

  if (undone) {
    return (
      <div className="flex flex-col gap-4">
        <p data-testid="slip-undone">{tooltext.blackbox.undone}</p>
        <Link href={carry(`/quit/${addiction}`)} data-testid="to-menu" className="inline-flex min-h-11 items-center text-primary underline">
          {t.toMenu}
        </Link>
      </div>
    )
  }

  if (!state || !prepared || !bb || state.kase === null) return null
  const today = todayIso()
  const steps = state.steps
  const step = steps[screen - 1]
  const momentIds = moments.map((m) => m.id)

  const move = (fn: () => void) => {
    const now = Date.now()
    if (now - lastMove.current < 250) return
    lastMove.current = now
    fn()
  }

  const thoughtOf = (s: SlipState): string => {
    const told = beliefs.find((b) => b.id === s.told)
    return slipThought(told ? usable<string>(told.short) : null, s.told === OTHER ? s.ownWords : "")
  }

  /** Writes the answers of the screen being passed to the Black Box: files the slip on the last screen (case A), else amends it. */
  const commit = (next: SlipState, last: boolean): string | null => {
    const whereId = next.where && momentIds.includes(next.where) ? next.where : ""
    const thought = thoughtOf(next)
    const ending = endingForBelief(next.told, beliefs)
    if (next.slipId && bb.reports.some((r) => r.id === next.slipId)) {
      // The slip is in the record already: the answers are added to it. A skipped answer never blanks one that is there (case B).
      if (step === "where" && (whereId !== "" || next.kase !== "B")) bb.amend(next.slipId, { where: whereId })
      if (step === "voice" && (thought !== "" || next.kase !== "B")) bb.amend(next.slipId, { thought, ending })
      return next.slipId
    }
    if (next.kase === "A" && last && !next.slipId) {
      const day = next.day ?? today
      const id = bb.fileSlip({ at: reportAt(day, today, nowInBrowser()), thought, ending, where: whereId })
      setRefused(id === null)
      return id
    }
    return next.slipId
  }

  /** Changes the day of the slip that is filed: the new day 1 run out, the slip out, the slip in again on the new day. */
  const redate = (next: SlipState, day: string): { id: string | null } | null => {
    const old = state.slipId
    if (!old) return null
    const fresh = state.day1 === "today" ? bb.runs.find((r) => r.endedOn === null && r.startedOn === state.day1On) : undefined
    if (fresh && !bb.removeRun(fresh.id)) return null
    if (!bb.undo(old)) {
      if (fresh) bb.startRun(fresh.startedOn)
      return null
    }
    const whereId = next.where && momentIds.includes(next.where) ? next.where : ""
    const id = bb.fileSlip({ at: reportAt(day, today, nowInBrowser()), thought: thoughtOf(next), ending: endingForBelief(next.told, beliefs), where: whereId })
    return { id }
  }

  const advance = (patch: Partial<SlipState>) =>
    move(() => {
      const next = { ...state, ...patch }
      let slipId = state.slipId
      let extra: Partial<SlipState> = {}
      const filed = slipId ? bb.reports.find((r) => r.id === slipId) : undefined
      if (step === "when" && filed && next.day && filed.at.slice(0, 10) !== next.day) {
        const res = redate(next, next.day)
        if (!res) {
          setRedateRefused(true)
          return
        }
        setRedateRefused(false)
        setRefused(res.id === null)
        slipId = res.id
        extra = { day1: null, day1On: null }
      } else slipId = commit(next, screen === steps.length)
      update((s) => ({ ...s, ...patch, ...extra, slipId, done: Math.max(s.done, screen) }))
      go(screen + 1)
    })

  const back = screen > 1 ? goBack : null
  const inRecord = (() => {
    if (state.kase !== "B") return null
    const r = bb.reports.find((x) => x.id === state.slipId)
    return r ? fill(t.inRecord, { day: dayWords(r.at.slice(0, 10)) }) : null
  })()

  const bLine = inRecord && (
    <p data-testid="slip-in-record" className="text-sm text-muted-foreground">
      {inRecord}
    </p>
  )

  if (!isResult && step === "when") {
    const min = state.min && state.min <= today ? state.min : today
    const choices = whenChoices(min, today)
    const allowed = dayAllowed(state.day, min, today)
    return (
      <>
        {bLine}
        <OneQuestion step={screen} total={steps.length} onBack={back}>
          <h2 className="text-lg font-semibold">{t.whenQuestion}</h2>
          <Chips
            label={t.whenQuestion}
            options={choices.map((c) => ({ id: c.id, label: t.when[c.id] }))}
            value={state.pick ? [state.pick] : []}
            onChange={(next) => {
              started()
              const pick = next[0] as SlipState["pick"]
              const chip = choices.find((c) => c.id === pick)
              update((s) => ({ ...s, pick, day: chip?.day ?? (s.pick === "another" ? s.day : null) }))
            }}
          />
          {state.pick === "another" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.dateLabel}</span>
              <input
                type="date"
                data-testid="slip-date"
                min={min}
                max={today}
                value={state.day ?? ""}
                onChange={(e) => update((s) => ({ ...s, day: /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : null }))}
                className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-base"
              />
              {!(state.day && !allowed) && <span className="text-muted-foreground">{fill(t.dateHelp, { min: dayWords(min) })}</span>}
            </label>
          )}
          {redateRefused && (
            <p data-testid="slip-redate-refused" role="alert" className="text-sm">
              {t.redateRefused}
            </p>
          )}
          {state.pick === "another" && state.day && !allowed && (
            <p data-testid="slip-date-error" role="alert" className="text-sm">
              {fill(t.dateOut, { min: dayWords(min) })}
            </p>
          )}
          <PrimaryButton testId="slip-continue" disabled={!allowed} onClick={() => advance({})}>
            {tooltext.common.continue}
          </PrimaryButton>
        </OneQuestion>
      </>
    )
  }

  if (!isResult && step === "where") {
    return (
      <>
        {bLine}
        <OneQuestion step={screen} total={steps.length} onBack={back}>
          <h2 className="text-lg font-semibold">{t.wentQuestion}</h2>
          <Chips
            label={t.wentQuestion}
            options={[...moments.map((m) => ({ id: m.id, label: m.label })), { id: ELSE, label: t.somewhereElse }]}
            value={state.where && state.where !== SKIP ? [state.where] : []}
            onChange={(next) => {
              started()
              update((s) => ({ ...s, where: next[0] }))
            }}
          />
          <PrimaryButton testId="slip-continue" disabled={!state.where || state.where === SKIP} onClick={() => advance({})}>
            {tooltext.common.continue}
          </PrimaryButton>
          <button type="button" data-testid="slip-skip" onClick={() => advance({ where: SKIP })} className="-ml-1 inline-flex min-h-11 min-w-11 items-center self-start px-1 text-sm text-muted-foreground underline">
            {t.skip}
          </button>
        </OneQuestion>
      </>
    )
  }

  if (!isResult && step === "voice") {
    return (
      <>
        {bLine}
        <OneQuestion step={screen} total={steps.length} onBack={back}>
          <h2 className="text-lg font-semibold">{t.toldQuestion}</h2>
          <Chips
            label={t.toldQuestion}
            options={[...beliefs.map((b) => ({ id: b.id, label: usable<string>(b.short) ?? b.id })), { id: OTHER, label: t.somethingElse }]}
            value={state.told && state.told !== SKIP ? [state.told] : []}
            onChange={(next) => {
              started()
              update((s) => ({ ...s, told: next[0] }))
            }}
          />
          {state.told === OTHER && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.ownWords}</span>
              <input
                type="text"
                data-testid="slip-own"
                maxLength={MAX_OWN}
                value={state.ownWords}
                onChange={(e) => update((s) => ({ ...s, ownWords: e.target.value.slice(0, MAX_OWN) }))}
                className="min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
              />
            </label>
          )}
          <PrimaryButton testId="slip-continue" disabled={!state.told || state.told === SKIP} onClick={() => advance({})}>
            {tooltext.common.continue}
          </PrimaryButton>
          <button type="button" data-testid="slip-skip" onClick={() => advance({ told: SKIP })} className="-ml-1 inline-flex min-h-11 min-w-11 items-center self-start px-1 text-sm text-muted-foreground underline">
            {t.skip}
          </button>
        </OneQuestion>
      </>
    )
  }

  // The result.
  const report = bb.reports.find((r) => r.id === state.slipId) ?? null
  const ended = state.slipId ? bb.runs.find((r) => r.endedByReportId === state.slipId) : undefined
  const slipDay = report ? report.at.slice(0, 10) : null
  const lie = lieOf(state.told, report?.thought ?? "", beliefs)
  const top = topBeliefs(parseBeliefs(store.get(addiction, "beliefs")).ratings, beliefs).filter((b) => b.id !== lie?.id)
  const placeId = placeOf(state.where, report?.where ?? "", momentIds)
  const need = !placeId && lie ? (needs.find((n) => n.id === usable<string>(lie.need)) ?? null) : null
  const tried = parseGives(store.get(addiction, "gives")).tried
  const shown = new Set(need?.swaps.map((s) => s.id))
  const triedSwaps = needs.flatMap((n) => n.swaps).filter((s) => tried[s.id] && !shown.has(s.id))
  const status = (() => {
    if (!state.slipId) return null
    const s = report ? bb.status(state.slipId) : null
    if (signedIn === true && s !== null) return s === "saved" ? t.savedAccount : s === "local" ? tooltext.blackbox.localOnly : tooltext.blackbox.saving
    if (signedIn === false) return t.savedLocal
    return tooltext.blackbox.saving
  })()

  // Case C with a quit date planned ahead (before this tool changed it): offered as "Keep".
  const plannedDate = state.quitBefore ? state.quitBefore.date : rec.record.quitDate
  const keepDay = state.kase === "C" && plannedDate && plannedDate > today ? plannedDate : null
  const options = day1Options(slipDay, today)
  // Only Tomorrow is possible (the slip is today): said as a plain line, not offered as a lone chip.
  const forcedDay = state.kase !== "C" && options.length === 1 ? day1Day("tomorrow", today) : null
  const chooseDay1 = (d: Day1) => {
    if (d === state.day1) return
    setSwitchRefused(false)
    setStartRefused(false)
    // Leaving Today takes the run started a moment ago back out again.
    if (state.day1 === "today") {
      const run = bb.runs.find((r) => r.endedOn === null && r.startedOn === state.day1On)
      if (run && !bb.removeRun(run.id)) {
        setSwitchRefused(true)
        return
      }
    }
    if (d === "keep") {
      const planned = keepDay
      if (!planned) return
      rec.setQuitDate(planned)
      update((s) => ({ ...s, day1: "keep", day1On: planned }))
      return
    }
    applyDay1(d)
  }

  const undo = () => {
    if (!state.slipId || state.kase !== "A") return
    // The new run first (it blocks the old run coming back), then the slip, then the quit date as it was.
    const fresh = state.day1 === "today" ? bb.runs.find((r) => r.endedOn === null && r.startedOn === state.day1On) : undefined
    if (fresh && !bb.removeRun(fresh.id)) return
    if (!bb.undo(state.slipId)) return
    if (state.quitBefore) {
      if (state.quitBefore.date) rec.setQuitDate(state.quitBefore.date)
      else rec.clearQuitDate()
    }
    save(() => EMPTY_SLIP)
    reset()
    setUndone(true)
  }

  return (
    <Result
      inRecord={inRecord}
      card={daysCard(ended, bb.runs, today)}
      noRun={state.kase === "C"}
      status={status}
      canUndo={state.kase === "A" && state.slipId !== null && report !== null}
      onUndo={undo}
      refused={refused && state.slipId === null}
      ownWords={state.told === OTHER && state.ownWords.trim() ? state.ownWords.trim() : null}
      lie={lie}
      top={top}
      place={placeId ? (moments.find((m) => m.id === placeId) ?? null) : null}
      placeCards={placeId ? (swaps.find((m) => m.momentId === placeId)?.cards ?? []) : []}
      need={need}
      tried={triedSwaps}
      day1Options={options}
      day1={state.day1}
      day1On={state.day1On}
      keepDay={keepDay}
      forcedDay={forcedDay}
      onDay1={chooseDay1}
      switchRefused={switchRefused}
      startRefused={startRefused}
      href={carry}
      addiction={addiction}
    />
  )
}
