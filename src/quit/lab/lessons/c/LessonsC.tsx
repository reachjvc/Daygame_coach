"use client"

import { useEffect, useRef, useState } from "react"
import { OtherScreen } from "../../checkin/shared/Bits"
import { BottomNav, NotSourced, Placeholder, PlaceholderScreen } from "../../progress/shared/Bits"
import { Confetti, Flame, SkipBar, useLessonState } from "../shared/Bits"
import { breatheIn, dayNumber, splitHours, streakHours, taskOpen, TEMPO_SECONDS } from "../shared/logic"
import { lsText } from "../shared/text"
import { cText } from "./text"

interface CState {
  startedAt: number
  skips: number
  goal: boolean
  done: Record<string, string[]>
  thumbs: Record<string, "up" | "down">
  tempo: number
  optionalHidden: boolean
  missedAck: number
  sound: boolean
}
const INITIAL: CState = { startedAt: 0, skips: 0, goal: false, done: {}, thumbs: {}, tempo: 2, optionalHidden: false, missedAck: 1, sound: true }

type Screen = "home" | "routine" | "thought" | "breathe" | "didyou" | "story" | "complete" | "checkup" | "ph" | "tab"
const GOAL_HOURS = 120
const BREATH_SECONDS = 240

/** Copy C: daily list (now, today, tonight, optional), morning routine in order, a 60-second thought exercise, deep breathing with tempo, a fact card, a story, a well-done screen. */
export function LessonsC() {
  const [s, update] = useLessonState<CState>("c", INITIAL)
  const [screen, setScreen] = useState<Screen>("home")
  const [from, setFrom] = useState<Screen>("home")
  const [last, setLast] = useState("")
  const [phTitle, setPhTitle] = useState("")
  const [tab, setTab] = useState(0)
  const [dots, setDots] = useState(0)
  const day = dayNumber(s.startedAt, Date.now(), s.skips)
  const key = String(day)
  const doneIds = s.done[key] ?? []

  useEffect(() => {
    if (!s.startedAt) update({ startedAt: Date.now() })
  }, [s.startedAt, update])

  const open = (to: Screen, origin: Screen = "home") => {
    setFrom(origin)
    setScreen(to)
  }
  const ph = (title: string, origin: Screen) => {
    setPhTitle(title)
    open("ph", origin)
  }
  const finish = (id: string, origin: Screen) => {
    update((c) => ({ done: { ...c.done, [key]: [...new Set([...(c.done[key] ?? []), id])] } }))
    setLast(id)
    setFrom(origin)
    setScreen("complete")
  }
  const routineDone = cText.routineRows.map((r) => doneIds.includes(r.id))
  const missed = day > 1 && s.missedAck < day

  let body: React.ReactNode
  if (screen === "complete") {
    const name = [...cText.routineRows, ...cText.optionalRows].find((r) => r.id === last)?.title ?? ""
    body = <Complete name={name} thumb={s.thumbs[`${key}-${last}`]} onThumb={(t) => update((c) => ({ thumbs: { ...c.thumbs, [`${key}-${last}`]: t } }))} onContinue={() => setScreen(from)} />
  } else if (screen === "thought") {
    body = <Thought onBack={() => setScreen("routine")} onDone={() => finish("thought", "routine")} />
  } else if (screen === "breathe") {
    body = <Breathe tempo={s.tempo} sound={s.sound} onTempo={(t) => update({ tempo: t })} onSound={() => update({ sound: !s.sound })} onBack={() => setScreen("home")} onDone={() => finish("breathing", "home")} />
  } else if (screen === "didyou") {
    body = <DidYou onBack={() => setScreen("home")} onDone={() => finish("didyou", "home")} />
  } else if (screen === "story") {
    body = <Story onBack={() => setScreen("home")} onDone={() => finish("story", "home")} onShare={() => ph(cText.share, "story")} />
  } else if (screen === "checkup") {
    body = <OtherScreen title={cText.checkupTitle} onBack={() => setScreen("home")} />
  } else if (screen === "ph") {
    body = <PlaceholderScreen title={phTitle} onBack={() => setScreen(from)} />
  } else if (screen === "routine") {
    body = (
      <section data-testid="c-routine" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button type="button" data-testid="screen-back" aria-label={lsText.back} onClick={() => setScreen("home")} className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-lg">{"‹"}</button>
          <h2 className="text-2xl font-bold">{cText.routineTitle}</h2>
        </div>
        {cText.routineRows.map((r, i) => {
          const done = routineDone[i]
          const isOpen = taskOpen(routineDone, i)
          return (
            <button
              key={r.id}
              type="button"
              data-testid={`c-routine-${r.id}`}
              data-state={done ? "done" : isOpen ? "open" : "locked"}
              disabled={!isOpen && !done}
              onClick={() => (i === 0 ? (done ? undefined : open("thought", "routine")) : done ? undefined : ph(r.title, "routine"))}
              className={`flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left ${isOpen || done ? "" : "opacity-40"}`}
            >
              <span aria-hidden="true" className={`inline-flex size-10 items-center justify-center rounded-lg ${r.color}`}>{done ? "✔" : r.icon}</span>
              <span className="flex-1 font-medium">{r.title}</span>
              <span className="text-sm text-muted-foreground">{cText.minShort(r.mins)}</span>
            </button>
          )
        })}
      </section>
    )
  } else if (tab === 1) {
    body = <OtherScreen title={cText.tabs[1]} onBack={null} />
  } else if (tab > 1) {
    body = <PlaceholderScreen title={cText.tabs[tab]} onBack={null} />
  } else if (missed) {
    body = (
      <section data-testid="c-missed" className="flex flex-col gap-4 rounded-2xl bg-teal-900 p-5">
        <h2 className="text-2xl font-bold">{cText.missedTitle}</h2>
        <p>{cText.missedLine}</p>
        <button
          type="button"
          data-testid="c-missed-btn"
          onClick={() => { update({ missedAck: day }); open("checkup") }}
          className="min-h-12 rounded-full bg-amber-500 px-4 font-medium text-black"
        >
          {cText.missedBtn}
        </button>
      </section>
    )
  } else {
    const hours = streakHours(s.startedAt, Date.now(), s.skips)
    const sh = splitHours(hours)
    const left = Math.max(0, Math.ceil(GOAL_HOURS - hours))
    body = (
      <div data-testid="c-home" className="flex flex-col gap-3">
        <div className="rounded-3xl bg-teal-900 p-4 text-white">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-full bg-teal-700">{"●"}</span>
            <div>
              <NotSourced />
              <p data-testid="c-victory" data-days={day - 1} className="mt-1 text-sm">{cText.victoryDays(day - 1)}</p>
            </div>
          </div>
          {dots === 0 ? (
            <div data-testid="c-page-0" className="mt-3 flex flex-col items-start gap-2">
              <p className="text-sm">{cText.intro}</p>
              {s.goal ? (
                <p className="text-sm font-semibold">{cText.goalBar(GOAL_HOURS / 24)}</p>
              ) : (
                <button type="button" data-testid="c-goal" onClick={() => update({ goal: true })} className="min-h-11 rounded-full bg-amber-500 px-4 text-sm font-medium text-black">
                  {cText.activate}
                </button>
              )}
            </div>
          ) : (
            <div data-testid="c-page-1" className="mt-3 flex flex-col gap-2">
              <p className="flex items-center gap-2 text-lg font-semibold" data-testid="c-streak" data-hours={Math.floor(hours)}>
                <Flame size={22} />
                {cText.streakLine(sh.days, sh.hours)}
              </p>
              <div className="h-3 rounded bg-teal-700"><div className="h-3 rounded bg-amber-500" style={{ width: `${Math.min(100, (hours / GOAL_HOURS) * 100)}%` }} /></div>
              <p className="text-xs">{cText.goalBar(GOAL_HOURS / 24)}</p>
              {left > 0 && <p className="text-sm">{cText.goalLeft(left)}</p>}
            </div>
          )}
          <div className="mt-2 flex justify-center">
            {cText.pageDots.map((label, i) => (
              <button key={label} type="button" data-testid={`c-dot-${i}`} aria-label={label} aria-pressed={dots === i} onClick={() => setDots(i)} className="inline-flex size-11 items-center justify-center">
                <span className={`size-2 rounded-full ${dots === i ? "bg-white" : "bg-white/40"}`} />
              </button>
            ))}
          </div>
        </div>
        <h3 className="font-semibold">{cText.nowTitle}</h3>
        <button type="button" data-testid="c-now" onClick={() => ph(cText.nowRow, "home")} className="flex min-h-14 items-center gap-3 rounded-xl bg-emerald-900/50 p-3 text-left">
          <span aria-hidden="true">{"✉"}</span>
          <span className="flex-1">{cText.nowRow}</span>
          <span aria-hidden="true">{"›"}</span>
        </button>
        <h3 className="font-semibold">{cText.todayTitle}</h3>
        <div className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-card p-3">
          <span data-testid="c-today-count">{cText.todayRow(routineDone.filter((d) => !d).length)}</span>
          <button type="button" data-testid="c-today-show" onClick={() => open("routine")} className="min-h-11 rounded-full border border-border px-4 text-sm">
            {cText.show}
          </button>
        </div>
        <h3 className="font-semibold">{cText.tonightTitle}</h3>
        <button type="button" data-testid="c-tonight" onClick={() => open("checkup")} className="flex min-h-14 items-center gap-3 rounded-xl bg-emerald-900/50 p-3 text-left">
          <span aria-hidden="true">{"◷"}</span>
          <span className="flex-1">
            <span className="block">{cText.tonightRow}</span>
            <span className="block text-xs text-muted-foreground">{cText.tonightSub}</span>
          </span>
        </button>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{cText.optional}</h3>
          <button type="button" data-testid="c-optional-toggle" onClick={() => update({ optionalHidden: !s.optionalHidden })} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
            {s.optionalHidden ? cText.showOpt : cText.hide}
          </button>
        </div>
        {!s.optionalHidden &&
          cText.optionalRows.map((r) => (
            <button
              key={r.id}
              type="button"
              data-testid={`c-opt-${r.id}`}
              data-done={doneIds.includes(r.id)}
              onClick={() => (r.id === "breathing" ? open("breathe") : r.id === "didyou" ? open("didyou") : r.id === "story" ? open("story") : ph(r.title, "home"))}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
            >
              <span aria-hidden="true" className={`inline-flex size-9 items-center justify-center rounded-full ${r.color}`}>{r.icon}</span>
              <span className="flex-1">{r.title}</span>
              <span aria-hidden="true">{doneIds.includes(r.id) ? "✔" : "›"}</span>
            </button>
          ))}
        <p className="py-4 text-center text-sm text-muted-foreground">{cText.footQuote}</p>
      </div>
    )
  }

  return (
    <div data-testid="lessons-c" className="flex flex-col gap-3">
      <SkipBar
        day={day}
        onSkip={() => {
          update((c) => ({ skips: c.skips + 1 }))
          setScreen("home")
        }}
      />
      {body}
      {screen === "home" && <BottomNav items={cText.tabs} value={tab} onChange={setTab} id="c-tab" />}
    </div>
  )
}

