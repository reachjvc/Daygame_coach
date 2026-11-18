"use client"

import { useState } from "react"
import { BottomNav, Card, Head, NotSourced, Placeholder, PlaceholderScreen, Ring } from "../shared/Bits"
import { fmtMoney, splitElapsed } from "../shared/calc"
import { useNow } from "../shared/clock"
import { SetupGate, StartOver, seedStart, type SetupField } from "../shared/Setup"
import { dText } from "./text"
import { achievements, overall, unlockedCount, type DSetup } from "./logic"

type Screen = "home" | "ach" | "health" | "settings" | "profile" | "nook"

const FIELDS: SetupField[] = [
  { key: "startMs", label: dText.fStart, kind: "date" },
  { key: "cigsPerDay", label: dText.fCigs, kind: "number" },
  { key: "packSize", label: dText.fPack, kind: "number" },
  { key: "packPrice", label: dText.fPrice, kind: "number", step: 0.25 },
]

/** Copy D: home with a sweeping stopwatch and a four-tile overall row, achievements grid, health list. */
export function ProgressD() {
  return (
    <div data-testid="progress-d">
      <SetupGate<DSetup>
        letter="d"
        keys={["setup"]}
        fields={FIELDS}
        seed={(now) => ({ startMs: seedStart(now, 4 * 3_600_000 + 23 * 60_000), cigsPerDay: 15, packSize: 20, packPrice: 5.76, seeded: 1 })}
        own={(now) => ({ startMs: now, cigsPerDay: NaN, packSize: NaN, packPrice: NaN, seeded: 0 })}
      >
        {(setup, startOver) => (
          <>
            <Main setup={setup} />
            <StartOver onClick={startOver} />
          </>
        )}
      </SetupGate>
    </div>
  )
}

function Main({ setup }: { setup: DSetup }) {
  const now = useNow(1000)
  const [screen, setScreen] = useState<Screen>("home")
  const o = overall(setup, now)
  const go = (s: Screen) => setScreen(s)
  const home = () => go("home")
  const nav = screen === "ach" ? 1 : screen === "health" ? 2 : 0
  return (
    <div className="flex flex-col">
      {screen === "home" && <Home setup={setup} now={now} go={go} />}
      {screen === "ach" && <Achievements o={o} />}
      {screen === "health" && <Health />}
      {screen === "settings" && <PlaceholderScreen title={dText.settingsTitle} onBack={home} />}
      {screen === "profile" && <PlaceholderScreen title={dText.profileTitle} onBack={home} />}
      {screen === "nook" && <PlaceholderScreen title={dText.nookTitle} onBack={home} />}
      {(screen === "home" || screen === "ach" || screen === "health") && <BottomNav id="d-nav" items={dText.nav} value={nav} onChange={(i) => go((["home", "ach", "health"] as const)[i])} />}
    </div>
  )
}

