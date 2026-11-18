"use client"

import { useEffect, useState } from "react"
import { getAddiction } from "../../../data"
import { CountedLine, SourceTap } from "../../../components/kit"
import { tooltext as tt } from "../../../tooltext"
import { realRefs, usable } from "../../../tools/common"
import type { QuitAddictionId, QuitBelief, QuitLesson } from "../../../types"
import type { LabProps } from "../../registry"
import { Head, Tabs } from "../../progress/shared/Bits"
import { dayKey } from "../../progress/shared/calc"
import { ContentComing } from "../../sos/best/Tools"
import { useLabState } from "../../store"
import {
  dayNumber,
  isDone,
  lessonFor,
  markDone,
  nextLesson,
  parseDayInput,
  parseDays,
  parseDone,
  parseThumbs,
  readMinutes,
  setThumb,
  sortLessons,
  validTime,
  type DoneMap,
  type Thumb,
} from "./logic"
import { bestText as t } from "./text"

const SWITCH_IDS = ["nicotine", "alcohol", "weed", "porn"] as const satisfies readonly QuitAddictionId[]
const TOOL = "lessons"
const VARIANT = "best"

const chip = (on: boolean) => `inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`
const validLesson = (l: unknown): l is QuitLesson => {
  const x = l as Partial<QuitLesson> | null
  return !!x && Number.isInteger(x.day) && typeof x.title === "string" && typeof x.body === "string" && typeof x.exercise === "string"
}

/** Improved Daily lessons: one small lesson a day, read then do then done, a plain day list, sources, belief link, thumbs. */
export function LessonsBest({ addiction: initial }: LabProps) {
  const [chosen, setChosen] = useLabState<string>(TOOL, VARIANT, "addiction", initial)
  const id: QuitAddictionId = (SWITCH_IDS as readonly string[]).includes(chosen) ? (chosen as QuitAddictionId) : "nicotine"
  return (
    <div data-testid="lessons-best" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label={t.addictionLabel} className="flex flex-wrap gap-2">
        {SWITCH_IDS.map((x) => (
          <button key={x} type="button" role="radio" aria-checked={id === x} data-testid={`switch-${x}`} onClick={() => setChosen(x)} className={chip(id === x)}>
            {t.addictions[x]}
          </button>
        ))}
      </div>
      <Flow key={id} id={id} />
    </div>
  )
}

function Flow({ id }: { id: QuitAddictionId }) {
  const data = getAddiction(id)
  const raw = usable<QuitLesson[]>(data?.lessons)
  const lessons = Array.isArray(raw) ? raw.filter(validLesson) : []
  if (lessons.length === 0) return <ContentComing />
  return <Program id={id} lessons={lessons} beliefs={usable<QuitBelief[]>(data?.beliefs) ?? []} />
}

type Screen = { kind: "main" } | { kind: "lesson"; day: number } | { kind: "belief"; day: number; beliefId: string }

