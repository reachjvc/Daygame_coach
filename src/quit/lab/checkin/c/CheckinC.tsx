"use client"

import { useEffect, useRef, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { Card, InferredTag, Placeholder, Tabs } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { ExampleGate, OtherScreen } from "../shared/Bits"
import { addDays, keyToMs, monthGrid, monthOf, prevMonth } from "../shared/logic"
import { ckText } from "../shared/text"
import { checkinStreak, dayScore, insightOf, markerOf, pointsOf, POINTS_PER_CHECKIN, progressOf, rankIndex, seedDaysC, stepsFor, type CheckC, type DaysC, type Outcome, type Step } from "./logic"
import { cText } from "./text"

const KEYS = ["days", "toured"]
const TINT = ["bg-sky-200 text-slate-900", "bg-sky-400 text-slate-900", "bg-blue-600 text-white", "bg-blue-800 text-white", "bg-indigo-950 text-white"]
const EMPTY: CheckC = { outcome: "victory", urges: 0, emotion: 0, positive: [], negative: [], ratings: [], title: "", body: "" }

/** Copy C: the whole free-tier check-in from the first question to the reward lines, with insights and calendar. */
export function CheckinC() {
  return (
    <div data-testid="checkin-c">
      <ExampleGate letter="c" keys={KEYS}>
        {(seeded, today) => <Main seeded={seeded} today={today} />}
      </ExampleGate>
    </div>
  )
}

function Main({ seeded, today }: { seeded: boolean; today: string }) {
  const [days, setDays] = useLabState<DaysC>("checkin", "c", "days", seeded ? seedDaysC(today) : {})
  const [toured, setToured] = useLabState<boolean>("checkin", "c", "toured", false)
  const [tab, setTab] = useState(0)
  const [flow, setFlow] = useState(false)
  if (flow) {
    return (
      <Flow
        today={today}
        onExit={() => setFlow(false)}
        onSave={(c) => setDays({ ...days, [today]: c })}
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <Tabs items={cText.tabs} value={tab} onChange={setTab} id="c-tab" scroll />
      {tab === 0 && <Home days={days} today={today} toured={toured} onTour={() => setToured(true)} onStart={() => setFlow(true)} />}
      {tab === 1 && <Insights days={days} onStart={() => setFlow(true)} />}
      {tab === 2 && <Analytics days={days} today={today} />}
      {tab > 2 && <OtherScreen title={cText.tabs[tab]} onBack={null} />}
    </div>
  )
}

function Home({ days, today, toured, onTour, onStart }: { days: DaysC; today: string; toured: boolean; onTour: () => void; onStart: () => void }) {
  const [step, setStep] = useState(0)
  const touring = !toured
  const points = pointsOf(days)
  const streak = checkinStreak(days, today)
  const dim = (i: number) => (touring && step !== i ? "opacity-40" : touring ? "ring-2 ring-sky-400 rounded-lg" : "")
  const bubble = (i: number) =>
    touring && step === i ? (
      <div data-testid="c-tour" data-step={i} role="dialog" className="relative mt-2 rounded-lg bg-sky-600 p-3 text-white">
        <span aria-hidden="true" className="absolute -top-1.5 left-6 size-3 rotate-45 bg-sky-600" />
        <p className="text-sm">{cText.tour[i]}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs">{cText.tourStep(i + 1, 5)}</span>
          <button type="button" data-testid="c-tour-next" onClick={() => (i === 4 ? onTour() : setStep(i + 1))} className="min-h-11 rounded-md bg-white/20 px-4 text-sm font-medium">
            {i === 4 ? cText.tourFinish : cText.tourNext}
          </button>
        </div>
      </div>
    ) : null
  const done = days[today] !== undefined
  return (
    <section data-testid="c-home" className="flex flex-col gap-3">
      <div className={dim(0)}>
        <div data-testid="c-stats" className="grid grid-cols-3 gap-2 rounded-lg bg-blue-950 p-3 text-center">
          <div>
            <p className="text-xs text-sky-200">{cText.points}</p>
            <p data-testid="c-points" className="text-lg font-bold">{points}</p>
          </div>
          <div>
            <p className="text-xs text-sky-200">{cText.streakLabel}</p>
            <p data-testid="c-streak" className="text-lg font-bold">{streak}</p>
          </div>
          <div>
            <p className="text-xs text-sky-200">{cText.rank}</p>
            <p data-testid="c-rank" className="text-lg font-bold">{cText.ranks[rankIndex(points)]}</p>
          </div>
        </div>
        {bubble(0)}
      </div>
      <div>
        <h2 className="text-xl font-bold">{cText.greeting}</h2>
        <p className="text-sm text-muted-foreground">{cText.greetingLine}</p>
      </div>
      <div className={dim(1)}>
        <button type="button" data-testid="c-card" onClick={onStart} className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
          <span aria-hidden="true" className="text-2xl text-sky-400">{"∿"}</span>
          <span className="flex-1">
            <span className="block font-semibold">{cText.cardTitle}</span>
            {done && <span className="block text-xs text-muted-foreground">{cText.cardDone}</span>}
          </span>
          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sm text-sky-300">{cText.cardReward(POINTS_PER_CHECKIN)}</span>
        </button>
        {bubble(1)}
      </div>
      {cText.sections.map((s, i) => (
        <div key={s} className={dim(i + 2)}>
          <h3 className="mb-1 font-semibold">{s}</h3>
          <Card>
            <p className="text-sm text-muted-foreground">{ckText.partOther}</p>
          </Card>
          {bubble(i + 2)}
        </div>
      ))}
    </section>
  )
}

function Scale({ labels, onPick, inferredAt = [], value }: { labels: readonly string[]; onPick: (i: number) => void; inferredAt?: number[]; value?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-60 flex-col gap-2">
      {labels.map((l, i) => (
        <button key={l} type="button" data-testid={`c-scale-${i}`} aria-pressed={value === i} onClick={() => onPick(i)} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 font-semibold ${TINT[i]} ${value === i ? "ring-2 ring-white" : ""}`}>
          {l}
          {inferredAt.includes(i) && <InferredTag />}
        </button>
      ))}
    </div>
  )
}

function Chips({ options, value, onChange, tone, hiddenNote }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; tone: "blue" | "amber"; hiddenNote?: boolean }) {
  const on = tone === "blue" ? "border-sky-500 bg-sky-600 text-white" : "border-amber-500 bg-amber-600 text-white"
  const off = tone === "blue" ? "border-sky-500 text-sky-300" : "border-amber-500 text-amber-300"
  return (
    <div data-testid="c-chips" className="flex flex-col gap-2 pb-20">
      {options.map((o) => (
        <button key={o} type="button" data-testid={`c-chip-${o}`} aria-pressed={value.includes(o)} onClick={() => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o])} className={`min-h-11 rounded-full border px-4 text-left ${value.includes(o) ? on : off}`}>
          {o}
        </button>
      ))}
      {hiddenNote && <Placeholder />}
    </div>
  )
}

function Flow({ today, onExit, onSave }: { today: string; onExit: () => void; onSave: (c: CheckC) => void }) {
  const [draft, setDraft] = useState<CheckC>(EMPTY)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [step, setStep] = useState<Step>("howdid")
  const [phase, setPhase] = useState<"ask" | "saving" | "toasts">("ask")
  const [toasts, setToasts] = useState<string[]>([])
  const steps = stepsFor(outcome)
  const idx = steps.indexOf(step)
  const go = (next: Step) => setStep(next)
  const advance = (oc: Outcome | null = outcome) => {
    const s = stepsFor(oc)
    go(s[s.indexOf(step) + 1])
  }
  const back = () => (idx <= 0 ? onExit() : go(steps[idx - 1]))
  const [ratings, setRatings] = useState<number[]>([])
  const rate = (area: number, pos: number) => {
    const r = [...ratings]
    r[area] = pos
    setRatings(r)
    advance()
  }
  const finish = () => {
    const c: CheckC = { ...draft, outcome: outcome ?? "victory", ratings }
    onSave(c)
    setPhase("saving")
  }
  useEffect(() => {
    if (phase !== "saving") return
    const t = setTimeout(() => {
      setToasts([cText.toastReward(POINTS_PER_CHECKIN)])
      setPhase("toasts")
    }, 900)
    return () => clearTimeout(t)
  }, [phase])
  const area = step.startsWith("r") && step !== "howdid" ? Number(step.slice(1)) : -1
  const fill = progressOf(steps, step)
  const date = new Date(keyToMs(today))

  return (
    <section data-testid="c-flow" data-step={step} className="mx-auto flex max-w-sm flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        {step !== "howdid" && phase === "ask" && (
          <button type="button" data-testid="screen-back" aria-label={cText.backLabel} onClick={back} className="inline-flex size-11 items-center justify-center text-xl">
            {"←"}
          </button>
        )}
        <h2 className="flex-1 text-lg font-bold">{cText.frameTitle}</h2>
        {step === "howdid" && phase === "ask" && (
          <button type="button" data-testid="c-exit" aria-label={cText.backLabel} onClick={onExit} className="inline-flex size-11 items-center justify-center text-xl">
            {"×"}
          </button>
        )}
      </div>
      {step !== "howdid" && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill * 100)} data-testid="c-bar" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-sky-500" style={{ width: `${fill * 100}%` }} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{`${ckText.months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`}</p>

      {phase === "ask" && step === "howdid" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.howdid}</h3>
          <p className="text-center text-sm text-muted-foreground">{cText.howdidHint}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" data-testid="c-setback" onClick={() => (setOutcome("setback"), setStep("time"))} className="min-h-14 rounded-xl bg-amber-500 font-bold text-slate-900">
              {cText.setback}
            </button>
            <button type="button" data-testid="c-victory" onClick={() => (setOutcome("victory"), setStep("urges"))} className="min-h-14 rounded-xl bg-sky-600 font-bold text-white">
              {cText.victory}
            </button>
          </div>
        </>
      )}
      {phase === "ask" && step === "time" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.timeQ}</h3>
          <Scale labels={cText.times} inferredAt={[1]} value={draft.time} onPick={(i) => (setDraft({ ...draft, time: i }), advance())} />
        </>
      )}
      {phase === "ask" && step === "where" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.whereQ}</h3>
          <p className="text-center text-sm text-muted-foreground">{cText.selectAll}</p>
          <Chips options={cText.places} value={draft.places ?? []} onChange={(v) => setDraft({ ...draft, places: v })} tone="blue" hiddenNote />
          <NextBar onNext={() => advance()} />
        </>
      )}
      {phase === "ask" && step === "urges" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.urgesQ}</h3>
          <Scale labels={cText.urgeScale} inferredAt={[2]} value={draft.urges} onPick={(i) => (setDraft({ ...draft, urges: i }), advance())} />
        </>
      )}
      {phase === "ask" && step === "emotion" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.emotionQ}</h3>
          <Scale labels={cText.emotionScale} inferredAt={[2]} value={draft.emotion} onPick={(i) => (setDraft({ ...draft, emotion: i }), advance())} />
        </>
      )}
      {phase === "ask" && step === "positive" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.positiveQ}</h3>
          <p className="text-center text-sm text-muted-foreground">{cText.selectAll}</p>
          <Chips options={cText.positive} value={draft.positive} onChange={(v) => setDraft({ ...draft, positive: v })} tone="blue" hiddenNote />
          <NextBar onNext={() => advance()} />
        </>
      )}
      {phase === "ask" && step === "negative" && (
        <>
          <h3 className="text-center text-xl font-bold">{cText.negativeQ}</h3>
          <p className="text-center text-sm text-muted-foreground">{cText.selectAll}</p>
          <Chips options={cText.negative} value={draft.negative} onChange={(v) => setDraft({ ...draft, negative: v })} tone="amber" hiddenNote />
          <NextBar onNext={() => advance()} />
        </>
      )}
      {phase === "ask" && area >= 0 && (
        <>
          <p className="text-center text-sm text-muted-foreground">{cText.rateHeading}</p>
          <h3 data-testid="c-area" className="text-center text-2xl font-bold text-sky-400">{cText.areas[area]}</h3>
          <p className="text-center text-sm text-muted-foreground">{cText.areaHints[area]}</p>
          <Scale labels={cText.rateScale} inferredAt={[2]} value={ratings[area]} onPick={(i) => rate(area, i)} />
        </>
      )}
      {phase === "ask" && step === "journal" && <JournalStep draft={draft} onChange={setDraft} onNext={finish} />}

      {phase === "saving" && (
        <div data-testid="c-saving" aria-busy="true" className="flex flex-col items-center gap-3 py-8">
          <span className="size-16 animate-pulse rounded-full bg-muted" />
          <span className="h-3 w-40 animate-pulse rounded bg-muted" />
          <span className="h-3 w-28 animate-pulse rounded bg-muted" />
        </div>
      )}
      {phase === "toasts" && (
        <div data-testid="c-done" className="flex flex-col gap-3 py-4">
          {toasts.map((t) => (
            <div key={t} data-testid="c-toast" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
              <span aria-hidden="true" className="inline-flex size-6 items-center justify-center rounded-full bg-sky-600 text-xs text-white">{"✓"}</span>
              <span className="flex-1">{t}</span>
              <button type="button" aria-label={cText.toastClose} data-testid="c-toast-close" onClick={() => setToasts(toasts.filter((x) => x !== t))} className="inline-flex size-11 items-center justify-center">{"×"}</button>
            </div>
          ))}
          <PrimaryButton testId="c-finish" onClick={onExit}>
            {cText.finish}
          </PrimaryButton>
        </div>
      )}
    </section>
  )
}

function NextBar({ onNext }: { onNext: () => void }) {
  return (
    <div className="sticky bottom-2 z-10">
      <PrimaryButton testId="c-next" onClick={onNext}>
        {ckText.next}
      </PrimaryButton>
    </div>
  )
}

function JournalStep({ draft, onChange, onNext }: { draft: CheckC; onChange: (c: CheckC) => void; onNext: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const wrap = (mark: string) => {
    const el = ref.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const body = draft.body
    onChange({ ...draft, body: `${body.slice(0, a)}${mark}${body.slice(a, b)}${mark}${body.slice(b)}` })
  }
  return (
    <>
      <h3 className="text-center text-xl font-bold">{cText.journalQ}</h3>
      <input data-testid="c-journal-title" value={draft.title} placeholder={cText.untitled} aria-label={cText.untitled} onChange={(e) => onChange({ ...draft, title: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-2" />
      <textarea ref={ref} data-testid="c-journal-body" value={draft.body} placeholder={cText.bodyPlaceholder} aria-label={cText.bodyPlaceholder} onChange={(e) => onChange({ ...draft, body: e.target.value })} className="min-h-32 rounded-md border border-border bg-background p-2" />
      <div className="flex gap-2">
        <button type="button" data-testid="c-bold" onClick={() => wrap("**")} className="min-h-11 rounded-md border border-border px-3 text-sm font-bold">
          {cText.bold}
        </button>
        <button type="button" data-testid="c-italics" onClick={() => wrap("_")} className="min-h-11 rounded-md border border-border px-3 text-sm italic">
          {cText.italics}
        </button>
      </div>
      <NextBar onNext={onNext} />
    </>
  )
}

function Insights({ days, onStart }: { days: DaysC; onStart: () => void }) {
  const [tab, setTab] = useState(0)
  const insight = insightOf(days)
  if (!insight) {
    return (
      <section data-testid="c-insights-empty" className="flex flex-col items-center gap-3 text-center">
        <Tabs items={cText.insightTabsEmpty} value={tab} onChange={setTab} id="c-itab" />
        <span aria-hidden="true" className="text-6xl">{"🔭"}</span>
        <p className="text-sm text-muted-foreground">{cText.emptyInsight}</p>
        <PrimaryButton testId="c-take" onClick={onStart}>
          {cText.takeCheckin}
        </PrimaryButton>
      </section>
    )
  }
  const names = insight.areas.map((a) => cText.areas[a].toLowerCase()).join(", ")
  return (
    <section data-testid="c-insights" className="flex flex-col gap-3">
      <Tabs items={cText.insightTabs} value={tab} onChange={setTab} id="c-itab" />
      {tab !== 2 && (
        <Card testId="c-insight">
          <h3 className="font-semibold">{cText.insightTitle}</h3>
          <p data-testid="c-insight-line" className="my-2 text-sm">{cText.insightLine(names)}</p>
          <div className="relative mt-6 h-3 rounded-full bg-gradient-to-r from-amber-500 to-sky-500">
            <span data-testid="c-marker" className="absolute -top-7 max-w-[70%] truncate -translate-x-1/2 whitespace-nowrap rounded-full bg-background px-2 py-0.5 text-xs" style={{ left: `${Math.min(80, Math.max(20, markerOf(insight) * 100))}%` }}>
              {insight.percentMore === null ? cText.insightNone : cText.insightMore(insight.percentMore)}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{cText.barSetback}</span>
            <span>{cText.barVictory}</span>
          </div>
          <p data-testid="c-insight-basis" className="mt-2 text-xs text-muted-foreground">
            {cText.insightBasis(insight.withDays, insight.withVictories, insight.otherDays, insight.otherVictories)}
          </p>
        </Card>
      )}
      {tab !== 1 && (
        <>
          <h3 className="font-semibold">{cText.rankingHeading}</h3>
          <Placeholder />
        </>
      )}
    </section>
  )
}

function Analytics({ days, today }: { days: DaysC; today: string }) {
  const [ym, setYm] = useState(monthOf(today))
  const [open, setOpen] = useState<string | null>(null)
  const nextYm = monthOf(addDays(`${ym}-28`, 7))
  const d = new Date(keyToMs(`${ym}-01`))
  const sel = open ? days[open] : undefined
  return (
    <section data-testid="c-analytics" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">{cText.analyticsTitle}</h2>
        <InferredTag />
      </div>
      <div className="flex items-center justify-between">
        <button type="button" data-testid="c-prev" aria-label={cText.prevMonth} onClick={() => setYm(prevMonth(ym))} className="inline-flex size-11 items-center justify-center">{"‹"}</button>
        <p data-testid="c-month" className="font-semibold">{`${ckText.months[d.getMonth()]} ${d.getFullYear()}`}</p>
        <button type="button" data-testid="c-next-month" aria-label={cText.nextMonth} disabled={ym >= monthOf(today)} onClick={() => setYm(nextYm)} className="inline-flex size-11 items-center justify-center disabled:opacity-30">{"›"}</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {cText.weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthGrid(ym).map((key, i) => {
          if (!key) return <span key={i} />
          const c = days[key]
          const tone = !c ? "border-border text-muted-foreground" : c.outcome === "victory" ? "border-sky-500 bg-sky-600 text-white" : "border-amber-500 bg-amber-500 text-slate-900"
          return (
            <button key={key} type="button" data-testid={`c-day-${key}`} data-outcome={c?.outcome ?? "none"} aria-label={cText.dayPick(key)} onClick={() => setOpen(key)} className={`inline-flex size-11 items-center justify-center justify-self-center rounded-full border text-xs ${tone}`}>
              {c ? dayScore(c) : Number(key.slice(8))}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span><span className="text-sky-400">{"●"}</span> {cText.dayBlue}</span>
        <span><span className="text-amber-400">{"●"}</span> {cText.dayAmber}</span>
        <span><span>{"○"}</span> {cText.dayNone}</span>
      </div>
      <p className="font-semibold">{cText.monthlyData}</p>
      <Placeholder />
      {open && (
        <Card testId="c-day-card">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{cText.dayTitle(open)}</p>
            <button type="button" data-testid="c-day-close" onClick={() => setOpen(null)} className="min-h-11 px-2 text-sm underline">{cText.dayClose}</button>
          </div>
          {sel ? (
            <ul className="mt-1 text-sm">
              <li>{`${cText.dayScore}: ${dayScore(sel)}`}</li>
              <li>{`${cText.dayUrges}: ${cText.urgeScale[sel.urges]}`}</li>
              <li>{`${cText.dayEmotion}: ${cText.emotionScale[sel.emotion]}`}</li>
              {sel.positive.length > 0 && <li>{`${cText.dayPositive}: ${sel.positive.join(", ")}`}</li>}
              {sel.negative.length > 0 && <li>{`${cText.dayNegative}: ${sel.negative.join(", ")}`}</li>}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{cText.dayNoneLine}</p>
          )}
        </Card>
      )}
    </section>
  )
}
