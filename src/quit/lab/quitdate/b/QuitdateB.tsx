"use client"

import { useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { BottomNav, Card, InferredTag, NotSourced, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { useLabState } from "../../store"
import { NotCopied, CheckRow, QHead } from "../shared/Bits"
import { changeChip, curvePoints, dayShade, monthGrid, sum, type BGoal, type Shade } from "../shared/logic"
import { qdText } from "../shared/text"
import { bText } from "./text"

type Screen = "goal" | "motives" | "top" | "intro" | "day" | "curve" | "onway" | "profile" | "app"
const GOALS: BGoal[] = ["less", "zero", "unsure"]
const SHADE: Record<Shade, string> = { green: "bg-green-700/70", amber: "bg-amber-600/70", red: "bg-red-700/70" }
const OFFSETS = [0, 1, -1, 3, 0, 2, -1]

/** Copy B: goal fork, motivations, typical week day by day, starting curve, weekly plan table, challenge, calendar. */
export function QuitdateB() {
  const [, setGoal] = useLabState<BGoal | null>("quitdate", "b", "goal", null)
  const [motives, setMotives] = useLabState<number[]>("quitdate", "b", "motives", [])
  const [top, setTop] = useLabState<number | null>("quitdate", "b", "top", null)
  const [typical, setTypical] = useLabState<(number | null)[]>("quitdate", "b", "typical", Array(7).fill(null))
  const [plan, setPlan] = useLabState<(number | null)[]>("quitdate", "b", "plan", Array(7).fill(null))
  const [screen, setScreen] = useState<Screen>("goal")
  const [day, setDay] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [jump, setJump] = useState(false)
  const [menu, setMenu] = useState(false)

  const typicalNums = typical.map((n) => n ?? 0)
  const base = typicalNums
  const total = sum(typicalNums)

  const toTop = () => {
    setLoaded(false)
    setScreen("top")
    setTimeout(() => setLoaded(true), 600)
  }
  const toggleMotive = (i: number) => setMotives(motives.includes(i) ? motives.filter((m) => m !== i) : [...motives, i])
  const setPlanDay = (i: number, v: number | null) => setPlan(plan.map((p, k) => (k === i ? v : p)))

  let body: React.ReactNode
  if (screen === "goal") {
    body = (
      <section data-testid="b-goal" className="flex flex-col gap-3">
        <QHead title={bText.goalTitle} />
        <p className="text-sm text-muted-foreground">{bText.goalLine}</p>
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            data-testid={`b-goal-${g}`}
            onClick={() => {
              setGoal(g)
              setScreen("motives")
            }}
            className="flex min-h-14 w-full items-center justify-between rounded-lg bg-primary px-4 text-left font-medium text-primary-foreground"
          >
            <span>{bText.goals[g]}</span>
            <span aria-hidden="true">{"›"}</span>
          </button>
        ))}
      </section>
    )
  } else if (screen === "motives") {
    body = (
      <section data-testid="b-motives" className="flex flex-col gap-3">
        <QHead title={bText.motivesTitle} onBack={() => setScreen("goal")} />
        <p className="text-sm text-muted-foreground">{bText.motivesLine}</p>
        <div className="grid grid-cols-2 gap-2">
          {bText.motives.map((m, i) => (
            <CheckRow key={m} testId={`b-motive-${i}`} label={m} on={motives.includes(i)} onClick={() => toggleMotive(i)} />
          ))}
        </div>
        <PrimaryButton testId="b-continue" onClick={toTop}>
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "top") {
    body = (
      <section data-testid="b-top" className="flex flex-col gap-3">
        <QHead title={bText.topTitle} onBack={() => setScreen("motives")} inferred />
        <p className="text-sm text-muted-foreground">{bText.topLine}</p>
        {!loaded ? (
          <div data-testid="b-top-loading" role="status" aria-label={bText.loading} className="mx-auto size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        ) : motives.length === 0 ? (
          <Placeholder />
        ) : (
          <div role="radiogroup" className="flex flex-col gap-2">
            {motives.map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={top === i}
                data-testid={`b-top-${i}`}
                onClick={() => setTop(i)}
                className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${top === i ? "border-primary bg-primary/15" : "border-border bg-card"}`}
              >
                {bText.motives[i]}
              </button>
            ))}
          </div>
        )}
        <PrimaryButton testId="b-continue" onClick={() => setScreen("intro")}>
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "intro") {
    body = (
      <section data-testid="b-intro" className="flex flex-col gap-3">
        <QHead title={bText.weekTitle} onBack={() => setScreen("top")} />
        <p className="text-sm text-muted-foreground">{bText.weekText}</p>
        <PrimaryButton
          testId="b-continue"
          onClick={() => {
            setDay(0)
            setScreen("day")
          }}
        >
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "day") {
    const v = typical[day]
    const set = (raw: string) => setTypical(typical.map((t, k) => (k === day ? (raw === "" ? null : Math.max(0, Math.floor(Number(raw)))) : t)))
    body = (
      <section data-testid="b-day" data-day={day} className="flex flex-col items-center gap-3">
        <div className="w-full">
          <QHead title={bText.dayTitle(qdText.weekdays[day])} onBack={() => (day === 0 ? setScreen("intro") : setDay(day - 1))} />
        </div>
        <p className="text-sm text-muted-foreground">{bText.dayLine}</p>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          data-testid="b-day-input"
          aria-label={bText.dayInput}
          value={v === null || Number.isNaN(v) ? "" : v}
          onChange={(e) => set(e.target.value)}
          className="size-20 rounded-lg border-2 border-primary bg-background text-center text-2xl"
        />
        <div className="flex w-full items-center justify-between">
          <button type="button" data-testid="b-day-prev" aria-label={bText.prev} disabled={day === 0} onClick={() => setDay(day - 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:bg-border disabled:text-muted-foreground">
            {"‹"}
          </button>
          <div className="flex gap-2" aria-hidden="true">
            {qdText.weekLetters.map((l, i) => (
              <span key={i} className={i <= day ? "font-semibold text-primary" : "text-muted-foreground"}>
                {l}
              </span>
            ))}
          </div>
          <button
            type="button"
            data-testid="b-day-next"
            aria-label={bText.next}
            disabled={v === null}
            onClick={() => (day === 6 ? setScreen("curve") : setDay(day + 1))}
            className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:bg-border disabled:text-muted-foreground"
          >
            {"›"}
          </button>
        </div>
      </section>
    )
  } else if (screen === "curve") {
    const pts = curvePoints()
    const W = 300
    const H = 140
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(p.x * W).toFixed(1)} ${(p.y * H).toFixed(1)}`).join(" ")
    body = (
      <section data-testid="b-curve" className="flex flex-col gap-3">
        <QHead title={bText.curveIntro} onBack={() => setScreen("day")} />
        <div className="flex items-center gap-2">
          <NotSourced />
        </div>
        <p className="text-sm text-muted-foreground">{bText.curveLine}</p>
        <div>
          <div data-testid="b-curve-start" className="mb-1 inline-block rounded-md border border-border bg-card px-2 py-1 text-xs">
            {bText.curveStart}: {total} {bText.curveUnit}
          </div>
          <svg viewBox={`-12 -12 ${W + 24} ${H + 24}`} className="h-40 w-full" aria-hidden="true">
            <path d={`${line} L${W} ${H} L0 ${H} Z`} className="fill-primary/25" />
            <path d={line} className="fill-none stroke-primary" strokeWidth={2} />
            <circle cx={0} cy={pts[0].y * H} r={5} className="fill-primary" />
          </svg>
        </div>
        <PrimaryButton testId="b-continue" onClick={() => setScreen("onway")}>
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "onway") {
    body = (
      <section data-testid="b-onway" className="flex flex-col items-center gap-3 text-center">
        <span aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-full bg-border text-2xl">
          {"✓"}
        </span>
        <h2 className="text-xl font-semibold">{bText.onWayTitle}</h2>
        <p className="text-sm text-muted-foreground">{bText.onWayText}</p>
        <div className="w-full rounded-lg border border-border bg-card p-3">
          <div className="mb-1 text-xs text-muted-foreground">{bText.testimonial}</div>
          <Placeholder />
        </div>
        <PrimaryButton testId="b-continue" onClick={() => setScreen("profile")}>
          {qdText.continue}
        </PrimaryButton>
      </section>
    )
  } else if (screen === "profile") {
    body = <NotCopied title={bText.profileTitle} why="account" onBack={() => setScreen("onway")} onNext={() => setScreen("app")} nextLabel={qdText.continue} />
  } else {
    const nav = <BottomNav id="b-nav" items={bText.tabs} value={tab} onChange={setTab} />
    let page: React.ReactNode
    if (tab === 0) {
      page = (
        <section data-testid="b-plan" className="flex flex-col gap-3">
          <QHead title={bText.planTitle} />
          <p className="text-xs text-muted-foreground">{bText.planNote}</p>
          <div className="grid grid-cols-[3rem_2.5rem_1fr_2.75rem] items-center gap-x-1 gap-y-2 text-sm">
            <span />
            <span className="text-xs text-muted-foreground">{bText.planHead.suggested}</span>
            <span className="text-center text-xs text-muted-foreground">{bText.planHead.plan}</span>
            <span className="text-center text-xs text-muted-foreground">{bText.planHead.change}</span>
            {qdText.weekdaysShort.map((d, i) => {
              const chip = changeChip(plan[i], base[i])
              const val = plan[i]
              return (
                <div key={d} data-testid={`b-row-${i}`} className="contents">
                  <span>{d}</span>
                  <span data-testid={`b-suggested-${i}`} className="mx-auto inline-flex size-9 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                    {"—"}
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <button type="button" data-testid={`b-minus-${i}`} aria-label={bText.less} disabled={val === null || val <= 0} onClick={() => setPlanDay(i, (val ?? 0) - 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
                      {"−"}
                    </button>
                    <span data-testid={`b-plan-${i}`} className="inline-flex size-11 items-center justify-center rounded-md bg-card tabular-nums">
                      {val === null ? "-" : val}
                    </span>
                    <button type="button" data-testid={`b-plus-${i}`} aria-label={bText.more} onClick={() => setPlanDay(i, val === null ? base[i] : val + 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {"+"}
                    </button>
                  </div>
                  <span data-testid={`b-chip-${i}`} data-kind={chip.kind} className={`mx-auto inline-flex size-9 items-center justify-center rounded-full text-xs ${chip.kind === "lower" ? "bg-green-700 text-white" : chip.kind === "higher" ? "bg-orange-600 text-white" : ""}`}>
                    {chip.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )
    } else if (tab === 1) {
      const nowDate = new Date()
      const m = new Date(nowDate.getFullYear(), nowDate.getMonth() + monthOffset, 1)
      const cells = monthGrid(m.getFullYear(), m.getMonth())
      const sg = base
      const planOf = (i: number) => plan[i] ?? sg[i]
      const isPast = (d: number) => new Date(m.getFullYear(), m.getMonth(), d).getTime() <= Date.now()
      page = (
        <section data-testid="b-progress" className="flex flex-col gap-3">
          <QHead title={bText.progressTitle} />
          <div className="flex items-center justify-between">
            <button type="button" data-testid="b-month-prev" aria-label={bText.monthPrev} onClick={() => setMonthOffset(monthOffset - 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {"‹"}
            </button>
            <button type="button" data-testid="b-month" aria-label={bText.monthButton} onClick={() => setJump(!jump)} className="inline-flex min-h-11 items-center rounded-full border border-border px-4">
              {sharedText.months[m.getMonth()]} {m.getFullYear()}
            </button>
            <button type="button" data-testid="b-month-next" aria-label={bText.monthNext} onClick={() => setMonthOffset(monthOffset + 1)} className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {"›"}
            </button>
          </div>
          {jump && <Placeholder />}
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {qdText.weekLetters.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div data-testid="b-grid" className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />
              const wd = (i % 7 + 7) % 7
              const drinks = Math.max(0, sg[wd] + OFFSETS[d % 7])
              const shaded = isPast(d)
              return (
                <div key={d} data-testid={`b-cell-${d}`} data-shade={shaded ? dayShade(drinks, planOf(wd)) : "none"} className={`relative flex aspect-square flex-col items-center justify-center rounded-md border border-border ${shaded ? SHADE[dayShade(drinks, planOf(wd))] : ""}`}>
                  <span className="absolute left-1 top-0.5 text-[10px] text-muted-foreground">{d}</span>
                  <span className="text-sm font-semibold tabular-nums">{shaded ? drinks : ""}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">{bText.exampleNote}</p>
        </section>
      )
    } else if (tab === 3) {
      page = (
        <section data-testid="b-challenge" className="flex flex-col gap-3">
          <QHead title={bText.challengeTitle} />
          <Card>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm text-green-500">{bText.challengeDone}</div>
                <div className="font-semibold">{bText.challengeName}</div>
                <div className="text-xs text-muted-foreground">
                  {bText.completedOn} {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </div>
              </div>
              <span aria-hidden="true" className="inline-flex size-11 items-center justify-center rounded-lg bg-green-700 text-white">
                {"✓"}
              </span>
            </div>
          </Card>
          <div className="flex items-center justify-end gap-2">
            {menu && <InferredTag />}
            <button type="button" data-testid="b-menu" aria-label={bText.menu} onClick={() => setMenu(!menu)} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
              {"⋯"}
            </button>
          </div>
          {menu && <Placeholder />}
          <Card testId="b-gauge">
            <svg viewBox="0 0 120 64" className="mx-auto h-24 w-48" aria-hidden="true">
              <path d="M10 60 A50 50 0 0 1 110 60" fill="none" strokeWidth={10} strokeDasharray="4 4" className="stroke-border" />
            </svg>
            <div className="-mt-4 flex flex-col items-center gap-1 text-center">
              <NotSourced />
              <span className="text-sm text-muted-foreground">{bText.onTarget}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {bText.legend.map((l, i) => (
                <li key={l} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`size-3 rounded-full ${i === 0 ? "bg-green-600" : i === 1 ? "bg-amber-500" : "bg-red-600"}`} />
                  <span className="flex-1">{l}</span>
                  <NotSourced />
                </li>
              ))}
            </ul>
            <div className="mt-3 text-sm">{bText.daysCompleted}</div>
            <div className="mt-1 flex gap-2" aria-hidden="true">
              {qdText.weekLetters.map((l, i) => (
                <span key={i} className={i < 5 ? "font-semibold" : "text-muted-foreground/40"}>
                  {l}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )
    } else {
      page = <PlaceholderScreen title={bText.tabs[tab]} onBack={null} />
    }
    body = (
      <div className="flex flex-col">
        {page}
        {nav}
      </div>
    )
  }
  return (
    <div data-testid="quitdate-b" data-screen={screen}>
      {body}
    </div>
  )
}

