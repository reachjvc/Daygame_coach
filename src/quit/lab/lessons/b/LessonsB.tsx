"use client"

import { useEffect, useState } from "react"
import { OtherScreen } from "../../checkin/shared/Bits"
import { ckText } from "../../checkin/shared/text"
import { Card, FadeRow, Head, NotSourced, Placeholder, PlaceholderScreen, ShareBtn, Tabs } from "../../progress/shared/Bits"
import { sharedText } from "../../progress/shared/text"
import { Confetti, FixedNav, Flame, NavSpace, SampleTag, Sheet, SkipBar, useLessonState } from "../shared/Bits"
import { dayNumber, moduleOpen, streakEnding, taskOpen } from "../shared/logic"
import { lsText } from "../shared/text"
import { bText } from "./text"

interface Ledger {
  day: number
  reason: "open" | "day"
  amt: number
}
interface BState {
  startedAt: number
  skips: number
  done: Record<string, number[]>
  dayComplete: number[]
  thumbs: Record<string, "up" | "down">
  affirm: Record<string, string>
  fav: Record<string, boolean>
  saved: Record<string, boolean>
  coins: number
  ledger: Ledger[]
  bannerGone: boolean
  collapsed: boolean
  course: { startDay: number; completed: number[] } | null
}
const INITIAL: BState = {
  startedAt: 0,
  skips: 0,
  done: {},
  dayComplete: [],
  thumbs: {},
  affirm: {},
  fav: {},
  saved: {},
  coins: 0,
  ledger: [],
  bannerGone: false,
  collapsed: false,
  course: null,
}

type Screen = "home" | "reading" | "quote" | "affirm" | "wallet" | "course" | "courseday" | "guide" | "chip" | "menu" | "saved" | "bonus" | "toolkit" | "tab"

const dateLine = () => {
  const d = new Date()
  return `${ckText.weekdaysLong[d.getDay()]}, ${sharedText.months[d.getMonth()]} ${d.getDate()}`
}

/** Header with a centred title, a back button and an optional right slot. */
function BHead({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <button type="button" data-testid="screen-back" aria-label={lsText.back} onClick={onBack} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-lg">{"‹"}</button>
      <h2 data-testid="b-head-title" className="min-w-0 flex-1 truncate text-center text-lg font-semibold">{title}</h2>
      <div className="flex min-w-11 shrink-0 justify-end gap-1">{right}</div>
    </div>
  )
}

const hourGreeting = () => {
  const h = new Date().getHours()
  return bText.greeting[h < 12 ? 0 : h < 18 ? 1 : 2]
}

