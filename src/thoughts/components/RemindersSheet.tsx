"use client"

/**
 * REMINDER SETTINGS (Plans/thought.md, screen 7).
 *
 * Every change saves at once and moves the next reminder to match. The
 * settings are the person's; whether THIS device rings is the device list's
 * switch, so the laptop does not buzz alongside the phone (Q7).
 */

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { getTodayInTimezone, localTimeInstant } from "@/src/shared/dateUtils"
import type { PushDeviceState } from "@/src/notifications/hooks/usePushDevice"
import { INTERVAL_CHOICES, type ThoughtSettings } from "../types"
import { formatTime } from "./format"

const DAYS = ["M", "T", "W", "T", "F", "S", "S"]
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const SWITCH = "data-[state=unchecked]:bg-muted-foreground/30"

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const minutesOf = (v: string) => {
  const [h, m] = v.split(":").map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/** Midnight at the end of today, in the person's zone. */
function endOfToday(timezone: string, now: Date): string {
  const [y, m, d] = getTodayInTimezone(timezone, now).split("-").map(Number)
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  return localTimeInstant(tomorrow, "00:00", timezone)
}

function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2", className)}>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</h3>
}

export function RemindersSheet({
  open,
  onClose,
  settings,
  timezone,
  lastDeliveredAt,
  push,
  save,
}: {
  open: boolean
  onClose: () => void
  settings: ThoughtSettings
  timezone: string
  lastDeliveredAt: string | null
  push: PushDeviceState
  save: (s: ThoughtSettings) => Promise<unknown>
}) {
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState<string | null>(null)
  const [testLine, setTestLine] = useState<string | null>(null)

  useEffect(() => setDraft(settings), [settings])
  // The list may have changed since the page opened (a device switched on elsewhere, or reported gone).
  const { reloadDevices } = push
  useEffect(() => {
    if (open) void reloadDevices()
  }, [open, reloadDevices])

  const change = async (patch: Partial<ThoughtSettings>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    setError(null)
    try {
      await save(next)
    } catch (e) {
      setDraft(settings)
      setError(e instanceof Error ? e.message : "Could not save")
    }
  }

  const paused = draft.pausedUntil !== null && Date.parse(draft.pausedUntil) > Date.now()
  const quietOn = draft.quietStart !== null && draft.quietEnd !== null

  return (
    <BottomSheet open={open} onClose={onClose} title="Reminders" testId="reminders-sheet">
      <div className="space-y-5 pb-2">
        <Row>
          <span>
            <span className="block font-medium">Send reminders</span>
            <span className="text-xs text-muted-foreground">
              {lastDeliveredAt ? `Last delivered ${formatTime(lastDeliveredAt, timezone)}` : "To the devices switched on below"}
            </span>
          </span>
          <Switch
            className={SWITCH}
            checked={draft.remindersOn}
            onCheckedChange={(v) => void change({ remindersOn: v })}
            aria-label="Send reminders"
            data-testid="reminders-master"
          />
        </Row>

        <div className="space-y-2">
          <Label>Every</Label>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Minutes between reminders">
            {INTERVAL_CHOICES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={draft.intervalMinutes === m}
                onClick={() => void change({ intervalMinutes: m })}
                className={cn(
                  "min-h-11 min-w-12 rounded-xl border px-3 text-sm tabular-nums",
                  draft.intervalMinutes === m ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground",
                )}
              >
                {m < 60 ? `${m} min` : m === 60 ? "1 h" : `${m / 60} h`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Quiet hours</Label>
          <Row>
            <span className="text-sm">{quietOn ? "No reminders between" : "Remind around the clock"}</span>
            <Switch
              className={SWITCH}
              checked={quietOn}
              onCheckedChange={(v) => void change(v ? { quietStart: 22 * 60, quietEnd: 8 * 60 } : { quietStart: null, quietEnd: null })}
              aria-label="Quiet hours"
            />
          </Row>
          {quietOn && (
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="sr-only">Quiet from</span>
                <input
                  type="time"
                  value={hhmm(draft.quietStart as number)}
                  onChange={(e) => {
                    const m = minutesOf(e.target.value)
                    if (m !== null && m !== draft.quietEnd) void change({ quietStart: m })
                  }}
                  className="min-h-11 w-full rounded-xl border border-border bg-input px-3 text-base tabular-nums"
                />
              </label>
              <span className="text-muted-foreground">to</span>
              <label className="flex-1">
                <span className="sr-only">Quiet until</span>
                <input
                  type="time"
                  value={hhmm(draft.quietEnd as number)}
                  onChange={(e) => {
                    const m = minutesOf(e.target.value)
                    if (m !== null && m !== draft.quietStart) void change({ quietEnd: m })
                  }}
                  className="min-h-11 w-full rounded-xl border border-border bg-input px-3 text-base tabular-nums"
                />
              </label>
            </div>
          )}
          <div className="flex gap-1.5" role="group" aria-label="Days with reminders">
            {DAYS.map((d, i) => {
              const on = (draft.activeDays & (1 << i)) !== 0
              const only = on && (draft.activeDays & ~(1 << i)) === 0
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  aria-label={DAY_NAMES[i]}
                  disabled={only}
                  onClick={() => void change({ activeDays: draft.activeDays ^ (1 << i) })}
                  className={cn(
                    "min-h-11 flex-1 rounded-xl border text-sm",
                    on ? "border-primary bg-primary/15" : "border-border text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2">
          {paused ? (
            <Button variant="outline" className="flex-1" onClick={() => void change({ pausedUntil: null })}>
              Resume now (paused until {formatTime(draft.pausedUntil as string, timezone)})
            </Button>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={() => void change({ pausedUntil: new Date(Date.now() + 60 * 60_000).toISOString() })}>
                Pause 1 hour
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => void change({ pausedUntil: endOfToday(timezone, new Date()) })}>
                Pause for today
              </Button>
            </>
          )}
        </div>

        <Row>
          <span>
            <span className="block text-sm">Show my top two thoughts on the reminder</span>
            <span className="text-xs text-muted-foreground">Answer without opening the app. Readable on your lock screen. Not on iPhone.</span>
          </span>
          <Switch className={SWITCH} checked={draft.showThoughts} onCheckedChange={(v) => void change({ showThoughts: v })} aria-label="Show thoughts on the reminder" />
        </Row>

        <Row>
          <span className="text-sm">Ready to reframe after</span>
          <span className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="One day fewer" disabled={draft.reframeAfterDays <= 1} onClick={() => void change({ reframeAfterDays: draft.reframeAfterDays - 1 })}>
              −
            </Button>
            <span className="w-16 text-center text-sm tabular-nums">
              {draft.reframeAfterDays} {draft.reframeAfterDays === 1 ? "day" : "days"}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="One day more" disabled={draft.reframeAfterDays >= 14} onClick={() => void change({ reframeAfterDays: draft.reframeAfterDays + 1 })}>
              +
            </Button>
          </span>
        </Row>

        <div className="space-y-2">
          <Label>Devices</Label>
          {push.devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No device receives reminders yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {push.devices.map((d) => (
                <li key={d.id} className="flex min-h-12 items-center justify-between gap-2 px-3.5 py-1.5">
                  <span className="min-w-0 text-sm">
                    {d.label || "A device"}
                    {push.thisDevice?.id === d.id && <span className="text-muted-foreground"> (this one)</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <Switch className={SWITCH} checked={d.enabled} onCheckedChange={(v) => void push.setEnabled(d.id, v)} aria-label={`Reminders on ${d.label}`} />
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d.label}`} onClick={() => void push.remove(d.id)}>
                      <X className="size-4" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => setTestLine(await push.sendTest())}
            disabled={push.devices.every((d) => !d.enabled)}
          >
            Send a test reminder
          </Button>
          {testLine && <p className="text-xs text-muted-foreground">{testLine}</p>}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Phones do not promise exact times. Battery saver, Focus and Do Not Disturb can delay or hide a reminder; no website
          can get past them.
        </p>

        {(error || push.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error ?? push.error}
          </p>
        )}
      </div>
    </BottomSheet>
  )
}
