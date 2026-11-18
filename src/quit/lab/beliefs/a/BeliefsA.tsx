"use client"

import { useEffect, useState } from "react"
import { InferredTag, NotSourced, Placeholder } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { useLabState } from "../../store"
import { NotCopied, PickCard, toggled } from "../shared/Bits"
import { bsText } from "../shared/text"
import { AREAS, AREAS_UNSEEN, DIMS, FEARS, FEARS_SEEN, HEADER_STEP, SCENARIOS, TRIGGERS, TRIGGERS_UNSEEN, dimensions, radarPoint, scenarioPool, standout, totalScore, type Dim } from "./logic"
import { aText } from "./text"

type Screen = "triggers" | "scenarios" | "none" | "explainer" | "areas" | "fears" | "result" | "teaser" | "paywall"

const BACK: Record<Screen, Screen | null> = { triggers: null, scenarios: "triggers", none: "scenarios", explainer: "scenarios", areas: "explainer", fears: "areas", result: "fears", teaser: "result", paywall: "teaser" }

/** Copy A: triggers, scenarios, a kind reply to "none", an explainer, areas, fears, a score with a radar, a plan teaser. */
export function BeliefsA() {
  const [screen, setScreen] = useLabState<Screen>("beliefs", "a", "screen", "triggers")
  const [triggers, setTriggers] = useLabState<string[]>("beliefs", "a", "triggers", [])
  const [scenarios, setScenarios] = useLabState<string[]>("beliefs", "a", "scenarios", [])
  const [areas, setAreas] = useLabState<string[]>("beliefs", "a", "areas", [])
  const [fears, setFears] = useLabState<string[]>("beliefs", "a", "fears", [])
  const answers = { triggers, scenarios, areas, fears }
  const trig = triggers[0] ? aText.triggers[triggers[0] as keyof typeof aText.triggers].title.toLowerCase() : null
  const back = BACK[screen]

  return (
    <div data-testid="beliefs-a" data-screen={screen} className="flex flex-col gap-4 pb-24">
      <Header step={HEADER_STEP[screen]} />
      {back && (
        <button type="button" data-testid="screen-back" aria-label={bsText.back} onClick={() => setScreen(back)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">
          {"‹"}
        </button>
      )}
      {screen === "triggers" && (
        <Pick testId="screen-triggers" title={aText.triggersTitle} line={aText.triggersLine}>
          {TRIGGERS.map((id) => (
            <PickCard key={id} testId={`a-trigger-${id}`} title={aText.triggers[id].title} line={aText.triggers[id].line} checked={triggers.includes(id)} onToggle={() => setTriggers(toggled(triggers, id))} />
          ))}
          {Array.from({ length: TRIGGERS_UNSEEN }, (_, i) => (
            <Placeholder key={i} />
          ))}
          <Footer disabled={triggers.length === 0} onNext={() => setScreen("scenarios")} />
        </Pick>
      )}
      {screen === "scenarios" && (
        <Pick testId="screen-scenarios" title={aText.scenariosTitle} line={trig ? aText.scenariosIntro(trig) : aText.scenariosNoTrigger}>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <InferredTag />
            {aText.poolInferred}
          </p>
          {scenarioPool(triggers).map((id) => (
            <PickCard key={id} testId={`a-scenario-${id}`} title={aText.scenarios[id as (typeof SCENARIOS)[number]]} checked={scenarios.includes(id)} onToggle={() => setScenarios(toggled(scenarios, id))} />
          ))}
          <Footer disabled={scenarios.length === 0} onNext={() => setScreen("explainer")} none={() => setScreen("none")} />
        </Pick>
      )}
      {screen === "none" && (
        <section data-testid="screen-none" className="flex flex-col gap-3 pt-8">
          <h2 className="text-xl font-semibold">{aText.noneTitle}</h2>
          <p className="font-semibold text-primary">{aText.noneBold}</p>
          <p className="text-sm text-muted-foreground">{aText.noneBody1}</p>
          <p className="text-sm text-muted-foreground">{aText.noneBody2}</p>
          <Pill testId="a-none-cta" onClick={() => setScreen("explainer")}>
            {aText.noneCta}
          </Pill>
        </section>
      )}
      {screen === "explainer" && (
        <section data-testid="screen-explainer" className="flex flex-col gap-3">
          <div aria-hidden="true" className="flex size-16 items-center justify-center self-center rounded-full bg-yellow-200/20 text-3xl">
            {"🧠"}
          </div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {aText.explainerTitle}
            <InferredTag />
          </h2>
          <p className="text-sm text-muted-foreground">{aText.explainerLine}</p>
          <p className="text-sm">{aText.explainerBody1}</p>
          <p className="text-sm">
            {aText.explainerBody2} <strong className="text-red-400">{aText.explainerRed}</strong>.
          </p>
          <div data-testid="a-explainer-box" className="rounded-md border border-orange-400/40 bg-orange-400/10 p-3 text-sm text-orange-300">
            {trig ? aText.explainerBox(trig) : aText.explainerBoxNone}
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {aText.explainerDays} <NotSourced />
          </p>
          <Pill testId="a-explainer-cta" onClick={() => setScreen("areas")}>
            {aText.explainerCta}
          </Pill>
        </section>
      )}
      {screen === "areas" && (
        <Pick testId="screen-areas" title={aText.areasTitle} line={aText.areasLine}>
          {AREAS.map((id) => (
            <PickCard key={id} testId={`a-area-${id}`} title={aText.areas[id].title} line={aText.areas[id].line} checked={areas.includes(id)} onToggle={() => setAreas(toggled(areas, id))} />
          ))}
          {Array.from({ length: AREAS_UNSEEN }, (_, i) => (
            <Placeholder key={i} />
          ))}
          <Footer disabled={areas.length === 0} onNext={() => setScreen("fears")} />
        </Pick>
      )}
      {screen === "fears" && (
        <Pick testId="screen-fears" title={aText.fearsTitle} line={aText.fearsLine}>
          {FEARS.map((id, i) => (
            <PickCard
              key={id}
              testId={`a-fear-${id}`}
              title={aText.fears[id].title}
              line={i < FEARS_SEEN ? aText.fears[id].line : undefined}
              unseenLine={i < FEARS_SEEN ? undefined : sharedText.notSeen}
              checked={fears.includes(id)}
              onToggle={() => setFears(toggled(fears, id))}
            />
          ))}
          <Footer disabled={fears.length === 0} onNext={() => setScreen("result")} none={() => setScreen("result")} />
        </Pick>
      )}
      {screen === "result" && <Result answers={answers} onNext={() => setScreen("teaser")} />}
      {screen === "teaser" && (
        <section data-testid="screen-teaser" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{aText.teaserTitle}</h2>
          <div className="grid grid-cols-3 gap-2 rounded-md border border-primary/50 p-2">
            {aText.teaserBox.map((l) => (
              <div key={l} className="flex flex-col items-center gap-1 text-center text-xs">
                <NotSourced />
                {l}
              </div>
            ))}
          </div>
          <div data-testid="a-matched" className="flex flex-col gap-1 rounded-md border border-border bg-card p-3 text-sm">
            <span className="font-semibold">{aText.matched}</span>
            {triggers.length === 0 ? <span className="text-muted-foreground">{aText.matchedNone}</span> : triggers.map((t) => <span key={t}>{aText.triggers[t as keyof typeof aText.triggers].title}</span>)}
          </div>
          {aText.weekRows.map((w) => (
            <div key={w.title} data-testid="a-week" className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{w.title}</span>
              <Placeholder />
            </div>
          ))}
          <p data-testid="a-next-approach" className="text-center text-xs text-muted-foreground">{aText.nextApproach}</p>
          <Pill testId="a-teaser-cta" onClick={() => setScreen("paywall")}>
            {aText.teaserCta}
          </Pill>
        </section>
      )}
      {screen === "paywall" && (
        <section data-testid="screen-paywall" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{aText.paywallTitle}</h2>
          <NotCopied label={bsText.notCopiedPayment} />
        </section>
      )}
    </div>
  )
}

function Header({ step }: { step: number }) {
  return (
    <ol data-testid="a-header" data-step={step} className="flex items-center justify-between gap-1">
      {aText.headerSteps.map((s, i) => (
        <li key={s} className={`flex min-w-0 flex-1 flex-col items-center gap-1 text-center text-[10px] leading-tight ${i === step ? "font-bold text-primary" : "text-muted-foreground"}`}>
          <span aria-hidden="true" className={`size-2.5 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`} />
          {s}
        </li>
      ))}
    </ol>
  )
}

function Pick({ testId, title, line, children }: { testId: string; title: string; line: string; children: React.ReactNode }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mb-1 text-sm text-muted-foreground">{line}</p>
      {children}
    </section>
  )
}

