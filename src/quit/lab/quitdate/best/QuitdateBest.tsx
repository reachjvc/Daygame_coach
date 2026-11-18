"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { PrimaryButton, SourceTap } from "../../../components/kit"
import { usable } from "../../../tools/common"
import type { QuitAddictionId, QuitPlanStep } from "../../../types"
import type { LabProps } from "../../registry"
import { dayKey } from "../../progress/shared/calc"
import { useLabState } from "../../store"
import { CheckRow, OptionCard, QHead } from "../shared/Bits"
import { EVIDENCE, type QdEvidence } from "./evidence"
import {
  CHIP_IDS,
  breakEnd,
  chipDate,
  dateCame,
  daysAhead,
  evidenceMode,
  googleCalendarUrl,
  icsFor,
  isFar,
  ladder,
  msToEnd,
  parts,
  slipToday,
  summarize,
  type BreakLen,
  type ChipId,
  type Run,
} from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
type Goal = "stop" | "break" | "later"
interface Plan {
  goal: Goal
  start: string | null
  len: BreakLen | null
  setEnd: string | null
}

const fmt = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
const fmtLong = (key: string) => new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

/** Improved Quit date and plan: goal first, near dates first, a break with an end, a result with calendar, checklist and ladder. */
export function QuitdateBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>("quitdate", "best", "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  return (
    <div data-testid="quitdate-best" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
        {SWITCH_IDS.map((x) => (
          <button
            key={x}
            type="button"
            role="radio"
            aria-checked={id === x}
            data-testid={`switch-${x}`}
            onClick={() => setChosen(x)}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${id === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {t.addictions[x]}
          </button>
        ))}
      </div>
      <Flow key={id} id={id} />
    </div>
  )
}

/** One evidence line with its basis and sources one tap away. Hidden for porn; tagged for alcohol and weed. */
function EvidenceLine({ ev, id, testId }: { ev: QdEvidence; id: string; testId: string }) {
  const [open, setOpen] = useState(false)
  const mode = evidenceMode(id)
  if (mode === "hidden") return null
  return (
    <div data-testid={testId} className="rounded-lg border border-border bg-card p-3 text-sm">
      {mode === "tagged" && (
        <span data-testid={`${testId}-tag`} className="mb-1 inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {t.studiedIn}
        </span>
      )}
      <p className="text-base">{ev.text}</p>
      <button type="button" data-testid={`${testId}-basis`} aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center text-sm text-primary underline">
        {open ? t.basisClose : t.basisOpen}
      </button>
      {open && (
        <div data-testid={`${testId}-detail`}>
          <dl className="mt-1 flex flex-col gap-1 text-muted-foreground">
            <div>
              <dt className="inline font-medium text-foreground">{t.basisWho}: </dt>
              <dd className="inline">{ev.basis.who}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">{t.basisN}: </dt>
              <dd className="inline">{ev.basis.n}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">{t.basisDesign}: </dt>
              <dd className="inline">{ev.basis.design}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">{t.basisWhen}: </dt>
              <dd className="inline">{ev.basis.when}</dd>
            </div>
          </dl>
          <SourceTap refs={ev.refs} />
        </div>
      )}
    </div>
  )
}

type Step = "goal" | "date" | "length"

