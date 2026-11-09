"use client"

/**
 * THE TIME & ENERGY AUDIT, THE PAGE (Plans/energy-audit.md, Phase 4).
 *
 * No open audit: Start, with the past audits under it. An open audit: Today,
 * with "Answer now (N)", the Day list, Mute, Settings and End now. During the
 * two weeks it shows only your own entries: no tips, no summaries, no box
 * colours (D-NO-PUSH).
 */

import { Bell, BellOff } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getTodayInTimezone } from "@/src/shared/dateUtils"
import { usePushDevice, type PushDeviceState } from "@/src/notifications/hooks/usePushDevice"
import { ROUTES } from "@/src/shared/routes"
import { OfflineShell } from "@/src/shared/components/OfflineShell"
import { useAudit, type AuditState, type DrawnSlot } from "../hooks/useAudit"
import { answerSheetQuarters, clockLabel, nextPingAt, prefillQuarters, QUARTER_MS, runDayOf, runQuarters, SHEET_WINDOW_MS, sheetOrder, stretchLabel, withAnswered } from "../quarterService"
import type { AnswerSource, AuditRun } from "../types"
import type { AuditView } from "../auditClient"
import { AnswerSheet, type AnswerCardInput } from "./AnswerSheet"
import { DayList, type DaySelection } from "./DayList"
import { MuteSheet, mutedLine } from "./MuteSheet"
import { SettingsSheet } from "./SettingsSheet"
import { ReviewScreen } from "./ReviewScreen"
import { noPingDevice, PingDeviceCard, PingDeviceList } from "./PingDevices"

const FILL_IN_WAIT_MS = 3_000
/** How long "Deleted · Undo" stays before the delete is sent (alpha picky-eye-08). */
export const UNDO_MS = 6_000

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

/** The zone this device's clock is in, or null when the browser cannot say. */
function deviceZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

/** The zone's wall clock at `ms`, as minutes since midnight: two zones differ when these do. */
function wallMinutes(ms: number, tz: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms))
    const n = (t: string) => Number(parts.find((p) => p.type === t)?.value)
    return n("day") * 1440 + n("hour") * 60 + n("minute")
  } catch {
    return null
  }
}

/** "Europe/Copenhagen" → "Copenhagen". */
const zoneCity = (tz: string) => (tz.split("/").pop() ?? tz).replace(/_/g, " ")

/**
 * TRAVELLING: the audit's times, quiet hours and pings follow the account's
 * zone, and the page never said which (alpha test fast-audit-05). When this
 * device's clock differs, the zone is named and one tap switches the account
 * to this one (the same setting as in Settings). Never switched unasked.
 */
