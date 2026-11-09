"use client"

/**
 * THE TIME & ENERGY AUDIT, THE PAGE (Plans/energy-audit.md, Phase 4).
 *
 * No open audit: Start, with the past audits under it. An open audit: Today,
 * with "Answer now (N)", the Day list, Mute, Settings and End now. During the
 * two weeks it shows only your own entries: no tips, no summaries, no box
 * colours (D-NO-PUSH).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { usePushDevice, type PushDeviceState } from "@/src/notifications/hooks/usePushDevice"
import { ROUTES } from "@/src/shared/routes"
import { OfflineShell } from "@/src/shared/components/OfflineShell"
import { useAudit, type AuditState, type DrawnSlot } from "../hooks/useAudit"
import { answerSheetQuarters, groupQuarters, prefillQuarters, QUARTER_MS, runQuarters, SHEET_WINDOW_MS, withAnswered } from "../quarterService"
import type { AnswerSource, AuditRun } from "../types"
import type { AuditView } from "../auditClient"
import { AnswerSheet, type AnswerCardInput } from "./AnswerSheet"
import { DayList, type DaySelection } from "./DayList"
import { MuteSheet, mutedLine } from "./MuteSheet"
import { SettingsSheet } from "./SettingsSheet"
import { ReviewScreen } from "./ReviewScreen"
import { noPingDevice, PingDeviceCard, PingDeviceList } from "./PingDevices"

const DAY_MS = 24 * 60 * 60_000

const dayKeyOf = (ms: number, tz: string) => getTodayInTimezone(tz, new Date(ms))

function shortDate(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: tz }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Today"
  const [y, m, d] = todayKey.split("-").map(Number)
  if (key === new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)) return "Yesterday"
  const [ky, km, kd] = key.split("-").map(Number)
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(ky, km - 1, kd)))
}

/** The run's local days up to today, oldest first. */
function runDays(run: AuditRun, now: number, tz: string): string[] {
  const first = dayKeyOf(Date.parse(run.startedAt), tz)
  const last = dayKeyOf(Math.min(now, Date.parse(run.endedAt ?? run.endsAt)), tz)
  const out: string[] = []
  const [y, m, d] = first.split("-").map(Number)
  for (let i = 0; i < 40; i++) {
    const key = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10)
    out.push(key)
    if (key >= last) break
  }
  return out
}

