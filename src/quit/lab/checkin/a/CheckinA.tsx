"use client"

import { useRef, useState } from "react"
import { PrimaryButton } from "../../../components/kit"
import { BottomNav, Card, Head, InferredTag, Placeholder, PlaceholderScreen, ShareBtn } from "../../progress/shared/Bits"
import { useLabState } from "../../store"
import { ExampleGate, OtherScreen, RoundBtn } from "../shared/Bits"
import { addDays, longDate, keyToMs } from "../shared/logic"
import { ckText } from "../shared/text"
import { ACTIVITIES, challengeFill, checklistDone, messageIndex, notesOf, pledgeStreak, seedDaysA, type DayA, type DaysA, type Review } from "./logic"
import { aText } from "./text"

type Screen = "today" | "pledge" | "card" | "review" | "history" | "notes" | "calendar" | "stats" | "reminders" | "challenge" | "menu" | "profile" | "motivation" | "other" | "cardsettings"
type Reminder = { on: boolean; time: string }
const REMINDERS: Reminder[] = [
  { on: true, time: "08:00" },
  { on: true, time: "21:00" },
]
const KEYS = ["days", "work", "reminders"]

/** Copy A: daily pledge sheet, Today checklist, end-of-day review, History. */
export function CheckinA() {
  return (
    <div data-testid="checkin-a">
      <ExampleGate letter="a" keys={KEYS}>
        {(seeded, today) => <Main seeded={seeded} today={today} />}
      </ExampleGate>
    </div>
  )
}

const dateLabel = (key: string) => longDate(key, ckText.weekdaysLong, ckText.months)
const shortLabel = (key: string) => {
  const d = new Date(keyToMs(key))
  return `${ckText.weekdaysLong[d.getDay()]}, ${ckText.months[d.getMonth()]} ${d.getDate()}`
}

function Main({ seeded, today }: { seeded: boolean; today: string }) {
  const [days, setDays] = useLabState<DaysA>("checkin", "a", "days", seeded ? seedDaysA(today) : {})
  const [screen, setScreen] = useState<Screen>("today")
  const [reviewDate, setReviewDate] = useState(today)
  const [otherIdx, setOtherIdx] = useState(0)
  const go = (s: Screen) => setScreen(s)
  const streak = pledgeStreak(days, today)

  const patch = (date: string, fn: (d: DayA) => DayA) => setDays({ ...days, [date]: fn(days[date] ?? { pledge: false }) })
  const nav = screen === "motivation" || screen === "card" ? 3 : screen === "other" ? [0, 2, 4][otherIdx] : 1
  const navTo = (i: number) => {
    if (i === 1) go("today")
    else if (i === 3) go("motivation")
    else {
      setOtherIdx(i === 0 ? 0 : i === 2 ? 1 : 2)
      go("other")
    }
  }
  const tabbed = ["today", "history", "notes", "calendar", "stats", "reminders", "challenge", "motivation", "other", "menu", "profile"].includes(screen)

  return (
    <div className="flex flex-col">
      {screen === "today" && <Today days={days} today={today} streak={streak} go={go} onReview={() => (setReviewDate(today), go("review"))} />}
      {screen === "pledge" && <Pledge today={today} onClose={() => go("today")} onConfirm={() => (patch(today, (d) => ({ ...d, pledge: true })), go("card"))} />}
      {screen === "card" && <MessageCard today={today} onClose={() => go("today")} onGear={() => go("cardsettings")} />}
      {screen === "cardsettings" && <OtherScreen title={aText.settingsTitle} onBack={() => go("card")} />}
      {screen === "review" && <ReviewForm date={reviewDate} today={today} existing={days[reviewDate]?.review} onBack={() => go("today")} onSave={(r) => (patch(reviewDate, (d) => ({ ...d, review: r })), go("history"))} />}
      {screen === "history" && <History days={days} today={today} onOpen={(d) => (setReviewDate(d), go("review"))} onMenu={() => go("menu")} />}
      {screen === "notes" && <Notes days={days} onMenu={() => go("menu")} onAdd={() => (setReviewDate(today), go("review"))} />}
      {screen === "calendar" && <PlaceholderScreen title={aText.calendarTitle} onBack={() => go("menu")} />}
      {screen === "stats" && <PlaceholderScreen title={aText.statsTitle} onBack={() => go("menu")} />}
      {screen === "reminders" && <Reminders onBack={() => go("menu")} />}
      {screen === "challenge" && <PlaceholderScreen title={aText.challengeTitleScreen} onBack={() => go("today")} />}
      {screen === "menu" && <Menu onPick={(i) => go((["today", "history", "notes", "calendar", "stats", "reminders"] as const)[i])} onBack={() => go("today")} />}
      {screen === "profile" && <OtherScreen title={aText.profileTitle} onBack={() => go("today")} />}
      {screen === "motivation" && <Motivation today={today} />}
      {screen === "other" && <OtherScreen title={aText.otherTabs[otherIdx]} onBack={null} />}
      {tabbed && <BottomNav items={aText.nav} value={nav} onChange={navTo} id="a-nav" />}
    </div>
  )
}

