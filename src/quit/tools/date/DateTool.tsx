"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Chips, OneQuestion, PrimaryButton } from "../../components/kit"
import { useLocalQuitBlackBox, useQuitBlackBox, useSignedIn, type QuitRunApi } from "../../blackbox"
import { isFinished } from "../../menu"
import { addDays, isIsoDay, todayIso, useQuitRecord, type QuitGoal, type QuitRecord } from "../../record"
import type { QuitPlanStep, QuitSymptomCourse, QuitUnit, ToolProps } from "../../types"
import { usable } from "../common"
import { useCarry, useDoneCount, useScreens, useStartCount, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import { BasisBox, InfoLine, OptionCard } from "./Bits"
import { DATE_EVIDENCE } from "./evidence"
import { stretchAt, stretches, type Stretch } from "./hardDays"
import {
  BREAK_LENS,
  MAX_PER_DAY,
  MAX_PRICE,
  breakEnd,
  calendarWeeks,
  dateAllowed,
  dateBounds,
  dateChips,
  dayLine,
  daysBetween,
  googleCalendarUrl,
  icsFor,
  parseTyped,
  showsInfo,
  type BreakLen,
} from "./logic"
import { EMPTY_DATE, breakBase, firstUnanswered, parseDateState, screensFor, type DateState } from "./state"
import { dateText as t } from "./text"

const fmt = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
const fmtLong = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
const fmtYear = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

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

/** The Black Box bridge, signed in (synced with the account) or signed out (the browser copy). Mounted at one fixed place. */
function SignedBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitRunApi | null) => void }) {
  const api = useQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}
function LocalBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitRunApi | null) => void }) {
  const api = useLocalQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}

/** Your quit date: what you want, which day, what you use, your plan, then the date with the hard days on a calendar. */
export function DateTool({ addiction, data }: ToolProps) {
  const units = usable<QuitUnit[]>(data.units)
  const steps = usable<QuitPlanStep[]>(data.planSteps)
  if (!units || units.length === 0 || !steps || steps.length === 0) return <NotReady />
  return <Inner addiction={addiction} units={units} steps={steps} course={usable<QuitSymptomCourse[]>(data.symptomCourse) ?? []} courseNote={usable<string>(data.symptomCourseNote) ?? ""} />
}

interface InnerProps {
  addiction: string
  units: QuitUnit[]
  steps: QuitPlanStep[]
  course: QuitSymptomCourse[]
  courseNote: string
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn(false, true)
  const [bb, setBb] = useState<QuitRunApi | null>(null)
  const onApi = useCallback((api: QuitRunApi | null) => setBb(api), [])
  return (
    <div className="mx-auto w-full max-w-[560px]">
      {signedIn === true ? <SignedBridge key="in" viceId={props.addiction} onApi={onApi} /> : null}
      {signedIn === false ? <LocalBridge key="out" viceId={props.addiction} onApi={onApi} /> : null}
      <Screens {...props} bb={bb} />
    </div>
  )
}

