"use client"

import { useEffect, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { DAY, dayKey, fmtMoney, keyToMs, monthly } from "../../progress/shared/calc"
import { Card, ExampleBar, Head, InferredTag, NotSourced, NumField, Placeholder, PlaceholderScreen, ShareBtn, Tabs } from "../../progress/shared/Bits"
import { OtherToolScreen } from "../../timeline/shared/Bits"
import { labStore, useLabState } from "../../store"
import { breakStreak, goalCountdown, longSpan, longestMs, nextTimeGoal, reachedTimeGoals, reductionTarget, seedStart, sortStreaks, TIME_GOALS, type Streak, type StreakSort } from "../shared/logic"
import { dText } from "./text"

interface Setup {
  startMs: number
  seeded: number
  podsPerDay: number
  podPrice: number
}
type Screen = "home" | "goals" | "streaks" | "stats" | "tracker" | "quitdate" | "reduction" | "money" | "resources" | "buddy" | "detail" | "settings"
const SORTS: StreakSort[] = ["recent", "oldest", "best"]
const BUDDIES = [1, 2, 5]

const longDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

/** Copy D: vape-free counter, timed goal ladder with live countdown, streaks with past runs. */
export function QuitdateD() {
  const [setup, setSetup] = useLabState<Setup | null>("quitdate", "d", "setup", null)
  const [mounted, setMounted] = useState(false)
  const [own, setOwn] = useState<Setup | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!mounted) return null
  const clear = () => {
    labStore().set("quitdate", "d", "setup", undefined)
    labStore().set("quitdate", "d", "past", undefined)
    labStore().set("quitdate", "d", "quitMs", undefined)
    labStore().set("quitdate", "d", "why", undefined)
    labStore().set("quitdate", "d", "startMs", undefined)
    setSetup(null)
    setOwn(null)
  }
  if (setup) {
    return (
      <div data-testid="quitdate-d">
        {setup.seeded === 1 && <ExampleBar onClear={clear} />}
        <Main setup={setup} now={now} onReset={clear} />
      </div>
    )
  }
  if (own) {
    return (
      <section data-testid="setup-own" className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex-1 text-lg font-semibold">{dText.startTitle}</h2>
          <InferredTag />
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{dText.startLabel}</span>
          <input type="date" data-testid="setup-start" value={dayKey(own.startMs)} max={dayKey(now)} onChange={(e) => e.target.value && setOwn({ ...own, startMs: keyToMs(e.target.value) })} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
        <NumField label={dText.podsLabel} value={own.podsPerDay} step={0.5} testId="setup-pods" onChange={(n) => setOwn({ ...own, podsPerDay: n })} />
        <NumField label={dText.priceLabel} value={own.podPrice} step={0.5} testId="setup-price" onChange={(n) => setOwn({ ...own, podPrice: n })} />
        <PrimaryButton testId="setup-save" onClick={() => setSetup({ ...own, podsPerDay: Number.isFinite(own.podsPerDay) ? own.podsPerDay : 0, podPrice: Number.isFinite(own.podPrice) ? own.podPrice : 0 })}>
          {dText.save}
        </PrimaryButton>
      </section>
    )
  }
  return (
    <section data-testid="setup-choice" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">{dText.startTitle}</h2>
        <InferredTag />
      </div>
      <p className="text-sm text-muted-foreground">{dText.startLine}</p>
      <PrimaryButton
        testId="setup-seed"
        onClick={() => {
          const s = seedStart(Date.now())
          labStore().set("quitdate", "d", "past", [
            { startMs: s - 200 * DAY, lengthMs: 51 * DAY + 23 * 3_600_000 + 19 * 60_000 + 27_000 },
            { startMs: s - 100 * DAY, lengthMs: 15 * 60_000 + 30_000 },
          ])
          setSetup({ startMs: s, seeded: 1, podsPerDay: 1, podPrice: 2.87 })
        }}
      >
        {dText.seedBtn}
      </PrimaryButton>
      <button type="button" data-testid="setup-own-btn" onClick={() => setOwn({ startMs: Date.now(), seeded: 0, podsPerDay: 1, podPrice: 5 })} className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border bg-card px-4 text-base">
        {dText.ownBtn}
      </button>
    </section>
  )
}