function Pill({ children, onClick, disabled, testId }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; testId: string }) {
  return (
    <button type="button" data-testid={testId} disabled={disabled} onClick={onClick} className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-4 text-center text-base font-semibold text-primary-foreground disabled:opacity-40">
      {children}
    </button>
  )
}

function Footer({ disabled, onNext, none }: { disabled: boolean; onNext: () => void; none?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Pill testId="a-continue" disabled={disabled} onClick={onNext}>
        {aText.cont}
      </Pill>
      {none && (
        <button type="button" data-testid="a-none" onClick={none} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
          {aText.noneApply}
        </button>
      )}
    </div>
  )
}

const COUNT_MS = 1500

function Result({ answers, onNext }: { answers: Parameters<typeof dimensions>[0]; onNext: () => void }) {
  const dims = dimensions(answers)
  const total = totalScore(dims)
  const best = standout(dims)
  const [shown, setShown] = useState(0)
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / COUNT_MS)
      setShown(Math.round(total * k))
      if (k < 1) raf = requestAnimationFrame(tick)
      else setPhase(1)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [total])
  useEffect(() => {
    if (phase < 1 || phase >= 4) return
    const id = setTimeout(() => setPhase(phase + 1), 450)
    return () => clearTimeout(id)
  }, [phase])
  const fade = (n: number) => `transition-opacity duration-500 ${phase >= n ? "opacity-100" : "opacity-0"}`
  return (
    <section data-testid="screen-result" data-phase={phase} className="flex flex-col items-center gap-3 text-center">
      <p className="text-xs tracking-widest text-muted-foreground">{aText.resultLabel}</p>
      <p className="flex items-baseline gap-2">
        <span data-testid="a-score" data-value={shown} data-final={total} className="text-7xl font-bold text-primary">
          {shown}
        </span>
        <span className="text-xl text-muted-foreground">{aText.outOf}</span>
      </p>
      <p className="text-sm text-muted-foreground">{aText.startingPoint}</p>
      <p className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
        {aText.scoreBasis} <NotSourced /> <InferredTag />
      </p>
      <p className="text-xs text-muted-foreground">{aText.scoreInferred}</p>
      <div data-testid="a-strength" className={`flex w-full flex-col gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-left ${fade(2)}`}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{dims[best]}</span>
          <span className="font-semibold">{aText.standoutTitle(aText.dims[best])}</span>
        </div>
        <p className="text-sm">{aText.standoutBody}</p>
      </div>
      <p className={`text-xs tracking-widest text-muted-foreground ${fade(3)}`}>{aText.dimsLabel}</p>
      <Radar dims={dims} drawn={phase >= 3} />
      <div className={`flex flex-col gap-2 text-left ${fade(4)}`}>
        <p className="text-xs tracking-widest text-muted-foreground">{aText.opportunityLabel}</p>
        <p className="text-sm">
          {aText.opportunity1} <strong className="text-primary">{aText.opportunityBlue}</strong>
        </p>
      </div>
      {phase >= 4 && (
        <button type="button" data-testid="a-result-cta" onClick={onNext} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-4 text-center text-base font-semibold text-primary-foreground">
          {aText.resultCta}
        </button>
      )}
    </section>
  )
}