function Screens({ addiction, units, steps, course, courseNote, bb }: InnerProps & { bb: QuitRunApi | null }) {
  const carry = useCarry()
  const today = useToday()
  const rec = useQuitRecord(addiction)
  const { state, update } = useToolState<DateState>(addiction, "date", EMPTY_DATE, parseDateState)
  const started = useStartCount(addiction, "date")
  // A double tap on a button moves one screen at most: a second tap right after the first is ignored.
  const lastMove = useRef(0)

  const list = screensFor(state?.goal ?? null, state?.another ?? false)
  const first = state ? firstUnanswered(state, today) : 1
  const { screen, go, back: goBack, reset, isResult } = useScreens(first, list.length, state !== null && rec.ready)
  useDoneCount(addiction, "date", state !== null && isResult)

  // A saved unit in the shared record shows again when the answers are changed.
  useEffect(() => {
    if (!state || !rec.ready || state.unitId !== null || !rec.record.unit) return
    const u = rec.record.unit
    update((s) => (s.unitId !== null ? s : { ...s, unitId: u.id, perDay: u.perDay === null ? "" : String(u.perDay), price: String(u.priceUsd), priceTouched: u.priceBasis === "typed" }))
  }, [state, rec.ready, rec.record.unit, update])

  if (!state || !rec.ready) return null

  const move = (fn: () => void) => {
    const now = Date.now()
    if (now - lastMove.current < 250) return
    lastMove.current = now
    fn()
  }
  const id = list[screen - 1]
  const back = screen > 1 ? goBack : null
  const resultAt = (goal: QuitGoal | null) => screensFor(goal, false).length + 1

  /** Writes the shared record from the answers and shows the result. */
  const finish = (next: DateState) => {
    if (next.goal === "stop" || next.goal === "break") {
      const base = breakBase(next, today)
      const end = next.goal === "break" && base && next.len ? breakEnd(base, next.len, next.setEnd || null) : null
      rec.setPlan({ goal: next.goal, quitDate: next.another ? rec.record.quitDate : next.start, breakEnd: end })
    }
    update((s) => ({ ...s, done: screensFor(next.goal, false).length, editing: false, another: false }))
    go(resultAt(next.goal))
  }

  if (isResult) {
    if (state.goal === "later") {
      return (
        <Later
          steps={steps}
          onPick={() =>
            move(() => {
              update((s) => ({ ...s, goal: "stop", done: 1, editing: false }))
              go(2)
            })
          }
        />
      )
    }
    return (
      <Result
        key="result"
        today={today}
        record={rec.record}
        steps={steps}
        course={course}
        courseNote={courseNote}
        bb={bb}
        carry={carry}
        addiction={addiction}
        acked={state.ackEnd}
        onAck={(end) => update((s) => ({ ...s, ackEnd: end }))}
        onChange={() =>
          move(() => {
            update((s) => ({ ...s, done: 1, editing: true, start: rec.record.quitDate ?? s.start, goal: rec.record.goal ?? s.goal, another: false }))
            go(2)
          })
        }
        onStopForGood={() =>
          move(() => {
            rec.setPlan({ goal: "stop", quitDate: rec.record.quitDate, breakEnd: null })
            update((s) => ({ ...s, goal: "stop", ackEnd: null }))
          })
        }
        onAnother={() =>
          move(() => {
            update((s) => ({ ...s, goal: "break", another: true, len: null, setEnd: "", done: 2, editing: false }))
            go(3)
          })
        }
      />
    )
  }

  if (id === "goal") {
    return (
      <OneQuestion step={screen} total={list.length} onBack={null}>
        <h2 className="text-lg font-semibold">{t.goalTitle}</h2>
        <div role="radiogroup" aria-label={t.goalTitle} className="flex flex-col gap-2">
          {(
            [
              ["stop", t.goalStop, t.goalStopSub],
              ["break", t.goalBreak, t.goalBreakSub],
              ["later", t.goalLater, t.goalLaterSub],
            ] as const
          ).map(([g, label, sub]) => (
            <OptionCard
              key={g}
              testId={`goal-${g}`}
              label={label}
              sub={sub}
              selected={state.goal === g}
              onClick={() => {
                started()
                update((s) => ({ ...s, goal: g, another: false }))
              }}
            />
          ))}
        </div>
        <PrimaryButton
          testId="goal-next"
          disabled={!state.goal}
          onClick={() =>
            move(() => {
              if (state.goal === "later") {
                rec.setPlan({ goal: "later", quitDate: rec.record.quitDate, breakEnd: null })
                update((s) => ({ ...s, done: 1, editing: false }))
                go(2)
              } else {
                update((s) => ({ ...s, done: Math.max(s.done, 1) }))
                go(2)
              }
            })
          }
        >
          {t.continue}
        </PrimaryButton>
      </OneQuestion>
    )
  }

  if (id === "date") {
    const chips = dateChips(today)
    const { min, max } = dateBounds(today)
    const ok = dateAllowed(state.start, today)
    const far = showsInfo(state.start, today)
    return (
      <OneQuestion step={screen} total={list.length} onBack={back}>
        <h2 className="text-lg font-semibold">{t.dateTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.dateLine}</p>
        <div role="radiogroup" aria-label={t.dateTitle} className="flex flex-col gap-2">
          {chips.map((c) => (
            <OptionCard
              key={c.id}
              testId={`chip-${c.id}`}
              date={c.date}
              label={t.chips[c.id]}
              sub={c.id === "today" ? t.todaySub : fmt(c.date)}
              selected={state.start === c.date}
              onClick={() => update((s) => ({ ...s, start: c.date }))}
            />
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t.dateField}</span>
          <input
            type="date"
            data-testid="date-input"
            min={min}
            max={max}
            value={state.start ?? ""}
            onChange={(e) => update((s) => ({ ...s, start: isIsoDay(e.target.value) ? e.target.value : null }))}
            className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-base"
          />
          <span className="text-muted-foreground">{t.dateFieldHelp(fmtYear(min), fmtYear(max))}</span>
        </label>
        <p data-testid="date-chosen" className="text-sm">
          {ok ? t.dateChosen(fmtLong(state.start as string)) : state.start ? t.dateOut(fmtYear(min), fmtYear(max)) : t.noDate}
        </p>
        {far && ok && (
          <section data-testid="far-info" aria-label={t.infoTitle} className="flex flex-col gap-2">
            <InfoLine testId="ev-far" text={DATE_EVIDENCE.dateFar.text} basis={DATE_EVIDENCE.dateFar.basis} refs={DATE_EVIDENCE.dateFar.refs} />
            <InfoLine testId="ev-others" text={DATE_EVIDENCE.dateOthers.text} basis={DATE_EVIDENCE.dateOthers.basis} refs={DATE_EVIDENCE.dateOthers.refs} />
          </section>
        )}
        <PrimaryButton
          testId="date-next"
          disabled={!ok}
          onClick={() =>
            move(() => {
              if (state.goal !== "break" && state.editing) return finish(state)
              update((s) => ({ ...s, done: Math.max(s.done, 2) }))
              go(3)
            })
          }
        >
          {t.continue}
        </PrimaryButton>
      </OneQuestion>
    )
  }

  if (id === "length") {
    const base = breakBase(state, today)
    const end = base && state.len ? breakEnd(base, state.len, state.setEnd || null) : null
    return (
      <OneQuestion step={screen} total={list.length} onBack={back}>
        <h2 className="text-lg font-semibold">{t.lengthTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.lengthLine}</p>
        <div role="radiogroup" aria-label={t.lengthTitle} className="flex flex-col gap-2">
          {BREAK_LENS.map((l: BreakLen) => (
            <OptionCard key={l} testId={`len-${l}`} label={t.lengths[l]} selected={state.len === l} onClick={() => update((s) => ({ ...s, len: l }))} />
          ))}
        </div>
        {state.len === "set" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t.endField}</span>
            <input
              type="date"
              data-testid="end-input"
              min={base ? addDays(base, 1) : undefined}
              value={state.setEnd}
              onChange={(e) => update((s) => ({ ...s, setEnd: isIsoDay(e.target.value) ? e.target.value : "" }))}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-base"
            />
          </label>
        )}
        {state.len === "set" && state.setEnd && !end && (
          <p data-testid="end-error" className="text-sm text-muted-foreground">
            {t.endBeforeStart}
          </p>
        )}
        {end && (
          <p data-testid="end-chosen" className="text-sm">
            {t.breakEnds(fmtLong(end))}
          </p>
        )}
        <PrimaryButton
          testId="length-next"
          disabled={!end}
          onClick={() =>
            move(() => {
              if (state.another || state.editing) return finish(state)
              update((s) => ({ ...s, done: Math.max(s.done, 3) }))
              go(4)
            })
          }
        >
          {t.continue}
        </PrimaryButton>
      </OneQuestion>
    )
  }

  if (id === "use") {
    const unit = units.find((u) => u.id === state.unitId) ?? null
    const count = parseTyped(state.perDay, MAX_PER_DAY)
    const price = parseTyped(state.price, MAX_PRICE)
    const bad = count.kind === "bad" || price.kind === "bad"
    const save = () => {
      if (unit) {
        const typed = price.kind === "ok" ? price.value : (unit.defaultPriceUsd ?? 0)
        rec.setUnit({
          id: unit.id,
          perDay: count.kind === "ok" ? count.value : null,
          priceUsd: typed,
          priceBasis: state.priceTouched && typed !== unit.defaultPriceUsd ? "typed" : "default",
        })
      }
      update((s) => ({ ...s, done: Math.max(s.done, screen) }))
      go(screen + 1)
    }
    return (
      <OneQuestion step={screen} total={list.length} onBack={back}>
        <h2 className="text-lg font-semibold">{t.useTitle}</h2>
        <Chips
          label={t.useTitle}
          options={units.map((u) => ({ id: u.id, label: t.useUnits[u.id] ?? u.many }))}
          value={state.unitId ? [state.unitId] : []}
          onChange={(next) => {
            const u = units.find((x) => x.id === next[0])
            update((s) => (s.unitId === next[0] ? s : { ...s, unitId: next[0], perDay: "", price: String(u?.defaultPriceUsd ?? ""), priceTouched: false }))
          }}
        />
        {unit && (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.perDayLabel(unit.many)}</span>
              <input
                type="text"
                inputMode="decimal"
                data-testid="use-perday"
                value={state.perDay}
                maxLength={8}
                onChange={(e) => update((s) => ({ ...s, perDay: e.target.value }))}
                className="min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
              />
              <span className="text-muted-foreground">{t.perDayHelp}</span>
              {count.kind === "bad" && (
                <span data-testid="use-error-perday" role="alert" className="text-foreground">
                  {t.badNumber}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t.priceLabel(unit.one)}</span>
              <input
                type="text"
                inputMode="decimal"
                data-testid="use-price"
                value={state.price}
                maxLength={8}
                onChange={(e) => update((s) => ({ ...s, price: e.target.value, priceTouched: true }))}
                className="min-h-12 w-full rounded-md border border-border bg-card px-3 text-base"
              />
              <span data-testid="use-price-basis" className="text-muted-foreground">
                {t.priceBasis[unit.id] ?? ""}
              </span>
              {price.kind === "bad" && (
                <span data-testid="use-error-price" role="alert" className="text-foreground">
                  {t.badNumber}
                </span>
              )}
            </label>
            <p className="text-sm text-muted-foreground">{t.useNote}</p>
          </>
        )}
        <PrimaryButton testId="use-next" disabled={!unit || bad} onClick={() => move(save)}>
          {t.continue}
        </PrimaryButton>
        <button
          type="button"
          data-testid="use-skip"
          onClick={() =>
            move(() => {
              update((s) => ({ ...s, done: Math.max(s.done, screen) }))
              go(screen + 1)
            })
          }
          className="inline-flex min-h-11 items-center justify-center self-center text-sm text-muted-foreground underline"
        >
          {t.skip}
        </button>
      </OneQuestion>
    )
  }

  // plan
  return (
    <OneQuestion step={screen} total={list.length} onBack={back}>
      <h2 className="text-lg font-semibold">{t.planTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.planLine}</p>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => {
          const lines = usable<string[]>(s.do) ?? []
          return (
            <li key={s.title} data-testid={`plan-step-${i}`} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{`Step ${i + 1}`}</p>
              <h3 className="text-base font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm">
                <Linked text={s.text} carry={carry} addiction={addiction} />
              </p>
              {i === 2 && (
                <p data-testid="plan-date" className="mt-2 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium">
                  {state.start ? t.planYourDate(fmtLong(state.start)) : t.planYourDateNone}
                </p>
              )}
              {lines.length > 0 && (
                <details className="mt-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-primary">{t.planDo}</summary>
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
                    {lines.map((l) => (
                      <li key={l}>
                        <Linked text={l} carry={carry} addiction={addiction} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          )
        })}
      </ol>
      <PrimaryButton testId="plan-next" onClick={() => move(() => finish(state))}>
        {t.planShow}
      </PrimaryButton>
    </OneQuestion>
  )
}

/** Tool names inside a step: a link only when that tool is finished, plain text until then. */
const TOOL_NAMES: [string, string][] = [["the 12 lies test", "beliefs"]]
function Linked({ text, carry, addiction }: { text: string; carry: (p: string) => string; addiction: string }) {
  for (const [name, tool] of TOOL_NAMES) {
    const at = text.indexOf(name)
    if (at === -1) continue
    if (!isFinished(tool)) return <>{text}</>
    return (
      <>
        {text.slice(0, at)}
        <Link href={carry(`/quit/${addiction}/${tool}`)} className="text-primary underline">
          {name}
        </Link>
        {text.slice(at + name.length)}
      </>
    )
  }
  return <>{text}</>
}

function Later({ steps, onPick }: { steps: QuitPlanStep[]; onPick: () => void }) {
  const first = steps[0]
  const lines = usable<string[]>(first.do) ?? []
  return (
    <section data-testid="result" data-goal="later" className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{t.laterTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.laterLine}</p>
      <div data-testid="later-step" className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t.laterStep}</p>
        <h3 className="text-base font-semibold">{first.title}</h3>
        <p className="mt-1 text-sm">{first.text}</p>
        {lines.length > 0 && (
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </div>
      <PrimaryButton testId="later-pick" onClick={onPick}>
        {t.laterPick}
      </PrimaryButton>
    </section>
  )
}

interface ResultProps {
  today: string
  record: QuitRecord
  steps: QuitPlanStep[]
  course: QuitSymptomCourse[]
  courseNote: string
  bb: QuitRunApi | null
  carry: (p: string) => string
  addiction: string
  acked: string | null
  onAck: (end: string) => void
  onChange: () => void
  onStopForGood: () => void
  onAnother: () => void
}

function Result({ today, record, course, courseNote, bb, carry, addiction, acked, onAck, onChange, onStopForGood, onAnother }: ResultProps) {
  const [refused, setRefused] = useState(false)
  const tried = useRef<string | null>(null)
  const quitDate = record.quitDate
  const isBreak = record.goal === "break"
  const run = bb?.run ?? null

  // The first visit on or after the date starts the living run (a past date backdates it). A future date starts nothing.
  useEffect(() => {
    if (!bb || !bb.settled || bb.run || !quitDate || quitDate > today) return
    if (tried.current === quitDate) return
    tried.current = quitDate
    if (!bb.startRun(quitDate)) setRefused(true)
  }, [bb, quitDate, today])

  if (!quitDate) return null
  // While a run lives it is the truth: the date is never moved under it.
  const day1 = run ? run.startedOn : quitDate
  const line = dayLine(day1, today)
  const end = isBreak ? record.breakEnd : null
  const left = end ? daysBetween(today, end) : null
  const ended = end !== null && left !== null && left <= 0
  const list = stretches(course, courseNote)
  const slipLive = isFinished("slip")

  const download = () => {
    const blob = new Blob([icsFor(day1, new Date())], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = t.icsFile
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return (
    <section data-testid="result" data-goal={record.goal ?? ""} className="flex flex-col gap-5">
      <header className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm text-muted-foreground">{isBreak ? t.resultBreak : t.resultStop}</h2>
        <p data-testid="result-date" className="text-2xl font-semibold leading-tight">
          {fmtLong(day1)}
        </p>
        <p data-testid="result-days" className="mt-1 text-lg">
          {line.kind === "ahead" ? t.daysToGo(line.n) : line.kind === "dayOne" ? t.dayOne : t.dayN(line.n)}
        </p>
        {end && left !== null && (
          <div className="mt-3 border-t border-border pt-3">
            <p data-testid="break-end" className="text-sm">
              {t.breakEnds(fmtLong(end))}
            </p>
            {!ended ? (
              <p data-testid="break-left" className="text-sm text-muted-foreground">
                {t.breakLeft(left)}
              </p>
            ) : (
              <p data-testid="break-done" className="text-base font-medium">
                {t.breakDone}
              </p>
            )}
          </div>
        )}
      </header>

      {isBreak && ended && end !== acked && (
        <section data-testid="break-choices" className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t.breakDoneLine}</p>
          <PrimaryButton testId="break-stop" onClick={onStopForGood}>
            {t.breakStop}
          </PrimaryButton>
          <button type="button" data-testid="break-another" onClick={onAnother} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base font-medium">
            {t.breakAnother}
          </button>
          <button type="button" data-testid="break-notnow" onClick={() => onAck(end as string)} className="inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline">
            {t.breakNotNow}
          </button>
        </section>
      )}

      {refused && !run && (
        <p data-testid="run-refused" className="text-sm text-muted-foreground">
          {t.refuse}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.calTitle}</h3>
        <div className="flex flex-wrap gap-2">
          <a data-testid="cal-google" href={googleCalendarUrl(day1)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm">
            {t.calGoogle}
          </a>
          <button type="button" data-testid="cal-ics" onClick={download} className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm">
            {t.calIcs}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">{t.calNote}</p>
      </section>

      <HardDays day1={day1} today={today} list={list} />

      {run ? (
        <p data-testid="run-line" className="text-sm">
          {t.runLine(fmtLong(run.startedOn))}{" "}
          {slipLive ? (
            <>
              {t.runSlipPre}{" "}
              <Link href={carry(`/quit/${addiction}/slip`)} className="text-primary underline">
                {t.runSlipName}
              </Link>
              {t.runSlipPost}
            </>
          ) : (
            <>{`${t.runSlipPre} “${t.runSlipName}”${t.runSlipPost}`}</>
          )}
        </p>
      ) : (
        <button type="button" data-testid="plan-change" onClick={onChange} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
          {t.change}
        </button>
      )}
      <Link href={carry(`/quit/${addiction}`)} data-testid="to-menu" className="inline-flex min-h-11 items-center self-start text-primary underline">
        {t.toMenu}
      </Link>
    </section>
  )
}

const STRETCH_STYLE: Record<Stretch["id"], string> = {
  hard: "bg-primary/45 border-primary",
  fade: "bg-primary/20 border-primary/60",
  cue: "bg-muted border-dashed border-primary",
}

function HardDays({ day1, today, list }: { day1: string; today: string; list: Stretch[] }) {
  const weeks = calendarWeeks(day1)
  return (
    <section data-testid="hard-days" className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">{t.hardTitle}</h3>
      <p className="text-sm text-muted-foreground">{t.hardLine}</p>
      <div role="grid" aria-label={t.hardTitle} className="rounded-lg border border-border bg-card p-2">
        <div role="row" className="grid grid-cols-7 gap-1 pb-1 text-center text-xs text-muted-foreground">
          {t.weekdayShort.map((d) => (
            <span key={d} role="columnheader">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div role="row" key={wi} className="grid grid-cols-7 gap-1 pb-1">
            {week.map((cell, ci) => {
              if (!cell) return <span key={ci} role="gridcell" aria-hidden="true" className="min-h-12" />
              const s = stretchAt(list, cell.dayNo)
              const isToday = cell.date === today
              return (
                <span
                  key={ci}
                  role="gridcell"
                  data-testid={`cal-day-${cell.dayNo}`}
                  data-date={cell.date}
                  data-stretch={s?.id}
                  data-today={isToday ? "true" : undefined}
                  aria-label={`${t.dayOfPlan(cell.dayNo)}, ${fmt(cell.date)}${isToday ? ", today" : ""}`}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-md border text-sm ${s ? STRETCH_STYLE[s.id] : "border-transparent"} ${isToday ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`}
                >
                  <span className="font-medium leading-none">{Number(cell.date.slice(8))}</span>
                  <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">{`D${cell.dayNo}`}</span>
                </span>
              )
            })}
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((s) => (
          <li key={s.id} data-testid={`stretch-${s.id}`} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <span aria-hidden="true" className={`mt-1 size-4 shrink-0 rounded border ${STRETCH_STYLE[s.id]}`} />
              <div className="min-w-0">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.line}</p>
              </div>
            </div>
            <BasisBox testId={`stretch-${s.id}-basis`} basis={s.basis} refs={s.refs} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{t.hardNote}</p>
    </section>
  )
}