function TopBar({ title, onMenu, onProfile }: { title: string; onMenu: () => void; onProfile?: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <RoundBtn label={aText.menuLabel} testId="a-menu" onClick={onMenu}>
        {"≡"}
      </RoundBtn>
      <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-sky-400">{title}</h2>
      {onProfile && (
        <RoundBtn label={aText.profileLabel} testId="a-profile" onClick={onProfile}>
          {"☺"}
        </RoundBtn>
      )}
    </div>
  )
}

function Today({ days, today, streak, go, onReview }: { days: DaysA; today: string; streak: number; go: (s: Screen) => void; onReview: () => void }) {
  const [work, setWork] = useLabState<number[]>("checkin", "a", "work", [])
  const day = days[today]
  const done = checklistDone(day)
  const fill = challengeFill(streak)
  return (
    <section data-testid="a-today" className="flex flex-col gap-3">
      <TopBar title={aText.todayTitle} onMenu={() => go("menu")} onProfile={() => go("profile")} />
      <p className="text-2xl font-bold" data-testid="a-date">
        {dateLabel(today)}
      </p>
      <div data-testid="a-streak" data-days={streak} className="rounded-lg bg-indigo-500/15 px-3 py-3 text-center text-sm text-indigo-200">
        {aText.streakLine(streak)}
      </div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{aText.checklistHeading}</h3>
        <span data-testid="a-checklist-count" className="text-sm text-muted-foreground">
          {aText.checklistCount(done)}
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <button type="button" data-testid="a-row-pledge" onClick={() => !day?.pledge && go("pledge")} className="flex min-h-14 w-full items-center gap-3 border-b border-border px-3 text-left">
          <Circle on={!!day?.pledge} />
          <span className="flex-1">{day?.pledge ? aText.rowPledged : aText.rowPledge}</span>
          <span aria-hidden="true" className="text-muted-foreground">{"›"}</span>
        </button>
        <div data-testid="a-row-review" className="flex min-h-14 items-center gap-3 px-3 py-2">
          <Circle on={!!day?.review} />
          <div className="flex flex-1 flex-col items-start">
            <span className="text-sm text-muted-foreground">{day?.review ? aText.rowReviewDone : aText.rowReviewLater}</span>
            <button type="button" data-testid="a-review-now" onClick={onReview} className="min-h-11 text-left text-sky-400 underline">
              {day?.review ? aText.editReview : aText.reviewNow}
            </button>
          </div>
          <span aria-hidden="true" className="text-muted-foreground">{"›"}</span>
        </div>
      </div>
      <h3 className="mt-2 font-semibold">{aText.challengeHeading}</h3>
      <Card testId="a-challenge" onClick={() => go("challenge")}>
        <p className="font-medium">
          <span aria-hidden="true">{"🏆 "}</span>
          {aText.challengeTitle}
        </p>
        <div data-testid="a-segments" data-filled={fill} className="my-2 flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} data-on={i < fill} className={`h-1.5 flex-1 rounded-full ${i < fill ? "bg-emerald-500" : "bg-muted"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{aText.challengeLine(7 - fill)}</p>
      </Card>
      <div className="mt-2 flex items-center justify-between">
        <h3 className="font-semibold">{aText.workbookHeading}</h3>
        <span aria-label={aText.workbookMenu} className="px-2 text-muted-foreground">{"…"}</span>
      </div>
      <p className="text-sm text-muted-foreground">{aText.workbookLine}</p>
      <div className="flex justify-center gap-3">
        {[0, 1, 2].map((i) => (
          <button
            key={i}
            type="button"
            data-testid={`a-work-${i}`}
            aria-label={aText.workbookTick(i + 1)}
            aria-pressed={work.includes(i)}
            onClick={() => setWork(work.includes(i) ? work.filter((w) => w !== i) : [...work, i])}
            className={`inline-flex size-11 items-center justify-center rounded-full border ${work.includes(i) ? "border-emerald-500 bg-emerald-500/20" : "border-border"}`}
          >
            {"✓"}
          </button>
        ))}
      </div>
    </section>
  )
}