function Program({ id, lessons, beliefs }: { id: QuitAddictionId; lessons: QuitLesson[]; beliefs: QuitBelief[] }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [plan] = useLabState<{ start?: string | null } | null>("quitdate", VARIANT, `plan-${id}`, null)
  const [override, setOverride] = useLabState<number | null>(TOOL, VARIANT, `day-${id}`, null)
  const [doneRaw, setDone] = useLabState<unknown>(TOOL, VARIANT, `done-${id}`, {})
  const [readRaw, setRead] = useLabState<unknown>(TOOL, VARIANT, `read-${id}`, [])
  const [thumbsRaw, setThumbs] = useLabState<unknown>(TOOL, VARIANT, `thumbs-${id}`, {})
  const [reminder, setReminder] = useLabState<string>(TOOL, VARIANT, `reminder-${id}`, "")
  const [tab, setTab] = useState(0)
  const [screen, setScreen] = useState<Screen>({ kind: "main" })
  if (!mounted) return null

  const done = parseDone(doneRaw)
  const reads = parseDays(readRaw)
  const thumbs = parseThumbs(thumbsRaw)
  const sorted = sortLessons(lessons)
  const today = dayKey(Date.now())
  const planStart = plan && typeof plan.start === "string" ? plan.start : null
  const day = override !== null ? override : planStart ? dayNumber(today, planStart) : sorted[0].day
  const current = lessonFor(sorted, day)

  const lessonProps = (l: QuitLesson) => ({
    lesson: l,
    next: nextLesson(sorted, l.day),
    done,
    isRead: reads.includes(l.day),
    thumb: thumbs[String(l.day)] as Thumb | undefined,
    hasBelief: beliefs.some((b) => b.id === l.beliefId),
    onRead: () => setRead([...reads.filter((d) => d !== l.day), l.day]),
    onDone: (note: string) => setDone(markDone(done, l.day, note, Date.now())),
    onThumb: (th: Thumb) => setThumbs(setThumb(thumbs, l.day, th)),
    onBelief: () => setScreen({ kind: "belief", day: l.day, beliefId: l.beliefId }),
  })

  if (screen.kind === "belief") {
    const b = beliefs.find((x) => x.id === screen.beliefId)
    const back = () => setScreen({ kind: "lesson", day: screen.day })
    return b ? <BeliefCard b={b} onBack={back} /> : null
  }
  if (screen.kind === "lesson") {
    const l = sorted.find((x) => x.day === screen.day)
    if (l) return <LessonView key={l.day} {...lessonProps(l)} onBack={() => setScreen({ kind: "main" })} />
  }

  return (
    <div className="flex flex-col gap-3">
      <Head title={t.title} />
      <Tabs items={t.tabs} value={tab} onChange={setTab} id="ls-tab" />
      {tab === 0 ? (
        <>
          <p data-testid="place" className="text-sm text-muted-foreground">
            {t.placeLine(t.dayLabel(day))}
          </p>
          {current ? (
            <LessonView key={current.day} {...lessonProps(current)} onBack={null} />
          ) : (
            <p data-testid="no-lesson" className="rounded-md border border-dashed border-border px-3 py-3 text-sm">
              {t.noLesson}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t.rereadLine}</p>
          <Reminder value={reminder} onChange={setReminder} />
          <SetDay
            day={day}
            onSet={(n) => setOverride(n)}
            onPlan={planStart && override !== null ? () => setOverride(null) : null}
          />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t.rereadLine}</p>
          <ul data-testid="day-list" className="flex flex-col gap-2">
            {sorted.map((l) => (
              <li key={l.day}>
                <button
                  type="button"
                  data-testid={`day-row-${l.day}`}
                  data-done={isDone(done, l.day)}
                  onClick={() => setScreen({ kind: "lesson", day: l.day })}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left"
                >
                  <span className="w-16 shrink-0 text-sm text-muted-foreground">{t.dayLabel(l.day)}</span>
                  <span className="min-w-0 flex-1">{l.title}</span>
                  {current?.day === l.day && <span className="shrink-0 rounded-full border border-border px-2 text-xs">{t.todayTag}</span>}
                  {isDone(done, l.day) && (
                    <span data-testid="done-mark" className="shrink-0 text-sm text-muted-foreground">
                      {"✓ "}
                      {t.doneMark}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

interface LessonProps {
  lesson: QuitLesson
  next: QuitLesson | null
  done: DoneMap
  isRead: boolean
  thumb: Thumb | undefined
  hasBelief: boolean
  onRead: () => void
  onDone: (note: string) => void
  onThumb: (t: Thumb) => void
  onBelief: () => void
  onBack: (() => void) | null
}

function LessonView({ lesson: l, next, done, isRead, thumb, hasBelief, onRead, onDone, onThumb, onBelief, onBack }: LessonProps) {
  const [note, setNote] = useState("")
  const [justSaved, setJustSaved] = useState(false)
  const mark = done[String(l.day)]
  const refs = realRefs(l.refs)
  return (
    <article data-testid="lesson" data-day={l.day} className="flex flex-col gap-3">
      {onBack ? <Head title={l.title} onBack={onBack} /> : <h3 className="text-lg font-semibold">{l.title}</h3>}
      <p data-testid="lesson-meta" className="text-sm text-muted-foreground">
        {t.dayLabel(l.day)}
        {" · "}
        <span data-testid="read-time">{t.readTime(readMinutes(l.body))}</span>
      </p>
      <p data-testid="lesson-body" className="leading-relaxed">{l.body}</p>
      <SourceTap refs={refs} />
      {hasBelief && (
        <button type="button" data-testid="belief-link" onClick={onBelief} className="inline-flex min-h-11 items-center self-start text-primary underline">
          {t.beliefLink}
        </button>
      )}
      {!isRead && !mark && (
        <button type="button" data-testid="read-btn" onClick={onRead} className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground">
          {t.readBtn}
        </button>
      )}
      <section data-testid="exercise" data-locked={!isRead && !mark} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <h4 className="text-sm text-muted-foreground">{t.exerciseTitle}</h4>
        <p>{l.exercise}</p>
        {!isRead && !mark && <p data-testid="exercise-locked" className="text-sm text-muted-foreground">{t.exerciseLocked}</p>}
        {mark ? (
          <div className="flex flex-col gap-2">
            <p data-testid="saved-line" className="font-medium">
              {justSaved && next ? t.savedNext(next.title) : justSaved ? t.saved : null}
              {!justSaved && t.doneMark}
            </p>
            {mark.note && (
              <p data-testid="saved-note" className="whitespace-pre-wrap text-sm text-muted-foreground">
                {mark.note}
              </p>
            )}
          </div>
        ) : (
          <>
            <textarea
              data-testid="note"
              aria-label={t.noteLabel}
              disabled={!isRead}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 disabled:opacity-50"
            />
            <button
              type="button"
              data-testid="done-btn"
              disabled={!isRead}
              onClick={() => {
                onDone(note)
                setJustSaved(true)
              }}
              className="min-h-12 rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50"
            >
              {t.doneBtn}
            </button>
          </>
        )}
      </section>
      <div role="group" aria-label={t.thumbsLabel} className="flex flex-wrap gap-2">
        {(["more", "less"] as const).map((k) => (
          <button key={k} type="button" data-testid={`thumb-${k}`} aria-pressed={thumb === k} onClick={() => onThumb(k)} className={chip(thumb === k)}>
            {t[k]}
          </button>
        ))}
      </div>
    </article>
  )
}

function BeliefCard({ b, onBack }: { b: QuitBelief; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Head title={t.beliefBack} onBack={onBack} />
      <article data-testid="belief-card" data-belief={b.id} className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">{tt.beliefs.thoughtLabel}</p>
        <p className="text-lg leading-snug">{`“${b.limiting}”`}</p>
        <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.counterLabel}</p>
        <p className="font-medium">{b.counterpart}</p>
        <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.whenLabel}</p>
        <p>{b.whenThought}</p>
        <p className="mt-3 text-sm text-muted-foreground">{tt.beliefs.proofLabel}</p>
        <p>{b.proof}</p>
        <CountedLine text={b.counted} />
        <SourceTap refs={realRefs(b.refs)} />
      </article>
    </div>
  )
}

function Reminder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <section data-testid="reminder" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <h4 className="text-sm text-muted-foreground">{t.reminderTitle}</h4>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <span>{t.reminderLabel}</span>
        <input
          type="time"
          data-testid="reminder-time"
          value={validTime(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-11 rounded-md border border-border bg-background px-3"
        />
      </label>
      <p className="text-xs text-muted-foreground">{t.reminderNote}</p>
    </section>
  )
}

function SetDay({ day, onSet, onPlan }: { day: number; onSet: (n: number) => void; onPlan: (() => void) | null }) {
  const [text, setText] = useState(String(day))
  useEffect(() => setText(String(day)), [day])
  return (
    <section data-testid="set-day" className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <h4 className="flex-1 text-sm text-muted-foreground">{t.setDayLabel}</h4>
        <span data-testid="lab-tag" className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
          {t.labTag}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t.setDayHint}</p>
      <input
        data-testid="set-day-input"
        aria-label={t.setDayLabel}
        inputMode="numeric"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const n = parseDayInput(e.target.value)
          if (n !== null) onSet(n)
        }}
        className="min-h-11 w-24 rounded-md border border-border bg-background px-3"
      />
      {onPlan && (
        <button type="button" data-testid="use-quit-date" onClick={onPlan} className="inline-flex min-h-11 items-center self-start text-sm underline">
          {t.useQuitDate}
        </button>
      )}
    </section>
  )
}