/** Copy B: three daily tasks in order, day chips and streak, a three-page reading, a line of the day, a writing sheet, a finished-day sheet, coins, a five-day course. */
export function LessonsB() {
  const [s, update] = useLessonState<BState>("b", INITIAL)
  const [screen, setScreen] = useState<Screen>("home")
  const [tab, setTab] = useState(0)
  const [page, setPage] = useState(0)
  const [module, setModule] = useState(1)
  const [sheet, setSheet] = useState(false)
  const day = dayNumber(s.startedAt, Date.now(), s.skips)
  const key = String(day)
  const doneToday = s.done[key] ?? []
  const taskDone = [0, 1, 2].map((i) => doneToday.includes(i))

  useEffect(() => {
    if (!s.startedAt) update({ startedAt: Date.now() })
  }, [s.startedAt, update])
  useEffect(() => {
    if (!s.startedAt) return
    update((c) => (c.ledger.some((l) => l.day === day && l.reason === "open") ? {} : { coins: c.coins + 25, ledger: [...c.ledger, { day, reason: "open", amt: 25 }] }))
  }, [day, s.startedAt, update])

  const finish = (i: number) => {
    const next = [...new Set([...doneToday, i])]
    const all = [0, 1, 2].every((n) => next.includes(n))
    update((c) => ({
      done: { ...c.done, [key]: next },
      ...(all && !c.dayComplete.includes(day) ? { dayComplete: [...c.dayComplete, day], coins: c.coins + 50, ledger: [...c.ledger, { day, reason: "day" as const, amt: 50 }] } : {}),
    }))
    setScreen("home")
    if (all && !s.dayComplete.includes(day)) setSheet(true)
  }
  const streak = streakEnding(s.dayComplete, day)
  const goHome = () => setScreen("home")

  let body: React.ReactNode
  if (screen === "reading") {
    body = <Reading page={page} setPage={setPage} thumb={s.thumbs[key]} onThumb={(t) => update((c) => ({ thumbs: { ...c.thumbs, [key]: t } }))} onBack={goHome} onComplete={() => { setPage(0); finish(0) }} />
  } else if (screen === "quote") {
    body = (
      <Quote
        fav={!!s.fav[key]}
        onFav={() => update((c) => ({ fav: { ...c.fav, [key]: !c.fav[key] } }))}
        onBack={goHome}
        onComplete={() => finish(1)}
      />
    )
  } else if (screen === "affirm") {
    body = <Affirm initial={s.affirm[key] ?? ""} onClose={goHome} onDone={(t) => { update((c) => ({ affirm: { ...c.affirm, [key]: t } })); finish(2) }} />
  } else if (screen === "wallet") {
    body = <Wallet s={s} onBack={goHome} onCourse={() => setScreen("course")} />
  } else if (screen === "course") {
    body = (
      <Course
        course={s.course}
        day={day}
        onBack={() => setScreen("wallet")}
        onBegin={() => update({ course: s.course ?? { startDay: day, completed: [] } })}
        onModule={(k) => { setModule(k); setScreen("courseday") }}
      />
    )
  } else if (screen === "courseday") {
    body = (
      <section data-testid="b-courseday" className="flex flex-col gap-3">
        <BHead title={bText.modules[module - 1] ?? bText.courseDayBar} onBack={() => setScreen("course")} right={<button type="button" data-testid="b-courseday-mark" aria-label={lsText.bookmark} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"🔖"}</button>} />
        <p className="text-center text-xs text-muted-foreground">{lsText.minRead(3)}</p>
        <Illustration />
        <Placeholder />
        <Placeholder />
        <button
          type="button"
          data-testid="b-courseday-complete"
          onClick={() => { update((c) => ({ course: c.course ? { ...c.course, completed: [...new Set([...c.course.completed, module])] } : c.course })); setScreen("course") }}
          className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white"
        >
          {lsText.complete}
        </button>
      </section>
    )
  } else if (screen === "guide") {
    body = (
      <section data-testid="b-guide" className="flex flex-col gap-3">
        <Head title={bText.guideTag} onBack={goHome} right={<ShareBtn text={bText.guideTitle} testId="b-guide-share" />} />
        <div className="rounded-lg bg-rose-900/40 p-4">
          <span className="rounded-full bg-purple-700 px-2 py-0.5 text-xs text-white">{bText.guideTag}</span>
          <h3 className="mt-2 text-2xl font-bold">{bText.guideTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{bText.guideBy}</p>
        </div>
        <Placeholder />
        <Placeholder />
        <Placeholder />
        <button type="button" data-testid="b-guide-menu" aria-label={bText.guideMenu} onClick={() => setScreen("tab")} className="inline-flex size-12 items-center justify-center self-end rounded-full bg-indigo-700 text-white">
          {"≡"}
        </button>
      </section>
    )
  } else if (screen === "chip") {
    body = <PlaceholderScreen title={bText.tasksTitle} onBack={goHome} />
  } else if (screen === "menu" || screen === "saved" || screen === "bonus" || screen === "tab") {
    body = <PlaceholderScreen title={bText.placeholderTitle} onBack={() => setScreen(screen === "tab" ? "guide" : "home")} />
  } else if (screen === "toolkit") {
    body = <OtherScreen title={bText.toolkitTitle} onBack={goHome} />
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button type="button" data-testid="b-menu" aria-label={bText.menuLabel} onClick={() => setScreen("menu")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
              {"☰"}
            </button>
            <button type="button" data-testid="b-saved" aria-label={bText.bookmarksLabel} onClick={() => setScreen("saved")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
              {"🔖"}
            </button>
          </div>
          <button type="button" data-testid="b-coins" aria-label={bText.coinsLabel} onClick={() => setScreen("wallet")} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-card px-3 text-sm">
            <span className="text-amber-400">{"●"}</span>
            <span data-testid="b-coin-balance">{s.coins}</span>
          </button>
        </div>
        {tab === 0 ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p data-testid="b-date" className="text-sm text-muted-foreground">{dateLine()}</p>
                <h2 className="text-2xl font-bold">{hourGreeting()}</h2>
              </div>
              <div data-testid="b-streak" data-days={streak} className="flex size-24 shrink-0 flex-col items-center justify-center rounded-[40%] bg-indigo-800 text-white">
                <span className="text-3xl font-bold">{streak}</span>
                <span className="text-xs">{bText.streakLabel}</span>
              </div>
            </div>
            <Chips day={day} complete={s.dayComplete} onChip={() => setScreen("chip")} />
            <TaskCard
              day={day}
              taskDone={taskDone}
              collapsed={s.collapsed}
              onCollapse={() => update({ collapsed: !s.collapsed })}
              onOpen={(i) => setScreen(["reading", "quote", "affirm"][i] as Screen)}
              onBonus={() => setScreen("bonus")}
            />
            {!s.bannerGone && (
              <div data-testid="b-banner" className="relative rounded-lg bg-rose-900/50 p-4 pr-12">
                <p className="font-semibold">{bText.banner}</p>
                <button type="button" data-testid="b-banner-go" onClick={() => setScreen("guide")} className="mt-2 inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm">
                  {bText.bannerBtn}
                </button>
                <button type="button" data-testid="b-banner-x" aria-label={lsText.dismiss} onClick={() => update({ bannerGone: true })} className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full">
                  {"✕"}
                </button>
              </div>
            )}
          </>
        ) : tab === 1 ? (
          <OtherScreen title={bText.toolkitTitle} onBack={null} />
        ) : (
          <PlaceholderScreen title={bText.tabs[tab]} onBack={null} />
        )}
      </div>
    )
  }

  const showNav = screen === "home"
  return (
    <div data-testid="lessons-b" className="flex flex-col gap-3">
      <SkipBar day={day} onSkip={() => update((c) => ({ skips: c.skips + 1 }))} />
      {body}
      {showNav && <FixedNav items={bText.tabs} value={tab} onChange={setTab} id="b-tab" />}
      {showNav && <NavSpace />}
      {sheet && (
        <Sheet testId="b-daydone" onClose={() => setSheet(false)} handle>
          <div className="relative flex flex-col items-center gap-2 overflow-hidden py-6 text-center">
            <Confetti />
            <p className="text-sm">{bText.dcLine1}</p>
            <div className="relative mt-10 flex size-28 items-center justify-center rounded-[40%] bg-indigo-800 text-4xl font-bold text-white">
              <span className="absolute -top-8"><Flame size={44} flicker /></span>
              <span data-testid="b-daydone-streak">{streak}</span>
            </div>
            <p className="text-sm">{bText.dcLine2}</p>
            <p className="text-xs text-muted-foreground">{bText.dcLine3}</p>
            <p data-testid="b-daydone-reward" className="font-semibold">{bText.dcReward}</p>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Chips({ day, complete, onChip }: { day: number; complete: number[]; onChip: () => void }) {
  const count = Math.max(6, day + 2)
  return (
    <FadeRow className="items-end gap-2 py-1">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
        const isToday = n === day
        const done = complete.includes(n)
        return (
          <button
            key={n}
            type="button"
            data-testid={`b-chip-${n}`}
            data-state={isToday ? "today" : n < day ? "past" : "future"}
            onClick={onChip}
            className={`flex shrink-0 flex-col items-center justify-center rounded-xl border border-border ${isToday ? "min-h-20 min-w-20 bg-card" : "min-h-16 min-w-16 text-muted-foreground"}`}
          >
            {done ? <Flame size={isToday ? 30 : 20} /> : <span className="size-3 rounded-full bg-muted-foreground/60" />}
            <span className="mt-1 text-sm">{isToday ? bText.today : bText.dayChip(n)}</span>
          </button>
        )
      })}
    </FadeRow>
  )
}

function TaskCard({
  day,
  taskDone,
  collapsed,
  onCollapse,
  onOpen,
  onBonus,
}: {
  day: number
  taskDone: boolean[]
  collapsed: boolean
  onCollapse: () => void
  onOpen: (i: number) => void
  onBonus: () => void
}) {
  const all = taskDone.every(Boolean)
  const hide = collapsed || all
  return (
    <Card testId="b-tasks" className="flex flex-col gap-2">
      <button type="button" data-testid="b-tasks-head" aria-label={bText.collapse} onClick={onCollapse} className="flex min-h-11 w-full items-center justify-between text-left" data-day={day}>
        <span>
          <span className="block font-semibold">{all ? bText.tasksDone : bText.tasksTitle}</span>
          {!all && <span className="block text-xs text-muted-foreground">{bText.tasksSub}</span>}
        </span>
        <span aria-hidden="true">{hide ? "▾" : "▴"}</span>
      </button>
      {all && (
        <button type="button" data-testid="b-bonus" onClick={onBonus} className="min-h-11 rounded-full border border-border px-3 text-sm">
          {bText.bonus}
        </button>
      )}
      {!hide &&
        bText.tasks.map((t, i) => {
          const done = taskDone[i]
          const open = taskOpen(taskDone, i)
          const current = !done && open
          return (
            <button
              key={t.title}
              type="button"
              data-testid={`b-task-${i}`}
              data-state={done ? "done" : current ? "current" : "locked"}
              disabled={!open && !done}
              aria-disabled={!open && !done}
              onClick={() => (done ? undefined : onOpen(i))}
              className={`flex min-h-16 w-full items-center gap-3 rounded-lg border border-border p-3 text-left ${current ? "bg-card shadow-md" : "opacity-70"}`}
            >
              <span aria-hidden="true" className="w-6 text-center">{done ? "✔" : current ? "◉" : "🔒"}</span>
              <span aria-hidden="true" data-testid={`b-task-icon-${i}`} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-900/50">{t.icon}</span>
              <span>
                <span className="block font-medium">{t.title}</span>
                <span className="block text-xs text-muted-foreground">{open || done ? lsText.minRead(t.mins) : bText.lockedTask}</span>
              </span>
            </button>
          )
        })}
    </Card>
  )
}

function Illustration() {
  return (
    <div className="flex h-36 items-center justify-center rounded-lg bg-sky-900/40" aria-hidden="true">
      <svg width="120" height="90" viewBox="0 0 120 90">
        <circle cx="40" cy="50" r="26" fill="#38bdf8" opacity="0.5" />
        <path d="M10 80 Q60 20 110 70" stroke="#a5b4fc" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="86" cy="30" r="10" fill="#fcd34d" />
      </svg>
    </div>
  )
}

function Reading({ page, setPage, thumb, onThumb, onBack, onComplete }: { page: number; setPage: (n: number) => void; thumb?: "up" | "down"; onThumb: (t: "up" | "down") => void; onBack: () => void; onComplete: () => void }) {
  const p = bText.pages[page]
  const last = page === bText.pages.length - 1
  return (
    <section data-testid="b-reading" data-page={page} className="flex flex-col gap-3">
      <BHead title={bText.readingBar} onBack={onBack} right={<button type="button" data-testid="b-reading-mark" aria-label={lsText.bookmark} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">{"🔖"}</button>} />
      {page === 0 && (
        <>
          <SampleTag />
          <h3 className="text-center text-xl font-bold">{bText.readingTitle}</h3>
          <p className="text-center text-xs text-muted-foreground">{lsText.minRead(3)}</p>
          <Illustration />
          <div data-testid="b-pullquote" className="flex flex-col gap-2 rounded-lg border-l-4 border-sky-500 pl-2">
            <Placeholder />
            <Placeholder />
          </div>
        </>
      )}
      {p.heads.map((h) => (
        <h4 key={h} className="font-bold">{h}</h4>
      ))}
      {p.body.map((t) => (
        <p key={t} className="text-sm leading-relaxed">{t}</p>
      ))}
      {page === 1 && <Placeholder />}
      <button type="button" data-testid="b-reading-next" onClick={() => (last ? onComplete() : setPage(page + 1))} className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white">
        {last ? lsText.complete : lsText.next}
      </button>
      <div className="flex justify-center gap-2" aria-hidden="true">
        {bText.pages.map((x, i) => (
          <span key={x.heads[0]} className={`h-1 w-8 rounded ${i <= page ? "bg-sky-300" : "bg-border"}`} />
        ))}
      </div>
      {last && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">{bText.howFind}</p>
          <div className="flex gap-4">
            <button type="button" data-testid="b-thumb-up" aria-label={lsText.thumbsUp} aria-pressed={thumb === "up"} onClick={() => onThumb("up")} className={`inline-flex size-11 items-center justify-center rounded-full border border-border text-xl ${thumb === "up" ? "bg-primary/30" : ""}`}>
              {"👍"}
            </button>
            <button type="button" data-testid="b-thumb-down" aria-label={lsText.thumbsDown} aria-pressed={thumb === "down"} onClick={() => onThumb("down")} className={`inline-flex size-11 items-center justify-center rounded-full border border-border text-xl ${thumb === "down" ? "bg-primary/30" : ""}`}>
              {"👎"}
            </button>
          </div>
          <Placeholder className="w-full" />
        </div>
      )}
    </section>
  )
}

function saveQuoteImage(text: string) {
  try {
    const c = document.createElement("canvas")
    c.width = 900
    c.height = 600
    const g = c.getContext("2d")
    if (!g) return
    g.fillStyle = "#fdba74"
    g.fillRect(0, 0, 900, 600)
    g.fillStyle = "#1e1b4b"
    g.font = "bold 36px sans-serif"
    g.textAlign = "center"
    const words = text.split(" ")
    let line = ""
    let y = 260
    for (const w of words) {
      if (g.measureText(`${line}${w} `).width > 760) {
        g.fillText(line.trim(), 450, y)
        line = ""
        y += 48
      }
      line += `${w} `
    }
    g.fillText(line.trim(), 450, y)
    const a = document.createElement("a")
    a.href = c.toDataURL("image/png")
    a.download = bText.imageFile
    a.click()
  } catch {
    // no canvas here
  }
}

function Quote({ fav, onFav, onBack, onComplete }: { fav: boolean; onFav: () => void; onBack: () => void; onComplete: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1500)
    return () => clearTimeout(id)
  }, [])
  return (
    <section data-testid="b-quote" className="flex min-h-[70dvh] flex-col gap-3 rounded-xl bg-gradient-to-b from-orange-300/30 to-orange-100/10 p-3">
      <Head title={bText.quoteBar} onBack={onBack} right={
        <>
          <button type="button" data-testid="b-fav" aria-label={bText.favourite} aria-pressed={fav} onClick={onFav} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card">
            {fav ? "♥" : "♡"}
          </button>
          <ShareBtn text={bText.quoteLine} testId="b-quote-share" />
        </>
      } />
      <SampleTag />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 text-center">
        <p className="text-2xl font-bold">{bText.quoteLine}</p>
        <Placeholder className="w-40" />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="b-quote-complete"
          disabled={!ready}
          onClick={onComplete}
          className="min-h-12 flex-1 rounded-full bg-indigo-700 px-4 font-medium text-white disabled:opacity-40"
        >
          {ready ? lsText.complete : lsText.loading}
        </button>
        <button type="button" data-testid="b-quote-image" aria-label={bText.saveImage} onClick={() => saveQuoteImage(bText.quoteLine)} className="inline-flex size-12 items-center justify-center rounded-lg border border-border bg-card">
          {"▣"}
        </button>
      </div>
    </section>
  )
}