function Circle({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" data-on={on} className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border ${on ? "border-violet-400 bg-violet-500 text-white" : "border-border"}`}>
      {on ? "✓" : ""}
    </span>
  )
}

function Pledge({ today, onClose, onConfirm }: { today: string; onClose: () => void; onConfirm: () => void }) {
  const [dot, setDot] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const weekday = ckText.weekdaysLong[new Date(keyToMs(today)).getDay()]
  const tint = ["bg-violet-500/25", "bg-emerald-500/25", "bg-sky-500/25"]
  const scrollTo = (i: number) => {
    const el = track.current
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
    setDot(i)
  }
  return (
    <section data-testid="a-pledge-sheet" className="flex flex-col gap-3 pb-20">
      <div className="flex items-center gap-2">
        <RoundBtn label={ckText.close} testId="a-pledge-close" onClick={onClose}>
          {"×"}
        </RoundBtn>
        <p className="flex-1 text-center text-xs tracking-widest text-muted-foreground">{aText.pledgeFor(weekday)}</p>
        <span className="size-11" aria-hidden="true" />
      </div>
      <div
        ref={track}
        data-testid="a-pledge-carousel"
        onScroll={(e) => setDot(Math.round(e.currentTarget.scrollLeft / Math.max(1, e.currentTarget.clientWidth)))}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-lg"
      >
        {aText.pledgeSentences.map((s) => (
          <div key={s} className="min-h-28 w-full shrink-0 snap-center bg-card px-4 py-6 text-xl font-bold">
            {s}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1">
        {aText.pledgeSentences.map((s, i) => (
          <button key={s} type="button" data-testid={`a-pledge-dot-${i}`} aria-label={aText.pageDot(i + 1)} aria-current={i === dot} onClick={() => scrollTo(i)} className="inline-flex size-11 items-center justify-center">
            <span className={`size-2.5 rounded-full ${i === dot ? "bg-sky-400" : "bg-muted-foreground/40"}`} />
          </button>
        ))}
        {dot > 0 && <InferredTag />}
      </div>
      <h3 className="font-semibold">{aText.whyHeading}</h3>
      <div data-testid="a-reasons" className="columns-2 gap-2">
        {aText.reasons.map((r, i) => (
          <div key={r} className={`mb-2 break-inside-avoid rounded-lg p-3 text-sm font-medium ${tint[i % 3]}`} style={{ minHeight: 56 + (i % 3) * 24 }}>
            {r}
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md bg-background/95 p-3">
        <PrimaryButton testId="a-pledge-confirm" onClick={onConfirm}>
          {aText.pledgeButton}
        </PrimaryButton>
      </div>
    </section>
  )
}

function MessageCard({ today, onClose, onGear }: { today: string; onClose: () => void; onGear: () => void }) {
  const d = new Date(keyToMs(today))
  const text = aText.messages[messageIndex(today, aText.messages.length)]
  return (
    <section data-testid="a-card" className="flex min-h-[70vh] flex-col rounded-xl bg-gradient-to-b from-orange-500/30 via-rose-900/40 to-background p-3">
      <div className="flex items-center gap-2">
        <RoundBtn label={ckText.close} testId="a-card-close" onClick={onClose}>
          {"×"}
        </RoundBtn>
        <h2 className="flex-1 truncate text-center font-semibold">{aText.packName}</h2>
        <RoundBtn label={aText.settingsLabel} testId="a-card-gear" onClick={onGear}>
          {"⚙"}
        </RoundBtn>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">{aText.todayLabel(`${ckText.months[d.getMonth()]} ${d.getDate()}`)}</p>
      <p data-testid="a-card-text" className="my-auto px-2 text-center text-3xl font-bold">
        {text}
      </p>
      <div className="flex justify-center">
        <ShareBtn text={text} testId="a-card-share" />
      </div>
    </section>
  )
}

function Motivation({ today }: { today: string }) {
  const rows = [1, 2, 3].map((n) => addDays(today, -n))
  return (
    <section data-testid="a-motivation" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-sky-400">{aText.motivationTitle}</h2>
      <h3 className="font-semibold">{aText.todaysMessage}</h3>
      <Card>
        <p className="text-sm text-muted-foreground">{aText.packName}</p>
        <p className="mt-1 font-medium">{aText.messages[messageIndex(today, aText.messages.length)]}</p>
      </Card>
      <h3 className="font-semibold">{aText.previousDays}</h3>
      {rows.map((k) => (
        <Card key={k}>
          <p className="text-xs text-muted-foreground">{dateLabel(k)}</p>
          <p className="text-sm">{aText.messages[messageIndex(k, aText.messages.length)]}</p>
        </Card>
      ))}
      <p className="text-sm text-muted-foreground">{aText.upcoming}</p>
      <Placeholder />
    </section>
  )
}

function Menu({ onPick, onBack }: { onPick: (i: number) => void; onBack: () => void }) {
  return (
    <section data-testid="a-menu-screen" className="flex flex-col gap-2">
      <Head title={aText.menuTitle} onBack={onBack} />
      {aText.menuItems.map((label, i) => (
        <button key={label} type="button" data-testid={`a-menu-${i}`} onClick={() => onPick(i)} className="flex min-h-12 items-center justify-between rounded-lg border border-border bg-card px-3 text-left">
          {label}
          <span aria-hidden="true">{"›"}</span>
        </button>
      ))}
    </section>
  )
}

function ReviewForm({ date, today, existing, onBack, onSave }: { date: string; today: string; existing: Review | undefined; onBack: () => void; onSave: (r: Review) => void }) {
  const [r, setR] = useState<Review>(existing ?? { sober: true, difficulty: 0, mood: null, activities: [], note: "" })
  const [extra, setExtra] = useState("")
  const options = [...ACTIVITIES, ...r.activities.filter((a) => !(ACTIVITIES as readonly string[]).includes(a))]
  const toggle = (a: string) => setR({ ...r, activities: r.activities.includes(a) ? r.activities.filter((x) => x !== a) : [...r.activities, a] })
  const chip = (on: boolean) => `inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${on ? "border-sky-400 bg-sky-500/20" : "border-border bg-card"}`
  return (
    <section data-testid="a-review" data-date={date} className="flex flex-col gap-4">
      <Head title={date === today ? aText.reviewTitle : aText.reviewFor(shortLabel(date))} onBack={onBack} inferred />
      <div>
        <h3 className="mb-2 font-semibold">{aText.soberQ}</h3>
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" data-testid={`a-sober-${v ? "yes" : "no"}`} aria-pressed={r.sober === v} onClick={() => setR({ ...r, sober: v })} className={`${chip(r.sober === v)} flex-1 justify-center`}>
              {v ? aText.yes : aText.no}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{aText.difficultyQ}</h3>
        <div className="flex flex-col gap-1.5">
          {aText.difficulty.map((label, i) => (
            <button key={label} type="button" data-testid={`a-diff-${i}`} aria-pressed={r.difficulty === i} onClick={() => setR({ ...r, difficulty: i })} className={`flex min-h-11 items-center gap-3 rounded-md border px-3 text-left ${r.difficulty === i ? "border-sky-400 bg-sky-500/15" : "border-border bg-card"}`}>
              {i < 3 ? (
                <span aria-hidden="true" className={["text-emerald-400", "text-sky-400", "text-slate-400"][i]}>
                  {aText.difficultyShapes[i]}
                </span>
              ) : (
                <span aria-hidden="true" className="inline-block size-4 rounded-sm border border-dashed border-muted-foreground" />
              )}
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Placeholder />
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{aText.moodQ}</h3>
        <div className="flex flex-wrap gap-2">
          {aText.moodFaces.map((f, i) => (
            <button key={f} type="button" data-testid={`a-mood-${i}`} aria-label={aText.moodLabel(i + 1)} aria-pressed={r.mood === i} onClick={() => setR({ ...r, mood: r.mood === i ? null : i })} className={`inline-flex size-11 items-center justify-center rounded-full border text-xl ${r.mood === i ? "border-sky-400 bg-sky-500/20" : "border-border bg-card"}`}>
              {f}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{aText.faceNote}</p>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{aText.activitiesQ}</h3>
        <div className="flex flex-wrap gap-2">
          {options.map((a) => (
            <button key={a} type="button" data-testid={`a-act-${a}`} aria-pressed={r.activities.includes(a)} onClick={() => toggle(a)} className={chip(r.activities.includes(a))}>
              {a}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input data-testid="a-act-input" value={extra} placeholder={aText.activityPlaceholder} aria-label={aText.activityPlaceholder} onChange={(e) => setExtra(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2" />
          <button type="button" data-testid="a-act-add" disabled={!extra.trim()} onClick={() => (setR({ ...r, activities: [...r.activities, extra.trim()] }), setExtra(""))} className="min-h-11 rounded-md border border-border bg-card px-3 text-sm disabled:opacity-40">
            {aText.activityAdd}
          </button>
        </div>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">{aText.noteQ}</h3>
        <textarea data-testid="a-note" value={r.note} placeholder={aText.notePlaceholder} aria-label={aText.noteQ} onChange={(e) => setR({ ...r, note: e.target.value })} className="min-h-28 w-full rounded-md border border-border bg-background p-2" />
      </div>
      <PrimaryButton testId="a-review-save" onClick={() => onSave(r)}>
        {aText.saveReview}
      </PrimaryButton>
    </section>
  )
}

function History({ days, today, onOpen, onMenu }: { days: DaysA; today: string; onOpen: (d: string) => void; onMenu: () => void }) {
  const keys = Array.from(new Set([today, ...Object.keys(days)])).sort().reverse()
  let lastMonth = ""
  return (
    <section data-testid="a-history" className="flex flex-col gap-2">
      <TopBar title={aText.historyTitle} onMenu={onMenu} />
      {keys.map((k) => {
        const d = days[k]
        const ym = k.slice(0, 7)
        const header = ym !== lastMonth
        lastMonth = ym
        const label = k === today ? aText.historyToday : k === addDays(today, -1) ? aText.historyYesterday : shortLabel(k)
        const mdate = new Date(keyToMs(k))
        return (
          <div key={k} className="flex flex-col gap-2">
            {header && <p className="rounded-md bg-muted px-3 py-1.5 font-bold">{`${ckText.months[mdate.getMonth()]} ${mdate.getFullYear()}`}</p>}
            <button type="button" data-testid={`a-day-${k}`} data-done={!!d?.review} onClick={() => onOpen(k)} className="rounded-lg border border-border bg-card p-3 text-left">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{label}</span>
                <span aria-hidden="true" className={d?.review ? "text-sky-400" : "opacity-30"}>{"✓"}</span>
              </div>
              {d?.pledge && (
                <p className="mt-2 flex items-center gap-2">
                  <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full bg-violet-500/30">{"✋"}</span>
                  {aText.madePledge}
                </p>
              )}
              {d?.review && (
                <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-y-1 text-sm">
                  <dt className="text-muted-foreground">{aText.rowDifficulty}</dt>
                  <dd data-testid="a-day-diff">
                    <span aria-hidden="true" className={["text-emerald-400", "text-sky-400", "text-slate-400", "text-amber-400", "text-rose-400"][d.review.difficulty]}>
                      {["●", "■", "◆", "▲", "✖"][d.review.difficulty]}{" "}
                    </span>
                    {aText.difficulty[d.review.difficulty]}
                  </dd>
                  {d.review.mood !== null && (
                    <>
                      <dt className="text-muted-foreground">{aText.rowMood}</dt>
                      <dd>{aText.moodFaces[d.review.mood]}</dd>
                    </>
                  )}
                  {d.review.activities.length > 0 && (
                    <>
                      <dt className="text-muted-foreground">{aText.rowActivities}</dt>
                      <dd>{d.review.activities.join(", ")}</dd>
                    </>
                  )}
                </dl>
              )}
              {!d && <p className="mt-2 text-sm text-muted-foreground">{aText.emptyDay}</p>}
            </button>
          </div>
        )
      })}
    </section>
  )
}

function Notes({ days, onMenu, onAdd }: { days: DaysA; onMenu: () => void; onAdd: () => void }) {
  const notes = notesOf(days)
  return (
    <section data-testid="a-notes" className="flex flex-col gap-3">
      <TopBar title={aText.notesTitle} onMenu={onMenu} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{aText.notesPrivate}</p>
        <span className="text-sm text-sky-400">{aText.backUp}</span>
      </div>
      {notes.length === 0 ? (
        <p data-testid="a-notes-empty" className="text-sm text-muted-foreground">
          {aText.notesEmpty}
        </p>
      ) : (
        notes.map((n) => (
          <Card key={n.date}>
            <p className="text-xs text-muted-foreground">{dateLabel(n.date)}</p>
            <p className="text-sm">{n.note}</p>
          </Card>
        ))
      )}
      <button type="button" data-testid="a-notes-add" aria-label={aText.addNote} onClick={onAdd} className="fixed bottom-20 right-4 z-10 inline-flex size-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
        {"+"}
      </button>
    </section>
  )
}

function Reminders({ onBack }: { onBack: () => void }) {
  const [list, setList] = useLabState<Reminder[]>("checkin", "a", "reminders", REMINDERS)
  const names = [aText.remindPledge, aText.remindReview]
  const set = (i: number, p: Partial<Reminder>) => setList(list.map((r, k) => (k === i ? { ...r, ...p } : r)))
  return (
    <section data-testid="a-reminders" className="flex flex-col gap-3">
      <Head title={aText.remindersTitle} onBack={onBack} inferred />
      <p className="text-sm text-muted-foreground">{aText.remindersLine}</p>
      {list.map((r, i) => (
        <Card key={names[i]}>
          <div className="flex min-h-11 items-center justify-between gap-2">
            <span>{names[i]}</span>
            <button type="button" data-testid={`a-remind-on-${i}`} aria-pressed={r.on} onClick={() => set(i, { on: !r.on })} className="min-h-11 rounded-full border border-border px-3 text-sm">
              {r.on ? aText.remindOn : aText.remindOff}
            </button>
          </div>
          <input type="time" data-testid={`a-remind-time-${i}`} aria-label={aText.remindTime(names[i])} value={r.time} onChange={(e) => e.target.value && set(i, { time: e.target.value })} className="min-h-11 rounded-md border border-border bg-background px-2" />
        </Card>
      ))}
    </section>
  )
}