function Radar({ dims, drawn }: { dims: Record<Dim, number>; drawn: boolean }) {
  const cx = 150
  const cy = 130
  const r = 80
  const ring = (v: number) => DIMS.map((_, i) => radarPoint(i, v, cx, cy, r).join(",")).join(" ")
  const poly = DIMS.map((k, i) => radarPoint(i, dims[k], cx, cy, r).join(",")).join(" ")
  return (
    <svg data-testid="a-radar" data-drawn={drawn ? "1" : "0"} viewBox="0 0 300 260" className="w-full max-w-sm" role="img" aria-label={aText.dimsLabel}>
      <polygon points={ring(100)} fill="none" className="stroke-border" />
      <polygon points={ring(50)} fill="none" className="stroke-border" strokeDasharray="3 3" />
      <polygon
        points={poly}
        className="fill-primary/25 stroke-primary"
        strokeWidth={2}
        style={{ transformOrigin: `${cx}px ${cy}px`, transform: drawn ? "scale(1)" : "scale(0)", transition: "transform 1s ease" }}
      />
      {DIMS.map((k, i) => {
        const [x, y] = radarPoint(i, dims[k], cx, cy, r)
        const [lx, ly] = radarPoint(i, 122, cx, cy, r)
        return (
          <g key={k} style={{ opacity: drawn ? 1 : 0, transition: "opacity 1s ease" }}>
            <circle cx={x} cy={y} r={4} className="fill-background stroke-primary" strokeWidth={2} />
            <text x={lx} y={ly} textAnchor="middle" className="fill-foreground text-[10px]">
              {aText.dims[k]}
            </text>
            <text x={lx} y={ly + 12} textAnchor="middle" data-testid={`a-dim-${k}`} className="fill-primary text-[11px] font-bold">
              {dims[k]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