function Medal({ tone }: { tone: "gold" | "grey" }) {
  return (
    <span aria-hidden="true" className={`inline-flex size-14 items-center justify-center rounded-full text-2xl ${tone === "gold" ? "bg-amber-400 text-amber-800" : "bg-border text-muted-foreground"}`}>
      {"★"}
    </span>
  )
}

function Main({ setup, now, onReset }: { setup: Setup; now: number; onReset: () => void }) {
  const [past, setPast] = useLabState<Streak[]>("quitdate", "d", "past", [])
  const [quitMs, setQuitMs] = useLabState<number | null>("quitdate", "d", "quitMs", null)
  const [why, setWhy] = useLabState<string>("quitdate", "d", "why", dText.whyDefault)
  const [screen, setScreen] = useState<Screen>("home")
  const [page, setPage] = useState(0)
  const [sPage, setSPage] = useState(0)
  const [sort, setSort] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [editWhy, setEditWhy] = useState(false)
  const [money, setMoney] = useState(0)
  const [startMs, setStartMs] = useLabState<number>("quitdate", "d", "startMs", setup.startMs)
  const [draft, setDraft] = useState("")
  const [quitDraft, setQuitDraft] = useState("")

  const start = startMs
  const elapsed = Math.max(0, now - start)
  const perDay = setup.podsPerDay * setup.podPrice
  const days = elapsed / DAY
  const saved = perDay * days
  const next = nextTimeGoal(elapsed)
  const reached = reachedTimeGoals(elapsed)
  const totalGoals = TIME_GOALS.length + BUDDIES.length
  const longest = longestMs(past, elapsed)
  const goBack = () => setScreen(screen === "money" || screen === "resources" || screen === "buddy" || screen === "detail" ? (screen === "buddy" ? "goals" : screen === "detail" ? "stats" : "home") : screen === "settings" ? "tracker" : "home")
  const span = (ms: number) => longSpan(ms, { d: dText.units.d, h: dText.units.h, m: dText.units.m, s: dText.units.s })
  const goalName = (k: string) => dText.goalNames[k as keyof typeof dText.goalNames]

  const hero = (
    <div data-testid="d-hero" className="rounded-xl bg-green-700 p-4 text-white">
      <div className="text-xs">{dText.vapeFree}</div>
      <div data-testid="d-counter" className="text-xl font-bold tabular-nums">
        {span(elapsed)}
      </div>
    </div>
  )

  if (screen === "money") return <OtherToolScreen title={dText.moneyTitle} onBack={goBack} />
  if (screen === "resources") return <OtherToolScreen title={dText.resources} onBack={goBack} />
  if (screen === "buddy") return <OtherToolScreen title={dText.buddyTitle} onBack={goBack} />
  if (screen === "detail") return <PlaceholderScreen title={dText.detailTitle} onBack={goBack} />
  if (screen === "settings") return <PlaceholderScreen title={dText.settingsTitle} onBack={goBack} />

  if (screen === "goals") {
    return (
      <section data-testid="d-goals" className="flex flex-col gap-3">
        <Head title={dText.goalsTitle} onBack={goBack} />
        <div data-testid="d-next-goal" className="rounded-xl bg-green-700 p-4 text-center text-white">
          {next ? (
            <>
              <div className="text-sm">
                {dText.nextGoal}: {goalName(next.key)} {dText.vapeFreeShort}
              </div>
              <div data-testid="d-goal-countdown" className="mt-2 text-xl font-bold tabular-nums">
                {goalCountdown(next.ms - elapsed)}
              </div>
            </>
          ) : (
            <div className="text-sm">{dText.allDone}</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TIME_GOALS.map((g) => {
            const done = elapsed >= g.ms
            return (
              <div key={g.key} data-testid={`d-goal-${g.key}`} data-earned={done} className={`flex aspect-square flex-col items-center justify-between rounded-xl p-3 ${done ? "bg-green-700 text-white" : "bg-border text-muted-foreground"}`}>
                <span className="font-semibold">{goalName(g.key)}</span>
                <Medal tone={done ? "gold" : "grey"} />
              </div>
            )
          })}
          {BUDDIES.map((n) => (
            <button key={n} type="button" data-testid={`d-buddy-${n}`} onClick={() => setScreen("buddy")} className={`flex aspect-square min-h-11 flex-col items-center justify-between rounded-xl p-3 ${n === 1 ? "bg-sky-600 text-white" : "bg-border text-muted-foreground"}`}>
              <span className="font-semibold">{dText.buddy(n)}</span>
              <Medal tone={n === 1 ? "gold" : "grey"} />
            </button>
          ))}
        </div>
      </section>
    )
  }

  if (screen === "streaks") {
    const list = sortStreaks(past, SORTS[sort])
    return (
      <section data-testid="d-streaks" className="flex flex-col gap-3">
        <Head title={dText.streaksTitle} onBack={goBack} />
        <div className="text-sm text-muted-foreground">{dText.current}</div>
        {sPage === 0 ? (
          <div className="rounded-xl bg-green-700 p-4 text-white">
            <div className="text-xs">{dText.vapeFree}</div>
            <div data-testid="d-streak-current" className="text-lg font-bold tabular-nums">
              {span(elapsed)}
            </div>
            {!confirm ? (
              <button type="button" data-testid="d-break" onClick={() => setConfirm(true)} className="mt-2 inline-flex min-h-11 items-center text-sm underline">
                {dText.breakQ}
              </button>
            ) : (
              <div data-testid="d-break-confirm" className="mt-2 flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{dText.breakConfirm}</span>
                  <InferredTag />
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    data-testid="d-break-yes"
                    onClick={() => {
                      const r = breakStreak(past, start, Date.now())
                      setPast(r.past)
                      setStartMs(r.startMs)
                      setConfirm(false)
                    }}
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-white/20"
                  >
                    {dText.breakYes}
                  </button>
                  <button type="button" data-testid="d-break-no" onClick={() => setConfirm(false)} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-white/20">
                    {dText.breakNo}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Placeholder />
        )}
        <Pager count={2} index={sPage} onChange={setSPage} />
        <h3 className="font-semibold">{dText.past}</h3>
        <Tabs id="d-sort" items={dText.sorts} value={sort} onChange={setSort} />
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>{dText.colDate}</span>
          <span>{dText.colTotal}</span>
        </div>
        <ul data-testid="d-past" className="flex flex-col gap-2">
          {list.length === 0 && <li className="text-sm text-muted-foreground">{dText.noPast}</li>}
          {list.map((s) => (
            <li key={s.startMs} data-testid="d-past-row" className="grid grid-cols-2 gap-2 rounded-md border border-border bg-card p-2 text-sm">
              <span>{longDate(s.startMs)}</span>
              <span className="tabular-nums">{span(s.lengthMs)}</span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  if (screen === "stats") {
    return (
      <section data-testid="d-stats" className="flex flex-col gap-3">
        <Head title={dText.statsTitle} onBack={goBack} />
        <h3 className="font-semibold">{dText.healthImp}</h3>
        <div className="grid grid-cols-3 gap-2">
          {dText.rings.map((r, i) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <svg width={72} height={72} className="-rotate-90" aria-hidden="true">
                <circle cx={36} cy={36} r={30} fill="none" strokeWidth={7} className="stroke-border" />
              </svg>
              <NotSourced />
              <span className="text-xs">{r}</span>
              <span className="sr-only">{i}</span>
            </div>
          ))}
        </div>
        <h3 className="font-semibold">{dText.healthAch}</h3>
        <Card>
          <NotSourced />
          <button type="button" data-testid="d-more-health" onClick={() => setScreen("detail")} className="mt-2 inline-flex min-h-11 items-center text-sm underline">
            {dText.viewMore}
          </button>
        </Card>
        <h3 className="font-semibold">{dText.goalsCard}</h3>
        <Card>
          <div className="flex items-center gap-3">
            <Medal tone="gold" />
            <div>
              <div className="font-semibold">{dText.monthOne}</div>
              <div className="text-sm text-muted-foreground">{dText.monthOneText}</div>
            </div>
          </div>
          <button type="button" data-testid="d-more-goals" onClick={() => setScreen("detail")} className="mt-2 inline-flex min-h-11 items-center text-sm underline">
            {dText.viewMore}
          </button>
        </Card>
        <Tabs id="d-money" items={dText.tabsMoney} value={money} onChange={setMoney} />
        <div data-testid="d-money-value" className="text-2xl font-semibold tabular-nums">
          {fmtMoney(money === 0 ? Math.min(saved, monthly(perDay)) : saved)}
        </div>
      </section>
    )
  }

  if (screen === "tracker") {
    return (
      <section data-testid="d-tracker" className="flex flex-col gap-3">
        <Head
          title={dText.trackerTitle}
          onBack={goBack}
          right={
            <button type="button" data-testid="d-gear" aria-label={dText.gear} onClick={() => setScreen("settings")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
              {"⚙"}
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Card testId="d-tr-money">
            <div className="text-xs text-muted-foreground">{dText.tileMoney}</div>
            <div className="text-lg font-semibold tabular-nums">{fmtMoney(saved)}</div>
          </Card>
          <Card testId="d-tr-pods">
            <div className="text-xs text-muted-foreground">{dText.podsNot}</div>
            <div className="text-lg font-semibold tabular-nums">{Math.floor(setup.podsPerDay * days)}</div>
          </Card>
        </div>
        <Card testId="d-tr-puffs">
          <div className="text-sm">{dText.puffs}</div>
          <NotSourced />
        </Card>
        <Card testId="d-tr-nic">
          <div className="text-sm">{dText.nicotine}</div>
          <NotSourced />
        </Card>
      </section>
    )
  }

  if (screen === "quitdate") {
    const left = quitMs !== null && quitMs > now ? quitMs - now : null
    return (
      <section data-testid="d-quitdate" className="flex flex-col gap-3">
        <Head title={dText.quitDateTitle} onBack={goBack} inferred />
        <p className="text-sm text-muted-foreground">{dText.quitDateFact}</p>
        <Placeholder />
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span>{dText.quitDateLabel}</span>
          <input type="date" data-testid="d-quit-input" value={quitDraft} min={dayKey(now + DAY)} onChange={(e) => setQuitDraft(e.target.value)} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </label>
        <PrimaryButton testId="d-quit-save" disabled={!quitDraft} onClick={() => quitDraft && setQuitMs(keyToMs(quitDraft))}>
          {dText.save}
        </PrimaryButton>
        <p data-testid="d-quit-state" className="text-sm">
          {left === null ? dText.noQuitDate : `${dText.quitIn} ${goalCountdown(left)}`}
        </p>
      </section>
    )
  }

  if (screen === "reduction") {
    const target = quitMs !== null ? reductionTarget(setup.podsPerDay, start, quitMs, now) : null
    return (
      <section data-testid="d-reduction" className="flex flex-col gap-3">
        <Head title={dText.reductionTitle} onBack={goBack} inferred />
        <p className="text-sm text-muted-foreground">{dText.reductionFact}</p>
        <Card testId="d-reduction-card">
          <div className="text-sm text-muted-foreground">{dText.todayNumber}</div>
          <div data-testid="d-reduction-number" className="text-2xl font-semibold tabular-nums">
            {target === null ? dText.noQuitDate : target}
          </div>
        </Card>
        <Placeholder />
      </section>
    )
  }

  // home
  return (
    <div data-testid="d-home" className="flex flex-col gap-3">
      {quitMs !== null && quitMs > now && (
        <p data-testid="d-home-quit" className="text-sm text-muted-foreground">
          {dText.quitIn} {goalCountdown(quitMs - now)}
        </p>
      )}
      {hero}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{dText.progress}</h3>
        <ShareBtn text={span(elapsed)} testId="d-share" />
      </div>
      {page === 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" data-testid="d-tile-money" onClick={() => setScreen("money")} className="flex min-h-24 flex-col justify-between rounded-lg bg-green-700 p-2 text-left text-white">
            <span className="text-xs">{dText.tileMoney}</span>
            <span className="text-sm font-bold tabular-nums">{fmtMoney(saved)}</span>
          </button>
          <button type="button" data-testid="d-tile-goals" onClick={() => setScreen("goals")} className="flex min-h-24 flex-col justify-between rounded-lg bg-green-700 p-2 text-left text-white">
            <span className="text-xs">{dText.tileGoals}</span>
            <span className="text-sm font-bold tabular-nums">
              {reached.length}/{totalGoals}
            </span>
          </button>
          <button type="button" data-testid="d-tile-streak" onClick={() => setScreen("streaks")} className="flex min-h-24 flex-col justify-between rounded-lg bg-green-700 p-2 text-left text-white">
            <span className="text-xs">{dText.tileLongest}</span>
            <span data-testid="d-longest" className="text-sm font-bold tabular-nums">
              {Math.floor(longest / DAY)} {dText.units.d}
            </span>
          </button>
        </div>
      ) : (
        <Placeholder />
      )}
      <Pager count={2} index={page} onChange={setPage} />
      <Card testId="d-why">
        <div className="mb-1 text-xs text-green-500">{dText.whyTitle}</div>
        {editWhy ? (
          <div className="flex gap-2">
            <input
              data-testid="d-why-input"
              aria-label={dText.whyEdit}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2"
            />
            <button
              type="button"
              data-testid="d-why-save"
              onClick={() => {
                setWhy(draft)
                setEditWhy(false)
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-3"
            >
              {dText.save}
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="d-why-text"
            onClick={() => {
              setDraft(why)
              setEditWhy(true)
            }}
            className="min-h-11 text-left"
          >
            {why}
          </button>
        )}
      </Card>
      <h3 className="font-semibold">{dText.resources}</h3>
      <button type="button" data-testid="d-resources" onClick={() => setScreen("resources")} className="flex min-h-14 items-center rounded-lg bg-red-700 px-4 text-left font-medium text-white">
        {dText.sos}
      </button>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex-1">{dText.moreNote}</span>
          <InferredTag />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["stats", "tracker", "quitdate", "reduction"] as const).map((k, i) => (
            <button key={k} type="button" data-testid={`d-go-${k}`} onClick={() => setScreen(k)} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-3 text-sm">
              {dText.more[i]}
            </button>
          ))}
        </div>
      </div>
      <button type="button" data-testid="start-over" onClick={onReset} className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
        {dText.clearExample}
      </button>
    </div>
  )
}

function Pager({ count, index, onChange }: { count: number; index: number; onChange: (i: number) => void }) {
  return (
    <div className="flex justify-center gap-1" role="tablist">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" role="tab" aria-selected={i === index} aria-label={i === 0 ? dText.page1 : dText.page2} data-testid={`d-page-${i}`} onClick={() => onChange(i)} className="inline-flex size-11 items-center justify-center">
          <span className={`size-2.5 rounded-full ${i === index ? "bg-primary" : "bg-border"}`} />
        </button>
      ))}
    </div>
  )
}
