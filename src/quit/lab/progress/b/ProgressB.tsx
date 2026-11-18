"use client"

import { useState } from "react"
import { useLabState } from "../../store"
import { PrimaryButton } from "../../../components/kit"
import { BottomNav, Card, Head, InferredTag, NotSourced, NumField, Placeholder, PlaceholderScreen, Ring, ShareBtn } from "../shared/Bits"
import { addDays, dayKey, fmtMoney, wholeDays, ymdhms } from "../shared/calc"
import { useNow } from "../shared/clock"
import { SetupGate, StartOver, seedStart, type SetupField } from "../shared/Setup"
import { sharedText } from "../shared/text"
import { bText } from "./text"
import { badges, diaryRows, notSmoked, periods, savedMoney, type BSetup, type Badge, type Craving } from "./logic"

type Screen = "dash" | "health" | "badges" | "money" | "wish" | "motivation" | "wall" | "diary" | "add" | "support" | "settings" | "mission" | "questionnaire"

const FIELDS: SetupField[] = [
  { key: "startMs", label: bText.fStart, kind: "date" },
  { key: "cigsPerDay", label: bText.fCigs, kind: "number" },
  { key: "packSize", label: bText.fPack, kind: "number" },
  { key: "packPrice", label: bText.fPrice, kind: "number", step: 0.5 },
]

