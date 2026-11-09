"use client"

/**
 * THE AUDIT'S SETTINGS: quiet hours, in 15-minute steps (D-QUIET), and the
 * devices that get pings (D-DEVICES, passed in as `devices`). A quarter whose
 * start falls in quiet hours is not pinged and not counted.
 *
 * Redrawn after the owner's note on the look page (2026-11-09: "make it look
 * crisp"): the day these hours make is drawn as one bar, with the count of
 * pings it means, and each end of it is a tile with its time.
 */

import { Moon, Sun } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"
import { hhmm as clockLabel } from "@/src/notifications/quietHours"

const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const STEPS = Array.from({ length: 96 }, (_, i) => i * 15)
const DAY = 1440

/** How many quarters a day are awake with these quiet hours. */
export function awakeQuarters(quietStart: number, quietEnd: number): number {
  if (quietStart === quietEnd) return 96
  const quiet = (quietStart < quietEnd ? quietEnd - quietStart : DAY - quietStart + quietEnd) / 15
  return 96 - quiet
}

/** A time as a tile: the time shown big, the phone's own picker over the whole tile. Also the perfect week's From and To. */
export function TimeTile({
  id,
  icon,
  label,
  value,
  onChange,
  options = STEPS,
}: {
  id: string
  icon?: ReactNode
  label: string
  value: number
  onChange: (v: number) => void
  /** Minutes after midnight to offer; 00:00 to 23:45 by default. 1440 reads 24:00. */
  options?: readonly number[]
}) {
  return (
    <label htmlFor={id} className="relative flex min-h-16 flex-1 cursor-pointer flex-col justify-center rounded-xl border border-border bg-background/60 px-3.5 py-2 hover:border-primary/60">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="text-2xl font-semibold tabular-nums">{clockLabel(value)}</span>
      {/* The native picker, over the whole tile: the phone's own wheel opens. */}
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 cursor-pointer text-base opacity-0" aria-label={label} data-testid={id}>
        {options.map((m) => (
          <option key={m} value={m}>
            {clockLabel(m)}
          </option>
        ))}
      </select>
    </label>
  )
}

/** The 24 hours as one bar: awake time filled, quiet time dark. */
function DayBar({ quietStart, quietEnd }: { quietStart: number; quietEnd: number }) {
  const pct = (m: number) => `${(m / DAY) * 100}%`
  const awake: [number, number][] =
    quietStart === quietEnd ? [[0, DAY]] : quietStart > quietEnd ? [[quietEnd, quietStart]] : [[0, quietStart], [quietEnd, DAY]]
  return (
    <div aria-hidden>
      <div className="relative h-3 overflow-hidden rounded-full bg-muted-foreground/20">
        {awake.map(([a, b]) => (
          <div key={a} className="absolute inset-y-0 bg-primary" style={{ left: pct(a), width: pct(b - a) }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  )
}

export function SettingsSheet({
  open,
  onClose,
  quietStart,
  quietEnd,
  onSave,
  devices,
}: {
  open: boolean
  onClose: () => void
  quietStart: number
  quietEnd: number
  onSave: (start: number, end: number) => Promise<string | null>
  devices?: ReactNode
}) {
  const [start, setStart] = useState(quietStart)
  const [end, setEnd] = useState(quietEnd)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Reset when the sheet opens, not when the saved hours come back from the
  // server: that wiped the "✓ Saved" the person had just been shown.
  useEffect(() => {
    if (open) {
      setStart(quietStart)
      setEnd(quietEnd)
      setMessage(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const changed = start !== quietStart || end !== quietEnd
  const pings = awakeQuarters(start, end)
  return (
    <BottomSheet open={open} onClose={onClose} title="Audit settings" testId="audit-settings-sheet">
      <section className="rounded-2xl border border-border bg-card p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold">Pings each day</h3>
          <p className="text-sm tabular-nums text-muted-foreground" data-testid="audit-quiet-summary">
            {start === end ? "around the clock" : `${hhmm(end)}–${hhmm(start)}`} · {pings} a day
          </p>
        </div>
        <div className="mt-3">
          <DayBar quietStart={start} quietEnd={end} />
        </div>
        <div className="mt-3 flex gap-2">
          <TimeTile id="audit-quiet-end" icon={<Sun className="size-3.5" aria-hidden />} label="Day starts" value={end} onChange={setEnd} />
          <TimeTile id="audit-quiet-start" icon={<Moon className="size-3.5" aria-hidden />} label="Quiet from" value={start} onChange={setStart} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Quiet hours apply every day. A quarter in them gets no ping and is not counted. The same time twice means no quiet hours.
        </p>
        {(changed || message) && (
          <div className="mt-3 flex items-center gap-3">
            {changed && (
              <Button
                className="flex-1"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  const failed = await onSave(start, end)
                  setBusy(false)
                  setMessage(failed ?? "✓ Saved")
                }}
                data-testid="audit-quiet-save"
              >
                {busy ? "Saving…" : "Save these hours"}
              </Button>
            )}
            {message && !changed && (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status">
                {message}
              </p>
            )}
            {message && changed && message !== "✓ Saved" && (
              <p className="text-sm text-destructive" role="alert">
                {message}
              </p>
            )}
          </div>
        )}
      </section>
      {devices && <section className="mt-3 rounded-2xl border border-border bg-card p-3.5">{devices}</section>}
    </BottomSheet>
  )
}