/** Re-render every 30 s, so counts follow the clock. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  return now
}

interface SheetState {
  title: string
  cards: AnswerCardInput[]
  source: AnswerSource
  allowDelete: boolean
}

function StartView({ s, view, push, onReview }: { s: AuditState; view: AuditView; push: PushDeviceState; onReview: (runId: string) => void }) {
  const [devicesOpen, setDevicesOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const past = view.runs.filter((r) => r.id !== view.run?.id)
  return (
    <div data-testid="audit-start">
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Run it when you feel stuck. For two weeks, every 15 minutes, note what you did and how it felt. At the end you see what
        takes your energy and what builds your life.
      </p>
      <Button
        size="lg"
        className="mt-5 w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          const failed = await s.start()
          setBusy(false)
          if (failed) setError(failed)
        }}
        data-testid="audit-start-button"
      >
        {busy ? "Starting…" : "Start a two-week audit"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {noPingDevice(push) && (
        <div className="mt-5">
          <PingDeviceCard push={push} onOpenSettings={() => setDevicesOpen(true)} />
        </div>
      )}
      <BottomSheet open={devicesOpen} onClose={() => setDevicesOpen(false)} title="Pings" testId="audit-devices-sheet">
        <PingDeviceList push={push} />
      </BottomSheet>
      {past.length > 0 && (
        <section className="mt-8" data-testid="audit-past">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Past audits</h2>
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
            {past.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onReview(r.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-muted/40"
                  data-testid="audit-past-row"
                >
                  <span>
                    {shortDate(r.startedAt, view.timezone)} – {shortDate(r.endedAt ?? r.endsAt, view.timezone)}
                  </span>
                  <span className="text-muted-foreground">{r.endedAt && Date.parse(r.endedAt) < Date.parse(r.endsAt) ? "ended early" : "two weeks"} · Review →</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function TodayView({
  s,
  view,
  run,
  push,
  onEnded,
}: {
  s: AuditState
  view: AuditView
  run: AuditRun
  push: PushDeviceState
  onEnded: (runId: string) => void
}) {
  const tz = view.timezone
  const now = useNow()
  const todayKey = dayKeyOf(now, tz)
  const days = useMemo(() => runDays(run, now, tz), [run, now, tz])
  const [day, setDay] = useState(todayKey)
  const shownDay = days.includes(day) ? day : days[days.length - 1]
  const [selection, setSelection] = useState<DaySelection>({ start: null, end: null })
  const [sheet, setSheet] = useState<SheetState | null>(null)
  const [muteOpen, setMuteOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const [answerNowPending, setAnswerNowPending] = useState<"no" | "reading" | "ready">("no")

  const quarters = useMemo(() => runQuarters(run, now, tz), [run, now, tz])
  const answered = useMemo(() => {
    const m = new Map<number, DrawnSlot>()
    for (const sl of s.slots) if (sl.runId === run.id) m.set(Date.parse(sl.slotAt), sl)
    return m
  }, [s.slots, run.id])
  const recentGaps = quarters.filter((q) => q + QUARTER_MS > now - SHEET_WINDOW_MS && !answered.has(q))
  // Answered quarters always show, even if quiet hours were changed to cover them later.
  const dayQuarters = withAnswered(quarters, answered.keys()).filter((q) => dayKeyOf(q, tz) === shownDay)

  const viewRef = useRef(view)
  viewRef.current = view

  const cardsFor = useCallback(
    (qs: number[], single: boolean): AnswerCardInput[] => {
      const prefill = prefillQuarters(qs, viewRef.current.timeEntries, Date.now())
      if (single) {
        const texts = new Set(qs.map((q) => prefill.get(q)?.text ?? ""))
        const only = texts.size === 1 ? prefill.get(qs[0]) : undefined
        return [{ quarters: qs, text: only?.text ?? "", entryId: only?.entryId ?? null, existing: null }]
      }
      return groupQuarters(qs, prefill).map((g) => ({ quarters: g.quarters, text: g.text, entryId: g.entryId, existing: null }))
    },
    [],
  )

  // "Answer now": read again first, so Time's latest entry fills the cards (D-PREFILL).
  // From a ping, the quarter it asked about is offered too, however long ago it was.
  const askedRef = useRef<number | null>(null)
  const reload = s.reload
  const openAnswerNow = useCallback(
    async (asked: number | null = null) => {
      askedRef.current = asked
      setAnswerNowPending("reading")
      await reload()
      setAnswerNowPending("ready")
    },
    [reload],
  )
  // Opened from a ping (`?answer=<quarter>&send=<id>`): straight to the answer sheet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has("answer")) return
    const asked = Date.parse(params.get("answer") ?? "")
    window.history.replaceState(null, "", ROUTES.audit)
    void openAnswerNow(Number.isFinite(asked) ? asked : null)
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (answerNowPending !== "ready") return
    setAnswerNowPending("no")
    const gaps = answerSheetQuarters(run, Date.now(), tz, new Set(answered.keys()), askedRef.current)
    askedRef.current = null
    setSheet({ title: "Answer now", cards: cardsFor(gaps, false), source: "app", allowDelete: false })
  }, [answerNowPending, run, tz, answered, cardsFor])

  const dayIndex = days.indexOf(shownDay)
  const dayNumber = Math.min(14, Math.floor((now - Date.parse(run.startedAt)) / DAY_MS) + 1)
  const muted = mutedLine(run.mutedUntil, tz, now)

  return (
    <div data-testid="audit-today">
      <p className="mt-1 text-sm text-muted-foreground" data-testid="audit-day-of">
        Day {dayNumber} of 14 · ends {shortDate(run.endsAt, tz)}
      </p>
      <Button
        size="lg"
        className="mt-4 h-14 w-full text-lg"
        onClick={() => void openAnswerNow(null)}
        disabled={answerNowPending !== "no"}
        data-testid="audit-answer-now"
      >
        Answer now ({recentGaps.length})
      </Button>
      {noPingDevice(push) && (
        <div className="mt-3">
          <PingDeviceCard push={push} onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      )}
      {s.waiting > 0 && (
        <p className="mt-2 text-sm text-amber-500" role="status" data-testid="audit-waiting">
          {s.waiting === 1 ? "1 change is" : `${s.waiting} changes are`} saved on this phone
          {s.sendState === "signed-out" ? ". Sign in again to send them." : ", and sent when you have signal."}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setMuteOpen(true)} data-testid="audit-mute-open">
          {muted ?? "Mute"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setSettingsOpen(true)} data-testid="audit-settings-open">
          Settings
        </Button>
      </div>

      <DayList
        dayLabel={dayLabel(shownDay, todayKey)}
        canPrev={dayIndex > 0}
        canNext={dayIndex < days.length - 1}
        onPrev={() => {
          setSelection({ start: null, end: null })
          setDay(days[Math.max(0, dayIndex - 1)])
        }}
        onNext={() => {
          setSelection({ start: null, end: null })
          setDay(days[Math.min(days.length - 1, dayIndex + 1)])
        }}
        quarters={dayQuarters}
        answered={answered}
        timezone={tz}
        selection={selection}
        onSelect={setSelection}
        onAnswerSelection={(gaps) => setSheet({ title: "Fill in", cards: cardsFor(gaps, true), source: "later", allowDelete: false })}
        onOpenAnswer={(slot) =>
          setSheet({
            title: "Change answer",
            cards: [{ quarters: [Date.parse(slot.slotAt)], text: slot.activity, entryId: slot.timeEntryId, existing: slot }],
            source: slot.source,
            allowDelete: true,
          })
        }
      />

      <div className="mt-10 border-t border-border pt-4">
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirmEnd(true)} data-testid="audit-end-open">
          End now
        </Button>
      </div>

      {sheet && (
        <AnswerSheet
          open
          onClose={() => {
            setSheet(null)
            setSelection({ start: null, end: null })
          }}
          title={sheet.title}
          cards={sheet.cards}
          runId={run.id}
          timezone={tz}
          source={sheet.source}
          suggestions={view.suggestions}
          slots={s.slots}
          onSave={s.answer}
          onDelete={sheet.allowDelete ? s.remove : undefined}
        />
      )}
      <MuteSheet open={muteOpen} onClose={() => setMuteOpen(false)} run={run} timezone={tz} onMute={s.mute} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        quietStart={run.quietStart}
        quietEnd={run.quietEnd}
        onSave={s.setQuiet}
        devices={<PingDeviceList push={push} />}
      />
      <BottomSheet open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End the audit now?" testId="audit-end-confirm">
        <p className="text-sm text-muted-foreground">
          Your answers are kept, and the review opens. Pings stop. You can start a new audit any time.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmEnd(false)}>
            Keep going
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={async () => {
              setEndError(null)
              const failed = await s.end()
              if (failed) setEndError(failed)
              else {
                setConfirmEnd(false)
                // End now opens the review straight away (D-NO-PUSH: no notice is sent).
                onEnded(run.id)
              }
            }}
            data-testid="audit-end-confirm-button"
          >
            End now
          </Button>
        </div>
        {endError && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {endError}
          </p>
        )}
      </BottomSheet>
    </div>
  )
}

export function AuditScreen({ account }: { account: string }) {
  const s = useAudit(account)
  const push = usePushDevice()
  const [reviewId, setReviewId] = useState<string | null>(null)
  const view0 = s.view
  // `?view=review` (the end notice): the latest audit that is over.
  useEffect(() => {
    if (!view0) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("view") !== "review") return
    window.history.replaceState(null, "", ROUTES.audit)
    const latest = view0.runs.find((r) => r.id !== view0.run?.id)
    if (latest) setReviewId(latest.id)
  }, [view0])
  const view = s.view
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6" data-testid="audit-page">
      <h1 className="text-2xl font-semibold tracking-tight">Time &amp; energy audit</h1>
      {/* The page opens with no signal (`/audit` is in the worker's SHELL_PATHS), and a ping tapped in a basement still lands. */}
      <OfflineShell />
      {!view ? (
        s.loadError ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5" role="alert" data-testid="audit-load-error">
            <p>{s.loadError}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing was changed. Try again when you have signal.</p>
            <Button className="mt-4" onClick={() => void s.reload()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3" aria-busy="true" aria-label="Loading your audit">
            <div className="h-14 animate-pulse rounded-xl bg-card" />
            <div className="h-64 animate-pulse rounded-xl bg-card" />
          </div>
        )
      ) : reviewId ? (
        <ReviewScreen key={reviewId} s={s} runId={reviewId} onBack={() => setReviewId(null)} />
      ) : view.run ? (
        <TodayView key={view.run.id} s={s} view={view} run={view.run} push={push} onEnded={setReviewId} />
      ) : (
        <StartView s={s} view={view} push={push} onReview={setReviewId} />
      )}
    </main>
  )
}