function Flow({ id }: { id: QuitAddictionId }) {
  const [plan, setPlan] = useLabState<Plan | null>("quitdate", "best", `plan-${id}`, null)
  const [runs, setRuns] = useLabState<Run[]>("quitdate", "best", `runs-${id}`, [])
  const [checks, setChecks] = useLabState<number[]>("quitdate", "best", `checks-${id}`, [])
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [step, setStep] = useState<Step>("goal")
  const [goal, setGoal] = useState<Goal | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [len, setLen] = useState<BreakLen | null>(null)
  const [setEnd, setSetEnd] = useState("")
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!mounted) return null

  const data = getAddiction(id)
  const steps = usable<QuitPlanStep[]>(data?.planSteps) ?? []
  const today = dayKey(now)

  const save = (p: Plan) => {
    setPlan(p)
    if (p.start) {
      const closed = runs.filter((r) => r.end !== null)
      setRuns([...closed, { start: p.start, end: null }])
    }
  }
  const restart = (to: Step = "goal", g: Goal | null = null) => {
    setPlan(null)
    setStep(to)
    setGoal(g)
    setStart(null)
    setLen(null)
    setSetEnd("")
  }

  if (plan) {
    return plan.goal === "later" ? (
      <Later steps={steps} onPick={() => restart("date", "stop")} onChange={() => restart()} />
    ) : (
      <Result id={id} plan={plan} steps={steps} runs={runs} setRuns={setRuns} checks={checks} setChecks={setChecks} now={now} onChange={() => restart()} />
    )
  }

  if (step === "goal") {
    return (
      <section data-testid="step-goal" className="flex flex-col gap-3">
        <header>
          <h2 className="text-xl font-semibold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.line}</p>
        </header>
        <h3 className="text-lg font-semibold">{t.goalTitle}</h3>
        <div role="radiogroup" aria-label={t.goalTitle} className="flex flex-col gap-1">
          <OptionCard testId="goal-stop" label={t.goalStop} sub={t.goalStopSub} selected={goal === "stop"} onClick={() => setGoal("stop")} />
          <OptionCard testId="goal-break" label={t.goalBreak} sub={t.goalBreakSub} selected={goal === "break"} onClick={() => setGoal("break")} />
          <OptionCard testId="goal-later" label={t.goalLater} sub={t.goalLaterSub} selected={goal === "later"} onClick={() => setGoal("later")} />
        </div>
        {goal === "stop" && <EvidenceLine ev={EVIDENCE.abrupt} id={id} testId="ev-abrupt" />}
        <PrimaryButton
          testId="goal-next"
          disabled={!goal}
          onClick={() => {
            if (goal === "later") save({ goal: "later", start: null, len: null, setEnd: null })
            else setStep("date")
          }}
        >
          {t.continue}
        </PrimaryButton>
      </section>
    )
  }

  if (step === "date") {
    const far = isFar(start, now) && evidenceMode(id) !== "hidden"
    const dateOk = start !== null && /^\d{4}-\d{2}-\d{2}$/.test(start)
    return (
      <section data-testid="step-date" className="flex flex-col gap-3">
        <QHead title={t.dateTitle} onBack={() => setStep("goal")} />
        <p className="text-sm text-muted-foreground">{t.dateLine}</p>
        <div role="radiogroup" aria-label={t.dateTitle} className="grid grid-cols-2 gap-2">
          {CHIP_IDS.map((c: ChipId) => {
            const d = chipDate(c, today)
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={start === d}
                data-testid={`chip-${c}`}
                data-date={d}
                onClick={() => setStart(d)}
                className={`flex min-h-14 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left ${start === d ? "border-primary bg-primary/15" : "border-border bg-card"}`}
              >
                <span className="font-semibold">{t.chips[c]}</span>
                <span className="text-sm text-muted-foreground">{fmt(d)}</span>
              </button>
            )
          })}
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{t.dateField}</span>
          <input type="date" data-testid="date-input" value={start ?? ""} onChange={(e) => setStart(e.target.value || null)} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
        <p data-testid="date-chosen" className="text-sm">
          {dateOk ? t.dateChosen(fmtLong(start as string)) : t.noDate}
        </p>
        {far && (
          <div data-testid="far-warning" className="flex flex-col gap-2">
            <EvidenceLine ev={EVIDENCE.dateFar} id={id} testId="ev-far" />
            <EvidenceLine ev={EVIDENCE.dateOthers} id={id} testId="ev-others" />
          </div>
        )}
        <PrimaryButton
          testId="date-next"
          disabled={!dateOk}
          onClick={() => {
            if (goal === "break") setStep("length")
            else save({ goal: "stop", start, len: null, setEnd: null })
          }}
        >
          {t.continue}
        </PrimaryButton>
      </section>
    )
  }

  const endKey = start && len ? breakEnd(start, len, setEnd || null) : null
  return (
    <section data-testid="step-length" className="flex flex-col gap-3">
      <QHead title={t.lengthTitle} onBack={() => setStep("date")} />
      <p className="text-sm text-muted-foreground">{t.lengthLine}</p>
      <div role="radiogroup" aria-label={t.lengthTitle} className="grid grid-cols-2 gap-2">
        {(["w1", "w2", "w4", "set"] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={len === l}
            data-testid={`len-${l}`}
            onClick={() => setLen(l)}
            className={`flex min-h-14 items-center rounded-lg border px-3 py-2 text-left font-semibold ${len === l ? "border-primary bg-primary/15" : "border-border bg-card"}`}
          >
            {t.lengths[l]}
          </button>
        ))}
      </div>
      {len === "set" && (
        <>
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
            <span>{t.endField}</span>
            <input type="date" data-testid="end-input" value={setEnd} onChange={(e) => setSetEnd(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
          </label>
          {setEnd && !endKey && <p data-testid="end-error" className="text-sm text-muted-foreground">{t.endBeforeStart}</p>}
        </>
      )}
      {endKey && <p data-testid="end-chosen" className="text-sm">{t.breakEnds(fmtLong(endKey))}</p>}
      <PrimaryButton testId="length-next" disabled={!endKey} onClick={() => save({ goal: "break", start, len, setEnd: endKey })}>
        {t.continue}
      </PrimaryButton>
    </section>
  )
}

