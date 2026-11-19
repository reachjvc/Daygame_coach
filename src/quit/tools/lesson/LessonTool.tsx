"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BookOpen, Check, ChevronLeft, ChevronRight, PenLine } from "lucide-react"
import { SourceTap } from "../../components/kit"
import { useLocalQuitBlackBox, useQuitBlackBox, useSignedIn, type QuitBlackBoxApi } from "../../blackbox"
import { isLiveTool } from "../../menu"
import { todayIso, useQuitRecord } from "../../record"
import type { QuitBelief, QuitLesson, ToolProps } from "../../types"
import { realRefs, usable } from "../common"
import { useCarry, useToolState } from "../hooks"
import { NotReady } from "../NotReady"
import {
  EMPTY_LESSON,
  MAX_NOTE,
  doneCount,
  isDone,
  lessonOn,
  nextLesson,
  parseDayParam,
  parseLessonState,
  placeFor,
  prevLesson,
  setDone,
  setNote,
  shift,
  shownTitle,
  sortLessons,
  validLesson,
  type LessonState,
  type Place,
} from "./logic"
import { lessonText as t } from "./text"

const TOOL = "lesson"
const fmt = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })

/** Today as an ISO day, refreshed so a tab left open over midnight changes day. */
function useToday(): string {
  const [today, setToday] = useState(() => todayIso())
  useEffect(() => {
    const tick = () => setToday(todayIso())
    const id = setInterval(tick, 30_000)
    document.addEventListener("visibilitychange", tick)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", tick)
    }
  }, [])
  return today
}

/** The Black Box bridge, signed in (synced with the account) or signed out (the browser copy). Mounted at one fixed place. */
function SignedBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitBlackBoxApi | null) => void }) {
  const api = useQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}
function LocalBridge({ viceId, onApi }: { viceId: string; onApi: (api: QuitBlackBoxApi | null) => void }) {
  const api = useLocalQuitBlackBox(viceId)
  useEffect(() => {
    onApi(api)
    return () => onApi(null)
  }, [api, onApi])
  return null
}

/** Today's lesson: one short lesson a day, from three days before day 1 to day 14, following the shared quit date. */
export function LessonTool({ addiction, data }: ToolProps) {
  const raw = usable<QuitLesson[]>(data.lessons)
  const lessons = Array.isArray(raw) ? sortLessons(raw.filter(validLesson)) : []
  if (lessons.length === 0) return <NotReady />
  return <Inner addiction={addiction} lessons={lessons} beliefs={usable<QuitBelief[]>(data.beliefs) ?? []} />
}

interface InnerProps {
  addiction: string
  lessons: QuitLesson[]
  beliefs: QuitBelief[]
}

function Inner(props: InnerProps) {
  const signedIn = useSignedIn(false, true)
  const [bb, setBb] = useState<QuitBlackBoxApi | null>(null)
  const onApi = useCallback((api: QuitBlackBoxApi | null) => setBb(api), [])
  return (
    <div className="w-full">
      {signedIn === true ? <SignedBridge key="in" viceId={props.addiction} onApi={onApi} /> : null}
      {signedIn === false ? <LocalBridge key="out" viceId={props.addiction} onApi={onApi} /> : null}
      <Screens {...props} bb={bb} />
    </div>
  )
}

/** The address keeps the screen: `?tab=all` for the list, `?day=N` for one lesson opened from it. */
function useView(lessons: QuitLesson[]) {
  const pathname = usePathname()
  const sp = useSearchParams()
  const day = parseDayParam(sp.get("day"), lessons)
  const tab: "today" | "all" = day !== null || sp.get("tab") === "all" ? "all" : "today"
  // Entries this visit pushed: Back inside the page then walks the browser history.
  const pushed = useRef(0)
  const href = useCallback(
    (next: { tab?: "all" | null; day?: number | null }) => {
      const p = new URLSearchParams(sp.toString())
      p.delete("tab")
      p.delete("day")
      if (next.tab === "all") p.set("tab", "all")
      if (next.day !== undefined && next.day !== null) {
        p.set("tab", "all")
        p.set("day", String(next.day))
      }
      const q = p.toString()
      return q ? `${pathname}?${q}` : pathname
    },
    [sp, pathname],
  )
  const go = useCallback(
    (next: { tab?: "all" | null; day?: number | null }) => {
      pushed.current += 1
      window.history.pushState(null, "", href(next))
      window.scrollTo({ top: 0 })
    },
    [href],
  )
  const replace = useCallback((next: { tab?: "all" | null; day?: number | null }) => window.history.replaceState(null, "", href(next)), [href])
  /** Back from an opened lesson to the list: the browser's Back when this visit pushed the lesson, else a rewrite. */
  const backToList = useCallback(() => {
    if (pushed.current > 0) {
      pushed.current -= 1
      window.history.back()
    } else replace({ tab: "all" })
  }, [replace])
  return { tab, day, go, replace, backToList }
}