/** Copy B: dashboard with a ticking clock, health rings, badges, money page with replacement spend, wishlist, cravings diary. */
export function ProgressB() {
  return (
    <div data-testid="progress-b">
      <SetupGate<BSetup>
        letter="b"
        keys={["setup", "cravings", "spend", "wish", "motive"]}
        fields={FIELDS}
        seed={(now) => ({ startMs: seedStart(now, 5 * 3_600_000), cigsPerDay: 15, packSize: 20, packPrice: 5.76, seeded: 1 })}
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

/** The one diary line the public screens show: severity 7.0. */
function seedCravings(now: number): Craving[] {
  return [{ day: addDays(dayKey(now), -1), strength: 7, smoked: false }]
}

function Main({ setup }: { setup: BSetup }) {
  const now = useNow(1000)
  const [screen, setScreen] = useState<Screen>("dash")
  const [seeded] = useState(() => seedCravings(Date.now()))
  const [cravings, setCravings] = useLabState<Craving[] | null>("progress", "b", "cravings", null)
  const list = cravings ?? (setup.seeded ? seeded : [])
  const [spend, setSpend] = useLabState<{ cigs: number; nrt: number }>("progress", "b", "spend", { cigs: 0, nrt: 0 })
  const [wish, setWish] = useLabState<{ item: string; price: number }>("progress", "b", "wish", { item: setup.seeded ? bText.seedWish : "", price: NaN })
  const [motive, setMotive] = useLabState<string>("progress", "b", "motive", setup.seeded ? bText.seedReason : "")
  const go = (s: Screen) => setScreen(s)
  const dash = () => go("dash")
  const money = savedMoney(setup, now, spend.cigs, spend.nrt)
  const cigs = notSmoked(setup, now)
  const days = wholeDays(setup.startMs, now)
  const bs = badges({ days, money, cigs, cravings: list.length, wish: wish.item.trim() !== "", motive: motive.trim() !== "" })
  const earned = bs.filter((b) => b.earned).length
  const nav = screen === "mission" ? 1 : screen === "add" ? 2 : screen === "diary" ? 3 : screen === "support" ? 4 : 0

  return (
    <div className="flex flex-col">
      {screen === "dash" && <Dash setup={setup} now={now} money={money} cigs={cigs} earned={earned} cravings={list} go={go} />}
      {screen === "health" && <Health onBack={dash} />}
      {screen === "badges" && <Badges list={bs} earned={earned} onBack={dash} />}
      {screen === "money" && <MoneyPage setup={setup} now={now} money={money} spend={spend} setSpend={setSpend} go={go} onBack={dash} />}
      {screen === "wish" && <Wish wish={wish} setWish={setWish} money={money} onBack={() => go("money")} />}
      {screen === "motivation" && <Motivation value={motive} onSave={(v) => (setMotive(v), dash())} onCancel={dash} />}
      {screen === "wall" && <Wall setup={setup} now={now} onBack={dash} onCert={() => go("questionnaire")} />}
      {screen === "questionnaire" && <PlaceholderScreen title={bText.certTitle2} onBack={() => go("wall")} />}
      {screen === "mission" && <PlaceholderScreen title={bText.missionTitle} onBack={null} />}
      {screen === "diary" && <Diary list={list} onAdd={() => go("add")} />}
      {screen === "add" && <AddCraving now={now} onBack={dash} onSave={(c) => (setCravings([...list, c]), go("diary"))} />}
      {screen === "support" && <PlaceholderScreen title={bText.supportTitle} onBack={null} />}
      {screen === "settings" && <PlaceholderScreen title={bText.settingsTitle} onBack={dash} />}
      {(screen === "dash" || screen === "mission" || screen === "add" || screen === "diary" || screen === "support") && (
        <BottomNav id="b-nav" items={bText.nav} value={nav} onChange={(i) => go((["dash", "mission", "add", "diary", "support"] as const)[i])} />
      )}
    </div>
  )
}

function Dash({ setup, now, money, cigs, earned, cravings, go }: { setup: BSetup; now: number; money: number; cigs: number; earned: number; cravings: Craving[]; go: (s: Screen) => void }) {
  const t = ymdhms(setup.startMs, now)
  const avg = cravings.length ? (cravings.reduce((s, c) => s + c.strength, 0) / cravings.length).toFixed(1) : "0.0"
  return (
    <section data-testid="screen-dash" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" data-testid="b-settings" aria-label={bText.settings} onClick={() => go("settings")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
          {"⚙"}
        </button>
        <h2 className="flex-1 text-lg font-semibold">{bText.dashTitle}</h2>
      </div>
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4">
        <p data-testid="b-clock" className="text-3xl font-bold tabular-nums">
          {`${t.years}${bText.y} ${t.months}${bText.m} ${t.days}${bText.d}`}
        </p>
        <p data-testid="b-clock-small" className="text-lg tabular-nums text-muted-foreground">
          {`${t.hours}${bText.h} ${t.minutes}${bText.min} ${t.seconds}${bText.s}`}
        </p>
        <svg viewBox="0 0 100 100" width="96" height="96" role="img" aria-label={bText.stopwatch} data-testid="b-stopwatch">
          <circle cx="50" cy="50" r="44" className="fill-card stroke-primary" strokeWidth="6" />
          <rect x="44" y="2" width="12" height="6" rx="2" className="fill-primary" />
          <g className="animate-[spin_60s_linear_infinite]" style={{ transformOrigin: "50px 50px" }}>
            <line x1="50" y1="50" x2="50" y2="16" className="stroke-emerald-400" strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle cx="50" cy="50" r="4" className="fill-foreground" />
        </svg>
      </div>
      <Card testId="b-card-health" onClick={() => go("health")}>
        <p className="mb-2 font-semibold">{bText.healthCard}</p>
        <ul className="flex flex-col gap-1">
          {bText.healthRows.map((r) => (
            <li key={r} className="flex items-center justify-between gap-2 text-sm">
              <span>{r}</span>
              <NotSourced />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-primary">{bText.explore}</p>
      </Card>
      <Card testId="b-card-money" onClick={() => go("money")}>
        <p className="text-sm text-muted-foreground">{bText.moneyCard}</p>
        <p data-testid="b-money" className="text-2xl font-bold tabular-nums">
          {fmtMoney(money)}
        </p>
      </Card>
      <Card testId="b-card-cravings" onClick={() => go("diary")}>
        <p className="text-sm text-muted-foreground">{bText.cravingsCard}</p>
        <p className="font-medium">{cravings.length ? bText.cravingsLine(cravings.length, avg) : bText.noCravings}</p>
      </Card>
      <Card testId="b-card-badges" onClick={() => go("badges")}>
        <p className="text-sm text-muted-foreground">{bText.challengesCard}</p>
        <p data-testid="b-earned" className="text-2xl font-bold">
          {earned}
        </p>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <InferredTag />
          <p className="text-xs text-muted-foreground">{bText.notSmokedCard}</p>
          <p data-testid="b-not-smoked" className="text-xl font-bold tabular-nums">
            {cigs}
          </p>
        </Card>
        <Card>
          <InferredTag />
          <div className="mb-1 flex items-center justify-between gap-1">
            <p className="text-xs text-muted-foreground">{bText.lifeCard}</p>
          </div>
          <NotSourced />
        </Card>
      </div>
      <Card testId="b-card-wall" onClick={() => go("wall")}>
        <p className="font-medium">{bText.wallCard}</p>
      </Card>
      <Card testId="b-card-motivation" onClick={() => go("motivation")}>
        <p className="font-medium">{bText.motivation}</p>
      </Card>
    </section>
  )
}

function Health({ onBack }: { onBack: () => void }) {
  return (
    <section data-testid="screen-health" className="flex flex-col gap-3">
      <Head title={bText.healthTitle} onBack={onBack} right={<ShareBtn text={bText.shareHealth} testId="b-share-health" />} />
      <p className="text-sm text-muted-foreground">{bText.healthLine}</p>
      {bText.healthNames.map((n, i) => (
        <Card key={n} testId={`b-health-${i}`}>
          <div className="flex items-center gap-4">
            <Ring value={0} size={96} stroke={9}>
              <NotSourced />
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{n}</p>
              <p className="text-sm text-muted-foreground">{bText.healthOutcomes[i]}</p>
            </div>
          </div>
        </Card>
      ))}
    </section>
  )
}

function badgeLabel(b: Badge): string {
  if (b.family === "time") return bText.badgeTime(b.value)
  if (b.family === "money") return bText.badgeMoney(b.value)
  if (b.family === "count") return bText.badgeCigs(b.value)
  if (b.family === "diary") return bText.badgeDiary(b.value)
  return b.id === "wish" ? bText.badgeWish : b.id === "motive" ? bText.badgeMotive : bText.badgeSetup
}

function Badges({ list, earned, onBack }: { list: Badge[]; earned: number; onBack: () => void }) {
  return (
    <section data-testid="screen-badges" className="flex flex-col gap-3">
      <Head title={bText.badgesTitle} onBack={onBack} right={<span data-testid="b-badge-count" className="text-sm text-muted-foreground">{bText.badgesLine(earned)}</span>} />
      <div className="grid grid-cols-3 gap-2">
        {list.map((b) => (
          <div
            key={b.id}
            data-testid={`b-badge-${b.id}`}
            data-earned={b.earned}
            className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-xs ${b.earned ? "border-primary bg-card" : "border-border opacity-50"}`}
          >
            <span aria-hidden="true" className="text-2xl">
              {b.earned ? "★" : "☆"}
            </span>
            <span>{badgeLabel(b)}</span>
            <span className="text-muted-foreground">{b.earned ? bText.earned : bText.locked}</span>
          </div>
        ))}
        <Placeholder className="min-h-24" />
        <Placeholder className="min-h-24" />
      </div>
    </section>
  )
}

function MoneyPage({ setup, now, money, spend, setSpend, go, onBack }: { setup: BSetup; now: number; money: number; spend: { cigs: number; nrt: number }; setSpend: (v: { cigs: number; nrt: number }) => void; go: (s: Screen) => void; onBack: () => void }) {
  const p = periods(setup)
  const rows: [string, number, string][] = [
    [bText.perDay, p.day, "day"],
    [bText.perWeek, p.week, "week"],
    [bText.perMonth, p.month, "month"],
    [bText.perYear, p.year, "year"],
  ]
  const fillPct = Math.min(100, ((money % 50) / 50) * 100)
  return (
    <section data-testid="screen-money" className="flex flex-col gap-3">
      <Head title={bText.moneyTitle} onBack={onBack} right={<ShareBtn text={bText.shareMoney(fmtMoney(money))} testId="b-share-money" />} />
      <div className="flex items-center gap-4">
        <div role="img" aria-label={bText.jar} data-testid="b-jar" data-fill={Math.round(fillPct)} className="relative h-24 w-16 shrink-0 overflow-hidden rounded-b-2xl rounded-t-md border-2 border-border">
          <div className="absolute inset-x-0 bottom-0 bg-amber-400/70" style={{ height: `${fillPct}%`, transition: "height 0.8s ease" }} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{bText.moneySaved}</p>
          <p data-testid="b-money-total" className="text-3xl font-bold tabular-nums">
            {fmtMoney(money)}
          </p>
        </div>
      </div>
      <p data-testid="b-formula" className="text-xs text-muted-foreground">
        {bText.formula(wholeDays(setup.startMs, now), fmtMoney(p.day), fmtMoney(spend.cigs), fmtMoney(spend.nrt), fmtMoney(money))}
      </p>
      <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
        <NumField label={bText.spentCigs} value={spend.cigs} step={1} testId="b-spend-cigs" onChange={(n) => setSpend({ ...spend, cigs: Number.isFinite(n) ? n : 0 })} />
        <NumField label={bText.spentNrt} value={spend.nrt} step={1} testId="b-spend-nrt" onChange={(n) => setSpend({ ...spend, nrt: Number.isFinite(n) ? n : 0 })} />
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
        {rows.map(([label, v, id]) => (
          <p key={id} className="flex min-h-11 items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span data-testid={`b-period-${id}`}>{fmtMoney(v)}</span>
          </p>
        ))}
      </div>
      <Card testId="b-save-up" onClick={() => go("wish")}>
        <p className="font-semibold">{bText.saveUp}</p>
        <p className="text-sm text-muted-foreground">{bText.saveUpLine}</p>
      </Card>
    </section>
  )
}

function Wish({ wish, setWish, money, onBack }: { wish: { item: string; price: number }; setWish: (v: { item: string; price: number }) => void; money: number; onBack: () => void }) {
  const pct = Number.isFinite(wish.price) && wish.price > 0 ? Math.min(100, Math.floor((Math.max(0, money) / wish.price) * 100)) : 0
  return (
    <section data-testid="screen-wish" className="flex flex-col gap-3">
      <Head title={bText.wishTitle} onBack={onBack} />
      <div className="flex justify-center">
        <Ring value={pct / 100} size={140} testId="b-wish-ring">
          <span data-testid="b-wish-pct" className="text-lg font-bold">
            {bText.wishProgress(pct)}
          </span>
        </Ring>
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        <span>{bText.wishItem}</span>
        <input data-testid="b-wish-item" value={wish.item} placeholder={bText.wishPlaceholder} aria-label={bText.wishItem} onChange={(e) => setWish({ ...wish, item: e.target.value })} className="min-h-11 w-48 rounded-md border border-border bg-background px-2" />
      </label>
      <NumField label={bText.wishPrice} value={wish.price} step={10} testId="b-wish-price" onChange={(n) => setWish({ ...wish, price: n })} />
    </section>
  )
}

function Motivation({ value, onSave, onCancel }: { value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(value)
  return (
    <section data-testid="screen-motivation" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" data-testid="b-motive-cancel" onClick={onCancel} className="min-h-11 px-2 text-sm text-muted-foreground">
          {sharedText.cancel}
        </button>
        <h2 className="font-semibold">{bText.motivation}</h2>
        <button type="button" data-testid="b-motive-save" onClick={() => onSave(text)} className="min-h-11 px-2 text-sm text-primary">
          {sharedText.save}
        </button>
      </div>
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{bText.picture}</div>
      <h3 className="text-lg font-semibold">{bText.motivationHeading}</h3>
      <textarea data-testid="b-motive-text" value={text} placeholder={bText.motivationPlaceholder} aria-label={bText.motivationHeading} onChange={(e) => setText(e.target.value)} className="min-h-24 rounded-md border border-border bg-background p-2" />
    </section>
  )
}

function Diary({ list, onAdd }: { list: Craving[]; onAdd: () => void }) {
  const rows = diaryRows(list)
  const today = dayKey(Date.now())
  const label = (d: string) => (d === today ? bText.today : d)
  return (
    <section data-testid="screen-diary" className="flex flex-col gap-3">
      <Head title={bText.diaryTitle} />
      <PrimaryButton testId="b-add-craving" onClick={onAdd}>
        {bText.addCraving}
      </PrimaryButton>
      <p className="text-sm text-muted-foreground">{bText.slipNote}</p>
      <h3 className="font-semibold">{bText.diaryList}</h3>
      <ul data-testid="b-diary" className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.day} className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-sm">
            <span>{label(r.day)}</span>
            <span className="text-muted-foreground">{r.smoked ? bText.smokedMark : bText.heldMark}</span>
            <span>{bText.cravingsCount(r.count)}</span>
            <span>{bText.severity(r.avg.toFixed(1))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ChipRow({ label, items, value, onPick, id }: { label: string; items: readonly string[]; value: string | null; onPick: (v: string) => void; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {items.map((x, i) => (
          <button key={x} type="button" role="radio" aria-checked={value === x} data-testid={`${id}-${i}`} onClick={() => onPick(x)} className={`min-h-11 rounded-full border px-4 text-sm ${value === x ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
            {x}
          </button>
        ))}
      </div>
    </div>
  )
}

function AddCraving({ now, onBack, onSave }: { now: number; onBack: () => void; onSave: (c: Craving) => void }) {
  const [strength, setStrength] = useState(5)
  const [smoked, setSmoked] = useState(false)
  const [loc, setLoc] = useState(false)
  const [feel, setFeel] = useState<string | null>(null)
  const [doing, setDoing] = useState<string | null>(null)
  const [who, setWho] = useState<string | null>(null)
  return (
    <section data-testid="screen-add" className="flex flex-col gap-4">
      <Head title={bText.addCraving} onBack={onBack} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {bText.strengthLabel}
        <input type="range" min={0} max={10} step={1} value={strength} data-testid="b-strength" onChange={(e) => setStrength(Number(e.target.value))} className="min-h-11 w-full accent-primary" />
        <span className="flex justify-between text-xs font-normal text-muted-foreground">
          <span>{bText.strengthLow}</span>
          <span data-testid="b-strength-value">{strength}</span>
          <span>{bText.strengthHigh}</span>
        </span>
      </label>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">{bText.didSmoke}</p>
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" aria-pressed={smoked === v} data-testid={`b-smoked-${v ? "yes" : "no"}`} onClick={() => setSmoked(v)} className={`min-h-11 flex-1 rounded-md border text-sm ${smoked === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              {v ? bText.yes : bText.no}
            </button>
          ))}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={loc} data-testid="b-location" onClick={() => setLoc(!loc)} className="flex min-h-11 items-center justify-between rounded-md border border-border bg-card px-3 text-sm">
        {bText.location}
        <span aria-hidden="true">{loc ? "●" : "○"}</span>
      </button>
      <ChipRow label={bText.feeling} items={bText.feelings} value={feel} onPick={setFeel} id="b-feel" />
      <ChipRow label={bText.doing} items={bText.doings} value={doing} onPick={setDoing} id="b-doing" />
      <ChipRow label={bText.with} items={bText.withs} value={who} onPick={setWho} id="b-with" />
      <PrimaryButton testId="b-craving-save" onClick={() => onSave({ day: dayKey(now), strength, smoked })}>
        {bText.saveCraving}
      </PrimaryButton>
    </section>
  )
}

function Wall({ setup, now, onBack, onCert }: { setup: BSetup; now: number; onBack: () => void; onCert: () => void }) {
  const t = ymdhms(setup.startMs, now)
  const months = t.years * 12 + t.months
  const days = wholeDays(setup.startMs, now)
  const marks = [1, 3, 6, 12, 24, 36]
  const open = marks.some((m) => months >= m)
  return (
    <section data-testid="screen-wall" className="flex flex-col gap-3">
      <Head title={bText.wallTitle} onBack={onBack} />
      <p className="text-sm text-muted-foreground">{bText.wallLine}</p>
      <p className="text-xs text-muted-foreground">{bText.wallExample}</p>
      <div data-testid="b-wall" className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-[2.5rem_1fr_1fr_1.3fr] gap-1 bg-card px-2 py-1 text-xs text-muted-foreground">
          {bText.wallCols.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        {bText.wallRows.map((r) => (
          <div key={r.name} className="grid min-h-11 grid-cols-[2.5rem_1fr_1fr_1.3fr] items-center gap-1 border-t border-border px-2 text-sm">
            <span>{r.month}</span>
            <span>{r.name}</span>
            <span>{r.country}</span>
            <span className="text-xs">{r.achieved}</span>
          </div>
        ))}
        <div data-testid="b-wall-you" className="grid min-h-11 grid-cols-[2.5rem_1fr_1fr_1.3fr] items-center gap-1 border-t border-border bg-emerald-900/40 px-2 text-sm font-semibold">
          <span>{months}</span>
          <span>{bText.wallYou}</span>
          <span>{bText.wallNoCountry}</span>
          <span className="text-xs">{bText.wallYouAchieved(days)}</span>
        </div>
      </div>
      <Card testId="b-cert">
        <p className="font-semibold">{bText.certTitle}</p>
        <p className="text-sm text-muted-foreground">{bText.certLine}</p>
        <button type="button" data-testid="b-cert-open" data-open={open} onClick={onCert} className="mt-2 min-h-11 rounded-md border border-border px-3 text-sm">
          {bText.certOpen}
        </button>
      </Card>
      <p className="text-xs text-muted-foreground">{bText.wallOut}</p>
    </section>
  )
}