function Affirm({ initial, onClose, onDone }: { initial: string; onClose: () => void; onDone: (t: string) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [text, setText] = useState(initial)
  useEffect(() => {
    if (step !== 1) return
    const id = setTimeout(() => setStep(2), 800)
    return () => clearTimeout(id)
  }, [step])
  return (
    <Sheet testId="b-affirm" onClose={onClose}>
      <div className="flex flex-col gap-3 pt-8" data-step={step}>
        <h3 className="text-center font-semibold">{bText.affirmBar}</h3>
        <SampleTag />
        <div className="h-1 rounded bg-border"><div className="h-1 rounded bg-sky-400" style={{ width: step === 0 ? "33%" : step === 1 ? "66%" : "100%" }} /></div>
        {step === 0 && (
          <>
            <p className="font-semibold">{bText.affirmPrompt}</p>
            <button type="button" data-testid="b-affirm-next" onClick={() => setStep(1)} className="min-h-12 self-end rounded-full bg-indigo-700 px-6 font-medium text-white">
              {bText.affirmNext}
            </button>
          </>
        )}
        {step === 1 && <p data-testid="b-affirm-spin" className="py-10 text-center text-muted-foreground">{lsText.loading}</p>}
        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">{bText.affirmEntryPrompt}</p>
            <textarea data-testid="b-affirm-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={bText.affirmHint} aria-label={bText.affirmHint} rows={5} className="rounded-md border border-border bg-background p-2" />
            <button type="button" data-testid="b-affirm-done" onClick={() => onDone(text)} className="min-h-12 self-end rounded-full bg-indigo-700 px-6 font-medium text-white">
              {bText.affirmDone}
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}

function Wallet({ s, onBack, onCourse }: { s: BState; onBack: () => void; onCourse: () => void }) {
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState(0)
  const rows = s.ledger.filter(() => filter !== 1)
  const now = new Date()
  return (
    <section data-testid="b-wallet" className="flex flex-col gap-3">
      <Head title={bText.walletTitle} onBack={onBack} right={<span data-testid="b-wallet-balance" className="rounded-full border border-border px-3 py-1 text-sm">{s.coins}</span>} />
      <Tabs items={[bText.tabStore, bText.tabHistory]} value={tab} onChange={setTab} id="b-rc-tab" />
      {tab === 0 ? (
        <>
          <h3 className="font-semibold">{bText.courses}</h3>
          <FadeRow className="gap-3">
            <button type="button" data-testid="b-course-card" onClick={onCourse} className="flex w-60 shrink-0 flex-col gap-1 rounded-lg border border-border bg-card p-2 text-left">
              <span className="text-xs text-muted-foreground">{bText.courseCard.kind} · {bText.courseCard.days}</span>
              <Illustration />
              <span className="flex items-center gap-1"><span aria-hidden="true" className="text-amber-400">{"●"}</span><NotSourced /></span>
              <span className="font-semibold">{bText.courseCard.title}</span>
              <span className="text-xs text-muted-foreground">{bText.courseCard.cat}</span>
              <NotSourced />
              <NotSourced />
            </button>
          </FadeRow>
          <h3 className="font-semibold">{bText.goodies}</h3>
          <div className="grid grid-cols-2 gap-2">
            <Card className="flex h-24 items-center justify-center">{bText.giftTile}</Card>
            <Card className="flex h-24 items-center justify-center">{bText.giftTile}</Card>
          </div>
        </>
      ) : (
        <>
          <Tabs items={bText.filters} value={filter} onChange={setFilter} id="b-rc-filter" />
          <h3 className="text-sm font-semibold">{`${sharedText.months[now.getMonth()]}, ${now.getFullYear()}`}</h3>
          {rows.map((r) => (
            <div key={`${r.day}-${r.reason}`} data-testid="b-ledger-row" className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span>
                {bText.historyRows[r.reason]}
                <span className="block text-xs text-muted-foreground">{lsText.labDay(r.day)}</span>
              </span>
              <span>{`+${r.amt}`}</span>
            </div>
          ))}
          <Placeholder />
        </>
      )}
    </section>
  )
}

function Course({ course, day, onBack, onBegin, onModule }: { course: { startDay: number; completed: number[] } | null; day: number; onBack: () => void; onBegin: () => void; onModule: (k: number) => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1500)
    return () => clearTimeout(id)
  }, [])
  const done = course?.completed.length ?? 0
  return (
    <section data-testid="b-course" className="flex flex-col gap-3">
      <Head title={bText.courseTitle} onBack={onBack} right={!course && !ready ? <span data-testid="b-course-spin" aria-hidden="true" className="inline-block size-5 animate-spin rounded-full border-2 border-border border-t-sky-400" /> : undefined} />
      {!course ? (
        <>
          <Illustration />
          <p className="text-xs text-muted-foreground">{bText.courseCategory}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm"><NotSourced /><span>{bText.usersDone}</span></div>
          <div className="flex flex-wrap items-center gap-2 text-sm"><span>{bText.daysRating}</span><NotSourced /></div>
          <button type="button" data-testid="b-course-begin" disabled={!ready} onClick={onBegin} className="min-h-12 rounded-full bg-indigo-700 px-4 font-medium text-white disabled:opacity-40">
            {bText.beginCourse}
          </button>
          <h3 className="font-semibold">{bText.aboutCourse}</h3>
          <Placeholder />
        </>
      ) : (
        <>
          <div>
            <p data-testid="b-course-progress" className="text-sm">{bText.courseProgress(done)}</p>
            <div className="mt-1 h-2 rounded bg-border"><div className="h-2 rounded bg-sky-400" style={{ width: `${(done / 5) * 100}%` }} /></div>
          </div>
          <h3 className="font-semibold">{bText.courseHead}</h3>
          <p className="text-sm text-muted-foreground">{bText.courseLine}</p>
          {[1, 2, 3, 4, 5].map((k) => {
            const open = moduleOpen(k, course.startDay, day, course.completed)
            const finished = course.completed.includes(k)
            return (
              <div key={k} className="flex flex-col gap-1">
              {k > 1 && <span data-testid="b-connector" aria-hidden="true" className="mx-auto h-4 border-l-2 border-dotted border-muted-foreground" />}
              <div data-testid={`b-module-${k}`} data-state={finished ? "done" : open ? "open" : "locked"} className="flex min-h-16 items-center justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{bText.moduleDay(k)}</p>
                  {k <= 3 ? <p className="font-medium">{bText.modules[k - 1]}</p> : <Placeholder />}
                </div>
                {finished ? (
                  <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs text-white">{bText.completed}</span>
                ) : open ? (
                  <button type="button" data-testid={`b-module-begin-${k}`} onClick={() => onModule(k)} className="min-h-11 rounded-full bg-indigo-700 px-4 text-sm text-white">
                    {bText.begin}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">{`🔒 ${bText.locked}`}</span>
                )}
              </div>
              </div>
            )
          })}
        </>
      )}
    </section>
  )
}