function Bar({ title, onBack, pill }: { title: string; onBack: () => void; pill?: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" data-testid="screen-back" aria-label={lsText.back} onClick={onBack} className="inline-flex size-11 items-center justify-center rounded-full bg-black/30 text-lg">{"‹"}</button>
      <h2 className="flex-1 text-xl font-bold">{title}</h2>
      {pill && <span className="rounded-full bg-black/30 px-3 py-1 text-xs">{pill}</span>}
    </div>
  )
}

function Thought({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [run, setRun] = useState(false)
  const [left, setLeft] = useState(60)
  useEffect(() => {
    if (!run) return
    const id = setInterval(() => setLeft((l) => l - 1), 1000)
    return () => clearInterval(id)
  }, [run])
  useEffect(() => {
    if (run && left <= 0) onDone()
  }, [run, left, onDone])
  if (run) {
    return (
      <section data-testid="c-thought-run" data-left={left} className="flex min-h-[70dvh] flex-col items-center justify-between rounded-2xl bg-orange-500 p-5 text-black">
        <div className="h-1 w-full rounded bg-black/20"><div className="h-1 rounded bg-black/70" style={{ width: `${((60 - left) / 60) * 100}%` }} /></div>
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm">{cText.dontThink}</p>
          <p className="text-3xl font-bold">{cText.object}</p>
          <svg width="120" height="150" viewBox="0 0 120 150" aria-hidden="true"><rect x="20" y="10" width="80" height="130" rx="6" fill="#b91c1c" /><circle cx="86" cy="80" r="6" fill="#fde68a" /></svg>
          <p className="text-sm">{cText.forSeconds}</p>
        </div>
        <button type="button" data-testid="c-thought-cancel" onClick={() => { setRun(false); setLeft(60) }} className="inline-flex min-h-11 items-center text-sm underline">
          {cText.cancel}
        </button>
      </section>
    )
  }
  return (
    <section data-testid="c-thought" className="flex min-h-[70dvh] flex-col gap-3 rounded-2xl bg-orange-500 p-4 text-black">
      <Bar title={cText.thoughtTitle} onBack={onBack} pill={cText.routinePill(1, 4)} />
      <div className="h-1 rounded bg-black/20"><div className="h-1 w-1/4 rounded bg-black/70" /></div>
      <h3 className="font-bold">{cText.sectionWhy}</h3>
      <p className="text-sm">{cText.thoughtWhy}</p>
      <h3 className="font-bold">{cText.sectionDo}</h3>
      {cText.thoughtDo.map((t) => (
        <p key={t} className="rounded-lg bg-black/10 p-2 text-sm">{t}</p>
      ))}
      <h3 className="font-bold">{cText.sectionHow}</h3>
      <p className="text-sm">{cText.thoughtHow}</p>
      <button type="button" data-testid="c-thought-begin" onClick={() => setRun(true)} className="mt-auto min-h-12 rounded-full bg-white px-4 font-medium">
        {cText.begin}
      </button>
    </section>
  )
}

function useTone(on: boolean, active: boolean) {
  const ref = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null)
  useEffect(() => {
    if (!active) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = 196
      gain.gain.value = 0.03
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      ref.current = { ctx, gain }
      return () => {
        osc.stop()
        void ctx.close()
        ref.current = null
      }
    } catch {
      return undefined
    }
  }, [active])
  useEffect(() => {
    if (ref.current) ref.current.gain.gain.value = on ? 0.03 : 0
  }, [on, active])
}