function Later({ steps, onPick, onChange }: { steps: QuitPlanStep[]; onPick: () => void; onChange: () => void }) {
  const first = steps[0]
  const lines = first && Array.isArray(first.do) ? (first.do as string[]) : []
  return (
    <section data-testid="step-later" className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{t.laterTitle}</h2>
      <p className="text-sm text-muted-foreground">{t.laterLine}</p>
      {first ? (
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
      ) : (
        <p data-testid="content-coming" className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t.stepsComing}
        </p>
      )}
      <p className="text-sm">{t.laterNudge}</p>
      <PrimaryButton testId="later-pick" onClick={onPick}>
        {t.laterPick}
      </PrimaryButton>
      <button type="button" data-testid="plan-change" onClick={onChange} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
        {t.change}
      </button>
    </section>
  )
}

interface ResultProps {
  id: QuitAddictionId
  plan: Plan
  steps: QuitPlanStep[]
  runs: Run[]
  setRuns: (r: Run[]) => void
  checks: number[]
  setChecks: (c: number[]) => void
  now: number
  onChange: () => void
}

function Result({ plan, steps, runs, setRuns, checks, setChecks, now, onChange }: ResultProps) {
  const start = plan.start as string
  const today = dayKey(now)
  const ahead = daysAhead(start, now)
  const isBreak = plan.goal === "break"
  const end = isBreak ? breakEnd(start, plan.len as BreakLen, plan.setEnd) : null
  const title = isBreak ? t.calBreakName : t.calStopName
  const calDate = isBreak && end ? end : start
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsFor(calDate, title))}`
  const left = end ? parts(msToEnd(end, now)) : null
  const sum = summarize(runs, today)
  const rungs = ladder(start, now)
  const nextRung = rungs.find((r) => r.next)
  const nextIn = nextRung ? parts(nextRung.atMs - now) : null
  return (
    <section data-testid="result" data-goal={plan.goal} className="flex flex-col gap-4">
      <header className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm text-muted-foreground">{isBreak ? t.resultBreak : t.resultStop}</h2>
        <p data-testid="result-date" className="text-2xl font-semibold">
          {fmtLong(start)}
        </p>
        <p data-testid="result-days" data-days={ahead} className="text-base">
          {ahead > 0 ? t.daysToGo(ahead) : ahead === 0 ? t.daysToGo(0) : t.daysSince(-ahead + 1)}
        </p>
        {isBreak && end && left && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-sm text-muted-foreground">{t.breakEnds(fmtLong(end))}</p>
            {msToEnd(end, now) > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">{t.breakCountdown}</p>
                <p data-testid="break-countdown" className="text-2xl font-semibold tabular-nums">
                  {t.countdown(left.days, left.hours, left.minutes, left.seconds)}
                </p>
              </>
            ) : (
              <p data-testid="break-done" className="text-base">{t.breakDone}</p>
            )}
          </div>
        )}
      </header>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.calendarTitle}</h3>
        <div className="flex flex-wrap gap-2">
          <a data-testid="cal-google" href={googleCalendarUrl(calDate, title)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm">
            {t.calGoogle}
          </a>
          <a data-testid="cal-ics" href={ics} download={t.icsFile} className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm">
            {t.calIcs}
          </a>
        </div>
      </section>

      <section data-testid="checklist" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.checklistTitle}</h3>
        {steps.length === 0 ? (
          <p data-testid="content-coming" className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t.planStepsComing}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t.checklistLine}</p>
            <p data-testid="checklist-count" className="text-sm">
              {t.checklistDone(checks.filter((i) => i < steps.length).length, steps.length)}
            </p>
            <div className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <CheckRow key={s.title} testId={`check-${i}`} label={s.title} on={checks.includes(i)} onClick={() => setChecks(checks.includes(i) ? checks.filter((x) => x !== i) : [...checks, i])} />
              ))}
            </div>
          </>
        )}
      </section>

      <section data-testid="ladder" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.ladderTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.ladderLine}</p>
        {nextRung && nextIn ? (
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm text-muted-foreground">{t.ladderNext}</p>
            <p className="text-sm">{t.ladderNextIn(t.ladder[nextRung.key])}</p>
            <p data-testid="ladder-countdown" data-next={nextRung.key} className="text-xl font-semibold tabular-nums">
              {t.countdown(nextIn.days, nextIn.hours, nextIn.minutes, nextIn.seconds)}
            </p>
            {ahead > 0 && <p className="text-sm text-muted-foreground">{t.ladderBefore}</p>}
          </div>
        ) : (
          <p data-testid="ladder-done" className="text-sm">{t.ladderAllDone}</p>
        )}
        <ul className="flex flex-col gap-1">
          {rungs.map((r) => (
            <li key={r.key} data-testid={`rung-${r.key}`} data-reached={r.reached} className={`flex min-h-11 items-center justify-between rounded-md border px-3 text-sm ${r.reached ? "border-primary bg-primary/15" : "border-border bg-card"}`}>
              <span>{t.ladder[r.key]}</span>
              <span className="text-muted-foreground">{r.reached ? t.reached : fmt(dayKey(r.atMs))}</span>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="runs" className="flex flex-col gap-2">
        <h3 className="text-base font-semibold">{t.runsTitle}</h3>
        {!dateCame(start, now) && sum.past.length === 0 ? (
          <p data-testid="runs-before" className="text-sm text-muted-foreground">{t.runsBefore(fmtLong(start))}</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Tile testId="runs-total" label={t.total} value={sum.total} />
              <Tile testId="runs-current" label={t.current} value={sum.current} />
              <Tile testId="runs-best" label={t.best} value={sum.best} />
            </div>
            {dateCame(start, now) && (
              <button type="button" data-testid="slip" onClick={() => setRuns(slipToday(runs, today))} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-4 text-sm">
                {t.slip}
              </button>
            )}
            {sum.past.length > 0 && (
              <>
                <p data-testid="slip-note" className="text-sm text-muted-foreground">{t.slipNote}</p>
                <h4 className="text-sm font-semibold">{t.pastRuns}</h4>
                <ul data-testid="past-runs" className="flex flex-col gap-1">
                  {sum.past.map((p) => (
                    <li key={p.start} className="flex min-h-11 items-center justify-between rounded-md border border-border bg-card px-3 text-sm">
                      <span>{t.runRange(fmt(p.start), fmt(p.end))}</span>
                      <span className="tabular-nums">{t.daysWord(p.days)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      <button type="button" data-testid="plan-change" onClick={onChange} className="inline-flex min-h-11 items-center self-start text-sm text-muted-foreground underline">
        {t.change}
      </button>
    </section>
  )
}

function Tile({ testId, label, value }: { testId: string; label: string; value: number }) {
  return (
    <div data-testid={testId} data-value={value} className="rounded-lg border border-border bg-card p-2">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
