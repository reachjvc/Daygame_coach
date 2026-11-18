"use client"

import { useEffect, useState } from "react"
import { OtherScreen } from "../../checkin/shared/Bits"
import { Card, Head, InferredTag, NotSourced, Placeholder, PlaceholderScreen, Tabs } from "../../progress/shared/Bits"
import { qdText } from "../../quitdate/shared/text"
import { SampleTag, Sheet, SkipBar, useLessonState } from "../shared/Bits"
import { dayNumber, journeyDayOpen } from "../shared/logic"
import { eText } from "./text"

interface EState {
  startedAt: number
  skips: number
  toured: boolean
  learnSeen: boolean
  completed: number[]
  points: number
  comments: string[]
}
const INITIAL: EState = { startedAt: 0, skips: 0, toured: false, learnSeen: false, completed: [], points: 0, comments: [] }
const JOURNEY_POINTS = 350
const VIDEO_SECONDS = 420

type View = { k: "root" } | { k: "journey" } | { k: "day"; n: number } | { k: "med"; n: number } | { k: "ph"; t: string } | { k: "locked" }
const ROOT: View = { k: "root" }

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

/** Copy E: free starter journey, one day at a time, plus short audio practices. Home with points, rank and a first-run tour; Learn with Journeys and Meditations. */
export function LessonsE() {
  const [s, update] = useLessonState<EState>("e", INITIAL)
  const [tab, setTab] = useState(0)
  const [sub, setSub] = useState(0)
  const [view, setView] = useState<View>(ROOT)
  const [tourStep, setTourStep] = useState(0)
  const day = dayNumber(s.startedAt, Date.now(), s.skips)
  useEffect(() => {
    if (!s.startedAt) update({ startedAt: Date.now() })
  }, [s.startedAt, update])
  const nextDay = Math.min(7, s.completed.length + 1)
  const allDone = s.completed.length >= 7
  const rank = s.points > 0 ? 1 : 0
  const goRoot = () => setView(ROOT)
  const openDay = (n: number) => setView(n === 1 ? { k: "day", n } : { k: "ph", t: eText.dayLabel(n) })

  let body: React.ReactNode
  if (view.k === "ph") body = <PlaceholderScreen title={view.t} onBack={goRoot} />
  else if (view.k === "locked") {
    body = (
      <section data-testid="e-locked" className="flex flex-col gap-3">
        <Head title={eText.lockedTitle} onBack={goRoot} />
        <div data-testid="not-copied-tile" className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
          {qdText.notCopiedPayment}
        </div>
      </section>
    )
  } else if (view.k === "journey") {
    body = (
      <section data-testid="e-journey" className="flex flex-col gap-3">
        <Head title={`${eText.crumbJourneys} / ${eText.journeyTitle}`} onBack={goRoot} />
        <Blocks />
        <Card>
          <h3 className="text-xl font-bold">{eText.journeyTitle}</h3>
          <p className="text-sm text-muted-foreground">{eText.journeySub}</p>
          <div className="mt-2 h-2 rounded bg-border"><div className="h-2 rounded bg-sky-400" style={{ width: `${(s.completed.length / 7) * 100}%` }} /></div>
          <p data-testid="e-journey-progress" className="mt-1 text-sm">{eText.progress(s.completed.length)}</p>
        </Card>
        <div className="flex items-center gap-2">
          <InferredTag />
          <span className="text-xs text-muted-foreground">{eText.ruleTag}</span>
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const done = s.completed.includes(n)
          const isOpen = journeyDayOpen(n, day, s.completed)
          return (
            <button
              key={n}
              type="button"
              data-testid={`e-day-${n}`}
              data-state={done ? "done" : isOpen ? "open" : "locked"}
              disabled={!isOpen && !done}
              onClick={() => openDay(n)}
              className={`flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left ${isOpen || done ? "" : "opacity-40"}`}
            >
              <span aria-hidden="true" className="w-6 text-center">{done ? "✔" : isOpen ? "▸" : "🔒"}</span>
              <span className="flex-1">
                <span className="block font-medium">{eText.dayLabel(n)}</span>
                {n === 1 ? <span className="block text-xs text-muted-foreground">{`${eText.videoType} · ${eText.videoLength}`}</span> : <Placeholder />}
              </span>
              <NotSourced />
            </button>
          )
        })}
      </section>
    )
  } else if (view.k === "day") {
    body = (
      <DayPage
        comments={s.comments}
        onComment={(t) => update({ comments: [...s.comments, t] })}
        onBack={() => setView({ k: "journey" })}
        onComplete={() => {
          update((c) => (c.completed.includes(1) ? {} : { completed: [...c.completed, 1], points: c.points + JOURNEY_POINTS }))
          setView({ k: "journey" })
        }}
      />
    )
  } else if (view.k === "med") {
    body = <Meditation n={view.n} onBack={goRoot} />
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <Tabs items={eText.tabs} value={tab} onChange={setTab} id="e-tab" scroll />
        {tab === 0 && (
          <section data-testid="e-home" className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-blue-900 p-3 text-center">
              <div><p className="text-xs">{eText.points}</p><p data-testid="e-points" className="text-lg font-bold">{s.points}</p></div>
              <div><p className="text-xs">{eText.streak}</p><p className="text-lg font-bold">{eText.streakDays(0)}</p></div>
              <div><p className="text-xs">{eText.rank}</p><p data-testid="e-rank" className="text-lg font-bold">{eText.ranks[rank]}</p></div>
            </div>
            <div>
              <h2 className="text-xl font-bold">{eText.greeting}</h2>
              <p className="text-sm text-muted-foreground">{eText.greetingLine}</p>
            </div>
            <h3 className="font-semibold">{eText.activities}</h3>
            <button
              type="button"
              data-testid="e-journey-card"
              onClick={() => (allDone ? setView({ k: "journey" }) : nextDay === 1 ? setView({ k: "day", n: 1 }) : setView({ k: "ph", t: eText.dayLabel(nextDay) }))}
              className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left"
            >
              <span className="flex-1 font-medium">{allDone ? eText.journeyDone : eText.journeyCard(nextDay, 7)}</span>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sm text-sky-300">{eText.reward(JOURNEY_POINTS)}</span>
            </button>
            <button type="button" data-testid="e-discussion" onClick={() => setView({ k: "ph", t: eText.discussion })} className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-card p-3 text-left">
              <span>{eText.discussion}</span>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-sm text-sky-300">{eText.reward(50)}</span>
            </button>
            <button type="button" data-testid="e-goals" onClick={() => setView({ k: "ph", t: eText.goals })} className="flex min-h-14 items-center rounded-lg border border-border bg-card p-3 text-left">
              {eText.goals}
            </button>
          </section>
        )}
        {(tab === 1 || tab === 2) && <OtherScreen title={eText.tabs[tab]} onBack={null} />}
        {tab === 3 && (
          <section data-testid="e-learn" className="flex flex-col gap-3">
            <Tabs items={eText.subTabs} value={sub} onChange={setSub} id="e-sub" />
            {sub === 0 ? (
              <>
                <h3 className="font-semibold">{eText.currentJourney}</h3>
                <button type="button" data-testid="e-current" onClick={() => setView({ k: "journey" })} className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
                  <Blocks small />
                  <span className="flex-1 font-medium">{eText.journeyTitle}</span>
                </button>
                <h3 className="font-semibold">{eText.journeyList}</h3>
                <p className="text-xs text-muted-foreground">{eText.nextRecommended}</p>
                {eText.journeyNames.map((n, i) => (
                  <button key={n} type="button" data-testid={`e-journey-${i}`} onClick={() => setView({ k: "locked" })} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left opacity-70">
                    <span aria-hidden="true">{"🔒"}</span>
                    {n}
                  </button>
                ))}
                <button type="button" data-testid="e-journey-free" onClick={() => setView({ k: "journey" })} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3 text-left">
                  <Blocks small />
                  {eText.journeyTitle}
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold">{eText.medTitle}</h3>
                <p className="text-sm text-muted-foreground">{eText.medLine}</p>
                <div data-testid="e-med-duration" className="flex items-center gap-2 text-sm"><span>{eText.medLength}</span><NotSourced /></div>
                <div className="grid grid-cols-2 gap-2">
                  {eText.medNames.map((n, i) => (
                    <button key={n} type="button" data-testid={`e-med-${i}`} onClick={() => setView({ k: "med", n: i })} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-2 text-center">
                      <span className="font-semibold">{n}</span>
                      <NotSourced />
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
        {tab === 4 && <PlaceholderScreen title={eText.tabs[4]} onBack={null} />}
      </div>
    )
  }

  const touring = !s.toured && view.k === "root" && tab === 0
  return (
    <div data-testid="lessons-e" className="flex flex-col gap-3">
      <SkipBar day={day} onSkip={() => update((c) => ({ skips: c.skips + 1 }))} />
      {body}
      {touring && (
        <Sheet testId="e-tour">
          <div data-step={tourStep} className="flex flex-col gap-3">
            {tourStep === 3 ? <p className="text-sm">{eText.tourDaily}</p> : <Placeholder />}
            <div className="flex items-center justify-between">
              <span className="text-xs">{eText.tourStep(tourStep + 1, 6)}</span>
              <button type="button" data-testid="e-tour-next" onClick={() => (tourStep === 5 ? update({ toured: true }) : setTourStep(tourStep + 1))} className="min-h-11 rounded-md bg-sky-600 px-5 text-sm font-medium text-white">
                {tourStep === 5 ? eText.tourFinish : eText.tourNext}
              </button>
            </div>
          </div>
        </Sheet>
      )}
      {s.toured && !s.learnSeen && tab === 3 && view.k === "root" && (
        <Sheet testId="e-learn-intro">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-4xl" aria-hidden="true">{"💡"}</span>
            <h3 className="text-lg font-semibold">{eText.learnTitle}</h3>
            <p className="text-sm">{eText.learnLine}</p>
            <button type="button" data-testid="e-learn-finish" onClick={() => update({ learnSeen: true })} className="min-h-12 w-full rounded-md bg-sky-600 px-4 font-medium text-white">{eText.finish}</button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Blocks({ small }: { small?: boolean }) {
  return (
    <svg width={small ? 44 : 120} height={small ? 36 : 90} viewBox="0 0 120 90" aria-hidden="true" className={small ? "shrink-0" : "mx-auto"}>
      <rect x="10" y="50" width="60" height="30" rx="4" fill="#2563eb" />
      <rect x="45" y="30" width="60" height="30" rx="4" fill="#60a5fa" transform="rotate(-10 75 45)" />
    </svg>
  )
}

/** Player shell: a placeholder frame, play and pause, a bar that moves, a clock. Nothing is played. */
function Player({ seconds, audio }: { seconds: number | null; audio?: boolean }) {
  const [pos, setPos] = useState(0)
  const [play, setPlay] = useState(false)
  useEffect(() => {
    if (!play) return
    const id = setInterval(() => setPos((p) => (seconds !== null && p >= seconds ? p : p + 1)), 1000)
    return () => clearInterval(id)
  }, [play, seconds])
  return (
    <div data-testid="e-player" data-pos={pos} data-playing={play} className="flex flex-col gap-2 rounded-lg border border-border bg-black/60 p-2">
      {!audio && <Placeholder className="min-h-40" />}
      <div className="flex items-center gap-2">
        <button type="button" data-testid="e-play" aria-label={play ? eText.pauseLabel : eText.playLabel} onClick={() => setPlay(!play)} className="inline-flex size-11 items-center justify-center rounded-full bg-white text-black">
          {play ? "❚❚" : "▶"}
        </button>
        <input type="range" aria-label={eText.scrubLabel} min={0} max={seconds ?? 0} value={pos} disabled={seconds === null} onChange={(e) => setPos(Number(e.target.value))} className="min-h-11 flex-1" />
        {seconds !== null ? <span className="text-xs tabular-nums">{`${clock(pos)} / ${clock(seconds)}`}</span> : (
          <span className="flex items-center gap-1 text-xs tabular-nums">{`${clock(pos)} /`}<NotSourced /></span>
        )}
      </div>
    </div>
  )
}

function DayPage({ comments, onComment, onBack, onComplete }: { comments: string[]; onComment: (t: string) => void; onBack: () => void; onComplete: () => void }) {
  const [text, setText] = useState("")
  return (
    <section data-testid="e-day" className="flex flex-col gap-3">
      <Head title={eText.dayTitle} onBack={onBack} />
      <Blocks />
      <h2 className="text-3xl font-bold">{eText.dayTitle}</h2>
      <p className="text-sm text-muted-foreground">{eText.typeLine}</p>
      <Player seconds={VIDEO_SECONDS} />
      <SampleTag />
      <h3 className="font-semibold">{eText.notesHead}</h3>
      {eText.notes.map((n) => (
        <p key={n} className="text-sm leading-relaxed">{n}</p>
      ))}
      <div className="flex items-center gap-2">
        <button type="button" data-testid="e-day-complete" onClick={onComplete} className="min-h-12 flex-1 rounded-md bg-sky-600 px-4 font-medium text-white">{eText.complete}</button>
        <InferredTag />
      </div>
      <h3 className="font-semibold">{eText.commentsHead}</h3>
      <Placeholder />
      {comments.map((c, i) => (
        <p key={`${i}-${c}`} data-testid="e-comment" className="rounded-lg border border-border p-2 text-sm">{c}</p>
      ))}
      <textarea data-testid="e-comment-text" aria-label={eText.commentBox} placeholder={eText.commentBox} rows={2} value={text} onChange={(e) => setText(e.target.value)} className="rounded-md border border-border bg-background p-2" />
      <button type="button" data-testid="e-comment-post" disabled={!text.trim()} onClick={() => { onComment(text.trim()); setText("") }} className="min-h-11 rounded-md border border-border px-4 disabled:opacity-40">{eText.commentPost}</button>
    </section>
  )
}

/** A meditation page was never seen: tagged, with an audio shell. Two carry a short note of ours. */
function Meditation({ n, onBack }: { n: number; onBack: () => void }) {
  const body = eText.medBodies[String(n)]
  if (!body) return <PlaceholderScreen title={eText.medNames[n]} onBack={onBack} />
  return (
    <section data-testid="e-med" className="flex flex-col gap-3">
      <Head title={eText.medNames[n]} onBack={onBack} inferred />
      <Player seconds={null} audio />
      <SampleTag />
      {body.map((p) => (
        <p key={p} data-testid="e-med-line" className="text-sm leading-relaxed">{p}</p>
      ))}
    </section>
  )
}