function ZoneLine({ s, accountZone, now }: { s: AuditState; accountZone: string; now: number }) {
  const [here] = useState(deviceZone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!here || here === accountZone) return null
  const a = wallMinutes(now, accountZone)
  const b = wallMinutes(now, here)
  if (a === null || b === null || a === b) return null
  return (
    <div className="mt-3 rounded-xl border border-border bg-card px-3.5 py-3 text-sm" data-testid="audit-zone">
      <p>
        Times here are {zoneCity(accountZone)} time ({accountZone}). This phone is on {zoneCity(here)} time.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError(null)
          const failed = await s.setZone(here)
          setBusy(false)
          if (failed) setError(failed)
        }}
        data-testid="audit-zone-switch"
      >
        {busy ? "Switching…" : `Use ${zoneCity(here)} time`}
      </Button>
      {error && (
        <p className="mt-2 text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Answers the server did not keep, named until he has seen them (fast-audit-02). */
function NotKeptLine({ s, tz }: { s: AuditState; tz: string }) {
  if (s.notKept.length === 0) return null
  return (
    <div className="mt-3 rounded-xl border border-amber-500/60 bg-amber-500/10 px-3.5 py-3 text-sm" role="alert" data-testid="audit-not-kept">
      <p className="font-semibold">{s.notKept.length === 1 ? "1 answer was not kept" : `${s.notKept.length} answers were not kept`}</p>
      <ul className="mt-1 space-y-0.5">
        {s.notKept.map(({ answer, reason, stored }) => (
          <li key={`${answer.runId}:${answer.slotAt}`} data-testid="audit-not-kept-item">
            {stretchLabel([Date.parse(answer.slotAt)], tz)} · {answer.activity}: {reason}.
            {stored && (
              <>
                {" "}
                Answered on another device: {stored.activity} · E {stored.energy} · G {stored.growth}.
                {/* the same choice the card offers (alpha slow-pass-06), for a refusal that came while the sheet was closed */}
                <span className="mt-1 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => s.keepStored([answer])} data-testid="audit-not-kept-keep">
                    Keep that one
                  </Button>
                  <Button size="sm" onClick={() => s.answer([{ ...answer, answeredAt: new Date().toISOString(), was: stored }])} data-testid="audit-not-kept-mine">
                    Use mine
                  </Button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted-foreground">The Day list shows the answer that was kept.</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={s.dismissNotKept} data-testid="audit-not-kept-ok">
        OK
      </Button>
    </div>
  )
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

  /**
   * DELETE WITH UNDO (alpha picky-eye-08). The delete goes into the stored
   * queue at the tap, stamped with the tap, and is sent once UNDO_MS has
   * passed; "Deleted · Undo" shows meanwhile, and Undo takes it back out. In
   * the queue from the start, Log Out counts and sends it, and no other
   * device's newer answer is deleted by a late stamp (code review, 2026-11-09).
   */
  const [held, setHeld] = useState<DrawnSlot | null>(null)
  useEffect(() => {
    if (!held) return
    const t = window.setTimeout(() => setHeld(null), UNDO_MS)
    return () => window.clearTimeout(t)
  }, [held])
  const undoRemove = s.undoRemove
  const undoHeld = useCallback(() => {
    if (held) undoRemove(held.id)
    setHeld(null)
  }, [held, undoRemove])
  const slots = s.slots

  const quarters = useMemo(() => runQuarters(run, now, tz), [run, now, tz])
  const answered = useMemo(() => {
    const m = new Map<number, DrawnSlot>()
    for (const sl of slots) if (sl.runId === run.id) m.set(Date.parse(sl.slotAt), sl)
    return m
  }, [slots, run.id])
  const recentGaps = quarters.filter((q) => q + QUARTER_MS > now - SHEET_WINDOW_MS && !answered.has(q))
  // Answered quarters always show, even if quiet hours were changed to cover them later.
  const dayQuarters = withAnswered(quarters, answered.keys()).filter((q) => dayKeyOf(q, tz) === shownDay)

  const viewRef = useRef(view)
  viewRef.current = view
  const answeredRef = useRef(answered)
  answeredRef.current = answered

  /**
   * The cards for `qs`: one for a stretch chosen in the Day list (`single`),
   * else one per quarter, newest first and `asked` on top (alpha F08/F09).
   * Each is pre-filled from Time; when Time knows nothing, from the answer of
   * the quarter right before, marked "same as before" (fast-audit-06).
   */
  const cardsFor = useCallback(
    (qs: number[], single: boolean, read: AuditView | null = null, asked: number | null = null): AnswerCardInput[] => {
      const source = read ?? viewRef.current
      // A running entry counts only up to when this view was read (slow-pass-02).
      const prefill = prefillQuarters(qs, source.timeEntries, Date.now(), Date.parse(source.now))
      if (single) {
        const texts = new Set(qs.map((q) => prefill.get(q)?.text ?? ""))
        const only = texts.size === 1 ? prefill.get(qs[0]) : undefined
        return [{ quarters: qs, text: only?.text ?? "", entryId: only?.entryId ?? null, existing: null }]
      }
      return sheetOrder(qs, asked).map((q) => {
        const p = prefill.get(q)
        const before = p ? undefined : answeredRef.current.get(q - QUARTER_MS)
        return {
          quarters: [q],
          text: p?.text ?? before?.activity ?? "",
          entryId: p?.entryId ?? null,
          existing: null,
          asked: q === asked,
          sameAsBefore: before !== undefined,
        }
      })
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
  // "Fill in" from the Day list reads again too: it used the Time entries
  // loaded when the page opened, so an entry started or renamed on another
  // device since filled the card wrongly or not at all (alpha fast-time-01/02).
  const [fillPending, setFillPending] = useState(false)
  const openFillIn = useCallback(
    async (gaps: number[]) => {
      setFillPending(true)
      // On a weak signal it waits at most FILL_IN_WAIT_MS, then fills from what it has.
      const fresh = await Promise.race([reload(), new Promise<null>((r) => setTimeout(() => r(null), FILL_IN_WAIT_MS))])
      setFillPending(false)
      setSheet({ title: "Fill in", cards: cardsFor(gaps, true, fresh), source: "later", allowDelete: false })
    },
    [reload, cardsFor],
  )
  // Opened from a ping (`?answer=<quarter>&send=<id>`): straight to the answer
  // sheet, from the read this page just made. It used to read a second time
  // first, and a tapped ping waited 2.7–5.4 s for its sheet (alpha fast-audit-08).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has("answer")) return
    const asked = Date.parse(params.get("answer") ?? "")
    window.history.replaceState(null, "", ROUTES.audit)
    askedRef.current = Number.isFinite(asked) ? asked : null
    setAnswerNowPending("ready")
    // once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (answerNowPending !== "ready") return
    setAnswerNowPending("no")
    const asked = askedRef.current
    const gaps = answerSheetQuarters(run, Date.now(), tz, new Set(answered.keys()), asked)
    askedRef.current = null
    setSheet({ title: "Answer now", cards: cardsFor(gaps, false, null, asked), source: "app", allowDelete: false })
  }, [answerNowPending, run, tz, answered, cardsFor])

  const dayIndex = days.indexOf(shownDay)
  const dayOf = runDayOf(run, now, tz)
  const muted = mutedLine(run.mutedUntil, tz, now)
  // Nothing to answer: a calm line with the next ping, not a big button that
  // opens an empty sheet (alpha picky-eye-12). With no device getting pings,
  // the next quarter to answer instead.
  const pingsGo = !noPingDevice(push)
  const next = recentGaps.length === 0 ? nextPingAt(run, now, tz, { ignoreMute: !pingsGo }) : null

  return (
    <div data-testid="audit-today">
      <p className="mt-1 text-sm text-muted-foreground" data-testid="audit-day-of">
        Day {dayOf.day} of {dayOf.of} · ends {shortDate(run.endsAt, tz)} at {clockLabel(Date.parse(run.endsAt), tz)}
      </p>
      {recentGaps.length > 0 ? (
        <Button
          size="lg"
          className="mt-4 h-14 w-full text-lg"
          onClick={() => void openAnswerNow(null)}
          disabled={answerNowPending !== "no"}
          data-testid="audit-answer-now"
        >
          Answer now ({recentGaps.length})
        </Button>
      ) : (
        <div
          className="mt-4 flex h-14 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4"
          role="status"
          data-testid="audit-nothing-to-answer"
        >
          <p className="font-semibold">Nothing to answer</p>
          {next !== null && (
            <p className="text-sm tabular-nums text-muted-foreground">
              {pingsGo ? "Next ping at" : "Next question at"} <span className="font-semibold text-foreground">{clockLabel(next, tz)}</span>
            </p>
          )}
        </div>
      )}
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
      {s.fromCopy && (
        <p className="mt-2 text-sm text-muted-foreground" role="status" data-testid="audit-offline-copy">
          No signal: this is what this phone last read. Answers wait here and are sent when you have signal.
        </p>
      )}
      <NotKeptLine s={s} tz={tz} />
      <ZoneLine s={s} accountZone={tz} now={now} />
      <div className="mt-3 flex gap-2">
        {/* Muted reads as a state, not a label: amber, filled, bell struck through (alpha F20, owner K-A4). */}
        <button
          type="button"
          onClick={() => setMuteOpen(true)}
          aria-pressed={muted !== null}
          className={cn(
            "flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
            muted
              ? "border-amber-400/80 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              : "border-border bg-card hover:bg-muted/50",
          )}
          data-testid="audit-mute-open"
        >
          {muted ? <BellOff className="size-4 shrink-0" aria-hidden /> : <Bell className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          <span className="truncate tabular-nums">{muted ?? "Mute"}</span>
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted/50"
          data-testid="audit-settings-open"
        >
          Settings
        </button>
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
        onAnswerSelection={(gaps) => {
          if (!fillPending) void openFillIn(gaps)
        }}
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
          slots={slots}
          notKept={s.notKept}
          onKeepStored={s.keepStored}
          onSave={(answers) => {
            // Answered again inside the undo time: the new answer replaces the
            // held one under its id, and no delete follows.
            const h = held
            const same = (a: { runId: string; slotAt: string }) => h !== null && a.runId === h.runId && a.slotAt === h.slotAt
            if (h && answers.some(same)) {
              setHeld(null)
              // same id: the queued delete for it is dropped (enqueueAnswers)
              s.answer(answers.map((a) => (same(a) ? { ...a, id: h.id } : a)))
            } else s.answer(answers)
          }}
          onDelete={
            sheet.allowDelete
              ? (id) => {
                  const slot = s.slots.find((sl) => sl.id === id)
                  s.remove(id, slot ? UNDO_MS : 0)
                  setHeld(slot ?? null)
                }
              : undefined
          }
        />
      )}
      {held && (
        <div
          className="fixed inset-x-4 bottom-24 z-[9700] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card px-4 py-2 shadow-lg sm:bottom-6"
          role="status"
          data-testid="audit-undo"
        >
          <p className="min-w-0 flex-1 truncate text-sm">
            Deleted · <span className="tabular-nums">{stretchLabel([Date.parse(held.slotAt)], tz)}</span> · {held.activity}
          </p>
          <Button variant="outline" size="sm" onClick={undoHeld}>
            Undo
          </Button>
        </div>
      )}
      <MuteSheet
        open={muteOpen}
        onClose={() => setMuteOpen(false)}
        run={run}
        timezone={tz}
        onMute={s.mute}
        push={push}
        onOpenSettings={() => {
          setMuteOpen(false)
          setSettingsOpen(true)
        }}
      />
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