function Home({ setup, now, go }: { setup: DSetup; now: number; go: (s: Screen) => void }) {
  const o = overall(setup, now)
  const sp = splitElapsed(now - setup.startMs)
  const share = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text: dText.shareMsg(o.days) }).catch(() => undefined)
    } catch {
      // no share sheet here
    }
  }
  const tile = (testId: string, value: React.ReactNode, label: string) => (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      <span data-testid={testId} className="text-lg font-bold tabular-nums">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
  return (
    <section data-testid="screen-home" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold">{dText.homeTitle}</h2>
        <button type="button" data-testid="d-share" aria-label={dText.share} onClick={share} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"↗"}
        </button>
        <button type="button" data-testid="d-settings" aria-label={dText.settings} onClick={() => go("settings")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"⚙"}
        </button>
        <button type="button" data-testid="d-profile" aria-label={dText.profile} onClick={() => go("profile")} className="inline-flex size-11 items-center justify-center rounded-full bg-amber-400 text-black">
          {"●"}
        </button>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
        <svg viewBox="0 0 100 100" width="140" height="140" role="img" aria-label={dText.stopwatch} data-testid="d-stopwatch">
          <circle cx="50" cy="52" r="40" className="fill-background stroke-sky-400" strokeWidth="6" />
          <rect x="43" y="4" width="14" height="7" rx="2" className="fill-sky-400" />
          {[0, 90, 180, 270].map((a) => (
            <line key={a} x1="50" y1="18" x2="50" y2="23" className="stroke-muted-foreground" strokeWidth="2" transform={`rotate(${a} 50 52)`} />
          ))}
          <g className="animate-[spin_60s_linear_infinite]" style={{ transformOrigin: "50px 52px" }}>
            <line x1="50" y1="52" x2="50" y2="20" className="stroke-foreground" strokeWidth="3" strokeLinecap="round" />
          </g>
          <circle cx="50" cy="52" r="4" className="fill-foreground" />
        </svg>
        <div className="flex w-full justify-around" data-testid="d-time">
          {[
            [sp.days, dText.unitDays],
            [String(sp.hours).padStart(2, "0"), dText.unitHours],
            [String(sp.minutes).padStart(2, "0"), dText.unitMinutes],
          ].map(([v, u]) => (
            <div key={u} className="text-center">
              <p className="text-2xl font-bold tabular-nums">{v}</p>
              <p className="text-xs text-muted-foreground">{u}</p>
            </div>
          ))}
        </div>
      </div>
      <Card testId="d-overall">
        <p className="mb-3 font-semibold">{dText.overall}</p>
        <div className="flex gap-1">
          {tile("d-tile-days", o.days, dText.tileDays)}
          {tile("d-tile-cigs", o.cigs, dText.tileCigs)}
          {tile("d-tile-money", o.money.toFixed(2), dText.tileMoney)}
          {tile("d-tile-time", <NotSourced />, dText.tileTime)}
        </div>
        <p className="sr-only">{fmtMoney(o.money)}</p>
      </Card>
      <Card testId="d-community">
        <p className="font-semibold">{dText.community}</p>
        <p className="mb-2 text-sm text-muted-foreground">{dText.communityLine}</p>
        <Placeholder />
        <p className="mt-1 text-xs text-muted-foreground">{dText.communityOut}</p>
      </Card>
      <Card testId="d-nook" onClick={() => go("nook")}>
        <p className="font-semibold">{dText.nook}</p>
        <p className="text-sm text-muted-foreground">{dText.nookLine}</p>
      </Card>
    </section>
  )
}

function Achievements({ o }: { o: ReturnType<typeof overall> }) {
  const list = achievements(o)
  const n = unlockedCount(list)
  return (
    <section data-testid="screen-ach" className="flex flex-col gap-3">
      <Head title={dText.achTitle} right={<span data-testid="d-ach-count" className="rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold">{dText.achCount(n)}</span>} />
      <div className="grid grid-cols-2 gap-2">
        {dText.achCards.map((c) => {
          const a = list.find((x) => x.id === c.id)!
          return (
            <div key={c.id} data-testid={`d-ach-${c.id}`} data-state={a.state} className={`relative flex min-h-32 flex-col gap-1 rounded-lg border p-3 ${a.state === "unlocked" ? "border-emerald-500" : "border-border"}`}>
              <span aria-hidden="true" className={`absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full border text-xs ${a.state === "unlocked" ? "border-emerald-500 bg-emerald-500 text-black" : "border-orange-400"}`}>
                {a.state === "unlocked" ? "✓" : ""}
              </span>
              <p className="pr-6 font-semibold">{c.title}</p>
              {c.req ? <p className="text-sm text-muted-foreground">{c.req}</p> : <Placeholder className="min-h-0 text-xs" />}
              {a.state === "unsourced" && <NotSourced />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Health() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section data-testid="screen-health" className="flex flex-col gap-3">
      <Head
        title={dText.healthTitle}
        right={
          <span data-testid="d-health-count" className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm">
            <NotSourced />
            {dText.healthOf}
          </span>
        }
      />
      <ul className="flex flex-col gap-2">
        {dText.healthRows.map((r, i) => (
          <li key={r}>
            <button type="button" data-testid={`d-health-${i}`} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex min-h-14 w-full flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left text-sm">
              <span className="flex items-start gap-2">
                <span className="flex-1">{r}</span>
                <span aria-hidden="true" data-testid={`d-health-chevron-${i}`}>
                  {open === i ? "⌃" : "⌄"}
                </span>
              </span>
              {open === i ? (
                <span data-testid={`d-health-ring-${i}`} className="relative flex justify-center py-2">
                  <Ring value={0} size={110} stroke={10}>
                    <NotSourced />
                  </Ring>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <NotSourced />
                  <span data-testid={`d-health-bar-${i}`} data-fill="0" className="relative h-3 flex-1 overflow-hidden rounded-full border border-dashed border-muted-foreground/60 bg-transparent">
                    <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: "0%" }} />
                  </span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
