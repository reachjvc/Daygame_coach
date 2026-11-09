"use client"

/**
 * THE AUDIT'S SETTINGS: quiet hours, in 15-minute steps (D-QUIET). A quarter
 * whose start falls in quiet hours is not pinged and not counted. The device
 * card and list join here in Phase 5 (D-DEVICES), passed in as `devices`.
 */

import { useEffect, useState, type ReactNode } from "react"
import { BottomSheet } from "@/components/BottomSheet"
import { Button } from "@/components/ui/button"

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
const STEPS = Array.from({ length: 96 }, (_, i) => i * 15)

function TimeSelect({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label htmlFor={id} className="flex min-h-11 flex-1 flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 rounded-lg border border-border bg-background px-2 text-base"
      >
        {STEPS.map((m) => (
          <option key={m} value={m}>
            {hhmm(m)}
          </option>
        ))}
      </select>
    </label>
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
  useEffect(() => {
    if (open) {
      setStart(quietStart)
      setEnd(quietEnd)
      setMessage(null)
    }
  }, [open, quietStart, quietEnd])

  const changed = start !== quietStart || end !== quietEnd
  return (
    <BottomSheet open={open} onClose={onClose} title="Audit settings" testId="audit-settings-sheet">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quiet hours</h3>
      <p className="mt-1 text-sm text-muted-foreground">No pings, and nothing to answer, between these times. Every day.</p>
      <div className="mt-2 flex gap-2">
        <TimeSelect id="audit-quiet-start" label="From" value={start} onChange={setStart} />
        <TimeSelect id="audit-quiet-end" label="To" value={end} onChange={setEnd} />
      </div>
      {start === end && <p className="mt-2 text-sm text-muted-foreground">The same time twice means no quiet hours: pings around the clock.</p>}
      <Button
        className="mt-3 w-full"
        disabled={!changed || busy}
        onClick={async () => {
          setBusy(true)
          const failed = await onSave(start, end)
          setBusy(false)
          setMessage(failed ?? "✓ Saved")
        }}
        data-testid="audit-quiet-save"
      >
        Save quiet hours
      </Button>
      {message && (
        <p className="mt-2 text-sm" role="status">
          {message}
        </p>
      )}
      {devices && <div className="mt-5">{devices}</div>}
    </BottomSheet>
  )
}
