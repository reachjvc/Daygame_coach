"use client"

import { useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { fmtMoney, dayKey, addDays, keyToMs } from "../../progress/shared/calc"
import { Card, InferredTag, NotSourced, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { useLabState } from "../../store"
import { OptionCard, QHead, StepDots } from "../shared/Bits"
import { CHECKPOINTS, caloriesPerYear, ninetyDayCalories, recommendedApproach, showsPace, spendPerMonth, spendPerYear, type Approach, type Goal, type Pace } from "../shared/logic"
import { qdText } from "../shared/text"
import { aText } from "./text"

type Screen = "goal" | "drinks" | "length" | "cost" | "plan" | "approach" | "pace" | "ready" | "planpage" | "tracker" | "log" | "settings" | "help"

const GOALS: Goal[] = ["cut", "break", "curious", "stop"]
const APPROACHES: Approach[] = ["gradual", "reset", "mindful"]
const PACES: Pace[] = ["fast", "steady", "gentle"]
const STEP: Record<Screen, number> = { goal: 0, drinks: 1, length: 1, cost: 1, plan: 2, approach: 3, pace: 3, ready: 4, planpage: 4, tracker: 4, log: 4, settings: 4, help: 4 }

/** Copy A: goal fork, patterns, 90-day plan, approach and pace, ready summary, weekly drink target. */
export function QuitdateA() {
  const [goal, setGoal] = useLabState<Goal | null>("quitdate", "a", "goal", null)
  const [drinks, setDrinks] = useLabState<number>("quitdate", "a", "drinks", 12)
  const [length, setLength] = useLabState<string | null>("quitdate", "a", "length", null)
  const [approach, setApproach] = useLabState<Approach | null>("quitdate", "a", "approach", null)
  const [pace, setPace] = useLabState<Pace | null>("quitdate", "a", "pace", null)
  const [screen, setScreen] = useState<Screen>("goal")
  const [win, setWin] = useState(0)
  const go = (s: Screen) => setScreen(s)
  const afterApproach: Screen = showsPace(goal) ? "pace" : "ready"
  const back: Record<Screen, Screen | null> = {
    goal: null,
    drinks: "goal",
    length: "drinks",
    cost: "length",
    plan: "cost",
    approach: "plan",
    pace: "approach",
    ready: showsPace(goal) ? "pace" : "approach",
    planpage: "ready",
    tracker: "planpage",
    log: "tracker",
    settings: "tracker",
    help: "tracker",
  }
  const onBack = back[screen] ? () => go(back[screen] as Screen) : null
  const named = goal === "cut" ? aText.approachCut : goal === "break" ? aText.approachBreak : goal ? aText.approachGoal[goal] : aText.approachBreak
  const rec = recommendedApproach(goal)
  const approachLabel = approach ? aText.approaches[approach].label : "-"

  let body: React.ReactNode
  if (screen === "goal") {
    body = (
      <section data-testid="a-goal" className="flex flex-col gap-2">
        <QHead title={aText.goalTitle} />
        <p className="text-sm text-muted-foreground">{aText.goalLine}</p>
        <div role="radiogroup" className="flex flex-col">
          {GOALS.map((g) => (
            <OptionCard key={g} testId={`a-goal-${g}`} label={aText.goals[g].label} sub={aText.goals[g].sub} selected={goal === g} onClick={() => setGoal(g)} />
          ))}
        </div>
        <PrimaryButton testId="a-continue" disabled={!goal} onClick={() => go("drinks")}>
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "drinks") {
    const pct = (drinks / 30) * 100
    body = (
      <section data-testid="a-drinks" className="flex flex-col gap-3">
        <QHead title={aText.drinksTitle} onBack={onBack} />
        <p className="text-sm text-muted-foreground">{aText.drinksLine}</p>
        <div className="px-1 pt-10">
          <div className="relative">
            <span data-testid="a-drinks-bubble" className="absolute -top-9 -translate-x-1/2 rounded-md bg-primary px-2.5 py-1 text-sm font-semibold text-primary-foreground" style={{ left: `calc(${pct}% + ${(0.5 - pct / 100) * 20}px)` }}>
              {drinks}
            </span>
            <input type="range" data-testid="a-drinks-slider" min={0} max={30} step={1} value={drinks} onChange={(e) => setDrinks(Number(e.target.value))} className="h-11 w-full accent-primary" />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span>{aText.drinksEnd}</span>
          </div>
        </div>
        {drinks === 12 ? (
          <p data-testid="a-drinks-reaction" className="text-sm text-muted-foreground">
            {aText.drinksReaction12}
          </p>
        ) : (
          <Placeholder />
        )}
        <PrimaryButton testId="a-continue" onClick={() => go("length")}>
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "length") {
    body = (
      <section data-testid="a-length" className="flex flex-col gap-2">
        <QHead title={aText.lengthTitle} onBack={onBack} />
        <p className="text-sm text-muted-foreground">{aText.lengthLine}</p>
        <div role="radiogroup" className="flex flex-col">
          {aText.lengths.map((l) => (
            <OptionCard
              key={l.id}
              testId={`a-length-${l.id}`}
              label={l.label}
              sub={aText.lengthSub}
              selected={length === l.id}
              onClick={() => {
                setLength(l.id)
                go("cost")
              }}
            />
          ))}
        </div>
      </section>
    )
  } else if (screen === "cost") {
    body = (
      <section data-testid="a-cost" className="flex flex-col gap-3">
        <QHead title={aText.costTitle} onBack={onBack} />
        <p className="text-sm text-muted-foreground">{aText.costLine}</p>
        <div className="grid grid-cols-2 gap-2">
          <Card testId="a-cost-cal">
            <div className="text-xl font-semibold tabular-nums">{caloriesPerYear(drinks).toLocaleString("en-US")}</div>
            <div className="text-xs text-muted-foreground">{aText.caloriesLabel}</div>
          </Card>
          <Card testId="a-cost-money">
            <div className="text-xl font-semibold tabular-nums">{fmtMoney(spendPerYear(drinks)).replace(".00", "")}</div>
            <div className="text-xs text-muted-foreground">{aText.spendLabel}</div>
          </Card>
        </div>
        <PrimaryButton testId="a-continue" onClick={() => go("plan")}>
          {aText.showMore}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "plan") {
    body = (
      <section data-testid="a-plan" className="flex flex-col gap-3">
        <QHead title={aText.planTitle} onBack={onBack} />
        <p className="text-sm text-muted-foreground">{aText.planLine}</p>
        <Card testId="a-projections">
          <h3 className="mb-2 text-sm font-semibold">{aText.projections}</h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <NotSourced />
              <div className="mt-1 text-muted-foreground">{aText.lighter}</div>
            </div>
            <div>
              <NotSourced />
              <div className="mt-1 text-muted-foreground">{aText.saved}</div>
            </div>
            <div>
              <div data-testid="a-proj-cal" className="text-base font-semibold tabular-nums">
                {ninetyDayCalories(drinks).toLocaleString("en-US")}
              </div>
              <div className="mt-1 text-muted-foreground">{aText.fewerCalories}</div>
            </div>
          </div>
        </Card>
        {aText.weeks.map((w, i) => (
          <Card key={w.title} testId={`a-week-${i}`}>
            <h3 className="mb-1 font-semibold">{w.title}</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {w.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
              {i === 0 && (
                <li className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                  {aText.cravingLength} <NotSourced />
                </li>
              )}
            </ul>
            {i === 0 && (
              <div className="mt-2">
                <div className="mb-1 text-xs text-muted-foreground">{aText.triggersStrip}</div>
                <Placeholder />
              </div>
            )}
            {i >= 2 && (
              <div data-testid={`a-checkpoints-${i}`} className="mt-2 flex flex-wrap gap-1.5">
                {CHECKPOINTS.filter((d) => (i === 2 ? d <= 30 : d > 30)).map((d) => (
                  <span key={d} className="rounded-full border border-border px-2 py-0.5 text-xs">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
        <PrimaryButton testId="a-continue" onClick={() => go("approach")}>
          {aText.buildPlan}
        </PrimaryButton>
        <p className="text-center text-xs text-muted-foreground">{aText.nextLine}</p>
      </section>
    )
  } else if (screen === "approach") {
    body = (
      <section data-testid="a-approach" className="flex flex-col gap-2">
        <QHead title={named} onBack={onBack} inferred={goal === "curious" || goal === "stop"} />
        <p className="text-sm text-muted-foreground">{aText.approachLine}</p>
        <div role="radiogroup" className="flex flex-col">
          {APPROACHES.map((a) => (
            <OptionCard
              key={a}
              testId={`a-approach-${a}`}
              label={aText.approaches[a].label}
              sub={aText.approaches[a].sub}
              selected={approach === a}
              pill={rec === a ? aText.recommended : undefined}
              onClick={() => {
                setApproach(a)
                go(afterApproach)
              }}
            />
          ))}
        </div>
        <p className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">{"★ "}{aText.starNote}</p>
      </section>
    )
  } else if (screen === "pace") {
    body = (
      <section data-testid="a-pace" className="flex flex-col gap-2">
        <QHead title={aText.paceTitle} onBack={onBack} inferred={goal !== "break"} />
        <p className="text-sm text-muted-foreground">{aText.paceLine}</p>
        <div role="radiogroup" className="flex flex-col">
          {PACES.map((p) => (
            <OptionCard
              key={p}
              testId={`a-pace-${p}`}
              label={`${aText.paces[p].label}, ${aText.paces[p].length}`}
              sub={aText.paces[p].sub}
              selected={pace === p}
              pill={p === "steady" ? aText.suggested : undefined}
              onClick={() => {
                setPace(p)
                go("ready")
              }}
            />
          ))}
        </div>
      </section>
    )
  } else if (screen === "ready") {
    body = (
      <section data-testid="a-ready" className="flex flex-col gap-3">
        <QHead title={aText.readyTitle} onBack={onBack} />
        <p className="text-sm text-muted-foreground">{aText.readyLine}</p>
        <Card testId="a-ready-rows">
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{aText.approachRow}</dt>
              <dd data-testid="a-ready-approach" className="font-medium">
                {approachLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{aText.triggerRow}</dt>
              <dd>
                <InferredTag />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{aText.scoreRow}</dt>
              <dd>
                <NotSourced />
              </dd>
            </div>
          </dl>
        </Card>
        <Card testId="a-technique">
          <h3 className="text-sm text-muted-foreground">{aText.technique}</h3>
          <div className="font-semibold">{aText.techniqueName}</div>
          <p className="text-sm">{aText.techniqueText}</p>
        </Card>
        <Card testId="a-day1">
          <h3 className="mb-1 text-sm font-semibold">{aText.day1}</h3>
          <Placeholder />
        </Card>
        <Card testId="a-outcomes" className="opacity-70">
          <h3 className="mb-1 text-sm font-semibold">{aText.outcomes}</h3>
          <NotSourced />
        </Card>
        <PrimaryButton testId="a-continue" onClick={() => go("planpage")}>
          {qdText.continue}
        </PrimaryButton>
        <p className="text-center text-xs text-muted-foreground">{aText.readyFoot}</p>
      </section>
    )
  } else if (screen === "planpage") {
    body = (
      <section data-testid="a-planpage" className="flex flex-col gap-3">
        <QHead title={goal === "cut" ? aText.planPageCut : aText.planPageReset} onBack={onBack} />
        <p className="text-xs text-primary">{aText.planPageCaption}</p>
        <p className="text-sm text-muted-foreground">{aText.planPageLine}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Card>
            <NotSourced />
            <div className="mt-1 text-muted-foreground">{aText.lighter}</div>
          </Card>
          <Card>
            <NotSourced />
            <div className="mt-1 text-muted-foreground">{aText.saved}</div>
          </Card>
          <Card>
            <div className="text-muted-foreground">{aText.tileBetter}</div>
          </Card>
        </div>
        <Card testId="a-compare">
          <div className="text-sm text-muted-foreground">{aText.compareSpend}</div>
          <div data-testid="a-compare-spend" className="text-lg font-semibold tabular-nums">
            {"$"}
            {spendPerMonth(drinks)} {aText.perMonth}
          </div>
        </Card>
        <h3 className="font-semibold">{aText.plansLabel}</h3>
        <NotCopiedInline />
        <PrimaryButton testId="a-continue" onClick={() => go("tracker")}>
          {aText.toTracker}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "tracker") {
    const target = win === 0 ? drinks : drinks * 4
    const today = Date.now()
    const span = win === 0 ? 7 : 28
    const startKey = addDays(dayKey(today), -(span - 1))
    const label = (k: string) => `${new Date(keyToMs(k)).getDate()} ${sharedText.months[new Date(keyToMs(k)).getMonth()].slice(0, 3)}`
    body = (
      <section data-testid="a-tracker" className="flex flex-col gap-3">
        <QHead
          title={aText.trackerTitle}
          onBack={onBack}
          right={
            <>
              <button type="button" data-testid="a-help" aria-label={aText.help} onClick={() => go("help")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
                {"?"}
              </button>
              <button type="button" data-testid="a-settings" aria-label={aText.settings} onClick={() => go("settings")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
                {"⚙"}
              </button>
            </>
          }
        />
        <Card testId="a-target-card">
          <div className="flex items-center justify-between gap-2">
            <div data-testid="a-target" className="text-xl font-semibold tabular-nums">
              {0} {aText.drinksLabel} / {aText.target} {target} <InferredTag />
            </div>
          </div>
          <div className="my-2">
            <Tabs id="a-window" items={[aText.weekly, aText.monthly]} value={win} onChange={setWin} />
          </div>
          <svg viewBox="0 0 200 80" className="h-24 w-full" data-testid="a-chart" aria-hidden="true">
            <path d="M0 10 C 60 14, 90 58, 200 70 L200 80 L0 80 Z" className="fill-primary/30" />
            <path d="M0 10 C 60 14, 90 58, 200 70" className="fill-none stroke-primary" strokeWidth={2} />
          </svg>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span data-testid="a-axis-start">{label(startKey)}</span>
            <span className="rounded border border-border px-1.5">{aText.dayBox}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" data-testid="a-clock" aria-label={aText.clock} onClick={() => go("log")} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card">
              {"◷"}
            </button>
            <button type="button" data-testid="a-log" onClick={() => go("log")} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground">
              {aText.logDrink}
            </button>
          </div>
        </Card>
        <Card testId="a-mystats">
          <h3 className="mb-1 font-semibold">{aText.myStats}</h3>
          <div className="text-sm">
            {aText.moneySaved} <span className="font-semibold tabular-nums">{"$0"}</span>
          </div>
          <div className="text-xs text-muted-foreground">{"$0 "}{aText.sinceYesterday}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
            {aText.sugarCalories} <NotSourced />
          </div>
        </Card>
      </section>
    )
  } else if (screen === "log") {
    body = <PlaceholderScreen title={aText.logTitle} onBack={onBack} />
  } else if (screen === "settings") {
    body = <PlaceholderScreen title={aText.settingsTitle} onBack={onBack} />
  } else {
    body = <PlaceholderScreen title={aText.helpTitle} onBack={onBack} />
  }

  return (
    <div data-testid="quitdate-a" data-screen={screen}>
      {STEP[screen] < 4 && <StepDots count={5} index={STEP[screen]} testId="a-steps" />}
      {body}
    </div>
  )
}

function NotCopiedInline() {
  return (
    <div data-testid="not-copied-tile" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
      {qdText.notCopiedPayment}
    </div>
  )
}

