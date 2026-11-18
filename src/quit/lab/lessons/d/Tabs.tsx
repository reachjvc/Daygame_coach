"use client"

import { useState } from "react"
import { Card, Head, NotSourced, Placeholder } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { CardPager, Sheet } from "../shared/Bits"
import { dateToMs, msToDate, perItem } from "../shared/logic"
import { lsText } from "../shared/text"
import { MissionRow, type Go } from "./Home"
import { countEarned, money, MONEY_STEPS, monthCells } from "./logic"
import type { DState, Reminder } from "./state"
import { dText } from "./text"

const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-md bg-sky-600 px-4 font-medium text-white disabled:opacity-40"
const ghost = "inline-flex min-h-12 w-full items-center justify-center rounded-md border border-sky-400 px-4 font-medium"
const input = "min-h-11 w-full rounded-md border border-border bg-background px-3"

function share(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) void navigator.share({ text }).catch(() => undefined)
  } catch {
    // no share sheet here
  }
}

/** Mood page, shown on the first visit to the progress tab of a day. */
export function Mood({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [pick, setPick] = useState<number | null>(null)
  if (pick !== null) {
    return (
      <section data-testid="d-mood-after" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 rounded-2xl bg-sky-800 p-6 text-center text-white">
        <span className="text-7xl" aria-hidden="true">{dText.moodFaces[pick]}</span>
        <p className="text-lg">{dText.moodAfter[pick]}</p>
        <button type="button" data-testid="d-mood-share" onClick={() => share(dText.moodAfter[pick])} className={ghost}>{lsText.share}</button>
        <button type="button" data-testid="d-mood-back" onClick={onDone} className={ghost}>{dText.goProgress}</button>
      </section>
    )
  }
  return (
    <section data-testid="d-mood" className="flex min-h-[60dvh] flex-col gap-3 rounded-2xl bg-sky-800 p-5 text-white">
      <h2 className="text-2xl font-bold">{dText.moodTitle}</h2>
      {dText.moods.map((m, i) => (
        <button key={m} type="button" data-testid={`d-mood-${i}`} onClick={() => setPick(i)} className="flex min-h-14 items-center gap-3 rounded-full bg-white px-4 text-left font-medium text-black">
          <span aria-hidden="true" className="text-2xl">{dText.moodFaces[i]}</span>
          {m}
        </button>
      ))}
      <button type="button" data-testid="d-mood-skip" onClick={onSkip} className={`${ghost} mt-auto`}>{dText.skip}</button>
    </section>
  )
}

/** Progress tab: savings from what the user typed, and the 28-day health list. */
export function Progress({ s, day, saved, onGo }: { s: DState; day: number; saved: number | null; onGo: Go }) {
  const each = perItem(s.packCost)
  const perDayCost = each !== null && s.perDay !== null ? each * s.perDay : null
  const tiles: [string, number | null][] = [
    [dText.tilePack, s.packCost],
    [dText.tileEach, each],
    [dText.tileDay, perDayCost],
    [dText.tileWeek, perDayCost === null ? null : perDayCost * 7],
  ]
  return (
    <section data-testid="d-progress" className="flex flex-col gap-3">
      <h2 className="text-3xl font-bold">{dText.progressTitle}</h2>
      <Card>
        <p className="text-sm">{dText.savingsHead}</p>
        <p data-testid="d-progress-saved" className="my-2 text-4xl font-bold">{money(saved) ?? <NotSourced />}</p>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map(([label, v]) => (
            <div key={label} className="rounded-lg border border-border p-2 text-center">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">{money(v) ?? <NotSourced />}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">{dText.healthHead}</h3>
        {[1, 2, 3].map((n) => (
          <div key={n} data-testid={`d-health-${n}`} data-reached={day >= n} className="mb-2 flex items-center gap-3">
            <span aria-hidden="true" className={`inline-flex size-6 items-center justify-center rounded-full border ${day >= n ? "border-sky-400 bg-sky-500 text-white" : "border-border"}`}>{day >= n ? "✔" : ""}</span>
            <span className="w-14 shrink-0 text-sm">{dText.dayRow(n)}</span>
            <NotSourced />
          </div>
        ))}
        <Placeholder />
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" data-testid="d-progress-tips" onClick={() => onGo("tips")} className={ghost}>{dText.tipsPage}</button>
        <button type="button" data-testid="d-progress-badges" onClick={() => onGo("badges")} className={ghost}>{dText.latestBadges}</button>
      </div>
    </section>
  )
}

/** Badges: earned in colour, others grey. */
export function Badges({ earned, onBack }: { earned: Record<string, boolean[]>; onBack: () => void }) {
  return (
    <section data-testid="d-badges" data-earned={countEarned(earned)} className="flex flex-col gap-3">
      <Head title={dText.badgesTitle} onBack={onBack} />
      {dText.badgeGroups.map((g) => {
        const names = g.id === "money" ? MONEY_STEPS.map((m) => money(m) ?? "") : g.names
        return (
          <Card key={g.id}>
            <h3 className="mb-2 font-semibold">{g.title}</h3>
            <div className="grid grid-cols-3 gap-2">
              {names.map((n, i) => {
                const on = earned[g.id]?.[i] ?? false
                return (
                  <div key={n} data-testid={`d-badge-${g.id}-${i}`} data-earned={on} className={`flex flex-col items-center gap-1 text-center text-xs ${on ? "" : "opacity-40"}`}>
                    <span aria-hidden="true" className={`inline-flex size-12 items-center justify-center rounded-full ${on ? "bg-sky-600" : "bg-muted"}`}>{"🏅"}</span>
                    {n}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </section>
  )
}

/** Diary tab: month calendar, reminders, streak record, missions. */
export function Diary({ s, day, update, bestNow, onGo }: { s: DState; day: number; update: (p: Partial<DState>) => void; bestNow: number; onGo: Go }) {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [sheet, setSheet] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [time, setTime] = useState("09:00")
  const [date, setDate] = useState("")
  const quit = s.quitMs ? new Date(s.quitMs) : null
  const key = (d: number) => `${ym.y}-${String(ym.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  const move = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1)
    setYm({ y: d.getFullYear(), m: d.getMonth() })
  }
  const open = (d: number) => {
    setDate(key(d))
    setName("")
    setSheet(key(d))
  }
  const save = () => {
    const r: Reminder = { name: name.trim(), date, time }
    update({ reminders: [...s.reminders, r] })
    setSheet(null)
  }
  return (
    <section data-testid="d-diary" className="flex flex-col gap-3">
      <h2 className="text-3xl font-bold">{dText.diaryTitle}</h2>
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <button type="button" data-testid="d-cal-prev" aria-label={dText.prevMonth} onClick={() => move(-1)} className="inline-flex size-11 items-center justify-center">{"‹"}</button>
          <span data-testid="d-cal-title" className="font-semibold">{`${sharedText.months[ym.m]} ${ym.y}`}</span>
          <button type="button" data-testid="d-cal-next" aria-label={dText.nextMonth} onClick={() => move(1)} className="inline-flex size-11 items-center justify-center">{"›"}</button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {sharedText.weekdays.map((w) => (
            <span key={w}>{w.slice(0, 2)}</span>
          ))}
        </div>
        {monthCells(ym.y, ym.m).map((row, ri) => (
          <div key={ri} className="grid grid-cols-7">
            {row.map((d, ci) =>
              d === null ? (
                <span key={ci} />
              ) : (
                <button key={ci} type="button" data-testid={`d-cal-${d}`} onClick={() => open(d)} className="relative inline-flex min-h-11 items-center justify-center text-sm">
                  {quit && quit.getFullYear() === ym.y && quit.getMonth() === ym.m && quit.getDate() === d ? <span data-testid="d-cal-star" className="text-amber-400">{"★"}</span> : d}
                  {s.reminders.some((r) => r.date === key(d)) && <span data-testid="d-cal-dot" className="absolute bottom-1 size-1.5 rounded-full bg-sky-400" />}
                </button>
              ),
            )}
          </div>
        ))}
      </Card>
      {!s.hideReminderCard && (
        <Card className="relative pr-12">
          <h3 className="font-semibold">{dText.reminderCard}</h3>
          <p className="text-sm text-muted-foreground">{dText.reminderLine}</p>
          <button type="button" data-testid="d-rem-hide" aria-label={dText.hide} onClick={() => update({ hideReminderCard: true })} className="absolute right-1 top-1 inline-flex size-11 items-center justify-center">{"✕"}</button>
        </Card>
      )}
      {s.reminders.map((r) => (
        <div key={`${r.date}-${r.time}-${r.name}`} data-testid="d-reminder" className="rounded-lg border border-border p-3 text-sm">{`${r.date} ${r.time} ${r.name}`}</div>
      ))}
      <Card>
        <h3 className="mb-2 font-semibold">{dText.streakRecord}</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div data-testid="d-rec-current"><p className="text-xl font-bold">{dText.dayUnit(day)}</p><p className="text-xs text-muted-foreground">{dText.currentStreak}</p></div>
          <div data-testid="d-rec-best"><p className="text-xl font-bold">{dText.dayUnit(bestNow)}</p><p className="text-xs text-muted-foreground">{dText.bestStreakRec}</p></div>
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold">{dText.missionsTitle}</h3>
        <p className="mb-2 text-sm text-muted-foreground">{dText.missionsDiary}</p>
        <MissionRow onGo={onGo} />
        <button type="button" data-testid="d-diary-missions" onClick={() => onGo("ph", -2)} className="inline-flex min-h-11 items-center text-sm underline">{dText.viewMissions}</button>
      </Card>
      {sheet && (
        <Sheet testId="d-reminder-sheet" onClose={() => setSheet(null)} closeLabel={dText.closeLabel}>
          <div className="flex flex-col gap-3 pt-8">
            <h3 className="font-semibold">{dText.scheduled}</h3>
            <input data-testid="d-rem-name" aria-label={dText.remName} placeholder={dText.remName} value={name} onChange={(e) => setName(e.target.value)} className={input} />
            <input data-testid="d-rem-date" type="date" aria-label={dText.remDate} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
            <input data-testid="d-rem-time" type="time" aria-label={dText.remTime} value={time} onChange={(e) => setTime(e.target.value)} className={input} />
            <button type="button" data-testid="d-rem-set" disabled={!name.trim() || !dateToMs(date)} onClick={save} className={btn}>{dText.remSet}</button>
            <button type="button" data-testid="d-rem-cancel" onClick={() => setSheet(null)} className={ghost}>{dText.cancel}</button>
          </div>
        </Sheet>
      )}
    </section>
  )
}

/** Discover tab: article cards and sections; the content was never seen. */
export function Discover() {
  return (
    <section data-testid="d-discover" className="flex flex-col gap-3">
      <h2 className="text-3xl font-bold">{dText.discoverTitle}</h2>
      <Placeholder className="min-h-28" />
      <Placeholder className="min-h-28" />
      {dText.sections.map((t, i) => (
        <div key={t} className="flex flex-col gap-2">
          <h3 className="font-semibold">{t}</h3>
          <CardPager id={`d-disc-${i}`} count={6} render={() => <Placeholder className="min-h-28" />} />
        </div>
      ))}
    </section>
  )
}

/** The day-8 sheet. */
export function EightDays({ day, saved, badges, onClose }: { day: number; saved: number | null; badges: number; onClose: () => void }) {
  return (
    <Sheet testId="d-eight">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-sky-600 text-3xl font-bold text-white">{day}</span>
        <h3 className="text-lg font-semibold">{dText.smokeFree(day)}</h3>
        <div className="grid w-full grid-cols-3 gap-2 text-sm">
          <div><p className="font-bold">{money(saved) ?? <NotSourced />}</p><p className="text-xs">{dText.iSaved}</p></div>
          <div><p className="font-bold">{"0"}</p><p className="text-xs">{dText.missionsDone}</p></div>
          <div><p className="font-bold">{badges}</p><p className="text-xs">{dText.badgesEarned}</p></div>
        </div>
        <button type="button" data-testid="d-eight-share" onClick={() => share(dText.smokeFree(day))} className={btn}>{dText.shareBuddyBtn}</button>
        <button type="button" data-testid="d-eight-close" onClick={onClose} className={ghost}>{dText.close}</button>
      </div>
    </Sheet>
  )
}

/** "Have you smoked since we last saw you?" sheet that opens every new day. */
export function AskSheet({ onNo, onYes }: { onNo: () => void; onYes: () => void }) {
  return (
    <Sheet testId="d-ask">
      <div className="flex flex-col gap-3 pt-2 text-center">
        <h3 className="text-lg font-semibold">{dText.askSince}</h3>
        <div className="flex gap-3">
          <button type="button" data-testid="d-ask-no" onClick={onNo} className={btn}>{dText.no}</button>
          <button type="button" data-testid="d-ask-yes" onClick={onYes} className={btn}>{dText.yes}</button>
        </div>
      </div>
    </Sheet>
  )
}

/** After a slip: kind line, last-smoked date, recap; the count restarts and totals stay. */
export function Relapse({ days, saved, onGo }: { days: number; saved: number | null; onGo: (restartMs: number) => void }) {
  const [step, setStep] = useState(0)
  const [date, setDate] = useState(msToDate(Date.now()))
  return (
    <section data-testid="d-relapse" data-step={step} className="flex flex-col gap-4">
      {step === 0 && (
        <>
          <h2 className="text-2xl font-bold">{dText.relapseTitle}</h2>
          <p>{dText.relapseLine}</p>
          <h3 className="font-semibold">{dText.stories}</h3>
          <CardPager id="d-relapse-stories" count={3} render={() => <Placeholder className="min-h-28" />} />
          <button type="button" data-testid="d-relapse-next" onClick={() => setStep(1)} className={btn}>{dText.continue}</button>
        </>
      )}
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold">{dText.lastSmoked}</h2>
          <input data-testid="d-relapse-date" type="date" aria-label={dText.lastSmoked} value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          <button type="button" data-testid="d-relapse-date-go" disabled={!dateToMs(date)} onClick={() => setStep(2)} className={btn}>{dText.continue}</button>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="text-2xl font-bold">{dText.readyAgain}</h2>
          <Card>
            <h3 className="font-semibold">{dText.lookAchieved}</h3>
            <p data-testid="d-relapse-days" className="text-sm">{dText.smokeFreeFor(days)}</p>
            <p className="text-sm">{money(saved) ?? <NotSourced />}</p>
            <p className="mt-2 text-sm">{dText.totalsStay}</p>
          </Card>
          <Placeholder />
          <button type="button" data-testid="d-relapse-go" onClick={() => onGo(dateToMs(date))} className={btn}>{dText.readyGo}</button>
        </>
      )}
    </section>
  )
}

/** The end of the 28 days. */
export function Finish({ s, day, saved, badges, game, onDone, update }: { s: DState; day: number; saved: number | null; badges: number; game: number; onDone: () => void; update: (p: Partial<DState>) => void }) {
  const [form, setForm] = useState(false)
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [text, setText] = useState("")
  const [ok, setOk] = useState(false)
  const [added, setAdded] = useState(false)
  const grid: [string, React.ReactNode][] = [
    [dText.gridSaved, money(saved) ?? <NotSourced key="s" />],
    [dText.gridMissions, "0"],
    [dText.gridBadges, badges],
    [dText.gridAttempts, s.attempts],
    [dText.gridArticles, "0"],
    [dText.gridGame, game],
  ]
  return (
    <section data-testid="d-finish" className="flex flex-col gap-4">
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-6 text-black">
        <h2 className="text-4xl font-bold">{dText.finishTitle}</h2>
        <p className="mt-2">{dText.finishLine}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span>{dText.finishClaim}</span><NotSourced /></div>
      </div>
      <Card>
        <h3 className="font-semibold">{dText.lookAchieved}</h3>
        <p className="text-sm">{dText.sinceFor}</p>
        <p data-testid="d-finish-days" className="text-4xl font-bold">{`${day} ${dText.daysCaps}`}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {grid.map(([label, v]) => (
            <div key={label}><p className="text-lg font-bold">{v}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-2"><NotSourced /></div>
      </Card>
      <button type="button" data-testid="d-finish-share" onClick={() => share(dText.finishLine)} className={ghost}>{dText.shareProgress}</button>
      <h3 className="font-semibold">{dText.recommend}</h3>
      {!form ? (
        <button type="button" data-testid="d-rec-open" onClick={() => setForm(true)} className={ghost}>{dText.recommendBtn}</button>
      ) : (
        <div data-testid="d-rec-form" className="flex flex-col gap-2">
          <input data-testid="d-rec-name" aria-label={dText.recName} placeholder={dText.recName} value={name} onChange={(e) => setName(e.target.value)} className={input} />
          <input data-testid="d-rec-title" aria-label={dText.recTitle} placeholder={dText.recTitle} maxLength={65} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          <textarea data-testid="d-rec-text" aria-label={dText.recText} placeholder={dText.recText} maxLength={2000} rows={4} value={text} onChange={(e) => setText(e.target.value)} className="rounded-md border border-border bg-background p-3" />
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="size-5" />
            {dText.recShow}
          </label>
          <button type="button" data-testid="d-rec-add" disabled={!title.trim() || !text.trim()} onClick={() => { update({ recs: [...s.recs, { title: title.trim(), body: text.trim() }] }); setAdded(true) }} className={btn}>{dText.recAdd}</button>
          {added && <p data-testid="d-rec-saved" className="text-sm text-muted-foreground">{dText.recSaved}</p>}
        </div>
      )}
      <button type="button" data-testid="d-finish-done" onClick={onDone} className={btn}>{dText.continue}</button>
    </section>
  )
}