function Breathe({ tempo, sound, onTempo, onSound, onBack, onDone }: { tempo: number; sound: boolean; onTempo: (n: number) => void; onSound: () => void; onBack: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "ready" | "run">("intro")
  const [list, setList] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const cycle = TEMPO_SECONDS[tempo]
  useTone(sound, phase === "run")
  useEffect(() => {
    if (phase !== "ready") return
    const id = setTimeout(() => setPhase("run"), 3000)
    return () => clearTimeout(id)
  }, [phase])
  useEffect(() => {
    if (phase !== "run") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])
  useEffect(() => {
    if (phase === "run" && elapsed >= BREATH_SECONDS) onDone()
  }, [phase, elapsed, onDone])
  if (phase === "intro") {
    return (
      <section data-testid="c-breathe-intro" className="flex min-h-[70dvh] flex-col gap-3 rounded-2xl bg-violet-600 p-4 text-white">
        <Bar title={cText.breatheTitle} onBack={onBack} />
        <div className="flex h-32 items-center justify-center" aria-hidden="true"><span className="size-24 rounded-full bg-white/30" /></div>
        <p className="font-semibold">{cText.breatheLabel}</p>
        <p className="text-sm">{`${cText.duration}: ${cText.fourMinutes}`}</p>
        <h3 className="font-bold">{cText.sectionWhy}</h3>
        <p className="text-sm">{cText.breatheWhy}</p>
        <h3 className="font-bold">{cText.sectionDo}</h3>
        {cText.breatheDo.map((t) => (
          <p key={t} className="rounded-lg bg-black/20 p-2 text-sm">{t}</p>
        ))}
        <button type="button" data-testid="c-breathe-begin" onClick={() => setPhase("ready")} className="mt-auto min-h-12 rounded-full bg-white px-4 font-medium text-black">
          {cText.begin}
        </button>
      </section>
    )
  }
  const inhale = breatheIn(elapsed, cycle)
  return (
    <section data-testid="c-breathe" data-phase={phase} data-elapsed={elapsed} data-cycle={cycle} className="relative flex min-h-[70dvh] flex-col items-center justify-between rounded-2xl bg-violet-600 p-4 text-white">
      <div className="flex w-full items-center gap-3">
        <div className="h-1 flex-1 rounded bg-white/30"><div className="h-1 rounded bg-white" style={{ width: `${(elapsed / BREATH_SECONDS) * 100}%` }} /></div>
        {phase === "run" && (
          <button type="button" data-testid="c-sound" aria-pressed={sound} aria-label={cText.sound} onClick={onSound} className="inline-flex size-11 items-center justify-center">
            {sound ? "🔊" : "🔇"}
          </button>
        )}
      </div>
      <div
        data-testid="c-circle"
        data-in={phase === "run" ? inhale : undefined}
        className="flex size-56 items-center justify-center rounded-full bg-white/30 text-lg font-semibold"
        style={{ transform: `scale(${phase === "run" && inhale ? 1.15 : 0.7})`, transition: `transform ${cycle / 2}s ease-in-out` }}
      >
        {phase === "ready" ? cText.getReady : inhale ? cText.breatheIn : cText.breatheOut}
      </div>
      <div className="flex flex-col items-center gap-1">
        <button type="button" data-testid="c-tempo" onClick={() => setList(true)} className="min-h-11 rounded-full bg-white/25 px-5">
          {cText.tempo}
        </button>
        <button type="button" data-testid="c-breathe-cancel" onClick={() => { setPhase("intro"); setElapsed(0) }} className="inline-flex min-h-11 items-center text-sm underline">
          {cText.cancel}
        </button>
      </div>
      {list && (
        <div data-testid="c-tempo-list" role="listbox" className="absolute inset-x-4 bottom-24 flex flex-col rounded-xl bg-card p-2 text-foreground">
          {cText.tempoNames.map((n, i) => (
            <button key={n} type="button" role="option" aria-selected={i === tempo} data-testid={`c-tempo-${i}`} onClick={() => { onTempo(i); setList(false) }} className="flex min-h-11 items-center justify-between px-3">
              <span>{n}</span>
              {i === tempo && <span aria-hidden="true">{"✔"}</span>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function DidYou({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [page, setPage] = useState(0)
  return (
    <section data-testid="c-did" data-page={page} className="flex min-h-[70dvh] flex-col gap-3 rounded-2xl bg-emerald-700 p-4 text-white">
      <Bar title={cText.didTitle} onBack={page === 0 ? onBack : () => setPage(0)} />
      {page === 0 ? (
        <>
          <div className="flex h-32 items-center justify-center" aria-hidden="true">
            <svg width="90" height="110" viewBox="0 0 90 110"><circle cx="45" cy="45" r="32" fill="#fde68a" /><rect x="33" y="78" width="24" height="14" rx="3" fill="#fbbf24" /></svg>
          </div>
          <p className="font-semibold">{cText.didLabel}</p>
          <div className="h-1 rounded bg-white/30"><div className="h-1 w-1/3 rounded bg-white" /></div>
          <button type="button" data-testid="c-did-begin" onClick={() => setPage(1)} className="mt-auto min-h-12 rounded-full bg-white px-4 font-medium text-black">
            {cText.begin}
          </button>
        </>
      ) : (
        <>
          <h3 className="text-lg font-bold">{cText.didCard}</h3>
          {cText.didBody.map((t) => (
            <p key={t} className="text-sm">{t}</p>
          ))}
          <h3 className="font-bold">{cText.sectionWhy}</h3>
          <p className="text-sm">{cText.didWhy}</p>
          <button type="button" data-testid="c-did-complete" onClick={onDone} className="mt-auto min-h-12 rounded-full bg-white px-4 font-medium text-black">
            {cText.complete}
          </button>
        </>
      )}
    </section>
  )
}

function Story({ onBack, onDone, onShare }: { onBack: () => void; onDone: () => void; onShare: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1000)
    return () => clearTimeout(id)
  }, [])
  return (
    <section data-testid="c-story" className="flex min-h-[70dvh] flex-col gap-3 rounded-2xl bg-emerald-700 p-4 text-white">
      <Bar title={cText.storyTitle} onBack={onBack} />
      {ready ? (
        <>
          <Placeholder />
          <Placeholder />
        </>
      ) : (
        <p data-testid="c-story-loading" className="py-10 text-center">{lsText.loading}</p>
      )}
      <button type="button" data-testid="c-story-complete" disabled={!ready} onClick={onDone} className="mt-auto min-h-12 rounded-full bg-white px-4 font-medium text-black disabled:opacity-40">
        {`★ ${cText.complete}`}
      </button>
      <button type="button" data-testid="c-story-share" onClick={onShare} className="inline-flex min-h-11 items-center justify-center text-sm underline">
        {cText.share}
      </button>
    </section>
  )
}

function Complete({ name, thumb, onThumb, onContinue }: { name: string; thumb?: "up" | "down"; onThumb: (t: "up" | "down") => void; onContinue: () => void }) {
  return (
    <section data-testid="c-complete" className="relative flex min-h-[70dvh] flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-teal-600 p-5 text-center text-white">
      <Confetti />
      <span className="text-6xl" aria-hidden="true">{"🎉"}</span>
      <h2 className="text-3xl font-bold">{cText.wellDone}</h2>
      <p>{cText.wellLine}</p>
      <span className="rounded-full bg-black/20 px-4 py-1 text-sm">{cText.practised(name)}</span>
      <div className="mt-6 flex gap-3">
        <button type="button" data-testid="c-less" aria-pressed={thumb === "down"} onClick={() => onThumb("down")} className={`min-h-11 rounded-full px-4 text-sm ${thumb === "down" ? "bg-white text-black" : "bg-black/20"}`}>
          {`👎 ${cText.lessLike}`}
        </button>
        <button type="button" data-testid="c-more" aria-pressed={thumb === "up"} onClick={() => onThumb("up")} className={`min-h-11 rounded-full px-4 text-sm ${thumb === "up" ? "bg-white text-black" : "bg-black/20"}`}>
          {`👍 ${cText.moreLike}`}
        </button>
      </div>
      <button type="button" data-testid="c-continue" onClick={onContinue} className="mt-6 inline-flex min-h-11 items-center text-xs tracking-widest">
        {cText.tapContinue}
      </button>
    </section>
  )
}