function Screens({ addiction, lessons, beliefs, bb }: InnerProps & { bb: QuitBlackBoxApi | null }) {
  const today = useToday()
  const carry = useCarry()
  const rec = useQuitRecord(addiction)
  const { state, update } = useToolState<LessonState>(addiction, TOOL, EMPTY_LESSON, parseLessonState)
  const view = useView(lessons)

  const lastSlip = useMemo(() => {
    const days = (bb?.reports ?? []).filter((r) => r.wentThrough).map((r) => r.at.slice(0, 10))
    return days.length > 0 ? days.sort()[days.length - 1] : null
  }, [bb?.reports])

  if (!state || !rec.ready || !bb || !bb.ready) return null

  const lastDay = lessons[lessons.length - 1].day
  const runStart = bb.run?.startedOn ?? null
  const place = placeFor({ today, runStart, quitDate: rec.record.quitDate, goal: rec.record.goal, lastSlip, lastDay })
  // The day the program counts from, when there is one: dates are shown only then.
  const start = runStart ?? (place.kind === "day" || place.kind === "early" || place.kind === "end" ? rec.record.quitDate : null)
  const dateOf = (day: number) => (start ? fmt(shift(start, day > 0 ? day - 1 : day)) : null)
  const todayDay = place.kind === "day" ? place.day : null

  const card = (l: QuitLesson, opts: { onBack?: () => void; isToday: boolean }) => (
    <LessonCard
      key={l.day}
      lesson={l}
      lessons={lessons}
      belief={beliefs.find((b) => b.id === l.beliefId) ?? null}
      date={dateOf(l.day)}
      state={state}
      isToday={opts.isToday}
      onDone={(on) => update((s) => setDone(s, l.day, on, Date.now()))}
      onNote={(text) => update((s) => setNote(s, l.day, text))}
      onBack={opts.onBack}
      onOpen={(d) => view.replace({ day: d })}
    />
  )

  return (
    <div data-testid="lesson-tool" data-place={place.kind} className="flex flex-col gap-4">
      <div role="tablist" aria-label={t.tabsLabel} className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
        {(["today", "all"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={view.tab === k}
            data-testid={`tab-${k}`}
            onClick={() => {
              if (view.tab === k && view.day === null) return
              view.go({ tab: k === "all" ? "all" : null })
            }}
            className={`inline-flex min-h-11 items-center justify-center rounded-md text-sm font-medium ${view.tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t.tabs[k]}
          </button>
        ))}
      </div>

      {view.tab === "all" && view.day !== null ? (
        card(lessonOn(lessons, view.day) as QuitLesson, { onBack: view.backToList, isToday: view.day === todayDay })
      ) : view.tab === "all" ? (
        <DayList lessons={lessons} state={state} todayDay={todayDay} onOpen={(d) => view.go({ day: d })} />
      ) : (
        <Today place={place} lessons={lessons} state={state} carry={carry} card={card} onOpen={(d) => view.go({ day: d })} onAll={() => view.go({ tab: "all" })} />
      )}
    </div>
  )
}

function Strip({ lessons, state, current }: { lessons: QuitLesson[]; state: LessonState; current: number | null }) {
  return (
    <div aria-hidden="true" data-testid="strip" className="flex gap-1">
      {lessons.map((l) => {
        const done = isDone(state, l.day)
        const now = l.day === current
        return (
          <span
            key={l.day}
            data-day={l.day}
            data-done={done}
            data-now={now}
            className={`h-2.5 flex-1 rounded-full ${done ? "bg-primary" : now ? "bg-primary/40" : "bg-muted"} ${now ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${l.day === 1 ? "ml-1.5" : ""}`}
          />
        )
      })}
    </div>
  )
}

interface TodayProps {
  place: Place
  lessons: QuitLesson[]
  state: LessonState
  carry: (p: string) => string
  card: (l: QuitLesson, opts: { onBack?: () => void; isToday: boolean }) => React.ReactNode
  onOpen: (day: number) => void
  onAll: () => void
}

/** A link to another quit tool only while that tool is open to everyone; otherwise its words as plain text. */
function ToolLink({ id, carry, children }: { id: string; carry: (p: string) => string; children: string }) {
  if (!isLiveTool(id)) return <span data-testid={`text-${id}`}>{children}</span>
  return (
    <Link href={carry(`/quit/nicotine/${id}`)} data-testid={`link-${id}`} className="inline-flex min-h-11 items-center font-medium text-primary underline">
      {children}
    </Link>
  )
}

function Today({ place, lessons, state, carry, card, onOpen, onAll }: TodayProps) {
  const last = lessons[lessons.length - 1].day

  if (place.kind === "early") {
    return (
      <section data-testid="early" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <Strip lessons={lessons} state={state} current={null} />
        <p className="text-lg font-semibold leading-snug">{t.earlyTitle(fmt(place.startsOn))}</p>
        <p className="text-muted-foreground">{t.earlyLine(place.daysToGo)}</p>
        <button type="button" data-testid="read-first" onClick={() => onOpen(lessons[0].day)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
          {t.readFirst}
        </button>
      </section>
    )
  }

  if (place.kind === "end") {
    const tools = [
      { id: "record", name: "Your record" },
      { id: "sos", name: "Craving now?" },
      { id: "checkin", name: "Daily check-in" },
    ].filter((x) => isLiveTool(x.id))
    return (
      <section data-testid="end" className="flex flex-col gap-3">
        <Strip lessons={lessons} state={state} current={null} />
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-lg font-semibold leading-snug">{t.endTitle}</p>
          <p data-testid="end-count" className="mt-1 text-muted-foreground">
            {t.endDone(doneCount(state, lessons), lessons.length)}
          </p>
        </div>
        {tools.length > 0 && (
          <div className="flex flex-col">
            <h2 className="text-base font-semibold">{t.endNext}</h2>
            {tools.map((x) => (
              <ToolLink key={x.id} id={x.id} carry={carry}>
                {x.name}
              </ToolLink>
            ))}
          </div>
        )}
        <button type="button" data-testid="end-all" onClick={onAll} className="inline-flex min-h-11 items-center self-start text-sm text-primary underline">
          {t.endAll}
        </button>
      </section>
    )
  }

  const day = place.kind === "day" ? place.day : lessons[0].day
  const lesson = lessonOn(lessons, day) ?? lessons[0]
  const next = nextLesson(lessons, lesson.day)
  return (
    <section data-testid="today" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p data-testid="place" className="text-sm font-medium text-muted-foreground">
          {place.kind === "day" ? (day > 0 ? t.placeDay(day, last) : t.placeBefore(-day)) : t.dayLabel(lesson.day)}
        </p>
        <Strip lessons={lessons} state={state} current={lesson.day} />
      </div>
      {place.kind === "none" && (
        <div data-testid={place.reason === "slip" ? "slip-line" : "nodate-line"} className="rounded-lg border border-border bg-card p-3 text-base">
          <p>{place.reason === "slip" ? t.slipLine(fmt(place.slipDay)) : t.noDate}</p>
          {place.reason === "slip" ? (
            <ToolLink id="slip" carry={carry}>
              {t.slipLink}
            </ToolLink>
          ) : (
            <ToolLink id="date" carry={carry}>
              {t.noDateLink}
            </ToolLink>
          )}
        </div>
      )}
      {card(lesson, { isToday: true })}
      {place.kind === "day" && next && (
        <p data-testid="tomorrow" className="text-sm text-muted-foreground">
          {t.tomorrow(shownTitle(next.title))}
        </p>
      )}
      <button type="button" data-testid="reread" onClick={onAll} className="inline-flex min-h-11 items-center self-start text-sm text-primary underline">
        {t.reread}
      </button>
    </section>
  )
}

interface CardProps {
  lesson: QuitLesson
  lessons: QuitLesson[]
  belief: QuitBelief | null
  date: string | null
  state: LessonState
  isToday: boolean
  onDone: (on: boolean) => void
  onNote: (text: string) => void
  onBack?: () => void
  onOpen: (day: number) => void
}

function LessonCard({ lesson: l, lessons, belief, date, state, isToday, onDone, onNote, onBack, onOpen }: CardProps) {
  const done = isDone(state, l.day)
  const stored = state.notes[String(l.day)] ?? ""
  const [note, setNoteText] = useState(stored)
  const [typed, setTyped] = useState(false)
  const label = t.dayLabel(l.day)
  const prev = prevLesson(lessons, l.day)
  const next = nextLesson(lessons, l.day)
  return (
    <article data-testid="lesson" data-day={l.day} className="flex flex-col gap-4">
      {onBack && (
        <button type="button" data-testid="lesson-back" onClick={onBack} className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground underline">
          <ChevronLeft className="size-4" aria-hidden />
          {t.backToList}
        </button>
      )}
      <div className="rounded-lg border border-border bg-card p-4">
        <p data-testid="lesson-meta" className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="size-4 shrink-0" aria-hidden />
          <span>{date ? t.dayWithDate(label, date) : label}</span>
          {isToday && onBack && <span className="rounded-full border border-border px-2 text-xs">{t.todayPill}</span>}
        </p>
        <h2 data-testid="lesson-title" className="mt-1 text-xl font-semibold leading-snug">
          {shownTitle(l.title)}
        </h2>
        <p data-testid="lesson-body" className="mt-3 break-words text-base leading-relaxed">
          {l.body}
        </p>
        {l.counted && (
          <p data-testid="lesson-counted" className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t.countedLabel}</span> {l.counted}
          </p>
        )}
        <SourceTap refs={realRefs(l.refs)} />
        {belief && <BeliefFold belief={belief} />}
      </div>

      <section data-testid="exercise" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <PenLine className="size-4 shrink-0" aria-hidden />
          {t.exerciseTitle}
        </h3>
        <p className="break-words">{l.exercise}</p>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`note-${l.day}`}>
          {t.noteLabel}
        </label>
        <textarea
          id={`note-${l.day}`}
          data-testid="note"
          value={note}
          maxLength={MAX_NOTE}
          onChange={(e) => {
            setNoteText(e.target.value)
            setTyped(true)
            onNote(e.target.value)
          }}
          className="-mt-2 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-base"
        />
        <p data-testid="note-status" className="-mt-1 text-xs text-muted-foreground">
          {typed ? t.noteSaved : t.noteKept}
        </p>
        {done ? (
          <div className="flex flex-wrap items-center gap-3">
            <p data-testid="done-line" className="inline-flex items-center gap-1.5 font-medium">
              <Check className="size-5 text-primary" aria-hidden />
              {t.doneLine}
            </p>
            <button type="button" data-testid="not-done" onClick={() => onDone(false)} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline">
              {t.notDone}
            </button>
          </div>
        ) : (
          <button type="button" data-testid="done-btn" onClick={() => onDone(true)} className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-4 text-base font-medium text-primary-foreground">
            {t.markDone}
          </button>
        )}
      </section>

      {onBack && (
        <nav className="grid grid-cols-2 gap-2">
          {prev ? (
            <button type="button" data-testid="prev-lesson" onClick={() => onOpen(prev.day)} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-card px-3 text-sm">
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{t.prev}</span>
            </button>
          ) : (
            <span />
          )}
          {next ? (
            <button type="button" data-testid="next-lesson" onClick={() => onOpen(next.day)} className="inline-flex min-h-11 items-center justify-end gap-1 rounded-md border border-border bg-card px-3 text-sm">
              <span className="min-w-0 truncate">{t.next}</span>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </article>
  )
}

function BeliefFold({ belief: b }: { belief: QuitBelief }) {
  const [open, setOpen] = useState(false)
  return (
    <div data-testid="belief" data-belief={b.id} className="mt-1 border-t border-border pt-1">
      <button type="button" data-testid="belief-toggle" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm font-medium">
        {t.thoughtTitle}
        <ChevronRight className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
      </button>
      {open && (
        <div data-testid="belief-detail" className="flex flex-col gap-1 pb-2 text-sm">
          <p className="text-muted-foreground">{t.thoughtLabel}</p>
          <p className="break-words text-base">{`“${b.limiting}”`}</p>
          <p className="mt-2 text-muted-foreground">{t.proofLabel}</p>
          <p className="break-words text-base">{b.proof}</p>
          {b.counted && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{t.countedLabel}</span> {b.counted}
            </p>
          )}
          <SourceTap refs={realRefs(b.refs)} />
        </div>
      )}
    </div>
  )
}

function DayList({ lessons, state, todayDay, onOpen }: { lessons: QuitLesson[]; state: LessonState; todayDay: number | null; onOpen: (day: number) => void }) {
  const groups: [string, QuitLesson[]][] = [
    [t.groupBefore, lessons.filter((l) => l.day < 0)],
    [t.groupAfter, lessons.filter((l) => l.day > 0)],
  ]
  return (
    <div data-testid="day-list" className="flex flex-col gap-4">
      <Strip lessons={lessons} state={state} current={todayDay} />
      {groups
        .filter(([, list]) => list.length > 0)
        .map(([title, list]) => (
          <section key={title} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
            <ul className="flex flex-col gap-2">
              {list.map((l) => {
                const done = isDone(state, l.day)
                return (
                  <li key={l.day}>
                    <button
                      type="button"
                      data-testid={`day-row-${l.day}`}
                      data-done={done}
                      onClick={() => onOpen(l.day)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left"
                    >
                      <span className="w-14 shrink-0 text-sm text-muted-foreground">{t.dayLabel(l.day)}</span>
                      <span className="min-w-0 flex-1 break-words">{shownTitle(l.title)}</span>
                      {todayDay === l.day && <span className="shrink-0 rounded-full border border-primary px-2 text-xs text-primary">{t.todayPill}</span>}
                      {done && (
                        <span data-testid="done-mark" className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                          <Check className="size-4 text-primary" aria-hidden />
                          <span className="sr-only">{t.doneMark}</span>
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
    </div>
  )
}
